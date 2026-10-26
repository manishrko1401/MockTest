import { prisma } from './prisma';

// -----------------------------------------------------------------------------
// Who is online right now, and what they are doing (admin → User management → Live now).
// The website, the Windows app and the Android app check in about every minute while open
// (the "ping"), say "away" when the tab / app is hidden and "left" when it closes. Each check-in
// carries the current activity in words ("Taking SSC CGL Full Test 1 · Q23 of 100"). Only the
// latest state per student is kept; there is no history.
// -----------------------------------------------------------------------------

export type PresenceState = 'active' | 'away' | 'left';

/** Seen within this long (and not "left") = online / away. The apps check in every ~60 s. */
export const ONLINE_MS = 2 * 60 * 1000;

let ready: Promise<void> | null = null;
export function ensurePresenceTable(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS user_presence (
        "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        state TEXT NOT NULL DEFAULT 'active',
        activity TEXT NOT NULL DEFAULT '',
        platform TEXT,
        "onlineSince" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
      )`);
      await prisma.$executeRawUnsafe(`ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS user_presence_updated ON user_presence ("updatedAt")`);
    })().catch(err => { ready = null; throw err; });
  }
  return ready;
}

// Per server instance: skip the write when nothing changed and it was saved moments ago
const lastWrite = new Map<string, { at: number; key: string }>();

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

export async function recordPresence(userId: string, input: { state?: unknown; activity?: unknown; platform?: string | null }) {
  const state: PresenceState = input.state === 'away' || input.state === 'left' ? input.state : 'active';
  const activity = clean(input.activity, 160);
  const platform = input.platform || null;
  const key = `${state}|${activity}|${platform}`;
  const prev = lastWrite.get(userId);
  const now = Date.now();
  if (prev && prev.key === key && now - prev.at < 40 * 1000) return;
  lastWrite.set(userId, { at: now, key });
  if (lastWrite.size > 20000) lastWrite.clear();
  try {
    await ensurePresenceTable();
    // "onlineSince" restarts when the student comes back after being offline
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_presence ("userId", state, activity, platform, "onlineSince", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT ("userId") DO UPDATE SET
         "onlineSince" = CASE WHEN user_presence.state = 'left' OR user_presence."updatedAt" < NOW() - INTERVAL '${ONLINE_MS / 1000} seconds'
                              THEN NOW() ELSE user_presence."onlineSince" END,
         state = EXCLUDED.state,
         activity = CASE WHEN EXCLUDED.activity = '' THEN user_presence.activity ELSE EXCLUDED.activity END,
         platform = COALESCE(EXCLUDED.platform, user_presence.platform),
         "updatedAt" = NOW()`,
      userId, state, activity, platform);
  } catch (err) {
    lastWrite.delete(userId);
    console.error('recordPresence failed:', err);
  }
}

export type PresenceRow = {
  userId: string; state: PresenceState; activity: string; platform: string | null; onlineSince: string; updatedAt: string;
  name: string; email: string; candidateCode: string | null;
};

/** Students online or away right now (seen in the last 2 minutes, not "left"). */
export async function listPresence(): Promise<PresenceRow[]> {
  await ensurePresenceTable();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT p."userId", p.state, p.activity, p.platform, p."onlineSince", p."updatedAt",
            u."fullName" AS name, u.email, u."candidateCode"
       FROM user_presence p JOIN users u ON u.id = p."userId"
      WHERE p.state <> 'left' AND p."updatedAt" > NOW() - INTERVAL '${ONLINE_MS / 1000} seconds'
      ORDER BY p."onlineSince" ASC
      LIMIT 2000`);
  return rows.map(r => ({
    userId: r.userId, state: r.state, activity: r.activity || '', platform: r.platform,
    onlineSince: new Date(r.onlineSince).toISOString(), updatedAt: new Date(r.updatedAt).toISOString(),
    name: r.name || '', email: r.email || '', candidateCode: r.candidateCode || null,
  }));
}
