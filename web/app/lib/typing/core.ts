/**
 * Shared primitives for every category engine:
 *   - text normalisation & tokenisation
 *   - word alignment (edit-distance)
 *   - error classification (full / half, with the SSC-standard sub-types)
 *   - core metrics (gross / net WPM, error %, accuracy, KDPH)
 *   - a `finalize()` helper so each engine only writes its own qualification rule
 *
 * The universal full / half definitions (agreed by SSC, RRB, court and all the
 * derived exams):
 *   FULL  (1.0): omission · wrong word/figure · extra word · spelling error
 *               (letters added/removed/changed) · word repetition · incomplete word
 *   HALF  (0.5): spacing (between words OR letters) · capitalization (English only)
 *               · punctuation · transposition (word order) · paragraphic
 *
 * NOTE on "paragraphic": every passage currently seeded (checked both English and
 * Hindi content) is one continuous single-paragraph block with no line breaks, so
 * there is nothing to compare a paragraph break against — `ErrorBreakdown.paragraphErrors`
 * is therefore always 0 rather than actively computed. `collapseWhitespace()` below
 * also treats a newline exactly like a space, so if multi-paragraph passages are ever
 * added, that function's whitespace handling needs to preserve paragraph boundaries
 * before this can be implemented for real.
 */

import type {
  AlignedWord,
  CategoryConfig,
  CoreMetrics,
  Criterion,
  EngineInput,
  EngineResult,
  ErrorBreakdown,
  Lang,
  MistakeDetail,
  WordStatus,
} from './types';

// ---------------------------------------------------------------------------
// numeric helpers
// ---------------------------------------------------------------------------

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Delhi HC / SSC "0.5 step" rule: 0.01–0.49 → +0.5, 0.50 → +0.5, 0.51–0.99 → +1.0 */
export function govHalfStepRound(x: number): number {
  if (x <= 0) return 0;
  const floor = Math.floor(x);
  const frac = round2(x - floor);
  if (frac === 0) return floor;
  if (frac <= 0.5) return floor + 0.5;
  return floor + 1;
}

// ---------------------------------------------------------------------------
// text
// ---------------------------------------------------------------------------

export function normalizeNewlines(s: string): string {
  return (s || '').replace(/\r\n?/g, '\n');
}

export function collapseWhitespace(s: string): string {
  return normalizeNewlines(s).replace(/\s+/g, ' ').trim();
}

export function tokenizeWords(s: string): string[] {
  const t = collapseWhitespace(s);
  return t.length ? t.split(' ') : [];
}

const PUNCT_RE = /[.,/#!$%^&*;:{}=\-_`~()?"'“”‘’…–—।]/g;
export function stripPunct(w: string): string {
  return w.replace(PUNCT_RE, '');
}
export function isPunctToken(w: string): boolean {
  return stripPunct(w).length === 0;
}

function caseOnlyDiff(a: string, b: string, language: Lang): boolean {
  if (language === 'hi') return false;
  return a !== b && a.toLowerCase() === b.toLowerCase();
}
function punctOnlyDiff(a: string, b: string): boolean {
  if (a === b) return false;
  const sa = stripPunct(a);
  const sb = stripPunct(b);
  if (!sa && !sb) return false;
  return sa === sb || sa.toLowerCase() === sb.toLowerCase();
}
function isPrefix(expected: string, typed: string): boolean {
  if (!expected || !typed || typed.length >= expected.length) return false;
  return expected.toLowerCase().startsWith(typed.toLowerCase());
}

// ---------------------------------------------------------------------------
// alignment (word-level edit distance; near-matches stay aligned)
// ---------------------------------------------------------------------------

interface RawPair {
  src: string | null;
  typ: string | null;
  srcIdx: number;
  typIdx: number;
  isUnreachedTail?: boolean;
}

function alignWords(src: string[], typ: string[], language: Lang, prefixOnly = false): RawPair[] {
  const n = src.length;
  const m = typ.length;
  if (n === 0) return typ.map((w, j) => ({ src: null, typ: w, srcIdx: -1, typIdx: j }));
  if (m === 0) return src.map((w, i) => ({ src: w, typ: null, srcIdx: i, typIdx: -1, isUnreachedTail: prefixOnly }));

  const cost = (i: number, j: number): number => {
    const a = src[i];
    const b = typ[j];
    if (a === b) return 0;
    if (caseOnlyDiff(a, b, language)) return 0.1;
    if (punctOnlyDiff(a, b)) return 0.2;
    const sa = stripPunct(a).toLowerCase();
    const sb = stripPunct(b).toLowerCase();
    if (sa && sb) {
      let k = 0;
      const lim = Math.min(sa.length, sb.length);
      while (k < lim && sa[k] === sb[k]) k++;
      if (k / Math.max(sa.length, sb.length) >= 0.5) return 0.6;
    }
    return 1;
  };

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = i;
  for (let j = 1; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + cost(i - 1, j - 1),
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1
      );
    }
  }

  let bestI = n;
  if (prefixOnly && m < n) {
    const minSearchI = Math.max(1, Math.floor(m * 0.5));
    const maxSearchI = Math.min(n, Math.ceil(m * 1.5) + 10);
    bestI = Math.min(m, n);
    let minCost = dp[bestI][m];

    for (let idx = minSearchI; idx <= maxSearchI; idx++) {
      const c = dp[idx][m];
      if (c < minCost - 1e-9 || (Math.abs(c - minCost) < 1e-9 && Math.abs(idx - m) < Math.abs(bestI - m))) {
        minCost = c;
        bestI = idx;
      }
    }
  }

  const pairs: RawPair[] = [];
  let i = bestI;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + cost(i - 1, j - 1))) < 1e-9) {
      pairs.push({ src: src[i - 1], typ: typ[j - 1], srcIdx: i - 1, typIdx: j - 1 });
      i--; j--;
    } else if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + 1)) < 1e-9) {
      pairs.push({ src: src[i - 1], typ: null, srcIdx: i - 1, typIdx: -1 });
      i--;
    } else {
      pairs.push({ src: null, typ: typ[j - 1], srcIdx: -1, typIdx: j - 1 });
      j--;
    }
  }
  pairs.reverse();

  if (prefixOnly && bestI < n) {
    for (let k = bestI; k < n; k++) {
      pairs.push({ src: src[k], typ: null, srcIdx: k, typIdx: -1, isUnreachedTail: true });
    }
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// classification
// ---------------------------------------------------------------------------

export interface ClassifyOptions {
  language?: Lang;
  /** Chandigarh Admin Clerk: every error (incl. spacing/caps/punct) is FULL. */
  allErrorsFull?: boolean;
  /**
   * Un-typed passage words are errors (omission for words, half punctuation for
   * stray "." / "," tokens). Default true — stopping early does not excuse the
   * rest of the passage.
   */
  countUnreachedAsOmission?: boolean;
  /** false => a case-only difference is a FULL error (Hindi, or strict exams). */
  capitalizationIsHalf?: boolean;
  /** Wrong/missing/extra punctuation ON a typed word is a FULL error. Default true. */
  punctuationOnWordIsFull?: boolean;
  /** RRB NTPC: passage repeats; grade against repeated passage. */
  allowRetype?: boolean;
  /**
   * Only compare the passage for errors up to what the user actually typed.
   * Words beyond the typed prefix are marked UNREACHED and not counted as errors.
   */
  prefixMatchOnly?: boolean;
}

interface Cls extends RawPair {
  status: WordStatus;
  subtype?: string;
  reason?: string;
  consumed?: boolean;
}

export function classifyErrors(
  passageText: string,
  typedText: string,
  opts: ClassifyOptions = {}
): ErrorBreakdown {
  const language: Lang = opts.language || 'en';
  const capHalf = opts.capitalizationIsHalf !== false && language === 'en';
  const punctWordFull = opts.punctuationOnWordIsFull !== false;

  const basePassage = tokenizeWords(passageText);
  let passageWords = basePassage;
  const typedWords = tokenizeWords(typedText);

  if (opts.allowRetype && basePassage.length > 0 && typedWords.length > basePassage.length) {
    const cycles = Math.ceil(typedWords.length / basePassage.length);
    passageWords = [];
    for (let c = 0; c < cycles; c++) passageWords.push(...basePassage);
  }
  const retypeExtended = passageWords.length > basePassage.length;
  const countUnreached = opts.countUnreachedAsOmission !== false && !retypeExtended && !opts.prefixMatchOnly;

  const empty: ErrorBreakdown = {
    fullErrors: 0, halfErrors: 0, totalErrors: 0,
    omissions: 0, substitutions: 0, extraWords: 0, repetitions: 0, incompleteWords: 0,
    spacingErrors: 0, capitalizationErrors: 0, punctuationErrors: 0,
    transpositionErrors: 0, paragraphErrors: 0,
    correctWords: 0, typedWordCount: typedWords.length,
    passageWordCount: basePassage.length, reachedPassageWords: 0,
    aligned: [], alignedTyped: [], mistakes: [],
  };
  if (typedWords.length === 0) return empty;

  const raw = alignWords(passageWords, typedWords, language, opts.prefixMatchOnly);

  let lastReached = -1;
  for (const p of raw) {
    if (p.srcIdx >= 0 && p.typIdx >= 0) lastReached = Math.max(lastReached, p.srcIdx);
  }

  const half = (subtype: string, reason: string, p: RawPair): Cls =>
    opts.allErrorsFull
      ? { ...p, status: 'FULL_MISTAKE', subtype: 'SUBSTITUTION', reason }
      : { ...p, status: 'HALF_MISTAKE', subtype, reason };

  const cls: Cls[] = raw.map((p): Cls => {
    if (p.isUnreachedTail) {
      return { ...p, status: 'UNREACHED', reason: `Not reached: "${p.src}"` };
    }
    if (p.src === null && p.typ !== null) {
      return { ...p, status: 'EXTRA', subtype: 'EXTRA', reason: `Extra word: "${p.typ}"` };
    }
    if (p.src !== null && p.typ === null) {
      const isTail = p.srcIdx > lastReached;
      if (isTail && !countUnreached) return { ...p, status: 'UNREACHED', reason: `Not reached: "${p.src}"` };
      if (isPunctToken(p.src)) return half('PUNCTUATION', `Missing punctuation: "${p.src}"`, p);
      return { ...p, status: 'OMISSION', subtype: 'OMISSION', reason: `Omitted: "${p.src}"` };
    }
    const a = p.src as string;
    const b = p.typ as string;
    if (a === b) return { ...p, status: 'CORRECT' };
    if (caseOnlyDiff(a, b, language)) {
      return capHalf
        ? half('CAPITALIZATION', `Capitalization: "${a}" → "${b}"`, p)
        : { ...p, status: 'FULL_MISTAKE', subtype: 'SUBSTITUTION', reason: `Wrong case: "${a}" → "${b}"` };
    }
    if (punctOnlyDiff(a, b)) {
      return punctWordFull
        ? { ...p, status: 'FULL_MISTAKE', subtype: 'SUBSTITUTION', reason: `Wrong punctuation: "${a}" → "${b}"` }
        : half('PUNCTUATION', `Punctuation: "${a}" → "${b}"`, p);
    }
    if (p.typIdx === typedWords.length - 1 && isPrefix(a, b)) {
      return { ...p, status: 'FULL_MISTAKE', subtype: 'INCOMPLETE', reason: `Incomplete word: "${a}" typed as "${b}"` };
    }
    return { ...p, status: 'FULL_MISTAKE', subtype: 'SUBSTITUTION', reason: `Wrong word: "${a}" → "${b}"` };
  });

  // repetition: EXTRA equal to the adjacent typed word — either the one before it
  // (the common case) or the one after it. The latter happens when the aligner
  // pairs the *second* occurrence of a doubled word with the source and leaves
  // the *first* occurrence as the stray EXTRA, e.g. src "the quick fox" vs typed
  // "the quick quick fox" can align position 1's "quick" to the real match and
  // flag position 0's copy as EXTRA — whose *preceding* word is "the", not
  // "quick", so a backward-only check misses it. Checking both directions
  // catches the duplicate regardless of which occurrence the aligner kept.
  for (let k = 0; k < cls.length; k++) {
    const cur = cls[k];
    if (cur.status !== 'EXTRA' || cur.consumed) continue;
    let neighbor: Cls | undefined;
    for (let z = k - 1; z >= 0; z--) if (cls[z].typ !== null && !cls[z].consumed) { neighbor = cls[z]; break; }
    if (!(neighbor?.typ && cur.typ && neighbor.typ.toLowerCase() === cur.typ.toLowerCase())) {
      for (let z = k + 1; z < cls.length; z++) if (cls[z].typ !== null && !cls[z].consumed) { neighbor = cls[z]; break; }
    }
    if (neighbor?.typ && cur.typ && neighbor.typ.toLowerCase() === cur.typ.toLowerCase()) {
      cur.subtype = 'REPETITION';
      cur.reason = `Repeated word: "${cur.typ}"`;
    }
  }

  // transposition: (A→B)(B→A) adjacent → one half
  if (!opts.allErrorsFull) {
    for (let k = 0; k < cls.length - 1; k++) {
      const c = cls[k];
      const d = cls[k + 1];
      if (c.consumed || d.consumed) continue;
      if (c.src && c.typ && d.src && d.typ &&
          c.src.toLowerCase() === d.typ.toLowerCase() &&
          c.typ.toLowerCase() === d.src.toLowerCase() &&
          c.src.toLowerCase() !== c.typ.toLowerCase()) {
        c.status = 'HALF_MISTAKE'; c.subtype = 'TRANSPOSITION';
        c.reason = `Transposition: "${c.src} ${d.src}" ↔ "${c.typ} ${d.typ}"`;
        d.status = 'HALF_MISTAKE'; d.subtype = 'TRANSPOSITION'; d.consumed = true; d.reason = c.reason;
        k++;
      }
    }
  }

  // spacing: joined / split words → one half
  if (!opts.allErrorsFull) {
    const join = (x?: string | null, y?: string | null) => (x || '').toLowerCase() + (y || '').toLowerCase();
    for (let k = 0; k < cls.length - 1; k++) {
      const c = cls[k];
      const d = cls[k + 1];
      if (c.consumed || d.consumed) continue;
      // joined: [A][B] typed "AB"
      if (c.src && c.typ && d.src && d.typ === null && c.typ.toLowerCase() === join(c.src, d.src)) {
        c.status = 'HALF_MISTAKE'; c.subtype = 'SPACING'; c.reason = `Missing space: "${c.src} ${d.src}" → "${c.typ}"`;
        d.status = 'HALF_MISTAKE'; d.subtype = 'SPACING'; d.consumed = true; d.reason = c.reason;
        k++; continue;
      }
      if (c.src && c.typ === null && d.src && d.typ && d.typ.toLowerCase() === join(c.src, d.src)) {
        c.status = 'HALF_MISTAKE'; c.subtype = 'SPACING'; c.consumed = true;
        d.status = 'HALF_MISTAKE'; d.subtype = 'SPACING'; d.reason = `Missing space: "${c.src} ${d.src}" → "${d.typ}"`;
        c.reason = d.reason; k++; continue;
      }
      // split: [A] typed "A1" "A2"
      if (c.src && c.typ && d.src === null && d.typ && c.src.toLowerCase() === join(c.typ, d.typ)) {
        c.status = 'HALF_MISTAKE'; c.subtype = 'SPACING'; c.reason = `Extra space: "${c.src}" → "${c.typ} ${d.typ}"`;
        d.status = 'HALF_MISTAKE'; d.subtype = 'SPACING'; d.consumed = true; d.reason = c.reason;
        k++; continue;
      }
      if (c.src === null && c.typ && d.src && d.typ && d.src.toLowerCase() === join(c.typ, d.typ)) {
        c.status = 'HALF_MISTAKE'; c.subtype = 'SPACING'; c.consumed = true;
        d.status = 'HALF_MISTAKE'; d.subtype = 'SPACING'; d.reason = `Extra space: "${d.src}" → "${c.typ} ${d.typ}"`;
        c.reason = d.reason; k++;
      }
    }
  }

  // tally
  let omissions = 0, substitutions = 0, extraWords = 0, repetitions = 0, incompleteWords = 0;
  let spacingErrors = 0, capitalizationErrors = 0, punctuationErrors = 0, transpositionErrors = 0;
  let correctWords = 0;
  const reached = new Set<number>();

  for (const c of cls) {
    if (c.srcIdx >= 0 && c.srcIdx <= lastReached) reached.add(c.srcIdx);
    if (c.status === 'UNREACHED' || c.consumed) continue;
    switch (c.status) {
      case 'CORRECT': correctWords++; break;
      case 'OMISSION': omissions++; break;
      case 'EXTRA': if (c.subtype === 'REPETITION') repetitions++; else extraWords++; break;
      case 'FULL_MISTAKE': if (c.subtype === 'INCOMPLETE') incompleteWords++; else substitutions++; break;
      case 'HALF_MISTAKE':
        if (c.subtype === 'CAPITALIZATION') capitalizationErrors++;
        else if (c.subtype === 'PUNCTUATION') punctuationErrors++;
        else if (c.subtype === 'SPACING') spacingErrors++;
        else if (c.subtype === 'TRANSPOSITION') transpositionErrors++;
        break;
    }
  }

  const fullErrors = omissions + substitutions + extraWords + repetitions + incompleteWords;
  const halfErrors = spacingErrors + capitalizationErrors + punctuationErrors + transpositionErrors;
  const totalErrors = round2(fullErrors + halfErrors / 2);

  const aligned: AlignedWord[] = [];
  const alignedTyped: AlignedWord[] = [];
  const mistakes: MistakeDetail[] = [];
  let oi = 0;
  let ti = 0;
  for (const c of cls) {
    if (c.src !== null) {
      aligned.push({ word: c.src, status: c.status, expected: c.src, typed: c.typ ?? '', reason: c.reason, subtype: c.subtype, index: oi++ });
    }
    if (c.typ !== null) {
      alignedTyped.push({ word: c.typ, status: c.status, expected: c.src ?? '', typed: c.typ, reason: c.reason, subtype: c.subtype, index: ti++ });
    }
    if (!c.consumed && c.status !== 'CORRECT' && c.status !== 'UNREACHED') {
      const t: MistakeDetail['type'] =
        c.status === 'OMISSION' ? 'OMISSION'
        : c.status === 'EXTRA' ? 'EXTRA'
        : c.status === 'HALF_MISTAKE' ? 'HALF_MISTAKE'
        : 'FULL_MISTAKE';
      mistakes.push({
        index: c.src !== null ? oi - 1 : ti - 1,
        expected: c.src ?? '', typed: c.typ ?? '',
        type: t, subtype: c.subtype ?? 'SUBSTITUTION', reason: c.reason ?? '',
      });
    }
  }

  return {
    fullErrors, halfErrors, totalErrors,
    omissions, substitutions, extraWords, repetitions, incompleteWords,
    spacingErrors, capitalizationErrors, punctuationErrors, transpositionErrors, paragraphErrors: 0,
    correctWords,
    typedWordCount: typedWords.length,
    passageWordCount: basePassage.length,
    reachedPassageWords: reached.size || Math.min(basePassage.length, typedWords.length),
    aligned, alignedTyped, mistakes,
  };
}

// ---------------------------------------------------------------------------
// core metrics
// ---------------------------------------------------------------------------

export function computeMetrics(input: {
  passageText: string;
  typedText: string;
  timeSeconds: number;
  keystrokesTyped?: number;
  totalErrors: number;
}): CoreMetrics {
  const passageKeystrokes = collapseWhitespace(input.passageText).length;
  const wordsInPassage = Math.round(passageKeystrokes / 5);

  const keystrokesTyped =
    input.keystrokesTyped != null && input.keystrokesTyped >= 0
      ? Math.round(input.keystrokesTyped)
      : normalizeNewlines(input.typedText).length;

  const timeSeconds = Math.max(1, Math.round(input.timeSeconds));
  const timeMinutes = timeSeconds / 60;
  const wordsTyped = keystrokesTyped / 5;

  const grossWpm = round2(wordsTyped / timeMinutes);
  const netWpm = round2(Math.max(0, wordsTyped - input.totalErrors) / timeMinutes);
  const errorPercentage = wordsInPassage > 0 ? round2((input.totalErrors / wordsInPassage) * 100) : 0;
  const accuracy = grossWpm > 0 ? round2(Math.max(0, Math.min(100, (netWpm / grossWpm) * 100))) : 0;
  const kdph = Math.round(keystrokesTyped * (60 / timeMinutes));

  return {
    keystrokesTyped, passageKeystrokes, wordsInPassage,
    wordsTyped: round2(wordsTyped),
    timeSeconds, timeMinutes: round2(timeMinutes),
    grossWpm, netWpm, errorPercentage, accuracy, kdph,
  };
}

// ---------------------------------------------------------------------------
// result builder — engines call analyse() then return finalize(...)
// ---------------------------------------------------------------------------

export interface Analysis {
  errors: ErrorBreakdown;
  core: CoreMetrics;
  language: Lang;
  qualifyingSpeed: number;
}

/** Run classification + metrics for an engine, given its classify options. */
export function analyse(
  config: CategoryConfig,
  input: EngineInput,
  classifyOpts: ClassifyOptions = {}
): Analysis {
  const language: Lang = input.language || (config.language === 'hi' ? 'hi' : 'en');
  const errors = classifyErrors(input.passageText, input.typedText, {
    language,
    allowRetype: input.allowRetype || config.retypeAllowed,
    ...classifyOpts,
  });
  const core = computeMetrics({
    passageText: input.passageText,
    typedText: input.typedText,
    timeSeconds: input.timeSeconds,
    keystrokesTyped: input.keystrokesTyped,
    totalErrors: errors.totalErrors,
  });
  const qualifyingSpeed = language === 'hi' ? config.qualifyingSpeed.hi : config.qualifyingSpeed.en;
  return { errors, core, language, qualifyingSpeed };
}

export interface FinalizeInput {
  config: CategoryConfig;
  input: EngineInput;
  analysis: Analysis;
  badge: string;
  reason: string;
  qualified: boolean;
  criteria: Criterion[];
  // overrides
  netWpm?: number;
  netWords?: number;
  accuracy?: number;
  errorPercentage?: number;
  speedPassed?: boolean;
  errorPassed?: boolean;
  marksPassed?: boolean;
  permissibleErrors?: number;
  excessErrors?: number;
  penaltyWords?: number;
  marks?: number | null;
  maxMarks?: number | null;
  qualifyingMarks?: number | null;
  scaledScorePercent?: number | null;
  aiimsGrossWpm?: number;
  aiimsNetWpm?: number;
  penaltyStrokes?: number;
  netStrokes?: number;
  tentativeSpeed?: number;
  actualSpeed?: number;
}

export function finalize(f: FinalizeInput): EngineResult {
  const { config, analysis, input } = f;
  const { errors, core } = analysis;
  const netWpm = f.netWpm ?? core.netWpm;
  const grossWpm = core.grossWpm;
  return {
    key: config.key,
    name: config.name,
    grossWpm,
    netWpm,
    netWords: f.netWords ?? round2(Math.max(0, core.wordsTyped - errors.totalErrors)),
    accuracy: f.accuracy ?? (grossWpm > 0 ? round2(Math.max(0, Math.min(100, (netWpm / grossWpm) * 100))) : 0),
    errorPercentage: f.errorPercentage ?? core.errorPercentage,
    totalErrors: errors.totalErrors,
    fullErrors: errors.fullErrors,
    halfErrors: errors.halfErrors,
    kdph: core.kdph,
    keystrokesTyped: core.keystrokesTyped,
    backspaceCount: input.backspaceCount ?? 0,
    timeSeconds: core.timeSeconds,
    timeMinutes: core.timeMinutes,
    durationMinutes: config.durationMinutes,
    qualifyingSpeed: analysis.qualifyingSpeed,
    permissibleErrors: f.permissibleErrors ?? 0,
    excessErrors: f.excessErrors ?? 0,
    penaltyWords: f.penaltyWords ?? 0,
    marks: f.marks ?? null,
    maxMarks: f.maxMarks ?? null,
    qualifyingMarks: f.qualifyingMarks ?? null,
    scaledScorePercent: f.scaledScorePercent ?? null,
    qualified: f.qualified,
    speedPassed: f.speedPassed ?? netWpm >= analysis.qualifyingSpeed,
    errorPassed: f.errorPassed ?? true,
    marksPassed: f.marksPassed ?? false,
    reason: f.reason,
    badge: f.badge,
    criteria: f.criteria,
    aiimsGrossWpm: f.aiimsGrossWpm,
    aiimsNetWpm: f.aiimsNetWpm,
    penaltyStrokes: f.penaltyStrokes,
    netStrokes: f.netStrokes,
    tentativeSpeed: f.tentativeSpeed,
    actualSpeed: f.actualSpeed,
    errors,
    core,
    config,
  };
}

/** 5%-style permissible margin + N-word penalty per excess mistake. */
export function permissiblePenalty(
  wordsTyped: number,
  totalErrors: number,
  timeMinutes: number,
  marginPct: number,
  penaltyPerMistake = 10
) {
  const permissible = round2(marginPct * wordsTyped);
  const excess = round2(Math.max(0, totalErrors - permissible));
  const penaltyWords = round2(excess * penaltyPerMistake);
  const netWords = round2(Math.max(0, wordsTyped - penaltyWords));
  const netWpm = round2(netWords / timeMinutes);
  return { permissible, excess, penaltyWords, netWords, netWpm };
}
