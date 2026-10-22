import { prisma } from './prisma';

// -----------------------------------------------------------------------------
// Rate limits kept in the database, so they hold across all server instances
// (the in-memory checkRateLimit only sees one Vercel instance at a time).
// Used for the things that must not be guessed or flooded: password reset codes,
// the locker PIN, sign-up, and the public forms.
// -----------------------------------------------------------------------------

let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS rate_events (
          key TEXT NOT NULL,
          at TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS rate_events_key_at_idx ON rate_events (key, at)`);
      await prisma.$executeRawUnsafe(`ALTER TABLE rate_events ENABLE ROW LEVEL SECURITY`);
    })().catch((err) => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}

export type LimitResult = { allowed: boolean; retryAfterMinutes: number };

/**
 * Counts one event for `key` and says whether it is still within `limit` per `windowMs`.
 * Blocked attempts are not counted, so a lock ends `windowMs` after the earliest counted event.
 * Fails open (allowed) if the database is unreachable, so a DB hiccup never locks everyone out.
 */
export async function hitLimit(key: string, limit: number, windowMs: number): Promise<LimitResult> {
  try {
    await ensureTable();
    const since = new Date(Date.now() - windowMs);
    const rows = await prisma.$queryRaw<{ n: number; oldest: Date | null }[]>`
      SELECT count(*)::int AS n, min(at) AS oldest FROM rate_events WHERE key = ${key} AND at > ${since}`;
    const { n, oldest } = rows[0] || { n: 0, oldest: null };
    if (n >= limit) {
      const waitMs = oldest ? new Date(oldest).getTime() + windowMs - Date.now() : windowMs;
      return { allowed: false, retryAfterMinutes: Math.max(1, Math.ceil(waitMs / 60000)) };
    }
    await prisma.$executeRaw`INSERT INTO rate_events (key, at) VALUES (${key}, NOW())`;
    // Now and then, drop events older than a day
    if (Math.random() < 0.02) {
      prisma.$executeRaw`DELETE FROM rate_events WHERE at < NOW() - interval '1 day'`.catch(() => {});
    }
    return { allowed: true, retryAfterMinutes: 0 };
  } catch (err) {
    console.error('hitLimit failed:', err);
    return { allowed: true, retryAfterMinutes: 0 };
  }
}

/** How many events `key` has in the window, without counting a new one. */
export async function countHits(key: string, windowMs: number): Promise<number> {
  try {
    await ensureTable();
    const since = new Date(Date.now() - windowMs);
    const rows = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM rate_events WHERE key = ${key} AND at > ${since}`;
    return rows[0]?.n || 0;
  } catch {
    return 0;
  }
}

/** Forgets the events for `key` (e.g. wrong-PIN count after a correct PIN). */
export async function clearLimit(key: string): Promise<void> {
  try {
    await ensureTable();
    await prisma.$executeRaw`DELETE FROM rate_events WHERE key = ${key}`;
  } catch { /* ignore */ }
}
