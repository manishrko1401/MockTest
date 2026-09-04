/**
 * Rajasthan RVUNL Junior Assistant Typing
 * Net-speed qualifying test. English 20 WPM / Hindi 20 WPM in 10 minutes.
 * Devanagari + English, 20 WPM.
 *
 * Edit this file to change ONLY this exam. Shared math lives in ../core.ts;
 * the default net-speed rule lives in ./_standard.ts.
 */
import type { CategoryConfig } from '../types';
import { makeStandardEngine } from './_standard';

export const config: CategoryConfig = {
  key: 'rajasthan-rvunl',
  slug: 'rajasthan-rvunl-junior-assistant-typing',
  name: 'Rajasthan RVUNL Junior Assistant Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 20, hi: 20 },
  backspaceAllowed: true,
  language: 'both',
  notes: 'Devanagari + English, 20 WPM.',
};

const engine = makeStandardEngine(config);
export const evaluate = engine.evaluate;
export default engine;
