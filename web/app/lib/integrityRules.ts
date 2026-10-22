// -----------------------------------------------------------------------------
// Exam integrity checks: looks at one submitted attempt and says how suspicious it is, with
// the reasons. Nothing here blocks or punishes anyone; a high score puts the attempt in the
// admin "Integrity review" list and keeps it out of rankings until someone looks at it.
//
// Pure functions (no database), so the same rules run on every submit and in backtests.
// -----------------------------------------------------------------------------

export type IntegrityLevel = 'ok' | 'watch' | 'flagged';

export interface IntegrityQuestion {
  id: string;
  /** Words to read: the question plus half of the options (a rough reading load) */
  words: number;
  correctIndex: number | null;
}

export interface IntegrityResponse {
  selectedOptionIndex: number | null;
  elapsedSeconds: number;
  /** When the saved answer was chosen (ms, the device's clock); missing on older apps */
  answeredAt?: number;
}

export interface IntegrityInput {
  questions: IntegrityQuestion[];
  responses: Record<string, IntegrityResponse | undefined>;
  durationMinutes: number;
  /** Median seconds other students spent on each answered question (only questions with 5+ answers) */
  medians?: Record<string, number>;
  /** Seconds between the server first seeing this attempt (first progress save) and the submit */
  wallClockSeconds?: number | null;
  violations?: number;
  /** Completed attempts of the same test before this one (a retake can know the answers) */
  previousAttempts?: number;
  /** RPSC RAS: option index 4 means "leave unattempted" */
  rpscOptionE?: boolean;
}

export interface IntegrityReason {
  code: 'fast_correct' | 'faster_than_others' | 'high_score_little_time' | 'answer_bursts' | 'clock_mismatch' | 'left_exam';
  points: number;
  /** One line for the admin page */
  detail: string;
  /** Question ids involved (for the timeline) */
  questions?: string[];
}

export interface IntegrityResult {
  score: number;
  level: IntegrityLevel;
  reasons: IntegrityReason[];
  retake: boolean;
  stats: {
    answered: number; correct: number; accuracy: number; totalSeconds: number; durationSeconds: number;
    fastCorrect: number; fasterThanOthers: number; burstAnswers: number; bursts: number; wallClockSeconds: number | null;
  };
}

/** Points at which an attempt is watched / flagged for review. */
export const WATCH_AT = 25;
export const FLAG_AT = 50;

/** Seconds a student needs at the very least to read a question and its options. */
export const minReadSeconds = (words: number) => Math.max(2, words / 8);

const BURST_WINDOW_MS = 2000;
const BURST_MIN = 3;

const span = (sec: number) => (sec < 120 ? `${Math.round(sec)} s` : `${Math.round(sec / 60)} min`);

export function countWords(htmlOrText: string): number {
  const text = String(htmlOrText || '')
    .replace(/<img\b[^>]*>/gi, ' picture ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');
  return text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Groups of 3+ answers chosen within 2 seconds (answer-key style entry). */
export function findBursts(times: { id: string; at: number }[]) {
  const sorted = [...times].filter(x => Number.isFinite(x.at) && x.at > 0).sort((a, b) => a.at - b.at);
  const bursts: string[][] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].at - sorted[i].at < BURST_WINDOW_MS) j++;
    if (j - i + 1 >= BURST_MIN) { bursts.push(sorted.slice(i, j + 1).map(x => x.id)); i = j + 1; }
    else i++;
  }
  return bursts;
}

export function analyzeAttempt(input: IntegrityInput): IntegrityResult {
  const reasons: IntegrityReason[] = [];
  const answeredIds: string[] = [];
  const correctIds = new Set<string>();
  let totalSeconds = 0;

  for (const q of input.questions) {
    const r = input.responses[q.id];
    if (!r) continue;
    totalSeconds += Math.max(0, Number(r.elapsedSeconds) || 0);
    const chosen = r.selectedOptionIndex;
    if (chosen === null || chosen === undefined || (input.rpscOptionE && chosen === 4)) continue;
    answeredIds.push(q.id);
    if (q.correctIndex !== null && chosen === q.correctIndex) correctIds.add(q.id);
  }
  const answered = answeredIds.length;
  const correct = correctIds.size;
  const accuracy = answered ? (correct / answered) * 100 : 0;
  const durationSeconds = Math.max(60, Math.round((input.durationMinutes || 60) * 60));
  const byId = new Map(input.questions.map(q => [q.id, q]));

  // A retake can know the answers from the solutions: speed counts half there
  const speedWeight = (input.previousAttempts || 0) > 0 ? 0.5 : 1;

  // 1. Correct answers faster than anyone can read the question. Only when the fast answers
  //    are mostly right: someone clicking at random is fast too, but right about 1 in 4 times.
  const fastAnswered = answeredIds.filter(id => (Number(input.responses[id]?.elapsedSeconds) || 0) < minReadSeconds(byId.get(id)?.words || 0));
  const fast = fastAnswered.filter(id => correctIds.has(id));
  if (fast.length >= 5 && fast.length / Math.max(1, correct) >= 0.15 && fast.length / fastAnswered.length >= 0.7) {
    reasons.push({
      code: 'fast_correct', points: Math.round((20 + Math.min(30, fast.length * 2)) * speedWeight), questions: fast,
      detail: `${fast.length} of ${correct} correct answers came faster than the question can be read`,
    });
  }

  // 2. Correct in under a fifth of the usual time, again and again
  const medians = input.medians || {};
  const withMedian = [...correctIds].filter(id => (medians[id] || 0) >= 10);
  const fasterAnswered = answeredIds.filter(id => (medians[id] || 0) >= 10 && (Number(input.responses[id]?.elapsedSeconds) || 0) < medians[id] * 0.2);
  const faster = fasterAnswered.filter(id => correctIds.has(id));
  if (faster.length >= 5 && faster.length / Math.max(1, withMedian.length) >= 0.2 && faster.length / fasterAnswered.length >= 0.7) {
    reasons.push({
      code: 'faster_than_others', points: Math.round((15 + Math.min(25, faster.length * 2)) * speedWeight), questions: faster,
      detail: `${faster.length} correct answers took under a fifth of the time other students usually need`,
    });
  }

  // 3. Near-perfect score in a small part of the time
  if (answered >= Math.max(10, input.questions.length * 0.5) && accuracy >= 90 && totalSeconds < durationSeconds * 0.25) {
    reasons.push({
      code: 'high_score_little_time', points: Math.round(30 * speedWeight),
      detail: `${Math.round(accuracy)}% accuracy on ${answered} answers in ${Math.round(totalSeconds / 60)} min of a ${Math.round(durationSeconds / 60)} min test`,
    });
  }

  // 4. Several answers chosen within 2 seconds of each other
  const times = answeredIds.map(id => ({ id, at: Number(input.responses[id]?.answeredAt) || 0 }));
  const bursts = findBursts(times);
  const burstIds = bursts.flat();
  if (burstIds.length >= 3) {
    const burstCorrect = burstIds.filter(id => correctIds.has(id)).length;
    const mostlyRight = burstIds.length >= 3 && burstCorrect / burstIds.length >= 0.8;
    const points = (burstIds.length >= 6 ? 25 + Math.min(25, burstIds.length) : 15) + (mostlyRight ? 10 : 0);
    reasons.push({
      code: 'answer_bursts', points, questions: burstIds,
      detail: `${burstIds.length} answers were chosen in ${bursts.length} burst${bursts.length > 1 ? 's' : ''} of 3+ within 2 seconds (${burstCorrect} correct)`,
    });
  }

  // 5. The device says more time was spent than really passed (timer tampering)
  const wall = input.wallClockSeconds ?? null;
  if (wall !== null && wall > 0 && totalSeconds > wall * 1.15 + 120) {
    reasons.push({
      code: 'clock_mismatch', points: 40,
      detail: `Time on questions adds up to ${span(totalSeconds)}, but only ${span(wall)} passed on the server`,
    });
  }

  // 6. Left the exam screen (app switches / tab changes)
  const v = Math.max(0, Math.round(input.violations || 0));
  if (v >= 2) reasons.push({ code: 'left_exam', points: Math.min(15, v * 5), detail: `Left the exam screen ${v} times` });

  const score = Math.min(100, reasons.reduce((a, r) => a + r.points, 0));
  return {
    score,
    level: score >= FLAG_AT ? 'flagged' : score >= WATCH_AT ? 'watch' : 'ok',
    reasons,
    retake: (input.previousAttempts || 0) > 0,
    stats: {
      answered, correct, accuracy: Math.round(accuracy * 10) / 10, totalSeconds: Math.round(totalSeconds), durationSeconds,
      fastCorrect: fast.length, fasterThanOthers: faster.length, burstAnswers: burstIds.length, bursts: bursts.length, wallClockSeconds: wall,
    },
  };
}
