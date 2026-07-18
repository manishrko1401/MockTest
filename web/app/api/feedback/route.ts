import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("POST /api/feedback request received:", body);

    const { userId, testId, platformRating, examRating, feedbackText } = body;

    if (!userId || !testId || platformRating === undefined || examRating === undefined) {
      console.warn("POST /api/feedback validation failed. Missing required fields:", { userId, testId, platformRating, examRating });
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch user info to store name/email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true }
    });
    console.log("Fetched user for feedback:", user);

    // Fetch test info to store test title
    const test = await prisma.mockTest.findUnique({
      where: { id: testId },
      select: { title: true }
    });
    console.log("Fetched test for feedback:", test);

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
      }
    });
    console.log("Created feedback record in database successfully:", feedback);

    return NextResponse.json({ success: true, feedback });
  } catch (error: any) {
    console.error('Error in POST /api/feedback:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
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
