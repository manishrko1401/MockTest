/**
 * Allahabad High Court — Review Officer / Assistant Review Officer Typing
 * --------------------------------------------------------------------------
 * ~500-word English passage · 20 minutes · Max 50 marks.
 *   Marks   = 50 − (Total Mistakes × 0.1)          (flat, no allowance)
 *   Qualify = Marks ≥ 25  AND  Net WPM ≥ 25
 * Mistakes = spelling errors, missing words, extra/incorrect words, symbols,
 *            any deviation. Words beyond the passage limit are ignored.
 * Sources: Allahabad HC RO/ARO notification; adda247; typingwale.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'allahabad-hc',
  slug: 'allahabad-highcourt-ro-aro-typing',
  name: 'Allahabad Highcourt RO / ARO Typing',
  durationMinutes: 20,
  qualifyingSpeed: { en: 25, hi: 25 },
  backspaceAllowed: true,
  language: 'en',
  notes: '50 marks (0.10 per correct word). Qualify: ≥ 25 marks AND ≥ 25 Net WPM.',
};

const MAX_MARKS = 50;
const MARKS_PER_CORRECT_WORD = 0.10;
const MIN_MARKS = 25;
const MIN_SPEED = 25;

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  // Space-separated actual words typed
  const actualWordsTyped = (input.typedText || '').trim()
    ? (input.typedText || '').trim().split(/\s+/).filter(Boolean).length
    : 0;

  // All errors treated as full errors on TypingMitra
  const totalMistakes = errors.fullErrors + errors.halfErrors;

  // Correct words and marks
  const correctWords = Math.max(0, actualWordsTyped - totalMistakes);
  const marks = round2(Math.min(MAX_MARKS, correctWords * MARKS_PER_CORRECT_WORD));

  // Net speed calculation: ((Keystrokes/5 - Error) / Time)
  const netWords = round2(Math.max(0, core.wordsTyped - totalMistakes));
  const netWpm = core.timeMinutes > 0 ? round2(netWords / core.timeMinutes) : 0;
  const grossWpm = core.timeMinutes > 0 ? round2(core.wordsTyped / core.timeMinutes) : 0;
  const accuracy = grossWpm > 0 ? Math.min(100, round2((netWpm / grossWpm) * 100)) : 0;
  const errorPercentage = actualWordsTyped > 0 ? Math.min(100, round2((totalMistakes / actualWordsTyped) * 100)) : 0;

  const marksPassed = marks >= MIN_MARKS;
  const speedPassed = netWpm >= MIN_SPEED;
  const qualified = marksPassed && speedPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'Allahabad High Court RO / ARO — 50 Marks, 0.10/word',
    netWpm, netWords, accuracy,
    errorPercentage,
    marks, maxMarks: MAX_MARKS, qualifyingMarks: MIN_MARKS,
    marksPassed, speedPassed, qualified,
    reason: qualified
      ? `Qualified: ${marks.toFixed(2)}/50 marks ≥ ${MIN_MARKS} and Net ${netWpm.toFixed(2)} WPM ≥ ${MIN_SPEED}`
      : !marksPassed && !speedPassed
        ? `Not Qualified: ${marks.toFixed(2)}/50 marks < ${MIN_MARKS} and Net ${netWpm.toFixed(2)} WPM < ${MIN_SPEED}`
        : !marksPassed
          ? `Not Qualified: ${marks.toFixed(2)}/50 marks < ${MIN_MARKS}`
          : `Not Qualified: Net ${netWpm.toFixed(2)} WPM < ${MIN_SPEED}`,
    criteria: [
      { label: 'Words Typed (Space-separated)', value: actualWordsTyped, status: 'INFO' },
      { label: 'Full Errors', value: totalMistakes, status: 'INFO' },
      { label: 'Total Errors', value: totalMistakes, status: 'INFO' },
      { label: 'Correct Words', value: correctWords, status: 'INFO' },
      { label: 'Marks Obtained', value: `${marks.toFixed(2)} / ${MAX_MARKS}`, status: marksPassed ? 'PASS' : 'FAIL' },
      { label: 'Minimum Qualifying Marks', value: `${MIN_MARKS} / ${MAX_MARKS}`, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm.toFixed(2)} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Minimum Qualifying Speed', value: `${MIN_SPEED} WPM`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
