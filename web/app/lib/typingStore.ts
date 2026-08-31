/**
 * typingStore.ts  — Prisma-backed async store for all Typing Test data.
 *
 * Previously this file used a local JSON file (typing_data.json) which
 * does NOT persist on Vercel (read-only filesystem). All operations are
 * now async and read/write directly to the PostgreSQL database via Prisma.
 */

import { prisma } from './prisma';
import {
  TypingCategory,
  TypingPassage,
  TypingTest,
  TypingAttempt,
  DetailedMistake,
  evaluateTyping
} from './typingTypes';

export * from './typingTypes';

const DEFAULT_DEMO_TEXT = `This is a demo typing test passage designed to check your keyboard responsiveness and warm up your fingers. Please ensure all letter keys, space bar, backspace, and punctuation marks like comma, period, and hyphens are functioning smoothly before you start the main examination.`;

// ---------------------- CATEGORIES ----------------------

export async function getTypingCategories(): Promise<TypingCategory[]> {
  const rows = await prisma.typingCategory.findMany({
    orderBy: { orderIndex: 'asc' }
  });
  return rows.map(r => ({
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
}

export async function saveTypingCategory(category: Partial<TypingCategory>): Promise<TypingCategory> {
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
    // Upsert — create if not found, update if found
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
  try {
    await prisma.typingCategory.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ---------------------- PASSAGES (kept as legacy compat, stored inside tests) ----------------------

export async function getTypingPassages(): Promise<TypingPassage[]> {
  // Passages are embedded inside typing tests — return aggregated list from tests
  const tests = await prisma.typingTest.findMany({
    where: { passageText: { not: '' } },
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
  // No-op: passages are stored inline inside TypingTest records
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
  // No-op: passages are part of tests
  return false;
}

// ---------------------- TYPING TESTS ----------------------

export async function getTypingTests(): Promise<TypingTest[]> {
  const rows = await prisma.typingTest.findMany({
    orderBy: { orderIndex: 'asc' }
  });
  return rows.map(r => dbRowToTypingTest(r));
}

export async function getTypingTestById(id: string): Promise<TypingTest | null> {
  const row = await prisma.typingTest.findUnique({ where: { id } });
  if (!row) return null;
  return dbRowToTypingTest(row);
}

export async function saveTypingTest(test: Partial<TypingTest>): Promise<TypingTest> {
  const id = test.id;
  const data = buildTestData(test);

  let row;
  if (id) {
    row = await prisma.typingTest.upsert({
      where: { id },
      update: data,
      create: { id, ...data }
    });
  } else {
    row = await prisma.typingTest.create({ data });
  }

  return dbRowToTypingTest(row);
}

export async function saveBulkTypingTests(
  template: Partial<TypingTest>,
  count: number
): Promise<TypingTest[]> {
  const safeCount = Math.min(200, Math.max(1, count));
  const baseTitle = (template.title || 'New Typing Test').trim();
  const baseTitleHi = (template.titleHi || '').trim();

  // Find current max orderIndex
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
  try {
    await prisma.typingTest.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
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

  // Increment total attempts counter on the test
  await prisma.typingTest.update({
    where: { id: attempt.testId },
    data: { totalAttempts: { increment: 1 } }
  }).catch(() => {}); // Ignore if test not found

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
    orderBy: { completedAt: 'desc' },
    take: 100
  });

  return rows.map(r => dbRowToAttempt(r));
}

// ---------------------- HELPERS ----------------------

function buildTestData(test: Partial<TypingTest>) {
  return {
    title: (test.title || 'New Typing Test').trim(),
    titleHi: (test.titleHi || '').trim(),
    categoryId: test.categoryId || '',
    passageId: test.passageId || '',
    passageText: test.passageText !== undefined ? test.passageText : '',
    demoPassageText: test.demoPassageText || DEFAULT_DEMO_TEXT,
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
    passageId: r.passageId,
    passageText: r.passageText,
    demoPassageText: r.demoPassageText,
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
    instructions: r.instructions,
    orderIndex: r.orderIndex,
    isActive: r.isActive,
    totalAttempts: r.totalAttempts,
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
    typedText: r.typedText,
    targetText: r.targetText,
    allowRetype: r.allowRetype,
    retypeCycles: r.retypeCycles,
    detailedMistakes: r.detailedMistakes as DetailedMistake[] || [],
    completedAt: r.completedAt instanceof Date ? r.completedAt.toISOString() : r.completedAt,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}
