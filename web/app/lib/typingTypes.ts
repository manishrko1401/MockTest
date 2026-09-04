import { evaluateTypingTest } from './typing';
import type { AlignedWord as EngineAlignedWord, MistakeDetail as EngineMistake } from './typing';

export interface TypingCategory {
  id: string;
  name: string;
  nameHi?: string;
  description?: string;
  icon?: string;
  logoUrl?: string;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TypingPassage {
  id: string;
  title: string;
  titleHi?: string;
  text: string;
  categoryId?: string;
  language: 'en' | 'hi';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  wordCount: number;
  charCount: number;
  keystrokesCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TypingTest {
  id: string;
  title: string;
  titleHi?: string;
  categoryId: string;
  passageId?: string;
  passageText: string;
  demoPassageText?: string;
  demoDurationMinutes: number;
  breakDurationMinutes: number;
  mainDurationMinutes: number;
  qualifyingWpm: number;
  maxErrorPercentage: number;
  backspaceRule: 'ALLOWED' | 'RESTRICTED' | 'DISABLED';
  enableBackspace?: boolean;
  allowRetype?: boolean;
  highlightAllowed: boolean;
  language: 'en' | 'hi';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  instructions?: string;
  orderIndex: number;
  isActive: boolean;
  totalAttempts?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DetailedMistake {
  index: number;
  originalWord: string;
  typedWord: string;
  type: 'CORRECT' | 'FULL_MISTAKE' | 'HALF_MISTAKE' | 'OMISSION' | 'EXTRA';
  reason?: string;
}

export interface AlignedWord {
  word: string;
  status: 'CORRECT' | 'HALF_MISTAKE' | 'FULL_MISTAKE' | 'OMISSION' | 'EXTRA' | 'UNREACHED';
  expectedWord?: string;
  typedWord?: string;
  reason?: string;
  index: number;
}

export interface TypingAttempt {
  id: string;
  userId?: string;
  userName?: string;
  testId: string;
  testTitle: string;
  categoryName?: string;
  grossWpm: number;
  netWpm: number;
  accuracyPercentage: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  errorKeystrokes: number;
  fullMistakes: number;
  halfMistakes: number;
  totalMistakes: number;
  errorPercentage: number;
  backspaceCount: number;
  timeSpentSeconds: number;
  allocatedTimeSeconds: number;
  isQualified: boolean;
  language: 'en' | 'hi';
  typedText: string;
  targetText: string;
  allowRetype?: boolean;
  retypeCycles?: number;
  detailedMistakes?: DetailedMistake[];
  completedAt: string;
  createdAt: string;
}

// ===================================================================================
// ALL 39 EXAM CATEGORIES REGISTRY & EVALUATION CONFIGURATIONS
// ===================================================================================

export type ExamCategoryKey =
  | 'ssc-cgl'
  | 'ssc-cgl-previous'
  | 'ssc-chsl'
  | 'rrb-ntpc'
  | 'dsssb-jsa'
  | 'dsssb-it-assistant'
  | 'dsssb-steno'
  | 'kvs-jsa'
  | 'emrs-jsa'
  | 'nvs-jsa'
  | 'csir-jsa'
  | 'csir-formula'
  | 'cbse-jsa'
  | 'cbse-superintendent'
  | 'bsf-hcm'
  | 'aiims-cre'
  | 'upsssc-ja'
  | 'upsssc-ja-hindi'
  | 'delhi-police-hcm'
  | 'delhi-police-awo-tpo'
  | 'dda-jsa'
  | 'dda-steno'
  | 'ccras-ldc-udc'
  | 'rssb-ldc'
  | 'up-police-co'
  | 'supreme-court-jca'
  | 'mp-cpct'
  | 'allahabad-hc'
  | 'delhi-hc-jja'
  | 'bombay-hc-clerk'
  | 'bombay-hc-clerk-400'
  | 'chandigarh-admin-clerk'
  | 'rajasthan-rvunl'
  | 'punjab-haryana-hc'
  | 'spmcil'
  | 'ssb-hcm'
  | 'uttrakhand-hc'
  | 'jharkhand-hc'
  | 'quick-brown-fox'
  | 'standard';

export interface ExamCategoryConfig {
  key: ExamCategoryKey;
  name: string;
  slug: string;
  description: string;
  standardDurationMinutes: number;
  qualifyingSpeed: { en: number; hi: number };
  kdphTarget?: { en: number; hi: number };
  evaluationMode:
    | 'SSC_CGL_DEST'
    | 'SSC_CHSL_NET'
    | 'RRB_NTPC_PENALTY'
    | 'AIIMS_CRE_STROKES'
    | 'DELHI_POLICE_HCM_MARKS'
    | 'ALLAHABAD_HC_MARKS'
    | 'RSSB_LDC_MARKS'
    | 'MP_CPCT_SCALED'
    | 'DELHI_HC_ROUNDING'
    | 'SUPREME_COURT_JCA'
    | 'SPMCIL_PERMISSIBLE'
    | 'BSF_HCM_TOLERANCE'
    | 'UP_POLICE_ACCURACY'
    | 'UPSSSC_JA_STRICT'
    | 'BOMBAY_HC_MARKS'
    | 'CHANDIGARH_ADMIN_FULL_ERRORS'
    | 'DP_AWO_TPO'
    | 'STANDARD_NET_SPEED';
  retypeAllowed?: boolean;
}

export const EXAM_CATEGORIES: Record<ExamCategoryKey, ExamCategoryConfig> = {
  'ssc-chsl': {
    key: 'ssc-chsl',
    name: 'SSC CHSL TYPING',
    slug: 'ssc-chsl-typing',
    description: '10 min test, 35 WPM (En) / 30 WPM (Hi), Net Speed & Error % evaluation. UR/EWS <= 7%, Reserved <= 10%.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    kdphTarget: { en: 10500, hi: 9000 },
    evaluationMode: 'SSC_CHSL_NET'
  },
  'ssc-cgl': {
    key: 'ssc-cgl',
    name: 'SSC CGL Typing',
    slug: 'ssc-cgl-typing',
    description: '15 min DEST test, ~2000 keystrokes (~400 words), qualifying on Error %. UR <= 20%, OBC/EWS <= 25%, SC/ST <= 30%.',
    standardDurationMinutes: 15,
    qualifyingSpeed: { en: 27, hi: 25 },
    evaluationMode: 'SSC_CGL_DEST'
  },
  'ssc-cgl-previous': {
    key: 'ssc-cgl-previous',
    name: 'SSC CGL Previous Year Typing',
    slug: 'ssc-cgl-previous-year-typing',
    description: '15 min DEST test, ~2000 keystrokes (~400 words), qualifying on Error %. UR <= 20%, OBC/EWS <= 25%, SC/ST <= 30%.',
    standardDurationMinutes: 15,
    qualifyingSpeed: { en: 27, hi: 25 },
    evaluationMode: 'SSC_CGL_DEST'
  },
  'rrb-ntpc': {
    key: 'rrb-ntpc',
    name: 'RRB NTPC TYPING',
    slug: 'rrb-ntpc-typing',
    description: '10 min test, 30 WPM (En) / 25 WPM (Hi). 5% Permissible margin, excess mistakes penalized by 10 words. Retype allowed.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 30, hi: 25 },
    evaluationMode: 'RRB_NTPC_PENALTY',
    retypeAllowed: true
  },
  'dsssb-jsa': {
    key: 'dsssb-jsa',
    name: 'DSSSB JSA TYPING',
    slug: 'dsssb-jsa-typing',
    description: '10 min test, 35 WPM (En) / 30 WPM (Hi), 10,500 KDPH / 9,000 KDPH. Net speed evaluated.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    kdphTarget: { en: 10500, hi: 9000 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'kvs-jsa': {
    key: 'kvs-jsa',
    name: 'KVS JSA TYPING',
    slug: 'kvs-jsa-typing',
    description: '10 min test, 35 WPM (En) / 30 WPM (Hi). Net WPM evaluation.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'emrs-jsa': {
    key: 'emrs-jsa',
    name: 'EMRS JSA TYPING',
    slug: 'emrs-jsa-typing',
    description: '10 min test, 35 WPM (En) / 30 WPM (Hi). Net speed & accuracy evaluated.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'nvs-jsa': {
    key: 'nvs-jsa',
    name: 'NVS JSA TYPING',
    slug: 'nvs-jsa-typing',
    description: '10 min test, 35 WPM (En) / 30 WPM (Hi). Net speed & accuracy evaluated.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    kdphTarget: { en: 10500, hi: 9000 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'csir-jsa': {
    key: 'csir-jsa',
    name: 'CSIR JSA TYPING',
    slug: 'csir-jsa-typing',
    description: '10 min test, 35 WPM (En) / 30 WPM (Hi). Kruti Dev for Hindi.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'csir-formula': {
    key: 'csir-formula',
    name: 'CSIR EXAM New Rules(FORMULA)',
    slug: 'csir-exam-new-rules(formula)',
    description: '10 min test, 35 WPM (En) / 30 WPM (Hi). Strict punctuation and spacing rules.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'cbse-jsa': {
    key: 'cbse-jsa',
    name: 'CBSE JSA Typing',
    slug: 'cbse-jsa-typing',
    description: '10 min test, 35 WPM (En) / 30 WPM (Hi). 10,500 KDPH / 9,000 KDPH.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    kdphTarget: { en: 10500, hi: 9000 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'cbse-superintendent': {
    key: 'cbse-superintendent',
    name: 'CBSE Superintendent Typing',
    slug: 'cbse-superintendent-typing',
    description: '10 min test, 35 WPM (En) / 30 WPM (Hi). 10,500 KDPH / 9,000 KDPH.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    kdphTarget: { en: 10500, hi: 9000 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'bsf-hcm': {
    key: 'bsf-hcm',
    name: 'BSF HCM Typing',
    slug: 'bsf-hcm-typing',
    description: '10 min test, 35 WPM (En) / 30 WPM (Hi). 5% error tolerance, 10-word penalty for each mistake beyond 5%.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    kdphTarget: { en: 10500, hi: 9000 },
    evaluationMode: 'BSF_HCM_TOLERANCE'
  },
  'aiims-cre': {
    key: 'aiims-cre',
    name: 'AIIMS CRE LDC UDC DEO Typing',
    slug: 'aiims-cre-ldc-udc-deo-typing',
    description: '15 min test, 35 WPM (En) / 30 WPM (Hi). Official CRE-5 Penalty: 50 strokes per mistake, Divisor 75 (5x15), Accuracy = (Net/Gross)*100.',
    standardDurationMinutes: 15,
    qualifyingSpeed: { en: 35, hi: 30 },
    kdphTarget: { en: 10500, hi: 9000 },
    evaluationMode: 'AIIMS_CRE_STROKES'
  },
  'upsssc-ja': {
    key: 'upsssc-ja',
    name: 'UPSSSC Junior Assistant Typing',
    slug: 'upsssc-junior-assistant-typing',
    description: '5 min English (30 WPM) + 5 min Hindi (25 WPM). Strict 5% error penalty system, 85% min accuracy.',
    standardDurationMinutes: 5,
    qualifyingSpeed: { en: 30, hi: 25 },
    evaluationMode: 'UPSSSC_JA_STRICT'
  },
  'upsssc-ja-hindi': {
    key: 'upsssc-ja-hindi',
    name: 'UPSSSC JA Hindi Typing',
    slug: 'upsssc-ja-hindi-typing',
    description: '5 min Hindi (25 WPM). Mangal Inscript / Kruti Dev 010. Strict 5% error penalty system.',
    standardDurationMinutes: 5,
    qualifyingSpeed: { en: 30, hi: 25 },
    evaluationMode: 'UPSSSC_JA_STRICT'
  },
  'delhi-police-hcm': {
    key: 'delhi-police-hcm',
    name: 'Delhi Police HCM Typing',
    slug: 'delhi-police-hcm-typing',
    description: '10 min test (400 words En / 350 words Hi). 1 WPM deducted per mistake. Max 25 Marks scored from speed scale (30 WPM = 10 marks, >50 WPM = 25 marks).',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 30, hi: 25 },
    evaluationMode: 'DELHI_POLICE_HCM_MARKS'
  },
  'delhi-police-awo-tpo': {
    key: 'delhi-police-awo-tpo',
    name: 'Delhi Police AWO TPO Typing',
    slug: 'delhi-police-awo-tpo-typing',
    description: '15 min test, 1,000 key depressions target (4,000 KDPH / ~13-15 WPM), min 85% accuracy.',
    standardDurationMinutes: 15,
    qualifyingSpeed: { en: 15, hi: 15 },
    kdphTarget: { en: 4000, hi: 4000 },
    evaluationMode: 'DP_AWO_TPO'
  },
  'dda-jsa': {
    key: 'dda-jsa',
    name: 'DDA JSA Typing',
    slug: 'dda-jsa-typing',
    description: '10 min test, 35 WPM (En) / 30 WPM (Hi). Net WPM qualifying evaluation.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'dda-steno': {
    key: 'dda-steno',
    name: 'DDA Stenographer Typing',
    slug: 'dda-stenographer-typing',
    description: '10 min test, 40 WPM (En) / 35 WPM (Hi). Net WPM qualifying evaluation.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 40, hi: 35 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'ccras-ldc-udc': {
    key: 'ccras-ldc-udc',
    name: 'CCRAS LDC UDC Typing',
    slug: 'ccras-ldc-udc-typing',
    description: '10 min test, 35 WPM (En) / 30 WPM (Hi). Net WPM qualifying evaluation.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'rssb-ldc': {
    key: 'rssb-ldc',
    name: 'RSSB LDC Typing',
    slug: 'rssb-ldc-typing',
    description: '10 min test, 25 Marks per section. English: 500 words @ 0.05 marks/correct word. Hindi: 400 words @ 0.0625 marks/correct word. Min 9.0 marks (36%) to qualify.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 28, hi: 25 },
    evaluationMode: 'RSSB_LDC_MARKS'
  },
  'up-police-co': {
    key: 'up-police-co',
    name: 'UP Police Computer Operator Typing',
    slug: 'up-police-computer-operator-typing',
    description: '15 min test, 30 WPM (En) / 25 WPM (Hi), minimum 85.00% accuracy strictly mandatory to qualify.',
    standardDurationMinutes: 15,
    qualifyingSpeed: { en: 30, hi: 25 },
    evaluationMode: 'UP_POLICE_ACCURACY'
  },
  'dsssb-it-assistant': {
    key: 'dsssb-it-assistant',
    name: 'DSSSB Computer Lab ( IT Assistant) Typing',
    slug: 'dsssb-computer-lab-it-assistant-typing',
    description: '10 min test, 26.67 WPM required.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 26.67, hi: 26.67 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'dsssb-steno': {
    key: 'dsssb-steno',
    name: 'DSSSB Stenographer Typing',
    slug: 'dsssb-stenographer-typing',
    description: '10 min test, 40 WPM (En) / 30 WPM (Hi).',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 40, hi: 30 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'quick-brown-fox': {
    key: 'quick-brown-fox',
    name: 'Quick Brown Fox',
    slug: 'quick-brown-fox',
    description: 'Touch typing practice on pangrams, home-row accuracy and speed.',
    standardDurationMinutes: 5,
    qualifyingSpeed: { en: 30, hi: 25 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'supreme-court-jca': {
    key: 'supreme-court-jca',
    name: 'Supreme Court Junior Court Assistant (JCA) Typing',
    slug: 'supreme-court-junior-court-assistant-jca-typing',
    description: '10 min test, 35 WPM in English. Max 3.0% permissible mistakes allowed.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    evaluationMode: 'SUPREME_COURT_JCA'
  },
  'mp-cpct': {
    key: 'mp-cpct',
    name: 'MP CPCT Typing',
    slug: 'mp-cpct-typing',
    description: '15 min test, 30 NWPM (En) / 20 NWPM (Hi). Scaled Score % from 50% to 100% based on NWPM.',
    standardDurationMinutes: 15,
    qualifyingSpeed: { en: 30, hi: 20 },
    evaluationMode: 'MP_CPCT_SCALED'
  },
  'allahabad-hc': {
    key: 'allahabad-hc',
    name: 'Allahabad Highcourt RO / ARO Typing',
    slug: 'allahabad-highcourt-ro-aro-typing',
    description: '500 words passage, 25 WPM. Max 50 Marks, 0.1 mark deducted per mistake, min 25.0 Marks (50%) to qualify.',
    standardDurationMinutes: 15,
    qualifyingSpeed: { en: 25, hi: 25 },
    evaluationMode: 'ALLAHABAD_HC_MARKS'
  },
  'uttrakhand-hc': {
    key: 'uttrakhand-hc',
    name: 'Uttrakhand High Court Typing',
    slug: 'uttrakhand-high-court-typing',
    description: '10 min test, 30 WPM (En) / 25 WPM (Hi). Net WPM qualifying evaluation.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 30, hi: 25 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'jharkhand-hc': {
    key: 'jharkhand-hc',
    name: 'Jharkhand High Court Typing',
    slug: 'jharkhand-high-court-typing',
    description: '10 min test, 30 WPM. Net WPM qualifying evaluation.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 30, hi: 25 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'delhi-hc-jja': {
    key: 'delhi-hc-jja',
    name: 'Delhi High Court (DHC) JJA Typing',
    slug: 'delhi-high-court-dhc-jja-typing',
    description: '10 min test, 35 WPM. 3% permissible mistakes with exact 0.5 (0.01-0.49) / 1.0 (0.51-0.99) rounding rule.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    evaluationMode: 'DELHI_HC_ROUNDING'
  },
  'bombay-hc-clerk': {
    key: 'bombay-hc-clerk',
    name: 'Bombay High Court Clerk Typing',
    slug: 'bombay-high-court-clerk-typing',
    description: '10 min test, 400 words passage, 40 WPM. Max 20 Marks, min 10.0 Marks to qualify.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 40, hi: 30 },
    evaluationMode: 'BOMBAY_HC_MARKS'
  },
  'bombay-hc-clerk-400': {
    key: 'bombay-hc-clerk-400',
    name: 'Bombay High Court Clerk Typing 400 Words',
    slug: 'bombay-high-court-clerk-typing-400-words',
    description: '10 min test, 400 words passage, 40 WPM. Max 20 Marks, min 10.0 Marks to qualify.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 40, hi: 30 },
    evaluationMode: 'BOMBAY_HC_MARKS'
  },
  'chandigarh-admin-clerk': {
    key: 'chandigarh-admin-clerk',
    name: 'Chandigarh Administration Clerk Typing',
    slug: 'chandigarh-administration-clerk-typing',
    description: '10 min test, 35 WPM. All errors counted as full errors.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    evaluationMode: 'CHANDIGARH_ADMIN_FULL_ERRORS'
  },
  'rajasthan-rvunl': {
    key: 'rajasthan-rvunl',
    name: 'Rajasthan RVUNL Junior Assistant Typing',
    slug: 'rajasthan-rvunl-junior-assistant-typing',
    description: '10 min test, 20 WPM in Hindi (Devanagari) and English.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 20, hi: 20 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'punjab-haryana-hc': {
    key: 'punjab-haryana-hc',
    name: 'Punjab Haryana High Court Typing',
    slug: 'punjab-haryana-high-court-typing',
    description: '10 min test, 30 WPM qualifying speed.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 30, hi: 25 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'spmcil': {
    key: 'spmcil',
    name: 'SPMCIL Typing',
    slug: 'spmcil-typing',
    description: '10 min test, 40 WPM (En) / 30 WPM (Hi). Permissible margin: 5% for UR, 7% for Reserved. 10x penalty for excess.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 40, hi: 30 },
    evaluationMode: 'SPMCIL_PERMISSIBLE'
  },
  'ssb-hcm': {
    key: 'ssb-hcm',
    name: 'SSB HCM Typing',
    slug: 'ssb-hcm-typing',
    description: '10 min test, 35 WPM (1,750 key depressions) En / 30 WPM (1,500 key depressions) Hi.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    kdphTarget: { en: 10500, hi: 9000 },
    evaluationMode: 'STANDARD_NET_SPEED'
  },
  'standard': {
    key: 'standard',
    name: 'Standard Typing Test',
    slug: 'standard-typing',
    description: 'Standard typing evaluation based on Gross WPM, Net WPM, and Accuracy.',
    standardDurationMinutes: 10,
    qualifyingSpeed: { en: 35, hi: 30 },
    evaluationMode: 'STANDARD_NET_SPEED'
  }
};

/**
 * Detect exam category from any test or category object or identifier string.
 */
export function detectExamCategory(
  testOrCat?: { categoryId?: string; title?: string; categoryName?: string; id?: string; name?: string; slug?: string } | string | null
): ExamCategoryConfig {
  if (!testOrCat) return EXAM_CATEGORIES['standard'];

  let s = '';
  if (typeof testOrCat === 'string') {
    s = testOrCat.toLowerCase();
  } else {
    s = `${testOrCat.categoryId || ''} ${testOrCat.id || ''} ${testOrCat.slug || ''} ${testOrCat.title || ''} ${testOrCat.name || ''} ${testOrCat.categoryName || ''}`.toLowerCase();
  }

  if (s.includes('aiims') || s.includes('cre-5')) return EXAM_CATEGORIES['aiims-cre'];
  if (s.includes('rrb') || s.includes('ntpc')) return EXAM_CATEGORIES['rrb-ntpc'];
  if (s.includes('chsl') || s.includes('cat-ssc-chsl')) return EXAM_CATEGORIES['ssc-chsl'];
  if (s.includes('cgl previous') || s.includes('previous year')) return EXAM_CATEGORIES['ssc-cgl-previous'];
  if (s.includes('cgl') || s.includes('cat-ssc-cgl') || s.includes('dest')) return EXAM_CATEGORIES['ssc-cgl'];
  if (s.includes('delhi police hcm') || (s.includes('delhi police') && s.includes('hcm'))) return EXAM_CATEGORIES['delhi-police-hcm'];
  if (s.includes('awo') || s.includes('tpo')) return EXAM_CATEGORIES['delhi-police-awo-tpo'];
  if (s.includes('allahabad')) return EXAM_CATEGORIES['allahabad-hc'];
  if (s.includes('mp cpct') || s.includes('cpct')) return EXAM_CATEGORIES['mp-cpct'];
  if (s.includes('rssb') || s.includes('rajasthan ldc')) return EXAM_CATEGORIES['rssb-ldc'];
  if (s.includes('delhi high court') || s.includes('dhc') || s.includes('jja')) return EXAM_CATEGORIES['delhi-hc-jja'];
  if (s.includes('supreme court') || s.includes('jca')) return EXAM_CATEGORIES['supreme-court-jca'];
  if (s.includes('spmcil')) return EXAM_CATEGORIES['spmcil'];
  if (s.includes('bsf') || s.includes('bsf hcm')) return EXAM_CATEGORIES['bsf-hcm'];
  if (s.includes('up police') || s.includes('computer operator') || s.includes('uppco')) return EXAM_CATEGORIES['up-police-co'];
  if (s.includes('upsssc') && s.includes('hindi')) return EXAM_CATEGORIES['upsssc-ja-hindi'];
  if (s.includes('upsssc') || s.includes('junior assistant') && s.includes('up')) return EXAM_CATEGORIES['upsssc-ja'];
  if (s.includes('bombay') && s.includes('400')) return EXAM_CATEGORIES['bombay-hc-clerk-400'];
  if (s.includes('bombay')) return EXAM_CATEGORIES['bombay-hc-clerk'];
  if (s.includes('chandigarh')) return EXAM_CATEGORIES['chandigarh-admin-clerk'];
  if (s.includes('dsssb') && (s.includes('lab') || s.includes('it assistant'))) return EXAM_CATEGORIES['dsssb-it-assistant'];
  if (s.includes('dsssb') && s.includes('steno')) return EXAM_CATEGORIES['dsssb-steno'];
  if (s.includes('dsssb')) return EXAM_CATEGORIES['dsssb-jsa'];
  if (s.includes('kvs')) return EXAM_CATEGORIES['kvs-jsa'];
  if (s.includes('emrs')) return EXAM_CATEGORIES['emrs-jsa'];
  if (s.includes('nvs')) return EXAM_CATEGORIES['nvs-jsa'];
  if (s.includes('csir') && (s.includes('formula') || s.includes('new rules'))) return EXAM_CATEGORIES['csir-formula'];
  if (s.includes('csir')) return EXAM_CATEGORIES['csir-jsa'];
  if (s.includes('cbse') && s.includes('superintendent')) return EXAM_CATEGORIES['cbse-superintendent'];
  if (s.includes('cbse')) return EXAM_CATEGORIES['cbse-jsa'];
  if (s.includes('dda') && s.includes('steno')) return EXAM_CATEGORIES['dda-steno'];
  if (s.includes('dda')) return EXAM_CATEGORIES['dda-jsa'];
  if (s.includes('ccras')) return EXAM_CATEGORIES['ccras-ldc-udc'];
  if (s.includes('punjab') || s.includes('haryana')) return EXAM_CATEGORIES['punjab-haryana-hc'];
  if (s.includes('rvunl') || s.includes('vidyut')) return EXAM_CATEGORIES['rajasthan-rvunl'];
  if (s.includes('ssb')) return EXAM_CATEGORIES['ssb-hcm'];
  if (s.includes('uttrakhand')) return EXAM_CATEGORIES['uttrakhand-hc'];
  if (s.includes('jharkhand')) return EXAM_CATEGORIES['jharkhand-hc'];
  if (s.includes('fox') || s.includes('quick brown')) return EXAM_CATEGORIES['quick-brown-fox'];

  return EXAM_CATEGORIES['standard'];
}

// Backward-compatibility helper functions
export function isAiimsExam(testOrCat?: any): boolean {
  return detectExamCategory(testOrCat).key === 'aiims-cre';
}

export function isSscExam(testOrCat?: any): boolean {
  const k = detectExamCategory(testOrCat).key;
  return k === 'ssc-cgl' || k === 'ssc-cgl-previous' || k === 'ssc-chsl';
}

export function isSscCglExam(testOrCat?: any): boolean {
  const k = detectExamCategory(testOrCat).key;
  return k === 'ssc-cgl' || k === 'ssc-cgl-previous';
}

export function isSscChslExam(testOrCat?: any): boolean {
  return detectExamCategory(testOrCat).key === 'ssc-chsl';
}

export function isRrbNtpcExam(testOrCat?: any): boolean {
  return detectExamCategory(testOrCat).key === 'rrb-ntpc';
}

export function isDsssbJsaExam(testOrCat?: any): boolean {
  const k = detectExamCategory(testOrCat).key;
  return k === 'dsssb-jsa' || k === 'dsssb-it-assistant' || k === 'dsssb-steno';
}

export function isDsssbStenoExam(testOrCat?: any): boolean {
  if (!testOrCat) return false;
  const key = typeof testOrCat === 'string' ? testOrCat : testOrCat.key || testOrCat.categoryId || testOrCat.categoryKey || '';
  if (key === 'dsssb-steno' || key === 'dsssb-stenographer-typing') return true;
  const title = (testOrCat.title || testOrCat.name || '').toLowerCase();
  if (title.includes('dsssb') && (title.includes('steno') || title.includes('stenographer'))) return true;
  return detectExamCategory(testOrCat).key === 'dsssb-steno';
}

export function isDsssbItAssistantExam(testOrCat?: any): boolean {
  if (!testOrCat) return false;
  const key = typeof testOrCat === 'string' ? testOrCat : testOrCat.key || testOrCat.categoryId || testOrCat.categoryKey || '';
  if (key === 'dsssb-it-assistant' || key === 'dsssb-computer-lab-it-assistant-typing') return true;
  const title = (testOrCat.title || testOrCat.name || '').toLowerCase();
  if (title.includes('dsssb') && (title.includes('it assistant') || title.includes('computer lab'))) return true;
  return detectExamCategory(testOrCat).key === 'dsssb-it-assistant';
}

export function isKvsJsaExam(testOrCat?: any): boolean {
  return detectExamCategory(testOrCat).key === 'kvs-jsa';
}

export function isEmrsJsaExam(testOrCat?: any): boolean {
  return detectExamCategory(testOrCat).key === 'emrs-jsa';
}

export function isNvsJsaExam(testOrCat?: any): boolean {
  return detectExamCategory(testOrCat).key === 'nvs-jsa';
}

export function isCsirJsaExam(testOrCat?: any): boolean {
  const k = detectExamCategory(testOrCat).key;
  return k === 'csir-jsa' || k === 'csir-formula';
}

export function isCbseJsaExam(testOrCat?: any): boolean {
  const k = detectExamCategory(testOrCat).key;
  return k === 'cbse-jsa' || k === 'cbse-superintendent';
}

export function isCbseSuperintendentExam(testOrCat?: any): boolean {
  if (!testOrCat) return false;
  const key = typeof testOrCat === 'string' ? testOrCat : testOrCat.key || testOrCat.categoryId || testOrCat.categoryKey || '';
  if (key === 'cbse-superintendent' || key === 'cbse-superintendent-typing') return true;
  const title = (testOrCat.title || '').toLowerCase();
  if (title.includes('cbse') && title.includes('superintendent')) return true;
  return detectExamCategory(testOrCat).key === 'cbse-superintendent';
}

export function isBsfHcmExam(testOrCat?: any): boolean {
  if (!testOrCat) return false;
  const key = typeof testOrCat === 'string' ? testOrCat : testOrCat.key || testOrCat.categoryId || testOrCat.categoryKey || '';
  if (key === 'bsf-hcm' || key === 'bsf-hcm-typing') return true;
  const title = (testOrCat.title || '').toLowerCase();
  if (title.includes('bsf') || title.includes('bsf hcm')) return true;
  return detectExamCategory(testOrCat).key === 'bsf-hcm';
}

export function isCsirFormulaExam(testOrCat?: any): boolean {
  if (!testOrCat) return false;
  const key = typeof testOrCat === 'string' ? testOrCat : testOrCat.key || testOrCat.categoryId || testOrCat.categoryKey || '';
  if (key === 'csir-formula' || key === 'csir-exam-new-rules(formula)') return true;
  const title = (testOrCat.title || '').toLowerCase();
  if (title.includes('csir') && (title.includes('formula') || title.includes('new rules') || title.includes('2 space'))) return true;
  return detectExamCategory(testOrCat).key === 'csir-formula';
}

export function isUpssscJaExam(testOrCat?: any): boolean {
  if (!testOrCat) return false;
  const key = typeof testOrCat === 'string' ? testOrCat : testOrCat.key || testOrCat.categoryId || testOrCat.categoryKey || '';
  if (key === 'upsssc-ja' || key === 'upsssc-junior-assistant-typing' || key === 'upsssc-ja-hindi' || key === 'upsssc-ja-hindi-typing') return true;
  const title = (testOrCat.title || '').toLowerCase();
  if (title.includes('upsssc') || (title.includes('junior assistant') && title.includes('up'))) return true;
  const catKey = detectExamCategory(testOrCat).key;
  return catKey === 'upsssc-ja' || catKey === 'upsssc-ja-hindi';
}

export function isDdaJsaExam(testOrCat?: any): boolean {
  if (!testOrCat) return false;
  const key = typeof testOrCat === 'string' ? testOrCat : testOrCat.key || testOrCat.categoryId || testOrCat.categoryKey || '';
  if (key === 'dda-jsa' || key === 'dda-jsa-typing') return true;
  const title = (testOrCat.title || testOrCat.name || '').toLowerCase();
  if (title.includes('dda') && title.includes('jsa')) return true;
  return detectExamCategory(testOrCat).key === 'dda-jsa';
}

export function isDdaStenoExam(testOrCat?: any): boolean {
  if (!testOrCat) return false;
  const key = typeof testOrCat === 'string' ? testOrCat : testOrCat.key || testOrCat.categoryId || testOrCat.categoryKey || '';
  if (key === 'dda-steno' || key === 'dda-stenographer-typing') return true;
  const title = (testOrCat.title || testOrCat.name || '').toLowerCase();
  if (title.includes('dda') && (title.includes('steno') || title.includes('stenographer'))) return true;
  return detectExamCategory(testOrCat).key === 'dda-steno';
}

export function isMpCpctExam(testOrCat?: any): boolean {
  if (!testOrCat) return false;
  const key = typeof testOrCat === 'string' ? testOrCat : testOrCat.key || testOrCat.categoryId || testOrCat.categoryKey || '';
  if (key === 'mp-cpct' || key === 'mp-cpct-typing') return true;
  const title = (testOrCat.title || testOrCat.name || '').toLowerCase();
  if (title.includes('mp') && title.includes('cpct')) return true;
  if (title.includes('cpct')) return true;
  return detectExamCategory(testOrCat).key === 'mp-cpct';
}

export function isAllahabadHcExam(testOrCat?: any): boolean {
  if (!testOrCat) return false;
  const key = typeof testOrCat === 'string' ? testOrCat : testOrCat.key || testOrCat.categoryId || testOrCat.categoryKey || '';
  if (key === 'allahabad-hc' || key === 'allahabad-highcourt-ro-aro-typing') return true;
  const title = (testOrCat.title || testOrCat.name || '').toLowerCase();
  if (title.includes('allahabad') || title.includes('ro/aro') || title.includes('ro-aro') || title.includes('ro aro')) return true;
  return detectExamCategory(testOrCat).key === 'allahabad-hc';
}

export function isUttrakhandHcExam(testOrCat?: any): boolean {
  if (!testOrCat) return false;
  const key = typeof testOrCat === 'string' ? testOrCat : testOrCat.key || testOrCat.categoryId || testOrCat.categoryKey || '';
  if (key === 'uttrakhand-hc' || key === 'uttrakhand-high-court-typing') return true;
  const title = (testOrCat.title || testOrCat.name || '').toLowerCase();
  if (title.includes('uttrakhand') || title.includes('uttarakhand')) return true;
  return detectExamCategory(testOrCat).key === 'uttrakhand-hc';
}

export function isDhcJjaExam(testOrCat?: any): boolean {
  if (!testOrCat) return false;
  const key = typeof testOrCat === 'string' ? testOrCat : testOrCat.key || testOrCat.categoryId || testOrCat.categoryKey || '';
  if (key === 'delhi-hc-jja' || key === 'delhi-high-court-dhc-jja-typing') return true;
  const title = (testOrCat.title || testOrCat.name || '').toLowerCase();
  if (title.includes('delhi high court') || title.includes('dhc') || (title.includes('delhi') && title.includes('jja'))) return true;
  return detectExamCategory(testOrCat).key === 'delhi-hc-jja';
}



export interface CategoryEvaluationResult {
  categoryKey: ExamCategoryKey;
  categoryName: string;
  evaluationBadge: string;
  marksObtained?: number;
  maxMarks?: number;
  scaledScorePercentage?: number;
  qualifyingMarks?: number;
  tentativeSpeed?: number;
  actualSpeed?: number;
  permissibleMistakes?: number;
  excessMistakes?: number;
  penaltyWords?: number;
  penaltyStrokes?: number;
  netStrokes?: number;
  isSpeedPassed?: boolean;
  isErrorPassed?: boolean;
  isMarksPassed?: boolean;
  qualificationReason?: string;
  criteriaBreakdown: Array<{ label: string; value: string | number; status?: 'PASS' | 'FAIL' | 'INFO' }>;
  errorBreakdown?: {
    omissions: number;
    substitutions: number;
    extraWords: number;
    repetitions: number;
    incompleteWords: number;
    spacingErrors: number;
    capitalizationErrors: number;
    punctuationErrors: number;
    transpositionErrors: number;
    paragraphErrors: number;
  };
}



// ===================================================================================
// UNIVERSAL TYPING EVALUATION  — thin adapter over ./typing (per-category engines).
// Keeps the exact return shape the test-runner UI consumes; every number comes
// from the matching engine in ./typing/engines/<category>.ts
// ===================================================================================

function _wordsOf(s: string): string[] {
  const t = (s || '').replace(/\r\n?/g, '\n').replace(/\s+/g, ' ').trim();
  return t.length ? t.split(' ') : [];
}

export function evaluateTyping(
  targetText: string,
  typedText: string,
  timeSpentSeconds: number,
  backspaceCount: number = 0,
  qualifyingWpm: number = 35,
  maxErrorPercentage: number = 5.0,
  allowRetype: boolean = false,
  isSscOrCat?: boolean | { categoryId?: string; title?: string; categoryName?: string; id?: string; name?: string; slug?: string },
  isSscCgl?: boolean,
  isSscChsl?: boolean,
  isAiims?: boolean,
  language: 'en' | 'hi' = 'en',
  userCategoryChoice?: string,
  keystrokesTyped?: number
) {
  void qualifyingWpm; void maxErrorPercentage;

  // legacy ExamCategoryConfig — still consumed directly by the result UI
  let catConfig: ExamCategoryConfig;
  if (typeof isSscOrCat === 'object' && isSscOrCat !== null) catConfig = detectExamCategory(isSscOrCat);
  else if (isAiims) catConfig = EXAM_CATEGORIES['aiims-cre'];
  else if (isSscCgl) catConfig = EXAM_CATEGORIES['ssc-cgl'];
  else if (isSscChsl) catConfig = EXAM_CATEGORIES['ssc-chsl'];
  else if (isSscOrCat === true) catConfig = EXAM_CATEGORIES['ssc-chsl'];
  else catConfig = EXAM_CATEGORIES['standard'];

  const source: Parameters<typeof evaluateTypingTest>[0] =
    isAiims ? 'aiims-cre'
    : isSscCgl ? 'ssc-cgl'
    : isSscChsl ? 'ssc-chsl'
    : (typeof isSscOrCat === 'object' && isSscOrCat) ? isSscOrCat
    : catConfig.slug;

  const R = evaluateTypingTest(source, {
    passageText: targetText,
    typedText,
    timeSeconds: timeSpentSeconds,
    keystrokesTyped,
    backspaceCount,
    language,
    userCategoryChoice,
    allowRetype,
  });

  const e = R.errors;
  const c = R.core;

  const pw = _wordsOf(targetText).length;
  const tw = _wordsOf(typedText).length;
  const canRetype = allowRetype || Boolean(R.config.retypeAllowed);
  const cyclesCompleted = pw > 0 ? Math.max(0, Math.floor(tw / pw)) : 0;
  const retypedWordsCount = canRetype && pw > 0 ? Math.max(0, tw - pw) : 0;

  const correctKeystrokes = Math.round(e.correctWords * 5);
  const errorKeystrokes = Math.max(0, c.keystrokesTyped - correctKeystrokes);

  const categoryEvaluation: CategoryEvaluationResult = {
    categoryKey: catConfig.key,
    categoryName: catConfig.name,
    evaluationBadge: R.badge,
    marksObtained: R.marks ?? undefined,
    maxMarks: R.maxMarks ?? undefined,
    scaledScorePercentage: R.scaledScorePercent ?? undefined,
    qualifyingMarks: R.qualifyingMarks ?? undefined,
    tentativeSpeed: R.tentativeSpeed ?? undefined,
    actualSpeed: R.actualSpeed ?? undefined,
    permissibleMistakes: R.permissibleErrors,
    excessMistakes: R.excessErrors,
    penaltyWords: R.penaltyWords,
    penaltyStrokes: R.penaltyStrokes ?? undefined,
    netStrokes: R.netStrokes ?? undefined,
    isSpeedPassed: R.speedPassed,
    isErrorPassed: R.errorPassed,
    isMarksPassed: R.marksPassed,
    qualificationReason: R.reason,
    criteriaBreakdown: R.criteria,
    errorBreakdown: {
      omissions: e.omissions || 0,
      substitutions: e.substitutions || 0,
      extraWords: e.extraWords || 0,
      repetitions: e.repetitions || 0,
      incompleteWords: e.incompleteWords || 0,
      spacingErrors: e.spacingErrors || 0,
      capitalizationErrors: e.capitalizationErrors || 0,
      punctuationErrors: e.punctuationErrors || 0,
      transpositionErrors: e.transpositionErrors || 0,
      paragraphErrors: e.paragraphErrors || 0,
    },
  };

  const detailedMistakes: DetailedMistake[] = e.mistakes.map((m: EngineMistake, i: number) => ({
    index: m.index ?? i,
    originalWord: m.expected,
    typedWord: m.typed,
    type: m.type as DetailedMistake['type'],
    reason: m.reason,
  }));

  const mapWord = (w: EngineAlignedWord): AlignedWord => ({
    word: w.word,
    status: w.status as AlignedWord['status'],
    expectedWord: w.expected,
    typedWord: w.typed,
    reason: w.reason,
    index: w.index,
  });

  return {
    grossWpm: R.grossWpm,
    netWpm: R.netWpm,
    accuracyPercentage: R.accuracy,
    totalKeystrokes: c.keystrokesTyped,
    correctKeystrokes,
    errorKeystrokes,
    kdph: R.kdph,

    fullMistakes: R.fullErrors,
    halfMistakes: R.halfErrors,
    totalMistakes: R.totalErrors,
    errorPercentage: R.errorPercentage,
    substitutions: e.substitutions + e.incompleteWords,
    omissions: e.omissions,
    extraWordErrors: e.extraWords + e.repetitions,
    wrongCapitalizations: e.capitalizationErrors,
    punctuationErrors: e.punctuationErrors,
    transpositionErrors: e.transpositionErrors,
    spacingErrors: e.spacingErrors,

    isSsc: catConfig.key === 'ssc-cgl' || catConfig.key === 'ssc-cgl-previous' || catConfig.key === 'ssc-chsl',
    isSscCgl: catConfig.key === 'ssc-cgl' || catConfig.key === 'ssc-cgl-previous',
    isSscChsl: catConfig.key === 'ssc-chsl',
    totalWordsInMasterPassage: c.wordsInPassage,
    totalMasterPassageKeystrokes: c.passageKeystrokes,
    chslNetWords: R.netWords,
    chslNetWpm: R.netWpm,

    isAiims: R.key === 'aiims-cre',
    aiimsPenaltyStrokes: R.penaltyStrokes ?? 0,
    aiimsNetStrokes: R.netStrokes ?? 0,
    aiimsGrossWpm: R.aiimsGrossWpm ?? 0,
    aiimsNetWpm: R.aiimsNetWpm ?? 0,
    aiimsAccuracy: R.key === 'aiims-cre' ? R.accuracy : 0,

    totalWordsTyped: c.wordsTyped,
    ignorableMistakes: R.permissibleErrors,
    remainingMistakes: R.excessErrors,
    netWords: R.netWords,
    penalty: R.penaltyWords,

    cyclesCompleted,
    retypedWordsCount,
    allowRetype: canRetype,
    timeInMinutes: c.timeMinutes,

    isQualified: R.qualified,
    categoryConfig: catConfig,
    categoryEvaluation,

    detailedMistakes,
    alignedOriginalWords: e.aligned.map(mapWord),
    alignedTypedWords: e.alignedTyped.map(mapWord),
  };
}
