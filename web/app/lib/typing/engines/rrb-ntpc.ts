/**
 * RRB NTPC Computer-Based Typing Skill Test
 * --------------------------------------------------------------------------
 * 10 minutes · English 30 WPM · Hindi 25 WPM.
 * Repetition Allowed. Evaluated matching TypingMitra:
 *
 *   Words Typed        = Keystrokes / 5
 *   Total Errors       = Full Errors + Half Errors / 2
 *   Ignorable Errors   = 5% × Words Typed
 *   Penalty            = (Total Errors − Ignorable Errors) × 10
 *   Error Percentage   = (Total Errors / Words Typed) × 100
 *   Net WPM            = ((Keystrokes / 5 − Penalty) / Time(min)
 *   Accuracy           = (Net WPM / Gross WPM) × 100
 *   Qualification      = Net WPM ≥ 30 (En) / 25 (Hi)
 *
 * Note: Unreached passage text is not counted as omission (prefix-based comparison).
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'rrb-ntpc',
  slug: 'rrb-ntpc-typing',
  name: 'RRB NTPC TYPING',
  durationMinutes: 10,
  qualifyingSpeed: { en: 30, hi: 25 },
  backspaceAllowed: true,
  retypeAllowed: true,
  language: 'both',
  notes: '5% permissible margin; every excess mistake costs 10 words. Repetition allowed.',
};

const TOLERANCE = 0.05;
const PENALTY_PER_MISTAKE = 10;

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  const words = core.wordsTyped;
  const totalMistakes = errors.totalErrors;
  const errorRelaxed = round2(TOLERANCE * words);
  const finalMistakes = round2(Math.max(0, totalMistakes - errorRelaxed));
  const penaltyWords = round2(finalMistakes * PENALTY_PER_MISTAKE);
  const netWords = round2(Math.max(0, words - penaltyWords));
  const netWpm = round2(netWords / core.timeMinutes);
  const errorPercentage = words > 0 ? round2((totalMistakes / words) * 100) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'RRB NTPC — 5% margin, excess × 10-word penalty',
    netWpm, netWords,
    errorPercentage,
    permissibleErrors: errorRelaxed, excessErrors: finalMistakes, penaltyWords,
    speedPassed, qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Keystrokes Typed', value: core.keystrokesTyped, status: 'INFO' },
      { label: 'Words Typed (KS ÷ 5)', value: words, status: 'INFO' },
      { label: 'Full Errors', value: errors.fullErrors, status: 'INFO' },
      { label: 'Half Errors', value: errors.halfErrors, status: 'INFO' },
      { label: 'Total Errors (Full + Half ÷ 2)', value: totalMistakes, status: 'INFO' },
      { label: 'Ignorable Errors (5% of words)', value: errorRelaxed, status: 'INFO' },
      { label: 'Penalty ((Errors − Ignorable) × 10)', value: penaltyWords, status: 'INFO' },
      { label: 'Error %', value: `${errorPercentage}%`, status: 'INFO' },
      { label: 'Gross WPM', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
