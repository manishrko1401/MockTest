/**
 * SSC CGL Previous Year Typing — identical scoring to SSC CGL DEST.
 * Kept as its own file so it can diverge later if needed.
 */
import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { evaluate as cglEvaluate, config as cglConfig } from './ssc-cgl';

export const config: CategoryConfig = {
  ...cglConfig,
  key: 'ssc-cgl-previous',
  slug: 'ssc-cgl-previous-year-typing',
  name: 'SSC CGL Previous Year Typing',
};

export function evaluate(input: EngineInput): EngineResult {
  return { ...cglEvaluate(input), key: config.key, name: config.name, config };
}

const engine: TypingEngine = { config, evaluate };
export default engine;
