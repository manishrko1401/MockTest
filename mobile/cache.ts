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
const CAT_KEY      = 'catalog_v4'; // v4: force full-sync to include practice series isPracticeSeries + sections
const USER_KEY     = 'user_profile_cache';
const SYNC_TS_KEY  = 'catalog_last_synced_at';

// ── TTL settings ───────────────────────────────────────────────────────────
const QUESTIONS_TTL_MS = 30 * 24 * 60 * 60 * 1000;  // 30 days
const CATALOG_TTL_MS   = 24 * 60 * 60 * 1000;       // 24 hours

// ═══════════════════════════════════════════════════════════════════════════
//  QUESTIONS  (raw API response — the exact array from getCustomQuestions)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns cached questions for a testId from device storage.
 * Returns questions instantly to allow 0ms local rendering.
 */
export async function getCachedQuestions(testId: string): Promise<any[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${Q_KEY_PREFIX}${testId}`);
    if (!raw) return null;

    const { questions } = JSON.parse(raw);
    if (!questions || !Array.isArray(questions) || questions.length === 0) return null;

    return questions;
  } catch {
    return null;
  }
}

/**
 * Proactively prunes older question caches to prevent hitting SQLite storage limits.
 * Retains the 10 most recently saved test question sets on device storage.
 */
async function pruneQuestionsCache(maxToKeep = 10): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const qKeys = allKeys.filter(k => k.startsWith(Q_KEY_PREFIX));
    
    if (qKeys.length > maxToKeep) {
      const items: { key: string; savedAt: number }[] = [];
      for (const key of qKeys) {
        const val = await AsyncStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            items.push({ key, savedAt: parsed.savedAt || 0 });
          } catch {
            items.push({ key, savedAt: 0 });
          }
        }
      }
      
      // Sort oldest first
      items.sort((a, b) => a.savedAt - b.savedAt);
      
      // Keep the most recent items, remove the rest
      const toRemove = items.slice(0, items.length - maxToKeep).map(i => i.key);
      if (toRemove.length > 0) {
        await AsyncStorage.multiRemove(toRemove);
        console.log(`[Cache] Proactively pruned ${toRemove.length} old test caches. Storing max ${maxToKeep} tests.`);
      }
    }
  } catch (err) {
    console.log('[Cache] Pruning notice:', err);
  }
}

/**
 * Saves questions for a testId to device storage.
 * Called after every successful network fetch.
 */
export async function saveQuestionsToCache(testId: string, questions: any[]): Promise<void> {
  try {
    // Proactively prune older test question caches (keep 10 most recent)
    await pruneQuestionsCache(10);

    await AsyncStorage.setItem(
      `${Q_KEY_PREFIX}${testId}`,
      JSON.stringify({ questions, savedAt: Date.now() })
    );
  } catch (err) {
    console.log('[Cache] Primary question save hit storage limit, performing emergency eviction...');
    try {
      // Evict older questions, keeping only 3 most recent
      await pruneQuestionsCache(3);
      
      // Retry writing the current test questions
      await AsyncStorage.setItem(
        `${Q_KEY_PREFIX}${testId}`,
        JSON.stringify({ questions, savedAt: Date.now() })
      );
      console.log('[Cache] Successfully saved questions after emergency cache eviction.');
    } catch (retryErr) {
      console.log('[Cache] Emergency cache eviction retry handled:', retryErr);
    }
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

    const parsed = JSON.parse(raw);
    const { data, savedAt } = parsed || {};

    if (!data || !savedAt || !data.examCatalog || data.examCatalog.length === 0) {
      await AsyncStorage.removeItem(CAT_KEY);
      return null;
    }

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
  // 1. Filter out categories that have been deleted from the database
  const validCatIds = new Set(delta.newCategories.map((c: any) => c.id));
  const catalog = JSON.parse(JSON.stringify(existing.examCatalog)).filter((c: any) => validCatIds.has(c.id));

  // Add new top-level categories OR update logoUrl/name on existing ones
  for (const newCat of delta.newCategories) {
    const existing = catalog.find((c: any) => c.id === newCat.id);
    if (existing) {
      // Update all mutable fields on existing category
      existing.logoUrl = newCat.logoUrl ?? existing.logoUrl;
      existing.name = newCat.name ?? existing.name;
      existing.orderIndex = newCat.orderIndex ?? existing.orderIndex;
      // Preserve isPracticeSeries and other catalog flags if present in delta
      if (newCat.isPracticeSeries !== undefined) existing.isPracticeSeries = newCat.isPracticeSeries;
      if (newCat.isPopular !== undefined) existing.isPopular = newCat.isPopular;
      if (newCat.description !== undefined) existing.description = newCat.description;
      if (newCat.countText !== undefined) existing.countText = newCat.countText;
    } else {
      catalog.push({ ...newCat, subCategories: [] });
    }
  }

  // 2. Add new exams into their parent category
  for (const newExam of delta.newExams) {
    const parentCat = catalog.find((c: any) => c.id === newExam.categoryId);
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

  // 5. Update notices list from delta sync
  const mergedNotices = (delta as any).noticesList && Array.isArray((delta as any).noticesList)
    ? (delta as any).noticesList
    : [
        ...(delta.newNotices || []),
        ...(existing.noticesList || []).filter(
          n => !(delta.newNotices || []).find((nn: any) => nn.id === n.id)
        ),
      ];

  return {
    examCatalog: catalog,
    noticesList: mergedNotices,
    usersList: existing.usersList,
  };
}
