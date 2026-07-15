/**
 * API client to communicate with the shared Next.js backend database endpoints.
 */

// Replace this with your computer's local IP address if testing on a physical device,
// or your production domain name if deployed to Vercel/Supabase.
export const BASE_URL = 'https://mock-test-three-indol.vercel.app';
export const API_URL = `${BASE_URL}/api/db`;

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

async function postRequest(action: string, data: any = {}) {
  try {
    // Automatically inject active session identifier for verification
    if (activeUserId && activeSessionId && action !== 'login' && action !== 'signup') {
      data = {
        userId: data.userId || activeUserId,
        sessionId: activeSessionId,
        ...data
      };
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, data }),
    });

    const result = await response.json();

    // Catch centralized session invalidation alerts
    if (result && result.error === 'SESSION_INVALIDATED') {
      if (sessionInvalidatedCallback) {
        sessionInvalidatedCallback();
      }
    }

    return result;
  } catch (error) {
    console.error(`API Error on action [${action}]:`, error);
    return { success: false, error: 'Network request failed. Please verify your server is running.' };
  }
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
  }) => postRequest('save-ongoing-session', params),

  /**
   * Submits a completed mock test session
   */
  addAttempt: (params: {
    userId: string;
    testId: string;
    score: number;
    maxScore: number;
    accuracy: number;
    durationSeconds: number;
    violations: number;
    responses: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number }>;
  }) => postRequest('add-attempt', params),

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
  getSupportMessages: (userId: string, markAsRead = true) => 
    postRequest('get-support-messages', { userId, markAsRead, readerRole: 'STUDENT' }),

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
   * Logs in a user via verified Firebase Phone Auth
   */
  loginViaPhone: (phoneNumber: string, idToken: string) =>
    postRequest('login-via-phone', { phoneNumber, idToken }),

  /**
   * Resets password of a user via verified Firebase Phone Auth
   */
  resetPasswordViaPhone: (phoneNumber: string, idToken: string, newPassword: string) =>
    postRequest('reset-password-via-phone', { phoneNumber, idToken, newPassword }),
};
