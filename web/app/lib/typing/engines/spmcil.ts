/**
 * SPMCIL (Security Printing & Minting Corporation of India) Typing
 * --------------------------------------------------------------------------
 * 10 minutes · Junior Office Assistant: net 40 WPM English / 30 WPM Hindi.
 * Permissible error allowance: 5% for UR, 7% for reserved categories.
 * Direct deduction formula (TypingMitra result25.php parity):
 *   - Total Words Typed = Keystrokes Typed / 5
 *   - Error Allowed = Words Typed * marginPct (5% UR / 7% Reserved)
 *   - Actual Error = max(0, Total Errors - Error Allowed)
 *   - Net Words = max(0, Words Typed - Actual Error)
 *   - Net Speed = Net Words / Time (min)
 *   - Accuracy = (Net Speed / Gross Speed) * 100
 * Sources: SPMCIL recruitment; typingmitra result25.php.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'spmcil',
  slug: 'spmcil-typing',
  name: 'SPMCIL Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 40, hi: 30 },
  backspaceAllowed: true,
  language: 'both',
  notes: 'Net 40 WPM English / 30 Hindi. Allowed 5% UR / 7% reserved, direct 1x actual error deduction.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { countUnreachedAsOmission: true });
  const { core, errors, qualifyingSpeed } = a;

  const cat = (input.userCategoryChoice || 'UR').toUpperCase();
  const marginPct = cat === 'UR' || cat === 'EWS' ? 0.05 : 0.07;

  // Direct deduction formula matching TypingMitra result25.php
  const permissible = round2(core.wordsTyped * marginPct);
  const actualError = round2(Math.max(0, errors.totalErrors - permissible));
  const netWords = round2(Math.max(0, core.wordsTyped - actualError));
  const netWpm = round2(netWords / core.timeMinutes);
  const accuracy = core.grossWpm > 0 ? round2(Math.min(100, (netWpm / core.grossWpm) * 100)) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config, input, analysis: a,
    badge: `SPMCIL — ${marginPct * 100}% Allowed (${cat}), Direct Error Deduction`,
    netWpm, netWords,
    accuracy,
    permissibleErrors: permissible,
    excessErrors: actualError,
    penaltyWords: actualError,
    speedPassed, qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM (${cat}: ${marginPct * 100}% Allowed)`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM (${cat}: ${marginPct * 100}% Allowed)`,
    criteria: [
      { label: 'Words Typed (KS ÷ 5)', value: core.wordsTyped, status: 'INFO' },
      { label: 'Full Errors', value: errors.fullErrors, status: 'INFO' },
      { label: 'Half Errors', value: errors.halfErrors, status: 'INFO' },
      { label: 'Total Errors (Full + Half/2)', value: errors.totalErrors, status: 'INFO' },
      { label: `Error Allowed (${marginPct * 100}% of Typed Words, ${cat})`, value: permissible, status: 'INFO' },
      { label: 'Actual Error (Total Errors − Error Allowed)', value: actualError, status: 'INFO' },
      { label: 'Net Speed', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Minimum Qualifying Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
      { label: 'Gross Speed', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Accuracy', value: `${accuracy}%`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
