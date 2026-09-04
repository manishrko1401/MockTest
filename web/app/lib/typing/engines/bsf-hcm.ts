/**
 * BSF Head Constable (Ministerial) Typing
 * --------------------------------------------------------------------------
 * 10 minutes · English 35 WPM (10,500 KDPH) · Hindi 30 WPM (9,000 KDPH).
 * 5% error tolerance; beyond that, a 10-word penalty per excess mistake.
 *   Net WPM = (Words Typed − max(0, Total Errors − 5%×Words) × 10) / min
 * Sources: BSF HC(M)/ASI/Havildar notification; typingmitra.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, permissiblePenalty } from '../core';

export const config: CategoryConfig = {
  key: 'bsf-hcm',
  slug: 'bsf-hcm-typing',
  name: 'BSF HCM Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 35, hi: 30 },
  kdphTarget: { en: 10500, hi: 9000 },
  backspaceAllowed: true,
  language: 'both',
  notes: '5% error tolerance, then 10-word penalty per excess mistake.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { countUnreachedAsOmission: true });
  const { core, errors, qualifyingSpeed } = a;

  const totalErrors = errors.fullErrors + errors.halfErrors;
  const { permissible, excess, penaltyWords, netWords, netWpm } =
    permissiblePenalty(core.wordsTyped, totalErrors, core.timeMinutes, 0.05, 10);

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'BSF HCM — 5% tolerance, excess × 10-word penalty',
    netWpm, netWords,
    permissibleErrors: permissible, excessErrors: excess, penaltyWords,
    speedPassed, qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Words Typed (KS ÷ 5)', value: core.wordsTyped, status: 'INFO' },
      { label: 'Total Errors', value: errors.totalErrors, status: 'INFO' },
      { label: '5% Tolerance', value: permissible, status: 'INFO' },
      { label: 'Excess Errors', value: excess, status: 'INFO' },
      { label: 'Penalty Words (Excess × 10)', value: penaltyWords, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
