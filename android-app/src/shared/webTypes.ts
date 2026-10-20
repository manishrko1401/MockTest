// AUTO-COPIED from the website by scripts/sync-shared.mjs. Edit the website file, then run npm run sync-shared.
/* eslint-disable */
export interface OptionContent {
  text: string;
  imageUrl?: string;
  mathLatex?: string;
}

export interface QuestionContent {
  questionText: string;
  options: OptionContent[] | string[]; // Can support raw strings or rich option objects
  imageUrl?: string;
  mathLatex?: string;
  comprehension?: string;
}

export interface Question {
  id: string;
  sectionId: string;
  questionType: 'mcq' | 'numerical_value' | 'true_false';
  content: {
    en: QuestionContent;
    hi: QuestionContent;
  };
  correctOptionIndex: number; // Used for evaluation
  orderIndex: number;
  explanation?: {
    en: string;
    hi: string;
  };
  positiveMark?: number;
  negativeMark?: number;
}

export interface Section {
  id: string;
  name: string;
  orderIndex: number;
  positiveMark: number;
  negativeMark: number;
  durationSeconds?: number; // Set when sectional timing is enabled
}

export interface ActiveSession {
  sessionId: string;
  testId: string;
  testTitle: string;
  testCategory?: string;
  testSubcategory?: string;
  totalDurationSeconds: number;
  sections: Section[];
  questions: Question[];
  hasSectionalTiming?: boolean; // When true, lock users per section with per-section countdown
  lockSectionOnSubmit?: boolean; // When true, total test duration applies, and submitting a section advances and locks previous sections
}

export type PaletteState = 1 | 2 | 3 | 4 | 5;

export interface QuestionResponse {
  questionId: string;
  selectedOptionIndex: number | null; // Saved option index
  tempOptionIndex: number | null;     // Unsaved selection (active UI radio button state)
  state: PaletteState;
  elapsedSeconds: number;
}

export interface MockTestItem {
  id: string;
  title: string;
  titleHi?: string;
  questionsCount: number;
  durationMinutes: number;
  maxMarks: number;
  isPremium: boolean;
  requiredTier: 'None' | 'Testbook Pass' | 'Testbook Pass Pro';
  hasSectionalTiming?: boolean;
  sectionalTimings?: number[]; // minutes per section, e.g. [20, 20, 20]
  lockSectionOnSubmit?: boolean;
  testbookTotalUsers?: number;
  testbookTopperScore?: number;
  testbookAverageScore?: number;
  testbookCutoffScore?: number;
  positiveMarks?: number;
  negativeMarks?: number;
  sections?: any[];
}

export interface TestSubSubCategory {
  id: string;
  name: string;
  nameHi?: string;
  titleHi?: string;
  tests: MockTestItem[];
}

export interface TestSubCategory {
  id: string;
  name: string;
  nameHi?: string;
  logoUrl?: string;
  subSubCategories: TestSubSubCategory[];
  tests: MockTestItem[];
}

export interface TestCategory {
  id: string;
  name: string;
  nameHi?: string;
  logoUrl?: string;
  isPopular?: boolean;
  isPracticeSeries?: boolean;
  description?: string;
  countText?: string;
  subCategories: TestSubCategory[];
  tests?: MockTestItem[];
}

export interface MockTestRecord {
  id: string;
  testId?: string;
  title: string;
  score: number;
  maxScore: number;
  accuracy: number;
  durationSeconds: number;
  status: 'COMPLETED' | 'AUTO_SUBMITTED' | 'ONGOING';
  violations: number;
  date: string;
  startedAt?: string;
  completedAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
  positiveMarks?: number | null;
  negativeMarks?: number | null;
  responses?: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number; }>;
  timeRemaining?: number;
  currentSectionIndex?: number;
  currentQuestionIndex?: number;
  testbookRank?: number | null;
  testbookPercentile?: number | null;
  mockTest?: any;
}

export interface Notice {
  id: string;
  title: string;
  titleHi?: string;
  date: string;
  publishDate: string; // YYYY-MM-DD
  type: string;
  category: 'notice' | 'result' | 'admit_card' | 'announcement' | 'testimonial' | 'answer_key';
  url?: string;
  rawUrl?: string;
  lastDate?: string; // e.g. "10 July 2026"
  imageUrl?: string;
  contentHtml?: string;
}

export interface TrackedJob {
  noticeId: string;
  title: string;
  category: string;
  date: string;
  lastDate?: string;
  isSaved?: boolean;
  isApplied?: boolean;
  appliedDate?: string;
  applicationNo?: string;
  password?: string;
  rollNumber?: string;
  examDate?: string;
  examCenter?: string;
  shiftTime?: string;
  officialPortalUrl?: string;
  driveFolderId?: string;
  driveFolderLink?: string;
  notes?: string;
  updatedAt: string;
}

export interface MockUser {
  id: string;
  /** Website tour: null = new user who has not finished the welcome tour; undefined = unknown */
  tourCompletedAt?: string | null;
  /** Notices page tour: null = not finished yet; undefined = unknown */
  noticesTourCompletedAt?: string | null;
  /** Test series page tour: null = not finished yet; undefined = unknown */
  testsTourCompletedAt?: string | null;
  /** Typing tests tour: null = not finished yet; undefined = unknown */
  typingTourCompletedAt?: string | null;
  /** Document locker tour: null = not finished yet; undefined = unknown */
  lockerTourCompletedAt?: string | null;
  /** Account/profile page tour: null = not finished yet; undefined = unknown */
  profileTourCompletedAt?: string | null;
  currentSessionId?: string;
  candidateCode: string;
  name: string;
  email: string;
  mobile: string;
  referralCode: string;
  referredBy: string | null;
  referralsCount: number;
  role: 'STUDENT' | 'ADMIN' | 'TEST_CREATOR' | 'SUPPORT_TEAM' | 'NOTICES_MANAGER';
  subscriptionTier: 'None' | 'Testbook Pass' | 'Testbook Pass Pro';
  subscriptionPurchasedAt: string | null;
  subscriptionExpiresAt: string | null;
  registeredDate: string;
  testSessions: MockTestRecord[];
  bookmarkedQuestions?: { testId: string; questionId: string; }[];
  password?: string;
  isBlocked?: boolean;
  coins: number;
  referralCoinsCredited: boolean;
  lastSeen?: string | null;
  lastPlatform?: string | null;
  trackedJobs?: TrackedJob[];
  lockerPin?: string | null;
  lockerPinSetAt?: string | null;
  isLockerConnected?: boolean;
  googleDriveEmail?: string | null;
  googleDriveFolderId?: string | null;
}
