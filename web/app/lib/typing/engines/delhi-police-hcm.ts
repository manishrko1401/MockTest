/**
 * Delhi Police Head Constable (Ministerial) Typing — max 25 marks (merit)
 * --------------------------------------------------------------------------
 * 10 minutes · min 30 WPM English / 25 WPM Hindi · passage 400 words / 2000
 * strokes (En) or 350 words / 1750 strokes (Hi).
 *
 * Every deviation (wrong letter, skipped word, extra space …) deducts a FULL
 * 1 WPM — there is NO half-mistake concession here.
 *   Actual Speed = Gross WPM − Mistake Count
 *   Marks        = speed band (see table). 0 marks below the minimum speed.
 * Sources: SSC Delhi Police HCM notification; oliveboard; typingmitra.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'delhi-police-hcm',
  slug: 'delhi-police-hcm-typing',
  name: 'Delhi Police HCM Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 30, hi: 25 },
  backspaceAllowed: true,
  language: 'both',
  notes: '−1 WPM per mistake (no half concession). Speed → marks (max 25), added to merit.',
};

const MAX_MARKS = 25;
// speed → marks bands (upper-bound inclusive)
const BANDS_EN: [number, number][] = [[30, 10], [35, 12], [40, 15], [45, 18], [50, 21], [Infinity, 25]];
const BANDS_HI: [number, number][] = [[25, 10], [30, 12], [35, 15], [40, 18], [45, 21], [Infinity, 25]];

export function evaluate(input: EngineInput): EngineResult {
  // every error is a full error here — no half concession
  const a = analyse(config, input, { countUnreachedAsOmission: true, allErrorsFull: true });
  const { core, errors, qualifyingSpeed } = a;

  const mistakeCount = errors.fullErrors; // allErrorsFull => everything is here
  const grossWpm = core.grossWpm;
  const actualSpeed = round2(Math.max(0, grossWpm - mistakeCount));

  const bands = a.language === 'hi' ? BANDS_HI : BANDS_EN;
  let marks = 0;
  if (actualSpeed >= qualifyingSpeed) {
    for (const [upto, mk] of bands) { if (actualSpeed <= upto) { marks = mk; break; } }
  }

  const speedPassed = actualSpeed >= qualifyingSpeed;
  const marksPassed = marks > 0;
  const qualified = speedPassed && marksPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'Delhi Police HCM — −1 WPM per mistake, speed → 25 marks',
    netWpm: actualSpeed,
    tentativeSpeed: grossWpm, actualSpeed,
    marks, maxMarks: MAX_MARKS, qualifyingMarks: 0,
    speedPassed, marksPassed, qualified,
    reason: qualified
      ? `Qualified: Actual ${actualSpeed} WPM ≥ ${qualifyingSpeed} — ${marks}/25 marks`
      : `Not Qualified: Actual ${actualSpeed} WPM < ${qualifyingSpeed} WPM (0 marks)`,
    criteria: [
      { label: 'Words Typed (KS ÷ 5)', value: core.wordsTyped, status: 'INFO' },
      { label: 'Gross WPM', value: `${grossWpm} WPM`, status: 'INFO' },
      { label: 'Mistakes (all count as full, −1 WPM each)', value: mistakeCount, status: 'INFO' },
      { label: 'Actual Speed (Gross − Mistakes)', value: `${actualSpeed} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Minimum Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
      { label: 'Marks (max 25, merit)', value: marks, status: marksPassed ? 'PASS' : 'FAIL' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
