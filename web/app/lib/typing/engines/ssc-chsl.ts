/**
 * SSC CHSL Typing Test
 * --------------------------------------------------------------------------
 * 10 minutes · English 35 WPM (10,500 KDPH) · Hindi 30 WPM (9,000 KDPH).
 * Qualifying only (no marks). Must clear BOTH:
 *   - Net Speed  ≥ 35 (En) / 30 (Hi) WPM
 *   - Error %    ≤ 7% (UR/EWS) · ≤ 10% (OBC/SC/ST/PwBD)
 *
 * Net Speed = (Words Typed − Total Errors) / Time(min)      [Words = KS / 5]
 * Error %   = Total Errors / (Passage Keystrokes / 5) × 100
 * Accuracy  = Net WPM / Gross WPM × 100
 * Total Errors = Full × 1 + Half × 0.5
 *
 * Every un-typed passage word counts (omission = full, stray "."/"," = half),
 * matching the real exam and TypingMitra.
 * Sources: SSC CHSL Tier-II notification; typingmitra.in/blog; sscadda.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize } from '../core';

export const config: CategoryConfig = {
  key: 'ssc-chsl',
  slug: 'ssc-chsl-typing',
  name: 'SSC CHSL TYPING',
  durationMinutes: 10,
  qualifyingSpeed: { en: 35, hi: 30 },
  kdphTarget: { en: 10500, hi: 9000 },
  maxErrorPercent: { ur: 7, obc: 10, scst: 10 },
  backspaceAllowed: true,
  language: 'both',
  notes: '35 WPM English / 30 WPM Hindi in 10 min. Error ≤7% UR, ≤10% reserved.',
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
  const qualified = speedPassed && errorPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'SSC CHSL — Net Speed + Error %',
    netWpm, netWords,
    speedPassed, errorPassed, qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} and Error ${core.errorPercentage}% ≤ ${maxError}%`
      : `Not Qualified: ${!speedPassed ? `Net ${netWpm} WPM < ${qualifyingSpeed}` : `Error ${core.errorPercentage}% > ${maxError}%`}`,
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
