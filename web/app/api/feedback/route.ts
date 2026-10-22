import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { requireStaff, getRequester } from '../../lib/serverAuth';
import { hitLimit } from '../../lib/dbRateLimit';
import { notifyStaff, shorten } from '../../lib/adminPush';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { testId, platformRating, examRating, feedbackText, source } = body;
    // Feedback is filed under the signed-in account only (a user id in the body is ignored)
    const requester = await getRequester(req, body).catch(() => null);
    if (!requester) {
      return NextResponse.json({ success: false, error: 'Please log in again.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const userId = requester.id;

    if (!testId || typeof testId !== 'string' || platformRating === undefined || examRating === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    const limit = await hitLimit(`feedback:${userId}`, 20, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: 'Too many feedback messages. Please try again later.' }, { status: 429 });
    }
    const rating = (v: unknown) => Math.max(0, Math.min(5, Math.round(Number(v) || 0)));

    // Fetch user info to store name/email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true }
    });

    // Fetch test info to store test title
    const test = await prisma.mockTest.findUnique({
      where: { id: testId },
      select: { title: true }
    });

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        userEmail: user?.email || '',
        userFullName: user?.fullName || '',
        testId,
        testTitle: test?.title || 'Unknown Mock Test',
        platformRating: rating(platformRating),
        examRating: rating(examRating),
        feedbackText: typeof feedbackText === 'string' ? feedbackText.slice(0, 2000) : '',
        source: typeof source === 'string' ? source.slice(0, 20) : 'web',
      }
    });

    notifyStaff('feedback', () => ({
      title: `Feedback ${'★'.repeat(Math.max(1, Math.min(5, Number(platformRating) || 0)))} · ${shorten(feedback.testTitle, 50)}`,
      body: `${shorten(feedback.userFullName || 'Student', 40)}: ${feedback.feedbackText ? shorten(feedback.feedbackText) : `Exam ${examRating}/5, platform ${platformRating}/5`}`,
      data: { screen: 'feedback' },
    }));
    // the sender gets back only what they sent, never stored account details
    return NextResponse.json({ success: true, feedback: { id: feedback.id, testId: feedback.testId, platformRating: feedback.platformRating, examRating: feedback.examRating, createdAt: feedback.createdAt } });
  } catch (error: any) {
    console.error('Error in POST /api/feedback:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Reading and deleting feedback: admin / support team only (sending it is open)
export async function GET(req: Request) {
  const denied = await requireStaff(req, ['SUPPORT_TEAM']);
  if (denied) return denied;
  try {
    const feedbacks = await prisma.feedback.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json({ success: true, feedbacks });
  } catch (error: any) {
    console.error('Error fetching feedbacks:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const denied = await requireStaff(req, ['SUPPORT_TEAM']);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing required feedback ID' }, { status: 400 });
    }

    await prisma.feedback.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
