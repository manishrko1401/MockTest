import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { prismaTyping } from '../../lib/prismaTyping';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { 
  isDisposableEmail, 
  isHoneypotTriggered,
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
  deleteAllTypingTests,
  invalidateTypingCache,
  saveTypingAttempt,
  getUserTypingAttempts,
  evaluateTyping
} from '../../lib/typingStore';

// Persistent OTP Cache in global to survive Next.js dev server hot-reloads
import {
  AUTH_COOKIE,
  readCookie,
  authCookie,
  getRequester,
  createWebSession,
  revokeWebSession,
  revokeAllWebSessions,
  hashPassword,
  verifyPassword,
  isPasswordHash,
} from '../../lib/serverAuth';
import { PLANNER_ACTIONS, handlePlannerAction } from '../../lib/planner';
import { ROOM_ACTIONS, handleRoomAction } from '../../lib/friendRooms';
import { FRIEND_ACTIONS, handleFriendAction } from '../../lib/friends';
import { generateExamSession } from '../../lib/examUtils';
import { notifyStaff, studentLabel, shorten } from '../../lib/adminPush';
import { hitLimit, clearLimit, countHits } from '../../lib/dbRateLimit';
import { sanitizeNoticeHtml } from '../../lib/sanitizeNotice';
import { INTEGRITY_ACTIONS, handleIntegrityAction, recordIntegrity, TimelineRow } from '../../lib/integrity';
import { PLATFORM_ACTIONS, handlePlatformAction, classifyPlatform, recordPlatform, isAndroidAppRequest } from '../../lib/platformUsage';
import { analyzeAttempt, countWords } from '../../lib/integrityRules';
import { unstable_cache } from 'next/cache';
import { CATALOG_TAG, NOTICES_TAG, CATALOG_REVALIDATE_S, NOTICES_REVALIDATE_S, invalidateShared } from '../../lib/sharedCache';
import { scoreSession, scoreCbat, isCbatTest, isRpscRasTest, stripAnswers, ScoreResult } from '../../lib/examScoring';

// -----------------------------------------------------------------------------
// Who may call each action (see ACCESS CONTROL in POST). Not listed = refused.
// -----------------------------------------------------------------------------
type ActionAccess =
  | { level: 'public'; optionalIdentity?: boolean }
  | { level: 'user'; staffOnBehalf?: string[] }
  | { level: 'staff'; roles: string[] };

const CONTENT_ROLES = ['TEST_CREATOR'];
const SUPPORT_ROLES = ['SUPPORT_TEAM'];
const NOTICE_ROLES = ['NOTICES_MANAGER'];

const ACTION_ACCESS: Record<string, ActionAccess> = {
  // Public
  'login': { level: 'public' },
  'signup': { level: 'public' },
  'google-auth': { level: 'public' },
  'logout': { level: 'public' },
  'request-password-reset': { level: 'public' },
  'confirm-password-reset': { level: 'public' },
  'bootstrap': { level: 'public' },
  'catalog-sync': { level: 'public' },
  'get-tests-by-series': { level: 'public' },
  'get-custom-questions': { level: 'public', optionalIdentity: true },
  'test-access': { level: 'public', optionalIdentity: true },
  'get-single-notice-content': { level: 'public' },
  'get-typing-categories': { level: 'public', optionalIdentity: true },
  'get-typing-passages': { level: 'public' },
  'get-typing-tests': { level: 'public', optionalIdentity: true },
  'get-typing-test-by-id': { level: 'public', optionalIdentity: true },
  'evaluate-typing': { level: 'public' },
  'ping': { level: 'public', optionalIdentity: true },
  'submit-suggestion': { level: 'public', optionalIdentity: true },
  'report-question': { level: 'public', optionalIdentity: true },

  // Logged-in user, own account
  'get-user-details': { level: 'user' },
  'update-profile': { level: 'user' },
  'update-password': { level: 'user' },
  'update-tracked-jobs': { level: 'user' },
  'claim-pass-pro': { level: 'user' },
  'complete-tour': { level: 'user' },
  'toggle-bookmark': { level: 'user' },
  'add-attempt': { level: 'user' },
  'offline-download': { level: 'user' },
  'offline-bookmarks': { level: 'user' },
  'save-exam-progress': { level: 'user' },
  'get-exam-progress': { level: 'user' },
  'save-ongoing-session': { level: 'user' },
  'clear-ongoing-session': { level: 'user' },
  'get-session-responses': { level: 'user' },
  'save-practice-attempt': { level: 'user' },
  'get-practice-attempts': { level: 'user' },
  'get-referred-friends': { level: 'user' },
  'save-typing-attempt': { level: 'user' },
  'get-user-typing-attempts': { level: 'user' },
  'get-typing-attempt-by-id': { level: 'user' },
  'get-support-messages': { level: 'user', staffOnBehalf: SUPPORT_ROLES },
  'get-unread-support-count': { level: 'user', staffOnBehalf: SUPPORT_ROLES },
  'send-support-message': { level: 'user', staffOnBehalf: SUPPORT_ROLES },
  'locker-get-docs': { level: 'user' },
  'locker-save-meta': { level: 'user' },
  'locker-delete-doc': { level: 'user' },
  'locker-update-drive-status': { level: 'user' },
  'locker-disconnect-drive': { level: 'user' },
  'locker-set-pin': { level: 'user' },
  'locker-verify-pin': { level: 'user' },
  'locker-change-pin': { level: 'user' },
  'locker-reset-pin-with-password': { level: 'user' },
  'locker-send-reset-otp': { level: 'user' },
  'locker-verify-otp-and-reset-pin': { level: 'user' },
  // Study Planner (app/lib/planner.ts)
  ...Object.fromEntries(PLANNER_ACTIONS.map(a => [a, { level: 'user' } as ActionAccess])),
  // Test with Friends (app/lib/friendRooms.ts)
  ...Object.fromEntries(ROOM_ACTIONS.map(a => [a, { level: 'user' } as ActionAccess])),
  ...Object.fromEntries(FRIEND_ACTIONS.map(a => [a, { level: 'user' } as ActionAccess])),

  // Staff: ADMIN only
  'admin-data': { level: 'staff', roles: [...SUPPORT_ROLES, ...CONTENT_ROLES, ...NOTICE_ROLES] }, // non-admins get a reduced list
  // Exam integrity review (app/lib/integrity.ts): admins only
  ...Object.fromEntries(INTEGRITY_ACTIONS.map(a => [a, { level: 'staff', roles: [] } as ActionAccess])),
  ...Object.fromEntries(PLATFORM_ACTIONS.map(a => [a, { level: 'staff', roles: [] } as ActionAccess])),
  'save-profile-admin': { level: 'staff', roles: [] },
  'reset-attempt': { level: 'staff', roles: [] },
  'reset-referrals': { level: 'staff', roles: [] },
  'get-attempts': { level: 'staff', roles: [] },
  'get-session-analysis': { level: 'staff', roles: [] },
  'db-stats': { level: 'staff', roles: [] },
  'delete-all-typing-tests': { level: 'staff', roles: [] },
  'delete-reported-question': { level: 'staff', roles: [] },

  // Staff: test content
  'add-category': { level: 'staff', roles: CONTENT_ROLES },
  'create-category': { level: 'staff', roles: CONTENT_ROLES },
  'edit-category': { level: 'staff', roles: CONTENT_ROLES },
  'delete-category': { level: 'staff', roles: CONTENT_ROLES },
  'add-subcategory': { level: 'staff', roles: CONTENT_ROLES },
  'edit-subcategory': { level: 'staff', roles: CONTENT_ROLES },
  'delete-subcategory': { level: 'staff', roles: CONTENT_ROLES },
  'add-subsubcategory': { level: 'staff', roles: CONTENT_ROLES },
  'edit-subsubcategory': { level: 'staff', roles: CONTENT_ROLES },
  'delete-subsubcategory': { level: 'staff', roles: CONTENT_ROLES },
  'add-mocktest': { level: 'staff', roles: CONTENT_ROLES },
  'edit-mocktest-title': { level: 'staff', roles: CONTENT_ROLES },
  'delete-mocktest': { level: 'staff', roles: CONTENT_ROLES },
  'save-section-rules': { level: 'staff', roles: CONTENT_ROLES },
  'save-custom-questions': { level: 'staff', roles: CONTENT_ROLES },
  'bulk-import-questions': { level: 'staff', roles: CONTENT_ROLES },
  'reorder-categories': { level: 'staff', roles: CONTENT_ROLES },
  'reorder-subcategories': { level: 'staff', roles: CONTENT_ROLES },
  'reorder-subsubcategories': { level: 'staff', roles: CONTENT_ROLES },
  'reorder-mocktests': { level: 'staff', roles: CONTENT_ROLES },
  'refresh-catalog': { level: 'staff', roles: [...CONTENT_ROLES, ...NOTICE_ROLES] },
  'create-typing-category': { level: 'staff', roles: CONTENT_ROLES },
  'edit-typing-category': { level: 'staff', roles: CONTENT_ROLES },
  'delete-typing-category': { level: 'staff', roles: CONTENT_ROLES },
  'create-typing-passage': { level: 'staff', roles: CONTENT_ROLES },
  'edit-typing-passage': { level: 'staff', roles: CONTENT_ROLES },
  'delete-typing-passage': { level: 'staff', roles: CONTENT_ROLES },
  'create-typing-test': { level: 'staff', roles: CONTENT_ROLES },
  'create-bulk-typing-tests': { level: 'staff', roles: CONTENT_ROLES },
  'edit-typing-test': { level: 'staff', roles: CONTENT_ROLES },
  'delete-typing-test': { level: 'staff', roles: CONTENT_ROLES },
  'clear-typing-cache': { level: 'staff', roles: CONTENT_ROLES },
  'get-admin-typing-attempts': { level: 'staff', roles: CONTENT_ROLES },
  'delete-typing-attempt': { level: 'staff', roles: CONTENT_ROLES },

  // Staff: support
  'get-support-users': { level: 'staff', roles: SUPPORT_ROLES },
  'delete-support-conversation': { level: 'staff', roles: SUPPORT_ROLES },
  'edit-support-message': { level: 'staff', roles: SUPPORT_ROLES },
  'get-suggestions': { level: 'staff', roles: SUPPORT_ROLES },
  'update-suggestion-status': { level: 'staff', roles: SUPPORT_ROLES },
  'delete-suggestion': { level: 'staff', roles: SUPPORT_ROLES },
  'admin-get-locker-stats': { level: 'staff', roles: SUPPORT_ROLES },
  'admin-delete-locker-doc': { level: 'staff', roles: SUPPORT_ROLES },
  'admin-disconnect-user-locker': { level: 'staff', roles: SUPPORT_ROLES },

  // Staff: notices
  'add-notice': { level: 'staff', roles: NOTICE_ROLES },
  'edit-notice': { level: 'staff', roles: NOTICE_ROLES },
  'delete-notice': { level: 'staff', roles: NOTICE_ROLES },
};

function actionAccess(action: string): ActionAccess | null {
  return Object.prototype.hasOwnProperty.call(ACTION_ACCESS, action) ? ACTION_ACCESS[action] : null;
}

/** A request from a web browser (they always send Origin / Sec-Fetch-* on POST; the apps do not). */
function isBrowserRequest(request: Request): boolean {
  return !!(request.headers.get('origin') || request.headers.get('sec-fetch-mode') || request.headers.get('sec-fetch-site'));
}

/** Drops the old-app session id from a user object sent to a browser. */
async function withoutAppSession(res: Response): Promise<Response> {
  try {
    const json = await res.clone().json();
    if (!json?.user || !('currentSessionId' in json.user)) return res;
    const { currentSessionId, ...user } = json.user;
    void currentSessionId;
    const out = NextResponse.json({ ...json, user }, { status: res.status });
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') out.headers.append(key, value);
      else if (key.toLowerCase() !== 'content-length' && key.toLowerCase() !== 'content-type') out.headers.set(key, value);
    });
    return out;
  } catch {
    return res;
  }
}

/** Account fields that must never leave the server. */
function stripSecrets<T extends Record<string, any>>(u: T): T {
  if (!u || typeof u !== 'object') return u;
  const { password, passwordHash, ...rest } = u as any;
  if ('lockerPin' in rest) rest.lockerPin = rest.lockerPin ? 'set' : null; // the page only needs to know a PIN exists
  return rest;
}

// Persistent Exam Catalog and Notices Cache to survive Next.js dev server hot-reloads
// 5-minute TTL with instant invalidation on write actions
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
let schemaPatched = false;

const catalogCache: { examCatalog: any; noticesList: any; noticesLastFetched: number | null; etag?: string | null } = 
  (global as any).catalogCache && (global as any).catalogCache.noticesLastFetched !== undefined
    ? (global as any).catalogCache
    : { examCatalog: null, noticesList: null, noticesLastFetched: null, etag: null };
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

// In-Memory Throttle Cache for User Presence (updates DB at most once per 2 minutes per user,
// or straight away when the platform changes)
const lastSeenCache = new Map<string, { at: number; platform: string | null }>();

/** platform: 'web_desktop' | 'web_mobile' | 'windows' | 'android', or null to keep the last one. */
async function touchUserLastSeen(userId?: string, platform?: string | null): Promise<void> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) return;
  const now = Date.now();
  const last = lastSeenCache.get(userId);
  const platformChanged = !!platform && platform !== last?.platform;

  if (!last || platformChanged || now - last.at > 2 * 60 * 1000) {
    lastSeenCache.set(userId, { at: now, platform: platform || last?.platform || null }); // so concurrent calls don't double-write
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeen: new Date(), ...(platform ? { lastPlatform: platform } : {}) },
        select: { id: true }, // EGRESS-OPT: don't send the whole user row back
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
    const { action } = body;
    let data = body.data;

    if (!action) {
      return NextResponse.json({ success: false, error: 'No action provided' }, { status: 400 });
    }

    // Lazy / Action-Based Online Presence Tracking
    // Extract userId from any position in the request body
    // =========================================================================
    // ACCESS CONTROL. Every action has an access level; anything not listed is refused.
    //   public  — anyone (login, catalog, public content)
    //   user    — a logged-in user, acting on their own account (data.userId is set to
    //             theirs). ADMIN may act on any account; SUPPORT_TEAM on support chats.
    //   staff   — the staff roles listed for the action (ADMIN always included)
    // Who is calling comes only from getRequester() (login cookie / app session id);
    // user ids sent by the client are never trusted.
    // =========================================================================
    const ACCESS = actionAccess(action);
    if (!ACCESS) {
      return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
    }

    const requester = ACCESS.level === 'public' && !ACCESS.optionalIdentity ? null : await getRequester(request, body);
    const requesterUserId: string | null = requester?.id || null;
    const requesterRole = requester?.role || null;
    const isRequesterAdmin = requesterRole === 'ADMIN';

    if (requester && action !== 'ping') {
      // Other requests keep "last seen" fresh; only the ping (and the Android app's own client) say which platform
      touchUserLastSeen(requester.id, isAndroidAppRequest(request) ? 'android' : null); // not awaited
    }

    if (ACCESS.level !== 'public' && !requester) {
      return NextResponse.json({ success: false, error: 'Please log in again.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    if (ACCESS.level === 'staff') {
      const allowed = isRequesterAdmin || (!!requesterRole && ACCESS.roles.includes(requesterRole));
      if (!allowed) {
        console.warn(`Blocked staff action ${action} by ${requesterUserId} (${requesterRole})`);
        return NextResponse.json({ success: false, error: 'Forbidden: you do not have access to this.' }, { status: 403 });
      }
    }

    if (ACCESS.level === 'user') {
      if (!data || typeof data !== 'object') data = {};
      const targetUserId = data.userId ?? body?.userId;
      const actingForOther = targetUserId && targetUserId !== requesterUserId;
      const mayActForOthers = isRequesterAdmin || (!!requesterRole && (ACCESS.staffOnBehalf || []).includes(requesterRole));
      if (actingForOther && !mayActForOthers) {
        console.warn(`Blocked ${action} targeting ${targetUserId} by ${requesterUserId}`);
        return NextResponse.json({ success: false, error: 'Forbidden: Unauthorized action' }, { status: 403 });
      }
      if (!targetUserId) data.userId = requesterUserId;
    }

    // Fields that give staff powers inside a handler are honoured only for staff
    const isSupportStaff = isRequesterAdmin || requesterRole === 'SUPPORT_TEAM';
    if (data && typeof data === 'object') {
      if (action === 'send-support-message' && !isSupportStaff) data.sender = 'STUDENT';
      if (action === 'get-support-messages' && !isSupportStaff) delete data.readerRole;
      // Reports and suggestions are filed under the caller's own account (or anonymously)
      if (action === 'report-question' || action === 'submit-suggestion') data.userId = requesterUserId || null;
    }

    // Public forms: limited per account / IP (each one also notifies staff), long text cut
    if (action === 'report-question' || action === 'submit-suggestion') {
      const who = requesterUserId || `ip:${getClientIp(request)}`;
      const limit = await hitLimit(`${action}:${who}`, requesterUserId ? 30 : 10, 60 * 60 * 1000);
      if (!limit.allowed) {
        return NextResponse.json({ success: false, error: `Too many messages. Please try again in ${limit.retryAfterMinutes} minutes.` }, { status: 429 });
      }
      if (!data || typeof data !== 'object') data = {};
      for (const [key, max] of [['message', 3000], ['questionText', 5000], ['name', 100], ['email', 254], ['category', 60], ['mockTestTitle', 300], ['mockTestId', 100], ['questionId', 100], ['candidateCode', 40], ['source', 20]] as const) {
        if (typeof data[key] === 'string') data[key] = data[key].slice(0, max);
        else if (data[key] !== undefined && data[key] !== null) data[key] = String(data[key]).slice(0, max);
      }
    }

    if (action === 'ping') {
      if (requester) {
        const seen = classifyPlatform(request, { ...(body || {}), ...(data && typeof data === 'object' ? data : {}) });
        await Promise.all([touchUserLastSeen(requester.id, seen.platform), recordPlatform(requester.id, seen)]);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'logout') {
      await revokeWebSession(readCookie(request, AUTH_COOKIE)).catch(() => {});
      // Android app: its own login token
      const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
      if (bearer) await revokeWebSession(bearer).catch(() => {});
      const res = NextResponse.json({ success: true });
      res.headers.append('Set-Cookie', authCookie(null));
      return res;
    }

    // Successful sign-in: start a website login session (HttpOnly cookie)
    if (action === 'login' || action === 'signup' || action === 'google-auth') {
      const res = action === 'login' ? await handleLogin(data, request)
        : action === 'signup' ? await handleSignup(data, request)
        : await handleGoogleAuth(data, request);
      try {
        const json = await res.clone().json();
        if (json?.success && json.user?.id) {
          // Android app: a login token of its own (sent back as "Authorization: Bearer"), one per
          // phone, so signing in on the phone never signs the website out
          if (data?.client === 'android-app') {
            return NextResponse.json({ ...json, authToken: await createWebSession(json.user.id, request) }, { status: res.status });
          }
          await revokeWebSession(readCookie(request, AUTH_COOKIE)).catch(() => {});
          res.headers.append('Set-Cookie', authCookie(await createWebSession(json.user.id, request)));
        }
      } catch (err) {
        console.error('Failed to start login session:', err);
      }
      return isBrowserRequest(request) ? await withoutAppSession(res) : res;
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
        catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
        catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);
        catalogCache.etag = null;
      }
    }

    if ((PLANNER_ACTIONS as readonly string[]).includes(action)) {
      return await handlePlannerAction(action, data);
    }

    if ((PLATFORM_ACTIONS as readonly string[]).includes(action)) {
      return await handlePlatformAction(action, data);
    }
    if ((INTEGRITY_ACTIONS as readonly string[]).includes(action)) {
      return await handleIntegrityAction(action, data, requester!.id);
    }

    if ((FRIEND_ACTIONS as readonly string[]).includes(action)) {
      return await handleFriendAction(action, data, requester!);
    }

    if ((ROOM_ACTIONS as readonly string[]).includes(action)) {
      return await handleRoomAction(action, data, requester!, {
        loadTestQuestions: (testId: string) => loadTestQuestions(testId),
        getCatalog: async () => catalogCache.examCatalog || await getCompiledExamCatalog(),
        tierAllows,
      });
    }

    switch (action) {
      case 'request-password-reset':
        return await handleRequestPasswordReset(data, request);
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
        // Keeps this device signed in (website cookie or Android app token); others are signed out
        return await handleUpdatePassword(data, readCookie(request, AUTH_COOKIE) || request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1] || null);
      case 'claim-pass-pro':
        return await handleClaimPassPro(data, requesterUserId, isRequesterAdmin);
      case 'save-profile-admin':
        return await handleSaveProfileAdmin(data, requesterUserId, !!readCookie(request, AUTH_COOKIE));
      case 'toggle-bookmark':
        return await handleToggleBookmark(data);
      case 'add-attempt':
        return await handleAddAttempt(data, request);
      case 'save-exam-progress':
        return await handleSaveExamProgress(data);
      case 'get-exam-progress':
        return await handleGetExamProgress(data);
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
      case 'offline-download':
        return await handleOfflineDownload(data, requester!);
      case 'offline-bookmarks':
        return await handleOfflineBookmarks(data, requester!);
      case 'test-access':
        return await handleTestAccess(data, requester);
      case 'get-custom-questions':
        return await handleGetCustomQuestions(data || body, requester, request);
      case 'reorder-categories':
        return await handleReorderCategories(data);
      case 'reorder-subcategories':
        return await handleReorderSubCategories(data);
      case 'reorder-subsubcategories':
        return await handleReorderSubSubCategories(data);
      case 'reorder-mocktests':
        return await handleReorderMockTests(data);
      case 'report-question': {
        const res = await handleReportQuestion(data);
        if (res.ok) notifyStaff('report', async () => ({
          title: `Question reported${data?.mockTestTitle ? ` · ${shorten(data.mockTestTitle, 60)}` : ''}`,
          body: `${await studentLabel(data?.userId, 'Visitor')}: ${shorten(data?.message || '')}`,
          data: { screen: 'reports' },
        }));
        return res;
      }
      case 'delete-reported-question':
        return await handleDeleteReportedQuestion(data);
      case 'get-support-messages':
        return await handleGetSupportMessages(data);
      case 'get-unread-support-count':
        return await handleGetUnreadSupportCount(data);
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
      case 'get-user-details': {
        const res = await handleGetUserDetails(data, requesterUserId);
        return isBrowserRequest(request) ? await withoutAppSession(res) : res;
      }
      case 'complete-tour':
        return await handleCompleteTour(data, requesterUserId);
      case 'get-session-responses':
        return await handleGetSessionResponses(data);
      case 'admin-data':
        return await handleAdminData(requesterRole);
      case 'get-attempts':
        return await handleGetAttempts();
      case 'get-session-analysis':
        return await handleGetAdminSessionAnalysis(data || body);
      case 'submit-suggestion': {
        const res = await handleSubmitSuggestion(data);
        if (res.ok) notifyStaff('suggestion', () => ({
          title: `New suggestion · ${shorten(data?.category || 'General', 40)}`,
          body: `${shorten(data?.name || 'Visitor', 40)}: ${shorten(data?.message || '')}`,
          data: { screen: 'suggestions' },
        }));
        return res;
      }
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
      // Categories set Inactive in the admin panel are hidden from the website (with their tests).
      // Staff see everything when the admin panel asks for it (includeInactive).
      case 'get-typing-categories': {
        const all = await getTypingCategories();
        const showInactive = !!data?.includeInactive && (isRequesterAdmin || requesterRole === 'TEST_CREATOR');
        return NextResponse.json({ success: true, categories: showInactive ? all : all.filter(c => c.isActive !== false) });
      }
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

      case 'get-typing-tests': {
        const catId = data?.categoryId || body?.categoryId;
        const isLight = data?.light !== undefined ? Boolean(data.light) : true;
        const allTests = await getTypingTests({ categoryId: catId, light: isLight });
        const allCategories = await getTypingCategories();
        const showInactive = !!data?.includeInactive && (isRequesterAdmin || requesterRole === 'TEST_CREATOR');
        if (showInactive) return NextResponse.json({ success: true, tests: allTests, categories: allCategories });
        const categories = allCategories.filter(c => c.isActive !== false);
        const activeIds = new Set(categories.map(c => c.id));
        const tests = allTests.filter(t => activeIds.has(t.categoryId));
        return NextResponse.json({ success: true, tests, categories });
      }
      case 'get-typing-test-by-id': {
        const test = await getTypingTestById(data?.id || body?.id);
        // A test whose category is Inactive can't be opened from the website (staff still can)
        if (test && !(isRequesterAdmin || (requesterRole && requesterRole !== 'STUDENT'))) {
          const category = (await getTypingCategories()).find(c => c.id === test.categoryId);
          if (category && category.isActive === false) {
            return NextResponse.json({ success: false, error: 'This typing test is not available.' }, { status: 404 });
          }
        }
        return NextResponse.json({ success: true, test });
      }
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
      case 'delete-all-typing-tests':
        return NextResponse.json({ success: true, result: await deleteAllTypingTests() });
      case 'clear-typing-cache':
        invalidateTypingCache();
        return NextResponse.json({ success: true, message: 'Typing cache cleared' });

      case 'save-typing-attempt':
        return NextResponse.json({ success: true, attempt: await saveTypingAttempt(data || body?.attempt || body) });
      case 'get-user-typing-attempts':
        return NextResponse.json({ success: true, attempts: await getUserTypingAttempts(data?.userId || body?.userId || requesterUserId || undefined, data?.testId || body?.testId || undefined) });
      case 'get-typing-attempt-by-id':
        return await handleGetTypingAttemptById(data?.id || body?.id || data?.attemptId || body?.attemptId, requesterUserId, isRequesterAdmin || requesterRole === 'TEST_CREATOR');
      case 'get-admin-typing-attempts':
        return await handleGetAdminTypingAttempts(data || body);
      case 'delete-typing-attempt':
        return await handleDeleteTypingAttempt(data?.id || body?.id);
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
            data?.test || data?.category || data?.isSsc || body?.test || body?.category || body?.isSsc,
            Boolean(data?.isSscCgl || body?.isSscCgl),
            Boolean(data?.isSscChsl || body?.isSscChsl),
            Boolean(data?.isAiims || body?.isAiims),
            data?.language || body?.language || 'en',
            data?.userCategoryChoice || body?.userCategoryChoice
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


/**
 * The catalog as sent to browsers and apps: an exam's own `tests` list is left out when it
 * is just its series' tests again (it was every test twice, about half of the download).
 * The website rebuilds it (expandCatalog in AuthContext); the Android app reads both lists.
 */
function slimCatalog(catalog: any[]): any[] {
  return (catalog || []).map((cat: any) => ({
    ...cat,
    subCategories: (cat.subCategories || []).map((sub: any) => {
      const inSeries = new Set<string>();
      for (const ss of sub.subSubCategories || []) for (const t of ss.tests || []) inSeries.add(t.id);
      const tests = sub.tests || [];
      if (!tests.length || !tests.every((t: any) => inSeries.has(t.id))) return sub;
      const { tests: _dropped, ...rest } = sub;
      void _dropped;
      return rest;
    }),
  }));
}

/** The notices list sent with bootstrap (no notice bodies). Shared across server instances. */
async function buildBootstrapNotices() {
  const NOTICE_CATEGORIES = ['result', 'admit_card', 'answer_key', 'notice'] as const;
  const noticeSelect = {
    id: true, title: true, titleHi: true, date: true, publishDate: true,
    type: true, category: true, url: true, rawUrl: true, lastDate: true, imageUrl: true,
  };

  const [announcementNotices, ...categoryNotices] = await Promise.all([
    // Always fetch ALL announcements (they are permanent banners, not time-bounded)
    prisma.notice.findMany({
      where: { category: 'announcement' },
      orderBy: { createdAt: 'desc' },
      select: noticeSelect,
    }),
    // 60 most recent per category, fetched independently so none can starve the others
    ...NOTICE_CATEGORIES.map(category =>
      prisma.notice.findMany({
        where: { category },
        orderBy: { createdAt: 'desc' },
        take: 60,
        select: noticeSelect,
      })
    ),
  ]);
  const regularNotices = categoryNotices.flat();

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
  return noticesList;
}

const readSharedNotices = unstable_cache(buildBootstrapNotices, ['bootstrap-notices-v1'], {
  tags: [NOTICES_TAG], revalidate: NOTICES_REVALIDATE_S,
});

async function handleBootstrap(req?: Request) {
  // PERF: Use memory cache if populated and fresh (30 min TTL — catalog changes only via admin)
  // Generate a deterministic ETag from the cache timestamp so clients can skip re-fetching.
  const isNoticesCacheFresh = catalogCache.noticesLastFetched && (Date.now() - catalogCache.noticesLastFetched < 30 * 60 * 1000);
  if (catalogCache.examCatalog && catalogCache.examCatalog.length > 0 && catalogCache.noticesList && isNoticesCacheFresh) {
    const etag = catalogCache.etag || `"cat-${catalogCache.noticesLastFetched}"`;
    // PERF: If client sends matching ETag, return 304 — zero egress for catalog data
    const clientETag = req?.headers?.get('If-None-Match');
    if (clientETag && clientETag === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { 'ETag': etag, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=1800' }
      });
    }
    return NextResponse.json(
      { success: true, usersList: [], noticesList: catalogCache.noticesList, examCatalog: slimCatalog(catalogCache.examCatalog), reportedQuestionsList: [] },
      { headers: { 'ETag': etag, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=1800' } }
    );
  }

  // Cache miss: make sure the database has been seeded (cheap count, only on a cold cache)
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
        passwordHash: 'disabled_' + crypto.randomUUID(), // no usable password
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
        passwordHash: 'disabled_' + crypto.randomUUID(), // no usable password
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
        passwordHash: 'disabled_' + crypto.randomUUID(), // no usable password
      }
    });
  }


  // Fetch all users list is now disabled in public bootstrap to reduce egress and fix security vulnerability.
  // Admins will fetch this data separately using the 'admin-data' action.
  const usersList: any[] = [];

  // EGRESS-OPT: Fetch Notices with a PER-CATEGORY cap, not one shared pool.
  //   - Announcements: ALL of them (no limit) — permanent home-page banner items that must
  //     always be returned regardless of how much other content has synced since.
  //   - Result / Admit Card / Answer Key / Notice(Jobs): each capped independently at 60.
  // Categories sync at very different volumes (Jobs alone can post 10x what Result does in
  // a day), so a single shared "100 most recent across all categories" pool lets the highest-
  // volume category crowd every other one out entirely — that's exactly what happened here:
  // a bulk backfill assigned Jobs rows a later createdAt than everything else, and the shared
  // top-100 query returned zero Result/Admit Card/Answer Key notices as a result. Capping each
  // category on its own guarantees every tab always has content, independent of sync timing.
  const noticesList = await readSharedNotices();

  // Fetch Exam Catalog using optimized memory assembler
  const examCatalog = await getCompiledExamCatalog();

  // Populate cache. The ETag is a hash of the content, so every server instance
  // returns the same tag for the same data and browsers get 304s across instances.
  catalogCache.examCatalog = examCatalog;
  catalogCache.noticesList = noticesList;
  catalogCache.noticesLastFetched = Date.now();
  catalogCache.etag = `"cat2-${crypto.createHash('sha1').update(JSON.stringify([noticesList, examCatalog])).digest('base64url').slice(0, 27)}"`;

  // Fetch Reported Questions is now disabled in public bootstrap.
  // Admins will fetch this data separately using the 'admin-data' action.
  const reportedQuestionsList: any[] = [];

  // PERF: Generate ETag from cache timestamp for conditional GET support.
  // Clients that send a matching If-None-Match receive 304 (zero body = zero egress).
  const freshETag = catalogCache.etag || `"cat-${catalogCache.noticesLastFetched ?? Date.now()}"`;
  const clientETag = req?.headers?.get('If-None-Match');
  if (clientETag && clientETag === freshETag) {
    return new NextResponse(null, {
      status: 304,
      headers: { 'ETag': freshETag, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=1800' }
    });
  }

  return NextResponse.json(
    { success: true, usersList, noticesList, examCatalog: slimCatalog(examCatalog), reportedQuestionsList },
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
    // EGRESS-OPT: Cap first-time sync per-category (not one shared top-100 pool) — same
    // reasoning as the web bootstrap: Jobs syncs at a much higher volume than Result/Admit
    // Card/Answer Key, so a single shared "most recent" pool lets Jobs crowd the others out
    // of a fresh install's first sync entirely.
    const noticeSelect = {
      id: true, title: true, titleHi: true, date: true, publishDate: true,
      type: true, category: true, url: true, rawUrl: true, lastDate: true, imageUrl: true,
    };
    const noticeCategoryLists = await Promise.all(
      ['announcement', 'result', 'admit_card', 'answer_key', 'notice'].map(category =>
        prisma.notice.findMany({
          where: { category },
          orderBy: { createdAt: 'desc' },
          take: category === 'announcement' ? undefined : 40,
          select: noticeSelect,
        })
      )
    );
    const notices = noticeCategoryLists.flat();

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
    // EGRESS-OPT: Filter notices by createdAt > since — only transfer new/updated entries.
    // Capped per-category (not one shared pool) so a busy day for Jobs can't push a stale
    // client's Result/Admit Card/Answer Key delta out of a shared top-100 window.
    Promise.all(
      ['announcement', 'result', 'admit_card', 'answer_key', 'notice'].map(category =>
        prisma.notice.findMany({
          where: { category, createdAt: { gt: since } },
          orderBy: { createdAt: 'desc' },
          take: category === 'announcement' ? undefined : 40,
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
        })
      )
    ).then(lists => lists.flat()),
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

// ---- Refer & earn ----
// A friend who signs up with a code and finishes a first mock test using at least 3/4 of its
// time earns REFERRAL_FRIEND_COINS; the owner of the code earns REFERRAL_OWNER_COINS. Once per
// referred account.
const REFERRAL_FRIEND_COINS = 10;
const REFERRAL_OWNER_COINS = 20;
const REFERRAL_MIN_TIME_SHARE = 0.75;

/** A new referral code (MT-XXXX) that no other account has. */
async function newReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, easy to read out
  for (let attempt = 0; attempt < 12; attempt++) {
    const len = attempt < 6 ? 4 : 6;
    let code = 'MT-';
    for (let i = 0; i < len; i++) code += chars[crypto.randomInt(chars.length)];
    const taken = await prisma.user.findFirst({ where: { referralCode: { equals: code, mode: 'insensitive' } }, select: { id: true } });
    if (!taken) return code;
  }
  return `MT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

/** The account a referral code belongs to (any letter case), or null. */
async function findReferrer(code: unknown) {
  const c = typeof code === 'string' ? code.trim() : '';
  if (!c || c.length > 40) return null;
  return prisma.user.findFirst({ where: { referralCode: { equals: c, mode: 'insensitive' } }, select: { id: true, referralCode: true } });
}

/**
 * Credits the referral coins after a finished attempt that used enough of the test's time.
 * Safe against two submits at once: the friend's flag is switched in the same write that adds
 * their coins, so only one request can pay out.
 */
async function creditReferralIfDue(userId: string, timeSpentSeconds: number, durationMinutes: number) {
  const totalSec = Math.max(60, (durationMinutes || 60) * 60);
  if (timeSpentSeconds < totalSec * REFERRAL_MIN_TIME_SHARE) return;
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { referredBy: true, referralCoinsCredited: true } });
  if (!me?.referredBy || me.referralCoinsCredited) return;
  const claimed = await prisma.user.updateMany({
    where: { id: userId, referralCoinsCredited: false },
    data: { coins: { increment: REFERRAL_FRIEND_COINS }, referralCoinsCredited: true },
  });
  if (claimed.count !== 1) return;
  const referrer = await findReferrer(me.referredBy);
  if (referrer && referrer.id !== userId) {
    await prisma.user.update({ where: { id: referrer.id }, data: { coins: { increment: REFERRAL_OWNER_COINS } } });
  }
}

async function handleSignup(data: any, request?: Request) {
  const { name, email, mobile, password, referralCodeInput, turnstileToken } = data;

  if (typeof password !== 'string' || password.trim().length < 6) {
    return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  // 1. Honeypot check: Automated bots fill hidden input fields
  if (isHoneypotTriggered(data)) {
    console.warn('[BOT_PROTECTION] Honeypot triggered during signup attempt. Silently rejecting bot.');
    return NextResponse.json({ success: false, error: 'Registration could not be completed.' }, { status: 400 });
  }

  // 2. IP Rate Limiting: Restrict registration attempts per IP (max 5 signups per 30 minutes)
  const clientIp = request ? getClientIp(request) : '127.0.0.1';
  const signupRate = await hitLimit(`signup_ip:${clientIp}`, 5, 30 * 60 * 1000);
  if (!signupRate.allowed) {
    console.warn(`[BOT_PROTECTION] Rate limit exceeded for signup from IP: ${clientIp}`);
    return NextResponse.json({ 
      success: false, 
      error: `Too many registration attempts from this network. Please try again in ${signupRate.retryAfterMinutes} minutes.` 
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

  // 5. Cloudflare Turnstile Verification. Required for sign-ups from the website (a browser);
  // the apps have no captcha widget and are limited by the IP limit above.
  if (request && isBrowserRequest(request) && (typeof turnstileToken !== 'string' || !turnstileToken)) {
    return NextResponse.json({ success: false, error: 'Please complete the security check.' }, { status: 400 });
  }
  if (typeof turnstileToken === 'string' && turnstileToken) {
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

  // A referral code that was typed must exist (a typo would otherwise lose the reward silently)
  let referrer: Awaited<ReturnType<typeof findReferrer>> = null;
  if (typeof referralCodeInput === 'string' && referralCodeInput.trim() !== '') {
    referrer = await findReferrer(referralCodeInput);
    if (!referrer) {
      return NextResponse.json({ success: false, error: 'This referral code does not exist. Please check it, or leave the box empty.' }, { status: 400 });
    }
  }
  const referralCode = await newReferralCode();
  const referredByCode = referrer?.referralCode ?? null;

  const newSessionId = crypto.randomUUID();
  const newUser = await prisma.user.create({
    data: {
      candidateCode: 'HUB-' + Math.floor(1000 + Math.random() * 9000),
      fullName: name.trim(),
      email: trimmedEmail,
      mobile: mobile.trim(),
      passwordHash: await hashPassword(password),
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
  if (referrer) {
    await prisma.user.update({ where: { id: referrer.id }, data: { referralsCount: { increment: 1 } } }).catch(() => {});
  }

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
      tourCompletedAt: null,
      noticesTourCompletedAt: null,
      testsTourCompletedAt: null,
      typingTourCompletedAt: null,
      lockerTourCompletedAt: null,
      profileTourCompletedAt: null,
      plannerTourCompletedAt: null,
      friendsTourCompletedAt: null,
      testSessions: [],
      bookmarkedQuestions: [],
    },
  });
}
const LOGIN_MAX_WRONG = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

async function handleLogin(data: any, request?: Request) {
  const { email, password } = data || {};
  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ success: false, error: 'Please enter your email address.' }, { status: 400 });
  }
  const trimmedEmail = email.trim().toLowerCase();

  // IP-level rate limiting on login: max 15 attempts per 10 minutes per IP (kept in the
  // database, so every server instance counts the same attempts)
  const clientIp = request ? getClientIp(request) : '127.0.0.1';
  const loginIpRate = await hitLimit(`login_ip:${clientIp}`, 15, 10 * 60 * 1000);
  if (!loginIpRate.allowed) {
    return NextResponse.json({
      success: false,
      error: `Too many login attempts from this network. Please try again in ${loginIpRate.retryAfterMinutes} minutes.`
    }, { status: 429 });
  }

  // 5 wrong passwords lock the account for 15 minutes
  const wrongKey = `login_wrong:${trimmedEmail}`;
  if (await countHits(wrongKey, LOGIN_LOCK_MS) >= LOGIN_MAX_WRONG) {
    return NextResponse.json({
      success: false,
      error: 'Too many failed login attempts. Account locked. Please try again in 15 minutes, or reset your password.'
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
        take: 30, // EGRESS-OPT: recent sessions only; answers load when an analysis opens
        select: SESSION_LIST_SELECT,
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

  if (typeof password !== 'string' || !password || !(await verifyPassword(password, user.passwordHash))) {
    await hitLimit(wrongKey, 1000, LOGIN_LOCK_MS);
    const remaining = LOGIN_MAX_WRONG - await countHits(wrongKey, LOGIN_LOCK_MS);
    if (remaining <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Too many failed login attempts. This account has been locked for 15 minutes.'
      }, { status: 429 });
    }
    return NextResponse.json({
      success: false,
      error: `Invalid password. ${remaining} attempts remaining before account lock.`
    }, { status: 401 });
  }

  // Clear attempts tracker on success
  await clearLimit(wrongKey);

  // Older accounts still hold the plain password: replace it with a hash now. Only in
  // production — dev shares this database with the live site, whose deployed code may
  // not read hashes yet.
  if (process.env.NODE_ENV === 'production' && !isPasswordHash(user.passwordHash)) {
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } }).catch(() => {});
  }

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
    coins: user.coins,
    referralCoinsCredited: user.referralCoinsCredited,
    ...(await readTourFlags(user.id)),
    bookmarkedQuestions: user.bookmarkedQuestions ? (user.bookmarkedQuestions as any) : [],
    trackedJobs: user.trackedJobs ? (user.trackedJobs as any) : [],
    lockerPin: user.lockerPin ? 'set' : null,
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
        // Prefer the attempt-time-accurate maxScore stored on the session itself over
        // mockTest.maxMarks, which is a cached value that can drift out of sync with the
        // real per-question marks (see the maxScore field comment in schema.prisma).
        maxScore: session.maxScore ?? session.mockTest?.maxMarks ?? 200,
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

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '570110856860-a2h946nit7obiguglnjedffflto1oq95.apps.googleusercontent.com';
// The Android app signs in with its own Google OAuth client (package com.mocktesthub)
const GOOGLE_ANDROID_CLIENT_ID = process.env.GOOGLE_ANDROID_CLIENT_ID || '570110856860-vmpk8qihkb834ihj1grthuf3kumc65q6.apps.googleusercontent.com';

// Every OAuth client of our Google Cloud project counts (the app has one client per signing key:
// the website's APK and Google Play's). Client ids start with the project number; only the
// project's owners can create them.
const GOOGLE_PROJECT_NUMBER = process.env.GOOGLE_PROJECT_NUMBER || GOOGLE_CLIENT_ID.split('-')[0];
const isOurGoogleClient = (id: unknown) =>
  typeof id === 'string' && (id === GOOGLE_CLIENT_ID || id === GOOGLE_ANDROID_CLIENT_ID
    || (/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(id) && id.startsWith(`${GOOGLE_PROJECT_NUMBER}-`)));

/** Asks Google who the access token belongs to. Only tokens issued to this site's clients, for a verified email, count. */
async function verifyGoogleAccessToken(accessToken: unknown): Promise<{ email: string } | null> {
  if (typeof accessToken !== 'string' || accessToken.length < 20) return null;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const info = await res.json();
    const issuedToThisSite = isOurGoogleClient(info.aud) || isOurGoogleClient(info.azp);
    if (!issuedToThisSite) console.warn('[google-auth] token from another OAuth client:', info.azp || info.aud);
    const emailVerified = info.email_verified === true || info.email_verified === 'true';
    if (!issuedToThisSite || !emailVerified || typeof info.email !== 'string') return null;
    return { email: info.email };
  } catch {
    return null;
  }
}

async function handleGoogleAuth(data: any, request?: Request) {
  // The email comes from Google (verified token), never from the request body
  const verified = await verifyGoogleAccessToken(data?.accessToken);
  if (!verified) {
    return NextResponse.json({ success: false, error: 'Google sign-in could not be verified. Please try again.' }, { status: 401 });
  }
  const email = verified.email;
  const { name, profilePhoto } = data;

  if (!email || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ success: false, error: 'Valid Google email is required.' }, { status: 400 });
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email: trimmedEmail },
    include: {
      testSessions: {
        take: 30, // EGRESS-OPT: recent sessions only; answers load when an analysis opens
        select: SESSION_LIST_SELECT,
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
          take: 30, // EGRESS-OPT: recent sessions only; answers load when an analysis opens
          select: SESSION_LIST_SELECT,
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
      coins: user.coins,
      referralCoinsCredited: user.referralCoinsCredited,
      ...(await readTourFlags(user.id)),
      profilePhoto: user.profilePhoto,
      bookmarkedQuestions: user.bookmarkedQuestions ? (user.bookmarkedQuestions as any) : [],
      trackedJobs: user.trackedJobs ? (user.trackedJobs as any) : [],
      lockerPin: user.lockerPin ? 'set' : null,
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
          // Prefer the attempt-time-accurate maxScore stored on the session itself over
        // mockTest.maxMarks, which is a cached value that can drift out of sync with the
        // real per-question marks (see the maxScore field comment in schema.prisma).
        maxScore: session.maxScore ?? session.mockTest?.maxMarks ?? 200,
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

  // If user doesn't exist, create a new user account with Google (with the friend's referral
  // code from the sign-up page or an invite link; an unknown code is ignored here)
  const referralCode = await newReferralCode();
  const referrer = await findReferrer(data?.referralCodeInput);
  const newSessionId = crypto.randomUUID();

  const newUser = await prisma.user.create({
    data: {
      candidateCode: 'HUB-' + Math.floor(1000 + Math.random() * 9000),
      fullName: name?.trim() || 'Student',
      email: trimmedEmail,
      mobile: '',
      passwordHash: 'google_oauth_' + crypto.randomUUID(),
      referralCode,
      referredBy: referrer?.referralCode ?? null,
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
  if (referrer) {
    await prisma.user.update({ where: { id: referrer.id }, data: { referralsCount: { increment: 1 } } }).catch(() => {});
  }

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
      tourCompletedAt: null,
      noticesTourCompletedAt: null,
      testsTourCompletedAt: null,
      typingTourCompletedAt: null,
      lockerTourCompletedAt: null,
      profileTourCompletedAt: null,
      plannerTourCompletedAt: null,
      friendsTourCompletedAt: null,
      profilePhoto: newUser.profilePhoto,
      testSessions: [],
      bookmarkedQuestions: [],
      trackedJobs: [],
    },
  });
}

async function handleGetReferredFriends(data: any) {
  // Always the account's own referral code (data.userId is the verified caller), never one sent by the client
  const owner = await prisma.user.findUnique({ where: { id: data.userId }, select: { referralCode: true } });
  const referralCode = owner?.referralCode;
  if (!referralCode) {
    return NextResponse.json({ success: false, error: 'Referral code is required' }, { status: 400 });
  }

  const friends = await prisma.user.findMany({
    where: { referredBy: { equals: referralCode.trim(), mode: 'insensitive' } },
    select: { id: true, fullName: true, email: true, createdAt: true, referralCoinsCredited: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  // Only what the friend list shows: no mobile number, and the email masked (ab***@gmail.com)
  const formattedFriends = friends.map(f => ({
    id: f.id,
    name: f.fullName || 'Candidate',
    email: (f.email || '').replace(/^(.{2})[^@]*(@.*)$/, '$1***$2'),
    registeredDate: formatDateTime(f.createdAt),
    // Coins are paid once the friend's first test counted (see creditReferralIfDue)
    hasCompletedTest: Boolean(f.referralCoinsCredited),
    coinsEarned: f.referralCoinsCredited ? REFERRAL_OWNER_COINS : 0,
  }));

  return NextResponse.json({
    success: true,
    referredFriends: formattedFriends,
    rules: { ownerCoins: REFERRAL_OWNER_COINS, friendCoins: REFERRAL_FRIEND_COINS, minTimeShare: REFERRAL_MIN_TIME_SHARE },
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

// The current password is checked here on the server; the new one is stored hashed.
// Other website logins of the account are signed out.
async function handleUpdatePassword(data: any, currentToken: string | null) {
  const { userId, oldPass, newPass } = data;
  const next = typeof newPass === 'string' ? newPass.trim() : '';
  if (next.length < 6) {
    return NextResponse.json({ success: false, error: 'New password must be at least 6 characters.' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user || !(await verifyPassword(typeof oldPass === 'string' ? oldPass : '', user.passwordHash))) {
    return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(next),
    },
  });
  await revokeAllWebSessions(userId, currentToken).catch(() => {});

  return NextResponse.json({ success: true });
}

async function handleClaimPassPro(data: any, requesterUserId: string | null, isAdmin = false) {
  try {
    // Students can claim a pass for themselves; only an admin may set coins, expiry or other tiers
    if (!isAdmin) {
      data = { ...data, coins: undefined, expiry: undefined };
      if (!['Testbook Pass', 'Testbook Pass Pro'].includes(data.tier)) data.tier = 'Testbook Pass Pro';
    }
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
    if (!adminUser || !(await verifyPassword(adminConfirmPassword, adminUser.passwordHash))) {
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

  // A new password set by an admin: stored hashed, and the account is signed out everywhere
  if (typeof password === 'string' && password.trim().length >= 6) {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password.trim()), currentSessionId: null } });
    await revokeAllWebSessions(userId).catch(() => {});
  }

  // A blocked account is signed out everywhere (website and apps)
  if (isBlocked === true) {
    await revokeAllWebSessions(userId).catch(() => {});
    await prisma.user.update({ where: { id: userId }, data: { currentSessionId: null } }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

type BookmarkEntry = { testId: string; questionId: string };

function cleanBookmarkList(list: unknown): BookmarkEntry[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: BookmarkEntry[] = [];
  for (const b of list) {
    if (!b || typeof b.testId !== 'string' || typeof b.questionId !== 'string' || !b.testId || !b.questionId) continue;
    const key = `${b.testId}\u0000${b.questionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ testId: b.testId, questionId: b.questionId });
  }
  return out;
}

// Adds or removes one bookmark inside a single UPDATE statement. Postgres row-locks
// it and re-reads the latest list, so quick clicks, out-of-order requests or a
// second open tab never undo each other. The old whole-list payload ({ bookmarks })
// is still accepted from cached clients.
async function handleToggleBookmark(data: any) {
  const { userId, testId, questionId, bookmarked, bookmarks } = data || {};
  if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });

  const isSingle = typeof testId === 'string' && typeof questionId === 'string' && !!testId && !!questionId && typeof bookmarked === 'boolean';
  if (!isSingle && !Array.isArray(bookmarks)) {
    return NextResponse.json({ success: false, error: 'Invalid bookmark payload' }, { status: 400 });
  }

  if (!isSingle) {
    const next = cleanBookmarkList(bookmarks);
    const res = await prisma.user.updateMany({ where: { id: userId }, data: { bookmarkedQuestions: next } });
    if (res.count === 0) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    return NextResponse.json({ success: true, bookmarks: next });
  }

  const entry = JSON.stringify([{ testId, questionId }]);
  const rows = await prisma.$queryRaw<{ bookmarkedQuestions: unknown }[]>`
    UPDATE users SET
      "bookmarkedQuestions" = (
        SELECT COALESCE(jsonb_agg(e), '[]'::jsonb)
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof("bookmarkedQuestions") = 'array' THEN "bookmarkedQuestions" ELSE '[]'::jsonb END
        ) AS e
        WHERE NOT (e->>'testId' = ${testId} AND e->>'questionId' = ${questionId})
      ) || CASE WHEN ${bookmarked} THEN ${entry}::jsonb ELSE '[]'::jsonb END,
      "updatedAt" = NOW()
    WHERE id = ${userId}
    RETURNING "bookmarkedQuestions"`;

  if (rows.length === 0) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  return NextResponse.json({ success: true, bookmarks: cleanBookmarkList(rows[0].bookmarkedQuestions) });
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

/** A real past date (up to 90 days back) from the client, or null. */
function pastDate(value: unknown): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const d = new Date(value);
  const t = d.getTime();
  return Number.isFinite(t) && t <= Date.now() + 60_000 && t >= Date.now() - 90 * 86400000 ? d : null;
}

// ---------------------------------------------------------------------------------------------
// Offline tests (Windows app). A download is encrypted for one device: the app sends its X25519
// public key, the server encrypts the package with an ephemeral key + HKDF-SHA256 + AES-256-GCM.
// Only that PC's app (whose private key is kept with Windows DPAPI) can open it.
// ---------------------------------------------------------------------------------------------
const OFFLINE_DAYS = 30;
const X25519_SPKI_PREFIX = Buffer.from('302a300506032b656e032100', 'hex');

function encryptForDevice(payload: unknown, devicePublicKeyB64: string) {
  const raw = Buffer.from(devicePublicKeyB64, 'base64');
  if (raw.length !== 32) throw new Error('Invalid device key');
  const devicePub = crypto.createPublicKey({ key: Buffer.concat([X25519_SPKI_PREFIX, raw]), format: 'der', type: 'spki' });
  const eph = crypto.generateKeyPairSync('x25519');
  const shared = crypto.diffieHellman({ privateKey: eph.privateKey, publicKey: devicePub });
  const salt = crypto.randomBytes(16);
  const key = Buffer.from(crypto.hkdfSync('sha256', shared, salt, Buffer.from('mth-offline-v1'), 32));
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const ct = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final(), cipher.getAuthTag()]);
  const epk = (eph.publicKey.export({ format: 'der', type: 'spki' }) as Buffer).subarray(-32);
  return JSON.stringify({ v: 1, epk: epk.toString('base64'), salt: salt.toString('base64'), nonce: nonce.toString('base64'), ct: ct.toString('base64') });
}

/** Question images become part of the (encrypted) download, so they work offline. */
async function embedImages(questions: any[]): Promise<any[]> {
  let json = JSON.stringify(questions);
  const urls = [...new Set(json.match(/https?:\/\/[^"'\s)\\]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^"'\s)\\]*)?/gi) || [])].slice(0, 120);
  let total = 0;
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 3 * 1024 * 1024 || total + buf.length > 25 * 1024 * 1024) continue;
      total += buf.length;
      const type = res.headers.get('content-type') || 'image/png';
      json = json.split(url).join(`data:${type};base64,${buf.toString('base64')}`);
    } catch { /* keep the link; it loads when online */ }
  }
  return JSON.parse(json);
}

/** The test's place in the catalog (title, timing, category names) as a one-test catalog. */
function catalogEntryFor(catalog: any[], testId: string) {
  for (const cat of catalog || []) {
    for (const sub of cat.subCategories || []) {
      const direct = (sub.tests || []).find((t: any) => t.id === testId);
      if (direct) return [{ id: cat.id, name: cat.name, subCategories: [{ id: sub.id, name: sub.name, tests: [direct] }] }];
      for (const ss of sub.subSubCategories || []) {
        const t = (ss.tests || []).find((x: any) => x.id === testId);
        if (t) return [{ id: cat.id, name: cat.name, subCategories: [{ id: sub.id, name: sub.name, subSubCategories: [{ ...ss, tests: [t] }] }] }];
      }
    }
  }
  return [];
}

async function handleOfflineDownload(data: any, requester: { id: string; role: string }) {
  const { kind, id, devicePublicKey } = data || {};
  if ((kind !== 'mock' && kind !== 'typing') || typeof id !== 'string' || !id || typeof devicePublicKey !== 'string') {
    return NextResponse.json({ success: false, error: 'Invalid download request' }, { status: 400 });
  }
  const limit = await hitLimit(`offline_download:${requester.id}`, 40, 24 * 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Daily download limit reached. Please try again tomorrow.' }, { status: 429 });
  }
  const isStaff = requester.role !== 'STUDENT';
  const now = Date.now();
  let payload: any;
  let meta: any;

  if (kind === 'mock') {
    const { mockTest, questions } = await loadTestQuestions(id);
    if (!mockTest || !questions?.length) return NextResponse.json({ success: false, error: 'This test has no questions yet.' }, { status: 404 });
    if (!isStaff) {
      const u = await prisma.user.findUnique({ where: { id: requester.id }, select: { subscriptionTier: true } });
      if (!tierAllows(mockTest.requiredTierName || 'None', u?.subscriptionTier)) {
        return NextResponse.json({ success: false, error: 'This is a PRO test. Unlock it to download.', code: 'PRO_REQUIRED' }, { status: 403 });
      }
    }
    const catalog = catalogCache.examCatalog || await getCompiledExamCatalog();
    const past = await prisma.userTestSession.findMany({
      where: { userId: requester.id, mockTestId: mockTest.id, status: { in: ['COMPLETED', 'AUTO_SUBMITTED'] } },
      orderBy: { completedAt: 'desc' },
      take: 3,
      include: { responses: { select: { questionId: true, selectedOptionIndex: true, state: true, elapsedSeconds: true } } },
    });
    const withImages = await embedImages(questions);
    const version = crypto.createHash('sha256').update(JSON.stringify(questions)).digest('hex').slice(0, 16);
    payload = {
      v: 1, kind, id: mockTest.id, userId: requester.id, title: mockTest.title, version,
      downloadedAt: now, expiresAt: now + OFFLINE_DAYS * 86400000,
      data: {
        isCbat: isCbatTest(mockTest.id, catalog),
        catalog: catalogEntryFor(catalog, mockTest.id),
        customQs: {
          questions: withImages,
          positiveMarks: mockTest.positiveMarks, negativeMarks: mockTest.negativeMarks,
          durationMinutes: mockTest.durationMinutes, questionsCount: mockTest.questionsCount, maxMarks: mockTest.maxMarks,
          hasSectionalTiming: mockTest.hasSectionalTiming, sectionalTimings: mockTest.sectionalTimings,
          lockSectionOnSubmit: mockTest.lockSectionOnSubmit, sections: mockTest.sections,
        },
        pastAttempts: past.map(s => ({
          id: s.id, testId: mockTest.id, title: mockTest.title, score: s.finalScore ?? 0, maxScore: s.maxScore ?? mockTest.maxMarks ?? 0,
          accuracy: s.accuracyPercentage ?? 0, durationSeconds: s.timeSpentSeconds, status: s.status, violations: s.violationsCount,
          date: s.startedAt.toISOString().split('T')[0], startedAt: s.startedAt.toISOString(),
          completedAt: s.completedAt ? s.completedAt.toISOString() : null, createdAt: s.createdAt.toISOString(),
          responses: Object.fromEntries(s.responses.map(r => [r.questionId, { selectedOptionIndex: r.selectedOptionIndex, elapsedSeconds: r.elapsedSeconds, state: r.state }])),
        })),
      },
    };
    meta = { title: mockTest.title, subtitle: `${questions.length} questions · ${mockTest.durationMinutes || ''} min`.replace(' ·  min', ''), questions: questions.length };
  } else {
    const test = await getTypingTestById(id);
    if (!test || !test.passageText) return NextResponse.json({ success: false, error: 'Typing test not found.' }, { status: 404 });
    const category = (await getTypingCategories()).find(c => c.id === test.categoryId);
    if (category && category.isActive === false && !isStaff) {
      return NextResponse.json({ success: false, error: 'This typing test is not available.' }, { status: 404 });
    }
    payload = {
      v: 1, kind, id: test.id, userId: requester.id, title: test.title,
      version: String((test as any).updatedAt || ''), downloadedAt: now, expiresAt: now + OFFLINE_DAYS * 86400000,
      data: { test, categoryName: category?.name || '' },
    };
    meta = { title: test.title, subtitle: category?.name || '', questions: null };
  }

  try {
    return NextResponse.json({ success: true, meta, envelope: encryptForDevice(payload, devicePublicKey) });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid device key' }, { status: 400 });
  }
}

/**
 * Bookmarked questions of one test, encrypted for this PC, so the Bookmarks page works offline.
 * The app asks right after a bookmark is added (only that test is rebuilt). Questions are built
 * exactly as the online Bookmarks page builds them, with the same answer rules as
 * get-custom-questions (answers only after finishing the test, PRO lock).
 */
async function handleOfflineBookmarks(data: any, requester: { id: string; role: string }) {
  const { devicePublicKey, testId, questionIds } = data || {};
  if (typeof devicePublicKey !== 'string' || typeof testId !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(testId)
    || !Array.isArray(questionIds) || questionIds.length === 0 || questionIds.length > 300 || !questionIds.every((q: unknown) => typeof q === 'string')) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
  const limit = await hitLimit(`offline_bookmarks:${requester.id}`, 500, 24 * 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });

  const isStaff = requester.role !== 'STUDENT';
  let test: any = { status: 'missing', title: '', questions: [], sectionNames: {} };
  const { mockTest, questions: fullQuestions } = await loadTestQuestions(testId);
  if (fullQuestions?.length) {
    const [u, done] = isStaff ? [null, null] : await Promise.all([
      prisma.user.findUnique({ where: { id: requester.id }, select: { subscriptionTier: true } }),
      prisma.userTestSession.findFirst({
        where: { userId: requester.id, mockTestId: { in: [mockTest?.id, testId].filter(Boolean) as string[] }, status: { in: ['COMPLETED', 'AUTO_SUBMITTED'] } },
        select: { id: true },
      }),
    ]);
    const withAnswers = isStaff || !!done;
    if (withAnswers || tierAllows(mockTest?.requiredTierName || 'None', u?.subscriptionTier)) {
      const catalog = catalogCache.examCatalog || await getCompiledExamCatalog();
      const session = generateExamSession(testId, catalog, {
        questions: withAnswers ? fullQuestions : stripAnswers(fullQuestions),
        positiveMarks: mockTest?.positiveMarks, negativeMarks: mockTest?.negativeMarks,
        durationMinutes: mockTest?.durationMinutes, questionsCount: mockTest?.questionsCount, maxMarks: mockTest?.maxMarks,
        hasSectionalTiming: mockTest?.hasSectionalTiming, sectionalTimings: mockTest?.sectionalTimings, sections: mockTest?.sections,
      });
      const wanted = new Set<string>(questionIds);
      const picked = session.questions.map((q: any, i: number) => ({ ...q, qNo: i + 1 })).filter((q: any) => wanted.has(q.id));
      test = {
        status: 'ready',
        title: mockTest?.title || session.testTitle,
        questions: await embedImages(picked),
        sectionNames: Object.fromEntries(session.sections.map((s: any) => [s.id, s.name])),
      };
    } else {
      test = { ...test, title: mockTest?.title || '' };
    }
  } else if (mockTest?.title) {
    test = { ...test, title: mockTest.title };
  }

  const now = Date.now();
  const payload = {
    v: 1, kind: 'bookmarks', id: testId, userId: requester.id, title: test.title || 'Bookmarked questions',
    version: crypto.createHash('sha256').update(JSON.stringify(questionIds)).digest('hex').slice(0, 16),
    downloadedAt: now, expiresAt: now + OFFLINE_DAYS * 86400000,
    data: { testId, questionIds, test },
  };
  const meta = { title: payload.title, subtitle: `${questionIds.length} bookmarked`, questions: questionIds.length };
  try {
    return NextResponse.json({ success: true, meta, envelope: encryptForDevice(payload, devicePublicKey) });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid device key' }, { status: 400 });
  }
}

/** Scores an attempt with the server's own answer key (null if the test has no stored questions). */
type Graded = { score: ScoreResult; session: ReturnType<typeof generateExamSession> | null; durationMinutes: number; rpsc: boolean };

async function gradeAttempt(testId: string, responses: Record<string, any>, lang1?: string, lang2?: string): Promise<Graded | null> {
  try {
    const { mockTest, questions } = await loadTestQuestions(testId);
    if (!questions?.length) return null;
    const catalog = catalogCache.examCatalog || await getCompiledExamCatalog();
    // CBAT batteries are speed tests: scored, but not checked for speed
    if (isCbatTest(testId, catalog)) return { score: scoreCbat(questions, responses), session: null, durationMinutes: mockTest?.durationMinutes || 60, rpsc: false };
    const session = generateExamSession(testId, catalog, {
      questions,
      positiveMarks: mockTest?.positiveMarks,
      negativeMarks: mockTest?.negativeMarks,
      durationMinutes: mockTest?.durationMinutes,
      sections: mockTest?.sections,
    }, typeof lang1 === 'string' ? lang1 : undefined, typeof lang2 === 'string' ? lang2 : undefined);
    if (!session.questions.length) return null;
    const rpsc = isRpscRasTest(testId, session);
    return { score: scoreSession(session, responses, rpsc), session, durationMinutes: mockTest?.durationMinutes || 60, rpsc };
  } catch (err) {
    console.error('Failed to grade attempt on the server:', err);
    return null;
  }
}

/** Runs the integrity rules on a submitted attempt and stores it for review when suspicious. */
async function checkAttemptIntegrity(a: {
  sessionId: string; userId: string; testId: string; graded: Graded; responses: Record<string, any>;
  previousAttempts: number; violations: number; wallClockSeconds: number | null;
}) {
  const session = a.graded.session!;
  const ordered = session.sections.flatMap(sec => session.questions.filter(q => q.sectionId === sec.id).sort((x, y) => x.orderIndex - y.orderIndex));
  const text = (v: any) => (typeof v === 'string' ? v : v?.text || '');
  const questions = ordered.map(q => ({
    id: q.id,
    correctIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : null,
    words: countWords(text(q.content?.en?.questionText) + ' ' + text(q.content?.en?.comprehension))
      + Math.round((q.content?.en?.options || []).reduce((n: number, o: any) => n + countWords(text(o)), 0) / 2),
  }));
  // How long other students usually take on each question (only questions with 5+ answers)
  const med = await prisma.$queryRaw<{ q: string; m: number }[]>`
    SELECT r."questionId" AS q, percentile_cont(0.5) WITHIN GROUP (ORDER BY r."elapsedSeconds") AS m
    FROM question_response_states r JOIN user_test_sessions s ON s.id = r."sessionId"
    WHERE s."mockTestId" = ${a.testId} AND s."userId" <> ${a.userId} AND r."selectedOptionIndex" IS NOT NULL
    GROUP BY 1 HAVING COUNT(*) >= 5`;
  const result = analyzeAttempt({
    questions, responses: a.responses, durationMinutes: a.graded.durationMinutes,
    medians: Object.fromEntries(med.map(r => [r.q, Number(r.m)])),
    wallClockSeconds: a.wallClockSeconds, violations: a.violations, previousAttempts: a.previousAttempts, rpscOptionE: a.graded.rpsc,
  });
  if (result.level === 'ok') return;
  const stamps = ordered.map(q => Number(a.responses[q.id]?.answeredAt) || 0).filter(x => x > 0);
  const t0 = stamps.length ? Math.min(...stamps) : 0;
  const timeline: TimelineRow[] = ordered.flatMap((q, i) => {
    const r = a.responses[q.id];
    if (!r) return [];
    const sel = r.selectedOptionIndex ?? null;
    const at = Number(r.answeredAt) || 0;
    return [[i + 1, sel, sel === null ? null : sel === q.correctOptionIndex ? 1 : 0, Math.round(Number(r.elapsedSeconds) || 0), at && t0 ? at - t0 : null] as TimelineRow];
  });
  await recordIntegrity({ sessionId: a.sessionId, userId: a.userId, testId: a.testId, result, timeline });
}

async function handleAddAttempt(data: any, request?: Request) {
  const { userId, testId, title, durationSeconds, violations, responses } = data;
  let { score, maxScore, accuracy } = data;
  // Results finished offline (Windows app) keep the time they were really completed
  const offlineCompletedAt = pastDate(data.completedAt);

  // The result is worked out here from the student's answers, not taken from the browser
  // (which no longer has the answer key before submitting, and could be tampered with).
  const graded = responses && typeof responses === 'object' ? await gradeAttempt(testId, responses, data.lang1, data.lang2) : null;
  if (graded) {
    score = graded.score.obtainedMarks;
    maxScore = graded.score.totalMarks;
    accuracy = graded.score.accuracyPercentage;
  }

  // Sanity-clamp the client-reported score/accuracy before it's written as permanent
  // result data. The client (useTestEngine.tsx SUBMIT_EXAM) is the only place that computes
  // marks — the server has historically trusted whatever it's sent with zero validation, so
  // any client-side bug or a corrupted/tampered payload (NaN, Infinity, an absurd float from a
  // bad browser state) would be stored verbatim as the user's official result. This does not
  // re-derive the "correct" score — only clamps it to the physically possible range for this
  // attempt, guarding the boundary between untrusted client input and permanent result data.
  // storedMaxScore is what actually gets persisted (null when the client didn't send a
  // sane value, so downstream reads fall back to mockTest.maxMarks instead of a fake number).
  // clampCeiling is only the bound used below to sanity-clamp the score — it needs *some*
  // ceiling even when maxScore itself is missing/invalid, hence the 1000 fallback there only.
  const storedMaxScore = typeof maxScore === 'number' && isFinite(maxScore) && maxScore > 0 ? maxScore : null;
  const clampCeiling = storedMaxScore ?? 1000;
  const safeScore = typeof score === 'number' && isFinite(score)
    ? Math.max(-clampCeiling, Math.min(clampCeiling, score))
    : 0;
  const safeAccuracy = typeof accuracy === 'number' && isFinite(accuracy)
    ? Math.max(0, Math.min(100, accuracy))
    : 0;

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

  // Integrity: when the server first saw this attempt (its first progress save) and how many
  // finished attempts came before (a retake can know the answers)
  let firstSeenAt: Date | null = null;
  let previousAttempts = 0;
  if (userId && testId) {
    const [ongoing, prev] = await Promise.all([
      offlineCompletedAt ? null : prisma.userTestSession.findFirst({ where: { userId, mockTestId: testId, status: 'ONGOING' }, orderBy: { startedAt: 'asc' }, select: { startedAt: true } }),
      prisma.userTestSession.count({ where: { userId, mockTestId: testId, status: { in: ['COMPLETED', 'AUTO_SUBMITTED'] } } }),
    ]).catch(() => [null, 0] as const);
    firstSeenAt = ongoing?.startedAt || null;
    previousAttempts = prev || 0;
  }

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
      const z = (safeScore - avg) / sigma;

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
      finalScore: safeScore,
      maxScore: storedMaxScore,
      accuracyPercentage: safeAccuracy,
      timeSpentSeconds: actualTimeSpent,
      violationsCount: typeof violations === 'number' && !isNaN(violations) ? Math.round(violations) : 0,
      remainingSeconds: 0,
      completedAt: offlineCompletedAt || new Date(),
      testbookRank,
      testbookPercentile,
      source: source || 'web',
    },
  });

  // Referral reward: the first attempt that used enough of the test's time (once per account)
  try {
    const durationMinutes = graded?.durationMinutes
      ?? (await prisma.mockTest.findUnique({ where: { id: testId }, select: { durationMinutes: true } }))?.durationMinutes
      ?? 60;
    await creditReferralIfDue(userId, actualTimeSpent, durationMinutes);
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

  // Integrity checks (never blocks the result; suspicious attempts go to the admin review list)
  if (graded?.session && responses && typeof responses === 'object') {
    try {
      await checkAttemptIntegrity({
        sessionId: session.id, userId, testId, graded, responses, previousAttempts,
        violations: typeof violations === 'number' ? violations : 0,
        wallClockSeconds: firstSeenAt ? Math.max(0, (Date.now() - firstSeenAt.getTime()) / 1000) : null,
      });
    } catch (err) {
      console.error('Integrity check failed:', err);
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
    referralCoinsCredited: updatedReferralCoinsCredited,
    sessionId: session.id,
    result: { score: safeScore, maxScore: storedMaxScore, accuracy: safeAccuracy, ...(graded ? { correct: graded.score.correctCount, incorrect: graded.score.incorrectCount, unattempted: graded.score.unattemptedCount } : {}) },
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

  // Progress is only kept on the server for real tests. Saving progress must never create a
  // test (an exam id or sample test opened by URL used to appear as a new test in the first
  // test series); the browser keeps its own copy either way.
  if (!(await prisma.mockTest.findUnique({ where: { id: testId }, select: { id: true } }))) {
    return NextResponse.json({ success: true, stored: 'local' });
  }

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

// ---------------------------------------------------------------------------------------------
// Ongoing exam progress (web exam terminal). The client sends one snapshot with everything
// needed to resume: answers, review marks, visited questions, timer, position and submitted
// sections. It is written in a single UPDATE and only when it is newer than what is stored,
// so a late or duplicate request can never replace newer progress. Per-question rows are
// also kept up to date (upsert, never delete) for the mobile app's get-session-responses.
// ---------------------------------------------------------------------------------------------
const toInt = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : fallback);

async function handleSaveExamProgress(data: any) {
  const { userId, snapshot } = data || {};
  const testId = snapshot?.testId;
  const savedAt = Number(snapshot?.savedAt);
  if (!userId || !snapshot || typeof snapshot !== 'object' || typeof testId !== 'string' || !testId || !Number.isFinite(savedAt)) {
    return NextResponse.json({ success: false, error: 'Invalid progress payload' }, { status: 400 });
  }
  const json = JSON.stringify(snapshot);
  if (json.length > 2_000_000) {
    return NextResponse.json({ success: false, error: 'Progress too large' }, { status: 413 });
  }

  const remaining = toInt(snapshot.timeRemaining);
  const violations = toInt(snapshot.violations);
  const sectionIdx = toInt(snapshot.currentSectionIndex);
  const questionIdx = toInt(snapshot.currentQuestionIndex);

  // Never create a test just to hold progress (see handleSaveOngoingSession)
  if (!(await prisma.mockTest.findUnique({ where: { id: testId }, select: { id: true } }))) {
    return NextResponse.json({ success: true, stored: 'local' });
  }

  let session = await prisma.userTestSession.findFirst({
    where: { userId, mockTestId: testId, status: 'ONGOING' },
    orderBy: { startedAt: 'desc' },
    select: { id: true },
  });
  if (!session) {
    session = await prisma.userTestSession.create({
      data: {
        userId,
        mockTestId: testId,
        status: 'ONGOING',
        remainingSeconds: remaining,
        violationsCount: violations,
        currentSectionIndex: sectionIdx,
        currentQuestionIndex: questionIdx,
        source: snapshot.source === 'mobile_web' ? 'mobile_web' : 'web',
      },
      select: { id: true },
    });
  }

  const applied = await prisma.$executeRaw`
    UPDATE user_test_sessions SET
      "progressSnapshot" = ${json}::jsonb,
      "progressSavedAt" = ${savedAt},
      "remainingSeconds" = ${remaining},
      "violationsCount" = ${violations},
      "currentSectionIndex" = ${sectionIdx},
      "currentQuestionIndex" = ${questionIdx}
    WHERE id = ${session.id} AND ("progressSavedAt" IS NULL OR "progressSavedAt" <= ${savedAt})`;

  const responses = snapshot.engine === 'tcs' ? snapshot.data?.responses : null;
  if (applied > 0 && responses && typeof responses === 'object') {
    const rows = Object.entries(responses)
      .filter(([, r]: any) => r && typeof r === 'object' && r.state !== 1)
      .map(([questionId, r]: any) => ({
        q: questionId,
        s: typeof r.selectedOptionIndex === 'number' ? r.selectedOptionIndex : null,
        st: [1, 2, 3, 4, 5].includes(r.state) ? r.state : 2,
        e: toInt(r.elapsedSeconds),
      }));
    if (rows.length > 0) {
      try {
        await prisma.$executeRaw`
          INSERT INTO question_response_states (id, "sessionId", "questionId", "selectedOptionIndex", state, "elapsedSeconds", "updatedAt")
          SELECT gen_random_uuid()::text, ${session.id}, x.q, x.s, x.st, x.e, NOW()
          FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(q text, s int, st int, e int)
          ON CONFLICT ("sessionId", "questionId") DO UPDATE SET
            "selectedOptionIndex" = EXCLUDED."selectedOptionIndex",
            state = EXCLUDED.state,
            "elapsedSeconds" = EXCLUDED."elapsedSeconds",
            "updatedAt" = NOW()`;
      } catch (err) {
        // The snapshot above is what the web resumes from; these rows only serve the mobile app
        console.error('Failed to sync response rows for exam progress:', err);
      }
    }
  }

  return NextResponse.json({ success: true, applied: applied > 0, sessionId: session.id });
}

async function handleGetExamProgress(data: any) {
  const { userId, testId } = data || {};
  if (!userId || !testId) {
    return NextResponse.json({ success: false, error: 'userId and testId are required' }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<{
    id: string; progressSnapshot: any; progressSavedAt: number | null; remainingSeconds: number;
    violationsCount: number; currentSectionIndex: number; currentQuestionIndex: number;
  }[]>`
    SELECT id, "progressSnapshot", "progressSavedAt", "remainingSeconds", "violationsCount", "currentSectionIndex", "currentQuestionIndex"
    FROM user_test_sessions
    WHERE "userId" = ${userId} AND "mockTestId" = ${testId} AND status = 'ONGOING'
    ORDER BY "progressSavedAt" DESC NULLS LAST, "startedAt" DESC
    LIMIT 1`;
  const session = rows[0];
  if (!session) return NextResponse.json({ success: true, progress: null });

  if (session.progressSnapshot) {
    return NextResponse.json({ success: true, progress: session.progressSnapshot });
  }

  // Saved by the mobile app (or the old web code): rebuild from the per-question rows.
  // savedAt 0 so a progress copy in this browser, if any, is preferred.
  const responseRows = await prisma.questionResponseState.findMany({
    where: { sessionId: session.id },
    select: { questionId: true, selectedOptionIndex: true, state: true, elapsedSeconds: true },
  });
  const responses: Record<string, any> = {};
  for (const r of responseRows) {
    responses[r.questionId] = {
      questionId: r.questionId,
      selectedOptionIndex: r.selectedOptionIndex,
      tempOptionIndex: r.selectedOptionIndex,
      state: r.state,
      elapsedSeconds: r.elapsedSeconds,
    };
  }
  return NextResponse.json({
    success: true,
    progress: {
      v: 1,
      engine: 'tcs',
      testId,
      savedAt: 0,
      timeRemaining: session.remainingSeconds,
      violations: session.violationsCount,
      currentSectionIndex: session.currentSectionIndex,
      currentQuestionIndex: session.currentQuestionIndex,
      data: { responses },
    },
  });
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

  catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);

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

  catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);

  return NextResponse.json({ success: true });
}

async function handleGetSingleNoticeContent(data: any) {
  const { id } = data || {};
  if (!id) {
    return NextResponse.json({ success: false, error: 'Notice ID is required' }, { status: 400 });
  }

  const notice = await prisma.notice.findUnique({
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

  // On-demand Auto-heal: If contentHtml lacks Useful Important Links, live fetch & heal from rawUrl
  const rawUrl = notice.rawUrl || notice.url;
  const hasLinks = notice.contentHtml && (
    notice.contentHtml.toLowerCase().includes('important link') ||
    notice.contentHtml.toLowerCase().includes('useful link')
  );

  if (!hasLinks && rawUrl && (rawUrl.includes('rojgarresult.com') || rawUrl.includes('sarkariresult.com'))) {
    try {
      const liveRes = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        next: { revalidate: 0 }
      });
      if (liveRes.ok) {
        const pageHtml = await liveRes.text();
        const { extractNoticeContent, extractDirectLink, extractLastDate } = await import('../../lib/noticeExtractor');
        const extracted = extractNoticeContent(pageHtml);
        if (extracted && (extracted.toLowerCase().includes('important link') || extracted.toLowerCase().includes('useful link'))) {
          notice.contentHtml = extracted;
          const directUrl = extractDirectLink(pageHtml, rawUrl, notice.category || 'notice');
          const lastDate = extractLastDate(pageHtml);
          if (directUrl && directUrl !== rawUrl) notice.url = directUrl;
          if (lastDate && !notice.lastDate) notice.lastDate = lastDate;

          // Save healed content to Tigris and DB asynchronously
          (async () => {
            try {
              const { uploadNoticeHtmlToTigris } = await import('../../lib/tigrisNoticeStorage');
              let contentRef = extracted;
              const tigrisUrl = await uploadNoticeHtmlToTigris(notice.id, extracted);
              if (tigrisUrl) contentRef = tigrisUrl;

              await prisma.notice.update({
                where: { id: notice.id },
                data: {
                  contentHtml: contentRef,
                  ...(directUrl ? { url: directUrl } : {}),
                  ...(lastDate ? { lastDate } : {})
                }
              });
            } catch (err: any) {
              console.error(`Auto-heal save failed for notice ${notice.id}:`, err?.message);
            }
          })();
        }
      }
    } catch (e: any) {
      console.warn(`On-demand live-heal failed for notice ${notice.id}:`, e?.message);
    }
  }

  // Copied from other websites: only plain formatting reaches the page
  if (notice.contentHtml) notice.contentHtml = sanitizeNoticeHtml(notice.contentHtml);
  return NextResponse.json({ success: true, notice });
}

async function handleDeleteNotice(data: any) {
  const { id } = data;

  await prisma.notice.delete({
    where: { id },
  });

  catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);

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
  catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
  catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);

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
    catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
    catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);

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
    catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
    catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);

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
  catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
  catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);

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
  catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
  catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);

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
  catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
  catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);

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
  catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
  catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);

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

    catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
    catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);

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
  catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
  catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);
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
  catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
  catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);
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
  catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
  catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);
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
  catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
  catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);
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
    const existingMockTest = await prisma.mockTest.findFirst({
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
    catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
    catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);

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

/** A test's full question list (with answers) as stored — for server use only. */
async function loadTestQuestions(testId?: string, categoryId?: string) {
  if (!testId && !categoryId) return { mockTest: null as any, questions: null as any[] | null, s3Url: null as string | null };

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
        id: true,
        requiredTierName: true,
        customQuestions: true,
        positiveMarks: true,
        negativeMarks: true,
        durationMinutes: true,
        questionsCount: true,
        maxMarks: true,
        hasSectionalTiming: true,
        sectionalTimings: true,
        title: true,
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

  return { mockTest, questions: Array.isArray(questions) ? questions : null, s3Url };
}

const tierAllows = (required: string, userTier: string | null | undefined) =>
  required === 'None' ||
  (required === 'Testbook Pass' && (userTier === 'Testbook Pass' || userTier === 'Testbook Pass Pro')) ||
  (required === 'Testbook Pass Pro' && userTier === 'Testbook Pass Pro');

/**
 * Can this visitor open the test, and does it have uploaded questions? Checked by the exam page
 * before the exam starts, so a locked or empty test shows a clear message instead of sample
 * questions. Same rules as get-custom-questions; nothing about the questions is returned.
 */
async function handleTestAccess(data: any, requester: { id: string; role: string } | null) {
  const testId = typeof data?.testId === 'string' ? data.testId : '';
  if (!testId) return NextResponse.json({ success: false, error: 'Missing testId' }, { status: 400 });
  const rows = await prisma.$queryRaw<{ id: string; title: string; requiredTierName: string | null; hasQuestions: boolean }[]>`
    SELECT id, title, "requiredTierName", ("customQuestions" IS NOT NULL AND "customQuestions" <> 'null'::jsonb) AS "hasQuestions"
    FROM mock_tests WHERE id = ${testId} LIMIT 1`;
  const test = rows[0];
  if (!test) return NextResponse.json({ success: true, exists: false, locked: null, hasQuestions: false, loggedIn: !!requester });

  const isStaff = !!requester && requester.role !== 'STUDENT';
  const requiredTier = test.requiredTierName || 'None';
  let allowed = isStaff || requiredTier === 'None';
  if (!allowed && requester) {
    const [u, done] = await Promise.all([
      prisma.user.findUnique({ where: { id: requester.id }, select: { subscriptionTier: true } }),
      prisma.userTestSession.findFirst({ where: { userId: requester.id, mockTestId: test.id, status: { in: ['COMPLETED', 'AUTO_SUBMITTED'] } }, select: { id: true } }),
    ]);
    allowed = !!done || tierAllows(requiredTier, u?.subscriptionTier);
  }
  return NextResponse.json({
    success: true, exists: true, title: test.title, loggedIn: !!requester,
    locked: allowed ? null : requiredTier, hasQuestions: test.hasQuestions,
  });
}

// Questions for a test. Answers and solutions are only sent to staff and to students who
// have already submitted the test (analysis, bookmarks); everyone else gets the questions
// without them, so the answer key can't be read before or during a test. PRO tests are
// only sent to students whose plan includes them.
// Mobile app builds from before this change score on the phone and still get the answers
// when logged in, until LEGACY_APP_FULL_QUESTIONS=0 is set after the updated apps ship.
async function handleGetCustomQuestions(rawPayload: any, requester: { id: string; role: string } | null = null, request?: Request) {
  const payload = rawPayload?.data || rawPayload || {};
  const testId = payload.testId || rawPayload?.testId;
  const categoryId = payload.categoryId || rawPayload?.categoryId;

  if (!testId && !categoryId) {
    return NextResponse.json({ success: true, customQuestions: null, questions: null });
  }

  const { mockTest, questions: fullQuestions, s3Url } = await loadTestQuestions(testId, categoryId);
  const isStaff = !!requester && requester.role !== 'STUDENT';
  const requiredTier = mockTest?.requiredTierName || 'None';

  let userTier: string | null = null;
  let attempted = false;
  if (requester && !isStaff && mockTest?.id) {
    const [u, done] = await Promise.all([
      requiredTier !== 'None' ? prisma.user.findUnique({ where: { id: requester.id }, select: { subscriptionTier: true } }) : null,
      prisma.userTestSession.findFirst({
        where: { userId: requester.id, mockTestId: { in: [mockTest.id, testId].filter(Boolean) }, status: { in: ['COMPLETED', 'AUTO_SUBMITTED'] } },
        select: { id: true },
      }),
    ]);
    userTier = u?.subscriptionTier ?? null;
    attempted = !!done;
  }

  const locked = !isStaff && !attempted && !tierAllows(requiredTier, userTier);
  // Old mobile app builds (session id header, no cookie). The new Android app sends a bearer
  // token and gets answers only after submitting, like the website.
  // Off by default: anyone could copy their session id and pretend to be the old app.
  // (No old-app users in the last 30 days when this was switched off, Oct 2026.)
  const legacyApp = !!requester && !isStaff && !(request && (readCookie(request, AUTH_COOKIE) || request.headers.get('authorization')))
    && !(request && isBrowserRequest(request))
    && process.env.LEGACY_APP_FULL_QUESTIONS === '1';
  const withAnswers = isStaff || attempted || legacyApp;
  const questions = !fullQuestions || locked ? null : withAnswers ? fullQuestions : stripAnswers(fullQuestions);

  return NextResponse.json({
    success: true,
    title: mockTest?.title ?? null,
    url: isStaff ? s3Url : null,
    locked: locked ? requiredTier : null,
    answersIncluded: !!questions && withAnswers,
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
/** The server-side shape: an exam's `tests` list is rebuilt from its series (see slimCatalog). */
function expandCatalogOnServer(catalog: any[]): any[] {
  return (catalog || []).map((cat: any) => ({
    ...cat,
    subCategories: (cat.subCategories || []).map((sub: any) =>
      Array.isArray(sub.tests) ? sub : { ...sub, tests: (sub.subSubCategories || []).flatMap((ss: any) => ss.tests || []) }),
  }));
}

// Shared by all server instances (Next data cache), so the database is read about once per
// CATALOG_REVALIDATE_S or after an admin change, not every few minutes per instance.
const readSharedCatalog = unstable_cache(
  async () => slimCatalog(await buildExamCatalog()),
  ['exam-catalog-v1'],
  { tags: [CATALOG_TAG], revalidate: CATALOG_REVALIDATE_S },
);

async function getCompiledExamCatalog() {
  return expandCatalogOnServer(await readSharedCatalog());
}

async function buildExamCatalog() {
  // Safe runtime schema patch: run once on boot to avoid executing 8 DDL queries on every request
  // PERF: The schema is applied with `npm run db:push` (scripts/safe-db-push.mjs), so these DDL statements
  // are redundant on each cold start (8 sequential round trips + table locks). Opt in with
  // RUN_RUNTIME_SCHEMA_PATCH=1 if a database ever needs the legacy patch applied.
  if (!schemaPatched && process.env.RUN_RUNTIME_SCHEMA_PATCH === '1') {
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

  // PERF: run the four catalog queries in parallel instead of one after another
  const [categories, exams, testSeries, mockTests] = await Promise.all([
  prisma.category.findMany({ orderBy: { orderIndex: 'asc' } }),
  prisma.exam.findMany({ orderBy: { orderIndex: 'asc' } }),
  prisma.testSeries.findMany({ orderBy: { orderIndex: 'asc' } }),
  prisma.$queryRaw<any[]>`
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
  `,
  ]);

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
    catalogCache.examCatalog = null; invalidateShared(CATALOG_TAG);
    catalogCache.noticesList = null; invalidateShared(NOTICES_TAG);
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
      passwordHash: 'disabled_' + crypto.randomUUID(), // no usable password
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
      passwordHash: 'disabled_' + crypto.randomUUID(), // no usable password
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
      passwordHash: 'disabled_' + crypto.randomUUID(), // no usable password
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
      passwordHash: 'disabled_' + crypto.randomUUID(), // no usable password
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
      passwordHash: 'disabled_' + crypto.randomUUID(), // no usable password
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
      passwordHash: 'disabled_' + crypto.randomUUID(), // no usable password
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
      passwordHash: 'disabled_' + crypto.randomUUID(), // no usable password
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

// EGRESS-OPT: Lightweight badge-count check. Widgets that only need to know
// "is there something unread" poll this instead of the full conversation
// history — a COUNT returns a single integer instead of the whole thread.
async function handleGetUnreadSupportCount(data: any) {
  const { userId } = data;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  const count = await prisma.supportMessage.count({
    where: { userId, sender: 'ADMIN', isRead: false }
  });

  return NextResponse.json({ success: true, count });
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

  if (actualSender === 'STUDENT') {
    notifyStaff('support', async () => ({
      title: await studentLabel(userId),
      body: shorten(message),
      data: { screen: 'chat', userId },
      tag: `chat-${userId}`, // one notification per student, updated with the latest message
    }));
  }

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

// ---------------------------------------------------------------------------
// Website tour: users.tourCompletedAt (null = new user who has not finished the tour).
// Read/written with raw SQL so it works even before the Prisma client is regenerated.
// undefined means "unknown" (e.g. column missing) and never triggers the tour.
// ---------------------------------------------------------------------------
type TourFlags = {
  tourCompletedAt?: string | null; noticesTourCompletedAt?: string | null; testsTourCompletedAt?: string | null; typingTourCompletedAt?: string | null;
  lockerTourCompletedAt?: string | null; profileTourCompletedAt?: string | null; plannerTourCompletedAt?: string | null; friendsTourCompletedAt?: string | null;
};

// Newer page tours (Study Planner, With Friends) are kept in their own small table instead of
// one more users column each: one row per user and finished tour.
const TABLE_TOURS = ['planner', 'friends'] as const;
let userToursReady: Promise<void> | null = null;
function ensureUserToursTable(): Promise<void> {
  if (!userToursReady) {
    userToursReady = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS user_tours (
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tour TEXT NOT NULL,
        "completedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("userId", tour)
      )`);
      await prisma.$executeRawUnsafe(`ALTER TABLE user_tours ENABLE ROW LEVEL SECURITY`);
    })().catch(err => { userToursReady = null; throw err; });
  }
  return userToursReady;
}

async function readTableTours(userId: string): Promise<Pick<TourFlags, 'plannerTourCompletedAt' | 'friendsTourCompletedAt'>> {
  try {
    await ensureUserToursTable();
    const rows = await prisma.$queryRawUnsafe<{ tour: string; completedAt: Date }[]>(
      `SELECT tour, "completedAt" FROM user_tours WHERE "userId" = $1`, userId);
    const at = (t: string) => { const r = rows.find(x => x.tour === t); return r ? new Date(r.completedAt).toISOString() : null; };
    return { plannerTourCompletedAt: at('planner'), friendsTourCompletedAt: at('friends') };
  } catch {
    return {}; // unknown: never starts these tours by itself
  }
}

async function readTourFlags(userId: string): Promise<TourFlags> {
  const iso = (v: any) => (v ? new Date(v).toISOString() : null);
  const extra = await readTableTours(userId);
  try {
    const rows = await prisma.$queryRaw<any[]>`SELECT "tourCompletedAt", "noticesTourCompletedAt", "testsTourCompletedAt", "typingTourCompletedAt", "lockerTourCompletedAt", "profileTourCompletedAt" FROM "users" WHERE "id" = ${userId}`;
    if (!rows.length) return {};
    return {
      tourCompletedAt: iso(rows[0].tourCompletedAt),
      noticesTourCompletedAt: iso(rows[0].noticesTourCompletedAt),
      testsTourCompletedAt: iso(rows[0].testsTourCompletedAt),
      typingTourCompletedAt: iso(rows[0].typingTourCompletedAt),
      lockerTourCompletedAt: iso(rows[0].lockerTourCompletedAt),
      profileTourCompletedAt: iso(rows[0].profileTourCompletedAt),
      ...extra,
    };
  } catch {
    // Older databases may lack the notices column: fall back to the welcome-tour column only
    try {
      const rows = await prisma.$queryRaw<any[]>`SELECT "tourCompletedAt" FROM "users" WHERE "id" = ${userId}`;
      return rows.length ? { tourCompletedAt: iso(rows[0].tourCompletedAt), ...extra } : {};
    } catch {
      return {};
    }
  }
}

async function handleCompleteTour(data: any, requesterUserId: string | null) {
  const userId = data?.userId;
  if (!userId || userId !== requesterUserId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }
  if ((TABLE_TOURS as readonly string[]).includes(data?.tour)) {
    try {
      await ensureUserToursTable();
      const rows = await prisma.$queryRawUnsafe<{ completedAt: Date }[]>(
        `INSERT INTO user_tours ("userId", tour) VALUES ($1, $2)
         ON CONFLICT ("userId", tour) DO UPDATE SET tour = EXCLUDED.tour RETURNING "completedAt"`, userId, data.tour);
      return NextResponse.json({ success: true, tour: data.tour, completedAt: new Date(rows[0]?.completedAt || Date.now()).toISOString() });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed to save tour status' }, { status: 500 });
    }
  }
  const tour = data?.tour === 'notices' ? 'notices' : data?.tour === 'tests' ? 'tests' : data?.tour === 'typing' ? 'typing' : data?.tour === 'locker' ? 'locker' : data?.tour === 'profile' ? 'profile' : 'welcome';
  try {
    const rows = tour === 'profile'
      ? await prisma.$queryRaw<any[]>`UPDATE "users" SET "profileTourCompletedAt" = COALESCE("profileTourCompletedAt", now()) WHERE "id" = ${userId} RETURNING "profileTourCompletedAt" AS "at"`
      : tour === 'locker'
      ? await prisma.$queryRaw<any[]>`UPDATE "users" SET "lockerTourCompletedAt" = COALESCE("lockerTourCompletedAt", now()) WHERE "id" = ${userId} RETURNING "lockerTourCompletedAt" AS "at"`
      : tour === 'typing'
      ? await prisma.$queryRaw<any[]>`UPDATE "users" SET "typingTourCompletedAt" = COALESCE("typingTourCompletedAt", now()) WHERE "id" = ${userId} RETURNING "typingTourCompletedAt" AS "at"`
      : tour === 'tests'
      ? await prisma.$queryRaw<any[]>`UPDATE "users" SET "testsTourCompletedAt" = COALESCE("testsTourCompletedAt", now()) WHERE "id" = ${userId} RETURNING "testsTourCompletedAt" AS "at"`
      : tour === 'notices'
      ? await prisma.$queryRaw<any[]>`UPDATE "users" SET "noticesTourCompletedAt" = COALESCE("noticesTourCompletedAt", now()) WHERE "id" = ${userId} RETURNING "noticesTourCompletedAt" AS "at"`
      : await prisma.$queryRaw<any[]>`UPDATE "users" SET "tourCompletedAt" = COALESCE("tourCompletedAt", now()) WHERE "id" = ${userId} RETURNING "tourCompletedAt" AS "at"`;
    const value = rows[0]?.at;
    return NextResponse.json({ success: true, tour, completedAt: value ? new Date(value).toISOString() : new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to save tour status' }, { status: 500 });
  }
}

/** EGRESS-OPT: the session fields the result lists use (no progress snapshot or other heavy columns). */
const SESSION_LIST_SELECT = {
  id: true, userId: true, mockTestId: true, status: true, startedAt: true, completedAt: true, createdAt: true,
  remainingSeconds: true, violationsCount: true, finalScore: true, maxScore: true, accuracyPercentage: true,
  timeSpentSeconds: true, currentSectionIndex: true, currentQuestionIndex: true,
  testbookRank: true, testbookPercentile: true,
  mockTest: { select: { title: true, maxMarks: true, durationMinutes: true, positiveMarks: true, negativeMarks: true } },
} as const;

async function handleGetUserDetails(data: any, requesterUserId: string | null = null) {
  // Saved exam-portal passwords in tracked jobs are shown only to the account owner
  const viewingOwnAccount = data?.userId === requesterUserId;
  const { userId } = data;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  // EGRESS-OPT: Fetch recent sessions WITHOUT question responses.
  // This action is called on every tab focus switch — loading all responses (thousands of rows)
  // on each tab switch was a massive recurring egress cost. Responses are loaded on-demand
  // when the user opens a specific test analysis screen (via get-session-responses).
  const tourPromise = readTourFlags(userId);
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      testSessions: {
        take: 30, // EGRESS-OPT: recent sessions only; answers load when an analysis opens
        select: SESSION_LIST_SELECT,
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
    ...(await tourPromise),
    bookmarkedQuestions: u.bookmarkedQuestions ? (u.bookmarkedQuestions as any) : [],
    trackedJobs: !u.trackedJobs ? [] : viewingOwnAccount ? (u.trackedJobs as any) : (u.trackedJobs as any[]).map((j: any) => ({ ...j, password: undefined })),
    // EGRESS-OPT: sessions mapped WITHOUT responses (responses = {} always empty here)
    testSessions: u.testSessions.map((session: any) => {
      return {
        id: session.id,
        testId: session.mockTestId,
        title: session.mockTest?.title || 'Mock Test',
        score: session.finalScore ?? 0,
        // Prefer the attempt-time-accurate maxScore stored on the session itself over
        // mockTest.maxMarks, which is a cached value that can drift out of sync with the
        // real per-question marks (see the maxScore field comment in schema.prisma).
        maxScore: session.maxScore ?? session.mockTest?.maxMarks ?? 200,
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

// Lazily loads the full per-question response state for one session. Login/refresh always
// return responses: {} for egress reasons (a user can have thousands of response rows across
// their history) — this is the on-demand fetch that's supposed to backfill it the moment a
// student actually opens that one attempt's analysis page. Without it, the analysis page's
// hasActualResponses check sees an empty object and falls back to reconstructing fake, seeded
// correct/incorrect/skipped statuses instead of showing the student's real answers — which
// then also feeds the wrong numbers into the section-wise score breakdown.
async function handleGetSessionResponses(data: any) {
  const { userId, sessionId } = data || {};
  if (!userId || !sessionId) {
    return NextResponse.json({ success: false, error: 'userId and sessionId are required' }, { status: 400 });
  }

  const session = await prisma.userTestSession.findUnique({
    where: { id: sessionId },
    select: {
      userId: true,
      responses: {
        select: {
          questionId: true,
          selectedOptionIndex: true,
          state: true,
          elapsedSeconds: true,
        },
      },
    },
  });

  if (!session || session.userId !== userId) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
  }

  const responsesRecord: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number; state?: number }> = {};
  session.responses.forEach((r) => {
    responsesRecord[r.questionId] = {
      selectedOptionIndex: r.selectedOptionIndex,
      elapsedSeconds: r.elapsedSeconds,
      state: r.state,
    };
  });

  return NextResponse.json({ success: true, sessionId, responses: responsesRecord });
}

// Staff only (checked in POST). Full user list for ADMIN; other staff roles only get what
// their screens need (name, contact, role). Passwords and login sessions are never included.
async function handleAdminData(requesterRole: string | null) {
  const isAdmin = requesterRole === 'ADMIN';

  // Fetch all users list WITHOUT sessions (sessions loaded lazily per user to avoid timeout).
  // EGRESS-OPT: only the columns the admin screens use (no password, bookmarks, saved jobs…);
  // reading every column of every user was ~280 KB per admin page load.
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true, candidateCode: true, fullName: true, email: true, mobile: true, role: true,
      isBlocked: true, lastSeen: true, lastPlatform: true, createdAt: true,
      ...(isAdmin ? {
        referralCode: true, referredBy: true, referralsCount: true, subscriptionTier: true,
        subscriptionPurchasedAt: true, subscriptionExpiresAt: true, coins: true, referralCoinsCredited: true,
      } : {}),
    },
  });

  if (!isAdmin) {
    return NextResponse.json({
      success: true,
      usersList: users.map((u: any) => ({
        id: u.id,
        candidateCode: u.candidateCode,
        name: u.fullName,
        email: u.email,
        mobile: u.mobile,
        role: u.role,
        isBlocked: u.isBlocked,
        lastSeen: u.lastSeen ? u.lastSeen.toISOString() : null,
        lastPlatform: u.lastPlatform || 'web',
        testSessions: [],
      })),
      reportedQuestionsList: [],
    });
  }

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
    bookmarkedQuestions: [], // not used by the admin screens; not read (egress)
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

// Password reset codes live in the database (hashed), so every server instance sees them
let passwordResetTableReady: Promise<void> | null = null;
function ensurePasswordResetTable(): Promise<void> {
  if (!passwordResetTableReady) {
    passwordResetTableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS password_resets (
          email TEXT PRIMARY KEY,
          "codeHash" TEXT NOT NULL,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          tries INT NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`);
      await prisma.$executeRawUnsafe(`ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY`);
    })().catch((err) => { passwordResetTableReady = null; throw err; });
  }
  return passwordResetTableReady;
}

const sha256Hex = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const RESET_MAX_TRIES = 5;

async function handleRequestPasswordReset(data: { email: string }, request: Request) {
  const email = typeof data?.email === 'string' ? data.email : '';
  if (!email.trim()) {
    return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
  }
  const trimmedEmail = email.trim().toLowerCase().slice(0, 254);
  // The same answer whether or not the account exists, so this form cannot be used to
  // find out who has an account
  const sent = NextResponse.json({ success: true, message: 'If an account exists for this email, a code has been sent.' });

  // At most 3 codes per email per 15 minutes and 10 per IP per hour (no flooding someone's inbox)
  const ip = getClientIp(request);
  const [byEmail, byIp] = await Promise.all([
    hitLimit(`pwreset_email:${trimmedEmail}`, 3, 15 * 60 * 1000),
    hitLimit(`pwreset_ip:${ip}`, 10, 60 * 60 * 1000),
  ]);
  if (!byEmail.allowed || !byIp.allowed) {
    const wait = Math.max(byEmail.retryAfterMinutes, byIp.retryAfterMinutes);
    return NextResponse.json({ success: false, error: `Too many requests. Please try again in ${wait} minute${wait === 1 ? '' : 's'}.` }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email: trimmedEmail }, select: { id: true } });
  if (!user) return sent;

  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
  await ensurePasswordResetTable();
  await prisma.$executeRaw`
    INSERT INTO password_resets (email, "codeHash", "expiresAt", tries, "createdAt")
    VALUES (${trimmedEmail}, ${sha256Hex(`${trimmedEmail}:${otpCode}`)}, ${expiresAt}, 0, NOW())
    ON CONFLICT (email) DO UPDATE SET "codeHash" = EXCLUDED."codeHash", "expiresAt" = EXCLUDED."expiresAt", tries = 0, "createdAt" = NOW()`;

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
    return sent;
  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send OTP email.' }, { status: 500 });
  }
}

async function handleConfirmPasswordReset(data: any) {
  const { email, otp, newPassword } = data || {};

  if (!email || !otp || !newPassword || typeof email !== 'string') {
    return NextResponse.json({ success: false, error: 'Email, OTP, and new password are required' }, { status: 400 });
  }
  if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    return NextResponse.json({ success: false, error: 'New password must be at least 6 characters.' }, { status: 400 });
  }

  const trimmedEmail = email.trim().toLowerCase();
  await ensurePasswordResetTable();
  const rows = await prisma.$queryRaw<{ codeHash: string; expiresAt: Date; tries: number }[]>`
    SELECT "codeHash", "expiresAt", tries FROM password_resets WHERE email = ${trimmedEmail} LIMIT 1`;
  const pending = rows[0];

  if (!pending) {
    return NextResponse.json({ success: false, error: 'OTP expired or not found. Please request a new one.' }, { status: 400 });
  }
  if (Date.now() > new Date(pending.expiresAt).getTime()) {
    await prisma.$executeRaw`DELETE FROM password_resets WHERE email = ${trimmedEmail}`;
    return NextResponse.json({ success: false, error: 'OTP has expired. Please request a new one.' }, { status: 400 });
  }

  const given = sha256Hex(`${trimmedEmail}:${String(otp).trim()}`);
  const matches = given.length === pending.codeHash.length
    && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(pending.codeHash));
  if (!matches) {
    // At most 5 wrong codes, then a new code has to be requested
    const tries = pending.tries + 1;
    if (tries >= RESET_MAX_TRIES) await prisma.$executeRaw`DELETE FROM password_resets WHERE email = ${trimmedEmail}`;
    else await prisma.$executeRaw`UPDATE password_resets SET tries = ${tries} WHERE email = ${trimmedEmail}`;
    return NextResponse.json({ success: false, error: tries >= RESET_MAX_TRIES ? 'Too many wrong codes. Please request a new OTP.' : 'Invalid OTP code.' }, { status: 400 });
  }

  try {
    // Update password in the database (hashed) and sign the account out everywhere
    const updatedUser = await prisma.user.update({
      where: { email: trimmedEmail },
      data: { passwordHash: await hashPassword(newPassword.trim()), currentSessionId: null },
      select: { id: true },
    });
    await revokeAllWebSessions(updatedUser.id).catch(() => {});
    await prisma.$executeRaw`DELETE FROM password_resets WHERE email = ${trimmedEmail}`;

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

async function handleGetAdminSessionAnalysis(rawPayload: any) {
  try {
    const payload = rawPayload?.data || rawPayload || {};
    const sessionId = payload.sessionId || payload.id;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    // 1. Query UserTestSession with User and MockTest details
    const session = await prisma.userTestSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            candidateCode: true,
            mobile: true,
          }
        },
        mockTest: {
          select: {
            id: true,
            title: true,
            titleHi: true,
            durationMinutes: true,
            maxMarks: true,
            positiveMarks: true,
            negativeMarks: true,
            questionsCount: true,
            customQuestions: true,
            hasSectionalTiming: true,
            sectionalTimings: true,
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
            },
            sections: {
              select: {
                id: true,
                name: true,
                orderIndex: true,
                positiveMarks: true,
                negativeMarks: true,
                questions: {
                  select: {
                    id: true,
                    textEn: true,
                    textHi: true,
                    optionsEn: true,
                    optionsHi: true,
                    correctIndex: true,
                    explanationEn: true,
                    explanationHi: true,
                    imageUrl: true,
                    mathLatex: true,
                    orderIndex: true,
                    positiveMarks: true,
                    negativeMarks: true,
                  },
                  orderBy: { orderIndex: 'asc' }
                }
              },
              orderBy: { orderIndex: 'asc' }
            }
          }
        },
        responses: {
          select: {
            id: true,
            questionId: true,
            selectedOptionIndex: true,
            state: true,
            elapsedSeconds: true,
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Test session not found' }, { status: 404 });
    }

    // 2. Fetch Questions list
    let questionsList: any[] = [];
    const mockTest = session.mockTest;

    // A) Check customQuestions (direct array or Tigris S3 URL)
    let questionsData = mockTest?.customQuestions;
    if (questionsData) {
      if (typeof questionsData === 'object' && !Array.isArray(questionsData) && 'url' in (questionsData as any)) {
        const url = (questionsData as any).url;
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
            questionsData = JSON.parse(bodyContents);
          }
        } catch (s3Err) {
          console.warn("Failed to fetch questions from Tigris S3 via SDK, trying fetch:", s3Err);
          try {
            const fetchRes = await fetch(url);
            if (fetchRes.ok) questionsData = await fetchRes.json();
          } catch {}
        }
      }

      if (Array.isArray(questionsData)) {
        questionsList = questionsData;
      } else if (questionsData && typeof questionsData === 'object') {
        if (Array.isArray((questionsData as any).data)) questionsList = (questionsData as any).data;
        else if (Array.isArray((questionsData as any).questions)) questionsList = (questionsData as any).questions;
      }
    }

    // B) If no customQuestions, check section.questions from relational DB
    if (questionsList.length === 0 && mockTest?.sections && mockTest.sections.length > 0) {
      mockTest.sections.forEach(sec => {
        (sec.questions || []).forEach(q => {
          questionsList.push({
            id: q.id,
            sectionName: sec.name,
            textEn: q.textEn,
            textHi: q.textHi,
            optionsEn: q.optionsEn,
            optionsHi: q.optionsHi,
            correctOptionIndex: q.correctIndex,
            explanationEn: q.explanationEn,
            explanationHi: q.explanationHi,
            imageUrl: q.imageUrl,
            mathLatex: q.mathLatex,
            positiveMarks: q.positiveMarks ?? sec.positiveMarks ?? mockTest.positiveMarks ?? 2.0,
            negativeMarks: q.negativeMarks ?? sec.negativeMarks ?? mockTest.negativeMarks ?? 0.5,
          });
        });
      });
    }

    // 3. Map candidate responses
    const responseMap = new Map<string, any>();
    (session.responses || []).forEach(r => {
      responseMap.set(r.questionId, r);
    });

    const defaultPositive = mockTest?.positiveMarks ?? 2.0;
    const defaultNegative = mockTest?.negativeMarks ?? 0.5;

    let computedCorrect = 0;
    let computedIncorrect = 0;
    let computedSkipped = 0;
    let computedScore = 0;

    // If questionsList is still empty, build question items directly from responses
    if (questionsList.length === 0 && (session.responses || []).length > 0) {
      questionsList = (session.responses || []).map((r, i) => ({
        id: r.questionId,
        sectionName: 'General',
        textEn: `Question #${i + 1}`,
        textHi: `प्रश्न #${i + 1}`,
        optionsEn: ['Option A', 'Option B', 'Option C', 'Option D'],
        optionsHi: ['विकल्प A', 'विकल्प B', 'विकल्प C', 'विकल्प D'],
        correctOptionIndex: 0,
        explanationEn: 'Question text was archived or not stored in the question bank.',
        explanationHi: 'प्रश्न विवरण उपलब्ध नहीं है।',
        positiveMarks: defaultPositive,
        negativeMarks: defaultNegative,
      }));
    }

    const enrichedQuestions = questionsList.map((q, idx) => {
      const qId = q.id || `q_${idx}`;
      const resp = responseMap.get(qId) || responseMap.get(String(idx + 1)) || responseMap.get(String(idx));
      const userSelected = resp?.selectedOptionIndex !== undefined ? resp.selectedOptionIndex : null;
      const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : (q.correctIndex !== undefined ? q.correctIndex : 0);

      const posMark = Number(q.positiveMarks ?? defaultPositive);
      const negMark = Number(q.negativeMarks ?? defaultNegative);

      let status: 'correct' | 'incorrect' | 'skipped' = 'skipped';
      let marksAwarded = 0;

      if (userSelected === null || userSelected === undefined || userSelected === -1) {
        status = 'skipped';
        marksAwarded = 0;
        computedSkipped++;
      } else if (userSelected === correctIdx) {
        status = 'correct';
        marksAwarded = posMark;
        computedCorrect++;
        computedScore += posMark;
      } else {
        status = 'incorrect';
        marksAwarded = -negMark;
        computedIncorrect++;
        computedScore -= negMark;
      }

      return {
        id: qId,
        questionNumber: idx + 1,
        sectionName: q.sectionName || q.section || 'General',
        textEn: q.textEn || q.text || '',
        textHi: q.textHi || '',
        optionsEn: Array.isArray(q.optionsEn) ? q.optionsEn : (Array.isArray(q.options) ? q.options : []),
        optionsHi: Array.isArray(q.optionsHi) ? q.optionsHi : [],
        correctOptionIndex: correctIdx,
        userSelectedOptionIndex: userSelected,
        status,
        marksAwarded: Math.round(marksAwarded * 100) / 100,
        positiveMarks: posMark,
        negativeMarks: negMark,
        timeSpentSeconds: resp?.elapsedSeconds || 0,
        explanationEn: q.explanationEn || q.explanation || '',
        explanationHi: q.explanationHi || '',
        imageUrl: q.imageUrl || null,
        mathLatex: q.mathLatex || null,
      };
    });

    // 4. Section-wise Breakdown
    const sectionsMap = new Map<string, {
      sectionName: string;
      totalQuestions: number;
      attempted: number;
      correct: number;
      incorrect: number;
      skipped: number;
      score: number;
      timeSpentSeconds: number;
    }>();

    enrichedQuestions.forEach(q => {
      const secName = q.sectionName || 'General';
      if (!sectionsMap.has(secName)) {
        sectionsMap.set(secName, {
          sectionName: secName,
          totalQuestions: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          skipped: 0,
          score: 0,
          timeSpentSeconds: 0,
        });
      }
      const s = sectionsMap.get(secName)!;
      s.totalQuestions++;
      s.timeSpentSeconds += q.timeSpentSeconds;
      if (q.status === 'correct') {
        s.attempted++;
        s.correct++;
        s.score += q.marksAwarded;
      } else if (q.status === 'incorrect') {
        s.attempted++;
        s.incorrect++;
        s.score += q.marksAwarded;
      } else {
        s.skipped++;
      }
    });

    const sectionsSummary = Array.from(sectionsMap.values()).map(s => ({
      ...s,
      score: Math.round(s.score * 100) / 100,
      accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 1000) / 10 : 0
    }));

    // Live sum of each question's actual positive mark — mirrors the per-question resolution
    // used inside enrichedQuestions above. Preferred over mockTest.maxMarks, which is a cached
    // value that can silently drift out of sync with the real per-question marks.
    const computedMaxMarks = questionsList.reduce((sum, q) => sum + Number(q.positiveMarks ?? defaultPositive), 0);

    // 5. Final Summary
    const finalScore = session.finalScore !== null ? session.finalScore : Math.round(computedScore * 100) / 100;
    const accuracy = session.accuracyPercentage !== null ? session.accuracyPercentage : (
      (computedCorrect + computedIncorrect) > 0
        ? Math.round((computedCorrect / (computedCorrect + computedIncorrect)) * 1000) / 10
        : 0
    );

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        finalScore,
        maxMarks: session.maxScore ?? (computedMaxMarks || mockTest?.maxMarks || (questionsList.length * defaultPositive)),
        accuracyPercentage: accuracy,
        timeSpentSeconds: session.timeSpentSeconds,
        durationMinutes: mockTest?.durationMinutes || 60,
        violationsCount: session.violationsCount,
        source: session.source,
        testbookRank: session.testbookRank,
        testbookPercentile: session.testbookPercentile,
      },
      user: session.user,
      mockTest: {
        id: mockTest?.id,
        title: mockTest?.title,
        examName: mockTest?.testSeries?.exam?.name || 'Government Exam',
        categoryName: mockTest?.testSeries?.exam?.category?.name || '',
      },
      summary: {
        totalQuestions: enrichedQuestions.length,
        attempted: computedCorrect + computedIncorrect,
        correctCount: computedCorrect,
        incorrectCount: computedIncorrect,
        skippedCount: computedSkipped,
        finalScore,
        maxMarks: session.maxScore ?? (computedMaxMarks || mockTest?.maxMarks || (questionsList.length * defaultPositive)),
        accuracyPercentage: accuracy,
        timeSpentSeconds: session.timeSpentSeconds,
        violationsCount: session.violationsCount,
        rank: session.testbookRank,
        percentile: session.testbookPercentile,
      },
      sections: sectionsSummary,
      questions: enrichedQuestions,
    });
  } catch (err: any) {
    console.error('Error fetching session analysis:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch session analysis' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Admin Typing Attempt Logs Handlers
// -----------------------------------------------------------------------------

async function handleGetAdminTypingAttempts(params?: any) {
  try {
    const limit = Math.min(Number(params?.limit) || 500, 2000);
    const attempts = await prismaTyping.typingAttempt.findMany({
      take: limit,
      orderBy: { completedAt: 'desc' },
    });

    // Enrich with Test details safely from prismaTyping
    const testIds = Array.from(new Set(attempts.map(a => a.testId).filter(Boolean)));
    const testMap = new Map<string, any>();
    if (testIds.length > 0) {
      try {
        const tests = await prismaTyping.typingTest.findMany({
          where: { id: { in: testIds } },
          select: {
            id: true,
            title: true,
            titleHi: true,
            categoryId: true,
            language: true,
            qualifyingWpm: true,
            maxErrorPercentage: true,
            mainDurationMinutes: true,
          }
        });
        tests.forEach(t => testMap.set(t.id, t));
      } catch (testErr) {
        console.warn('Could not fetch test details for typing attempts:', testErr);
      }
    }

    // Enrich with User details (email, candidateCode, mobile) from primary DB
    const userIds = Array.from(new Set(attempts.map(a => a.userId).filter(uid => uid && uid !== 'guest')));
    const userMap = new Map<string, any>();
    if (userIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true, email: true, candidateCode: true, mobile: true }
        });
        users.forEach(u => userMap.set(u.id, u));
      } catch (userErr) {
        console.warn('Could not fetch user details for typing attempts:', userErr);
      }
    }

    const enriched = attempts.map(a => {
      const u = userMap.get(a.userId);
      const t = testMap.get(a.testId);

      // Derive category if empty
      let cat = a.categoryName || t?.categoryId || '';
      if (!cat) {
        const lowerTitle = (a.testTitle || '').toLowerCase();
        const lowerId = (a.testId || '').toLowerCase();
        if (lowerTitle.includes('chsl') || lowerId.includes('chsl')) cat = 'SSC CHSL Typing';
        else if (lowerTitle.includes('cgl') || lowerId.includes('cgl')) cat = 'SSC CGL Typing';
        else if (lowerTitle.includes('punjab') || lowerId.includes('punjab')) cat = 'Punjab & Haryana High Court';
        else if (lowerTitle.includes('bombay') || lowerId.includes('bombay')) cat = 'Bombay High Court';
        else if (lowerTitle.includes('spmcil') || lowerId.includes('spmcil')) cat = 'SPMCIL Typing';
        else if (lowerTitle.includes('rrb') || lowerId.includes('rrb')) cat = 'RRB NTPC Typing';
        else if (lowerTitle.includes('court') || lowerId.includes('court')) cat = 'High Court Typing';
        else cat = 'General Typing';
      }

      return {
        ...a,
        categoryName: cat,
        test: t || null,
        user: u || {
          id: a.userId,
          fullName: a.userName || 'Guest Candidate',
          email: a.userId === 'guest' ? 'guest@typing.test' : 'N/A',
          candidateCode: a.userId === 'guest' ? 'GUEST' : (a.userId?.substring(0, 8).toUpperCase() || 'NO-CODE'),
          mobile: null
        }
      };
    });

    return NextResponse.json({ success: true, attempts: enriched });
  } catch (error: any) {
    console.error('Failed to get admin typing attempts:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to get typing attempts' }, { status: 500 });
  }
}

async function handleDeleteTypingAttempt(id?: string) {
  try {
    if (!id) return NextResponse.json({ success: false, error: 'Missing attempt ID' }, { status: 400 });
    await prismaTyping.typingAttempt.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Typing attempt deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete typing attempt:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete typing attempt' }, { status: 500 });
  }
}

async function handleGetTypingAttemptById(id: string | undefined, requesterUserId: string | null, isStaffRequester: boolean) {
  try {
    if (!id) return NextResponse.json({ success: false, error: 'Missing attempt ID' }, { status: 400 });
    const attempt = await prismaTyping.typingAttempt.findUnique({
      where: { id }
    });
    // Only the student who typed it (or staff) may open a result
    if (!attempt || (!isStaffRequester && attempt.userId !== requesterUserId)) {
      return NextResponse.json({ success: false, error: 'Typing attempt not found' }, { status: 404 });
    }

    // Enrich with Test details if possible
    let testData: any = null;
    if (attempt.testId) {
      try {
        testData = await prismaTyping.typingTest.findUnique({
          where: { id: attempt.testId },
          select: {
            id: true,
            title: true,
            titleHi: true,
            categoryId: true,
            language: true,
            qualifyingWpm: true,
            maxErrorPercentage: true,
            mainDurationMinutes: true,
            passageText: true,
            backspaceRule: true,
            enableBackspace: true,
            allowRetype: true,
          }
        });
      } catch (testErr) {
        console.warn('Could not fetch test details for typing attempt:', testErr);
      }
    }

    // Enrich with User details (email, candidateCode, mobile) from primary DB
    let userData: any = null;
    if (attempt.userId && attempt.userId !== 'guest') {
      try {
        userData = await prisma.user.findUnique({
          where: { id: attempt.userId },
          select: { id: true, fullName: true, email: true, candidateCode: true, mobile: true }
        });
      } catch (userErr) {
        console.warn('Could not fetch user details for typing attempt:', userErr);
      }
    }

    // Derive category if empty
    let cat = attempt.categoryName || testData?.categoryId || '';
    if (!cat) {
      const lowerTitle = (attempt.testTitle || '').toLowerCase();
      const lowerId = (attempt.testId || '').toLowerCase();
      if (lowerTitle.includes('chsl') || lowerId.includes('chsl')) cat = 'SSC CHSL Typing';
      else if (lowerTitle.includes('cgl') || lowerId.includes('cgl')) cat = 'SSC CGL Typing';
      else if (lowerTitle.includes('punjab') || lowerId.includes('punjab')) cat = 'Punjab & Haryana High Court';
      else if (lowerTitle.includes('bombay') || lowerId.includes('bombay')) cat = 'Bombay High Court';
      else if (lowerTitle.includes('spmcil') || lowerId.includes('spmcil')) cat = 'SPMCIL Typing';
      else if (lowerTitle.includes('rrb') || lowerId.includes('rrb')) cat = 'RRB NTPC Typing';
      else if (lowerTitle.includes('court') || lowerId.includes('court')) cat = 'High Court Typing';
      else cat = 'General Typing';
    }

    const enriched = {
      ...attempt,
      categoryName: cat,
      test: testData || null,
      user: userData || {
        id: attempt.userId,
        fullName: attempt.userName || 'Guest Candidate',
        email: attempt.userId === 'guest' ? 'guest@typing.test' : 'N/A',
        candidateCode: attempt.userId === 'guest' ? 'GUEST' : (attempt.userId?.substring(0, 8).toUpperCase() || 'NO-CODE'),
        mobile: null
      }
    };

    return NextResponse.json({ success: true, attempt: enriched });
  } catch (error: any) {
    console.error('Failed to get typing attempt by id:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to get typing attempt' }, { status: 500 });
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

// -----------------------------------------------------------------------------
// Locker PIN: stored hashed (scrypt), never sent to the browser. A correct PIN gives a
// short-lived unlock token; the document list and deleting need it. Wrong PINs and wrong
// reset codes are limited per account (kept in the database, so all servers agree).
// -----------------------------------------------------------------------------
const LOCKER_UNLOCK_TTL_MS = 12 * 60 * 60 * 1000;
const LOCKER_PIN_MAX_WRONG = 5;
const LOCKER_PIN_LOCK_MS = 15 * 60 * 1000;

let lockerUnlockTableReady: Promise<void> | null = null;
function ensureLockerUnlockTable(): Promise<void> {
  if (!lockerUnlockTableReady) {
    lockerUnlockTableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS locker_unlocks (
          "tokenHash" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "expiresAt" TIMESTAMP(3) NOT NULL
        )`);
      await prisma.$executeRawUnsafe(`ALTER TABLE locker_unlocks ENABLE ROW LEVEL SECURITY`);
    })().catch((err) => { lockerUnlockTableReady = null; throw err; });
  }
  return lockerUnlockTableReady;
}

async function issueLockerUnlock(userId: string): Promise<string> {
  await ensureLockerUnlockTable();
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + LOCKER_UNLOCK_TTL_MS);
  await prisma.$executeRaw`INSERT INTO locker_unlocks ("tokenHash", "userId", "expiresAt") VALUES (${sha256Hex(token)}, ${userId}, ${expiresAt})`;
  prisma.$executeRaw`DELETE FROM locker_unlocks WHERE "expiresAt" < NOW()`.catch(() => {});
  return token;
}

async function lockerUnlockValid(userId: string, token: unknown): Promise<boolean> {
  if (typeof token !== 'string' || token.length < 32) return false;
  await ensureLockerUnlockTable();
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM locker_unlocks WHERE "tokenHash" = ${sha256Hex(token)} AND "userId" = ${userId} AND "expiresAt" > NOW()`;
  return (rows[0]?.n || 0) > 0;
}

async function revokeLockerUnlocks(userId: string) {
  await ensureLockerUnlockTable();
  await prisma.$executeRaw`DELETE FROM locker_unlocks WHERE "userId" = ${userId}`;
}

async function readLockerPin(userId: string): Promise<string | null> {
  const rows: any[] = await prisma.$queryRaw`SELECT "lockerPin" FROM "users" WHERE "id" = ${userId} LIMIT 1`;
  return rows[0]?.lockerPin || null;
}

/** Checks a PIN; old plain-text PINs are upgraded to a hash on the first correct entry. */
async function lockerPinMatches(userId: string, stored: string, pin: string): Promise<boolean> {
  if (isPasswordHash(stored)) return verifyPassword(pin, stored);
  const ok = stored.length === pin.length && crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(pin));
  if (ok) await saveLockerPin(userId, pin);
  return ok;
}

async function saveLockerPin(userId: string, pin: string) {
  const hashed = await hashPassword(pin);
  const now = new Date();
  await prisma.$executeRaw`UPDATE "users" SET "lockerPin" = ${hashed}, "lockerPinSetAt" = ${now} WHERE "id" = ${userId}`;
  return now;
}

/** null when the PIN may be tried; otherwise the "locked" response. */
async function lockerPinLocked(userId: string) {
  const wrong = await countHits(`locker_pin:${userId}`, LOCKER_PIN_LOCK_MS);
  if (wrong < LOCKER_PIN_MAX_WRONG) return null;
  return NextResponse.json({
    success: false, locked: true,
    error: 'Too many wrong PINs. The locker is locked for 15 minutes, or use "Forgot PIN".',
  }, { status: 429 });
}

async function lockerWrongPin(userId: string) {
  await hitLimit(`locker_pin:${userId}`, 1000, LOCKER_PIN_LOCK_MS);
  const wrong = await countHits(`locker_pin:${userId}`, LOCKER_PIN_LOCK_MS);
  const left = Math.max(0, LOCKER_PIN_MAX_WRONG - wrong);
  return { left, locked: left === 0 };
}

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

    // With a PIN set, the documents are sent only to a browser that entered the PIN
    const unlocked = !user.lockerPin || await lockerUnlockValid(userId, data?.unlockToken);
    const documents = unlocked
      ? await (prisma as any).lockerDocument.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
      : [];

    return NextResponse.json({
      success: true,
      locked: !unlocked,
      user: { ...user, lockerPin: user.lockerPin ? 'set' : null },
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
  const { userId: explicitUserId } = data || {};
  const docId = data?.docId || data?.id; // the page sends "id"
  const userId = explicitUserId || requesterUserId;
  if (userId && (await readLockerPin(userId)) && !(await lockerUnlockValid(userId, data?.unlockToken))) {
    return NextResponse.json({ success: false, locked: true, error: 'Enter your locker PIN first.' }, { status: 403 });
  }

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
    // Only the first PIN is set here; changing one needs the current PIN or a reset code
    if (await readLockerPin(userId)) {
      return NextResponse.json({ success: false, error: 'A PIN is already set. Use "Change PIN" or "Forgot PIN".' }, { status: 409 });
    }
    const now = await saveLockerPin(userId, pin);
    return NextResponse.json({
      success: true,
      message: 'Locker PIN set successfully',
      unlockToken: await issueLockerUnlock(userId),
      user: { id: userId, lockerPin: 'set', lockerPinSetAt: now },
    });
  } catch (error: any) {
    console.error('Error setting locker PIN:', error);
    return NextResponse.json({ success: false, error: 'Failed to set locker PIN' }, { status: 500 });
  }
}

async function handleLockerVerifyPin(data: any, requesterUserId: string | null) {
  const userId = data?.userId || requesterUserId;
  const pin = (data?.pin || '').toString().trim();

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  try {
    const stored = await readLockerPin(userId);
    if (!stored) {
      return NextResponse.json({ success: false, error: 'No PIN is set for this account.' }, { status: 404 });
    }
    const locked = await lockerPinLocked(userId);
    if (locked) return locked;

    if (!/^\d{4}$/.test(pin) || !(await lockerPinMatches(userId, stored, pin))) {
      const { left, locked: nowLocked } = await lockerWrongPin(userId);
      return NextResponse.json({ success: true, isCorrect: false, attemptsLeft: left, locked: nowLocked });
    }
    await clearLimit(`locker_pin:${userId}`);
    return NextResponse.json({ success: true, isCorrect: true, unlockToken: await issueLockerUnlock(userId) });
  } catch (error: any) {
    console.error('Error verifying locker PIN:', error);
    return NextResponse.json({ success: false, error: 'Failed to verify PIN' }, { status: 500 });
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
    const stored = await readLockerPin(userId);
    if (!stored) {
      return NextResponse.json({ success: false, error: 'No PIN is set for this account.' }, { status: 404 });
    }
    const locked = await lockerPinLocked(userId);
    if (locked) return locked;
    if (!(await lockerPinMatches(userId, stored, oldPin))) {
      const { left } = await lockerWrongPin(userId);
      return NextResponse.json({ success: false, error: `Current PIN is incorrect. ${left} attempt${left === 1 ? '' : 's'} left.` }, { status: 400 });
    }
    await clearLimit(`locker_pin:${userId}`);
    const now = await saveLockerPin(userId, newPin);
    await revokeLockerUnlocks(userId);
    return NextResponse.json({
      success: true,
      message: 'Security PIN updated successfully',
      unlockToken: await issueLockerUnlock(userId),
      user: { id: userId, lockerPin: 'set', lockerPinSetAt: now },
    });
  } catch (error: any) {
    console.error('Error changing locker PIN:', error);
    return NextResponse.json({ success: false, error: 'Failed to change locker PIN' }, { status: 500 });
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

    const tries = await hitLimit(`locker_pw:${userId}`, 5, 15 * 60 * 1000);
    if (!tries.allowed) {
      return NextResponse.json({ success: false, error: `Too many attempts. Please try again in ${tries.retryAfterMinutes} minutes.` }, { status: 429 });
    }
    if (!(await verifyPassword(accountPassword, user.passwordHash))) {
      return NextResponse.json({ success: false, error: 'Incorrect account password. Verification failed.' }, { status: 401 });
    }
    await clearLimit(`locker_pw:${userId}`);
    await clearLimit(`locker_pin:${userId}`);
    const now = await saveLockerPin(userId, newPin);
    await revokeLockerUnlocks(userId);
    return NextResponse.json({
      success: true,
      message: 'Locker PIN reset successfully',
      unlockToken: await issueLockerUnlock(userId),
      user: { id: userId, lockerPin: 'set', lockerPinSetAt: now },
    });

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

    // At most 3 codes per 15 minutes
    const sends = await hitLimit(`locker_otp_send:${userId}`, 3, 15 * 60 * 1000);
    if (!sends.allowed) {
      return NextResponse.json({ success: false, error: `Too many codes requested. Please try again in ${sends.retryAfterMinutes} minutes.` }, { status: 429 });
    }

    // Generate 6-digit OTP (stored hashed; a new code starts a new set of 5 tries)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: userId },
      data: {
        otpCode: `sha256$${sha256Hex(`${userId}:${otp}`)}`,
        otpExpiresAt: expiresAt,
      },
    });
    await clearLimit(`locker_otp_try:${userId}`);

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
        console.log(`[DEV OTP NOTIFICATION] Locker reset code sent to ${targetEmail} (SMTP not configured)`);
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

    if (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt)) {
      return NextResponse.json({ success: false, error: 'OTP has expired. Please request a new OTP.' }, { status: 400 });
    }

    // 5 wrong codes and the code is cancelled
    const tries = await countHits(`locker_otp_try:${userId}`, 10 * 60 * 1000);
    if (tries >= 5) {
      await prisma.user.update({ where: { id: userId }, data: { otpCode: null, otpExpiresAt: null } });
      return NextResponse.json({ success: false, error: 'Too many wrong codes. Please request a new OTP.' }, { status: 429 });
    }
    const expected = user.otpCode.startsWith('sha256$') ? user.otpCode.slice(7) : sha256Hex(`${userId}:${user.otpCode}`);
    const given = sha256Hex(`${userId}:${otp}`);
    if (!crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected.padEnd(given.length).slice(0, given.length)))) {
      await hitLimit(`locker_otp_try:${userId}`, 1000, 10 * 60 * 1000);
      return NextResponse.json({ success: false, error: 'Incorrect OTP. Please check your email and try again.' }, { status: 401 });
    }

    await clearLimit(`locker_otp_try:${userId}`);
    await clearLimit(`locker_pin:${userId}`);
    const now = await saveLockerPin(userId, newPin);
    await prisma.user.update({ where: { id: userId }, data: { otpCode: null, otpExpiresAt: null } });
    await revokeLockerUnlocks(userId);
    return NextResponse.json({
      success: true,
      message: 'PIN reset successfully! Your new 4-digit PIN is now active.',
      unlockToken: await issueLockerUnlock(userId),
      user: { id: userId, lockerPin: 'set', lockerPinSetAt: now },
    });

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




