import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

function formatDateTime(date: Date) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    }).format(new Date(date));
  } catch (e) {
    return new Date(date).toISOString();
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'No action provided' }, { status: 400 });
    }

    switch (action) {
      case 'bootstrap':
        return await handleBootstrap();
      case 'signup':
        return await handleSignup(data);
      case 'login':
        return await handleLogin(data);
      case 'update-profile':
        return await handleUpdateProfile(data);
      case 'update-password':
        return await handleUpdatePassword(data);
      case 'save-profile-admin':
        return await handleSaveProfileAdmin(data);
      case 'toggle-bookmark':
        return await handleToggleBookmark(data);
      case 'add-attempt':
        return await handleAddAttempt(data);
      case 'save-ongoing-session':
        return await handleSaveOngoingSession(data);
      case 'clear-ongoing-session':
        return await handleClearOngoingSession(data);
      case 'reset-attempt':
        return await handleResetAttempt(data);
      case 'add-notice':
        return await handleAddNotice(data);
      case 'delete-notice':
        return await handleDeleteNotice(data);
      case 'add-category':
        return await handleAddCategory(data);
      case 'delete-category':
        return await handleDeleteCategory(data);
      case 'add-subcategory':
        return await handleAddSubCategory(data);
      case 'delete-subcategory':
        return await handleDeleteSubCategory(data);
      case 'add-mocktest':
        return await handleAddMockTest(data);
      case 'delete-mocktest':
        return await handleDeleteMockTest(data);
      case 'save-custom-questions':
        return await handleSaveCustomQuestions(data);
      case 'get-custom-questions':
        return await handleGetCustomQuestions(data);
      case 'report-question':
        return await handleReportQuestion(data);
      case 'delete-reported-question':
        return await handleDeleteReportedQuestion(data);
      case 'get-support-messages':
        return await handleGetSupportMessages(data);
      case 'send-support-message':
        return await handleSendSupportMessage(data);
      case 'get-support-users':
        return await handleGetSupportUsers();
      case 'delete-support-conversation':
        return await handleDeleteSupportConversation(data);
      case 'edit-support-message':
        return await handleEditSupportMessage(data);
      default:
        return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Action Handlers
// -----------------------------------------------------------------------------

async function handleBootstrap() {
  // Check if categories are empty, if so, run seed
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    await seedDatabase();
  }

  // Fetch all users list, ordered by newly added first (createdAt desc)
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      testSessions: {
        include: {
          mockTest: true,
          responses: true,
        },
      },
    },
  });

  // Map users to UI model format
  const usersList = users.map((u: any) => {
    return {
      id: u.id,
      candidateCode: u.candidateCode,
      name: u.fullName,
      email: u.email,
      mobile: u.mobile,
      referralCode: u.referralCode,
      referredBy: u.referredBy,
      referralsCount: u.referralsCount,
      role: u.role,
      subscriptionTier: u.subscriptionTier,
      subscriptionPurchasedAt: u.subscriptionPurchasedAt,
      subscriptionExpiresAt: u.subscriptionExpiresAt,
      registeredDate: formatDateTime(u.createdAt),
      isBlocked: u.isBlocked,
      coins: u.coins,
      referralCoinsCredited: u.referralCoinsCredited,
      password: u.passwordHash, // Exposed for simulated profile views in mock dashboard
      bookmarkedQuestions: u.bookmarkedQuestions ? (u.bookmarkedQuestions as any) : [],
      testSessions: u.testSessions.map((session: any) => {
        const responsesRecord: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number }> = {};
        session.responses.forEach((r: any) => {
          responsesRecord[r.questionId] = {
            selectedOptionIndex: r.selectedOptionIndex,
            elapsedSeconds: r.elapsedSeconds,
          };
        });
        return {
          id: session.id,
          testId: session.mockTestId,
          title: session.mockTest?.title || 'Mock Test',
          score: session.finalScore ?? 0,
          maxScore: session.mockTest?.maxMarks ?? 200,
          accuracy: session.accuracyPercentage ?? 0,
          durationSeconds: session.timeSpentSeconds,
          status: session.status,
          violations: session.violationsCount,
          date: session.startedAt.toISOString().split('T')[0],
          responses: responsesRecord,
          timeRemaining: session.remainingSeconds,
          currentSectionIndex: session.currentSectionIndex,
          currentQuestionIndex: session.currentQuestionIndex,
        };
      }),
    };
  });

  // Fetch Notices
  const notices = await prisma.notice.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  const noticesList = notices.map((n: any) => ({
    id: n.id,
    title: n.title,
    date: n.date,
    publishDate: n.publishDate,
    type: n.type,
    category: n.category as 'notice' | 'result' | 'admit_card' | 'announcement',
    url: n.url || undefined,
    lastDate: n.lastDate || undefined,
    imageUrl: n.imageUrl || undefined,
  }));

  // Fetch Exam Catalog
  const categories = await prisma.category.findMany({
    include: {
      exams: {
        include: {
          testSeries: {
            include: {
              mockTests: true,
            },
          },
        },
      },
    },
  });

  const examCatalog = categories.map((cat: any) => {
    return {
      id: cat.id,
      name: cat.name,
      subCategories: cat.exams.map((exam: any) => {
        const tests = exam.testSeries.flatMap((ts: any) => {
          return ts.mockTests.map((t: any) => ({
            id: t.id,
            title: t.title,
            questionsCount: t.questionsCount,
            durationMinutes: t.durationMinutes,
            maxMarks: t.maxMarks,
            isPremium: t.requiredTierName !== 'None',
            requiredTier: t.requiredTierName as 'None' | 'Testbook Pass' | 'Testbook Pass Pro',
            customQuestionsCount: t.customQuestions ? (t.customQuestions as any[]).length : 0,
          }));
        });
        return {
          id: exam.id,
          name: exam.name,
          tests,
        };
      }),
    };
  });

  // Fetch Reported Questions
  const reportedQuestions = await prisma.reportedQuestion.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  const reportedQuestionsList = reportedQuestions.map((rq: any) => ({
    id: rq.id,
    questionId: rq.questionId,
    questionText: rq.questionText,
    mockTestId: rq.mockTestId,
    mockTestTitle: rq.mockTestTitle,
    message: rq.message,
    userId: rq.userId || null,
    candidateCode: rq.candidateCode || null,
    createdAt: formatDateTime(rq.createdAt),
  }));

  return NextResponse.json({
    success: true,
    usersList,
    noticesList,
    examCatalog,
    reportedQuestionsList,
  });
}

async function handleSignup(data: any) {
  const { name, email, mobile, password, referralCodeInput } = data;
  const trimmedEmail = email.trim().toLowerCase();

  // Check duplication
  const existing = await prisma.user.findUnique({
    where: { email: trimmedEmail },
  });
  if (existing) {
    return NextResponse.json({ success: false, error: 'User account already exists with this email.' }, { status: 400 });
  }

  const codeName = name.trim().split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
  const referralCode = 'TB-' + codeName + '-' + Math.floor(1000 + Math.random() * 9000);

  let referredByCode: string | null = null;
  if (referralCodeInput && referralCodeInput.trim() !== '') {
    const referrer = await prisma.user.findFirst({
      where: { referralCode: { equals: referralCodeInput.trim(), mode: 'insensitive' } },
    });
    if (referrer) {
      referredByCode = referrer.referralCode;
      // Increment referrer's count
      await prisma.user.update({
        where: { id: referrer.id },
        data: { referralsCount: referrer.referralsCount + 1 },
      });
    }
  }

  const newUser = await prisma.user.create({
    data: {
      candidateCode: 'CGL_' + Math.floor(1000 + Math.random() * 9000),
      fullName: name.trim(),
      email: trimmedEmail,
      mobile: mobile.trim(),
      passwordHash: password || 'password123',
      referralCode,
      referredBy: referredByCode,
      referralsCount: 0,
      role: 'STUDENT',
      subscriptionTier: 'None',
      isBlocked: false,
    },
  });

  return NextResponse.json({
    success: true,
    user: {
      id: newUser.id,
      candidateCode: newUser.candidateCode,
      name: newUser.fullName,
      email: newUser.email,
      mobile: newUser.mobile,
      referralCode: newUser.referralCode,
      referredBy: newUser.referredBy,
      referralsCount: newUser.referralsCount,
      role: newUser.role,
      subscriptionTier: newUser.subscriptionTier,
      subscriptionPurchasedAt: newUser.subscriptionPurchasedAt,
      subscriptionExpiresAt: newUser.subscriptionExpiresAt,
      registeredDate: formatDateTime(newUser.createdAt),
      isBlocked: newUser.isBlocked,
      coins: newUser.coins,
      referralCoinsCredited: newUser.referralCoinsCredited,
      testSessions: [],
      bookmarkedQuestions: [],
    },
  });
}

async function handleLogin(data: any) {
  const { email } = data;
  const trimmedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: trimmedEmail },
    include: {
      testSessions: {
        include: {
          mockTest: true,
          responses: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: 'User account not found with this email.' }, { status: 404 });
  }

  if (user.isBlocked) {
    return NextResponse.json({ success: false, error: 'This user account is blocked by the administrator.' }, { status: 403 });
  }

  // Format responses & sessions
  const mappedUser = {
    id: user.id,
    candidateCode: user.candidateCode,
    name: user.fullName,
    email: user.email,
    mobile: user.mobile,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    referralsCount: user.referralsCount,
    role: user.role,
    subscriptionTier: user.subscriptionTier,
    subscriptionPurchasedAt: user.subscriptionPurchasedAt,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    registeredDate: formatDateTime(user.createdAt),
    isBlocked: user.isBlocked,
    password: user.passwordHash,
    coins: user.coins,
    referralCoinsCredited: user.referralCoinsCredited,
    bookmarkedQuestions: user.bookmarkedQuestions ? (user.bookmarkedQuestions as any) : [],
    testSessions: user.testSessions.map((session: any) => {
      const responsesRecord: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number }> = {};
      session.responses.forEach((r: any) => {
        responsesRecord[r.questionId] = {
          selectedOptionIndex: r.selectedOptionIndex,
          elapsedSeconds: r.elapsedSeconds,
        };
      });
      return {
        id: session.id,
        testId: session.mockTestId,
        title: session.mockTest?.title || 'Mock Test',
        score: session.finalScore ?? 0,
        maxScore: session.mockTest?.maxMarks ?? 200,
        accuracy: session.accuracyPercentage ?? 0,
        durationSeconds: session.timeSpentSeconds,
        status: session.status,
        violations: session.violationsCount,
        date: session.startedAt.toISOString().split('T')[0],
        responses: responsesRecord,
        timeRemaining: session.remainingSeconds,
        currentSectionIndex: session.currentSectionIndex,
        currentQuestionIndex: session.currentQuestionIndex,
      };
    }),
  };

  return NextResponse.json({ success: true, user: mappedUser });
}

async function handleUpdateProfile(data: any) {
  const { userId, name, email, mobile } = data;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
    },
  });

  return NextResponse.json({ success: true, user: { name: updated.fullName, email: updated.email, mobile: updated.mobile } });
}

async function handleUpdatePassword(data: any) {
  const { userId, newPass } = data;

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPass.trim(),
    },
  });

  return NextResponse.json({ success: true });
}

async function handleSaveProfileAdmin(data: any) {
  const {
    userId,
    name,
    email,
    mobile,
    referralCode,
    referredBy,
    referralsCount,
    role,
    tier,
    purchasedAt,
    expiry,
    password,
    isBlocked,
    coins
  } = data;

  await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: name,
      email: email.trim().toLowerCase(),
      mobile,
      referralCode,
      referredBy,
      referralsCount,
      role,
      subscriptionTier: tier,
      subscriptionPurchasedAt: purchasedAt,
      subscriptionExpiresAt: expiry,
      passwordHash: password,
      isBlocked,
      coins: coins !== undefined ? Number(coins) : undefined
    },
  });

  return NextResponse.json({ success: true });
}

async function handleToggleBookmark(data: any) {
  const { userId, bookmarks } = data;

  await prisma.user.update({
    where: { id: userId },
    data: {
      bookmarkedQuestions: bookmarks,
    },
  });

  return NextResponse.json({ success: true });
}

async function handleAddAttempt(data: any) {
  const { userId, testId, title, score, maxScore, accuracy, durationSeconds, violations, responses } = data;

  // Remove any ongoing session first
  await prisma.userTestSession.deleteMany({
    where: {
      userId,
      mockTestId: testId,
      status: 'ONGOING',
    },
  });

  // Create completed session
  const session = await prisma.userTestSession.create({
    data: {
      userId,
      mockTestId: testId,
      status: 'COMPLETED',
      finalScore: score,
      accuracyPercentage: accuracy,
      timeSpentSeconds: durationSeconds,
      violationsCount: violations,
      remainingSeconds: 0,
      completedAt: new Date(),
    },
  });

  // Check if this is the user's first completed session and if they have a pending referral
  try {
    const userObj = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, referralCoinsCredited: true }
    });

    if (userObj && userObj.referredBy && !userObj.referralCoinsCredited) {
      const completedSessionsCount = await prisma.userTestSession.count({
        where: {
          userId,
          status: { in: ['COMPLETED', 'AUTO_SUBMITTED'] }
        }
      });

      if (completedSessionsCount === 1) {
        // 1. Credit 10 coins to the referred user and set referralCoinsCredited: true
        await prisma.user.update({
          where: { id: userId },
          data: {
            coins: { increment: 10 },
            referralCoinsCredited: true
          }
        });

        // 2. Find the referrer by referralCode and credit 20 coins
        const referrer = await prisma.user.findFirst({
          where: { referralCode: { equals: userObj.referredBy.trim(), mode: 'insensitive' } }
        });

        if (referrer) {
          await prisma.user.update({
            where: { id: referrer.id },
            data: {
              coins: { increment: 20 }
            }
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to credit referral coins:", err);
  }

  // Create question responses
  if (responses) {
    const responsesData = Object.entries(responses).map(([qId, val]: any) => {
      return {
        sessionId: session.id,
        questionId: qId,
        selectedOptionIndex: val.selectedOptionIndex,
        state: val.selectedOptionIndex !== null ? 3 : 2, // 3: ANSWERED, 2: NOT_ANSWERED
        elapsedSeconds: val.elapsedSeconds,
      };
    });

    if (responsesData.length > 0) {
      await prisma.questionResponseState.createMany({
        data: responsesData,
      });
    }
  }

  // Fetch updated user coins and referral credit status
  let updatedCoins = 0;
  let updatedReferralCoinsCredited = false;
  try {
    const userUpdate = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true, referralCoinsCredited: true }
    });
    if (userUpdate) {
      updatedCoins = userUpdate.coins;
      updatedReferralCoinsCredited = userUpdate.referralCoinsCredited;
    }
  } catch (err) {
    console.error("Failed to get updated coins:", err);
  }

  return NextResponse.json({
    success: true,
    coins: updatedCoins,
    referralCoinsCredited: updatedReferralCoinsCredited
  });
}

async function handleSaveOngoingSession(data: any) {
  const { userId, testId, title, timeRemaining, violations, responses, currentSectionIndex, currentQuestionIndex } = data;

  const existing = await prisma.userTestSession.findFirst({
    where: {
      userId,
      mockTestId: testId,
      status: 'ONGOING',
    },
  });

  let sessionId = '';

  if (existing) {
    sessionId = existing.id;
    await prisma.userTestSession.update({
      where: { id: sessionId },
      data: {
        remainingSeconds: timeRemaining,
        violationsCount: violations,
        currentSectionIndex: currentSectionIndex ?? 0,
        currentQuestionIndex: currentQuestionIndex ?? 0,
      },
    });

    // Delete existing responses and insert new ones
    await prisma.questionResponseState.deleteMany({
      where: { sessionId },
    });
  } else {
    const created = await prisma.userTestSession.create({
      data: {
        userId,
        mockTestId: testId,
        status: 'ONGOING',
        remainingSeconds: timeRemaining,
        violationsCount: violations,
        currentSectionIndex: currentSectionIndex ?? 0,
        currentQuestionIndex: currentQuestionIndex ?? 0,
      },
    });
    sessionId = created.id;
  }

  if (responses) {
    const responsesData = Object.entries(responses).map(([qId, val]: any) => {
      return {
        sessionId,
        questionId: qId,
        selectedOptionIndex: val.selectedOptionIndex,
        state: val.selectedOptionIndex !== null ? 3 : 2,
        elapsedSeconds: val.elapsedSeconds,
      };
    });

    if (responsesData.length > 0) {
      await prisma.questionResponseState.createMany({
        data: responsesData,
      });
    }
  }

  return NextResponse.json({ success: true });
}

async function handleClearOngoingSession(data: any) {
  const { userId, testId } = data;

  await prisma.userTestSession.deleteMany({
    where: {
      userId,
      mockTestId: testId,
      status: 'ONGOING',
    },
  });

  return NextResponse.json({ success: true });
}

async function handleResetAttempt(data: any) {
  const { userId, sessionId } = data;

  await prisma.userTestSession.delete({
    where: { id: sessionId },
  });

  return NextResponse.json({ success: true });
}

async function handleAddNotice(data: any) {
  const { id, title, type, category, date, publishDate, url, lastDate, imageUrl } = data;

  await prisma.notice.create({
    data: {
      id,
      title,
      type,
      category,
      date,
      publishDate,
      url: url || null,
      lastDate: lastDate || null,
      imageUrl: imageUrl || null,
    },
  });

  return NextResponse.json({ success: true });
}

async function handleDeleteNotice(data: any) {
  const { id } = data;

  await prisma.notice.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

async function handleAddCategory(data: any) {
  const { id, name } = data;

  await prisma.category.create({
    data: {
      id,
      name,
    },
  });

  return NextResponse.json({ success: true });
}

async function handleDeleteCategory(data: any) {
  const { categoryId } = data;

  await prisma.category.delete({
    where: { id: categoryId },
  });

  return NextResponse.json({ success: true });
}

async function handleAddSubCategory(data: any) {
  const { id, categoryId, name } = data;

  await prisma.exam.create({
    data: {
      id,
      categoryId,
      name,
    },
  });

  return NextResponse.json({ success: true });
}

async function handleDeleteSubCategory(data: any) {
  const { subCategoryId } = data;

  await prisma.exam.delete({
    where: { id: subCategoryId },
  });

  return NextResponse.json({ success: true });
}

async function handleAddMockTest(data: any) {
  const { categoryId, subCategoryId, id, title, questionsCount, durationMinutes, maxMarks, requiredTier } = data;

  // Find or create default test series for this subcategory
  let testSeries = await prisma.testSeries.findFirst({
    where: { examId: subCategoryId },
  });

  if (!testSeries) {
    testSeries = await prisma.testSeries.create({
      data: {
        id: 'ts_' + Math.random().toString(36).substring(2, 9),
        examId: subCategoryId,
        title: 'Default Series',
      },
    });
  }

  await prisma.mockTest.create({
    data: {
      id,
      testSeriesId: testSeries.id,
      title,
      durationMinutes,
      questionsCount,
      maxMarks,
      requiredTierName: requiredTier,
      passingCutoff: 0.0,
    },
  });

  return NextResponse.json({ success: true });
}

async function handleDeleteMockTest(data: any) {
  const { testId } = data;

  await prisma.mockTest.delete({
    where: { id: testId },
  });

  return NextResponse.json({ success: true });
}

async function handleSaveCustomQuestions(data: any) {
  const { testId, questions } = data;

  await prisma.mockTest.update({
    where: { id: testId },
    data: {
      customQuestions: questions,
    },
  });

  return NextResponse.json({ success: true });
}

async function handleGetCustomQuestions(data: any) {
  const { testId } = data;

  const mockTest = await prisma.mockTest.findUnique({
    where: { id: testId },
    select: {
      customQuestions: true,
    },
  });

  return NextResponse.json({
    success: true,
    questions: mockTest?.customQuestions || null,
  });
}

async function handleReportQuestion(data: any) {
  const { questionId, message, questionText, mockTestId, mockTestTitle, userId, candidateCode } = data;

  const reported = await prisma.reportedQuestion.create({
    data: {
      questionId,
      message,
      questionText: questionText || '',
      mockTestId: mockTestId || '',
      mockTestTitle: mockTestTitle || '',
      userId: userId || null,
      candidateCode: candidateCode || null,
    },
  });

  return NextResponse.json({
    success: true,
    reported: {
      id: reported.id,
      questionId: reported.questionId,
      message: reported.message,
      questionText: reported.questionText,
      mockTestId: reported.mockTestId,
      mockTestTitle: reported.mockTestTitle,
      userId: reported.userId,
      candidateCode: reported.candidateCode,
      createdAt: formatDateTime(reported.createdAt),
    },
  });
}

// -----------------------------------------------------------------------------
// Seeding Logic
// -----------------------------------------------------------------------------

async function seedDatabase() {
  console.log('Seeding Supabase database tables...');

  // Seed Notices
  const defaultNotices = [
    { id: 'n1', title: 'SSC CGL 2026 Tier 1 Exam Dates Announced', date: '25 June 2026', publishDate: '2026-06-25', type: 'EXAM DATE', category: 'notice', url: 'https://ssc.gov.in', lastDate: '10 July 2026' },
    { id: 'n2', title: 'RRB NTPC Application Window Extended to July 10', date: '24 June 2026', publishDate: '2026-06-24', type: 'ADMISSION', category: 'notice', url: 'https://indianrailways.gov.in', lastDate: '10 July 2026' },
    { id: 'n3', title: 'UPPSC Prelims 2026 Exam Postponed. New Schedule Soon', date: '20 June 2026', publishDate: '2026-06-20', type: 'NOTIFICATION', category: 'notice', url: 'https://uppsc.up.nic.in' },
    { id: 'r1', title: 'CTET 2026 Answer Key & Response Sheet Released', date: '22 June 2026', publishDate: '2026-06-22', type: 'RESULT', category: 'result', url: 'https://ctet.nic.in' },
    { id: 'r2', title: 'SSC CHSL 2025 Final Merit List & Cutoff PDF Out', date: '21 June 2026', publishDate: '2026-06-21', type: 'MERIT LIST', category: 'result', url: 'https://ssc.gov.in' },
    { id: 'r3', title: 'SBI PO 2026 Prelims Scorecard & Cutoff Decided', date: '18 June 2026', publishDate: '2026-06-18', type: 'SCORECARD', category: 'result', url: 'https://sbi.co.in' },
    { id: 'a1', title: 'UGC NET June 2026 Admit Card Download Link Active', date: '23 June 2026', publishDate: '2026-06-23', type: 'ADMIT CARD', category: 'admit_card', url: 'https://ugcnet.nta.ac.in' },
    { id: 'a2', title: 'RRB ALP 2026 Stage 1 City Intimation Released', date: '22 June 2026', publishDate: '2026-06-22', type: 'CITY INFO', category: 'admit_card', url: 'https://indianrailways.gov.in' },
    { id: 'a3', title: 'IBPS Clerk 2026 Prelims Call Letter Available', date: '19 June 2026', publishDate: '2026-06-19', type: 'CALL LETTER', category: 'admit_card', url: 'https://ibps.in' },
    { id: 'an1', title: 'Free Pass Pro for 2 days for all users! Start practicing now.', date: '26 June 2026', publishDate: '2026-06-26', type: 'PROMOTION', category: 'announcement' },
    { id: 'an2', title: 'Join our Telegram channel for daily government job updates.', date: '25 June 2026', publishDate: '2026-06-25', type: 'SOCIAL', category: 'announcement', url: 'https://telegram.me/mocktest' }
  ];

  for (const n of defaultNotices) {
    await prisma.notice.create({ data: n });
  }

  // Seed Categories, Exams, MockTests
  const catalog = [
    {
      id: 'ssc',
      name: 'SSC Exams',
      subCategories: [
        {
          id: 'ssc_cgl',
          name: 'SSC CGL Exams',
          tests: [
            { id: 'ssc_cgl_tier1', title: 'SSC CGL 2026 - Combined Graduate Level (Tier-I) Exam', questionsCount: 100, durationMinutes: 60, maxMarks: 200, requiredTier: 'None' }
          ]
        },
        {
          id: 'ssc_chsl',
          name: 'SSC CHSL Exams',
          tests: [
            { id: 'ssc_chsl_tier1', title: 'SSC CHSL 2026 - Combined Higher Secondary Level Test', questionsCount: 100, durationMinutes: 60, maxMarks: 200, requiredTier: 'Testbook Pass' }
          ]
        },
        {
          id: 'ssc_mts',
          name: 'SSC MTS Exams',
          tests: [
            { id: 'ssc_mts_mock', title: 'SSC MTS Full-Length Practice Test Paper', questionsCount: 90, durationMinutes: 90, maxMarks: 270, requiredTier: 'Testbook Pass' }
          ]
        }
      ]
    },
    {
      id: 'railways',
      name: 'Railways Exams',
      subCategories: [
        {
          id: 'rrb_ntpc',
          name: 'RRB NTPC Exams',
          tests: [
            { id: 'rrb_ntpc_stage1', title: 'RRB NTPC CBT-1 Stage 1 Practice Simulator', questionsCount: 100, durationMinutes: 90, maxMarks: 100, requiredTier: 'None' }
          ]
        },
        {
          id: 'rrb_group_d',
          name: 'RRB Group D Exams',
          tests: [
            { id: 'rrb_group_d', title: 'RRB Group D Full Length Mock Test', questionsCount: 100, durationMinutes: 90, maxMarks: 100, requiredTier: 'Testbook Pass' }
          ]
        }
      ]
    },
    {
      id: 'ugc_net',
      name: 'UGC NET Exams',
      subCategories: [
        {
          id: 'ugc_net_p1',
          name: 'UGC NET Paper 1',
          tests: [
            { id: 'ugc_net_paper1', title: 'UGC NET Paper-1 Teaching & Research Aptitude', questionsCount: 50, durationMinutes: 60, maxMarks: 100, requiredTier: 'Testbook Pass Pro' }
          ]
        },
        {
          id: 'ugc_net_cs',
          name: 'UGC NET Computer Science',
          tests: [
            { id: 'ugc_net_cs', title: 'UGC NET Computer Science & Applications Paper-II', questionsCount: 100, durationMinutes: 120, maxMarks: 200, requiredTier: 'Testbook Pass Pro' }
          ]
        }
      ]
    },
    {
      id: 'teaching',
      name: 'Teaching Exams',
      subCategories: [
        {
          id: 'ctet_p1',
          name: 'CTET Paper 1 Exams',
          tests: [
            { id: 'ctet_paper1', title: 'CTET 2026 Paper-I (Primary Class I-V) Mock Paper', questionsCount: 150, durationMinutes: 150, maxMarks: 150, requiredTier: 'None' }
          ]
        },
        {
          id: 'ctet_p2',
          name: 'CTET Paper 2 Exams',
          tests: [
            { id: 'ctet_paper2', title: 'CTET 2026 Paper-II (Mathematics & Science)', questionsCount: 150, durationMinutes: 150, maxMarks: 150, requiredTier: 'Testbook Pass' }
          ]
        }
      ]
    },
    {
      id: 'state_exams',
      name: 'All State Exams',
      subCategories: [
        {
          id: 'uppsc',
          name: 'UPPSC Exams',
          tests: [
            { id: 'up_psc_prelims', title: 'UPPSC Prelims General Studies (GS Paper 1)', questionsCount: 150, durationMinutes: 120, maxMarks: 200, requiredTier: 'Testbook Pass Pro' }
          ]
        },
        {
          id: 'bssc',
          name: 'BSSC Exams',
          tests: [
            { id: 'bihar_ssc', title: 'BSSC Inter-Level Full Practice Mock Paper', questionsCount: 150, durationMinutes: 135, maxMarks: 600, requiredTier: 'Testbook Pass' }
          ]
        }
      ]
    },
    {
      id: 'banking',
      name: 'Banking Exams',
      subCategories: [
        {
          id: 'sbi_po',
          name: 'SBI PO Exams',
          tests: [
            { id: 'sbi_po_prelims', title: 'SBI PO Preliminary Exam Full Length Mock Test', questionsCount: 100, durationMinutes: 60, maxMarks: 100, requiredTier: 'Testbook Pass Pro' }
          ]
        },
        {
          id: 'ibps_clerk',
          name: 'IBPS Clerk Exams',
          tests: [
            { id: 'ibps_clerk', title: 'IBPS Clerk Preliminary Practice Mock Paper', questionsCount: 100, durationMinutes: 60, maxMarks: 100, requiredTier: 'None' }
          ]
        }
      ]
    }
  ];

  for (const c of catalog) {
    const cat = await prisma.category.create({
      data: {
        id: c.id,
        name: c.name,
      },
    });

    for (const sub of c.subCategories) {
      await prisma.exam.create({
        data: {
          id: sub.id,
          categoryId: cat.id,
          name: sub.name,
        },
      });

      const series = await prisma.testSeries.create({
        data: {
          id: sub.id + '_series',
          examId: sub.id,
          title: sub.name + ' Series',
        },
      });

      for (const t of sub.tests) {
        await prisma.mockTest.create({
          data: {
            id: t.id,
            testSeriesId: series.id,
            title: t.title,
            durationMinutes: t.durationMinutes,
            questionsCount: t.questionsCount,
            maxMarks: t.maxMarks,
            requiredTierName: t.requiredTier,
          },
        });
      }
    }
  }

  // Seed Users
  const initialUsers = [
    {
      id: 'u_admin',
      candidateCode: 'ADMIN_001',
      fullName: 'Administrator',
      email: 'admin@mocktest.com',
      mobile: '9999999999',
      referralCode: 'TB-ADMIN-1111',
      referredBy: null,
      referralsCount: 0,
      role: 'ADMIN' as const,
      subscriptionTier: 'None',
      subscriptionPurchasedAt: null,
      subscriptionExpiresAt: null,
      passwordHash: 'password123',
      isBlocked: false,
    },
    {
      id: 'u1',
      candidateCode: 'CGL_9029',
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      mobile: '9988776655',
      referralCode: 'TB-RAHUL-1029',
      referredBy: null,
      referralsCount: 0,
      role: 'STUDENT' as const,
      subscriptionTier: 'Testbook Pass Pro',
      subscriptionPurchasedAt: '2026-03-15',
      subscriptionExpiresAt: '2027-03-15',
      passwordHash: 'password123',
      isBlocked: false,
    },
    {
      id: 'u2',
      candidateCode: 'CGL_4812',
      fullName: 'Priya Patel',
      email: 'priya.patel@example.com',
      mobile: '9876543210',
      referralCode: 'TB-PRIYA-4812',
      referredBy: null,
      referralsCount: 0,
      role: 'STUDENT' as const,
      subscriptionTier: 'Testbook Pass',
      subscriptionPurchasedAt: '2025-12-01',
      subscriptionExpiresAt: '2026-12-01',
      passwordHash: 'password123',
      isBlocked: false,
    },
    {
      id: 'u3',
      candidateCode: 'CGL_2291',
      fullName: 'Vikram Singh',
      email: 'vikram.singh@example.com',
      mobile: '9123456789',
      referralCode: 'TB-VIKRAM-2291',
      referredBy: null,
      referralsCount: 0,
      role: 'CONTENT_CREATOR' as const,
      subscriptionTier: 'None',
      subscriptionPurchasedAt: null,
      subscriptionExpiresAt: null,
      passwordHash: 'password123',
      isBlocked: false,
    },
    {
      id: 'u4',
      candidateCode: 'CGL_3034',
      fullName: 'Amit Verma',
      email: 'amit.verma@example.com',
      mobile: '9555666777',
      referralCode: 'TB-AMIT-3034',
      referredBy: null,
      referralsCount: 0,
      role: 'STUDENT' as const,
      subscriptionTier: 'None',
      subscriptionPurchasedAt: null,
      subscriptionExpiresAt: null,
      passwordHash: 'password123',
      isBlocked: false,
    }
  ];

  for (const user of initialUsers) {
    await prisma.user.create({
      data: {
        id: user.id,
        candidateCode: user.candidateCode,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        referralsCount: user.referralsCount,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        subscriptionPurchasedAt: user.subscriptionPurchasedAt,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        passwordHash: user.passwordHash,
        isBlocked: user.isBlocked,
      },
    });
  }

  // Seed User Test Sessions (Attempts)
  const initialSessions = [
    {
      id: 'ts1',
      userId: 'u1',
      mockTestId: 'ssc_cgl_tier1',
      status: 'COMPLETED' as const,
      finalScore: 162.5,
      accuracyPercentage: 81.25,
      timeSpentSeconds: 2520,
      violationsCount: 0,
      remainingSeconds: 0,
      startedAt: new Date('2026-06-20'),
    },
    {
      id: 'ts2',
      userId: 'u1',
      mockTestId: 'sbi_po_prelims',
      status: 'AUTO_SUBMITTED' as const,
      finalScore: 48.0,
      accuracyPercentage: 55.0,
      timeSpentSeconds: 3480,
      violationsCount: 3,
      remainingSeconds: 0,
      startedAt: new Date('2026-06-22'),
    },
    {
      id: 'ts3',
      userId: 'u2',
      mockTestId: 'ssc_cgl_tier1',
      status: 'COMPLETED' as const,
      finalScore: 138.0,
      accuracyPercentage: 72.5,
      timeSpentSeconds: 3000,
      violationsCount: 1,
      remainingSeconds: 0,
      startedAt: new Date('2026-06-24'),
    },
    {
      id: 'ts4',
      userId: 'u4',
      mockTestId: 'rrb_ntpc_stage1',
      status: 'COMPLETED' as const,
      finalScore: 28.0,
      accuracyPercentage: 80.0,
      timeSpentSeconds: 900,
      violationsCount: 0,
      remainingSeconds: 0,
      startedAt: new Date('2026-06-25'),
    }
  ];

  for (const session of initialSessions) {
    await prisma.userTestSession.create({
      data: {
        id: session.id,
        userId: session.userId,
        mockTestId: session.mockTestId,
        status: session.status,
        finalScore: session.finalScore,
        accuracyPercentage: session.accuracyPercentage,
        timeSpentSeconds: session.timeSpentSeconds,
        violationsCount: session.violationsCount,
        remainingSeconds: session.remainingSeconds,
        startedAt: session.startedAt,
      },
    });
  }

  console.log('Database seeding successfully finished!');
}

async function handleGetSupportMessages(data: any) {
  const { userId, markAsRead, readerRole } = data;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  if (markAsRead) {
    if (readerRole === 'ADMIN') {
      await prisma.supportMessage.updateMany({
        where: { userId, sender: 'STUDENT', isRead: false },
        data: { isRead: true }
      });
    } else if (readerRole === 'STUDENT') {
      await prisma.supportMessage.updateMany({
        where: { userId, sender: 'ADMIN', isRead: false },
        data: { isRead: true }
      });
    }
  }

  const messages = await prisma.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }
  });

  return NextResponse.json({
    success: true,
    messages: messages.map(msg => ({
      id: msg.id,
      userId: msg.userId,
      sender: msg.sender,
      message: msg.message,
      isRead: msg.isRead,
      createdAt: msg.createdAt.toISOString()
    }))
  });
}

async function handleSendSupportMessage(data: any) {
  const { userId, sender, message } = data;
  if (!userId || !sender || !message) {
    return NextResponse.json({ success: false, error: 'Required fields: userId, sender, message' }, { status: 400 });
  }

  const msg = await prisma.supportMessage.create({
    data: {
      userId,
      sender,
      message,
      isRead: false
    }
  });

  return NextResponse.json({
    success: true,
    message: {
      id: msg.id,
      userId: msg.userId,
      sender: msg.sender,
      message: msg.message,
      isRead: msg.isRead,
      createdAt: msg.createdAt.toISOString()
    }
  });
}

async function handleGetSupportUsers() {
  const users = await prisma.user.findMany({
    where: {
      supportMessages: {
        some: {}
      }
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      supportMessages: {
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      },
      _count: {
        select: {
          supportMessages: {
            where: {
              sender: 'STUDENT',
              isRead: false
            }
          }
        }
      }
    }
  });

  const sorted = users.map(u => ({
    id: u.id,
    name: u.fullName,
    email: u.email,
    lastMessage: u.supportMessages[0] ? {
      id: u.supportMessages[0].id,
      message: u.supportMessages[0].message,
      createdAt: u.supportMessages[0].createdAt.toISOString(),
      sender: u.supportMessages[0].sender,
      isRead: u.supportMessages[0].isRead
    } : null,
    unseenCount: u._count.supportMessages
  })).sort((a, b) => {
    const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return NextResponse.json({ success: true, users: sorted });
}

async function handleDeleteSupportConversation(data: any) {
  const { userId } = data;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  await prisma.supportMessage.deleteMany({
    where: { userId }
  });

  return NextResponse.json({ success: true });
}

async function handleEditSupportMessage(data: any) {
  const { messageId, newMessage } = data;
  if (!messageId || !newMessage) {
    return NextResponse.json({ success: false, error: 'messageId and newMessage are required' }, { status: 400 });
  }

  const msg = await prisma.supportMessage.update({
    where: { id: messageId },
    data: { message: newMessage }
  });

  return NextResponse.json({
    success: true,
    message: {
      id: msg.id,
      userId: msg.userId,
      sender: msg.sender,
      message: msg.message,
      isRead: msg.isRead,
      createdAt: msg.createdAt.toISOString()
    }
  });
}

async function handleDeleteReportedQuestion(data: any) {
  const { id } = data;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Log ID is required' }, { status: 400 });
  }

  await prisma.reportedQuestion.delete({
    where: { id }
  });

  return NextResponse.json({ success: true });
}
