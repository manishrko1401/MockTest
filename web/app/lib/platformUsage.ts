import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import windowsLatest from '../../public/downloads/latest.json';
import androidLatest from '../../public/downloads/android.json';
import { PLATFORM_KEYS, type PlatformKey } from './platformLabels';

// -----------------------------------------------------------------------------
// Which platforms each student uses: the website on a computer, the website on a phone, the
// Windows app and the Android app. One row per student and platform with first / last use,
// the app version and the device. Written from the presence ping (website: every few minutes;
// apps: on start and while open), at most once per 10 minutes per student and platform.
// For the admin "Platforms" page.
// -----------------------------------------------------------------------------

export { PLATFORM_KEYS, normalizePlatform, platformLabel } from './platformLabels';
export const PLATFORM_ACTIONS = ['platform-stats', 'platform-users', 'platform-user'] as const;

let ready: Promise<void> | null = null;
export function ensurePlatformTable(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS user_platforms (
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          platform TEXT NOT NULL,
          "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "appVersion" TEXT,
          "osInfo" TEXT,
          "activeDays" INT NOT NULL DEFAULT 1,
          "lastDay" DATE,
          estimated BOOLEAN NOT NULL DEFAULT false,
          PRIMARY KEY ("userId", platform)
        )`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS user_platforms_platform_idx ON user_platforms (platform, "lastSeen" DESC)`);
      await prisma.$executeRawUnsafe(`ALTER TABLE user_platforms ENABLE ROW LEVEL SECURITY`);
      // When live tracking first saw the student here (rows filled in from test history start without it)
      await prisma.$executeRawUnsafe(`ALTER TABLE user_platforms ADD COLUMN IF NOT EXISTS "trackedFrom" TIMESTAMP(3)`);
      await prisma.$executeRawUnsafe(`UPDATE user_platforms SET "trackedFrom" = "lastSeen" WHERE "trackedFrom" IS NULL AND NOT estimated`);
      await backfillOnce();
    })().catch(err => { ready = null; throw err; });
  }
  return ready;
}

/**
 * First run only: an approximate history from past test attempts (each one records web /
 * mobile_web / app) and the last platform seen. Marked "estimated": an old "web" can also have
 * been the Windows app, and "app" was the Android app.
 */
async function backfillOnce() {
  const [{ n }] = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int n FROM user_platforms`);
  if (n > 0) return;
  await prisma.$executeRawUnsafe(`
    INSERT INTO user_platforms ("userId", platform, "firstSeen", "lastSeen", "activeDays", "lastDay", estimated)
    SELECT s."userId",
           CASE s.source WHEN 'app' THEN 'android' WHEN 'mobile_web' THEN 'web_mobile' ELSE 'web_desktop' END,
           min(s."startedAt"), max(coalesce(s."completedAt", s."startedAt")),
           count(DISTINCT (s."startedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date)::int,
           max((coalesce(s."completedAt", s."startedAt") AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date),
           true
    FROM user_test_sessions s JOIN users u ON u.id = s."userId"
    GROUP BY 1, 2
    ON CONFLICT DO NOTHING`);
  await prisma.$executeRawUnsafe(`
    INSERT INTO user_platforms ("userId", platform, "firstSeen", "lastSeen", "activeDays", "lastDay", estimated)
    SELECT id,
           CASE "lastPlatform" WHEN 'app' THEN 'android' WHEN 'android' THEN 'android' WHEN 'windows' THEN 'windows'
                               WHEN 'mobile_web' THEN 'web_mobile' WHEN 'web_mobile' THEN 'web_mobile' ELSE 'web_desktop' END,
           "lastSeen", "lastSeen", 1, ("lastSeen" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date, true
    FROM users WHERE "lastSeen" IS NOT NULL
    ON CONFLICT DO NOTHING`);
}

const clean = (v: unknown, max = 40) =>
  typeof v === 'string' && v.trim() ? v.trim().replace(/[^\w .()+\-/]/g, '').slice(0, max) || null : null;

/** The website's operating system, from the browser's user agent. */
function osFromUserAgent(ua: string): string | null {
  const android = ua.match(/Android (\d+(?:\.\d+)?)/);
  if (android) return `Android ${android[1]}`;
  const ios = ua.match(/(?:iPhone|iPad|CPU) OS (\d+)_?(\d+)?/);
  if (ios) return `iOS ${ios[1]}${ios[2] ? '.' + ios[2] : ''}`;
  if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
  if (/Windows NT/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return null;
}

/** True for requests from the Android app (its HTTP client is not a browser). */
export function isAndroidAppRequest(request: Request): boolean {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  return ua.includes('okhttp') || (!!ua && !ua.includes('mozilla'));
}

/**
 * Which platform a presence ping came from. The Android app and the website inside the
 * Windows app say so ("android" / "windows"); otherwise the browser decides computer / phone.
 */
export function classifyPlatform(request: Request, hint: Record<string, unknown> | undefined) {
  const ua = request.headers.get('user-agent') || '';
  const said = typeof hint?.platform === 'string' ? hint.platform : '';
  let platform: PlatformKey;
  if (said === 'android' || said === 'app' || isAndroidAppRequest(request)) platform = 'android';
  else if (said === 'windows') platform = 'windows';
  else platform = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ? 'web_mobile' : 'web_desktop';
  const os = platform === 'android' || platform === 'windows' ? clean(hint?.os) || osFromUserAgent(ua) : osFromUserAgent(ua);
  return { platform, version: platform === 'android' || platform === 'windows' ? clean(hint?.version, 20) : null, os };
}

// Written at most once per 10 minutes per student and platform (the ping comes every few minutes)
const recent = new Map<string, number>();
export async function recordPlatform(userId: string, p: { platform: PlatformKey; version: string | null; os: string | null }) {
  const key = `${userId}:${p.platform}:${p.version || ''}`;
  const now = Date.now();
  if (now - (recent.get(key) || 0) < 10 * 60 * 1000) return;
  recent.set(key, now);
  if (recent.size > 20000) recent.clear();
  try {
    await ensurePlatformTable();
    await prisma.$executeRawUnsafe(`
      INSERT INTO user_platforms ("userId", platform, "firstSeen", "lastSeen", "appVersion", "osInfo", "activeDays", "lastDay", "trackedFrom")
      VALUES ($1, $2, NOW(), NOW(), $3, $4, 1, (NOW() AT TIME ZONE 'Asia/Kolkata')::date, NOW())
      ON CONFLICT ("userId", platform) DO UPDATE SET
        "lastSeen" = NOW(),
        "appVersion" = coalesce(EXCLUDED."appVersion", user_platforms."appVersion"),
        "osInfo" = coalesce(EXCLUDED."osInfo", user_platforms."osInfo"),
        "activeDays" = user_platforms."activeDays" + CASE WHEN user_platforms."lastDay" IS NULL OR user_platforms."lastDay" < EXCLUDED."lastDay" THEN 1 ELSE 0 END,
        "lastDay" = EXCLUDED."lastDay",
        "trackedFrom" = coalesce(user_platforms."trackedFrom", NOW())`,
      userId, p.platform, p.version, p.os);
  } catch (e) {
    recent.delete(key);
    console.error('recordPlatform', e);
  }
}

const latestVersion = { windows: (windowsLatest as { version: string }).version, android: (androidLatest as { version: string }).version };

export async function handlePlatformAction(action: string, data: any) {
  await ensurePlatformTable();

  if (action === 'platform-stats') {
    const perPlatform = await prisma.$queryRawUnsafe<any[]>(`
      SELECT platform,
             count(*)::int AS users,
             count(*) FILTER (WHERE "lastSeen" > NOW() - interval '1 day')::int AS day,
             count(*) FILTER (WHERE "lastSeen" > NOW() - interval '7 days')::int AS week,
             count(*) FILTER (WHERE "lastSeen" > NOW() - interval '30 days')::int AS month,
             count(*) FILTER (WHERE "firstSeen" > NOW() - interval '7 days' AND NOT estimated)::int AS new_week
      FROM user_platforms GROUP BY platform`);
    const [mix] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT count(*)::int AS students,
             count(*) FILTER (WHERE n = 1)::int AS one,
             count(*) FILTER (WHERE n > 1)::int AS several,
             count(*) FILTER (WHERE has_app AND has_web)::int AS app_and_web
      FROM (SELECT "userId", count(*) n,
                   bool_or(platform IN ('android', 'windows')) has_app,
                   bool_or(platform IN ('web_desktop', 'web_mobile')) has_web
            FROM user_platforms GROUP BY "userId") t`);
    // Online now: the last platform of everyone seen in the last 5 minutes
    const online = await prisma.$queryRawUnsafe<any[]>(`
      SELECT CASE "lastPlatform" WHEN 'app' THEN 'android' WHEN 'android' THEN 'android' WHEN 'windows' THEN 'windows'
                                 WHEN 'mobile_web' THEN 'web_mobile' WHEN 'web_mobile' THEN 'web_mobile' ELSE 'web_desktop' END AS platform,
             count(*)::int AS n
      FROM users WHERE "lastSeen" > NOW() - interval '5 minutes' GROUP BY 1`);
    const versions = await prisma.$queryRawUnsafe<any[]>(`
      SELECT platform, coalesce("appVersion", '') AS version, count(*)::int AS users,
             count(*) FILTER (WHERE "lastSeen" > NOW() - interval '30 days')::int AS active
      FROM user_platforms WHERE platform IN ('android', 'windows')
      GROUP BY 1, 2 ORDER BY 1, 3 DESC`);
    const devices = await prisma.$queryRawUnsafe<any[]>(`
      SELECT platform, coalesce("osInfo", '') AS os, count(*)::int AS users
      FROM user_platforms WHERE "lastSeen" > NOW() - interval '30 days'
      GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 40`);
    const [{ since }] = await prisma.$queryRawUnsafe<any[]>(`SELECT min("trackedFrom") AS since FROM user_platforms`);
    return NextResponse.json({
      success: true,
      perPlatform: Object.fromEntries(PLATFORM_KEYS.map(k => [k, perPlatform.find(r => r.platform === k) || { platform: k, users: 0, day: 0, week: 0, month: 0, new_week: 0 }])),
      online: Object.fromEntries(PLATFORM_KEYS.map(k => [k, online.find(r => r.platform === k)?.n || 0])),
      mix, versions, devices, latestVersion,
      trackingSince: since ? new Date(since).toISOString() : null,
    });
  }

  if (action === 'platform-users') {
    const platform = PLATFORM_KEYS.includes(data?.platform) ? data.platform : null;
    const mixFilter = ['several', 'one', 'app_only', 'web_only'].includes(data?.mix) ? data.mix : null;
    const search = typeof data?.search === 'string' ? data.search.trim().slice(0, 80) : '';
    const page = Math.max(0, Math.min(1000, Number(data?.page) || 0));
    const pageSize = 50;
    const where: string[] = [];
    const args: unknown[] = [];
    if (platform) { args.push(platform); where.push(`$${args.length} = ANY(t.platforms)`); }
    if (mixFilter === 'several') where.push(`cardinality(t.platforms) > 1`);
    if (mixFilter === 'one') where.push(`cardinality(t.platforms) = 1`);
    if (mixFilter === 'app_only') where.push(`t.platforms <@ ARRAY['android','windows']::text[]`);
    if (mixFilter === 'web_only') where.push(`t.platforms <@ ARRAY['web_desktop','web_mobile']::text[]`);
    if (search) { args.push(`%${search}%`); where.push(`(u."fullName" ILIKE $${args.length} OR u.email ILIKE $${args.length} OR u."candidateCode" ILIKE $${args.length})`); }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const base = `
      FROM (SELECT "userId", array_agg(platform ORDER BY "lastSeen" DESC) platforms, max("lastSeen") last_seen,
                   json_agg(json_build_object('platform', platform, 'firstSeen', "firstSeen", 'lastSeen', "lastSeen",
                     'appVersion', "appVersion", 'osInfo', "osInfo", 'activeDays', "activeDays", 'estimated', estimated)
                     ORDER BY "lastSeen" DESC) detail
            FROM user_platforms GROUP BY "userId") t
      JOIN users u ON u.id = t."userId" ${filter}`;
    const [{ total }] = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int total ${base}`, ...args);
    args.push(pageSize, page * pageSize);
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT u.id, u."fullName" AS name, u.email, u."candidateCode", u.role, t.last_seen AS "lastSeen", t.detail AS platforms
      ${base} ORDER BY t.last_seen DESC LIMIT $${args.length - 1} OFFSET $${args.length}`, ...args);
    return NextResponse.json({ success: true, total, page, pageSize, users: rows, latestVersion });
  }

  if (action === 'platform-user') {
    const userId = typeof data?.targetUserId === 'string' ? data.targetUserId : null;
    if (!userId) return NextResponse.json({ success: false, error: 'User is required' }, { status: 400 });
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT platform, "firstSeen", "lastSeen", "appVersion", "osInfo", "activeDays", estimated
      FROM user_platforms WHERE "userId" = $1 ORDER BY "lastSeen" DESC`, userId);
    return NextResponse.json({ success: true, platforms: rows, latestVersion });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
