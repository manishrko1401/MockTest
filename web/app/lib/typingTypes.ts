export interface TypingCategory {
  id: string;
  name: string;
  nameHi?: string;
  description?: string;
  icon?: string;
  logoUrl?: string;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TypingPassage {
  id: string;
  title: string;
  titleHi?: string;
  text: string;
  categoryId?: string;
  language: 'en' | 'hi';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  wordCount: number;
  charCount: number;
  keystrokesCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TypingTest {
  id: string;
  title: string;
  titleHi?: string;
  categoryId: string;
  passageId?: string;
  passageText: string;
  demoPassageText?: string;
  demoDurationMinutes: number;
  breakDurationMinutes: number;
  mainDurationMinutes: number;
  qualifyingWpm: number;
  maxErrorPercentage: number;
  backspaceRule: 'ALLOWED' | 'RESTRICTED' | 'DISABLED';
  enableBackspace?: boolean;
  allowRetype?: boolean;
  highlightAllowed: boolean;
  language: 'en' | 'hi';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  instructions?: string;
  orderIndex: number;
  isActive: boolean;
  totalAttempts?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DetailedMistake {
  index: number;
  originalWord: string;
  typedWord: string;
  type: 'CORRECT' | 'FULL_MISTAKE' | 'HALF_MISTAKE' | 'OMISSION' | 'EXTRA';
  reason?: string;
}

export interface AlignedWord {
  word: string;
  status: 'CORRECT' | 'HALF_MISTAKE' | 'FULL_MISTAKE' | 'OMISSION' | 'EXTRA' | 'UNREACHED';
  expectedWord?: string;
  typedWord?: string;
  reason?: string;
  index: number;
}

export interface TypingAttempt {
  id: string;
  userId?: string;
  userName?: string;
  testId: string;
  testTitle: string;
  categoryName?: string;
  grossWpm: number;
  netWpm: number;
  accuracyPercentage: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  errorKeystrokes: number;
  fullMistakes: number;
  halfMistakes: number;
  totalMistakes: number;
  errorPercentage: number;
  backspaceCount: number;
  timeSpentSeconds: number;
  allocatedTimeSeconds: number;
  isQualified: boolean;
  language: 'en' | 'hi';
  typedText: string;
  targetText: string;
  allowRetype?: boolean;
  retypeCycles?: number;
  detailedMistakes?: DetailedMistake[];
  completedAt: string;
  createdAt: string;
}

// ===================================================================================
// OFFICIAL RRB NTPC / SSC / TCS-iON TYPING EVALUATION ENGINE
//
// Formulas (verified against rrbntpctypingtest.unlimitededucation.in — all numbers
// cross-checked to 2 decimal places against a live result screenshot):
//
//   Total Words Typed  = Keystrokes / 5            (unrounded, e.g. 380.6)
//   Gross WPM          = (Keystrokes / 5) / Time
//   Mistakes           = Full Errors + (Half Errors / 2)
//   Permissible (5%)   = 5% × (Keystrokes / 5)     (uses UNROUNDED words, e.g. 19.03)
//   Remaining          = max(0, Mistakes - Permissible)
//   Penalty (words)    = Remaining × 10
//   Net Words          = (Keystrokes / 5) - Penalty
//   Net WPM            = Net Words / Time
//   Error %            = (Mistakes / TotalWordsTyped) × 100
//   Accuracy           = 100 - Error %              ← NOT Net/Gross × 100
//
// Verified example (from reference screenshot):
//   Keystrokes=1903, Time=10min, Full Errors=43, Half Errors=0
//   Total Words = 380.60 | Gross WPM = 38.06
//   Permissible = 19.03  | Total Mistakes = 43
//   Remaining = 23.97    | Penalty = 239.70 words
//   Net Words = 140.90   | Net WPM = 14.09
//   Error % = 11.30%     | Accuracy = 88.70%
//
// Error Categories:
//   Full Errors (1.0 each):
//     - Spelling/Substitution (wrong word / misspelling)
//     - Omission (word not typed)
//     - Extra Word (typed beyond passage)
//   Half Errors (0.5 each):
//     - Capitalization (same word, different case)
//     - Punctuation (only punctuation mark differs)
//     - Transposition (two adjacent words swapped)
//     - Spacing (words joined together or split)
// ===================================================================================

/**
 * Aligns original and typed word sequences using Levenshtein DP.
 * This correctly handles omissions and insertions without cascading wrong errors.
 */
function alignWordSequences(
  origWords: string[],
  typedWords: string[]
): Array<{ orig: string | null; typed: string | null }> {
  const n = origWords.length;
  const m = typedWords.length;

  if (n === 0 && m === 0) return [];
  if (n === 0) return typedWords.map(w => ({ orig: null, typed: w }));
  if (m === 0) return origWords.map(w => ({ orig: w, typed: null }));

  // Build DP cost table
  const dp: number[][] = [];
  for (let i = 0; i <= n; i++) {
    dp[i] = new Array(m + 1).fill(0);
    dp[i][0] = i;
  }
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      // Case-insensitive match = 0 cost (we'll classify details later)
      const matchCost = origWords[i - 1].toLowerCase() === typedWords[j - 1].toLowerCase() ? 0 : 1;
      // Slight tie-breaker to prefer matching earlier target positions sequentially:
      const tieBreaker = matchCost === 0 ? (i - 1) * 0.0001 : 0;
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + matchCost + tieBreaker, // substitute / match
        dp[i - 1][j] + 1,                          // omission (orig not typed)
        dp[i][j - 1] + 1                           // extra (typed extra word)
      );
    }
  }

  // Traceback to build alignment
  const result: Array<{ orig: string | null; typed: string | null }> = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const matchCost = origWords[i - 1].toLowerCase() === typedWords[j - 1].toLowerCase() ? 0 : 1;
      const tieBreaker = matchCost === 0 ? (i - 1) * 0.0001 : 0;
      const diag = dp[i - 1][j - 1] + matchCost + tieBreaker;
      const up = dp[i - 1][j] + 1;
      if (Math.abs(dp[i][j] - diag) < 0.00001) {
        result.unshift({ orig: origWords[i - 1], typed: typedWords[j - 1] });
        i--;
        j--;
      } else if (Math.abs(dp[i][j] - up) < 0.00001) {
        result.unshift({ orig: origWords[i - 1], typed: null }); // omission
        i--;
      } else {
        result.unshift({ orig: null, typed: typedWords[j - 1] }); // extra word
        j--;
      }
    } else if (i > 0) {
      result.unshift({ orig: origWords[i - 1], typed: null });
      i--;
    } else {
      result.unshift({ orig: null, typed: typedWords[j - 1] });
      j--;
    }
  }

  return result;
}

/** Removes common punctuation for punctuation-error detection */
function stripPunct(s: string): string {
  return s.replace(/[.,!?;:'"()\-–—]/g, '');
}

type ErrorType =
  | 'CORRECT'
  | 'CAPITALIZATION'
  | 'PUNCTUATION'
  | 'TRANSPOSITION'
  | 'SPACING'
  | 'SUBSTITUTION'
  | 'OMISSION'
  | 'EXTRA';

interface ClassifiedPair {
  orig: string | null;
  typed: string | null;
  errorType: ErrorType;
  status: AlignedWord['status'];
  reason?: string;
}

/**
 * Helper to identify if a test or category belongs to SSC CGL (Tier-2 DEST) or SSC CHSL (DEO / LDC).
 */
export function isSscExam(testOrCat?: { categoryId?: string; title?: string; categoryName?: string } | string | null): boolean {
  if (!testOrCat) return false;
  if (typeof testOrCat === 'string') {
    const s = testOrCat.toLowerCase();
    return s.includes('cat-ssc-cgl') || s.includes('cat-ssc-chsl') || s.includes('ssc cgl') || s.includes('ssc chsl') || s.includes('dest') || s.includes('deo') || s.includes('ldc');
  }
  const id = (testOrCat.categoryId || '').toLowerCase();
  const title = (testOrCat.title || '').toLowerCase();
  const catName = (testOrCat.categoryName || '').toLowerCase();
  return (
    id === 'cat-ssc-cgl' ||
    id === 'cat-ssc-chsl' ||
    id.includes('cgl') ||
    id.includes('chsl') ||
    title.includes('ssc cgl') ||
    title.includes('ssc chsl') ||
    title.includes('dest') ||
    title.includes('deo') ||
    title.includes('ldc') ||
    catName.includes('ssc cgl') ||
    catName.includes('ssc chsl')
  );
}

/**
 * Helper to detect SSC CGL (Tier-2 DEST) tests specifically.
 */
export function isSscCglExam(
  testOrCat: { categoryId?: string; title?: string; categoryName?: string } | string | null | undefined
): boolean {
  if (!testOrCat) return false;
  if (typeof testOrCat === 'string') {
    const s = testOrCat.toLowerCase();
    return s.includes('cat-ssc-cgl') || s.includes('ssc cgl') || s.includes('tier-2 dest') || s.includes('tier 2 dest');
  }
  const id = (testOrCat.categoryId || '').toLowerCase();
  const title = (testOrCat.title || '').toLowerCase();
  const catName = (testOrCat.categoryName || '').toLowerCase();
  return (
    id === 'cat-ssc-cgl' ||
    id.includes('ssc-cgl') ||
    title.includes('ssc cgl') ||
    title.includes('tier-2 dest') ||
    title.includes('tier 2 dest') ||
    catName.includes('ssc cgl')
  );
}

/**
 * Helper to detect SSC CHSL (DEO / LDC) tests specifically.
 */
export function isSscChslExam(
  testOrCat: { categoryId?: string; title?: string; categoryName?: string } | string | null | undefined
): boolean {
  if (!testOrCat) return false;
  if (typeof testOrCat === 'string') {
    const s = testOrCat.toLowerCase();
    return s.includes('cat-ssc-chsl') || s.includes('ssc chsl') || s.includes('chsl');
  }
  const id = (testOrCat.categoryId || '').toLowerCase();
  const title = (testOrCat.title || '').toLowerCase();
  const catName = (testOrCat.categoryName || '').toLowerCase();
  return (
    id === 'cat-ssc-chsl' ||
    id.includes('ssc-chsl') ||
    id.includes('chsl') ||
    title.includes('ssc chsl') ||
    title.includes('chsl') ||
    catName.includes('ssc chsl') ||
    catName.includes('chsl')
  );
}

/**
 * Main evaluation function following official SSC / RRB NTPC formulas.
 */
export function evaluateTyping(
  targetText: string,
  typedText: string,
  timeSpentSeconds: number,
  backspaceCount: number = 0,
  qualifyingWpm: number = 35,
  maxErrorPercentage: number = 5.0,
  allowRetype: boolean = false,
  isSsc: boolean = false,
  isSscCgl: boolean = false,
  isSscChsl: boolean = false
): {
  // Core metrics
  grossWpm: number;
  netWpm: number;
  chslNetWords?: number;
  chslNetWpm?: number;
  accuracyPercentage: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  errorKeystrokes: number;
  // Error breakdown
  fullMistakes: number;
  halfMistakes: number;
  totalMistakes: number;
  errorPercentage: number;
  // SSC evaluation fields
  isSsc: boolean;
  isSscCgl?: boolean;
  isSscChsl?: boolean;
  totalWordsInMasterPassage: number;
  totalMasterPassageKeystrokes: number;
  // Detailed sub-categories
  substitutions: number;
  omissions: number;
  extraWordErrors: number;
  wrongCapitalizations: number;
  punctuationErrors: number;
  transpositionErrors: number;
  spacingErrors: number;
  // 5% rule fields
  totalWordsTyped: number;
  ignorableMistakes: number;
  remainingMistakes: number;
  netWords: number;
  penalty: number;
  // Retype info
  cyclesCompleted: number;
  retypedWordsCount: number;
  allowRetype: boolean;
  // Time
  timeInMinutes: number;
  // Pass / Fail
  isQualified: boolean;
  // Aligned arrays for side-by-side display
  detailedMistakes: DetailedMistake[];
  alignedOriginalWords: AlignedWord[];
  alignedTypedWords: AlignedWord[];
} {
  // ── 1. Normalize whitespace ──────────────────────────────────────────────
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
  const cleanTarget = normalize(targetText);
  const cleanTyped = normalize(typedText);

  const passageWords = cleanTarget.length > 0 ? cleanTarget.split(' ') : [];
  const typedWords = cleanTyped.length > 0 ? cleanTyped.split(' ') : [];
  const totalPassageWords = passageWords.length;

  let effectiveTargetWords = passageWords;
  let cyclesCompleted = 0;
  let retypedWordsCount = 0;
  let numCycles = 1;

  if (allowRetype && totalPassageWords > 0 && typedWords.length >= totalPassageWords) {
    numCycles = Math.max(1, Math.ceil(typedWords.length / totalPassageWords));
    effectiveTargetWords = [];
    for (let c = 0; c < numCycles; c++) {
      effectiveTargetWords.push(...passageWords);
    }
    cyclesCompleted = Math.floor(typedWords.length / totalPassageWords);
    retypedWordsCount = Math.max(0, typedWords.length - totalPassageWords);
  }

  // ── 2. Keystrokes & Time ─────────────────────────────────────────────────
  // Keystrokes = total characters typed (including spaces)
  const totalKeystrokes = cleanTyped.length;

  // RRB / SSC Standard: 1 word = 5 keystrokes (NOT space-split word count)
  // Kept to 2 decimal places without rounding — e.g. 1903 / 5 = 380.60
  const totalWordsTyped = parseFloat((totalKeystrokes / 5).toFixed(2));
  const timeInMinutes = Math.max(timeSpentSeconds / 60, 1 / 60);
  const grossWords = totalWordsTyped; // alias — both are Keystrokes / 5

  // Master Passage Words = Total Keystrokes in Master Passage / 5
  const masterPassageKeystrokes = cleanTarget.length;
  const totalWordsInMasterPassage = masterPassageKeystrokes > 0
    ? parseFloat((masterPassageKeystrokes / 5).toFixed(2))
    : totalPassageWords;

  // Gross WPM = (Keystrokes / 5) / Time
  const grossWpm = parseFloat((grossWords / timeInMinutes).toFixed(2));

  // ── 3. Handle empty submission ───────────────────────────────────────────
  if (totalWordsTyped < 0.01) {
    return {
      grossWpm: 0, netWpm: 0, accuracyPercentage: 0,
      totalKeystrokes: 0, correctKeystrokes: 0, errorKeystrokes: 0,
      fullMistakes: totalPassageWords, halfMistakes: 0,
      totalMistakes: totalPassageWords,
      isSsc,
      isSscCgl,
      totalWordsInMasterPassage,
      totalMasterPassageKeystrokes: masterPassageKeystrokes,
      errorPercentage: 100,
      substitutions: 0, omissions: totalPassageWords, extraWordErrors: 0,
      wrongCapitalizations: 0, punctuationErrors: 0,
      transpositionErrors: 0, spacingErrors: 0,
      totalWordsTyped: 0, ignorableMistakes: 0, remainingMistakes: totalPassageWords,
      netWords: 0, penalty: 0,
      cyclesCompleted: 0, retypedWordsCount: 0, allowRetype,
      timeInMinutes, isQualified: false,
      detailedMistakes: passageWords.map((w, i) => ({
        index: i, originalWord: w, typedWord: '', type: 'OMISSION' as const, reason: 'Nothing typed',
      })),
      alignedOriginalWords: passageWords.map((w, i) => ({
        word: w, status: 'OMISSION' as const, expectedWord: w, typedWord: '', reason: 'Nothing typed', index: i,
      })),
      alignedTypedWords: [],
    };
  }

  // ── 4. DP Word Alignment ─────────────────────────────────────────────────
  const alignment = alignWordSequences(effectiveTargetWords, typedWords);

  let lastTypedIdx = -1;
  for (let idx = alignment.length - 1; idx >= 0; idx--) {
    if (alignment[idx].typed !== null) {
      lastTypedIdx = idx;
      break;
    }
  }

  const userEnteredRetype = allowRetype && (
    typedWords.length >= totalPassageWords ||
    numCycles > 1
  );

  // ── 5. First-pass classification ─────────────────────────────────────────
  const classified: ClassifiedPair[] = alignment.map(({ orig, typed }, pairIdx) => {
    if (orig === null) {
      return { orig, typed, errorType: 'EXTRA' as ErrorType, status: 'EXTRA' as AlignedWord['status'], reason: `Extra word: "${typed}"` };
    }
    if (typed === null) {
      if (userEnteredRetype && pairIdx > lastTypedIdx) {
        return { orig, typed, errorType: 'CORRECT' as ErrorType, status: 'UNREACHED' as AlignedWord['status'], reason: `Unreached in repetition: "${orig}"` };
      }
      return { orig, typed, errorType: 'OMISSION' as ErrorType, status: 'OMISSION' as AlignedWord['status'], reason: `Omitted: "${orig}"` };
    }
    if (orig === typed) {
      return { orig, typed, errorType: 'CORRECT' as ErrorType, status: 'CORRECT' as AlignedWord['status'] };
    }
    if (orig.toLowerCase() === typed.toLowerCase()) {
      return { orig, typed, errorType: 'CAPITALIZATION' as ErrorType, status: 'HALF_MISTAKE' as AlignedWord['status'], reason: `Capitalization: "${orig}" → "${typed}"` };
    }
    const origStripped = stripPunct(orig);
    const typedStripped = stripPunct(typed);
    if (
      (origStripped === typedStripped && origStripped.length > 0) ||
      origStripped.toLowerCase() === typedStripped.toLowerCase()
    ) {
      return { orig, typed, errorType: 'PUNCTUATION' as ErrorType, status: 'HALF_MISTAKE' as AlignedWord['status'], reason: `Punctuation: "${orig}" → "${typed}"` };
    }
    return { orig, typed, errorType: 'SUBSTITUTION' as ErrorType, status: 'FULL_MISTAKE' as AlignedWord['status'], reason: `Wrong word: "${orig}" → "${typed}"` };
  });

  // ── 6. Transposition detection ───────────────────────────────────────────
  // If two adjacent substitutions are swapped words, reclassify both as half mistakes.
  for (let k = 0; k < classified.length - 1; k++) {
    const cur = classified[k];
    const nxt = classified[k + 1];
    if (
      cur.errorType === 'SUBSTITUTION' && nxt.errorType === 'SUBSTITUTION' &&
      cur.orig !== null && cur.typed !== null &&
      nxt.orig !== null && nxt.typed !== null &&
      cur.orig === nxt.typed && cur.typed === nxt.orig
    ) {
      cur.errorType = 'TRANSPOSITION';
      cur.status = 'HALF_MISTAKE';
      cur.reason = `Transposition: "${cur.orig}" ↔ "${cur.typed}"`;
      nxt.errorType = 'TRANSPOSITION';
      nxt.status = 'HALF_MISTAKE';
      nxt.reason = `Transposition: "${nxt.orig}" ↔ "${nxt.typed}"`;
      k++; // skip next (already handled)
    }
  }

  // ── 7. Spacing error detection ───────────────────────────────────────────
  // Check if a typed SUBSTITUTION word equals two consecutive original words joined.
  // e.g. orig="the quick", typed="thequick" → spacing error (half)
  for (let k = 0; k < classified.length - 1; k++) {
    const cur = classified[k];
    const nxt = classified[k + 1];
    // typed[k] = orig[k] + orig[k+1] joined (spacing error — joined)
    if (
      cur.errorType === 'SUBSTITUTION' && nxt.errorType === 'OMISSION' &&
      cur.orig !== null && cur.typed !== null && nxt.orig !== null
    ) {
      const joined = cur.orig + nxt.orig;
      if (cur.typed === joined || cur.typed.toLowerCase() === joined.toLowerCase()) {
        cur.errorType = 'SPACING';
        cur.status = 'HALF_MISTAKE';
        cur.reason = `Joined words: "${cur.orig} ${nxt.orig}" → "${cur.typed}"`;
        nxt.errorType = 'SPACING';
        nxt.status = 'HALF_MISTAKE';
        nxt.reason = `Joined (omitted part): "${nxt.orig}"`;
        k++;
      }
    }
  }
  // Check if two consecutive typed EXTRA+SUBSTITUTION words together equal one orig word (split)
  for (let k = 0; k < classified.length - 1; k++) {
    const cur = classified[k];
    const nxt = classified[k + 1];
    if (
      cur.errorType === 'SUBSTITUTION' && nxt.errorType === 'EXTRA' &&
      cur.orig !== null && cur.typed !== null && nxt.typed !== null
    ) {
      const splitJoined = cur.typed + nxt.typed;
      if (splitJoined === cur.orig || splitJoined.toLowerCase() === cur.orig.toLowerCase()) {
        cur.errorType = 'SPACING';
        cur.status = 'HALF_MISTAKE';
        cur.reason = `Split word: "${cur.orig}" → "${cur.typed} ${nxt.typed}"`;
        nxt.errorType = 'SPACING';
        nxt.status = 'HALF_MISTAKE';
        nxt.reason = `Split (extra part): "${nxt.typed}"`;
        k++;
      }
    }
  }

  // ── 8. Count error categories ────────────────────────────────────────────
  let substitutions = 0;
  let omissions = 0;
  let extraWordErrors = 0;
  let wrongCapitalizations = 0;
  let punctuationErrors = 0;
  let transpositionErrors = 0;
  let spacingErrors = 0;

  for (const pair of classified) {
    if (pair.status === 'UNREACHED') continue;
    switch (pair.errorType) {
      case 'SUBSTITUTION':    substitutions++;         break;
      case 'OMISSION':        omissions++;             break;
      case 'EXTRA':           extraWordErrors++;        break;
      case 'CAPITALIZATION':  wrongCapitalizations++;   break;
      case 'PUNCTUATION':     punctuationErrors++;      break;
      case 'TRANSPOSITION':   transpositionErrors++;    break;
      case 'SPACING':         spacingErrors++;          break;
    }
  }

  // Full errors = substitution + omission + extra
  // Half errors raw count = capitalization + punctuation + transposition + spacing
  // (transposition counts each swapped word, so a pair = 2 transpositionErrors)
  const fullMistakes = substitutions + omissions + extraWordErrors;
  const halfMistakesRaw = wrongCapitalizations + punctuationErrors + transpositionErrors + spacingErrors;

  // Formula from uploaded photo:
  // Total Mistakes = Full Mistakes + ( Half Mistakes / 2 )
  const totalWeightedMistakes = parseFloat((fullMistakes + (halfMistakesRaw / 2)).toFixed(2));

  // ── 9. 5% Permissible Rule ────────────────────────────────────────────────
  // Permissible = 5% of UNROUNDED gross words (Keystrokes/5), NOT floor(Keystrokes/5).
  // Reference: Keystrokes=1903 → grossWords=380.6 → permissible=19.03 (not 19.00)
  // (Used for RRB NTPC; hidden/not applicable for SSC tests)
  const ignorableMistakes = parseFloat((0.05 * grossWords).toFixed(2));
  const remainingMistakes = parseFloat(Math.max(0, totalWeightedMistakes - ignorableMistakes).toFixed(2));

  // ── 10. Penalty & Net WPM ────────────────────────────────────────────────
  // Penalty (words) = Remaining × 10
  // Net Words       = (Keystrokes/5) - Penalty
  // Net WPM         = Net Words / Time
  const penalty = parseFloat((remainingMistakes * 10).toFixed(2));
  const netWords = parseFloat(Math.max(0, grossWords - penalty).toFixed(2));
  const netWpm = parseFloat((netWords / timeInMinutes).toFixed(2));

  // SSC CHSL Net Words & Net Speed:
  // Net Word = Gross Word Typed - Total Mistakes
  // Net Speed = Net Word / Total Time
  const chslNetWords = parseFloat(Math.max(0, grossWords - totalWeightedMistakes).toFixed(2));
  const chslNetWpm = timeInMinutes > 0 ? parseFloat((chslNetWords / timeInMinutes).toFixed(2)) : 0;

  // ── 11. Error % ──────────────────────────────────────────────────────────
  // For SSC tests (SSC CGL Tier-2 DEST & SSC CHSL DEO/LDC):
  // Master Passage Words = Total Keystrokes in Master Passage / 5
  // Error Percentage = ( Total Mistakes / Total Words Given in Master Passage ) * 100
  // (Note: Evaluated precisely up to two decimal places.)
  //
  // For RRB NTPC:
  // Error % = (totalWeightedMistakes / grossWords) * 100
  let errorPercentage: number;
  if (isSsc) {
    errorPercentage = totalWordsInMasterPassage > 0
      ? parseFloat(((totalWeightedMistakes / totalWordsInMasterPassage) * 100).toFixed(2))
      : 0;
  } else {
    errorPercentage = grossWords > 0
      ? parseFloat(((totalWeightedMistakes / grossWords) * 100).toFixed(2))
      : 0;
  }

  // ── 12. Accuracy ─────────────────────────────────────────────────────────
  // Accuracy = 100 - Error %  (NOT Net WPM / Gross WPM × 100)
  // Reference: 100 - 11.2979... = 88.70%
  const accuracyPercentage = parseFloat(Math.min(100, Math.max(0, 100 - errorPercentage)).toFixed(2));

  // ── 13. Build aligned word arrays for UI display ─────────────────────────
  const detailedMistakes: DetailedMistake[] = [];
  const alignedOriginalWords: AlignedWord[] = [];
  const alignedTypedWords: AlignedWord[] = [];

  let origIdx = 0;
  let typedIdx = 0;

  for (const pair of classified) {
    const { orig, typed, status, reason, errorType } = pair;

    if (orig !== null) {
      alignedOriginalWords.push({
        word: orig,
        status,
        expectedWord: orig,
        typedWord: typed ?? '',
        reason,
        index: origIdx,
      });
      origIdx++;
    }

    if (typed !== null) {
      alignedTypedWords.push({
        word: typed,
        status,
        expectedWord: orig ?? '',
        typedWord: typed,
        reason,
        index: typedIdx,
      });
      typedIdx++;
    }

    if (errorType !== 'CORRECT' && status !== 'UNREACHED') {
      const mistakeType: DetailedMistake['type'] =
        errorType === 'OMISSION' ? 'OMISSION'
        : errorType === 'EXTRA' ? 'EXTRA'
        : (errorType === 'CAPITALIZATION' || errorType === 'PUNCTUATION' || errorType === 'TRANSPOSITION' || errorType === 'SPACING') ? 'HALF_MISTAKE'
        : 'FULL_MISTAKE';
      detailedMistakes.push({
        index: orig !== null ? origIdx - 1 : typedIdx - 1,
        originalWord: orig ?? '',
        typedWord: typed ?? '',
        type: mistakeType,
        reason,
      });
    }
  }

  // ── 14. Keystroke accuracy ────────────────────────────────────────────────
  const correctWordsCount = classified.filter(p => p.errorType === 'CORRECT' && p.status !== 'UNREACHED').length;
  const correctKeystrokes = Math.round(correctWordsCount * 5);
  const errorKeystrokes = Math.max(0, totalKeystrokes - correctKeystrokes);

  // ── 15. Pass/Fail ─────────────────────────────────────────────────────────
  // In SSC CGL (Tier-2 DEST), candidate qualifies if within maximum allowed for any category (<= 30%)
  // In SSC CHSL, candidate qualifies ONLY if net speed >= qualifying target (35 English / 30 Hindi) AND errorPercentage <= maxErrorPercentage
  // In RRB NTPC / standard, net speed target and error limit are both checked
  const isQualified = isSsc
    ? (isSscCgl
        ? errorPercentage <= 30
        : isSscChsl
        ? (chslNetWpm >= qualifyingWpm && errorPercentage <= maxErrorPercentage)
        : errorPercentage <= maxErrorPercentage)
    : (netWpm >= qualifyingWpm && errorPercentage <= maxErrorPercentage);

  return {
    grossWpm,
    netWpm,
    netWords,
    accuracyPercentage,
    totalKeystrokes,
    correctKeystrokes,
    errorKeystrokes,
    fullMistakes,
    halfMistakes: halfMistakesRaw,
    totalMistakes: totalWeightedMistakes,
    errorPercentage,
    chslNetWords,
    chslNetWpm,
    isSsc,
    isSscCgl,
    isSscChsl,
    totalWordsInMasterPassage,
    totalMasterPassageKeystrokes: masterPassageKeystrokes,
    substitutions,
    omissions,
    extraWordErrors,
    wrongCapitalizations,
    punctuationErrors,
    transpositionErrors,
    spacingErrors,
    totalWordsTyped,
    ignorableMistakes,
    remainingMistakes,
    penalty,
    cyclesCompleted,
    retypedWordsCount,
    allowRetype,
    timeInMinutes,
    isQualified,
    detailedMistakes,
    alignedOriginalWords,
    alignedTypedWords,
  };
}
