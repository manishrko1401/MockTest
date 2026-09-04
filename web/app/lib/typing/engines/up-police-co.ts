/**
 * UP Police Computer Operator (UPPCO) Typing
 * --------------------------------------------------------------------------
 * 15 minutes · English 30 WPM · Hindi 25 WPM · minimum 85% accuracy is
 * MANDATORY. Both language sections must be cleared.
 *
 * Matching TypingMitra UP Police CO rules:
 * - Total Words Available in Passage: Words separated by space in the original passage
 * - Total Words Typed: Words separated by space in typed text
 * - Total Errors: Full Errors + Half Errors / 2
 * - Correct Words Typed: max(0, Total Words Typed − Total Errors)
 * - Gross WPM: Total Words Typed / Time (min)
 * - Net WPM: max(0, (Total Words Typed − Total Errors) / Time (min))
 * - Accuracy: (Correct Words Typed / Total Words Available in Passage) × 100
 * - Extra Space Error: An extra space between two words counts as half error (0.5)
 * - Qualification: Net WPM ≥ 30 (English) / 25 (Hindi) AND Accuracy ≥ 85%
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2, tokenizeWords } from '../core';

export const config: CategoryConfig = {
  key: 'up-police-co',
  slug: 'up-police-computer-operator-typing',
  name: 'UP Police Computer Operator Typing',
  durationMinutes: 15,
  qualifyingSpeed: { en: 30, hi: 25 },
  backspaceAllowed: true,
  retypeAllowed: false,
  language: 'both',
  notes: '30 WPM English / 25 WPM Hindi. Minimum 85% accuracy mandatory.',
};

const MIN_ACCURACY = 85;

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  const passageWords = tokenizeWords(input.passageText).length;
  const typedTokens = tokenizeWords(input.typedText);
  const wordsTyped = typedTokens.length;

  const fullErrors = errors.fullErrors;
  const halfErrors = errors.halfErrors;
  const totalErrors = round2(fullErrors + (halfErrors / 2));

  const correctWords = Math.max(0, wordsTyped - totalErrors);
  const timeMin = Math.max(0.001, core.timeMinutes);
  const grossWpm = round2(wordsTyped / timeMin);
  const netWpm = round2(correctWords / timeMin);
  const accuracy = passageWords > 0 ? round2((correctWords / passageWords) * 100) : 0;
  const errorPercentage = wordsTyped > 0 ? round2((totalErrors / wordsTyped) * 100) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const accPassed = accuracy >= MIN_ACCURACY;
  const qualified = speedPassed && accPassed;

  const res = finalize({
    config, input, analysis: a,
    badge: 'UP Police CO — 85% accuracy mandatory',
    netWpm, netWords: correctWords,
    accuracy,
    errorPercentage,
    speedPassed, errorPassed: accPassed, qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} and Accuracy ${accuracy}% ≥ ${MIN_ACCURACY}%`
      : !accPassed
        ? `Not Qualified: Accuracy ${accuracy}% < ${MIN_ACCURACY}%`
        : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed}`,
    criteria: [
      { label: 'Total Words Available', value: passageWords, status: 'INFO' },
      { label: 'Total Words Typed', value: wordsTyped, status: 'INFO' },
      { label: 'Correct Words Typed', value: correctWords, status: 'INFO' },
      { label: 'Full Errors', value: fullErrors, status: 'INFO' },
      { label: 'Half Errors', value: halfErrors, status: 'INFO' },
      { label: 'Total Errors (Full + Half/2)', value: totalErrors, status: 'INFO' },
      { label: 'Gross WPM', value: `${grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
      { label: 'Accuracy', value: `${accuracy}%`, status: accPassed ? 'PASS' : 'FAIL' },
      { label: 'Minimum Accuracy', value: `${MIN_ACCURACY}%`, status: 'INFO' },
    ],
  });

  res.grossWpm = grossWpm;
  res.totalErrors = totalErrors;
  res.fullErrors = fullErrors;
  res.halfErrors = halfErrors;
  return res;
}

const engine: TypingEngine = { config, evaluate };
export default engine;

