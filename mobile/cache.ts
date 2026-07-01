/**
 * cache.ts  —  Local device storage for tests, questions & exam catalog
 *
 * Questions are stored per-testId with a 48-hour TTL.
 * The exam catalog is stored with a 24-hour TTL.
 *
 * On first open  → fetch from Vercel, save to device, show instantly next time.
 * On every later open → serve from device instantly, refresh in background.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Cache version prefix (bump this string if question data shape changes) ─
const Q_KEY_PREFIX = 'qs_v2_';   // "v2" auto-busts any old v1 cache
const CAT_KEY      = 'catalog_v2';
const USER_KEY     = 'user_profile_cache';
const SYNC_TS_KEY  = 'catalog_last_synced_at';

// ── TTL settings ───────────────────────────────────────────────────────────
const QUESTIONS_TTL_MS = 48 * 60 * 60 * 1000;  // 48 hours
const CATALOG_TTL_MS   = 24 * 60 * 60 * 1000;  // 24 hours

// ═══════════════════════════════════════════════════════════════════════════
//  QUESTIONS  (raw API response — the exact array from getCustomQuestions)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns cached questions for a testId, or null if not cached / expired.
 */
export async function getCachedQuestions(testId: string): Promise<any[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${Q_KEY_PREFIX}${testId}`);
    if (!raw) return null;

    const { questions, savedAt } = JSON.parse(raw);
    if (!questions || !savedAt) return null;

    // Expire check — stale data triggers background re-fetch
    if (Date.now() - savedAt > QUESTIONS_TTL_MS) {
      await AsyncStorage.removeItem(`${Q_KEY_PREFIX}${testId}`);
      return null;
    }

    return questions;
  } catch {
    return null;
  }
}

/**
 * Saves questions for a testId to device storage.
 * Called after every successful network fetch.
 */
export async function saveQuestionsToCache(testId: string, questions: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${Q_KEY_PREFIX}${testId}`,
      JSON.stringify({ questions, savedAt: Date.now() })
    );
  } catch (err) {
    console.warn('[Cache] Failed to save questions:', err);
  }
}

/**
 * Force-clears questions cache for one specific testId.
 * Useful when admin updates a test's questions and you want to force re-download.
 */
export async function invalidateQuestionsCache(testId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${Q_KEY_PREFIX}${testId}`);
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXAM CATALOG  (categories + test list — from bootstrap API)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns cached bootstrap data, or null if not cached / expired.
 */
export async function getCachedCatalog(): Promise<{
  examCatalog: any[];
  noticesList: any[];
  usersList: any[];
} | null> {
  try {
    const raw = await AsyncStorage.getItem(CAT_KEY);
    if (!raw) return null;

    const { data, savedAt } = JSON.parse(raw);
    if (!data || !savedAt) return null;

    if (Date.now() - savedAt > CATALOG_TTL_MS) {
      await AsyncStorage.removeItem(CAT_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Saves the bootstrap API response to the device.
 */
export async function saveCatalogToCache(data: {
  examCatalog: any[];
  noticesList: any[];
  usersList: any[];
}): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CAT_KEY,
      JSON.stringify({ data, savedAt: Date.now() })
    );
  } catch (err) {
    console.warn('[Cache] Failed to save catalog:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  USER PROFILE & SESSIONS CACHE
// ═══════════════════════════════════════════════════════════════════════════

export async function getCachedUser(): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveUserToCache(user: any): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('[Cache] Failed to save user cache:', err);
  }
}

export async function invalidateUserCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
//  HOUSEKEEPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clears ALL cached questions, catalog, and user details from the device.
 * Call this on logout so a different account doesn't see stale data.
 */
export async function clearAllCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(
      k => k.startsWith(Q_KEY_PREFIX) || k === CAT_KEY || k === USER_KEY || k === SYNC_TS_KEY
    );
    if (cacheKeys.length > 0) {
      await (AsyncStorage as any).multiRemove(cacheKeys);
    }
    console.log(`[Cache] Cleared ${cacheKeys.length} cached item(s).`);
  } catch (err) {
    console.warn('[Cache] Failed to clear cache:', err);
  }
}

/**
 * Returns how many tests are cached and approximate storage used.
 * Can be shown in the Profile screen under a "Storage" section.
 */
export async function getCacheStats(): Promise<{ testCount: number; estimatedKB: number }> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const qKeys = allKeys.filter(k => k.startsWith(Q_KEY_PREFIX));

    let totalBytes = 0;
    for (const key of qKeys) {
      const val = await AsyncStorage.getItem(key);
      if (val) totalBytes += val.length;
    }

    return {
      testCount: qKeys.length,
      estimatedKB: Math.round(totalBytes / 1024),
    };
  } catch {
    return { testCount: 0, estimatedKB: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SYNC TIMESTAMP  (track when we last synced with the server)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns the ISO timestamp of the last successful catalog sync,
 * or null if the device has never synced before.
 */
export async function getLastSyncTimestamp(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SYNC_TS_KEY);
  } catch {
    return null;
  }
}

/**
 * Saves the server-returned syncedAt timestamp after a successful sync.
 */
export async function setLastSyncTimestamp(isoString: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_TS_KEY, isoString);
  } catch (err) {
    console.warn('[Cache] Failed to save sync timestamp:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  CATALOG DELTA MERGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Merges delta sync results (new/updated items) into the existing local catalog.
 *
 * Handles:
 * - New categories  → append to catalog root
 * - New exams       → append to matching category
 * - New test series → append to matching exam
 * - New/updated tests → upsert into matching test series (by testSeriesId)
 * - New notices     → prepend to noticesList
 * - updatedTestIds  → returned so caller can invalidate question caches
 */
export function mergeCatalogDelta(
  existing: { examCatalog: any[]; noticesList: any[]; usersList: any[] },
  delta: {
    newCategories: any[];
    newExams: any[];
    newSeries: any[];
    newTests: any[];
    newNotices: any[];
    updatedTestIds: string[];
  }
): { examCatalog: any[]; noticesList: any[]; usersList: any[] } {
  // Deep clone so we don't mutate in place
  const catalog: any[] = JSON.parse(JSON.stringify(existing.examCatalog));

  // 1. Add new top-level categories
  for (const newCat of delta.newCategories) {
    if (!catalog.find(c => c.id === newCat.id)) {
      catalog.push({ ...newCat, subCategories: [] });
    }
  }

  // 2. Add new exams into their parent category
  for (const newExam of delta.newExams) {
    const parentCat = catalog.find(c => c.id === newExam.categoryId);
    if (parentCat) {
      if (!parentCat.subCategories.find((e: any) => e.id === newExam.id)) {
        parentCat.subCategories.push({
          ...newExam,
          subSubCategories: [],
          tests: [],
        });
      }
    }
  }

  // 3. Add new test series into their parent exam
  for (const newSeries of delta.newSeries) {
    for (const cat of catalog) {
      const parentExam = (cat.subCategories || []).find((e: any) => e.id === newSeries.examId);
      if (parentExam) {
        if (!(parentExam.subSubCategories || []).find((ss: any) => ss.id === newSeries.id)) {
          if (!parentExam.subSubCategories) parentExam.subSubCategories = [];
          parentExam.subSubCategories.push({ ...newSeries, name: newSeries.title, tests: [] });
        }
        break;
      }
    }
  }

  // 4. Upsert new/updated tests into their test series and into the flat tests[] array
  for (const newTest of delta.newTests) {
    for (const cat of catalog) {
      for (const exam of cat.subCategories || []) {
        const targetSeries = (exam.subSubCategories || []).find(
          (ss: any) => ss.id === newTest.testSeriesId
        );
        if (targetSeries) {
          // Upsert in subSubCategories.tests
          const existingIdx = targetSeries.tests.findIndex((t: any) => t.id === newTest.id);
          if (existingIdx >= 0) {
            targetSeries.tests[existingIdx] = newTest; // update
          } else {
            targetSeries.tests.push(newTest); // add
          }
          // Upsert in exam.tests flat array (backwards-compat)
          if (!exam.tests) exam.tests = [];
          const flatIdx = exam.tests.findIndex((t: any) => t.id === newTest.id);
          if (flatIdx >= 0) {
            exam.tests[flatIdx] = newTest;
          } else {
            exam.tests.push(newTest);
          }
          break;
        }
      }
    }
  }

  // 5. Prepend new notices
  const mergedNotices = [
    ...delta.newNotices,
    ...existing.noticesList.filter(
      n => !delta.newNotices.find((nn: any) => nn.id === n.id)
    ),
  ];

  return {
    examCatalog: catalog,
    noticesList: mergedNotices,
    usersList: existing.usersList,
  };
}
