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
import { Check, ShieldAlert, ShieldCheck, Globe, User, BookOpen, AlertCircle, ArrowLeft, Sun, Moon, Clock, Pause, Play, Menu, X, Trophy, Star } from 'lucide-react';
import { useIsMobile } from '../../useIsMobile';

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


// ============================================================================
// DYNAMIC EXAM GENERATOR IMPORTED FROM UTILS
// ============================================================================
import { generateExamSession } from '../../lib/examUtils';

function TcsIonEngine({ testId }: { testId: string }) {
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
    submitExam,
    pauseExam,
    resumeExam,
  } = useTestEngine();

  const { addAttempt, currentUser, saveOngoingSession, language: authLanguage, examCatalog } = useAuth();
  const router = useRouter();

  const [attemptSaved, setAttemptSaved] = useState(false);
  const [questionLanguages, setQuestionLanguages] = useState<Record<string, 'en' | 'hi'>>({});
  const [websiteRating, setWebsiteRating] = useState(0);
  const [examRating, setExamRating] = useState(0);

  const { isMobile, isMounted } = useIsMobile();
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const saveOngoingSessionRef = useRef(saveOngoingSession);
  useEffect(() => {
    saveOngoingSessionRef.current = saveOngoingSession;
  }, [saveOngoingSession]);

  // Initialize session on mount (checking for resume)
  useEffect(() => {
    if (state.isExamSubmitted) return;

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
          customQs = data.questions;
        }
      } catch (err) {
        console.error("Error fetching custom questions:", err);
      }

      const examSession = generateExamSession(testId, examCatalog, customQs);

      // 1. Check server for an ongoing session first
      const ongoingRecord = currentUser?.testSessions?.find(
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

      if (resumeSource && resumeSource.responses) {
        initSession(examSession, 3, {
          responses: resumeSource.responses as any,
          timeRemaining: resumeSource.timeRemaining ?? examSession.totalDurationSeconds,
          violationsCount: resumeSource.violations ?? 0,
          currentSectionIndex: resumeSource.currentSectionIndex ?? 0,
          currentQuestionIndex: resumeSource.currentQuestionIndex ?? 0,
        }, authLanguage);
      } else {
        initSession(examSession, 3, undefined, authLanguage); // 3 violations allowed
      }
    };

    initialize();
  }, [initSession, testId, authLanguage, examCatalog, currentUser, state.isExamSubmitted]);

  // Save state to localStorage (instant, works offline) and server on unload/unmount
  useEffect(() => {
    const handleSave = () => {
      const currentState = stateRef.current;
      if (currentState.session && !currentState.isExamSubmitted) {
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


  if (!state.session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 font-sans">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Initializing Exam Terminal...</p>
        </div>
      </div>
    );
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
        const isSsc = testId.includes('ssc') || testId.toLowerCase().includes('ssc');
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

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen();
                      } else {
                        document.exitFullscreen();
                      }
                    } catch (e) {
                      console.warn("Toggle fullscreen error:", e);
                    }
                  }}
                  className="border border-[#0D88B9] text-[#0D88B9] bg-white hover:bg-[#E3F2FD] px-2.5 py-1.5 rounded font-extrabold transition active:scale-95 cursor-pointer text-[9px] sm:text-[10px] uppercase tracking-wider hidden sm:inline-block"
                >
                  {isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
                </button>
                
                <button
                  type="button"
                  onClick={pauseExam}
                  className="border border-[#0D88B9] text-[#0D88B9] bg-white hover:bg-[#E3F2FD] px-2.5 py-1.5 rounded font-extrabold transition active:scale-95 cursor-pointer text-[9px] sm:text-[10px] uppercase tracking-wider"
                >
                  Pause
                </button>
              </div>
            </header>
          );
        }

        return (
          <header className="flex h-12 items-center justify-between bg-[#0F2942] px-3 sm:px-4 text-white shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="hidden sm:block bg-red-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider animate-pulse shrink-0">
                Live Exam
              </div>
              <span className="font-bold text-xs sm:text-sm tracking-wide truncate max-w-[120px] sm:max-w-xs md:max-w-none">{session.testTitle}</span>
            </div>

            {/* Dynamic Countdown Clock & Pause button */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="flex items-center gap-1 sm:gap-2 bg-[#1C3D5A] px-2 sm:px-3 py-1 sm:py-1.5 rounded border border-[#2E587A]">
                <span className="text-gray-300 text-[9px] sm:text-[10px] uppercase hidden xs:inline sm:inline">
                  {session.hasSectionalTiming ? `${currentSection.name} Time:` : 'Time Left:'}
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-yellow-400 tracking-wider">
                  {formatTime(timeRemaining)}
                </span>
              </div>

              <button
                type="button"
                onClick={pauseExam}
                className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-750 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded border border-yellow-500 font-bold transition active:scale-95 cursor-pointer text-[9px] sm:text-[10px] uppercase tracking-wider"
              >
                <Pause className="h-3 w-3" /> <span className="hidden sm:inline">Pause</span>
              </button>

              <div className="flex items-center gap-1 sm:gap-2 border-l border-slate-600 pl-2 sm:pl-4">
                <Globe className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
                  className="bg-[#1C3D5A] border border-[#2E587A] rounded px-1 py-0.5 text-[10px] sm:text-xs text-white outline-none cursor-pointer"
                >
                  <option value="en">EN</option>
                  <option value="hi">HI</option>
                </select>
              </div>
            </div>
          </header>
        );
      })()}

      {/* PAUSE SCREEN BLUR OVERLAY */}
      {!state.isTimerRunning && !isExamSubmitted && state.session && (
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
              onClick={resumeExam}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 rounded-lg shadow-lg hover:shadow-blue-500/20 active:scale-95 transition cursor-pointer text-xs uppercase tracking-wider"
            >
              <Play className="h-4 w-4" /> Resume Test
            </button>
          </div>
        </div>
      )}


      {/* GATING / SUBMITTED SCREEN OVERLAY */}
      {isExamSubmitted ? (
        <div className="flex flex-1 flex-col items-center justify-center bg-white p-8">
          <div className="max-w-md w-full border border-slate-200 rounded-lg shadow-xl p-6 bg-slate-50 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Test Submitted Successfully!</h2>
            <p className="text-gray-600 text-xs mb-6 font-semibold">Your attempt details have been synced to your profile statistics dashboard.</p>

            <div className="grid grid-cols-2 gap-4 text-left border-y border-slate-200 py-4 mb-6">
              <div>
                <p className="text-gray-500 font-semibold">Total Marks:</p>
                <p className="text-sm font-bold text-slate-800">{score?.totalMarks}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold">Obtained Score:</p>
                <p className="text-sm font-bold text-blue-600">{score?.obtainedMarks}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold">Correct Answers:</p>
                <p className="text-sm font-bold text-green-600">{score?.correctCount}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold">Incorrect Answers:</p>
                <p className="text-sm font-bold text-red-600">{score?.incorrectCount}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 font-semibold">Accuracy Percentage:</p>
                <p className="text-sm font-bold text-indigo-600">{score?.accuracyPercentage}%</p>
              </div>
            </div>

            <div className="my-5 p-4 bg-white rounded-xl border border-slate-200 text-left">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Feedback & Ratings</h4>
              
              <div className="mb-4">
                <p className="text-[11px] font-bold text-slate-600 mb-1.5">Rate the Website:</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setWebsiteRating(star)}
                      type="button"
                      className="focus:outline-none transition active:scale-90"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          star <= websiteRating 
                            ? 'fill-amber-400 text-amber-400' 
                            : 'text-slate-300 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-600 mb-1.5">Rate the Exam Experience:</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setExamRating(star)}
                      type="button"
                      className="focus:outline-none transition active:scale-90"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          star <= examRating 
                            ? 'fill-amber-400 text-amber-400' 
                            : 'text-slate-300 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                try {
                  const doc = document as any;
                  if (document.exitFullscreen) {
                    document.exitFullscreen();
                  } else if (doc.mozCancelFullScreen) {
                    doc.mozCancelFullScreen();
                  } else if (doc.webkitExitFullscreen) {
                    doc.webkitExitFullscreen();
                  } else if (doc.msExitFullscreen) {
                    doc.msExitFullscreen();
                  }
                } catch (e) {
                  console.warn("Exit fullscreen failed:", e);
                }
                router.push(`/exam/${testId}/analysis`);
              }}
              className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow hover:bg-blue-750 transition"
            >
              {language === 'hi' ? 'विश्लेषण देखें' : 'View Analysis'}
            </button>
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
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold shrink-0">
            <span className="text-[#0747A6]">Question Type: MCQ</span>
            <div className="flex gap-2">
              <span className="text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded text-[9px]">
                +{currentSection.positiveMark}
              </span>
              <span className="text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[9px]">
                -{currentSection.negativeMark}
              </span>
            </div>
          </div>

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
                          <h3 className="text-xs font-bold text-slate-800">
                            Q No. {currentQuestionIndex + 1}
                          </h3>
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
                    <div className="mb-4 text-xs text-slate-900 leading-relaxed font-normal bg-slate-50 p-3.5 border border-slate-200 rounded">
                      <MathJaxText
                        component="div"
                        className="markup-content font-sans"
                        content={decodeHtml(questionLang === 'en'
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

                    {/* Options Grid */}
                    <div className="space-y-2">
                      {(questionLang === 'en'
                        ? currentQuestion.content.en.options
                        : currentQuestion.content.hi.options
                      ).map((opt, idx) => {
                        const optLabel = typeof opt === 'string' ? opt : opt.text;
                        const isTempChosen = activeResponse?.tempOptionIndex === idx;

                        return (
                          <label
                            key={idx}
                            onClick={() => selectOption(idx)}
                            className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer hover:bg-slate-50 transition text-[11px] ${
                              isTempChosen
                                ? 'bg-blue-50 border-blue-400 font-bold text-blue-900 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestion.id}`}
                              checked={isTempChosen}
                              readOnly
                              className="h-3.5 w-3.5 border-slate-350 text-blue-600 focus:ring-blue-500"
                            />
                            <MathJaxText
                              className="flex-1 font-sans"
                              content={decodeHtml(optLabel)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-10 text-gray-500 text-xs">No questions loaded.</div>
            )}
          </div>

          {/* 5. STICKY ACTIONS BAR */}
          {(() => {
            const isSsc = testId.includes('ssc') || testId.toLowerCase().includes('ssc');
            return (
              <footer className={`fixed bottom-0 inset-x-0 border-t z-20 px-3 py-2 flex items-center justify-between gap-2 shadow-inner ${
                !isSsc ? 'bg-white border-slate-200' : 'bg-[#E9ECF2] border-slate-202'
              }`}>
                <button
                  onClick={() => setMobilePaletteOpen(true)}
                  className="bg-white border border-slate-300 text-slate-700 font-black p-2 rounded shadow-sm hover:bg-slate-50 text-[10px] w-12 flex flex-col items-center justify-center shrink-0 cursor-pointer"
                  title="Show Palette"
                >
                  <Menu className="h-3.5 w-3.5 text-slate-600" />
                  <span className="text-[7px] uppercase mt-0.5 font-bold">Palette</span>
                </button>

                <div className="flex gap-2 flex-1">
                  <button
                    onClick={markForReviewAndNext}
                    className={`font-bold px-2 py-2.5 rounded shadow-sm transition text-[10px] flex-1 text-center cursor-pointer active:scale-95 ${
                      !isSsc 
                        ? 'bg-[#B3E5FC]/60 text-[#006064] border border-[#B3E5FC]' 
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    Review & Next
                  </button>
                  <button
                    onClick={clearResponse}
                    className={`font-bold px-2 py-2.5 rounded shadow-sm transition text-[10px] flex-1 text-center cursor-pointer active:scale-95 ${
                      !isSsc 
                        ? 'bg-[#B3E5FC]/60 text-[#006064] border border-[#B3E5FC]' 
                        : 'bg-white border border-slate-300 text-slate-750 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    Clear
                  </button>
                </div>

                <button
                  onClick={saveAndNext}
                  className={`font-bold px-4 py-2.5 rounded shadow transition text-[10px] shrink-0 cursor-pointer active:scale-95 ${
                    !isSsc ? 'bg-[#0D88B9] hover:bg-[#0A739C] text-white' : 'bg-[#2E7D32] hover:bg-green-800 text-white'
                  }`}
                >
                  Save & Next
                </button>
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
                    const isSsc = testId.includes('ssc') || testId.toLowerCase().includes('ssc');
                    return (
                      <button
                        onClick={() => {
                          setMobilePaletteOpen(false);
                          submitExam();
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
        <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
          
          {/* LEFT PANEL (75% WIDTH) - SUBJECTS TABS, QUESTION BLOCK & ACTIONS */}
          <main className="flex w-full lg:w-[75%] flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-white lg:h-full">
            
            {/* Subject Tabs Switcher */}
            {(() => {
              const isSsc = testId.includes('ssc') || testId.toLowerCase().includes('ssc');
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
                <div className="flex h-10 border-b border-slate-200 bg-[#E9ECF2] shrink-0">
                  {session.sections.map((sec, idx) => {
                    const isActive = idx === currentSectionIndex;
                    const isLocked = session.hasSectionalTiming && !isActive;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => !isLocked && switchSection(idx)}
                        disabled={isLocked}
                        title={isLocked ? 'Section locked — complete current section first' : undefined}
                        className={`flex items-center px-4 font-bold border-r border-slate-200 transition-colors ${
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
              );
            })()}

            {/* Question Header Bar */}
            {(() => {
              const isSsc = testId.includes('ssc') || testId.toLowerCase().includes('ssc');
              if (!isSsc) {
                return (
                  <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2 text-[11px] font-bold shrink-0">
                    <span className="text-slate-400">Question Type: Multiple Choice Question</span>
                    <div className="flex gap-2">
                      <span className="text-slate-550 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                        Section Marks: +{currentSection.positiveMark} | -{currentSection.negativeMark}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold shrink-0">
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
                                    +{currentSection.positiveMark}
                                  </span>
                                  <span className="bg-[#C62828] text-white font-extrabold px-2 py-0.5 rounded-md text-[9px]">
                                    -{currentSection.negativeMark}
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
                            <div className="flex items-center gap-2 text-[9px] sm:text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextLang = questionLang === 'en' ? 'hi' : 'en';
                                  setQuestionLanguages(prev => ({ ...prev, [currentQuestion.id]: nextLang }));
                                }}
                                className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200 text-[9px] sm:text-[10px] transition cursor-pointer active:scale-95 shadow-sm"
                                title={questionLang === 'en' ? 'Switch question view to Hindi' : 'Switch question view to English'}
                              >
                                <Globe className="h-3 w-3 text-blue-500" />
                                {questionLang === 'en' ? 'हिन्दी' : 'English'}
                              </button>

                              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono px-2 py-0.5 rounded-md">
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
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
                      <div className="mb-6 text-sm text-slate-900 leading-relaxed font-normal bg-slate-50 p-4 border border-slate-200 rounded">
                        <MathJaxText
                          component="div"
                          className="markup-content font-sans"
                          content={decodeHtml(questionLang === 'en'
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

                      {/* Options List Grid */}
                      <div className="space-y-3 pl-2">
                        {(questionLang === 'en'
                          ? currentQuestion.content.en.options
                          : currentQuestion.content.hi.options
                        ).map((opt, idx) => {
                          const optLabel = typeof opt === 'string' ? opt : opt.text;
                          const isTempChosen = activeResponse?.tempOptionIndex === idx;

                          return (
                            <label
                              key={idx}
                              onClick={() => selectOption(idx)}
                              className={`flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition ${
                                isTempChosen
                                  ? 'bg-blue-50 border-blue-400 font-semibold'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${currentQuestion.id}`}
                                checked={isTempChosen}
                                readOnly
                                className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <MathJaxText
                                className="text-slate-800 text-xs flex-1 font-sans"
                                content={decodeHtml(optLabel)}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-10 text-gray-500">No questions loaded in this section.</div>
              )}
            </div>

            {/* Bottom Actions Row */}
            {(() => {
              const isSsc = testId.includes('ssc') || testId.toLowerCase().includes('ssc');
              return (
                <footer className={`flex flex-col sm:flex-row sm:h-14 items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:py-0 shrink-0 ${
                  !isSsc ? 'bg-white' : 'bg-[#E9ECF2]'
                }`}>
                  <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-start">
                    <button
                      onClick={markForReviewAndNext}
                      className={`font-bold px-3 sm:px-4 py-2.5 rounded shadow-sm transition text-[10px] sm:text-xs flex-1 sm:flex-none cursor-pointer active:scale-95 ${
                        !isSsc 
                          ? 'bg-[#B3E5FC]/60 hover:bg-[#B3E5FC]/80 text-[#006064] border border-[#B3E5FC]' 
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                      }`}
                    >
                      Mark for Review & Next
                    </button>
                    <button
                      onClick={clearResponse}
                      className={`font-bold px-3 sm:px-4 py-2.5 rounded shadow-sm transition text-[10px] sm:text-xs flex-1 sm:flex-none cursor-pointer active:scale-95 ${
                        !isSsc 
                          ? 'bg-[#B3E5FC]/60 hover:bg-[#B3E5FC]/80 text-[#006064] border border-[#B3E5FC]' 
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                      }`}
                    >
                      Clear Response
                    </button>
                  </div>

                  <button
                    onClick={saveAndNext}
                    className={`font-bold px-6 py-2.5 rounded shadow transition text-[10px] sm:text-xs w-full sm:w-auto cursor-pointer active:scale-95 ${
                      !isSsc 
                        ? 'bg-[#0D88B9] hover:bg-[#0A739C] text-white' 
                        : 'bg-[#2E7D32] hover:bg-green-800 text-white'
                    }`}
                  >
                    Save & Next
                  </button>
                </footer>
              );
            })()}
          </main>

          {/* RIGHT PANEL (25% WIDTH) - CANDIDATE IDENTITY & QUESTION PALETTE GRID */}
          {(() => {
            const isSsc = testId.includes('ssc') || testId.toLowerCase().includes('ssc');
            return (
              <aside className={`flex w-full lg:w-[25%] flex-col border-t lg:border-t-0 lg:border-l border-slate-200 lg:overflow-y-auto overflow-y-visible ${
                !isSsc ? 'bg-[#EBF5FA]' : 'bg-[#F3F4F6]'
              }`}>
                
                {/* Profile Avatar Card */}
                <div className={`flex items-center gap-3 p-4 border-b border-slate-200 ${
                  !isSsc ? 'bg-[#EBF5FA]' : 'bg-white'
                }`}>
                  <div className={`relative h-12 w-12 flex items-center justify-center text-slate-400 ${
                    !isSsc ? 'rounded-full bg-[#0D88B9] text-white' : 'rounded bg-slate-200 border border-slate-300'
                  }`}>
                    <User className="h-6 w-6" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Candidate Code: {currentUser?.candidateCode || 'GUEST'}</p>
                    <p className="font-bold text-slate-900 truncate">{currentUser?.name || 'Guest User'}</p>
                  </div>
                </div>

                {/* Legend Panel of States (Custom Designs/Shapes matching TCS iON or Testbook) */}
                {!isSsc ? (
                  <div className="p-3 bg-white border-b border-slate-200 grid grid-cols-2 gap-x-2 gap-y-2 text-[10px] font-bold text-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 bg-[#2E7D32] text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-xs">
                        {counts.answered}
                      </div>
                      <span>Answered</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 bg-[#8E24AA] text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-xs">
                        {counts.marked}
                      </div>
                      <span>Marked</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 bg-[#D32F2F] text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-xs">
                        {counts.notAnswered}
                      </div>
                      <span>Not Answered</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 bg-white border border-slate-400 text-slate-800 flex items-center justify-center font-bold text-[9px] shadow-xs rounded">
                        {counts.notVisited}
                      </div>
                      <span>Not Visited</span>
                    </div>

                    <div className="flex items-center gap-2 col-span-2">
                      <div className="relative h-5 w-5 bg-[#8E24AA] text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-xs">
                        {counts.markedAndAnswered}
                        <span className="absolute -bottom-0.5 -right-0.5 bg-green-500 text-white rounded-full p-0.5 border border-white">
                          <Check className="h-1.5 w-1.5" />
                        </span>
                      </div>
                      <span>Marked & Answered</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white border-b border-slate-200 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px]">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center bg-gray-200 border border-gray-400 text-xs font-bold text-slate-800">
                        {counts.notVisited}
                      </div>
                      <span>Not Visited</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center bg-[#C62828] text-white text-xs font-bold rounded-t-md">
                        {counts.notAnswered}
                      </div>
                      <span>Not Answered</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center bg-[#2E7D32] text-white text-xs font-bold rounded-b-md">
                        {counts.answered}
                      </div>
                      <span>Answered</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center bg-[#4527A0] text-white text-xs font-bold rounded-full">
                        {counts.marked}
                      </div>
                      <span>Marked for Review</span>
                    </div>

                    <div className="flex items-center gap-2 col-span-2">
                      <div className="relative flex h-5 w-5 items-center justify-center bg-[#4527A0] text-white text-xs font-bold rounded-full">
                        {counts.markedAndAnswered}
                        <span className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border border-white">
                          <Check className="h-2 w-2" />
                        </span>
                      </div>
                      <span>Answered & Marked for Review</span>
                    </div>
                  </div>
                )}

                {/* Active Palette Section Grid */}
                <div className={`flex-1 p-4 ${!isSsc ? 'bg-[#EBF5FA]' : 'bg-white'}`}>
                  <h4 className="font-bold text-[#0F2942] uppercase text-[10px] tracking-wide mb-3">
                    Question Palette - {currentSection.name}
                  </h4>
                  
                  <div className="grid grid-cols-5 gap-2.5">
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
                          onClick={() => jumpToQuestion(currentSectionIndex, idx)}
                          className={`flex h-8 w-8 items-center justify-center border font-bold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all ${styleClass} ${
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

                {/* Submit Block Section */}
                <div className={`p-4 border-t border-slate-200 ${!isSsc ? 'bg-[#EBF5FA]' : 'bg-slate-50'}`}>
                  <button
                    onClick={submitExam}
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

    </div>
  );
}

function ExamInstructionsScreen({ testId, onStart }: { testId: string; onStart: () => void }) {
  const { theme, toggleTheme, language: authLang, setLanguage: setAuthLang } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  // Sync instruction selection with default auth context language
  useEffect(() => {
    if (authLang) {
      setLang(authLang);
    }
  }, [authLang]);

  const handleLangChange = (newLang: 'en' | 'hi') => {
    setLang(newLang);
    setAuthLang(newLang); // Sets global/default language so the test initializes in it too!
  };
  
  // Mapped metadata based on testId
  let examName = "General Mock Test Assessment";
  let questionsCount = 100;
  let durationMinutes = 60;
  let maxMarks = 200;
  
  if (testId.includes('ssc')) {
    examName = "SSC CGL 2026 - Tier-I Combined Graduate Level Exam";
    questionsCount = 4;
    durationMinutes = 60;
    maxMarks = 8;
  } else if (testId.includes('rrb') || testId.includes('railway')) {
    examName = "RRB NTPC CBT-1 Stage 1 Practice Simulator";
    questionsCount = 2;
    durationMinutes = 90;
    maxMarks = 2;
  } else if (testId.includes('ugc_net')) {
    examName = "UGC NET Paper-1 Teaching & Research Aptitude";
    questionsCount = 2;
    durationMinutes = 60;
    maxMarks = 4;
  } else if (testId.includes('ctet') || testId.includes('teaching')) {
    examName = "CTET 2026 Paper-I (Primary Class I-V) Mock Paper";
    questionsCount = 2;
    durationMinutes = 150;
    maxMarks = 4;
  }
  
  const text = {
    en: {
      title: "Please read the instructions carefully",
      general: "General Instructions:",
      gen1: "1. The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.",
      gen2: "2. The Question Palette displayed on the right side of screen will show the status of each question using one of the 5 symbols.",
      gen3: "3. You can click on the character '>' arrow to collapse the question palette to maximize the question viewing area.",
      answering: "Navigating to a Question:",
      ans1: "4. To answer a question, select the radio button of one of the options and click 'Save & Next'.",
      ans2: "5. To change your answer, click on the 'Clear Response' button to reset the selection.",
      disclaimer: "I have read and understood all the instructions. All computer hardware allotted to me is in proper working condition. I agree that in case of any cheating or tab switching, the exam will be auto-submitted.",
      btn: "I am ready to begin"
    },
    hi: {
      title: "कृपया निर्देशों को ध्यान से पढ़ें",
      general: "सामान्य निर्देश:",
      gen1: "1. घड़ी सर्वर पर परीक्षा घड़ी के रूप में सेट की जाएगी। स्क्रीन के शीर्ष दाएं कोने में उलटी गिनती घड़ी आपके द्वारा परीक्षा पूरी करने के लिए उपलब्ध शेष समय को प्रदर्शित करेगी।",
      gen2: "2. स्क्रीन के दाईं ओर प्रदर्शित प्रश्न पैलेट 5 प्रतीकों में से किसी एक का उपयोग करके प्रत्येक प्रश्न की स्थिति को दर्शाएगा।",
      gen3: "3. प्रश्न देखने के क्षेत्र को अधिकतम करने के लिए आप प्रश्न पैलेट को बंद करने के लिए '>' तीर पर क्लिक कर सकते हैं।",
      answering: "प्रश्न पर नेविगेट करना:",
      ans1: "4. किसी प्रश्न का उत्तर देने के लिए, विकल्पों में से किसी एक को चुनें और 'Save & Next' पर क्लिक करें।",
      ans2: "5. अपना उत्तर बदलने के लिए, चयन को रीसेट करने के लिए 'Clear Response' बटन पर क्लिक करें।",
      disclaimer: "मैंने सभी निर्देशों को पढ़ और समझ लिया है। मुझे आवंटित सभी कंप्यूटर हार्डवेयर उचित कार्यशील स्थिति में हैं। मैं सहमत हूं कि किसी भी नकल या टैब स्विचिंग के मामले में, परीक्षा स्वतः सबमिट हो जाएगी।",
      btn: "मैं तैयार हूँ (I am ready to begin)"
    }
  };

  const t = text[lang];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Header bar */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shadow-sm">
        <h2 className="font-extrabold text-sm tracking-wide flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600 animate-pulse" /> Instructions Panel
        </h2>
        
        <div className="flex items-center gap-4">
          {/* Lang Switcher */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-bold">View In:</span>
            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value as 'en' | 'hi')}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 outline-none text-xs text-slate-800 dark:text-white cursor-pointer font-bold"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>
          
          {/* Theme switcher */}
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
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col justify-between">
        
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">{examName}</h1>
            <div className="flex gap-4 mt-2 text-xs text-slate-500 font-bold">
              <span>Duration: {durationMinutes} Mins</span>
              <span>•</span>
              <span>Questions: {questionsCount} Qs</span>
              <span>•</span>
              <span>Marks: {maxMarks} Marks</span>
            </div>
          </div>

          {/* Core instructions scroll box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 h-[340px] overflow-y-auto space-y-4 text-xs leading-relaxed shadow-inner">
            <h3 className="font-extrabold text-sm text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">{t.title}</h3>
            
            <p className="font-bold text-slate-700 dark:text-slate-300">{t.general}</p>
            <p className="pl-2">{t.gen1}</p>
            <p className="pl-2">{t.gen2}</p>
            <p className="pl-2">{t.gen3}</p>

            <p className="font-bold text-slate-700 dark:text-slate-300 mt-4">{t.answering}</p>
            <p className="pl-2">{t.ans1}</p>
            <p className="pl-2">{t.ans2}</p>
          </div>

          {/* Choose Default Test Language */}
          <div className="bg-blue-50/50 dark:bg-slate-900/45 border border-blue-100 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
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
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-bold text-xs text-slate-800 dark:text-white cursor-pointer focus:outline-none"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>
        </div>

        {/* Disclaimer panel and button */}
        <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
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
              className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-6 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all active:scale-95"
            >
              Cancel
            </Link>

            <button
              onClick={onStart}
              disabled={!agreed}
              className={`font-bold px-8 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md ${
                agreed 
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-950/20 cursor-pointer' 
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 shadow-none cursor-not-allowed'
              }`}
            >
              {t.btn}
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}

export default function DynamicExamPage() {
  const params = useParams();
  const testId = (params?.id as string) || "ssc_cgl_tier1";
  const { saveOngoingSession } = useAuth();
  
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Callback when Engine triggers background timer saves
  const handleSaveSync = async (engineState: any) => {
    console.log('Synchronizing test engine states with database endpoint...', {
      sessionId: engineState.session.sessionId,
      remaining: engineState.timeRemaining,
      violations: engineState.violationsCount
    });
    if (engineState.session && !engineState.isExamSubmitted) {
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

  const handleStart = () => {
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

  if (!isConfirmed) {
    return <ExamInstructionsScreen testId={testId} onStart={handleStart} />;
  }

  return (
    <TestEngineProvider onStateSync={handleSaveSync} syncIntervalSeconds={12}>
      <TcsIonEngine testId={testId} />
    </TestEngineProvider>
  );
}
