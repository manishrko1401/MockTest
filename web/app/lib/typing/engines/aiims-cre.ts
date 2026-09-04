/**
 * AIIMS CRE Typing (LDC / UDC / DEO) — CRE-5 stroke-penalty method
 * --------------------------------------------------------------------------
 * 15 minutes · English 35 WPM · Hindi 30 WPM (DEO: 8,000 KDPH).
 *
 *   Net Keystrokes = Total Keystrokes − (Full × 50 + Half × 25)
 *                  = Total Keystrokes − Total Errors × 50
 *   Gross WPM      = (Total Keystrokes / 5) / Time(min)
 *   Net WPM        = (Net Keystrokes / 5) / Time(min)
 *   Accuracy       = Net WPM / Gross WPM × 100
 *
 * Sources: AIIMS CRE notification; StenoGuru; TestMentor AIIMS rules.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'aiims-cre',
  slug: 'aiims-cre-ldc-udc-deo-typing',
  name: 'AIIMS CRE LDC UDC DEO Typing',
  durationMinutes: 15,
  qualifyingSpeed: { en: 35, hi: 30 },
  kdphTarget: { en: 10500, hi: 9000 },
  backspaceAllowed: true,
  language: 'both',
  notes: '15-min test. 50-keystroke penalty per full mistake, 25 per half mistake.',
};

const FULL_PENALTY_STROKES = 50;

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, {
    countUnreachedAsOmission: false,
    prefixMatchOnly: true,
  });
  const { core, errors, qualifyingSpeed } = a;

  const ks = core.keystrokesTyped;
  const penaltyStrokes = round2(errors.totalErrors * FULL_PENALTY_STROKES);
  const netStrokes = round2(Math.max(0, ks - penaltyStrokes));
  const grossWpm = round2((ks / 5) / core.timeMinutes);
  const netWpm = round2((netStrokes / 5) / core.timeMinutes);
  const accuracy = grossWpm > 0 ? round2(Math.max(0, Math.min(100, (netWpm / grossWpm) * 100))) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  const typedWordCount = errors.typedWordCount || Math.round(ks / 5);
  const errorPercentage = typedWordCount > 0 ? round2((errors.totalErrors / typedWordCount) * 100) : 0;

  return finalize({
    config, input, analysis: a,
    badge: 'AIIMS CRE-5 — 50 / 25 keystroke penalty',
    netWpm, accuracy,
    penaltyStrokes, netStrokes,
    aiimsGrossWpm: grossWpm, aiimsNetWpm: netWpm,
    speedPassed, qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Total Keystrokes', value: ks, status: 'INFO' },
      { label: 'Backspace Pressed', value: input.backspaceCount ?? 0, status: 'INFO' },
      { label: 'Total Words Typed', value: round2(ks / 5), status: 'INFO' },
      { label: 'Full Errors', value: errors.fullErrors, status: 'INFO' },
      { label: 'Half Errors', value: errors.halfErrors, status: 'INFO' },
      { label: 'Total Errors (Full + Half ÷ 2)', value: errors.totalErrors, status: 'INFO' },
      { label: 'Penalty (Errors × 50)', value: penaltyStrokes, status: 'INFO' },
      { label: 'Error Percentage', value: `${errorPercentage}%`, status: 'INFO' },
      { label: 'Net Keystrokes', value: netStrokes, status: 'INFO' },
      { label: 'Gross WPM (KS ÷ 5 ÷ min)', value: `${grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM (Net KS ÷ 5 ÷ min)', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Accuracy', value: `${accuracy}%`, status: 'INFO' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
