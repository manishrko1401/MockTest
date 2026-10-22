import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import type { IntegrityResult } from './integrityRules';

// -----------------------------------------------------------------------------
// Exam integrity: suspicious attempts (see integrityRules.ts) are kept here for the admin
// "Integrity review" page. Only attempts that score "watch" or "flagged" get a row. Nothing
// is done to the student automatically: a flagged attempt only stays out of friend-room
// rankings until an admin clears it (or marks it as cheated).
// -----------------------------------------------------------------------------

export const INTEGRITY_ACTIONS = ['integrity-list', 'integrity-get', 'integrity-review'] as const;
export type IntegrityStatus = 'open' | 'cleared' | 'cheated';

let ready: Promise<void> | null = null;
export function ensureIntegrityTable(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS attempt_integrity (
          "sessionId" TEXT PRIMARY KEY REFERENCES user_test_sessions(id) ON DELETE CASCADE,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "testId" TEXT NOT NULL,
          score INT NOT NULL,
          level TEXT NOT NULL,
          reasons JSONB NOT NULL,
          stats JSONB NOT NULL,
          timeline JSONB,
          retake BOOLEAN NOT NULL DEFAULT false,
          status TEXT NOT NULL DEFAULT 'open',
          note TEXT,
          "reviewedBy" TEXT,
          "reviewedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS attempt_integrity_open_idx ON attempt_integrity (status, level, "createdAt" DESC)`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS attempt_integrity_test_idx ON attempt_integrity ("testId")`);
      await prisma.$executeRawUnsafe(`ALTER TABLE attempt_integrity ENABLE ROW LEVEL SECURITY`);
    })().catch(err => { ready = null; throw err; });
  }
  return ready;
}

/** One row per answered question for the admin timeline: [questionNo, chosen, correct?, seconds, ms after the first answer]. */
export type TimelineRow = [number, number | null, 0 | 1 | null, number, number | null];

export async function recordIntegrity(args: { sessionId: string; userId: string; testId: string; result: IntegrityResult; timeline: TimelineRow[] }) {
  const { result } = args;
  if (result.level === 'ok') return;
  await ensureIntegrityTable();
  await prisma.$executeRaw`
    INSERT INTO attempt_integrity ("sessionId", "userId", "testId", score, level, reasons, stats, timeline, retake)
    VALUES (${args.sessionId}, ${args.userId}, ${args.testId}, ${result.score}, ${result.level},
            ${JSON.stringify(result.reasons)}::jsonb, ${JSON.stringify(result.stats)}::jsonb, ${JSON.stringify(args.timeline)}::jsonb, ${result.retake})
    ON CONFLICT ("sessionId") DO NOTHING`;
}

/** Attempts that should stay out of rankings: flagged and not cleared. */
export async function heldSessions(sessionIds: string[]): Promise<Set<string>> {
  if (!sessionIds.length) return new Set();
  try {
    await ensureIntegrityTable();
    const rows = await prisma.$queryRaw<{ sessionId: string }[]>`
      SELECT "sessionId" FROM attempt_integrity WHERE "sessionId" = ANY(${sessionIds}) AND level = 'flagged' AND status <> 'cleared'`;
    return new Set(rows.map(r => r.sessionId));
  } catch {
    return new Set();
  }
}

const ok = (body: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...body });
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

export async function handleIntegrityAction(action: string, data: any, reviewerId: string) {
  await ensureIntegrityTable();
  switch (action) {
    // The review queue (newest first): open flagged/watch by default
    case 'integrity-list': {
      const status = ['open', 'cleared', 'cheated', 'all'].includes(data?.status) ? data.status : 'open';
      const level = ['flagged', 'watch', 'all'].includes(data?.level) ? data.level : 'all';
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT a."sessionId", a."userId", a."testId", a.score, a.level, a.reasons, a.stats, a.retake, a.status, a.note, a."reviewedAt", a."createdAt",
                u."fullName", u.email, u."candidateCode", t.title AS "testTitle", s."finalScore", s."maxScore", s."accuracyPercentage", s."timeSpentSeconds", s.source
         FROM attempt_integrity a
         JOIN users u ON u.id = a."userId"
         JOIN user_test_sessions s ON s.id = a."sessionId"
         LEFT JOIN mock_tests t ON t.id = a."testId"
         WHERE ($1 = 'all' OR a.status = $1) AND ($2 = 'all' OR a.level = $2)
         ORDER BY a.score DESC, a."createdAt" DESC LIMIT 200`, status, level);
      const counts = await prisma.$queryRawUnsafe<{ status: string; level: string; n: number }[]>(
        `SELECT status, level, COUNT(*)::int AS n FROM attempt_integrity GROUP BY 1, 2`);
      return ok({ items: rows, counts });
    }

    // One attempt with its answer timeline and the student's other recent flags
    case 'integrity-get': {
      const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : '';
      const row = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT a.*, u."fullName", u.email, u."candidateCode", t.title AS "testTitle", t."durationMinutes",
                s."finalScore", s."maxScore", s."accuracyPercentage", s."timeSpentSeconds", s."violationsCount", s.source, s."completedAt"
         FROM attempt_integrity a JOIN users u ON u.id = a."userId" JOIN user_test_sessions s ON s.id = a."sessionId"
         LEFT JOIN mock_tests t ON t.id = a."testId" WHERE a."sessionId" = $1`, sessionId))[0];
      if (!row) return fail('Not found', 404);
      const history = await prisma.$queryRawUnsafe<any[]>(
        `SELECT a."sessionId", a.score, a.level, a.status, a."createdAt", t.title AS "testTitle"
         FROM attempt_integrity a LEFT JOIN mock_tests t ON t.id = a."testId"
         WHERE a."userId" = $1 AND a."sessionId" <> $2 ORDER BY a."createdAt" DESC LIMIT 10`, row.userId, sessionId);
      return ok({ item: row, history });
    }

    // Decide: cleared (fair attempt) or cheated
    case 'integrity-review': {
      const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : '';
      const status = data?.status;
      if (!['open', 'cleared', 'cheated'].includes(status)) return fail('Choose cleared or cheated.');
      const note = typeof data?.note === 'string' ? data.note.slice(0, 500) : null;
      const n = await prisma.$executeRaw`
        UPDATE attempt_integrity SET status = ${status}, note = ${note}, "reviewedBy" = ${reviewerId},
          "reviewedAt" = CASE WHEN ${status} = 'open' THEN NULL ELSE NOW() END
        WHERE "sessionId" = ${sessionId}`;
      return n ? ok({ status }) : fail('Not found', 404);
    }
  }
  return fail('Unknown action');
}
