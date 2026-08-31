import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { 
  isDisposableEmail, 
  isHoneypotTriggered, 
  checkRateLimit, 
  getClientIp, 
  verifyTurnstileToken 
} from '../../lib/botProtection';
import {
  getTypingCategories,
  saveTypingCategory,
  deleteTypingCategory,
  getTypingPassages,
  saveTypingPassage,
  deleteTypingPassage,
  getTypingTests,
  getTypingTestById,
  saveTypingTest,
  saveBulkTypingTests,
  deleteTypingTest,
  saveTypingAttempt,
  getUserTypingAttempts,
  evaluateTyping
} from '../../lib/typingStore';

// Persistent OTP Cache in global to survive Next.js dev server hot-reloads
const otpCache = (global as any).otpCache || new Map<string, { code: string; expiresAt: number }>();
if (process.env.NODE_ENV !== 'production') {
  (global as any).otpCache = otpCache;
}

// Persistent Login Attempts tracker to lock brute-force attempts
const loginAttempts = (global as any).loginAttempts || new Map<string, { count: number; lockedUntil: number }>();
if (process.env.NODE_ENV !== 'production') {
  (global as any).loginAttempts = loginAttempts;
}

// Persistent Exam Catalog and Notices Cache to survive Next.js dev server hot-reloads
// 5-minute TTL with instant invalidation on write actions
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
let schemaPatched = false;

const catalogCache: { examCatalog: any; noticesList: any; noticesLastFetched: number | null } = 
  (global as any).catalogCache && (global as any).catalogCache.noticesLastFetched !== undefined
    ? (global as any).catalogCache
    : { examCatalog: null, noticesList: null, noticesLastFetched: null };
if (process.env.NODE_ENV !== 'production') {
  (global as any).catalogCache = catalogCache;
}

// Nodemailer transporter config using environment variables (e.g. Gmail, Resend, Brevo)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.TIGRIS_ENDPOINT || "https://fly.storage.tigris.dev",
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY || "",
  },
});


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

// In-Memory Throttle Cache for User Presence (updates DB at most once per 2 minutes per user)
const lastSeenCache = new Map<string, number>();

async function touchUserLastSeen(userId?: string, platform?: string): Promise<void> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) return;
  const now = Date.now();
  const lastUpdated = lastSeenCache.get(userId) || 0;
  
  // 2-minute throttle — only write to DB if user was last seen more than 2 minutes ago
  if (now - lastUpdated > 2 * 60 * 1000) {
    lastSeenCache.set(userId, now); // Update cache immediately so concurrent calls don't double-write
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastSeen: new Date(),
          lastPlatform: platform || 'web'
        }
      });
    } catch (e) {
      // Silently ignore — don't fail the main request over a presence update
      lastSeenCache.delete(userId); // Allow retry on next request
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'No action provided' }, { status: 400 });
    }

    // Lazy / Action-Based Online Presence Tracking
    // Extract userId from any position in the request body
    const activeUserId = 
      data?.userId ||
      data?.id ||
      body?.userId ||
      body?.id ||
      null;
    const activePlatform = 
      data?.source ||
      data?.platform ||
      body?.source ||
      body?.platform ||
      'web';

    // Fire-and-forget: update lastSeen without blocking the response
    if (activeUserId && action !== 'ping') {
      touchUserLastSeen(activeUserId, activePlatform); // Intentionally NOT awaited
    }

    // Handle dedicated ping action first (lightest possible action)
    if (action === 'ping') {
      const pingUserId = data?.userId || body?.userId;
      const pingPlatform = data?.platform || body?.platform || 'web';
      if (pingUserId) {
        await touchUserLastSeen(pingUserId, pingPlatform); // Awaited so it's confirmed
      }
      return NextResponse.json({ success: true });
    }

    // =========================================================================
    // SECURITY HARDENING: Role & Session Validations
    // =========================================================================
    const adminActions = [
      'admin-data', 'get-attempts', 'get-suggestions', 
      'update-suggestion-status', 'delete-suggestion', 
      'delete-reported-question', 'get-support-users', 
      'delete-support-conversation', 'edit-support-message',
      'add-notice', 'delete-notice', 
      'add-category', 'create-category', 'edit-category', 'delete-category',
      'add-subcategory', 'edit-subcategory', 'delete-subcategory',
      'add-subsubcategory', 'edit-subsubcategory', 'delete-subsubcategory',
      'add-mocktest', 'edit-mocktest-title', 'delete-mocktest', 'save-section-rules',
      'save-custom-questions', 'bulk-import-questions', 'save-profile-admin', 'db-stats',
      'admin-get-locker-stats', 'admin-delete-locker-doc', 'admin-disconnect-user-locker',
      'create-typing-category', 'edit-typing-category', 'delete-typing-category',
      'create-typing-passage', 'edit-typing-passage', 'delete-typing-passage',
      'create-typing-test', 'create-bulk-typing-tests', 'edit-typing-test', 'delete-typing-test'
    ];

    const userOwnedActions = [
      'update-profile', 'update-password', 'toggle-bookmark', 
      'add-attempt', 'save-ongoing-session', 'clear-ongoing-session',
      'get-support-messages', 'send-support-message', 'get-user-details',
      'claim-pass-pro', 'update-tracked-jobs',
      'locker-get-docs', 'locker-save-meta', 'locker-delete-doc',
      'locker-update-drive-status', 'locker-disconnect-drive',
      'locker-set-pin', 'locker-verify-pin', 'locker-change-pin', 'locker-reset-pin-with-password',
      'locker-send-reset-otp', 'locker-verify-otp-and-reset-pin'
    ];

    // Helper: Parse cookie manually
    const getCookieValue = (cookieStr: string, name: string): string | null => {
      const match = cookieStr.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
      return match ? match[2] : null;
    };

    const cookieHeader = request.headers.get('cookie') || '';
    const webUserId = getCookieValue(cookieHeader, 'tb_user_id');

    let isRequesterAdmin = false;
    let requesterUserId: string | null = null;

    // 1. Resolve requester identity and check if admin
    if (request.headers.get('x-admin-key') === 'super_secret_admin_key_2026') {
      isRequesterAdmin = true;
    } else if (webUserId) {
      requesterUserId = webUserId;
      const webUser = await prisma.user.findUnique({
        where: { id: webUserId },
        select: { role: true }
      });
      if (webUser && webUser.role !== 'STUDENT') {
        isRequesterAdmin = true;
      }
    } else {
      const explicitUserId = request.headers.get('x-user-id') || data?.userId || body?.userId;
      if (explicitUserId) {
        const explicitUser = await prisma.user.findUnique({
          where: { id: explicitUserId },
          select: { id: true, role: true }
        });
        if (explicitUser) {
          requesterUserId = explicitUser.id;
          if (explicitUser.role !== 'STUDENT') {
            isRequesterAdmin = true;
          }
        }
      }
      if (!isRequesterAdmin) {
        const reqSessionId = data?.sessionId || body?.sessionId;
        if (reqSessionId) {
          const sessionUser = await prisma.user.findFirst({
            where: { currentSessionId: reqSessionId },
            select: { id: true, role: true }
          });
          if (sessionUser) {
            requesterUserId = sessionUser.id;
            if (sessionUser.role !== 'STUDENT') {
              isRequesterAdmin = true;
            }
          }
        }
      }
    }

    // 2. Validate Admin Actions
    if (adminActions.includes(action)) {
      if (!isRequesterAdmin) {
        console.warn(`Blocked unauthorized admin action: ${action} by user: ${requesterUserId}`);
        return NextResponse.json({ success: false, error: 'Forbidden: Admin role required' }, { status: 403 });
      }
    }

    // 3. Validate User-Owned Actions
    if (userOwnedActions.includes(action)) {
      const targetUserId = data?.userId || body?.userId;
      if (targetUserId) {
        const isSelf = requesterUserId === targetUserId || action === 'claim-pass-pro';
        if (!isSelf && !isRequesterAdmin) {
          console.warn(`Blocked unauthorized action: ${action} targeting: ${targetUserId} by user: ${requesterUserId}`);
          return NextResponse.json({ success: false, error: 'Forbidden: Unauthorized action' }, { status: 403 });
        }
      }
    }

    if (action) {
      const writeActions = [
        'add-notice', 'delete-notice',
        'add-category', 'create-category', 'edit-category', 'delete-category',
        'add-subcategory', 'edit-subcategory', 'delete-subcategory',
        'add-subsubcategory', 'edit-subsubcategory', 'delete-subsubcategory',
        'add-mocktest', 'edit-mocktest-title', 'delete-mocktest', 'save-section-rules',
        'save-custom-questions', 'bulk-import-questions',
        'reorder-categories', 'reorder-subcategories', 'reorder-subsubcategories', 'reorder-mocktests',
        'refresh-catalog'
      ];
      if (writeActions.includes(action)) {
        catalogCache.examCatalog = null;
        catalogCache.noticesList = null;
      }
    }

    switch (action) {
      case 'request-password-reset':
        return await handleRequestPasswordReset(data);
      case 'confirm-password-reset':
        return await handleConfirmPasswordReset(data);
      case 'bootstrap':
        return await handleBootstrap(request);
      case 'get-tests-by-series':
        return await handleGetTestsBySeries(data || body);
      case 'refresh-catalog':
        return await handleRefreshCatalog();
      case 'signup':
        return await handleSignup(data, request);
      case 'login':
        return await handleLogin(data, request);
      case 'google-auth':
        return await handleGoogleAuth(data, request);
      case 'update-profile':
        return await handleUpdateProfile(data);
      case 'update-tracked-jobs':
        return await handleUpdateTrackedJobs(data);
      case 'update-password':
        return await handleUpdatePassword(data);
      case 'claim-pass-pro':
        return await handleClaimPassPro(data, requesterUserId);
      case 'save-profile-admin':
        return await handleSaveProfileAdmin(data, requesterUserId, !!webUserId);
      case 'toggle-bookmark':
        return await handleToggleBookmark(data);
      case 'add-attempt':
        return await handleAddAttempt(data, request);
      case 'save-ongoing-session':
        return await handleSaveOngoingSession(data, request);
      case 'clear-ongoing-session':
        return await handleClearOngoingSession(data);
      case 'reset-attempt':
        return await handleResetAttempt(data);
      case 'add-notice':
        return await handleAddNotice(data);
      case 'edit-notice':
        return await handleEditNotice(data);
      case 'delete-notice':
        return await handleDeleteNotice(data);
      case 'get-single-notice-content':
        return await handleGetSingleNoticeContent(data);
      case 'add-category':
      case 'create-category':
        return await handleAddCategory(data || body?.category || body);
      case 'edit-category':
        return await handleEditCategory(data || body?.category || body);
      case 'delete-category':
        return await handleDeleteCategory(data || body);
      case 'add-subcategory':
        return await handleAddSubCategory(data);
      case 'edit-subcategory':
        return await handleEditSubCategory(data);
      case 'delete-subcategory':
        return await handleDeleteSubCategory(data);
      case 'add-subsubcategory':
        return await handleAddSubSubCategory(data);
      case 'edit-subsubcategory':
        return await handleEditSubSubCategory(data);
      case 'delete-subsubcategory':
        return await handleDeleteSubSubCategory(data);
      case 'add-mocktest':
        return await handleAddMockTest(data);
      case 'edit-mocktest-title':
        return await handleEditMockTestTitle(data);
      case 'delete-mocktest':
        return await handleDeleteMockTest(data);
      case 'save-section-rules':
        return await handleSaveSectionRules(data || body);
      case 'save-custom-questions':
      case 'bulk-import-questions':
        return await handleSaveCustomQuestions(data || body);
      case 'get-custom-questions':
        return await handleGetCustomQuestions(data || body);
      case 'reorder-categories':
        return await handleReorderCategories(data);
      case 'reorder-subcategories':
        return await handleReorderSubCategories(data);
      case 'reorder-subsubcategories':
        return await handleReorderSubSubCategories(data);
      case 'reorder-mocktests':
        return await handleReorderMockTests(data);
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
      case 'catalog-sync':
        return await handleCatalogSync(data);
      case 'get-referred-friends':
        return await handleGetReferredFriends(data);
      case 'reset-referrals':
        return await handleResetReferrals();
      case 'get-user-details':
        return await handleGetUserDetails(data);
      case 'admin-data':
        return await handleAdminData(data);
      case 'get-attempts':
        return await handleGetAttempts();
      case 'submit-suggestion':
        return await handleSubmitSuggestion(data);
      case 'get-suggestions':
        return await handleGetSuggestions();
      case 'update-suggestion-status':
        return await handleUpdateSuggestionStatus(data);
      case 'delete-suggestion':
        return await handleDeleteSuggestion(data);
      case 'save-practice-attempt':
        return await handleSavePracticeAttempt(data);
      case 'get-practice-attempts':
        return await handleGetPracticeAttempts(data);
      case 'locker-get-docs':
        return await handleLockerGetDocs(data, requesterUserId);
      case 'locker-save-meta':
        return await handleLockerSaveMeta(data, requesterUserId);
      case 'locker-delete-doc':
        return await handleLockerDeleteDoc(data, requesterUserId);
      case 'locker-update-drive-status':
        return await handleLockerUpdateDriveStatus(data, requesterUserId);
      case 'locker-disconnect-drive':
        return await handleLockerDisconnectDrive(data, requesterUserId);
      case 'locker-set-pin':
        return await handleLockerSetPin(data, requesterUserId);
      case 'locker-verify-pin':
        return await handleLockerVerifyPin(data, requesterUserId);
      case 'locker-change-pin':
        return await handleLockerChangePin(data, requesterUserId);
      case 'locker-reset-pin-with-password':
        return await handleLockerResetPinWithPassword(data, requesterUserId);
      case 'locker-send-reset-otp':
        return await handleLockerSendResetOtp(data, requesterUserId);
      case 'locker-verify-otp-and-reset-pin':
        return await handleLockerVerifyOtpAndResetPin(data, requesterUserId);
      case 'admin-get-locker-stats':
        return await handleAdminGetLockerStats();
      case 'admin-delete-locker-doc':
        return await handleAdminDeleteLockerDoc(data);
      case 'admin-disconnect-user-locker':
        return await handleAdminDisconnectUserLocker(data);
      case 'db-stats':
        return await handleDbStats();

      // ==========================================
      // Typing Test Module Handlers (async Prisma)
      // ==========================================
      case 'get-typing-categories':
        return NextResponse.json({ success: true, categories: await getTypingCategories() });
      case 'create-typing-category':
      case 'edit-typing-category':
        return NextResponse.json({ success: true, category: await saveTypingCategory(data || body?.category || body) });
      case 'delete-typing-category':
        return NextResponse.json({ success: true, deleted: await deleteTypingCategory(data?.id || body?.id) });

      case 'get-typing-passages':
        return NextResponse.json({ success: true, passages: await getTypingPassages() });
      case 'create-typing-passage':
      case 'edit-typing-passage':
        return NextResponse.json({ success: true, passage: await saveTypingPassage(data || body?.passage || body) });
      case 'delete-typing-passage':
        return NextResponse.json({ success: true, deleted: await deleteTypingPassage(data?.id || body?.id) });

      case 'get-typing-tests':
        return NextResponse.json({ success: true, tests: await getTypingTests(), categories: await getTypingCategories() });
      case 'get-typing-test-by-id':
        return NextResponse.json({ success: true, test: await getTypingTestById(data?.id || body?.id) });
      case 'create-typing-test':
      case 'edit-typing-test':
        return NextResponse.json({ success: true, test: await saveTypingTest(data || body?.test || body) });
      case 'create-bulk-typing-tests':
        return NextResponse.json({
          success: true,
          tests: await saveBulkTypingTests(data?.template || data, data?.count || body?.count || 1)
        });
      case 'delete-typing-test':
        return NextResponse.json({ success: true, deleted: await deleteTypingTest(data?.id || body?.id) });

      case 'save-typing-attempt':
        return NextResponse.json({ success: true, attempt: await saveTypingAttempt(data || body?.attempt || body) });
      case 'get-user-typing-attempts':
        return NextResponse.json({ success: true, attempts: await getUserTypingAttempts(data?.userId || body?.userId || requesterUserId || undefined, data?.testId || body?.testId || undefined) });
      case 'evaluate-typing':
        return NextResponse.json({
          success: true,
          evaluation: evaluateTyping(
            data?.targetText || body?.targetText || '',
            data?.typedText || body?.typedText || '',
            data?.timeSpentSeconds || body?.timeSpentSeconds || 60,
            data?.backspaceCount || body?.backspaceCount || 0,
            data?.qualifyingWpm || body?.qualifyingWpm || 35,
            data?.maxErrorPercentage || body?.maxErrorPercentage || 5.0,
            Boolean(data?.allowRetype || body?.allowRetype),
            Boolean(data?.isSsc || body?.isSsc)
          )
        });

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

// DB Stats — queries Postgres system tables to return per-table sizes and row counts
async function handleDbStats() {
  try {
    // Per-table sizes and estimated row counts — public schema only
    const tableStats = await prisma.$queryRaw<any[]>`
      SELECT
        relname                                    AS "tableName",
        n_live_tup                                 AS "rowCount",
        pg_size_pretty(pg_total_relation_size(relid)) AS "sizePretty",
        pg_total_relation_size(relid)              AS "sizeBytes"
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(relid) DESC
    `;

    // Total database size
    const dbSizeResult = await prisma.$queryRaw<any[]>`
      SELECT pg_database_size(current_database()) AS size_bytes
    `;
    const dbSizeBytes = Number(dbSizeResult[0]?.size_bytes ?? 0);
    const dbSizeMB    = dbSizeBytes / (1024 * 1024);

    // Active connection count
    const connResult = await prisma.$queryRaw<any[]>`
      SELECT count(*) AS cnt FROM pg_stat_activity WHERE state = 'active'
    `;
    const connectionCount = Number(connResult[0]?.cnt ?? 0);

    // PostgreSQL version
    const versionResult = await prisma.$queryRaw<any[]>`SELECT version() AS v`;
    const pgVersionRaw  = String(versionResult[0]?.v ?? '');
    const pgVersion     = pgVersionRaw.match(/PostgreSQL ([\d.]+)/)?.[1] ?? pgVersionRaw.split(' ')[0];

    // Total rows
    const totalRows = tableStats.reduce((sum: number, t: any) => sum + Number(t.rowCount ?? 0), 0);

    const stats = {
      dbSizeMB: Math.round(dbSizeMB * 10) / 10,
      totalRows,
      connectionCount,
      pgVersion,
      uptime: '',   // not reliably available on hosted Supabase
      lastRefreshed: new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata'
      }).format(new Date()),
      tables: tableStats.map((t: any) => ({
        tableName: String(t.tableName),
        rowCount:  Number(t.rowCount ?? 0),
        sizePretty: String(t.sizePretty ?? '0 bytes'),
        sizeBytes:  Number(t.sizeBytes ?? 0),
      })),
    };

    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleSavePracticeAttempt(data: any) {
  try {
    const { userId, categoryId, sectionIndex, correct, wrong, unattempted, attempted, total, accuracy, responses } = data || {};
    if (!categoryId) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    const uid = userId && userId !== 'guest' ? userId : null;

    // If we have a real userId, upsert into practice_sessions table
    if (uid && (prisma as any).practiceSession) {
      const record = await (prisma as any).practiceSession.upsert({
        where: {
          userId_categoryId_sectionIndex: {
            userId: uid,
            categoryId,
            sectionIndex: sectionIndex ?? 0
          }
        },
        update: {
          correct: correct ?? 0,
          wrong: wrong ?? 0,
          unattempted: unattempted ?? 0,
          attempted: attempted ?? 0,
          total: total ?? 25,
          accuracy: accuracy ?? 0,
          responses: responses ?? null,
          completedAt: new Date()
        },
        create: {
          userId: uid,
          categoryId,
          sectionIndex: sectionIndex ?? 0,
          correct: correct ?? 0,
          wrong: wrong ?? 0,
          unattempted: unattempted ?? 0,
          attempted: attempted ?? 0,
          total: total ?? 25,
          accuracy: accuracy ?? 0,
          responses: responses ?? null,
          completedAt: new Date()
        }
      });
      return NextResponse.json({ success: true, message: 'Saved to database', attempt: record });
    }

    // Guest users or fallback: just acknowledge — data persists in localStorage client-side
    return NextResponse.json({ success: true, message: 'Saved to client storage' });
  } catch (error: any) {
    console.error('handleSavePracticeAttempt error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleGetPracticeAttempts(data: any) {
  try {
    const userId = data?.userId;
    if (!userId || userId === 'guest' || !(prisma as any).practiceSession) {
      return NextResponse.json({ success: true, attempts: [] });
    }

    const records = await (prisma as any).practiceSession.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' }
    });

    return NextResponse.json({ success: true, attempts: records });
  } catch (error: any) {
    console.error('handleGetPracticeAttempts error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PERF: Paginated test loader — used by the frontend's lazy "expand series" click.
// Returns only the tests for one test series (or category), paginated.
// This allows the bootstrap to send just test counts, not full test objects.
async function handleGetTestsBySeries(data: {
  seriesId?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}) {
  const { seriesId, categoryId, page = 1, limit = 50 } = data || {};
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const skip = (safePage - 1) * safeLimit;

  try {
    let seriesIds: string[] | null = null;

    if (seriesId) {
      seriesIds = [seriesId];
    } else if (categoryId) {
      // Resolve category → exams → series ids
      const seriesList = await prisma.testSeries.findMany({
        where: { exam: { categoryId } },
        select: { id: true }
      });
      seriesIds = seriesList.map((s: any) => s.id);
    }

    if (!seriesIds || seriesIds.length === 0) {
      return NextResponse.json({
        success: true, tests: [],
        pagination: { page: safePage, limit: safeLimit, total: 0, hasMore: false, totalPages: 0 }
      });
    }

    const where = { testSeriesId: { in: seriesIds } };

    const [rawTests, total] = await Promise.all([
      // Use the same query as getCompiledExamCatalog but scoped + paginated
      prisma.$queryRaw<any[]>`
        SELECT
          "id", "testSeriesId", "title",
          COALESCE("titleHi", '') as "titleHi",
          "durationMinutes", "passingCutoff",
          "questionsCount", "maxMarks",
          "requiredTierName", "hasSectionalTiming",
          "sectionalTimings",
          COALESCE("lockSectionOnSubmit", false) as "lockSectionOnSubmit",
          "orderIndex", "positiveMarks", "negativeMarks",
          "testbookTotalUsers", "testbookTopperScore",
          "testbookAverageScore", "testbookCutoffScore",
          CASE
            WHEN "customQuestions" IS NULL THEN 0
            WHEN json_typeof("customQuestions"::json) = 'array' THEN json_array_length("customQuestions"::json)
            WHEN json_typeof("customQuestions"::json) = 'object' AND ("customQuestions"::json)->>'url' IS NOT NULL THEN "questionsCount"
            ELSE 0
          END as "customQuestionsCount"
        FROM "mock_tests"
        WHERE "testSeriesId" = ANY(${seriesIds})
        ORDER BY "orderIndex" ASC
        LIMIT ${safeLimit} OFFSET ${skip}
      `,
      prisma.mockTest.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      tests: rawTests.map((t: any) => ({
        id: t.id,
        title: t.title,
        titleHi: t.titleHi || undefined,
        questionsCount: t.questionsCount,
        durationMinutes: t.durationMinutes,
        maxMarks: t.maxMarks,
        isPremium: t.requiredTierName !== 'None',
        requiredTier: t.requiredTierName || 'None',
        hasSectionalTiming: t.hasSectionalTiming,
        sectionalTimings: t.sectionalTimings,
        lockSectionOnSubmit: t.lockSectionOnSubmit,
        positiveMarks: t.positiveMarks,
        negativeMarks: t.negativeMarks,
        testbookTotalUsers: t.testbookTotalUsers,
        testbookTopperScore: t.testbookTopperScore,
        testbookAverageScore: t.testbookAverageScore,
        testbookCutoffScore: t.testbookCutoffScore,
        customQuestionsCount: Number(t.customQuestionsCount),
        testSeriesId: t.testSeriesId,
        orderIndex: t.orderIndex,
      })),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        hasMore: skip + safeLimit < total,
        totalPages: Math.ceil(total / safeLimit)
      }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' }
    });
  } catch (err: any) {
    console.error('get-tests-by-series error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}


async function handleBootstrap(req?: Request) {
  // Check if categories are empty, if so, run seed
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    await seedDatabase();

    // Ensure mock users with correct administrative roles exist (only during database seeding!)
    await prisma.user.upsert({
      where: { email: 'vikram.singh@example.com' },
      update: { role: 'TEST_CREATOR' },
      create: {
        id: 'u3',
        candidateCode: 'CGL_2291',
        fullName: 'Vikram Singh',
        email: 'vikram.singh@example.com',
        mobile: '9123456789',
        referralCode: 'TB-VIKRAM-2291',
        role: 'TEST_CREATOR',
        passwordHash: 'password123',
      }
    });

    await prisma.user.upsert({
      where: { email: 'support@example.com' },
      update: { role: 'SUPPORT_TEAM' },
      create: {
        id: 'u_support',
        candidateCode: 'SUP_7712',
        fullName: 'Support Agent',
        email: 'support@example.com',
        mobile: '9888777666',
        referralCode: 'TB-SUPPORT-7712',
        role: 'SUPPORT_TEAM',
        passwordHash: 'password123',
      }
    });

    await prisma.user.upsert({
      where: { email: 'notices@example.com' },
      update: { role: 'NOTICES_MANAGER' },
      create: {
        id: 'u_notices',
        candidateCode: 'NTS_5541',
        fullName: 'Notices Manager',
        email: 'notices@example.com',
        mobile: '9999000011',
        referralCode: 'TB-NOTICES-5541',
        role: 'NOTICES_MANAGER',
        passwordHash: 'password123',
      }
    });
  }

  // PERF: Use memory cache if populated and fresh (30 min TTL — catalog changes only via admin)
  // Generate a deterministic ETag from the cache timestamp so clients can skip re-fetching.
  const isNoticesCacheFresh = catalogCache.noticesLastFetched && (Date.now() - catalogCache.noticesLastFetched < 30 * 60 * 1000);
  if (catalogCache.examCatalog && catalogCache.examCatalog.length > 0 && catalogCache.noticesList && isNoticesCacheFresh) {
    const etag = `"cat-${catalogCache.noticesLastFetched}"`;
    // PERF: If client sends matching ETag, return 304 — zero egress for catalog data
    const clientETag = req?.headers?.get('If-None-Match');
    if (clientETag && clientETag === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { 'ETag': etag, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=1800' }
      });
    }
    return NextResponse.json(
      { success: true, usersList: [], noticesList: catalogCache.noticesList, examCatalog: catalogCache.examCatalog, reportedQuestionsList: [] },
      { headers: { 'ETag': etag, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=1800' } }
    );
  }

  // Fetch all users list is now disabled in public bootstrap to reduce egress and fix security vulnerability.
  // Admins will fetch this data separately using the 'admin-data' action.
  const usersList: any[] = [];

  // EGRESS-OPT: Fetch Notices in two passes:
  //   Pass 1 — ALL announcements (no limit). Announcements are permanent home-page banner items
  //             created months ago; they must ALWAYS be returned regardless of the 100-item cap.
  //             Without this, newer daily notices push announcements past position 100, making
  //             the HomeHeroBannerCarousel show nothing (falls back to fallback slides).
  //   Pass 2 — 100 most recent NON-announcement notices (exam dates, results, admit cards).
  //             These are high-volume and time-sensitive; older ones are rarely accessed.
  // Both lists are merged and de-duplicated by id before being returned.
  const [announcementNotices, regularNotices] = await Promise.all([
    // Pass 1: always fetch ALL announcements (they are permanent banners, not time-bounded)
    prisma.notice.findMany({
      where: { category: 'announcement' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, titleHi: true, date: true, publishDate: true,
        type: true, category: true, url: true, rawUrl: true, lastDate: true, imageUrl: true,
      },
    }),
    // Pass 2: cap regular notices at 100 most recent
    prisma.notice.findMany({
      where: { category: { not: 'announcement' } },
      orderBy: { createdAt: 'desc' },
      take: 100, // EGRESS-OPT: 100 most recent non-announcement notices
      select: {
        id: true, title: true, titleHi: true, date: true, publishDate: true,
        type: true, category: true, url: true, rawUrl: true, lastDate: true, imageUrl: true,
      },
    }),
  ]);

  // Merge: announcements first, then regular notices (de-dup by id just in case)
  const seenIds = new Set<string>();
  const mergedNotices = [...announcementNotices, ...regularNotices].filter((n: any) => {
    if (seenIds.has(n.id)) return false;
    seenIds.add(n.id);
    return true;
  });

  const noticesList = mergedNotices.map((n: any) => ({
    id: n.id,
    title: n.title,
    titleHi: n.titleHi || undefined,
    date: n.date,
    publishDate: n.publishDate,
    type: n.type,
    category: n.category as 'notice' | 'result' | 'admit_card' | 'announcement' | 'testimonial' | 'answer_key',
    url: n.url || undefined,
    rawUrl: n.rawUrl || undefined,
    lastDate: n.lastDate || undefined,
    imageUrl: n.imageUrl || undefined,
    // Note: contentHtml is intentionally excluded from bootstrap to reduce Supabase Egress by 99%.
    // Full notice HTML is loaded on demand when the user opens a notice detail page.
  }));

  // Fetch Exam Catalog using optimized memory assembler
  const examCatalog = await getCompiledExamCatalog();

  // Populate cache
  catalogCache.examCatalog = examCatalog;
  catalogCache.noticesList = noticesList;
  catalogCache.noticesLastFetched = Date.now();

  // Fetch Reported Questions is now disabled in public bootstrap.
  // Admins will fetch this data separately using the 'admin-data' action.
  const reportedQuestionsList: any[] = [];

  // PERF: Generate ETag from cache timestamp for conditional GET support.
  // Clients that send a matching If-None-Match receive 304 (zero body = zero egress).
  const freshETag = `"cat-${catalogCache.noticesLastFetched ?? Date.now()}"`;

  return NextResponse.json(
    { success: true, usersList, noticesList, examCatalog, reportedQuestionsList },
    { headers: {
        'ETag': freshETag,
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=1800'
    }}
  );
}

// -----------------------------------------------------------------------------
// Catalog Sync — returns only items added/updated since lastSyncedAt
// Mobile app calls this on every launch to get only the delta (new/updated)
// -----------------------------------------------------------------------------
async function handleCatalogSync(data: { lastSyncedAt?: string }) {
  const syncedAt = new Date().toISOString();
  const since = data?.lastSyncedAt ? new Date(data.lastSyncedAt) : null;

  // If no previous sync timestamp, return full catalog (first-time sync)
  if (!since) {
    const examCatalog = await getCompiledExamCatalog();
    const notices = await prisma.notice.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        titleHi: true,
        date: true,
        publishDate: true,
        type: true,
        category: true,
        url: true,
        rawUrl: true,
        lastDate: true,
        imageUrl: true,
      },
    });

    const noticesList = notices.map((n: any) => ({
      id: n.id,
      title: n.title,
      titleHi: n.titleHi || undefined,
      date: n.date,
      publishDate: n.publishDate,
      type: n.type,
      category: n.category,
      url: n.url || undefined,
      rawUrl: n.rawUrl || undefined,
      lastDate: n.lastDate || undefined,
      imageUrl: n.imageUrl || undefined,
    }));

    return NextResponse.json({
      success: true,
      isFullSync: true,
      hasNewData: true,
      examCatalog,
      noticesList,
      deletedTestIds: [],
      syncedAt,
    });
  }

  // Delta sync — fetch items changed since lastSyncedAt
  const [updatedCategories, updatedExams, updatedSeries, updatedTests, allNotices] = await Promise.all([
    prisma.category.findMany({
      // Always return all categories so logoUrl/name changes propagate to mobile on every sync
      orderBy: { orderIndex: 'asc' },
    }),
    prisma.exam.findMany({
      where: { updatedAt: { gt: since } },
      orderBy: { orderIndex: 'asc' },
    }),
    prisma.testSeries.findMany({
      where: { updatedAt: { gt: since } },
      orderBy: { orderIndex: 'asc' },
    }),
    prisma.mockTest.findMany({
      where: { updatedAt: { gt: since } },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        title: true,
        questionsCount: true,
        durationMinutes: true,
        maxMarks: true,
        requiredTierName: true,
        hasSectionalTiming: true,
        sectionalTimings: true,
        orderIndex: true,
        testSeriesId: true,
        updatedAt: true,
        testbookTotalUsers: true,
        testbookTopperScore: true,
        testbookAverageScore: true,
        testbookCutoffScore: true,
        positiveMarks: true,
        negativeMarks: true,
        // NOTE: customQuestions is intentionally excluded — fetched per-test separately
      },
    }),
    // EGRESS-OPT: Filter notices by createdAt > since for delta syncs — only transfer new/updated entries.
    // For first-time syncs (since=null), cap at 100 most recent. This was previously an unbounded query
    // returning ALL notices on every delta poll, costing ~30-100KB per user every 5 minutes.
    prisma.notice.findMany({
      where: since ? { createdAt: { gt: since } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100, // EGRESS-OPT: cap at 100 even for full syncs
      select: {
        id: true,
        title: true,
        titleHi: true,
        date: true,
        publishDate: true,
        type: true,
        category: true,
        url: true,
        rawUrl: true,
        lastDate: true,
        imageUrl: true,
      },
    }),
  ]);

  const hasNewData =
    updatedExams.length > 0 ||
    updatedSeries.length > 0 ||
    updatedTests.length > 0 ||
    allNotices.length > 0;

  // Map updated tests to mobile-friendly format
  const mappedNewTests = updatedTests.map((t: any) => ({
    id: t.id,
    title: t.title,
    questionsCount: t.questionsCount,
    durationMinutes: t.durationMinutes,
    maxMarks: t.maxMarks,
    isPremium: t.requiredTierName !== 'None',
    requiredTier: t.requiredTierName,
    hasSectionalTiming: t.hasSectionalTiming ?? false,
    sectionalTimings: t.sectionalTimings ?? null,
    orderIndex: t.orderIndex,
    testSeriesId: t.testSeriesId,
    updatedAt: t.updatedAt.toISOString(),
    testbookTotalUsers: t.testbookTotalUsers ?? 0,
    testbookTopperScore: t.testbookTopperScore ?? 0.0,
    testbookAverageScore: t.testbookAverageScore ?? 0.0,
    testbookCutoffScore: t.testbookCutoffScore ?? 0.0,
    positiveMarks: t.positiveMarks ?? 2.0,
    negativeMarks: t.negativeMarks ?? 0.5,
  }));

  const noticesList = allNotices.map((n: any) => ({
    id: n.id,
    title: n.title,
    titleHi: n.titleHi || undefined,
    date: n.date,
    publishDate: n.publishDate,
    type: n.type,
    category: n.category,
    url: n.url || undefined,
    rawUrl: n.rawUrl || undefined,
    lastDate: n.lastDate || undefined,
    imageUrl: n.imageUrl || undefined,
  }));

  // For invalidating question caches: if a test was updated, its questions may have changed
  // Return the list of updated test IDs so mobile can clear their question cache
  const updatedTestIds = updatedTests.map((t: any) => t.id);

  // Always push full categories list so any admin change to logo/name/order syncs immediately
  const alwaysHasNewData = true;

  return NextResponse.json({
    success: true,
    isFullSync: false,
    hasNewData: alwaysHasNewData,
    newCategories: updatedCategories.map((c: any) => ({
      id: c.id,
      name: c.name,
      nameHi: c.nameHi || '',
      logoUrl: c.logoUrl !== undefined ? (c.logoUrl || null) : null,
      orderIndex: c.orderIndex ?? 0,
      isPracticeSeries: c.isPracticeSeries ?? false,
      isPopular: c.isPopular ?? false,
      description: c.description ?? '',
      countText: c.countText ?? '',
    })),
    newExams: updatedExams.map((e: any) => ({ id: e.id, name: e.name, categoryId: e.categoryId, orderIndex: e.orderIndex })),
    newSeries: updatedSeries.map((s: any) => ({ id: s.id, title: s.title, examId: s.examId, orderIndex: s.orderIndex })),
    newTests: mappedNewTests,
    newNotices: noticesList,
    noticesList,
    updatedTestIds,   // Mobile should invalidate question cache for these testIds
    deletedTestIds: [], // Future: track soft-deleted tests
    syncedAt,
  });
}

async function handleSignup(data: any, request?: Request) {
  const { name, email, mobile, password, referralCodeInput, turnstileToken } = data;

  // 1. Honeypot check: Automated bots fill hidden input fields
  if (isHoneypotTriggered(data)) {
    console.warn('[BOT_PROTECTION] Honeypot triggered during signup attempt. Silently rejecting bot.');
    return NextResponse.json({ success: false, error: 'Registration could not be completed.' }, { status: 400 });
  }

  // 2. IP Rate Limiting: Restrict registration attempts per IP (max 5 signups per 30 minutes)
  const clientIp = request ? getClientIp(request) : '127.0.0.1';
  const signupRate = checkRateLimit(`signup_ip:${clientIp}`, 5, 30 * 60 * 1000);
  if (!signupRate.allowed) {
    console.warn(`[BOT_PROTECTION] Rate limit exceeded for signup from IP: ${clientIp}`);
    return NextResponse.json({ 
      success: false, 
      error: `Too many registration attempts from this network. Please try again in ${signupRate.resetTimeMinutes} minutes.` 
    }, { status: 429 });
  }

  // 3. Email & Phone validation
  if (!email || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ success: false, error: 'Please provide a valid email address.' }, { status: 400 });
  }
  if (!mobile || !mobile.trim() || !/^\d{10}$/.test(mobile.trim())) {
    return NextResponse.json({ success: false, error: 'Please provide a valid 10-digit mobile number.' }, { status: 400 });
  }

  const trimmedEmail = email.trim().toLowerCase();

  // 4. Block Disposable / Burner / Temp Emails (e.g. tempmail, 10minutemail, mailinator, etc.)
  if (isDisposableEmail(trimmedEmail)) {
    console.warn(`[BOT_PROTECTION] Blocked disposable email signup attempt: ${trimmedEmail}`);
    return NextResponse.json({ 
      success: false, 
      error: 'Temporary and disposable email addresses are not allowed. Please use a valid email address (e.g. Gmail, Yahoo, Outlook).' 
    }, { status: 400 });
  }

  // 5. Cloudflare Turnstile Verification (if provided on web)
  if (turnstileToken !== undefined && turnstileToken !== null && typeof turnstileToken === 'string') {
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
    if (!turnstileResult.success) {
      console.warn(`[BOT_PROTECTION] Cloudflare Turnstile verification failed for IP: ${clientIp}`);
      return NextResponse.json({ 
        success: false, 
        error: turnstileResult.error || 'Security verification failed. Please complete the captcha check.' 
      }, { status: 400 });
    }
  }

  // Check duplication
  const existing = await prisma.user.findUnique({
    where: { email: trimmedEmail },
  });
  if (existing) {
    return NextResponse.json({ success: false, error: 'User account already exists with this email.' }, { status: 400 });
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randStr = '';
  for (let i = 0; i < 4; i++) {
    randStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const referralCode = `MT-${randStr}`;

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

  const newSessionId = crypto.randomUUID();
  const newUser = await prisma.user.create({
    data: {
      candidateCode: 'HUB-' + Math.floor(1000 + Math.random() * 9000),
      fullName: name.trim(),
      email: trimmedEmail,
      mobile: mobile.trim(),
      passwordHash: password || 'password123',
      referralCode,
      referredBy: referredByCode,
      referralsCount: 0,
      role: 'STUDENT',
      subscriptionTier: 'None',
      subscriptionPurchasedAt: null,
      subscriptionExpiresAt: null,
      isBlocked: false,
      currentSessionId: newSessionId,
    },
  });

  return NextResponse.json({
    success: true,
    user: {
      id: newUser.id,
      currentSessionId: newSessionId,
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
async function handleLogin(data: any, request?: Request) {
  const { email, password } = data;
  const trimmedEmail = email.trim().toLowerCase();

  // IP-level rate limiting on login: max 15 attempts per 10 minutes per IP
  const clientIp = request ? getClientIp(request) : '127.0.0.1';
  const loginIpRate = checkRateLimit(`login_ip:${clientIp}`, 15, 10 * 60 * 1000);
  if (!loginIpRate.allowed) {
    return NextResponse.json({
      success: false,
      error: `Too many login attempts from this network. Please try again in ${loginIpRate.resetTimeMinutes} minutes.`
    }, { status: 429 });
  }

  const now = Date.now();
  const attempt = loginAttempts.get(trimmedEmail);
  if (attempt && attempt.lockedUntil > now) {
    const minsLeft = Math.ceil((attempt.lockedUntil - now) / 60000);
    return NextResponse.json({
      success: false,
      error: `Too many failed login attempts. Account locked. Please try again in ${minsLeft} minutes.`
    }, { status: 429 });
  }

  // EGRESS-OPT: Fetch user WITHOUT question responses on login.
  // Responses (per-question answer state) can be thousands of rows per user.
  // They are loaded on-demand only when the user opens a specific test analysis.
  // This reduces login egress by 80-95% for active users.
  const user = await prisma.user.findUnique({
    where: { email: trimmedEmail },
    include: {
      testSessions: {
        // EGRESS-OPT: Only fetch most recent 30 sessions (not all history)
        take: 30,
        include: {
          mockTest: {
            select: {
              title: true,
              maxMarks: true,
              durationMinutes: true,
              positiveMarks: true,
              negativeMarks: true,
            }
          },
          // EGRESS-OPT: responses: true REMOVED — no longer fetched at login.
          // Full responses are loaded lazily via get-session-responses when opening analysis.
        },
        orderBy: { startedAt: 'desc' },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: 'User account not found with this email.' }, { status: 404 });
  }

  if (user.isBlocked) {
    return NextResponse.json({ success: false, error: 'This user account is blocked by the administrator.' }, { status: 403 });
  }

  if (!password || user.passwordHash !== password) {
    const currentAttempt = attempt || { count: 0, lockedUntil: 0 };
    currentAttempt.count += 1;
    if (currentAttempt.count >= 5) {
      currentAttempt.lockedUntil = now + 15 * 60 * 1000; // 15-minute lock
      loginAttempts.set(trimmedEmail, currentAttempt);
      return NextResponse.json({
        success: false,
        error: 'Too many failed login attempts. This account has been locked for 15 minutes.'
      }, { status: 429 });
    } else {
      loginAttempts.set(trimmedEmail, currentAttempt);
      const remaining = 5 - currentAttempt.count;
      return NextResponse.json({
        success: false,
        error: `Invalid password. ${remaining} attempts remaining before account lock.`
      }, { status: 401 });
    }
  }

  // Clear attempts tracker on success
  loginAttempts.delete(trimmedEmail);

  // If the client already has a valid session ID for this user (e.g., app restart / background re-auth),
  // reuse the existing session to avoid invalidating it unnecessarily.
  // Only generate a new session ID when it's a genuine new-device login (no existing session, or session mismatch).
  const { existingSessionId } = data;
  let sessionIdToUse: string;
  if (existingSessionId && user.currentSessionId && existingSessionId === user.currentSessionId) {
    // Same device re-authenticating — keep the existing session, don't generate a new one
    sessionIdToUse = existingSessionId;
  } else {
    // Genuinely new login (new device, or first ever login) — generate a fresh session
    sessionIdToUse = crypto.randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { currentSessionId: sessionIdToUse }
    });
  }

  const mappedUser = {
    id: user.id,
    currentSessionId: sessionIdToUse,
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
    trackedJobs: user.trackedJobs ? (user.trackedJobs as any) : [],
    lockerPin: user.lockerPin,
    lockerPinSetAt: user.lockerPinSetAt ? user.lockerPinSetAt.toISOString() : null,
    isLockerConnected: !!user.isLockerConnected,
    googleDriveEmail: user.googleDriveEmail,
    googleDriveFolderId: user.googleDriveFolderId,
    // EGRESS-OPT: sessions mapped WITHOUT responses object (responses = {} always empty at login)
    testSessions: user.testSessions.map((session: any) => {
      return {
        id: session.id,
        testId: session.mockTestId,
        title: session.mockTest?.title || 'Mock Test',
        score: session.finalScore ?? 0,
        maxScore: session.mockTest?.maxMarks ?? 200,
        accuracy: session.accuracyPercentage ?? 0,
        durationMinutes: session.mockTest?.durationMinutes || 60,
        durationSeconds: session.timeSpentSeconds,
        status: session.status,
        violations: session.violationsCount,
        date: session.startedAt.toISOString().split('T')[0],
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt ? session.completedAt.toISOString() : null,
        createdAt: session.createdAt ? session.createdAt.toISOString() : session.startedAt.toISOString(),
        updatedAt: (session.completedAt || session.startedAt || session.createdAt).toISOString(),
        responses: {}, // Loaded on-demand via get-session-responses when opening analysis
        timeRemaining: session.remainingSeconds,
        currentSectionIndex: session.currentSectionIndex,
        currentQuestionIndex: session.currentQuestionIndex,
        testbookRank: session.testbookRank ?? null,
        testbookPercentile: session.testbookPercentile ?? null,
        positiveMarks: session.mockTest?.positiveMarks ?? null,
        negativeMarks: session.mockTest?.negativeMarks ?? null,
      };
    }),
  };

  return NextResponse.json({ success: true, user: mappedUser });
}

async function handleGoogleAuth(data: any, request?: Request) {
  const { email, name, profilePhoto } = data;

  if (!email || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ success: false, error: 'Valid Google email is required.' }, { status: 400 });
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email: trimmedEmail },
    include: {
      testSessions: {
        include: {
          mockTest: {
            select: {
              title: true,
              maxMarks: true,
              durationMinutes: true,
              positiveMarks: true,
              negativeMarks: true,
            }
          },
          responses: true,
        },
        orderBy: { startedAt: 'desc' },
      },
    },
  });

  if (user) {
    if (user.isBlocked) {
      return NextResponse.json({ success: false, error: 'This user account is blocked by the administrator.' }, { status: 403 });
    }

    const newSessionId = crypto.randomUUID();
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        currentSessionId: newSessionId,
        ...(profilePhoto && !user.profilePhoto ? { profilePhoto } : {}),
      },
      include: {
        testSessions: {
          include: {
            mockTest: {
              select: {
                title: true,
                maxMarks: true,
                durationMinutes: true,
                positiveMarks: true,
                negativeMarks: true,
              }
            },
            responses: true,
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    const mappedUser = {
      id: user.id,
      currentSessionId: user.currentSessionId,
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
      profilePhoto: user.profilePhoto,
      bookmarkedQuestions: user.bookmarkedQuestions ? (user.bookmarkedQuestions as any) : [],
      trackedJobs: user.trackedJobs ? (user.trackedJobs as any) : [],
      lockerPin: user.lockerPin,
      lockerPinSetAt: user.lockerPinSetAt ? user.lockerPinSetAt.toISOString() : null,
      isLockerConnected: !!user.isLockerConnected,
      googleDriveEmail: user.googleDriveEmail,
      googleDriveFolderId: user.googleDriveFolderId,
      testSessions: (user.testSessions || []).map((session: any) => {
        const responsesRecord: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number; state?: number }> = {};
        (session.responses || []).forEach((r: any) => {
          responsesRecord[r.questionId] = {
            selectedOptionIndex: r.selectedOptionIndex,
            elapsedSeconds: r.elapsedSeconds,
            state: r.state,
          };
        });
        return {
          id: session.id,
          testId: session.mockTestId,
          title: session.mockTest?.title || 'Mock Test',
          score: session.finalScore ?? 0,
          maxScore: session.mockTest?.maxMarks ?? 200,
          accuracy: session.accuracyPercentage ?? 0,
          durationMinutes: session.mockTest?.durationMinutes || 60,
          durationSeconds: session.timeSpentSeconds,
          status: session.status,
          violations: session.violationsCount,
          date: session.startedAt.toISOString().split('T')[0],
          startedAt: session.startedAt.toISOString(),
          completedAt: session.completedAt ? session.completedAt.toISOString() : null,
          createdAt: session.createdAt ? session.createdAt.toISOString() : session.startedAt.toISOString(),
          updatedAt: (session.completedAt || session.startedAt || session.createdAt).toISOString(),
          responses: responsesRecord,
          timeRemaining: session.remainingSeconds,
          currentSectionIndex: session.currentSectionIndex,
          currentQuestionIndex: session.currentQuestionIndex,
          testbookRank: session.testbookRank ?? null,
          testbookPercentile: session.testbookPercentile ?? null,
          positiveMarks: session.mockTest?.positiveMarks ?? null,
          negativeMarks: session.mockTest?.negativeMarks ?? null,
        };
      }),
    };

    return NextResponse.json({ success: true, user: mappedUser });
  }

  // If user doesn't exist, create a new user account with Google
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randStr = '';
  for (let i = 0; i < 4; i++) {
    randStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const referralCode = `MT-${randStr}`;
  const newSessionId = crypto.randomUUID();

  const newUser = await prisma.user.create({
    data: {
      candidateCode: 'HUB-' + Math.floor(1000 + Math.random() * 9000),
      fullName: name?.trim() || 'Student',
      email: trimmedEmail,
      mobile: '',
      passwordHash: 'google_oauth_' + crypto.randomUUID(),
      referralCode,
      referredBy: null,
      referralsCount: 0,
      role: 'STUDENT',
      subscriptionTier: 'None',
      subscriptionPurchasedAt: null,
      subscriptionExpiresAt: null,
      isBlocked: false,
      currentSessionId: newSessionId,
      profilePhoto: profilePhoto || null,
    },
  });

  return NextResponse.json({
    success: true,
    user: {
      id: newUser.id,
      currentSessionId: newSessionId,
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
      profilePhoto: newUser.profilePhoto,
      testSessions: [],
      bookmarkedQuestions: [],
      trackedJobs: [],
    },
  });
}

async function handleGetReferredFriends(data: any) {
  const { referralCode } = data;
  if (!referralCode) {
    return NextResponse.json({ success: false, error: 'Referral code is required' }, { status: 400 });
  }

  const friends = await prisma.user.findMany({
    where: {
      referredBy: {
        equals: referralCode.trim(),
        mode: 'insensitive'
      }
    },
    include: {
      testSessions: {
        select: {
          id: true,
          status: true,
          timeSpentSeconds: true,
          mockTest: {
            select: {
              durationMinutes: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedFriends = friends.map((f: any) => {
    const hasCompletedTest = Boolean(f.referralCoinsCredited) || f.testSessions.some((s: any) => {
      return s.status === 'COMPLETED' || s.status === 'AUTO_SUBMITTED';
    });

    return {
      id: f.id,
      name: f.fullName || 'Candidate',
      email: f.email,
      mobile: f.mobile,
      candidateCode: f.candidateCode,
      registeredDate: formatDateTime(f.createdAt),
      hasCompletedTest,
      coinsEarned: hasCompletedTest ? 20 : 0
    };
  });

  return NextResponse.json({
    success: true,
    referredFriends: formattedFriends
  });
}

async function handleResetReferrals() {
  const result = await prisma.user.updateMany({
    data: {
      referredBy: null,
      referralsCount: 0,
      referralCoinsCredited: false,
      coins: 0
    }
  });

  return NextResponse.json({
    success: true,
    message: `All referral data has been reset successfully. Updated ${result.count} users.`
  });
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

async function handleUpdateTrackedJobs(data: any) {
  const { userId, trackedJobs } = data;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      trackedJobs: trackedJobs || [],
    },
  });

  return NextResponse.json({ success: true });
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

async function handleClaimPassPro(data: any, requesterUserId: string | null) {
  try {
    const targetUserId = data?.userId || requesterUserId;
    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const purchasedAt = new Date().toISOString().split('T')[0];
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const defaultExpiry = expiryDate.toISOString().split('T')[0];
    const finalExpiry = data?.expiry || defaultExpiry;

    const targetTier = data?.tier || 'Testbook Pass Pro';
    const targetCoins = data?.coins !== undefined ? Number(data.coins) : undefined;

    const updateData: any = {
      subscriptionTier: targetTier,
      subscriptionPurchasedAt: purchasedAt,
      subscriptionExpiresAt: finalExpiry,
    };

    if (targetCoins !== undefined) {
      updateData.coins = targetCoins;
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        subscriptionTier: updatedUser.subscriptionTier,
        subscriptionPurchasedAt: updatedUser.subscriptionPurchasedAt,
        subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
        coins: updatedUser.coins,
      }
    });
  } catch (err: any) {
    console.error("handleClaimPassPro error:", err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to claim Pass Pro' }, { status: 500 });
  }
}

async function handleSaveProfileAdmin(data: any, requesterUserId: string | null, isWebRequest = false) {
  console.log("handleSaveProfileAdmin received data:", data);
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
    coins,
    adminConfirmPassword
  } = data;

  // Enforce password confirmation for web requests
  if (isWebRequest) {
    if (!requesterUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Session missing' }, { status: 401 });
    }
    const adminUser = await prisma.user.findUnique({
      where: { id: requesterUserId },
      select: { passwordHash: true }
    });
    if (!adminUser || adminUser.passwordHash !== adminConfirmPassword) {
      return NextResponse.json({ success: false, error: 'Authentication failed: Invalid administrator verification password.' }, { status: 401 });
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      referralCode,
      referredBy,
      referralsCount,
      role,
      subscriptionTier: tier,
      subscriptionPurchasedAt: purchasedAt,
      subscriptionExpiresAt: expiry,
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

async function ensureMockTestExists(testId: string, title?: string, maxMarks?: number, durationMinutes?: number) {
  if (!testId) return null;
  try {
    const existing = await prisma.mockTest.findUnique({ where: { id: testId } });
    if (existing) return existing;

    // Find or create default category, exam, and series to attach dynamic test to
    let defaultCat = await prisma.category.findFirst();
    if (!defaultCat) {
      defaultCat = await prisma.category.create({
        data: { id: 'general_cat', name: 'General Competitive Exams', description: 'General mock tests' }
      });
    }

    let defaultExam = await prisma.exam.findFirst({ where: { categoryId: defaultCat.id } });
    if (!defaultExam) {
      defaultExam = await prisma.exam.create({
        data: { id: 'general_exam', categoryId: defaultCat.id, name: 'General Mock Tests' }
      });
    }

    let defaultSeries = await prisma.testSeries.findFirst({ where: { examId: defaultExam.id } });
    if (!defaultSeries) {
      defaultSeries = await prisma.testSeries.create({
        data: { id: 'general_series', examId: defaultExam.id, title: 'General Test Series' }
      });
    }

    return await prisma.mockTest.create({
      data: {
        id: testId,
        testSeriesId: defaultSeries.id,
        title: title || 'Mock Test',
        maxMarks: maxMarks || 200,
        durationMinutes: durationMinutes || 60,
        questionsCount: 100,
        requiredTierName: 'None',
      }
    });
  } catch (err) {
    console.error("ensureMockTestExists error:", err);
    return null;
  }
}

async function handleAddAttempt(data: any, request?: Request) {
  const { userId, testId, title, score, maxScore, accuracy, durationSeconds, violations, responses } = data;

  let source = data.source;
  if (!source && request) {
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
    if (userAgent.includes('okhttp') || userAgent.includes('cfnetwork') || userAgent.includes('expo') || !userAgent.includes('mozilla')) {
      source = 'app';
    } else if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
      source = 'mobile_web';
    } else {
      source = 'web';
    }
  }
  if (!source) source = 'web';

  // Ensure mock test record exists in database before creating session
  await ensureMockTestExists(testId, title, maxScore, durationSeconds ? Math.ceil(durationSeconds / 60) : 60);

  // Remove any ongoing session first
  if (userId && testId) {
    await prisma.userTestSession.deleteMany({
      where: {
        userId,
        mockTestId: testId,
        status: 'ONGOING',
      },
    }).catch(() => {});
  }

  // Calculate estimated rank and percentile using Testbook Normal CDF model
  let testbookRank: number | null = null;
  let testbookPercentile: number | null = null;

  try {
    const testInfo = await prisma.mockTest.findUnique({
      where: { id: testId },
      select: {
        testbookTotalUsers: true,
        testbookTopperScore: true,
        testbookAverageScore: true,
      }
    });

    if (testInfo && testInfo.testbookTotalUsers > 0) {
      const N = testInfo.testbookTotalUsers;
      const topper = testInfo.testbookTopperScore;
      const avg = testInfo.testbookAverageScore;

      // Estimate standard deviation (minimum width 5.0)
      const sigma = Math.max(5.0, (topper - avg) / 2.0);
      const z = ((score ?? 0) - avg) / sigma;

      // Abramowitz and Stegun Normal CDF approximation formula
      const t = 1 / (1 + 0.2316419 * Math.abs(z));
      const d = 0.3989422804 * Math.exp(-z * z / 2);
      const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
      const cdf = z >= 0 ? 1 - p : p;

      testbookPercentile = Number((cdf * 100).toFixed(2));
      testbookRank = Math.max(1, Math.min(N, Math.round((1 - cdf) * N)));
    }
  } catch (err) {
    console.error("Failed to estimate Testbook rank on attempt:", err);
  }

  // Calculate actual time spent from responses if available
  let actualTimeSpent = typeof durationSeconds === 'number' && !isNaN(durationSeconds) ? Math.max(0, Math.round(durationSeconds)) : 0;
  if (responses && typeof responses === 'object' && Object.keys(responses).length > 0) {
    const sumElapsed = Object.values(responses).reduce((sum: number, r: any) => sum + (r?.elapsedSeconds ?? 0), 0);
    if (sumElapsed > 0) {
      actualTimeSpent = Math.round(sumElapsed);
    }
  }

  // Create completed session
  const session = await prisma.userTestSession.create({
    data: {
      userId,
      mockTestId: testId,
      status: 'COMPLETED',
      finalScore: typeof score === 'number' && !isNaN(score) ? score : 0,
      accuracyPercentage: typeof accuracy === 'number' && !isNaN(accuracy) ? accuracy : 0,
      timeSpentSeconds: actualTimeSpent,
      violationsCount: typeof violations === 'number' && !isNaN(violations) ? Math.round(violations) : 0,
      remainingSeconds: 0,
      completedAt: new Date(),
      testbookRank,
      testbookPercentile,
      source: source || 'web',
    },
  });

  // Check if this is the user's first completed session and if they have a pending referral
  try {
    const userObj = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, referralCoinsCredited: true }
    });

    if (userObj && userObj.referredBy && !userObj.referralCoinsCredited) {
      const completedSessions = await prisma.userTestSession.findMany({
        where: {
          userId,
          status: { in: ['COMPLETED', 'AUTO_SUBMITTED'] }
        },
        include: {
          mockTest: true
        }
      });

      const validSessionsCount = completedSessions.filter((s: any) => {
        const durationMinutes = s.mockTest?.durationMinutes || 60;
        const totalSec = durationMinutes * 60;
        return s.timeSpentSeconds >= totalSec * 0.75;
      }).length;

      if (validSessionsCount === 1) {
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

  // Create question responses — wrapped in try/catch because questionIds from the app
  // may not exist in the questions table (test questions are stored in Tigris/external storage,
  // not in the Prisma DB). The session itself is already saved so we never lose the score.
  if (responses) {
    try {
      const responsesData = Object.entries(responses).map(([qId, val]: any) => ({
        sessionId: session.id,
        questionId: qId,
        selectedOptionIndex: val.selectedOptionIndex,
        state: val.selectedOptionIndex !== null ? 3 : 2,
        elapsedSeconds: val.elapsedSeconds || 0,
      }));
      if (responsesData.length > 0) {
        // Use skipDuplicates and catch FK errors gracefully
        await prisma.questionResponseState.createMany({
          data: responsesData,
          skipDuplicates: true,
        }).catch(() => {
          // Questions may not exist in DB (stored in external storage) — safe to skip
        });
      }
    } catch {
      // Response state is best-effort — session score is already persisted
    }
  }

  // Keep only the last 3 completed/auto-submitted attempts in the database
  // PERF (Phase 8): Also delete their response states to prevent the
  // question_response_states table from growing unboundedly (currently 16MB).
  try {
    const completedSessions = await prisma.userTestSession.findMany({
      where: {
        userId,
        mockTestId: testId,
        status: { in: ['COMPLETED', 'AUTO_SUBMITTED'] },
      },
      orderBy: {
        completedAt: 'desc',
      },
      select: {
        id: true,
      },
    });

    if (completedSessions.length > 3) {
      const toDeleteIds = completedSessions.slice(3).map(s => s.id);
      // PERF: Delete response states first (FK constraint), then the sessions
      await prisma.questionResponseState.deleteMany({
        where: { sessionId: { in: toDeleteIds } }
      }).catch(() => {}); // best-effort
      await prisma.userTestSession.deleteMany({
        where: {
          id: { in: toDeleteIds },
        },
      });
    }
  } catch (err) {
    console.error("Failed to prune old attempts:", err);
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

async function handleSaveOngoingSession(data: any, request?: Request) {
  const { userId, testId, title, timeRemaining, violations, responses, currentSectionIndex, currentQuestionIndex } = data;

  let source = data.source;
  if (!source && request) {
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
    if (userAgent.includes('okhttp') || userAgent.includes('cfnetwork') || userAgent.includes('expo') || !userAgent.includes('mozilla')) {
      source = 'app';
    } else if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
      source = 'mobile_web';
    } else {
      source = 'web';
    }
  }
  if (!source) source = 'web';

  // Ensure mock test record exists in database before creating session
  await ensureMockTestExists(testId, title, undefined, timeRemaining ? Math.ceil(timeRemaining / 60) : 60);

  const existing = await prisma.userTestSession.findFirst({
    where: {
      userId,
      mockTestId: testId,
      status: 'ONGOING',
    },
  });

  let sessionId = '';
  const safeTimeRemaining = typeof timeRemaining === 'number' && !isNaN(timeRemaining) ? Math.max(0, Math.round(timeRemaining)) : 0;
  const safeViolations = typeof violations === 'number' && !isNaN(violations) ? Math.round(violations) : 0;

  if (existing) {
    sessionId = existing.id;
    await prisma.userTestSession.update({
      where: { id: sessionId },
      data: {
        remainingSeconds: safeTimeRemaining,
        violationsCount: safeViolations,
        currentSectionIndex: currentSectionIndex ?? 0,
        currentQuestionIndex: currentQuestionIndex ?? 0,
      },
    });

    // Delete existing responses and insert new ones
    await prisma.questionResponseState.deleteMany({
      where: { sessionId },
    }).catch(() => {});
  } else {
    const created = await prisma.userTestSession.create({
      data: {
        userId,
        mockTestId: testId,
        status: 'ONGOING',
        remainingSeconds: safeTimeRemaining,
        violationsCount: safeViolations,
        currentSectionIndex: currentSectionIndex ?? 0,
        currentQuestionIndex: currentQuestionIndex ?? 0,
        source: source || 'web',
      },
    });
    sessionId = created.id;
  }

  if (responses) {
    try {
      const responsesData = Object.entries(responses).map(([qId, val]: any) => ({
        sessionId,
        questionId: qId,
        selectedOptionIndex: val.selectedOptionIndex,
        state: val.state !== undefined ? val.state : (val.selectedOptionIndex !== null ? 3 : 2),
        elapsedSeconds: val.elapsedSeconds || 0,
      }));
      if (responsesData.length > 0) {
        await prisma.questionResponseState.createMany({
          data: responsesData,
          skipDuplicates: true,
        }).catch(() => {
          // Questions may not exist in DB — safe to skip responses
        });
      }
    } catch {
      // Response state is best-effort — ongoing session position is already persisted
    }
  }

  return NextResponse.json({ success: true });
}

async function handleClearOngoingSession(data: any) {
  const { userId, testId } = data;

  if (userId && testId) {
    await prisma.userTestSession.deleteMany({
      where: {
        userId,
        mockTestId: testId,
        status: 'ONGOING',
      },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

async function handleResetAttempt(data: any) {
  const { userId, sessionId } = data;

  if (sessionId) {
    await prisma.userTestSession.deleteMany({
      where: { id: sessionId },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

async function handleAddNotice(data: any) {
  const { id, title, titleHi, type, category, date, publishDate, url, lastDate, imageUrl, contentHtml } = data;

  await prisma.notice.create({
    data: {
      id,
      title,
      titleHi: titleHi || null,
      type,
      category,
      date,
      publishDate,
      url: url || null,
      lastDate: lastDate || null,
      imageUrl: imageUrl || null,
      contentHtml: contentHtml || null,
    },
  });

  catalogCache.noticesList = null;

  return NextResponse.json({ success: true });
}

async function handleEditNotice(data: any) {
  const { id, title, titleHi, type, category, date, publishDate, url, lastDate, imageUrl, contentHtml } = data || {};

  if (!id) {
    return NextResponse.json({ success: false, error: 'Notice ID is required' }, { status: 400 });
  }

  await prisma.notice.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(titleHi !== undefined ? { titleHi: titleHi || null } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(date !== undefined ? { date } : {}),
      ...(publishDate !== undefined ? { publishDate } : {}),
      ...(url !== undefined ? { url: url || null } : {}),
      ...(lastDate !== undefined ? { lastDate: lastDate || null } : {}),
      ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}),
      ...(contentHtml !== undefined ? { contentHtml: contentHtml || null } : {}),
    },
  });

  catalogCache.noticesList = null;

  return NextResponse.json({ success: true });
}

async function handleGetSingleNoticeContent(data: any) {
  const { id } = data || {};
  if (!id) {
    return NextResponse.json({ success: false, error: 'Notice ID is required' }, { status: 400 });
  }

  let notice = await prisma.notice.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      titleHi: true,
      date: true,
      publishDate: true,
      type: true,
      category: true,
      url: true,
      rawUrl: true,
      lastDate: true,
      imageUrl: true,
      contentHtml: true,
    }
  });

  if (!notice) {
    return NextResponse.json({ success: false, error: 'Notice not found' }, { status: 404 });
  }

  // Auto-heal: If contentHtml is missing or empty, search for a notice with matching title that HAS contentHtml
  if (!notice.contentHtml || notice.contentHtml.trim().length === 0) {
    const matchingWithContent = await prisma.notice.findFirst({
      where: {
        title: { contains: notice.title.substring(0, 25), mode: 'insensitive' },
        contentHtml: { not: null }
      },
      select: { contentHtml: true, url: true, lastDate: true }
    });

    if (matchingWithContent && matchingWithContent.contentHtml) {
      notice.contentHtml = matchingWithContent.contentHtml;
      if (!notice.url) notice.url = matchingWithContent.url;
      if (!notice.lastDate) notice.lastDate = matchingWithContent.lastDate;

      // Update DB record so subsequent requests are fast
      await prisma.notice.update({
        where: { id },
        data: {
          contentHtml: matchingWithContent.contentHtml,
          ...(matchingWithContent.url ? { url: matchingWithContent.url } : {}),
          ...(matchingWithContent.lastDate ? { lastDate: matchingWithContent.lastDate } : {})
        }
      }).catch(() => {});
    }
  }

  // Resolve Tigris Object Storage content HTML if stored as a tiny link
  if (notice.contentHtml && (notice.contentHtml.startsWith('tigris://') || notice.contentHtml.startsWith('http://') || notice.contentHtml.startsWith('https://'))) {
    try {
      const { fetchNoticeHtmlFromTigris } = await import('../../lib/tigrisNoticeStorage');
      const resolvedHtml = await fetchNoticeHtmlFromTigris(notice.contentHtml);
      if (resolvedHtml) {
        notice.contentHtml = resolvedHtml;
      }
    } catch (e: any) {
      console.error(`Failed to resolve Tigris content for notice ${notice.id}:`, e.message);
    }
  }

  return NextResponse.json({ success: true, notice });
}

async function handleDeleteNotice(data: any) {
  const { id } = data;

  await prisma.notice.delete({
    where: { id },
  });

  catalogCache.noticesList = null;

  return NextResponse.json({ success: true });
}

async function handleAddCategory(rawPayload: any) {
  const data = rawPayload?.category || rawPayload?.data || rawPayload || {};
  const { id, name, nameHi, logoUrl, isPopular, isPracticeSeries, description, countText } = data;

  if (!id || !name) {
    return NextResponse.json({ success: false, error: 'Category ID and Name are required' }, { status: 400 });
  }

  const isPractice = isPracticeSeries ?? (id.includes('practice') || name.toLowerCase().includes('practice'));

  await prisma.category.upsert({
    where: { id },
    update: {
      name,
      nameHi: nameHi !== undefined ? nameHi : undefined,
      logoUrl: logoUrl || null,
      isPopular: isPopular ?? false,
      isPracticeSeries: isPractice,
      description: description ?? '',
      countText: countText ?? '',
    },
    create: {
      id,
      name,
      nameHi: nameHi || '',
      logoUrl: logoUrl || null,
      isPopular: isPopular ?? false,
      isPracticeSeries: isPractice,
      description: description ?? '',
      countText: countText ?? '',
    },
  });

  // Clear in-memory catalog cache so all live users receive fresh data
  catalogCache.examCatalog = null;
  catalogCache.noticesList = null;

  return NextResponse.json({ success: true });
}

async function handleDeleteCategory(data: any) {
  const categoryId = data?.categoryId || data?.id || (typeof data === 'string' ? data : null);

  if (!categoryId) {
    return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
  }

  try {
    // Delete associated exams, testSeries, and mockTests if any to avoid foreign key issues
    const exams = await prisma.exam.findMany({ where: { categoryId } });
    const examIds = exams.map(e => e.id);

    if (examIds.length > 0) {
      const series = await prisma.testSeries.findMany({ where: { examId: { in: examIds } } });
      const seriesIds = series.map(s => s.id);

      if (seriesIds.length > 0) {
        await prisma.mockTest.deleteMany({ where: { testSeriesId: { in: seriesIds } } });
        await prisma.testSeries.deleteMany({ where: { id: { in: seriesIds } } });
      }
      await prisma.exam.deleteMany({ where: { id: { in: examIds } } });
    }

    // Use deleteMany so it won't throw if record does not exist in DB (e.g. static/fallback category)
    await prisma.category.deleteMany({
      where: { id: categoryId },
    });

    // Clear in-memory catalog cache so all live users receive fresh data
    catalogCache.examCatalog = null;
    catalogCache.noticesList = null;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("handleDeleteCategory error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleAddSubCategory(data: any) {
  const { id, categoryId, name, nameHi } = data;

  await prisma.exam.create({
    data: {
      id,
      categoryId,
      name,
      nameHi: nameHi || '',
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

async function handleAddSubSubCategory(data: any) {
  const { id, subCategoryId, name, nameHi, titleHi } = data;

  await prisma.testSeries.create({
    data: {
      id,
      examId: subCategoryId,
      title: name,
      titleHi: nameHi || titleHi || '',
    },
  });

  return NextResponse.json({ success: true });
}

async function handleDeleteSubSubCategory(data: any) {
  const { subSubCategoryId } = data;

  await prisma.testSeries.delete({
    where: { id: subSubCategoryId },
  });

  return NextResponse.json({ success: true });
}

async function handleAddMockTest(data: any) {
  const {
    categoryId,
    subCategoryId,
    subSubCategoryId,
    id,
    title,
    titleHi,
    questionsCount,
    durationMinutes,
    maxMarks,
    requiredTier,
    hasSectionalTiming,
    sectionalTimings,
    lockSectionOnSubmit,
    testbookTotalUsers,
    testbookTopperScore,
    testbookAverageScore,
    testbookCutoffScore,
    positiveMarks,
    negativeMarks
  } = data;

  let finalTestSeriesId = subSubCategoryId;

  if (!finalTestSeriesId) {
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
    finalTestSeriesId = testSeries.id;
  }

  await prisma.mockTest.create({
    data: {
      id,
      testSeriesId: finalTestSeriesId,
      title,
      titleHi: titleHi || '',
      durationMinutes,
      questionsCount,
      maxMarks,
      requiredTierName: requiredTier,
      passingCutoff: 0.0,
      hasSectionalTiming: hasSectionalTiming ?? false,
      sectionalTimings: sectionalTimings ?? undefined,
      lockSectionOnSubmit: lockSectionOnSubmit !== undefined ? Boolean(lockSectionOnSubmit) : false,
      testbookTotalUsers: testbookTotalUsers !== undefined ? Number(testbookTotalUsers) : 0,
      testbookTopperScore: testbookTopperScore !== undefined ? Number(testbookTopperScore) : 0.0,
      testbookAverageScore: testbookAverageScore !== undefined ? Number(testbookAverageScore) : 0.0,
      testbookCutoffScore: testbookCutoffScore !== undefined ? Number(testbookCutoffScore) : 0.0,
      positiveMarks: positiveMarks !== undefined ? Number(positiveMarks) : 2.0,
      negativeMarks: negativeMarks !== undefined ? Number(negativeMarks) : 0.5,
    },
  });

  if (Array.isArray(data.sections) && data.sections.length > 0) {
    for (let i = 0; i < data.sections.length; i++) {
      const s = data.sections[i];
      await prisma.section.create({
        data: {
          id: `sec_${id}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          mockTestId: id,
          name: s.name || `Section ${i + 1}`,
          orderIndex: i,
          positiveMarks: s.positiveMarks !== undefined ? Number(s.positiveMarks) : (positiveMarks ?? 2.0),
          negativeMarks: s.negativeMarks !== undefined ? Number(s.negativeMarks) : (negativeMarks ?? 0.5),
        }
      });
    }
  }

  return NextResponse.json({ success: true });
}

async function handleDeleteMockTest(data: any) {
  const { testId } = data;
  if (!testId) {
    return NextResponse.json({ success: false, error: 'testId is required' }, { status: 400 });
  }

  const rawTargetId = String(testId).trim();
  const slugId = rawTargetId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

  try {
    // 1. Fetch mockTest to check for stored custom questions in Tigris S3
    const mockTest = await prisma.mockTest.findFirst({
      where: {
        OR: [
          { id: rawTargetId },
          { id: slugId }
        ]
      }
    });

    const bucketName = process.env.TIGRIS_BUCKET_NAME;

    if (mockTest && bucketName) {
      const keysToDelete: string[] = [
        `questions_${slugId}.json`,
        `questions_${rawTargetId}.json`
      ];

      // Extract S3 key from customQuestions URL if stored as object with url property
      if (mockTest.customQuestions && typeof mockTest.customQuestions === 'object' && 'url' in (mockTest.customQuestions as any)) {
        const urlStr = (mockTest.customQuestions as any).url;
        try {
          const urlObj = new URL(urlStr);
          const pathname = decodeURIComponent(urlObj.pathname);
          const extractedKey = pathname.startsWith(`/${bucketName}/`)
            ? pathname.substring(bucketName.length + 2)
            : pathname.startsWith('/') ? pathname.substring(1) : pathname;
          if (extractedKey && !keysToDelete.includes(extractedKey)) {
            keysToDelete.push(extractedKey);
          }
        } catch (e) {
          // Ignore URL parsing errors
        }
      }

      // Delete corresponding object(s) from Tigris S3 bucket
      for (const key of keysToDelete) {
        try {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: key,
            })
          );
          console.log(`Successfully deleted custom questions file from Tigris S3: ${key}`);
        } catch (err: any) {
          console.error(`Failed to delete S3 object ${key}:`, err?.message || err);
        }
      }
    }

    // 2. Delete mockTest record from database
    if (mockTest) {
      await prisma.mockTest.delete({
        where: { id: mockTest.id }
      });
    }

    // Bust in-memory catalog cache so all live users receive fresh data immediately
    catalogCache.examCatalog = null;
    catalogCache.noticesList = null;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to delete mockTest:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function handleEditCategory(rawPayload: any) {
  const data = rawPayload?.category || rawPayload?.data || rawPayload || {};
  const updates = rawPayload?.updates || {};
  const targetId = data.categoryId || data.id || rawPayload?.categoryId;
  const name = updates.name !== undefined ? updates.name : data.name;
  const nameHi = updates.nameHi !== undefined ? updates.nameHi : data.nameHi;
  const description = updates.description !== undefined ? updates.description : data.description;
  const logoUrl = data.logoUrl;
  const isPopular = data.isPopular;
  const isPracticeSeries = data.isPracticeSeries;
  const countText = data.countText;

  if (!targetId) {
    return NextResponse.json({ success: false, error: 'Category ID is required for edit' }, { status: 400 });
  }

  await prisma.category.update({
    where: { id: targetId },
    data: { 
      name: name !== undefined ? name : undefined,
      nameHi: nameHi !== undefined ? nameHi : undefined,
      logoUrl: logoUrl !== undefined ? logoUrl : undefined,
      isPopular: isPopular !== undefined ? isPopular : undefined,
      isPracticeSeries: isPracticeSeries !== undefined ? isPracticeSeries : undefined,
      description: description !== undefined ? description : undefined,
      countText: countText !== undefined ? countText : undefined,
    },
  });

  // Bust in-memory catalog cache so next sync serves fresh data
  catalogCache.examCatalog = null;
  catalogCache.noticesList = null;

  return NextResponse.json({ success: true });
}

async function handleEditSubCategory(data: any) {
  const { subCategoryId, name, nameHi } = data;

  await prisma.exam.update({
    where: { id: subCategoryId },
    data: { 
      name,
      nameHi: nameHi !== undefined ? nameHi : undefined,
    },
  });

  // Bust in-memory catalog cache so next sync serves fresh data
  catalogCache.examCatalog = null;
  catalogCache.noticesList = null;

  return NextResponse.json({ success: true });
}

async function handleEditSubSubCategory(data: any) {
  const { subSubCategoryId, name, nameHi, titleHi } = data;

  await prisma.testSeries.update({
    where: { id: subSubCategoryId },
    data: { 
      title: name,
      titleHi: nameHi !== undefined ? nameHi : (titleHi !== undefined ? titleHi : undefined),
    },
  });

  // Bust in-memory catalog cache so next sync serves fresh data
  catalogCache.examCatalog = null;
  catalogCache.noticesList = null;

  return NextResponse.json({ success: true });
}

async function handleEditMockTestTitle(data: any) {
  const {
    testId,
    title,
    titleHi,
    testbookTotalUsers,
    testbookTopperScore,
    testbookAverageScore,
    testbookCutoffScore,
    positiveMarks,
    negativeMarks,
    durationMinutes,
    questionsCount,
    maxMarks,
    requiredTier,
    requiredTierName,
    hasSectionalTiming,
    sectionalTimings,
    lockSectionOnSubmit,
  } = data;

  const tierToUse = requiredTierName !== undefined ? requiredTierName : requiredTier;

  await prisma.mockTest.update({
    where: { id: testId },
    data: {
      title,
      titleHi: titleHi !== undefined ? titleHi : undefined,
      testbookTotalUsers: testbookTotalUsers !== undefined ? Number(testbookTotalUsers) : undefined,
      testbookTopperScore: testbookTopperScore !== undefined ? Number(testbookTopperScore) : undefined,
      testbookAverageScore: testbookAverageScore !== undefined ? Number(testbookAverageScore) : undefined,
      testbookCutoffScore: testbookCutoffScore !== undefined ? Number(testbookCutoffScore) : undefined,
      positiveMarks: positiveMarks !== undefined ? Number(positiveMarks) : undefined,
      negativeMarks: negativeMarks !== undefined ? Number(negativeMarks) : undefined,
      durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
      questionsCount: questionsCount !== undefined ? Number(questionsCount) : undefined,
      maxMarks: maxMarks !== undefined ? Number(maxMarks) : undefined,
      requiredTierName: tierToUse !== undefined ? tierToUse : undefined,
      hasSectionalTiming: hasSectionalTiming !== undefined ? Boolean(hasSectionalTiming) : undefined,
      sectionalTimings: sectionalTimings !== undefined ? sectionalTimings : undefined,
      lockSectionOnSubmit: lockSectionOnSubmit !== undefined ? Boolean(lockSectionOnSubmit) : undefined,
    },
  });

  if (Array.isArray(data.sections) && data.sections.length > 0) {
    await prisma.section.deleteMany({ where: { mockTestId: testId } });
    for (let i = 0; i < data.sections.length; i++) {
      const s = data.sections[i];
      await prisma.section.create({
        data: {
          id: `sec_${testId}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          mockTestId: testId,
          name: s.name || `Section ${i + 1}`,
          orderIndex: i,
          positiveMarks: s.positiveMarks !== undefined ? Number(s.positiveMarks) : (positiveMarks ?? 2.0),
          negativeMarks: s.negativeMarks !== undefined ? Number(s.negativeMarks) : (negativeMarks ?? 0.5),
        }
      });
    }
  }

  // Bust in-memory catalog cache so next sync serves fresh data
  catalogCache.examCatalog = null;
  catalogCache.noticesList = null;

  return NextResponse.json({ success: true });
}

async function handleSaveSectionRules(data: any) {
  const { testId, sections } = data || {};
  if (!testId || !Array.isArray(sections)) {
    return NextResponse.json({ success: false, error: 'testId and sections array are required' }, { status: 400 });
  }

  try {
    // Delete existing section records for this test and recreate with custom marks
    await prisma.section.deleteMany({
      where: { mockTestId: testId }
    });

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      await prisma.section.create({
        data: {
          id: `sec_${testId}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          mockTestId: testId,
          name: s.name || `Section ${i + 1}`,
          orderIndex: s.orderIndex ?? i,
          positiveMarks: s.positiveMarks !== undefined ? Number(s.positiveMarks) : 2.0,
          negativeMarks: s.negativeMarks !== undefined ? Number(s.negativeMarks) : 0.5,
        }
      });
    }

    catalogCache.examCatalog = null;
    catalogCache.noticesList = null;

    return NextResponse.json({ success: true, count: sections.length });
  } catch (err: any) {
    console.error('Failed to save section rules:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function handleReorderCategories(data: any) {
  const { orderedIds } = data;
  for (let i = 0; i < orderedIds.length; i++) {
    await prisma.category.update({
      where: { id: orderedIds[i] },
      data: { orderIndex: i },
    });
  }
  // Bust in-memory catalog cache so next sync serves fresh data
  catalogCache.examCatalog = null;
  catalogCache.noticesList = null;
  return NextResponse.json({ success: true });
}

async function handleReorderSubCategories(data: any) {
  const { orderedIds } = data;
  for (let i = 0; i < orderedIds.length; i++) {
    await prisma.exam.update({
      where: { id: orderedIds[i] },
      data: { orderIndex: i },
    });
  }
  // Bust in-memory catalog cache so next sync serves fresh data
  catalogCache.examCatalog = null;
  catalogCache.noticesList = null;
  return NextResponse.json({ success: true });
}

async function handleReorderSubSubCategories(data: any) {
  const { orderedIds } = data;
  for (let i = 0; i < orderedIds.length; i++) {
    await prisma.testSeries.update({
      where: { id: orderedIds[i] },
      data: { orderIndex: i },
    });
  }
  // Bust in-memory catalog cache so next sync serves fresh data
  catalogCache.examCatalog = null;
  catalogCache.noticesList = null;
  return NextResponse.json({ success: true });
}

async function handleReorderMockTests(data: any) {
  const { orderedIds } = data;
  for (let i = 0; i < orderedIds.length; i++) {
    await prisma.mockTest.update({
      where: { id: orderedIds[i] },
      data: { orderIndex: i },
    });
  }
  // Bust in-memory catalog cache so next sync serves fresh data
  catalogCache.examCatalog = null;
  catalogCache.noticesList = null;
  return NextResponse.json({ success: true });
}

async function handleUploadQuestionChunk(data: any) {
  const testId = data?.testId;
  const chunkIndex = data?.chunkIndex ?? 0;
  const questions = data?.questions;

  if (!testId) {
    return NextResponse.json({ success: false, error: 'testId is required' }, { status: 400 });
  }
  if (!questions || !Array.isArray(questions)) {
    return NextResponse.json({ success: false, error: 'questions array is required' }, { status: 400 });
  }

  const bucketName = process.env.TIGRIS_BUCKET_NAME;
  if (!bucketName) {
    return NextResponse.json({ success: false, error: 'S3 storage not configured' }, { status: 500 });
  }

  const safeKeyId = String(testId).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const fileName = `chunks_${safeKeyId}_part${chunkIndex}.json`;

  try {
    const fileBuffer = Buffer.from(JSON.stringify(questions));
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: 'application/json',
      })
    );

    const url = `${process.env.TIGRIS_ENDPOINT || "https://fly.storage.tigris.dev"}/${bucketName}/${fileName}`;
    return NextResponse.json({ success: true, url, chunkIndex });
  } catch (err: any) {
    console.error(`Failed to upload chunk ${chunkIndex}:`, err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function handleGetPresignedUploadUrl(data: any) {
  const testId = data?.testId;
  if (!testId) {
    return NextResponse.json({ success: false, error: 'testId is required' }, { status: 400 });
  }

  const bucketName = process.env.TIGRIS_BUCKET_NAME;
  if (!bucketName) {
    return NextResponse.json({ success: false, error: 'S3 storage not configured' }, { status: 500 });
  }

  const safeKeyId = String(testId).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const fileName = `questions_${safeKeyId}.json`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: 'application/json',
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 }); // 10 min expiry

    const publicUrl = `${process.env.TIGRIS_ENDPOINT || "https://fly.storage.tigris.dev"}/${bucketName}/${fileName}`;

    return NextResponse.json({
      success: true,
      uploadUrl: presignedUrl,
      publicUrl: publicUrl,
      key: fileName,
    });
  } catch (err: any) {
    console.error('Failed to generate presigned URL:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function handleSaveCustomQuestions(rawPayload: any) {
  const payload = rawPayload?.data || rawPayload || {};
  const testId = payload.testId || rawPayload?.testId;
  const categoryId = payload.categoryId || rawPayload?.categoryId;
  const questions = payload.questions || rawPayload?.questions;
  const questionsUrl = payload.questionsUrl || rawPayload?.questionsUrl;
  const chunkUrls = payload.chunkUrls || rawPayload?.chunkUrls;
  const questionsCountFromPayload = payload.questionsCount || rawPayload?.questionsCount;

  if (!testId) {
    return NextResponse.json({ success: false, error: 'Target mock test ID is required' }, { status: 400 });
  }

  // Accept: raw questions array, a pre-uploaded S3 URL, or chunk URLs to merge
  const hasQuestions = questions && Array.isArray(questions) && questions.length > 0;
  const hasQuestionsUrl = questionsUrl && typeof questionsUrl === 'string';
  const hasChunkUrls = chunkUrls && Array.isArray(chunkUrls) && chunkUrls.length > 0;

  if (!hasQuestions && !hasQuestionsUrl && !hasChunkUrls) {
    return NextResponse.json({ success: false, error: 'Questions array, questionsUrl, or chunkUrls is required' }, { status: 400 });
  }

  const rawTargetId = String(testId).trim();
  const targetId = rawTargetId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const safeKeyId = targetId;

  const bucketName = process.env.TIGRIS_BUCKET_NAME;
  let s3Url: string | null = hasQuestionsUrl ? questionsUrl : null;
  let mergedQuestions: any[] | null = hasQuestions ? questions : null;
  let qCount = hasQuestions ? questions.length : (questionsCountFromPayload ? Number(questionsCountFromPayload) : 0);

  // If chunk URLs provided, fetch each chunk from S3, merge, and upload combined file
  if (hasChunkUrls && bucketName) {
    try {
      const allQuestions: any[] = [];
      for (const chunkUrl of chunkUrls) {
        const chunkRes = await fetch(chunkUrl);
        if (chunkRes.ok) {
          const chunkData = await chunkRes.json();
          if (Array.isArray(chunkData)) {
            allQuestions.push(...chunkData);
          }
        }
      }

      mergedQuestions = allQuestions;
      qCount = allQuestions.length;

      // Upload the merged combined file
      const fileName = `questions_${safeKeyId}.json`;
      const fileBuffer = Buffer.from(JSON.stringify(allQuestions));
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: fileBuffer,
          ContentType: "application/json",
        })
      );
      s3Url = `${process.env.TIGRIS_ENDPOINT || "https://fly.storage.tigris.dev"}/${bucketName}/${fileName}`;

      // Clean up chunk files from S3
      for (const chunkUrl of chunkUrls) {
        try {
          const urlObj = new URL(chunkUrl);
          const chunkKey = urlObj.pathname.startsWith(`/${bucketName}/`)
            ? urlObj.pathname.substring(bucketName.length + 2)
            : urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
          if (chunkKey) {
            await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: chunkKey }));
          }
        } catch (cleanupErr) {
          // Non-critical: chunk cleanup failure won't break the flow
        }
      }
    } catch (err: any) {
      console.error("Failed to merge chunks:", err);
      return NextResponse.json({ success: false, error: 'Failed to merge question chunks: ' + err.message }, { status: 500 });
    }
  }

  // If direct S3 URL provided and question count is 0, read object from Tigris S3 using GetObjectCommand to auto-detect total question count
  if (s3Url && qCount === 0 && bucketName) {
    try {
      const urlObj = new URL(s3Url);
      const pathname = decodeURIComponent(urlObj.pathname);
      const key = pathname.startsWith(`/${bucketName}/`)
        ? pathname.substring(bucketName.length + 2)
        : pathname.startsWith('/') ? pathname.substring(1) : pathname;

      const s3Obj = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: key
      }));

      if (s3Obj.Body) {
        const strData = await s3Obj.Body.transformToString();
        const jsonArr = JSON.parse(strData);
        if (Array.isArray(jsonArr)) {
          qCount = jsonArr.length;
        }
      }
    } catch (e: any) {
      console.warn("Could not auto-detect question count from direct S3 URL via GetObjectCommand:", e?.message || e);
    }
  }

  // Only upload to S3 if we have raw questions and no pre-uploaded URL
  if (!s3Url && hasQuestions && bucketName) {
    try {
      const fileName = `questions_${safeKeyId}.json`;
      const fileBuffer = Buffer.from(JSON.stringify(questions));

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: fileBuffer,
          ContentType: "application/json",
        })
      );

      s3Url = `${process.env.TIGRIS_ENDPOINT || "https://fly.storage.tigris.dev"}/${bucketName}/${fileName}`;
    } catch (err: any) {
      console.error("Failed to upload custom questions to Tigris S3:", err);
    }
  }

  const questionsDataToStore = s3Url ? { url: s3Url } : (mergedQuestions || questions);

  // Dynamically compute total max marks based on individual question positive marks if available
  const rawQArray = Array.isArray(mergedQuestions) ? mergedQuestions : (Array.isArray(questions) ? questions : []);
  const calculatedMaxMarks = rawQArray.length > 0
    ? rawQArray.reduce((sum: number, q: any) => sum + (q.positiveMarks !== undefined && q.positiveMarks !== null ? Number(q.positiveMarks) : 2.0), 0)
    : qCount * 2;

  try {
    // 1. Check if the target mock test already exists in the database by slug or raw ID
    let existingMockTest = await prisma.mockTest.findFirst({
      where: {
        OR: [
          { id: targetId },
          { id: rawTargetId }
        ]
      }
    });

    if (existingMockTest) {
      // Update existing mock test questions and test metadata without creating any new categories
      await prisma.mockTest.update({
        where: { id: existingMockTest.id },
        data: {
          customQuestions: questionsDataToStore,
          questionsCount: qCount,
          maxMarks: calculatedMaxMarks,
          ...(payload.durationMinutes !== undefined ? { durationMinutes: Number(payload.durationMinutes) } : {}),
          ...(payload.positiveMarks !== undefined ? { positiveMarks: Number(payload.positiveMarks) } : {}),
          ...(payload.negativeMarks !== undefined ? { negativeMarks: Number(payload.negativeMarks) } : {}),
          ...(payload.hasSectionalTiming !== undefined ? { hasSectionalTiming: Boolean(payload.hasSectionalTiming) } : {}),
          ...(payload.sectionalTimings !== undefined ? { sectionalTimings: payload.sectionalTimings } : {}),
          ...(payload.lockSectionOnSubmit !== undefined ? { lockSectionOnSubmit: Boolean(payload.lockSectionOnSubmit) } : {}),
        }
      });
    } else {
      // 2. If test does not exist, find an existing TestSeries to attach to
      let targetSeries = null;

      if (payload.testSeriesId) {
        targetSeries = await prisma.testSeries.findUnique({
          where: { id: payload.testSeriesId }
        });
      }

      if (!targetSeries) {
        targetSeries = await prisma.testSeries.findFirst();
      }

      // If no TestSeries exists at all, find or fallback to first Category
      if (!targetSeries) {
        let defaultCategory = await prisma.category.findFirst();
        if (!defaultCategory) {
          defaultCategory = await prisma.category.create({
            data: {
              id: 'general_test_series',
              name: 'General Test Series',
              isPracticeSeries: false,
              description: 'Default Test Series Category'
            }
          });
        }

        let defaultExam = await prisma.exam.findFirst({
          where: { categoryId: defaultCategory.id }
        });
        if (!defaultExam) {
          defaultExam = await prisma.exam.create({
            data: {
              id: `${defaultCategory.id}_exam`,
              categoryId: defaultCategory.id,
              name: `${defaultCategory.name} Exam`
            }
          });
        }

        targetSeries = await prisma.testSeries.create({
          data: {
            id: `${defaultCategory.id}_series`,
            examId: defaultExam.id,
            title: `${defaultCategory.name} Test Series`
          }
        });
      }

      await prisma.mockTest.create({
        data: {
          id: targetId,
          testSeriesId: targetSeries.id,
          title: payload.title || rawTargetId || `Test Paper (${targetId})`,
          durationMinutes: payload.durationMinutes !== undefined ? Number(payload.durationMinutes) : 150,
          questionsCount: qCount,
          maxMarks: calculatedMaxMarks,
          positiveMarks: payload.positiveMarks !== undefined ? Number(payload.positiveMarks) : 2.0,
          negativeMarks: payload.negativeMarks !== undefined ? Number(payload.negativeMarks) : 0.5,
          hasSectionalTiming: payload.hasSectionalTiming !== undefined ? Boolean(payload.hasSectionalTiming) : false,
          sectionalTimings: payload.sectionalTimings !== undefined ? payload.sectionalTimings : undefined,
          lockSectionOnSubmit: payload.lockSectionOnSubmit !== undefined ? Boolean(payload.lockSectionOnSubmit) : false,
          requiredTierName: 'None',
          customQuestions: questionsDataToStore,
        }
      });
    }

    // Save/update section rules if sections array provided
    const targetMockId = existingMockTest ? existingMockTest.id : targetId;
    if (Array.isArray(payload.sections) && payload.sections.length > 0) {
      try {
        await prisma.section.deleteMany({ where: { mockTestId: targetMockId } });
        for (let i = 0; i < payload.sections.length; i++) {
          const s = payload.sections[i];
          await prisma.section.create({
            data: {
              id: `sec_${targetMockId}_${i}_${Math.random().toString(36).substring(2, 7)}`,
              mockTestId: targetMockId,
              name: s.name || `Section ${i + 1}`,
              orderIndex: s.orderIndex ?? i,
              positiveMarks: s.positiveMarks !== undefined ? Number(s.positiveMarks) : (payload.positiveMarks ? Number(payload.positiveMarks) : 2.0),
              negativeMarks: s.negativeMarks !== undefined ? Number(s.negativeMarks) : (payload.negativeMarks ? Number(payload.negativeMarks) : 0.5),
            }
          });
        }
      } catch (secErr) {
        console.warn('Could not update section rules during custom questions save:', secErr);
      }
    }

    // Clear in-memory catalog cache so all live users receive fresh data
    catalogCache.examCatalog = null;
    catalogCache.noticesList = null;

    return NextResponse.json({
      success: true,
      testId: targetMockId,
      url: s3Url,
      questionsCount: qCount,
      maxMarks: calculatedMaxMarks,
    });
  } catch (err: any) {
    console.error("Failed to save custom questions to DB:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function handleGetCustomQuestions(rawPayload: any) {
  const payload = rawPayload?.data || rawPayload || {};
  const testId = payload.testId || rawPayload?.testId;
  const categoryId = payload.categoryId || rawPayload?.categoryId;

  if (!testId && !categoryId) {
    return NextResponse.json({ success: true, customQuestions: null, questions: null });
  }

  const candidateIds: string[] = [];
  if (testId) candidateIds.push(testId);
  if (categoryId) {
    candidateIds.push(`${categoryId}_default`);
    candidateIds.push(`${categoryId}_practice_default`);
    candidateIds.push(`${categoryId}_practice_practice_default`);
    if (!categoryId.endsWith('_practice')) {
      candidateIds.push(`${categoryId}_practice_default`);
    }
  }
  if (testId) {
    if (testId.endsWith('_practice_default')) {
      candidateIds.push(testId.replace('_practice_default', '_practice_practice_default'));
      candidateIds.push(testId.replace('_practice_default', '_default'));
    } else if (testId.endsWith('_practice_practice_default')) {
      candidateIds.push(testId.replace('_practice_practice_default', '_practice_default'));
      candidateIds.push(testId.replace('_practice_practice_default', '_default'));
    } else if (testId.endsWith('_default')) {
      candidateIds.push(testId.replace('_default', '_practice_default'));
      candidateIds.push(testId.replace('_default', '_practice_practice_default'));
    }
  }

  let mockTest: any = null;
  for (const cid of candidateIds) {
    if (!cid) continue;
    mockTest = await prisma.mockTest.findUnique({
      where: { id: cid },
      select: {
        customQuestions: true,
        positiveMarks: true,
        negativeMarks: true,
        durationMinutes: true,
        questionsCount: true,
        maxMarks: true,
        hasSectionalTiming: true,
        sectionalTimings: true,
        sections: {
          select: {
            id: true,
            name: true,
            orderIndex: true,
            positiveMarks: true,
            negativeMarks: true,
          },
          orderBy: { orderIndex: 'asc' }
        }
      },
    });
    if (mockTest && mockTest.customQuestions) {
      break;
    }
  }

  let questions = mockTest?.customQuestions || null;

  // Retrieve JSON content from Tigris S3 if stored as URL link
  if (questions && typeof questions === 'object' && !Array.isArray(questions)) {
    if (Array.isArray((questions as any).data)) {
      questions = (questions as any).data;
    } else if (Array.isArray((questions as any).questions)) {
      questions = (questions as any).questions;
    } else if ('url' in (questions as any)) {
      const url = (questions as any).url;
      try {
        const bucketName = process.env.TIGRIS_BUCKET_NAME || "mocktest-assets";
        const urlObj = new URL(url);
        const pathname = decodeURIComponent(urlObj.pathname);
        const key = pathname.startsWith(`/${bucketName}/`)
          ? pathname.substring(bucketName.length + 2)
          : pathname.startsWith('/') ? pathname.substring(1) : pathname;

        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
          })
        );
        if (response.Body) {
          const bodyContents = await response.Body.transformToString();
          questions = JSON.parse(bodyContents);
        }
      } catch (err) {
        console.error("Failed to fetch questions from Tigris S3 via SDK, trying HTTP fetch:", err);
        try {
          const fetchRes = await fetch(url);
          if (fetchRes.ok) {
            questions = await fetchRes.json();
          }
        } catch (fetchErr) {
          console.error("Failed to fetch questions from URL:", fetchErr);
        }
      }
    }
  }

  let s3Url: string | null = null;
  if (mockTest?.customQuestions && typeof mockTest.customQuestions === 'object' && 'url' in (mockTest.customQuestions as any)) {
    s3Url = (mockTest.customQuestions as any).url;
  }

  return NextResponse.json({
    success: true,
    url: s3Url,
    questions,
    customQuestions: questions,
    positiveMarks: mockTest?.positiveMarks ?? null,
    negativeMarks: mockTest?.negativeMarks ?? null,
    durationMinutes: mockTest?.durationMinutes ?? null,
    questionsCount: mockTest?.questionsCount ?? null,
    maxMarks: mockTest?.maxMarks ?? null,
    hasSectionalTiming: mockTest?.hasSectionalTiming ?? null,
    sectionalTimings: mockTest?.sectionalTimings ?? null,
    lockSectionOnSubmit: mockTest?.lockSectionOnSubmit ?? null,
    sections: mockTest?.sections ?? [],
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

// ---------------------------------------------------------------------------
// Optimized Memory Assembly Compiler for Exam Catalog
// ---------------------------------------------------------------------------
async function getCompiledExamCatalog() {
  // Safe runtime schema patch: run once on boot to avoid executing 8 DDL queries on every request
  if (!schemaPatched) {
    schemaPatched = true;
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE categories ADD COLUMN IF NOT EXISTS "logoUrl" text;');
      await prisma.$executeRawUnsafe('ALTER TABLE categories ADD COLUMN IF NOT EXISTS "isPopular" boolean DEFAULT false;');
      await prisma.$executeRawUnsafe('ALTER TABLE categories ADD COLUMN IF NOT EXISTS "isPracticeSeries" boolean DEFAULT false;');
      await prisma.$executeRawUnsafe('ALTER TABLE categories ADD COLUMN IF NOT EXISTS "description" text DEFAULT \'\';');
      await prisma.$executeRawUnsafe('ALTER TABLE categories ADD COLUMN IF NOT EXISTS "countText" text DEFAULT \'\';');
      await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS public.vocabs ENABLE ROW LEVEL SECURITY;');
      await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS public.practice_sessions ENABLE ROW LEVEL SECURITY;');
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vocabs') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vocabs' AND policyname = 'Enable read access for all users') THEN
                    CREATE POLICY "Enable read access for all users" ON public.vocabs FOR SELECT USING (true);
                END IF;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'practice_sessions') THEN
                EXECUTE 'DROP POLICY IF EXISTS "Enable all access for practice_sessions" ON public.practice_sessions;';
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'practice_sessions' AND policyname = 'Allow_Public_Read_practice_sessions') THEN
                    CREATE POLICY "Allow_Public_Read_practice_sessions" ON public.practice_sessions FOR SELECT USING (true);
                END IF;
            END IF;
        END $$;

        ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "nameHi" TEXT DEFAULT '';
        ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "nameHi" TEXT DEFAULT '';
        ALTER TABLE "test_series" ADD COLUMN IF NOT EXISTS "titleHi" TEXT DEFAULT '';
        ALTER TABLE "mock_tests" ADD COLUMN IF NOT EXISTS "titleHi" TEXT DEFAULT '';
        ALTER TABLE "mock_tests" ADD COLUMN IF NOT EXISTS "lockSectionOnSubmit" BOOLEAN DEFAULT FALSE;
        ALTER TABLE "notices" ADD COLUMN IF NOT EXISTS "titleHi" TEXT DEFAULT '';
      `);
    } catch (err: any) {
      console.error("Runtime database patch failed:", err);
    }
  }

  const categories = await prisma.category.findMany({ orderBy: { orderIndex: 'asc' } });
  const exams = await prisma.exam.findMany({ orderBy: { orderIndex: 'asc' } });
  const testSeries = await prisma.testSeries.findMany({ orderBy: { orderIndex: 'asc' } });
  const mockTests = await prisma.$queryRaw<any[]>`
    SELECT 
      "id", 
      "testSeriesId", 
      "title",
      COALESCE("titleHi", '') as "titleHi", 
      "durationMinutes", 
      "passingCutoff", 
      "questionsCount", 
      "maxMarks", 
      "requiredTierName", 
      "hasSectionalTiming", 
      "sectionalTimings", 
      COALESCE("lockSectionOnSubmit", false) as "lockSectionOnSubmit",
      "orderIndex", 
      "positiveMarks", 
      "negativeMarks", 
      "testbookTotalUsers", 
      "testbookTopperScore", 
      "testbookAverageScore", 
      "testbookCutoffScore",
      CASE 
        WHEN "customQuestions" IS NULL THEN 0
        WHEN json_typeof("customQuestions"::json) = 'array' THEN json_array_length("customQuestions"::json)
        WHEN json_typeof("customQuestions"::json) = 'object' AND ("customQuestions"::json)->>'url' IS NOT NULL THEN "questionsCount"
        ELSE 0
      END as "customQuestionsCount"
    FROM "mock_tests"
    ORDER BY "orderIndex" ASC
  `;

  // Group tests by testSeriesId
  const testsBySeries: Record<string, any[]> = {};
  mockTests.forEach((t: any) => {
    if (!testsBySeries[t.testSeriesId]) {
      testsBySeries[t.testSeriesId] = [];
    }

    const customQuestionsCount = t.customQuestionsCount !== undefined && t.customQuestionsCount !== null
      ? Number(t.customQuestionsCount)
      : 0;

    testsBySeries[t.testSeriesId].push({
      id: t.id,
      title: t.title,
      titleHi: t.titleHi || '',
      questionsCount: t.questionsCount,
      durationMinutes: t.durationMinutes,
      maxMarks: t.maxMarks,
      isPremium: t.requiredTierName !== 'None',
      requiredTier: t.requiredTierName,
      customQuestionsCount,
      hasSectionalTiming: t.hasSectionalTiming ?? false,
      sectionalTimings: t.sectionalTimings ?? null,
      lockSectionOnSubmit: t.lockSectionOnSubmit ?? false,
      testbookTotalUsers: t.testbookTotalUsers ?? 0,
      testbookTopperScore: t.testbookTopperScore ?? 0.0,
      testbookAverageScore: t.testbookAverageScore ?? 0.0,
      testbookCutoffScore: t.testbookCutoffScore ?? 0.0,
      positiveMarks: t.positiveMarks ?? 2.0,
      negativeMarks: t.negativeMarks ?? 0.5,
      orderIndex: t.orderIndex ?? 0,
    });
  });

  // Group testSeries by examId
  const seriesByExam: Record<string, any[]> = {};
  testSeries.forEach((ts: any) => {
    if (!seriesByExam[ts.examId]) {
      seriesByExam[ts.examId] = [];
    }
    const tests = testsBySeries[ts.id] || [];
    tests.sort((a: any, b: any) => {
      const ordA = a.orderIndex ?? 0;
      const ordB = b.orderIndex ?? 0;
      if (ordA !== ordB) return ordA - ordB;
      return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
    });

    seriesByExam[ts.examId].push({
      id: ts.id,
      name: ts.title,
      nameHi: ts.titleHi || '',
      titleHi: ts.titleHi || '',
      orderIndex: ts.orderIndex ?? 0,
      tests,
    });
  });

  // Group exams by categoryId
  const examsByCat: Record<string, any[]> = {};
  exams.forEach((exam: any) => {
    if (!examsByCat[exam.categoryId]) {
      examsByCat[exam.categoryId] = [];
    }
    const subSubCategories = seriesByExam[exam.id] || [];
    const tests = subSubCategories.flatMap((ss: any) => ss.tests);

    examsByCat[exam.categoryId].push({
      id: exam.id,
      name: exam.name,
      nameHi: exam.nameHi || '',
      orderIndex: exam.orderIndex ?? 0,
      subSubCategories,
      tests,
    });
  });

  // Assemble full examCatalog
  return categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    nameHi: cat.nameHi || '',
    logoUrl: cat.logoUrl || null,
    orderIndex: cat.orderIndex ?? 0,
    isPopular: cat.isPopular ?? false,
    isPracticeSeries: cat.isPracticeSeries ?? false,
    description: cat.description ?? '',
    countText: cat.countText ?? '',
    subCategories: examsByCat[cat.id] || [],
  }));
}

// ---------------------------------------------------------------------------
// Standalone handler: re-fetch the full catalog without seeding
// ---------------------------------------------------------------------------
async function handleRefreshCatalog() {
  try {
    catalogCache.examCatalog = null;
    catalogCache.noticesList = null;
    const examCatalog = await getCompiledExamCatalog();
    return NextResponse.json({ success: true, examCatalog });
  } catch (error: any) {
    console.error('Refresh catalog compilation error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

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
    await prisma.notice.upsert({ where: { id: n.id }, update: {}, create: n });
  }

  // Seed Categories, Exams, MockTests
  const catalog = [
    {
      id: 'ssc',
      name: 'SSC Exams',
      isPopular: true,
      description: 'SSC CGL, CHSL, MTS, GD Constable',
      countText: '45+ Tests',
      subCategories: [
        {
          id: 'ssc_cgl',
          name: 'SSC CGL Exams',
          subSubCategories: [
            {
              id: 'ssc_cgl_tier1_series',
              name: 'SSC CGL Tier-I Test Series',
              tests: [
                { id: 'ssc_cgl_tier1', title: 'SSC CGL 2026 - Combined Graduate Level (Tier-I) Exam', questionsCount: 100, durationMinutes: 60, maxMarks: 200, requiredTier: 'None' }
              ]
            },
            {
              id: 'ssc_cgl_tier2_series',
              name: 'SSC CGL Tier-II Test Series',
              tests: [
                { id: 'ssc_cgl_tier2_mock', title: 'SSC CGL 2026 - Combined Graduate Level (Tier-II) Exam', questionsCount: 150, durationMinutes: 120, maxMarks: 300, requiredTier: 'Testbook Pass Pro' }
              ]
            }
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
      isPopular: true,
      description: 'RRB NTPC, Group D, ALP',
      countText: '30+ Tests',
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
      isPopular: true,
      description: 'Paper 1 & Paper 2 CS/Arts',
      countText: '15+ Tests',
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
      isPopular: true,
      description: 'CTET Paper 1, Paper 2, State TET',
      countText: '20+ Tests',
      subCategories: [
        {
          id: 'ctet_paper1_exams',
          name: 'CTET Paper-I Exams',
          tests: [
            { id: 'ctet_paper1', title: 'CTET 2026 Paper-I (Primary Class I-V) Mock Paper', questionsCount: 150, durationMinutes: 150, maxMarks: 150, requiredTier: 'Testbook Pass' }
          ]
        },
        {
          id: 'ctet_paper2_exams',
          name: 'CTET Paper-II Exams',
          tests: [
            { id: 'ctet_paper2', title: 'CTET 2026 Paper-II (Mathematics & Science)', questionsCount: 150, durationMinutes: 150, maxMarks: 150, requiredTier: 'Testbook Pass' }
          ]
        }
      ]
    },
    {
      id: 'state_exams',
      name: 'All State Exams',
      isPopular: true,
      description: 'UPPSC, BSSC, MPSC, RAS',
      countText: '35+ Tests',
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
      isPopular: true,
      description: 'SBI PO, Clerk, IBPS PO, Clerk',
      countText: '40+ Tests',
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
    },
    {
      id: 'upsc',
      name: 'UPSC CSE Exams',
      isPopular: true,
      description: 'IAS, IPS, IFS, Civil Services GS',
      countText: '50+ Tests',
      subCategories: [
        {
          id: 'upsc_prelims',
          name: 'UPSC Prelims Exams',
          tests: [
            { id: 'upsc_prelims_mock', title: 'UPSC Civil Services Prelims Mock Test', questionsCount: 100, durationMinutes: 120, maxMarks: 200, requiredTier: 'Testbook Pass Pro' }
          ]
        }
      ]
    },
    {
      id: 'defence',
      name: 'Defence Exams',
      isPopular: true,
      description: 'NDA, CDS, AFCAT, CAPF',
      countText: '25+ Tests',
      subCategories: [
        {
          id: 'defence_exams',
          name: 'Defence Mock Exams',
          tests: [
            { id: 'nda_mock', title: 'NDA General Ability Practice Test', questionsCount: 120, durationMinutes: 150, maxMarks: 300, requiredTier: 'Testbook Pass' }
          ]
        }
      ]
    },
    {
      id: 'engineering',
      name: 'Engineering Exams',
      isPopular: true,
      description: 'GATE, AE/JE Civil/Mech/EE',
      countText: '40+ Tests',
      subCategories: [
        {
          id: 'gate_cs',
          name: 'GATE Computer Science',
          tests: [
            { id: 'gate_cs_mock', title: 'GATE CS & IT Mock Exam', questionsCount: 65, durationMinutes: 180, maxMarks: 100, requiredTier: 'Testbook Pass Pro' }
          ]
        }
      ]
    },
    {
      id: 'mba',
      name: 'MBA Entrance Exams',
      isPopular: true,
      description: 'CAT, XAT, SNAP, NMAT',
      countText: '15+ Tests',
      subCategories: [
        {
          id: 'mba_exams',
          name: 'MBA Entrance Exams',
          tests: [
            { id: 'cat_mock', title: 'CAT Quantitative & Verbal Mock Test', questionsCount: 66, durationMinutes: 120, maxMarks: 198, requiredTier: 'Testbook Pass Pro' }
          ]
        }
      ]
    }
  ];

  for (const c of catalog) {
    // Use upsert so re-seeding is idempotent (safe to run multiple times)
    const cat = await prisma.category.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        isPopular: c.isPopular ?? false,
        description: c.description ?? '',
        countText: c.countText ?? '',
      },
      create: { 
        id: c.id, 
        name: c.name,
        isPopular: c.isPopular ?? false,
        description: c.description ?? '',
        countText: c.countText ?? '',
      },
    });

    for (const sub of c.subCategories) {
      await prisma.exam.upsert({
        where: { id: sub.id },
        update: {},
        create: { id: sub.id, categoryId: cat.id, name: sub.name },
      });

      if ((sub as any).subSubCategories) {
        for (const ssub of (sub as any).subSubCategories) {
          const series = await prisma.testSeries.upsert({
            where: { id: ssub.id },
            update: {},
            create: { id: ssub.id, examId: sub.id, title: ssub.name },
          });

          for (const t of ssub.tests) {
            await prisma.mockTest.upsert({
              where: { id: t.id },
              update: {},
              create: {
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
      } else {
        const seriesId = sub.id + '_series';
        const series = await prisma.testSeries.upsert({
          where: { id: seriesId },
          update: {},
          create: { id: seriesId, examId: sub.id, title: sub.name + ' Series' },
        });

        for (const t of (sub as any).tests) {
          await prisma.mockTest.upsert({
            where: { id: t.id },
            update: {},
            create: {
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
      role: 'TEST_CREATOR' as const,
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
    },
    {
      id: 'u5',
      candidateCode: 'CGL_4044',
      fullName: 'Support Agent',
      email: 'support@example.com',
      mobile: '9111222333',
      referralCode: 'TB-SUPPORT-4044',
      referredBy: null,
      referralsCount: 0,
      role: 'SUPPORT_TEAM' as const,
      subscriptionTier: 'None',
      subscriptionPurchasedAt: null,
      subscriptionExpiresAt: null,
      passwordHash: 'password123',
      isBlocked: false,
    },
    {
      id: 'u6',
      candidateCode: 'CGL_5055',
      fullName: 'Notices Manager',
      email: 'notices@example.com',
      mobile: '9222333444',
      referralCode: 'TB-NOTICES-5055',
      referredBy: null,
      referralsCount: 0,
      role: 'NOTICES_MANAGER' as const,
      subscriptionTier: 'None',
      subscriptionPurchasedAt: null,
      subscriptionExpiresAt: null,
      passwordHash: 'password123',
      isBlocked: false,
    }
  ];

  for (const user of initialUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
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
    await prisma.userTestSession.upsert({
      where: { id: session.id },
      update: {},
      create: {
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
        where: { userId, sender: { in: ['STUDENT', 'USER'] }, isRead: false },
        data: { isRead: true }
      });
    } else {
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
      sender: msg.sender === 'ADMIN' ? 'ADMIN' : 'STUDENT',
      message: msg.message,
      isRead: Boolean(msg.isRead),
      createdAt: msg.createdAt.toISOString()
    }))
  });
}

async function handleSendSupportMessage(data: any) {
  const { userId, sender, message } = data;
  if (!userId || !message) {
    return NextResponse.json({ success: false, error: 'Required fields: userId, message' }, { status: 400 });
  }

  const actualSender = (sender === 'ADMIN' ? 'ADMIN' : 'STUDENT');

  const msg = await prisma.supportMessage.create({
    data: {
      userId,
      sender: actualSender,
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
    select: {
      id: true,
      fullName: true,
      email: true,
      candidateCode: true,
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
    name: u.fullName || ('User ' + u.id.slice(0, 6)),
    email: u.email || 'No email',
    candidateCode: u.candidateCode || null,
    lastMessage: u.supportMessages[0] ? {
      id: u.supportMessages[0].id,
      message: u.supportMessages[0].message,
      createdAt: u.supportMessages[0].createdAt.toISOString(),
      sender: u.supportMessages[0].sender,
      isRead: u.supportMessages[0].isRead
    } : null,
    unseenCount: u._count.supportMessages
  })).sort((a, b) => {
    // Sort users with unseen messages first, then by last message time, then alphabetically
    if (a.unseenCount !== b.unseenCount) return b.unseenCount - a.unseenCount;
    const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    if (dateA !== dateB) return dateB - dateA;
    return a.name.localeCompare(b.name);
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

async function handleGetUserDetails(data: any) {
  const { userId } = data;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  // EGRESS-OPT: Fetch recent sessions WITHOUT question responses.
  // This action is called on every tab focus switch — loading all responses (thousands of rows)
  // on each tab switch was a massive recurring egress cost. Responses are loaded on-demand
  // when the user opens a specific test analysis screen (via get-session-responses).
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      testSessions: {
        take: 30, // EGRESS-OPT: Only most recent 30 sessions for list/history view
        include: {
          mockTest: {
            select: {
              title: true,
              maxMarks: true,
              durationMinutes: true,
              positiveMarks: true,
              negativeMarks: true,
            }
          },
          // EGRESS-OPT: responses: true REMOVED — was fetching 100s of rows per session on every tab switch
        },
        orderBy: { startedAt: 'desc' },
      },
    },
  });

  if (!u) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  const mappedUser = {
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
    password: u.passwordHash,
    bookmarkedQuestions: u.bookmarkedQuestions ? (u.bookmarkedQuestions as any) : [],
    trackedJobs: u.trackedJobs ? (u.trackedJobs as any) : [],
    // EGRESS-OPT: sessions mapped WITHOUT responses (responses = {} always empty here)
    testSessions: u.testSessions.map((session: any) => {
      return {
        id: session.id,
        testId: session.mockTestId,
        title: session.mockTest?.title || 'Mock Test',
        score: session.finalScore ?? 0,
        maxScore: session.mockTest?.maxMarks ?? 200,
        accuracy: session.accuracyPercentage ?? 0,
        durationMinutes: session.mockTest?.durationMinutes || 60,
        durationSeconds: session.timeSpentSeconds,
        status: session.status,
        violations: session.violationsCount,
        date: session.startedAt.toISOString().split('T')[0],
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt ? session.completedAt.toISOString() : null,
        createdAt: session.createdAt ? session.createdAt.toISOString() : session.startedAt.toISOString(),
        updatedAt: (session.completedAt || session.startedAt || session.createdAt).toISOString(),
        responses: {}, // Loaded on-demand via get-session-responses when opening analysis
        timeRemaining: session.remainingSeconds,
        currentSectionIndex: session.currentSectionIndex,
        currentQuestionIndex: session.currentQuestionIndex,
        testbookRank: session.testbookRank ?? null,
        testbookPercentile: session.testbookPercentile ?? null,
        positiveMarks: session.mockTest?.positiveMarks ?? null,
        negativeMarks: session.mockTest?.negativeMarks ?? null,
      };
    }),
  };

  return NextResponse.json({ success: true, user: mappedUser });
}

async function handleAdminData(data: any) {
  const { userId } = data;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized: No User ID provided' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user || user.role === 'STUDENT') {
    return NextResponse.json({ success: false, error: 'Unauthorized access' }, { status: 403 });
  }

  // Fetch all users list WITHOUT sessions (sessions loaded lazily per user to avoid timeout)
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Map users to UI model format (testSessions is [] at bootstrap; loaded on demand)
  const usersList = users.map((u: any) => ({
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
    password: u.passwordHash,
    bookmarkedQuestions: u.bookmarkedQuestions ? (u.bookmarkedQuestions as any) : [],
    lastSeen: u.lastSeen ? u.lastSeen.toISOString() : null,
    lastPlatform: u.lastPlatform || 'web',
    testSessions: [], // Loaded lazily via get-user-details action
  }));

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
    reportedQuestionsList,
  });
}



// -----------------------------------------------------------------------------
// Email OTP Password Reset Handlers
// -----------------------------------------------------------------------------

async function handleRequestPasswordReset(data: { email: string }) {
  const { email } = data;
  if (!email || !email.trim()) {
    return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Verify that the user exists in our DB first
  const user = await prisma.user.findUnique({
    where: { email: trimmedEmail }
  });
  if (!user) {
    return NextResponse.json({ success: false, error: 'No account found with this email address.' }, { status: 404 });
  }

  // Generate a random 6-digit OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiry to 10 minutes from now
  const expiresAt = Date.now() + 10 * 60 * 1000;

  // Store in cache
  otpCache.set(trimmedEmail, { code: otpCode, expiresAt });

  // Send the email
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'MockTest Support <mocktesthubsupport@gmail.com>',
      to: trimmedEmail,
      subject: 'MockTest Hub - Password Reset OTP',
      text: `Your OTP for password reset is: ${otpCode}. It is valid for 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your MockTest Hub account.</p>
          <p>Please use the following One-Time Password (OTP) to complete the reset:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f3f4f6; padding: 10px 20px; display: inline-block; border-radius: 5px; margin: 10px 0; color: #2563eb; letter-spacing: 2px;">
            ${otpCode}
          </div>
          <p>This OTP is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: 'OTP sent successfully.' });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send OTP email.' }, { status: 500 });
  }
}

async function handleConfirmPasswordReset(data: any) {
  const { email, otp, newPassword } = data;

  if (!email || !otp || !newPassword) {
    return NextResponse.json({ success: false, error: 'Email, OTP, and new password are required' }, { status: 400 });
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Retrieve cached OTP details
  const cachedOtp = otpCache.get(trimmedEmail);

  if (!cachedOtp) {
    return NextResponse.json({ success: false, error: 'OTP expired or not found. Please request a new one.' }, { status: 400 });
  }

  if (Date.now() > cachedOtp.expiresAt) {
    otpCache.delete(trimmedEmail);
    return NextResponse.json({ success: false, error: 'OTP has expired. Please request a new one.' }, { status: 400 });
  }

  if (cachedOtp.code !== otp.trim()) {
    return NextResponse.json({ success: false, error: 'Invalid OTP code.' }, { status: 400 });
  }

  try {
    // Update password in the database
    await prisma.user.update({
      where: { email: trimmedEmail },
      data: { passwordHash: newPassword }
    });

    // Clear OTP from cache after successful verification
    otpCache.delete(trimmedEmail);

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    console.error('Database update error during password reset:', error);
    return NextResponse.json({ success: false, error: 'Failed to reset password.' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Test Attempt Logs Handler
// -----------------------------------------------------------------------------

async function handleGetAttempts() {
  try {
    if ((prisma as any).userTestSession) {
      const attempts = await (prisma as any).userTestSession.findMany({
        take: 200,
        orderBy: { startedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              candidateCode: true,
              mobile: true,
            },
          },
          mockTest: {
            select: {
              id: true,
              title: true,
              maxMarks: true,
              testSeries: {
                select: {
                  id: true,
                  title: true,
                  exam: {
                    select: {
                      id: true,
                      name: true,
                      category: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  }
                }
              }
            },
          },
        },
      });
      return NextResponse.json({ success: true, attempts });
    }

    // Fail-safe Raw SQL Fallback
    const rawSessions: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        uts.id, uts."userId", uts."mockTestId", uts.status, uts."startedAt", uts."completedAt",
        uts."remainingSeconds", uts."violationsCount", uts."finalScore", uts."accuracyPercentage",
        uts."timeSpentSeconds", uts.source, uts."createdAt",
        json_build_object(
          'id', u.id,
          'fullName', u."fullName",
          'email', u.email,
          'candidateCode', u."candidateCode",
          'mobile', u.mobile
        ) as user,
        json_build_object(
          'id', mt.id,
          'title', mt.title,
          'maxMarks', mt."maxMarks",
          'testSeries', json_build_object(
            'id', ts.id,
            'title', ts.title,
            'exam', json_build_object(
              'id', e.id,
              'name', e.name
            )
          )
        ) as "mockTest"
      FROM user_test_sessions uts
      LEFT JOIN users u ON uts."userId" = u.id
      LEFT JOIN mock_tests mt ON uts."mockTestId" = mt.id
      LEFT JOIN test_series ts ON mt."testSeriesId" = ts.id
      LEFT JOIN exams e ON ts."examId" = e.id
      ORDER BY uts."startedAt" DESC
    `);

    return NextResponse.json({ success: true, attempts: rawSessions });
  } catch (error: any) {
    console.error('Error fetching test attempts:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch test attempts' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Suggestion Box Handlers
// -----------------------------------------------------------------------------

async function handleSubmitSuggestion(data: any) {
  const { userId, name, email, category, message, source } = data || {};
  if (!message || !message.trim()) {
    return NextResponse.json({ success: false, error: 'Suggestion message is required' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const uId = userId || null;
  const sName = name ? name.trim() : '';
  const sEmail = email ? email.trim() : '';
  const sCat = category ? category.trim() : 'General';
  const sMsg = message.trim();
  const sStatus = 'PENDING';
  const sSource = source ? source.trim() : 'web';

  try {
    if ((prisma as any).suggestion) {
      const suggestion = await (prisma as any).suggestion.create({
        data: {
          id,
          userId: uId,
          name: sName,
          email: sEmail,
          category: sCat,
          message: sMsg,
          status: sStatus,
          source: sSource,
        },
      });
      return NextResponse.json({ success: true, suggestion });
    }

    // Fail-safe Raw SQL Fallback
    await prisma.$executeRawUnsafe(
      `INSERT INTO suggestions (id, "userId", name, email, category, message, status, source, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      id, uId, sName, sEmail, sCat, sMsg, sStatus, sSource
    );

    return NextResponse.json({
      success: true,
      suggestion: { id, userId: uId, name: sName, email: sEmail, category: sCat, message: sMsg, status: sStatus, source: sSource, createdAt: new Date() }
    });
  } catch (error: any) {
    console.error('Error saving suggestion:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to submit suggestion' }, { status: 500 });
  }
}

async function handleGetSuggestions() {
  try {
    if ((prisma as any).suggestion) {
      const suggestions = await (prisma as any).suggestion.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ success: true, suggestions });
    }

    // Fail-safe Raw SQL Fallback
    const suggestions: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM suggestions ORDER BY "createdAt" DESC`
    );

    return NextResponse.json({ success: true, suggestions });
  } catch (error: any) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch suggestions' }, { status: 500 });
  }
}

async function handleUpdateSuggestionStatus(data: any) {
  const { id, status, adminReply } = data || {};
  if (!id) {
    return NextResponse.json({ success: false, error: 'Suggestion ID is required' }, { status: 400 });
  }

  try {
    if ((prisma as any).suggestion) {
      const suggestion = await (prisma as any).suggestion.update({
        where: { id },
        data: {
          ...(status ? { status } : {}),
          ...(adminReply !== undefined ? { adminReply } : {}),
        },
      });
      return NextResponse.json({ success: true, suggestion });
    }

    // Fail-safe Raw SQL Fallback
    if (status && adminReply !== undefined) {
      await prisma.$executeRawUnsafe(`UPDATE suggestions SET status = $1, "adminReply" = $2 WHERE id = $3`, status, adminReply, id);
    } else if (status) {
      await prisma.$executeRawUnsafe(`UPDATE suggestions SET status = $1 WHERE id = $2`, status, id);
    } else if (adminReply !== undefined) {
      await prisma.$executeRawUnsafe(`UPDATE suggestions SET "adminReply" = $1 WHERE id = $2`, adminReply, id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating suggestion status:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update suggestion status' }, { status: 500 });
  }
}

async function handleDeleteSuggestion(data: any) {
  const { id } = data || {};
  if (!id) {
    return NextResponse.json({ success: false, error: 'Suggestion ID is required' }, { status: 400 });
  }

  try {
    if ((prisma as any).suggestion) {
      await (prisma as any).suggestion.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // Fail-safe Raw SQL Fallback
    await prisma.$executeRawUnsafe(`DELETE FROM suggestions WHERE id = $1`, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting suggestion:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete suggestion' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Document Locker Handlers (Google Drive Sync Metadata)
// -----------------------------------------------------------------------------

async function handleLockerGetDocs(data: any, requesterUserId: string | null) {
  const userId = data?.userId || requesterUserId;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        isLockerConnected: true,
        googleDriveEmail: true,
        googleDriveFolderId: true,
        lockerPin: true,
        lockerPinSetAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const documents = await (prisma as any).lockerDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      user,
      documents: documents || [],
    });
  } catch (error: any) {
    console.error('Error fetching locker documents:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch locker documents' }, { status: 500 });
  }
}

async function handleLockerSaveMeta(data: any, requesterUserId: string | null) {
  const userId = data?.userId || requesterUserId;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  const {
    title,
    docType,
    examName,
    year,
    driveFileId,
    driveFolderId,
    driveViewUrl,
    driveDownloadUrl,
    thumbnailUrl,
    mimeType,
    fileSizeBytes,
    tags,
  } = data || {};

  if (!title || !driveFileId) {
    return NextResponse.json({ success: false, error: 'Title and Google Drive File ID are required' }, { status: 400 });
  }

  try {
    const doc = await (prisma as any).lockerDocument.create({
      data: {
        userId,
        title: title.trim(),
        docType: docType || 'OTHER',
        examName: examName ? examName.trim() : null,
        year: year ? parseInt(year, 10) : null,
        driveFileId,
        driveFolderId: driveFolderId || null,
        driveViewUrl: driveViewUrl || null,
        driveDownloadUrl: driveDownloadUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        mimeType: mimeType || 'application/octet-stream',
        fileSizeBytes: fileSizeBytes ? parseInt(fileSizeBytes, 10) : 0,
        tags: tags || null,
      },
    });

    // Ensure isLockerConnected is set on user
    await prisma.user.update({
      where: { id: userId },
      data: {
        isLockerConnected: true,
        ...(driveFolderId ? { googleDriveFolderId: driveFolderId } : {}),
      },
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error: any) {
    console.error('Error saving locker document metadata:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to save document metadata' }, { status: 500 });
  }
}

async function handleLockerDeleteDoc(data: any, requesterUserId: string | null) {
  const { docId, userId: explicitUserId } = data || {};
  const userId = explicitUserId || requesterUserId;

  if (!docId) {
    return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 });
  }

  try {
    const existing = await (prisma as any).lockerDocument.findUnique({
      where: { id: docId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    if (userId && existing.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized to delete this document' }, { status: 403 });
    }

    await (prisma as any).lockerDocument.delete({
      where: { id: docId },
    });

    return NextResponse.json({ success: true, deletedDocId: docId });
  } catch (error: any) {
    console.error('Error deleting locker document:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete locker document' }, { status: 500 });
  }
}

async function handleLockerUpdateDriveStatus(data: any, requesterUserId: string | null) {
  const userId = data?.userId || requesterUserId;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  const { isConnected, googleDriveEmail, googleDriveFolderId } = data || {};

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isLockerConnected: isConnected !== undefined ? Boolean(isConnected) : true,
        ...(googleDriveEmail !== undefined ? { googleDriveEmail } : {}),
        ...(googleDriveFolderId !== undefined ? { googleDriveFolderId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isLockerConnected: true,
        googleDriveEmail: true,
        googleDriveFolderId: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error updating locker drive status:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update drive status' }, { status: 500 });
  }
}

async function handleLockerDisconnectDrive(data: any, requesterUserId: string | null) {
  const userId = data?.userId || requesterUserId;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isLockerConnected: false,
        googleDriveEmail: null,
        googleDriveFolderId: null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isLockerConnected: true,
        googleDriveEmail: true,
        googleDriveFolderId: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error disconnecting Google Drive:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to disconnect Google Drive' }, { status: 500 });
  }
}

async function handleLockerSetPin(data: any, requesterUserId: string | null) {
  const userId = data?.userId || requesterUserId;
  const pin = (data?.pin || '').toString().trim();

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ success: false, error: 'PIN must be exactly 4 digits (0-9).' }, { status: 400 });
  }

  try {
    try {
      const updatedUser = await (prisma.user as any).update({
        where: { id: userId },
        data: {
          lockerPin: pin,
          lockerPinSetAt: new Date(),
        },
        select: {
          id: true,
          lockerPin: true,
          lockerPinSetAt: true,
        },
      });

      return NextResponse.json({ success: true, message: 'Locker PIN set successfully', user: updatedUser });
    } catch (prismaErr: any) {
      // Fallback in case in-memory Prisma client has stale schema cache
      const now = new Date();
      await prisma.$executeRaw`UPDATE "users" SET "lockerPin" = ${pin}, "lockerPinSetAt" = ${now} WHERE "id" = ${userId}`;
      return NextResponse.json({
        success: true,
        message: 'Locker PIN set successfully',
        user: { id: userId, lockerPin: pin, lockerPinSetAt: now },
      });
    }
  } catch (error: any) {
    console.error('Error setting locker PIN:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to set locker PIN' }, { status: 500 });
  }
}

async function handleLockerVerifyPin(data: any, requesterUserId: string | null) {
  const userId = data?.userId || requesterUserId;
  const pin = (data?.pin || '').toString().trim();

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  try {
    let userLockerPin: string | null = null;
    try {
      const user = await (prisma.user as any).findUnique({
        where: { id: userId },
        select: { id: true, lockerPin: true },
      });
      userLockerPin = user?.lockerPin || null;
    } catch {
      const rawRows: any[] = await prisma.$queryRaw`SELECT "lockerPin" FROM "users" WHERE "id" = ${userId} LIMIT 1`;
      userLockerPin = rawRows[0]?.lockerPin || null;
    }

    if (!userLockerPin) {
      return NextResponse.json({ success: false, error: 'No PIN is set for this account.' }, { status: 404 });
    }

    const isMatch = userLockerPin === pin;
    return NextResponse.json({ success: true, isCorrect: isMatch });
  } catch (error: any) {
    console.error('Error verifying locker PIN:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to verify PIN' }, { status: 500 });
  }
}

async function handleLockerChangePin(data: any, requesterUserId: string | null) {
  const userId = data?.userId || requesterUserId;
  const oldPin = (data?.oldPin || '').toString().trim();
  const newPin = (data?.newPin || '').toString().trim();

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }
  if (!/^\d{4}$/.test(oldPin)) {
    return NextResponse.json({ success: false, error: 'Current PIN must be exactly 4 digits.' }, { status: 400 });
  }
  if (!/^\d{4}$/.test(newPin)) {
    return NextResponse.json({ success: false, error: 'New PIN must be exactly 4 digits.' }, { status: 400 });
  }

  try {
    let userLockerPin: string | null = null;
    try {
      const user = await (prisma.user as any).findUnique({
        where: { id: userId },
        select: { id: true, lockerPin: true },
      });
      userLockerPin = user?.lockerPin || null;
    } catch {
      const rawRows: any[] = await prisma.$queryRaw`SELECT "lockerPin" FROM "users" WHERE "id" = ${userId} LIMIT 1`;
      userLockerPin = rawRows[0]?.lockerPin || null;
    }

    if (!userLockerPin) {
      return NextResponse.json({ success: false, error: 'No PIN is set for this account.' }, { status: 404 });
    }

    if (userLockerPin !== oldPin) {
      return NextResponse.json({ success: false, error: 'Current PIN is incorrect. Please verify and try again.' }, { status: 400 });
    }

    const now = new Date();
    try {
      const updatedUser = await (prisma.user as any).update({
        where: { id: userId },
        data: {
          lockerPin: newPin,
          lockerPinSetAt: now,
        },
        select: {
          id: true,
          lockerPin: true,
          lockerPinSetAt: true,
        },
      });
      return NextResponse.json({ success: true, message: 'Security PIN updated successfully', user: updatedUser });
    } catch {
      await prisma.$executeRaw`UPDATE "users" SET "lockerPin" = ${newPin}, "lockerPinSetAt" = ${now} WHERE "id" = ${userId}`;
      return NextResponse.json({
        success: true,
        message: 'Security PIN updated successfully',
        user: { id: userId, lockerPin: newPin, lockerPinSetAt: now },
      });
    }
  } catch (error: any) {
    console.error('Error changing locker PIN:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to change locker PIN' }, { status: 500 });
  }
}

async function handleLockerResetPinWithPassword(data: any, requesterUserId: string | null) {
  const userId = data?.userId || requesterUserId;
  const accountPassword = (data?.accountPassword || '').toString();
  const newPin = (data?.newPin || '').toString().trim();

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  if (!accountPassword) {
    return NextResponse.json({ success: false, error: 'Account password is required for verification.' }, { status: 400 });
  }

  if (!/^\d{4}$/.test(newPin)) {
    return NextResponse.json({ success: false, error: 'New PIN must be exactly 4 digits (0-9).' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    if (user.passwordHash !== accountPassword) {
      return NextResponse.json({ success: false, error: 'Incorrect account password. Verification failed.' }, { status: 401 });
    }

    try {
      const updatedUser = await (prisma.user as any).update({
        where: { id: userId },
        data: {
          lockerPin: newPin,
          lockerPinSetAt: new Date(),
        },
        select: {
          id: true,
          lockerPin: true,
          lockerPinSetAt: true,
        },
      });

      return NextResponse.json({ success: true, message: 'Locker PIN reset successfully', user: updatedUser });
    } catch {
      const now = new Date();
      await prisma.$executeRaw`UPDATE "users" SET "lockerPin" = ${newPin}, "lockerPinSetAt" = ${now} WHERE "id" = ${userId}`;
      return NextResponse.json({
        success: true,
        message: 'Locker PIN reset successfully',
        user: { id: userId, lockerPin: newPin, lockerPinSetAt: now },
      });
    }
  } catch (error: any) {
    console.error('Error resetting locker PIN with password:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to reset PIN' }, { status: 500 });
  }
}

async function handleLockerSendResetOtp(data: any, requesterUserId: string | null) {
  const userId = data?.userId || requesterUserId;

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        googleDriveEmail: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    // Target email: prefer Google Drive email if connected; fallback to account email
    const targetEmail = (user.googleDriveEmail || user.email || '').trim().toLowerCase();
    if (!targetEmail) {
      return NextResponse.json({ success: false, error: 'No valid email address found for sending OTP.' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save to user record in DB
    await prisma.user.update({
      where: { id: userId },
      data: {
        otpCode: otp,
        otpExpiresAt: expiresAt,
      },
    });

    // Send email via nodemailer
    const mailOptions = {
      from: process.env.SMTP_FROM || `"MockTest Hub Security" <${process.env.SMTP_USER || 'support@mocktesthub.com'}>`,
      to: targetEmail,
      subject: `🔐 ${otp} is your Document Locker PIN Reset OTP - MockTest Hub`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; background-color: #8b5cf6; border-radius: 12px; line-height: 48px; color: #ffffff; font-size: 24px;">🔒</div>
            <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 20px;">Document Locker PIN Reset</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">MockTest Hub Exam Vault & Google Drive Security</p>
          </div>
          
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">Hello <strong>${user.fullName || 'Student'}</strong>,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">
            You requested to reset your 4-digit Security PIN for your Document Locker connected to <strong>${user.googleDriveEmail || user.email}</strong>.
          </p>

          <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
            <span style="display: block; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Your 6-Digit Reset OTP</span>
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #7c3aed; font-family: monospace;">${otp}</span>
            <span style="display: block; font-size: 11px; color: #94a3b8; margin-top: 6px;">Valid for 10 minutes only</span>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
            If you did not request this OTP, please ignore this email. Your Document Locker files and credentials remain completely secure.
          </p>
          
          <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 11px;">
            © ${new Date().getFullYear()} MockTest Hub. All rights reserved.
          </div>
        </div>
      `,
    };

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await transporter.sendMail(mailOptions);
      } else {
        console.log(`[DEV OTP NOTIFICATION] Locker Reset OTP for ${targetEmail}: ${otp}`);
      }
    } catch (mailErr: any) {
      console.warn('Mail send failed, logged in console for testing:', mailErr?.message);
    }

    // Mask target email for secure display (e.g. ma*****@gmail.com)
    const [localPart, domain] = targetEmail.split('@');
    const maskedLocal = localPart.length > 2 
      ? localPart.slice(0, 2) + '*'.repeat(Math.max(3, localPart.length - 2)) 
      : localPart + '***';
    const maskedEmail = `${maskedLocal}@${domain || 'gmail.com'}`;

    return NextResponse.json({
      success: true,
      maskedEmail,
      isGoogleDriveEmail: !!user.googleDriveEmail,
      message: `OTP sent successfully to ${maskedEmail}`,
    });
  } catch (error: any) {
    console.error('Error sending locker reset OTP:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}

async function handleLockerVerifyOtpAndResetPin(data: any, requesterUserId: string | null) {
  const userId = data?.userId || requesterUserId;
  const otp = (data?.otp || '').toString().trim();
  const newPin = (data?.newPin || '').toString().trim();

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  if (!otp || !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ success: false, error: 'Please enter a valid 6-digit OTP code.' }, { status: 400 });
  }

  if (!newPin || !/^\d{4}$/.test(newPin)) {
    return NextResponse.json({ success: false, error: 'New PIN must be exactly 4 digits (0-9).' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        otpCode: true,
        otpExpiresAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    if (!user.otpCode) {
      return NextResponse.json({ success: false, error: 'No active OTP found. Please request a new OTP.' }, { status: 400 });
    }

    if (user.otpCode !== otp) {
      return NextResponse.json({ success: false, error: 'Incorrect OTP. Please check your email and try again.' }, { status: 401 });
    }

    if (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt)) {
      return NextResponse.json({ success: false, error: 'OTP has expired. Please request a new OTP.' }, { status: 400 });
    }

    // OTP Verified! Update user PIN and clear OTP
    try {
      const updatedUser = await (prisma.user as any).update({
        where: { id: userId },
        data: {
          lockerPin: newPin,
          lockerPinSetAt: new Date(),
          otpCode: null,
          otpExpiresAt: null,
        },
        select: {
          id: true,
          lockerPin: true,
          lockerPinSetAt: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'PIN reset successfully! Your new 4-digit PIN is now active.',
        user: updatedUser,
      });
    } catch {
      const now = new Date();
      await prisma.$executeRaw`UPDATE "users" SET "lockerPin" = ${newPin}, "lockerPinSetAt" = ${now}, "otpCode" = NULL, "otpExpiresAt" = NULL WHERE "id" = ${userId}`;
      return NextResponse.json({
        success: true,
        message: 'PIN reset successfully! Your new 4-digit PIN is now active.',
        user: { id: userId, lockerPin: newPin, lockerPinSetAt: now },
      });
    }
  } catch (error: any) {
    console.error('Error verifying OTP and resetting PIN:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to reset PIN' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Admin Document Locker Overview & Diagnostics Handlers
// -----------------------------------------------------------------------------

async function handleAdminGetLockerStats() {
  try {
    // 1. Fetch total user count
    const totalUsersCount = await prisma.user.count();

    // 2. Fetch users with locker fields and documents
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        profilePhoto: true,
        role: true,
        candidateCode: true,
        mobile: true,
        isBlocked: true,
        subscriptionTier: true,
        createdAt: true,
        lastSeen: true,
        lastPlatform: true,
        isLockerConnected: true,
        googleDriveEmail: true,
        googleDriveFolderId: true,
        lockerPin: true,
        lockerPinSetAt: true,
        lockerDocuments: {
          select: {
            id: true,
            title: true,
            docType: true,
            examName: true,
            year: true,
            driveFileId: true,
            driveFolderId: true,
            driveViewUrl: true,
            driveDownloadUrl: true,
            thumbnailUrl: true,
            mimeType: true,
            fileSizeBytes: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Compute aggregate analytics
    let connectedUsersCount = 0;
    let pinSetUsersCount = 0;
    let totalDocsCount = 0;
    let totalStorageBytes = 0;

    const docTypeCounts: Record<string, number> = {
      PHOTO: 0,
      SIGNATURE: 0,
      ADMIT_CARD: 0,
      APPLICATION_FORM: 0,
      CERTIFICATE: 0,
      ID_PROOF: 0,
      OTHER: 0,
    };

    const examCounts: Record<string, number> = {};
    const recentUploads: any[] = [];

    const enrichedUsers = users.map((u) => {
      const hasDriveConnected = Boolean(u.isLockerConnected || u.googleDriveEmail);
      const hasPin = Boolean(u.lockerPin);
      const userDocs = u.lockerDocuments || [];
      const userDocsCount = userDocs.length;
      const userStorageBytes = userDocs.reduce((acc, d) => acc + (d.fileSizeBytes || 0), 0);

      if (hasDriveConnected) connectedUsersCount++;
      if (hasPin) pinSetUsersCount++;
      totalDocsCount += userDocsCount;
      totalStorageBytes += userStorageBytes;

      const userTypeBreakdown: Record<string, number> = {};

      userDocs.forEach((d) => {
        const type = d.docType || 'OTHER';
        docTypeCounts[type] = (docTypeCounts[type] || 0) + 1;
        userTypeBreakdown[type] = (userTypeBreakdown[type] || 0) + 1;

        if (d.examName && d.examName.trim()) {
          const ex = d.examName.trim();
          examCounts[ex] = (examCounts[ex] || 0) + 1;
        }

        recentUploads.push({
          ...d,
          userName: u.fullName || 'Candidate',
          userEmail: u.email,
          userId: u.id,
          candidateCode: u.candidateCode,
          googleDriveEmail: u.googleDriveEmail || u.email,
        });
      });

      const { lockerPin, ...safeUser } = u;

      return {
        ...safeUser,
        hasDriveConnected,
        hasPinSet: hasPin,
        docsCount: userDocsCount,
        totalSizeBytes: userStorageBytes,
        docTypeSummary: userTypeBreakdown,
        lastUploadAt: userDocs[0]?.createdAt || null,
      };
    });

    // Sort recent uploads by createdAt desc and take top 50
    recentUploads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const topRecentUploads = recentUploads.slice(0, 50);

    // Top exams formatted
    const topExams = Object.entries(examCounts)
      .map(([examName, count]) => ({ examName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const stats = {
      totalUsersCount,
      connectedUsersCount,
      adoptionRate: totalUsersCount > 0 ? ((connectedUsersCount / totalUsersCount) * 100).toFixed(1) : '0.0',
      pinSetUsersCount,
      totalDocsCount,
      totalStorageBytes,
      totalStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
      docTypeCounts,
      topExams,
      recentUploads: topRecentUploads,
      users: enrichedUsers,
    };

    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error('Error fetching admin locker stats:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch locker statistics' }, { status: 500 });
  }
}

async function handleAdminDeleteLockerDoc(data: any) {
  const { docId } = data || {};
  if (!docId) {
    return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 });
  }
  try {
    await (prisma as any).lockerDocument.delete({
      where: { id: docId },
    });
    return NextResponse.json({ success: true, deletedDocId: docId });
  } catch (error: any) {
    console.error('Error deleting locker document by admin:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete document' }, { status: 500 });
  }
}

async function handleAdminDisconnectUserLocker(data: any) {
  const { userId } = data || {};
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isLockerConnected: false,
        googleDriveEmail: null,
        googleDriveFolderId: null,
      },
    });
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error disconnecting user locker by admin:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to disconnect user locker' }, { status: 500 });
  }
}




