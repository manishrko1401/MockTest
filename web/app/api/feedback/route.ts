import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { requireStaff } from '../../lib/serverAuth';
import { notifyStaff, shorten } from '../../lib/adminPush';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { userId, testId, platformRating, examRating, feedbackText, source } = body;

    if (!userId || !testId || platformRating === undefined || examRating === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

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
        platformRating: Number(platformRating),
        examRating: Number(examRating),
        feedbackText: feedbackText || '',
        source: source || 'web',
      }
    });

    notifyStaff('feedback', () => ({
      title: `Feedback ${'★'.repeat(Math.max(1, Math.min(5, Number(platformRating) || 0)))} · ${shorten(feedback.testTitle, 50)}`,
      body: `${shorten(feedback.userFullName || 'Student', 40)}: ${feedback.feedbackText ? shorten(feedback.feedbackText) : `Exam ${examRating}/5, platform ${platformRating}/5`}`,
      data: { screen: 'feedback' },
    }));
    return NextResponse.json({ success: true, feedback });
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
