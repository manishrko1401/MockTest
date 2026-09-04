/**
 * RSSB / RSMSSB LDC (Grade II / Junior Assistant) Typing
 * --------------------------------------------------------------------------
 * 10 minutes per language section · 25 marks each.
 *   English : 500-word passage · 0.05 marks per correct word  (max 25)
 *   Hindi   : 400-word passage · 0.0625 marks per correct word (max 25)
 *   Qualify : marks ≥ 9  (36%).
 *
 * Typing Mitra RSSB LDC rules:
 * - Words Typed: Actual space-separated words typed in text (words count).
 * - Errors: Additions, substitutions/spelling, repetitions, incomplete words count as full error.
 * - Half errors = 0.
 * - Omissions are NOT counted in Total Errors! (Shown as highlighted only).
 * - Total Errors = Full Errors + Half Errors (excluding omissions).
 * - Correct Words = max(0, Words Typed - Total Errors).
 * - Gross WPM = Words Typed / Time (min).
 * - Net WPM = (Words Typed - Total Errors) / Time (min).
 * - Accuracy = (Words Typed - Total Errors) / Words Typed × 100.
 * - Error % = (Total Errors / Words Typed) × 100.
 * - Marks = Correct Words × 0.05 (English) or 0.0625 (Hindi), Max 25.
 * - Passing Marks = 9.
 */

import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { analyse, finalize, round2, tokenizeWords } from '../core';

export const config: CategoryConfig = {
  key: 'rssb-ldc',
  slug: 'rssb-ldc-typing',
  name: 'RSSB LDC Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 28, hi: 25 },
  backspaceAllowed: true,
  retypeAllowed: false,
  language: 'both',
  notes: 'Marks per correct word: 0.05 English / 0.0625 Hindi. Min 9 / 25 to qualify.',
};

const MAX_MARKS = 25;
const MIN_MARKS = 9;

export function evaluate(input: EngineInput): EngineResult {
  const a = analyse(config, input, { prefixMatchOnly: true, countUnreachedAsOmission: false });
  const { core, errors, qualifyingSpeed } = a;

  // Words separated by space in typed text
  const typedTokens = tokenizeWords(input.typedText);
  const wordsTyped = typedTokens.length;

  // In Typing Mitra RSSB LDC, omissions are NOT counted in total errors
  // Full errors = additions + substitutions/spelling + repetitions + incomplete words
  const fullErrors = (errors.extraWords || 0) + (errors.substitutions || 0) + (errors.repetitions || 0) + (errors.incompleteWords || 0);
  const halfErrors = 0;
  const totalErrors = fullErrors + halfErrors;

  const correctWords = Math.max(0, wordsTyped - totalErrors);
  const perWord = a.language === 'hi' ? 0.0625 : 0.05;
  const marks = round2(Math.min(MAX_MARKS, correctWords * perWord));

  const timeMin = Math.max(0.001, core.timeMinutes);
  const grossWpm = round2(wordsTyped / timeMin);
  const netWords = Math.max(0, wordsTyped - totalErrors);
  const netWpm = round2(netWords / timeMin);
  const accuracy = wordsTyped > 0 ? round2((netWords / wordsTyped) * 100) : 0;
  const errorPercentage = wordsTyped > 0 ? round2((totalErrors / wordsTyped) * 100) : 0;

  const marksPassed = marks >= MIN_MARKS;
  const qualified = marksPassed;

  const res = finalize({
    config, input, analysis: a,
    badge: 'RSSB LDC — marks per correct word',
    netWpm, netWords,
    accuracy,
    errorPercentage,
    marks, maxMarks: MAX_MARKS, qualifyingMarks: MIN_MARKS,
    marksPassed, qualified,
    speedPassed: netWpm >= qualifyingSpeed,
    reason: qualified
      ? `Qualified: ${marks}/25 marks ≥ ${MIN_MARKS} (36%)`
      : `Not Qualified: ${marks}/25 marks < ${MIN_MARKS}`,
    criteria: [
      { label: 'Words Typed', value: wordsTyped, status: 'INFO' },
      { label: 'Correct Words', value: correctWords, status: 'INFO' },
      { label: 'Full Errors (Omissions excluded)', value: totalErrors, status: 'INFO' },
      { label: 'Marks per Correct Word', value: perWord, status: 'INFO' },
      { label: 'Marks', value: `${marks} / ${MAX_MARKS}`, status: marksPassed ? 'PASS' : 'FAIL' },
      { label: 'Minimum Marks', value: `${MIN_MARKS} / ${MAX_MARKS} (36%)`, status: 'INFO' },
      { label: 'Gross WPM', value: `${grossWpm} WPM`, status: 'INFO' },
      { label: 'Net WPM', value: `${netWpm} WPM`, status: 'INFO' },
    ],
  });
  res.grossWpm = grossWpm;
  res.totalErrors = totalErrors;
  res.fullErrors = fullErrors;
  res.halfErrors = halfErrors;
  return res;
}

const engine: TypingEngine = { config, evaluate };
export default engine;

