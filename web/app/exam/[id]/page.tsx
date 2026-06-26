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
import { Check, ShieldAlert, ShieldCheck, Globe, User, BookOpen, AlertCircle, ArrowLeft, Sun, Moon, Clock, Pause, Play, Menu, X } from 'lucide-react';
import { useIsMobile } from '../../useIsMobile';

// ============================================================================
// DYNAMIC EXAM GENERATOR
// ============================================================================
export const generateExamSession = (id: string, examCatalog?: TestCategory[]): ActiveSession => {
  let title = "Government Prep Mock Test Simulator";
  let duration = 3600; // 60 mins
  let catalogTest: MockTestItem | null = null;

  if (examCatalog) {
    for (const cat of examCatalog) {
      for (const sub of cat.subCategories) {
        const found = sub.tests.find(t => t.id === id);
        if (found) {
          catalogTest = found;
          break;
        }
      }
      if (catalogTest) break;
    }
  }

  if (catalogTest) {
    title = catalogTest.title;
    duration = catalogTest.durationMinutes * 60;
  }

  let sections = [
    { id: "sec_gs", name: "General Studies", orderIndex: 0, positiveMark: 2, negativeMark: 0.5 },
    { id: "sec_quant", name: "Quantitative Aptitude", orderIndex: 1, positiveMark: 2, negativeMark: 0.5 }
  ];
  let questions: Question[] = [];

  // Check if we have custom uploaded questions in localStorage
  let hasCustomQuestions = false;
  if (typeof window !== 'undefined') {
    const savedCustomQs = localStorage.getItem(`tb_custom_questions_${id}`);
    if (savedCustomQs) {
      try {
        const parsed = JSON.parse(savedCustomQs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          hasCustomQuestions = true;
          const positiveMark = id.includes('rrb') ? 1 : 2;
          const negativeMark = id.includes('rrb') ? 0.33 : 0.5;

          sections = [
            { id: "sec_paper1", name: "Mock Test Questions", orderIndex: 0, positiveMark, negativeMark }
          ];

          questions = parsed.map((item: any, idx: number) => {
            return {
              id: `q_custom_${id}_${idx}`,
              sectionId: "sec_paper1",
              questionType: "mcq",
              orderIndex: idx,
              correctOptionIndex: item.correctIndex ?? 0,
              content: {
                en: {
                  questionText: item.textEn,
                  options: item.optionsEn || [],
                  imageUrl: item.imageUrlEn || item.imageUrl
                },
                hi: {
                  questionText: item.textHi,
                  options: item.optionsHi || [],
                  imageUrl: item.imageUrlHi || item.imageUrl
                }
              },
              explanation: {
                en: item.explanationEn || "Detailed explanation under review.",
                hi: item.explanationHi || "विस्तृत विवरण समीक्षा के अधीन है।"
              }
            };
          });
        }
      } catch (e) {
        console.error("Error parsing custom questions", e);
      }
    }
  }

  if (!hasCustomQuestions) {
    if (id.includes('ssc')) {
      title = id.includes('cgl') 
        ? "SSC CGL 2026 Tier-I CBT Simulator" 
        : id.includes('chsl') 
        ? "SSC CHSL 2026 Preliminary Exam" 
        : "SSC MTS Full-Length Practice Test";
      duration = 3600;
      sections = [
        { id: "sec_quant", name: "Quantitative Aptitude", orderIndex: 0, positiveMark: 2, negativeMark: 0.5 },
        { id: "sec_reasoning", name: "General Intelligence & Reasoning", orderIndex: 1, positiveMark: 2, negativeMark: 0.5 },
        { id: "sec_english", name: "English Comprehension", orderIndex: 2, positiveMark: 2, negativeMark: 0.5 }
      ];
      questions = [
        {
          id: "q_q1", sectionId: "sec_quant", questionType: "mcq", orderIndex: 0, correctOptionIndex: 1,
          content: {
            en: { questionText: "If x + 1/x = 5, then find the value of x² + 1/x².", options: ["23", "25", "27", "21"], mathLatex: "x + \\frac{1}{x} = 5" },
            hi: { questionText: "यदि x + 1/x = 5 है, तो x² + 1/x² का मान ज्ञात कीजिए।", options: ["23", "25", "27", "21"], mathLatex: "x + \\frac{1}{x} = 5" }
          }
        },
        {
          id: "q_q2", sectionId: "sec_quant", questionType: "mcq", orderIndex: 1, correctOptionIndex: 0,
          content: {
            en: { questionText: "The ratio of present ages of A and B is 4:5. After 5 years, the ratio becomes 5:6. What is A's present age?", options: ["20 years", "25 years", "30 years", "15 years"] },
            hi: { questionText: "A और B की वर्तमान आयु का अनुपात 4:5 है। 5 वर्ष बाद यह अनुपात 5:6 हो जाता है। A की वर्तमान आयु क्या है?", options: ["20 वर्ष", "25 वर्ष", "30 वर्ष", "15 वर्ष"] }
          }
        },
        {
          id: "q_r1", sectionId: "sec_reasoning", questionType: "mcq", orderIndex: 0, correctOptionIndex: 3,
          content: {
            en: { questionText: "Identify the pattern and choose the next term in the series: 3, 7, 15, 31, 63, ?", options: ["125", "126", "128", "127"] },
            hi: { questionText: "पैटर्न को पहचानें और श्रृंखला में अगला पद चुनें: 3, 7, 15, 31, 63, ?", options: ["125", "126", "128", "127"] }
          }
        },
        {
          id: "q_e1", sectionId: "sec_english", questionType: "mcq", orderIndex: 0, correctOptionIndex: 0,
          content: {
            en: { questionText: "Select the antonym for the word: OBSTINATE", options: ["Flexible", "Stubborn", "Rigid", "Dogmatic"] },
            hi: { questionText: "दिए गए शब्द का विलोम शब्द चुनें: OBSTINATE (हठी)", options: ["Flexible (लचीला)", "Stubborn (अड़ियल)", "Rigid (कठोर)", "Dogmatic (कट्टर)"] }
          }
        }
      ];
    } else if (id.includes('rrb') || id.includes('railway')) {
      title = "RRB NTPC CBT-1 Mock Assessment Paper";
      duration = 5400; // 90 minutes
      sections = [
        { id: "sec_math", name: "Mathematics", orderIndex: 0, positiveMark: 1, negativeMark: 0.33 },
        { id: "sec_reasoning", name: "General Intelligence & Reasoning", orderIndex: 1, positiveMark: 1, negativeMark: 0.33 },
        { id: "sec_general", name: "General Awareness", orderIndex: 2, positiveMark: 1, negativeMark: 0.33 }
      ];
      questions = [
        {
          id: "q_m1", sectionId: "sec_math", questionType: "mcq", orderIndex: 0, correctOptionIndex: 1,
          content: {
            en: { questionText: "Find the value of (0.43 * 0.43 - 0.17 * 0.17) / (0.43 - 0.17).", options: ["0.26", "0.60", "0.50", "0.43"] },
            hi: { questionText: "मान ज्ञात करें: (0.43 * 0.43 - 0.17 * 0.17) / (0.43 - 0.17)", options: ["0.26", "0.60", "0.50", "0.43"] }
          }
        },
        {
          id: "q_g1", sectionId: "sec_general", questionType: "mcq", orderIndex: 0, correctOptionIndex: 2,
          content: {
            en: { questionText: "Which is the largest fresh water lake in India?", options: ["Chilika Lake", "Dal Lake", "Wular Lake", "Vembanad Lake"] },
            hi: { questionText: "भारत में मीठे पानी की सबसे बड़ी झील कौन सी है?", options: ["चिलिका झील", "डल झील", "वुलर झील", "वेम्बनाड झील"] }
          }
        }
      ];
    } else {
      title = "Mock Test Assessment Series - General Mock Test";
      duration = 3600;
      sections = [
        { id: "sec_paper1", name: "Aptitude & General Studies", orderIndex: 0, positiveMark: 2, negativeMark: 0.5 }
      ];
      questions = [
        {
          id: "q_gen1", sectionId: "sec_paper1", questionType: "mcq", orderIndex: 0, correctOptionIndex: 1,
          content: {
            en: { questionText: "What is the unit of electric current?", options: ["Volt", "Ampere", "Ohm", "Watt"] },
            hi: { questionText: "विद्युत धारा की इकाई क्या है?", options: ["वोल्ट", "एम्पीयर", "ओम", "वाट"] }
          }
        },
        {
          id: "q_gen2", sectionId: "sec_paper1", questionType: "mcq", orderIndex: 1, correctOptionIndex: 1,
          content: {
            en: { questionText: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Saturn"] },
            hi: { questionText: "किस ग्रह को लाल ग्रह के नाम से जाना जाता है?", options: ["पृथ्वी", "मंगल", "बृहस्पति", "शनि"] }
          }
        }
      ];
    }
  }

  return {
    sessionId: `session_${id}_${Date.now().toString().substring(8)}`,
    testId: id,
    testTitle: title,
    totalDurationSeconds: duration,
    sections,
    questions
  };
};


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

  const { isMobile, isMounted } = useIsMobile();
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize session on mount (checking for resume)
  useEffect(() => {
    const examSession = generateExamSession(testId, examCatalog);
    const ongoingRecord = currentUser?.testSessions?.find(
      s => s.testId === testId && s.status === 'ONGOING'
    );

    if (ongoingRecord && ongoingRecord.responses) {
      initSession(examSession, 3, {
        responses: ongoingRecord.responses as any,
        timeRemaining: ongoingRecord.timeRemaining ?? examSession.totalDurationSeconds,
        violationsCount: ongoingRecord.violations ?? 0,
        currentSectionIndex: ongoingRecord.currentSectionIndex ?? 0,
        currentQuestionIndex: ongoingRecord.currentQuestionIndex ?? 0,
      }, authLanguage);
    } else {
      initSession(examSession, 3, undefined, authLanguage); // 3 violations allowed
    }
  }, [initSession, testId, authLanguage, examCatalog]);

  // Save state on unload/unmount
  useEffect(() => {
    const handleSave = () => {
      const currentState = stateRef.current;
      // Save only if exam is active and not submitted yet
      if (currentState.session && !currentState.isExamSubmitted) {
        saveOngoingSession(
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
  }, [testId, saveOngoingSession]);

  // Sync attempt score on exam submission
  useEffect(() => {
    if (state.isExamSubmitted && state.score && currentUser && !attemptSaved) {
      setAttemptSaved(true);
      
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
      <header className="flex h-12 items-center justify-between bg-[#0F2942] px-3 sm:px-4 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <div className="hidden sm:block bg-red-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider animate-pulse shrink-0">
            Live Exam
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-wide truncate max-w-[120px] sm:max-w-xs md:max-w-none">{session.testTitle}</span>
        </div>

        {/* Dynamic Countdown Clock & Pause button */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2 bg-[#1C3D5A] px-2 sm:px-3 py-1 sm:py-1.5 rounded border border-[#2E587A]">
            <span className="text-gray-300 text-[9px] sm:text-[10px] uppercase hidden xs:inline sm:inline">Time Left:</span>
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
                router.push('/mock-tests');
              }}
              className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow hover:bg-blue-750 transition"
            >
              Go to Test Series
            </button>
          </div>
        </div>
      ) : isMounted && isMobile ? (
        <div className="flex flex-col flex-1 overflow-y-auto relative bg-white pb-20">
          {/* 2. SUBJECTS TABS SWITCHER FOR MOBILE */}
          <div className="flex h-10 border-b border-slate-200 bg-[#E9ECF2] overflow-x-auto shrink-0 scrollbar-none">
            {session.sections.map((sec, idx) => (
              <button
                key={sec.id}
                onClick={() => switchSection(idx)}
                className={`flex items-center px-4 font-bold border-r border-slate-200 whitespace-nowrap text-[11px] transition-colors shrink-0 ${
                  idx === currentSectionIndex
                    ? 'bg-white text-blue-800 border-t-2 border-t-orange-500 font-extrabold'
                    : 'text-slate-600 hover:bg-[#DEE3EC]'
                }`}
              >
                {sec.name}
              </button>
            ))}
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
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-800">
                          Q No. {currentQuestionIndex + 1}
                        </h3>
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
                      {questionLang === 'en'
                        ? currentQuestion.content.en.questionText
                        : currentQuestion.content.hi.questionText}

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
                            <span className="flex-1">{optLabel}</span>
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
          <footer className="fixed bottom-0 inset-x-0 bg-[#E9ECF2] border-t border-slate-202 z-20 px-3 py-2 flex items-center justify-between gap-2 shadow-inner">
            <button
              onClick={() => setMobilePaletteOpen(true)}
              className="bg-white border border-slate-305 text-slate-700 font-black p-2 rounded shadow-sm hover:bg-slate-50 text-[10px] w-12 flex flex-col items-center justify-center shrink-0 cursor-pointer"
              title="Show Palette"
            >
              <Menu className="h-3.5 w-3.5 text-slate-605" />
              <span className="text-[7px] uppercase mt-0.5 font-bold">Palette</span>
            </button>

            <div className="flex gap-2 flex-1">
              <button
                onClick={markForReviewAndNext}
                className="bg-white border border-slate-300 text-slate-700 font-bold px-2 py-2.5 rounded shadow-sm hover:bg-slate-50 active:bg-slate-100 transition text-[10px] flex-1 text-center cursor-pointer"
              >
                Review & Next
              </button>
              <button
                onClick={clearResponse}
                className="bg-white border border-slate-300 text-slate-750 font-bold px-2 py-2.5 rounded shadow-sm hover:bg-slate-50 active:bg-slate-100 transition text-[10px] flex-1 text-center cursor-pointer"
              >
                Clear
              </button>
            </div>

            <button
              onClick={saveAndNext}
              className="bg-[#2E7D32] hover:bg-green-800 text-white font-bold px-4 py-2.5 rounded shadow transition text-[10px] shrink-0 cursor-pointer"
            >
              Save & Next
            </button>
          </footer>

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
                  <div className="grid grid-cols-2 gap-2 text-[9px] mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <div className="h-4.5 w-4.5 bg-gray-200 border border-gray-400 text-slate-800 font-bold flex items-center justify-center text-[9px] shadow-xs">
                        {counts.notVisited}
                      </div>
                      <span>Not Visited</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="h-4.5 w-4.5 bg-[#C62828] text-white font-bold flex items-center justify-center text-[9px] rounded-t-sm shadow-xs">
                        {counts.notAnswered}
                      </div>
                      <span>Not Answered</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="h-4.5 w-4.5 bg-[#2E7D32] text-white font-bold flex items-center justify-center text-[9px] rounded-b-sm shadow-xs">
                        {counts.answered}
                      </div>
                      <span>Answered</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="h-4.5 w-4.5 bg-[#4527A0] text-white font-bold flex items-center justify-center text-[9px] rounded-full shadow-xs">
                        {counts.marked}
                      </div>
                      <span>Marked Review</span>
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
                          styleClass = "bg-gray-200 border-gray-400 text-slate-800";
                          break;
                        case 2: // Not Answered
                          styleClass = "bg-[#C62828] text-white rounded-t-md border-transparent";
                          break;
                        case 3: // Answered
                          styleClass = "bg-[#2E7D32] text-white rounded-b-md border-transparent";
                          break;
                        case 4: // Marked for Review
                          styleClass = "bg-[#4527A0] text-white rounded-full border-transparent";
                          break;
                        case 5: // Answered & Marked for Review
                          styleClass = "bg-[#4527A0] text-white rounded-full border-transparent relative";
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
                </div>

                <div className="pt-4 border-t border-slate-100 mt-6">
                  <button
                    onClick={() => {
                      setMobilePaletteOpen(false);
                      submitExam();
                    }}
                    className="w-full bg-[#1A3B5C] hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow text-xs uppercase cursor-pointer"
                  >
                    Submit Exam Paper
                  </button>
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
            <div className="flex h-10 border-b border-slate-200 bg-[#E9ECF2]">
              {session.sections.map((sec, idx) => (
                <button
                  key={sec.id}
                  onClick={() => switchSection(idx)}
                  className={`flex items-center px-4 font-bold border-r border-slate-200 transition-colors ${
                    idx === currentSectionIndex
                      ? 'bg-white text-blue-800 border-t-2 border-t-orange-500 font-extrabold'
                      : 'text-slate-600 hover:bg-[#DEE3EC]'
                  }`}
                >
                  {sec.name}
                </button>
              ))}
            </div>

            {/* Question Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold">
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
                          {/* Question-specific Language Switcher Button */}
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
                        </div>
                        
                        <div className="flex items-center gap-2 text-[9px] sm:text-[10px]">
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono px-2 py-0.5 rounded-md">
                            <Clock className="h-3 w-3 text-slate-500" />
                            <span>Time Spent: {Math.floor((activeResponse?.elapsedSeconds || 0) / 60)}:
                            {String((activeResponse?.elapsedSeconds || 0) % 60).padStart(2, '0')}</span>
                          </div>
                          <div className="text-slate-400 hidden sm:inline">
                            ID: {currentQuestion.id}
                          </div>
                        </div>
                      </div>

                      {/* Render Question Text Based on active Language */}
                      <div className="mb-6 text-sm text-slate-900 leading-relaxed font-normal bg-slate-50 p-4 border border-slate-200 rounded">
                        {questionLang === 'en'
                          ? currentQuestion.content.en.questionText
                          : currentQuestion.content.hi.questionText}

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
                              <span className="text-slate-800 text-xs flex-1">{optLabel}</span>
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
            <footer className="flex flex-col sm:flex-row sm:h-14 items-center justify-between gap-3 border-t border-slate-200 bg-[#E9ECF2] px-4 py-3 sm:py-0">
              <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  onClick={markForReviewAndNext}
                  className="bg-white border border-slate-300 text-slate-700 font-bold px-3 sm:px-4 py-2 rounded shadow-sm hover:bg-slate-50 active:bg-slate-100 transition text-[10px] sm:text-xs flex-1 sm:flex-none"
                >
                  Mark for Review & Next
                </button>
                <button
                  onClick={clearResponse}
                  className="bg-white border border-slate-300 text-slate-700 font-bold px-3 sm:px-4 py-2 rounded shadow-sm hover:bg-slate-50 active:bg-slate-100 transition text-[10px] sm:text-xs flex-1 sm:flex-none"
                >
                  Clear Response
                </button>
              </div>

              <button
                onClick={saveAndNext}
                className="bg-[#2E7D32] text-white font-bold px-6 py-2 rounded shadow hover:bg-green-800 transition text-[10px] sm:text-xs w-full sm:w-auto"
              >
                Save & Next
              </button>
            </footer>
          </main>

          {/* RIGHT PANEL (25% WIDTH) - CANDIDATE IDENTITY & QUESTION PALETTE GRID */}
          <aside className="flex w-full lg:w-[25%] flex-col bg-[#F3F4F6] border-t lg:border-t-0 lg:border-l border-slate-200 lg:overflow-y-auto overflow-y-visible">
            
            {/* Profile Avatar Card */}
            <div className="flex items-center gap-3 bg-white p-4 border-b border-slate-200">
              <div className="relative h-12 w-12 rounded bg-slate-200 flex items-center justify-center border border-slate-300 text-slate-400">
                <User className="h-6 w-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Candidate Code: {currentUser?.candidateCode || 'GUEST'}</p>
                <p className="font-bold text-slate-900 truncate">{currentUser?.name || 'Guest User'}</p>
                {violationsCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[9px] bg-red-50 text-red-700 border border-red-200 rounded px-1 py-0.5 mt-1 font-bold">
                    <ShieldAlert className="h-3 w-3" />
                    Blur Violations: {violationsCount}/3
                  </span>
                )}
              </div>
            </div>

            {/* Legend Panel of States (Custom Designs/Shapes matching TCS iON) */}
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

            {/* Active Palette Section Grid */}
            <div className="flex-1 p-4 bg-white">
              <h4 className="font-bold text-[#0F2942] uppercase text-[10px] tracking-wide mb-3">
                Question Palette - {currentSection.name}
              </h4>
              
              <div className="grid grid-cols-5 gap-2.5">
                {currentSectionQuestions.map((q, idx) => {
                  const resp = responses[q.id];
                  const stateCode = resp?.state ?? 1;
                  const isActive = idx === currentQuestionIndex;

                  let styleClass = "";

                  // Select style configurations based on TCS iON Palette State Rules
                  switch (stateCode) {
                    case 1: // Not Visited
                      styleClass = "bg-gray-200 border-gray-400 text-slate-800";
                      break;
                    case 2: // Not Answered
                      styleClass = "bg-[#C62828] text-white rounded-t-md border-transparent";
                      break;
                    case 3: // Answered
                      styleClass = "bg-[#2E7D32] text-white rounded-b-md border-transparent";
                      break;
                    case 4: // Marked for Review
                      styleClass = "bg-[#4527A0] text-white rounded-full border-transparent";
                      break;
                    case 5: // Answered & Marked for Review
                      styleClass = "bg-[#4527A0] text-white rounded-full border-transparent relative";
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
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={submitExam}
                className="w-full bg-[#1A3B5C] text-white font-bold py-2.5 rounded shadow hover:bg-slate-800 transition"
              >
                Submit Exam Paper
              </button>
            </div>

          </aside>
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
