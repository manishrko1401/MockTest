/**
 * API client for the dedicated Admin Mobile App.
 * Communicates with the Next.js backend API routes.
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

async function postRequest(action: string, data: any = {}) {
  const endpoints = [LOCAL_API_URL, PROD_API_URL].filter((v, i, a) => a.indexOf(v) === i);

  if (activeUserId && activeSessionId && action !== 'login' && action !== 'signup') {
    data = {
      userId: activeUserId,
      sessionId: activeSessionId,
      ...data
    };
  }

  let lastErrorResult: any = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, data }),
      });

      const result = await response.json();

      if (result && (!result.error || !result.error.includes('Invalid action'))) {
        if (result.error === 'SESSION_INVALIDATED' && sessionInvalidatedCallback) {
          sessionInvalidatedCallback();
        }
        return result;
      }
      lastErrorResult = result;
    } catch (err) {
      console.warn(`Attempt failed on ${endpoint}:`, err);
    }
  }

  return lastErrorResult || { success: false, error: 'Network request failed. Verify your server is running.' };
}

export const ApiClient = {
  setApiSession,
  onSessionInvalidated,

  /**
   * Admin Login - generates a new active session
   */
  login: (email: string, password?: string) => postRequest('login', { email, password }),

  /**
   * Background login refresh on app startup
   */
  loginRefresh: (email: string, password: string, existingSessionId: string) =>
    postRequest('login', { email, password, existingSessionId }),

  /**
   * Fetch administrative dashboard logs (users & reported questions)
   */
  fetchAdminData: (userId: string) => postRequest('admin-data', { userId }),

  /**
   * Modify User profile details (tiers, coins, status, roles)
   */
  saveProfileAdmin: (params: any) => postRequest('save-profile-admin', params),

  /**
   * Fetch all test attempt logs in the system
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

  /**
   * Fetch user feedbacks & ratings
   */
  fetchFeedbacks: async () => {
    const endpoints = [LOCAL_API_URL, PROD_API_URL].filter((v, i, a) => a.indexOf(v) === i);
    let errorMsg = '';
    for (const endpoint of endpoints) {
      try {
        const feedbackUrl = endpoint.replace('/api/db', '/api/feedback');
        const response = await fetch(feedbackUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
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
        const feedbackUrl = endpoint.replace('/api/db', `/api/feedback?id=${id}`);
        const response = await fetch(feedbackUrl, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
          }
        });
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
   * Delete a reported question log
   */
  deleteReportedQuestion: (id: string) => postRequest('delete-reported-question', { id }),

  /**
   * Reset a completed/saved attempt to let the user re-attempt
   */
  resetAttempt: (userId: string, sessionId: string) => 
    postRequest('reset-attempt', { userId, sessionId }),

  /**
   * Fetch all support users for Admin view
   */
  getSupportUsers: () => postRequest('get-support-users'),

  /**
   * Fetches support chat messages for a specific user
   */
  getSupportMessages: (userId: string, markAsRead = true) => 
    postRequest('get-support-messages', { userId, markAsRead, readerRole: 'ADMIN' }),

  /**
   * Sends a new support chat message as ADMIN
   */
  sendSupportMessage: (userId: string, message: string) => 
    postRequest('send-support-message', { userId, sender: 'ADMIN', message }),

  /**
   * Fetch system database stats (table sizes, row counts, postgres version)
   */
  dbStats: () => postRequest('db-stats')
};
