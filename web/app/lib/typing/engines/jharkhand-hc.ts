/**
 * Jharkhand High Court Typing
 * Net-speed qualifying test. English 30 WPM / Hindi 25 WPM in 10 minutes.
 * Net speed evaluation.
 *
 * Edit this file to change ONLY this exam. Shared math lives in ../core.ts;
 * the default net-speed rule lives in ./_standard.ts.
 */
import type { CategoryConfig } from '../types';
import { makeStandardEngine } from './_standard';

export const config: CategoryConfig = {
  key: 'jharkhand-hc',
  slug: 'jharkhand-high-court-typing',
  name: 'Jharkhand High Court Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 30, hi: 25 },
  backspaceAllowed: true,
  language: 'both',
  notes: 'Net speed evaluation.',
};

const engine = makeStandardEngine(config);
export const evaluate = engine.evaluate;
export default engine;
