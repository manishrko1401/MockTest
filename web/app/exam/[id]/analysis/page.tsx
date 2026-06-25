"use client";

import React, { useState, useEffect } from 'react';
import { useAuth, MockUser, MockTestRecord } from '../../../AuthContext';
import { generateExamSession } from '../page';
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
  Timer
} from 'lucide-react';

// Detailed Bilingual Explanations Dictionary for all questions
const EXPLANATIONS: Record<string, { en: string; hi: string }> = {
  q_q1: {
    en: "Given, x + 1/x = 5.\n\nSquaring both sides:\n(x + 1/x)² = 5²\nx² + 2(x)(1/x) + 1/x² = 25\nx² + 2 + 1/x² = 25\nx² + 1/x² = 25 - 2 = 23.\n\nHence, the correct answer is 23.",
    hi: "दिया गया है, x + 1/x = 5.\n\nदोनों ओर वर्ग करने पर:\n(x + 1/x)² = 5²\nx² + 2(x)(1/x) + 1/x² = 25\nx² + 2 + 1/x² = 25\nx² + 1/x² = 25 - 2 = 23.\n\nइसलिए, सही उत्तर 23 है।"
  },
  q_q2: {
    en: "Let present ages of A and B be 4k and 5k respectively.\n\nAfter 5 years:\n(4k + 5) / (5k + 5) = 5/6\n6(4k + 5) = 5(5k + 5)\n24k + 30 = 25k + 25\nk = 5.\n\nA's present age = 4k = 4(5) = 20 years.\n\nHence, the correct answer is 20 years.",
    hi: "माना कि A और B की वर्तमान आयु क्रमशः 4k और 5k है।\n\n5 वर्ष बाद:\n(4k + 5) / (5k + 5) = 5/6\n6(4k + 5) = 5(5k + 5)\n24k + 30 = 25k + 25\nk = 5.\n\nA की वर्तमान आयु = 4k = 4(5) = 20 वर्ष।\n\nइसलिए, सही उत्तर 20 वर्ष है।"
  },
  q_r1: {
    en: "The pattern in the series is as follows:\n- 3 × 2 + 1 = 7\n- 7 × 2 + 1 = 15\n- 15 × 2 + 1 = 31\n- 31 × 2 + 1 = 63\n- 63 × 2 + 1 = 127\n\nHence, the next term is 127.",
    hi: "श्रृंखला में पैटर्न इस प्रकार है:\n- 3 × 2 + 1 = 7\n- 7 × 2 + 1 = 15\n- 15 × 2 + 1 = 31\n- 31 × 2 + 1 = 63\n- 63 × 2 + 1 = 127\n\nइसलिए, अगला पद 127 है।"
  },
  q_e1: {
    en: "OBSTINATE means stubborn and refusing to change one's opinion. The antonym is Flexible, which means ready and able to change so as to adapt to different circumstances.\n- Stubborn: synonym\n- Rigid: synonym\n- Dogmatic: synonym",
    hi: "OBSTINATE का अर्थ हठी या अड़ियल होता है। इसका विलोम शब्द Flexible (लचीला) है, जिसका अर्थ परिस्थितियों के अनुसार ढलने वाला होता है।\n- Stubborn (अड़ियल): पर्यायवाची\n- Rigid (कठोर): पर्यायवाची\n- Dogmatic (कट्टर): पर्यायवाची"
  },
  q_m1: {
    en: "Using the algebraic identity a² - b² = (a - b)(a + b):\n\nLet a = 0.43 and b = 0.17.\nExpression: (a² - b²) / (a - b) = (a - b)(a + b) / (a - b) = a + b\n\nValue = 0.43 + 0.17 = 0.60.\n\nHence, the correct answer is 0.60.",
    hi: "बीजगणितीय सूत्र a² - b² = (a - b)(a + b) का उपयोग करने पर:\n\nमाना a = 0.43 और b = 0.17.\nसमीकरण: (a² - b²) / (a - b) = (a - b)(a + b) / (a - b) = a + b\n\nमान = 0.43 + 0.17 = 0.60.\n\nइसलिए, सही उत्तर 0.60 है।"
  },
  q_g1: {
    en: "Wular Lake is the largest freshwater lake in India. It is located in Jammu and Kashmir. It was formed as a result of tectonic activity and is fed by the Jhelum River.",
    hi: "वुलर झील भारत में मीठे पानी की सबसे बड़ी झील है। यह जम्मू और कश्मीर में स्थित है। यह टेक्टोनिक गतिविधि के परिणामस्वरूप बनी थी और इसे झेलम नदी द्वारा पानी मिलता है।"
  },
  q_gen1: {
    en: "The SI unit of electric current is the Ampere (symbol: A). It is named after André-Marie Ampère, one of the main discoverers of electromagnetism.",
    hi: "विद्युत धारा की SI इकाई एम्पीयर (प्रतीक: A) है। इसका नाम विद्युत चुंबकत्व के मुख्य खोजकर्ताओं में से एक आंद्रे-मेरी एम्पीयर के नाम पर रखा गया है।"
  },
  q_gen2: {
    en: "Mars is known as the Red Planet due to the abundance of iron oxide (rust) on its surface, which gives it a reddish, rusty appearance.",
    hi: "मंगल को उसकी सतह पर आयरन ऑक्साइड (जंग) की प्रचुरता के कारण लाल ग्रह के रूप में जाना जाता है, जो इसे लाल रंग का रूप देता है।"
  }
};

export default function ExamSolutionAnalysisPage() {
  const params = useParams();
  const testId = (params?.id as string) || "ssc_cgl_tier1";
  const { currentUser, theme, toggleTheme } = useAuth();
  const router = useRouter();

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
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

  // Load latest completed session for this testId
  // Wait, if no direct testId exists, we can also look for title matches as a fallback.
  const sessionRecord = currentUser.testSessions.find(
    s => s.testId === testId || s.title.toLowerCase().includes(testId.replace(/_/g, ' '))
  );

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
  const examSession = generateExamSession(testId);
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

  const questionStatuses = questions.map((q, idx) => {
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

  const activeQuestion = questions[activeQuestionIdx];
  const activeStatus = questionStatuses[activeQuestionIdx];
  const activeExplanation = EXPLANATIONS[activeQuestion.id] || {
    en: "Detailed solution step-by-step is currently under verification by subject experts.",
    hi: "विषय विशेषज्ञों द्वारा विस्तृत समाधान वर्तमान में सत्यापन के अधीन है।"
  };

  // KPI calculations
  const totalCorrect = questionStatuses.filter(s => s.status === 'correct').length;
  const totalIncorrect = questionStatuses.filter(s => s.status === 'incorrect').length;
  const totalSkipped = questionStatuses.filter(s => s.status === 'skipped').length;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-850 dark:text-slate-100 transition-colors duration-200 select-none pb-12">
      
      {/* 1. NAVIGATION BAR */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950/80 backdrop-blur-md px-6 md:px-12 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/mock-tests" className="flex items-center gap-2 text-slate-650 dark:text-slate-350 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs tracking-wide transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Test Series
          </Link>
          <span className="h-4 w-[1px] bg-slate-250 dark:bg-slate-800"></span>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">{examSession.testTitle}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Solution & Analysis Dashboard</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Lang Selector */}
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as 'en' | 'hi')}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 outline-none text-xs text-slate-805 dark:text-slate-150 cursor-pointer font-bold transition-colors"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>

          {/* Theme switcher */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-850"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* 2. STATS OVERVIEW CARDS */}
      <section className="max-w-6xl w-full mx-auto px-6 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm">
          
          <div className="flex items-center gap-3 border-r border-slate-150 dark:border-slate-850/80 pr-4 last:border-0">
            <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Score Obtained</p>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                {sessionRecord.score} <span className="text-xs text-slate-500 font-bold font-sans">/ {sessionRecord.maxScore}</span>
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-3 md:border-r border-slate-150 dark:border-slate-850/80 pr-4 last:border-0">
            <div className="bg-green-500/10 p-2.5 rounded-xl text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Accuracy Ratio</p>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{sessionRecord.accuracy}%</h4>
            </div>
          </div>

          <div className="flex items-center gap-3 border-r border-slate-150 dark:border-slate-850/80 pr-4 last:border-0">
            <div className="bg-purple-500/10 p-2.5 rounded-xl text-purple-600 dark:text-purple-400">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Time Spent</p>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{formatDuration(sessionRecord.durationSeconds)}</h4>
            </div>
          </div>

          <div className="flex items-center gap-3 last:border-0">
            <div className="bg-red-500/10 p-2.5 rounded-xl text-red-650 dark:text-red-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Cheat Violations</p>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{sessionRecord.violations}</h4>
            </div>
          </div>

        </div>
      </section>

      {/* 3. SPLIT WORKSPACE - QUESTION DETAIL & PALETTE */}
      <section className="max-w-6xl w-full mx-auto px-6 mt-6 flex flex-col lg:flex-row gap-8 items-start">
        
        {/* LEFT WORKSPACE PANEL: QUESTION VIEW */}
        <main className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm min-h-[480px] flex flex-col justify-between w-full">
          
          <div>
            {/* Question Header Status */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850/60 pb-4 mb-5">
              <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                Question {activeQuestionIdx + 1}
              </span>
              
              <div className="flex items-center gap-2">
                {activeStatus.status === 'correct' && (
                  <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900 px-2 py-0.5 rounded text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">
                    <CheckCircle2 className="h-3 w-3" /> Correct
                  </span>
                )}
                {activeStatus.status === 'incorrect' && (
                  <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900 px-2 py-0.5 rounded text-[10px] font-bold text-red-650 dark:text-red-400 uppercase">
                    <XCircle className="h-3 w-3" /> Incorrect
                  </span>
                )}
                {activeStatus.status === 'skipped' && (
                  <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    <HelpCircle className="h-3 w-3" /> Skipped
                  </span>
                )}
              </div>
            </div>

            {/* Question Box */}
            <div className="mb-6 space-y-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                {activeQuestion.content[lang]?.questionText || activeQuestion.content['en']?.questionText}
              </p>

              {activeQuestion.content[lang]?.mathLatex && (
                <div className="bg-slate-100 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800/80 font-mono text-xs text-blue-600 dark:text-blue-400">
                  Latex: {activeQuestion.content[lang].mathLatex}
                </div>
              )}
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {((activeQuestion.content[lang]?.options || activeQuestion.content['en']?.options) as any[]).map((opt, optIdx: number) => {
                const optLabel = typeof opt === 'string' ? opt : opt.text;
                const isCorrectIndex = optIdx === activeQuestion.correctOptionIndex;
                const isUserSelectedIndex = optIdx === activeStatus.userSelectedOptionIndex;
                
                let optionStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-200';
                
                if (isCorrectIndex) {
                  optionStyle = 'border-green-500 bg-green-50/40 dark:border-green-800 dark:bg-green-950/20 text-slate-900 dark:text-green-300';
                } else if (isUserSelectedIndex && !isCorrectIndex) {
                  optionStyle = 'border-red-500 bg-red-50/40 dark:border-red-800 dark:bg-red-950/20 text-slate-900 dark:text-red-300';
                }

                return (
                  <div
                    key={optIdx}
                    className={`border rounded-xl p-3.5 flex items-center justify-between text-xs transition ${optionStyle}`}
                  >
                    <span className="flex items-center gap-3 font-semibold">
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        isCorrectIndex
                          ? 'bg-green-600 text-white'
                          : isUserSelectedIndex
                          ? 'bg-red-650 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{optLabel}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {isUserSelectedIndex && (
                        <span className="text-[9px] uppercase font-black bg-blue-900 border border-blue-800 text-blue-400 px-2 py-0.5 rounded shadow">
                          Your Choice
                        </span>
                      )}
                      {isCorrectIndex && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {isUserSelectedIndex && !isCorrectIndex && (
                        <XCircle className="h-4 w-4 text-red-655" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation card */}
            <div className="mt-8 bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl">
              <h5 className="font-extrabold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-250 dark:border-slate-850 pb-2 mb-3.5 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-blue-500" /> Detailed Explanation & Concept
              </h5>
              <div className="text-xs text-slate-750 dark:text-slate-350 whitespace-pre-line leading-relaxed font-semibold">
                {activeExplanation[lang] || activeExplanation['en']}
              </div>
            </div>

          </div>

          {/* Navigation CTAs */}
          <div className="flex justify-between items-center border-t border-slate-150 dark:border-slate-850 pt-5 mt-8">
            <button
              onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
              disabled={activeQuestionIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-800 dark:text-white"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            
            <span className="text-xs font-bold text-slate-500">
              {activeQuestionIdx + 1} of {totalQs}
            </span>

            <button
              onClick={() => setActiveQuestionIdx(prev => Math.min(totalQs - 1, prev + 1))}
              disabled={activeQuestionIdx === totalQs - 1}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-800 dark:text-white"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>

        </main>

        {/* RIGHT WORKSPACE SIDEBAR: QUESTION PALETTE */}
        <aside className="w-full lg:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm">
          
          <h4 className="font-extrabold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-850/60 pb-2">
            Question Palette
          </h4>

          {/* Color Code Legend */}
          <div className="grid grid-cols-3 gap-2 mb-6 text-[9px] font-bold text-slate-650 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
              <span>Correct ({totalCorrect})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-650"></span>
              <span>Incorrect ({totalIncorrect})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-slate-400 dark:bg-slate-600"></span>
              <span>Skipped ({totalSkipped})</span>
            </div>
          </div>

          {/* Palette grid list */}
          <div className="grid grid-cols-5 gap-3.5">
            {questionStatuses.map((stat, idx) => {
              const isActive = idx === activeQuestionIdx;
              
              let statusBg = 'bg-slate-100 text-slate-550 hover:bg-slate-205 dark:bg-slate-800 dark:text-slate-400';
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

          <div className="border-t border-slate-150 dark:border-slate-850 mt-6 pt-5">
            <Link
              href="/mock-tests"
              className="block w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95"
            >
              Analyze More Exams
            </Link>
          </div>

        </aside>

      </section>

    </div>
  );
}
