/**
 * CCRAS LDC UDC TYPING (Central Council for Research in Ayurvedic Sciences)
 * --------------------------------------------------------------------------
 * 10 minutes · English 35 WPM / Hindi 30 WPM.
 * Backspace: ENABLED.
 * Retype: Single Pass (Disabled).
 *
 * Matching TypingMitra CCRAS LDC UDC rules:
 * - All errors (additions, omissions, spelling/substitutions, repetitions, incomplete words)
 *   are counted as 1 full error each.
 * - Prefix-only comparison (unreached tail of passage is not counted as omission).
 * - Ignorable Errors: 5% of Total Words Typed (Total Keystrokes / 5).
 * - Penalty: (Total Errors - Ignorable Errors) × 10 words.
 * - Total Words Typed: Total Keystrokes / 5
 * - Error Percentage: (Total Errors / Total Words Typed) × 100
 * - Gross WPM: (Keystrokes Typed / 5) / Time (min)
 * - Net WPM: max(0, (Keystrokes/5 - Penalty) / Time (min))
 * - Accuracy: (Net WPM / Gross WPM) × 100
 * - Qualification: Net WPM ≥ 35 (English) or ≥ 30 (Hindi).
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, permissiblePenalty, round2 } from '../core';

export const config: CategoryConfig = {
  key: 'ccras-ldc-udc',
  slug: 'ccras-ldc-udc-typing',
  name: 'CCRAS LDC UDC Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 35, hi: 30 },
  backspaceAllowed: true,
  retypeAllowed: false,
  language: 'both',
  notes: '5% ignorable errors, 10-word penalty per excess mistake. All errors count as full error.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  // In CCRAS all errors are counted as full error
  const totalErrors = errors.fullErrors + errors.halfErrors;
  const wordsTyped = core.wordsTyped;
  const { permissible, excess, penaltyWords, netWords, netWpm } =
    permissiblePenalty(wordsTyped, totalErrors, core.timeMinutes, 0.05, 10);

  const errorPercentage = wordsTyped > 0 ? round2((totalErrors / wordsTyped) * 100) : 0;
  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config, input, analysis: a,
    badge: 'CCRAS LDC UDC — 5% tolerance, excess × 10-word penalty',
    netWpm, netWords,
    errorPercentage,
    permissibleErrors: permissible,
    excessErrors: excess,
    penaltyWords,
    speedPassed, qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Keystrokes Typed', value: core.keystrokesTyped, status: 'INFO' },
      { label: 'Words Typed (KS ÷ 5)', value: wordsTyped, status: 'INFO' },
      { label: 'Full Errors', value: totalErrors, status: 'INFO' },
      { label: 'Total Errors (All count as 1)', value: totalErrors, status: 'INFO' },
      { label: 'Ignorable Errors (5%)', value: permissible, status: 'INFO' },
      { label: 'Penalty (Excess × 10)', value: penaltyWords, status: 'INFO' },
      { label: 'Error %', value: `${errorPercentage}%`, status: 'INFO' },
      { label: 'Gross WPM', value: `${core.grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;

