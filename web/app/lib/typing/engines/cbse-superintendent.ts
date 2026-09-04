/**
 * CBSE Superintendent Typing
 * --------------------------------------------------------------------------
 * 10 minutes · English 35 WPM / Hindi 30 WPM.
 * 10,500 KDPH (English) / 9,000 KDPH (Hindi).
 * Backspace: ENABLED.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'cbse-superintendent',
  slug: 'cbse-superintendent-typing',
  name: 'CBSE Superintendent Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 35, hi: 30 },
  kdphTarget: { en: 10500, hi: 9000 },
  backspaceAllowed: true,
  retypeAllowed: false,
  language: 'both',
  notes: '10,500 / 9,000 KDPH. All errors count as full error.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  const totalErrors = errors.fullErrors + errors.halfErrors;
  const wordsTyped = core.wordsTyped;
  const netWords = round2(Math.max(0, wordsTyped - totalErrors));
  const netWpm = round2(netWords / core.timeMinutes);
  const errorPercentage = wordsTyped > 0 ? round2((totalErrors / wordsTyped) * 100) : 0;
  const accuracy = core.grossWpm > 0 ? round2((netWpm / core.grossWpm) * 100) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'CBSE Superintendent — All errors full, 1x error deduction',
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
      { label: 'Accuracy', value: `${accuracy}%`, status: 'INFO' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
      { label: 'KDPH', value: core.kdph, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
