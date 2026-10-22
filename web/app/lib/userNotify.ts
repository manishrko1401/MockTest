import crypto from 'crypto';
import { after, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { sendPush } from './adminPush';

// -----------------------------------------------------------------------------
// Students' notifications: friend requests, friend messages, room invites / joins / starts and
// support replies. Each one is kept in the student's notification list (the bell) and pushed:
//  - Android app: Firebase push to every phone the student is signed in on (shown even when
//    the app is closed);
//  - Windows app: it asks for new ones every minute while running (also from the tray) and
//    shows a Windows notification.
// A student can switch each kind off (prefs); switched-off kinds still go to the list.
// Messages from one friend share a `tag`: one unread entry and one phone notification per
// chat, updated with the latest message.
// -----------------------------------------------------------------------------

export type NotifyType = 'friend_request' | 'friend_accepted' | 'friend_message' | 'room_invite' | 'room_joined' | 'room_started' | 'support_reply';

/** The switches students see in their settings, and which notifications each one covers. */
export const NOTIFY_GROUPS = {
  requests: ['friend_request', 'friend_accepted'],
  messages: ['friend_message'],
  rooms: ['room_invite', 'room_joined', 'room_started'],
  support: ['support_reply'],
} as const satisfies Record<string, NotifyType[]>;
export type NotifyGroup = keyof typeof NOTIFY_GROUPS;
const groupOf = (t: NotifyType) => (Object.keys(NOTIFY_GROUPS) as NotifyGroup[]).find(g => (NOTIFY_GROUPS[g] as readonly string[]).includes(t))!;

/** Android notification channel (made by the app; each can be tuned in Android settings). */
const CHANNEL: Record<NotifyGroup, string> = { requests: 'friends', messages: 'friends', rooms: 'rooms', support: 'support' };

export const NOTIFY_ACTIONS = ['notif-list', 'notif-since', 'notif-read', 'notif-device', 'notif-device-remove', 'notif-prefs'] as const;

let ready: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      for (const sql of [
        `CREATE TABLE IF NOT EXISTS user_notifications (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          data JSONB NOT NULL DEFAULT '{}',
          tag TEXT,
          "readAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS user_notifications_user_idx ON user_notifications ("userId", "createdAt" DESC)`,
        `CREATE TABLE IF NOT EXISTS user_push_devices (
          token TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          platform TEXT NOT NULL DEFAULT 'android',
          "appVersion" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS user_push_devices_user_idx ON user_push_devices ("userId")`,
        `CREATE TABLE IF NOT EXISTS user_notify_prefs (
          "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          muted TEXT[] NOT NULL DEFAULT '{}',
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE user_push_devices ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE user_notify_prefs ENABLE ROW LEVEL SECURITY`,
      ]) await prisma.$executeRawUnsafe(sql);
    })().catch(err => { ready = null; throw err; });
  }
  return ready;
}

type Notice = { type: NotifyType; title: string; body: string; data?: Record<string, string>; tag?: string };

const clip = (s: string, n: number) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

async function deliver(userId: string, n: Notice) {
  await ensureTables();
  const title = clip(n.title, 120), body = clip(n.body, 300);
  const data = { ...(n.data || {}), type: n.type };
  // Same tag and still unread (e.g. more messages in one chat): update it instead of adding
  let id: string | null = null;
  if (n.tag) {
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `UPDATE user_notifications SET type = $6, title = $3, body = $4, data = $5::jsonb, "createdAt" = NOW()
       WHERE "userId" = $1 AND tag = $2 AND "readAt" IS NULL RETURNING id`, userId, n.tag, title, body, JSON.stringify(data), n.type);
    id = rows[0]?.id || null;
  }
  if (!id) {
    id = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_notifications (id, "userId", type, title, body, data, tag) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      id, userId, n.type, title, body, JSON.stringify(data), n.tag || null);
    // Keep the list short: older than 30 days goes (now and then)
    if (Math.random() < 0.02) await prisma.$executeRawUnsafe(`DELETE FROM user_notifications WHERE "createdAt" < NOW() - interval '30 days'`).catch(() => {});
  }

  const group = groupOf(n.type);
  const [prefs, devices] = await Promise.all([
    prisma.$queryRawUnsafe<{ muted: string[] }[]>(`SELECT muted FROM user_notify_prefs WHERE "userId" = $1`, userId),
    prisma.$queryRawUnsafe<{ token: string }[]>(`SELECT token FROM user_push_devices WHERE "userId" = $1 AND platform = 'android'`, userId),
  ]);
  if ((prefs[0]?.muted || []).includes(group) || !devices.length) return;
  const r = await sendPush(devices.map(d => d.token), { title, body, data: { ...data, id }, channel: CHANNEL[group], tag: n.tag });
  if (r.dead.length) await prisma.$executeRawUnsafe(`DELETE FROM user_push_devices WHERE token = ANY($1::text[])`, r.dead).catch(() => {});
}

/**
 * Notifies a student. Runs after the response, so the action that caused it is never slowed
 * down or broken by it. `build` runs then too (for name lookups); returning null sends nothing.
 */
export function notifyUser(userId: string, build: () => Promise<Notice | null> | Notice | null) {
  const run = async () => { const n = await build(); if (n) await deliver(userId, n); };
  try {
    after(() => run().catch(err => console.error('Notification failed:', err)));
  } catch {
    run().catch(err => console.error('Notification failed:', err));
  }
}

/** Opening a chat or a room reads its notifications (no reminder for what's already seen). */
export async function markNotificationsRead(userId: string, tag: string) {
  await ensureTables();
  await prisma.$executeRawUnsafe(`UPDATE user_notifications SET "readAt" = NOW() WHERE "userId" = $1 AND tag = $2 AND "readAt" IS NULL`, userId, tag);
}

/** A student's name for notification titles. */
export async function nameOf(userId: string, fallback = 'A friend') {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } }).catch(() => null);
  return u?.fullName?.trim() || fallback;
}

// ---- Actions (the student's own notifications only) -------------------------------------------

const ok = (body: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...body });
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });
const view = (r: any) => ({ id: r.id, type: r.type, title: r.title, body: r.body, data: r.data || {}, read: !!r.readAt, createdAt: r.createdAt });

export async function handleNotifyAction(action: string, data: any, userId: string): Promise<NextResponse> {
  await ensureTables();
  switch (action) {
    // The bell: latest 40 and the unread count
    case 'notif-list': {
      const [rows, unread] = await Promise.all([
        prisma.$queryRawUnsafe<any[]>(
          `SELECT id, type, title, body, data, "readAt", "createdAt" FROM user_notifications WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 40`, userId),
        prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM user_notifications WHERE "userId" = $1 AND "readAt" IS NULL`, userId),
      ]);
      return ok({ items: rows.map(view), unread: unread[0]?.n || 0 });
    }

    // The Windows app's check every minute: only what's new since its last check (usually nothing)
    case 'notif-since': {
      const since = typeof data?.since === 'string' && !Number.isNaN(Date.parse(data.since)) ? new Date(data.since) : null;
      const [rows, unread, muted] = await Promise.all([
        since
          ? prisma.$queryRawUnsafe<any[]>(
            `SELECT id, type, title, body, data, "readAt", "createdAt" FROM user_notifications
             WHERE "userId" = $1 AND "createdAt" > $2 AND "readAt" IS NULL ORDER BY "createdAt" LIMIT 20`, userId, since)
          : Promise.resolve([]),
        prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM user_notifications WHERE "userId" = $1 AND "readAt" IS NULL`, userId),
        prisma.$queryRawUnsafe<{ muted: string[] }[]>(`SELECT muted FROM user_notify_prefs WHERE "userId" = $1`, userId),
      ]);
      const off = muted[0]?.muted || [];
      const now = await prisma.$queryRawUnsafe<{ t: Date }[]>(`SELECT NOW() AS t`);
      return ok({
        items: rows.filter(r => !off.includes(groupOf(r.type))).map(view),
        unread: unread[0]?.n || 0,
        // the next check asks from here (the database's clock, so the PC's clock doesn't matter)
        cursor: now[0].t,
      });
    }

    case 'notif-read': {
      if (data?.all) {
        await prisma.$executeRawUnsafe(`UPDATE user_notifications SET "readAt" = NOW() WHERE "userId" = $1 AND "readAt" IS NULL`, userId);
      } else {
        const ids = Array.isArray(data?.ids) ? data.ids.filter((x: unknown) => typeof x === 'string').slice(0, 100) : [];
        if (ids.length) await prisma.$executeRawUnsafe(`UPDATE user_notifications SET "readAt" = NOW() WHERE "userId" = $1 AND id = ANY($2::text[]) AND "readAt" IS NULL`, userId, ids);
        // Opening a chat / room reads its notifications too
        const tag = typeof data?.tag === 'string' ? data.tag.slice(0, 100) : '';
        if (tag) await prisma.$executeRawUnsafe(`UPDATE user_notifications SET "readAt" = NOW() WHERE "userId" = $1 AND tag = $2 AND "readAt" IS NULL`, userId, tag);
      }
      return ok();
    }

    // The Android app tells the server where to send pushes (one phone = one token)
    case 'notif-device': {
      const token = typeof data?.token === 'string' ? data.token.trim() : '';
      if (token.length < 20 || token.length > 4096) return fail('Invalid device');
      const version = typeof data?.appVersion === 'string' ? data.appVersion.slice(0, 20) : null;
      // A phone signed in to another account moves to this one
      await prisma.$executeRawUnsafe(
        `INSERT INTO user_push_devices (token, "userId", platform, "appVersion") VALUES ($1, $2, 'android', $3)
         ON CONFLICT (token) DO UPDATE SET "userId" = EXCLUDED."userId", "appVersion" = EXCLUDED."appVersion", "lastSeenAt" = NOW()`, token, userId, version);
      return ok();
    }

    // Signing out on a phone stops its pushes
    case 'notif-device-remove': {
      const token = typeof data?.token === 'string' ? data.token.trim() : '';
      if (token) await prisma.$executeRawUnsafe(`DELETE FROM user_push_devices WHERE token = $1 AND "userId" = $2`, token, userId);
      return ok();
    }

    // Read or change which kinds are switched off
    case 'notif-prefs': {
      if (Array.isArray(data?.muted)) {
        const muted = data.muted.filter((g: unknown): g is NotifyGroup => typeof g === 'string' && g in NOTIFY_GROUPS);
        await prisma.$executeRawUnsafe(
          `INSERT INTO user_notify_prefs ("userId", muted) VALUES ($1, $2::text[])
           ON CONFLICT ("userId") DO UPDATE SET muted = EXCLUDED.muted, "updatedAt" = NOW()`, userId, muted);
        return ok({ muted });
      }
      const rows = await prisma.$queryRawUnsafe<{ muted: string[] }[]>(`SELECT muted FROM user_notify_prefs WHERE "userId" = $1`, userId);
      return ok({ muted: rows[0]?.muted || [] });
    }
  }
  return fail(`Invalid action: ${action}`);
}
