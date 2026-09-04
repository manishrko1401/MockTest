/**
 * Bombay High Court Clerk Typing (400 Words) — same scoring as bombay-hc-clerk,
 * kept separate so the 400-word variant can diverge if the rules do.
 */
import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { evaluate as bombayEvaluate, config as bombayConfig } from './bombay-hc-clerk';

export const config: CategoryConfig = {
  ...bombayConfig,
  key: 'bombay-hc-clerk-400',
  slug: 'bombay-high-court-clerk-typing-400-words',
  name: 'Bombay High Court Clerk Typing 400 Words',
};

export function evaluate(input: EngineInput): EngineResult {
  return { ...bombayEvaluate(input), key: config.key, name: config.name, config };
}

const engine: TypingEngine = { config, evaluate };
export default engine;
