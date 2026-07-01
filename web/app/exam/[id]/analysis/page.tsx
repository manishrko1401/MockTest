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
  Bookmark
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
  const t = TRANSLATIONS[lang];

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
      setSelectedAttemptIdx(attempts.length - 1);
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

  const activeQuestion = questions[activeQuestionIdx];
  const activeStatus = questionStatuses[activeQuestionIdx];

  // Calculate question time statistics and bookmark state
  const userTime = sessionRecord.responses?.[activeQuestion.id]?.elapsedSeconds ?? (15 + (seed + activeQuestionIdx) % 75);
  const avgTime = 30 + (activeQuestion.id.charCodeAt(activeQuestion.id.length - 1) % 5) * 15;
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
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-200 select-none pb-12">
      
      {/* 1. NAVIGATION BAR */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 backdrop-blur-md px-6 md:px-12 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/mock-tests" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs tracking-wide transition-colors">
            <ArrowLeft className="h-4 w-4" /> {language === 'hi' ? 'टेस्ट सीरीज पर वापस जाएं' : 'Back to Test Series'}
          </Link>
          <span className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800"></span>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">{examSession.testTitle}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{language === 'hi' ? 'समाधान और विश्लेषण डैशबोर्ड' : 'Solution & Analysis Dashboard'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Lang Selector */}
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value as 'en' | 'hi')}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 outline-none text-xs text-slate-800 dark:text-slate-200 cursor-pointer font-bold transition-colors"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>

          {/* Theme switcher */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800"
            title={theme === 'light' ? t.themeDark : t.themeLight}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* 2. STATS OVERVIEW CARDS */}
      <section className="max-w-6xl w-full mx-auto px-6 mt-8">
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
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{formatDuration(sessionRecord.durationSeconds)}</h4>
            </div>
          </div>

          <div className="flex items-center gap-3 last:border-0">
            <div className="bg-red-500/10 p-2.5 rounded-xl text-red-600 dark:text-red-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{t.analysisViolations}</p>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{sessionRecord.violations}</h4>
            </div>
          </div>

        </div>
      </section>

      {/* Testbook Equivalent Benchmarking Card */}
      {sessionRecord.testbookRank && sessionRecord.mockTest && (
        <section className="max-w-6xl w-full mx-auto px-6 mt-6">
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
                    className="absolute h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                    style={{
                      left: `${Math.max(0, Math.min(100, (sessionRecord.mockTest.testbookAverageScore / sessionRecord.maxScore) * 100))}%`,
                      right: `${Math.max(0, Math.min(100, 100 - (sessionRecord.mockTest.testbookTopperScore / sessionRecord.maxScore) * 100))}%`
                    }}
                  />
                  
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
        <section className="max-w-6xl w-full mx-auto px-6 mt-6">
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
                    {t.analysisAttempt} {idx + 1} ({att.date})
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
                      <span>{t.analysisAttempt} {idx + 1} {isCurrent && (language === 'hi' ? '(अवलोकन)' : '(Viewing)')}</span>
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

      {/* 3. SPLIT WORKSPACE - QUESTION DETAIL & PALETTE */}
      <section className="max-w-6xl w-full mx-auto px-6 mt-6 flex flex-col lg:flex-row gap-8 items-start">
        
        {/* LEFT WORKSPACE PANEL: QUESTION VIEW */}
        <main className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm min-h-[480px] flex flex-col justify-between w-full">
          
          <div>
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
                    {language === 'hi' ? 'आपका समय: ' : 'Your Time: '}<strong className="text-slate-800 dark:text-white font-bold">{userTime}s</strong>
                  </span>
                  <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                    {language === 'hi' ? 'औसत समय: ' : 'Avg Time: '}<strong className="text-slate-800 dark:text-white font-bold">{avgTime}s</strong>
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

            {/* Question Box */}
            <div className="mb-6 space-y-4">
              <MathJaxText
                component="div"
                className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed markup-content"
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
            <div className="space-y-3">
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
                    className={`border rounded-xl p-3.5 flex items-center justify-between text-xs transition ${optionStyle}`}
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

          {/* Navigation CTAs */}
          <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-5 mt-8">
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
        <aside className="w-full lg:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          
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

        </aside>

      </section>

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

    </div>
  );
}
