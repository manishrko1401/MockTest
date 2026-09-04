/**
 * Chandigarh Administration — Clerk / Steno-Typist (English) Typing
 * --------------------------------------------------------------------------
 * 10 minutes · English 35 WPM. Qualifying in nature.
 * Distinctive rule: ALL errors count as FULL errors — there is no half-mistake
 * concept (spacing, capitalization, punctuation, transposition all = 1.0).
 *   Net WPM = (Words Typed − Total Errors) / min
 * Sources: Chandigarh Administration Clerk / Steno-Typist recruitment rules.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'chandigarh-admin-clerk',
  slug: 'chandigarh-administration-clerk-typing',
  name: 'Chandigarh Administration Clerk Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 35, hi: 30 },
  backspaceAllowed: true,
  language: 'en',
  notes: 'All errors counted as full errors (no half-mistake concept). 35 WPM.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { countUnreachedAsOmission: true, allErrorsFull: true });
  const { core, errors, qualifyingSpeed } = a;

  const totalErrors = errors.fullErrors; // half count is 0 under allErrorsFull
  const netWords = round2(Math.max(0, core.wordsTyped - totalErrors));
  const netWpm = round2(netWords / core.timeMinutes);

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'Chandigarh Admin Clerk — All errors counted as FULL errors (no half-mistakes)',
    netWpm, netWords,
    speedPassed, qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM (Passed qualifying speed)`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM (Required min speed: ${qualifyingSpeed} WPM)`,
    criteria: [
      { label: 'Words Typed (KS ÷ 5)', value: core.wordsTyped, status: 'INFO' },
      { label: 'Total Errors (All Full Mistakes)', value: totalErrors, status: 'INFO' },
      { label: 'Net Words (Words − Errors)', value: netWords, status: 'INFO' },
      { label: 'Net Speed', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Minimum Qualifying Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
      { label: 'Gross Speed', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Accuracy', value: `${core.accuracy}%`, status: 'INFO' },
      { label: 'Error %', value: `${core.errorPercentage}%`, status: 'INFO' },
      { label: 'Evaluation Scheme', value: 'Spacing, caps, punctuation & transposition count as Full Errors (1.0 each)', status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
