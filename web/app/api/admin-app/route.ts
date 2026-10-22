import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import {
  getRequester, verifyPassword, createWebSession, revokeWebSession, revokeAllWebSessions, STAFF_ROLES, Requester,
} from '../../lib/serverAuth';
import { getClientIp } from '../../lib/botProtection';
import { hitLimit } from '../../lib/dbRateLimit';
import { registerDevice, unregisterDevice, sendTestAlert, pushConfigured, ALERT_TYPES } from '../../lib/adminPush';
import { getTypingCategories, saveTypingCategory } from '../../lib/typingStore';
import { platformLabel } from '../../lib/platformLabels';

// -----------------------------------------------------------------------------
// API for the Mock Test Hub Admin app (Android, admin-app/). Staff only. The app signs in
// here and gets a login token of its own (sent as "Authorization: Bearer <token>"), so it
// never signs the account out of the website or the student apps. Lists are paginated and
// light, for phones. Notices and test renames/deletes go through /api/db, which also
// refreshes the site's cached catalogue.
// -----------------------------------------------------------------------------

const SUPPORT = ['SUPPORT_TEAM'];
const CONTENT = ['TEST_CREATOR'];
const ANY_STAFF = ['SUPPORT_TEAM', 'TEST_CREATOR', 'NOTICES_MANAGER'];

/** Who may call each action (ADMIN may call all). */
const ACCESS: Record<string, string[]> = {
  me: ANY_STAFF, logout: ANY_STAFF, 'register-push': ANY_STAFF, 'unregister-push': ANY_STAFF, 'test-push': ANY_STAFF,
  summary: ANY_STAFF, dashboard: ANY_STAFF,
  'support-threads': SUPPORT, 'support-thread': SUPPORT, 'support-send': SUPPORT, 'support-delete-message': SUPPORT,
  reports: [...SUPPORT, ...CONTENT], 'report-resolve': [...SUPPORT, ...CONTENT], 'report-reply': [...SUPPORT, ...CONTENT],
  inquiries: SUPPORT, 'inquiry-update': SUPPORT, 'inquiry-delete': SUPPORT,
  suggestions: SUPPORT, 'suggestion-update': SUPPORT, 'suggestion-delete': SUPPORT,
  feedback: SUPPORT,
  users: SUPPORT, user: SUPPORT, 'user-update': [], 'user-reset-attempt': [],
  notices: ['NOTICES_MANAGER'],
  'content-tests': CONTENT, 'test-analysis': CONTENT, 'typing-categories': CONTENT, 'typing-category-toggle': CONTENT,
};

const ok = (body: object = {}) => NextResponse.json({ success: true, ...body });
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });
const int = (v: unknown, def: number, max: number) => Math.max(0, Math.min(max, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : def));
const str = (v: unknown, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null);

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return fail('Invalid request'); }
  const action = str(body?.action, 60);
  const data = body?.data && typeof body.data === 'object' ? body.data : {};

  try {
    if (action === 'login') return await login(request, data);

    const allowed = ACCESS[action];
    if (!allowed) return fail('Unknown action', 404);
    const me = await getRequester(request).catch(() => null);
    if (!me) return NextResponse.json({ success: false, error: 'Please sign in again.', code: 'AUTH_REQUIRED' }, { status: 401 });
    if (!(STAFF_ROLES as readonly string[]).includes(me.role) || (me.role !== 'ADMIN' && !allowed.includes(me.role))) {
      return fail('You do not have access to this.', 403);
    }

    switch (action) {
      case 'me': return await getMe(me);
      case 'logout': {
        const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1] || null;
        if (str(data.pushToken)) await unregisterDevice(me.id, str(data.pushToken)).catch(() => {});
        await revokeWebSession(token).catch(() => {});
        return ok();
      }
      case 'register-push': {
        const token = str(data.token, 4096);
        if (token.length < 20) return fail('Invalid push token');
        await registerDevice(me.id, token, str(data.deviceName, 120) || null, Array.isArray(data.muted) ? data.muted : []);
        return ok({ configured: pushConfigured() });
      }
      case 'unregister-push': await unregisterDevice(me.id, str(data.token, 4096)); return ok();
      case 'test-push': return ok(await sendTestAlert(me.id));
      case 'summary': return await summary(data);
      case 'dashboard': return await dashboard();
      case 'support-threads': return await supportThreads(data);
      case 'support-thread': return await supportThread(data);
      case 'support-send': return await supportSend(data);
      case 'support-delete-message': {
        await prisma.supportMessage.deleteMany({ where: { id: str(data.id, 100), sender: 'ADMIN' } });
        return ok();
      }
      case 'reports': return await reports(data);
      case 'report-resolve': await prisma.reportedQuestion.deleteMany({ where: { id: str(data.id, 100) } }); return ok();
      case 'report-reply': return await reportReply(data);
      case 'inquiries': return await inquiries(data);
      case 'inquiry-update': return await inquiryUpdate(data);
      case 'inquiry-delete': await prisma.contactInquiry.deleteMany({ where: { id: str(data.id, 100) } }); return ok();
      case 'suggestions': return await suggestions(data);
      case 'suggestion-update': return await suggestionUpdate(data);
      case 'suggestion-delete': await prisma.suggestion.deleteMany({ where: { id: str(data.id, 100) } }); return ok();
      case 'feedback': return await feedback(data);
      case 'users': return await users(data);
      case 'user': return await userDetail(data);
      case 'user-update': return await userUpdate(me, data);
      case 'user-reset-attempt': {
        await prisma.userTestSession.deleteMany({ where: { id: str(data.sessionId, 100), userId: str(data.userId, 100) } });
        return ok();
      }
      case 'notices': return await notices(data);
      case 'content-tests': return await contentTests(data);
      case 'test-analysis': return await testAnalysis(data);
      case 'typing-categories': {
        const cats = await getTypingCategories();
        return ok({ categories: cats.map(c => ({ id: c.id, name: c.name, isActive: c.isActive !== false })) });
      }
      case 'typing-category-toggle': {
        const cat = (await getTypingCategories()).find(c => c.id === str(data.id, 200));
        if (!cat) return fail('Category not found', 404);
        const saved = await saveTypingCategory({ ...cat, isActive: !!data.isActive });
        return ok({ category: { id: saved.id, name: saved.name, isActive: saved.isActive !== false } });
      }
    }
    return fail('Unknown action', 404);
  } catch (err: any) {
    console.error(`admin-app ${action} failed:`, err);
    return fail('Something went wrong. Please try again.', 500);
  }
}

// ---- Sign in ---------------------------------------------------------------------

async function login(request: Request, data: any) {
  const email = str(data.email, 200).toLowerCase();
  const password = typeof data.password === 'string' ? data.password : '';
  if (!email || !password) return fail('Enter your email and password.');
  const ip = getClientIp(request);
  const [byIp, byEmail] = await Promise.all([
    hitLimit(`admin-app-login-ip:${ip}`, 20, 15 * 60 * 1000),
    hitLimit(`admin-app-login:${email}`, 8, 15 * 60 * 1000),
  ]);
  if (!byIp.allowed || !byEmail.allowed) return fail('Too many attempts. Try again in a few minutes.', 429);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, fullName: true, email: true, role: true, isBlocked: true, passwordHash: true, candidateCode: true },
  });
  const valid = !!user && await verifyPassword(password, user.passwordHash);
  if (!user || !valid) return fail('Wrong email or password.', 401);
  if (user.isBlocked) return fail('This account is blocked.', 403);
  if (!(STAFF_ROLES as readonly string[]).includes(user.role)) return fail('This app is for Mock Test Hub staff only.', 403);

  const token = await createWebSession(user.id, request);
  return ok({ token, user: { id: user.id, name: user.fullName, email: user.email, role: user.role, candidateCode: user.candidateCode } });
}

async function getMe(me: Requester) {
  const u = await prisma.user.findUnique({ where: { id: me.id }, select: { id: true, fullName: true, email: true, role: true, candidateCode: true } });
  const can = (action: string) => me.role === 'ADMIN' || (ACCESS[action] || []).includes(me.role);
  return ok({
    user: u && { id: u.id, name: u.fullName, email: u.email, role: u.role, candidateCode: u.candidateCode },
    pushConfigured: pushConfigured(),
    alertTypes: ALERT_TYPES,
    can: {
      support: can('support-threads'), reports: can('reports'), inquiries: can('inquiries'), suggestions: can('suggestions'),
      feedback: can('feedback'), users: can('users'), editUsers: can('user-update'), content: can('content-tests'),
      notices: me.role === 'ADMIN' || me.role === 'NOTICES_MANAGER',
    },
  });
}

// ---- Inbox summary (polled every few seconds while the app is open) ------------------

async function summary(data: any) {
  const since = data.since ? new Date(data.since) : null;
  const [counts] = await prisma.$queryRaw<any[]>`
    SELECT
      (SELECT COUNT(*)::int FROM support_messages WHERE sender <> 'ADMIN' AND "isRead" = false) AS "supportUnread",
      (SELECT COUNT(DISTINCT "userId")::int FROM support_messages WHERE sender <> 'ADMIN' AND "isRead" = false) AS "supportThreads",
      (SELECT COUNT(*)::int FROM reported_questions) AS "reports",
      (SELECT COUNT(*)::int FROM contact_inquiries WHERE status = 'PENDING') AS "inquiries",
      (SELECT COUNT(*)::int FROM suggestions WHERE status = 'PENDING') AS "suggestions",
      (SELECT COUNT(*)::int FROM feedbacks WHERE "createdAt" > NOW() - INTERVAL '24 hours') AS "feedback24h"`;

  // New items since the app last looked (for in-app pop-ups)
  let events: any[] = [];
  if (since && !Number.isNaN(since.getTime())) {
    events = await prisma.$queryRaw<any[]>`
      (SELECT 'support' AS type, m.id, m."createdAt", COALESCE(NULLIF(u."fullName", ''), 'Student') AS title, m.message AS body, m."userId" AS ref
         FROM support_messages m JOIN users u ON u.id = m."userId"
         WHERE m."createdAt" > ${since} AND m.sender <> 'ADMIN' ORDER BY m."createdAt" DESC LIMIT 10)
      UNION ALL
      (SELECT 'report', r.id, r."createdAt", 'Question reported · ' || COALESCE(NULLIF(r."mockTestTitle", ''), 'test'), r.message, r.id
         FROM reported_questions r WHERE r."createdAt" > ${since} ORDER BY r."createdAt" DESC LIMIT 5)
      UNION ALL
      (SELECT 'inquiry', i.id, i."createdAt", 'Contact inquiry · ' || i.name, i.message, i.id
         FROM contact_inquiries i WHERE i."createdAt" > ${since} ORDER BY i."createdAt" DESC LIMIT 5)
      UNION ALL
      (SELECT 'suggestion', s.id, s."createdAt", 'Suggestion · ' || COALESCE(NULLIF(s.name, ''), 'Visitor'), s.message, s.id
         FROM suggestions s WHERE s."createdAt" > ${since} ORDER BY s."createdAt" DESC LIMIT 5)
      UNION ALL
      (SELECT 'feedback', f.id, f."createdAt", 'Feedback · ' || COALESCE(NULLIF(f."userFullName", ''), 'Student'), COALESCE(NULLIF(f."feedbackText", ''), 'Rated ' || f."platformRating" || '/5'), f.id
         FROM feedbacks f WHERE f."createdAt" > ${since} ORDER BY f."createdAt" DESC LIMIT 5)
      ORDER BY "createdAt" DESC LIMIT 20`;
  }
  return ok({
    serverTime: new Date().toISOString(),
    counts,
    events: events.map(e => ({ type: e.type, id: e.id, ref: e.ref, title: e.title, body: String(e.body || '').slice(0, 200), createdAt: iso(e.createdAt) })),
  });
}

// ---- Dashboard ------------------------------------------------------------------------

async function dashboard() {
  const [totals] = await prisma.$queryRaw<any[]>`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS "users",
      (SELECT COUNT(*)::int FROM users WHERE "createdAt" >= date_trunc('day', NOW())) AS "newToday",
      (SELECT COUNT(*)::int FROM users WHERE "createdAt" >= NOW() - INTERVAL '7 days') AS "new7d",
      (SELECT COUNT(*)::int FROM users WHERE "lastSeen" >= NOW() - INTERVAL '24 hours') AS "active24h",
      (SELECT COUNT(*)::int FROM users WHERE "lastSeen" >= NOW() - INTERVAL '10 minutes') AS "onlineNow",
      (SELECT COUNT(*)::int FROM users WHERE "subscriptionTier" = 'Testbook Pass Pro') AS "proUsers",
      (SELECT COUNT(*)::int FROM user_test_sessions WHERE status IN ('COMPLETED', 'AUTO_SUBMITTED') AND "completedAt" >= date_trunc('day', NOW())) AS "testsToday",
      (SELECT COUNT(*)::int FROM user_test_sessions WHERE status IN ('COMPLETED', 'AUTO_SUBMITTED') AND "completedAt" >= NOW() - INTERVAL '7 days') AS "tests7d",
      (SELECT COUNT(*)::int FROM user_test_sessions WHERE status = 'ONGOING' AND "startedAt" >= NOW() - INTERVAL '3 hours') AS "testsInProgress",
      (SELECT COUNT(*)::int FROM mock_tests) AS "mockTests",
      (SELECT COUNT(*)::int FROM notices) AS "notices"`;
  const days = await prisma.$queryRaw<any[]>`
    SELECT to_char(d, 'YYYY-MM-DD') AS day,
      (SELECT COUNT(*)::int FROM users u WHERE u."createdAt" >= d AND u."createdAt" < d + INTERVAL '1 day') AS signups,
      (SELECT COUNT(*)::int FROM user_test_sessions s WHERE s.status IN ('COMPLETED', 'AUTO_SUBMITTED') AND s."completedAt" >= d AND s."completedAt" < d + INTERVAL '1 day') AS tests
    FROM generate_series(date_trunc('day', NOW()) - INTERVAL '13 days', date_trunc('day', NOW()), INTERVAL '1 day') AS d
    ORDER BY d`;
  const topTests = await prisma.$queryRaw<any[]>`
    SELECT t.id, t.title, COUNT(*)::int AS attempts
    FROM user_test_sessions s JOIN mock_tests t ON t.id = s."mockTestId"
    WHERE s.status IN ('COMPLETED', 'AUTO_SUBMITTED') AND s."completedAt" >= NOW() - INTERVAL '7 days'
    GROUP BY t.id, t.title ORDER BY attempts DESC LIMIT 5`;
  const platforms = await prisma.$queryRaw<any[]>`
    SELECT COALESCE("lastPlatform", 'web') AS platform, COUNT(*)::int AS users
    FROM users WHERE "lastSeen" >= NOW() - INTERVAL '7 days' GROUP BY 1 ORDER BY 2 DESC`;
  // Old and new names merged (web / mobile_web / app are the names used before the Platforms page)
  const byLabel = new Map<string, number>();
  for (const p of platforms) byLabel.set(platformLabel(p.platform), (byLabel.get(platformLabel(p.platform)) || 0) + p.users);
  return ok({ totals, days, topTests, platforms: [...byLabel].map(([platform, users]) => ({ platform, users })).sort((a, b) => b.users - a.users) });
}

// ---- Support chat ---------------------------------------------------------------------

async function supportThreads(data: any) {
  const search = str(data.search, 100);
  const unreadOnly = !!data.unreadOnly;
  const limit = int(data.limit, 30, 100), offset = int(data.offset, 0, 100000);
  const like = `%${search}%`;
  const rows = await prisma.$queryRaw<any[]>`
    WITH last AS (
      SELECT DISTINCT ON (m."userId") m."userId", m.message, m.sender, m."createdAt"
      FROM support_messages m ORDER BY m."userId", m."createdAt" DESC
    ), unread AS (
      SELECT "userId", COUNT(*)::int AS n FROM support_messages WHERE sender <> 'ADMIN' AND "isRead" = false GROUP BY "userId"
    )
    SELECT u.id AS "userId", u."fullName" AS name, u.email, u."candidateCode", u."subscriptionTier", u."lastSeen",
           l.message AS "lastMessage", l.sender AS "lastSender", l."createdAt" AS "lastAt", COALESCE(un.n, 0) AS unread
    FROM last l JOIN users u ON u.id = l."userId" LEFT JOIN unread un ON un."userId" = l."userId"
    WHERE (${search} = '' OR u."fullName" ILIKE ${like} OR u.email ILIKE ${like} OR u."candidateCode" ILIKE ${like})
      AND (${unreadOnly} = false OR COALESCE(un.n, 0) > 0)
    ORDER BY (COALESCE(un.n, 0) > 0) DESC, l."createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}`;
  return ok({
    threads: rows.map(r => ({
      userId: r.userId, name: r.name, email: r.email, candidateCode: r.candidateCode, tier: r.subscriptionTier,
      lastSeen: iso(r.lastSeen), lastMessage: String(r.lastMessage || '').slice(0, 200), lastFromAdmin: r.lastSender === 'ADMIN',
      lastAt: iso(r.lastAt), unread: r.unread,
    })),
  });
}

async function supportThread(data: any) {
  const userId = str(data.userId, 100);
  if (!userId) return fail('userId is required');
  if (data.markRead) {
    await prisma.supportMessage.updateMany({ where: { userId, sender: { in: ['STUDENT', 'USER'] }, isRead: false }, data: { isRead: true } });
  }
  const [user, messages] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, email: true, mobile: true, candidateCode: true, subscriptionTier: true, lastSeen: true, lastPlatform: true, createdAt: true } }),
    prisma.supportMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 300 }),
  ]);
  if (!user) return fail('Student not found', 404);
  return ok({
    user: { id: user.id, name: user.fullName, email: user.email, mobile: user.mobile, candidateCode: user.candidateCode, tier: user.subscriptionTier, lastSeen: iso(user.lastSeen), platform: user.lastPlatform, joined: iso(user.createdAt) },
    messages: messages.reverse().map(m => ({ id: m.id, fromAdmin: m.sender === 'ADMIN', message: m.message, isRead: m.isRead, createdAt: iso(m.createdAt) })),
  });
}

async function supportSend(data: any) {
  const userId = str(data.userId, 100);
  const message = str(data.message, 4000);
  if (!userId || !message) return fail('Message is empty');
  if (!(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) return fail('Student not found', 404);
  const m = await prisma.supportMessage.create({ data: { userId, sender: 'ADMIN', message, isRead: false } });
  // Replying means the student's messages have been read
  await prisma.supportMessage.updateMany({ where: { userId, sender: { in: ['STUDENT', 'USER'] }, isRead: false }, data: { isRead: true } });
  return ok({ message: { id: m.id, fromAdmin: true, message: m.message, isRead: false, createdAt: iso(m.createdAt) } });
}

// ---- Reported questions -------------------------------------------------------------------

async function reports(data: any) {
  const limit = int(data.limit, 30, 100), offset = int(data.offset, 0, 100000);
  const rows = await prisma.reportedQuestion.findMany({ orderBy: { createdAt: 'desc' }, take: limit, skip: offset });
  const userIds = [...new Set(rows.map(r => r.userId).filter(Boolean))] as string[];
  const people = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, email: true } }) : [];
  const byId = new Map(people.map(p => [p.id, p]));
  return ok({
    reports: rows.map(r => ({
      id: r.id, questionId: r.questionId, questionText: r.questionText, testId: r.mockTestId, testTitle: r.mockTestTitle,
      message: r.message, userId: r.userId, candidateCode: r.candidateCode,
      userName: r.userId ? byId.get(r.userId)?.fullName || null : null, userEmail: r.userId ? byId.get(r.userId)?.email || null : null,
      createdAt: iso(r.createdAt),
    })),
  });
}

/** Replies to the student who reported (in their support chat) and closes the report. */
async function reportReply(data: any) {
  const report = await prisma.reportedQuestion.findUnique({ where: { id: str(data.id, 100) } });
  if (!report) return fail('Report not found', 404);
  const message = str(data.message, 4000);
  if (!message) return fail('Message is empty');
  if (!report.userId) return fail('This report was sent without an account, so there is no one to reply to.');
  const quote = report.mockTestTitle ? `About your report on "${report.mockTestTitle}": ` : 'About the question you reported: ';
  await prisma.supportMessage.create({ data: { userId: report.userId, sender: 'ADMIN', message: quote + message, isRead: false } });
  if (data.resolve !== false) await prisma.reportedQuestion.delete({ where: { id: report.id } });
  return ok();
}

// ---- Inquiries, suggestions, feedback ---------------------------------------------------------

async function inquiries(data: any) {
  const status = str(data.status, 20);
  const limit = int(data.limit, 30, 100), offset = int(data.offset, 0, 100000);
  const rows = await prisma.contactInquiry.findMany({
    where: status && status !== 'ALL' ? { status } : {}, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
  });
  return ok({ inquiries: rows.map(r => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, subject: r.subject, message: r.message, status: r.status, adminNotes: r.adminNotes, source: r.source, createdAt: iso(r.createdAt) })) });
}

async function inquiryUpdate(data: any) {
  const status = str(data.status, 20);
  if (status && !['PENDING', 'REPLIED', 'RESOLVED', 'ARCHIVED'].includes(status)) return fail('Invalid status');
  await prisma.contactInquiry.update({
    where: { id: str(data.id, 100) },
    data: { ...(status ? { status } : {}), ...(typeof data.adminNotes === 'string' ? { adminNotes: str(data.adminNotes, 4000) || null } : {}) },
  });
  return ok();
}

async function suggestions(data: any) {
  const status = str(data.status, 20);
  const limit = int(data.limit, 30, 100), offset = int(data.offset, 0, 100000);
  const rows = await prisma.suggestion.findMany({
    where: status && status !== 'ALL' ? { status } : {}, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
  });
  return ok({ suggestions: rows.map(r => ({ id: r.id, userId: r.userId, name: r.name, email: r.email, category: r.category, message: r.message, status: r.status, adminReply: r.adminReply, source: r.source, createdAt: iso(r.createdAt) })) });
}

async function suggestionUpdate(data: any) {
  const status = str(data.status, 20);
  if (status && !['PENDING', 'REVIEWED', 'RESOLVED'].includes(status)) return fail('Invalid status');
  const id = str(data.id, 100);
  const reply = typeof data.adminReply === 'string' ? str(data.adminReply, 4000) : undefined;
  const s = await prisma.suggestion.update({
    where: { id },
    data: { ...(status ? { status } : {}), ...(reply !== undefined ? { adminReply: reply || null } : {}) },
  });
  // A reply also reaches the student in their support chat (when they were signed in)
  if (reply && data.sendToStudent && s.userId) {
    await prisma.supportMessage.create({ data: { userId: s.userId, sender: 'ADMIN', message: `About your suggestion: ${reply}`, isRead: false } });
  }
  return ok();
}

async function feedback(data: any) {
  const limit = int(data.limit, 30, 100), offset = int(data.offset, 0, 100000);
  const maxRating = int(data.maxRating, 5, 5);
  const rows = await prisma.feedback.findMany({
    where: maxRating < 5 ? { OR: [{ platformRating: { lte: maxRating } }, { examRating: { lte: maxRating } }] } : {},
    orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
  });
  const [avg] = await prisma.$queryRaw<any[]>`SELECT ROUND(AVG("platformRating")::numeric, 2)::float AS platform, ROUND(AVG("examRating")::numeric, 2)::float AS exam, COUNT(*)::int AS total FROM feedbacks`;
  return ok({
    average: avg,
    feedback: rows.map(r => ({ id: r.id, userId: r.userId, name: r.userFullName, email: r.userEmail, testId: r.testId, testTitle: r.testTitle, platformRating: r.platformRating, examRating: r.examRating, text: r.feedbackText, source: r.source, createdAt: iso(r.createdAt) })),
  });
}

// ---- Users ----------------------------------------------------------------------------------

async function users(data: any) {
  const search = str(data.search, 100);
  const filter = str(data.filter, 20);
  const limit = int(data.limit, 30, 100), offset = int(data.offset, 0, 100000);
  const where: any = {};
  if (search) where.OR = [
    { fullName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } },
    { candidateCode: { contains: search, mode: 'insensitive' } }, { mobile: { contains: search } },
  ];
  if (filter === 'pro') where.subscriptionTier = 'Testbook Pass Pro';
  if (filter === 'blocked') where.isBlocked = true;
  if (filter === 'staff') where.role = { not: 'STUDENT' };
  if (filter === 'online') where.lastSeen = { gte: new Date(Date.now() - 10 * 60 * 1000) };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where, orderBy: filter === 'online' ? { lastSeen: 'desc' } : { createdAt: 'desc' }, take: limit, skip: offset,
      select: { id: true, fullName: true, email: true, mobile: true, candidateCode: true, role: true, subscriptionTier: true, isBlocked: true, createdAt: true, lastSeen: true, lastPlatform: true },
    }),
    prisma.user.count({ where }),
  ]);
  return ok({
    total,
    users: rows.map(u => ({ id: u.id, name: u.fullName, email: u.email, mobile: u.mobile, candidateCode: u.candidateCode, role: u.role, tier: u.subscriptionTier, isBlocked: u.isBlocked, joined: iso(u.createdAt), lastSeen: iso(u.lastSeen), platform: u.lastPlatform })),
  });
}

async function userDetail(data: any) {
  const id = str(data.id, 100);
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, fullName: true, email: true, mobile: true, candidateCode: true, role: true, subscriptionTier: true,
      subscriptionPurchasedAt: true, subscriptionExpiresAt: true, isBlocked: true, createdAt: true, lastSeen: true, lastPlatform: true,
      coins: true, referralCode: true, referralsCount: true, isLockerConnected: true,
    },
  });
  if (!u) return fail('User not found', 404);
  const [attempts, stats, messages] = await Promise.all([
    prisma.userTestSession.findMany({
      where: { userId: id }, orderBy: { startedAt: 'desc' }, take: 30,
      select: { id: true, status: true, startedAt: true, completedAt: true, finalScore: true, maxScore: true, accuracyPercentage: true, timeSpentSeconds: true, source: true, mockTest: { select: { id: true, title: true, maxMarks: true } } },
    }),
    prisma.$queryRaw<any[]>`
      SELECT COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'AUTO_SUBMITTED'))::int AS completed,
             ROUND(AVG("accuracyPercentage") FILTER (WHERE status IN ('COMPLETED', 'AUTO_SUBMITTED'))::numeric, 1)::float AS "avgAccuracy"
      FROM user_test_sessions WHERE "userId" = ${id}`,
    prisma.supportMessage.count({ where: { userId: id } }),
  ]);
  return ok({
    user: {
      id: u.id, name: u.fullName, email: u.email, mobile: u.mobile, candidateCode: u.candidateCode, role: u.role, tier: u.subscriptionTier,
      tierPurchasedAt: u.subscriptionPurchasedAt, tierExpiresAt: u.subscriptionExpiresAt, isBlocked: u.isBlocked, joined: iso(u.createdAt),
      lastSeen: iso(u.lastSeen), platform: u.lastPlatform ? platformLabel(u.lastPlatform) : null, coins: u.coins, referralCode: u.referralCode, referrals: u.referralsCount,
      lockerConnected: u.isLockerConnected, supportMessages: messages,
    },
    stats: stats[0],
    attempts: attempts.map(a => ({
      id: a.id, testId: a.mockTest?.id, testTitle: a.mockTest?.title || 'Test', status: a.status, startedAt: iso(a.startedAt), completedAt: iso(a.completedAt),
      score: a.finalScore, maxScore: a.maxScore ?? a.mockTest?.maxMarks ?? null, accuracy: a.accuracyPercentage, timeSpentSeconds: a.timeSpentSeconds, source: a.source,
    })),
  });
}

async function userUpdate(me: Requester, data: any) {
  const id = str(data.id, 100);
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return fail('User not found', 404);
  if (target.id === me.id && (data.isBlocked === true || data.role !== undefined)) return fail('You cannot block yourself or change your own role.');
  const update: any = {};
  if (data.tier !== undefined) {
    const tier = str(data.tier, 40);
    if (!['None', 'Testbook Pass', 'Testbook Pass Pro'].includes(tier)) return fail('Invalid plan');
    update.subscriptionTier = tier;
    if (tier !== 'None') {
      const now = new Date();
      const expiry = new Date(now); expiry.setFullYear(expiry.getFullYear() + 1);
      update.subscriptionPurchasedAt = now.toISOString().slice(0, 10);
      update.subscriptionExpiresAt = str(data.tierExpiresAt, 10) || expiry.toISOString().slice(0, 10);
    }
  }
  if (data.role !== undefined) {
    const role = str(data.role, 30);
    if (!['STUDENT', ...STAFF_ROLES].includes(role)) return fail('Invalid role');
    update.role = role;
  }
  if (typeof data.isBlocked === 'boolean') update.isBlocked = data.isBlocked;
  if (Object.keys(update).length === 0) return fail('Nothing to change');
  await prisma.user.update({ where: { id }, data: update });
  // Blocked: signed out everywhere (website, apps, admin app)
  if (update.isBlocked === true) {
    await revokeAllWebSessions(id).catch(() => {});
    await prisma.user.update({ where: { id }, data: { currentSessionId: null } }).catch(() => {});
  }
  return ok();
}

// ---- Notices (list; add / edit / delete go through /api/db, which refreshes the site cache) ----

async function notices(data: any) {
  const search = str(data.search, 100);
  const category = str(data.category, 30);
  const limit = int(data.limit, 30, 100), offset = int(data.offset, 0, 100000);
  const where: any = {};
  if (search) where.title = { contains: search, mode: 'insensitive' };
  if (category && category !== 'all') where.category = category;
  const rows = await prisma.notice.findMany({
    where, orderBy: [{ publishDate: 'desc' }, { createdAt: 'desc' }], take: limit, skip: offset,
    select: { id: true, title: true, titleHi: true, type: true, category: true, date: true, publishDate: true, url: true, lastDate: true, imageUrl: true, createdAt: true },
  });
  return ok({ notices: rows.map(n => ({ ...n, createdAt: iso(n.createdAt) })) });
}

// ---- Content ---------------------------------------------------------------------------------

async function contentTests(data: any) {
  const search = str(data.search, 100);
  const limit = int(data.limit, 30, 100), offset = int(data.offset, 0, 100000);
  const like = `%${search}%`;
  const rows = await prisma.$queryRaw<any[]>`
    SELECT t.id, t.title, t."requiredTierName" AS tier, t."questionsCount", t."durationMinutes", t."maxMarks",
           (t."customQuestions" IS NOT NULL AND t."customQuestions" <> 'null'::jsonb) AS "hasQuestions",
           s.title AS series, e.name AS exam, c.name AS category,
           (SELECT COUNT(*)::int FROM user_test_sessions x WHERE x."mockTestId" = t.id AND x.status IN ('COMPLETED', 'AUTO_SUBMITTED')) AS attempts
    FROM mock_tests t
    JOIN test_series s ON s.id = t."testSeriesId" JOIN exams e ON e.id = s."examId" JOIN categories c ON c.id = e."categoryId"
    WHERE ${search} = '' OR t.title ILIKE ${like} OR s.title ILIKE ${like} OR e.name ILIKE ${like} OR t.id ILIKE ${like}
    ORDER BY e.name, s.title, t."orderIndex", t.title
    LIMIT ${limit} OFFSET ${offset}`;
  return ok({ tests: rows });
}

async function testAnalysis(data: any) {
  const testId = str(data.testId, 200);
  const [stats] = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*)::int AS attempts, COUNT(DISTINCT "userId")::int AS students,
           ROUND(AVG("finalScore")::numeric, 2)::float AS "avgScore", MAX("finalScore")::float AS "topScore",
           ROUND(AVG("accuracyPercentage")::numeric, 1)::float AS "avgAccuracy",
           ROUND(AVG("timeSpentSeconds")::numeric / 60, 1)::float AS "avgMinutes"
    FROM user_test_sessions WHERE "mockTestId" = ${testId} AND status IN ('COMPLETED', 'AUTO_SUBMITTED')`;
  const recent = await prisma.$queryRaw<any[]>`
    SELECT s.id, s."finalScore" AS score, s."maxScore", s."accuracyPercentage" AS accuracy, s."completedAt", u.id AS "userId", u."fullName" AS name
    FROM user_test_sessions s JOIN users u ON u.id = s."userId"
    WHERE s."mockTestId" = ${testId} AND s.status IN ('COMPLETED', 'AUTO_SUBMITTED')
    ORDER BY s."completedAt" DESC NULLS LAST LIMIT 20`;
  const reportsCount = await prisma.reportedQuestion.count({ where: { mockTestId: testId } });
  return ok({ stats, reports: reportsCount, recent: recent.map(r => ({ ...r, completedAt: iso(r.completedAt) })) });
}
