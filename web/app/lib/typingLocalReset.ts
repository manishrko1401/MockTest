// Browsers keep their own copy of typing attempts (localStorage) and test lists (sessionStorage).
// When the server-side typing data is reset (e.g. passages reshuffled and attempts cleared), bump
// TYPING_DATA_VERSION so every browser drops those stale copies once on its next visit.
const TYPING_DATA_VERSION = '2026-10-18-reshuffle';
const VERSION_KEY = 'typing_data_version';

export function resetStaleTypingLocalData() {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(VERSION_KEY) === TYPING_DATA_VERSION) return;
    for (const key of Object.keys(localStorage)) {
      if (key === 'all_typing_attempts' || key.startsWith('typing_attempt_') || key.startsWith('typing_attempts_')) {
        localStorage.removeItem(key);
      }
    }
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('cached_typing_tests_')) sessionStorage.removeItem(key);
    }
    localStorage.setItem(VERSION_KEY, TYPING_DATA_VERSION);
  } catch { /* storage unavailable */ }
}
