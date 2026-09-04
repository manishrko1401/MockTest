/**
 * CSIR EXAM New Rules (FORMULA)
 * --------------------------------------------------------------------------
 * 10 minutes · English 35 WPM / Hindi 30 WPM.
 * 5% Ignorable Errors on Total Words in Passage (Passage Keystrokes / 5).
 * Total Errors = Full Errors + (Half Errors / 2).
 * Actual Errors = max(0, Total Errors - Ignorable Errors).
 * Net WPM = Gross WPM - Actual Errors.
 * Sources: CSIR JSA typing test guidelines; typingmitra.
 */
import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize } from '../core';

export const config: CategoryConfig = {
  key: 'csir-formula',
  slug: 'csir-exam-new-rules(formula)',
  name: 'CSIR EXAM New Rules (FORMULA)',
  durationMinutes: 10,
  qualifyingSpeed: { en: 35, hi: 30 },
  kdphTarget: { en: 10500, hi: 9000 },
  backspaceAllowed: true,
  language: 'both',
  notes: '5% passage words tolerance; Net WPM = Gross WPM - Actual Errors.',
};

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { countUnreachedAsOmission: true });
  const { core, errors, qualifyingSpeed } = a;

  const passageKeystrokes = (input.passageText || '').replace(/\s+/g, ' ').trim().length;
  const totalWordsInPassage = Math.max(1, Math.round((passageKeystrokes / 5) * 10) / 10);

  const totalErrors = Math.round((errors.fullErrors + (errors.halfErrors / 2)) * 100) / 100;
  const ignorableErrors = Math.round(0.05 * totalWordsInPassage * 100) / 100;
  const actualErrors = Math.max(0, Math.round((totalErrors - ignorableErrors) * 100) / 100);
  const errorPercentage = Math.round((totalErrors / totalWordsInPassage) * 10000) / 100;

  const grossWpm = core.grossWpm;
  const netWpm = Math.max(0, Math.round((grossWpm - actualErrors) * 100) / 100);
  const accuracy = grossWpm > 0 ? Math.min(100, Math.max(0, Math.round((netWpm / grossWpm) * 10000) / 100)) : 0;

  const speedPassed = netWpm >= qualifyingSpeed;
  const qualified = speedPassed;

  return finalize({
    config,
    input,
    analysis: a,
    badge: 'CSIR New Rules (Formula) — 5% passage tolerance, Net WPM = Gross − Actual Errors',
    netWpm,
    accuracy,
    errorPercentage,
    permissibleErrors: ignorableErrors,
    excessErrors: actualErrors,
    speedPassed,
    qualified,
    reason: qualified
      ? `Qualified: Net ${netWpm} WPM ≥ ${qualifyingSpeed} WPM`
      : `Not Qualified: Net ${netWpm} WPM < ${qualifyingSpeed} WPM`,
    criteria: [
      { label: 'Words in Passage', value: totalWordsInPassage, status: 'INFO' },
      { label: 'Words Typed (KS ÷ 5)', value: core.wordsTyped, status: 'INFO' },
      { label: 'Full Errors', value: errors.fullErrors, status: 'INFO' },
      { label: 'Half Errors', value: errors.halfErrors, status: 'INFO' },
      { label: 'Total Errors', value: totalErrors, status: 'INFO' },
      { label: '5% Ignorable Errors', value: ignorableErrors, status: 'INFO' },
      { label: 'Actual Errors', value: actualErrors, status: 'INFO' },
      { label: 'Gross WPM', value: `${grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM (Gross − Actual Errors)', value: `${netWpm} WPM`, status: speedPassed ? 'PASS' : 'FAIL' },
      { label: 'Required Speed', value: `${qualifyingSpeed} WPM`, status: 'INFO' },
    ],
  });
}

const engine: TypingEngine = { config, evaluate };
export default engine;
