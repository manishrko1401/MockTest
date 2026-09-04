/**
 * SSB HCM Typing
 * Net-speed qualifying test. English 35 WPM / Hindi 30 WPM in 10 minutes.
 * Master text ~1,750 KS English / ~1,500 Hindi.
 *
 * Edit this file to change ONLY this exam. Shared math lives in ../core.ts;
 * the default net-speed rule lives in ./_standard.ts.
 */
import type { CategoryConfig } from '../types';
import { makeStandardEngine } from './_standard';

export const config: CategoryConfig = {
  key: 'ssb-hcm',
  slug: 'ssb-hcm-typing',
  name: 'SSB HCM Typing',
  durationMinutes: 10,
  qualifyingSpeed: { en: 35, hi: 30 },
  kdphTarget: { en: 10500, hi: 9000 },
  backspaceAllowed: true,
  language: 'both',
  notes: 'Master text ~1,750 KS English / ~1,500 Hindi.',
};

const engine = makeStandardEngine(config);
export const evaluate = engine.evaluate;
export default engine;
