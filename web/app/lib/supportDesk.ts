import { prisma } from './prisma';
import { ONLINE_MS, ensurePresenceTable } from './presence';
import { adminUserOverview } from './adminUserOverview';

// -----------------------------------------------------------------------------
// Admin → Support helpdesk. The inbox lists only students who wrote to support, each with its
// state: "waiting" (the student wrote last and has no reply yet; how long), "replied", or
// "resolved" (marked by staff; a new message from the student opens it again). Staff can keep
// a private note per conversation. Numbers for the top of the page, and a student panel
// (profile, plan, what they're doing now, tests, devices) shown next to the chat.
// -----------------------------------------------------------------------------

const iso = (d: unknown) => (d ? new Date(d as any).toISOString() : null);

let ready: Promise<void> | null = null;
function ensureThreads(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS support_threads (
        "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'open',
        note TEXT NOT NULL DEFAULT '',
        "resolvedAt" TIMESTAMP(3),
        "resolvedBy" TEXT,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
      )`);
      await prisma.$executeRawUnsafe(`ALTER TABLE support_threads ENABLE ROW LEVEL SECURITY`);
    })().catch(err => { ready = null; throw err; });
  }
  return ready;
}

export type SupportState = 'waiting' | 'replied' | 'resolved';

export async function supportInbox() {
  await Promise.all([ensureThreads(), ensurePresenceTable()]);
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    WITH m AS (
      SELECT "userId",
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE sender <> 'ADMIN' AND "isRead" = false)::int AS unread,
             MIN("createdAt") AS first_at,
             MAX("createdAt") AS last_at,
             MAX("createdAt") FILTER (WHERE sender <> 'ADMIN') AS last_student_at,
             MAX("createdAt") FILTER (WHERE sender = 'ADMIN') AS last_staff_at
        FROM support_messages GROUP BY "userId"
    )
    SELECT m.*, u."fullName" AS name, u.email, u."candidateCode", u.mobile, u."subscriptionTier" AS tier, u."createdAt" AS joined,
           u."lastSeen", u."lastPlatform", u."isBlocked",
           l.message AS last_message, l.sender AS last_sender,
           (SELECT MIN(w."createdAt") FROM support_messages w
             WHERE w."userId" = m."userId" AND w.sender <> 'ADMIN' AND w."createdAt" > COALESCE(m.last_staff_at, 'epoch'::timestamp)) AS waiting_since,
           t.status AS thread_status, t."resolvedAt", t."resolvedBy", t.note,
           p.state AS p_state, p.activity AS p_activity, p.platform AS p_platform, p."updatedAt" AS p_at
      FROM m
      JOIN users u ON u.id = m."userId"
      LEFT JOIN LATERAL (SELECT message, sender FROM support_messages s WHERE s."userId" = m."userId" ORDER BY "createdAt" DESC LIMIT 1) l ON true
      LEFT JOIN support_threads t ON t."userId" = m."userId"
      LEFT JOIN user_presence p ON p."userId" = m."userId"
     ORDER BY m.last_at DESC
     LIMIT 2000`);

  const now = Date.now();
  const threads = rows.map(r => {
    const studentLast = r.last_student_at ? new Date(r.last_student_at).getTime() : 0;
    const staffLast = r.last_staff_at ? new Date(r.last_staff_at).getTime() : 0;
    const resolved = r.thread_status === 'resolved' && r.resolvedAt && new Date(r.resolvedAt).getTime() >= studentLast;
    const state: SupportState = resolved ? 'resolved' : studentLast > staffLast ? 'waiting' : 'replied';
    const online = !!r.p_at && r.p_state !== 'left' && now - new Date(r.p_at).getTime() < ONLINE_MS;
    return {
      userId: r.userId, name: r.name || 'Student', email: r.email || '', candidateCode: r.candidateCode, mobile: r.mobile,
      tier: r.tier, joined: iso(r.joined), isBlocked: !!r.isBlocked,
      state, total: r.total, unread: r.unread, firstAt: iso(r.first_at), lastAt: iso(r.last_at),
      waitingSince: state === 'waiting' ? iso(r.waiting_since) : null,
      lastMessage: (r.last_message || '').slice(0, 200), lastFromStaff: r.last_sender === 'ADMIN',
      resolvedAt: resolved ? iso(r.resolvedAt) : null, resolvedBy: resolved ? r.resolvedBy : null, note: r.note || '',
      presence: online ? { state: r.p_state, activity: r.p_activity || '', platform: r.p_platform } : null,
      lastSeen: iso(r.lastSeen), lastPlatform: r.lastPlatform,
    };
  });

  // Average time to the first staff reply (last 30 days): from the first message of each
  // stretch the student waited, to the reply that ended it
  const [timing] = await prisma.$queryRawUnsafe<any[]>(`
    SELECT AVG(EXTRACT(EPOCH FROM (r."createdAt" - s."createdAt")))::float AS avg_seconds, COUNT(*)::int AS n
      FROM support_messages s
      JOIN LATERAL (SELECT a."createdAt" FROM support_messages a
                     WHERE a."userId" = s."userId" AND a.sender = 'ADMIN' AND a."createdAt" > s."createdAt"
                     ORDER BY a."createdAt" LIMIT 1) r ON true
     WHERE s.sender <> 'ADMIN' AND s."createdAt" > NOW() - INTERVAL '30 days'
       AND NOT EXISTS (SELECT 1 FROM support_messages p
                        WHERE p."userId" = s."userId" AND p.sender <> 'ADMIN' AND p."createdAt" < s."createdAt"
                          AND NOT EXISTS (SELECT 1 FROM support_messages q
                                           WHERE q."userId" = s."userId" AND q.sender = 'ADMIN' AND q."createdAt" > p."createdAt" AND q."createdAt" < s."createdAt"))`).catch(() => [{}]);
  const [today] = await prisma.$queryRawUnsafe<any[]>(`
    SELECT COUNT(*) FILTER (WHERE sender = 'ADMIN')::int AS replies, COUNT(*) FILTER (WHERE sender <> 'ADMIN')::int AS received
      FROM support_messages WHERE "createdAt" >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'`).catch(() => [{}]);

  const week = now - 7 * 86400000;
  return {
    threads,
    stats: {
      waiting: threads.filter(t => t.state === 'waiting').length,
      waitingLong: threads.filter(t => t.state === 'waiting' && t.waitingSince && now - new Date(t.waitingSince).getTime() > 24 * 3600 * 1000).length,
      unread: threads.reduce((n, t) => n + t.unread, 0),
      resolved: threads.filter(t => t.state === 'resolved').length,
      total: threads.length,
      newThisWeek: threads.filter(t => t.firstAt && new Date(t.firstAt).getTime() > week).length,
      repliesToday: today?.replies || 0,
      receivedToday: today?.received || 0,
      avgFirstReplySeconds: timing?.avg_seconds ?? null,
      onlineNow: threads.filter(t => t.presence).length,
    },
  };
}

/** Mark resolved / open again, and the private note. */
export async function updateSupportThread(userId: string, input: { status?: unknown; note?: unknown }, staffName: string) {
  await ensureThreads();
  const status = input.status === 'resolved' ? 'resolved' : input.status === 'open' ? 'open' : null;
  const note = typeof input.note === 'string' ? input.note.slice(0, 4000) : null;
  await prisma.$executeRawUnsafe(
    `INSERT INTO support_threads ("userId", status, note, "resolvedAt", "resolvedBy", "updatedAt")
     VALUES ($1, COALESCE($2, 'open'), COALESCE($3, ''), CASE WHEN $2 = 'resolved' THEN NOW() END, CASE WHEN $2 = 'resolved' THEN $4 END, NOW())
     ON CONFLICT ("userId") DO UPDATE SET
       status = COALESCE($2, support_threads.status),
       note = COALESCE($3, support_threads.note),
       "resolvedAt" = CASE WHEN $2 = 'resolved' THEN NOW() WHEN $2 = 'open' THEN NULL ELSE support_threads."resolvedAt" END,
       "resolvedBy" = CASE WHEN $2 = 'resolved' THEN $4 WHEN $2 = 'open' THEN NULL ELSE support_threads."resolvedBy" END,
       "updatedAt" = NOW()`,
    userId, status, note, staffName);
}

/** The student panel next to the chat (a lighter copy of the admin user overview). */
export async function supportStudentContext(userId: string) {
  const o = await adminUserOverview(userId);
  if (!o) return null;
  return {
    user: { ...o.user, referredBy: undefined, referralCoinsCredited: undefined },
    presence: o.presence,
    devices: o.devices,
    mock: { completed: o.mock.completed, ongoing: o.mock.ongoing, avgAccuracy: o.mock.avgAccuracy, flagged: o.mock.flagged, recent: o.mock.attempts.slice(0, 5) },
    typing: o.typing ? { total: o.typing.total, bestWpm: o.typing.bestWpm, qualified: o.typing.qualified } : null,
    support: o.support,
  };
}

/** Staff can take back one of their own replies. */
export async function deleteStaffMessage(messageId: string) {
  const r = await prisma.supportMessage.deleteMany({ where: { id: messageId, sender: 'ADMIN' } });
  return r.count > 0;
}
