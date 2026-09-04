/**
 * Standard net-speed engine factory.
 *
 * Used by the exams that simply qualify on Net Speed (Gross Words − Total Errors
 * per minute) against a fixed WPM: DSSSB JSA, KVS, EMRS, NVS, CSIR, CBSE, DDA,
 * CCRAS, Uttarakhand HC, Jharkhand HC, Punjab & Haryana HC, RVUNL, SSB HCM, etc.
 *
 * A category that later needs its own twist should stop calling this factory and
 * inline the logic in its own file — that is the whole point of one file per exam.
 *
 *   Words Typed  = Keystrokes / 5
 *   Gross WPM    = Words Typed / min
 *   Total Errors = Full × 1 + Half × 0.5
 *   Net WPM      = max(0, (Words Typed − Total Errors) / min)
 *   Error %      = Total Errors / (Passage KS / 5) × 100
 *   Accuracy     = Net WPM / Gross WPM × 100
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2, type ClassifyOptions } from '../core';

export function makeStandardEngine(
  config: CategoryConfig,
  opts: { badge?: string; classify?: ClassifyOptions } = {}
): TypingEngine {
  function evaluate(input: EngineInput): EngineResult {
    const a = analyse(config, input, { countUnreachedAsOmission: true, ...opts.classify });
    const { core, errors, qualifyingSpeed } = a;

    const netWords = round2(Math.max(0, core.wordsTyped - errors.totalErrors));
    const netWpm = core.netWpm;
    const speedPassed = netWpm >= qualifyingSpeed;
    const errorLimit = config.maxErrorPercent?.ur;
    const errorPassed = errorLimit == null || core.errorPercentage <= errorLimit;
    const qualified = speedPassed && errorPassed;

    return finalize({
      config, input, analysis: a,
      badge: opts.badge ?? `${config.name} — Net Speed evaluation`,
      netWpm, netWords, speedPassed, errorPassed, qualified,
      reason: qualified
        ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
        : !speedPassed
          ? `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`
          : `Not Qualified: Error ${core.errorPercentage}% > ${errorLimit}%`,
      criteria: [
        { label: 'Keystrokes Typed', value: core.keystrokesTyped, status: 'INFO' },
        { label: 'Words Typed (KS ÷ 5)', value: core.wordsTyped, status: 'INFO' },
        { label: 'Gross WPM', value: `${core.grossWpm} WPM`, status: 'INFO' },
        { label: 'Full Errors', value: errors.fullErrors, status: 'INFO' },
        { label: 'Half Errors', value: errors.halfErrors, status: 'INFO' },
        { label: 'Total Errors (Full + Half ÷ 2)', value: errors.totalErrors, status: 'INFO' },
        { label: 'Net Words', value: netWords, status: 'INFO' },
        { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
        { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
        { label: 'Error %', value: `${core.errorPercentage}%`, status: 'INFO' },
        { label: 'Accuracy', value: `${a.core.accuracy}%`, status: 'INFO' },
        ...(config.kdphTarget
          ? [{ label: 'KDPH', value: core.kdph, status: 'INFO' as const }]
          : []),
      ],
    });
  }
  return { config, evaluate };
}
