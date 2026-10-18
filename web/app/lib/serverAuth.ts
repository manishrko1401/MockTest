import crypto from 'crypto';
import { promisify } from 'util';
import { prisma } from './prisma';

// -----------------------------------------------------------------------------
// Server-side authentication. Who is calling is decided ONLY by a secret the
// caller can't make up:
//   - Website: the `tb_auth` cookie — a random login token, HttpOnly (page
//     scripts can't read it), stored in auth_sessions only as a SHA-256 hash.
//   - Mobile apps: the login session id returned by `login`
//     (users.currentSessionId), sent as the `x-session-id` header or
//     `data.authSessionId` / `data.sessionId`.
// User ids in cookies, headers or request bodies are never trusted.
// -----------------------------------------------------------------------------

export const AUTH_COOKIE = 'tb_auth';
const SESSION_TTL_DAYS = 30;
const COOKIE_MAX_AGE_SECONDS = 180 * 24 * 60 * 60; // the server-side expiry is what counts

export const STAFF_ROLES = ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'] as const;
export type Requester = { id: string; role: string };

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

let sessionsTableReady: Promise<void> | null = null;
function ensureSessionsTable(): Promise<void> {
  if (!sessionsTableReady) {
    sessionsTableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "tokenHash" TEXT NOT NULL UNIQUE,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "userAgent" TEXT,
          ip TEXT
        )`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions ("userId")`);
      // Not readable through Supabase's public REST API (the app's own connection bypasses RLS)
      await prisma.$executeRawUnsafe(`ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY`);
    })().catch((err) => {
      sessionsTableReady = null; // retry on the next request
      throw err;
    });
  }
  return sessionsTableReady;
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

/** Set-Cookie header value that stores (or, with null, removes) the login token. */
export function authCookie(token: string | null): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return token
    ? `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SECONDS}${secure}`
    : `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function createWebSession(userId: string, request: Request): Promise<string> {
  await ensureSessionsTable();
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 300);
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim().slice(0, 64) || null;
  await prisma.$executeRaw`
    INSERT INTO auth_sessions (id, "userId", "tokenHash", "expiresAt", "userAgent", ip)
    VALUES (${crypto.randomUUID()}, ${userId}, ${sha256(token)}, ${expiresAt}, ${userAgent}, ${ip})`;
  return token;
}

export async function revokeWebSession(token: string | null) {
  if (!token) return;
  await ensureSessionsTable();
  await prisma.$executeRaw`DELETE FROM auth_sessions WHERE "tokenHash" = ${sha256(token)}`;
}

/** Logs a user out everywhere on the website (password change/reset, block). */
export async function revokeAllWebSessions(userId: string, keepToken?: string | null) {
  await ensureSessionsTable();
  if (keepToken) {
    await prisma.$executeRaw`DELETE FROM auth_sessions WHERE "userId" = ${userId} AND "tokenHash" <> ${sha256(keepToken)}`;
  } else {
    await prisma.$executeRaw`DELETE FROM auth_sessions WHERE "userId" = ${userId}`;
  }
}

/** The user behind a website login token, or null (expired, revoked, blocked or unknown). */
export async function getWebSessionUser(token: string | null | undefined): Promise<Requester | null> {
  if (!token || token.length < 32) return null;
  await ensureSessionsTable();
  const rows = await prisma.$queryRaw<{ id: string; role: string; isBlocked: boolean; lastUsedAt: Date }[]>`
    SELECT u.id, u.role::text AS role, u."isBlocked", s."lastUsedAt"
    FROM auth_sessions s JOIN users u ON u.id = s."userId"
    WHERE s."tokenHash" = ${sha256(token)} AND s."expiresAt" > NOW()
    LIMIT 1`;
  const row = rows[0];
  if (!row || row.isBlocked) return null;
  // Sliding expiry, written at most once an hour
  if (Date.now() - new Date(row.lastUsedAt).getTime() > 3600_000) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
    prisma.$executeRaw`UPDATE auth_sessions SET "lastUsedAt" = NOW(), "expiresAt" = ${expiresAt} WHERE "tokenHash" = ${sha256(token)}`.catch(() => {});
  }
  return { id: row.id, role: row.role };
}

/** Who is making this request, or null if not logged in (blocked users count as not logged in). */
export async function getRequester(request: Request, body?: any): Promise<Requester | null> {
  const webUser = await getWebSessionUser(readCookie(request, AUTH_COOKIE));
  if (webUser) return webUser;

  // Mobile apps: the login session id
  const data = body?.data;
  const candidates = [
    request.headers.get('x-session-id'),
    data?.authSessionId,
    data?.sessionId,
    body?.sessionId,
  ];
  for (const appToken of candidates) {
    if (typeof appToken !== 'string' || appToken.length < 32) continue;
    const user = await prisma.user.findFirst({
      where: { currentSessionId: appToken },
      select: { id: true, role: true, isBlocked: true },
    });
    if (user && !user.isBlocked) return { id: user.id, role: user.role };
  }
  return null;
}

export const isStaff = (r: Requester | null) => !!r && (STAFF_ROLES as readonly string[]).includes(r.role);

/**
 * Guard for admin-only route handlers. Returns an error response to send back, or null when
 * the caller is ADMIN or has one of `roles`.
 */
export async function requireStaff(request: Request, roles: string[] = []): Promise<Response | null> {
  const requester = await getRequester(request).catch(() => null);
  if (!requester) {
    return Response.json({ success: false, error: 'Please log in again.', code: 'AUTH_REQUIRED' }, { status: 401 });
  }
  if (requester.role !== 'ADMIN' && !roles.includes(requester.role)) {
    return Response.json({ success: false, error: 'Forbidden: you do not have access to this.' }, { status: 403 });
  }
  return null;
}

/** Scheduled jobs: the CRON_SECRET bearer token (Vercel sends it automatically when the variable is set), or an admin. */
export async function requireCronOrAdmin(request: Request): Promise<Response | null> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') === `Bearer ${secret}`) return null;
  return requireStaff(request, []);
}

// ---- Passwords ----------------------------------------------------------------
// scrypt with a random salt; stored as "scrypt$<salt>$<hash>". Accounts created before
// this still hold the plain password: it is accepted once and replaced by a hash on
// the next successful login (in production).

const scrypt = promisify(crypto.scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LEN = 64;

export const isPasswordHash = (stored: string | null | undefined) => typeof stored === 'string' && stored.startsWith('scrypt$');

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LEN);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (typeof password !== 'string' || !password || typeof stored !== 'string' || !stored) return false;
  if (isPasswordHash(stored)) {
    const [, saltB64, hashB64] = stored.split('$');
    const expected = Buffer.from(hashB64 || '', 'base64');
    if (expected.length !== KEY_LEN) return false;
    const actual = await scrypt(password, Buffer.from(saltB64 || '', 'base64'), KEY_LEN);
    return crypto.timingSafeEqual(actual, expected);
  }
  // Not yet hashed (older account): constant-time comparison of the plain value
  const a = Buffer.from(sha256(password));
  const b = Buffer.from(sha256(stored));
  return crypto.timingSafeEqual(a, b);
}
