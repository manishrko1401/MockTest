/**
 * Uttrakhand High Court Typing
 * --------------------------------------------------------------------------
 * 10 minutes · English 30 WPM / Hindi 25 WPM.
 * Backspace: ALLOWED.
 *
 * Matching High Court & TypingMitra standard rules:
 * - Full Errors (1.0): Omission, substitution, spelling mistakes, additions, incomplete words.
 * - Half Errors (0.5): Spacing, capitalization, punctuation, transposition.
 * - Total Errors: Full Errors + (Half Errors / 2).
 * - Prefix-only comparison: Unreached tail of passage is NOT counted as omission.
 * - Words Typed: Keystrokes Typed / 5.
 * - Gross Speed: (Keystrokes Typed / 5) / Time (min).
 * - Net Speed: max(0, ((Keystrokes / 5) - Total Errors) / Time (min)).
 * - Accuracy: (Net Speed / Gross Speed) × 100.
 * - Error Percentage: (Total Errors / Total Words Typed) × 100.
 * - Qualification: Net Speed ≥ 30 WPM (English) or ≥ 25 WPM (Hindi).
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'uttrakhand-hc',
  slug: 'uttrakhand-high-court-typing',
  name: 'Uttrakhand High Court Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 30, hi: 25 },
  backspaceAllowed: true,
  language: 'both',
  notes: '10 min test, 30 WPM (En) / 25 WPM (Hi). Net WPM qualifying evaluation.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  const totalMistakes = errors.totalErrors; // fullErrors + halfErrors * 0.5
  const wordsTyped = core.wordsTyped; // Keystrokes / 5
  const netWords = round2(Math.max(0, wordsTyped - totalMistakes));
  const netWpm = core.timeMinutes > 0 ? round2(netWords / core.timeMinutes) : 0;
  const grossWpm = core.timeMinutes > 0 ? round2(wordsTyped / core.timeMinutes) : 0;
  const accuracy = grossWpm > 0 ? Math.min(100, round2((netWpm / grossWpm) * 100)) : 0;
  const errorPercentage = wordsTyped > 0 ? Math.min(100, round2((totalMistakes / wordsTyped) * 100)) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config,
    input,
    analysis: a,
    badge: `Uttarakhand High Court — Net Speed evaluation (≥ ${qualifyingSpeed} WPM)`,
    netWpm,
    netWords,
    errorPercentage,
    speedPassed,
    qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Full Errors', value: errors.fullErrors, status: 'INFO' },
      { label: 'Half Errors', value: errors.halfErrors, status: 'INFO' },
      { label: 'Total Errors (Full + Half ÷ 2)', value: totalMistakes, status: 'INFO' },
      { label: 'Error %', value: `${errorPercentage}%`, status: 'INFO' },
      { label: 'Keystrokes Typed', value: core.keystrokesTyped, status: 'INFO' },
      { label: 'Backspace Pressed', value: input.backspaceCount || 0, status: 'INFO' },
      { label: 'Words Typed (KS ÷ 5)', value: wordsTyped, status: 'INFO' },
      { label: 'Gross WPM', value: `${grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Accuracy', value: `${accuracy}%`, status: 'INFO' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
      { label: 'Qualification', value: qualified ? 'Qualified' : 'Not Qualified', status: qualified ? 'PASS' : 'FAIL' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
