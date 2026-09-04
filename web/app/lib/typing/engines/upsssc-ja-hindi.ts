/**
 * UPSSSC Junior Assistant Typing — Hindi section.
 * Same strict rule as the English section; Hindi target 25 WPM,
 * Mangal Inscript / Kruti Dev 010.
 */
import type { CategoryConfig, EngineInput, EngineResult, TypingEngine } from '../types';
import { evaluate as jaEvaluate, config as jaConfig } from './upsssc-ja';

export const config: CategoryConfig = {
  ...jaConfig,
  key: 'upsssc-ja-hindi',
  slug: 'upsssc-ja-hindi-typing',
  name: 'UPSSSC JA Hindi Typing',
  language: 'hi',
  notes: '5-min Hindi section. 25 WPM, accuracy ≥ 85%.',
};

export function evaluate(input: EngineInput): EngineResult {
  const r = jaEvaluate({ ...input, language: 'hi' });
  return { ...r, key: config.key, name: config.name, config };
}

const engine: TypingEngine = { config, evaluate };
export default engine;
