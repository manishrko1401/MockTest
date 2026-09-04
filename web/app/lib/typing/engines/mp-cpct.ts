/**
 * MP CPCT (Computer Proficiency & Certification Test) — Typing section
 * --------------------------------------------------------------------------
 * 15 minutes each for English and Hindi.
 * Backspace: ENABLED.
 * Retype: Single Pass (Disabled).
 *
 * Matching TypingMitra MP CPCT rules:
 * - All errors (additions, omissions, spelling/substitutions, capitalization, spacing, punctuation)
 *   are counted as 1 full error each.
 * - Prefix-only comparison (unreached tail of passage is not counted as omission).
 * - Penalty: 1 word deducted per error: Net Words = max(0, Words Typed - Total Errors).
 * - Words Typed: Total Keystrokes / 5
 * - Error Percentage: (Total Errors / Total Words Typed) × 100
 * - Gross WPM: (Keystrokes Typed / 5) / Time (min)
 * - Net WPM: max(0, ((Keystrokes Typed / 5) - Total Errors) / Time (min))
 * - Accuracy: (Net WPM / Gross WPM) × 100
 * - Qualifying Speed: Net WPM ≥ 30 WPM (English) or ≥ 20 WPM (Hindi).
 *
 * Scaled Score Slabs:
 * English:
 *   < 30 NWPM: 0% (Failed)
 *   30 - 40 NWPM: 50%
 *   41 - 50 NWPM: 60%
 *   51 - 60 NWPM: 70%
 *   61 - 70 NWPM: 80%
 *   71 - 80 NWPM: 90%
 *   > 80 NWPM: 100%
 * Hindi:
 *   < 20 NWPM: 0% (Failed)
 *   20 - 25 NWPM: 50%
 *   26 - 30 NWPM: 60%
 *   31 - 35 NWPM: 70%
 *   36 - 40 NWPM: 80%
 *   41 - 50 NWPM: 90%
 *   > 50 NWPM: 100%
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'mp-cpct',
  slug: 'mp-cpct-typing',
  name: 'MP CPCT Typing',
  durationMinutes: 15,
  qualifyingSpeed: { en: 30, hi: 20 },
  backspaceAllowed: true,
  retypeAllowed: false,
  language: 'both',
  notes: '30 NWPM English / 20 NWPM Hindi = 50% scaled score (pass). All errors count as full error (1 error).',
};

const BANDS_EN: [number, number][] = [[30, 50], [41, 60], [51, 70], [61, 80], [71, 90], [81, 100]];
const BANDS_HI: [number, number][] = [[20, 50], [26, 60], [31, 70], [36, 80], [41, 90], [51, 100]];

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  // In TypingMitra MP CPCT, all errors count as 1 full error, 1-word deduction
  const totalErrors = errors.fullErrors + errors.halfErrors;
  const wordsTyped = core.wordsTyped;
  const netWords = round2(Math.max(0, wordsTyped - totalErrors));
  const nwpm = core.timeMinutes > 0 ? round2(netWords / core.timeMinutes) : 0;
  const errorPercentage = wordsTyped > 0 ? round2((totalErrors / wordsTyped) * 100) : 0;

  const bands = a.language === 'hi' ? BANDS_HI : BANDS_EN;
  let scaled = 0;
  for (const [thr, sc] of bands) if (nwpm >= thr) scaled = sc;

  const speedPassed = nwpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config,
    input,
    analysis: a,
    badge: 'MP CPCT — All errors full, 1-word deduction per error',
    netWpm: nwpm,
    netWords,
    errorPercentage,
    scaledScorePercent: scaled,
    speedPassed,
    qualified,
    reason: qualified
      ? `Qualified: ${nwpm} NWPM ≥ ${qualifyingSpeed} NWPM (${scaled}% scaled score)`
      : `Not Qualified: ${nwpm} NWPM < ${qualifyingSpeed} NWPM`,
    criteria: [
      { label: 'Keystrokes Typed', value: core.keystrokesTyped, status: 'INFO' },
      { label: 'Words Typed (KS ÷ 5)', value: wordsTyped, status: 'INFO' },
      { label: 'Full Errors', value: totalErrors, status: 'INFO' },
      { label: 'Total Errors (All count as 1)', value: totalErrors, status: 'INFO' },
      { label: 'Error %', value: `${errorPercentage}%`, status: 'INFO' },
      { label: 'Gross WPM', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM', value: `${nwpm} NWPM`, status: qualified ? 'PASS' : 'FAIL' },
      { label: 'Scaled Score', value: `${scaled}%`, status: qualified ? 'PASS' : 'FAIL' },
      { label: 'Minimum Qualifying Speed', value: `${qualifyingSpeed} NWPM (50%)`, status: 'INFO' },
      { label: 'Qualification', value: qualified ? 'Qualified' : 'Not Qualified', status: qualified ? 'PASS' : 'FAIL' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;

