/**
 * Delhi Police AWO / TPO (Assistant Wireless Operator / Tele-Printer Operator)
 * --------------------------------------------------------------------------
 * 15 minutes · target 1,000 key depressions (~4,000 KDPH, ~13–15 net WPM).
 * Qualifying only. Needs ≥ 1,000 key depressions AND ≥ 85% accuracy.
 * Sources: Delhi Police AWO/TPO notification; typingmitra.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize } from '../core';

export const config: CategoryConfig = {
  key: 'delhi-police-awo-tpo',
  slug: 'delhi-police-awo-tpo-typing',
  name: 'Delhi Police AWO TPO Typing',
  durationMinutes: 15,
  qualifyingSpeed: { en: 15, hi: 15 },
  kdphTarget: { en: 4000, hi: 4000 },
  backspaceAllowed: true,
  language: 'both',
  notes: '1,000 key depressions in 15 min + minimum 85% accuracy.',
};

const TARGET_KEYSTROKES = 1000;
const MIN_ACCURACY = 85;

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { countUnreachedAsOmission: true });
  const { core, errors } = a;

  const ksPassed = core.keystrokesTyped >= TARGET_KEYSTROKES;
  const accPassed = core.accuracy >= MIN_ACCURACY;
  const qualified = ksPassed && accPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'Delhi Police AWO/TPO — 1,000 key depressions + 85% accuracy',
    netWpm: core.netWpm,
    speedPassed: ksPassed, errorPassed: accPassed, qualified,
    reason: qualified
      ? `Qualified: ${core.keystrokesTyped} key depressions ≥ ${TARGET_KEYSTROKES} and Accuracy ${core.accuracy}% ≥ ${MIN_ACCURACY}%`
      : !ksPassed
        ? `Not Qualified: ${core.keystrokesTyped} key depressions < ${TARGET_KEYSTROKES}`
        : `Not Qualified: Accuracy ${core.accuracy}% < ${MIN_ACCURACY}%`,
    criteria: [
      { label: 'Key Depressions', value: core.keystrokesTyped, status: ksPassed ? 'PASS' : 'FAIL' },
      { label: 'Target (15 min)', value: `${TARGET_KEYSTROKES} (4,000 KDPH)`, status: 'INFO' },
      { label: 'Gross WPM', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Total Errors', value: errors.totalErrors, status: 'INFO' },
      { label: 'Accuracy', value: `${core.accuracy}%`, status: accPassed ? 'PASS' : 'FAIL' },
      { label: 'Minimum Accuracy', value: `${MIN_ACCURACY}%`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
