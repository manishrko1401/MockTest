/**
 * Registry of all 39 category engines + slug / free-text detection.
 * Add or swap an engine here; edit an engine in ./engines/<key>.ts.
 */

import type { TypingEngine } from './types';

import sscChsl from './engines/ssc-chsl';
import sscCgl from './engines/ssc-cgl';
import sscCglPrev from './engines/ssc-cgl-previous';
import rrbNtpc from './engines/rrb-ntpc';
import aiimsCre from './engines/aiims-cre';
import delhiHcJja from './engines/delhi-hc-jja';
import allahabadHc from './engines/allahabad-hc';
import rssbLdc from './engines/rssb-ldc';
import mpCpct from './engines/mp-cpct';
import delhiPoliceHcm from './engines/delhi-police-hcm';
import delhiPoliceAwoTpo from './engines/delhi-police-awo-tpo';
import supremeCourtJca from './engines/supreme-court-jca';
import upPoliceCo from './engines/up-police-co';
import upssscJa from './engines/upsssc-ja';
import upssscJaHindi from './engines/upsssc-ja-hindi';
import spmcil from './engines/spmcil';
import bsfHcm from './engines/bsf-hcm';
import chandigarhAdminClerk from './engines/chandigarh-admin-clerk';
import bombayHcClerk from './engines/bombay-hc-clerk';
import bombayHcClerk400 from './engines/bombay-hc-clerk-400';

import dsssbJsa from './engines/dsssb-jsa';
import dsssbItAssistant from './engines/dsssb-it-assistant';
import dsssbSteno from './engines/dsssb-steno';
import kvsJsa from './engines/kvs-jsa';
import emrsJsa from './engines/emrs-jsa';
import nvsJsa from './engines/nvs-jsa';
import csirJsa from './engines/csir-jsa';
import csirFormula from './engines/csir-formula';
import cbseJsa from './engines/cbse-jsa';
import cbseSuperintendent from './engines/cbse-superintendent';
import ddaJsa from './engines/dda-jsa';
import ddaSteno from './engines/dda-steno';
import ccrasLdcUdc from './engines/ccras-ldc-udc';
import uttrakhandHc from './engines/uttrakhand-hc';
import jharkhandHc from './engines/jharkhand-hc';
import punjabHaryanaHc from './engines/punjab-haryana-hc';
import rajasthanRvunl from './engines/rajasthan-rvunl';
import ssbHcm from './engines/ssb-hcm';
import quickBrownFox from './engines/quick-brown-fox';

export const ENGINES: Record<string, TypingEngine> = {
  'ssc-chsl': sscChsl,
  'ssc-cgl': sscCgl,
  'ssc-cgl-previous': sscCglPrev,
  'rrb-ntpc': rrbNtpc,
  'aiims-cre': aiimsCre,
  'delhi-hc-jja': delhiHcJja,
  'allahabad-hc': allahabadHc,
  'rssb-ldc': rssbLdc,
  'mp-cpct': mpCpct,
  'delhi-police-hcm': delhiPoliceHcm,
  'delhi-police-awo-tpo': delhiPoliceAwoTpo,
  'supreme-court-jca': supremeCourtJca,
  'up-police-co': upPoliceCo,
  'upsssc-ja': upssscJa,
  'upsssc-ja-hindi': upssscJaHindi,
  'spmcil': spmcil,
  'bsf-hcm': bsfHcm,
  'chandigarh-admin-clerk': chandigarhAdminClerk,
  'bombay-hc-clerk': bombayHcClerk,
  'bombay-hc-clerk-400': bombayHcClerk400,
  'dsssb-jsa': dsssbJsa,
  'dsssb-it-assistant': dsssbItAssistant,
  'dsssb-steno': dsssbSteno,
  'kvs-jsa': kvsJsa,
  'emrs-jsa': emrsJsa,
  'nvs-jsa': nvsJsa,
  'csir-jsa': csirJsa,
  'csir-formula': csirFormula,
  'cbse-jsa': cbseJsa,
  'cbse-superintendent': cbseSuperintendent,
  'dda-jsa': ddaJsa,
  'dda-steno': ddaSteno,
  'ccras-ldc-udc': ccrasLdcUdc,
  'uttrakhand-hc': uttrakhandHc,
  'jharkhand-hc': jharkhandHc,
  'punjab-haryana-hc': punjabHaryanaHc,
  'rajasthan-rvunl': rajasthanRvunl,
  'ssb-hcm': ssbHcm,
  'quick-brown-fox': quickBrownFox,
};

export const DEFAULT_ENGINE_KEY = 'kvs-jsa';

/** Exact slug → key (built from each engine's config.slug). */
const SLUG_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(ENGINES).map(([key, e]) => [e.config.slug, key])
);

export function engineForSlug(slug?: string | null): TypingEngine | undefined {
  if (!slug) return undefined;
  const key = SLUG_TO_KEY[slug] || (ENGINES[slug] ? slug : undefined);
  return key ? ENGINES[key] : undefined;
}

/**
 * Fuzzy detection from any test / category identifier or title string.
 * Order matters — most specific first.
 */
export function detectEngine(
  source?:
    | string
    | { categoryId?: string; slug?: string; id?: string; title?: string; name?: string; categoryName?: string }
    | null
): TypingEngine {
  if (!source) return ENGINES[DEFAULT_ENGINE_KEY];

  const s =
    typeof source === 'string'
      ? source.toLowerCase()
      : `${source.categoryId || ''} ${source.slug || ''} ${source.id || ''} ${source.title || ''} ${source.name || ''} ${source.categoryName || ''}`.toLowerCase();

  // exact slug hit anywhere in the string
  for (const [slug, key] of Object.entries(SLUG_TO_KEY)) {
    if (s.includes(slug)) return ENGINES[key];
  }

  const has = (...w: string[]) => w.every((x) => s.includes(x));

  if (s.includes('aiims') || s.includes('cre-5')) return ENGINES['aiims-cre'];
  if (s.includes('ntpc') || s.includes('rrb')) return ENGINES['rrb-ntpc'];
  if (s.includes('chsl')) return ENGINES['ssc-chsl'];
  if (has('cgl', 'previous') || s.includes('previous year')) return ENGINES['ssc-cgl-previous'];
  if (s.includes('cgl') || s.includes('dest')) return ENGINES['ssc-cgl'];
  if (has('delhi', 'police', 'hcm') || has('delhi police', 'ministerial')) return ENGINES['delhi-police-hcm'];
  if (s.includes('awo') || s.includes('tpo')) return ENGINES['delhi-police-awo-tpo'];
  if (s.includes('allahabad')) return ENGINES['allahabad-hc'];
  if (s.includes('cpct')) return ENGINES['mp-cpct'];
  if (s.includes('rssb') || s.includes('rsmssb') || has('rajasthan', 'ldc')) return ENGINES['rssb-ldc'];
  if (has('delhi', 'high court') || s.includes('dhc') || s.includes('jja')) return ENGINES['delhi-hc-jja'];
  if (s.includes('supreme court') || s.includes('jca')) return ENGINES['supreme-court-jca'];
  if (s.includes('spmcil')) return ENGINES['spmcil'];
  if (s.includes('bsf')) return ENGINES['bsf-hcm'];
  if (has('up police') || s.includes('computer operator') || s.includes('uppco')) return ENGINES['up-police-co'];
  if (s.includes('upsssc') && s.includes('hindi')) return ENGINES['upsssc-ja-hindi'];
  if (s.includes('upsssc')) return ENGINES['upsssc-ja'];
  if (has('bombay', '400')) return ENGINES['bombay-hc-clerk-400'];
  if (s.includes('bombay')) return ENGINES['bombay-hc-clerk'];
  if (s.includes('chandigarh')) return ENGINES['chandigarh-admin-clerk'];
  if (s.includes('dsssb') && (s.includes('lab') || s.includes('it assistant'))) return ENGINES['dsssb-it-assistant'];
  if (s.includes('dsssb') && s.includes('steno')) return ENGINES['dsssb-steno'];
  if (s.includes('dsssb')) return ENGINES['dsssb-jsa'];
  if (s.includes('kvs')) return ENGINES['kvs-jsa'];
  if (s.includes('emrs')) return ENGINES['emrs-jsa'];
  if (s.includes('nvs')) return ENGINES['nvs-jsa'];
  if (s.includes('csir') && (s.includes('formula') || s.includes('new rules'))) return ENGINES['csir-formula'];
  if (s.includes('csir')) return ENGINES['csir-jsa'];
  if (has('cbse', 'superintendent')) return ENGINES['cbse-superintendent'];
  if (s.includes('cbse')) return ENGINES['cbse-jsa'];
  if (s.includes('dda') && s.includes('steno')) return ENGINES['dda-steno'];
  if (s.includes('dda')) return ENGINES['dda-jsa'];
  if (s.includes('ccras')) return ENGINES['ccras-ldc-udc'];
  if (s.includes('punjab') || s.includes('haryana')) return ENGINES['punjab-haryana-hc'];
  if (s.includes('rvunl') || s.includes('vidyut')) return ENGINES['rajasthan-rvunl'];
  if (s.includes('ssb')) return ENGINES['ssb-hcm'];
  if (s.includes('uttrakhand') || s.includes('uttarakhand')) return ENGINES['uttrakhand-hc'];
  if (s.includes('jharkhand')) return ENGINES['jharkhand-hc'];
  if (s.includes('fox') || s.includes('quick brown')) return ENGINES['quick-brown-fox'];

  return ENGINES[DEFAULT_ENGINE_KEY];
}
