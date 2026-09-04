/**
 * DSSSB Computer Lab (IT Assistant) Typing
 * --------------------------------------------------------------------------
 * 10 minutes · English 26.67 WPM / Hindi 26.67 WPM.
 * Backspace: ENABLED.
 * Retype: Single Pass (Disabled).
 *
 * Matching TypingMitra DSSSB Computer Lab (IT Assistant) rules:
 * - All errors (additions, omissions, spelling/substitutions, capitalization, spacing, punctuation)
 *   are counted as 1 full error each.
 * - Prefix-only comparison (unreached tail of passage is not counted as omission).
 * - Penalty: (Total Errors) × 2 words (Ek Wrong per 2 words ki penalty lagti hai).
 * - Words Typed: Total Keystrokes / 5
 * - Error Percentage: (Total Errors / Total Words Typed) × 100
 * - Gross WPM: (Keystrokes Typed / 5) / Time (min)
 * - Net WPM: max(0, ((Keystrokes Typed / 5) - Penalty) / Time (min))
 * - Accuracy: (Net WPM / Gross WPM) × 100
 * - Qualification: Net WPM ≥ 26.67 WPM.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'dsssb-it-assistant',
  slug: 'dsssb-computer-lab-it-assistant-typing',
  name: 'DSSSB Computer Lab (IT Assistant) Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 26.67, hi: 26.67 },
  backspaceAllowed: true,
  retypeAllowed: false,
  language: 'both',
  notes: 'All errors count as full error (1 error). 2-word penalty per error. Minimum 26.67 WPM.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  // In DSSSB all errors are counted as full error
  const totalErrors = errors.fullErrors + errors.halfErrors;
  const wordsTyped = core.wordsTyped;
  const penaltyWords = round2(totalErrors * 2);
  const netWords = round2(Math.max(0, wordsTyped - penaltyWords));
  const netWpm = core.timeMinutes > 0 ? round2(netWords / core.timeMinutes) : 0;
  const errorPercentage = wordsTyped > 0 ? round2((totalErrors / wordsTyped) * 100) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config,
    input,
    analysis: a,
    badge: 'DSSSB Computer Lab (IT Assistant) — All errors full, 2-word penalty per error',
    netWpm,
    netWords,
    errorPercentage,
    penaltyWords,
    speedPassed,
    qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Keystrokes Typed', value: core.keystrokesTyped, status: 'INFO' },
      { label: 'Words Typed (KS ÷ 5)', value: wordsTyped, status: 'INFO' },
      { label: 'Full Errors', value: totalErrors, status: 'INFO' },
      { label: 'Total Errors (All count as 1)', value: totalErrors, status: 'INFO' },
      { label: 'Penalty (Errors × 2)', value: penaltyWords, status: 'INFO' },
      { label: 'Error %', value: `${errorPercentage}%`, status: 'INFO' },
      { label: 'Gross WPM', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
      { label: 'Qualification', value: qualified ? 'Qualified' : 'Not Qualified', status: qualified ? 'PASS' : 'FAIL' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
