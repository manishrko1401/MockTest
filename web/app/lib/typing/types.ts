/**
 * Shared types for the per-category typing evaluation engines.
 * One engine file per exam lives in ./engines and can be edited in isolation.
 */

export type Lang = 'en' | 'hi';

export type WordStatus =
  | 'CORRECT'
  | 'HALF_MISTAKE'
  | 'FULL_MISTAKE'
  | 'OMISSION'
  | 'EXTRA'
  | 'UNREACHED';

export interface AlignedWord {
  word: string;
  status: WordStatus;
  expected: string;
  typed: string;
  reason?: string;
  subtype?: string;
  index: number;
}

export interface MistakeDetail {
  index: number;
  expected: string;
  typed: string;
  type: 'FULL_MISTAKE' | 'HALF_MISTAKE' | 'OMISSION' | 'EXTRA';
  subtype: string;
  reason: string;
}

export interface ErrorBreakdown {
  fullErrors: number;
  halfErrors: number;
  totalErrors: number; // fullErrors + halfErrors / 2
  // full sub-counts
  omissions: number;
  substitutions: number; // wrong word / misspelling
  extraWords: number;
  repetitions: number;
  incompleteWords: number;
  // half sub-counts
  spacingErrors: number;
  capitalizationErrors: number;
  punctuationErrors: number;
  transpositionErrors: number;
  paragraphErrors: number;
  // words
  correctWords: number;
  typedWordCount: number;
  passageWordCount: number;
  reachedPassageWords: number;
  // display
  aligned: AlignedWord[];
  alignedTyped: AlignedWord[];
  mistakes: MistakeDetail[];
}

export interface CoreMetrics {
  keystrokesTyped: number;
  passageKeystrokes: number;
  wordsInPassage: number; // round(passageKeystrokes / 5)
  wordsTyped: number; // keystrokesTyped / 5
  timeSeconds: number;
  timeMinutes: number;
  grossWpm: number;
  netWpm: number; // base: max(0, (wordsTyped - totalErrors) / min)
  errorPercentage: number; // (totalErrors / wordsInPassage) * 100
  accuracy: number; // (netWpm / grossWpm) * 100, clamped 0..100
  kdph: number;
}

export interface Criterion {
  label: string;
  value: string | number;
  status?: 'PASS' | 'FAIL' | 'INFO';
}

export interface CategoryConfig {
  key: string;
  slug: string;
  name: string;
  /** Official test duration in minutes. */
  durationMinutes: number;
  /** Minimum qualifying speed, per language. */
  qualifyingSpeed: { en: number; hi: number };
  kdphTarget?: { en: number; hi: number };
  /** Max permissible error % by candidate category (where the exam uses one). */
  maxErrorPercent?: { ur: number; obc?: number; scst?: number };
  backspaceAllowed: boolean;
  retypeAllowed?: boolean;
  language: 'en' | 'hi' | 'both';
  notes?: string;
}

export interface EngineInput {
  passageText: string;
  typedText: string;
  /** Seconds actually spent typing. */
  timeSeconds: number;
  /** Raw key-depression count from the client; falls back to typed length. */
  keystrokesTyped?: number;
  backspaceCount?: number;
  language?: Lang;
  /** 'UR' | 'OBC' | 'EWS' | 'SC' | 'ST' | 'UR/EWS' */
  userCategoryChoice?: string;
  allowRetype?: boolean;
}

export interface EngineResult {
  key: string;
  name: string;
  // headline metrics (engine may adjust net speed / accuracy)
  grossWpm: number;
  netWpm: number;
  netWords: number;
  accuracy: number;
  errorPercentage: number;
  totalErrors: number;
  fullErrors: number;
  halfErrors: number;
  kdph: number;
  keystrokesTyped: number;
  backspaceCount: number;
  timeSeconds: number;
  timeMinutes: number;
  durationMinutes: number;
  qualifyingSpeed: number;
  // permissible / penalty
  permissibleErrors: number;
  excessErrors: number;
  penaltyWords: number;
  // marks-based exams
  marks: number | null;
  maxMarks: number | null;
  qualifyingMarks: number | null;
  scaledScorePercent: number | null;
  // verdict
  qualified: boolean;
  speedPassed: boolean;
  errorPassed: boolean;
  marksPassed: boolean;
  reason: string;
  badge: string;
  criteria: Criterion[];
  // engine-specific extras (optional)
  aiimsGrossWpm?: number;
  aiimsNetWpm?: number;
  penaltyStrokes?: number;
  netStrokes?: number;
  tentativeSpeed?: number;
  actualSpeed?: number;
  // full breakdown + word diff
  errors: ErrorBreakdown;
  core: CoreMetrics;
  config: CategoryConfig;
}

export interface TypingEngine {
  config: CategoryConfig;
  evaluate: (input: EngineInput) => EngineResult;
}
