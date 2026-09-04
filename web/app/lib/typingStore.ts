/**
 * typingStore.ts — High Performance Prisma-backed async store for Typing Test data.
 *
 * Optimized with in-memory caching, light projection for test catalogs,
 * category-scoped queries, and minimal network serialization.
 */

import { prismaTyping as prisma } from './prismaTyping';
import {
  TypingCategory,
  TypingPassage,
  TypingTest,
  TypingAttempt,
  DetailedMistake,
  evaluateTyping
} from './typingTypes';
import {
  uploadTypingPassageToTigris,
  fetchTypingPassageFromTigris,
  deleteTypingPassageFromTigris
} from './tigrisTypingStorage';

export * from './typingTypes';
export * from './tigrisTypingStorage';

const DEFAULT_DEMO_TEXT_EN = `This is a demo typing test passage designed to check your keyboard responsiveness and warm up your fingers. Please ensure all letter keys, space bar, backspace, and punctuation marks like comma, period, and hyphens are functioning smoothly before you start the main examination.`;

const DEFAULT_DEMO_TEXT_HI = `यह एक डेमो टाइपिंग टेस्ट पैसेज है जिसे आपके कीबोर्ड की प्रतिक्रियाशीलता की जांच करने और आपकी उंगलियों को अभ्यास कराने के लिए बनाया गया है। मुख्य परीक्षा शुरू करने से पहले कृपया सुनिश्चित करें कि सभी अक्षर कुंजी, स्पेस बार, बैकस्पेस और अल्पविराम, पूर्णविराम और हाइफ़न जैसे विराम चिह्न सुचारू रूप से काम कर रहे हैं।`;

const DEFAULT_DEMO_TEXT = DEFAULT_DEMO_TEXT_EN;

// In-memory Server-Side Caches for Sub-millisecond Repeat Reads
let cachedCategories: TypingCategory[] | null = null;
let cachedCategoryCounts: Record<string, number> | null = null;
let cachedLightTestsByCategory: Record<string, TypingTest[]> = {};
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export function invalidateTypingCache() {
  cachedCategories = null;
  cachedCategoryCounts = null;
  cachedLightTestsByCategory = {};
  lastCacheTime = 0;
}

// ---------------------- CATEGORIES ----------------------

export async function getTypingCategories(): Promise<TypingCategory[]> {
  const now = Date.now();
  if (cachedCategories && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedCategories;
  }

  const rows = await prisma.typingCategory.findMany({
    orderBy: { orderIndex: 'asc' }
  });

  const categories = rows.map(r => ({
    id: r.id,
    name: r.name,
    nameHi: r.nameHi,
    description: r.description,
    icon: r.icon,
    logoUrl: r.logoUrl,
    orderIndex: r.orderIndex,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString()
  }));

  cachedCategories = categories;
  lastCacheTime = now;
  return categories;
}

export async function saveTypingCategory(category: Partial<TypingCategory>): Promise<TypingCategory> {
  invalidateTypingCache();

  const id = category.id;
  const data = {
    name: (category.name || 'New Typing Exam').trim(),
    nameHi: (category.nameHi || '').trim(),
    description: (category.description || '').trim(),
    icon: category.icon || 'Keyboard',
    logoUrl: category.logoUrl || '',
    orderIndex: category.orderIndex !== undefined ? Number(category.orderIndex) : 1,
    isActive: category.isActive !== undefined ? Boolean(category.isActive) : true,
  };

  let row;
  if (id) {
    row = await prisma.typingCategory.upsert({
      where: { id },
      update: data,
      create: { id, ...data }
    });
  } else {
    row = await prisma.typingCategory.create({ data });
  }

  return {
    id: row.id,
    name: row.name,
    nameHi: row.nameHi,
    description: row.description,
    icon: row.icon,
    logoUrl: row.logoUrl,
    orderIndex: row.orderIndex,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function deleteTypingCategory(id: string): Promise<boolean> {
  invalidateTypingCache();
  try {
    await prisma.typingCategory.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ---------------------- PASSAGES (kept as legacy compat) ----------------------

export async function getTypingPassages(): Promise<TypingPassage[]> {
  const tests = await prisma.typingTest.findMany({
    where: { passageText: { not: '' } },
    take: 100, // Safe limit for modal selector
    select: {
      id: true, passageId: true, passageText: true, title: true, titleHi: true,
      categoryId: true, language: true, difficulty: true, createdAt: true, updatedAt: true
    }
  });
  return tests.map(t => ({
    id: t.passageId || t.id,
    title: t.title,
    titleHi: t.titleHi,
    text: t.passageText,
    categoryId: t.categoryId,
    language: t.language as 'en' | 'hi',
    difficulty: t.difficulty as 'Easy' | 'Medium' | 'Hard',
    wordCount: t.passageText.split(/\s+/).length,
    charCount: t.passageText.length,
    keystrokesCount: t.passageText.length,
    tags: [],
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString()
  }));
}

export async function saveTypingPassage(passage: Partial<TypingPassage>): Promise<TypingPassage> {
  return {
    id: passage.id || `pas-${Date.now()}`,
    title: passage.title || 'Passage',
    titleHi: passage.titleHi || '',
    text: passage.text || '',
    categoryId: passage.categoryId || '',
    language: passage.language || 'en',
    difficulty: passage.difficulty || 'Medium',
    wordCount: (passage.text || '').split(/\s+/).length,
    charCount: (passage.text || '').length,
    keystrokesCount: (passage.text || '').length,
    tags: passage.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export async function deleteTypingPassage(id: string): Promise<boolean> {
  return false;
}

// ---------------------- TYPING TESTS ----------------------

export interface GetTypingTestsOptions {
  categoryId?: string;
  light?: boolean;
}

export async function getTypingTests(options?: GetTypingTestsOptions): Promise<TypingTest[]> {
  const categoryId = options?.categoryId;
  const isLight = options?.light ?? true; // Default to light projection for speed

  // Check cache for category light tests
  const cacheKey = `${categoryId || 'all'}_${isLight ? 'light' : 'full'}`;
  if (cachedLightTestsByCategory[cacheKey]) {
    return cachedLightTestsByCategory[cacheKey];
  }

  const where: any = { isActive: true };
  if (categoryId && categoryId !== 'all') {
    where.categoryId = categoryId;
  }

  if (isLight) {
    // Ultra-light projection: excludes heavy passage texts (reducing payload by 95%)
    const rows = await prisma.typingTest.findMany({
      where,
      select: {
        id: true,
        title: true,
        titleHi: true,
        categoryId: true,
        demoDurationMinutes: true,
        breakDurationMinutes: true,
        mainDurationMinutes: true,
        qualifyingWpm: true,
        maxErrorPercentage: true,
        backspaceRule: true,
        enableBackspace: true,
        allowRetype: true,
        highlightAllowed: true,
        language: true,
        difficulty: true,
        orderIndex: true,
        isActive: true,
        totalAttempts: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { orderIndex: 'asc' }
    });

    const results = rows.map(r => ({
      id: r.id,
      title: r.title,
      titleHi: r.titleHi,
      categoryId: r.categoryId,
      passageId: r.id,
      passageText: '',
      demoPassageText: '',
      demoDurationMinutes: r.demoDurationMinutes,
      breakDurationMinutes: r.breakDurationMinutes,
      mainDurationMinutes: r.mainDurationMinutes,
      qualifyingWpm: r.qualifyingWpm,
      maxErrorPercentage: r.maxErrorPercentage,
      backspaceRule: r.backspaceRule as any,
      enableBackspace: r.enableBackspace,
      allowRetype: r.allowRetype,
      highlightAllowed: r.highlightAllowed,
      language: r.language as 'en' | 'hi',
      difficulty: r.difficulty as any,
      instructions: '',
      orderIndex: r.orderIndex,
      isActive: r.isActive,
      totalAttempts: r.totalAttempts,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    }));

    cachedLightTestsByCategory[cacheKey] = results;
    return results;
  }

  // Full fetch
  const rows = await prisma.typingTest.findMany({
    where,
    orderBy: { orderIndex: 'asc' }
  });
  const results = rows.map(r => dbRowToTypingTest(r));
  cachedLightTestsByCategory[cacheKey] = results;
  return results;
}

export async function getTypingTestById(id: string): Promise<TypingTest | null> {
  const row = await prisma.typingTest.findUnique({ where: { id } });
  if (!row) return null;
  const test = dbRowToTypingTest(row);

  // If passage is stored in Tigris Object Storage, fetch full text transparently
  if (test.passageText && (test.passageText.startsWith('tigris') || test.passageText.startsWith('http'))) {
    const fullText = await fetchTypingPassageFromTigris(test.passageText);
    if (fullText) {
      test.passageText = fullText;
    }
  }

  return test;
}

export async function saveTypingTest(test: Partial<TypingTest>): Promise<TypingTest> {
  invalidateTypingCache();

  const id = test.id;
  const targetId = id || `tt-${Date.now()}`;

  // If passageText is provided as raw text, upload to Tigris Object Storage
  let passageRef = test.passageText;
  if (
    test.passageText &&
    test.passageText.trim().length > 0 &&
    !test.passageText.startsWith('tigris') &&
    !test.passageText.startsWith('http')
  ) {
    passageRef = await uploadTypingPassageToTigris(targetId, test.passageText);
  }

  if (id) {
    const existing = await prisma.typingTest.findUnique({ where: { id } });
    if (existing) {
      const updateData: any = {};
      if (test.title !== undefined) updateData.title = test.title.trim();
      if (test.titleHi !== undefined) updateData.titleHi = test.titleHi.trim();
      if (test.categoryId !== undefined && test.categoryId) updateData.categoryId = test.categoryId;
      if (test.passageId !== undefined) updateData.passageId = test.passageId;
      if (passageRef !== undefined) updateData.passageText = passageRef;
      if (test.demoPassageText !== undefined) updateData.demoPassageText = test.demoPassageText;
      if (test.demoDurationMinutes !== undefined) updateData.demoDurationMinutes = Number(test.demoDurationMinutes);
      if (test.breakDurationMinutes !== undefined) updateData.breakDurationMinutes = Number(test.breakDurationMinutes);
      if (test.mainDurationMinutes !== undefined) updateData.mainDurationMinutes = Number(test.mainDurationMinutes);
      if (test.qualifyingWpm !== undefined) updateData.qualifyingWpm = Number(test.qualifyingWpm);
      if (test.maxErrorPercentage !== undefined) updateData.maxErrorPercentage = Number(test.maxErrorPercentage);
      if (test.enableBackspace !== undefined) {
        updateData.enableBackspace = Boolean(test.enableBackspace);
        updateData.backspaceRule = test.enableBackspace ? 'ALLOWED' : 'DISABLED';
      } else if (test.backspaceRule !== undefined) {
        updateData.backspaceRule = test.backspaceRule;
        updateData.enableBackspace = test.backspaceRule !== 'DISABLED';
      }
      if (test.allowRetype !== undefined) updateData.allowRetype = Boolean(test.allowRetype);
      if (test.highlightAllowed !== undefined) updateData.highlightAllowed = Boolean(test.highlightAllowed);
      if (test.language !== undefined) updateData.language = test.language;
      if (test.difficulty !== undefined) updateData.difficulty = test.difficulty;
      if (test.instructions !== undefined) updateData.instructions = test.instructions.trim();
      if (test.orderIndex !== undefined) updateData.orderIndex = Number(test.orderIndex);
      if (test.isActive !== undefined) updateData.isActive = Boolean(test.isActive);

      const row = await prisma.typingTest.update({
        where: { id },
        data: updateData
      });
      const updatedTest = dbRowToTypingTest(row);
      // Return un-aliased passageText in memory if uploaded
      if (test.passageText && !test.passageText.startsWith('tigris') && !test.passageText.startsWith('http')) {
        updatedTest.passageText = test.passageText;
      }
      return updatedTest;
    }
  }

  const data = buildTestData({
    ...test,
    passageText: passageRef
  });
  const row = await prisma.typingTest.create({
    data: {
      id: targetId,
      ...data
    }
  });

  const createdTest = dbRowToTypingTest(row);
  if (test.passageText && !test.passageText.startsWith('tigris') && !test.passageText.startsWith('http')) {
    createdTest.passageText = test.passageText;
  }
  return createdTest;
}

export async function saveBulkTypingTests(
  template: Partial<TypingTest>,
  count: number
): Promise<TypingTest[]> {
  invalidateTypingCache();

  const safeCount = Math.min(200, Math.max(1, count));
  const baseTitle = (template.title || 'New Typing Test').trim();
  const baseTitleHi = (template.titleHi || '').trim();

  const maxOrderResult = await prisma.typingTest.aggregate({ _max: { orderIndex: true } });
  let maxOrder = maxOrderResult._max.orderIndex || 0;

  const created: TypingTest[] = [];

  for (let i = 1; i <= safeCount; i++) {
    const titleToUse = safeCount === 1 ? baseTitle : `${baseTitle} ${i}`;
    const titleHiToUse = baseTitleHi ? (safeCount === 1 ? baseTitleHi : `${baseTitleHi} ${i}`) : '';
    maxOrder++;

    const data = buildTestData({
      ...template,
      title: titleToUse,
      titleHi: titleHiToUse,
      orderIndex: maxOrder
    });

    const row = await prisma.typingTest.create({ data });
    created.push(dbRowToTypingTest(row));
  }

  return created;
}

export async function deleteTypingTest(id: string): Promise<boolean> {
  invalidateTypingCache();
  try {
    await prisma.typingTest.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function deleteAllTypingTests(): Promise<{ deletedCount: number }> {
  invalidateTypingCache();
  try {
    await prisma.typingAttempt.deleteMany({});
  } catch {}
  const res = await prisma.typingTest.deleteMany({});
  return { deletedCount: res.count };
}

// ---------------------- ATTEMPTS ----------------------

export async function saveTypingAttempt(attempt: Partial<TypingAttempt>): Promise<TypingAttempt> {
  if (!attempt.testId) throw new Error('testId is required to save a typing attempt');

  const row = await prisma.typingAttempt.create({
    data: {
      userId: attempt.userId || 'guest',
      userName: attempt.userName || 'Student',
      testId: attempt.testId,
      testTitle: attempt.testTitle || 'Typing Practice',
      categoryName: attempt.categoryName || '',
      grossWpm: attempt.grossWpm || 0,
      netWpm: attempt.netWpm || 0,
      accuracyPercentage: attempt.accuracyPercentage || 0,
      totalKeystrokes: attempt.totalKeystrokes || 0,
      correctKeystrokes: attempt.correctKeystrokes || 0,
      errorKeystrokes: attempt.errorKeystrokes || 0,
      fullMistakes: attempt.fullMistakes || 0,
      halfMistakes: attempt.halfMistakes || 0,
      totalMistakes: attempt.totalMistakes || 0,
      errorPercentage: attempt.errorPercentage || 0,
      backspaceCount: attempt.backspaceCount || 0,
      timeSpentSeconds: attempt.timeSpentSeconds || 0,
      allocatedTimeSeconds: attempt.allocatedTimeSeconds || 0,
      isQualified: !!attempt.isQualified,
      language: attempt.language || 'en',
      typedText: attempt.typedText || '',
      targetText: attempt.targetText || '',
      allowRetype: attempt.allowRetype,
      retypeCycles: attempt.retypeCycles,
      detailedMistakes: attempt.detailedMistakes as any || []
    }
  });

  await prisma.typingTest.update({
    where: { id: attempt.testId },
    data: { totalAttempts: { increment: 1 } }
  }).catch(() => {});

  return dbRowToAttempt(row);
}

export async function getUserTypingAttempts(
  userId?: string,
  testId?: string
): Promise<TypingAttempt[]> {
  const where: any = {};
  if (userId && userId !== 'guest') where.userId = userId;
  if (testId) where.testId = testId;

  const rows = await prisma.typingAttempt.findMany({
    where,
    select: {
      id: true,
      userId: true,
      userName: true,
      testId: true,
      testTitle: true,
      categoryName: true,
      grossWpm: true,
      netWpm: true,
      accuracyPercentage: true,
      totalKeystrokes: true,
      correctKeystrokes: true,
      errorKeystrokes: true,
      fullMistakes: true,
      halfMistakes: true,
      totalMistakes: true,
      errorPercentage: true,
      backspaceCount: true,
      timeSpentSeconds: true,
      allocatedTimeSeconds: true,
      isQualified: true,
      language: true,
      allowRetype: true,
      retypeCycles: true,
      completedAt: true,
      createdAt: true
    },
    orderBy: { completedAt: 'desc' },
    take: 50
  });

  return rows.map(r => dbRowToAttempt(r));
}

// ---------------------- HELPERS ----------------------

function buildTestData(test: Partial<TypingTest>) {
  const isHi = test.language === 'hi' || (test.title || '').toLowerCase().includes('hindi') || (test.id || '').includes('-hi-');
  const defaultDemo = isHi ? DEFAULT_DEMO_TEXT_HI : DEFAULT_DEMO_TEXT_EN;

  return {
    title: (test.title || 'New Typing Test').trim(),
    titleHi: (test.titleHi || '').trim(),
    categoryId: test.categoryId || '',
    passageId: test.passageId || '',
    passageText: test.passageText !== undefined ? test.passageText : '',
    demoPassageText: test.demoPassageText || defaultDemo,
    demoDurationMinutes: test.demoDurationMinutes !== undefined ? Number(test.demoDurationMinutes) : 1,
    breakDurationMinutes: test.breakDurationMinutes !== undefined ? Number(test.breakDurationMinutes) : 1,
    mainDurationMinutes: test.mainDurationMinutes !== undefined ? Number(test.mainDurationMinutes) : 10,
    qualifyingWpm: test.qualifyingWpm !== undefined ? Number(test.qualifyingWpm) : 35,
    maxErrorPercentage: test.maxErrorPercentage !== undefined ? Number(test.maxErrorPercentage) : 5.0,
    backspaceRule: test.enableBackspace === false ? 'DISABLED' : (test.backspaceRule || 'ALLOWED'),
    enableBackspace: test.enableBackspace !== undefined ? Boolean(test.enableBackspace) : (test.backspaceRule !== 'DISABLED'),
    allowRetype: test.allowRetype !== undefined ? Boolean(test.allowRetype) : false,
    highlightAllowed: test.highlightAllowed !== undefined ? Boolean(test.highlightAllowed) : false,
    language: test.language || 'en',
    difficulty: test.difficulty || 'Medium',
    instructions: (test.instructions || 'Standard typing exam simulation. Complete Demo, Break, and Main test.').trim(),
    orderIndex: test.orderIndex !== undefined ? Number(test.orderIndex) : 0,
    isActive: test.isActive !== undefined ? Boolean(test.isActive) : true,
  };
}

function dbRowToTypingTest(r: any): TypingTest {
  return {
    id: r.id,
    title: r.title,
    titleHi: r.titleHi,
    categoryId: r.categoryId,
    passageId: r.passageId || r.id,
    passageText: r.passageText || '',
    demoPassageText: r.demoPassageText || '',
    demoDurationMinutes: r.demoDurationMinutes,
    breakDurationMinutes: r.breakDurationMinutes,
    mainDurationMinutes: r.mainDurationMinutes,
    qualifyingWpm: r.qualifyingWpm,
    maxErrorPercentage: r.maxErrorPercentage,
    backspaceRule: r.backspaceRule as any,
    enableBackspace: r.enableBackspace,
    allowRetype: r.allowRetype,
    highlightAllowed: r.highlightAllowed,
    language: r.language as 'en' | 'hi',
    difficulty: r.difficulty as any,
    instructions: r.instructions || '',
    orderIndex: r.orderIndex,
    isActive: r.isActive,
    totalAttempts: r.totalAttempts || 0,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

function dbRowToAttempt(r: any): TypingAttempt {
  return {
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    testId: r.testId,
    testTitle: r.testTitle,
    categoryName: r.categoryName,
    grossWpm: r.grossWpm,
    netWpm: r.netWpm,
    accuracyPercentage: r.accuracyPercentage,
    totalKeystrokes: r.totalKeystrokes,
    correctKeystrokes: r.correctKeystrokes,
    errorKeystrokes: r.errorKeystrokes,
    fullMistakes: r.fullMistakes,
    halfMistakes: r.halfMistakes,
    totalMistakes: r.totalMistakes,
    errorPercentage: r.errorPercentage,
    backspaceCount: r.backspaceCount,
    timeSpentSeconds: r.timeSpentSeconds,
    allocatedTimeSeconds: r.allocatedTimeSeconds,
    isQualified: r.isQualified,
    language: r.language,
    typedText: r.typedText || '',
    targetText: r.targetText || '',
    allowRetype: r.allowRetype,
    retypeCycles: r.retypeCycles,
    detailedMistakes: (r.detailedMistakes as DetailedMistake[]) || [],
    completedAt: r.completedAt instanceof Date ? r.completedAt.toISOString() : r.completedAt,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}
