/**
 * DDA STENOGRAPHER TYPING (Delhi Development Authority - Stenographer Grade D)
 * ----------------------------------------------------------------------------
 * 10 minutes · English 40 WPM / Hindi 35 WPM.
 * Backspace: ENABLED.
 * Retype: Single Pass (Disabled).
 *
 * Matching TypingMitra DDA Stenographer rules:
 * - All errors (additions, omissions, spelling/substitutions, repetitions, incomplete words, spacing, capitalization, punctuation)
 *   are counted as 1 full error each. (In DDA / DSSSB all errors are counted as full error).
 * - Prefix-only comparison: Unreached tail of passage is NOT counted as omission.
 * - Total Keystrokes Typed: Count of characters in final typed text.
 * - Words Typed: Total Keystrokes / 5.
 * - Gross WPM: (Keystrokes Typed / 5) / Time (min).
 * - Net WPM: max(0, ((Keystrokes / 5) - Total Errors) / Time (min)).
 * - Accuracy: (Net WPM / Gross WPM) × 100.
 * - Error Percentage: (Total Errors / Total Words Typed) × 100.
 * - Qualification: Net WPM ≥ 40 (English) or ≥ 35 (Hindi).
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'dda-steno',
  slug: 'dda-stenographer-typing',
  name: 'DDA Stenographer Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 40, hi: 35 },
  backspaceAllowed: true,
  retypeAllowed: false,
  language: 'both',
  notes: 'Stenographer Grade D. All errors count as full error (1 error). Net WPM = (Words Typed - Total Errors) / Time.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  // In DDA Stenographer / DSSSB, all errors count as full error (no 0.5 discount)
  const totalErrors = errors.fullErrors + errors.halfErrors;
  const wordsTyped = core.wordsTyped; // Keystrokes Typed / 5
  const netWords = round2(Math.max(0, wordsTyped - totalErrors));
  const netWpm = core.timeMinutes > 0 ? round2(netWords / core.timeMinutes) : 0;
  const errorPercentage = wordsTyped > 0 ? round2((totalErrors / wordsTyped) * 100) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config,
    input,
    analysis: a,
    badge: 'DDA Stenographer — All errors full, 1-word deduction per error',
    netWpm,
    netWords,
    errorPercentage,
    speedPassed,
    qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Full Errors', value: totalErrors, status: 'INFO' },
      { label: 'Total Errors (All count as 1)', value: totalErrors, status: 'INFO' },
      { label: 'Error %', value: `${errorPercentage}%`, status: 'INFO' },
      { label: 'Keystrokes Typed', value: core.keystrokesTyped, status: 'INFO' },
      { label: 'Backspace Pressed', value: input.backspaceCount || 0, status: 'INFO' },
      { label: 'Words Typed (KS ÷ 5)', value: wordsTyped, status: 'INFO' },
      { label: 'Gross WPM', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Accuracy', value: `${core.accuracy}%`, status: 'INFO' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
      { label: 'Qualification', value: qualified ? 'Qualified' : 'Not Qualified', status: qualified ? 'PASS' : 'FAIL' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
