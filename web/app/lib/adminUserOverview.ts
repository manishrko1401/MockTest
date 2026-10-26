import { prisma } from './prisma';
import { prismaTyping } from './prismaTyping';
import { ONLINE_MS } from './presence';

// -----------------------------------------------------------------------------
// Admin → User management → one student: everything about the account in one request.
// Profile and plan, live presence, devices used, active sign-ins, mock test attempts (with the
// integrity check of each), typing tests, referrals and support activity. Read-only; every
// part that fails (a missing table, the typing database) is left out instead of failing all.
// -----------------------------------------------------------------------------

const iso = (d: unknown) => (d ? new Date(d as any).toISOString() : null);
const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => { try { return await p; } catch { return fallback; } };

/** A short device name from a browser user agent. */
function deviceName(ua: string | null): string {
  const s = (ua || '').toLowerCase();
  if (!s) return 'Unknown device';
  if (s.includes('okhttp') || s.includes('mocktesthub-android')) return 'Android app';
  if (s.includes('tauri') || s.includes('mocktesthub-desktop')) return 'Windows app';
  const os = s.includes('android') ? 'Android' : s.includes('iphone') || s.includes('ipad') ? 'iOS' : s.includes('windows') ? 'Windows' : s.includes('mac os') ? 'Mac' : s.includes('linux') ? 'Linux' : 'Other';
  const browser = s.includes('edg/') ? 'Edge' : s.includes('opr/') ? 'Opera' : s.includes('firefox') ? 'Firefox' : s.includes('chrome') ? 'Chrome' : s.includes('safari') ? 'Safari' : 'Browser';
  return `${browser} on ${os}`;
}

export async function adminUserOverview(id: string) {
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, fullName: true, email: true, mobile: true, candidateCode: true, role: true, isBlocked: true,
      subscriptionTier: true, subscriptionPurchasedAt: true, subscriptionExpiresAt: true, coins: true,
      referralCode: true, referredBy: true, referralsCount: true, referralCoinsCredited: true,
      createdAt: true, lastSeen: true, lastPlatform: true, isLockerConnected: true, profilePhoto: true,
    },
  });
  if (!u) return null;

  const [presence, devices, signIns, attempts, mockStats, typing, referred, support, reports] = await Promise.all([
    safe(prisma.$queryRawUnsafe<any[]>(`SELECT state, activity, platform, "onlineSince", "updatedAt" FROM user_presence WHERE "userId" = $1`, id), []),
    safe(prisma.$queryRawUnsafe<any[]>(`SELECT platform, "firstSeen", "lastSeen", "appVersion", "osInfo", "activeDays" FROM user_platforms WHERE "userId" = $1 ORDER BY "lastSeen" DESC`, id), []),
    safe(prisma.$queryRawUnsafe<any[]>(`SELECT "createdAt", "lastUsedAt", "userAgent" FROM auth_sessions WHERE "userId" = $1 AND "expiresAt" > NOW() ORDER BY "lastUsedAt" DESC LIMIT 10`, id), []),
    safe(prisma.$queryRawUnsafe<any[]>(
      `SELECT s.id, s."mockTestId" AS "testId", COALESCE(m.title, s."mockTestId") AS title, s.status, s."startedAt", s."completedAt",
              s."finalScore" AS score, COALESCE(s."maxScore", m."maxMarks") AS "maxScore", s."accuracyPercentage" AS accuracy,
              s."timeSpentSeconds", s."violationsCount" AS violations, s.source,
              i.level AS "integrityLevel", i.status AS "integrityStatus", i.score AS "integrityScore"
         FROM user_test_sessions s
         LEFT JOIN mock_tests m ON m.id = s."mockTestId"
         LEFT JOIN attempt_integrity i ON i."sessionId" = s.id
        WHERE s."userId" = $1 ORDER BY s."startedAt" DESC LIMIT 50`, id), []),
    safe(prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) FILTER (WHERE status IN ('COMPLETED','AUTO_SUBMITTED'))::int AS completed,
              COUNT(*) FILTER (WHERE status = 'ONGOING')::int AS ongoing,
              ROUND(AVG("accuracyPercentage") FILTER (WHERE status IN ('COMPLETED','AUTO_SUBMITTED'))::numeric, 1)::float AS "avgAccuracy",
              MAX(CASE WHEN COALESCE("maxScore", 0) > 0 THEN "finalScore" / "maxScore" * 100 END)::float AS "bestPercent",
              COALESCE(SUM("timeSpentSeconds"), 0)::int AS "totalSeconds"
         FROM user_test_sessions WHERE "userId" = $1`, id), [{}]),
    safe(Promise.all([
      prismaTyping.typingAttempt.findMany({
        where: { userId: id }, orderBy: { completedAt: 'desc' }, take: 20,
        select: { id: true, testTitle: true, netWpm: true, accuracyPercentage: true, totalMistakes: true, isQualified: true, language: true, timeSpentSeconds: true, completedAt: true },
      }),
      prismaTyping.typingAttempt.aggregate({ where: { userId: id }, _count: { _all: true }, _max: { netWpm: true }, _avg: { netWpm: true, accuracyPercentage: true } }),
      prismaTyping.typingAttempt.count({ where: { userId: id, isQualified: true } }),
    ]), null),
    u.referralCode ? safe(prisma.$queryRawUnsafe<any[]>(
      `SELECT u.id, u."fullName" AS name, u."candidateCode", u."createdAt",
              (SELECT COUNT(*)::int FROM user_test_sessions s WHERE s."userId" = u.id AND s.status IN ('COMPLETED','AUTO_SUBMITTED')) AS tests
         FROM users u WHERE LOWER(TRIM(u."referredBy")) = LOWER(TRIM($1)) ORDER BY u."createdAt" DESC LIMIT 50`, u.referralCode), []) : Promise.resolve([]),
    safe(prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE sender IN ('STUDENT','USER') AND "isRead" = false)::int AS unread, MAX("createdAt") AS last
         FROM support_messages WHERE "userId" = $1`, id), [{}]),
    safe(prisma.reportedQuestion.count({ where: { userId: id } }), 0),
  ]);

  const p = presence[0];
  const online = !!p && p.state !== 'left' && Date.now() - new Date(p.updatedAt).getTime() < ONLINE_MS;
  const ms = mockStats[0] || {};
  const sp = support[0] || {};
  return {
    user: {
      id: u.id, name: u.fullName, email: u.email, mobile: u.mobile, candidateCode: u.candidateCode, role: u.role, isBlocked: u.isBlocked,
      tier: u.subscriptionTier, tierPurchasedAt: u.subscriptionPurchasedAt, tierExpiresAt: u.subscriptionExpiresAt, coins: u.coins,
      referralCode: u.referralCode, referredBy: u.referredBy, referralsCount: u.referralsCount, referralCoinsCredited: u.referralCoinsCredited,
      joined: iso(u.createdAt), lastSeen: iso(u.lastSeen), lastPlatform: u.lastPlatform, lockerConnected: u.isLockerConnected, photo: u.profilePhoto,
    },
    presence: p ? { online, state: online ? p.state : 'offline', activity: p.activity || '', platform: p.platform, onlineSince: iso(p.onlineSince), updatedAt: iso(p.updatedAt) } : { online: false, state: 'offline' },
    devices: devices.map(d => ({ platform: d.platform, firstSeen: iso(d.firstSeen), lastSeen: iso(d.lastSeen), appVersion: d.appVersion, osInfo: d.osInfo, activeDays: d.activeDays })),
    signIns: signIns.map(s => ({ device: deviceName(s.userAgent), createdAt: iso(s.createdAt), lastUsedAt: iso(s.lastUsedAt) })),
    mock: {
      completed: ms.completed || 0, ongoing: ms.ongoing || 0, avgAccuracy: ms.avgAccuracy ?? null, bestPercent: ms.bestPercent ?? null, totalSeconds: ms.totalSeconds || 0,
      flagged: attempts.filter(a => a.integrityLevel === 'flagged' && a.integrityStatus === 'open').length,
      attempts: attempts.map(a => ({
        id: a.id, testId: a.testId, title: a.title, status: a.status, startedAt: iso(a.startedAt), completedAt: iso(a.completedAt),
        score: a.score, maxScore: a.maxScore, accuracy: a.accuracy, timeSpentSeconds: a.timeSpentSeconds, violations: a.violations, source: a.source,
        integrity: a.integrityLevel ? { level: a.integrityLevel, status: a.integrityStatus, score: a.integrityScore } : null,
      })),
    },
    typing: typing ? {
      total: typing[1]._count._all, qualified: typing[2], bestWpm: typing[1]._max.netWpm, avgWpm: typing[1]._avg.netWpm, avgAccuracy: typing[1]._avg.accuracyPercentage,
      attempts: typing[0].map(a => ({ ...a, completedAt: iso(a.completedAt) })),
    } : null,
    referred: referred.map(r => ({ id: r.id, name: r.name, candidateCode: r.candidateCode, joined: iso(r.createdAt), tests: r.tests })),
    support: { messages: sp.total || 0, unread: sp.unread || 0, lastAt: iso(sp.last), reports },
  };
}
