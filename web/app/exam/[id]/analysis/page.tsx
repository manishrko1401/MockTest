"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth, MockUser, MockTestRecord } from '../../../AuthContext';
import { generateExamSession, EXPLANATIONS } from '../../../lib/examUtils';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  User,
  Clock,
  Check,
  Menu
} from 'lucide-react';
import { TRANSLATIONS } from '../../../translations';

function decodeHtml(text: string): string {
  if (!text) return "";
  let decoded = text;
  for (let i = 0; i < 3; i++) {
    const temp = decoded
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    if (temp === decoded) break;
    decoded = temp;
  }
  return decoded;
}

// Targeted, memoized component for MathJax rendering to prevent React re-render clashing
const MathJaxText = React.memo(({ content, className, component: Component = 'span' }: { content: string, className?: string, component?: 'span' | 'div' }) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (containerRef.current && typeof window !== 'undefined' && (window as any).MathJax?.typesetPromise) {
      const MathJax = (window as any).MathJax;
      try {
        MathJax.typesetClear([containerRef.current]);
        MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
          console.warn("MathJax typeset error:", err);
        });
      } catch (e) {
        MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
          console.warn("MathJax typeset error:", err);
        });
      }
    }
  }, [content]);

  return (
    <Component
      ref={containerRef as any}
      className={className}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
});
MathJaxText.displayName = 'MathJaxText';


export default function ExamSolutionAnalysisPage() {
  const params = useParams();
  const testId = (params?.id as string) || "ssc_cgl_tier1";
  const { currentUser, theme, toggleTheme, toggleBookmark, language, setLanguage, reportQuestion, examCatalog } = useAuth();
  const router = useRouter();

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
  const [customQs, setCustomQs] = useState<any[] | null>(null);
  const [loadingCustomQs, setLoadingCustomQs] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState<'analysis' | 'solutions'>('analysis');
  const [viewMode, setViewMode] = useState<'analysis' | 'solution'>('analysis');
  const [questionFontSize, setQuestionFontSize] = useState(14); // default 14px

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
      let url = `/mock-tests?cat=${categoryId}&sub=${subCategoryId}`;
      if (subSubCategoryId) {
        url += `&subsub=${subSubCategoryId}`;
      }
      router.push(url);
    } else {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push('/mock-tests');
      }
    }
  };

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
  const attempts = currentUser
    ? currentUser.testSessions.filter(
        s => (s.testId === testId || s.title.toLowerCase().includes(testId.replace(/_/g, ' '))) &&
             (s.status === 'COMPLETED' || s.status === 'AUTO_SUBMITTED')
      )
    : [];

  useEffect(() => {
    setMounted(true);

    const fetchCustomQuestions = async () => {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-custom-questions',
            data: { testId }
          })
        });
        const data = await res.json();
        if (data.success && data.questions) {
          setCustomQs(data.questions);
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
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400 font-bold">Loading Analysis Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
        <div className="text-center p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl max-w-sm shadow-xl">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4 animate-bounce" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider mb-2">Authentication Required</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">Please log in to your account to review solutions and mock exam statistics.</p>
          <Link href="/auth" className="inline-block bg-blue-600 hover:bg-blue-750 text-white font-bold py-2.5 px-6 rounded-lg text-xs tracking-wider uppercase transition-all shadow-lg active:scale-95">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  const sessionRecord = attempts[selectedAttemptIdx];
  const cutoffScore = sessionRecord?.mockTest?.testbookCutoffScore || 120;
  const isCutoffCleared = sessionRecord ? sessionRecord.score >= cutoffScore : false;

  if (!sessionRecord) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
        <div className="text-center p-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl max-w-md shadow-xl">
          <ShieldAlert className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider mb-2">No Session Records Found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">
            You have not attempted this test yet, or the exam was cleared by an administrator. Please sit for the mock test first.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/mock-tests" className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2 px-5 rounded-lg text-xs tracking-wider uppercase transition-all active:scale-95">
              Browse Exams
            </Link>
            <Link href={`/exam/${testId}`} className="bg-blue-600 hover:bg-blue-750 text-white font-bold py-2 px-5 rounded-lg text-xs tracking-wider uppercase transition-all active:scale-95 shadow-md shadow-blue-500/25">
              Start Test Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Generate the exam session questions list
  const examSession = generateExamSession(testId, examCatalog, customQs);
  const questions = examSession.questions;

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

  const hasActualResponses = sessionRecord.responses && Object.keys(sessionRecord.responses).length > 0;

  const questionStatuses = questions.map((q, idx) => {
    if (hasActualResponses && sessionRecord.responses?.[q.id]) {
      const resp = sessionRecord.responses[q.id];
      const userSelectedOptionIndex = resp.selectedOptionIndex ?? -1;
      let status: 'correct' | 'incorrect' | 'skipped' = 'skipped';
      if (userSelectedOptionIndex === -1 || userSelectedOptionIndex === null) {
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
    // Resolve admin-configured marks for this test from the catalog
    let catalogPositiveMark = testId.includes('rrb') || testId.includes('railway') ? 1 : 2;
    let catalogNegativeMark = testId.includes('rrb') || testId.includes('railway') ? 0.33 : 0.5;
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

      if (selectedIdx === -1 || selectedIdx === null || selectedIdx === undefined) {
        stats.unattempted++;
      } else {
        stats.attempted++;
        if (userStatus.status === 'correct') {
          stats.correct++;
          stats.score += info.positiveMark;
        } else {
          stats.incorrect++;
          stats.score -= info.negativeMark;
        }
      }
    });

    return Object.values(sectionsMap);
  })();

  const activeQuestion = questions[activeQuestionIdx];
  const activeStatus = questionStatuses[activeQuestionIdx];

  // Calculate question time statistics and bookmark state
  // Only show actual elapsed seconds — never fall back to fake random values
  const userTime = sessionRecord.responses?.[activeQuestion.id]?.elapsedSeconds ?? 0;
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
    if (sessionRecord.responses && Object.keys(sessionRecord.responses).length > 0) {
      const total = Object.values(sessionRecord.responses).reduce(
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

  const isSolutionView = viewMode === 'solution';
  const switchSection = (sectionIdx: number) => {
    const sec = examSession.sections[sectionIdx];
    if (!sec) return;
    const firstQIdx = questions.findIndex(q => q.sectionId === sec.id);
    if (firstQIdx >= 0) {
      setActiveQuestionIdx(firstQIdx);
    }
  };

  return (
    <div className={isSolutionView
      ? "flex h-screen w-screen flex-col overflow-hidden bg-gray-100 font-sans select-none text-xs leading-normal text-slate-800"
      : "flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-200 select-none pb-12"
    }>
      
      {/* 1. NAVIGATION BAR */}
      {isSolutionView ? (
        <header className="flex h-[72px] items-center justify-between bg-white border-b border-slate-300 px-4 text-slate-800 shrink-0 select-none">
          {/* Left Part: Mocktest Hub Logo & small sub-title */}
          <div className="flex flex-col items-start justify-center min-w-0">
            <div className="flex items-center gap-1.5">
              <Trophy className="h-5 w-5 text-blue-600 shrink-0" />
              <span className="font-black text-xs tracking-wider text-slate-900 uppercase leading-none">Mock Test Hub</span>
            </div>
            <span className="text-[9px] text-slate-500 font-bold mt-1 truncate max-w-[150px]">
              {examSession.testTitle}
            </span>
          </div>

          {/* Center: Test Name + Zoom Buttons + Hub ID */}
          <div className="flex-1 flex flex-col items-center justify-center px-2 min-w-0">
            <span className="font-extrabold text-[11px] sm:text-[12px] text-slate-900 text-center leading-snug line-clamp-2 w-full">
              {examSession.testTitle}
            </span>
            <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
              <button type="button" onClick={() => setQuestionFontSize(s => Math.min(s + 2, 24))} className="bg-[#1a6baf] hover:bg-[#155a96] text-white text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer active:scale-95 transition-all">Zoom (+)</button>
              <button type="button" onClick={() => setQuestionFontSize(s => Math.max(s - 2, 10))} className="bg-[#1a6baf] hover:bg-[#155a96] text-white text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer active:scale-95 transition-all">Zoom (-)</button>
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
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 backdrop-blur-md px-4 md:px-12 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="bg-[#E6F4FE] dark:bg-slate-800 p-2 rounded-full shadow-sm flex items-center justify-center h-10 w-10 border border-blue-200/50 dark:border-slate-700 shrink-0">
                <Trophy className="h-5.5 w-5.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-extrabold text-sm leading-tight text-slate-900 dark:text-white tracking-wider">{language === 'hi' ? 'मॉक टेस्ट हब' : 'MOCK TEST HUB'}</h1>
                <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase leading-none mt-0.5">{language === 'hi' ? 'परीक्षा की तैयारी' : 'EXAM PREPARATION'}</p>
              </div>
            </Link>
            <span className="hidden md:inline h-6 w-[1px] bg-slate-200 dark:bg-slate-800 shrink-0"></span>
            <button
              onClick={handleBackToTestSeries}
              className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs tracking-wide transition-colors cursor-pointer bg-transparent border-none p-0 outline-none shrink-0"
              title={language === 'hi' ? 'टेस्ट सीरीज पर वापस जाएं' : 'Back to Test Series'}
            >
              <ArrowLeft className="h-4 w-4" /> 
              <span className="hidden md:inline">{language === 'hi' ? 'टेस्ट सीरीज पर वापस जाएं' : 'Back to Test Series'}</span>
              <span className="inline md:hidden">{language === 'hi' ? 'वापस' : 'Back'}</span>
            </button>
            <span className="hidden md:inline h-6 w-[1px] bg-slate-200 dark:bg-slate-800 shrink-0"></span>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-xs md:text-sm text-slate-900 dark:text-white leading-tight truncate">{examSession.testTitle}</span>
              <span className="hidden md:inline text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{language === 'hi' ? 'समाधान और विश्लेषण डैशबोर्ड' : 'Solution & Analysis Dashboard'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-4">
            {/* Lang Selector */}
            <div className="flex items-center gap-1 md:gap-1.5">
              <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0 hidden sm:inline" />
              <select
                value={lang}
                onChange={(e) => handleLangChange(e.target.value as 'en' | 'hi')}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 md:px-2.5 py-1 outline-none text-[11px] md:text-xs text-slate-800 dark:text-slate-200 cursor-pointer font-bold transition-colors"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
              </select>
            </div>

            {/* Theme switcher */}
            <button 
              onClick={toggleTheme}
              className="p-1.5 md:p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800 shrink-0"
              title={theme === 'light' ? t.themeDark : t.themeLight}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </header>
      )}

      {/* 2. STATS OVERVIEW CARDS */}
      <section className={`max-w-6xl w-full mx-auto px-6 mt-8 ${viewMode === 'analysis' ? 'block' : 'hidden'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          
          <div className="flex items-center gap-3 border-r border-slate-200 dark:border-slate-800/80 pr-4 last:border-0">
            <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{t.analysisScore}</p>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                {sessionRecord.score} <span className="text-xs text-slate-500 font-bold font-sans">/ {sessionRecord.maxScore}</span>
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-3 md:border-r border-slate-200 dark:border-slate-800/80 pr-4 last:border-0">
            <div className="bg-green-500/10 p-2.5 rounded-xl text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{t.analysisAccuracy}</p>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{sessionRecord.accuracy}%</h4>
            </div>
          </div>

          <div className="flex items-center gap-3 border-r border-slate-200 dark:border-slate-800/80 pr-4 last:border-0">
            <div className="bg-purple-500/10 p-2.5 rounded-xl text-purple-600 dark:text-purple-400">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{t.analysisTimeTaken}</p>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{formatDuration(computedTimeTakenSeconds)}</h4>
            </div>
          </div>


        </div>
      </section>


      {/* Testbook Equivalent Benchmarking Card */}
      {sessionRecord.testbookRank && sessionRecord.mockTest && (
        <section className={`max-w-6xl w-full mx-auto px-6 mt-6 ${activeMobileTab === 'analysis' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900/30 dark:to-indigo-950/10 border border-blue-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-500/20">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    {lang === 'hi' ? 'टेस्टबुक समकक्ष रैंक' : 'Equivalent Testbook Rank'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {lang === 'hi' 
                      ? 'टेस्टबुक के परीक्षणकर्ताओं के डेटा के आधार पर सांख्यिकीय अनुमान।' 
                      : 'Statistical projection based on Testbook performance parameters.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-center flex-wrap">
                <div className="bg-white dark:bg-slate-950 px-5 py-3 rounded-xl border border-slate-200/60 dark:border-slate-850 shadow-sm text-center min-w-[120px]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'hi' ? 'अनुमानित रैंक' : 'EST. RANK'}</span>
                  <h3 className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                    #{sessionRecord.testbookRank} <span className="text-[11px] text-slate-400 font-normal">/ {sessionRecord.mockTest.testbookTotalUsers}</span>
                  </h3>
                </div>

                <div className="bg-white dark:bg-slate-950 px-5 py-3 rounded-xl border border-slate-200/60 dark:border-slate-850 shadow-sm text-center min-w-[120px]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'hi' ? 'प्रतिशतक (Percentile)' : 'PERCENTILE'}</span>
                  <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {sessionRecord.testbookPercentile}%
                  </h3>
                </div>
              </div>

            </div>

            {/* Benchmarking Scale */}
            <div className="mt-6 border-t border-slate-200/60 dark:border-slate-800/80 pt-6">
              <h5 className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest mb-3">
                {lang === 'hi' ? 'प्रदर्शन बेंचमार्किंग' : 'PERFORMANCE BENCHMARKING'}
              </h5>
              
              <div className="relative pt-6 pb-2">
                {/* Horizontal progress bar */}
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full relative">
                  {/* Fill range from average to topper */}
                  <div 
                    className="absolute h-full bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-650 rounded-full"
                    style={{
                      left: `${Math.max(0, Math.min(100, (sessionRecord.mockTest.testbookAverageScore / sessionRecord.maxScore) * 100))}%`,
                      right: `${Math.max(0, Math.min(100, 100 - (sessionRecord.mockTest.testbookTopperScore / sessionRecord.maxScore) * 100))}%`
                    }}
                  />

                  {/* Fill range for user score */}
                  <div 
                    className={`absolute h-full rounded-full ${isCutoffCleared ? 'bg-gradient-to-r from-blue-500 to-green-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-blue-500 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'}`}
                    style={{
                      left: 0,
                      width: `${Math.min(100, Math.max(0, (sessionRecord.score / sessionRecord.maxScore) * 100))}%`
                    }}
                  />

                  {/* Mark: Cutoff Score */}
                  <div 
                    className="absolute top-[-24px] transform -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${(cutoffScore / sessionRecord.maxScore) * 100}%` }}
                  >
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                      {lang === 'hi' ? 'कटऑफ: ' : 'Cutoff: '} {cutoffScore}
                    </span>
                    <div className="w-[1.5px] h-6 bg-amber-500 mt-1"></div>
                  </div>
                  
                  {/* Mark: Average Score */}
                  <div 
                    className="absolute top-[-24px] transform -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${(sessionRecord.mockTest.testbookAverageScore / sessionRecord.maxScore) * 100}%` }}
                  >
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {lang === 'hi' ? 'औसत: ' : 'Avg: '} {sessionRecord.mockTest.testbookAverageScore}
                    </span>
                    <div className="w-[1.5px] h-6 bg-slate-400 mt-1"></div>
                  </div>

                  {/* Mark: User Score */}
                  <div 
                    className="absolute top-[-30px] transform -translate-x-1/2 flex flex-col items-center z-10"
                    style={{ left: `${(sessionRecord.score / sessionRecord.maxScore) * 100}%` }}
                  >
                    <span className="text-[9px] font-black text-white bg-blue-600 px-2 py-0.5 rounded-full shadow-md shadow-blue-500/20">
                      {lang === 'hi' ? 'आपका स्कोर: ' : 'You: '} {sessionRecord.score}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-blue-600 border border-white dark:border-slate-900 mt-0.5"></div>
                    <div className="w-[1.5px] h-3.5 bg-blue-600"></div>
                  </div>

                  {/* Mark: Topper Score */}
                  <div 
                    className="absolute top-[-24px] transform -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${(sessionRecord.mockTest.testbookTopperScore / sessionRecord.maxScore) * 100}%` }}
                  >
                    <span className="text-[9px] font-bold text-green-600 bg-green-50 dark:bg-green-950/40 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-900/50">
                      {lang === 'hi' ? 'टॉपर: ' : 'Topper: '} {sessionRecord.mockTest.testbookTopperScore}
                    </span>
                    <div className="w-[1.5px] h-6 bg-green-500 mt-1"></div>
                  </div>

                </div>
                
                {/* Scale helper texts */}
                <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">
                  <span>0 {lang === 'hi' ? 'अंक' : 'Marks'}</span>
                  <span>{sessionRecord.maxScore} {lang === 'hi' ? 'अंक' : 'Marks'}</span>
                </div>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* Attempt Selector and Comparison Dashboard */}
      {attempts.length >= 1 && (
        <section className={`max-w-6xl w-full mx-auto px-6 mt-6 ${viewMode === 'analysis' ? 'block' : 'hidden'}`}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <h5 className="font-extrabold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t.analysisAttemptSelector}</h5>
              <div className="flex flex-wrap gap-2">
                {attempts.map((att, idx) => (
                  <button
                    key={att.id}
                    onClick={() => setSelectedAttemptIdx(idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition active:scale-95 border ${
                      selectedAttemptIdx === idx
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {getAttemptLabel(idx, attempts.length, language)} ({att.date})
                  </button>
                ))}
              </div>
            </div>
            
            <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 flex-1">
              <h5 className="font-extrabold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t.analysisCompareAttempts}</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {attempts.map((att, idx) => {
                  const isCurrent = selectedAttemptIdx === idx;
                  return (
                    <div key={att.id} className={`flex items-center justify-between text-xs p-2.5 rounded-xl font-bold border transition-colors ${isCurrent ? 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/80' : 'bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-850'}`}>
                      <span>{getAttemptLabel(idx, attempts.length, language)} {isCurrent && (language === 'hi' ? '(अवलोकन)' : '(Viewing)')}</span>
                      <div className="flex items-center gap-4">
                        <span>{language === 'hi' ? 'अंक:' : 'Score:'} <strong className="text-slate-850 dark:text-slate-200">{att.score}/{att.maxScore}</strong></span>
                        <span>{language === 'hi' ? 'सटीकता:' : 'Accuracy:'} <strong className="text-slate-850 dark:text-slate-200">{att.accuracy}%</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Subject-wise Breakdown Section */}
      <section className={`max-w-6xl w-full mx-auto px-6 mt-6 animate-in fade-in duration-300 ${viewMode === 'analysis' ? 'block' : 'hidden'}`}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h4 className="font-extrabold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-2">
            <Award className="h-4.5 w-4.5 text-blue-500" /> {lang === 'hi' ? 'विषयवार प्रदर्शन विश्लेषण' : 'Subject-wise Performance Breakdown'}
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
            {sectionalAnalysis.map((sec) => {
              // maxSecScore = total questions × positiveMark (actual max marks, not question count)
              const maxSecScore = sec.total * sec.positiveMark;
              const scorePercent = maxSecScore > 0 ? Math.min(100, Math.max(0, (sec.score / maxSecScore) * 100)) : 0;
              const secAccuracy = sec.attempted > 0 ? (sec.correct / sec.attempted) * 100 : 0;
              const accuracyColor = secAccuracy >= 75 ? 'text-green-600 dark:text-green-400' : (secAccuracy >= 50 ? 'text-blue-600 dark:text-blue-400' : 'text-red-650 dark:text-red-400');
              const barColor = secAccuracy >= 75 ? 'bg-green-500' : (secAccuracy >= 50 ? 'bg-blue-500' : 'bg-red-500');

              return (
                <div key={sec.name} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 p-4.5 rounded-2xl flex flex-col justify-between hover:shadow-md transition-all duration-200 relative overflow-hidden group">
                  <div className="absolute -top-6 -right-6 w-12 h-12 rounded-full bg-slate-500/5 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
                  
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-850 dark:text-slate-200 truncate">{sec.name}</h5>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{lang === 'hi' ? 'स्कोर' : 'SCORE'}</span>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400">{sec.score.toFixed(2)} / {maxSecScore.toFixed(0)}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-855 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${scorePercent}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-200/60 dark:border-slate-800/80 space-y-2">
                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                      <span>{lang === 'hi' ? 'सटीकता' : 'Accuracy'}:</span>
                      <span className={`font-black ${accuracyColor}`}>{secAccuracy.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                      <span>{lang === 'hi' ? 'सही / गलत' : 'Correct / Wrong'}:</span>
                      <span className="font-mono text-[10px] font-extrabold"><strong className="text-green-600 dark:text-green-400">{sec.correct}</strong> / <strong className="text-red-500">{sec.incorrect}</strong></span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                      <span>{lang === 'hi' ? 'छोड़े गए' : 'Unattempted'}:</span>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400">{sec.unattempted}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                      <span>{lang === 'hi' ? 'मार्किंग' : 'Marking'}:</span>
                      <span className="font-extrabold"><strong className="text-green-600">+{sec.positiveMark}</strong> / <strong className="text-red-500">−{sec.negativeMark}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Universal Solution Page Navigation Button on Analysis Screen */}
      {viewMode === 'analysis' && (
        <div className="max-w-6xl w-full mx-auto px-6 mt-6 mb-12">
          <button
            onClick={() => setViewMode('solution')}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 border border-blue-500/10 text-xs md:text-sm cursor-pointer"
          >
            <HelpCircle className="h-4.5 w-4.5" />
            {language === 'hi' ? 'सविस्तार समाधान और व्याख्या देखें' : 'View Detailed Solutions & Explanation'}
          </button>
        </div>
      )}

      {/* 3. SPLIT WORKSPACE - QUESTION DETAIL & PALETTE */}
      <section className={isSolutionView
        ? "flex flex-col lg:flex-row flex-1 overflow-hidden bg-[#F1F5F9] w-full h-full pb-16 flex"
        : "max-w-6xl w-full mx-auto px-6 mt-6 flex flex-col lg:flex-row gap-8 items-start pb-24 hidden"
      }>
        
        {/* LEFT WORKSPACE PANEL: QUESTION VIEW */}
        <main className={isSolutionView
          ? "flex-1 flex flex-col bg-white border-r border-slate-205 h-full overflow-y-auto p-6"
          : "flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm min-h-[480px] flex flex-col justify-between w-full"
        }>
          
          <div>
            {isSolutionView && (
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold shrink-0 mb-4 -mx-6 -mt-6">
                <span className="text-[#0747A6] text-xs">Question Type: Multiple Choice Question</span>
                <div className="flex gap-2">
                  <span className="text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                    Marks: +{currentSection.positiveMark}
                  </span>
                  <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                    Negative: -{currentSection.negativeMark}
                  </span>
                </div>
              </div>
            )}
            {/* Mobile-only Horizontal Question Palette Bar (placed at the top of the question workspace) */}
            <div className="block lg:hidden w-full overflow-x-auto pb-3 mb-5 shrink-0 scrollbar-none border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex gap-2 px-1 min-w-max">
                {questionStatuses.map((stat, idx) => {
                  const isActive = idx === activeQuestionIdx;
                  
                  let statusBg = 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-850 dark:text-slate-400';
                  if (stat.status === 'correct') {
                    statusBg = 'bg-green-600 text-white shadow shadow-green-950/20';
                  } else if (stat.status === 'incorrect') {
                    statusBg = 'bg-red-650 text-white shadow shadow-red-950/20';
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

              {/* Time stats and Bookmark button */}
              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                    {language === 'hi' ? 'आपका समय: ' : 'Your Time: '}<strong className="text-slate-800 dark:text-white font-bold">{userTime > 0 ? `${userTime}s` : (language === 'hi' ? 'N/A' : 'N/A')}</strong>
                  </span>
                </div>

                <button
                  onClick={() => toggleBookmark(testId, activeQuestion.id)}
                  className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                    isBookmarked
                      ? 'bg-yellow-50 border-yellow-300 text-yellow-750 dark:bg-yellow-950/20 dark:border-yellow-900 dark:text-yellow-450'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Bookmark className={`h-3 w-3 ${isBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  {isBookmarked ? (language === 'hi' ? 'बुकमार्क किया गया' : 'Bookmarked') : (language === 'hi' ? 'बुकमार्क करें' : 'Bookmark')}
                </button>

                <button
                  onClick={() => handleOpenReportModal(activeQuestion.id)}
                  className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-905 bg-red-55 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/45 transition-all active:scale-95 cursor-pointer"
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
                content={decodeHtml(activeQuestion.content[lang]?.questionText || activeQuestion.content['en']?.questionText || "")}
              />

              {activeQuestion.content[lang]?.mathLatex && (
                <div className="bg-slate-100 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800/80 font-mono text-xs text-blue-600 dark:text-blue-400">
                  Latex: {activeQuestion.content[lang].mathLatex}
                </div>
              )}

              {/* Optional Question Image */}
              {(activeQuestion.content[lang]?.imageUrl || activeQuestion.content['en']?.imageUrl) && (
                <div className="flex justify-center bg-slate-50 dark:bg-slate-850 p-2 border border-slate-200 dark:border-slate-800 rounded-md">
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
                      <MathJaxText content={decodeHtml(optLabel)} />
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
                content={decodeHtml(activeExplanation[lang] || activeExplanation['en'] || "")}
              />
            </div>
            </div>

          </div>

            {/* Navigation CTAs */}
            <div className={`justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-5 mt-8 ${viewMode === 'solution' ? 'hidden' : 'flex'}`}>
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
            ? "hidden lg:flex w-full lg:w-72 bg-[#F1F5F9] p-3 flex-col shrink-0 h-full overflow-y-auto border-l border-slate-300"
            : "hidden lg:block w-full lg:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm lg:sticky lg:top-24 lg:self-start"
          }>
          {isSolutionView ? (
            <>
              {/* Candidate Info Card */}
              <div className="bg-white border border-slate-200 p-3 rounded-lg flex items-center gap-2.5 shadow-sm mb-3">
                <div className="h-12 w-10 bg-slate-50 border border-slate-200 rounded flex items-center justify-center text-slate-400"><User className="h-6 w-6" /></div>
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Candidate</span>
                  <span className="font-bold text-slate-800 text-xs truncate leading-tight mt-0.5">{currentUser.name || 'Student Name'}</span>
                  <span className="text-[9px] text-slate-500 truncate mt-0.5">Hub ID: {currentUser.candidateCode || currentUser.id.slice(0, 12)}</span>
                </div>
              </div>

              {/* Palette Grid for All Sections */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-3">
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
                  <div className="space-y-1.5 text-[9px] font-bold text-slate-650">
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
                  <span className="h-3 w-3 rounded-full bg-red-650"></span>
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
                    statusBg = 'bg-red-650 text-white shadow shadow-red-950/20';
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
        <footer className="fixed bottom-0 left-0 right-0 h-[52px] bg-white border-t border-slate-300 z-50 flex items-center justify-between px-4 select-none">
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
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition active:scale-95 cursor-pointer"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport || reportingSuccess}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-750 text-white shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
