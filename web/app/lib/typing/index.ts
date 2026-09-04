/**
 * Public entry point for the per-category typing engines.
 *
 *   import { evaluateTypingTest } from '@/app/lib/typing';
 *   const result = evaluateTypingTest(test, { passageText, typedText, timeSeconds, ... });
 *
 * `test` can be a slug string, an engine key, or any object with
 * categoryId / slug / title / name — detection is fuzzy (see registry.ts).
 */

export * from './types';
export {
  analyse,
  classifyErrors,
  computeMetrics,
  finalize,
  govHalfStepRound,
  permissiblePenalty,
  round2,
  collapseWhitespace,
  tokenizeWords,
} from './core';
export { ENGINES, detectEngine, engineForSlug } from './registry';

import type { EngineInput, EngineResult, TypingEngine } from './types';
import { detectEngine } from './registry';

export function resolveEngine(
  source?: Parameters<typeof detectEngine>[0]
): TypingEngine {
  return detectEngine(source);
}

export function evaluateTypingTest(
  source: Parameters<typeof detectEngine>[0],
  input: EngineInput
): EngineResult {
  return detectEngine(source).evaluate(input);
}
