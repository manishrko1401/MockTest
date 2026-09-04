/**
 * CSIR JSA TYPING
 * --------------------------------------------------------------------------
 * 10 minutes · English 35 WPM / Hindi 30 WPM.
 * Backspace: ENABLED.
 *
 * Matching TypingMitra CSIR JSA rules:
 * - All errors (additions, omissions, substitutions, capitalization, spacing, punctuation)
 *   are counted as 1 full error each.
 * - Prefix-only comparison (unreached tail of passage is not counted as omission).
 * - 5% Ignorable Errors: 5% of (Total Keystrokes Typed / 5).
 * - Penalty: (Total Errors - Ignorable Errors) × 10.
 * - Net WPM = ((Keystrokes / 5) - Penalty) / Time (min).
 * - Words Typed: Total Keystrokes / 5
 * - Error Percentage: (Total Errors / Total Words Typed) × 100
 * - Gross WPM: (Keystrokes Typed / 5) / Time (min)
 * - Accuracy: (Net WPM / Gross WPM) × 100
 * - Qualification: Net WPM ≥ 35 (English) or ≥ 30 (Hindi).
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'csir-jsa',
  slug: 'csir-jsa-typing',
  name: 'CSIR JSA TYPING',
  durationMinutes: 10,
  qualifyingSpeed: { en: 35, hi: 30 },
  kdphTarget: { en: 10500, hi: 9000 },
  backspaceAllowed: true,
  retypeAllowed: true,
  language: 'both',
  notes: 'All errors full. 5% ignorable errors, excess × 10-word penalty.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  // In CSIR JSA all errors are counted as full error
  const totalErrors = errors.fullErrors + errors.halfErrors;
  const wordsTyped = core.wordsTyped;
  const ignorableErrors = round2(0.05 * wordsTyped);
  const excessErrors = Math.max(0, round2(totalErrors - ignorableErrors));
  const penaltyWords = round2(excessErrors * 10);
  const netWords = round2(Math.max(0, wordsTyped - penaltyWords));
  const netWpm = round2(netWords / core.timeMinutes);
  const errorPercentage = wordsTyped > 0 ? round2((totalErrors / wordsTyped) * 100) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'CSIR JSA — 5% ignorable, excess × 10-word penalty',
    netWpm, netWords,
    errorPercentage,
    penaltyWords,
    speedPassed, qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Keystrokes Typed', value: core.keystrokesTyped, status: 'INFO' },
      { label: 'Words Typed (KS ÷ 5)', value: wordsTyped, status: 'INFO' },
      { label: 'Full Errors', value: totalErrors, status: 'INFO' },
      { label: 'Total Errors', value: totalErrors, status: 'INFO' },
      { label: 'Ignorable Errors (5%)', value: ignorableErrors, status: 'INFO' },
      { label: 'Penalty Words', value: penaltyWords, status: penaltyWords > 0 ? 'FAIL' : 'PASS' },
      { label: 'Error %', value: `${errorPercentage}%`, status: 'INFO' },
      { label: 'Gross WPM', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
