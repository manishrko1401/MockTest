import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { generateExamSession } from './examUtils';
import { isCbatTest, isRpscRasTest } from './examScoring';
import { checkRateLimit } from './botProtection';
import { areFriends, ensureFriendTables, relationsWith, sendFriendMessage } from './friends';
import { heldSessions } from './integrity';

// -----------------------------------------------------------------------------
// Test with Friends. A student opens a "room" for one mock test and invites friends with a
// code / link. Everyone takes the normal exam; the room page then compares the results:
// leaderboard, section-wise marks, every question (answer + time taken) and a discussion
// chat on each question.
//
//  - Live room: friends wait in a lobby, the host presses Start; each friend's first attempt
//    started after that (and finished before the room closes) counts.
//  - Anytime room: open for a few days; each friend's first attempt at the test counts
//    (also one taken before joining, e.g. the host's own attempt).
//
// Fair play: nobody sees other friends' answers, the comparison or the chat until they have
// finished the test themselves. Each friend needs their own access to the test (PRO tests
// need PRO), so a room can't be used to unlock PRO tests.
// -----------------------------------------------------------------------------

export const ROOM_ACTIONS = [
  'room-create', 'room-join', 'room-leave', 'room-start', 'room-close', 'room-get', 'room-mine',
  'room-messages', 'room-send', 'room-delete-message', 'room-set-limit', 'room-add-friend', 'room-hide',
] as const;

// The room maker chooses how many friends can join (MIN_LIMIT..MAX_LIMIT)
export const MIN_LIMIT = 2;
export const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const MAX_OPEN_HOSTED = 10;
const LIVE_GRACE_MINUTES = 30;          // after the test duration, for late submits
const ANYTIME_HOURS = [24, 72, 168];
const MAX_MESSAGE = 1000;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[A-Z2-9]{6}$/;

type Requester = { id: string; role: string };
export type RoomDeps = {
  loadTestQuestions: (testId: string) => Promise<{ mockTest: any; questions: any[] | null }>;
  getCatalog: () => Promise<any>;
  tierAllows: (required: string, userTier: string | null | undefined) => boolean;
};

let tablesReady: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      for (const sql of [
        `CREATE TABLE IF NOT EXISTS friend_rooms (
          code TEXT PRIMARY KEY,
          "testId" TEXT NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
          "hostId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          mode TEXT NOT NULL,
          "startedAt" TIMESTAMP(3),
          "closesAt" TIMESTAMP(3),
          "closedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS friend_rooms_host_idx ON friend_rooms ("hostId")`,
        `ALTER TABLE friend_rooms ADD COLUMN IF NOT EXISTS "maxMembers" INT NOT NULL DEFAULT ${DEFAULT_LIMIT}`,
        `CREATE TABLE IF NOT EXISTS friend_room_members (
          code TEXT NOT NULL REFERENCES friend_rooms(code) ON DELETE CASCADE,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "sessionId" TEXT REFERENCES user_test_sessions(id) ON DELETE SET NULL,
          "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          PRIMARY KEY (code, "userId")
        )`,
        `CREATE INDEX IF NOT EXISTS friend_room_members_user_idx ON friend_room_members ("userId")`,
        // A member removed the room from their "My rooms" list (the room carries on for the others)
        `ALTER TABLE friend_room_members ADD COLUMN IF NOT EXISTS "hiddenAt" TIMESTAMP(3)`,
        `CREATE TABLE IF NOT EXISTS friend_room_messages (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL REFERENCES friend_rooms(code) ON DELETE CASCADE,
          "questionId" TEXT NOT NULL,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          "deletedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS friend_room_messages_q_idx ON friend_room_messages (code, "questionId", "createdAt")`,
        // Not readable through Supabase's public REST API (the app's own connection bypasses RLS)
        `ALTER TABLE friend_rooms ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE friend_room_members ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE friend_room_messages ENABLE ROW LEVEL SECURITY`,
      ]) {
        await prisma.$executeRawUnsafe(sql);
      }
    })().catch(err => { tablesReady = null; throw err; });
  }
  return tablesReady;
}

type RoomRow = { code: string; testId: string; hostId: string; mode: 'live' | 'anytime'; maxMembers: number; startedAt: Date | null; closesAt: Date | null; closedAt: Date | null; createdAt: Date };
type MemberRow = { userId: string; sessionId: string | null; joinedAt: Date; fullName: string };

const ok = (body: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...body });
const fail = (error: string, status = 400, code?: string) => NextResponse.json({ success: false, error, ...(code ? { code } : {}) }, { status });
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const codeOf = (v: unknown) => { const c = str(v, 12).toUpperCase(); return CODE_RE.test(c) ? c : ''; };
const round2 = (n: number) => Math.round(n * 100) / 100;
const limitOf = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= MIN_LIMIT && n <= MAX_LIMIT ? n : null; };

function newCode() {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, b => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

/** lobby → open → closed. Live rooms close a while after the test time is over. */
function statusOf(room: RoomRow, now = Date.now()): 'lobby' | 'open' | 'closed' {
  if (room.closedAt) return 'closed';
  if (room.mode === 'live' && !room.startedAt) return 'lobby';
  if (room.closesAt && now > room.closesAt.getTime()) return 'closed';
  return 'open';
}

async function getRoom(code: string): Promise<RoomRow | null> {
  const rows = await prisma.$queryRawUnsafe<RoomRow[]>(`SELECT * FROM friend_rooms WHERE code = $1`, code);
  return rows[0] || null;
}

async function getMembers(code: string): Promise<MemberRow[]> {
  return prisma.$queryRawUnsafe<MemberRow[]>(
    `SELECT m."userId", m."sessionId", m."joinedAt", u."fullName"
     FROM friend_room_members m JOIN users u ON u.id = m."userId"
     WHERE m.code = $1 ORDER BY m."joinedAt"`, code);
}

async function testInfo(testId: string) {
  const rows = await prisma.$queryRawUnsafe<{ id: string; title: string; durationMinutes: number; requiredTierName: string | null; hasQuestions: boolean }[]>(
    `SELECT id, title, "durationMinutes", "requiredTierName",
            ("customQuestions" IS NOT NULL AND "customQuestions" <> 'null'::jsonb) AS "hasQuestions"
     FROM mock_tests WHERE id = $1 LIMIT 1`, testId);
  return rows[0] || null;
}

/** Same rule as the exam page: staff, free tests, the right plan, or already taken. */
async function mayTakeTest(requester: Requester, test: { id: string; requiredTierName: string | null }, deps: RoomDeps) {
  if (requester.role !== 'STUDENT') return true;
  const required = test.requiredTierName || 'None';
  if (required === 'None') return true;
  const [u, done] = await Promise.all([
    prisma.user.findUnique({ where: { id: requester.id }, select: { subscriptionTier: true } }),
    prisma.userTestSession.findFirst({ where: { userId: requester.id, mockTestId: test.id, status: { in: ['COMPLETED', 'AUTO_SUBMITTED'] } }, select: { id: true } }),
  ]);
  return !!done || deps.tierAllows(required, u?.subscriptionTier);
}

/**
 * Finds the attempt that counts for each member who hasn't got one yet, and keeps it (so a
 * later retake never replaces it).
 */
async function linkAttempts(room: RoomRow, members: MemberRow[]) {
  const missing = members.filter(m => !m.sessionId);
  if (!missing.length || (room.mode === 'live' && !room.startedAt)) return members;
  const until = room.closesAt || new Date(8640000000000000);
  const found = await prisma.userTestSession.findMany({
    where: {
      userId: { in: missing.map(m => m.userId) },
      mockTestId: room.testId,
      status: { in: ['COMPLETED', 'AUTO_SUBMITTED'] },
      completedAt: { lte: until, ...(room.mode === 'live' ? { gte: room.startedAt! } : {}) },
    },
    orderBy: { completedAt: 'asc' },
    select: { id: true, userId: true, completedAt: true, timeSpentSeconds: true },
  });
  // Live: the attempt must have begun after the host pressed Start. A saved attempt's
  // startedAt is the time it was saved, so its real start is "finished minus time spent"
  // (2 minutes' leeway for clocks and the instructions screen).
  const liveFrom = room.mode === 'live' ? room.startedAt!.getTime() - 120000 : 0;
  const first = new Map<string, string>();
  for (const s of found) {
    if (first.has(s.userId)) continue;
    if (room.mode === 'live' && (s.completedAt!.getTime() - (s.timeSpentSeconds || 0) * 1000) < liveFrom) continue;
    first.set(s.userId, s.id);
  }
  for (const m of missing) {
    const sid = first.get(m.userId);
    if (!sid) continue;
    await prisma.$executeRawUnsafe(
      `UPDATE friend_room_members SET "sessionId" = $1 WHERE code = $2 AND "userId" = $3 AND "sessionId" IS NULL`, sid, room.code, m.userId);
    m.sessionId = sid;
  }
  return members;
}

/**
 * Everyone's results, worked out with the same marking as the analysis page: score, correct /
 * wrong / skipped, marks per section, and per question the chosen option and time taken.
 */
// EGRESS-OPT: the room page refreshes every few seconds, and building the comparison reads
// every member's answers. A submitted attempt never changes, so a comparison is reused until
// another member finishes (the key holds the finished attempts) or 15 minutes pass.
const comparisonMemo = new Map<string, { at: number; value: Awaited<ReturnType<typeof buildComparisonFresh>> }>();
const COMPARISON_TTL_MS = 15 * 60 * 1000;

async function buildComparison(room: RoomRow, members: MemberRow[], deps: RoomDeps) {
  const key = `${room.code}:${room.testId}:${members.filter(m => m.sessionId).map(m => `${m.userId}=${m.sessionId}`).sort().join(',')}`;
  const hit = comparisonMemo.get(key);
  let value = hit && Date.now() - hit.at < COMPARISON_TTL_MS ? hit.value : null;
  if (!value) {
    value = await buildComparisonFresh(room, members, deps);
    if (comparisonMemo.size > 300) comparisonMemo.clear();
    comparisonMemo.set(key, { at: Date.now(), value });
  }
  if (!value) return value;
  // Attempts held by the integrity checks are listed but not ranked until an admin clears them
  const held = await heldSessions(members.filter(m => m.sessionId).map(m => m.sessionId!));
  if (!held.size) return value;
  const heldUsers = new Set(members.filter(m => m.sessionId && held.has(m.sessionId)).map(m => m.userId));
  return { ...value, results: value.results.map(r => (heldUsers.has(r.userId) ? { ...r, underReview: true } : r)) };
}

async function buildComparisonFresh(room: RoomRow, members: MemberRow[], deps: RoomDeps) {
  const done = members.filter(m => m.sessionId);
  const [{ mockTest, questions }, catalog, sessions] = await Promise.all([
    deps.loadTestQuestions(room.testId),
    deps.getCatalog(),
    prisma.userTestSession.findMany({
      where: { id: { in: done.map(m => m.sessionId!) } },
      select: {
        id: true, userId: true, finalScore: true, maxScore: true, accuracyPercentage: true, timeSpentSeconds: true, completedAt: true, startedAt: true,
        responses: { select: { questionId: true, selectedOptionIndex: true, state: true, elapsedSeconds: true } },
      },
    }),
  ]);
  if (!questions?.length) return null;
  const session = generateExamSession(room.testId, catalog, {
    questions, positiveMarks: mockTest?.positiveMarks, negativeMarks: mockTest?.negativeMarks,
    durationMinutes: mockTest?.durationMinutes, sections: mockTest?.sections,
  });
  const rpsc = isRpscRasTest(room.testId, session);
  const sectionById = new Map(session.sections.map(s => [s.id, s]));
  const ordered = session.sections.flatMap(sec =>
    session.questions.filter(q => q.sectionId === sec.id).sort((a, b) => a.orderIndex - b.orderIndex));
  const marksOf = (q: any) => {
    const sec: any = sectionById.get(q.sectionId) || {};
    return {
      pos: q.positiveMark != null ? Number(q.positiveMark) : Number(sec.positiveMark || 0),
      neg: q.negativeMark != null ? Number(q.negativeMark) : Number(sec.negativeMark || 0),
    };
  };

  const results = sessions.map(s => {
    const byQ = new Map(s.responses.map(r => [r.questionId, r]));
    let correct = 0, wrong = 0, skipped = 0;
    const sections: Record<string, { score: number; correct: number; wrong: number; skipped: number; time: number }> = {};
    // per question: [chosen option or null, seconds, 1 correct / 0 wrong / null skipped]
    const answers: [number | null, number, 1 | 0 | null][] = ordered.map(q => {
      const r = byQ.get(q.id);
      const { pos, neg } = marksOf(q);
      const sec = (sections[q.sectionId] ||= { score: 0, correct: 0, wrong: 0, skipped: 0, time: 0 });
      const t = Math.max(0, r?.elapsedSeconds || 0);
      sec.time += t;
      const answered = !!r && (r.state === 3 || r.state === 5 || (r.selectedOptionIndex !== null && r.selectedOptionIndex !== undefined));
      if (!answered || (rpsc && r!.selectedOptionIndex === 4)) {
        skipped++; sec.skipped++;
        return [r?.selectedOptionIndex ?? null, t, null];
      }
      if (r!.selectedOptionIndex === q.correctOptionIndex) {
        correct++; sec.correct++; sec.score += pos;
        return [r!.selectedOptionIndex, t, 1];
      }
      wrong++; sec.wrong++; sec.score -= neg;
      return [r!.selectedOptionIndex, t, 0];
    });
    Object.values(sections).forEach(v => { v.score = round2(v.score); });
    return {
      userId: s.userId, score: s.finalScore ?? 0, maxScore: s.maxScore ?? mockTest?.maxMarks ?? 0,
      accuracy: s.accuracyPercentage ?? 0, timeSeconds: s.timeSpentSeconds || answers.reduce((a, x) => a + x[1], 0),
      completedAt: s.completedAt, correct, wrong, skipped, sections, answers,
    };
  });

  return {
    sections: session.sections.map(s => ({
      id: s.id, name: s.name,
      maxScore: round2(ordered.filter(q => q.sectionId === s.id).reduce((a, q) => a + marksOf(q).pos, 0)),
      questions: ordered.filter(q => q.sectionId === s.id).length,
    })),
    questions: ordered.map((q, i) => ({ id: q.id, n: i + 1, sectionId: q.sectionId, correct: q.correctOptionIndex })),
    results,
  };
}

function memberView(m: MemberRow, room: RoomRow, relation?: string) {
  return { userId: m.userId, name: m.fullName || 'Student', isHost: m.userId === room.hostId, joinedAt: m.joinedAt, finished: !!m.sessionId, relation };
}

/** Your friends who aren't in this room yet (for "Add from your friends"), online first. */
async function friendsNotInRoom(me: string, code: string) {
  const rows = await prisma.$queryRawUnsafe<{ id: string; fullName: string; lastSeen: Date | null }[]>(
    `SELECT u.id, u."fullName", u."lastSeen" FROM friend_links l
     JOIN users u ON u.id = CASE WHEN l."userA" = $1 THEN l."userB" ELSE l."userA" END
     WHERE (l."userA" = $1 OR l."userB" = $1) AND l.status = 'accepted'
       AND NOT EXISTS (SELECT 1 FROM friend_room_members m WHERE m.code = $2 AND m."userId" = u.id)
     ORDER BY u."lastSeen" DESC NULLS LAST LIMIT 200`, me, code);
  return rows.map(r => ({ userId: r.id, name: r.fullName || 'Student', online: !!r.lastSeen && Date.now() - new Date(r.lastSeen).getTime() < 5 * 60000 }));
}

export async function handleRoomAction(action: string, data: any, requester: Requester, deps: RoomDeps): Promise<NextResponse> {
  await Promise.all([ensureTables(), ensureFriendTables()]);
  const me = requester.id;

  switch (action) {
    case 'room-create': {
      const limit = checkRateLimit(`room_create:${me}`, 20, 24 * 60 * 60 * 1000);
      if (!limit.allowed) return fail('You have created many rooms today. Please try again tomorrow.', 429);
      const testId = str(data.testId, 120);
      const mode = data.mode === 'live' ? 'live' : 'anytime';
      const hours = ANYTIME_HOURS.includes(Number(data.hours)) ? Number(data.hours) : 72;
      const maxMembers = data.maxMembers === undefined ? DEFAULT_LIMIT : limitOf(data.maxMembers);
      if (maxMembers === null) return fail(`Choose between ${MIN_LIMIT} and ${MAX_LIMIT} friends.`);
      const test = testId ? await testInfo(testId) : null;
      if (!test) return fail('Test not found.', 404);
      if (!test.hasQuestions) return fail("This test doesn't have questions yet.");
      if (isCbatTest(test.id, await deps.getCatalog())) return fail('CBAT tests cannot be taken in a friends room.');
      if (!(await mayTakeTest(requester, test, deps))) return fail('This is a PRO test. Unlock it to create a room.', 403, 'PRO_REQUIRED');
      const hosted = await prisma.$queryRawUnsafe<{ n: number }[]>(
        `SELECT COUNT(*)::int AS n FROM friend_rooms WHERE "hostId" = $1 AND "closedAt" IS NULL AND ("closesAt" IS NULL OR "closesAt" > NOW())`, me);
      if ((hosted[0]?.n || 0) >= MAX_OPEN_HOSTED) return fail(`You already have ${MAX_OPEN_HOSTED} open rooms. Close one first.`);
      let code = '';
      for (let i = 0; i < 6 && !code; i++) {
        const c = newCode();
        const inserted = await prisma.$executeRawUnsafe(
          `INSERT INTO friend_rooms (code, "testId", "hostId", mode, "maxMembers", "closesAt")
           VALUES ($1, $2, $3, $4, $6, CASE WHEN $4 = 'anytime' THEN NOW() + make_interval(hours => $5::int) ELSE NULL END)
           ON CONFLICT (code) DO NOTHING`, c, test.id, me, mode, hours, maxMembers);
        if (inserted) code = c;
      }
      if (!code) return fail('Please try again.', 500);
      await prisma.$executeRawUnsafe(`INSERT INTO friend_room_members (code, "userId") VALUES ($1, $2)`, code, me);
      return ok({ code });
    }

    case 'room-join': {
      const code = codeOf(data.code);
      const room = code ? await getRoom(code) : null;
      if (!room) return fail('Room not found. Check the code.', 404);
      if (statusOf(room) === 'closed') return fail('This room has closed.');
      const members = await getMembers(code);
      if (members.some(m => m.userId === me)) {
        // joining again brings it back to "My rooms"
        await prisma.$executeRawUnsafe(`UPDATE friend_room_members SET "hiddenAt" = NULL WHERE code = $1 AND "userId" = $2`, code, me);
        return ok({ code });
      }
      if (members.length >= room.maxMembers) return fail(`This room is full (${room.maxMembers} friends).`);
      const test = await testInfo(room.testId);
      if (!test) return fail('Test not found.', 404);
      if (!(await mayTakeTest(requester, test, deps))) return fail('This is a PRO test. Unlock it to join this room.', 403, 'PRO_REQUIRED');
      await prisma.$executeRawUnsafe(`INSERT INTO friend_room_members (code, "userId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, code, me);
      return ok({ code });
    }

    case 'room-leave': {
      const code = codeOf(data.code);
      const room = code ? await getRoom(code) : null;
      if (!room) return fail('Room not found.', 404);
      if (room.hostId === me) return fail('The host cannot leave. Close the room instead.');
      await prisma.$executeRawUnsafe(`DELETE FROM friend_room_members WHERE code = $1 AND "userId" = $2`, code, me);
      return ok();
    }

    case 'room-start': {
      const code = codeOf(data.code);
      const room = code ? await getRoom(code) : null;
      if (!room) return fail('Room not found.', 404);
      if (room.hostId !== me) return fail('Only the host can start the test.', 403);
      if (room.mode !== 'live' || room.startedAt) return ok();
      const test = await testInfo(room.testId);
      await prisma.$executeRawUnsafe(
        `UPDATE friend_rooms SET "startedAt" = NOW(), "closesAt" = NOW() + make_interval(mins => $2::int)
         WHERE code = $1 AND "startedAt" IS NULL`, code, (test?.durationMinutes || 60) + LIVE_GRACE_MINUTES);
      return ok();
    }

    case 'room-close': {
      const code = codeOf(data.code);
      const room = code ? await getRoom(code) : null;
      if (!room) return fail('Room not found.', 404);
      if (room.hostId !== me && requester.role !== 'ADMIN') return fail('Only the host can close the room.', 403);
      await prisma.$executeRawUnsafe(`UPDATE friend_rooms SET "closedAt" = NOW() WHERE code = $1 AND "closedAt" IS NULL`, code);
      return ok();
    }

    // Put a friend straight into the room; they get a chat message with the room link
    case 'room-add-friend': {
      const code = codeOf(data.code);
      const friendId = str(data.friendId, 64);
      const room = code ? await getRoom(code) : null;
      if (!room) return fail('Room not found.', 404);
      if (statusOf(room) === 'closed') return fail('This room has closed.');
      const members = await getMembers(code);
      if (!members.some(m => m.userId === me)) return fail('Join the room first.', 403);
      if (members.some(m => m.userId === friendId)) return ok();
      if (members.length >= room.maxMembers) return fail(`This room is full (${room.maxMembers} friends). Raise the limit first.`);
      if (!(await areFriends(me, friendId))) return fail('You can add only your friends.', 403);
      const [friend, test] = await Promise.all([
        prisma.user.findUnique({ where: { id: friendId }, select: { id: true, role: true, fullName: true } }),
        testInfo(room.testId),
      ]);
      if (!friend || !test) return fail('Not found.', 404);
      if (!(await mayTakeTest({ id: friend.id, role: friend.role }, test, deps))) {
        return fail(`${friend.fullName || 'Your friend'} needs PRO for this test.`, 403, 'PRO_REQUIRED');
      }
      await prisma.$executeRawUnsafe(`INSERT INTO friend_room_members (code, "userId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, code, friendId);
      await sendFriendMessage(me, friendId, `I added you to a test room: ${test.title}`, 'room', { code, testTitle: test.title, mode: room.mode });
      return ok();
    }

    // Remove a room from your own "My rooms" list only
    case 'room-hide': {
      const code = codeOf(data.code);
      if (!code) return fail('Invalid request');
      const n = await prisma.$executeRawUnsafe(
        `UPDATE friend_room_members SET "hiddenAt" = NOW() WHERE code = $1 AND "userId" = $2`, code, me);
      return n ? ok() : fail('Room not found in your list.', 404);
    }

    case 'room-set-limit': {
      const code = codeOf(data.code);
      const room = code ? await getRoom(code) : null;
      if (!room) return fail('Room not found.', 404);
      if (room.hostId !== me) return fail('Only the host can change the limit.', 403);
      const limit = limitOf(data.maxMembers);
      if (limit === null) return fail(`Choose between ${MIN_LIMIT} and ${MAX_LIMIT} friends.`);
      const joined = (await getMembers(code)).length;
      if (limit < joined) return fail(`${joined} friends have already joined, so the limit can't be less than ${joined}.`);
      await prisma.$executeRawUnsafe(`UPDATE friend_rooms SET "maxMembers" = $2 WHERE code = $1`, code, limit);
      return ok({ maxMembers: limit });
    }

    case 'room-get': {
      const code = codeOf(data.code);
      const room = code ? await getRoom(code) : null;
      if (!room) return fail('Room not found. Check the code.', 404);
      const test = await testInfo(room.testId);
      let members = await getMembers(code);
      const mine = members.find(m => m.userId === me);
      const status = statusOf(room);
      const base = {
        room: {
          code: room.code, mode: room.mode, status, testId: room.testId, testTitle: test?.title || '', durationMinutes: test?.durationMinutes || 0,
          locked: test?.requiredTierName && test.requiredTierName !== 'None' ? test.requiredTierName : null,
          hostId: room.hostId, startedAt: room.startedAt, closesAt: room.closesAt, createdAt: room.createdAt,
          maxMembers: room.maxMembers, minLimit: MIN_LIMIT, maxLimit: MAX_LIMIT,
        },
        me: { isMember: !!mine, isHost: room.hostId === me, finished: false },
      };
      // Not a member: only what's needed to decide to join
      if (!mine) {
        return ok({ ...base, members: members.map(m => ({ name: m.fullName || 'Student', isHost: m.userId === room.hostId })) });
      }
      members = await linkAttempts(room, members);
      const finished = !!members.find(m => m.userId === me)?.sessionId;
      const [relations, addable] = await Promise.all([
        relationsWith(me, members.map(m => m.userId)),
        status === 'closed' ? Promise.resolve([]) : friendsNotInRoom(me, code),
      ]);
      const out: Record<string, unknown> = {
        ...base, me: { ...base.me, finished }, members: members.map(m => memberView(m, room, relations[m.userId])), friendsToAdd: addable,
      };
      // Scores, answers and the chat only once you've submitted yourself
      if (finished) {
        out.comparison = await buildComparison(room, members, deps);
        out.messageCounts = Object.fromEntries((await prisma.$queryRawUnsafe<{ questionId: string; n: number }[]>(
          `SELECT "questionId", COUNT(*)::int AS n FROM friend_room_messages WHERE code = $1 AND "deletedAt" IS NULL GROUP BY 1`, code))
          .map(r => [r.questionId, r.n]));
      }
      return ok(out);
    }

    case 'room-mine': {
      const testId = str(data.testId, 120);
      const rows = await prisma.$queryRawUnsafe<(RoomRow & { testTitle: string; members: number; finished: boolean })[]>(
        `SELECT r.*, t.title AS "testTitle",
                (SELECT COUNT(*)::int FROM friend_room_members x WHERE x.code = r.code) AS members,
                (m."sessionId" IS NOT NULL) AS finished
         FROM friend_room_members m
         JOIN friend_rooms r ON r.code = m.code
         JOIN mock_tests t ON t.id = r."testId"
         WHERE m."userId" = $1 AND m."hiddenAt" IS NULL ${testId ? `AND r."testId" = $2` : ''}
         ORDER BY r."createdAt" DESC LIMIT 50`, ...(testId ? [me, testId] : [me]));
      return ok({
        rooms: rows.map(r => ({
          code: r.code, mode: r.mode, status: statusOf(r), testId: r.testId, testTitle: r.testTitle, members: r.members,
          isHost: r.hostId === me, finished: r.finished, createdAt: r.createdAt, closesAt: r.closesAt, startedAt: r.startedAt,
        })),
      });
    }

    case 'room-messages': {
      const code = codeOf(data.code);
      const questionId = str(data.questionId, 200);
      if (!code || !questionId) return fail('Invalid request');
      const member = (await prisma.$queryRawUnsafe<{ sessionId: string | null }[]>(
        `SELECT "sessionId" FROM friend_room_members WHERE code = $1 AND "userId" = $2`, code, me))[0];
      if (!member) return fail('Join the room to see the discussion.', 403);
      if (!member.sessionId) return fail('Finish the test to see the discussion.', 403, 'NOT_FINISHED');
      const room = await getRoom(code);
      const rows = await prisma.$queryRawUnsafe<{ id: string; userId: string; text: string; createdAt: Date; fullName: string }[]>(
        `SELECT m.id, m."userId", m.text, m."createdAt", u."fullName"
         FROM friend_room_messages m JOIN users u ON u.id = m."userId"
         WHERE m.code = $1 AND m."questionId" = $2 AND m."deletedAt" IS NULL
         ORDER BY m."createdAt" LIMIT 300`, code, questionId);
      return ok({
        messages: rows.map(r => ({ id: r.id, userId: r.userId, name: r.fullName || 'Student', text: r.text, createdAt: r.createdAt, mine: r.userId === me, canDelete: r.userId === me || room?.hostId === me })),
      });
    }

    case 'room-send': {
      const code = codeOf(data.code);
      const questionId = str(data.questionId, 200);
      const text = str(data.text, MAX_MESSAGE + 1);
      if (!code || !questionId || !text) return fail('Write a message first.');
      if (text.length > MAX_MESSAGE) return fail(`Messages can be up to ${MAX_MESSAGE} characters.`);
      const limit = checkRateLimit(`room_send:${me}`, 30, 60 * 1000);
      if (!limit.allowed) return fail('You are sending messages too fast. Please wait a moment.', 429);
      const member = (await prisma.$queryRawUnsafe<{ sessionId: string | null }[]>(
        `SELECT "sessionId" FROM friend_room_members WHERE code = $1 AND "userId" = $2`, code, me))[0];
      if (!member) return fail('Join the room to take part in the discussion.', 403);
      if (!member.sessionId) return fail('Finish the test to join the discussion.', 403, 'NOT_FINISHED');
      const id = crypto.randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO friend_room_messages (id, code, "questionId", "userId", text) VALUES ($1, $2, $3, $4, $5)`, id, code, questionId, me, text);
      return ok({ id });
    }

    case 'room-delete-message': {
      const code = codeOf(data.code);
      const id = str(data.id, 64);
      const room = code ? await getRoom(code) : null;
      if (!room || !id) return fail('Invalid request');
      const isHost = room.hostId === me || requester.role === 'ADMIN';
      const n = await prisma.$executeRawUnsafe(
        `UPDATE friend_room_messages SET "deletedAt" = NOW() WHERE id = $1 AND code = $2 AND "deletedAt" IS NULL ${isHost ? '' : `AND "userId" = $3`}`,
        ...(isHost ? [id, code] : [id, code, me]));
      return n ? ok() : fail('Message not found.', 404);
    }
  }
  return fail(`Invalid action: ${action}`);
}
