"use client";

import React, { useEffect, useState, use, useRef } from 'react';
import {
  useTestEngine,
  TestEngineProvider,
  ActiveSession,
  Question,
  EngineState
} from '../../useTestEngine';
import { useAuth, TestCategory, MockTestItem } from '../../AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, CheckCircle2, ShieldAlert, ShieldCheck, Globe, User, BookOpen, AlertCircle, ArrowLeft, Sun, Moon, Clock, Pause, Play, Menu, X, Trophy, Star } from 'lucide-react';
import { useIsMobile } from '../../useIsMobile';

import { processQuestionHtml, decodeHtml } from '../../lib/mathUtils';
import MathJaxText from '../../lib/MathJaxText';




function handleReturnToTestSeries(testId: string, catalog: any[], router: any) {
  if (typeof window !== 'undefined') {
    // 1. If referrer is a mock-tests page with query params or hash, history back works best
    if (document.referrer && document.referrer.includes(window.location.host) && document.referrer.includes('/mock-tests') && (document.referrer.includes('sub=') || document.referrer.includes('#exam-'))) {
      window.history.back();
      return;
    }

    // 2. Search catalog for exact category, subcategory, and sub-subcategory
    if (catalog && catalog.length > 0) {
      for (const cat of catalog) {
        for (const sub of cat.subCategories || []) {
          // Check sub-subcategories first for deepest specificity
          for (const ss of sub.subSubCategories || []) {
            const foundInSubSub = (ss.tests || []).find((t: any) => t.id === testId);
            if (foundInSubSub) {
              const url = `/mock-tests?cat=${cat.id}&sub=${sub.id}&subsub=${ss.id}#exam-${sub.id}-${ss.id}`;
              if (router && router.push) {
                router.push(url);
              } else {
                window.location.href = url;
              }
              return;
            }
          }
          // Check direct subcategory tests
          const foundInSub = (sub.tests || []).find((t: any) => t.id === testId);
          if (foundInSub) {
            const url = `/mock-tests?cat=${cat.id}&sub=${sub.id}#exam-${sub.id}`;
            if (router && router.push) {
              router.push(url);
            } else {
              window.location.href = url;
            }
            return;
          }
        }
      }
    }

    // 3. Exam ID fallback heuristic matching
    const lower = (testId || '').toLowerCase();
    if (lower.includes('ctet')) {
      const isPaper2 = lower.includes('paper2') || lower.includes('paper-2') || lower.includes('p2');
      const url = `/mock-tests?cat=teaching&sub=ctet${isPaper2 ? '&subsub=paper2' : ''}#exam-ctet${isPaper2 ? '-paper2' : ''}`;
      if (router && router.push) router.push(url); else window.location.href = url;
      return;
    }
    if (lower.includes('rpsc') || lower.includes('ras')) {
      const url = `/mock-tests?cat=rpsc&sub=rpsc_ras#exam-rpsc_ras`;
      if (router && router.push) router.push(url); else window.location.href = url;
      return;
    }
    if (lower.includes('ssc')) {
      const url = `/mock-tests?cat=ssc&sub=ssc_cgl#exam-ssc_cgl`;
      if (router && router.push) router.push(url); else window.location.href = url;
      return;
    }
    if (lower.includes('rrb') || lower.includes('railway')) {
      const url = `/mock-tests?cat=railways&sub=rrb_ntpc#exam-rrb_ntpc`;
      if (router && router.push) router.push(url); else window.location.href = url;
      return;
    }

    // 4. History back fallback
    if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
      window.history.back();
      return;
    }

    // 5. Default fallback
    if (router && router.push) {
      router.push('/mock-tests');
    } else {
      window.location.href = '/mock-tests';
    }
  }
}

function TestUploadedSoonCard({ testId, testTitle, catalog, router, currentUser }: { testId: string; testTitle: string; catalog: any[]; router: any; currentUser?: any }) {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(`requested_upload_${testId}`) === 'true') {
        setRequested(true);
      }
    } catch {}
  }, [testId]);

  const handleRequestUpload = async () => {
    if (requesting || requested) return;
    setRequesting(true);
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-suggestion',
          data: {
            userId: currentUser?.id || 'guest_web',
            name: currentUser?.name || 'Website Candidate',
            email: currentUser?.email || 'guest@website.com',
            category: 'Test Upload Request',
            message: `Request to upload questions for test: ${testTitle || 'Mock Test'} (Test ID: ${testId})`,
            source: 'website'
          }
        })
      });
      setRequested(true);
      try {
        localStorage.setItem(`requested_upload_${testId}`, 'true');
      } catch {}
      alert('Request Received 🚀\nYour upload request for this test has been submitted to the admin suggestion box!');
    } catch (err) {
      setRequested(true);
      alert('Request Received 🚀\nYour upload request for this test has been submitted to the admin suggestion box!');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 font-sans text-slate-100">
      <div className="w-full max-w-md text-center bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
        <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/10">
          <Clock className="w-8 h-8 animate-pulse text-amber-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Test Uploaded Soon</h2>
        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
          Questions for <span className="text-blue-400 font-bold">{testTitle || 'this mock test'}</span> are currently being curated and will be uploaded soon. Please check back later!
        </p>
        <div className="p-3 bg-slate-900/80 border border-slate-700/50 rounded-xl mb-5 text-xs text-amber-300 font-medium flex items-center justify-center gap-2">
          <span>⚡</span>
          <span>यह टेस्ट जल्द ही पोर्टल पर अपलोड कर दिया जाएगा।</span>
        </div>
        
        <button
          onClick={handleRequestUpload}
          disabled={requesting || requested}
          className={`w-full py-3 px-6 rounded-xl font-bold text-sm transition-all shadow-md mb-3 flex items-center justify-center gap-2 cursor-pointer ${
            requested
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default'
              : requesting
              ? 'bg-amber-600/50 text-white cursor-wait'
              : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-amber-500/20 active:scale-95'
          }`}
        >
          {requested ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>✓ Upload Requested</span>
            </>
          ) : requesting ? (
            <span>Submitting Request...</span>
          ) : (
            <span>🚀 Request to Upload Test</span>
          )}
        </button>

        <button
          onClick={() => handleReturnToTestSeries(testId, catalog, router)}
          className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer text-sm"
        >
          Return to Test Series
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// DYNAMIC EXAM GENERATOR IMPORTED FROM UTILS
// ============================================================================
import { generateExamSession } from '../../lib/examUtils';


function TcsIonEngine({ testId, initialExamLanguage, selectedLang1, selectedLang2 }: { testId: string; initialExamLanguage?: 'en' | 'hi'; selectedLang1?: string; selectedLang2?: string }) {
  const {
    state,
    initSession,
    selectOption,
    saveAndNext,
    clearResponse,
    markForReviewAndNext,
    jumpToQuestion,
    switchSection,
    setLanguage,
    submitSection,
    submitExam,
    pauseExam,
    resumeExam,
    dismissExtraTimeRules,
    enterExtraTimeMode,
  } = useTestEngine();

  const { addAttempt, currentUser, saveOngoingSession, language: authLanguage, examCatalog } = useAuth();
  const router = useRouter();

  const [attemptSaved, setAttemptSaved] = useState(false);
  const [questionLanguages, setQuestionLanguages] = useState<Record<string, 'en' | 'hi'>>({});
  const [websiteRating, setWebsiteRating] = useState(0);
  const [examRating, setExamRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [isBlinkingStars, setIsBlinkingStars] = useState(false);

  // Prevent browser back / popstate navigation once the exam is submitted
  useEffect(() => {
    if (!state.isExamSubmitted) return;

    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [state.isExamSubmitted]);

  const { isMobile, isMounted } = useIsMobile();
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showSectionSubmitConfirm, setShowSectionSubmitConfirm] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [questionFontSize, setQuestionFontSize] = useState(14); // px, default 14px


  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  const initializedRef = useRef(false);
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const saveOngoingSessionRef = useRef(saveOngoingSession);
  useEffect(() => {
    saveOngoingSessionRef.current = saveOngoingSession;
  }, [saveOngoingSession]);

  // Automatically pause exam, save state instantly, and display pause popup when tab is switched, browser minimized, or window focus lost
  useEffect(() => {
    if (state.isExamSubmitted) return;

    const handlePauseAndSave = () => {
      pauseExam();
      setIsManuallyPaused(true);

      const currentState = stateRef.current;
      if (currentState.session && currentState.session.questions && currentState.session.questions.length > 0 && !currentState.isExamSubmitted) {
        const localSnap = {
          testId,
          status: 'ONGOING',
          timeRemaining: currentState.timeRemaining,
          violations: currentState.violationsCount,
          currentSectionIndex: currentState.currentSectionIndex,
          currentQuestionIndex: currentState.currentQuestionIndex,
          responses: currentState.responses,
          savedAt: Date.now(),
          updatedAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(`ongoing_web_${testId}`, JSON.stringify(localSnap));
        } catch {}

        saveOngoingSessionRef.current(
          testId,
          currentState.session.testTitle,
          currentState.timeRemaining,
          currentState.violationsCount,
          currentState.responses,
          currentState.currentSectionIndex,
          currentState.currentQuestionIndex
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        handlePauseAndSave();
      }
    };

    const handleBlur = () => {
      handlePauseAndSave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [state.isExamSubmitted, pauseExam, testId]);

  // Initialize session on mount (checking for resume) — runs ONLY ONCE
  useEffect(() => {
    if (state.isExamSubmitted || initializedRef.current || state.session) return;
    initializedRef.current = true;

    const initialize = async () => {
      let customQs = null;
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
          customQs = {
            questions: data.questions,
            positiveMarks: data.positiveMarks,
            negativeMarks: data.negativeMarks,
            durationMinutes: data.durationMinutes,
            questionsCount: data.questionsCount,
            maxMarks: data.maxMarks,
            hasSectionalTiming: data.hasSectionalTiming,
            sectionalTimings: data.sectionalTimings,
            sections: data.sections,
          };
        }
      } catch (err) {
        console.error("Error fetching custom questions:", err);
      }

      const examSession = generateExamSession(testId, examCatalog, customQs, selectedLang1, selectedLang2);

      // Detect RPSC RAS full tests and PYQs for mandatory-attempt extra time feature
      // Primary detection: use the parent category & subcategory names from the exam catalog
      // (these are always populated now via generateExamSession's catalog lookup)
      // Secondary detection: fallback to testId and title string matching
      const idLower = testId.toLowerCase();
      const titleLower = (examSession.testTitle || '').toLowerCase();
      const catLower = (examSession.testCategory || '').toLowerCase();
      const subLower = (examSession.testSubcategory || '').toLowerCase();
      
      const isRpscRas = 
        // Primary: Category is "RPSC Exams" and subcategory contains "RAS"
        (catLower.includes('rpsc') && (subLower.includes('ras') || titleLower.includes('ras'))) ||
        // Secondary: testId-based detection for tests with explicit RPSC RAS in ID
        idLower.includes('rpsc_ras') || 
        idLower.includes('rpsc-ras') || 
        idLower.includes('rpsc__ras') ||
        // Title-based detection for PYQs and named tests
        (titleLower.includes('rpsc') && (titleLower.includes('ras') || titleLower.includes('prelim'))) ||
        (titleLower.includes('ras') && (titleLower.includes('prelim') || titleLower.includes('full') || titleLower.includes('pyq') || titleLower.includes('paper')));
      
      if (isRpscRas) {
        console.log('[RPSC RAS] Detected RPSC RAS mode for test:', testId, '| title:', examSession.testTitle, '| cat:', examSession.testCategory, '| sub:', examSession.testSubcategory);
      }

      // 1. Check server for an ongoing session first
      const user = currentUserRef.current;
      const ongoingRecord = user?.testSessions?.find(
        (s: any) => s.testId === testId && s.status === 'ONGOING'
      );

      // 2. Fallback: check localStorage for a locally-saved snapshot (works offline)
      let localSnap: any = null;
      if (!ongoingRecord) {
        try {
          const raw = localStorage.getItem(`ongoing_web_${testId}`);
          if (raw) {
            localSnap = JSON.parse(raw);
            // Only use if it's actually an ongoing session
            if (localSnap?.status !== 'ONGOING') localSnap = null;
          }
        } catch {}
      }

      const resumeSource = ongoingRecord || localSnap;
      const examLangToUse = initialExamLanguage || authLanguage || 'en';

      if (resumeSource && resumeSource.responses) {
        initSession(examSession, 3, {
          responses: resumeSource.responses as any,
          timeRemaining: resumeSource.timeRemaining ?? examSession.totalDurationSeconds,
          violationsCount: resumeSource.violations ?? 0,
          currentSectionIndex: resumeSource.currentSectionIndex ?? 0,
          currentQuestionIndex: resumeSource.currentQuestionIndex ?? 0,
        }, examLangToUse, isRpscRas);
      } else {
        initSession(examSession, 3, undefined, examLangToUse, isRpscRas); // 3 violations allowed
      }
    };

    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, initialExamLanguage, authLanguage, state.isExamSubmitted]);

  // Save state to localStorage (instant, works offline) and server on unload/unmount
  useEffect(() => {
    const handleSave = () => {
      const currentState = stateRef.current;
      if (currentState.session && currentState.session.questions && currentState.session.questions.length > 0 && !currentState.isExamSubmitted) {
        // Always save to localStorage immediately (works offline, zero latency)
        const localSnap = {
          testId,
          status: 'ONGOING',
          timeRemaining: currentState.timeRemaining,
          violations: currentState.violationsCount,
          currentSectionIndex: currentState.currentSectionIndex,
          currentQuestionIndex: currentState.currentQuestionIndex,
          responses: currentState.responses,
          savedAt: Date.now(),
          updatedAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(`ongoing_web_${testId}`, JSON.stringify(localSnap));
        } catch {}

        // Also sync to server (may fail if offline — localStorage already has it)
        saveOngoingSessionRef.current(
          testId,
          currentState.session.testTitle,
          currentState.timeRemaining,
          currentState.violationsCount,
          currentState.responses,
          currentState.currentSectionIndex,
          currentState.currentQuestionIndex
        );
      }
    };

    window.addEventListener('beforeunload', handleSave);

    return () => {
      handleSave();
      window.removeEventListener('beforeunload', handleSave);
    };
  }, [testId]);

  // Track sectional transitions when sectional timing is active
  const lastSectionIndexRef = useRef(state.currentSectionIndex);
  useEffect(() => {
    lastSectionIndexRef.current = state.currentSectionIndex;
  }, [state.currentSectionIndex]);

  // Sync attempt score on exam submission
  useEffect(() => {
    if (state.isExamSubmitted && state.score && currentUser && !attemptSaved) {
      setAttemptSaved(true);
      
      // Clear local ongoing snapshot immediately BEFORE updating currentUser / calling addAttempt
      try { localStorage.removeItem(`ongoing_web_${testId}`); } catch {}

      const savedResponses: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number }> = {};
      Object.keys(state.responses).forEach(qId => {
        savedResponses[qId] = {
          selectedOptionIndex: state.responses[qId].selectedOptionIndex,
          elapsedSeconds: state.responses[qId].elapsedSeconds
        };
      });

      addAttempt(
        testId,
        state.session?.testTitle || "Mock Test Attempt",
        state.score.obtainedMarks,
        state.score.totalMarks,
        state.score.accuracyPercentage,
        state.session ? state.session.totalDurationSeconds - state.timeRemaining : 0,
        state.violationsCount,
        savedResponses
      );
    }
  }, [state.isExamSubmitted, state.score, currentUser, addAttempt, testId, attemptSaved, state.responses, state.session, state.timeRemaining, state.violationsCount]);

  // Compute a safe activeQuestionId for MathJax hook at the top level
  const tempSession = state.session;
  const tempSection = tempSession?.sections?.[state.currentSectionIndex];
  const activeQuestionId = (tempSession && tempSection)
    ? tempSession.questions
        .filter((q) => q.sectionId === tempSection.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)[state.currentQuestionIndex]?.id
    : null;


  if (!state.session || !isMounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 font-sans">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Initializing Exam Terminal...</p>
        </div>
      </div>
    );
  }

  if (state.session && state.session.questions.length === 0) {
    return <TestUploadedSoonCard testId={testId} testTitle={state.session.testTitle} catalog={examCatalog} router={router} currentUser={currentUser} />;
  }

  const { session, currentSectionIndex, currentQuestionIndex, responses, timeRemaining, language, violationsCount, isExamSubmitted, score } = state;

  const currentSection = session.sections[currentSectionIndex];

  // Helper to extract questions in current section
  const currentSectionQuestions = session.questions
    .filter((q) => q.sectionId === currentSection.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const currentQuestion = currentSectionQuestions[currentQuestionIndex];
  const activeResponse = currentQuestion ? responses[currentQuestion.id] : null;

  // Format Time Remaining: HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // State Counts for Legend
  const getLegendCounts = () => {
    let notVisited = 0;
    let notAnswered = 0;
    let answered = 0;
    let marked = 0;
    let markedAndAnswered = 0;

    session.questions.forEach((q) => {
      if (session.hasSectionalTiming && q.sectionId !== currentSection.id) return;
      const resp = responses[q.id];
      if (resp) {
        if (resp.state === 1) notVisited++;
        else if (resp.state === 2) notAnswered++;
        else if (resp.state === 3) answered++;
        else if (resp.state === 4) marked++;
        else if (resp.state === 5) markedAndAnswered++;
      }
    });

    return { notVisited, notAnswered, answered, marked, markedAndAnswered };
  };

  const counts = getLegendCounts();

  // Counts for pause statistics
  const getPauseStats = () => {
    let attempted = 0;
    let marked = 0;

    session.questions.forEach((q) => {
      const resp = responses[q.id];
      if (resp) {
        if (resp.state === 3 || resp.state === 5) {
          attempted++;
        }
        if (resp.state === 4 || resp.state === 5) {
          marked++;
        }
      }
    });

    const remaining = session.questions.length - attempted;
    return { attempted, remaining, marked };
  };

  const { attempted: attemptedCount, remaining: remainingCount, marked: markedCount } = getPauseStats();

  return (
    <div className="flex h-screen flex-col bg-gray-100 font-sans select-none text-xs leading-normal text-slate-800">
      
      {/* 1. TOP HEADER BANNER */}
      {(() => {
        const isSsc = (testId.includes('ssc') || testId.toLowerCase().includes('ssc')) && !isMobile;
        if (!isSsc) {
          return (
            <header className="flex h-14 items-center justify-between bg-white border-b border-slate-200 px-3 sm:px-4 text-slate-800 shrink-0">
              {/* Left: Logo & Test Title */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="bg-[#E6F4FE] p-1.5 rounded-full shadow-sm flex items-center justify-center h-8 w-8 border border-blue-200/50 shrink-0">
                    <Trophy className="h-4.5 w-4.5 text-blue-600 animate-pulse" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-black text-[11px] sm:text-[12px] text-slate-900 tracking-wider leading-none uppercase">Mock Test Hub</span>
                    <span className="text-[7px] text-blue-600 font-extrabold tracking-wider uppercase mt-0.5 leading-none">India's #1 Prep Terminal</span>
                  </div>
                </div>
                <span className="text-slate-300 hidden xs:inline">|</span>
                <span className="font-bold text-xs sm:text-sm text-slate-700 truncate max-w-[120px] sm:max-w-xs md:max-w-none">
                  {session.testTitle}
                </span>
              </div>

              {/* Middle: Section Time countdown */}
              {state.isExtraTimeMode ? (
                <div className="flex items-center gap-1.5 text-xs font-bold bg-red-50 border border-red-300 px-2 sm:px-3 py-1 rounded animate-pulse">
                  <span className="text-red-600 uppercase tracking-wide text-[9px] sm:text-[10px] font-extrabold">⚠️ EXTRA TIME</span>
                  {(() => {
                    const timeStr = formatTime(state.extraTimeRemaining);
                    const parts = timeStr.split(':');
                    return (
                      <div className="flex items-center gap-1">
                        <span className="bg-red-600 text-white font-mono px-1 py-0.5 rounded text-[11px]">{parts[0]}</span>
                        <span className="text-red-600">:</span>
                        <span className="bg-red-600 text-white font-mono px-1 py-0.5 rounded text-[11px]">{parts[1]}</span>
                        <span className="text-red-600">:</span>
                        <span className="bg-red-600 text-white font-mono px-1 py-0.5 rounded text-[11px]">{parts[2]}</span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-650 bg-slate-50 border border-slate-200 px-2 sm:px-3 py-1 rounded">
                <span className="text-slate-500 uppercase tracking-wide text-[9px] sm:text-[10px] hidden xs:inline">Section Time</span>
                {(() => {
                  const timeStr = formatTime(timeRemaining);
                  const parts = timeStr.split(':');
                  return (
                    <div className="flex items-center gap-1">
                      <span className="bg-slate-500 text-white font-mono px-1 py-0.5 rounded text-[11px]">{parts[0]}</span>
                      <span>:</span>
                      <span className="bg-slate-500 text-white font-mono px-1 py-0.5 rounded text-[11px]">{parts[1]}</span>
                      <span>:</span>
                      <span className="bg-slate-500 text-white font-mono px-1 py-0.5 rounded text-[11px]">{parts[2]}</span>
                    </div>
                  );
                })()}
              </div>
              )}

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (!document.fullscreenElement) {
                        const p = document.documentElement.requestFullscreen();
                        if (p && typeof p.catch === 'function') p.catch(() => {});
                      } else {
                        const p = document.exitFullscreen();
                        if (p && typeof p.catch === 'function') p.catch(() => {});
                      }
                    } catch (e) {}
                  }}
                  className="border border-[#0D88B9] text-[#0D88B9] bg-white hover:bg-[#E3F2FD] px-2.5 py-1.5 rounded font-extrabold transition active:scale-95 cursor-pointer text-[9px] sm:text-[10px] uppercase tracking-wider hidden sm:inline-block"
                >
                  {isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    pauseExam();
                    setIsManuallyPaused(true);
                  }}
                  className="border border-[#0D88B9] text-[#0D88B9] bg-white hover:bg-[#E3F2FD] px-2.5 py-1.5 rounded font-extrabold transition active:scale-95 cursor-pointer text-[9px] sm:text-[10px] uppercase tracking-wider"
                >
                  Pause
                </button>
              </div>
            </header>
          );
        }
        return (
          <header className="flex h-[72px] items-center justify-between bg-white border-b border-slate-300 px-4 text-slate-800 shrink-0 select-none">
            {/* Left Part: Mocktest Hub Logo & small sub-title */}
            <div className="flex flex-col items-start justify-center min-w-0">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-5 w-5 text-blue-600 shrink-0" />
                <span className="font-black text-xs tracking-wider text-slate-900 uppercase leading-none">Mock Test Hub</span>
              </div>
              <span className="text-[9px] text-slate-500 font-bold mt-1 truncate max-w-[150px]">
                {session.testTitle}
              </span>
            </div>

            {/* Center: Test Name + Zoom Buttons + Hub ID */}
            <div className="flex-1 flex flex-col items-center justify-center px-2 min-w-0">
              <span className="font-extrabold text-[11px] sm:text-[12px] text-slate-900 text-center leading-snug line-clamp-2 w-full">
                {session.testTitle}
              </span>
              <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
                <button type="button" onClick={() => setQuestionFontSize(s => Math.min(s + 2, 24))} className="bg-[#1a6baf] hover:bg-[#155a96] text-white text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer active:scale-95 transition-all">Zoom (+)</button>
                <button type="button" onClick={() => setQuestionFontSize(s => Math.max(s - 2, 10))} className="bg-[#1a6baf] hover:bg-[#155a96] text-white text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer active:scale-95 transition-all">Zoom (-)</button>
                <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">Hub ID : {currentUser?.candidateCode || currentUser?.id?.slice(0, 12) || 'GUEST_HUB'}</span>
              </div>
            </div>

            {/* Right: Section Time + Profile Photos */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  pauseExam();
                  setIsManuallyPaused(true);
                }}
                className="flex items-center gap-1 bg-[#1a6baf] hover:bg-[#155a96] text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded transition cursor-pointer active:scale-95 shrink-0"
                title="Pause Test"
              >
                <Pause className="h-3 w-3 shrink-0" />
                <span>PAUSE</span>
              </button>
              <div className="flex flex-col items-center justify-center">
                {state.isExtraTimeMode ? (
                  <>
                    <span className="text-[9px] font-extrabold text-red-600 uppercase tracking-wide animate-pulse">⚠️ EXTRA TIME</span>
                    <span className="font-mono text-sm font-extrabold text-red-600 tracking-widest">
                      {formatTime(state.extraTimeRemaining)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Section Time</span>
                    <span className="font-mono text-sm font-extrabold text-red-600 tracking-widest">
                      {formatTime(timeRemaining)}
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => { try { if (!document.fullscreenElement) { const p = document.documentElement.requestFullscreen(); if (p && typeof p.catch === 'function') p.catch(() => {}); } else { const p = document.exitFullscreen(); if (p && typeof p.catch === 'function') p.catch(() => {}); } } catch(e) {} }}
                className="p-1 rounded text-slate-500 hover:bg-slate-100 transition cursor-pointer hidden sm:block"
                title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
              </button>
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
            </div>
          </header>
        );
      })()}

      {/* SSC SUB-HEADER BAR (Row 2) — only for SSC tests */}
      {(() => {
        const isSsc = (testId.toLowerCase().includes('ssc') || session?.testTitle?.toLowerCase().includes('ssc') || session?.testId?.toLowerCase().includes('ssc')) && !isMobile;
        if (!isSsc) return null;
        return (
          <div className="flex items-center justify-between bg-white border-b border-slate-300 px-3 py-1.5 shrink-0 select-none gap-2 flex-wrap min-h-[40px]">
            {/* Left: Section name boxes styled like ssc design.html */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {session.sections.map((sec, idx) => {
                const isActive = idx === currentSectionIndex;
                const isLocked = session.hasSectionalTiming && !isActive;
                let partLabel = `PART-${String.fromCharCode(65 + idx)}`; // PART-A, PART-B, etc.
                return (
                  <button
                    key={sec.id}
                    onClick={() => !isLocked && switchSection(idx)}
                    disabled={isLocked}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 whitespace-nowrap transition-all border ${
                      isActive
                        ? 'bg-[#008001] text-white border-[#008001]'
                        : isLocked
                        ? 'bg-[#f5f5f5] text-[#999] border-[#ddd] cursor-not-allowed opacity-50'
                        : 'bg-[#2E66CC] text-white border-[#2E66CC] hover:bg-[#1a4da6] cursor-pointer'
                    }`}
                  >
                    {partLabel}
                  </button>
                );
              })}
            </div>

            {/* Center: Action Buttons (Previous, Mark for Review, Save & Next, Clear Response) — Increased size with original #2E66CC colors */}
            <div className="flex-1 flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap px-3 py-1">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => currentQuestionIndex > 0 && jumpToQuestion(currentSectionIndex, currentQuestionIndex - 1)}
                className={`font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded text-xs sm:text-sm transition-all whitespace-nowrap ${
                  currentQuestionIndex === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-[#2E66CC] hover:bg-[#1a4da6] text-white cursor-pointer active:scale-95 border border-[#2E66CC]'
                }`}
              >
                Previous
              </button>
              <button 
                type="button" 
                onClick={markForReviewAndNext} 
                className="bg-[#2E66CC] hover:bg-[#1a4da6] text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded text-xs sm:text-sm cursor-pointer active:scale-95 transition-all whitespace-nowrap border border-[#2E66CC]"
              >
                Mark for Review
              </button>
              <button 
                type="button" 
                onClick={saveAndNext} 
                className="bg-[#2E66CC] hover:bg-[#1a4da6] text-white font-bold px-5 sm:px-6 py-2 sm:py-2.5 rounded text-xs sm:text-sm cursor-pointer active:scale-95 transition-all whitespace-nowrap border border-[#2E66CC]"
              >
                Save &amp; Next
              </button>
              <button 
                type="button" 
                onClick={clearResponse} 
                className="bg-[#2E66CC] hover:bg-[#1a4da6] text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded text-xs sm:text-sm cursor-pointer active:scale-95 transition-all whitespace-nowrap border border-[#2E66CC]"
              >
                Clear Response
              </button>
            </div>
          </div>
        );
      })()}

      {/* PAUSE SCREEN BLUR OVERLAY */}
      {isManuallyPaused && !isExamSubmitted && !showSubmitConfirm && !showSectionSubmitConfirm && state.session && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 md:p-8 text-center text-slate-800">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 mb-4 animate-pulse">
              <Clock className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-wide">Exam Paused</h2>
            <p className="text-slate-500 text-xs mb-6 font-semibold">Your exam timer and questions are hidden. Review your progress summary below to resume.</p>

            <div className="grid grid-cols-2 gap-4 text-left border-y border-slate-200 py-4 mb-6 font-semibold">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Total Questions:</p>
                <p className="text-sm font-extrabold text-slate-800">{session.questions.length}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Time Left:</p>
                <p className="text-sm font-extrabold text-yellow-600 font-mono tracking-wider">{formatTime(timeRemaining)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Attempted Qs:</p>
                <p className="text-sm font-extrabold text-green-600">{attemptedCount}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Remaining Qs:</p>
                <p className="text-sm font-extrabold text-red-500">{remainingCount}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 col-span-2">
                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Marked for Review Qs:</p>
                <p className="text-sm font-extrabold text-indigo-600">{markedCount}</p>
              </div>
            </div>

            <button
              onClick={() => {
                resumeExam();
                setIsManuallyPaused(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 rounded-lg shadow-lg hover:shadow-blue-500/20 active:scale-95 transition cursor-pointer text-xs uppercase tracking-wider"
            >
              <Play className="h-4 w-4" /> Resume Test
            </button>
          </div>
        </div>
      )}


      {/* GATING / SUBMITTED SCREEN OVERLAY */}
      {isExamSubmitted ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-5xl w-full shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 my-auto">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="h-12 w-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {language === 'hi' ? 'परीक्षा सफलतापूर्वक सबमिट की गई!' : 'Test Submitted Successfully!'}
                  </h2>
                  <p className="text-slate-500 text-xs font-semibold mt-0.5">
                    {language === 'hi'
                      ? 'आपकी परीक्षा उत्तर पुस्तिका सफलतापूर्वक दर्ज कर ली गई है। नीचे सभी अनुभागों का विवरण देखें।'
                      : 'Your answer sheet has been recorded. Review your section-wise question response breakdown below.'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-green-50 px-3.5 py-1.5 rounded-full border border-green-200 text-xs font-extrabold text-green-700 shrink-0 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                <span>{language === 'hi' ? 'सबमिटेड' : 'SUBMITTED'}</span>
              </div>
            </div>

            {/* Calculate Section Stats */}
            {(() => {
              const sectionStats = (session?.sections || []).map((sec, idx) => {
                const secQuestions = (session?.questions || []).filter(q => q.sectionId === sec.id);
                const total = secQuestions.length;
                let answered = 0;
                let answeredAndMarked = 0;
                let markedForReview = 0;
                let notAttempted = 0;

                secQuestions.forEach(q => {
                  const resp = responses[q.id];
                  const hasOption = resp?.selectedOptionIndex !== null && resp?.selectedOptionIndex !== undefined;
                  const isMarked = resp?.state === 4 || resp?.state === 5;

                  if (hasOption && !isMarked) {
                    answered++;
                  } else if (hasOption && isMarked) {
                    answeredAndMarked++;
                  } else if (!hasOption && isMarked) {
                    markedForReview++;
                  } else {
                    notAttempted++;
                  }
                });

                return {
                  sectionId: sec.id,
                  sectionName: sec.name || `Section ${idx + 1}`,
                  partLabel: `PART-${String.fromCharCode(65 + idx)}`,
                  total,
                  answered,
                  answeredAndMarked,
                  markedForReview,
                  notAttempted,
                };
              });

              const totalQuestionsAll = sectionStats.reduce((acc, s) => acc + s.total, 0);
              const totalAnsweredAll = sectionStats.reduce((acc, s) => acc + s.answered, 0);
              const totalAnsweredAndMarkedAll = sectionStats.reduce((acc, s) => acc + s.answeredAndMarked, 0);
              const totalMarkedAll = sectionStats.reduce((acc, s) => acc + s.markedForReview, 0);
              const totalNotAttemptedAll = sectionStats.reduce((acc, s) => acc + s.notAttempted, 0);

              return (
                <div className="py-5 flex flex-col gap-5">
                  {/* Top Overview Cards (Horizontal Row - 5 Status Categories) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Questions</p>
                      <p className="text-xl font-black text-slate-800 mt-0.5">{totalQuestionsAll}</p>
                    </div>
                    <div className="bg-green-50/70 border border-green-200 rounded-2xl p-3 text-center">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-green-700">Answered</p>
                      <p className="text-xl font-black text-green-700 mt-0.5">{totalAnsweredAll}</p>
                    </div>
                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3 text-center">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">Answered &amp; Marked</p>
                      <p className="text-xl font-black text-indigo-700 mt-0.5">{totalAnsweredAndMarkedAll}</p>
                    </div>
                    <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3 text-center">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700">Marked For Review</p>
                      <p className="text-xl font-black text-purple-700 mt-0.5">{totalMarkedAll}</p>
                    </div>
                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 text-center">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Not Attempted</p>
                      <p className="text-xl font-black text-amber-700 mt-0.5">{totalNotAttemptedAll}</p>
                    </div>
                  </div>

                  {/* Section Wise Breakdown Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                    <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        {language === 'hi' ? 'अनुभाग-वार उत्तर विवरण' : 'Section-Wise Response Summary'}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-500">
                        {sectionStats.length} {language === 'hi' ? 'अनुभाग' : 'Sections'}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                            <th className="py-2.5 px-4">Section Name</th>
                            <th className="py-2.5 px-3 text-center">Total Qs</th>
                            <th className="py-2.5 px-3 text-center">Answered</th>
                            <th className="py-2.5 px-3 text-center">Ans &amp; Marked</th>
                            <th className="py-2.5 px-3 text-center">Marked For Review</th>
                            <th className="py-2.5 px-3 text-center">Not Attempted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {sectionStats.map((sec) => (
                            <tr key={sec.sectionId} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-black shrink-0">{sec.partLabel}</span>
                                <span className="truncate">{sec.sectionName}</span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800">{sec.total}</td>
                              <td className="py-2.5 px-3 text-center font-extrabold text-green-600 bg-green-50/30">{sec.answered}</td>
                              <td className="py-2.5 px-3 text-center font-extrabold text-indigo-600 bg-indigo-50/30">{sec.answeredAndMarked}</td>
                              <td className="py-2.5 px-3 text-center font-extrabold text-purple-600 bg-purple-50/30">{sec.markedForReview}</td>
                              <td className="py-2.5 px-3 text-center font-extrabold text-amber-600 bg-amber-50/30">{sec.notAttempted}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                            <td className="py-2.5 px-4 uppercase tracking-wider">Total Summary</td>
                            <td className="py-2.5 px-3 text-center">{totalQuestionsAll}</td>
                            <td className="py-2.5 px-3 text-center text-green-700">{totalAnsweredAll}</td>
                            <td className="py-2.5 px-3 text-center text-indigo-700">{totalAnsweredAndMarkedAll}</td>
                            <td className="py-2.5 px-3 text-center text-purple-700">{totalMarkedAll}</td>
                            <td className="py-2.5 px-3 text-center text-amber-700">{totalNotAttemptedAll}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Bottom Row: Ratings + Action Button (Horizontal Split on >= 1080px, Stacked on < 1080px) */}
            <div className="pt-4 border-t border-slate-200 flex flex-col min-[1080px]:flex-row items-center justify-between gap-4 min-[1080px]:gap-5">
              {/* Feedback Rating Block - Stacked on < 1080px, Side-by-side on >= 1080px */}
              <div className="flex flex-col min-[1080px]:flex-row items-stretch min-[1080px]:items-center gap-3 min-[1080px]:gap-4 text-left w-full min-[1080px]:w-auto">
                {/* Rate Website */}
                <div className={`flex items-center justify-between min-[1080px]:justify-start gap-3 px-3 py-2 min-[1080px]:py-1.5 rounded-xl border transition-all w-full min-[1080px]:w-auto ${
                  isBlinkingStars && websiteRating === 0 
                    ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-400 animate-pulse' 
                    : websiteRating > 0
                      ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 text-slate-700'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700'
                }`}>
                  <span className="text-xs sm:text-sm font-black whitespace-nowrap">
                    {language === 'hi' ? 'वेबसाइट अनुभव:' : 'Rate Website:'} <span className="text-red-500">*</span>
                  </span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setWebsiteRating(star)}
                        type="button"
                        className="focus:outline-none transition active:scale-110 p-0.5 cursor-pointer"
                      >
                        <Star
                          className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${
                            star <= websiteRating 
                              ? 'fill-amber-400 text-amber-400 drop-shadow-sm' 
                              : isBlinkingStars && websiteRating === 0
                                ? 'fill-amber-300 text-amber-400 animate-bounce'
                                : 'text-slate-300 hover:text-amber-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rate Exam - Shows just below Rate Website on < 1080px */}
                <div className={`flex items-center justify-between min-[1080px]:justify-start gap-3 px-3 py-2 min-[1080px]:py-1.5 rounded-xl border transition-all w-full min-[1080px]:w-auto ${
                  isBlinkingStars && examRating === 0 
                    ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-400 animate-pulse' 
                    : examRating > 0
                      ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 text-slate-700'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700'
                }`}>
                  <span className="text-xs sm:text-sm font-black whitespace-nowrap">
                    {language === 'hi' ? 'परीक्षा अनुभव:' : 'Exam Experience:'} <span className="text-red-500">*</span>
                  </span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setExamRating(star)}
                        type="button"
                        className="focus:outline-none transition active:scale-110 p-0.5 cursor-pointer"
                      >
                        <Star
                          className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${
                            star <= examRating 
                              ? 'fill-amber-400 text-amber-400 drop-shadow-sm' 
                              : isBlinkingStars && examRating === 0
                                ? 'fill-amber-300 text-amber-400 animate-bounce'
                                : 'text-slate-300 hover:text-amber-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit & View Score & Analysis Button */}
              <button
                onClick={async () => {
                  if (websiteRating === 0 || examRating === 0) {
                    setIsBlinkingStars(true);
                    setTimeout(() => setIsBlinkingStars(false), 1200);
                    return;
                  }

                  try {
                    await fetch('/api/feedback', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: currentUser?.id,
                        testId: testId,
                        platformRating: websiteRating,
                        examRating: examRating,
                        feedbackText: feedbackText || '',
                        source: 'web'
                      })
                    });
                  } catch (e) {
                    console.warn("Feedback submission failed:", e);
                  }

                  try {
                    if (typeof document !== 'undefined' && document.fullscreenElement) {
                      const doc = document as any;
                      let p: Promise<void> | null = null;
                      if (document.exitFullscreen) {
                        p = document.exitFullscreen();
                      } else if (doc.mozCancelFullScreen) {
                        p = doc.mozCancelFullScreen();
                      } else if (doc.webkitExitFullscreen) {
                        p = doc.webkitExitFullscreen();
                      } else if (doc.msExitFullscreen) {
                        p = doc.msExitFullscreen();
                      }
                      if (p && typeof p.catch === 'function') {
                        p.catch(() => {});
                      }
                    }
                  } catch (e) {}
                  router.push(`/exam/${testId}/analysis`);
                }}
                className="w-full min-[1080px]:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm px-8 py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95 whitespace-nowrap uppercase tracking-wider"
              >
                {language === 'hi' ? 'स्कोर और विश्लेषण देखें' : 'View Score & Analysis'}
              </button>
            </div>
          </div>
        </div>
      ) : isMounted && isMobile ? (
        <div className="flex flex-col flex-1 overflow-y-auto relative bg-white pb-20">
          {/* 2. SUBJECTS TABS SWITCHER FOR MOBILE */}
          <div className="flex h-10 border-b border-slate-200 bg-[#E9ECF2] overflow-x-auto shrink-0 scrollbar-none">
            {session.sections.map((sec, idx) => {
              const isActive = idx === currentSectionIndex;
              const isLocked = session.hasSectionalTiming && !isActive;
              return (
                <button
                  key={sec.id}
                  onClick={() => !isLocked && switchSection(idx)}
                  disabled={isLocked}
                  title={isLocked ? 'Section locked — complete current section first' : undefined}
                  className={`flex items-center px-4 font-bold border-r border-slate-200 whitespace-nowrap text-[11px] transition-colors shrink-0 ${
                    isActive
                      ? 'bg-white text-blue-800 border-t-2 border-t-orange-500 font-extrabold'
                      : isLocked
                      ? 'text-slate-400 bg-[#E9ECF2] cursor-not-allowed opacity-50'
                      : 'text-slate-600 hover:bg-[#DEE3EC] cursor-pointer'
                  }`}
                >
                  {isLocked && <span className="mr-1 text-[9px]">🔒</span>}
                  {sec.name}
                </button>
              );
            })}
          </div>

          {/* 3. QUESTION HEADER BAR */}
          {(() => {
            const activePos = currentQuestion?.positiveMark !== undefined && currentQuestion?.positiveMark !== null ? Number(currentQuestion.positiveMark) : Number(currentSection?.positiveMark ?? 2);
            const activeNeg = currentQuestion?.negativeMark !== undefined && currentQuestion?.negativeMark !== null ? Number(currentQuestion.negativeMark) : Number(currentSection?.negativeMark ?? 0.5);
            return (
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold shrink-0">
                <span className="text-[#0747A6]">Question Type: MCQ</span>
                <div className="flex gap-2">
                  <span className="text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded text-[9px]">
                    +{activePos}
                  </span>
                  <span className="text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[9px]">
                    -{activeNeg}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* 4. ACTIVE QUESTION TEXT & OPTIONS AREA */}
          <div className="flex-1 overflow-y-auto p-4 bg-white pb-20">
            {currentQuestion ? (
              (() => {
                const questionLang = questionLanguages[currentQuestion.id] || language;
                return (
                  <div>
                    {/* Question Header Row */}
                    <div className="mb-3 pb-2 border-b border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-slate-800">
                              Q No. {currentQuestionIndex + 1}
                            </h3>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              +{currentQuestion?.positiveMark ?? currentSection?.positiveMark ?? 2} | -{currentQuestion?.negativeMark ?? currentSection?.negativeMark ?? 0.5}
                            </span>
                          </div>
                          <span className="text-[8px] text-slate-400 font-mono">
                            ID: {currentQuestion.id}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextLang = questionLang === 'en' ? 'hi' : 'en';
                            setQuestionLanguages(prev => ({ ...prev, [currentQuestion.id]: nextLang }));
                          }}
                          className="flex items-center gap-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200 text-[9px] transition shadow-xs cursor-pointer"
                        >
                          <Globe className="h-2.5 w-2.5 text-blue-500" />
                          {questionLang === 'en' ? 'हिन्दी' : 'English'}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
                        <Clock className="h-2.5 w-2.5 text-slate-505" />
                        <span>{Math.floor((activeResponse?.elapsedSeconds || 0) / 60)}:
                        {String((activeResponse?.elapsedSeconds || 0) % 60).padStart(2, '0')}</span>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="mb-4 text-slate-900 leading-relaxed font-normal bg-slate-50 p-3.5 border border-slate-200 rounded" style={{ fontSize: `${questionFontSize}px` }}>
                      <MathJaxText
                        component="div"
                        className="markup-content font-sans"
                        content={processQuestionHtml(questionLang === 'en'
                          ? currentQuestion.content.en.questionText
                          : currentQuestion.content.hi.questionText)}
                      />

                      {/* Optional Math */}
                      {(questionLang === 'en' ? currentQuestion.content.en.mathLatex : currentQuestion.content.hi.mathLatex) && (
                        <div className="mt-2 p-1.5 bg-yellow-55 text-yellow-900 border border-yellow-200 rounded font-mono text-[10px]">
                          Latex: {questionLang === 'en' ? currentQuestion.content.en.mathLatex : currentQuestion.content.hi.mathLatex}
                        </div>
                      )}

                      {/* Optional Question Image */}
                      {(questionLang === 'en' ? currentQuestion.content.en.imageUrl : currentQuestion.content.hi.imageUrl) && (
                        <div className="mt-2.5 flex justify-center bg-white p-1.5 border border-slate-200 rounded-md">
                          <img
                            src={questionLang === 'en' ? currentQuestion.content.en.imageUrl : currentQuestion.content.hi.imageUrl}
                            alt="Question Visual"
                            className="max-h-48 object-contain"
                          />
                        </div>
                      )}
                    </div>

                    {/* Extra Time Mode Banner (Mobile) */}
                    {state.isExtraTimeMode && (
                      <div className="mb-3 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-[10px] font-bold">
                        <span className="text-amber-600">⚠️</span> Extra Time — Mark all unattempted questions. Select Option (E) to leave question unattempted.
                        {state.isRpscRasMode && <span className="block mt-1 text-red-600 font-extrabold text-[9px]">Unattempted questions after extra time will get -0.44 negative marking.</span>}
                      </div>
                    )}

                    {/* Options Grid */}
                    <div className="space-y-2" style={{ fontSize: `${questionFontSize}px` }}>
                      {(() => {
                        let options = (questionLang === 'en'
                          ? currentQuestion.content.en.options
                          : currentQuestion.content.hi.options
                        ) || [];

                        if (state.isRpscRasMode && options.length < 5) {
                          const opt5Text = questionLang === 'en'
                            ? '(E) Question Unattempted'
                            : '(5) अनुत्तरित प्रश्न';
                          const opt5Val = typeof options[0] === 'object' && options[0] !== null ? { text: opt5Text } : opt5Text;
                          options = [...(options as any[]), opt5Val] as any;
                        }

                        const isQuestionUnattempted = !activeResponse || activeResponse.selectedOptionIndex === null || activeResponse.selectedOptionIndex === undefined;
                        const isQuestionAlreadyAttempted = activeResponse && activeResponse.selectedOptionIndex !== null && activeResponse.selectedOptionIndex !== undefined;
                        const inExtraTime = state.isExtraTimeMode;

                        return (
                          <>
                            {options.map((opt, idx) => {
                              const optLabel = typeof opt === 'string' ? opt : opt.text;
                              const isTempChosen = activeResponse?.tempOptionIndex === idx;
                              const isBlockedInExtraTime = inExtraTime && isQuestionUnattempted && idx <= 3;
                              const isReadOnlyInExtraTime = inExtraTime && isQuestionAlreadyAttempted;
                              const isOption5 = idx === 4;

                              return (
                                <label
                                  key={idx}
                                  onClick={() => {
                                    if (isBlockedInExtraTime || isReadOnlyInExtraTime) return;
                                    selectOption(idx);
                                  }}
                                  className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition text-[11px] ${
                                    isBlockedInExtraTime
                                      ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                                      : isReadOnlyInExtraTime
                                      ? `${isTempChosen ? 'bg-blue-50 border-blue-400 font-bold text-blue-900 shadow-sm' : 'bg-white border-slate-200 text-slate-800'} cursor-default`
                                      : isOption5 && inExtraTime && isQuestionUnattempted
                                      ? `${isTempChosen ? 'bg-amber-100 border-amber-500 font-bold text-amber-900 shadow-sm ring-2 ring-amber-400' : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'} cursor-pointer`
                                      : `cursor-pointer hover:bg-slate-50 ${isTempChosen ? 'bg-blue-50 border-blue-400 font-bold text-blue-900 shadow-sm' : 'bg-white border-slate-200 text-slate-800'}`
                                  }`}
                                >
                                  {isBlockedInExtraTime ? (
                                    <span className="h-3.5 w-3.5 flex items-center justify-center text-slate-400">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                    </span>
                                  ) : (
                                    <input
                                      type="radio"
                                      name={`question-${currentQuestion.id}`}
                                      checked={isTempChosen}
                                      readOnly
                                      className={`h-3.5 w-3.5 ${isOption5 ? 'border-amber-400 text-amber-600 focus:ring-amber-500' : 'border-slate-350 text-blue-600 focus:ring-blue-500'}`}
                                    />
                                  )}
                                  <MathJaxText
                                    className={`flex-1 font-sans ${isOption5 ? 'font-bold text-amber-900' : ''}`}
                                    content={processQuestionHtml(optLabel)}
                                  />
                                </label>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-10 text-gray-500 text-xs">No questions loaded.</div>
            )}
          </div>

          {/* 5. STICKY ACTIONS BAR (mobile) */}
          {(() => {
            const isSsc = testId.includes('ssc') || testId.toLowerCase().includes('ssc');
            if (isSsc) {
              // SSC mobile footer: only palette button + clear (actions are in sub-header)
              return (
                <footer className="fixed bottom-0 inset-x-0 border-t z-20 px-3 py-2 flex items-center gap-2 shadow-inner bg-[#E9ECF2] border-slate-300">
                  <button
                    onClick={() => setMobilePaletteOpen(true)}
                    className="bg-white border border-slate-300 text-slate-700 font-black p-2 rounded shadow-sm hover:bg-slate-50 text-[10px] w-12 flex flex-col items-center justify-center shrink-0 cursor-pointer"
                    title="Show Palette"
                  >
                    <Menu className="h-3.5 w-3.5 text-slate-600" />
                    <span className="text-[7px] uppercase mt-0.5 font-bold">Palette</span>
                  </button>
                  <button onClick={clearResponse} className="font-bold px-3 py-2.5 rounded shadow-sm transition text-[10px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer active:scale-95 flex-1 text-center">Clear Response</button>
                </footer>
              );
            }
            return (
              <footer className="fixed bottom-0 inset-x-0 border-t z-20 px-3 py-2 flex items-center justify-between gap-2 shadow-inner bg-white border-slate-200">
                <button
                  onClick={() => setMobilePaletteOpen(true)}
                  className="bg-white border border-slate-300 text-slate-700 font-black p-2 rounded shadow-sm hover:bg-slate-50 text-[10px] w-12 flex flex-col items-center justify-center shrink-0 cursor-pointer"
                  title="Show Palette"
                >
                  <Menu className="h-3.5 w-3.5 text-slate-600" />
                  <span className="text-[7px] uppercase mt-0.5 font-bold">Palette</span>
                </button>
                <div className="flex gap-2 flex-1">
                  <button onClick={markForReviewAndNext} className="font-bold px-2 py-2.5 rounded shadow-sm transition text-[10px] flex-1 text-center cursor-pointer active:scale-95 bg-[#B3E5FC]/60 text-[#006064] border border-[#B3E5FC]">Review & Next</button>
                  <button onClick={clearResponse} className="font-bold px-2 py-2.5 rounded shadow-sm transition text-[10px] flex-1 text-center cursor-pointer active:scale-95 bg-[#B3E5FC]/60 text-[#006064] border border-[#B3E5FC]">Clear</button>
                </div>
                <button onClick={saveAndNext} className="font-bold px-4 py-2.5 rounded shadow transition text-[10px] shrink-0 cursor-pointer active:scale-95 bg-[#0D88B9] hover:bg-[#0A739C] text-white">Save & Next</button>
              </footer>
            );
          })()}

          {/* 6. BOTTOM DRAWER PALETTE SHEET */}
          {mobilePaletteOpen && (
            <>
              {/* Drawer Backdrop Mask */}
              <div 
                onClick={() => setMobilePaletteOpen(false)}
                className="fixed inset-0 bg-black/60 z-30 backdrop-blur-xs transition-opacity duration-200"
              />

              {/* Drawer Layout */}
              <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 dark:border-slate-800 z-40 rounded-t-3xl shadow-2xl p-5 max-h-[85vh] overflow-y-auto flex flex-col justify-between animate-in slide-in-from-bottom duration-250">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <h4 className="font-extrabold text-[11px] text-[#0F2942] uppercase tracking-wider">
                      Question Palette - {currentSection.name}
                    </h4>
                    <button
                      onClick={() => setMobilePaletteOpen(false)}
                      className="p-1 rounded bg-slate-105 text-slate-550 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Legend counts for stats */}
                  {(() => {
                    const isSsc = testId.includes('ssc') || testId.toLowerCase().includes('ssc');
                    return (
                      <>
                        <div className={`grid grid-cols-2 gap-2 text-[9px] mb-4 p-2.5 rounded-lg border font-semibold ${
                          !isSsc ? 'bg-[#EBF5FA] border-[#B3E5FC] text-slate-705' : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <div className={`h-4.5 w-4.5 font-bold flex items-center justify-center text-[9px] shadow-xs ${
                              !isSsc ? 'bg-[#2E7D32] text-white rounded-full' : 'bg-[#2E7D32] text-white rounded-b-md'
                            }`}>
                              {counts.answered}
                            </div>
                            <span>Answered</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className={`h-4.5 w-4.5 font-bold flex items-center justify-center text-[9px] shadow-xs ${
                              !isSsc ? 'bg-[#8E24AA] text-white rounded-full' : 'bg-[#4527A0] text-white rounded-full'
                            }`}>
                              {counts.marked}
                            </div>
                            <span>Marked Review</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className={`h-4.5 w-4.5 font-bold flex items-center justify-center text-[9px] shadow-xs ${
                              !isSsc ? 'bg-[#D32F2F] text-white rounded-full' : 'bg-[#C62828] text-white rounded-t-md'
                            }`}>
                              {counts.notAnswered}
                            </div>
                            <span>Not Answered</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className={`h-4.5 w-4.5 text-slate-800 font-bold flex items-center justify-center text-[9px] shadow-xs ${
                              !isSsc ? 'bg-white border border-slate-400 rounded' : 'bg-gray-200 border border-gray-400'
                            }`}>
                              {counts.notVisited}
                            </div>
                            <span>Not Visited</span>
                          </div>
                        </div>

                        {/* Numbers Grid */}
                        <div className="grid grid-cols-5 gap-2.5 py-2">
                          {currentSectionQuestions.map((q, idx) => {
                            const resp = responses[q.id];
                            const stateCode = resp?.state ?? 1;
                            const isActive = idx === currentQuestionIndex;

                            let styleClass = "";
                            switch (stateCode) {
                              case 1: // Not Visited
                                styleClass = !isSsc 
                                  ? "bg-white border-slate-300 text-slate-800 rounded" 
                                  : "bg-gray-200 border-gray-400 text-slate-800";
                                break;
                              case 2: // Not Answered
                                styleClass = !isSsc 
                                  ? "bg-[#D32F2F] text-white rounded border-transparent" 
                                  : "bg-[#C62828] text-white rounded-t-md border-transparent";
                                break;
                              case 3: // Answered
                                styleClass = !isSsc 
                                  ? "bg-[#2E7D32] text-white rounded border-transparent" 
                                  : "bg-[#2E7D32] text-white rounded-b-md border-transparent";
                                break;
                              case 4: // Marked for Review
                                styleClass = !isSsc 
                                  ? "bg-[#8E24AA] text-white rounded-full border-transparent" 
                                  : "bg-[#4527A0] text-white rounded-full border-transparent";
                                break;
                              case 5: // Answered & Marked for Review
                                styleClass = !isSsc 
                                  ? "bg-[#8E24AA] text-white rounded-full border-transparent relative" 
                                  : "bg-[#4527A0] text-white rounded-full border-transparent relative";
                                break;
                            }

                            return (
                              <button
                                key={q.id}
                                onClick={() => {
                                  jumpToQuestion(currentSectionIndex, idx);
                                  setMobilePaletteOpen(false);
                                }}
                                className={`flex h-9 w-9 items-center justify-center border font-bold text-xs shadow-sm cursor-pointer ${styleClass} ${
                                  isActive ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''
                                }`}
                              >
                                {idx + 1}
                                {stateCode === 5 && (
                                  <span className="absolute -bottom-0.5 -right-0.5 bg-green-500 text-white rounded-full p-0.5 border border-white">
                                    <Check className="h-1.5 w-1.5" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="pt-4 border-t border-slate-100 mt-6">
                  {(() => {
                    const isSsc = (testId.includes('ssc') || testId.toLowerCase().includes('ssc')) && !isMobile;
                    return (
                      <button
                        onClick={() => {
                          setMobilePaletteOpen(false);
                          pauseExam();
                          setShowSubmitConfirm(true);
                        }}
                        className={`w-full text-white font-bold py-3 rounded-xl shadow text-xs uppercase cursor-pointer active:scale-95 transition-all ${
                          !isSsc ? 'bg-[#0D88B9] hover:bg-[#0A739C]' : 'bg-[#1A3B5C] hover:bg-slate-800'
                        }`}
                      >
                        Submit Exam Paper
                      </button>
                    );
                  })()}
                </div>
              </div>
            </>
          )}

        </div>
      ) : (
        <div className="flex flex-row flex-1 overflow-hidden h-full min-h-0">
          
          {/* LEFT PANEL - SUBJECTS TABS, QUESTION BLOCK & ACTIONS */}
          <main className="flex flex-1 min-w-0 flex-col border-r border-slate-200 bg-white h-full overflow-hidden">
            
            {/* Subject Tabs Switcher */}
            {(() => {
              const isSsc = (testId.includes('ssc') || testId.toLowerCase().includes('ssc')) && !isMobile;
              if (isSsc) return null;
              if (!isSsc) {
                return (
                  <div className="flex h-10 border-b border-slate-200 bg-[#F8FAFC] items-center shrink-0">
                    <span className="px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider border-r border-slate-200 h-full flex items-center shrink-0">
                      SECTIONS
                    </span>
                    <div className="flex flex-1 overflow-x-auto scrollbar-none h-full">
                      {session.sections.map((sec, idx) => {
                        const isActive = idx === currentSectionIndex;
                        const isLocked = session.hasSectionalTiming && !isActive;
                        return (
                          <button
                            key={sec.id}
                            onClick={() => !isLocked && switchSection(idx)}
                            disabled={isLocked}
                            title={isLocked ? 'Section locked — complete current section first' : undefined}
                            className={`flex items-center px-5 font-bold border-r border-slate-200 transition-colors h-full text-xs ${
                              isActive
                                ? 'bg-[#1B6E88] text-white font-extrabold'
                                : isLocked
                                ? 'text-slate-300 bg-[#F8FAFC] cursor-not-allowed opacity-50'
                                : 'text-slate-650 hover:bg-slate-100 bg-[#F8FAFC] cursor-pointer'
                            }`}
                          >
                            {isLocked && <span className="mr-1 text-[9px]">🔒</span>}
                            {sec.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <div className="flex h-10 border-b border-slate-200 bg-[#E9ECF2] shrink-0 items-center">
                  <div className="flex flex-1 overflow-x-auto scrollbar-none h-full">
                    {session.sections.map((sec, idx) => {
                      const isActive = idx === currentSectionIndex;
                      const isLocked = session.hasSectionalTiming && !isActive;
                      return (
                        <button
                          key={sec.id}
                          onClick={() => !isLocked && switchSection(idx)}
                          disabled={isLocked}
                          title={isLocked ? 'Section locked — complete current section first' : undefined}
                          className={`flex items-center px-4 h-full font-bold border-r border-slate-200 transition-colors whitespace-nowrap text-[11px] ${
                            isActive
                              ? 'bg-[#008000] text-white font-extrabold border-none'
                              : isLocked
                              ? 'text-slate-400 bg-[#E9ECF2] cursor-not-allowed opacity-50'
                              : 'text-slate-700 hover:bg-[#DEE3EC] bg-white cursor-pointer'
                          }`}
                        >
                          {isLocked && <span className="mr-1 text-[9px]">🔒</span>}
                          {sec.name}
                        </button>
                      );
                    })}
                  </div>
                  {/* Total Answered shown on right like screenshot */}
                  <span className="px-3 text-[10px] font-semibold text-slate-600 whitespace-nowrap shrink-0 border-l border-slate-200">
                    Total Questions Answered: <span className="font-extrabold text-green-700">{counts.answered}</span>
                  </span>
                </div>
              );
            })()}

            {/* Question Header Bar */}
            {(() => {
              const activePos = currentQuestion?.positiveMark !== undefined && currentQuestion?.positiveMark !== null ? Number(currentQuestion.positiveMark) : Number(currentSection?.positiveMark ?? 2);
              const activeNeg = currentQuestion?.negativeMark !== undefined && currentQuestion?.negativeMark !== null ? Number(currentQuestion.negativeMark) : Number(currentSection?.negativeMark ?? 0.5);

              return (
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold shrink-0">
                  <span className="text-[#0747A6] text-xs">Question Type: Multiple Choice Question</span>
                  <div className="flex gap-2">
                    <span className="text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                      Marks: +{activePos}
                    </span>
                    <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                      Negative: -{activeNeg}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Question Text & Math Rendering */}
            <div className="flex-1 lg:overflow-y-auto overflow-y-visible p-6 bg-white">
              {currentQuestion ? (
                (() => {
                  const questionLang = questionLanguages[currentQuestion.id] || language;
                  return (
                    <div>
                      {/* Question Index Title */}
                      <div className="mb-4 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-800">
                            Question No. {currentQuestionIndex + 1}
                          </h3>
                        </div>
                        
                        {(() => {
                          const isSsc = testId.includes('ssc') || testId.toLowerCase().includes('ssc');
                          if (!isSsc) {
                            return (
                              <div className="flex items-center gap-3.5 text-[10px] font-semibold flex-wrap">
                                {/* Testbook Style Marks Badges */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 font-bold">Marks:</span>
                                  <span className="bg-[#2E7D32] text-white font-extrabold px-2 py-0.5 rounded-md text-[9px]">
                                    +{currentQuestion?.positiveMark ?? currentSection?.positiveMark ?? 2}
                                  </span>
                                  <span className="bg-[#C62828] text-white font-extrabold px-2 py-0.5 rounded-md text-[9px]">
                                    -{currentQuestion?.negativeMark ?? currentSection?.negativeMark ?? 0.5}
                                  </span>
                                </div>

                                {/* Clock Icon / Time Spent */}
                                <div className="flex items-center gap-1 text-slate-600 font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Time: {Math.floor((activeResponse?.elapsedSeconds || 0) / 60)}:
                                  {String((activeResponse?.elapsedSeconds || 0) % 60).padStart(2, '0')}</span>
                                </div>

                                {/* View in Language Dropdown */}
                                <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                                  <span className="text-slate-400">View in:</span>
                                  <select
                                    value={questionLang}
                                    onChange={(e) => {
                                      const nextLang = e.target.value as 'en' | 'hi';
                                      setQuestionLanguages(prev => ({ ...prev, [currentQuestion.id]: nextLang }));
                                    }}
                                    className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700 outline-none cursor-pointer"
                                  >
                                    <option value="en">English</option>
                                    <option value="hi">Hindi</option>
                                  </select>
                                </div>

                                {/* Report Button */}
                                <button
                                  type="button"
                                  onClick={() => alert(language === 'hi' ? "प्रश्न की रिपोर्ट दर्ज कर ली गई है।" : "Question reported successfully.")}
                                  className="flex items-center gap-1 text-slate-500 hover:text-red-500 transition cursor-pointer"
                                >
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                  <span>Report</span>
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center gap-3 text-[10px] sm:text-xs">
                              <span className="text-slate-505 font-bold">Select Language</span>
                              <select
                                value={questionLang}
                                onChange={(e) => {
                                  const nextLang = e.target.value as 'en' | 'hi';
                                  setQuestionLanguages(prev => ({ ...prev, [currentQuestion.id]: nextLang }));
                                }}
                                className="bg-white border border-slate-350 rounded px-2 py-1 text-[11px] font-bold text-slate-705 outline-none cursor-pointer focus:border-blue-500"
                              >
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                              </select>

                              <div className="flex items-center gap-1 bg-slate-105 border border-slate-200 text-slate-650 font-mono px-2 py-0.5 rounded-md">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>Time Spent: {Math.floor((activeResponse?.elapsedSeconds || 0) / 60)}:
                                {String((activeResponse?.elapsedSeconds || 0) % 60).padStart(2, '0')}</span>
                              </div>
                              <div className="text-slate-400 hidden sm:inline">
                                ID: {currentQuestion.id}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Render Question Text Based on active Language */}
                      <div className="mb-6 text-slate-900 leading-relaxed font-normal bg-slate-50 p-4 border border-slate-200 rounded" style={{ fontSize: `${questionFontSize}px` }}>
                        <MathJaxText
                          component="div"
                          className="markup-content font-sans"
                          content={processQuestionHtml(questionLang === 'en'
                            ? currentQuestion.content.en.questionText
                            : currentQuestion.content.hi.questionText)}
                        />

                        {/* Optional Math Equation preview */}
                        {(questionLang === 'en' ? currentQuestion.content.en.mathLatex : currentQuestion.content.hi.mathLatex) && (
                          <div className="mt-2 p-2 bg-yellow-50 text-yellow-900 border border-yellow-200 rounded font-mono text-xs">
                            LaTeX: {questionLang === 'en' ? currentQuestion.content.en.mathLatex : currentQuestion.content.hi.mathLatex}
                          </div>
                        )}

                        {/* Optional Question Image */}
                        {(questionLang === 'en' ? currentQuestion.content.en.imageUrl : currentQuestion.content.hi.imageUrl) && (
                          <div className="mt-3 flex justify-center bg-white p-2 border border-slate-200 rounded-md">
                            <img
                              src={questionLang === 'en' ? currentQuestion.content.en.imageUrl : currentQuestion.content.hi.imageUrl}
                              alt="Question Visual"
                              className="max-h-72 object-contain"
                            />
                          </div>
                        )}
                      </div>

                      {/* Extra Time Mode Banner (Desktop) */}
                      {state.isExtraTimeMode && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-xs font-bold">
                          <span className="text-amber-600">⚠️</span> Extra Time — Mark all unattempted questions. Select Option (E) to leave question unattempted.
                          {state.isRpscRasMode && <span className="block mt-1 text-red-600 font-extrabold text-[10px]">Unattempted questions after extra time will get -0.44 negative marking.</span>}
                        </div>
                      )}

                      {/* Options List Grid */}
                      <div className="space-y-3 pl-2" style={{ fontSize: `${questionFontSize}px` }}>
                        {(() => {
                          let options = (questionLang === 'en'
                            ? currentQuestion.content.en.options
                            : currentQuestion.content.hi.options
                          ) || [];

                          if (state.isRpscRasMode && options.length < 5) {
                            const opt5Text = questionLang === 'en'
                              ? '(E) Question Unattempted'
                              : '(5) अनुत्तरित प्रश्न';
                            const opt5Val = typeof options[0] === 'object' && options[0] !== null ? { text: opt5Text } : opt5Text;
                            options = [...(options as any[]), opt5Val] as any;
                          }

                          const isQuestionUnattempted = !activeResponse || activeResponse.selectedOptionIndex === null || activeResponse.selectedOptionIndex === undefined;
                          const isQuestionAlreadyAttempted = activeResponse && activeResponse.selectedOptionIndex !== null && activeResponse.selectedOptionIndex !== undefined;
                          const inExtraTime = state.isExtraTimeMode;

                          return (
                            <>
                              {options.map((opt, idx) => {
                                const optLabel = typeof opt === 'string' ? opt : opt.text;
                                const isTempChosen = activeResponse?.tempOptionIndex === idx;
                                const isBlockedInExtraTime = inExtraTime && isQuestionUnattempted && idx <= 3;
                                const isReadOnlyInExtraTime = inExtraTime && isQuestionAlreadyAttempted;
                                const isOption5 = idx === 4;

                                return (
                                  <label
                                    key={idx}
                                    onClick={() => {
                                      if (isBlockedInExtraTime || isReadOnlyInExtraTime) return;
                                      selectOption(idx);
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                                      isBlockedInExtraTime
                                        ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                                        : isReadOnlyInExtraTime
                                        ? `border-slate-200 ${isTempChosen ? 'bg-blue-50 border-blue-400 font-semibold' : 'bg-white'} cursor-default`
                                        : isOption5 && inExtraTime && isQuestionUnattempted
                                        ? `${isTempChosen ? 'bg-amber-100 border-amber-500 font-semibold text-amber-900 ring-2 ring-amber-400' : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'} cursor-pointer`
                                        : `cursor-pointer hover:bg-slate-50 border-slate-200 ${isTempChosen ? 'bg-blue-50 border-blue-400 font-semibold' : 'bg-white'}`
                                    }`}
                                  >
                                    {isBlockedInExtraTime ? (
                                      <span className="h-4 w-4 flex items-center justify-center text-slate-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                      </span>
                                    ) : (
                                      <input
                                        type="radio"
                                        name={`question-${currentQuestion.id}`}
                                        checked={isTempChosen}
                                        readOnly
                                        className={`h-4 w-4 ${isOption5 ? 'border-amber-400 text-amber-600 focus:ring-amber-500' : 'border-slate-300 text-blue-600 focus:ring-blue-500'}`}
                                      />
                                    )}
                                    <MathJaxText
                                      className={`text-slate-800 text-xs flex-1 font-sans ${isOption5 ? 'font-bold text-amber-900' : ''}`}
                                      content={processQuestionHtml(optLabel)}
                                    />
                                  </label>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-10 text-gray-500">No questions loaded in this section.</div>
              )}
            </div>

            {/* Bottom Actions Row — SSC uses sub-header for Mark/Save/Submit, so remove primary bottom actions panel in SSC */}
            {(() => {
              const isSsc = testId.toLowerCase().includes('ssc') || session?.testTitle?.toLowerCase().includes('ssc') || session?.testId?.toLowerCase().includes('ssc');
              if (isSsc) {
                return null; // SSC: actions are in the sub-header bar, no bottom footer panel
              }
              return (
                <footer className="flex flex-row h-12 sm:h-14 items-center justify-between gap-2 border-t border-slate-200 px-3 sm:px-4 py-0 shrink-0 bg-white">
                  <div className="flex gap-2">
                    <button
                      onClick={markForReviewAndNext}
                      className="font-bold px-2.5 sm:px-4 py-2 sm:py-2.5 rounded shadow-sm transition text-[10px] sm:text-xs cursor-pointer active:scale-95 bg-[#B3E5FC]/60 hover:bg-[#B3E5FC]/80 text-[#006064] border border-[#B3E5FC] whitespace-nowrap"
                    >
                      Mark for Review & Next
                    </button>
                    <button
                      onClick={clearResponse}
                      className="font-bold px-2.5 sm:px-4 py-2 sm:py-2.5 rounded shadow-sm transition text-[10px] sm:text-xs cursor-pointer active:scale-95 bg-[#B3E5FC]/60 hover:bg-[#B3E5FC]/80 text-[#006064] border border-[#B3E5FC] whitespace-nowrap"
                    >
                      Clear Response
                    </button>
                  </div>
                  <button
                    onClick={saveAndNext}
                    className="font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded shadow transition text-[10px] sm:text-xs cursor-pointer active:scale-95 bg-[#0D88B9] hover:bg-[#0A739C] text-white whitespace-nowrap"
                  >
                    Save & Next
                  </button>
                </footer>
              );
            })()}
          </main>

          {/* RIGHT PANEL (QUESTION PALETTE SIDEBAR - PERSISTENT ON RIGHT) */}
          {(() => {
            const isSsc = (testId.includes('ssc') || testId.toLowerCase().includes('ssc')) && !isMobile;
            return (
              <aside className={`flex w-52 sm:w-56 md:w-60 min-[1080px]:w-80 min-[1080px]:xl:w-[25%] shrink-0 flex-col border-l border-slate-200 overflow-y-auto max-[1079px]:no-scrollbar h-full ${
                !isSsc ? 'bg-[#EBF5FA]' : 'bg-[#F3F4F6]'
              }`}>
                
                {/* Profile Avatar Card */}
                <div className={`flex items-center gap-2 p-2.5 min-[1080px]:gap-3 min-[1080px]:p-4 border-b border-slate-200 ${
                  !isSsc ? 'bg-[#EBF5FA]' : 'bg-white'
                }`}>
                  <div className={`relative h-9 w-9 min-[1080px]:h-12 min-[1080px]:w-12 shrink-0 flex items-center justify-center text-slate-400 ${
                    !isSsc ? 'rounded-full bg-[#0D88B9] text-white' : 'rounded bg-slate-200 border border-slate-300'
                  }`}>
                    <User className="h-5 w-5 min-[1080px]:h-6 min-[1080px]:w-6" />
                  </div>
                  <div className="flex-1 overflow-hidden min-w-0">
                    <p className="text-[9px] min-[1080px]:text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">Candidate: {currentUser?.candidateCode || 'GUEST'}</p>
                    <p className="font-bold text-xs min-[1080px]:text-sm text-slate-900 truncate">{currentUser?.name || 'Guest User'}</p>
                  </div>
                </div>

                {/* Legend Panel of States (Custom Designs/Shapes matching TCS iON or Testbook) */}
                {!isSsc ? (
                  <div className="p-2 min-[1080px]:p-3 bg-white border-b border-slate-200 grid grid-cols-2 gap-x-1.5 gap-y-1.5 text-[9px] min-[1080px]:text-[10px] font-bold text-slate-700">
                    <div className="flex items-center gap-1.5 min-[1080px]:gap-2">
                      <div className="h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 bg-[#2E7D32] text-white rounded-full flex items-center justify-center font-bold text-[8.5px] min-[1080px]:text-[9px] shadow-xs shrink-0">
                        {counts.answered}
                      </div>
                      <span className="truncate">Answered</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-[1080px]:gap-2">
                      <div className="h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 bg-[#8E24AA] text-white rounded-full flex items-center justify-center font-bold text-[8.5px] min-[1080px]:text-[9px] shadow-xs shrink-0">
                        {counts.marked}
                      </div>
                      <span className="truncate">Marked</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-[1080px]:gap-2">
                      <div className="h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 bg-[#D32F2F] text-white rounded-full flex items-center justify-center font-bold text-[8.5px] min-[1080px]:text-[9px] shadow-xs shrink-0">
                        {counts.notAnswered}
                      </div>
                      <span className="truncate">Not Answered</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-[1080px]:gap-2">
                      <div className="h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 bg-white border border-slate-400 text-slate-800 flex items-center justify-center font-bold text-[8.5px] min-[1080px]:text-[9px] shadow-xs rounded shrink-0">
                        {counts.notVisited}
                      </div>
                      <span className="truncate">Not Visited</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-[1080px]:gap-2 col-span-2">
                      <div className="relative h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 bg-[#8E24AA] text-white rounded-full flex items-center justify-center font-bold text-[8.5px] min-[1080px]:text-[9px] shadow-xs shrink-0">
                        {counts.markedAndAnswered}
                        <span className="absolute -bottom-0.5 -right-0.5 bg-green-500 text-white rounded-full p-0.5 border border-white">
                          <Check className="h-1.5 w-1.5" />
                        </span>
                      </div>
                      <span className="truncate">Marked & Answered</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 min-[1080px]:p-3 bg-white border-b border-slate-200 grid grid-cols-2 gap-x-1.5 gap-y-1.5 text-[9px] min-[1080px]:text-[10px]">
                    <div className="flex items-center gap-1.5 min-[1080px]:gap-2">
                      <div className="flex h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 items-center justify-center bg-gray-200 border border-gray-400 text-[9px] min-[1080px]:text-xs font-bold text-slate-800 shrink-0">
                        {counts.notVisited}
                      </div>
                      <span className="truncate">Not Visited</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-[1080px]:gap-2">
                      <div className="flex h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 items-center justify-center bg-[#C62828] text-white text-[9px] min-[1080px]:text-xs font-bold rounded-t-md shrink-0">
                        {counts.notAnswered}
                      </div>
                      <span className="truncate">Not Answered</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-[1080px]:gap-2">
                      <div className="flex h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 items-center justify-center bg-[#2E7D32] text-white text-[9px] min-[1080px]:text-xs font-bold rounded-b-md shrink-0">
                        {counts.answered}
                      </div>
                      <span className="truncate">Answered</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-[1080px]:gap-2">
                      <div className="flex h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 items-center justify-center bg-[#4527A0] text-white text-[9px] min-[1080px]:text-xs font-bold rounded-full shrink-0">
                        {counts.marked}
                      </div>
                      <span className="truncate">Marked</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-[1080px]:gap-2 col-span-2">
                      <div className="relative flex h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 items-center justify-center bg-[#4527A0] text-white text-[9px] min-[1080px]:text-xs font-bold rounded-full shrink-0">
                        {counts.markedAndAnswered}
                        <span className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border border-white">
                          <Check className="h-2 w-2" />
                        </span>
                      </div>
                      <span className="truncate">Answered & Marked</span>
                    </div>
                  </div>
                )}

                {/* Active Palette Section Grid */}
                <div className={`flex-1 p-2 min-[1080px]:p-3 overflow-y-auto max-[1079px]:no-scrollbar ${!isSsc ? 'bg-[#EBF5FA]' : 'bg-white'}`}>
                  {/* Section Name Header - matches screenshot style */}
                  {isSsc && (
                    <div className="mb-2 pb-1.5 border-b border-slate-200">
                      <h4 className="font-bold text-slate-800 text-[10px] min-[1080px]:text-[11px] truncate">{currentSection.name}</h4>
                    </div>
                  )}
                  {!isSsc && (
                    <h4 className="font-bold text-[#0F2942] uppercase text-[9px] min-[1080px]:text-[10px] tracking-wide mb-2 truncate">
                      Question Palette - {currentSection.name}
                    </h4>
                  )}
                  
                  <div className="grid grid-cols-5 gap-1.5 min-[1080px]:gap-2">
                    {currentSectionQuestions.map((q, idx) => {
                      const resp = responses[q.id];
                      const stateCode = resp?.state ?? 1;
                      const isActive = idx === currentQuestionIndex;

                      let styleClass = "";

                      // Select style configurations based on Palette State Rules
                      switch (stateCode) {
                        case 1: // Not Visited
                          styleClass = !isSsc 
                            ? "bg-white border-slate-300 text-slate-800 rounded" 
                            : "bg-[#C8D3E0] border-[#94a3b8] text-slate-800";
                          break;
                        case 2: // Not Answered
                          styleClass = !isSsc 
                            ? "bg-[#D32F2F] text-white rounded border-transparent" 
                            : "bg-[#C62828] text-white rounded-t-md border-transparent";
                          break;
                        case 3: // Answered
                          styleClass = !isSsc 
                            ? "bg-[#2E7D32] text-white rounded border-transparent" 
                            : "bg-[#2E7D32] text-white rounded-b-md border-transparent";
                          break;
                        case 4: // Marked for Review
                          styleClass = !isSsc 
                            ? "bg-[#8E24AA] text-white rounded-full border-transparent" 
                            : "bg-[#4527A0] text-white rounded-full border-transparent";
                          break;
                        case 5: // Answered & Marked for Review
                          styleClass = !isSsc 
                            ? "bg-[#8E24AA] text-white rounded-full border-transparent relative" 
                            : "bg-[#4527A0] text-white rounded-full border-transparent relative";
                          break;
                      }

                      return (
                        <button
                          key={q.id}
                          onClick={() => jumpToQuestion(currentSectionIndex, idx)}
                          className={`flex h-7 w-7 min-[1080px]:h-8 min-[1080px]:w-8 items-center justify-center border font-bold text-[10px] min-[1080px]:text-xs shadow-xs hover:opacity-90 active:scale-95 transition-all ${styleClass} ${
                            isActive ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''
                          }`}
                        >
                          {idx + 1}
                          {stateCode === 5 && (
                            <span className="absolute -bottom-0.5 -right-0.5 bg-green-500 text-white rounded-full p-0.5 border border-white">
                              <Check className="h-1.5 w-1.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legend Table — SSC style matches screenshot */}
                {isSsc && (
                  <div className="px-2 pb-2 min-[1080px]:px-3 bg-white border-t border-slate-200">
                    <table className="w-full text-[9px] min-[1080px]:text-[10px] mt-2">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="py-1 pr-1"><div className="h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 bg-[#C8D3E0] border border-[#94a3b8] text-slate-800 flex items-center justify-center font-bold text-[8.5px] min-[1080px]:text-[9px]">{counts.notVisited}</div></td>
                          <td className="py-1 text-slate-700 truncate">Not Visited</td>
                          <td className="py-1 pr-1 pl-2"><div className="h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 bg-[#C62828] text-white flex items-center justify-center font-bold text-[8.5px] min-[1080px]:text-[9px] rounded-t-md">{counts.notAnswered}</div></td>
                          <td className="py-1 text-slate-700 truncate">Not Answered</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-1 pr-1"><div className="h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 bg-[#2E7D32] text-white flex items-center justify-center font-bold text-[8.5px] min-[1080px]:text-[9px] rounded-b-md">{counts.answered}</div></td>
                          <td className="py-1 text-slate-700 truncate">Answered</td>
                          <td className="py-1 pr-1 pl-2"><div className="h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 bg-[#4527A0] text-white flex items-center justify-center font-bold text-[8.5px] min-[1080px]:text-[9px] rounded-full">{counts.marked}</div></td>
                          <td className="py-1 text-slate-700 truncate">Marked for Review</td>
                        </tr>
                        <tr>
                          <td className="py-1 pr-1">
                            <div className="relative h-4.5 w-4.5 min-[1080px]:h-5 min-[1080px]:w-5 bg-[#4527A0] text-white flex items-center justify-center font-bold text-[8.5px] min-[1080px]:text-[9px] rounded-full">
                              {counts.markedAndAnswered}
                              <span className="absolute -bottom-0.5 -right-0.5 bg-green-500 text-white rounded-full p-0.5 border border-white"><Check className="h-1.5 w-1.5" /></span>
                            </div>
                          </td>
                          <td className="py-1 text-slate-700 col-span-3 text-[8.5px] min-[1080px]:text-[10px]" colSpan={3}>Answered &amp; Marked</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Submit Block Section */}
                <div className={`p-2.5 min-[1080px]:p-4 border-t border-slate-200 flex flex-col gap-2 ${!isSsc ? 'bg-[#EBF5FA]' : 'bg-slate-50'}`}>
                  {session && session.hasSectionalTiming && session.sections && session.sections.length > 1 && (
                    <button
                      onClick={() => {
                        pauseExam();
                        const isLastSection = currentSectionIndex + 1 >= session.sections.length;
                        if (isLastSection) {
                          setShowSubmitConfirm(true);
                        } else {
                          setShowSectionSubmitConfirm(true);
                        }
                      }}
                      className="w-full text-white font-bold py-2.5 rounded shadow transition cursor-pointer text-xs uppercase tracking-wider active:scale-95 bg-emerald-600 hover:bg-emerald-700 border border-emerald-500/20"
                    >
                      {currentSectionIndex + 1 < session.sections.length
                        ? (language === 'hi' ? 'सेक्शन सबमिट करें' : 'Submit Section')
                        : (language === 'hi' ? 'अंतिम सेक्शन सबमिट करें' : 'Submit Final Section')}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      pauseExam();
                      setShowSubmitConfirm(true);
                    }}
                    className={`w-full text-white font-bold py-2.5 rounded shadow transition cursor-pointer text-xs uppercase tracking-wider active:scale-95 ${
                      !isSsc ? 'bg-[#0D88B9] hover:bg-[#0A739C]' : 'bg-[#1A3B5C] hover:bg-slate-800'
                    }`}
                  >
                    Submit Test
                  </button>
                </div>

              </aside>
            );
          })()}
        </div>
      )}

      {/* Section Submit Confirmation Modal with Utilized Time & Stats */}
      {showSectionSubmitConfirm && currentSection && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-3">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                  {language === 'hi' ? 'सेक्शन सबमिट पुष्टि' : 'Submit Section Confirmation'}
                </h4>
                <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  {currentSection.name}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 my-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="font-semibold">{language === 'hi' ? 'सेक्शन में उपयोग समय:' : 'Time Utilized in Section:'}</span>
                <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400">
                  {(() => {
                    const secQuestions = session?.questions.filter(q => q.sectionId === currentSection.id) || [];
                    const secTime = secQuestions.reduce((acc, q) => acc + (responses[q.id]?.elapsedSeconds || 0), 0);
                    const m = Math.floor(secTime / 60);
                    const s = secTime % 60;
                    return `${m}m ${s}s`;
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="font-semibold">{language === 'hi' ? 'उत्तर दिए गए प्रश्न:' : 'Answered Questions:'}</span>
                <span className="font-extrabold text-green-600 dark:text-green-400">
                  {session?.questions.filter(q => q.sectionId === currentSection.id && (responses[q.id]?.state === 3 || responses[q.id]?.state === 5)).length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="font-semibold">{language === 'hi' ? 'समीक्षा हेतु चिह्नित:' : 'Marked for Review:'}</span>
                <span className="font-extrabold text-purple-600 dark:text-purple-400">
                  {session?.questions.filter(q => q.sectionId === currentSection.id && responses[q.id]?.state === 4).length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="font-semibold">{language === 'hi' ? 'छोड़े गए प्रश्न:' : 'Unattempted:'}</span>
                <span className="font-extrabold text-slate-500">
                  {session?.questions.filter(q => q.sectionId === currentSection.id && responses[q.id]?.state !== 3 && responses[q.id]?.state !== 5 && responses[q.id]?.state !== 4).length || 0}
                </span>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-350 text-[11px] leading-relaxed mb-6 font-medium">
              {language === 'hi'
                ? 'क्या आप इस सेक्शन को सबमिट करके अगले सेक्शन को शुरू करना चाहते हैं?'
                : 'Are you sure you want to submit this section and begin the next section now?'}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSectionSubmitConfirm(false);
                  resumeExam();
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setShowSectionSubmitConfirm(false);
                  setIsManuallyPaused(false);
                  submitSection();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow cursor-pointer active:scale-95"
              >
                {language === 'hi' ? 'हाँ, सेक्शन सबमिट करें' : 'Submit Section'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-4">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                {language === 'hi' ? 'परीक्षा सबमिट करें?' : 'Submit Mock Paper?'}
              </h4>
            </div>
            
            <p className="text-slate-600 dark:text-slate-350 text-xs leading-relaxed mb-6 font-medium">
              {language === 'hi'
                ? 'क्या आप सुनिश्चित हैं कि आप अपनी उत्तर पुस्तिका अभी समाप्त और सबमिट करना चाहते हैं?'
                : 'Are you sure you want to finish and submit your exam sheet now?'}
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  resumeExam();
                }}
                className="bg-slate-100 dark:bg-slate-805 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border border-slate-200 dark:border-slate-700"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  if (state.isRpscRasMode && !state.isExtraTimeMode) {
                    const allQs = session?.questions || [];
                    const hasUnattempted = allQs.some(q => {
                      const resp = state.responses[q.id];
                      return !resp || resp.selectedOptionIndex === null || resp.selectedOptionIndex === undefined;
                    });
                    if (hasUnattempted) {
                      enterExtraTimeMode();
                      return;
                    }
                  }
                  submitExam();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95"
              >
                {language === 'hi' ? 'सबमिट करें' : 'Submit Paper'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RPSC RAS Extra Time Rules Modal */}
      {state.isExtraTimeRulesShown && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-amber-300 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                <AlertCircle className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {language === 'hi' ? 'ध्यान दें!' : 'Hey! You need to mark at least one option in this question!'}
                </h3>
              </div>
            </div>

            {/* Rules Body */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-xs leading-relaxed text-slate-700">
              <p className="mb-3 font-semibold">
                {language === 'hi'
                  ? 'नवीनतम OMR नियमों के अनुसार नकल रोकने के लिए, एक अंतिम विकल्प "प्रश्न को अनुत्तरित छोड़ें" जोड़ा गया है जिसे चुनना अनिवार्य है यदि आप इस प्रश्न को छोड़ना चाहते हैं।'
                  : 'According to the latest OMR rules to combat cheating, a last option named "Leave Question unattempted" is added which is compulsory to select if you wish to skip this Question.'}
              </p>
              <p className="font-semibold">
                {language === 'hi'
                  ? 'यदि आप इस प्रश्न को अनुत्तरित छोड़ना चाहते हैं, तो कृपया अंतिम विकल्प चुनें।'
                  : 'If you want to leave this Question unattempted, please mark the last option.'}
              </p>
            </div>

            {/* Penalty Warning */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 text-[11px] font-bold text-red-700 flex items-start gap-2">
              <span className="text-red-500 text-base leading-none mt-0.5">⚠️</span>
              <div>
                <p>{language === 'hi'
                  ? 'आपको शेष अनुत्तरित प्रश्नों को चिह्नित करने के लिए 10 मिनट का अतिरिक्त समय मिलेगा।'
                  : 'You will get 10 minutes of extra time to mark the remaining unattempted questions.'}</p>
                <p className="mt-1 text-red-800 font-extrabold">{language === 'hi'
                  ? 'अतिरिक्त समय के बाद भी अनुत्तरित प्रश्नों पर -0.44 नकारात्मक अंकन लागू होगा।'
                  : 'Unattempted questions after extra time will get -0.44 negative marking.'}</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-[10px] text-blue-800 font-semibold">
              <p>📋 {language === 'hi'
                ? 'अतिरिक्त समय में, अनुत्तरित प्रश्नों पर विकल्प A-D अवरुद्ध रहेंगे। केवल विकल्प (E) "प्रश्न को अनुत्तरित छोड़ें" उपलब्ध होगा।'
                : 'During extra time, options A-D will be blocked for unattempted questions. Only Option (E) "Leave Question Unattempted" will be available.'}</p>
            </div>

            {/* Action Button */}
            <button
              onClick={() => dismissExtraTimeRules()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/30 cursor-pointer active:scale-[0.98]"
            >
              {language === 'hi' ? 'ठीक है, समझ गया' : 'Okay, Understood'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function CtetExamInstructionsScreen({ testId, onStart }: { testId: string; onStart: (selectedLang: 'en' | 'hi', lang1?: string, lang2?: string) => void }) {
  const router = useRouter();
  const { theme, toggleTheme, examCatalog, currentUser } = useAuth();
  const [defaultLang, setDefaultLang] = useState<string>('English');
  const [lang1, setLang1] = useState<string>('English');
  const [lang2, setLang2] = useState<string>('Hindi');
  const [agreed, setAgreed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [customQs, setCustomQs] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    setMounted(true);
    const fetchQs = async () => {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-custom-questions', data: { testId } })
        });
        const data = await res.json();
        if (data.success && data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          setCustomQs(data);
        } else {
          setCustomQs({ questions: [] });
        }
      } catch (err) {
        console.error("Error fetching custom CTET questions:", err);
        setCustomQs({ questions: [] });
      } finally {
        setFetching(false);
      }
    };
    fetchQs();
  }, [testId]);

  if (!mounted || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 font-sans text-slate-100">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-300 font-medium text-sm">Loading test details...</p>
        </div>
      </div>
    );
  }

  const examSession = generateExamSession(testId, examCatalog, customQs, lang1, lang2);

  if (!examSession.questions || examSession.questions.length === 0) {
    return <TestUploadedSoonCard testId={testId} testTitle={examSession.testTitle} catalog={examCatalog} router={router} currentUser={currentUser} />;
  }

  const isFormValid = 
    defaultLang !== '' && defaultLang !== '-- Select --' &&
    lang1 !== '' && lang1 !== '-- Select --' &&
    lang2 !== '' && lang2 !== '-- Select --' &&
    agreed;

  const lowerId = (testId || '').toLowerCase();
  const isPaper2 = lowerId.includes('paper2') || lowerId.includes('paper-2') || lowerId.includes('paper_2') || lowerId.includes('paper 2') || lowerId.includes('p2') || lowerId.includes('ctet2');
  const lang1SectionText = isPaper2 ? "3rd" : "4th";
  const lang2SectionText = isPaper2 ? "4th" : "5th";

  const durationMins = Math.round((examSession.totalDurationSeconds || 9000) / 60);
  const totalQs = examSession.questions?.length || 150;
  const totalMarks = examSession.questions?.reduce((sum, q) => {
    const sec = examSession.sections.find(s => s.id === q.sectionId);
    return sum + (q.positiveMark ?? sec?.positiveMark ?? 1);
  }, 0) || 150;

  return (
    <div className="min-h-screen bg-[#f4f6f9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Header bar */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <h2 className="font-extrabold text-sm tracking-wide flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <ShieldCheck className="h-5 w-5 text-blue-600 animate-pulse" /> {examSession.testTitle || 'CTET Comprehensive Exam Instructions'}
        </h2>
        
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-700"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-md space-y-6">
          
          {/* Header Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Duration</span>
              <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{durationMins} Mins</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Questions</span>
              <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{totalQs} Qs</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Max Marks</span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{totalMarks} Marks</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Marking Scheme</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+1.0 Correct / No Negative</span>
            </div>
          </div>

          {/* Section Pattern & Breakdown Table */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Exam Structure & Sectional Breakdown
            </h3>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Section Name</th>
                    <th className="p-3 text-center">Questions</th>
                    <th className="p-3 text-center">Positive Mark</th>
                    <th className="p-3 text-center">Negative Mark</th>
                    <th className="p-3 text-right">Total Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                  {examSession.sections.map((sec) => {
                    const secQs = examSession.questions.filter(q => q.sectionId === sec.id).length;
                    const secMarks = secQs * (sec.positiveMark || 1);
                    return (
                      <tr key={sec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 font-medium">
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{sec.name}</td>
                        <td className="p-3 text-center font-mono">{secQs}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">+{sec.positiveMark || 1}</td>
                        <td className="p-3 text-center font-bold text-slate-400">{sec.negativeMark || 0}</td>
                        <td className="p-3 text-right font-extrabold text-blue-600">{secMarks}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Question Palette Color Legend */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Question Palette Status Legend
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-semibold">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="w-5 h-5 rounded bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]">1</span>
                <span>Not Visited</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center font-bold text-[10px]">2</span>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">3</span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="w-5 h-5 rounded bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">4</span>
                <span>Marked Review</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
                <span className="w-5 h-5 rounded bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] relative">
                  5<span className="w-1.5 h-1.5 bg-emerald-400 rounded-full absolute -top-0.5 -right-0.5" />
                </span>
                <span>Answered & Review</span>
              </div>
            </div>
          </div>

          {/* Section 1: Detailed General Instructions */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              General Exam Instructions & Answering Guide
            </h3>

            <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-normal leading-relaxed">
              <li>The test contains {examSession.sections.length} sections having a total of {totalQs} questions.</li>
              <li>Each question has 4 multiple-choice options out of which only one option is correct.</li>
              <li>You have to complete the test within the allotted time of {durationMins} minutes.</li>
              <li><strong>No Negative Marking:</strong> There is no penalty for incorrect answers in this exam. You will be awarded 1 mark for each correct response.</li>
              <li><strong>Navigation:</strong> Click on &apos;Save &amp; Next&apos; to submit your answer and move to the next question. Use &apos;Clear Response&apos; to deselect your option if needed.</li>
              <li><strong>Mark for Review:</strong> You can mark questions for review if you want to inspect them later before final submission.</li>
              <li>You can attempt this test only once. Ensure stable internet connectivity before submitting.</li>
            </ol>
          </div>

          {/* Section 2: Language Selection Controls */}
          <div className="space-y-4 text-xs border-t border-slate-200 dark:border-slate-800 pt-4">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-white">
              Configure Test Languages
            </h3>
            
            {/* 1. Choose your default language */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <label className="font-bold text-slate-900 dark:text-white">
                  Choose your default language:
                </label>
                <select
                  value={defaultLang}
                  onChange={(e) => setDefaultLang(e.target.value)}
                  className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs outline-none cursor-pointer font-bold text-slate-900 dark:text-white"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Questions will appear in your default language. You can also switch individual question language later on during the test.
              </p>
            </div>

            {/* 2. Language - I */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <label className="font-bold text-slate-900 dark:text-white">
                  Language - I:
                </label>
                <select
                  value={lang1}
                  onChange={(e) => setLang1(e.target.value)}
                  className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs outline-none cursor-pointer font-bold text-slate-900 dark:text-white"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Sanskrit">Sanskrit</option>
                </select>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Note: Questions in {lang1SectionText} section will appear based on your selection here. This cannot be changed after the test starts.
              </p>
            </div>

            {/* 3. Language - II */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <label className="font-bold text-slate-900 dark:text-white">
                  Language - II:
                </label>
                <select
                  value={lang2}
                  onChange={(e) => setLang2(e.target.value)}
                  className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs outline-none cursor-pointer font-bold text-slate-900 dark:text-white"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Sanskrit">Sanskrit</option>
                </select>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Note: Questions in {lang2SectionText} section will appear based on your selection here. This cannot be changed after the test starts.
              </p>
            </div>
          </div>

          {/* Section 3: Declaration */}
          <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <p className="font-bold text-xs text-slate-900 dark:text-white">Declaration:</p>
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-slate-800 dark:text-slate-200 font-normal">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>I have read all instructions carefully and agree to comply with all examination rules.</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <Link
              href="/mock-tests"
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
            >
              Previous
            </Link>

            <button
              onClick={() => {
                if (isFormValid) {
                  const chosenExamLang = defaultLang === 'Hindi' ? 'hi' : 'en';
                  onStart(chosenExamLang, lang1, lang2);
                }
              }}
              disabled={!isFormValid}
              className={`px-7 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md ${
                isFormValid
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95 shadow-blue-500/20'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              I am ready to begin
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}

function ExamInstructionsScreen({ testId, onStart }: { testId: string; onStart: (selectedLang: 'en' | 'hi') => void }) {
  const router = useRouter();
  const { theme, toggleTheme, language: authLang, examCatalog, currentUser } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [mounted, setMounted] = useState(false);
  const [customQs, setCustomQs] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    setMounted(true);
    const fetchQs = async () => {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-custom-questions', data: { testId } })
        });
        const data = await res.json();
        if (data.success && data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          setCustomQs(data);
        } else {
          setCustomQs({ questions: [] });
        }
      } catch (err) {
        console.error("Error fetching custom test questions:", err);
        setCustomQs({ questions: [] });
      } finally {
        setFetching(false);
      }
    };
    fetchQs();
  }, [testId]);

  useEffect(() => {
    if (authLang) {
      setLang(authLang);
    }
  }, [authLang]);

  if (!mounted || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 font-sans text-slate-100">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-300 font-medium text-sm">Loading test details...</p>
        </div>
      </div>
    );
  }

  const handleLangChange = (newLang: 'en' | 'hi') => {
    setLang(newLang);
  };
  
  const examSession = generateExamSession(testId, examCatalog, customQs);

  if (!examSession.questions || examSession.questions.length === 0) {
    return <TestUploadedSoonCard testId={testId} testTitle={examSession.testTitle} catalog={examCatalog} router={router} currentUser={currentUser} />;
  }

  const durationMins = Math.round((examSession.totalDurationSeconds || 3600) / 60);
  const totalQs = examSession.questions?.length || 100;
  const totalMarks = examSession.questions?.reduce((sum, q) => {
    const sec = examSession.sections.find(s => s.id === q.sectionId);
    return sum + (q.positiveMark ?? sec?.positiveMark ?? 2);
  }, 0) || 200;

  const lowerId = (testId || '').toLowerCase();
  const titleLower = (examSession.testTitle || '').toLowerCase();
  const isRpscRas = lowerId.includes('rpsc') || titleLower.includes('rpsc') || titleLower.includes('ras');

  const text = {
    en: {
      title: "Please read all instructions carefully before starting the examination",
      general: "General Instructions:",
      gen1: "1. The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.",
      gen2: "2. The Question Palette displayed on the right side of screen will show the status of each question using color symbols.",
      gen3: "3. You can click on the character '>' arrow to collapse the question palette to maximize the question viewing area.",
      gen4: "4. Do not refresh or switch tabs during the exam. Any suspicious tab switches may result in auto-submission.",
      answering: "Navigating to & Answering a Question:",
      ans1: "5. To answer a question, select the radio button of one of the options and click 'Save & Next'.",
      ans2: "6. To change your answer, click on the 'Clear Response' button to reset the selection.",
      ans3: "7. To mark a question for review, click 'Mark for Review & Next'.",
      rpscTitle: "Special Instructions (RPSC RAS Mandatory-Attempt Rule):",
      rpsc1: "8. Unattempted questions after main exam time must be marked in the 10-minute extra time phase using Option (E) 'Leave Question Unattempted'.",
      rpsc2: "9. Failure to mark Option (E) for unattempted questions will attract a penalty of -0.44 negative marks per unattempted question.",
      disclaimer: "I have read and understood all the instructions. All computer hardware allotted to me is in proper working condition. I agree that in case of any cheating or tab switching, the exam will be auto-submitted.",
      btn: "I am ready to begin"
    },
    hi: {
      title: "परीक्षा शुरू करने से पहले कृपया सभी निर्देशों को ध्यान से पढ़ें",
      general: "सामान्य निर्देश:",
      gen1: "1. सर्वर घड़ी के अनुसार उलटी गिनती का समय स्क्रीन के ऊपरी दाएं कोने पर प्रदर्शित होगा।",
      gen2: "2. स्क्रीन के दाईं ओर प्रश्न पैलेट रंग प्रतीकों का उपयोग करके प्रत्येक प्रश्न की स्थिति दर्शाएगा।",
      gen3: "3. प्रश्न क्षेत्र को बड़ा करने के लिए आप '>' तीर पर क्लिक करके पैलेट छुपा सकते हैं।",
      gen4: "4. परीक्षा के दौरान पेज रीफ्रेश या टैब स्विच न करें। ऐसा करने पर परीक्षा स्वतः सबमिट हो सकती है।",
      answering: "प्रश्न पर जाना और उत्तर देना:",
      ans1: "5. उत्तर देने के लिए विकल्प चुनें और 'Save & Next' पर क्लिक करें।",
      ans2: "6. चयन बदलने के लिए 'Clear Response' पर क्लिक करके रीसेट करें।",
      ans3: "7. समीक्षा के लिए चिन्हित करने हेतु 'Mark for Review & Next' पर क्लिक करें।",
      rpscTitle: "विशेष निर्देश (RPSC RAS अनिवार्य प्रयास नियम):",
      rpsc1: "8. मुख्य समय समाप्त होने के बाद अनुत्तरित प्रश्नों के लिए 10 मिनट का अतिरिक्त समय मिलेगा, जिसमें विकल्प (E) 'प्रश्न अनुत्तरित छोड़ें' चुनना अनिवार्य है।",
      rpsc2: "9. अनुत्तरित प्रश्नों पर विकल्प (E) न चुनने पर प्रति प्रश्न -0.44 अंक का दंड लागू होगा।",
      disclaimer: "मैंने सभी निर्देशों को पढ़ और समझ लिया है। मुझे आवंटित सभी कंप्यूटर हार्डवेयर उचित कार्यशील स्थिति में हैं। मैं सहमत हूं कि किसी भी नकल या टैब स्विचिंग के मामले में परीक्षा स्वतः सबमिट हो जाएगी।",
      btn: "मैं तैयार हूँ (I am ready to begin)"
    }
  };

  const t = text[lang];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Header bar */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <h2 className="font-extrabold text-sm tracking-wide flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <ShieldCheck className="h-5 w-5 text-blue-600 animate-pulse" /> {examSession.testTitle || 'Mock Exam Instructions Panel'}
        </h2>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-bold">View In:</span>
            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value as 'en' | 'hi')}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 outline-none text-xs text-slate-800 dark:text-white cursor-pointer font-bold"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>
          
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-700"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Instructions Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-between">
        
        <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-md">
          
          {/* Header Metadata Grid */}
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider mb-3">
              {examSession.testTitle}
            </h1>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Duration</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{durationMins} Mins</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Questions</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{totalQs} Qs</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Maximum Marks</span>
                <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{totalMarks} Marks</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Sections</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{examSession.sections.length} Sections</span>
              </div>
            </div>
          </div>

          {/* Sectional Breakdown Table */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Exam Structure & Section Breakdown
            </h3>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Section Name</th>
                    <th className="p-3 text-center">Questions</th>
                    <th className="p-3 text-center">Positive Mark</th>
                    <th className="p-3 text-center">Negative Mark</th>
                    <th className="p-3 text-right">Total Section Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                  {examSession.sections.map((sec) => {
                    const secQs = examSession.questions.filter(q => q.sectionId === sec.id).length;
                    const secMarks = secQs * (sec.positiveMark || 2);
                    return (
                      <tr key={sec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 font-medium">
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{sec.name}</td>
                        <td className="p-3 text-center font-mono">{secQs}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">+{sec.positiveMark ?? 2}</td>
                        <td className="p-3 text-center font-bold text-red-500">−{sec.negativeMark ?? 0.5}</td>
                        <td className="p-3 text-right font-extrabold text-blue-600">{secMarks}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Question Palette Color Legend */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Question Palette Status Legend
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-semibold">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="w-5 h-5 rounded bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]">1</span>
                <span>Not Visited</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center font-bold text-[10px]">2</span>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">3</span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="w-5 h-5 rounded bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">4</span>
                <span>Marked Review</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
                <span className="w-5 h-5 rounded bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] relative">
                  5<span className="w-1.5 h-1.5 bg-emerald-400 rounded-full absolute -top-0.5 -right-0.5" />
                </span>
                <span>Answered & Review</span>
              </div>
            </div>
          </div>

          {/* Instructions Box */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs leading-relaxed">
            <h3 className="font-extrabold text-sm text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">{t.title}</h3>
            
            <p className="font-bold text-slate-800 dark:text-slate-200">{t.general}</p>
            <p className="pl-2">{t.gen1}</p>
            <p className="pl-2">{t.gen2}</p>
            <p className="pl-2">{t.gen3}</p>
            <p className="pl-2">{t.gen4}</p>

            <p className="font-bold text-slate-800 dark:text-slate-200 mt-4">{t.answering}</p>
            <p className="pl-2">{t.ans1}</p>
            <p className="pl-2">{t.ans2}</p>
            <p className="pl-2">{t.ans3}</p>

            {isRpscRas && (
              <>
                <p className="font-extrabold text-red-600 dark:text-red-400 mt-4">{t.rpscTitle}</p>
                <p className="pl-2 text-red-700 dark:text-red-300 font-semibold">{t.rpsc1}</p>
                <p className="pl-2 text-red-700 dark:text-red-300 font-semibold">{t.rpsc2}</p>
              </>
            )}
          </div>

          {/* Choose Default Test Language */}
          <div className="bg-blue-50/60 dark:bg-slate-950/60 border border-blue-100 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-slate-800 dark:text-white">
                {lang === 'hi' ? 'अपनी डिफ़ॉल्ट परीक्षा भाषा चुनें' : 'Choose your default exam language'}
              </p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                {lang === 'hi' ? 'कृपया प्रश्नों को हल करने के लिए डिफ़ॉल्ट भाषा चुनें (आप इसे बाद में भी बदल सकते हैं)' : 'Please select the default language for viewing questions (you can also change this per question later)'}
              </p>
            </div>
            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value as 'en' | 'hi')}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold text-xs text-slate-800 dark:text-white cursor-pointer focus:outline-none"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>

          {/* Disclaimer panel and button */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <label className="flex items-start gap-3 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400 leading-normal mb-6">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>{t.disclaimer}</span>
            </label>

            <div className="flex justify-between items-center">
              <Link 
                href="/mock-tests" 
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                Cancel
              </Link>

              <button
                onClick={() => onStart(lang)}
                disabled={!agreed}
                className={`font-bold px-8 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md ${
                  agreed 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/20 cursor-pointer' 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 shadow-none cursor-not-allowed'
                }`}
              >
                {t.btn}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default function DynamicExamPage() {
  const params = useParams();
  const testId = (params?.id as string) || "ssc_cgl_tier1";
  const { saveOngoingSession, language: authLanguage } = useAuth();
  
  const [mounted, setMounted] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedExamLang, setSelectedExamLang] = useState<'en' | 'hi'>('en');
  const [selectedLang1, setSelectedLang1] = useState<string>('English');
  const [selectedLang2, setSelectedLang2] = useState<string>('Hindi');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLanguage) {
      setSelectedExamLang(authLanguage);
    }
  }, [authLanguage]);

  if (!mounted) {
    return null;
  }

  // Callback when Engine triggers background timer saves
  const handleSaveSync = async (engineState: any) => {
    console.log('Synchronizing test engine states with database endpoint...', {
      sessionId: engineState.session.sessionId,
      remaining: engineState.timeRemaining,
      violations: engineState.violationsCount
    });
    if (engineState.session && engineState.session.questions && engineState.session.questions.length > 0 && !engineState.isExamSubmitted) {
      saveOngoingSession(
        testId,
        engineState.session.testTitle,
        engineState.timeRemaining,
        engineState.violationsCount,
        engineState.responses,
        engineState.currentSectionIndex,
        engineState.currentQuestionIndex
      );
    }
  };

  const handleStart = (chosenLang: 'en' | 'hi') => {
    setSelectedExamLang(chosenLang);
    const docEl = document.documentElement;
    const req = docEl.requestFullscreen || 
                (docEl as any).mozRequestFullScreen || 
                (docEl as any).webkitRequestFullscreen || 
                (docEl as any).msRequestFullscreen;
    if (req) {
      const promise = req.call(docEl);
      if (promise && typeof promise.then === 'function') {
        promise
          .then(() => {
            setIsConfirmed(true);
          })
          .catch((err) => {
            console.warn("Fullscreen promise rejected:", err);
            setIsConfirmed(true);
          });
      } else {
        setIsConfirmed(true);
      }
    } else {
      setIsConfirmed(true);
    }
  };

  const handleCtetStart = (chosenLang: 'en' | 'hi', l1?: string, l2?: string) => {
    if (l1) setSelectedLang1(l1);
    if (l2) setSelectedLang2(l2);
    handleStart(chosenLang);
  };

  const isCtetFullTest = (testId || '').toLowerCase().includes('ctet');

  if (!isConfirmed) {
    if (isCtetFullTest) {
      return <CtetExamInstructionsScreen testId={testId} onStart={handleCtetStart} />;
    }
    return <ExamInstructionsScreen testId={testId} onStart={handleStart} />;
  }

  return (
    <TestEngineProvider onStateSync={handleSaveSync} syncIntervalSeconds={12}>
      <TcsIonEngine testId={testId} initialExamLanguage={selectedExamLang} selectedLang1={selectedLang1} selectedLang2={selectedLang2} />
    </TestEngineProvider>
  );
}
