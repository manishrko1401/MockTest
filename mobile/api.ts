/**
 * API client to communicate with the shared Next.js backend database endpoints.
 */

// Replace this with your computer's local IP address if testing on a physical device,
// or your production domain name if deployed to Vercel/Supabase.
export const BASE_URL = 'https://web-leo-2026-projects.vercel.app';
export const API_URL = `${BASE_URL}/api/db`;

async function postRequest(action: string, data: any = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, data }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`API Error on action [${action}]:`, error);
    return { success: false, error: 'Network request failed. Please verify your server is running.' };
  }
}

export const ApiClient = {
  /**
   * Bootstraps the application data (notices, test catalog categories, subcategories)
   */
  bootstrap: () => postRequest('bootstrap'),

  /**
   * Smart catalog sync — returns only categories/tests added or updated since
   * the device's last sync. On first run (no lastSyncedAt), returns the full catalog.
   * Much lighter than bootstrap() for repeat launches.
   */
  catalogSync: (lastSyncedAt?: string | null) =>
    postRequest('catalog-sync', { lastSyncedAt: lastSyncedAt ?? null }),

  /**
   * Performs user login using email
   */
  login: (email: string, password?: string) => postRequest('login', { email, password }),

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
};
