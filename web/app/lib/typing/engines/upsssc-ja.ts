/**
 * UPSSSC Junior Assistant Typing (English section)
 * --------------------------------------------------------------------------
 * 5 minutes · English 30 WPM · Hindi 25 WPM (see upsssc-ja-hindi).
 * Evaluation Rules (Typing Mitra standard):
 * - Total Errors = Full Errors + (Half Errors / 2)
 * - Ignorable Errors: First 5 errors
 * - Penalty words = max(0, (Total Errors - Ignorable Errors) * 5)
 * - Words Typed = Total Keystrokes / 5
 * - Net WPM = max(0, (Words Typed - Penalty) / Time (min))
 * - Accuracy = (Net WPM / Gross WPM) * 100
 * - Qualifying Speed: English >= 30 WPM, Hindi >= 25 WPM.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'upsssc-ja',
  slug: 'upsssc-junior-assistant-typing',
  name: 'UPSSSC Junior Assistant Typing',
  durationMinutes: 5,
  qualifyingSpeed: { en: 30, hi: 25 },
  backspaceAllowed: true,
  language: 'both',
  notes: '5-min test. First 5 errors ignorable; excess errors incur 5-word penalty. Qualifying: En 30 / Hi 25 WPM.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { countUnreachedAsOmission: true });
  const { core, errors, qualifyingSpeed } = a;

  const totalErrors = round2(errors.fullErrors + (errors.halfErrors / 2));
  const ignorableErrors = Math.min(5, totalErrors);
  const excessErrors = round2(Math.max(0, totalErrors - ignorableErrors));
  const penaltyWords = round2(excessErrors * 5);

  const wordsTyped = core.wordsTyped;
  const netWords = round2(Math.max(0, wordsTyped - penaltyWords));
  const timeMin = Math.max(1 / 60, core.timeMinutes);
  const netWpm = round2(netWords / timeMin);
  const grossWpm = core.grossWpm;
  const accuracy = grossWpm > 0 ? Math.min(100, Math.max(0, round2((netWpm / grossWpm) * 100))) : 0;
  const errorPercentage = wordsTyped > 0 ? round2((totalErrors / wordsTyped) * 100) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config,
    input,
    analysis: a,
    badge: 'UPSSSC JA — 5 ignorable errors, 5-word penalty per excess error',
    netWpm,
    netWords,
    accuracy,
    errorPercentage,
    permissibleErrors: ignorableErrors,
    excessErrors,
    speedPassed,
    qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Words Typed (KS ÷ 5)', value: wordsTyped, status: 'INFO' },
      { label: 'Full Errors', value: errors.fullErrors, status: 'INFO' },
      { label: 'Half Errors', value: errors.halfErrors, status: 'INFO' },
      { label: 'Total Errors', value: totalErrors, status: 'INFO' },
      { label: 'Ignorable Errors', value: ignorableErrors, status: 'INFO' },
      { label: 'Penalty Words (Excess × 5)', value: penaltyWords, status: 'INFO' },
      { label: 'Gross WPM', value: `${grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM ((Words - Penalty) ÷ Time)', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
      { label: 'Accuracy', value: `${accuracy}%`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
