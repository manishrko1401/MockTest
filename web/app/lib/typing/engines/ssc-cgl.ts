/**
 * SSC CGL Typing Test
 * --------------------------------------------------------------------------
 * 15 minutes · ~2000 keystrokes.
 * Evaluated matching TypingMitra and SSC guidelines:
 *   - Net Speed = (Words Typed − Total Errors) / Time(min)   [Words = KS / 5]
 *   - Error %   = Min(100, (Total Errors / (Total Keystrokes in Passage / 5) × 100))
 *   - Accuracy  = (Net WPM / Gross WPM) × 100
 *   - Total Errors = Full Errors + (Half Errors / 2)
 *   - Qualification: Error % ≤ 7% (UR) or ≤ 10% (Others)
 *
 * Every un-typed passage word counts as omission (Full Error),
 * matching real SSC exam evaluation and TypingMitra.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize } from '../core';

export const config: CategoryConfig = {
  key: 'ssc-cgl',
  slug: 'ssc-cgl-typing',
  name: 'SSC CGL TYPING',
  durationMinutes: 15,
  qualifyingSpeed: { en: 35, hi: 30 },
  kdphTarget: { en: 10500, hi: 9000 },
  maxErrorPercent: { ur: 7, obc: 10, scst: 10 },
  backspaceAllowed: true,
  language: 'both',
  notes: '15 min. Error ≤7% UR, ≤10% reserved.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { countUnreachedAsOmission: true });
  const { core, errors, qualifyingSpeed } = a;

  const cat = (input.userCategoryChoice || 'UR').toUpperCase();
  const reserved = cat === 'OBC' || cat === 'SC' || cat === 'ST' || cat === 'PWBD' || cat === 'PWD';
  const maxError = reserved ? (config.maxErrorPercent!.obc ?? 10) : config.maxErrorPercent!.ur;

  const netWords = Math.max(0, core.wordsTyped - errors.totalErrors);
  const netWpm = core.netWpm; // (words − totalErrors) / min, already ≥ 0
  const speedPassed = netWpm >= qualifyingSpeed;
  const errorPassed = core.errorPercentage <= maxError;
  const qualified = errorPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'SSC CGL — Net Speed + Error %',
    netWpm, netWords,
    speedPassed, errorPassed, qualified,
    reason: qualified
      ? `Qualified: Error ${core.errorPercentage}% ≤ ${maxError}%`
      : `Not Qualified: Error ${core.errorPercentage}% > ${maxError}%`,
    criteria: [
      { label: 'Passage Keystrokes', value: core.passageKeystrokes, status: 'INFO' },
      { label: 'Words in Passage (KS ÷ 5)', value: core.wordsInPassage, status: 'INFO' },
      { label: 'Keystrokes Typed', value: core.keystrokesTyped, status: 'INFO' },
      { label: 'Words Typed (KS ÷ 5)', value: core.wordsTyped, status: 'INFO' },
      { label: 'Full Errors', value: errors.fullErrors, status: 'INFO' },
      { label: 'Half Errors', value: errors.halfErrors, status: 'INFO' },
      { label: 'Total Errors (Full + Half ÷ 2)', value: errors.totalErrors, status: 'INFO' },
      { label: 'Net Words (Words − Total Errors)', value: Math.round(netWords * 100) / 100, status: 'INFO' },
      { label: 'Gross WPM', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
      { label: 'Error %', value: `${core.errorPercentage}%`, status: errorPassed ? 'PASS' : 'FAIL' },
      { label: `Max Error (${reserved ? 'Reserved' : 'UR/EWS'})`, value: `${maxError}%`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
