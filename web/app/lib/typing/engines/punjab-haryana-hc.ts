/**
 * Punjab & Haryana High Court Typing
 * --------------------------------------------------------------------------
 * 10 minutes · English 30 WPM / Hindi 25 WPM.
 * Strictly qualifying in nature (SSSC software standard).
 *
 * Scoring Rules (TypingMitra result21.php):
 *   - All errors count as Full Errors (Half Errors = 0).
 *   - Words Typed = Keystrokes / 5
 *   - Gross WPM   = Words Typed / Time (min)
 *   - Net WPM     = max(0, (Words Typed − Total Errors) / Time (min))
 *   - Accuracy    = (Net WPM / Gross WPM) * 100
 *   - Error %     = (Total Errors / Words Typed) * 100
 *   - Qualify     = Net WPM ≥ 30 WPM (English) or ≥ 25 WPM (Hindi)
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'punjab-haryana-hc',
  slug: 'punjab-haryana-high-court-typing',
  name: 'Punjab Haryana High Court Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 30, hi: 25 },
  backspaceAllowed: true,
  language: 'both',
  notes: 'SSSC software, 10 min. 30 WPM En / 25 WPM Hi. All mistakes full.',
};

export function evaluate(input: EngineInput): EngineResult {
  // All mistakes (spacing, caps, punctuation, spelling, omissions) count as 1.0 Full Mistake
  const a = analyse(config, input, { countUnreachedAsOmission: true, allErrorsFull: true });
  const { core, errors, qualifyingSpeed } = a;

  const totalErrors = errors.fullErrors;
  const netWords = round2(Math.max(0, core.wordsTyped - totalErrors));
  const netWpm = round2(netWords / core.timeMinutes);

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config, input, analysis: a,
    badge: `Punjab & Haryana HC — ${qualifyingSpeed} WPM Standard (All Errors Full)`,
    netWpm, netWords,
    speedPassed, qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM (Passed official qualifying standard)`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM (Required min speed: ${qualifyingSpeed} WPM)`,
    criteria: [
      { label: 'Words Typed (KS ÷ 5)', value: core.wordsTyped, status: 'INFO' },
      { label: 'Total Errors (All Full)', value: totalErrors, status: 'INFO' },
      { label: 'Net Speed', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Minimum Qualifying Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
      { label: 'Gross Speed', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Accuracy', value: `${core.accuracy}%`, status: 'INFO' },
      { label: 'Error %', value: `${core.errorPercentage}%`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
