/**
 * Supreme Court of India — Junior Court Assistant (JCA) Typing
 * --------------------------------------------------------------------------
 * 10 minutes · English 35 WPM · mistakes allowed up to 3% of total words typed.
 * Backspace is NOT allowed.
 *   Permissible = 3% × Words Typed
 *   Net WPM     = (Words Typed − max(0, Total Errors − Permissible) × 10) / min
 *   Qualify     = Net speed ≥ 35 AND error % ≤ 3%
 * Sources: Supreme Court JCA notification.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, permissiblePenalty } from '../core';

export const config: CategoryConfig = {
  key: 'supreme-court-jca',
  slug: 'supreme-court-junior-court-assistant-jca-typing',
  name: 'Supreme Court Junior Court Assistant (JCA) Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 35, hi: 30 },
  maxErrorPercent: { ur: 3 },
  backspaceAllowed: false,
  language: 'en',
  notes: '35 WPM, mistakes ≤ 3% of words typed. Backspace not allowed.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { countUnreachedAsOmission: true });
  const { core, errors, qualifyingSpeed } = a;

  const { permissible, excess, penaltyWords, netWords, netWpm } =
    permissiblePenalty(core.wordsTyped, errors.totalErrors, core.timeMinutes, 0.03, 10);

  const speedPassed = netWpm >= qualifyingSpeed;
  const errorPassed = core.errorPercentage <= 3;
  const qualified = speedPassed && errorPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'Supreme Court JCA — 3% permissible errors',
    netWpm, netWords,
    permissibleErrors: permissible, excessErrors: excess, penaltyWords,
    speedPassed, errorPassed, qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} and Error ${core.errorPercentage}% ≤ 3%`
      : !speedPassed
        ? `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed}`
        : `Not Qualified: Error ${core.errorPercentage}% > 3%`,
    criteria: [
      { label: 'Words Typed (KS ÷ 5)', value: core.wordsTyped, status: 'INFO' },
      { label: 'Total Errors', value: errors.totalErrors, status: 'INFO' },
      { label: 'Permissible (3% of words)', value: permissible, status: 'INFO' },
      { label: 'Excess Errors', value: excess, status: 'INFO' },
      { label: 'Penalty Words (Excess × 10)', value: penaltyWords, status: 'INFO' },
      { label: 'Error %', value: `${core.errorPercentage}%`, status: errorPassed ? 'PASS' : 'FAIL' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Required', value: `${qualifyingSpeed} WPM, ≤ 3% error`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
