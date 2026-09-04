/**
 * Bombay High Court — Clerk Typing
 * --------------------------------------------------------------------------
 * 10 minutes · 400-word English passage · 40 WPM · Max 20 marks, min 10 to
 * qualify (paper-to-screen mode).
 *   Net Words = Words Typed − Total Errors
 *   Marks     = min(20, Net Words / 400 × 20)
 *   Qualify   = Marks ≥ 10  AND  Net WPM ≥ 40
 * Sources: Bombay HC Clerk recruitment; typingmitra.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'bombay-hc-clerk',
  slug: 'bombay-high-court-clerk-typing',
  name: 'Bombay High Court Clerk Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 40, hi: 30 },
  backspaceAllowed: true,
  language: 'en',
  notes: '400-word passage, 40 WPM. 20 marks, min 10 to qualify.',
};

const PASSAGE_WORDS = 400;
const MAX_MARKS = 20;
const MIN_MARKS = 10;

export function evaluate(input: EngineInput): EngineResult {
  // TypingMitra counts all errors as full errors (Additions, Omissions, Spelling, Spacing, Caps, Punctuation)
  const a = analyse(config, input, { countUnreachedAsOmission: true, allErrorsFull: true });
  const { core, errors, qualifyingSpeed } = a;

  const totalErrors = errors.fullErrors;
  const netWords = round2(Math.max(0, core.wordsTyped - totalErrors));
  const netWpm = round2(netWords / core.timeMinutes);

  // Official Bombay High Court / TypingMitra formula:
  // 0.25 marks deducted per mistake (1 mark per 4 mistakes), Max 20 Marks, Min 10 to qualify
  const penaltyMarks = round2(totalErrors * 0.25);
  const marks = round2(Math.max(0, MAX_MARKS - penaltyMarks));

  const speedPassed = netWpm >= qualifyingSpeed;
  const marksPassed = marks >= MIN_MARKS;
  const qualified = speedPassed && marksPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'Bombay HC Clerk — 20 Marks (0.25 marks deducted per error)',
    netWpm, netWords,
    marks, maxMarks: MAX_MARKS, qualifyingMarks: MIN_MARKS,
    penaltyWords: penaltyMarks,
    speedPassed, marksPassed, qualified,
    reason: qualified
      ? `Qualified: ${marks.toFixed(2)}/20.00 Marks ≥ ${MIN_MARKS}.00 and Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : !speedPassed && !marksPassed
        ? `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM and ${marks.toFixed(2)}/20.00 Marks < ${MIN_MARKS}.00`
        : !marksPassed
          ? `Not Qualified: ${marks.toFixed(2)}/20.00 Marks < ${MIN_MARKS}.00 (Exceeded permissible error penalty)`
          : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Words Typed (KS ÷ 5)', value: core.wordsTyped, status: 'INFO' },
      { label: 'Total Errors (All Full)', value: totalErrors, status: 'INFO' },
      { label: 'Penalty Deducted', value: `-${penaltyMarks.toFixed(2)} Marks (0.25 marks / mistake)`, status: penaltyMarks === 0 ? 'PASS' : 'INFO' },
      { label: 'Marks Obtained', value: `${marks.toFixed(2)} / ${MAX_MARKS}.00`, status: marksPassed ? 'PASS' : 'FAIL' },
      { label: 'Minimum Qualifying Marks', value: `${MIN_MARKS}.00 / ${MAX_MARKS}.00`, status: 'INFO' },
      { label: 'Net Speed', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Minimum Qualifying Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
      { label: 'Gross Speed', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Accuracy', value: `${core.accuracy}%`, status: 'INFO' },
      { label: 'Error %', value: `${core.errorPercentage}%`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
