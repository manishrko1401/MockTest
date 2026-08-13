/**
 * API client to communicate with the shared Next.js backend database endpoints.
 */

export const LOCAL_API_URL = 'http://192.168.1.14:3000/api/db';
export const PROD_API_URL = 'https://mock-test-three-indol.vercel.app/api/db';

export const API_URL = LOCAL_API_URL;
export const BASE_URL = API_URL.replace('/api/db', '');

let activeUserId: string | null = null;
let activeSessionId: string | null = null;
let sessionInvalidatedCallback: (() => void) | null = null;

export function setApiSession(userId: string | null, sessionId: string | null) {
  activeUserId = userId;
  activeSessionId = sessionId;
}

export function onSessionInvalidated(callback: () => void) {
  sessionInvalidatedCallback = callback;
}

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function postRequest(action: string, data: any = {}) {
  const endpoints = [LOCAL_API_URL, PROD_API_URL].filter((v, i, a) => a.indexOf(v) === i);

  if (activeUserId && activeSessionId && action !== 'login' && action !== 'signup') {
    data = {
      userId: data.userId || activeUserId,
      sessionId: activeSessionId,
      ...data
    };
  }

  let lastErrorResult: any = null;

  for (const endpoint of endpoints) {
    try {
      const isLocal = endpoint === LOCAL_API_URL;
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action, data }),
        },
        isLocal ? 3000 : 15000
      );

      const result = await response.json();

      if (result && (!result.error || !result.error.includes('Invalid action'))) {
        if (result.error === 'SESSION_INVALIDATED' && sessionInvalidatedCallback) {
          sessionInvalidatedCallback();
        }
        return result;
      }
      lastErrorResult = result;
    } catch (err) {
      // Use silent logging so Expo Go YellowBox warning popups are avoided during endpoint fallback
      console.log(`[API] Endpoint attempt failed on ${endpoint}, falling back to next endpoint...`);
    }
  }

  return lastErrorResult || { success: false, error: 'Network request failed. Please verify your server is running.' };
}

export const ApiClient = {
  setApiSession,
  onSessionInvalidated,
  bootstrap: () => postRequest('bootstrap'),

  /**
   * Smart catalog sync — returns only categories/tests added or updated since
   * the device's last sync. On first run (no lastSyncedAt), returns the full catalog.
   * Much lighter than bootstrap() for repeat launches.
   */
  catalogSync: (lastSyncedAt?: string | null) =>
    postRequest('catalog-sync', { lastSyncedAt: lastSyncedAt ?? null }),

  /**
   * Performs user login using email (new device / first login).
   * Always generates a fresh session ID — invalidates any other active session.
   */
  login: (email: string, password?: string) => postRequest('login', { email, password }),

  /**
   * Re-authenticates the current device without invalidating the existing session.
   * Pass the device's existing sessionId so the server reuses it if it still matches.
   * Use this for background refresh on app startup — NOT for a fresh device login.
   */
  loginRefresh: (email: string, password: string, existingSessionId: string) =>
    postRequest('login', { email, password, existingSessionId }),

  /**
   * Performs user signup/registration
   */
  signup: (name: string, email: string, mobile: string, password?: string, referralCodeInput?: string) => 
    postRequest('signup', { name, email, mobile, password: password || 'password123', referralCodeInput }),

  /**
   * Updates user profile info
   */
  updateProfile: (userId: string, name: string, email: string, mobile: string) =>
    postRequest('update-profile', { userId, name, email, mobile }),

  /**
   * Updates user password
   */
  updatePassword: (userId: string, newPass: string) =>
    postRequest('update-password', { userId, newPass }),

  /**
   * Updates user details from Admin/System (used on mobile for simulated coin redemption unlocks)
   */
  saveProfileAdmin: (params: any) => postRequest('save-profile-admin', params),

  /**
   * Claims pass pro for user
   */
  claimPassPro: (userId: string, tier?: string, coins?: number, expiry?: string) =>
    postRequest('claim-pass-pro', { userId, tier, coins, expiry }),

  /**
   * Fetches questions for a given mock test
   */
  getCustomQuestions: (testId: string) => postRequest('get-custom-questions', { testId }),

  /**
   * Saves ongoing mock test progress to resume later
   */
  saveOngoingSession: (params: {
    userId: string;
    testId: string;
    timeRemaining: number;
    violations: number;
    responses: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number }>;
    currentSectionIndex: number;
    currentQuestionIndex: number;
  }) => postRequest('save-ongoing-session', { source: 'app', ...params }),

  /**
   * Submits a completed mock test session
   */
  addAttempt: (params: {
    userId: string;
    testId: string;
    title?: string;
    score: number;
    maxScore: number;
    accuracy: number;
    durationSeconds: number;
    violations: number;
    responses: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number }>;
  }) => postRequest('add-attempt', { source: 'app', ...params }),

  /**
   * Deletes an ongoing session state when exiting/pausing completely
   */
  clearOngoingSession: (userId: string, testId: string) => 
    postRequest('clear-ongoing-session', { userId, testId }),



  /**
   * Resets a completed/saved attempt to let the user re-attempt
   */
  resetAttempt: (userId: string, sessionId: string) => 
    postRequest('reset-attempt', { userId, sessionId }),

  /**
   * Updates user bookmarked questions JSON
   */
  toggleBookmark: (userId: string, bookmarks: any[]) => 
    postRequest('toggle-bookmark', { userId, bookmarks }),

  /**
   * Submits a bug report for a specific question
   */
  reportQuestion: (params: {
    questionId: string;
    message: string;
    questionText: string;
    mockTestId: string;
    mockTestTitle: string;
    userId?: string;
    candidateCode?: string;
  }) => postRequest('report-question', params),

  /**
   * Fetches support chat messages for user
   */
  getSupportMessages: (userId: string, markAsRead = true, readerRole: 'STUDENT' | 'ADMIN' = 'STUDENT') => 
    postRequest('get-support-messages', { userId, markAsRead, readerRole }),

  /**
   * Sends a new support chat message
   */
  sendSupportMessage: (userId: string, sender: 'STUDENT' | 'ADMIN', message: string) => 
    postRequest('send-support-message', { userId, sender, message }),

  /**
   * Fetches referred friends for the current user
   */
  getReferredFriends: (referralCode: string) => 
    postRequest('get-referred-friends', { referralCode }),

  /**
   * Resets all referral data across users
   */
  resetReferrals: () =>
    postRequest('reset-referrals'),

  /**
   * Request password reset OTP via email
   */
  requestPasswordReset: (email: string) =>
    postRequest('request-password-reset', { email }),

  /**
   * Confirm password reset using OTP via email
   */
  confirmPasswordReset: (email: string, otp: string, newPassword: string) =>
    postRequest('confirm-password-reset', { email, otp, newPassword }),

  /**
   * Submits a user suggestion to MockTest Hub Team
   */
  submitSuggestion: (params: {
    userId?: string;
    name: string;
    email: string;
    category: string;
    message: string;
    source?: string;
  }) => postRequest('submit-suggestion', { ...params, source: params.source || 'app' }),

  /**
   * Fetch administrative panel data (users list, reported questions)
   */
  fetchAdminData: (userId: string) => postRequest('admin-data', { userId }),

  /**
   * Fetches single notice contentHtml details for mobile detail screen
   */
  getSingleNoticeContent: (id: string) => postRequest('get-single-notice-content', { id }),

  /**
   * Updates user's saved and applied tracked jobs list
   */
  updateTrackedJobs: (userId: string, trackedJobs: any[]) => postRequest('update-tracked-jobs', { userId, trackedJobs }),


  /**
   * Triggers a manual notice sync crawl on the server
   */
  triggerSyncNotices: async () => {
    const endpoints = [LOCAL_API_URL, PROD_API_URL].filter((v, i, a) => a.indexOf(v) === i);
    let success = false;
    let errorMsg = '';
    let details: any = null;

    for (const endpoint of endpoints) {
      try {
        const isLocal = endpoint === LOCAL_API_URL;
        const syncUrl = endpoint.replace('/api/db', '/api/cron/sync');
        const response = await fetchWithTimeout(syncUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }, isLocal ? 3000 : 15000);
        const result = await response.json();
        if (result && result.success) {
          success = true;
          details = result;
          break;
        }
        errorMsg = result?.error || 'Unknown sync error';
      } catch (err: any) {
        errorMsg = err.message || 'Sync request failed';
      }
    }
    return { success, error: errorMsg, details };
  },

  /**
   * Delete a reported question log
   */
  deleteReportedQuestion: (id: string) => postRequest('delete-reported-question', { id }),

  /**
   * Fetch all support users for Admin view
   */
  getSupportUsers: () => postRequest('get-support-users'),

  /**
   * Fetch user feedbacks & ratings
   */
  fetchFeedbacks: async () => {
    const endpoints = [LOCAL_API_URL, PROD_API_URL].filter((v, i, a) => a.indexOf(v) === i);
    let errorMsg = '';
    for (const endpoint of endpoints) {
      try {
        const isLocal = endpoint === LOCAL_API_URL;
        const feedbackUrl = endpoint.replace('/api/db', '/api/feedback');
        const response = await fetchWithTimeout(feedbackUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }, isLocal ? 3000 : 15000);
        const result = await response.json();
        if (result && result.success) {
          return result;
        }
        errorMsg = result?.error || 'Failed to fetch feedbacks';
      } catch (err: any) {
        errorMsg = err.message || 'Feedback fetch failed';
      }
    }
    return { success: false, error: errorMsg };
  },

  /**
   * Delete a user feedback log
   */
  deleteFeedback: async (id: string) => {
    const endpoints = [LOCAL_API_URL, PROD_API_URL].filter((v, i, a) => a.indexOf(v) === i);
    let errorMsg = '';
    for (const endpoint of endpoints) {
      try {
        const isLocal = endpoint === LOCAL_API_URL;
        const feedbackUrl = endpoint.replace('/api/db', `/api/feedback?id=${id}`);
        const response = await fetchWithTimeout(feedbackUrl, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
          }
        }, isLocal ? 3000 : 15000);
        const result = await response.json();
        if (result && result.success) {
          return result;
        }
        errorMsg = result?.error || 'Failed to delete feedback';
      } catch (err: any) {
        errorMsg = err.message || 'Feedback deletion failed';
      }
    }
    return { success: false, error: errorMsg };
  },

  /**
   * Fetch all test attempt logs
   */
  getAttempts: () => postRequest('get-attempts'),

  /**
   * Fetch user suggestions
   */
  getSuggestions: () => postRequest('get-suggestions'),

  /**
   * Update suggestion status / add admin reply
   */
  updateSuggestionStatus: (id: string, status: string, adminReply?: string) => 
    postRequest('update-suggestion-status', { id, status, adminReply }),

  /**
   * Delete a suggestion log
   */
  deleteSuggestion: (id: string) => postRequest('delete-suggestion', { id }),
};

