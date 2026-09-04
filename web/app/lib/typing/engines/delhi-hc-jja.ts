/**
 * Delhi High Court — Junior Judicial Assistant (JJA) Typing
 * --------------------------------------------------------------------------
 * 10 minutes · English 35 WPM · 5 keystrokes = 1 word.
 *
 * Matching TypingMitra DHC JJA (test7.php -> result17.php):
 * - All errors count as Full Errors (1 error each).
 * - Prefix-only comparison: Unreached tail of passage is NOT counted as omission.
 * - Words Typed = Keystrokes Typed / 5.
 * - Ignorable Errors = 3% of Total Words Typed (0.03 * Words Typed).
 *   Rounding:
 *     Decimals 0.01 to 0.49 round to 0.5
 *     Decimals 0.51 to 0.99 round to 1.0
 *     Decimal 0.50 stays 0.5
 * - Actual Error = Math.max(0, Total Errors - Rounded Ignorable Errors).
 * - Gross WPM = (Keystrokes Typed / 5) / Time (min).
 * - Net WPM = Math.max(0, ((Keystrokes Typed / 5) - Actual Error) / Time (min)).
 * - Accuracy = (Net WPM / Gross WPM) × 100.
 * - Error Percentage = (Total Errors / Total Words Typed) × 100.
 * - Qualification: Net WPM ≥ 35 (English) or ≥ 30 (Hindi).
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'delhi-hc-jja',
  slug: 'delhi-high-court-dhc-jja-typing',
  name: 'Delhi High Court (DHC) JJA Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 35, hi: 30 },
  maxErrorPercent: { ur: 3 },
  backspaceAllowed: true,
  language: 'en',
  notes: '10 min test, 35 WPM. 3% permissible errors (0.5-step rounding). All errors full.',
};

export function roundDhcPermissible(raw: number): number {
  const floor = Math.floor(raw);
  const frac = round2(raw - floor);
  if (frac <= 0.0001) return floor;
  if (frac <= 0.5001) return floor + 0.5;
  return floor + 1.0;
}

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  // In DHC JJA on TypingMitra, all errors are counted as full errors
  const totalErrors = errors.fullErrors + errors.halfErrors;
  const wordsTyped = core.wordsTyped; // Keystrokes / 5

  // 3% permissible mistakes
  const ignorableRaw = round2(0.03 * wordsTyped);
  const ignorableRounded = roundDhcPermissible(ignorableRaw);
  const actualError = round2(Math.max(0, totalErrors - ignorableRounded));

  const grossWpm = core.grossWpm;
  const netWords = round2(Math.max(0, wordsTyped - actualError));
  const netWpm = core.timeMinutes > 0 ? round2(netWords / core.timeMinutes) : 0;
  const accuracy = grossWpm > 0 ? Math.min(100, round2((netWpm / grossWpm) * 100)) : 0;
  const errorPercentage = wordsTyped > 0 ? round2((totalErrors / wordsTyped) * 100) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config,
    input,
    analysis: a,
    badge: `Delhi High Court JJA — 3% Permissible Errors (Net WPM ≥ ${qualifyingSpeed})`,
    netWpm,
    netWords,
    permissibleErrors: ignorableRounded,
    excessErrors: actualError,
    errorPercentage,
    speedPassed,
    qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Full Errors', value: totalErrors, status: 'INFO' },
      { label: 'Total Errors', value: totalErrors, status: 'INFO' },
      { label: 'Words Typed', value: wordsTyped, status: 'INFO' },
      { label: 'Ignorable Errors (3%)', value: `${ignorableRounded} (Raw: ${ignorableRaw})`, status: 'INFO' },
      { label: 'Actual Error', value: actualError, status: 'INFO' },
      { label: 'Error %', value: `${errorPercentage}%`, status: 'INFO' },
      { label: 'Keystrokes Typed', value: core.keystrokesTyped, status: 'INFO' },
      { label: 'Backspace Pressed', value: input.backspaceCount || 0, status: 'INFO' },
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
