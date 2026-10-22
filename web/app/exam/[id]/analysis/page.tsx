"use client";

import { buildTestSeriesPath } from '../../../lib/testSeriesUrl';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth, MockUser, MockTestRecord } from '../../../AuthContext';
import { generateExamSession, EXPLANATIONS } from '../../../lib/examUtils';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIsMobile } from '../../../useIsMobile';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Globe,
  Sun,
  Moon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Award,
  Timer,
  Bookmark,
  Trophy,
  History as HistoryIcon,
  User,
  Clock,
  Check,
  Menu,
  BookOpen
} from 'lucide-react';
import { SiteHeader, SiteFooter, SectionCard, StatusBadge, btnPrimary, btnSecondary, pageBg, container } from '../../../components/SiteUI';
import { TRANSLATIONS } from '../../../translations';

import { processQuestionHtml, decodeHtml } from '../../../lib/mathUtils';
import MathJaxText from '../../../lib/MathJaxText';
import MathJaxLoader from '../../../components/MathJaxLoader';
import { useOfflineMock } from '../../../lib/offlineExam';
import OfflineBookmarkBadge from '../../../components/OfflineBookmarkBadge';
import ShareScorecardButton from '../../../components/ShareScorecard';
import FriendsRoomsForTest from '../../../friends/FriendsRoomsForTest';

// -----------------------------------------------------------------------------
// RRB NTPC CBAT (Psycho Test) — T-Score result display
// -----------------------------------------------------------------------------
// Scoped to exactly one exam: Station Master CBAT (Psycho Test)
// (exam id: rrb_ntpc_cbat__psycho_test__iayf). Nothing here affects any other
// exam's result page.
//
// IMPORTANT — this is an ESTIMATE, not the official RRB T-score. The real
// T-score formula (T = 50 + 10 × ((Raw − Mean) / SD)) needs the Mean and SD
// of every candidate who sat that exact exam shift — data only RRB has after
// the fact. A practice platform has no such population to draw from, so the
// Mean/SD below are assumed reference values, not measured ones. The UI must
// always label this clearly so it's never mistaken for the real exam-day score.
const CBAT_EXAM_ID = 'rrb_ntpc_cbat__psycho_test__iayf';
const CBAT_QUALIFYING_TSCORE = 42;

interface CbatSectionConfig { maxMarks: number; mean: number; sd: number; }
const CBAT_TSCORE_CONFIG: Record<string, CbatSectionConfig> = {
  'Classification Test': { maxMarks: 35, mean: 28, sd: 35 * 0.25 },
  'Add of Odd Numbers Test': { maxMarks: 30, mean: 15, sd: 30 * 0.25 },
  'Short Route Test': { maxMarks: 40, mean: 22, sd: 40 * 0.25 },
  'Information Ordering Type -I': { maxMarks: 25, mean: 20, sd: 25 * 0.25 },
  'Personality Test': { maxMarks: 35, mean: 30, sd: 35 * 0.25 },
};
const CBAT_MAX_TSCORE_PER_BATTERY = 80; // conventional ceiling used for the composite/merit scale
const CBAT_MAX_COMPOSITE = CBAT_MAX_TSCORE_PER_BATTERY * Object.keys(CBAT_TSCORE_CONFIG).length;

function computeTScore(raw: number, mean: number, sd: number): number {
  if (!sd) return 50;
  return 50 + 10 * ((raw - mean) / sd);
}

function matchCbatBattery(name: string): string | null {
  const lower = (name || '').toLowerCase();
  if (lower.includes('classif') || lower.includes('intelligence') || lower.includes('वर्गीकरण') || lower.includes('बुद्धि')) {
    return 'Classification Test';
  }
  if (lower.includes('odd') || lower.includes('attention') || lower.includes('विषम') || lower.includes('ध्यान')) {
    return 'Add of Odd Numbers Test';
  }
  if (lower.includes('route') || lower.includes('spatial') || lower.includes('मार्ग') || lower.includes('स्थानिक') || lower.includes('नक्शा')) {
    return 'Short Route Test';
  }
  if (lower.includes('order') || lower.includes('information') || lower.includes('सूचना') || lower.includes('क्रम')) {
    return 'Information Ordering Type -I';
  }
  if (lower.includes('personality') || lower.includes('व्यक्तित्व')) {
    return 'Personality Test';
  }
  return null;
}

export default function ExamSolutionAnalysisPage() {
  const params = useParams();
  // Offline (Windows app): attempts and questions come from the downloaded package
  const offline = useOfflineMock();
  const testId = offline?.testId || (params?.id as string) || "ssc_cgl_tier1";
  const { currentUser, theme, toggleTheme, toggleBookmark, language, setLanguage, reportQuestion, examCatalog: liveCatalog } = useAuth();
  const examCatalog = offline?.catalog || liveCatalog;
  const router = useRouter();
  const { isMobile } = useIsMobile();

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [mounted, setMounted] = useState(false);
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState(0);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportQuestionId, setReportQuestionId] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [reportingError, setReportingError] = useState('');
  const [reportingSuccess, setReportingSuccess] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [customQs, setCustomQs] = useState<any>(null);
  const [loadingCustomQs, setLoadingCustomQs] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState<'analysis' | 'solutions'>('analysis');
  const [viewMode, setViewMode] = useState<'analysis' | 'solution'>('analysis');
  const [questionFontSize, setQuestionFontSize] = useState(14); // default 14px
  // Login/refresh always return responses: {} to keep egress low (a user's full history can be
  // thousands of response rows). This lazily backfills the real answers for whichever one
  // attempt is currently open, via the get-session-responses endpoint. Without it, this page's
  // hasActualResponses check sees {} and falls back to reconstructing FAKE, seeded
  // correct/incorrect/skipped statuses — which then also feeds a wrong section-wise score.
  const [fetchedResponses, setFetchedResponses] = useState<Record<string, Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number; state?: number }>>>({});

  const getAttemptLabel = (idx: number, total: number, attemptLang: 'en' | 'hi' = 'en') => {
    if (idx === 0) {
      return attemptLang === 'hi' ? 'वर्तमान प्रयास' : 'Current Attempt';
    } else if (idx === 1) {
      return attemptLang === 'hi' ? 'पिछला प्रयास' : 'Previous Attempt';
    } else if (idx === 2) {
      return attemptLang === 'hi' ? 'दूसरा प्रयास' : 'Second Previous';
    }
    return attemptLang === 'hi' ? `प्रयास ${idx + 1}` : `Attempt ${idx + 1}`;
  };
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 40) {
      if (diffX > 0) {
        // Swipe right -> Previous question
        setActiveQuestionIdx(prev => Math.max(0, prev - 1));
      } else {
        // Swipe left -> Next question
        setActiveQuestionIdx(prev => Math.min(totalQs - 1, prev + 1));
      }
    }
  };

  const handleTabClick = (tab: 'analysis' | 'solutions') => {
    setActiveMobileTab(tab);
    if (typeof window !== 'undefined') {
      if (tab === 'solutions') {
        window.location.hash = 'solutions';
      } else {
        if (window.location.hash === '#solutions') {
          window.history.back();
        }
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const isSolutionsHash = window.location.hash === '#solutions';
      setActiveMobileTab(isSolutionsHash ? 'solutions' : 'analysis');
    };

    window.addEventListener('hashchange', handleHashChange);

    // Initial check
    if (window.location.hash === '#solutions') {
      setActiveMobileTab('solutions');
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const t = TRANSLATIONS[lang];

  // Find test context in catalog to redirect back precisely
  const getCatalogContext = () => {
    if (!examCatalog || !testId) return null;
    for (const cat of examCatalog) {
      for (const sub of cat.subCategories || []) {
        if (sub.subSubCategories) {
          for (const subSub of sub.subSubCategories) {
            const found = subSub.tests?.some(t => t.id === testId);
            if (found) {
              return {
                categoryId: cat.id,
                subCategoryId: sub.id,
                subSubCategoryId: subSub.id
              };
            }
          }
        }
        if (sub.tests) {
          const found = sub.tests.some(t => t.id === testId);
          if (found) {
            return {
              categoryId: cat.id,
              subCategoryId: sub.id,
              subSubCategoryId: null
            };
          }
        }
      }
    }
    return null;
  };

  const handleBackToTestSeries = () => {
    const context = getCatalogContext();
    if (context) {
      const { categoryId, subCategoryId, subSubCategoryId } = context;
      router.push(buildTestSeriesPath(categoryId, subCategoryId, subSubCategoryId));
    } else {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push('/mock-tests');
      }
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync selector language with auth context
  useEffect(() => {
    if (language) {
      setLang(language);
    }
  }, [language]);

  const handleLangChange = (newLang: 'en' | 'hi') => {
    setLang(newLang);
    setLanguage(newLang);
  };

  // Load completed sessions for this testId
  const attempts: MockTestRecord[] = offline ? (offline.attempts as MockTestRecord[]) : currentUser
    ? (currentUser.testSessions || []).filter(
        s => (s.testId === testId || s.title.toLowerCase().includes(testId.replace(/_/g, ' '))) &&
             (s.status === 'COMPLETED' || s.status === 'AUTO_SUBMITTED')
      )
    : [];

  const selectedRecId = attempts[selectedAttemptIdx]?.id;
  const selectedRecHasResponses = !!(
    attempts[selectedAttemptIdx]?.responses &&
    Object.keys(attempts[selectedAttemptIdx].responses).length > 0
  );

  useEffect(() => {
    if (offline || !currentUser?.id || !selectedRecId || selectedRecHasResponses || fetchedResponses[selectedRecId]) return;
    let cancelled = false;
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-session-responses', data: { userId: currentUser.id, sessionId: selectedRecId } })
    })
      .then(res => res.json())
      .then(resData => {
        if (!cancelled && resData.success && resData.responses) {
          setFetchedResponses(prev => ({ ...prev, [selectedRecId]: resData.responses }));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser?.id, selectedRecId, selectedRecHasResponses, fetchedResponses]);

  useEffect(() => {
    setMounted(true);

    const fetchCustomQuestions = async () => {
      if (offline) { setCustomQs(offline.customQs); setLoadingCustomQs(false); return; }
      try {
        // Answers come only once the attempt is saved on the server; if this page opened a
        // moment before that, ask again briefly.
        let data: any = null;
        for (let tryNo = 0; tryNo < 4; tryNo++) {
          const res = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'get-custom-questions',
              data: { testId }
            })
          });
          data = await res.json();
          if (!data?.success || data.answersIncluded !== false || !data.questions) break;
          await new Promise(r => setTimeout(r, 1500));
        }
        if (data.success && data.questions) {
          setCustomQs({
            questions: data.questions,
            positiveMarks: data.positiveMarks,
            negativeMarks: data.negativeMarks,
            durationMinutes: data.durationMinutes,
            questionsCount: data.questionsCount,
            maxMarks: data.maxMarks,
            hasSectionalTiming: data.hasSectionalTiming,
            sectionalTimings: data.sectionalTimings,
            sections: data.sections,
          });
        }
      } catch (err) {
        console.error("Error fetching custom questions:", err);
      } finally {
        setLoadingCustomQs(false);
      }
    };
    fetchCustomQuestions();
  }, [testId]);

  // Initialize to latest attempt index once attempts load
  useEffect(() => {
    if (attempts.length > 0) {
      setSelectedAttemptIdx(0);
    }
  }, [attempts.length]);

  // Generate a safe activeQuestionId for MathJax effect hook at the top level
  const tempSession = (currentUser && attempts[selectedAttemptIdx]) ? generateExamSession(testId, examCatalog, customQs) : null;
  const tempQuestions = tempSession?.questions || [];
  const activeQuestionId = tempQuestions[activeQuestionIdx]?.id;


  if (!mounted || loadingCustomQs) {
    return (
      <div className={`min-h-screen flex flex-col ${pageBg} font-sans`}>
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1e4e79] border-t-transparent mx-auto"></div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading analysis…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex flex-col ${pageBg} font-sans`}>
        <SiteHeader />
        <div className={`${container} w-full flex-1 py-16`}>
          <SectionCard className="max-w-md mx-auto">
            <div className="text-center py-4 space-y-3">
              <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Login required</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Please log in to your account to review solutions and mock test statistics.</p>
              <Link href="/auth" className={btnPrimary}>Log in</Link>
            </div>
          </SectionCard>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const sessionRecord = attempts[selectedAttemptIdx];
  // The real per-question responses, once the lazy-load effect above has backfilled them —
  // sessionRecord.responses itself stays {} (it's a snapshot from login/refresh) until then.
  const effectiveResponses = selectedRecHasResponses
    ? sessionRecord.responses
    : (fetchedResponses[sessionRecord?.id ?? ''] ?? {});
  const cutoffScore = sessionRecord?.mockTest?.testbookCutoffScore || 120;
  const isCutoffCleared = sessionRecord ? sessionRecord.score >= cutoffScore : false;

  if (!sessionRecord) {
    return (
      <div className={`min-h-screen flex flex-col ${pageBg} font-sans`}>
        <SiteHeader />
        <div className={`${container} w-full flex-1 py-16`}>
          <SectionCard className="max-w-md mx-auto">
            <div className="text-center py-4 space-y-3">
              <ShieldAlert className="h-8 w-8 text-slate-400 mx-auto" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">No attempts found</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You have not attempted this test yet, or the attempt was cleared by an administrator. Please take the mock test first.
              </p>
              <div className="flex gap-2 justify-center pt-1">
                <Link href="/mock-tests" className={btnSecondary}>Browse tests</Link>
                <Link href={offline ? offline.examHref : `/exam/${testId}`} className={btnPrimary}>Start test</Link>
              </div>
            </div>
          </SectionCard>
        </div>
        <SiteFooter />
      </div>
    );
  }

  // Generate the exam session questions list
  const examSession = generateExamSession(testId, examCatalog, customQs);
  const questions = examSession.questions;

  // RPSC RAS detection — mirrors the exact logic used at attempt time in exam/[id]/page.tsx.
  // Needed here because RPSC RAS scores unattempted questions differently (see below), and
  // without this the section-wise breakdown disagrees with the authoritative sessionRecord.score.
  const isRpscRasMode = (() => {
    const idLower = (testId || '').toLowerCase();
    const titleLower = (examSession.testTitle || '').toLowerCase();
    const catLower = (examSession.testCategory || '').toLowerCase();
    const subLower = (examSession.testSubcategory || '').toLowerCase();
    return (
      (catLower.includes('rpsc') && (subLower.includes('ras') || titleLower.includes('ras'))) ||
      idLower.includes('rpsc_ras') ||
      idLower.includes('rpsc-ras') ||
      idLower.includes('rpsc__ras') ||
      (titleLower.includes('rpsc') && (titleLower.includes('ras') || titleLower.includes('prelim'))) ||
      (titleLower.includes('ras') && (titleLower.includes('prelim') || titleLower.includes('full') || titleLower.includes('pyq') || titleLower.includes('paper')))
    );
  })();

  // Reconstruct deterministic student responses based on accuracy & score using user+session ID seed
  let seed = 0;
  const seedString = currentUser.id + sessionRecord.id;
  for (let i = 0; i < seedString.length; i++) {
    seed += seedString.charCodeAt(i);
  }
  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  // Determine correct vs incorrect count based on session accuracy and total questions
  const totalQs = questions.length;
  let correctCount = Math.round(totalQs * (sessionRecord.accuracy / 100));
  correctCount = Math.max(0, Math.min(totalQs, correctCount));

  // Deterministically shuffle question indices to mark them correct / incorrect / skipped
  const shuffledIndices = Array.from({ length: totalQs }, (_, i) => i);
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = Math.floor(pseudoRandom() * (i + 1));
    const temp = shuffledIndices[i];
    shuffledIndices[i] = shuffledIndices[j];
    shuffledIndices[j] = temp;
  }

  const correctIndices = new Set(shuffledIndices.slice(0, correctCount));
  // Let's decide if any of the remaining are skipped (unattempted)
  const skippedIndices = new Set<number>();
  // If score is lower than positive mark of all correct questions, we must have had some incorrects.
  // Let's assume some are skipped.
  shuffledIndices.slice(correctCount).forEach((idx, i) => {
    // Make roughly half of incorrects skipped, unless accuracy is high
    if (i % 2 === 0 && sessionRecord.accuracy < 80) {
      skippedIndices.add(idx);
    }
  });

  const hasActualResponses = effectiveResponses && Object.keys(effectiveResponses).length > 0;

  const questionStatuses = questions.map((q, idx) => {
    if (hasActualResponses && effectiveResponses[q.id]) {
      const resp = effectiveResponses[q.id];
      const userSelectedOptionIndex = resp.selectedOptionIndex ?? -1;
      let status: 'correct' | 'incorrect' | 'skipped' = 'skipped';
      if (userSelectedOptionIndex === -1 || userSelectedOptionIndex === null) {
        status = 'skipped';
      } else if (isRpscRasMode && userSelectedOptionIndex === 4) {
        // RPSC RAS option index 4 = "Leave Question Unattempted" — not a wrong answer,
        // must not be scored as incorrect (matches the SUBMIT_EXAM rule at attempt time).
        status = 'skipped';
      } else if (userSelectedOptionIndex === q.correctOptionIndex) {
        status = 'correct';
      } else {
        status = 'incorrect';
      }
      return {
        questionId: q.id,
        status,
        userSelectedOptionIndex
      };
    }

    const isCorrect = correctIndices.has(idx);
    const isSkipped = skippedIndices.has(idx);
    
    let userSelectedOptionIndex = -1;
    let status: 'correct' | 'incorrect' | 'skipped' = 'skipped';

    if (isCorrect) {
      userSelectedOptionIndex = q.correctOptionIndex;
      status = 'correct';
    } else if (!isSkipped) {
      // Pick a wrong option index
      userSelectedOptionIndex = (q.correctOptionIndex + 1) % 4;
      status = 'incorrect';
    }

    return {
      questionId: q.id,
      status,
      userSelectedOptionIndex
    };
  });

  const sectionalAnalysis = (() => {
    // Resolve admin-configured marks for this test from the catalog or custom metadata
    let catalogPositiveMark = 2;
    let catalogNegativeMark = 0.5;

    const lowerId = (testId || '').toLowerCase();
    if (lowerId.includes('ctet')) {
      catalogPositiveMark = 1;
      catalogNegativeMark = 0;
    } else if (lowerId.includes('rpsc') || lowerId.includes('ras')) {
      catalogPositiveMark = 1.33;
      catalogNegativeMark = 0.44;
    } else if (lowerId.includes('rrb') || lowerId.includes('railway')) {
      catalogPositiveMark = 1;
      catalogNegativeMark = 0.33;
    }

    if (customQs && typeof customQs === 'object' && !Array.isArray(customQs)) {
      if (customQs.positiveMarks !== undefined && customQs.positiveMarks !== null) {
        catalogPositiveMark = Number(customQs.positiveMarks);
      }
      if (customQs.negativeMarks !== undefined && customQs.negativeMarks !== null) {
        catalogNegativeMark = Number(customQs.negativeMarks);
      }
    }

    for (const cat of (examCatalog || [])) {
      for (const sub of (cat.subCategories || [])) {
        const directTest = (sub.tests || []).find((t: any) => t.id === testId);
        if (directTest) {
          if (directTest.positiveMarks !== undefined) catalogPositiveMark = Number(directTest.positiveMarks);
          if (directTest.negativeMarks !== undefined) catalogNegativeMark = Number(directTest.negativeMarks);
        }
        for (const subsub of (sub.subSubCategories || [])) {
          const subsubTest = (subsub.tests || []).find((t: any) => t.id === testId);
          if (subsubTest) {
            if (subsubTest.positiveMarks !== undefined) catalogPositiveMark = Number(subsubTest.positiveMarks);
            if (subsubTest.negativeMarks !== undefined) catalogNegativeMark = Number(subsubTest.negativeMarks);
          }
        }
      }
    }

    const sectionsList = examSession.sections || [];

    // Build a map of sectionId -> { name, positiveMark, negativeMark }
    // Use section-level marks if set; otherwise use test-level catalog marks
    const sectionInfoMap: Record<string, { name: string; positiveMark: number; negativeMark: number }> = {};
    sectionsList.forEach(s => {
      sectionInfoMap[s.id] = {
        name: s.name,
        positiveMark: (s.positiveMark !== undefined && s.positiveMark !== null) ? Number(s.positiveMark) : catalogPositiveMark,
        negativeMark: (s.negativeMark !== undefined && s.negativeMark !== null) ? Number(s.negativeMark) : catalogNegativeMark,
      };
    });

    const getSectionInfo = (secId: string) => {
      if (sectionInfoMap[secId]) return sectionInfoMap[secId];
      // Fallback: use catalog marks for unknown sections
      return {
        name: secId ? secId.replace(/sec_/, '').toUpperCase() : 'General Section',
        positiveMark: catalogPositiveMark,
        negativeMark: catalogNegativeMark,
      };
    };

    const sectionsMap: Record<string, {
      name: string;
      total: number;
      attempted: number;
      correct: number;
      incorrect: number;
      unattempted: number;
      score: number;
      positiveMark: number;
      negativeMark: number;
    }> = {};

    questions.forEach((q, idx) => {
      const info = getSectionInfo(q.sectionId);
      const secName = info.name;
      if (!sectionsMap[secName]) {
        sectionsMap[secName] = {
          name: secName,
          total: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          unattempted: 0,
          score: 0,
          positiveMark: info.positiveMark,
          negativeMark: info.negativeMark,
        };
      }

      const stats = sectionsMap[secName];
      stats.total++;

      const userStatus = questionStatuses[idx];
      const selectedIdx = userStatus ? userStatus.userSelectedOptionIndex : -1;

      const qPos = (q.positiveMark !== undefined && q.positiveMark !== null) ? Number(q.positiveMark) : info.positiveMark;
      const qNeg = (q.negativeMark !== undefined && q.negativeMark !== null) ? Number(q.negativeMark) : info.negativeMark;

      if (userStatus && userStatus.status === 'skipped') {
        stats.unattempted++;
        // RPSC RAS applies a penalty to questions left genuinely blank (but NOT to ones
        // where the candidate explicitly chose option index 4, "Leave Question Unattempted")
        // — this must mirror SUBMIT_EXAM's rule exactly or this section total silently
        // disagrees with the overall score shown at the top of this same page.
        if (isRpscRasMode && selectedIdx !== 4) {
          const rpscPenalty = qNeg > 0 ? qNeg : 0.44;
          stats.incorrect++;
          stats.score -= rpscPenalty;
          stats.score = Math.round(stats.score * 100) / 100;
        }
      } else if (userStatus) {
        stats.attempted++;
        if (userStatus.status === 'correct') {
          stats.correct++;
          stats.score += qPos;
        } else {
          stats.incorrect++;
          stats.score -= qNeg;
        }
        stats.score = Math.round(stats.score * 100) / 100;
      }
    });

    return Object.values(sectionsMap);
  })();

  // Station Master CBAT (Psycho Test) detection
  const isCbatExam = (() => {
    const idLower = (testId || '').toLowerCase();
    const titleLower = (examSession.testTitle || '').toLowerCase();
    const catLower = (examSession.testCategory || '').toLowerCase();
    const subLower = (examSession.testSubcategory || '').toLowerCase();
    const context = getCatalogContext();
    if (context?.subCategoryId === CBAT_EXAM_ID) return true;
    if (idLower.includes('cbat') || titleLower.includes('cbat') || subLower.includes('cbat') || catLower.includes('cbat')) return true;
    if (idLower.includes('psycho') || titleLower.includes('psycho') || subLower.includes('psycho') || catLower.includes('psycho')) return true;
    if (customQs?.subCategoryId === CBAT_EXAM_ID || customQs?.examId === CBAT_EXAM_ID) return true;
    return false;
  })();

  const cbatTScoreResult = isCbatExam ? (() => {
    const titleLower = (examSession.testTitle || '').toLowerCase();
    const idLower = (testId || '').toLowerCase();

    // Determine if this is a Full CBAT Mock Test (all batteries)
    // or an individual sectional battery test (Classification, Short Route, etc.)
    const matchedBatteries = new Set<string>();
    for (const s of sectionalAnalysis) {
      const bat = matchCbatBattery(s.name);
      if (bat) matchedBatteries.add(bat);
    }

    const isFullCbat = (
      titleLower.includes('full') ||
      idLower.includes('full') ||
      titleLower.includes('complete') ||
      idLower.includes('complete') ||
      matchedBatteries.size >= 3 ||
      sectionalAnalysis.length >= 4
    );

    if (isFullCbat) {
      // FULL CBAT TEST: Show all 5 sections, Composite T-Score, Merit Scale, and Overall Result
      const sections = Object.keys(CBAT_TSCORE_CONFIG).map(sectionName => {
        const cfg = CBAT_TSCORE_CONFIG[sectionName];
        const sec = sectionalAnalysis.find(s => s.name === sectionName || matchCbatBattery(s.name) === sectionName);
        const rawScore = sec?.correct ?? 0;
        const maxMarks = sec?.total || cfg.maxMarks;
        const tScore = Math.round(computeTScore(rawScore, cfg.mean, cfg.sd) * 10) / 10;
        return {
          name: sectionName,
          rawScore,
          maxMarks,
          tScore,
          qualified: tScore >= CBAT_QUALIFYING_TSCORE,
        };
      });
      const compositeTScore = Math.round(sections.reduce((sum, s) => sum + s.tScore, 0) * 10) / 10;
      const meritScoreOutOf30 = Math.round((compositeTScore / CBAT_MAX_COMPOSITE) * 30 * 100) / 100;
      const overallQualified = sections.every(s => s.qualified);
      return { isFullCbat: true, sections, compositeTScore, meritScoreOutOf30, overallQualified };
    } else {
      // INDIVIDUAL SECTIONAL BATTERY TEST: Only show that specific section's T-Score!
      let targetBatteryKey: string | null = null;
      const matchedSection = sectionalAnalysis.find(s => {
        const bat = matchCbatBattery(s.name);
        if (bat) {
          targetBatteryKey = bat;
          return true;
        }
        return false;
      });

      // If section name didn't match directly, infer from test title or testId
      if (!targetBatteryKey) {
        targetBatteryKey = matchCbatBattery(examSession.testTitle) || matchCbatBattery(testId);
      }

      // If still not matched, fall back to first battery key
      if (!targetBatteryKey && Object.keys(CBAT_TSCORE_CONFIG).length > 0) {
        targetBatteryKey = Object.keys(CBAT_TSCORE_CONFIG)[0];
      }

      const cfg = targetBatteryKey ? CBAT_TSCORE_CONFIG[targetBatteryKey] : null;
      if (!cfg || !targetBatteryKey) return null;

      const sec = matchedSection || sectionalAnalysis[0];
      const rawScore = sec?.correct ?? 0;
      const maxMarks = sec?.total || cfg.maxMarks;
      const tScore = Math.round(computeTScore(rawScore, cfg.mean, cfg.sd) * 10) / 10;
      const qualified = tScore >= CBAT_QUALIFYING_TSCORE;

      const sectionResult = {
        name: targetBatteryKey,
        rawScore,
        maxMarks,
        tScore,
        qualified,
      };

      return {
        isFullCbat: false,
        sections: [sectionResult],
        compositeTScore: tScore,
        meritScoreOutOf30: 0,
        overallQualified: qualified,
      };
    }
  })() : null;

  const activeQuestion = questions[activeQuestionIdx];
  const activeStatus = questionStatuses[activeQuestionIdx];

  // Calculate question time statistics and bookmark state
  // Only show actual elapsed seconds — never fall back to fake random values
  const userTime = effectiveResponses?.[activeQuestion.id]?.elapsedSeconds ?? 0;
  const isBookmarked = currentUser.bookmarkedQuestions?.some(b => b.testId === testId && b.questionId === activeQuestion.id) || false;

  const activeExplanation = EXPLANATIONS[activeQuestion.id] || activeQuestion.explanation || {
    en: "Detailed solution step-by-step is currently under verification by subject experts.",
    hi: "विषय विशेषज्ञों द्वारा विस्तृत समाधान वर्तमान में सत्यापन के अधीन है।"
  };

  // Report modal states & handlers (hooks are declared at the top of the component)

  const handleOpenReportModal = (qId: string) => {
    setReportQuestionId(qId);
    setReportMessage('');
    setReportingError('');
    setReportingSuccess(false);
    setReportModalOpen(true);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportMessage.trim()) {
      setReportingError(language === 'hi' ? 'कृपया रिपोर्ट संदेश दर्ज करें।' : 'Please enter a report message.');
      return;
    }
    setIsSubmittingReport(true);
    setReportingError('');

    try {
      const qText = activeQuestion.content[lang]?.questionText || activeQuestion.content['en']?.questionText || '';
      const result = await reportQuestion(
        reportQuestionId,
        reportMessage,
        qText,
        testId,
        examSession.testTitle
      );
      if (result.success) {
        setReportingSuccess(true);
        setTimeout(() => {
          setReportModalOpen(false);
        }, 1500);
      } else {
        setReportingError(result.error || (language === 'hi' ? 'सहेजने में विफल।' : 'Failed to save report.'));
      }
    } catch (err: any) {
      setReportingError(err.message || 'An error occurred.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // KPI calculations
  const totalCorrect = questionStatuses.filter(s => s.status === 'correct').length;
  const totalIncorrect = questionStatuses.filter(s => s.status === 'incorrect').length;
  const totalSkipped = questionStatuses.filter(s => s.status === 'skipped').length;

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  // Compute actual time taken:
  // Sum per-question elapsedSeconds from responses — this is the most accurate
  // measure of actual time the user spent actively on questions in this sitting.
  // Fall back to durationSeconds (totalDuration - timeRemaining) if responses aren't available.
  const computedTimeTakenSeconds = (() => {
    if (effectiveResponses && Object.keys(effectiveResponses).length > 0) {
      const total = Object.values(effectiveResponses).reduce(
        (sum, r) => sum + ((r as any).elapsedSeconds ?? 0), 0
      );
      if (total > 0) return total;
    }
    // Fallback: totalDuration - timeRemaining (includes timer-running but not necessarily active time)
    if (sessionRecord.durationSeconds && sessionRecord.durationSeconds > 0) {
      return sessionRecord.durationSeconds;
    }
    return 0;
  })();

  const currentSectionIndex = (() => {
    if (!activeQuestion) return 0;
    const idx = examSession.sections.findIndex(s => s.id === activeQuestion.sectionId);
    return idx >= 0 ? idx : 0;
  })();
  const currentSection = examSession.sections[currentSectionIndex] || examSession.sections[0];
  const currentSectionQuestions = questions.filter(q => q.sectionId === currentSection.id);
  const currentQuestionIndex = currentSectionQuestions.findIndex(q => q.id === activeQuestion.id);

  const counts = (() => {
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    questions.forEach((q) => {
      const stat = questionStatuses.find(s => s.questionId === q.id);
      if (!stat || stat.status === 'skipped') {
        skipped++;
      } else if (stat.status === 'correct') {
        correct++;
      } else {
        incorrect++;
      }
    });
    return { correct, incorrect, skipped };
  })();

  const isSolutionView = viewMode === 'solution' && !isMobile;
  const isHi = language === 'hi';
  const totals = sectionalAnalysis.reduce(
    (acc, sec) => ({ correct: acc.correct + sec.correct, incorrect: acc.incorrect + sec.incorrect, unattempted: acc.unattempted + sec.unattempted }),
    { correct: 0, incorrect: 0, unattempted: 0 }
  );
  const scorePct = sessionRecord.maxScore > 0 ? Math.min(100, Math.max(0, (sessionRecord.score / sessionRecord.maxScore) * 100)) : 0;
  const switchSection = (sectionIdx: number) => {
    const sec = examSession.sections[sectionIdx];
    if (!sec) return;
    const firstQIdx = questions.findIndex(q => q.sectionId === sec.id);
    if (firstQIdx >= 0) {
      setActiveQuestionIdx(firstQIdx);
    }
  };
  if (!mounted) return null;

  return (
    <div className={isSolutionView
      ? "flex h-screen w-screen flex-col overflow-hidden bg-slate-200/90 dark:bg-slate-950 font-sans select-none text-xs leading-normal text-slate-800 dark:text-slate-200"
      : `flex-1 flex flex-col ${pageBg} font-sans min-h-screen select-none ${viewMode === 'solution' ? 'pb-16' : ''}`
    }>
      <MathJaxLoader />

      {/* 1. NAVIGATION BAR */}
      {isSolutionView ? (
        <header className="flex h-[72px] items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-300 px-4 text-slate-800 shrink-0 select-none">
          {/* Left Part: Back to Test Series + Mocktest Hub Logo & small sub-title */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleBackToTestSeries}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs tracking-wide transition cursor-pointer active:scale-95 shrink-0 shadow-2xs"
              title={language === 'hi' ? 'टेस्ट सीरीज पर वापस जाएं' : 'Back to Test Series'}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{language === 'hi' ? 'टेस्ट सीरीज' : 'Test Series'}</span>
            </button>
            <div className="flex flex-col items-start justify-center min-w-0">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-5 w-5 text-blue-600 shrink-0" />
                <span className="font-black text-xs tracking-wider text-slate-900 uppercase leading-none">Mock Test Hub</span>
              </div>
              <span className="text-[9px] text-slate-500 font-bold mt-1 truncate max-w-[150px]">
                {examSession.testTitle}
              </span>
            </div>
          </div>

          {/* Center: Test Name + Zoom Buttons + Hub ID */}
          <div className="flex-1 flex flex-col items-center justify-center px-2 min-w-0">
            <span className="font-extrabold text-[11px] sm:text-[12px] text-slate-900 text-center leading-snug line-clamp-2 w-full">
              {examSession.testTitle}
            </span>
            <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
              <button type="button" onClick={() => setQuestionFontSize(s => Math.min(s + 2, 24))} className="bg-[#1a6baf] hover:bg-[#155a96] text-white text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer active:scale-95 transition-all">Zoom (+)</button>
              <button type="button" onClick={() => setQuestionFontSize(s => Math.max(s - 2, 10))} className="bg-[#1a6baf] hover:bg-[#155a96] text-white text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer active:scale-95 transition-all">Zoom (-)</button>
              <button
                type="button"
                onClick={() => {
                  const newLang = lang === 'en' ? 'hi' : 'en';
                  setLang(newLang);
                  if (setLanguage) setLanguage(newLang);
                }}
                className="bg-[#1a6baf] hover:bg-[#155a96] text-white text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                title="Change Question Language"
              >
                <Globe className="h-3 w-3" />
                <span>{lang === 'en' ? 'हिंदी (अ)' : 'English (E)'}</span>
              </button>
              <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">Hub ID : {currentUser?.candidateCode || currentUser?.id?.slice(0, 12) || 'GUEST_HUB'}</span>
            </div>
          </div>

          {/* Right: Section Time + Profile Photos */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Time Spent</span>
              <span className="font-mono text-sm font-extrabold text-blue-600 tracking-widest">
                {(() => {
                  const m = Math.floor(computedTimeTakenSeconds / 60);
                  const s = computedTimeTakenSeconds % 60;
                  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                })()}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="flex flex-col items-center">
                <div className="h-10 w-9 bg-slate-100 border border-slate-300 rounded flex items-center justify-center text-slate-400"><User className="h-5 w-5" /></div>
                <span className="text-[7px] text-slate-400 leading-tight text-center">Registration<br/>Photo</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-10 w-9 bg-slate-100 border border-slate-300 rounded flex items-center justify-center text-slate-400"><User className="h-5 w-5" /></div>
                <span className="text-[7px] text-slate-400 leading-tight text-center">Captured<br/>Photo</span>
              </div>
            </div>
            <button
              onClick={() => setViewMode('analysis')}
              className="bg-[#2E66CC] hover:bg-[#1a4da6] text-white font-extrabold px-3 py-2 rounded text-[10px] uppercase tracking-wider transition cursor-pointer active:scale-95 shrink-0 ml-2"
            >
              Dashboard
            </button>
          </div>
        </header>
      ) : (
        <>
          <SiteHeader />
          {viewMode === 'analysis' ? (
            <div className="bg-transparent">
              <div className={`${container} pt-6 pb-1`}>
                <nav className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 flex-wrap">
                  <Link href="/" className="hover:text-slate-800 dark:hover:text-slate-200">{isHi ? 'होम' : 'Home'}</Link>
                  <ChevronRight className="h-3 w-3" />
                  <button type="button" onClick={handleBackToTestSeries} className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">{isHi ? 'टेस्ट सीरीज' : 'Test Series'}</button>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-slate-700 dark:text-slate-300">{isHi ? 'परिणाम विश्लेषण' : 'Result analysis'}</span>
                </nav>
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white leading-snug">{examSession.testTitle}</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {getAttemptLabel(selectedAttemptIdx, attempts.length, language)}
                      {sessionRecord.date ? ` · ${sessionRecord.date}` : ''}
                      {' · '}{isHi ? 'समाधान और विश्लेषण' : 'Solutions & analysis'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button type="button" onClick={handleBackToTestSeries} className={btnSecondary}>
                      <ArrowLeft className="h-4 w-4" />
                      {isHi ? 'टेस्ट सीरीज' : 'Back to Test Series'}
                    </button>
                    {!cbatTScoreResult && (
                      <ShareScorecardButton
                        lang={isHi ? 'hi' : 'en'}
                        data={{
                          testTitle: examSession.testTitle,
                          examName: examSession.testSubcategory || examSession.testCategory || undefined,
                          attemptLabel: getAttemptLabel(selectedAttemptIdx, attempts.length, language),
                          date: sessionRecord.date || undefined,
                          studentName: currentUser?.name || (isHi ? 'विद्यार्थी' : 'Student'),
                          candidateCode: (currentUser as any)?.candidateCode || undefined,
                          score: sessionRecord.score,
                          maxScore: sessionRecord.maxScore,
                          accuracy: sessionRecord.accuracy,
                          correct: totals.correct,
                          wrong: totals.incorrect,
                          skipped: totals.unattempted,
                          timeTakenSeconds: computedTimeTakenSeconds,
                          rank: sessionRecord.testbookRank || null,
                          totalCandidates: sessionRecord.mockTest?.testbookTotalUsers || null,
                          percentile: sessionRecord.testbookPercentile ?? null,
                          sections: sectionalAnalysis.map(sec => ({ name: sec.name, score: sec.score, maxScore: sec.total * sec.positiveMark })),
                        }}
                      />
                    )}
                    <label className="inline-flex items-center gap-2 h-9 pl-3 pr-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-600 dark:text-slate-300">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <span className="sr-only">{isHi ? 'प्रश्नों की भाषा' : 'Question language'}</span>
                      <select
                        value={lang}
                        onChange={(e) => handleLangChange(e.target.value as 'en' | 'hi')}
                        className="h-7 bg-transparent text-sm text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                      >
                        <option value="en">English</option>
                        <option value="hi">हिंदी</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => setViewMode('solution')} className={btnPrimary}>
                      <BookOpen className="h-4 w-4" />
                      {isHi ? 'समाधान देखें' : 'View solutions'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                <button type="button" onClick={() => setViewMode('analysis')} className={`${btnSecondary} h-8 px-3 text-xs`}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {isHi ? 'डैशबोर्ड' : 'Dashboard'}
                </button>
                <span className="min-w-0 flex-1 text-sm font-medium text-slate-900 dark:text-white truncate text-center">{examSession.testTitle}</span>
                <select
                  value={lang}
                  onChange={(e) => handleLangChange(e.target.value as 'en' | 'hi')}
                  className="h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                  aria-label="Question language"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}

      {/* 2. MAIN ANALYSIS DASHBOARD */}
      <div className={`${container} w-full py-6 ${viewMode === 'analysis' ? 'block' : 'hidden'}`}>
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] items-start">

          {/* Attempts */}
          <aside className="lg:sticky lg:top-20">
            <SectionCard
              title={isHi ? 'प्रयास' : 'Attempts'}
              description={`${attempts.length} ${attempts.length === 1 ? (isHi ? 'प्रयास' : 'attempt') : (isHi ? 'प्रयास' : 'attempts')}`}
              bodyClass="p-0"
            >
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[calc(100vh-260px)] overflow-y-auto">
                {attempts.map((att, idx) => {
                  const isSelected = selectedAttemptIdx === idx;
                  return (
                    <li key={att.id || idx}>
                      <button
                        type="button"
                        onClick={() => setSelectedAttemptIdx(idx)}
                        className={`w-full text-left px-5 py-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#eef3f8] dark:bg-slate-800/70 shadow-[inset_3px_0_0_0_#1e4e79]'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className={`text-sm ${isSelected ? 'font-semibold text-[#1e4e79] dark:text-blue-300' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
                            {getAttemptLabel(idx, attempts.length, language)}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{att.date || (isHi ? 'हाल ही में' : 'Recent')}</span>
                        </span>
                        <span className="mt-1 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span>{isHi ? 'अंक' : 'Score'} <strong className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{att.score}</strong>/{att.maxScore}</span>
                          <span>{isHi ? 'सटीकता' : 'Accuracy'} <strong className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{att.accuracy}%</strong></span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          </aside>

          <main className="min-w-0 space-y-6">

            {/* Rooms with friends for this test / challenge friends */}
            {!offline && !cbatTScoreResult && <FriendsRoomsForTest testId={testId} hi={isHi} />}

            {/* Score summary */}
            <SectionCard title={isHi ? 'परिणाम सारांश' : 'Result summary'} bodyClass="p-0">
              <dl className="grid grid-cols-2 md:grid-cols-4 divide-slate-200 dark:divide-slate-800 [&>div]:border-slate-200 dark:[&>div]:border-slate-800">
                <div className="px-5 py-4 border-b md:border-b-0 border-r">
                  <dt className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Award className="h-3.5 w-3.5" />{t.analysisScore}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">
                    {sessionRecord.score}<span className="text-sm font-normal text-slate-500"> / {sessionRecord.maxScore}</span>
                  </dd>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-[#1e4e79] dark:bg-blue-400" style={{ width: `${scorePct}%` }} />
                  </div>
                </div>
                <div className="px-5 py-4 border-b md:border-b-0 md:border-r">
                  <dt className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />{t.analysisAccuracy}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">{sessionRecord.accuracy}%</dd>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isHi ? 'प्रयास किए गए प्रश्नों पर' : 'Of attempted questions'}</p>
                </div>
                <div className="px-5 py-4 border-r">
                  <dt className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" />{t.analysisTimeTaken}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">{formatDuration(computedTimeTakenSeconds)}</dd>
                  {(sessionRecord as any).durationMinutes ? (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isHi ? 'कुल समय' : 'Allowed'}: {(sessionRecord as any).durationMinutes} {isHi ? 'मिनट' : 'min'}</p>
                  ) : null}
                </div>
                <div className="px-5 py-4">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{isHi ? 'प्रश्न' : 'Questions'}</dt>
                  <dd className="mt-1.5 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{isHi ? 'सही' : 'Correct'}</span><strong className="font-semibold text-[#1e7e34] dark:text-green-400 tabular-nums">{totals.correct}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{isHi ? 'गलत' : 'Wrong'}</span><strong className="font-semibold text-[#b02a37] dark:text-red-400 tabular-nums">{totals.incorrect}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{isHi ? 'छोड़े गए' : 'Skipped'}</span><strong className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{totals.unattempted}</strong></div>
                  </dd>
                </div>
              </dl>
              <div className="px-5 sm:px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 rounded-b-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {isHi ? 'हर प्रश्न का सही उत्तर और व्याख्या देखें।' : 'Review every question with the correct answer and explanation.'}
                </p>
                <button type="button" onClick={() => setViewMode('solution')} className={`${btnPrimary} shrink-0`}>
                  <HelpCircle className="h-4 w-4" />
                  {isHi ? 'सविस्तार समाधान देखें' : 'View detailed solutions'}
                </button>
              </div>
            </SectionCard>

            {/* Benchmark */}
            {sessionRecord.testbookRank && sessionRecord.mockTest && (
              <SectionCard
                title={lang === 'hi' ? 'तुलनात्मक रैंक' : 'Comparative rank'}
                description={lang === 'hi' ? 'अन्य अभ्यर्थियों के प्रदर्शन के आधार पर सांख्यिकीय अनुमान।' : 'Statistical projection based on other candidates’ performance.'}
                action={<StatusBadge tone={isCutoffCleared ? 'green' : 'amber'}>{isCutoffCleared ? (lang === 'hi' ? 'कटऑफ पार' : 'Above cut-off') : (lang === 'hi' ? 'कटऑफ से कम' : 'Below cut-off')}</StatusBadge>}
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: lang === 'hi' ? 'अनुमानित रैंक' : 'Estimated rank', value: <>#{sessionRecord.testbookRank}<span className="text-sm font-normal text-slate-500"> / {sessionRecord.mockTest.testbookTotalUsers}</span></> },
                    { label: lang === 'hi' ? 'प्रतिशतक' : 'Percentile', value: <>{sessionRecord.testbookPercentile}%</> },
                    { label: lang === 'hi' ? 'कटऑफ' : 'Cut-off', value: <>{cutoffScore}</> },
                    { label: lang === 'hi' ? 'टॉपर स्कोर' : 'Topper score', value: <>{sessionRecord.mockTest.testbookTopperScore}</> },
                  ].map((item, i) => (
                    <div key={i} className="rounded-md border border-slate-200 dark:border-slate-800 px-4 py-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white tabular-nums">{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Benchmarking scale */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-8">{lang === 'hi' ? 'प्रदर्शन तुलना' : 'Where you stand'}</h3>
                  <div className="relative">
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative">
                      <div
                        className="absolute h-full bg-slate-300 dark:bg-slate-600 rounded-full"
                        style={{
                          left: `${Math.max(0, Math.min(100, (sessionRecord.mockTest.testbookAverageScore / sessionRecord.maxScore) * 100))}%`,
                          right: `${Math.max(0, Math.min(100, 100 - (sessionRecord.mockTest.testbookTopperScore / sessionRecord.maxScore) * 100))}%`
                        }}
                      />
                      <div
                        className={`absolute h-full rounded-full ${isCutoffCleared ? 'bg-[#1e7e34]' : 'bg-[#1e4e79]'}`}
                        style={{ left: 0, width: `${Math.min(100, Math.max(0, (sessionRecord.score / sessionRecord.maxScore) * 100))}%` }}
                      />
                      {[
                        { at: cutoffScore, label: `${lang === 'hi' ? 'कटऑफ' : 'Cut-off'} ${cutoffScore}`, cls: 'text-amber-800 bg-amber-50 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300', line: 'bg-amber-500' },
                        { at: sessionRecord.mockTest.testbookAverageScore, label: `${lang === 'hi' ? 'औसत' : 'Avg'} ${sessionRecord.mockTest.testbookAverageScore}`, cls: 'text-slate-600 bg-slate-50 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300', line: 'bg-slate-400' },
                        { at: sessionRecord.mockTest.testbookTopperScore, label: `${lang === 'hi' ? 'टॉपर' : 'Topper'} ${sessionRecord.mockTest.testbookTopperScore}`, cls: 'text-green-700 bg-green-50 ring-green-600/20 dark:bg-green-950/40 dark:text-green-400', line: 'bg-green-600' },
                      ].map((m, i) => (
                        <div key={i} className="absolute -top-7 -translate-x-1/2 flex flex-col items-center" style={{ left: `${Math.max(0, Math.min(100, (m.at / sessionRecord.maxScore) * 100))}%` }}>
                          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ring-1 ring-inset whitespace-nowrap ${m.cls}`}>{m.label}</span>
                          <span className={`w-px h-4 mt-0.5 ${m.line}`} />
                        </div>
                      ))}
                      <div className="absolute top-3 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${Math.max(0, Math.min(100, (sessionRecord.score / sessionRecord.maxScore) * 100))}%` }}>
                        <span className="w-px h-2 bg-[#1e4e79] dark:bg-blue-400" />
                        <span className="text-[11px] font-semibold text-white bg-[#1e4e79] px-2 py-0.5 rounded whitespace-nowrap">{lang === 'hi' ? 'आप' : 'You'} {sessionRecord.score}</span>
                      </div>
                    </div>
                    <div className="flex justify-between mt-9 text-xs text-slate-500 dark:text-slate-400">
                      <span>0</span>
                      <span>{sessionRecord.maxScore} {lang === 'hi' ? 'अंक' : 'marks'}</span>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* CBAT T-Score Result — Station Master CBAT (Psycho Test) */}
            {cbatTScoreResult && (
              <SectionCard
                title={cbatTScoreResult.isFullCbat
                  ? (lang === 'hi' ? 'CBAT समग्र टी-स्कोर परिणाम (पूर्ण मॉक)' : 'CBAT full mock T-score result')
                  : (lang === 'hi' ? 'CBAT अनुभागीय टी-स्कोर परिणाम' : 'CBAT sectional T-score result')}
                action={<StatusBadge tone="slate">{cbatTScoreResult.isFullCbat ? (lang === 'hi' ? 'सभी 5 बैटरियां' : 'All 5 batteries') : (lang === 'hi' ? 'एकल बैटरी' : 'Single battery')}</StatusBadge>}
              >
                <div className="mb-5 flex items-start gap-2.5 rounded-md border border-amber-200 dark:border-amber-900/60 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900 dark:text-amber-300 leading-relaxed">
                    {lang === 'hi'
                      ? 'यह एक अनुमानित टी-स्कोर है। वास्तविक RRB टी-स्कोर उस शिफ्ट के सभी वास्तविक अभ्यर्थियों के औसत (Mean) और मानक विचलन (SD) पर निर्भर करता है, जो केवल RRB के पास होता है। यहाँ माना गया Mean/SD केवल अभ्यास हेतु अनुमानित है, आधिकारिक परिणाम नहीं।'
                      : 'This is an estimated T-Score for practice only. The official RRB T-Score depends on the real Mean and Standard Deviation of every candidate in your actual exam shift — data only RRB has. The Mean/SD used here are assumed reference values, not the official exam-day statistics.'}
                  </p>
                </div>

                <div className={`grid gap-4 ${cbatTScoreResult.sections.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
                  {cbatTScoreResult.sections.map(sec => (
                    <div key={sec.name} className="rounded-md border border-slate-200 dark:border-slate-800 p-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{sec.name}</div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">{lang === 'hi' ? 'कच्चा स्कोर' : 'Raw score'}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">{sec.rawScore} / {sec.maxMarks}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">T-Score</div>
                          <div className={`text-xl font-semibold tabular-nums ${sec.qualified ? 'text-[#1e7e34] dark:text-green-400' : 'text-[#b02a37] dark:text-red-400'}`}>{sec.tScore}</div>
                        </div>
                        <StatusBadge tone={sec.qualified ? 'green' : 'red'}>
                          {sec.qualified ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {sec.qualified ? (lang === 'hi' ? 'उत्तीर्ण (≥42)' : 'Qualified (≥42)') : (lang === 'hi' ? 'अनुत्तीर्ण (<42)' : `Below ${CBAT_QUALIFYING_TSCORE}`)}
                        </StatusBadge>
                      </div>
                    </div>
                  ))}
                </div>

                {cbatTScoreResult.isFullCbat ? (
                  <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-md border border-slate-200 dark:border-slate-800 p-4">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{lang === 'hi' ? 'समग्र टी-स्कोर' : 'Composite T-score'}</div>
                      <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-white tabular-nums">{cbatTScoreResult.compositeTScore} <span className="text-sm font-normal text-slate-500">/ {CBAT_MAX_COMPOSITE}</span></div>
                    </div>
                    <div className="rounded-md border border-slate-200 dark:border-slate-800 p-4">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{lang === 'hi' ? 'मेरिट स्केल (30 में से)' : 'Merit scale (out of 30)'}</div>
                      <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-white tabular-nums">{cbatTScoreResult.meritScoreOutOf30}</div>
                    </div>
                    <div className={`rounded-md border p-4 ${cbatTScoreResult.overallQualified ? 'bg-[#eaf6ec] border-green-200 dark:bg-green-950/30 dark:border-green-900' : 'bg-[#fbeaec] border-red-200 dark:bg-red-950/30 dark:border-red-900'}`}>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{lang === 'hi' ? 'समग्र परिणाम' : 'Overall result'}</div>
                      <div className={`mt-1 text-xl font-semibold ${cbatTScoreResult.overallQualified ? 'text-[#1e7e34] dark:text-green-400' : 'text-[#b02a37] dark:text-red-400'}`}>
                        {cbatTScoreResult.overallQualified ? (lang === 'hi' ? 'उत्तीर्ण' : 'Qualified') : (lang === 'hi' ? 'अनुत्तीर्ण' : 'Not qualified')}
                      </div>
                      {!cbatTScoreResult.overallQualified && (
                        <p className="text-xs text-[#b02a37] dark:text-red-400 mt-1">{lang === 'hi' ? 'किसी भी एक बैटरी में 42 से कम स्कोर पूरे CBAT को अनुत्तीर्ण कर देता है।' : 'Any single battery below 42 fails the entire CBAT — no compensation across batteries.'}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-md border border-slate-200 dark:border-slate-800 p-4">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{lang === 'hi' ? 'न्यूनतम अर्हक टी-स्कोर' : 'Qualifying cut-off'}</div>
                      <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-white tabular-nums">{CBAT_QUALIFYING_TSCORE} <span className="text-sm font-normal text-slate-500">/ 80</span></div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {lang === 'hi' ? 'इस व्यक्तिगत बैटरी में उत्तीर्ण होने के लिए न्यूनतम 42 टी-स्कोर अनिवार्य है।' : 'A minimum T-Score of 42 is required to qualify in this individual battery.'}
                      </p>
                    </div>
                    <div className={`rounded-md border p-4 ${cbatTScoreResult.overallQualified ? 'bg-[#eaf6ec] border-green-200 dark:bg-green-950/30 dark:border-green-900' : 'bg-[#fbeaec] border-red-200 dark:bg-red-950/30 dark:border-red-900'}`}>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{lang === 'hi' ? 'बैटरी परिणाम' : 'Battery result'}</div>
                      <div className={`mt-1 text-xl font-semibold ${cbatTScoreResult.overallQualified ? 'text-[#1e7e34] dark:text-green-400' : 'text-[#b02a37] dark:text-red-400'}`}>
                        {cbatTScoreResult.overallQualified ? (lang === 'hi' ? 'उत्तीर्ण (≥42)' : 'Qualified (≥42)') : (lang === 'hi' ? 'अनुत्तीर्ण (<42)' : `Below ${CBAT_QUALIFYING_TSCORE} (Not qualified)`)}
                      </div>
                      <p className={`text-xs mt-1 ${cbatTScoreResult.overallQualified ? 'text-[#1e7e34] dark:text-green-400' : 'text-[#b02a37] dark:text-red-400'}`}>
                        {cbatTScoreResult.overallQualified
                          ? (lang === 'hi' ? 'आपने इस बैटरी में अर्हक टी-स्कोर (≥42) सफलतापूर्वक प्राप्त कर लिया है।' : 'You have qualified in this battery with a T-Score of 42 or higher.')
                          : (lang === 'hi' ? 'इस बैटरी में आपका टी-स्कोर 42 से कम है। कृपया अधिक अभ्यास करें।' : 'Your T-Score in this battery is below 42. More practice is recommended.')}
                      </p>
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Subject-wise breakdown */}
            <SectionCard
              title={lang === 'hi' ? 'विषयवार प्रदर्शन' : 'Section-wise performance'}
              description={lang === 'hi' ? 'हर अनुभाग में अंक, सटीकता और प्रश्नों की स्थिति।' : 'Score, accuracy and question status for each section.'}
              bodyClass="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-5 py-2.5 font-medium">{lang === 'hi' ? 'अनुभाग' : 'Section'}</th>
                      <th className="px-3 py-2.5 font-medium">{lang === 'hi' ? 'अंक' : 'Score'}</th>
                      <th className="px-3 py-2.5 font-medium text-right">{lang === 'hi' ? 'सटीकता' : 'Accuracy'}</th>
                      <th className="px-3 py-2.5 font-medium text-right">{lang === 'hi' ? 'सही' : 'Correct'}</th>
                      <th className="px-3 py-2.5 font-medium text-right">{lang === 'hi' ? 'गलत' : 'Wrong'}</th>
                      <th className="px-3 py-2.5 font-medium text-right">{lang === 'hi' ? 'छोड़े' : 'Skipped'}</th>
                      <th className="px-5 py-2.5 font-medium text-right">{lang === 'hi' ? 'मार्किंग' : 'Marking'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sectionalAnalysis.map((sec) => {
                      const maxSecScore = sec.total * sec.positiveMark;
                      const scorePercent = maxSecScore > 0 ? Math.min(100, Math.max(0, (sec.score / maxSecScore) * 100)) : 0;
                      const secAccuracy = sec.attempted > 0 ? (sec.correct / sec.attempted) * 100 : 0;
                      const accTone = secAccuracy >= 75 ? 'text-[#1e7e34] dark:text-green-400' : (secAccuracy >= 50 ? 'text-slate-800 dark:text-slate-200' : 'text-[#b02a37] dark:text-red-400');
                      return (
                        <tr key={sec.name} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                          <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{sec.name}</td>
                          <td className="px-3 py-3">
                            <div className="tabular-nums text-slate-800 dark:text-slate-200">{sec.score.toFixed(2)} <span className="text-slate-400">/ {maxSecScore.toFixed(0)}</span></div>
                            <div className="mt-1 h-1.5 w-28 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full bg-[#1e4e79] dark:bg-blue-400" style={{ width: `${scorePercent}%` }} />
                            </div>
                          </td>
                          <td className={`px-3 py-3 text-right font-semibold tabular-nums ${accTone}`}>{secAccuracy.toFixed(0)}%</td>
                          <td className="px-3 py-3 text-right tabular-nums text-[#1e7e34] dark:text-green-400">{sec.correct}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-[#b02a37] dark:text-red-400">{sec.incorrect}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">{sec.unattempted}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">+{sec.positiveMark} / −{sec.negativeMark}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {sectionalAnalysis.length > 1 && (
                    <tfoot>
                      <tr className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-medium">
                        <td className="px-5 py-3 text-slate-900 dark:text-white">{lang === 'hi' ? 'कुल' : 'Total'}</td>
                        <td className="px-3 py-3 tabular-nums text-slate-900 dark:text-white">{sessionRecord.score} <span className="text-slate-400 font-normal">/ {sessionRecord.maxScore}</span></td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-900 dark:text-white">{sessionRecord.accuracy}%</td>
                        <td className="px-3 py-3 text-right tabular-nums text-[#1e7e34] dark:text-green-400">{totals.correct}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-[#b02a37] dark:text-red-400">{totals.incorrect}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">{totals.unattempted}</td>
                        <td className="px-5 py-3" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </SectionCard>

          </main>
        </div>
      </div>

      {viewMode === 'analysis' && <SiteFooter />}

      <section className={isSolutionView
        ? "flex flex-row flex-1 overflow-hidden bg-[#F1F5F9] w-full h-full pb-16 flex"
        : `max-w-6xl w-full mx-auto px-6 mt-6 flex flex-col lg:flex-row gap-8 items-start pb-24 ${viewMode === 'solution' ? 'flex' : 'hidden'}`
      }>
        
        {/* LEFT WORKSPACE PANEL: QUESTION VIEW */}
        <main className={isSolutionView
          ? "flex-1 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 h-full overflow-y-auto p-6"
          : "flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm min-h-[480px] flex flex-col justify-between w-full"
        }>
          
          <div>
            {isSolutionView && (
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-[11px] font-bold shrink-0 mb-4 -mx-6 -mt-6">
                <span className="text-[#0747A6] text-xs">Question Type: Multiple Choice Question</span>
                <div className="flex gap-2">
                  <span className="text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                    Marks: +{activeQuestion?.positiveMark ?? currentSection?.positiveMark ?? 2}
                  </span>
                  <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                    Negative: -{activeQuestion?.negativeMark ?? currentSection?.negativeMark ?? 0}
                  </span>
                </div>
              </div>
            )}
            {/* Mobile-only Horizontal Question Palette Bar (placed at the top of the question workspace) */}
            <div className="block lg:hidden w-full overflow-x-auto pb-3 mb-5 shrink-0 scrollbar-none border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex gap-2 px-1 min-w-max">
                {questionStatuses.map((stat, idx) => {
                  const isActive = idx === activeQuestionIdx;
                  
                  let statusBg = 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400';
                  if (stat.status === 'correct') {
                    statusBg = 'bg-green-600 text-white shadow shadow-green-950/20';
                  } else if (stat.status === 'incorrect') {
                    statusBg = 'bg-red-600 text-white shadow shadow-red-950/20';
                  } else if (stat.status === 'skipped') {
                    statusBg = 'bg-slate-400 dark:bg-slate-600 text-white';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black transition-all cursor-pointer ${statusBg} ${
                        isActive 
                          ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 transform scale-105 border-2 border-white dark:border-slate-900' 
                          : 'border border-transparent'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Header Status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-5 gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  {language === 'hi' ? 'प्रश्न' : 'Question'} {activeQuestionIdx + 1}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  (ID: {activeQuestion.id})
                </span>
                
                <div className="flex items-center gap-2">
                  {activeStatus.status === 'correct' && (
                    <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900 px-2 py-0.5 rounded text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">
                      <CheckCircle2 className="h-3 w-3" /> {t.analysisLegendCorrect}
                    </span>
                  )}
                  {activeStatus.status === 'incorrect' && (
                    <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900 px-2 py-0.5 rounded text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">
                      <XCircle className="h-3 w-3" /> {t.analysisLegendIncorrect}
                    </span>
                  )}
                  {activeStatus.status === 'skipped' && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      <HelpCircle className="h-3 w-3" /> {t.analysisLegendSkipped}
                    </span>
                  )}
                </div>
              </div>

              {/* Time stats, Language switch, and Bookmark button */}
              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                    {language === 'hi' ? 'आपका समय: ' : 'Your Time: '}<strong className="text-slate-800 dark:text-white font-bold">{userTime > 0 ? `${userTime}s` : (language === 'hi' ? 'N/A' : 'N/A')}</strong>
                  </span>
                </div>

                {/* Change Language Button near Bookmark button */}
                <button
                  onClick={() => {
                    const newLang = lang === 'en' ? 'hi' : 'en';
                    setLang(newLang);
                    if (setLanguage) setLanguage(newLang);
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="Switch Language (English / Hindi)"
                >
                  <Globe className="h-3.5 w-3.5 text-blue-500" />
                  <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
                </button>

                <button
                  onClick={() => toggleBookmark(testId, activeQuestion.id)}
                  className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                    isBookmarked
                      ? 'bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-950/20 dark:border-yellow-900 dark:text-yellow-400'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Bookmark className={`h-3 w-3 ${isBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  {isBookmarked ? (language === 'hi' ? 'बुकमार्क किया गया' : 'Bookmarked') : (language === 'hi' ? 'बुकमार्क करें' : 'Bookmark')}
                </button>
                <OfflineBookmarkBadge testId={testId} questionId={activeQuestion.id} />

                <button
                  onClick={() => handleOpenReportModal(activeQuestion.id)}
                  className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900 bg-red-55 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/45 transition-all active:scale-95 cursor-pointer"
                >
                  <ShieldAlert className="h-3 w-3" />
                  {language === 'hi' ? 'रिपोर्ट करें' : 'Report'}
                </button>
              </div>
            </div>

            {/* Swipeable Question Content Area */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="mt-4"
            >
              {/* Question Box */}
              <div className="mb-6 space-y-4" style={{ fontSize: `${questionFontSize}px` }}>
                <MathJaxText
                  component="div"
                  className="font-semibold text-slate-900 dark:text-white leading-relaxed markup-content"
                  content={processQuestionHtml(activeQuestion.content[lang]?.questionText || activeQuestion.content['en']?.questionText || "")}
                />

                {activeQuestion.content[lang]?.mathLatex && (
                  <div className="bg-slate-100 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800/80 font-mono text-xs text-blue-600 dark:text-blue-400">
                    Latex: {activeQuestion.content[lang].mathLatex}
                  </div>
                )}

                {/* Optional Question Image */}
                {(activeQuestion.content[lang]?.imageUrl || activeQuestion.content['en']?.imageUrl) && (
                  <div className="flex justify-center bg-slate-50 dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-800 rounded-md">
                    <img
                      src={activeQuestion.content[lang]?.imageUrl || activeQuestion.content['en']?.imageUrl}
                      alt="Question Visual"
                      className="max-h-72 object-contain"
                    />
                  </div>
                )}
              </div>

            {/* Options List */}
            <div className="space-y-3" style={{ fontSize: `${questionFontSize}px` }}>
              {((activeQuestion.content[lang]?.options || activeQuestion.content['en']?.options) as any[]).map((opt, optIdx: number) => {
                const optLabel = typeof opt === 'string' ? opt : opt.text;
                const isCorrectIndex = optIdx === activeQuestion.correctOptionIndex;
                const isUserSelectedIndex = optIdx === activeStatus.userSelectedOptionIndex;
                
                let optionStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200';
                
                if (isCorrectIndex) {
                  optionStyle = 'border-green-500 bg-green-50/40 dark:border-green-800 dark:bg-green-950/20 text-slate-900 dark:text-green-300';
                } else if (isUserSelectedIndex && !isCorrectIndex) {
                  optionStyle = 'border-red-500 bg-red-50/40 dark:border-red-800 dark:bg-red-950/20 text-slate-900 dark:text-red-300';
                }

                return (
                  <div
                    key={optIdx}
                    className={`border rounded-xl p-3.5 flex items-center justify-between transition ${optionStyle}`}
                  >
                    <span className="flex items-center gap-3 font-semibold">
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        isCorrectIndex
                          ? 'bg-green-600 text-white'
                          : isUserSelectedIndex
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <MathJaxText content={processQuestionHtml(optLabel)} />
                    </span>

                    <div className="flex items-center gap-2">
                      {isUserSelectedIndex && (
                        <span className="text-[9px] uppercase font-black bg-blue-900 border border-blue-800 text-blue-400 px-2 py-0.5 rounded shadow">
                          {language === 'hi' ? 'आपका विकल्प' : 'Your Choice'}
                        </span>
                      )}
                      {isCorrectIndex && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {isUserSelectedIndex && !isCorrectIndex && (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation card */}
            <div className="mt-8 bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
              <h5 className="font-extrabold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 mb-3.5 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-blue-500" /> {language === 'hi' ? 'विस्तृत व्याख्या और अवधारणा' : 'Detailed Explanation & Concept'}
              </h5>
              <MathJaxText
                component="div"
                className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold markup-content"
                content={processQuestionHtml(activeExplanation[lang] || activeExplanation['en'] || "")}
              />
            </div>
            </div>

          </div>

            {/* Navigation CTAs */}
            <div className={`justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-5 mt-8 ${isSolutionView ? 'hidden' : 'flex'}`}>
              <button
                onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                disabled={activeQuestionIdx === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-800 dark:text-white"
              >
                <ChevronLeft className="h-4 w-4" /> {language === 'hi' ? 'पिछला' : 'Previous'}
              </button>
              
              <span className="text-xs font-bold text-slate-500">
                {activeQuestionIdx + 1} / {totalQs}
              </span>

              <button
                onClick={() => setActiveQuestionIdx(prev => Math.min(totalQs - 1, prev + 1))}
                disabled={activeQuestionIdx === totalQs - 1}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-800 dark:text-white"
              >
                {language === 'hi' ? 'अगला' : 'Next'} <ChevronRight className="h-4 w-4" />
              </button>
            </div>

          </main>

          {/* RIGHT WORKSPACE SIDEBAR: QUESTION PALETTE */}
          <aside className={isSolutionView
            ? "hidden md:flex w-52 sm:w-56 md:w-60 min-[1080px]:w-80 bg-[#F1F5F9] p-2 min-[1080px]:p-3 flex-col shrink-0 h-full overflow-y-auto max-[1079px]:no-scrollbar border-l border-slate-300"
            : "hidden lg:block w-full lg:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm lg:sticky lg:top-24 lg:self-start"
          }>
          {isSolutionView ? (
            <>
              {/* Candidate Info Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 p-3 rounded-lg flex items-center gap-2.5 shadow-sm mb-3">
                <div className="h-12 w-10 bg-slate-50 border border-slate-200 rounded flex items-center justify-center text-slate-400"><User className="h-6 w-6" /></div>
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Candidate</span>
                  <span className="font-bold text-slate-800 text-xs truncate leading-tight mt-0.5">{currentUser.name || 'Student Name'}</span>
                  <span className="text-[9px] text-slate-500 truncate mt-0.5">Hub ID: {currentUser.candidateCode || currentUser.id.slice(0, 12)}</span>
                </div>
              </div>

              {/* Palette Grid for All Sections */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 min-[1080px]:p-3 shadow-sm flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto max-[1079px]:no-scrollbar space-y-4 pr-1 mb-3">
                  {examSession.sections.map((sec) => {
                    const secQuestions = questions.filter(q => q.sectionId === sec.id);
                    if (secQuestions.length === 0) return null;

                    return (
                      <div key={sec.id} className="flex flex-col">
                        <div className="mb-2 pb-1 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wide truncate max-w-[150px]" title={sec.name}>
                            {sec.name}
                          </h4>
                          <span className="text-[8px] text-slate-400 font-bold shrink-0">
                            ({secQuestions.length} Qs)
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {secQuestions.map((q) => {
                            const stat = questionStatuses.find(s => s.questionId === q.id);
                            const isActive = q.id === activeQuestion.id;

                            let statusBg = 'bg-[#C8D3E0] text-slate-800';
                            if (stat?.status === 'correct') {
                              statusBg = 'bg-[#2E7D32] text-white';
                            } else if (stat?.status === 'incorrect') {
                              statusBg = 'bg-[#C62828] text-white';
                            } else if (stat?.status === 'skipped') {
                              statusBg = 'bg-slate-400 text-white';
                            }

                            const globalIdx = questions.findIndex(x => x.id === q.id);

                            return (
                              <button
                                key={q.id}
                                onClick={() => setActiveQuestionIdx(globalIdx)}
                                className={`flex h-8 w-8 items-center justify-center border font-bold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer ${statusBg} ${
                                  isActive ? 'ring-2 ring-blue-500 ring-offset-1 z-10 border-white' : 'border-transparent'
                                }`}
                              >
                                {globalIdx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend Table */}
                <div className="border-t border-slate-100 pt-3 shrink-0 mt-auto">
                  <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Palette Legend</h5>
                  <div className="space-y-1.5 text-[9px] font-bold text-slate-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 bg-[#2E7D32] rounded"></span>
                        <span>Correct ({counts.correct})</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 bg-[#C62828] rounded"></span>
                        <span>Incorrect ({counts.incorrect})</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 bg-slate-400 rounded"></span>
                        <span>Skipped ({counts.skipped})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h4 className="font-extrabold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                {t.analysisQuestionsPal}
              </h4>

              {/* Color Code Legend */}
              <div className="grid grid-cols-3 gap-2 mb-6 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
                  <span>{t.analysisLegendCorrect} ({totalCorrect})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-600"></span>
                  <span>{t.analysisLegendIncorrect} ({totalIncorrect})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-slate-400 dark:bg-slate-600"></span>
                  <span>{t.analysisLegendSkipped} ({totalSkipped})</span>
                </div>
              </div>

              {/* Palette grid list */}
              <div className="grid grid-cols-5 gap-3.5">
                {questionStatuses.map((stat, idx) => {
                  const isActive = idx === activeQuestionIdx;
                  
                  let statusBg = 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400';
                  if (stat.status === 'correct') {
                    statusBg = 'bg-green-600 text-white shadow shadow-green-950/20';
                  } else if (stat.status === 'incorrect') {
                    statusBg = 'bg-red-600 text-white shadow shadow-red-950/20';
                  } else if (stat.status === 'skipped') {
                    statusBg = 'bg-slate-400 dark:bg-slate-600 text-white';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black transition-all cursor-pointer ${statusBg} ${
                        isActive 
                          ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 transform scale-105 border-2 border-white dark:border-slate-900' 
                          : 'border border-transparent'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 mt-6 pt-5">
                <Link
                  href="/mock-tests"
                  className="block w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95"
                >
                  {t.analysisGoToMockTests}
                </Link>
              </div>
            </>
          )}
        </aside>
      </section>

      {/* FIXED BOTTOM FOOTER - Only in solutions view mode */}
      {isSolutionView && (
        <footer className="fixed bottom-0 left-0 right-0 h-[52px] bg-white dark:bg-slate-900 border-t border-slate-300 z-50 flex items-center justify-between px-4 select-none">
          <button
            onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
            disabled={activeQuestionIdx === 0}
            className="flex items-center gap-1 bg-[#1a6baf] hover:bg-[#155a96] text-white text-[11px] font-bold px-3 py-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="font-bold text-slate-700 text-xs">
            Question {activeQuestionIdx + 1} of {totalQs}
          </span>
          <button
            onClick={() => setActiveQuestionIdx(prev => Math.min(totalQs - 1, prev + 1))}
            disabled={activeQuestionIdx === totalQs - 1}
            className="flex items-center gap-1 bg-[#1a6baf] hover:bg-[#155a96] text-white text-[11px] font-bold px-3 py-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </footer>
      )}

      {/* 4. REPORT QUESTION POPUP MODAL */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-800 dark:text-slate-100 transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                {language === 'hi' ? 'प्रश्न रिपोर्ट करें' : 'Report Question'}
              </h3>
              <button
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer border border-transparent"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                  {language === 'hi' ? 'प्रश्न आईडी' : 'Question ID'}
                </label>
                <input
                  type="text"
                  value={reportQuestionId}
                  disabled
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 font-mono text-xs text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                  {language === 'hi' ? 'रिपोर्ट विवरण / संदेश' : 'Report Description / Message'}
                </label>
                <textarea
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  placeholder={language === 'hi' ? 'कृपया प्रश्न में त्रुटि या समस्या का विवरण दर्ज करें...' : 'Describe the issue or error in the question...'}
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-blue-500 outline-none transition-colors"
                />
              </div>

              {reportingError && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-[11px] font-semibold text-red-600 dark:text-red-400 leading-tight">
                  {reportingError}
                </div>
              )}

              {reportingSuccess && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3 text-[11px] font-semibold text-green-600 dark:text-green-400 leading-tight">
                  {language === 'hi' ? 'रिपोर्ट सफलतापूर्वक दर्ज की गई!' : 'Report submitted successfully!'}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition active:scale-95 cursor-pointer"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport || reportingSuccess}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingReport ? (language === 'hi' ? 'सबमिट किया जा रहा है...' : 'Submitting...') : (language === 'hi' ? 'जमा करें' : 'Submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewMode === 'solution' && (
        <footer className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
              disabled={activeQuestionIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-800 dark:text-white"
            >
              <ChevronLeft className="h-4 w-4" /> {language === 'hi' ? 'पिछला' : 'Previous'}
            </button>
            
            <span className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
              {language === 'hi' ? 'प्रश्न' : 'Question'} {activeQuestionIdx + 1} / {totalQs}
            </span>

            <button
              onClick={() => setActiveQuestionIdx(prev => Math.min(totalQs - 1, prev + 1))}
              disabled={activeQuestionIdx === totalQs - 1}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-800 dark:text-white"
            >
              {language === 'hi' ? 'अगला' : 'Next'} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      )}

    </div>
  );
}
