import { Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import Redis from 'ioredis';
import winston from 'winston';

// Initialize core dependencies
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Configure Winston Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/assessment_engine.log' }),
  ],
});

// Interface definitions for payloads
interface StartSessionRequest {
  userId: string;
  mockTestId: string;
}

interface ResponseStatePayload {
  questionId: string;
  selectedOptionIndex: number | null;
  state: number; // 1 to 5 (TCS iON palette state)
  elapsedSeconds: number;
}

interface SubmitSessionRequest {
  sessionId: string;
  responses: ResponseStatePayload[];
}

/**
 * 1. INITIALIZE A TEST SESSION
 * Checks premium memberships (gating), maps structure in PostgreSQL, and caches rules in Redis.
 */
export async function startTestSession(req: Request, res: Response): Promise<void> {
  const { userId, mockTestId } = req.body as StartSessionRequest;

  if (!userId || !mockTestId) {
    res.status(400).json({ error: 'Missing userId or mockTestId in request body.' });
    return;
  }

  try {
    // 1. Fetch user and check role bypass or active subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: {
            isActive: true,
            expiresAt: { gte: new Date() },
          },
          orderBy: { expiresAt: 'desc' },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    // 2. Fetch mock test specifications
    const mockTest = await prisma.mockTest.findUnique({
      where: { id: mockTestId },
      include: {
        sections: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!mockTest) {
      res.status(404).json({ error: 'Mock test template not found.' });
      return;
    }

    // 3. Premium Gating Enforcement (Testbook Pass Level)
    if (mockTest.requiredTierId) {
      const hasAccess =
        user.role === UserRole.ADMIN ||
        user.role === UserRole.CONTENT_CREATOR ||
        user.subscriptions.some((sub) => sub.tierId === mockTest.requiredTierId);

      if (!hasAccess) {
        res.status(403).json({
          error: 'Premium Test Gated.',
          code: 'SUBSCRIPTION_REQUIRED',
          requiredTierId: mockTest.requiredTierId,
        });
        return;
      }
    }

    // 4. Initialize sitting session record in database
    const totalDurationSeconds = mockTest.durationMinutes * 60;
    const session = await prisma.userTestSession.create({
      data: {
        userId,
        mockTestId,
        remainingSeconds: totalDurationSeconds,
        status: 'ONGOING',
      },
    });

    logger.info('Initialized database session record', { sessionId: session.id, userId, mockTestId });

    // 5. Build cache structural matrix mapping for Redis storage
    const redisAnswersKey = `session:${session.id}:answers`;
    const redisRulesKey = `session:${session.id}:rules`;
    const redisMetaKey = `session:${session.id}:meta`;

    const answerMap: Record<string, string> = {};
    const rulesMap: Record<string, string> = {};

    mockTest.sections.forEach((section) => {
      // Store section scoring config: positiveMark, negativeMark
      rulesMap[section.id] = JSON.stringify({
        positiveMarks: section.positiveMarks,
        negativeMarks: section.negativeMarks,
      });

      // Map question IDs to their correct answers
      section.questions.forEach((q) => {
        answerMap[q.id] = q.correctIndex.toString();
      });
    });

    // Write structure matrix to Redis
    const pipeline = redis.pipeline();
    pipeline.hmset(redisAnswersKey, answerMap);
    pipeline.hmset(redisRulesKey, rulesMap);
    pipeline.hmset(redisMetaKey, {
      userId,
      mockTestId,
      startedAt: session.startedAt.toISOString(),
      durationSeconds: totalDurationSeconds.toString(),
    });
    // Set 24 hour TTL to prevent memory leaks from abandoned tests
    pipeline.expire(redisAnswersKey, 86400);
    pipeline.expire(redisRulesKey, 86400);
    pipeline.expire(redisMetaKey, 86400);
    await pipeline.exec();

    logger.info('Cached session structure in Redis', { sessionId: session.id });

    res.status(201).json({
      message: 'Test session initiated successfully.',
      sessionId: session.id,
      testTitle: mockTest.title,
      durationMinutes: mockTest.durationMinutes,
      sections: mockTest.sections.map((s) => ({
        id: s.id,
        name: s.name,
        orderIndex: s.orderIndex,
        positiveMarks: s.positiveMarks,
        negativeMarks: s.negativeMarks,
        questions: s.questions.map((q) => ({
          id: q.id,
          type: q.type,
          textEn: q.textEn,
          textHi: q.textHi,
          optionsEn: q.optionsEn,
          optionsHi: q.optionsHi,
          imageUrl: q.imageUrl,
          mathLatex: q.mathLatex,
          orderIndex: q.orderIndex,
        })),
      })),
    });
  } catch (error) {
    logger.error('Failed to initialize test session', { error, userId, mockTestId });
    res.status(500).json({ error: 'Internal system failure during session initialization.' });
  }
}

/**
 * 2. PROCESS SECURE TEST SUBMISSION
 * Extracts responses, evaluates score against Redis matrix, updates DB and flushes Redis.
 */
export async function submitTestSession(req: Request, res: Response): Promise<void> {
  const { sessionId, responses } = req.body as SubmitSessionRequest;

  if (!sessionId || !responses) {
    res.status(400).json({ error: 'Missing sessionId or responses payload.' });
    return;
  }

  try {
    // 1. Fetch active session state from PostgreSQL
    const session = await prisma.userTestSession.findUnique({
      where: { id: sessionId },
      include: {
        mockTest: {
          include: {
            sections: {
              include: { questions: true },
            },
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session record not found.' });
      return;
    }

    if (session.status !== 'ONGOING') {
      res.status(400).json({ error: 'Exam session has already been completed or submitted.' });
      return;
    }

    // 2. Fetch answer hashes and rules from Redis (fallback to DB if cache evicted)
    const redisAnswersKey = `session:${sessionId}:answers`;
    const redisRulesKey = `session:${sessionId}:rules`;

    let cachedAnswers = await redis.hgetall(redisAnswersKey);
    let cachedRules = await redis.hgetall(redisRulesKey);

    const hasCachedData = Object.keys(cachedAnswers).length > 0;

    // 3. Mathematical grading engine calculations
    let totalMarks = 0;
    let finalScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let totalSpentSeconds = 0;

    const responseWrites: any[] = [];

    // Loop through all questions in database structure for validation and grading
    for (const section of session.mockTest.sections) {
      const sectionRules = hasCachedData && cachedRules[section.id]
        ? JSON.parse(cachedRules[section.id])
        : { positiveMarks: section.positiveMarks, negativeMarks: section.negativeMarks };

      const positive = Number(sectionRules.positiveMarks);
      const negative = Number(sectionRules.negativeMarks);

      for (const question of section.questions) {
        totalMarks += positive;

        // Find candidate response in the submission payload
        const userResp = responses.find((r) => r.questionId === question.id);
        const selectedIndex = userResp?.selectedOptionIndex ?? null;
        const stateCode = userResp?.state ?? 1; // 1 = NOT_VISITED
        const elapsedSec = userResp?.elapsedSeconds ?? 0;
        totalSpentSeconds += elapsedSec;

        const isAnsweredState = stateCode === 3 || stateCode === 5; // 3: ANSWERED, 5: ANSWERED_AND_MARKED_FOR_REVIEW
        const hasChoice = selectedIndex !== null;

        // Verify correct index from cache if available, else database schema
        const correctIndex = hasCachedData && cachedAnswers[question.id] !== undefined
          ? parseInt(cachedAnswers[question.id], 10)
          : question.correctIndex;

        if (isAnsweredState && hasChoice) {
          const isCorrect = selectedIndex === correctIndex;
          if (isCorrect) {
            finalScore += positive;
            correctCount += 1;
          } else {
            finalScore -= negative;
            incorrectCount += 1;
          }
        } else {
          unattemptedCount += 1;
        }

        // Store responses array for database update
        responseWrites.push({
          sessionId,
          questionId: question.id,
          selectedOptionIndex: selectedIndex,
          state: stateCode,
          elapsedSeconds: elapsedSec,
        });
      }
    }

    const totalQuestions = correctCount + incorrectCount + unattemptedCount;
    const accuracy = correctCount + incorrectCount > 0
      ? (correctCount / (correctCount + incorrectCount)) * 100
      : 0;

    // 4. Persistence transactions in PostgreSQL
    await prisma.$transaction(async (tx) => {
      // Save all question-level sitting state responses
      for (const item of responseWrites) {
        await tx.questionResponseState.upsert({
          where: {
            sessionId_questionId: {
              sessionId: item.sessionId,
              questionId: item.questionId,
            },
          },
          update: {
            selectedOptionIndex: item.selectedOptionIndex,
            state: item.state,
            elapsedSeconds: item.elapsedSeconds,
          },
          create: {
            sessionId: item.sessionId,
            questionId: item.questionId,
            selectedOptionIndex: item.selectedOptionIndex,
            state: item.state,
            elapsedSeconds: item.elapsedSeconds,
          },
        });
      }

      // Update sitting session metadata
      await tx.userTestSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          remainingSeconds: 0,
          finalScore: parseFloat(finalScore.toFixed(2)),
          accuracyPercentage: parseFloat(accuracy.toFixed(2)),
          timeSpentSeconds: totalSpentSeconds,
        },
      });
    });

    logger.info('Persisted test submission transactions', { sessionId, finalScore, correctCount });

    // 5. Clean up active caches from Redis
    await redis.del(redisAnswersKey, redisRulesKey, `session:${sessionId}:meta`);
    logger.info('Cleaned Redis caches for session', { sessionId });

    res.status(200).json({
      message: 'Exam submitted successfully.',
      sessionId,
      results: {
        totalMarks,
        obtainedScore: parseFloat(finalScore.toFixed(2)),
        correctAnswersCount: correctCount,
        incorrectAnswersCount: incorrectCount,
        unattemptedCount,
        accuracyPercentage: parseFloat(accuracy.toFixed(2)),
        timeSpentSeconds: totalSpentSeconds,
      },
    });
  } catch (error) {
    logger.error('Failed to submit test session', { error, sessionId });
    res.status(500).json({ error: 'Internal system failure during exam submission.' });
  }
}
