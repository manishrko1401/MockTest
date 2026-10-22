import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { checkRateLimit } from './botProtection';
import { markNotificationsRead, nameOf, notifyUser } from './userNotify';

// -----------------------------------------------------------------------------
// Friends: friend requests (accept / reject), the friend list with online / offline, and
// one-to-one chat between friends. Used by the Test with Friends pages; rooms
// (friendRooms.ts) let you add friends straight into a room.
//
// People are found only by their exact Friend code or exact email, or from a room you're
// both in, so nobody can browse or list other users. The Friend code is random (8 letters /
// digits, ~1 trillion possibilities, searches rate-limited) and separate from the candidate
// code, so it can't be guessed. Each student keeps the same code. Chat is only between
// accepted friends.
// Online = the account was active in the last ONLINE_MINUTES (users.lastSeen, updated on
// every request and by the site's heartbeat).
// -----------------------------------------------------------------------------

export const FRIEND_ACTIONS = [
  'friends-get', 'friends-badge', 'friends-search', 'friends-request', 'friends-respond', 'friends-remove',
  'friends-messages', 'friends-send', 'friends-delete-message',
] as const;

const ONLINE_MINUTES = 5;
const MAX_FRIENDS = 500;
const MAX_PENDING_OUT = 50;
const MAX_MESSAGE = 2000;

type Requester = { id: string; role: string };

let tablesReady: Promise<void> | null = null;
export function ensureFriendTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      for (const sql of [
        // One row per pair (userA < userB). pending: "requestedBy" asked the other.
        `CREATE TABLE IF NOT EXISTS friend_links (
          "userA" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "userB" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "requestedBy" TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "acceptedAt" TIMESTAMP(3),
          PRIMARY KEY ("userA", "userB"),
          CHECK ("userA" < "userB")
        )`,
        `CREATE INDEX IF NOT EXISTS friend_links_b_idx ON friend_links ("userB")`,
        `CREATE TABLE IF NOT EXISTS friend_messages (
          id TEXT PRIMARY KEY,
          "fromId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "toId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          kind TEXT NOT NULL DEFAULT 'text',
          meta JSONB,
          "readAt" TIMESTAMP(3),
          "deletedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS friend_messages_pair_idx ON friend_messages ("fromId", "toId", "createdAt")`,
        `CREATE INDEX IF NOT EXISTS friend_messages_unread_idx ON friend_messages ("toId", "readAt")`,
        // Each student's Friend code (stored without the dash)
        `CREATE TABLE IF NOT EXISTS friend_codes (
          "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          code TEXT NOT NULL UNIQUE,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE friend_codes ENABLE ROW LEVEL SECURITY`,
        // Not readable through Supabase's public REST API (the app's own connection bypasses RLS)
        `ALTER TABLE friend_links ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE friend_messages ENABLE ROW LEVEL SECURITY`,
      ]) {
        await prisma.$executeRawUnsafe(sql);
      }
    })().catch(err => { tablesReady = null; throw err; });
  }
  return tablesReady;
}

const ok = (body: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...body });
const fail = (error: string, status = 400, code?: string) => NextResponse.json({ success: false, error, ...(code ? { code } : {}) }, { status });
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const pair = (x: string, y: string) => (x < y ? [x, y] : [y, x]) as [string, string];
const isOnline = (d: Date | null) => !!d && Date.now() - new Date(d).getTime() < ONLINE_MINUTES * 60000;

export type Relation = 'self' | 'none' | 'friends' | 'incoming' | 'outgoing';

/** How I relate to each of these users (friends, request sent / received, nothing). */
export async function relationsWith(me: string, ids: string[]): Promise<Record<string, Relation>> {
  await ensureFriendTables();
  const out: Record<string, Relation> = {};
  const others = [...new Set(ids.filter(id => id && id !== me))];
  ids.forEach(id => { out[id] = id === me ? 'self' : 'none'; });
  if (!others.length) return out;
  const rows = await prisma.$queryRawUnsafe<{ userA: string; userB: string; requestedBy: string; status: string }[]>(
    `SELECT "userA", "userB", "requestedBy", status FROM friend_links
     WHERE ("userA" = $1 AND "userB" = ANY($2::text[])) OR ("userB" = $1 AND "userA" = ANY($2::text[]))`, me, others);
  for (const r of rows) {
    const other = r.userA === me ? r.userB : r.userA;
    out[other] = r.status === 'accepted' ? 'friends' : r.requestedBy === me ? 'outgoing' : 'incoming';
  }
  return out;
}

export async function areFriends(me: string, other: string) {
  return (await relationsWith(me, [other]))[other] === 'friends';
}

/** A chat message from one friend to another (also used for "added you to a room" cards). */
export async function sendFriendMessage(fromId: string, toId: string, text: string, kind = 'text', meta: Record<string, unknown> | null = null) {
  await ensureFriendTables();
  const id = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO friend_messages (id, "fromId", "toId", text, kind, meta) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    id, fromId, toId, text, kind, meta ? JSON.stringify(meta) : null);
  return id;
}

// ---- Friend codes: XXXX-XXXX from 32 letters / digits (no 0/O, 1/I) ----
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = () => Array.from(crypto.randomBytes(8), b => CODE_CHARS[b % 32]).join('');
const showCode = (c: string) => (c ? `${c.slice(0, 4)}-${c.slice(4)}` : '');
const cleanCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Friend codes of these users, making one for anyone who doesn't have one yet. */
async function codesFor(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!ids.length) return out;
  const rows = await prisma.$queryRawUnsafe<{ userId: string; code: string }[]>(
    `SELECT "userId", code FROM friend_codes WHERE "userId" = ANY($1::text[])`, ids);
  rows.forEach(r => out.set(r.userId, r.code));
  for (const id of ids.filter(i => !out.has(i))) {
    for (let i = 0; i < 5 && !out.has(id); i++) {
      // a clash with someone else's code fails the insert; try another
      const saved = await prisma.$queryRawUnsafe<{ code: string }[]>(
        `INSERT INTO friend_codes ("userId", code) VALUES ($1, $2)
         ON CONFLICT ("userId") DO UPDATE SET code = friend_codes.code RETURNING code`, id, randomCode()).catch(() => []);
      if (saved[0]) out.set(id, saved[0].code);
    }
  }
  return out;
}

type Person = { id: string; fullName: string; lastSeen: Date | null };
const personView = (p: Person, code = '') => ({ userId: p.id, name: p.fullName || 'Student', code: showCode(code), online: isOnline(p.lastSeen), lastSeen: p.lastSeen });

async function friendCount(me: string) {
  const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*)::int AS n FROM friend_links WHERE ("userA" = $1 OR "userB" = $1) AND status = 'accepted'`, me);
  return rows[0]?.n || 0;
}

/** Tells the one who sent the request that it was accepted. */
function notifyAccepted(me: string, requester: string) {
  notifyUser(requester, async () => {
    const name = await nameOf(me, 'A student');
    return { type: 'friend_accepted', title: 'Friend request accepted', body: `${name} accepted your friend request.`, data: { screen: 'chat', friendId: me, friendName: name } };
  });
}

export async function handleFriendAction(action: string, data: any, requester: Requester): Promise<NextResponse> {
  await ensureFriendTables();
  const me = requester.id;

  switch (action) {
    // Friend list (with online / unread / last message) and pending requests
    case 'friends-get': {
      const [links] = await Promise.all([
        prisma.$queryRawUnsafe<{ other: string; requestedBy: string; status: string; createdAt: Date; acceptedAt: Date | null }[]>(
          `SELECT CASE WHEN "userA" = $1 THEN "userB" ELSE "userA" END AS other, "requestedBy", status, "createdAt", "acceptedAt"
           FROM friend_links WHERE "userA" = $1 OR "userB" = $1`, me),
      ]);
      const ids = links.map(l => l.other);
      const [people, codes] = await Promise.all([
        ids.length ? prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true, lastSeen: true } }) : [],
        codesFor([me, ...ids]),
      ]);
      const byId = new Map(people.map(p => [p.id, p]));
      const friendIds = links.filter(l => l.status === 'accepted').map(l => l.other);
      const [unread, last] = friendIds.length ? await Promise.all([
        prisma.$queryRawUnsafe<{ fromId: string; n: number }[]>(
          `SELECT "fromId", COUNT(*)::int AS n FROM friend_messages
           WHERE "toId" = $1 AND "readAt" IS NULL AND "deletedAt" IS NULL AND "fromId" = ANY($2::text[]) GROUP BY 1`, me, friendIds),
        prisma.$queryRawUnsafe<{ other: string; text: string; kind: string; fromId: string; createdAt: Date }[]>(
          `SELECT DISTINCT ON (other) other, text, kind, "fromId", "createdAt" FROM (
             SELECT CASE WHEN "fromId" = $1 THEN "toId" ELSE "fromId" END AS other, text, kind, "fromId", "createdAt"
             FROM friend_messages
             WHERE "deletedAt" IS NULL AND (("fromId" = $1 AND "toId" = ANY($2::text[])) OR ("toId" = $1 AND "fromId" = ANY($2::text[])))
           ) t ORDER BY other, "createdAt" DESC`, me, friendIds),
      ]) : [[], []];
      const unreadBy = new Map(unread.map(u => [u.fromId, u.n]));
      const lastBy = new Map(last.map(l => [l.other, l]));
      const view = (id: string) => byId.get(id) ? personView(byId.get(id)!, codes.get(id)) : null;
      const friends = links.filter(l => l.status === 'accepted').map(l => {
        const p = view(l.other);
        if (!p) return null;
        const m = lastBy.get(l.other);
        return {
          ...p, since: l.acceptedAt, unread: unreadBy.get(l.other) || 0,
          lastMessage: m ? { text: m.kind === 'room' ? '📝 Room invite' : m.text.slice(0, 120), at: m.createdAt, mine: m.fromId === me } : null,
        };
      }).filter(Boolean);
      const pending = (dir: 'in' | 'out') => links
        .filter(l => l.status === 'pending' && (dir === 'out' ? l.requestedBy === me : l.requestedBy !== me))
        .map(l => { const p = view(l.other); return p ? { ...p, at: l.createdAt } : null; })
        .filter(Boolean);
      return ok({ myCode: showCode(codes.get(me) || ''), friends, incoming: pending('in'), outgoing: pending('out') });
    }

    // Small counts for the menu badge
    case 'friends-badge': {
      const [req, msg] = await Promise.all([
        prisma.$queryRawUnsafe<{ n: number }[]>(
          `SELECT COUNT(*)::int AS n FROM friend_links WHERE ("userA" = $1 OR "userB" = $1) AND status = 'pending' AND "requestedBy" <> $1`, me),
        prisma.$queryRawUnsafe<{ n: number }[]>(
          `SELECT COUNT(*)::int AS n FROM friend_messages m
           JOIN friend_links l ON l."userA" = LEAST(m."fromId", m."toId") AND l."userB" = GREATEST(m."fromId", m."toId") AND l.status = 'accepted'
           WHERE m."toId" = $1 AND m."readAt" IS NULL AND m."deletedAt" IS NULL`, me),
      ]);
      return ok({ requests: req[0]?.n || 0, unread: msg[0]?.n || 0 });
    }

    // Exact Friend code or exact email only (no browsing other users)
    case 'friends-search': {
      const limit = checkRateLimit(`friends_search:${me}`, 60, 60 * 60 * 1000);
      if (!limit.allowed) return fail('Too many searches. Please try again later.', 429);
      const query = str(data.query, 200);
      let found: Person | null = null;
      if (query.includes('@')) {
        found = await prisma.user.findFirst({ where: { email: { equals: query, mode: 'insensitive' } }, select: { id: true, fullName: true, lastSeen: true } });
      } else {
        const code = cleanCode(query);
        if (code.length !== 8) return fail('A Friend code has 8 letters and numbers, like K7QX-9MWD. You can also enter an email.');
        const row = (await prisma.$queryRawUnsafe<{ userId: string }[]>(`SELECT "userId" FROM friend_codes WHERE code = $1`, code))[0];
        if (row) found = await prisma.user.findUnique({ where: { id: row.userId }, select: { id: true, fullName: true, lastSeen: true } });
      }
      if (!found) return ok({ user: null });
      const [rel, codes] = await Promise.all([relationsWith(me, [found.id]), codesFor([found.id])]);
      return ok({ user: { ...personView(found, codes.get(found.id)), relation: rel[found.id] } });
    }

    case 'friends-request': {
      const other = str(data.friendId, 64);
      if (!other || other === me) return fail("You can't add yourself.");
      const limit = checkRateLimit(`friends_request:${me}`, 40, 24 * 60 * 60 * 1000);
      if (!limit.allowed) return fail('You have sent many friend requests today. Please try again tomorrow.', 429);
      const target = await prisma.user.findUnique({ where: { id: other }, select: { id: true } });
      if (!target) return fail('User not found.', 404);
      const rel = (await relationsWith(me, [other]))[other];
      if (rel === 'friends') return ok({ relation: 'friends' });
      if (rel === 'outgoing') return ok({ relation: 'outgoing' });
      if (await friendCount(me) >= MAX_FRIENDS) return fail(`You can have up to ${MAX_FRIENDS} friends.`);
      const [a, b] = pair(me, other);
      // They had already asked you: this accepts it
      if (rel === 'incoming') {
        await prisma.$executeRawUnsafe(`UPDATE friend_links SET status = 'accepted', "acceptedAt" = NOW() WHERE "userA" = $1 AND "userB" = $2`, a, b);
        notifyAccepted(me, other);
        return ok({ relation: 'friends' });
      }
      const out = await prisma.$queryRawUnsafe<{ n: number }[]>(
        `SELECT COUNT(*)::int AS n FROM friend_links WHERE ("userA" = $1 OR "userB" = $1) AND status = 'pending' AND "requestedBy" = $1`, me);
      if ((out[0]?.n || 0) >= MAX_PENDING_OUT) return fail(`You have ${MAX_PENDING_OUT} requests waiting. Cancel some first.`);
      const added = await prisma.$executeRawUnsafe(
        `INSERT INTO friend_links ("userA", "userB", "requestedBy") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, a, b, me);
      if (added) {
        notifyUser(other, async () => ({
          type: 'friend_request', title: 'New friend request', body: `${await nameOf(me, 'A student')} wants to be your friend.`,
          tag: `request-${me}`, data: { screen: 'friends', section: 'requests' },
        }));
      }
      return ok({ relation: 'outgoing' });
    }

    case 'friends-respond': {
      const other = str(data.friendId, 64);
      const [a, b] = pair(me, other);
      if (data.accept) {
        if (await friendCount(me) >= MAX_FRIENDS) return fail(`You can have up to ${MAX_FRIENDS} friends.`);
        const n = await prisma.$executeRawUnsafe(
          `UPDATE friend_links SET status = 'accepted', "acceptedAt" = NOW()
           WHERE "userA" = $1 AND "userB" = $2 AND status = 'pending' AND "requestedBy" = $3`, a, b, other);
        if (n) notifyAccepted(me, other);
        return n ? ok({ relation: 'friends' }) : fail('This request is no longer there.', 404);
      }
      await prisma.$executeRawUnsafe(
        `DELETE FROM friend_links WHERE "userA" = $1 AND "userB" = $2 AND status = 'pending' AND "requestedBy" = $3`, a, b, other);
      return ok({ relation: 'none' });
    }

    // Unfriend, or cancel a request you sent
    case 'friends-remove': {
      const other = str(data.friendId, 64);
      const [a, b] = pair(me, other);
      await prisma.$executeRawUnsafe(`DELETE FROM friend_links WHERE "userA" = $1 AND "userB" = $2`, a, b);
      return ok({ relation: 'none' });
    }

    case 'friends-messages': {
      const other = str(data.friendId, 64);
      if (!(await areFriends(me, other))) return fail('You can chat only with friends.', 403, 'NOT_FRIENDS');
      // EGRESS-OPT: the open chat polls every few seconds. With `since` (the cursor from the
      // previous reply) only messages that are new, newly read or deleted since then are sent,
      // instead of the last 300 messages every time. The cursor is the database's own clock.
      const since = typeof data.since === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?$/.test(data.since) ? data.since : null;
      const pairWhere = `(("fromId" = $1 AND "toId" = $2) OR ("fromId" = $2 AND "toId" = $1))`;
      const [rows, person, cursorRow] = await Promise.all([
        since
          ? prisma.$queryRawUnsafe<{ id: string; fromId: string; text: string; kind: string; meta: any; readAt: Date | null; deletedAt: Date | null; createdAt: Date }[]>(
            `SELECT id, "fromId", CASE WHEN "deletedAt" IS NULL THEN text ELSE '' END AS text, kind,
                    CASE WHEN "deletedAt" IS NULL THEN meta END AS meta, "readAt", "deletedAt", "createdAt"
             FROM friend_messages
             WHERE ${pairWhere}
               AND ("createdAt" > $3::timestamp - interval '5 seconds' OR "readAt" > $3::timestamp - interval '5 seconds' OR "deletedAt" > $3::timestamp - interval '5 seconds')
             ORDER BY "createdAt" LIMIT 300`, me, other, since)
          : prisma.$queryRawUnsafe<{ id: string; fromId: string; text: string; kind: string; meta: any; readAt: Date | null; deletedAt: Date | null; createdAt: Date }[]>(
            `SELECT * FROM (
               SELECT id, "fromId", text, kind, meta, "readAt", NULL::timestamp AS "deletedAt", "createdAt" FROM friend_messages
               WHERE "deletedAt" IS NULL AND ${pairWhere}
               ORDER BY "createdAt" DESC LIMIT 300
             ) t ORDER BY "createdAt"`, me, other),
        prisma.user.findUnique({ where: { id: other }, select: { id: true, fullName: true, lastSeen: true } }),
        prisma.$queryRawUnsafe<{ c: string }[]>(`SELECT to_char(LOCALTIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS c`),
      ]);
      const codes = await codesFor([other]);
      // Opening the chat reads their messages
      await prisma.$executeRawUnsafe(
        `UPDATE friend_messages SET "readAt" = NOW() WHERE "toId" = $1 AND "fromId" = $2 AND "readAt" IS NULL`, me, other);
      // also their notifications (on opening, and when new messages arrive in the open chat)
      if (!since || rows.some(r => r.fromId === other && !r.readAt)) await markNotificationsRead(me, `chat-${other}`).catch(() => {});
      return ok({
        friend: person ? personView(person, codes.get(other)) : null,
        partial: !!since,
        cursor: cursorRow[0]?.c || null,
        messages: rows.map(r => ({ id: r.id, mine: r.fromId === me, text: r.text, kind: r.kind, meta: r.meta, read: !!r.readAt, createdAt: r.createdAt, ...(r.deletedAt ? { deleted: true } : {}) })),
      });
    }

    case 'friends-send': {
      const other = str(data.friendId, 64);
      const text = str(data.text, MAX_MESSAGE + 1);
      if (!text) return fail('Write a message first.');
      if (text.length > MAX_MESSAGE) return fail(`Messages can be up to ${MAX_MESSAGE} characters.`);
      const limit = checkRateLimit(`friends_send:${me}`, 40, 60 * 1000);
      if (!limit.allowed) return fail('You are sending messages too fast. Please wait a moment.', 429);
      if (!(await areFriends(me, other))) return fail('You can chat only with friends.', 403, 'NOT_FRIENDS');
      const id = await sendFriendMessage(me, other, text);
      // one notification per chat, showing the latest message
      notifyUser(other, async () => {
        const name = await nameOf(me);
        return { type: 'friend_message', title: name, body: text, tag: `chat-${me}`, data: { screen: 'chat', friendId: me, friendName: name } };
      });
      return ok({ id });
    }

    case 'friends-delete-message': {
      const id = str(data.id, 64);
      const n = await prisma.$executeRawUnsafe(
        `UPDATE friend_messages SET "deletedAt" = NOW() WHERE id = $1 AND "fromId" = $2 AND "deletedAt" IS NULL`, id, me);
      return n ? ok() : fail('Message not found.', 404);
    }
  }
  return fail(`Invalid action: ${action}`);
}
