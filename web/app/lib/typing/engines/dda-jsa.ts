/**
 * DDA JSA TYPING (Delhi Development Authority - Junior Secretariat Assistant)
 * --------------------------------------------------------------------------
 * 10 minutes · English 35 WPM / Hindi 30 WPM.
 * Backspace: ENABLED.
 * Retype: Single Pass (Disabled).
 *
 * Matching TypingMitra DDA JSA rules:
 * - All errors (additions, omissions, spelling/substitutions, repetitions, incomplete words)
 *   are counted as 1 full error each.
 * - Prefix-only comparison (unreached tail of passage is not counted as omission).
 * - Penalty: (Total Errors) × 10 words (10-word deduction per error).
 * - Total Words Typed: Total Keystrokes / 5
 * - Error Percentage: (Total Errors / Total Words Typed) × 100
 * - Gross WPM: (Keystrokes Typed / 5) / Time (min)
 * - Net WPM: max(0, (Words Typed - Penalty) / Time (min))
 * - Accuracy: (Net WPM / Gross WPM) × 100
 * - Qualification: Net WPM ≥ 35 (English) or ≥ 30 (Hindi).
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'dda-jsa',
  slug: 'dda-jsa-typing',
  name: 'DDA JSA Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 35, hi: 30 },
  backspaceAllowed: true,
  retypeAllowed: false,
  language: 'both',
  notes: 'All errors count as full error (1 error). 10-word penalty per error.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  // In DDA JSA all errors are counted as full error
  const totalErrors = errors.fullErrors + errors.halfErrors;
  const wordsTyped = core.wordsTyped;
  const penaltyWords = round2(totalErrors * 10);
  const netWords = round2(Math.max(0, wordsTyped - penaltyWords));
  const netWpm = round2(netWords / core.timeMinutes);
  const errorPercentage = wordsTyped > 0 ? round2((totalErrors / wordsTyped) * 100) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'DDA JSA — All errors full, 10-word penalty per error',
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
      { label: 'Total Errors (All count as 1)', value: totalErrors, status: 'INFO' },
      { label: 'Penalty (Errors × 10)', value: penaltyWords, status: 'INFO' },
      { label: 'Error %', value: `${errorPercentage}%`, status: 'INFO' },
      { label: 'Gross WPM', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;

