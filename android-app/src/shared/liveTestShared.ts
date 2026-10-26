// AUTO-COPIED from the website by scripts/sync-shared.mjs. Edit the website file, then run npm run sync-shared.
// -----------------------------------------------------------------------------
// Live tests: every start makes a NEW paper from a question bank (lib/liveTest.ts on the
// server). Nothing is stored in the database: the paper and the student's progress live only
// on the student's device until it is submitted, the server scores it from the bank and
// sends the result and solutions back once. Shared by the website, the server and the app.
// -----------------------------------------------------------------------------

export interface LiveTestArea {
  /** Name used in the bank and in the result's area-wise breakdown */
  name: string;
  nameHi: string;
  /** Questions from this area in each paper */
  count: number;
}

export interface LiveTestConfig {
  id: string;
  title: string;
  titleHi: string;
  /** Tigris key of the bank file */
  bankKey: string;
  section: string;
  durationMinutes: number;
  positiveMarks: number;
  negativeMarks: number;
  requiredTier: string;
  areas: LiveTestArea[];
}

export const LIVE_TESTS: Record<string, LiveTestConfig> = {
  computer_knowledge_live_test_ck26: {
    id: 'computer_knowledge_live_test_ck26',
    title: 'Computer Knowledge Live Test',
    titleHi: 'कंप्यूटर ज्ञान लाइव टेस्ट',
    bankKey: 'live_banks/computer_knowledge.json',
    section: 'Computer Knowledge',
    durationMinutes: 30,
    positiveMarks: 1,
    negativeMarks: 0.25,
    requiredTier: 'Testbook Pass Pro',
    areas: [
      { name: 'Fundamentals', nameHi: 'कंप्यूटर के मूल सिद्धांत', count: 8 },
      { name: 'Hardware', nameHi: 'हार्डवेयर', count: 10 },
      { name: 'Software', nameHi: 'सॉफ़्टवेयर', count: 12 },
      { name: 'Networking & Security', nameHi: 'नेटवर्किंग और सुरक्षा', count: 10 },
    ],
  },
};

export const isLiveTestId = (testId: string | null | undefined): boolean => !!testId && Object.prototype.hasOwnProperty.call(LIVE_TESTS, testId);

export const liveQuestionCount = (cfg: LiveTestConfig): number => cfg.areas.reduce((n, a) => n + a.count, 0);

/** The paper kept on the device until it is submitted (localStorage / AsyncStorage). */
export const livePaperKey = (userId: string | null | undefined, testId: string) => `live_paper_${userId || 'guest'}_${testId}`;

export interface LivePaper {
  testId: string;
  /** Signed list of the paper's questions; sent back with the answers */
  token: string;
  /** Questions without answers or solutions, in the uploaded-question format */
  questions: any[];
  createdAt: number;
  expiresAt: number;
}

export interface LiveResultQuestion {
  id: string;
  area: string;
  content: { en: { questionText: string; options: string[] }; hi: { questionText: string; options: string[] } };
  correctOptionIndex: number;
  selectedOptionIndex: number | null;
  status: 'correct' | 'wrong' | 'skipped';
  explanation: { en: string; hi: string };
}

export interface LiveResult {
  testId: string;
  title: string;
  titleHi: string;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** Correct out of attempted, % */
  accuracy: number;
  timeTakenSeconds: number;
  positiveMarks: number;
  negativeMarks: number;
  areas: { name: string; nameHi: string; total: number; correct: number; wrong: number; skipped: number; score: number }[];
  questions: LiveResultQuestion[];
}
