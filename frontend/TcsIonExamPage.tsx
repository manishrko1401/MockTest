"use client";

import React, { useEffect, useState, useRef } from 'react';
import {
  useTestEngine,
  TestEngineProvider,
  ActiveSession,
  Question,
} from '../useTestEngine';
import { Check, Info, HelpCircle, ShieldAlert, Monitor, HelpCircle as HelpIcon, Globe, User, Clock, Pause, Play } from 'lucide-react';

// ============================================================================
// MOCK DATA TO POPULATE EXAM (SSC CGL Tier 1 CBT Example)
// ============================================================================
const mockExamSession: ActiveSession = {
  sessionId: "session_9921_cgl_tier1",
  testId: "test_ssc_cgl_2026",
  testTitle: "SSC CGL 2026 - Combined Graduate Level (Tier-I) Exam",
  totalDurationSeconds: 3600, // 60 Minutes
  sections: [
    { id: "sec_quant", name: "Quantitative Aptitude", orderIndex: 0, positiveMark: 2, negativeMark: 0.5 },
    { id: "sec_reasoning", name: "General Intelligence & Reasoning", orderIndex: 1, positiveMark: 2, negativeMark: 0.5 },
    { id: "sec_english", name: "English Comprehension", orderIndex: 2, positiveMark: 2, negativeMark: 0.5 },
  ],
  questions: [
    // Quantitative Aptitude
    {
      id: "q_q1",
      sectionId: "sec_quant",
      questionType: "mcq",
      orderIndex: 0,
      correctOptionIndex: 1,
      content: {
        en: {
          questionText: "If x + 1/x = 5, then find the value of x² + 1/x².",
          options: ["23", "25", "27", "21"],
          mathLatex: "x + \\frac{1}{x} = 5 \\implies x^2 + \\frac{1}{x^2}"
        },
        hi: {
          questionText: "यदि x + 1/x = 5 है, तो x² + 1/x² का मान ज्ञात कीजिए।",
          options: ["23", "25", "27", "21"],
          mathLatex: "x + \\frac{1}{x} = 5 \\implies x^2 + \\frac{1}{x^2}"
        }
      }
    },
    {
      id: "q_q2",
      sectionId: "sec_quant",
      questionType: "mcq",
      orderIndex: 1,
      correctOptionIndex: 0,
      content: {
        en: {
          questionText: "The ratio of present ages of A and B is 4:5. After 5 years, the ratio becomes 5:6. What is A's present age?",
          options: ["20 years", "25 years", "30 years", "15 years"]
        },
        hi: {
          questionText: "A और B की वर्तमान आयु का अनुपात 4:5 है। 5 वर्ष बाद यह अनुपात 5:6 हो जाता है। A की वर्तमान आयु क्या है?",
          options: ["20 वर्ष", "25 वर्ष", "30 वर्ष", "15 वर्ष"]
        }
      }
    },
    {
      id: "q_q3",
      sectionId: "sec_quant",
      questionType: "mcq",
      orderIndex: 2,
      correctOptionIndex: 2,
      content: {
        en: {
          questionText: "A shopkeeper sells an article at a discount of 10% and still makes a profit of 20%. If marked price is $800, what is the cost price?",
          options: ["$500", "$550", "$600", "$650"]
        },
        hi: {
          questionText: "एक दुकानदार एक वस्तु को 10% की छूट पर बेचता है और फिर भी 20% का लाभ कमाता है। यदि अंकित मूल्य $800 है, तो क्रय मूल्य क्या है?",
          options: ["$500", "$550", "$600", "$650"]
        }
      }
    },
    // General Intelligence & Reasoning
    {
      id: "q_r1",
      sectionId: "sec_reasoning",
      questionType: "mcq",
      orderIndex: 0,
      correctOptionIndex: 3,
      content: {
        en: {
          questionText: "Identify the pattern and choose the next term in the series: 3, 7, 15, 31, 63, ?",
          options: ["125", "126", "128", "127"]
        },
        hi: {
          questionText: "पैटर्न को पहचानें और श्रृंखला में अगला पद चुनें: 3, 7, 15, 31, 63, ?",
          options: ["125", "126", "128", "127"]
        }
      }
    },
    {
      id: "q_r2",
      sectionId: "sec_reasoning",
      questionType: "mcq",
      orderIndex: 1,
      correctOptionIndex: 1,
      content: {
        en: {
          questionText: "In a certain code, 'ORANGE' is written as 'PSBOHF'. How is 'GRAPES' written in that code?",
          options: ["HSBOHF", "HSBQFT", "HSCQGT", "ISAQFT"]
        },
        hi: {
          questionText: "एक निश्चित कूट भाषा में, 'ORANGE' को 'PSBOHF' लिखा जाता है। उसी कूट भाषा में 'GRAPES' को क्या लिखा जाएगा?",
          options: ["HSBOHF", "HSBQFT", "HSCQGT", "ISAQFT"]
        }
      }
    },
    // English Comprehension
    {
      id: "q_e1",
      sectionId: "sec_english",
      questionType: "mcq",
      orderIndex: 0,
      correctOptionIndex: 0,
      content: {
        en: {
          questionText: "Select the antonym for the word: OBSTINATE",
          options: ["Flexible", "Stubborn", "Rigid", "Dogmatic"]
        },
        hi: {
          questionText: "दिए गए शब्द का विलोम शब्द चुनें: OBSTINATE (हठी)",
          options: ["Flexible (लचीला)", "Stubborn (अड़ियल)", "Rigid (कठोर)", "Dogmatic (कट्टर)"]
        }
      }
    },
    {
      id: "q_e2",
      sectionId: "sec_english",
      questionType: "mcq",
      orderIndex: 1,
      correctOptionIndex: 2,
      content: {
        en: {
          questionText: "Choose the correct spelling:",
          options: ["Accomodation", "Acomodation", "Accommodation", "Accomodatione"]
        },
        hi: {
          questionText: "सही वर्तनी चुनें:",
          options: ["Accomodation", "Acomodation", "Accommodation", "Accomodatione"]
        }
      }
    }
  ]
};

// ============================================================================
// CORE EXAMINATION DASHBOARD COMPONENT
// ============================================================================

const TcsIonEngine: React.FC = () => {
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

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize session on mount (checking for resume)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tb_frontend_ongoing_session_${mockExamSession.testId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.status === 'ONGOING') {
            initSession(mockExamSession, 3, {
              responses: parsed.responses,
              timeRemaining: parsed.timeRemaining,
              violationsCount: parsed.violationsCount,
              currentSectionIndex: parsed.currentSectionIndex,
              currentQuestionIndex: parsed.currentQuestionIndex,
            });
            return;
          }
        } catch (e) {
          console.error("Failed to parse ongoing session:", e);
        }
      }
    }
    initSession(mockExamSession, 3); // 3 violations allowed
  }, [initSession]);

  // Save state on unload/unmount
  useEffect(() => {
    const handleSave = () => {
      const currentState = stateRef.current;
      if (currentState.session && !currentState.isExamSubmitted) {
        const record = {
          testId: currentState.session.testId,
          status: 'ONGOING',
          timeRemaining: currentState.timeRemaining,
          violationsCount: currentState.violationsCount,
          responses: currentState.responses,
          currentSectionIndex: currentState.currentSectionIndex,
          currentQuestionIndex: currentState.currentQuestionIndex,
        };
        localStorage.setItem(
          `tb_frontend_ongoing_session_${currentState.session.testId}`,
          JSON.stringify(record)
        );
      }
    };

    window.addEventListener('beforeunload', handleSave);

    return () => {
      handleSave();
      window.removeEventListener('beforeunload', handleSave);
    };
  }, []);

  // Clean up ongoing session on exam submission
  useEffect(() => {
    if (state.isExamSubmitted && state.session) {
      localStorage.removeItem(`tb_frontend_ongoing_session_${state.session.testId}`);
    }
  }, [state.isExamSubmitted, state.session]);

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
      <header className="flex h-12 items-center justify-between bg-[#0F2942] px-4 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider animate-pulse">
            Live Exam
          </div>
          <span className="font-bold text-sm tracking-wide">{session.testTitle}</span>
        </div>

        {/* Dynamic Countdown Clock & Pause button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#1C3D5A] px-3 py-1.5 rounded border border-[#2E587A]">
            <span className="text-gray-300 text-[10px] uppercase">Time Left:</span>
            <span className="font-mono text-base font-bold text-yellow-400 tracking-wider">
              {formatTime(timeRemaining)}
            </span>
          </div>

          <button
            type="button"
            onClick={pauseExam}
            className="flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-750 text-white px-3 py-1.5 rounded border border-yellow-500 font-bold transition active:scale-95 cursor-pointer text-[10px] uppercase tracking-wider"
          >
            <Pause className="h-3 w-3" /> Pause
          </button>

          <div className="flex items-center gap-2 border-l border-slate-600 pl-4">
            <Globe className="h-4 w-4 text-slate-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
              className="bg-[#1C3D5A] border border-[#2E587A] rounded px-1 py-0.5 text-xs text-white outline-none cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>
        </div>
      </header>

      {/* GATING / SUBMITTED SCREEN OVERLAY */}
      {isExamSubmitted ? (
        <div className="flex flex-1 flex-col items-center justify-center bg-white p-8">
          <div className="max-w-md w-full border border-slate-200 rounded-lg shadow-xl p-6 bg-slate-50 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Test Submitted Successfully!</h2>
            <p className="text-gray-600 text-xs mb-6">Your answers have been securely synced and recorded in the database. Evaluation details are mapped below.</p>

            <div className="grid grid-cols-2 gap-4 text-left border-y border-slate-200 py-4 mb-6">
              <div>
                <p className="text-gray-500 font-medium">Total Marks:</p>
                <p className="text-sm font-bold text-slate-800">{score?.totalMarks}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Obtained Score:</p>
                <p className="text-sm font-bold text-blue-600">{score?.obtainedMarks}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Correct Answers:</p>
                <p className="text-sm font-bold text-green-600">{score?.correctCount}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Incorrect Answers:</p>
                <p className="text-sm font-bold text-red-600">{score?.incorrectCount}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 font-medium">Accuracy Percentage:</p>
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
                window.location.reload();
              }}
              className="w-full bg-blue-600 text-white font-bold py-2 rounded shadow hover:bg-blue-700 transition"
            >
              Close Simulator
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
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

          {/* ==================================================================
              2. LEFT PANEL (75% WIDTH) - SUBJECTS TABS, QUESTION BLOCK & ACTIONS
              ================================================================== */}
          
          {/* ==================================================================
              2. LEFT PANEL (75% WIDTH) - SUBJECTS TABS, QUESTION BLOCK & ACTIONS
              ================================================================== */}
          <main className="flex w-[75%] flex-col border-r border-slate-200 bg-white">
            
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
            <div className="flex-1 overflow-y-auto p-6">
              {currentQuestion ? (
                <div>
                  {/* Question Index Title */}
                  <div className="mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">
                      Question No. {currentQuestionIndex + 1}
                    </h3>
                    <div className="text-[10px] text-slate-400">
                      ID: {currentQuestion.id}
                    </div>
                  </div>

                  {/* Render Question Text Based on active Language */}
                  <div className="mb-6 text-sm text-slate-900 leading-relaxed font-normal bg-slate-50 p-4 border border-slate-200 rounded">
                    {language === 'en'
                      ? currentQuestion.content.en.questionText
                      : currentQuestion.content.hi.questionText}

                    {/* Optional Math Equation preview */}
                    {(language === 'en' ? currentQuestion.content.en.mathLatex : currentQuestion.content.hi.mathLatex) && (
                      <div className="mt-2 p-2 bg-yellow-50 text-yellow-900 border border-yellow-200 rounded font-mono text-xs">
                        LaTeX: {language === 'en' ? currentQuestion.content.en.mathLatex : currentQuestion.content.hi.mathLatex}
                      </div>
                    )}
                  </div>

                  {/* Options List Grid */}
                  <div className="space-y-3 pl-2">
                    {(language === 'en'
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
                              ? 'bg-blue-50 border-blue-400 font-medium'
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
              ) : (
                <div className="text-center py-10 text-gray-500">No questions loaded in this section.</div>
              )}
            </div>

            {/* Bottom Actions Row */}
            <footer className="flex h-14 items-center justify-between border-t border-slate-200 bg-[#E9ECF2] px-4">
              <div className="flex gap-2">
                <button
                  onClick={markForReviewAndNext}
                  className="bg-white border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded shadow-sm hover:bg-slate-50 active:bg-slate-100 transition"
                >
                  Mark for Review & Next
                </button>
                <button
                  onClick={clearResponse}
                  className="bg-white border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded shadow-sm hover:bg-slate-50 active:bg-slate-100 transition"
                >
                  Clear Response
                </button>
              </div>

              <button
                onClick={saveAndNext}
                className="bg-[#2E7D32] text-white font-bold px-6 py-2 rounded shadow hover:bg-green-800 transition"
              >
                Save & Next
              </button>
            </footer>
          </main>

          {/* ==================================================================
              3. RIGHT PANEL (25% WIDTH) - CANDIDATE IDENTITY & QUESTION PALETTE GRID
              ================================================================== */}
          <aside className="flex w-[25%] flex-col bg-[#F3F4F6] border-l border-slate-200 overflow-y-auto">
            
            {/* Profile Avatar Card */}
            <div className="flex items-center gap-3 bg-white p-4 border-b border-slate-200">
              <div className="relative h-12 w-12 rounded bg-slate-200 flex items-center justify-center border border-slate-300 text-slate-400">
                <User className="h-6 w-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Candidate Code: CGL_9029</p>
                <p className="font-bold text-slate-900 truncate">Test Student Profile</p>
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
};

// ============================================================================
// MAIN PAGE VIEW EXPORT (WITH ENGINE PROVIDER GATING)
// ============================================================================

export default function TcsIonExamPage() {
  // Callback when Engine triggers background timer saves
  const handleSaveSync = async (engineState: any) => {
    console.log('Synchronizing test engine states with database endpoint...', {
      sessionId: engineState.session.sessionId,
      remaining: engineState.timeRemaining,
      violations: engineState.violationsCount
    });
  };

  return (
    <TestEngineProvider onStateSync={handleSaveSync} syncIntervalSeconds={12}>
      <TcsIonEngine />
    </TestEngineProvider>
  );
}
