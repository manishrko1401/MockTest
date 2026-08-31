import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

/**
 * Weekly cron job — deletes question_response_states for sessions older than 90 days.
 * Runs every Sunday at 2:00 AM UTC via Vercel cron.
 *
 * The question_response_states table is the largest in the DB (16MB).
 * Old response state rows have no user-facing value after 90 days but
 * continue consuming space and slowing down queries.
 *
 * Vercel cron config (vercel.json):
 *   { "path": "/api/cron/cleanup-old-responses", "schedule": "0 2 * * 0" }
 */
export async function GET(request: Request) {
  // Security: Only allow Vercel Cron or internal calls
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

    // Find sessions older than 90 days that are completed
    const oldSessions = await prisma.userTestSession.findMany({
      where: {
        status: { in: ['COMPLETED', 'AUTO_SUBMITTED'] },
        completedAt: { lt: cutoffDate }
      },
      select: { id: true },
      take: 1000 // Process in batches to avoid timeouts
    });

    if (oldSessions.length === 0) {
      return NextResponse.json({ success: true, deleted: 0, message: 'No old sessions found' });
    }

    const sessionIds = oldSessions.map(s => s.id);

    // Delete response states first (FK constraint)
    const { count: deletedResponses } = await prisma.questionResponseState.deleteMany({
      where: { sessionId: { in: sessionIds } }
    });

    return NextResponse.json({
      success: true,
      sessionsScanned: sessionIds.length,
      responseStatesDeleted: deletedResponses,
      cutoffDate: cutoffDate.toISOString(),
      message: `Cleanup complete. Deleted ${deletedResponses} old response states from ${sessionIds.length} sessions.`
    });
  } catch (err: any) {
    console.error('[Cron] cleanup-old-responses error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
