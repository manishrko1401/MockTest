/**
 * EMRS JSA TYPING
 * --------------------------------------------------------------------------
 * 10 minutes · English 35 WPM / Hindi 30 WPM.
 * Backspace: ENABLED.
 *
 * Matching TypingMitra EMRS JSA rules:
 * - All errors (additions, omissions, substitutions, capitalization, spacing, punctuation)
 *   are counted as 1 full error each.
 * - Prefix-only comparison (unreached tail of passage is not counted as omission).
 * - 1x error deduction: Net WPM = ((Keystrokes / 5) - Total Errors) / Time (min).
 * - Words Typed: Total Keystrokes / 5
 * - Error Percentage: (Total Errors / Total Words Typed) × 100
 * - Gross WPM: (Keystrokes Typed / 5) / Time (min)
 * - Accuracy: (Net WPM / Gross WPM) × 100
 * - Qualification: Net WPM ≥ 35 (English) or ≥ 30 (Hindi).
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'emrs-jsa',
  slug: 'emrs-jsa-typing',
  name: 'EMRS JSA TYPING',
  durationMinutes: 10,
  qualifyingSpeed: { en: 35, hi: 30 },
  kdphTarget: { en: 10500, hi: 9000 },
  backspaceAllowed: true,
  retypeAllowed: true,
  language: 'both',
  notes: 'All errors count as full error (1 error). 1x error deduction: ((Keystrokes/5) - Total Errors) / Time.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  // In EMRS JSA all errors are counted as full error
  const totalErrors = errors.fullErrors + errors.halfErrors;
  const wordsTyped = core.wordsTyped;
  const netWords = round2(Math.max(0, wordsTyped - totalErrors));
  const netWpm = round2(netWords / core.timeMinutes);
  const errorPercentage = wordsTyped > 0 ? round2((totalErrors / wordsTyped) * 100) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'EMRS JSA — All errors full, 1x error deduction',
    netWpm, netWords,
    errorPercentage,
    penaltyWords: 0,
    speedPassed, qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Keystrokes Typed', value: core.keystrokesTyped, status: 'INFO' },
      { label: 'Words Typed (KS ÷ 5)', value: wordsTyped, status: 'INFO' },
      { label: 'Full Errors', value: totalErrors, status: 'INFO' },
      { label: 'Total Errors (All count as 1)', value: totalErrors, status: 'INFO' },
      { label: 'Error %', value: `${errorPercentage}%`, status: 'INFO' },
      { label: 'Gross WPM', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
