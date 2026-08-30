"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../AuthContext';
import { TRANSLATIONS } from '../../translations';
import {
  Info,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Printer,
  ArrowLeft,
  X,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Keyboard,
  BookOpen
} from 'lucide-react';
import {
  TypingTest,
  TypingAttempt,
  DetailedMistake,
  AlignedWord,
  evaluateTyping,
  isSscExam,
  isSscCglExam,
  isSscChslExam
} from '../../lib/typingTypes';

type ExamPhase = 'DEMO' | 'BREAK' | 'MAIN' | 'RESULT';

export default function TCSiONTypingTerminalPage() {
  const { testId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode = searchParams.get('view') || searchParams.get('mode');
  const isAnalysisMode = viewMode === 'analysis';
  const { currentUser, language } = useAuth();
  const t = TRANSLATIONS[language];
  const isHindi = language === 'hi';

  const [test, setTest] = useState<TypingTest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Phase State
  const [phase, setPhase] = useState<ExamPhase>('DEMO');

  // Timers (in seconds)
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [totalPhaseSeconds, setTotalPhaseSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [mainTimeSpentSeconds, setMainTimeSpentSeconds] = useState<number>(0);

  // Typing Inputs
  const [demoTypedText, setDemoTypedText] = useState<string>('');
  const [mainTypedText, setMainTypedText] = useState<string>('');
  const [backspaceCount, setBackspaceCount] = useState<number>(0);
  const [demoBackspaceCount, setDemoBackspaceCount] = useState<number>(0);

  // Text Size State for Passage & Typing Area (Default 22px, Max 30px)
  const [textSize, setTextSize] = useState<number>(22);

  const handleIncreaseTextSize = () => {
    setTextSize(prev => Math.min(prev + 2, 30));
  };

  const handleDecreaseTextSize = () => {
    setTextSize(prev => Math.max(prev - 2, 14));
  };

  const handleResetTextSize = () => {
    setTextSize(22);
  };

  // Modals
  const [showInstructionsModal, setShowInstructionsModal] = useState<boolean>(false);
  const [summaryModal, setSummaryModal] = useState<{
    isOpen: boolean;
    phase: 'DEMO' | 'MAIN';
    keystrokes: number;
    backspaces: number;
  } | null>(null);

  // Evaluation Result State
  const [result, setResult] = useState<ReturnType<typeof evaluateTyping> | null>(null);

  const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);
  // Selected Category for SSC CGL Tier-2 DEST Result (UR: 20%, OBC/EWS: 25%, SC/ST/Others: 30%)
  const [selectedCategory, setSelectedCategory] = useState<'UR' | 'OBC/EWS' | 'SC/ST/Others'>('UR');
  // Selected Category for SSC CHSL Result (UR & EWS: 7%, OBC/SC/ST/PwBD/ESM: 10%)
  const [selectedChslCategory, setSelectedChslCategory] = useState<'UR/EWS' | 'OBC/SC/ST/PwBD/ESM'>('UR/EWS');

  // Refs
  const typingInputRef = useRef<HTMLTextAreaElement | null>(null);
  const passageBoxRef = useRef<HTMLDivElement | null>(null);
  // Accurate timing refs — updated synchronously, never stale
  const phaseRef = useRef<ExamPhase>('DEMO');
  const timeRemainingRef = useRef<number>(60);
  const totalPhaseSecondsRef = useRef<number>(60);

  // Helper to load user attempt directly into Analysis phase
  const loadAttemptForAnalysis = async (currentTest: TypingTest) => {
    let attempt: any = null;
    // 1. Check local storage
    if (typeof window !== 'undefined') {
      try {
        const localRaw = localStorage.getItem(`typing_attempt_${currentTest.id}`);
        if (localRaw) {
          attempt = JSON.parse(localRaw);
        }
      } catch (e) {}
    }

    // 2. Fetch latest attempt from server
    try {
      const attRes = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-user-typing-attempts',
          data: { userId: currentUser?.id, testId: currentTest.id }
        })
      });
      const attData = await attRes.json();
      if (attData.success && Array.isArray(attData.attempts) && attData.attempts.length > 0) {
        const matches = attData.attempts.filter((a: any) => a.testId === currentTest.id);
        if (matches.length > 0) {
          attempt = matches[0];
        }
      }
    } catch (e) {
      console.error('Error loading attempt from server:', e);
    }

    if (attempt) {
      const isSsc = isSscExam(currentTest);
      const isSscCgl = isSscCglExam(currentTest);
      const isSscChsl = isSscChslExam(currentTest);
      const typed = attempt.typedText || '';
      const timeSpent = Math.max(attempt.timeSpentSeconds || Math.round(currentTest.mainDurationMinutes * 60), 1);
      const bCount = attempt.backspaceCount || 0;
      const chslTarget = currentTest.language === 'hi' ? 30 : 35;

      const evalResult = evaluateTyping(
        currentTest.passageText,
        typed,
        timeSpent,
        bCount,
        isSscChsl ? chslTarget : (currentTest.qualifyingWpm || 35),
        currentTest.maxErrorPercentage || 5.0,
        Boolean(currentTest.allowRetype),
        isSsc,
        isSscCgl,
        isSscChsl
      );

      setResult(evalResult);
      setMainTypedText(typed);
      setBackspaceCount(bCount);
      setMainTimeSpentSeconds(timeSpent);
      setIsTimerRunning(false);
      setPhase('RESULT');
    } else {
      initDemoPhase(currentTest);
    }
  };

  // 1. Fetch Test data
  useEffect(() => {
    const loadTest = async () => {
      try {
        setIsLoading(true);
        if (testId === 'custom') {
          const stored = sessionStorage.getItem('custom_typing_test');
          if (stored) {
            const parsed = JSON.parse(stored);
            setTest(parsed);
            initDemoPhase(parsed);
            return;
          }
        }

        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-typing-test-by-id', data: { id: testId } })
        });
        const data = await res.json();
        if (data.success && data.test) {
          const currentTest = data.test;
          setTest(currentTest);
          if (isAnalysisMode) {
            await loadAttemptForAnalysis(currentTest);
          } else {
            initDemoPhase(currentTest);
          }
        } else {
          router.push('/typing-test');
        }
      } catch (err) {
        console.error('Error fetching test:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTest();
  }, [testId, isAnalysisMode]);

  // Phase Initializers
  const initDemoPhase = (currentTest: TypingTest) => {
    if (typeof window !== 'undefined' && window.location.search.includes('analysis')) {
      router.replace(`/typing-test/${currentTest.id}`);
    }
    setPhase('DEMO');
    const demoSec = Math.max(Math.round((currentTest.demoDurationMinutes || 1) * 60), 10);
    setTimeRemaining(demoSec);
    setTotalPhaseSeconds(demoSec);
    setIsTimerRunning(true);
    setDemoTypedText('');
    setDemoBackspaceCount(0);
    setTimeout(() => typingInputRef.current?.focus(), 200);
  };

  const initBreakPhase = () => {
    if (!test) return;
    setPhase('BREAK');
    phaseRef.current = 'BREAK'; // ← fix: must update ref so timer fires handleFinishBreak()
    const breakSec = Math.max(Math.round((test.breakDurationMinutes || 1) * 60), 10);
    setTimeRemaining(breakSec);
    timeRemainingRef.current = breakSec;
    setTotalPhaseSeconds(breakSec);
    setIsTimerRunning(true);
  };

  const initMainPhase = () => {
    if (!test) return;
    setPhase('MAIN');
    phaseRef.current = 'MAIN';
    const mainSec = Math.max(Math.round((test.mainDurationMinutes || 10) * 60), 30);
    setTimeRemaining(mainSec);
    timeRemainingRef.current = mainSec;
    setTotalPhaseSeconds(mainSec);
    totalPhaseSecondsRef.current = mainSec;
    setIsTimerRunning(true);
    setMainTypedText('');
    setBackspaceCount(0);
    setMainTimeSpentSeconds(0);
    setTimeout(() => typingInputRef.current?.focus(), 200);
  };

  // Phase Transitions
  const handleFinishDemo = () => {
    setIsTimerRunning(false);
    setSummaryModal({
      isOpen: true,
      phase: 'DEMO',
      keystrokes: demoTypedText.length,
      backspaces: demoBackspaceCount
    });
  };

  const handleFinishBreak = () => {
    setIsTimerRunning(false);
    initMainPhase();
  };

  const handleFinishMainTest = () => {
    if (!test) return;
    setIsTimerRunning(false);
    // Snapshot the accurate elapsed time at the moment of submission
    const elapsed = Math.max(totalPhaseSecondsRef.current - timeRemainingRef.current, 1);
    setMainTimeSpentSeconds(elapsed);
    setSummaryModal({
      isOpen: true,
      phase: 'MAIN',
      keystrokes: mainTypedText.length,
      backspaces: backspaceCount
    });
  };

  const handleConfirmSummaryOk = () => {
    if (!summaryModal) return;
    const currentPhase = summaryModal.phase;
    setSummaryModal(null);

    if (currentPhase === 'DEMO') {
      initBreakPhase();
    } else if (currentPhase === 'MAIN') {
      if (!test) return;
      // Use the accurately snapshotted time (set when submit/time-out fired)
      // mainTimeSpentSeconds was set by handleFinishMainTest using refs — always accurate
      const timeSpent = Math.max(mainTimeSpentSeconds, 1);
      const isSsc = isSscExam(test);
      const isSscCgl = isSscCglExam(test);
      const isSscChsl = isSscChslExam(test);
      const chslTarget = test.language === 'hi' ? 30 : 35;

      const evalResult = evaluateTyping(
        test.passageText,
        mainTypedText,
        timeSpent,
        backspaceCount,
        isSscChsl ? chslTarget : (test.qualifyingWpm || 35),
        test.maxErrorPercentage || 5.0,
        Boolean(test.allowRetype),
        isSsc,
        isSscCgl,
        isSscChsl
      );

      setResult(evalResult);
      setPhase('RESULT');

      // Save attempt
      saveUserAttempt(evalResult, timeSpent);
    }
  };

  // Save attempt API
  const saveUserAttempt = async (evalRes: any, timeSpent: number) => {
    if (!test) return;
    try {
      const attemptData: Partial<TypingAttempt> = {
        userId: currentUser?.id || 'guest',
        userName: currentUser?.name || (currentUser as any)?.fullName || 'my user',
        testId: test.id,
        testTitle: test.title,
        grossWpm: evalRes.grossWpm,
        netWpm: evalRes.netWpm,
        accuracyPercentage: evalRes.accuracyPercentage,
        totalKeystrokes: evalRes.totalKeystrokes,
        correctKeystrokes: evalRes.correctKeystrokes,
        errorKeystrokes: evalRes.errorKeystrokes,
        fullMistakes: evalRes.fullMistakes,
        halfMistakes: evalRes.halfMistakes,
        totalMistakes: evalRes.totalMistakes,
        errorPercentage: evalRes.errorPercentage,
        backspaceCount: backspaceCount,
        timeSpentSeconds: timeSpent,
        allocatedTimeSeconds: totalPhaseSeconds,
        isQualified: evalRes.isQualified,
        language: test.language,
        typedText: mainTypedText,
        targetText: test.passageText,
        allowRetype: test.allowRetype,
        retypeCycles: evalRes.cyclesCompleted,
        detailedMistakes: evalRes.detailedMistakes
      };

      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-typing-attempt', data: attemptData })
      });
      const data = await res.json();
      if (data.success && data.attempt) {
        setSavedAttemptId(data.attempt.id);
      }
      if (typeof window !== 'undefined') {
        try {
          const finalAtt = data?.attempt || attemptData;
          localStorage.setItem(`typing_attempt_${test.id}`, JSON.stringify(finalAtt));
          const allKey = 'all_typing_attempts';
          const existing = JSON.parse(localStorage.getItem(allKey) || '[]');
          existing.unshift(finalAtt);
          localStorage.setItem(allKey, JSON.stringify(existing.slice(0, 100)));
        } catch (e) {}
      }
    } catch (e) {
      console.error('Failed to save typing attempt:', e);
    }
  };

  const isBackspaceEnabled = test?.enableBackspace !== false && test?.backspaceRule !== 'DISABLED';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Backspace/Delete is disabled by admin, block corrections
    if (!isBackspaceEnabled) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'Backspace') {
      if (phase === 'DEMO') {
        setDemoBackspaceCount(prev => prev + 1);
      } else {
        setBackspaceCount(prev => prev + 1);
      }
    }
  };

  // Countdown Timer — ONLY decrements time, never calls handlers inside setState
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 1;
        timeRemainingRef.current = next;
        return Math.max(next, 0);
      });
    }, 1000);

    return () => clearInterval(interval);
    // Only restart when isTimerRunning toggles — not on every keystroke
  }, [isTimerRunning]);

  // Phase Completion — fires when timer hits 0, separated to avoid calling
  // handlers inside a setState updater (React anti-pattern causing immediate finish)
  useEffect(() => {
    if (!isTimerRunning || timeRemaining > 0) return;

    const currentPhase = phaseRef.current;
    if (currentPhase === 'DEMO') {
      handleFinishDemo();
    } else if (currentPhase === 'BREAK') {
      handleFinishBreak();
    } else if (currentPhase === 'MAIN') {
      handleFinishMainTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  // Format Time in HH:MM:SS (exact TCS iON format)
  const formatTcsTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Current passage text based on phase
  const currentPassageText = useMemo(() => {
    if (phase === 'DEMO') {
      return test?.demoPassageText || 'This is a demo typing test passage to check your keyboard.';
    }
    return test?.passageText || '';
  }, [phase, test]);

  // Current typed text based on phase
  const currentTypedText = phase === 'DEMO' ? demoTypedText : mainTypedText;

  // Words and cycle calculations for Retype feature
  const passageWordList = useMemo(() => {
    const txt = phase === 'DEMO' ? (test?.demoPassageText || '') : (test?.passageText || '');
    return txt.trim().length > 0 ? txt.trim().split(/\s+/) : [];
  }, [phase, test]);

  const currentTypedWordList = useMemo(() => {
    return currentTypedText.trim().length > 0 ? currentTypedText.trim().split(/\s+/) : [];
  }, [currentTypedText]);

  const passageWordCount = passageWordList.length;
  const typedWordCount = currentTypedWordList.length;

  const currentCycle = useMemo(() => {
    if (passageWordCount === 0 || phase !== 'MAIN') return 1;
    return Math.floor(typedWordCount / passageWordCount) + 1;
  }, [passageWordCount, typedWordCount, phase]);

  const prevCycleRef = useRef<number>(1);
  useEffect(() => {
    if (phase === 'MAIN' && test?.allowRetype) {
      if (currentCycle > prevCycleRef.current) {
        passageBoxRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
      prevCycleRef.current = currentCycle;
    }
  }, [currentCycle, phase, test?.allowRetype]);

  // Disable mouse scroll wheel in terminal (candidate can only scroll using scroll bar)
  useEffect(() => {
    if (phase !== 'DEMO' && phase !== 'MAIN') return;

    const preventMouseWheel = (e: WheelEvent) => {
      // Allow scrolling inside modal if instructions or dialog is open
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('.allow-mouse-scroll')) {
        return;
      }
      e.preventDefault();
    };

    const passageEl = passageBoxRef.current;
    const typingEl = typingInputRef.current;

    // Attach non-passive wheel listeners to target elements and window
    passageEl?.addEventListener('wheel', preventMouseWheel, { passive: false });
    typingEl?.addEventListener('wheel', preventMouseWheel, { passive: false });
    window.addEventListener('wheel', preventMouseWheel, { passive: false });

    return () => {
      passageEl?.removeEventListener('wheel', preventMouseWheel);
      typingEl?.removeEventListener('wheel', preventMouseWheel);
      window.removeEventListener('wheel', preventMouseWheel);
    };
  }, [phase]);

  // Test Code for top bar
  const testDisplayCode = useMemo(() => {
    if (!test) return 'TYP-TEST-2026';
    if (test.title.includes('CHSL')) return 'CHSL24-ENG-TYP12-TEST17';
    if (test.title.includes('CGL')) return 'CGL24-ENG-DEST-TEST01';
    if (test.title.includes('RRB')) return 'RRB24-NTPC-TYP-TEST04';
    return (test.id || 'TYP-EXAM-TEST').toUpperCase();
  }, [test]);

  if (isLoading || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f3f6] text-slate-700 font-sans">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-[#337ab7] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading Examination Terminal...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RESULT SCREEN (PHASE 4)
  // ----------------------------------------------------
  if (phase === 'RESULT' && result) {
    const isSsc = isSscExam(test);
    const isSscCgl = isSscCglExam(test);
    const isSscChsl = isSscChslExam(test);
    const categoryMaxError = selectedCategory === 'UR' ? 20 : selectedCategory === 'OBC/EWS' ? 25 : 30;
    const chslMaxError = selectedChslCategory === 'UR/EWS' ? 7 : 10;
    const isCglCategoryPassed = result.errorPercentage <= categoryMaxError;

    // SSC CHSL: Net Word = Gross Words Typed - Total Mistakes
    // Net Speed = Net Word / Total Time
    const chslNetWords = result.chslNetWords !== undefined
      ? result.chslNetWords
      : parseFloat(Math.max(0, result.totalWordsTyped - result.totalMistakes).toFixed(2));
    const chslNetWpm = result.chslNetWpm !== undefined
      ? result.chslNetWpm
      : (result.timeInMinutes > 0 ? parseFloat((chslNetWords / result.timeInMinutes).toFixed(2)) : 0);

    const isHindiTest = test.language === 'hi' || (test.title || '').toLowerCase().includes('hindi');
    const chslRequiredSpeed = isHindiTest ? 30 : 35;
    const isChslSpeedPassed = chslNetWpm >= chslRequiredSpeed;
    const isChslErrorPassed = result.errorPercentage <= chslMaxError;
    // SSC CHSL requirement: candidate fails if net speed < 35 (English) or < 30 (Hindi), OR if error% > allowed limit
    const isChslCategoryPassed = isChslSpeedPassed && isChslErrorPassed;
    const isCategoryPassed = isSscCgl ? isCglCategoryPassed : isSscChsl ? isChslCategoryPassed : result.isQualified;

    return (
      <div className="min-h-screen bg-[#f4f6f9] text-slate-800 p-3 sm:p-5 lg:p-7 flex flex-col items-center font-sans">
        <div className="w-full max-w-5xl space-y-4">

          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <Link
              href={test.categoryId ? `/typing-test/category/${test.categoryId}` : '/typing-test'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {isHindi ? 'सभी टाइपिंग टेस्ट्स' : 'Back to Typing Tests'}
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                {isHindi ? 'प्रिंट रिपोर्ट' : 'Print / Save PDF'}
              </button>
              <button
                onClick={() => initDemoPhase(test)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#337ab7] hover:bg-[#286090] text-white text-xs font-bold shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isHindi ? 'पुनः टेस्ट दें' : 'Retake Exam'}
              </button>
            </div>
          </div>

          {/* Main Analysis Card */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">

            {/* Card Header */}
            <div className="bg-[#286090] px-5 py-3 flex items-center justify-between">
              <h1 className="text-white font-bold text-base">Analysis</h1>
              <span className="text-white/70 text-xs">{test.title}</span>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Test Title */}
              <p className="font-bold text-lg text-slate-800">{test.title}</p>

              {/* Section: Typing Test Result */}
              <div>
                {/* Horizontal line with Title, Badge, and Right-side Category Dropdowns */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-[#286090]">
                      {isSsc ? (isSscCgl ? 'SSC CGL (Tier-2 DEST) Result' : isSscChsl ? 'SSC CHSL (DEO / LDC) Result' : 'SSC Typing Skill Test Result') : 'Typing Test Result'}
                    </h2>
                    {isSsc && (
                      <span className="text-[11px] bg-blue-100 text-[#1E3CAF] font-bold px-2 py-0.5 rounded border border-blue-200">
                        {isSscChsl ? 'Evaluated on Net Speed & Error % Basis' : 'Evaluated on Error % Basis'}
                      </span>
                    )}
                  </div>

                  {/* Category Dropdown for SSC CGL Tier-2 DEST */}
                  {isSscCgl && (
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-blue-200 px-2.5 py-1 rounded-md shadow-2xs">
                      <label htmlFor="ssc-cgl-category-select" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        Category:
                      </label>
                      <select
                        id="ssc-cgl-category-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as 'UR' | 'OBC/EWS' | 'SC/ST/Others')}
                        className="text-xs font-extrabold text-[#1E3CAF] bg-white border border-blue-300 rounded px-2.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="UR">UR (20%)</option>
                        <option value="OBC/EWS">OBC/EWS (25%)</option>
                        <option value="SC/ST/Others">SC/ST/Others (30%)</option>
                      </select>
                    </div>
                  )}

                  {/* Category Dropdown for SSC CHSL (DEO / LDC) */}
                  {isSscChsl && (
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-blue-200 px-2.5 py-1 rounded-md shadow-2xs">
                      <label htmlFor="ssc-chsl-category-select" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        Category:
                      </label>
                      <select
                        id="ssc-chsl-category-select"
                        value={selectedChslCategory}
                        onChange={(e) => setSelectedChslCategory(e.target.value as 'UR/EWS' | 'OBC/SC/ST/PwBD/ESM')}
                        className="text-xs font-extrabold text-[#1E3CAF] bg-white border border-blue-300 rounded px-2.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="UR/EWS">UR & EWS (Max 7%)</option>
                        <option value="OBC/SC/ST/PwBD/ESM">OBC, SC, ST, PwBD, ESM (Max 10%)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Result / Error % (or Net Speed) / Accuracy Row */}
                <div className="flex flex-col sm:flex-row gap-0 rounded-md overflow-hidden border border-slate-200 mb-4">
                  {/* Result Box */}
                  <div className="flex-1 bg-[#fff6c5] px-4 py-3 border-b sm:border-b-0 sm:border-r border-slate-200">
                    <div className="text-xs font-bold text-slate-600 mb-1">
                      {isSscCgl ? `Result (${selectedCategory}):` : isSscChsl ? `Result (${selectedChslCategory === 'UR/EWS' ? 'UR/EWS' : 'Reserved'}):` : 'Result:'}
                    </div>
                    {isSscCgl ? (
                      <div>
                        <div className={`text-xl font-black ${isCategoryPassed ? 'text-green-700' : 'text-red-600'}`}>
                          {isCategoryPassed ? 'Pass ✅' : 'Fail ❌'}
                        </div>
                        <span className={`text-[10px] font-bold ${isCategoryPassed ? 'text-emerald-800' : 'text-red-700'}`}>
                          {isCategoryPassed
                            ? `${result.errorPercentage.toFixed(2)}% \u2264 ${categoryMaxError}% Allowed`
                            : `${result.errorPercentage.toFixed(2)}% > ${categoryMaxError}% Allowed`}
                        </span>
                      </div>
                    ) : isSscChsl ? (
                      <div>
                        <div className={`text-xl font-black ${isChslCategoryPassed ? 'text-green-700' : 'text-red-600'}`}>
                          {isChslCategoryPassed ? 'Pass ✅' : 'Fail ❌'}
                        </div>
                      </div>
                    ) : (
                      <div className={`text-xl font-black ${result.isQualified ? 'text-green-700' : 'text-red-600'}`}>
                        {result.isQualified ? 'Pass ✅' : 'Fail ❌'}
                      </div>
                    )}
                  </div>

                  {/* For SSC CHSL: SHOW NET SPEED BEFORE ERROR PERCENTAGE! */}
                  {isSscChsl ? (
                    <>
                      <div className="flex-1 bg-[#fff6c5] px-4 py-3 border-b sm:border-b-0 sm:border-r border-slate-200">
                        <div className="text-xs font-bold text-slate-600 mb-1">Net Speed:</div>
                        <div className={`text-xl font-black ${isChslSpeedPassed ? 'text-emerald-700' : 'text-red-600'}`}>
                          {chslNetWpm.toFixed(2)} <span className="text-xs font-semibold text-slate-600">WPM</span>
                        </div>
                      </div>
                      <div className="flex-1 bg-[#fff6c5] px-4 py-3 border-b sm:border-b-0 sm:border-r border-slate-200">
                        <div className="text-xs font-bold text-slate-600 mb-1">Error Percentage:</div>
                        <div className={`text-xl font-black ${isChslErrorPassed ? 'text-emerald-700' : 'text-red-600'}`}>
                          {result.errorPercentage.toFixed(2)} <span className="text-xs font-semibold text-slate-600">%</span>
                        </div>
                      </div>
                    </>
                  ) : isSsc ? (
                    <div className="flex-1 bg-[#fff6c5] px-4 py-3 border-b sm:border-b-0 sm:border-r border-slate-200">
                      <div className="text-xs font-bold text-slate-600 mb-1">Error Percentage:</div>
                      <div className={`text-xl font-black ${isCategoryPassed ? 'text-emerald-700' : 'text-red-600'}`}>
                        {result.errorPercentage.toFixed(2)} <span className="text-xs font-semibold text-slate-600">%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 bg-[#fff6c5] px-4 py-3 border-b sm:border-b-0 sm:border-r border-slate-200">
                      <div className="text-xs font-bold text-slate-600 mb-1">Net Speed:</div>
                      <div className="text-xl font-black text-emerald-700">
                        {result.netWpm.toFixed(2)} <span className="text-xs font-semibold text-slate-600">WPM</span>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 bg-[#fff6c5] px-4 py-3">
                    <div className="text-xs font-bold text-slate-600 mb-1">Accuracy:</div>
                    <div className="text-xl font-black text-[#286090]">{result.accuracyPercentage.toFixed(2)} %</div>
                  </div>
                </div>

                {/* 7/8/9-Stat Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                  {(isSscChsl ? [
                    { label: 'Gross Typing Speed (WPM)', value: result.grossWpm },
                    { label: 'Net Typing Speed (WPM)', value: `${chslNetWpm.toFixed(2)} WPM` },
                    { label: 'Net Words Typed (Gross − Mistakes)', value: chslNetWords.toFixed(1) },
                    { label: 'Error Percentage', value: `${result.errorPercentage.toFixed(2)}%` },
                    { label: 'Time in Minutes', value: result.timeInMinutes.toFixed(2) },
                    { label: 'Master Passage Words (KS÷5)', value: result.totalWordsInMasterPassage },
                    { label: 'Total Mistakes', value: result.totalMistakes },
                    { label: 'Total Words Typed (KS÷5)', value: result.totalWordsTyped },
                    { label: 'Typed Keystrokes', value: result.totalKeystrokes },
                    { label: 'Total Given Keystrokes', value: result.totalMasterPassageKeystrokes || test.passageText.length },
                  ] : isSsc ? [
                    { label: 'Gross Typing Speed (WPM)', value: result.grossWpm },
                    { label: 'Error Percentage', value: `${result.errorPercentage.toFixed(2)}%` },
                    { label: 'Time in Minutes', value: result.timeInMinutes.toFixed(2) },
                    { label: 'Master Passage Words (KS÷5)', value: result.totalWordsInMasterPassage },
                    { label: 'Total Mistakes', value: result.totalMistakes },
                    { label: 'Total Words Typed (KS÷5)', value: result.totalWordsTyped },
                    { label: 'Typed Keystrokes', value: result.totalKeystrokes },
                    { label: 'Total Given Keystrokes', value: result.totalMasterPassageKeystrokes || test.passageText.length },
                  ] : [
                    { label: 'Gross Typing Speed (WPM)', value: result.grossWpm },
                    { label: 'Net Typing Speed (WPM)', value: result.netWpm.toFixed(2) },
                    { label: 'Time in Minutes', value: result.timeInMinutes.toFixed(2) },
                    { label: 'Total Words Typed', value: result.totalWordsTyped },
                    { label: 'Net Words', value: result.netWords !== undefined ? result.netWords : Math.max(0, Math.floor(result.netWpm * result.timeInMinutes)) },
                    { label: 'Typed Keystroke', value: result.totalKeystrokes },
                    { label: 'Total Given Key Strokes', value: test.passageText.length },
                  ]).map((item, i) => (
                    <div key={i} className="border border-slate-200 rounded-md p-3 bg-[#f9fafb]">
                      <div className="text-[10px] font-bold text-[#286090] leading-tight mb-1">{item.label}</div>
                      <div className="text-lg font-black text-slate-900">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dedicated Category-Wise Maximum Error Percentage Allowed Card (SSC CGL Tier-2 DEST ONLY) */}
              {isSscCgl && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 sm:p-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm">📋</span>
                      <h3 className="font-bold text-slate-900 text-xs truncate">
                        Category-Wise Maximum Error Percentage Allowed
                      </h3>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-950 border border-amber-300 shrink-0">
                        SSC CGL
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 hidden sm:inline">
                      Click to evaluate
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* UR (Unreserved) */}
                    <div
                      onClick={() => setSelectedCategory('UR')}
                      className={`p-2 rounded-md border transition-all cursor-pointer ${
                        selectedCategory === 'UR'
                          ? 'ring-2 ring-[#286090] border-[#286090] bg-white shadow-2xs'
                          : result.errorPercentage <= 20
                          ? 'bg-white/90 border-emerald-300 hover:border-emerald-400'
                          : 'bg-white/90 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-bold text-xs text-slate-900 truncate">UR (Unreserved)</span>
                          {selectedCategory === 'UR' && (
                            <span className="text-[8px] font-black px-1 py-0.2 rounded bg-blue-100 text-[#1E3CAF] border border-blue-200 uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                          result.errorPercentage <= 20
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {result.errorPercentage <= 20 ? 'Pass ✅' : 'Exceeded ❌'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Max Allowed: <strong className="text-slate-900">20%</strong></span>
                        <span>Your Error: <strong className={result.errorPercentage <= 20 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>{result.errorPercentage.toFixed(2)}%</strong></span>
                      </div>
                    </div>

                    {/* OBC / EWS */}
                    <div
                      onClick={() => setSelectedCategory('OBC/EWS')}
                      className={`p-2 rounded-md border transition-all cursor-pointer ${
                        selectedCategory === 'OBC/EWS'
                          ? 'ring-2 ring-[#286090] border-[#286090] bg-white shadow-2xs'
                          : result.errorPercentage <= 25
                          ? 'bg-white/90 border-emerald-300 hover:border-emerald-400'
                          : 'bg-white/90 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-bold text-xs text-slate-900 truncate">OBC / EWS</span>
                          {selectedCategory === 'OBC/EWS' && (
                            <span className="text-[8px] font-black px-1 py-0.2 rounded bg-blue-100 text-[#1E3CAF] border border-blue-200 uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                          result.errorPercentage <= 25
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {result.errorPercentage <= 25 ? 'Pass ✅' : 'Exceeded ❌'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Max Allowed: <strong className="text-slate-900">25%</strong></span>
                        <span>Your Error: <strong className={result.errorPercentage <= 25 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>{result.errorPercentage.toFixed(2)}%</strong></span>
                      </div>
                    </div>

                    {/* SC / ST / Others */}
                    <div
                      onClick={() => setSelectedCategory('SC/ST/Others')}
                      className={`p-2 rounded-md border transition-all cursor-pointer ${
                        selectedCategory === 'SC/ST/Others'
                          ? 'ring-2 ring-[#286090] border-[#286090] bg-white shadow-2xs'
                          : result.errorPercentage <= 30
                          ? 'bg-white/90 border-emerald-300 hover:border-emerald-400'
                          : 'bg-white/90 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-bold text-xs text-slate-900 truncate">SC / ST / Others</span>
                          {selectedCategory === 'SC/ST/Others' && (
                            <span className="text-[8px] font-black px-1 py-0.2 rounded bg-blue-100 text-[#1E3CAF] border border-blue-200 uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                          result.errorPercentage <= 30
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {result.errorPercentage <= 30 ? 'Pass ✅' : 'Exceeded ❌'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Max Allowed: <strong className="text-slate-900">30%</strong></span>
                        <span>Your Error: <strong className={result.errorPercentage <= 30 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>{result.errorPercentage.toFixed(2)}%</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dedicated Category-Wise Allowed Error Limits Card (SSC CHSL ONLY - from official notification) */}
              {isSscChsl && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 sm:p-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm">📋</span>
                      <h3 className="font-bold text-slate-900 text-xs truncate">
                        Allowed Error Limits (Category-Wise)
                      </h3>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-950 border border-amber-300 shrink-0">
                        SSC CHSL (DEO / LDC)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 hidden sm:inline">
                      Click to evaluate category
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Unreserved (UR) & EWS - Max 7% error & Net Speed >= 35 (Eng) / 30 (Hin) */}
                    <div
                      onClick={() => setSelectedChslCategory('UR/EWS')}
                      className={`p-2.5 rounded-md border transition-all cursor-pointer ${
                        selectedChslCategory === 'UR/EWS'
                          ? 'ring-2 ring-[#286090] border-[#286090] bg-white shadow-2xs'
                          : isChslSpeedPassed && result.errorPercentage <= 7
                          ? 'bg-white/90 border-emerald-300 hover:border-emerald-400'
                          : 'bg-white/90 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-bold text-xs text-slate-900 truncate">Unreserved (UR) & EWS</span>
                          {selectedChslCategory === 'UR/EWS' && (
                            <span className="text-[8px] font-black px-1 py-0.2 rounded bg-blue-100 text-[#1E3CAF] border border-blue-200 uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                          isChslSpeedPassed && result.errorPercentage <= 7
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {isChslSpeedPassed && result.errorPercentage <= 7 ? 'Pass ✅' : 'Fail ❌'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Max Allowed Error: <strong className="text-slate-900">7%</strong></span>
                        <span>Your Error: <strong className={result.errorPercentage <= 7 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>{result.errorPercentage.toFixed(2)}%</strong></span>
                      </div>
                    </div>

                    {/* OBC, SC, ST, PwBD, ESM - Max 10% error & Net Speed >= 35 (Eng) / 30 (Hin) */}
                    <div
                      onClick={() => setSelectedChslCategory('OBC/SC/ST/PwBD/ESM')}
                      className={`p-2.5 rounded-md border transition-all cursor-pointer ${
                        selectedChslCategory === 'OBC/SC/ST/PwBD/ESM'
                          ? 'ring-2 ring-[#286090] border-[#286090] bg-white shadow-2xs'
                          : isChslSpeedPassed && result.errorPercentage <= 10
                          ? 'bg-white/90 border-emerald-300 hover:border-emerald-400'
                          : 'bg-white/90 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-bold text-xs text-slate-900 truncate">OBC, SC, ST, PwBD, ESM</span>
                          {selectedChslCategory === 'OBC/SC/ST/PwBD/ESM' && (
                            <span className="text-[8px] font-black px-1 py-0.2 rounded bg-blue-100 text-[#1E3CAF] border border-blue-200 uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                          isChslSpeedPassed && result.errorPercentage <= 10
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {isChslSpeedPassed && result.errorPercentage <= 10 ? 'Pass ✅' : 'Fail ❌'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Max Allowed Error: <strong className="text-slate-900">10%</strong></span>
                        <span>Your Error: <strong className={result.errorPercentage <= 10 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>{result.errorPercentage.toFixed(2)}%</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mathematical Formulas Box */}
              {isSsc ? (
                <div className="rounded-lg border border-blue-200 bg-[#eff6ff] p-4">
                  <div className="font-bold text-[rgb(30,60,175)] text-base mb-3 flex items-center justify-between">
                    <span>Official Mathematical Formulas ({isSscChsl ? 'SSC CHSL (DEO / LDC)' : 'SSC CGL Tier-2 DEST'})</span>
                    <span className="text-xs px-2.5 py-0.5 rounded bg-blue-100 font-bold text-blue-800 border border-blue-200">
                      SSC Standard
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="space-y-1">
                      <div className="font-bold text-[rgb(30,60,175)]">• Total Mistakes Formula:</div>
                      <div className="bg-white/80 border border-blue-200 rounded-md p-2.5 font-mono text-xs sm:text-sm font-bold text-slate-800">
                        Total Mistakes = Full Mistakes + ( Half Mistakes / 2 )
                      </div>
                    </div>
                    {isSscChsl && (
                      <>
                        <div className="space-y-1">
                          <div className="font-bold text-[rgb(30,60,175)]">• Net Words Formula (SSC CHSL):</div>
                          <div className="bg-white/80 border border-blue-200 rounded-md p-2.5 font-mono text-xs sm:text-sm font-bold text-slate-800">
                            Net Words Typed = Gross Words Typed − Total Mistakes
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="font-bold text-[rgb(30,60,175)]">• Net Speed Formula (SSC CHSL):</div>
                          <div className="bg-white/80 border border-blue-200 rounded-md p-2.5 font-mono text-xs sm:text-sm font-bold text-slate-800">
                            Net Speed = Net Words Typed / Total Time (in minutes)
                          </div>
                        </div>
                      </>
                    )}
                    <div className="space-y-1">
                      <div className="font-bold text-[rgb(30,60,175)]">
                        • Master Passage Words Formula:
                      </div>
                      <div className="bg-white/80 border border-blue-200 rounded-md p-2.5 font-mono text-xs sm:text-sm font-bold text-slate-800">
                        Total Words Given in Master Passage = Total Given Keystrokes / 5
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-[rgb(30,60,175)]">
                        • Error Percentage Formula ({isSscChsl ? 'SSC CHSL' : 'SSC CGL'}):
                      </div>
                      <div className="bg-white/80 border border-blue-200 rounded-md p-2.5 font-mono text-xs sm:text-sm font-bold text-slate-800">
                        Error Percentage = ( Total Mistakes / Total Words Given in Master Passage ) &times; 100
                      </div>
                    </div>
                    <div className="text-xs italic text-slate-600 pt-0.5">
                      {isSscChsl ? (
                        '(Note: Evaluated precisely up to two decimal places. UR & EWS: Max 7% error | Reserved (OBC/SC/ST/PwBD/ESM): Max 10% error. Target Speed: English 35 WPM / Hindi 30 WPM.)'
                      ) : (
                        '(Note: Evaluated precisely up to two decimal places. Result is based strictly on Error %; 5% rule and penalty are not applicable.)'
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-blue-200 bg-[#eff6ff] p-4">
                  <div className="font-bold text-[rgb(30,60,175)] text-base mb-3">RRB Formula</div>
                  <div className="flex gap-6 text-sm">
                    <div className="space-y-1 font-bold text-[rgb(30,60,175)] min-w-[130px]">
                      <div>Gross Speed:</div>
                      <div>Mistakes:</div>
                      <div>5% Rule:</div>
                      <div>Penalty:</div>
                      <div>Net Speed:</div>
                      <div>Accuracy:</div>
                    </div>
                    <div className="space-y-1 text-[#1E3CAF]">
                      <div>(Keystrokes/5) / Time</div>
                      <div>Full Errors + (Half Errors/2)</div>
                      <div>Ignore 5% of typed words</div>
                      <div>(Mistakes - Permissible) × 10</div>
                      <div>((Keystrokes/5) - Penalty) / Time</div>
                      <div>(Net Speed / Gross Speed) × 100</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Basic Metrics */}
                <div className="rounded-lg bg-[#f6f1f1] p-4 space-y-2 text-sm min-h-[220px]">
                  <div className="font-bold text-base mb-2">📊 Basic Metrics</div>
                  <div className="flex justify-between"><span>Keystrokes:</span><span className="font-bold text-[#286090]">{result.totalKeystrokes}</span></div>
                  <div className="flex justify-between"><span>Words Typed:</span><span className="font-bold text-[#286090]">{result.totalWordsTyped}</span></div>
                  <div className="flex justify-between"><span>Time:</span><span className="font-bold text-[#286090]">{result.timeInMinutes.toFixed(2)} min</span></div>
                  <div className="border-t border-slate-300 pt-2 mt-2 flex justify-between">
                    <span>Gross WPM:</span>
                    <span className="font-bold text-blue-700 text-base">{result.grossWpm}</span>
                  </div>
                  {isSscChsl && (
                    <div className="flex justify-between items-center text-xs">
                      <span>Net WPM:</span>
                      <span className="font-bold text-emerald-700 text-sm">{chslNetWpm.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Mistake Analysis */}
                <div className="rounded-lg bg-[#f6f1f1] p-4 space-y-1.5 text-sm min-h-[220px]">
                  <div className="font-bold text-base mb-2">❌ Mistake Analysis</div>
                  <div className="flex justify-between"><span>Full Errors:</span><span className="font-bold text-red-600">{result.fullMistakes}</span></div>
                  <div className="flex justify-between"><span>Half Errors (÷2):</span><span className="font-bold text-orange-500">{(result.halfMistakes * 0.5).toFixed(1)}</span></div>
                  <div className="flex justify-between"><span>Total Mistakes:</span><span className="font-bold text-[#286090]">{result.totalMistakes}</span></div>
                  {isSsc ? (
                    <div className="flex justify-between"><span>Master Passage Words (KS÷5):</span><span className="font-bold text-slate-700">{result.totalWordsInMasterPassage}</span></div>
                  ) : (
                    <div className="flex justify-between"><span>Permissible (5%):</span><span className="font-bold text-green-600">{result.ignorableMistakes.toFixed(2)}</span></div>
                  )}
                  <div className="border-t border-slate-300 pt-1.5 mt-1 flex justify-between">
                    <span>Error %:</span>
                    <span className={`font-bold text-base ${isCategoryPassed ? 'text-green-600' : 'text-red-600'}`}>{result.errorPercentage.toFixed(2)}%</span>
                  </div>
                </div>

                {/* Final Score / Result Card */}
                {isSsc ? (
                  <div className="rounded-lg bg-[#f6f1f1] p-4 space-y-1.5 text-sm min-h-[220px]">
                    <div className="font-bold text-base mb-2">🎯 Final Evaluation</div>
                    <div className="flex justify-between"><span>Total Mistakes:</span><span className="font-bold text-[#286090]">{result.totalMistakes}</span></div>
                    <div className="flex justify-between"><span>Master Passage Words (KS÷5):</span><span className="font-bold text-slate-700">{result.totalWordsInMasterPassage}</span></div>
                    <div className="border-t border-slate-300 pt-1.5 mt-1 space-y-2">
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span>Error Percentage:</span>
                          <span className={`font-bold text-base ${isCategoryPassed ? 'text-green-600' : 'text-red-600'}`}>{result.errorPercentage.toFixed(2)} %</span>
                        </div>
                        {/* Formula breakdown */}
                        <div className="mt-0.5 text-[10px] font-mono text-slate-500 text-right leading-snug">
                          ({result.totalMistakes} / {result.totalWordsInMasterPassage}) &times; 100
                          <br />
                          = <span className={`font-bold ${isCategoryPassed ? 'text-green-600' : 'text-red-600'}`}>{result.errorPercentage.toFixed(2)}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span>Max Allowed Error {isSscCgl ? `(${selectedCategory})` : isSscChsl ? `(${selectedChslCategory === 'UR/EWS' ? 'UR/EWS' : 'Reserved'})` : ''}:</span>
                        <span className="font-bold text-slate-700 text-right">
                          {isSscCgl ? `${categoryMaxError}%` : isSscChsl ? `${chslMaxError}%` : `${test.maxErrorPercentage}%`}
                        </span>
                      </div>
                      {isSscChsl && (
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-300">
                          <span>Target Net Speed ({isHindiTest ? 'Hindi: 30' : 'English: 35'} WPM):</span>
                          <span className={`font-bold ${isChslSpeedPassed ? 'text-green-700' : 'text-red-600'}`}>
                            {chslNetWpm.toFixed(2)} WPM {isChslSpeedPassed ? '✅' : `❌ (< ${chslRequiredSpeed})`}
                          </span>
                        </div>
                      )}
                      {(isSscCgl || isSscChsl) && (
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-300">
                          <span>Result ({isSscCgl ? selectedCategory : selectedChslCategory === 'UR/EWS' ? 'UR/EWS' : 'Reserved'}):</span>
                          <span className={`font-extrabold ${isCategoryPassed ? 'text-green-700' : 'text-red-600'}`}>
                            {isCategoryPassed ? 'PASS ✅' : 'FAIL ❌'}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between"><span>Accuracy:</span><span className="font-bold text-green-600">{result.accuracyPercentage.toFixed(2)} %</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#f6f1f1] p-4 space-y-1.5 text-sm min-h-[220px]">
                    <div className="font-bold text-base mb-2">🎯 Final Score</div>
                    <div className="flex justify-between"><span>Final Mistakes:</span><span className="font-bold text-[#286090]">{result.remainingMistakes}</span></div>
                    <div className="flex justify-between"><span>Penalty (×10):</span><span className="font-bold text-red-600">{result.penalty}</span></div>
                    <div className="border-t border-slate-300 pt-1.5 mt-1 space-y-2">
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span>Net WPM:</span>
                          <span className="font-bold text-green-600 text-base">{result.netWpm}</span>
                        </div>
                        {/* Formula: ((Keystrokes/5) - Penalty) / Time with actual numbers */}
                        <div className="mt-0.5 text-[10px] font-mono text-slate-500 text-right leading-snug">
                          (({result.totalKeystrokes}/5) &minus; {result.penalty}) / {result.timeInMinutes.toFixed(2)}
                          <br />
                          = ({result.totalWordsTyped} &minus; {result.penalty}) / {result.timeInMinutes.toFixed(2)}
                          <br />
                          = {result.netWords} / {result.timeInMinutes.toFixed(2)} = <span className="text-green-600 font-bold">{result.netWpm}</span>
                        </div>
                      </div>
                      <div className="flex justify-between"><span>Accuracy:</span><span className="font-bold text-green-600">{result.accuracyPercentage.toFixed(2)} %</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Errors */}
              <div>
                <p className="font-bold text-lg text-red-600 mb-3">Total Errors: ({result.totalMistakes})</p>
                <div className="rounded-lg bg-[#f6f1f1] p-4 space-y-4">
                  {/* Full Errors */}
                  <div>
                    <p className="font-bold text-slate-800 mb-2">Full Errors: ({result.fullMistakes})</p>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold text-white bg-red-500">
                        <span>Spelling / Substitution</span>
                        <span className="bg-white/25 px-1.5 rounded">({result.substitutions})</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold text-white bg-orange-500">
                        <span>Omission / Word Skipped</span>
                        <span className="bg-white/25 px-1.5 rounded">({result.omissions})</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold text-white bg-purple-600">
                        <span>Extra Word</span>
                        <span className="bg-white/25 px-1.5 rounded">({result.extraWordErrors})</span>
                      </div>
                    </div>
                  </div>
                  {/* Half Errors */}
                  <div>
                    <p className="font-bold text-slate-800 mb-2">Half Errors: ({result.halfMistakes})</p>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold text-white bg-amber-500">
                        <span>Capitalization</span>
                        <span className="bg-white/25 px-1.5 rounded">({result.wrongCapitalizations})</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold text-white bg-yellow-600">
                        <span>Punctuation</span>
                        <span className="bg-white/25 px-1.5 rounded">({result.punctuationErrors})</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold text-white bg-teal-600">
                        <span>Transposition</span>
                        <span className="bg-white/25 px-1.5 rounded">({result.transpositionErrors})</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold text-white bg-sky-600">
                        <span>Spacing / Joined / Split Words</span>
                        <span className="bg-white/25 px-1.5 rounded">({result.spacingErrors})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Typed Paragraph */}
              <div>
                <h2 className="font-bold text-base text-[#286090] mb-2">Typed Paragraph:</h2>
                <div className="border border-slate-200 rounded-md p-3.5 bg-white text-sm font-mono leading-loose min-h-[80px] max-h-[224px] overflow-y-auto">
                  {result.alignedTypedWords && result.alignedTypedWords.length > 0 ? (
                    <span>
                      {result.alignedTypedWords.map((tw, idx) => {
                        let cls = 'inline-block px-0.5 mr-1';
                        if (tw.status === 'CORRECT') cls += ' text-slate-800';
                        else if (tw.status === 'HALF_MISTAKE') cls += ' text-amber-700 underline decoration-dotted decoration-amber-500 decoration-2';
                        else if (tw.status === 'FULL_MISTAKE') cls += ' text-red-700 line-through decoration-red-500 decoration-2 bg-red-50 rounded px-1';
                        else if (tw.status === 'EXTRA') cls += ' text-purple-700 bg-purple-50 rounded border border-purple-300 px-1';
                        return (
                          <span key={idx} className={cls} title={tw.reason || ''}>
                            {tw.typedWord || tw.word}
                          </span>
                        );
                      })}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">No text was typed</span>
                  )}
                </div>
              </div>

              {/* Original Paragraph */}
              <div className="mb-2">
                <h2 className="font-bold text-base text-[#286090] mb-2">Original Paragraph:</h2>
                <div className="border border-slate-200 rounded-md p-3.5 bg-white text-sm font-mono leading-loose min-h-[80px] max-h-[224px] overflow-y-auto">
                  {result.alignedOriginalWords && result.alignedOriginalWords.length > 0 ? (
                    <span>
                      {result.alignedOriginalWords.map((ow, idx) => {
                        let cls = 'inline-block px-0.5 mr-1';
                        if (ow.status === 'CORRECT') cls += ' text-slate-800';
                        else if (ow.status === 'HALF_MISTAKE') cls += ' text-amber-700 bg-amber-50 rounded border-b-2 border-amber-400';
                        else if (ow.status === 'FULL_MISTAKE') cls += ' text-red-700 bg-red-50 rounded border border-red-300 px-1 line-through';
                        else if (ow.status === 'OMISSION') cls += ' text-red-600 bg-red-100 rounded border border-dashed border-red-400 px-1 font-bold';
                        else if (ow.status === 'UNREACHED') cls += ' text-slate-400';
                        return (
                          <span key={idx} className={cls} title={`Word ${idx + 1}: ${ow.word}`}>
                            {ow.word}
                          </span>
                        );
                      })}
                    </span>
                  ) : (
                    <span className="text-slate-400">{test.passageText}</span>
                  )}
                </div>
              </div>

              {/* Color Legend */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] pb-2">
                <span className="font-semibold text-slate-500">Legend:</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">Plain = Correct</span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-300">Underline = Half Error</span>
                <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-300 line-through">Strikethrough = Full Error</span>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 border border-dashed border-red-400 font-bold">Dashed = Omission</span>
                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-300">Box = Extra Word</span>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // BREAK PHASE (PHASE 2)
  // ----------------------------------------------------
  if (phase === 'BREAK') {
    return (
      <div className="min-h-screen bg-[#eef2f5] text-slate-800 flex flex-col justify-between font-sans select-none">
        {/* Top Header */}
        <header className="bg-[#286090] text-white px-4 py-2 flex items-center justify-between">
          <div className="font-bold text-xs tracking-wide">
            STAFF SELECTION COMMISSION - SKILL TEST SYSTEM
          </div>
          <button
            onClick={() => setShowInstructionsModal(true)}
            className="text-xs text-white hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-[#29b6f6]" />
            View Instructions
          </button>
        </header>

        {/* Break Center Container */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white border border-slate-300 rounded shadow-md p-6 sm:p-8 text-center space-y-6">
            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded border border-amber-300 uppercase">
              Phase 2: Break Time (विश्राम समय)
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Demo Test Completed! Please Relax
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                The main typing exam will start automatically when the break timer reaches zero.
              </p>
            </div>

            {/* Countdown Box */}
            <div className="p-4 bg-[#f8f9fa] border border-slate-300 rounded inline-block">
              <div className="text-3xl font-black font-mono text-[#286090]">
                {formatTcsTime(timeRemaining)}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                Break Time Left
              </div>
            </div>

            <div className="text-left text-xs bg-blue-50 border border-blue-200 p-3.5 rounded space-y-1 text-slate-700">
              <div className="font-bold text-[#286090]">Main Examination Details:</div>
              <div>• Total Duration: <strong>{test.mainDurationMinutes} Minutes</strong></div>
              {isSscCglExam(test) ? (
                <div>• Result Criteria: <strong>Category-Wise Max Error — UR: 20% | OBC/EWS: 25% | SC/ST: 30%</strong></div>
              ) : isSscChslExam(test) ? (
                <div>• Result Criteria: <strong>Category-Wise Max Error — UR & EWS: 7% | Reserved (OBC/SC/ST/PwBD/ESM): 10%</strong> (Net Speed = Net Words ÷ Time)</div>
              ) : isSscExam(test) ? (
                <div>• Result Criteria: <strong>Error Percentage &le; {test.maxErrorPercentage}%</strong> (Evaluated strictly on Error %)</div>
              ) : (
                <>
                  <div>• Qualifying Speed: <strong>{test.qualifyingWpm} WPM</strong></div>
                  <div>• Max Error Allowance: <strong>{test.maxErrorPercentage}%</strong></div>
                </>
              )}
            </div>

            <div>
              <button
                onClick={handleFinishBreak}
                className="px-6 py-2.5 bg-[#31a0e5] hover:bg-[#286090] text-white font-bold text-xs rounded shadow transition cursor-pointer"
              >
                Start Main Test Now (Skip Break)
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ----------------------------------------------------
  // TCS iON REPLICA TERMINAL (DEMO & MAIN PHASES)
  // Exact layout as in screenshot
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between font-sans select-none">
      {/* 1. TOP BLUE STRIP */}
      <div className="h-6 bg-[#286090] w-full" />

      {/* 2. SUB-HEADER / TEST NAME & CANDIDATE ROW (SECTION 1) */}
      <div className="border-b border-slate-300 bg-[#f8f9fa] px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left Side: Test Name */}
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-extrabold text-xs sm:text-sm text-[#286090] tracking-wide truncate">
              {test.title || testDisplayCode}
            </h2>
          </div>

          {/* Right Side: Digital Countdown Clock & User Profile */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <div className="text-sm sm:text-base font-bold text-slate-900 tracking-wide">
              Time Left: <span className="font-mono">{formatTcsTime(timeRemaining)}</span>
            </div>

            {/* User Profile Box */}
            <div className="flex items-center gap-2 bg-white border border-slate-300 p-1.5 rounded shadow-xs">
              {/* Metallic Avatar silhouette icon */}
              <div className="w-10 h-10 rounded bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 border border-slate-300 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                <svg className="w-8 h-8 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <div className="text-xs font-bold text-slate-800 pr-2">
                {currentUser?.name || 'my user'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. KEYBOARD LAYOUT BLUE BAR */}
      <div className="bg-[#337ab7] text-white px-4 py-1.5 text-xs sm:text-sm font-bold shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              Keyboard Layout: {test.language === 'hi' ? 'Hindi (Mangal / Inscript / Remington)' : 'QWERTY'}
            </span>
            <div className="flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded border border-white/30 text-xs">
              <span className="text-[11px] font-medium text-white/90 pr-0.5">Text Size:</span>
              <button
                type="button"
                onClick={handleDecreaseTextSize}
                disabled={textSize <= 14}
                className="w-5 h-5 flex items-center justify-center rounded bg-white/25 hover:bg-white/40 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs cursor-pointer"
                title="Decrease font size (A-)"
              >
                A-
              </button>
              <button
                type="button"
                onClick={handleResetTextSize}
                className="px-1.5 h-5 flex items-center justify-center rounded bg-white/25 hover:bg-white/40 active:scale-95 text-[11px] font-semibold cursor-pointer"
                title="Reset default font size (22px)"
              >
                {textSize}px
              </button>
              <button
                type="button"
                onClick={handleIncreaseTextSize}
                disabled={textSize >= 30}
                className="w-5 h-5 flex items-center justify-center rounded bg-white/25 hover:bg-white/40 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs cursor-pointer"
                title="Increase font size (A+)"
              >
                A+
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span>
              Retype: <span className={test.allowRetype ? 'text-emerald-200 font-bold' : 'text-amber-200'}>{test.allowRetype ? 'Allowed ✓ (Speed Counts)' : 'Disabled ✕ (Single Pass)'}</span>
            </span>
            <span>
              Backspace & Delete: <span className={isBackspaceEnabled ? 'text-emerald-200' : 'text-amber-200'}>{isBackspaceEnabled ? 'Enabled' : 'Disabled (No Corrections)'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5. MAIN WORK AREA (SPLIT SCREEN LAYOUT) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 flex flex-col lg:flex-row gap-4">
        {/* Left Column: Top Passage Box + Bottom Typing Box */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Top Box: Passage to type */}
          <div
            ref={passageBoxRef}
            style={{ fontSize: `${textSize}px`, lineHeight: `${Math.round(textSize * 1.6)}px` }}
            className="tcs-scrollbar h-56 sm:h-64 p-3 bg-white border border-slate-400 rounded overflow-y-auto text-slate-900 font-sans select-none tracking-normal"
          >
            {currentPassageText}
          </div>

          {/* Retype status notification bar */}
          {phase === 'MAIN' && (
            test.allowRetype ? (
              currentCycle > 1 ? (
                <div className="px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                  <span>
                    ✓ Passage completed! <strong>Retyping active (Cycle {currentCycle})</strong> — continue typing from the start, all words count in speed!
                  </span>
                  <span className="text-[10px] bg-emerald-200 px-2 py-0.5 rounded text-emerald-900 font-bold">
                    +{Math.max(0, typedWordCount - passageWordCount)} retyped words
                  </span>
                </div>
              ) : typedWordCount >= passageWordCount - 5 && passageWordCount > 0 ? (
                <div className="px-3 py-1 rounded bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium flex items-center justify-between">
                  <span>Passage near completion. <strong>Retype is allowed</strong>: once finished, press Space and retype from the beginning!</span>
                </div>
              ) : null
            ) : (
              typedWordCount >= passageWordCount && passageWordCount > 0 ? (
                <div className="px-3 py-1.5 rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold flex items-center justify-between">
                  <span>⚠️ <strong>Passage Completed!</strong> Retyping is disabled for this test. Please review your text or click Submit.</span>
                </div>
              ) : null
            )
          )}

          {/* Bottom Box: User Typing Area */}
          <div className="h-56 sm:h-64 bg-white border-2 border-slate-800 rounded p-1">
            <textarea
              ref={typingInputRef}
              autoFocus
              value={currentTypedText}
              style={{ fontSize: `${textSize}px`, lineHeight: `${Math.round(textSize * 1.6)}px` }}
              onChange={e => {
                if (phase === 'DEMO') {
                  setDemoTypedText(e.target.value);
                } else {
                  const val = e.target.value;
                  // If retyping is disabled, block typing new words beyond the passage
                  if (!test.allowRetype && passageWordCount > 0) {
                    const valWords = val.trim().length > 0 ? val.trim().split(/\s+/) : [];
                    if (valWords.length > passageWordCount && val.length > mainTypedText.length) {
                      return;
                    }
                  }
                  setMainTypedText(val);
                }
              }}
              onKeyDown={handleKeyDown}
              onPaste={e => {
                e.preventDefault(); // Exam integrity: strictly prevent pasting
              }}
              className="tcs-scrollbar w-full h-full p-2 bg-transparent resize-none border-none focus:outline-none text-slate-900 font-sans tracking-normal overflow-y-auto"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>

        {/* Right Column: Instructions Box & Submit Button */}
        <div className="w-full lg:w-72 flex flex-col gap-4">
          {/* Instructions Box with Magenta/Purple Border (exact to screenshot) */}
          <div className="p-3.5 bg-white border border-[#ab47bc] rounded text-[11px] text-slate-700 leading-relaxed space-y-2 shadow-xs">
            {test.language === 'hi' ? (
              <p>
                हिंदी टाइपिंग सेट करने के लिए <strong>Settings &gt; Time & Language</strong> में जाएं और हिंदी कीबोर्ड जोड़ें। 
                कीबोर्ड बदलने के लिए <strong className="text-[#e65100]">Windows + Space</strong> दबाएं।
              </p>
            ) : (
              <p>
                To set up the keyboard for Hindi typing, first go to Settings, then Time & Language, and select Language on your laptop. Install Hindi as a preferred language. After that, press <strong className="text-[#e65100]">Windows + Space</strong> to switch to the Hindi keyboard, but only switch when Hindi typing is required for the test.
              </p>
            )}
            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-0.5">
                <div className="flex justify-between">
                  <span>Keystrokes:</span>
                  <strong>{currentTypedText.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Words (KS÷5):</span>
                  <strong className="text-[#286090]">{Math.floor(currentTypedText.length / 5)}</strong>
                </div>
                {phase === 'MAIN' && (
                  <div className="flex justify-between">
                    <span>Cycle:</span>
                    <strong className={currentCycle > 1 ? 'text-emerald-600 font-bold' : 'text-slate-700'}>
                      Cycle {currentCycle} {test.allowRetype ? '(Retype ON)' : ''}
                    </strong>
                  </div>
                )}
              </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-1">
            {phase === 'DEMO' ? (
              <button
                onClick={handleFinishDemo}
                className="px-6 py-2 bg-[#31a0e5] hover:bg-[#286090] text-white font-bold text-sm rounded shadow transition active:scale-95 cursor-pointer"
              >
                Submit Demo
              </button>
            ) : (
              <button
                onClick={handleFinishMainTest}
                className="px-8 py-2 bg-[#31a0e5] hover:bg-[#286090] text-white font-bold text-sm rounded shadow transition active:scale-95 cursor-pointer"
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </main>

      {/* INSTRUCTIONS MODAL */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="allow-mouse-scroll w-full max-w-2xl bg-white rounded border border-slate-300 shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto text-xs text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-[#286090] uppercase">
                General Examination Instructions (SSC / Govt DEST Guidelines)
              </h3>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="p-1 rounded text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 leading-relaxed text-slate-700">
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded font-semibold text-[#286090]">
                {test.title} • Target: {test.qualifyingWpm} WPM • Max Error: {test.maxErrorPercentage}%
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900">1. Exam Structure & Durations:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
                  <li>Demo Test: <strong>{test.demoDurationMinutes} Minute(s)</strong> warm-up to verify keyboard responsiveness.</li>
                  <li>Break Time: <strong>{test.breakDurationMinutes} Minute(s)</strong> relaxation and keyboard positioning.</li>
                  <li>Main Exam: <strong>{test.mainDurationMinutes} Minutes</strong> actual evaluation test.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900">
                  2. Evaluation Guidelines {isSscExam(test) ? '(Official SSC Standard)' : '(RRB / Standard)'}:
                </h4>
                {isSscExam(test) ? (
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
                    <li><strong>Total Mistakes Formula</strong> = Full Mistakes + (Half Mistakes / 2).</li>
                    <li><strong>Full Mistakes (1.0 Mistake)</strong>: Omission of words, substitution of words, addition of extra words.</li>
                    <li><strong>Half Mistakes (0.5 Mistake)</strong>: Spacing errors, capitalization mismatch, punctuation marks, transposition.</li>
                    <li><strong>Master Passage Words</strong> = Total Keystrokes in Master Passage ÷ 5 (SSC Standard).</li>
                    <li><strong>Error Percentage Formula</strong> = (Total Mistakes / Total Words Given in Master Passage) &times; 100.</li>
                    {isSscCglExam(test) ? (
                      <li>
                        <strong>Category-Wise Maximum Error Percentage Allowed (SSC CGL)</strong>:
                        <div className="pl-3 pt-0.5 text-xs text-slate-700 space-y-0.5 font-medium">
                          <div>• UR (Unreserved): 20% maximum errors allowed.</div>
                          <div>• OBC / EWS: 25% maximum errors allowed.</div>
                          <div>• SC / ST / Others: 30% maximum errors allowed.</div>
                        </div>
                      </li>
                    ) : isSscChslExam(test) ? (
                      <li>
                        <strong>Allowed Error Limits (Category-Wise - SSC CHSL)</strong>:
                        <div className="pl-3 pt-0.5 text-xs text-slate-700 space-y-0.5 font-medium">
                          <div>• Unreserved (UR) & EWS: Maximum 7% error allowed.</div>
                          <div>• OBC, SC, ST, PwBD, ESM: Maximum 10% error allowed.</div>
                          <div>• Net Words Typed = Gross Words Typed − Total Mistakes.</div>
                          <div>• Net Speed = Net Words Typed ÷ Total Time (in minutes). Target: English 35 WPM / Hindi 30 WPM.</div>
                        </div>
                      </li>
                    ) : (
                      <li><strong>Qualification</strong>: Evaluated strictly up to two decimal places on Error %. Result qualifies if Error % &le; {test.maxErrorPercentage}%. 5% rule and penalty are not applicable to SSC exams.</li>
                    )}
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
                    <li><strong>Full Mistakes (1 Penalty)</strong>: Omission of words, substitution of words, or addition of extra words.</li>
                    <li><strong>Half Mistakes (0.5 Penalty)</strong>: Spacing errors, capitalization mismatch, or punctuation mistakes.</li>
                    <li><strong>Net WPM</strong> = Gross WPM − (Penalty Mistakes ÷ Exam Duration in Minutes).</li>
                    <li><strong>Accuracy %</strong> = [(Total Keystrokes − Penalty Keystrokes) ÷ Total Keystrokes] × 100.</li>
                  </ul>
                )}
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900">3. Keyboard & Rules:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
                  <li>
                    {isBackspaceEnabled
                      ? 'Backspace is allowed to make corrections.'
                      : 'Backspace & Delete keys are disabled. Corrections cannot be made once typed.'}
                  </li>
                  <li>
                    {test.allowRetype
                      ? 'Paragraph Retyping is ALLOWED: Candidates who complete typing the entire passage before time expires may retype the passage from the beginning. All retyped words and keystrokes will be counted toward Gross and Net Speed evaluation.'
                      : 'Paragraph Retyping is DISABLED: Evaluation is based on a single pass of the passage only.'}
                  </li>
                  <li>Mouse scroll wheel is disabled. Candidates must use the scrollbar to scroll through the passage.</li>
                  <li>Copy and paste functionalities are strictly prohibited.</li>
                  <li>The test will automatically submit when the digital clock reaches 00:00:00.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="px-4 py-1.5 bg-[#337ab7] hover:bg-[#286090] text-white font-bold text-xs rounded cursor-pointer"
              >
                Close Instructions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAN & PLAIN KEYSTROKES POPUP MODAL */}
      {summaryModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white border border-slate-300 rounded-lg shadow-xl p-5 space-y-4 text-slate-800 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="border-b border-slate-200 pb-2.5">
              <h3 className="text-sm font-bold text-[#286090] uppercase tracking-wide">
                {summaryModal.phase === 'DEMO'
                  ? (isHindi ? 'डेमो टेस्ट सबमिशन सारांश' : 'Demo Test Submission')
                  : (isHindi ? 'मुख्य टेस्ट सबमिशन सारांश' : 'Typing Test Submission Summary')}
              </h3>
            </div>

            {/* Content Info Box */}
            <div className="bg-slate-50 border border-slate-200 rounded p-4 text-center space-y-1 text-xs">
              <div className="text-slate-600 font-medium">
                {isHindi ? 'कुल दबाए गए की-स्ट्रोक्स' : 'Total Keystrokes Pressed'}
              </div>
              <div className="font-mono font-black text-2xl text-[#286090]">
                {summaryModal.keystrokes}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              {summaryModal.phase === 'DEMO'
                ? (isHindi ? 'विश्राम (ब्रेक) समय शुरू करने के लिए OK पर क्लिक करें।' : 'Click OK to proceed to the break countdown.')
                : (isHindi ? 'अपना अंतिम परिणाम देखने के लिए OK पर क्लिक करें।' : 'Click OK to view your evaluation scorecard.')}
            </p>

            {/* OK Button */}
            <div className="flex justify-center pt-1">
              <button
                onClick={handleConfirmSummaryOk}
                className="px-8 py-2 bg-[#286090] hover:bg-[#1f4b72] text-white font-bold text-xs rounded shadow transition active:scale-95 cursor-pointer select-none"
                autoFocus
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
