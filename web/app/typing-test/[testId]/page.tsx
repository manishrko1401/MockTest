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
  ExternalLink,
  X,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Keyboard,
  BookOpen,
  ChevronDown,
  ChevronUp,
  History,
  Gauge,
  Percent,
  Target,
  Award,
  Trophy,
  Clock,
  FileText,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Lock,
  User
} from 'lucide-react';
import {
  TypingTest,
  TypingAttempt,
  DetailedMistake,
  AlignedWord,
  evaluateTyping,
  detectExamCategory,
  EXAM_CATEGORIES,
  ExamCategoryKey,
  CategoryEvaluationResult,
  isSscExam,
  isSscCglExam,
  isSscChslExam,
  isAiimsExam,
  isRrbNtpcExam,
  isDsssbJsaExam,
  isKvsJsaExam,
  isEmrsJsaExam,
  isNvsJsaExam,
  isCsirJsaExam,
  isCsirFormulaExam,
  isCbseJsaExam,
  isCbseSuperintendentExam,
  isBsfHcmExam,
  isUpssscJaExam,
  isAllahabadHcExam,
  isUttrakhandHcExam,
  isDhcJjaExam
} from '../../lib/typingTypes';

type ExamPhase = 'DEMO' | 'BREAK' | 'MAIN' | 'RESULT';

const DEFAULT_DEMO_TEXT_EN = `This is a demo typing test passage designed to check your keyboard responsiveness and warm up your fingers. Please ensure all letter keys, space bar, backspace, and punctuation marks like comma, period, and hyphens are functioning smoothly before you start the main examination.`;

const DEFAULT_DEMO_TEXT_HI = `यह एक डेमो टाइपिंग टेस्ट पैसेज है जिसे आपके कीबोर्ड की प्रतिक्रियाशीलता की जांच करने और आपकी उंगलियों को अभ्यास कराने के लिए बनाया गया है। मुख्य परीक्षा शुरू करने से पहले कृपया सुनिश्चित करें कि सभी अक्षर कुंजी, स्पेस बार, बैकस्पेस और अल्पविराम, पूर्णविराम और हाइफ़न जैसे विराम चिह्न सुचारू रूप से काम कर रहे हैं।`;

const cleanDisplayTitle = (title: string) => {
  if (!title) return '';
  return title
    .replace(/\s*\((?:Easy|Medium|Hard|आसान|मध्यम|कठिन)\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export default function TCSiONTypingTerminalPage() {
  const { testId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode = searchParams.get('view') || searchParams.get('mode');
  const targetAttemptId = searchParams.get('attemptId') || searchParams.get('attempt');
  const isEmbed = searchParams.get('embed') === '1' || searchParams.get('embed') === 'true';
  const isAnalysisMode = viewMode === 'analysis' || Boolean(targetAttemptId);
  const [loadedCandidate, setLoadedCandidate] = useState<any>(null);
  const [loadedAttemptMeta, setLoadedAttemptMeta] = useState<any>(null);
  const { currentUser, language } = useAuth();
  const isAdmin = Boolean(
    currentUser?.role === 'ADMIN' ||
    (currentUser as any)?.isAdmin === true ||
    (currentUser as any)?.role === 'admin'
  );
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

  // Typing Mitra replica: Sound effects & Fullscreen & Paper Mode
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPaperMode, setIsPaperMode] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const typingAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDownloadPassagePdf = () => {
    if (!test) return;
    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (!printWindow) return;
    const isBombay = (test?.categoryId || '').includes('bombay') || (test?.title || '').toLowerCase().includes('bombay');
    const isDsssbSteno = (test?.categoryId || '').includes('dsssb-stenographer') || (test?.title || '').toLowerCase().includes('dsssb steno');

    const cleanTitle = cleanDisplayTitle(
      test.title || (isBombay ? 'Bombay High Court Clerk Typing Test' : 'Delhi Police HCM Typing Test')
    );
    const wordCount = test.passageText.trim().split(/\s+/).length;
    const strokeCount = test.passageText.replace(/\s+/g, ' ').trim().length;

    const examTitle = isBombay
      ? 'HIGH COURT OF JUDICATURE AT BOMBAY'
      : isDsssbSteno
      ? 'DELHI SUBORDINATE SERVICES SELECTION BOARD (DSSSB)'
      : 'DELHI POLICE HEAD CONSTABLE (MINISTERIAL) EXAMINATION';

    const examSubtitle = isBombay
      ? `CLERK RECRUITMENT TYPING TEST (400 WORDS / 10 MINUTES / 40 WPM / 20 MARKS) — ${cleanTitle}`
      : isDsssbSteno
      ? `OFFICIAL STENOGRAPHER TYPING SPEED PASSAGE SHEET — ${cleanTitle}`
      : `OFFICIAL SPEED TEST PASSAGE SHEET — ${cleanTitle}`;

    const qualifyingSpeedStr = isBombay
      ? '40 WPM (En) / 30 WPM (Hi) | Max: 20.0 Marks (Min 10.0 to pass)'
      : '30 WPM (En) / 25 WPM (Hi)';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${cleanTitle} - ${isBombay ? 'Bombay High Court Clerk' : 'Passage Paper'}</title>
        <style>
          @page { size: A4; margin: 20mm 15mm; }
          body { font-family: "Times New Roman", Times, serif; font-size: 14pt; line-height: 2.0; color: #111; margin: 0; padding: 25px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
          .subtitle { font-size: 12pt; font-weight: bold; color: #333; margin-bottom: 6px; }
          .meta { display: flex; justify-content: space-between; font-size: 10pt; font-weight: bold; border-top: 1px dashed #666; padding-top: 6px; margin-top: 6px; }
          .passage-box { text-align: justify; text-justify: inter-word; border: 1px solid #999; padding: 20px; border-radius: 4px; background: #fafafa; font-size: 14pt; line-height: 2.1; }
          .footer { margin-top: 35px; display: flex; justify-content: space-between; font-size: 11pt; border-top: 1px solid #ccc; padding-top: 15px; }
          .sig-box { width: 180px; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-weight: bold; }
          @media print {
            .no-print { display: none; }
            .passage-box { background: transparent; border: 1px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: center;">
          <button onclick="window.print()" style="padding: 8px 18px; font-size: 14px; font-weight: bold; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">🖨️ Print / Save as PDF</button>
          <span style="font-size: 12px; color: #666; margin-left: 10px;">(Choose "Save as PDF" in print destination to save)</span>
        </div>
        <div class="header">
          <div class="title">${examTitle}</div>
          <div class="subtitle">${examSubtitle}</div>
          <div class="meta">
            <span>Duration: 10 Minutes</span>
            <span>Total Strokes: ${strokeCount}</span>
            <span>Total Words: ~${wordCount}</span>
            <span>Qualifying: ${qualifyingSpeedStr}</span>
          </div>
        </div>
        <div class="passage-box">
          ${test.passageText.replace(/\n\n/g, '<br/><br/>&nbsp;&nbsp;&nbsp;&nbsp;').replace(/\n/g, '<br/>')}
        </div>
        <div class="footer">
          <div>Roll No: __________________</div>
          <div>Candidate Name: __________________</div>
          <div class="sig-box">Candidate Signature</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const playTypewriterSound = () => {
    if (!soundEnabled) return;
    if (typingAudioRef.current) {
      const audio = typingAudioRef.current;
      audio.volume = 0.45;
      if (audio.paused) {
        audio.play().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160 + Math.random() * 30, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.032);
    } catch (e) {}
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('typing_sound_enabled', next ? '1' : '0');
    }
    if (typingAudioRef.current) {
      if (next) {
        typingAudioRef.current.volume = 0.45;
        typingAudioRef.current.play().catch(() => {});
      } else {
        typingAudioRef.current.pause();
      }
    }
  };

  useEffect(() => {
    const audio = typingAudioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => {
      if (audio.duration && audio.currentTime > audio.duration - 0.25) {
        try { audio.currentTime = 0; } catch (e) {}
      }
    };
    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  useEffect(() => {
    if (phase === 'RESULT' && typingAudioRef.current) {
      typingAudioRef.current.pause();
    }
  }, [phase]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
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
  const [showErrorBreakdown, setShowErrorBreakdown] = useState<boolean>(true);
  const [showCalculationFormulas, setShowCalculationFormulas] = useState<boolean>(false);
  const [useRti5PercentRule, setUseRti5PercentRule] = useState<boolean>(false);

  const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);
  // Selected Category for SSC CGL Tier-2 DEST Result (UR: 20%, OBC/EWS: 25%, SC/ST/Others: 30%)
  const [selectedCategory, setSelectedCategory] = useState<'UR' | 'OBC/EWS' | 'SC/ST/Others'>('UR');
  // Selected Category for SSC CHSL Result (UR & EWS: 7%, OBC/SC/ST/PwBD/ESM: 10%)
  const [selectedChslCategory, setSelectedChslCategory] = useState<'UR/EWS' | 'OBC/SC/ST/PwBD/ESM'>('UR/EWS');
  // Selected Category for SPMCIL Result (UR: 5%, Reserved: 7%)
  const [selectedSpmcilCategory, setSelectedSpmcilCategory] = useState<'UR' | 'Reserved'>('UR');

  // Last 2 Attempts State (Current / Latest & Previous)
  const [attemptsList, setAttemptsList] = useState<any[]>([]);
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState<number>(0);

  // Refs
  const typingInputRef = useRef<HTMLTextAreaElement | null>(null);
  const passageBoxRef = useRef<HTMLDivElement | null>(null);
  // Accurate timing refs — updated synchronously, never stale
  const phaseRef = useRef<ExamPhase>('DEMO');
  const timeRemainingRef = useRef<number>(60);
  const totalPhaseSecondsRef = useRef<number>(60);

  // Helper to load user attempts (last 2) directly into Analysis phase
  const loadAttemptForAnalysis = async (currentTest: TypingTest) => {
    let attempts: any[] = [];

    // 1. If targetAttemptId is explicitly given (e.g. from Admin Inspect or direct result link)
    if (targetAttemptId) {
      try {
        const attRes = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-typing-attempt-by-id',
            data: { id: targetAttemptId }
          })
        });
        const attData = await attRes.json();
        if (attData.success && attData.attempt) {
          attempts = [attData.attempt];
          if (attData.attempt.user) {
            setLoadedCandidate(attData.attempt.user);
          } else if (attData.attempt.userName) {
            setLoadedCandidate({ fullName: attData.attempt.userName });
          }
          setLoadedAttemptMeta(attData.attempt);
        }
      } catch (e) {
        console.error('Error loading specific attempt by ID:', e);
      }
    }

    // 2. If no explicit attempt found, check local storage
    if (attempts.length === 0 && typeof window !== 'undefined') {
      try {
        const localList = localStorage.getItem(`typing_attempts_${currentTest.id}`);
        if (localList) {
          const parsed = JSON.parse(localList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            attempts = parsed;
          }
        }
        if (attempts.length === 0) {
          const single = localStorage.getItem(`typing_attempt_${currentTest.id}`);
          if (single) {
            attempts = [JSON.parse(single)];
          }
        }
      } catch (e) {}
    }

    // 3. Fallback: Fetch candidate's own attempts from server
    if (attempts.length === 0) {
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
          const serverMatches = attData.attempts.filter((a: any) => a.testId === currentTest.id);
          const combined = [...attempts, ...serverMatches];
          const uniqueMap = new Map();
          for (const a of combined) {
            const key = a.id || a.createdAt || `${a.timeSpentSeconds}_${a.netWpm}`;
            if (!uniqueMap.has(key)) uniqueMap.set(key, a);
          }
          attempts = Array.from(uniqueMap.values()).slice(0, 2);
        }
      } catch (e) {
        console.error('Error loading attempts from server:', e);
      }
    }

    // Keep strictly last 2 attempts
    attempts = attempts.slice(0, 2);

    if (attempts.length > 0) {
      setAttemptsList(attempts);
      setSelectedAttemptIndex(0);

      const activeAttempt = attempts[0];
      const typed = activeAttempt.typedText || '';
      const timeSpent = Math.max(activeAttempt.timeSpentSeconds || Math.round(currentTest.mainDurationMinutes * 60), 1);
      const bCount = activeAttempt.backspaceCount || 0;
      const catChoice = isSscCglExam(currentTest) ? selectedCategory : isSscChslExam(currentTest) ? selectedChslCategory : selectedSpmcilCategory;
      const passageToEvaluate = activeAttempt.targetText || currentTest.passageText;

      const evalResult = evaluateTyping(
        passageToEvaluate,
        typed,
        timeSpent,
        bCount,
        currentTest.qualifyingWpm || 35,
        currentTest.maxErrorPercentage || 5.0,
        Boolean(currentTest.allowRetype ?? activeAttempt.allowRetype),
        currentTest,
        undefined,
        undefined,
        undefined,
        activeAttempt.language || currentTest.language,
        catChoice
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

  // Switch between Current Attempt (0) and Previous Attempt (1)
  const handleSelectAttempt = (index: number) => {
    if (!attemptsList[index] || !test) return;
    setSelectedAttemptIndex(index);
    const targetAtt = attemptsList[index];
    const typed = targetAtt.typedText || '';
    const timeSpent = Math.max(targetAtt.timeSpentSeconds || Math.round(test.mainDurationMinutes * 60), 1);
    const bCount = targetAtt.backspaceCount || 0;
    const catChoice = isSscCglExam(test) ? selectedCategory : isSscChslExam(test) ? selectedChslCategory : selectedSpmcilCategory;
    const passageToEvaluate = targetAtt.targetText || test.passageText;

    const evalResult = evaluateTyping(
      passageToEvaluate,
      typed,
      timeSpent,
      bCount,
      test.qualifyingWpm || 35,
      test.maxErrorPercentage || 5.0,
      Boolean(test.allowRetype ?? targetAtt.allowRetype),
      test,
      undefined,
      undefined,
      undefined,
      targetAtt.language || test.language,
      catChoice
    );

    setResult(evalResult);
    setMainTypedText(typed);
    setBackspaceCount(bCount);
    setMainTimeSpentSeconds(timeSpent);
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
          } else if (currentUser) {
            initDemoPhase(currentTest);
          } else {
            // User not authenticated: pause timer and keep terminal waiting for login
            setIsTimerRunning(false);
          }
        } else if (targetAttemptId) {
          // If test not found directly by testId, fetch attempt by ID to reconstruct test
          try {
            const attRes = await fetch('/api/db', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get-typing-attempt-by-id', data: { id: targetAttemptId } })
            });
            const attData = await attRes.json();
            if (attData.success && attData.attempt) {
              const att = attData.attempt;
              const fallbackTest: TypingTest = att.test || {
                id: att.testId || (Array.isArray(testId) ? testId[0] : testId),
                title: att.testTitle || 'Typing Test',
                passageText: att.targetText || '',
                categoryId: att.categoryName || '',
                language: (att.language as any) || 'en',
                qualifyingWpm: 35,
                maxErrorPercentage: 5.0,
                mainDurationMinutes: Math.max(1, Math.round((att.timeSpentSeconds || 600) / 60)),
              };
              setTest(fallbackTest);
              if (att.user) setLoadedCandidate(att.user);
              else if (att.userName) setLoadedCandidate({ fullName: att.userName });
              setLoadedAttemptMeta(att);
              await loadAttemptForAnalysis(fallbackTest);
              return;
            }
          } catch (attErr) {
            console.error('Error fetching fallback attempt:', attErr);
          }
          router.push('/typing-test');
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
  }, [testId, isAnalysisMode, targetAttemptId, currentUser]);

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
      const timeSpent = Math.max(mainTimeSpentSeconds, 1);
      const catChoice = isSscCglExam(test) ? selectedCategory : isSscChslExam(test) ? selectedChslCategory : selectedSpmcilCategory;
      const isRetypeAllowed = isRrbNtpcExam(test) || Boolean(test.allowRetype);

      const evalResult = evaluateTyping(
        test.passageText,
        mainTypedText,
        timeSpent,
        backspaceCount,
        test.qualifyingWpm || 35,
        test.maxErrorPercentage || 5.0,
        isRetypeAllowed,
        test,
        undefined,
        undefined,
        undefined,
        test.language,
        catChoice
      );

      setResult(evalResult);
      setPhase('RESULT');

      // Save attempt
      saveUserAttempt(evalResult, timeSpent);
    }
  };

  // Dynamically re-evaluate results when category choice dropdown changes
  useEffect(() => {
    if (phase === 'RESULT' && test && mainTypedText) {
      const timeSpent = Math.max(mainTimeSpentSeconds || Math.round((test.mainDurationMinutes || 10) * 60), 1);
      const catChoice = isSscCglExam(test) ? selectedCategory : isSscChslExam(test) ? selectedChslCategory : selectedSpmcilCategory;
      const isRetypeAllowed = isRrbNtpcExam(test) || Boolean(test.allowRetype);
      const evalResult = evaluateTyping(
        test.passageText,
        mainTypedText,
        timeSpent,
        backspaceCount,
        test.qualifyingWpm || 35,
        test.maxErrorPercentage || 5.0,
        isRetypeAllowed,
        test,
        undefined,
        undefined,
        undefined,
        test.language,
        catChoice
      );
      setResult(evalResult);
    }
  }, [selectedCategory, selectedChslCategory, selectedSpmcilCategory]);

  // Save attempt API
  const saveUserAttempt = async (evalRes: any, timeSpent: number) => {
    if (!test) return;
    try {
      const attemptData: Partial<TypingAttempt> = {
        userId: currentUser?.id || 'guest',
        userName: currentUser?.name || (currentUser as any)?.fullName || 'my user',
        testId: test.id,
        testTitle: test.title,
        categoryName: test.categoryId,
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
          const finalAtt = {
            ...(data?.attempt || attemptData),
            createdAt: data?.attempt?.createdAt || new Date().toISOString()
          };

          // Save strictly last 2 attempts: [current/latest, previous]
          const attemptsKey = `typing_attempts_${test.id}`;
          let existingLast2: any[] = [];
          try {
            const raw = localStorage.getItem(attemptsKey);
            if (raw) existingLast2 = JSON.parse(raw);
            if (!Array.isArray(existingLast2)) existingLast2 = [];
          } catch (e) {}

          const updatedLast2 = [finalAtt, ...existingLast2.filter((a: any) => a.id !== finalAtt.id && a.createdAt !== finalAtt.createdAt)].slice(0, 2);
          localStorage.setItem(attemptsKey, JSON.stringify(updatedLast2));
          localStorage.setItem(`typing_attempt_${test.id}`, JSON.stringify(finalAtt));

          setAttemptsList(updatedLast2);
          setSelectedAttemptIndex(0);

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

  const isRrbNtpcTest = test ? isRrbNtpcExam(test) : false;
  const isBackspaceEnabled = !isRrbNtpcTest && test?.enableBackspace !== false && test?.backspaceRule !== 'DISABLED';
  const isRetypeAllowed = isRrbNtpcTest || Boolean(test?.allowRetype);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Backspace/Delete and corrections are disabled (RRB NTPC or admin disabled), block any correction
    if (!isBackspaceEnabled) {
      // 1. Block Backspace and Delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        return;
      }
      // 2. Block navigation keys that would allow moving cursor backwards into typed text
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'Home' ||
        e.key === 'PageUp' ||
        e.key === 'PageDown'
      ) {
        e.preventDefault();
        return;
      }
      // 3. Block editing shortcuts (Undo, Redo, Select All, Cut, Paste)
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'z' || k === 'y' || k === 'a' || k === 'x' || k === 'v') {
          e.preventDefault();
          return;
        }
      }
    }

    if (e.key === 'Backspace') {
      if (phase === 'DEMO') {
        setDemoBackspaceCount(prev => prev + 1);
      } else {
        setBackspaceCount(prev => prev + 1);
      }
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter')) {
      playTypewriterSound();
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

  // Official Demo Passages (English & Hindi)
  const resolvedDemoPassage = useMemo(() => {
    if (!test) return DEFAULT_DEMO_TEXT_EN;
    const isHi = test.language === 'hi' || (test.title || '').toLowerCase().includes('hindi') || (test.id || '').includes('-hi-');
    if (test.demoPassageText && test.demoPassageText.trim().length > 15) {
      return test.demoPassageText;
    }
    return isHi ? DEFAULT_DEMO_TEXT_HI : DEFAULT_DEMO_TEXT_EN;
  }, [test]);

  // Current passage text based on phase
  const currentPassageText = useMemo(() => {
    if (phase === 'DEMO') {
      return resolvedDemoPassage;
    }
    return test?.passageText || '';
  }, [phase, test, resolvedDemoPassage]);

  // Current typed text based on phase
  const currentTypedText = phase === 'DEMO' ? demoTypedText : mainTypedText;

  // Words and cycle calculations for Retype feature
  const passageWordList = useMemo(() => {
    const txt = phase === 'DEMO' ? resolvedDemoPassage : (test?.passageText || '');
    return txt.trim().length > 0 ? txt.trim().split(/\s+/) : [];
  }, [phase, test, resolvedDemoPassage]);

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

  const isCbseTest = test ? isCbseJsaExam(test) : false;
  const isCbseSuperintendentTest = test ? isCbseSuperintendentExam(test) : false;
  const isBsfTest = test ? isBsfHcmExam(test) : false;
  const isCsirFormulaTest = test ? isCsirFormulaExam(test) : false;
  const isUpssscTest = test ? isUpssscJaExam(test) : false;
  const isSscCglTest = test ? isSscCglExam(test) : false;

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
  // AUTHENTICATION BARRIER SCREEN (LOGIN REQUIRED TO ATTEMPT)
  // ----------------------------------------------------
  if (!isAnalysisMode && !currentUser && phase !== 'RESULT') {
    const loginRedirect = encodeURIComponent(`/typing-test/${test.id}`);
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#eef4fb] via-white to-[#edf2f8] text-slate-800 flex flex-col font-sans">
        {/* Top Header */}
        <header className="bg-[#1f4b72] text-white px-4 py-3 shadow-md border-b border-blue-900/40">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <Link
              href={test.categoryId ? `/typing-test/category/${test.categoryId}` : '/typing-test'}
              className="inline-flex items-center gap-2 text-white/90 hover:text-white text-xs font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isHindi ? 'वापस जाएं' : 'Back to Tests'}</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="bg-white/15 p-1.5 rounded-full">
                <Trophy className="w-4 h-4 text-amber-300" />
              </div>
              <span className="font-black text-sm uppercase tracking-wider text-white">
                MockTest <span className="text-amber-300">Hub</span>
              </span>
            </div>
            <Link
              href={`/auth?redirect=${loginRedirect}&mode=login`}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>{isHindi ? 'लॉग इन' : 'Login'}</span>
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
            {/* Mock Test Hub Logo */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="bg-[#E6F4FE] p-3.5 rounded-2xl shadow-xs flex items-center justify-center h-16 w-16 border border-blue-200/80 mx-auto transition-transform hover:scale-105">
                <Trophy className="h-9 w-9 text-blue-600" />
              </div>
              <div className="flex flex-col items-center">
                <span className="font-black text-sm leading-tight text-slate-900 tracking-wider uppercase">
                  {t.logoTitle}
                </span>
                <span className="text-[9px] text-blue-600 font-extrabold tracking-widest uppercase leading-tight">
                  {t.logoSub}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-extrabold uppercase tracking-wide border border-amber-200">
                {isHindi ? 'लॉगिन आवश्यक है' : 'Login Required to Attempt Test'}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {cleanDisplayTitle(test.title)}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                {isHindi
                  ? 'टाइपिंग टेस्ट शुरू करने और अपने विस्तृत अंक, गति एवं गलतियों के विश्लेषण को सहेजने के लिए कृपया अपने खाते में लॉगिन करें।'
                  : 'Please log in to your account to start this typing test, save your keystroke scorecard, and track your speed & accuracy progress.'}
              </p>
            </div>

            {/* Test Metadata Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isHindi ? 'अवधि' : 'Duration'}
                </span>
                <p className="font-extrabold text-slate-800 text-sm">
                  {test.mainDurationMinutes} Min
                </p>
              </div>
              <div className="space-y-0.5 border-x border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isHindi ? 'भाषा' : 'Language'}
                </span>
                <p className="font-extrabold text-blue-600 text-sm uppercase">
                  {test.language === 'hi' ? 'Hindi' : 'English'}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isHindi ? 'योग्यता' : 'Qualifying'}
                </span>
                <p className="font-extrabold text-slate-800 text-sm">
                  {test.qualifyingWpm || 35} WPM
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href={`/auth?redirect=${loginRedirect}&mode=login`}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>{isHindi ? 'लॉग इन करके टेस्ट शुरू करें' : 'Login to Start Test'}</span>
              </Link>
              <Link
                href={`/auth?redirect=${loginRedirect}&tab=signup`}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition cursor-pointer"
              >
                <span>{isHindi ? 'नया खाता बनाएं (Free)' : 'Create Free Account'}</span>
              </Link>
            </div>

            <div className="pt-2">
              <Link
                href={test.categoryId ? `/typing-test/category/${test.categoryId}` : '/typing-test'}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 underline"
              >
                {isHindi ? '← अन्य टाइपिंग टेस्ट्स देखें' : '← Browse other typing tests'}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ----------------------------------------------------
  // RESULT SCREEN (PHASE 4) - TYPINGMITRA EXACT REPLICA
  // ----------------------------------------------------
  if (phase === 'RESULT' && result) {
    const catConfig = result.categoryConfig || detectExamCategory(test);
    const catEval = result.categoryEvaluation;
    const isAiims = catConfig.key === 'aiims-cre';
    const isSsc = catConfig.key === 'ssc-cgl' || catConfig.key === 'ssc-cgl-previous' || catConfig.key === 'ssc-chsl';
    const isSscCgl = isSscCglTest || isSscCglExam(test) || catConfig.key === 'ssc-cgl' || catConfig.key === 'ssc-cgl-previous';
    const isSscChsl = catConfig.key === 'ssc-chsl';
    const isSscExam = isSscChsl || isSscCgl;
    const isDelhiPoliceHcm = catConfig.key === 'delhi-police-hcm';
    const isAllahabadHc = catConfig.key === 'allahabad-hc' || isAllahabadHcExam(test) || (test?.categoryId || '').includes('allahabad') || (test?.title || '').toLowerCase().includes('allahabad');
    const isUttrakhandHc = catConfig.key === 'uttrakhand-hc' || isUttrakhandHcExam(test) || (test?.categoryId || '').includes('uttrakhand') || (test?.title || '').toLowerCase().includes('uttrakhand') || (test?.title || '').toLowerCase().includes('uttarakhand');
    const isRssbLdc = catConfig.key === 'rssb-ldc' || (test?.categoryId || '').includes('rssb') || (test?.title || '').toLowerCase().includes('rssb');
    const isDhcJja = catConfig.key === 'delhi-hc-jja' || isDhcJjaExam(test) || (test?.categoryId || '').includes('dhc') || (test?.title || '').toLowerCase().includes('delhi high court') || (test?.title || '').toLowerCase().includes('dhc');
    const isSupremeCourt = catConfig.key === 'supreme-court-jca';

    // Delhi High Court (DHC) JJA Evaluation (All errors full, 3% ignorable with 0.5-step rounding)
    const dhcTotalErrors = result.fullMistakes + result.halfMistakes;
    const dhcWordsTyped = result.totalKeystrokes / 5;
    const dhcIgnorableRaw = Math.round(0.03 * dhcWordsTyped * 100) / 100;
    const dhcFloor = Math.floor(dhcIgnorableRaw);
    const dhcFrac = Math.round((dhcIgnorableRaw - dhcFloor) * 100) / 100;
    const dhcIgnorableRounded = dhcFrac <= 0.001 ? dhcFloor : dhcFrac <= 0.501 ? dhcFloor + 0.5 : dhcFloor + 1.0;
    const dhcActualError = Math.max(0, Math.round((dhcTotalErrors - dhcIgnorableRounded) * 100) / 100);
    const dhcNetWords = Math.max(0, Math.round((dhcWordsTyped - dhcActualError) * 100) / 100);
    const dhcGrossWpm = result.timeInMinutes > 0 ? Math.round((dhcWordsTyped / result.timeInMinutes) * 100) / 100 : 0;
    const dhcNetWpm = result.timeInMinutes > 0 ? Math.round((dhcNetWords / result.timeInMinutes) * 100) / 100 : 0;
    const dhcAccuracy = dhcGrossWpm > 0 ? Math.min(100, Math.round((dhcNetWpm / dhcGrossWpm) * 10000) / 100) : 0;
    const dhcErrorPercentage = dhcWordsTyped > 0 ? Math.round((dhcTotalErrors / dhcWordsTyped) * 10000) / 100 : 0;
    const dhcQualified = dhcNetWpm >= 35;
    const isSpmcil = catConfig.key === 'spmcil' || (test?.categoryId || '').includes('spmcil') || (test?.title || '').toLowerCase().includes('spmcil');

    // SPMCIL Evaluation (UR: 5%, Reserved: 7%, Actual Error = Total Errors - Allowed, Net = (Words - Actual Error) / Time)
    const spmcilMarginPct = selectedSpmcilCategory === 'Reserved' ? 0.07 : 0.05;
    const spmcilTotalErrors = result.fullMistakes + (result.halfMistakes * 0.5);
    const spmcilWordsTyped = result.totalKeystrokes / 5;
    const spmcilAllowedErrors = Math.round(spmcilWordsTyped * spmcilMarginPct * 100) / 100;
    const spmcilActualError = Math.max(0, Math.round((spmcilTotalErrors - spmcilAllowedErrors) * 100) / 100);
    const spmcilNetWords = Math.max(0, Math.round((spmcilWordsTyped - spmcilActualError) * 100) / 100);
    const spmcilNetWpm = result.timeInMinutes > 0 ? Math.round((spmcilNetWords / result.timeInMinutes) * 100) / 100 : 0;
    const spmcilGrossWpm = result.grossWpm;
    const spmcilAccuracy = spmcilGrossWpm > 0 ? Math.min(100, Math.round((spmcilNetWpm / spmcilGrossWpm) * 10000) / 100) : 0;
    const isHindiTest = isHindi || (test?.language || '').toLowerCase().includes('hi') || (test?.title || '').toLowerCase().includes('hindi') || catConfig.key.includes('hindi');
    const spmcilRequiredSpeed = isHindiTest ? 30 : 40;
    const spmcilQualified = spmcilNetWpm >= spmcilRequiredSpeed;

    const isBsfHcm = isBsfTest || catConfig.key === 'bsf-hcm';
    const isUpPoliceCo = catConfig.key === 'up-police-co' || (test?.categoryId || '').includes('up-police') || (test?.categoryId || '').includes('computer-operator') || (test?.title || '').toLowerCase().includes('computer operator');
    const isUpssscJa = isUpssscTest || catConfig.key === 'upsssc-ja' || catConfig.key === 'upsssc-ja-hindi';
    const isBombayHc = catConfig.key === 'bombay-hc-clerk' || catConfig.key === 'bombay-hc-clerk-400';
    const isRrbNtpc = catConfig.key === 'rrb-ntpc';
    const isDsssbSteno = catConfig.key === 'dsssb-steno' || (test?.categoryId || '').includes('dsssb-steno') || (test?.categoryId || '').includes('dsssb-stenographer') || (test?.title || '').toLowerCase().includes('dsssb steno') || (test?.title || '').toLowerCase().includes('dsssb stenographer');
    const isDsssbJsa = catConfig.key === 'dsssb-jsa' || catConfig.key === 'dsssb-it-assistant' || isDsssbSteno;
    const isDsssbItAssistant = catConfig.key === 'dsssb-it-assistant' || (test?.categoryId || '').includes('computer-lab') || (test?.categoryId || '').includes('it-assistant') || (test?.title || '').toLowerCase().includes('it assistant') || (test?.title || '').toLowerCase().includes('computer lab');
    const isDdaJsa = catConfig.key === 'dda-jsa' || (test?.categoryId || '').includes('dda-jsa') || (test?.title || '').toLowerCase().includes('dda jsa');
    const isDdaSteno = catConfig.key === 'dda-steno' || (test?.categoryId || '').includes('dda-steno') || (test?.categoryId || '').includes('dda-stenographer') || (test?.title || '').toLowerCase().includes('dda steno') || (test?.title || '').toLowerCase().includes('dda stenographer');
    const isCcrasLdcUdc = catConfig.key === 'ccras-ldc-udc' || (test?.categoryId || '').includes('ccras') || (test?.title || '').toLowerCase().includes('ccras');
    const isKvsJsa = catConfig.key === 'kvs-jsa';
    const isEmrsJsa = catConfig.key === 'emrs-jsa';
    const isNvsJsa = catConfig.key === 'nvs-jsa';
    const isKvsOrEmrsOrNvs = isKvsJsa || isEmrsJsa || isNvsJsa;
    const isChandigarhAdmin = catConfig.key === 'chandigarh-admin-clerk' || (test?.categoryId || '').includes('chandigarh') || (test?.title || '').toLowerCase().includes('chandigarh');
    const isPunjabHaryanaHc = catConfig.key === 'punjab-haryana-hc' || (test?.categoryId || '').includes('punjab') || (test?.title || '').toLowerCase().includes('punjab') || (test?.title || '').toLowerCase().includes('haryana');
    const isDpAwoTpo = catConfig.key === 'delhi-police-awo-tpo';
    const isPermissibleExam = !isBsfHcm && !isSpmcil && (isDhcJja || isSupremeCourt || isRrbNtpc);
    const isMarksExam = isBombayHc;
    const isStandardNet = catConfig.evaluationMode === 'STANDARD_NET_SPEED';

    const isMpCpct = catConfig.key === 'mp-cpct' || (test?.categoryId || '').includes('mp-cpct') || (test?.title || '').toLowerCase().includes('cpct');

    // MP CPCT Evaluation (All errors full, 1-word deduction, Scaled Score %, 30 NWPM en / 20 NWPM hi)
    const mpCpctTotalErrors = result.fullMistakes + result.halfMistakes;
    const mpCpctWordsTyped = result.totalKeystrokes / 5;
    const mpCpctNetWords = Math.max(0, mpCpctWordsTyped - mpCpctTotalErrors);
    const mpCpctNetWpm = result.timeInMinutes > 0 ? Math.round((mpCpctNetWords / result.timeInMinutes) * 100) / 100 : 0;
    const mpCpctAccuracy = result.grossWpm > 0 ? Math.min(100, Math.round((mpCpctNetWpm / result.grossWpm) * 10000) / 100) : 0;
    const mpCpctErrorPercentage = mpCpctWordsTyped > 0 ? Math.round((mpCpctTotalErrors / mpCpctWordsTyped) * 10000) / 100 : 0;
    const mpCpctRequiredSpeed = isHindiTest ? 20 : 30;
    const mpCpctQualified = mpCpctNetWpm >= mpCpctRequiredSpeed;
    const mpCpctScaledScore = catEval.scaledScorePercentage ?? (
      isHindiTest
        ? (mpCpctNetWpm >= 51 ? 100 : mpCpctNetWpm >= 41 ? 90 : mpCpctNetWpm >= 36 ? 80 : mpCpctNetWpm >= 31 ? 70 : mpCpctNetWpm >= 26 ? 60 : mpCpctNetWpm >= 20 ? 50 : 0)
        : (mpCpctNetWpm >= 81 ? 100 : mpCpctNetWpm >= 71 ? 90 : mpCpctNetWpm >= 61 ? 80 : mpCpctNetWpm >= 51 ? 70 : mpCpctNetWpm >= 41 ? 60 : mpCpctNetWpm >= 30 ? 50 : 0)
    );

    // DDA Stenographer Evaluation (All errors full, 1-word deduction, 40 WPM en / 35 WPM hi)
    const ddaStenoTotalErrors = result.fullMistakes + result.halfMistakes;
    const ddaStenoWordsTyped = result.totalKeystrokes / 5;
    const ddaStenoNetWords = Math.max(0, ddaStenoWordsTyped - ddaStenoTotalErrors);
    const ddaStenoNetWpm = result.timeInMinutes > 0 ? Math.round((ddaStenoNetWords / result.timeInMinutes) * 100) / 100 : 0;
    const ddaStenoAccuracy = result.grossWpm > 0 ? Math.min(100, Math.round((ddaStenoNetWpm / result.grossWpm) * 10000) / 100) : 0;
    const ddaStenoErrorPercentage = ddaStenoWordsTyped > 0 ? Math.round((ddaStenoTotalErrors / ddaStenoWordsTyped) * 10000) / 100 : 0;
    const ddaStenoRequiredSpeed = isHindiTest ? 35 : 40;
    const ddaStenoQualified = ddaStenoNetWpm >= ddaStenoRequiredSpeed;

    // Allahabad High Court RO / ARO Evaluation (50 Marks, 0.10 marks/correct word, Net WPM >= 25 & Marks >= 25)
    const ahcWordsTyped = result.alignedTypedWords ? result.alignedTypedWords.length : Math.round(result.totalWordsTyped);
    const ahcTotalErrors = result.fullMistakes + result.halfMistakes;
    const ahcCorrectWords = Math.max(0, ahcWordsTyped - ahcTotalErrors);
    const ahcMarks = catEval.marksObtained ?? Math.min(50, Math.max(0, Math.round(ahcCorrectWords * 0.10 * 100) / 100));
    const ahcGrossWpm = result.grossWpm;
    const ahcNetWpm = result.netWpm;
    const ahcAccuracy = result.accuracyPercentage;
    const ahcErrorPercentage = ahcWordsTyped > 0 ? Math.round((ahcTotalErrors / ahcWordsTyped) * 10000) / 100 : 0;
    const ahcQualified = ahcNetWpm >= 25 && ahcMarks >= 25;

    // DSSSB JSA / IT Assistant / Stenographer Dynamic Evaluation (2x Penalty vs RTI 5% Rule)
    const dsssbTotalErrors = result.fullMistakes;
    const dsssbPenalty = useRti5PercentRule ? 0 : dsssbTotalErrors * 2;
    const dsssbNetWords = Math.max(0, (result.totalKeystrokes / 5) - (useRti5PercentRule ? dsssbTotalErrors : dsssbPenalty));
    const dsssbNetWpm = result.timeInMinutes > 0 ? Math.round((dsssbNetWords / result.timeInMinutes) * 100) / 100 : 0;
    const dsssbAccuracy = result.grossWpm > 0 ? Math.round((dsssbNetWpm / result.grossWpm) * 10000) / 100 : 0;
    const dsssbRequiredSpeed = isDsssbSteno
      ? (isHindiTest ? 30 : 40)
      : isDsssbItAssistant
      ? (catConfig.qualifyingSpeed[isHindiTest ? 'hi' : 'en'] || 26.67)
      : (isHindiTest ? 30 : 35);
    const dsssbQualified = useRti5PercentRule
      ? result.errorPercentage <= 5 && dsssbNetWpm >= dsssbRequiredSpeed
      : dsssbNetWpm >= dsssbRequiredSpeed;

    // KVS JSA Evaluation (All errors full, 1x error deduction)
    const kvsTotalErrors = result.fullMistakes;
    const kvsNetWords = Math.max(0, (result.totalKeystrokes / 5) - kvsTotalErrors);
    const kvsNetWpm = result.timeInMinutes > 0 ? Math.round((kvsNetWords / result.timeInMinutes) * 100) / 100 : 0;
    const kvsAccuracy = result.grossWpm > 0 ? Math.round((kvsNetWpm / result.grossWpm) * 10000) / 100 : 0;
    const kvsRequiredSpeed = isHindiTest ? 30 : 35;
    const kvsQualified = kvsNetWpm >= kvsRequiredSpeed;

    // CSIR EXAM New Rules (FORMULA) Evaluation (5% on passage words, Net WPM = Gross - Actual Errors)
    const isCsirFormula = isCsirFormulaTest || catConfig.key === 'csir-formula';
    const csirPassageKeystrokes = test.passageText.replace(/\s+/g, ' ').trim().length;
    const csirPassageWords = Math.max(1, Math.round((csirPassageKeystrokes / 5) * 10) / 10);
    const csirFormulaFullErrors = result.fullMistakes;
    const csirFormulaHalfErrors = result.halfMistakes;
    const csirFormulaTotalErrors = Math.round((csirFormulaFullErrors + (csirFormulaHalfErrors / 2)) * 100) / 100;
    const csirFormulaIgnorable = Math.round(0.05 * csirPassageWords * 100) / 100;
    const csirFormulaActualErrors = Math.max(0, Math.round((csirFormulaTotalErrors - csirFormulaIgnorable) * 100) / 100);
    const csirFormulaErrorPct = Math.round((csirFormulaTotalErrors / csirPassageWords) * 10000) / 100;
    const csirFormulaWordsTyped = result.totalKeystrokes / 5;
    const csirFormulaGrossWpm = result.timeInMinutes > 0 ? Math.round((csirFormulaWordsTyped / result.timeInMinutes) * 100) / 100 : 0;
    const csirFormulaNetWpm = Math.max(0, Math.round((csirFormulaGrossWpm - csirFormulaActualErrors) * 100) / 100);
    const csirFormulaAccuracy = csirFormulaGrossWpm > 0 ? Math.min(100, Math.round((csirFormulaNetWpm / csirFormulaGrossWpm) * 10000) / 100) : 0;
    const csirFormulaRequiredSpeed = isHindiTest ? 30 : 35;
    const csirFormulaQualified = csirFormulaNetWpm >= csirFormulaRequiredSpeed;

    // CSIR JSA Evaluation (All errors full, 5% ignorable, excess × 10 penalty)
    const isCsirJsa = catConfig.key === 'csir-jsa' && !isCsirFormula;
    const csirTotalErrors = result.fullMistakes;
    const csirWordsTyped = result.totalKeystrokes / 5;
    const csirIgnorable = Math.round(0.05 * csirWordsTyped * 100) / 100;
    const csirExcess = Math.max(0, Math.round((csirTotalErrors - csirIgnorable) * 100) / 100);
    const csirPenalty = Math.round(csirExcess * 10 * 100) / 100;
    const csirNetWords = Math.max(0, Math.round((csirWordsTyped - csirPenalty) * 100) / 100);
    const csirNetWpm = result.timeInMinutes > 0 ? Math.round((csirNetWords / result.timeInMinutes) * 100) / 100 : 0;
    const csirAccuracy = result.grossWpm > 0 ? Math.round((csirNetWpm / result.grossWpm) * 10000) / 100 : 0;
    const csirRequiredSpeed = isHindiTest ? 30 : 35;
    const csirQualified = csirNetWpm >= csirRequiredSpeed;

    // CBSE JSA Evaluation (All errors full, 1x error deduction)
    const isCbseJsa = isCbseJsaExam(test) || catConfig.key === 'cbse-jsa' || catConfig.key === 'cbse-superintendent';
    const cbseTotalErrors = result.fullMistakes + result.halfMistakes;
    const cbseWordsTyped = result.totalKeystrokes / 5;
    const cbseNetWords = Math.max(0, cbseWordsTyped - cbseTotalErrors);
    const cbseNetWpm = result.timeInMinutes > 0 ? Math.round((cbseNetWords / result.timeInMinutes) * 100) / 100 : 0;
    const cbseAccuracy = result.grossWpm > 0 ? Math.round((cbseNetWpm / result.grossWpm) * 10000) / 100 : 0;
    const cbseErrorPercentage = cbseWordsTyped > 0 ? Math.round((cbseTotalErrors / cbseWordsTyped) * 10000) / 100 : 0;
    const cbseRequiredSpeed = isHindiTest ? 30 : 35;
    const cbseQualified = cbseNetWpm >= cbseRequiredSpeed;

    // BSF HCM Evaluation (All errors full, 5% ignorable, excess × 10 penalty)
    const bsfTotalErrors = result.fullMistakes + result.halfMistakes;
    const bsfWordsTyped = result.totalKeystrokes / 5;
    const bsfIgnorable = Math.round(0.05 * bsfWordsTyped * 100) / 100;
    const bsfExcess = Math.max(0, Math.round((bsfTotalErrors - bsfIgnorable) * 100) / 100);
    const bsfPenalty = Math.round(bsfExcess * 10 * 100) / 100;
    const bsfNetWords = Math.max(0, Math.round((bsfWordsTyped - bsfPenalty) * 100) / 100);
    const bsfNetWpm = result.timeInMinutes > 0 ? Math.round((bsfNetWords / result.timeInMinutes) * 100) / 100 : 0;
    const bsfGrossWpm = result.timeInMinutes > 0 ? Math.round((bsfWordsTyped / result.timeInMinutes) * 100) / 100 : 0;
    const bsfAccuracy = bsfGrossWpm > 0 ? Math.min(100, Math.round((bsfNetWpm / bsfGrossWpm) * 10000) / 100) : 0;
    const bsfErrorPercentage = bsfWordsTyped > 0 ? Math.round((bsfTotalErrors / bsfWordsTyped) * 10000) / 100 : 0;
    const bsfRequiredSpeed = isHindiTest ? 30 : 35;
    const bsfQualified = bsfNetWpm >= bsfRequiredSpeed;

    // UPSSSC Junior Assistant Evaluation (First 5 errors ignorable, excess × 5 penalty words)
    const upssscTotalErrors = Math.round((result.fullMistakes + (result.halfMistakes / 2)) * 100) / 100;
    const upssscIgnorable = Math.min(5, upssscTotalErrors);
    const upssscExcess = Math.max(0, Math.round((upssscTotalErrors - upssscIgnorable) * 100) / 100);
    const upssscPenalty = Math.round(upssscExcess * 5 * 100) / 100;
    const upssscWordsTyped = result.totalKeystrokes / 5;
    const upssscNetWords = Math.max(0, Math.round((upssscWordsTyped - upssscPenalty) * 100) / 100);
    const upssscGrossWpm = result.timeInMinutes > 0 ? Math.round((upssscWordsTyped / result.timeInMinutes) * 100) / 100 : 0;
    const upssscNetWpm = result.timeInMinutes > 0 ? Math.max(0, Math.round((upssscNetWords / result.timeInMinutes) * 100) / 100) : 0;
    const upssscAccuracy = upssscGrossWpm > 0 ? Math.min(100, Math.max(0, Math.round((upssscNetWpm / upssscGrossWpm) * 10000) / 100)) : 0;
    const upssscErrorPercentage = upssscWordsTyped > 0 ? Math.round((upssscTotalErrors / upssscWordsTyped) * 10000) / 100 : 0;
    const upssscRequiredSpeed = (isHindiTest || test.language === 'hi' || catConfig.key === 'upsssc-ja-hindi') ? 25 : 30;
    const upssscQualified = upssscNetWpm >= upssscRequiredSpeed;

    // For exams using passage words as error % denominator
    const usesPassageDenominator = isSscExam;

    const categoryMaxError = selectedCategory === 'UR' ? 20 : selectedCategory === 'OBC/EWS' ? 25 : 30;
    const chslMaxError = selectedChslCategory === 'UR/EWS' ? 7 : 10;
    const chslRequiredSpeed = isHindiTest ? 30 : 35;
    const chslNetWpm = result.chslNetWpm ?? result.netWpm;
    const chslNetWords = result.chslNetWords ?? result.netWords;
    const chslErrorPassed = result.errorPercentage <= chslMaxError;
    const chslSpeedPassed = chslNetWpm >= chslRequiredSpeed;

    const isQualified = result.isQualified;
    const totalKeystrokesInPassage = test.passageText.replace(/\s+/g, ' ').trim().length;
    const totalWordsInPassage = Math.round(totalKeystrokesInPassage / 5);
    const durationDisplaySec = Math.max(mainTimeSpentSeconds || Math.round((test.mainDurationMinutes || 10) * 60), 1);
    const durationMinutes = Math.floor(durationDisplaySec / 60);
    const durationSeconds = durationDisplaySec % 60;
    const formattedDuration = `${durationMinutes.toString().padStart(2, '0')}:${durationSeconds.toString().padStart(2, '0')}`;

    // Error % formula description shown under the card
    const errorPctFormula = isSscExam
      ? `(Total Errors / (Total Keystrokes in Passage / 5) × 100))`
      : usesPassageDenominator
      ? `(Total Errors / (${totalKeystrokesInPassage} Passage Keystrokes ÷ 5)) × 100`
      : isAiims
      ? 'N/A — AIIMS uses Keystroke Penalty (50 per mistake)'
      : `(Total Errors / ${(result.totalKeystrokes / 5).toFixed(1)} Words Typed) × 100`;
    // Net WPM formula shown under the card
    const netWpmFormula = isAiims
      ? `(Net Strokes ÷ ${(5 * result.timeInMinutes).toFixed(0)}) — 50 strokes deducted per error`
      : isDelhiPoliceHcm
      ? `Tentative Speed (Gross÷10) − Total Errors`
      : isAllahabadHc
      ? `(Gross Words − Total Errors) ÷ Time`
      : isRrbNtpc
      ? `(Gross Words − Penalty) ÷ Time  [Excess Errors × 10]`
      : isSpmcil
      ? `(Keystrokes/5 − Actual Error) ÷ Time  [${selectedSpmcilCategory === 'Reserved' ? '7%' : '5%'} Allowed]`
      : isBsfHcm
      ? `(Gross Words − Penalty) ÷ Time  [Excess beyond 5% × 10]`
      : isDhcJja || isSupremeCourt
      ? `(Gross Words − Excess × 10) ÷ Time  [3% permissible]`
      : isMpCpct
      ? `(Gross Words − Total Errors) ÷ Time  [Scaled % result]`
      : isSscExam
      ? `(Keystrokes / 5) - (Total Errors)/Time`
      : `(Gross Words − Total Errors) ÷ Time`;
    // Compute qualifying rule text for UR and Other categories
    let urRuleText = 'Error % ≤ 7%';
    let othersRuleText = 'Error % ≤ 10%';

    if (isSscExam) {
      urRuleText = 'Error % ≤ 7%';
      othersRuleText = 'Error % ≤ 10%';
    } else if (isRrbNtpc) {
      const rrbSpd = catConfig.qualifyingSpeed[isHindiTest ? 'hi' : 'en'];
      urRuleText = `Net Speed ≥ ${rrbSpd} WPM (5% Margin, Excess × 10 penalty)`;
      othersRuleText = 'Retype Allowed. Same speed standard.';
    } else if (isAiims) {
      const aiimsSpd = catConfig.qualifyingSpeed[isHindiTest ? 'hi' : 'en'];
      urRuleText = `Net Speed ≥ ${aiimsSpd} WPM (50 Strokes penalty/error)`;
      othersRuleText = 'AIIMS CRE-5 Keystroke Evaluation';
    } else if (isDelhiPoliceHcm) {
      urRuleText = 'Marks > 0 (Speed ≥ 30 WPM en / 25 WPM hi)';
      othersRuleText = 'Max 25 Marks from Actual Speed scale';
    } else if (isAllahabadHc) {
      urRuleText = 'Marks ≥ 25/50 & Speed ≥ 25 WPM';
      othersRuleText = '-0.1 Marks per mistake (Max 50 Marks)';
    } else if (isRssbLdc) {
      urRuleText = 'Marks ≥ 9.0/25 (36% cutoff)';
      othersRuleText = isHindiTest ? '0.0625 Marks/correct word' : '0.05 Marks/correct word';
    } else if (isMpCpct) {
      urRuleText = isHindiTest ? 'Net WPM ≥ 20 = 50% Scaled Score' : 'Net WPM ≥ 30 = 50% Scaled Score';
      othersRuleText = 'Higher NWPM → higher scaled %';
    } else if (isBombayHc) {
      urRuleText = 'Marks ≥ 10.00/20.00 & Net Speed ≥ 40 WPM';
      othersRuleText = 'Max 20.00 Marks (0.25 marks deducted per error)';
    } else if (isBsfHcm) {
      const bsfSpd = catConfig.qualifyingSpeed[isHindiTest ? 'hi' : 'en'];
      urRuleText = `Net Speed ≥ ${bsfSpd} WPM (5% tolerance, Excess × 10)`;
      othersRuleText = 'Same standard across all categories';
    } else if (isSpmcil) {
      const spmSpd = isHindiTest ? 30 : 40;
      urRuleText = `Net Speed ≥ ${spmSpd} WPM (UR: 5% Error Allowed, Direct Deduction)`;
      othersRuleText = `Net Speed ≥ ${spmSpd} WPM (Reserved: 7% Error Allowed, Direct Deduction)`;
    } else if (isDhcJja) {
      urRuleText = 'Speed ≥ 35 WPM & Error ≤ 3% (Special Rounding)';
      othersRuleText = 'Strict 3% permissible | Excess × 10 penalty';
    } else if (isSupremeCourt) {
      urRuleText = 'Speed ≥ 35 WPM & Error % ≤ 3%';
      othersRuleText = 'Excess mistakes penalized × 10 words';
    } else if (isUpPoliceCo) {
      urRuleText = 'Speed ≥ 30 WPM & Accuracy ≥ 85%';
      othersRuleText = '85% Accuracy is strictly mandatory';
    } else if (isUpssscJa) {
      const upSpd = catConfig.qualifyingSpeed[isHindiTest ? 'hi' : 'en'];
      urRuleText = `Net Speed ≥ ${upSpd} WPM & Accuracy ≥ 85%`;
      othersRuleText = 'Min 85% accuracy required';
    } else if (isChandigarhAdmin) {
      urRuleText = 'Net Speed ≥ 35 WPM (All errors = Full Errors)';
      othersRuleText = 'Spacing / Cap / Punct = Full Error here';
    } else if (isPunjabHaryanaHc) {
      const phSpd = isHindiTest ? 25 : 30;
      urRuleText = `Net Speed ≥ ${phSpd} WPM (All errors = Full Errors)`;
      othersRuleText = 'Direct deduction: Net = (Keystrokes/5 − Total Errors) ÷ Time';
    } else if (isDdaSteno) {
      const ddaSpd = isHindiTest ? 35 : 40;
      urRuleText = `Net Speed ≥ ${ddaSpd} WPM (All errors = Full Error)`;
      othersRuleText = 'Direct deduction: Net = (Keystrokes/5 − Errors) ÷ Time';
    } else if (isDpAwoTpo) {
      urRuleText = 'Keystrokes ≥ 1,000 & Accuracy ≥ 85%';
    } else if (isUttrakhandHc) {
      const uhcSpd = isHindiTest ? 25 : 30;
      urRuleText = `Net Speed ≥ ${uhcSpd} WPM`;
      othersRuleText = 'Direct deduction: Net = (Keystrokes/5 − Total Errors) ÷ Time';
    } else {
      const spd = catConfig.qualifyingSpeed[isHindiTest ? 'hi' : 'en'];
      urRuleText = `Net Speed ≥ ${spd} WPM`;
      othersRuleText = `Direct deduction: Net = (Gross − Errors) ÷ Time`;
    }

    return (
      <div className="min-h-screen bg-[#edf2f8] text-slate-800 p-3 sm:p-6 lg:p-8 flex flex-col items-center font-sans">
        <div className="w-full max-w-5xl space-y-6">

          {/* Top Header Bar */}
          <div className="flex items-center justify-between gap-3">
            {isEmbed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-xs">
                <span>🔍 Candidate Result Inspection</span>
              </span>
            ) : (
              <Link
                href={test.categoryId ? `/typing-test/category/${test.categoryId}` : '/typing-test'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isHindi ? 'सभी टाइपिंग टेस्ट्स' : 'Back to Typing Tests'}</span>
              </Link>
            )}

            {/* Center: Mock Test Hub Logo */}
            <div className="flex items-center justify-center shrink-0">
              <Link
                href="/"
                className="flex items-center gap-2 group cursor-pointer hover:opacity-95 transition"
                title={t.backToHome}
              >
                <div className="bg-[#E6F4FE] p-1.5 rounded-full shadow-xs flex items-center justify-center h-8 w-8 border border-blue-200/80 shrink-0 group-hover:border-blue-400 transition">
                  <Trophy className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-black text-xs leading-tight text-slate-900 tracking-wider uppercase group-hover:text-blue-700 transition">
                    {t.logoTitle}
                  </span>
                  <span className="hidden xs:inline text-[7.5px] text-blue-600 font-extrabold tracking-widest uppercase leading-tight">
                    {t.logoSub}
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isEmbed && targetAttemptId && (
                <a
                  href={`/typing-test/${test.id}?attemptId=${targetAttemptId}&view=analysis`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>
              )}
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isHindi ? 'प्रिंट रिपोर्ट' : 'Print / Save PDF'}</span>
              </button>
              {!isEmbed && (
                <button
                  onClick={() => initDemoPhase(test)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'पुनः टेस्ट दें' : 'Retake Test'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Title and Passage Keystrokes Banner */}
          <div className="text-center space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isRrbNtpc
                ? `Typingmitra.in | Typing Test Result(Repetition Allowed): ${cleanDisplayTitle(test.title)}`
                : (isDelhiPoliceHcm || isUpPoliceCo || isDhcJja)
                ? `Typingmitra.in | Typing Test Result: ${cleanDisplayTitle(test.title)}`
                : isDsssbJsa
                ? (isDsssbItAssistant || isDsssbSteno
                    ? `Typing Test Result: ${cleanDisplayTitle(test.title)}`
                    : `Typingmitra.in | Typing Test Result: ${cleanDisplayTitle(test.title)}`)
                : (isCbseSuperintendentTest || catConfig.key === 'cbse-superintendent' || cleanDisplayTitle(test.title).toLowerCase().includes('cbse'))
                ? `Typing Test Result: ${cleanDisplayTitle(test.title)}`
                : isCbseJsa
                ? `Typing Test Result: CBSE JSA (${cleanDisplayTitle(test.title)})`
                : (isKvsOrEmrsOrNvs || isCsirJsa || isCsirFormula || isUpssscJa || isDdaJsa || isDdaSteno || isCcrasLdcUdc || isRssbLdc || isMpCpct || isAllahabadHc || isUttrakhandHc)
                ? `Typing Test Result: ${cleanDisplayTitle(test.title)}`
                : `Typingmitra | Typing Test Result: ${cleanDisplayTitle(test.title)}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {isUpPoliceCo
                ? `Total Words Available in Passage: ${result.totalWordsInMasterPassage || 500}`
                : isCsirFormula
                ? `Total Keystrokes in Passage: ${csirPassageKeystrokes} (${csirPassageWords} Words)`
                : (isAiims || isRrbNtpc || isDsssbJsa || isKvsOrEmrsOrNvs || isCsirJsa || isCbseJsa || isUpssscJa || isDelhiPoliceHcm || isDdaJsa || isDdaSteno || isCcrasLdcUdc || isRssbLdc || isMpCpct || isAllahabadHc || isUttrakhandHc || isDhcJja || isChandigarhAdmin || isPunjabHaryanaHc)
                ? `Total Keystrokes Typed: ${result.totalKeystrokes}`
                : `Total Keystrokes in Passage: ${totalKeystrokesInPassage}`}
            </p>

            {/* Candidate & Sitting Details Banner */}
            {loadedCandidate ? (
              <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center shrink-0">
                    👤
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {loadedCandidate.fullName || loadedCandidate.userName || 'Candidate Attempt'}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isQualified
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-100 text-rose-700 border border-rose-200'
                      }`}>
                        {isQualified ? 'QUALIFIED' : 'NOT QUALIFIED'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium flex-wrap mt-0.5">
                      {loadedCandidate.email && <span>{loadedCandidate.email} •</span>}
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">
                        ID: {loadedCandidate.candidateCode || 'GUEST'}
                      </span>
                      {loadedCandidate.mobile && <span>• 📞 {loadedCandidate.mobile}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right text-[11px] text-slate-500">
                  <p className="font-medium">
                    Attempt Sitting:{' '}
                    <span className="font-bold text-slate-800">
                      {loadedAttemptMeta?.completedAt
                        ? new Date(loadedAttemptMeta.completedAt).toLocaleString('en-IN')
                        : 'Recent Sitting'}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Duration: {formattedDuration} • Category: {cleanDisplayTitle(test.title)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-semibold shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Test result saved successfully!
                </span>
              </div>
            )}
          </div>

          {/* RTI 5% Rule Toggle for DSSSB JSA only (TypingMitra does not show on IT Assistant or Stenographer) */}
          {isDsssbJsa && !isDsssbItAssistant && !isDsssbSteno && (
            <div className="bg-white rounded-xl p-3.5 px-4 shadow-sm border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs sm:text-sm">
                <span className="text-base">⚖️</span>
                <span>According to RTI 5% Error Allowed Rule</span>
              </div>
              <button
                type="button"
                onClick={() => setUseRti5PercentRule(!useRti5PercentRule)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  useRti5PercentRule ? 'bg-[#2563eb]' : 'bg-slate-300'
                }`}
                title="Toggle RTI 5% Error Allowed Rule"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    useRti5PercentRule ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* RSSB LDC Purple Marks Banner (Exact Replica of TypingMitra) */}
          {isRssbLdc && (() => {
            const rssbMarks = catEval.marksObtained ?? 0;
            const rssbWordsTyped = result.alignedTypedWords ? result.alignedTypedWords.length : Math.round(result.totalWordsTyped);
            const rssbCorrectWords = Math.max(0, rssbWordsTyped - result.totalMistakes);
            const rssbPassed = rssbMarks >= 9;
            return (
              <div className="bg-[#5b54d6] text-white rounded-xl p-5 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white/90">Marks Obtained</div>
                  <div className="text-4xl font-black tracking-tight mt-0.5 font-mono">
                    {rssbMarks.toFixed(2)} / 25
                  </div>
                  <div className="text-xs text-white/80 mt-1 flex items-center gap-1.5 font-medium">
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                    <span>Correct Words: {rssbCorrectWords} / {isHindiTest ? 400 : 500} ({isHindiTest ? '0.0625' : '0.05'} marks per word)</span>
                  </div>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1.5">
                  <div className="text-xs font-semibold text-white/80">Passing Marks: 9</div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    rssbPassed ? 'bg-[#10b981] text-white' : 'bg-[#ef4444] text-white'
                  }`}>
                    {rssbPassed ? '✓ PASSED' : '✕ FAILED'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* 12-Card Grid (Exact Replica of TypingMitra) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isAiims ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.fullMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Half Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black text-[11px]">
                      ▲
                    </span>
                    <span>Half Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.halfMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Spacing, capitalization, punctuation, transposition, paragraphic, tab errors
                  </p>
                </div>

                {/* Card 3: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      👥
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-[#6366f1] font-mono">
                    {result.totalMistakes.toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors + Half Errors/2
                  </p>
                </div>

                {/* Card 4: Penalty */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      −
                    </span>
                    <span>Penalty</span>
                  </div>
                  <div className="text-3xl font-black text-red-600 font-mono">
                    {result.aiimsPenaltyStrokes?.toFixed(0) ?? (result.totalMistakes * 50).toFixed(0)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors × 50 Keystrokes
                  </p>
                </div>

                {/* Card 5: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalWordsTyped > 0
                      ? `${((result.totalMistakes / result.totalWordsTyped) * 100).toFixed(2)}%`
                      : `${result.errorPercentage.toFixed(2)}%`}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 6: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 7: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 8: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🔤
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(result.totalKeystrokes / 5).toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 9: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(result.aiimsGrossWpm ?? result.grossWpm).toFixed(1)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 10: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-[#2563eb] font-mono">
                    {(result.aiimsNetWpm ?? result.netWpm).toFixed(1)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    ((Keystrokes - Penalty) / 5) / Time (min)
                  </p>
                </div>

                {/* Card 11: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.accuracyPercentage.toFixed(0)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 12: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time
                  </p>
                </div>
              </>
            ) : isRrbNtpc ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.fullMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Half Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Half Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.halfMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Spacing, capitalization, punctuation, transposition, paragraphic, tab, extra space errors
                  </p>
                </div>

                {/* Card 3: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      👥
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-[#6366f1] font-mono">
                    {result.totalMistakes.toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors + Half Errors/2
                  </p>
                </div>

                {/* Card 4: Ignorable Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-[11px]">
                      🛡️
                    </span>
                    <span>Ignorable Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(result.ignorableMistakes ?? (0.05 * result.totalKeystrokes / 5)).toFixed(2)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    5% of (Total Keystrokes Typed / 5)
                  </p>
                </div>

                {/* Card 5: Penalty */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      −
                    </span>
                    <span>Penalty</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(result.penalty ?? Math.max(0, (result.totalMistakes - (result.ignorableMistakes ?? (0.05 * result.totalKeystrokes / 5))) * 10)).toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Total Errors - Ignorable Errors) × 10
                  </p>
                </div>

                {/* Card 6: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.errorPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 7: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 8: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 9: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🔤
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(result.totalKeystrokes / 5).toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 10: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {Math.round(result.grossWpm)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 11: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {Math.round(result.netWpm)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    ((Keystrokes/5 - Penalty) / Time (min)
                  </p>
                </div>

                {/* Card 12: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.accuracyPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 13: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time
                  </p>
                </div>

                {/* Card 14: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-2 text-white ${
                  isQualified ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {isQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ {isHindiTest ? 25 : 30}
                  </p>
                </div>
              </>
            ) : isDsssbJsa ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {dsssbTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      👾
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {dsssbTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors (In DSSSB all errors are counted as full error)
                  </p>
                </div>

                {/* Card 3: Penalty */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      ⛔
                    </span>
                    <span>Penalty</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {dsssbPenalty}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {useRti5PercentRule ? 'Waived under RTI 5% rule' : '(Total Errors) × 2 (Ek Wrong per 2 words ki penalty lagti hai)'}
                  </p>
                </div>

                {/* Card 4: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.errorPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 5: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 6: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 7: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📝
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(result.totalKeystrokes / 5).toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 8: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.grossWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 9: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {dsssbNetWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {useRti5PercentRule ? '((Keystrokes/5) - Total Errors) / Time' : '((Keystrokes/5 - Penalty) / Time (min)'}
                  </p>
                </div>

                {/* Card 10: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {dsssbAccuracy.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 11: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 12: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-2 text-white ${
                  dsssbQualified ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {dsssbQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    {useRti5PercentRule ? `Error % ≤ 5% & Net WPM ≥ ${dsssbRequiredSpeed}` : `Net WPM ≥ ${dsssbRequiredSpeed}`}
                  </p>
                </div>
              </>
            ) : (isKvsOrEmrsOrNvs || isCbseJsa) ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {isCbseJsa ? cbseTotalErrors : kvsTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      👾
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {isCbseJsa ? cbseTotalErrors : kvsTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors (All errors are counted as full error)
                  </p>
                </div>

                {/* Card 3: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(isCbseJsa ? cbseErrorPercentage : result.errorPercentage).toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 4: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 5: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 6: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📝
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(isCbseJsa ? cbseWordsTyped : (result.totalKeystrokes / 5)).toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 7: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.grossWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 8: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(isCbseJsa ? cbseNetWpm : kvsNetWpm).toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    ((Keystrokes/5 - Error) / Time (min)
                  </p>
                </div>

                {/* Card 9: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(isCbseJsa ? cbseAccuracy : kvsAccuracy).toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 10: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 11: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-2 text-white ${
                  (isCbseJsa ? cbseQualified : kvsQualified) ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {(isCbseJsa ? cbseQualified : kvsQualified) ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ {isCbseJsa ? cbseRequiredSpeed : kvsRequiredSpeed}
                  </p>
                </div>
              </>
            ) : isCsirFormula ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {csirFormulaFullErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Omissions, additions, substitutions, spelling
                  </p>
                </div>

                {/* Card 2: Half Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[11px]">
                      ▲
                    </span>
                    <span>Half Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {csirFormulaHalfErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Spacing, capitalization, punctuation, paragraphic
                  </p>
                </div>

                {/* Card 3: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      👾
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {csirFormulaTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors + (Half Errors / 2)
                  </p>
                </div>

                {/* Card 4: Ignorable Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-[11px]">
                      🛡️
                    </span>
                    <span>Ignorable Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {csirFormulaIgnorable.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    5% of Total Words in Passage
                  </p>
                </div>

                {/* Card 5: Actual Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Actual Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {csirFormulaActualErrors.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors - Ignorable Errors
                  </p>
                </div>

                {/* Card 6: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {csirFormulaErrorPct.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words in Passage × 100
                  </p>
                </div>

                {/* Card 7: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces, tabs
                  </p>
                </div>

                {/* Card 8: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 9: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📝
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {csirFormulaWordsTyped.toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 10: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {csirFormulaGrossWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 11: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {csirFormulaNetWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    ((Keystrokes / 5) / Time (min)) - Actual Errors
                  </p>
                </div>

                {/* Card 12: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {csirFormulaAccuracy.toFixed(1)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 13: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 14: Qualification Status */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-2 text-white ${
                  csirFormulaQualified ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification Status</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {csirFormulaQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ {csirFormulaRequiredSpeed}
                  </p>
                </div>
              </>
            ) : isUpssscJa ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.fullMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Half Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[11px]">
                      ▲
                    </span>
                    <span>Half Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.halfMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Spacing, capitalization, punctuation, transposition, paragraphic, tabs
                  </p>
                </div>

                {/* Card 3: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      👾
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {upssscTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors + (Half Errors / 2)
                  </p>
                </div>

                {/* Card 4: Ignorable Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-[11px]">
                      🛡️
                    </span>
                    <span>Ignorable Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {upssscIgnorable}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    First 5 errors
                  </p>
                </div>

                {/* Card 5: Penalty */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      ⛔
                    </span>
                    <span>Penalty</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {upssscPenalty}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Total Errors - Ignorable Errors) ×5
                  </p>
                </div>

                {/* Card 6: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {upssscErrorPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 7: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 8: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 9: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📝
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {upssscWordsTyped.toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 10: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {upssscGrossWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 11: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {upssscNetWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Words Typed - Penalty) / Time (min)
                  </p>
                </div>

                {/* Card 12: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {upssscAccuracy.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 13: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 14: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-2 text-white ${
                  upssscQualified ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {upssscQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ {upssscRequiredSpeed}
                  </p>
                </div>
              </>
            ) : isDelhiPoliceHcm ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.fullMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      👾
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-[#6366f1] font-mono">
                    {result.fullMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors (In DP HCM all errors are counted as full error)
                  </p>
                </div>

                {/* Card 3: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-red-600 font-mono">
                    {((result.fullMistakes / Math.max(1, result.totalKeystrokes / 5)) * 100).toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 4: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 5: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 6: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📐
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(result.totalKeystrokes / 5).toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 7: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.grossWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 8: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-[#2563eb] font-mono">
                    {result.netWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Keystrokes/5 / Time (min)- Total Errors
                  </p>
                </div>

                {/* Card 9: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.accuracyPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 10: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 11: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 text-white ${
                  isQualified ? 'bg-[#059669]' : 'bg-[#dc2626]'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-3xl font-black tracking-tight">
                    {isQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ {isHindiTest ? 25 : 30}
                  </p>
                </div>

                {/* Card 12: Marks Obtained */}
                <div className="bg-[#4f46e5] text-white rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>⭐</span>
                    <span>Marks Obtained</span>
                  </div>
                  <div className="text-3xl font-black tracking-tight font-mono">
                    {catEval.marksObtained ?? 0}
                  </div>
                  <p className="text-[10px] text-white/90 font-medium leading-tight">
                    Based on Net WPM Score<br/>
                    ≤30:10 | 31-35:12 | 36-40:15 | 41-45:18 | 46-50:21 | &gt;50:25
                  </p>
                </div>
              </>
            ) : isDdaJsa ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.fullMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      ⚙️
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors (In DSSSB all errors are counted as full error)
                  </p>
                </div>

                {/* Card 3: Penalty */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      ➖
                    </span>
                    <span>Penalty</span>
                  </div>
                  <div className="text-3xl font-black text-red-600 font-mono">
                    {catEval.penaltyWords ?? (result.fullMistakes * 10)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Total Errors) × 10
                  </p>
                </div>

                {/* Card 4: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-red-600 font-mono">
                    {result.errorPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 5: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 6: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 7: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📐
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(result.totalKeystrokes / 5).toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 8: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.grossWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 9: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-[#2563eb] font-mono">
                    {result.netWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes/5 - Penalty) / Time (min)
                  </p>
                </div>

                {/* Card 10: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.accuracyPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 11: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 12: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 text-white ${
                  isQualified ? 'bg-[#059669]' : 'bg-[#dc2626]'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-3xl font-black tracking-tight">
                    {isQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ {isHindiTest ? 30 : 35}
                  </p>
                </div>
              </>
            ) : isDdaSteno ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {ddaStenoTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      ⚙️
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {ddaStenoTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors (In DSSSB all errors are counted as full error)
                  </p>
                </div>

                {/* Card 3: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-red-600 font-mono">
                    {ddaStenoErrorPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 4: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 5: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 6: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📐
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {ddaStenoWordsTyped.toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 7: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.grossWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 8: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-[#2563eb] font-mono">
                    {ddaStenoNetWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    ((Keystrokes/5 - Error) / Time (min))
                  </p>
                </div>

                {/* Card 9: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {ddaStenoAccuracy.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 10: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 11: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 text-white sm:col-span-2 lg:col-span-2 ${
                  ddaStenoQualified ? 'bg-[#059669]' : 'bg-[#dc2626]'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-3xl font-black tracking-tight">
                    {ddaStenoQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ {ddaStenoRequiredSpeed}
                  </p>
                </div>
              </>
            ) : isMpCpct ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {mpCpctTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      ⚙️
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {mpCpctTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors (In MP CPCT all errors are counted as full error)
                  </p>
                </div>

                {/* Card 3: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-red-600 font-mono">
                    {mpCpctErrorPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 4: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 5: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 6: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📐
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {mpCpctWordsTyped.toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 7: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.grossWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 8: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-[#2563eb] font-mono">
                    {mpCpctNetWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    ((Keystrokes/5 - Error) / Time (min)
                  </p>
                </div>

                {/* Card 9: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {mpCpctAccuracy.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 10: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 11: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 text-white sm:col-span-2 lg:col-span-2 ${
                  mpCpctQualified ? 'bg-[#059669]' : 'bg-[#dc2626]'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-3xl font-black tracking-tight">
                    {mpCpctQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ {mpCpctRequiredSpeed} {mpCpctScaledScore > 0 ? `(${mpCpctScaledScore}% Scaled Score)` : ''}
                  </p>
                </div>
              </>
            ) : isDhcJja ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {dhcTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Every Error will be counted as full error
                  </p>
                </div>

                {/* Card 2: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      ⚙️
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {dhcTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Substitutions, spelling, repetitions, incomplete words, punctuation, spacing, capitalization
                  </p>
                </div>

                {/* Card 3: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {dhcWordsTyped.toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 4: Ignorable Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-[11px]">
                      🛡️
                    </span>
                    <span>Ignorable Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {dhcIgnorableRounded.toFixed(1)}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight space-y-0.5">
                    <div>Actually Happened: {dhcIgnorableRaw.toFixed(2)} | Rounded Off: {dhcIgnorableRounded.toFixed(1)}</div>
                    <div className="text-slate-500 font-medium">3% of (Total Words Typed)</div>
                  </div>
                </div>

                {/* Card 5: Actual Error */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black text-[11px]">
                      📈
                    </span>
                    <span>Actual Error</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {dhcActualError.toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors - Ignorable Errors
                  </p>
                </div>

                {/* Card 6: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-red-600 font-mono">
                    {dhcErrorPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 7: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 8: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 9: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {dhcGrossWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 10: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-[#2563eb] font-mono">
                    {dhcNetWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    ((Keystrokes/5 - Actual Error) / Time (min)
                  </p>
                </div>

                {/* Card 11: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {dhcAccuracy.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 12: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time
                  </p>
                </div>

                {/* Card 13: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 text-white ${
                  dhcQualified ? 'bg-[#059669]' : 'bg-[#dc2626]'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-3xl font-black tracking-tight">
                    {dhcQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ 35
                  </p>
                </div>
              </>
            ) : isAllahabadHc ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {ahcTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      ⚙️
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {ahcTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors (All errors are counted as full error)
                  </p>
                </div>

                {/* Card 3: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-red-600 font-mono">
                    {ahcErrorPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 4: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 5: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 6: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📐
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {ahcWordsTyped}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Actual words typed (space-separated)
                  </p>
                </div>

                {/* Card 7: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {ahcGrossWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 8: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-[#2563eb] font-mono">
                    {Number.isInteger(ahcNetWpm) ? ahcNetWpm : ahcNetWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    ((Keystrokes/5 - Error) / Time (min))
                  </p>
                </div>

                {/* Card 9: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {ahcAccuracy.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 10: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 11: Total Marks Obtained */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black text-[11px]">
                      ⭐
                    </span>
                    <span>Total Marks Obtained</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {ahcMarks.toFixed(2)} / 50
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight space-y-0.5">
                    <div>0.10 marks per correct word (Max 50)</div>
                    <div className="text-slate-500 font-medium">Correct words: {ahcCorrectWords}</div>
                  </div>
                </div>

                {/* Card 12: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 text-white ${
                  ahcQualified ? 'bg-[#059669]' : 'bg-[#dc2626]'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-3xl font-black tracking-tight">
                    {ahcQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ 25 AND Marks ≥ 25
                  </p>
                </div>
              </>
            ) : isCcrasLdcUdc ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.fullMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      ⚙️
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors
                  </p>
                </div>

                {/* Card 3: Ignorable Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-[11px]">
                      🛡️
                    </span>
                    <span>Ignorable Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(result.ignorableMistakes ?? ((result.totalKeystrokes / 5) * 0.05)).toFixed(2)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    5% of (Total Keystrokes Typed / 5)
                  </p>
                </div>

                {/* Card 4: Penalty */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      ➖
                    </span>
                    <span>Penalty</span>
                  </div>
                  <div className="text-3xl font-black text-red-600 font-mono">
                    {catEval.penaltyWords ?? Math.max(0, Math.round((result.totalMistakes - ((result.totalKeystrokes / 5) * 0.05)) * 10 * 100) / 100)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Total Errors - Ignorable Errors) × 10
                  </p>
                </div>

                {/* Card 5: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-red-600 font-mono">
                    {result.errorPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 6: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 7: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 8: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📐
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(result.totalKeystrokes / 5).toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 9: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.grossWpm.toFixed(0)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 10: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-[#2563eb] font-mono">
                    {result.netWpm.toFixed(0)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    ((Keystrokes/5 - Penalty) / Time (min))
                  </p>
                </div>

                {/* Card 11: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.accuracyPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 12: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 13: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 text-white ${
                  isQualified ? 'bg-[#059669]' : 'bg-[#dc2626]'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-3xl font-black tracking-tight">
                    {isQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ {isHindiTest ? 30 : 35}
                  </p>
                </div>
              </>
            ) : isRssbLdc ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.fullMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, substitutions, spelling, repetitions, incomplete words (omissions are not counted)
                  </p>
                </div>

                {/* Card 2: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      ⚙️
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors Combining all types of full errors
                  </p>
                </div>

                {/* Card 3: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-red-600 font-mono">
                    {result.errorPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 4: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 5: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 6: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📐
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.alignedTypedWords ? result.alignedTypedWords.length : Math.round(result.totalWordsTyped)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Words separated by space in typed text
                  </p>
                </div>

                {/* Card 7: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.grossWpm.toFixed(0)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Words Typed / Time (min)
                  </p>
                </div>

                {/* Card 8: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-[#2563eb] font-mono">
                    {result.netWpm.toFixed(0)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Words Typed - Total Errors) / Time (min)
                  </p>
                </div>

                {/* Card 9: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.accuracyPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Words Typed - Total Errors) / Words Typed × 100
                  </p>
                </div>

                {/* Card 10: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 11: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 text-white ${
                  (catEval.marksObtained ?? 0) >= 9 ? 'bg-[#059669]' : 'bg-[#dc2626]'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-3xl font-black tracking-tight">
                    {(catEval.marksObtained ?? 0) >= 9 ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Marks ≥ 9
                  </p>
                </div>
              </>
            ) : isUpPoliceCo ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.fullMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Half Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Half Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.halfMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Spacing, capitalization, punctuation, transposition, paragraphic, tab errors
                  </p>
                </div>

                {/* Card 3: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      👾
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors + Half Errors/2
                  </p>
                </div>

                {/* Card 4: Total Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📐
                    </span>
                    <span>Total Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.alignedTypedWords ? result.alignedTypedWords.length : Math.round(result.totalWordsTyped)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Words separated by space in typed text
                  </p>
                </div>

                {/* Card 5: Correct Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-[11px]">
                      ✓
                    </span>
                    <span>Correct Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {Math.max(0, (result.alignedTypedWords ? result.alignedTypedWords.length : Math.round(result.totalWordsTyped)) - result.totalMistakes)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Words Typed − Total Errors
                  </p>
                </div>

                {/* Card 6: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 7: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.grossWpm.toFixed(1)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Words Typed / Time (min)
                  </p>
                </div>

                {/* Card 8: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-[#2563eb] font-mono">
                    {result.netWpm.toFixed(1)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Total Words Typed - Total Errors) / Time (min)
                  </p>
                </div>

                {/* Card 9: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.accuracyPercentage.toFixed(1)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Correct Words Typed / Total Words Available in Passage) × 100
                  </p>
                </div>

                {/* Card 10: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 11: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 text-white ${
                  isQualified ? 'bg-[#059669]' : 'bg-[#dc2626]'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-3xl font-black tracking-tight">
                    {isQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ {isHindiTest ? 25 : 30} AND Accuracy ≥ 85%
                  </p>
                </div>
              </>
            ) : (isBsfHcm || isCsirJsa) ? (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {isBsfHcm ? bsfTotalErrors : csirTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Additions, omissions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      👾
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {isBsfHcm ? bsfTotalErrors : csirTotalErrors}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors
                  </p>
                </div>

                {/* Card 3: Ignorable Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-[11px]">
                      👁️
                    </span>
                    <span>Ignorable Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(isBsfHcm ? bsfIgnorable : csirIgnorable).toFixed(2)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    5% of (Total Keystrokes Typed / 5)
                  </p>
                </div>

                {/* Card 4: Penalty */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      ⛔
                    </span>
                    <span>Penalty</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {isBsfHcm ? bsfPenalty : csirPenalty}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Total Errors - Ignorable Errors) × 10
                  </p>
                </div>

                {/* Card 5: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(isBsfHcm ? bsfErrorPercentage : result.errorPercentage).toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Errors / Total Words Typed × 100
                  </p>
                </div>

                {/* Card 6: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 7: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 8: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      📝
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(isBsfHcm ? bsfWordsTyped : csirWordsTyped).toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 9: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(isBsfHcm ? bsfGrossWpm : result.grossWpm).toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 10: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(isBsfHcm ? bsfNetWpm : csirNetWpm).toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    ((Keystrokes/5 - Penalty) / Time (min))
                  </p>
                </div>

                {/* Card 11: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(isBsfHcm ? bsfAccuracy : csirAccuracy).toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 12: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 13: Qualification */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-2 text-white ${
                  (isBsfHcm ? bsfQualified : csirQualified) ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🎖️</span>
                    <span>Qualification</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {(isBsfHcm ? bsfQualified : csirQualified) ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    Net WPM ≥ {isBsfHcm ? bsfRequiredSpeed : csirRequiredSpeed}
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Card 1: Full Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      !
                    </span>
                    <span>Full Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.fullMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Omissions, additions, substitutions, spelling, repetitions, incomplete words
                  </p>
                </div>

                {/* Card 2: Half Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black text-[11px]">
                      ▲
                    </span>
                    <span>Half Errors</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.halfMistakes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Spacing, capitalization, punctuation, transposition, paragraphic
                  </p>
                </div>

                {/* Card 3: Total Errors */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-[11px]">
                      👥
                    </span>
                    <span>Total Errors</span>
                  </div>
                  <div className="text-3xl font-black text-[#6366f1] font-mono">
                    {result.totalMistakes.toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full Errors + (Half Errors / 2)
                  </p>
                </div>

                {/* Card 4: Error Percentage */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-[11px]">
                      %
                    </span>
                    <span>Error Percentage</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.errorPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {errorPctFormula}
                  </p>
                </div>

                {/* Card 5: Keystrokes Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌨️
                    </span>
                    <span>Keystrokes Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.totalKeystrokes}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Letters, numbers, punctuation, spaces
                  </p>
                </div>

                {/* Card 6: Backspace Pressed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⌫
                    </span>
                    <span>Backspace Pressed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {backspaceCount}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Number of backspace key presses
                  </p>
                </div>

                {/* Card 7: Words Typed */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🔤
                    </span>
                    <span>Words Typed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {(result.totalKeystrokes / 5).toFixed(1)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Total Keystrokes Typed / 5
                  </p>
                </div>

                {/* Card 8: Gross WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⏱️
                    </span>
                    <span>Gross WPM</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.grossWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Keystrokes Typed / 5) / Time (min)
                  </p>
                </div>

                {/* Card 9: Net WPM */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      ⚡
                    </span>
                    <span>Net WPM</span>
                  </div>
                  <div className="text-3xl font-black text-[#2563eb] font-mono">
                    {result.netWpm.toFixed(2)} WPM
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {netWpmFormula}
                  </p>
                </div>

                {/* Card 10: Accuracy */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🎯
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.accuracyPercentage.toFixed(2)}%
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    (Net WPM / Gross WPM) × 100
                  </p>
                </div>

                {/* Card 11: Test Duration */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                      🕒
                    </span>
                    <span>Test Duration</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {formattedDuration}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Time taken for the test
                  </p>
                </div>

                {/* Card 12: Primary UR Qualification Banner Card */}
                <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-2 transition-all ${
                  isSscExam
                    ? result.errorPercentage <= 7
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 text-white'
                    : isQualified 
                    ? 'bg-gradient-to-br from-[#10b981] to-[#047857] text-white' 
                    : 'bg-gradient-to-br from-[#ef4444] to-[#b91c1c] text-white'
                }`}>
                  <div className="flex items-center gap-1.5 text-white/95 font-bold text-xs">
                    <span>🎖️</span>
                    <span>{isUttrakhandHc ? 'Qualification' : 'UR Qualification'}</span>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {isSscExam
                      ? result.errorPercentage <= 7 ? 'Qualified' : 'Not Qualified'
                      : isQualified ? 'Qualified' : 'Not Qualified'}
                  </div>
                  <p className="text-[11px] text-white/90 font-medium leading-tight">
                    {urRuleText}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Dedicated Qualification Card for AIIMS CRE (Matching TypingMitra) */}
          {isAiims && (
            <div className="flex justify-start">
              <div className={`rounded-xl p-4 shadow-sm w-full sm:w-64 flex flex-col justify-between space-y-2 text-white ${
                isQualified ? 'bg-emerald-600' : 'bg-red-600'
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span>🎖️</span>
                  <span>Qualification</span>
                </div>
                <div className="text-2xl font-black tracking-tight">
                  {isQualified ? 'Qualified' : 'Not Qualified'}
                </div>
                <p className="text-[11.5px] text-white/95 font-medium leading-tight">
                  Net WPM ≥ {test.language === 'hi' ? 30 : 35}
                </p>
              </div>
            </div>
          )}

          {/* Dedicated Qualification Card for SSC Exams (Others) (Matching TypingMitra) */}
          {isSscExam && (
            <div className="flex justify-start">
              <div className={`rounded-xl p-4 shadow-sm w-full sm:w-64 flex flex-col justify-between space-y-2 text-white ${
                result.errorPercentage <= 10 ? 'bg-emerald-600' : 'bg-red-600'
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span>🎖️</span>
                  <span>Others</span>
                </div>
                <div className="text-2xl font-black tracking-tight">
                  {result.errorPercentage <= 10 ? 'Qualified' : 'Not Qualified'}
                </div>
                <p className="text-[11.5px] text-white/95 font-medium leading-tight">
                  Error % ≤ 10%
                </p>
              </div>
            </div>
          )}

          {/* ── MARKS-BASED EXAM PANEL (Allahabad HC, RSSB LDC, Delhi Police HCM, Bombay HC) ── */}
          {isMarksExam && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span>🎖️</span>
                <span>{catConfig.name} — Official Marks Scoring</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">Marks Obtained</div>
                  <div className="text-2xl font-black text-emerald-700 font-mono">{catEval.marksObtained?.toFixed(2) ?? '0.00'}</div>
                  <div className="text-[10px] text-slate-500">out of {isAllahabadHc ? 50 : isDelhiPoliceHcm || isRssbLdc ? 25 : 20}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">Qualifying Marks</div>
                  <div className="text-2xl font-black text-blue-700 font-mono">{isAllahabadHc ? '25.0' : isRssbLdc ? '9.0' : isDelhiPoliceHcm ? '>0' : '10.0'}</div>
                  <div className="text-[10px] text-slate-500">minimum to pass</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">Net Speed</div>
                  <div className="text-2xl font-black text-slate-800 font-mono">{result.netWpm.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500">WPM</div>
                </div>
                <div className={`p-3 rounded-lg border text-center ${isQualified ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="text-[10px] text-slate-500 mb-1">Result</div>
                  <div className={`text-lg font-black ${isQualified ? 'text-emerald-700' : 'text-red-600'}`}>
                    {isQualified ? 'QUALIFIED ✅' : 'NOT QUALIFIED ❌'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-tight">{catEval.qualificationReason?.slice(0, 60)}</div>
                </div>
              </div>
              {isDelhiPoliceHcm && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-purple-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>🎖️</span>
                      <span>Delhi Police HCM Official 25-Marks Scorecard (Added to Final Merit List)</span>
                    </span>
                    <span className="text-[11px] font-normal text-purple-700">
                      Actual Speed: <strong className="font-mono">{result.netWpm.toFixed(2)} WPM</strong> ({isHindiTest ? 'Hindi' : 'English'})
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-purple-200 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-purple-100 text-purple-950 font-bold border-b border-purple-200">
                        <tr>
                          <th className="py-2 px-3">English Speed</th>
                          <th className="py-2 px-3">Hindi Speed</th>
                          <th className="py-2 px-3 text-center">Marks Awarded</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Your Attainment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100 font-sans">
                        {[
                          { en: '< 30 WPM', hi: '< 25 WPM', marks: 0, status: 'Not Qualified', desc: 'Below Minimum Qualifying Speed', isCurrent: result.netWpm < (isHindiTest ? 25 : 30) },
                          { en: '= 30 WPM', hi: '= 25 WPM', marks: 10, status: 'Qualified', desc: 'Minimum Qualifying Standard', isCurrent: result.netWpm === (isHindiTest ? 25 : 30) },
                          { en: '31 – 35 WPM', hi: '26 – 30 WPM', marks: 12, status: 'Qualified', desc: 'Merit Tier 2', isCurrent: result.netWpm > (isHindiTest ? 25 : 30) && result.netWpm <= (isHindiTest ? 30 : 35) },
                          { en: '36 – 40 WPM', hi: '31 – 35 WPM', marks: 15, status: 'Qualified', desc: 'Merit Tier 3', isCurrent: result.netWpm > (isHindiTest ? 30 : 35) && result.netWpm <= (isHindiTest ? 35 : 40) },
                          { en: '41 – 45 WPM', hi: '36 – 40 WPM', marks: 18, status: 'Qualified', desc: 'Merit Tier 4', isCurrent: result.netWpm > (isHindiTest ? 35 : 40) && result.netWpm <= (isHindiTest ? 40 : 45) },
                          { en: '46 – 50 WPM', hi: '41 – 45 WPM', marks: 21, status: 'Qualified', desc: 'Merit Tier 5', isCurrent: result.netWpm > (isHindiTest ? 40 : 45) && result.netWpm <= (isHindiTest ? 45 : 50) },
                          { en: '> 50 WPM', hi: '> 45 WPM', marks: 25, status: 'Qualified', desc: 'Maximum 25 Marks (Top Merit Tier)', isCurrent: result.netWpm > (isHindiTest ? 45 : 50) },
                        ].map((tier, idx) => (
                          <tr
                            key={idx}
                            className={`transition ${
                              tier.isCurrent
                                ? 'bg-purple-600 text-white font-bold shadow-xs'
                                : idx % 2 === 0 ? 'bg-white text-slate-800' : 'bg-purple-50/40 text-slate-800'
                            }`}
                          >
                            <td className="py-2 px-3">{tier.en}</td>
                            <td className="py-2 px-3">{tier.hi}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold">{tier.marks} / 25</td>
                            <td className="py-2 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                tier.isCurrent
                                  ? 'bg-white text-purple-900'
                                  : tier.marks > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {tier.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              {tier.isCurrent ? (
                                <span className="inline-flex items-center gap-1 bg-yellow-300 text-yellow-950 px-2 py-0.5 rounded text-[11px] font-black shadow-xs animate-pulse">
                                  ⭐ YOUR TIER ({tier.marks} Marks)
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-normal">{tier.desc}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1">
                    <div>
                      • <strong>Speed Calculation:</strong> Tentative Speed = Gross Words ÷ 10 = <strong>{result.grossWpm.toFixed(2)} WPM</strong>.
                      Mistake Deductions (−1.0 WPM each) = <strong>−{result.fullMistakes} WPM</strong>.
                      Actual Speed = <strong>{result.netWpm.toFixed(2)} WPM</strong>.
                    </div>
                    <div>
                      • <strong>Official Merit Rule:</strong> Minimum <strong>30 WPM</strong> (English) or <strong>25 WPM</strong> (Hindi) is mandatory to qualify. All scored marks (up to 25) are directly added to the final selection merit list.
                    </div>
                  </div>
                </div>
              )}

              {isBombayHc && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-indigo-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>⚖️</span>
                      <span>High Court of Bombay Clerk Official 20-Marks Scoring Scheme</span>
                    </span>
                    <span className="text-[11px] font-normal text-indigo-700">
                      Cutoff: <strong>10.0 Marks (50%) &amp; 40 WPM</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                      <div className="text-slate-500 text-[10px]">Total Mistakes (All Full)</div>
                      <div className="text-lg font-black text-slate-800 font-mono">{result.fullMistakes}</div>
                    </div>
                    <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                      <div className="text-slate-500 text-[10px]">Mistake Penalty (0.25 marks / error)</div>
                      <div className="text-lg font-black text-rose-600 font-mono">−{(result.fullMistakes * 0.25).toFixed(2)} Marks</div>
                    </div>
                    <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                      <div className="text-slate-500 text-[10px]">Marks Awarded (Max 20.00)</div>
                      <div className={`text-lg font-black font-mono ${(catEval.marksObtained ?? 0) >= 10 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {(catEval.marksObtained ?? Math.max(0, 20 - (result.fullMistakes * 0.25))).toFixed(2)} / 20.00
                      </div>
                    </div>
                    <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                      <div className="text-slate-500 text-[10px]">Net Speed (Min: 40 WPM)</div>
                      <div className={`text-lg font-black font-mono ${result.netWpm >= 40 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {result.netWpm.toFixed(2)} WPM
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-indigo-50/70 border border-indigo-200 rounded-lg p-2.5 space-y-1">
                    <div>
                      • <strong>Official Evaluation Scheme:</strong> 0.25 Marks deducted for each mistake (1 Mark per 4 mistakes). Maximum marks = <strong>20.00</strong>. Minimum qualifying score = <strong>10.00 Marks (50%)</strong>.
                    </div>
                    <div>
                      • <strong>Official Speed Rule:</strong> Candidate must type at or above <strong>40 WPM</strong> (English) or <strong>30 WPM</strong> (Hindi) in 10 minutes to qualify. Both Speed and Marks cutoffs are mandatory.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── AIIMS CRE KEYSTROKE PANEL ── */}
          {isAiims && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><span>⌨️</span><span>AIIMS CRE-5 — Keystroke Penalty Formula</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{label:'Total Keystrokes', val: result.totalKeystrokes, color:'text-slate-800'},
                  {label:`Penalty (${result.totalMistakes.toFixed(1)}×50)`, val: result.aiimsPenaltyStrokes?.toFixed(0), color:'text-red-600'},
                  {label:'Net Keystrokes', val: result.aiimsNetStrokes?.toFixed(0), color:'text-emerald-700'},
                  {label:`Divisor (5×${result.timeInMinutes.toFixed(1)}min)`, val: (5*result.timeInMinutes).toFixed(0), color:'text-blue-700'},
                ].map(c => (
                  <div key={c.label} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-500 mb-1">{c.label}</div>
                    <div className={`text-xl font-black font-mono ${c.color}`}>{c.val}</div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-slate-500 bg-sky-50 border border-sky-200 rounded px-3 py-2">
                Gross WPM = Total Keystrokes ÷ Divisor = <strong>{result.aiimsGrossWpm?.toFixed(2)}</strong> &nbsp;|&nbsp;
                Net WPM = Net Keystrokes ÷ Divisor = <strong>{result.aiimsNetWpm?.toFixed(2)}</strong> &nbsp;|&nbsp;
                Target: <strong>{catConfig.qualifyingSpeed[isHindiTest?'hi':'en']} WPM</strong> &nbsp;|&nbsp;
                <span className={isQualified ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>{isQualified ? 'QUALIFIED ✅' : 'NOT QUALIFIED ❌'}</span>
              </div>
            </div>
          )}

          {/* ── MP CPCT SCALED SCORE PANEL ── */}
          {isMpCpct && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><span>📊</span><span>MP CPCT — Scaled Score Card</span></div>
              <div className="flex flex-wrap items-center gap-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-center">
                  <div className="text-[10px] text-slate-500">Net WPM</div>
                  <div className="text-3xl font-black text-blue-700 font-mono">{result.netWpm.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-slate-500">Scaled Score</div>
                  <div className="text-3xl font-black text-emerald-700 font-mono">{catEval.scaledScorePercentage?.toFixed(2) ?? '0.00'}%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-slate-500">Qualifying</div>
                  <div className="text-[10px] text-slate-500">{isHindiTest ? 'NWPM ≥ 20 = 50%' : 'NWPM ≥ 30 = 50%'}</div>
                </div>
                <div className={`px-4 py-2 rounded-lg text-center font-bold text-sm ${isQualified ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {isQualified ? 'QUALIFIED ✅' : 'NOT QUALIFIED ❌'}
                </div>
              </div>
            </div>
          )}

          {/* ── SPMCIL OFFICIAL EVALUATION PANEL (Matching TypingMitra result25.php) ── */}
          {isSpmcil && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span>🏭</span>
                  <span>SPMCIL Official Evaluation Scheme (5% / 7% Error Allowance)</span>
                </div>
                {/* Category Selection Toggle matching TypingMitra result25.php */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 px-1">Category:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSpmcilCategory('UR')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      selectedSpmcilCategory !== 'Reserved'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    UR / EWS (5% Allowed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSpmcilCategory('Reserved')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      selectedSpmcilCategory === 'Reserved'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Other / Reserved (7% Allowed)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">Net Speed (WPM)</div>
                  <div className={`text-2xl font-black font-mono ${spmcilNetWpm >= spmcilRequiredSpeed ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {spmcilNetWpm.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">Cutoff: {spmcilRequiredSpeed} WPM ({isHindiTest ? 'Hindi' : 'English'})</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">Errors Breakdown</div>
                  <div className="text-xl font-black text-slate-800 font-mono">
                    {spmcilTotalErrors.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Full: {result.fullMistakes} | Half: {result.halfMistakes} (×0.5)
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">
                    Allowed vs Actual ({selectedSpmcilCategory === 'Reserved' ? '7%' : '5%'})
                  </div>
                  <div className="text-xl font-black text-orange-600 font-mono">
                    {spmcilActualError.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Allowed: {spmcilAllowedErrors.toFixed(2)} | Actual: {spmcilActualError.toFixed(2)}
                  </div>
                </div>

                <div className={`p-3 rounded-lg border text-center ${spmcilQualified ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="text-[10px] text-slate-500 mb-1">Result ({selectedSpmcilCategory === 'Reserved' ? 'Reserved 7%' : 'UR 5%'})</div>
                  <div className={`text-lg font-black ${spmcilQualified ? 'text-emerald-700' : 'text-red-600'}`}>
                    {spmcilQualified ? 'QUALIFIED ✅' : 'NOT QUALIFIED ❌'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {spmcilQualified ? `Net ${spmcilNetWpm.toFixed(2)} ≥ ${spmcilRequiredSpeed} WPM` : `Net ${spmcilNetWpm.toFixed(2)} < ${spmcilRequiredSpeed} WPM`}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-700 bg-cyan-50/70 border border-cyan-200 rounded-lg p-3 space-y-1">
                <div>
                  • <strong>Official Error Allowance:</strong> Unreserved (UR/EWS) candidates are allowed <strong>5.00% errors</strong> ({spmcilAllowedErrors.toFixed(2)} errors on this attempt). Reserved categories are allowed <strong>7.00% errors</strong>.
                </div>
                <div>
                  • <strong>Direct Deduction Rule:</strong> Actual Error = Total Errors − Allowed Error = <strong>{spmcilActualError.toFixed(2)}</strong>. Net Speed = (Words Typed − Actual Error) ÷ 10 Minutes = <strong>{spmcilNetWpm.toFixed(2)} WPM</strong>. Purely qualifying in nature.
                </div>
              </div>
            </div>
          )}

          {/* ── PERMISSIBLE MARGIN PANEL (Delhi HC, Supreme Court) ── */}
          {isPermissibleExam && !isRrbNtpc && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span>🛡️</span>
                <span>{catConfig.name} — Permissible Margin Evaluation</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Permissible ({isDhcJja||isSupremeCourt?'3%':'5%'})</div>
                  <div className="font-bold text-slate-800 text-sm">{catEval.permissibleMistakes?.toFixed(2)} errors</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Total Mistakes</div>
                  <div className="font-bold text-red-600 text-sm">{result.totalMistakes.toFixed(1)}</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Excess × 10 Penalty</div>
                  <div className="font-bold text-orange-600 text-sm">{catEval.penaltyWords?.toFixed(1) ?? 0} words</div>
                </div>
                <div className={`p-2.5 rounded border text-center ${isQualified ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="text-[10px] text-slate-500">Net Speed</div>
                  <div className={`font-bold text-sm ${isQualified ? 'text-emerald-700' : 'text-red-600'}`}>{result.netWpm.toFixed(2)} WPM {isQualified ? '✅' : '❌'}</div>
                </div>
              </div>
            </div>
          )}

          {/* ── UPSSSC ACCURACY PANEL ── */}
          {isUpssscJa && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><span>🎯</span><span>{catConfig.name} — Accuracy Threshold</span></div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500">Net Speed</div>
                  <div className={`font-bold text-base ${result.netWpm >= catConfig.qualifyingSpeed[isHindiTest?'hi':'en'] ? 'text-emerald-700' : 'text-red-600'}`}>{result.netWpm.toFixed(2)} WPM</div>
                  <div className="text-[10px] text-slate-400">req: {catConfig.qualifyingSpeed[isHindiTest?'hi':'en']} WPM</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500">Accuracy</div>
                  <div className={`font-bold text-base ${result.accuracyPercentage >= 85 ? 'text-emerald-700' : 'text-red-600'}`}>{result.accuracyPercentage.toFixed(2)}%</div>
                  <div className="text-[10px] text-slate-400">req: ≥ 85%</div>
                </div>
                <div className={`p-2.5 rounded border text-center ${isQualified ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="text-[10px] text-slate-500">Status</div>
                  <div className={`font-bold text-base ${isQualified ? 'text-emerald-700' : 'text-red-600'}`}>{isQualified ? 'PASS ✅' : 'FAIL ❌'}</div>
                </div>
              </div>
            </div>
          )}

          {/* ── DELHI POLICE AWO/TPO KEYSTROKE PANEL ── */}
          {isDpAwoTpo && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><span>⌨️</span><span>Delhi Police AWO/TPO — 1,000 Key Depressions Target</span></div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500">Keystrokes</div>
                  <div className={`font-bold text-base ${result.totalKeystrokes >= 1000 ? 'text-emerald-700' : 'text-red-600'}`}>{result.totalKeystrokes}</div>
                  <div className="text-[10px] text-slate-400">target: ≥ 1,000</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500">Accuracy</div>
                  <div className={`font-bold text-base ${result.accuracyPercentage >= 85 ? 'text-emerald-700' : 'text-red-600'}`}>{result.accuracyPercentage.toFixed(2)}%</div>
                  <div className="text-[10px] text-slate-400">req: ≥ 85%</div>
                </div>
                <div className={`p-2.5 rounded border text-center ${isQualified ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="text-[10px] text-slate-500">Status</div>
                  <div className={`font-bold text-base ${isQualified ? 'text-emerald-700' : 'text-red-600'}`}>{isQualified ? 'PASS ✅' : 'FAIL ❌'}</div>
                  <div className="text-[10px] text-slate-400">(4,000 KDPH)</div>
                </div>
              </div>
            </div>
          )}

          {/* ── CHANDIGARH ADMIN OFFICIAL EVALUATION PANEL (Matching TypingMitra result19.php) ── */}
          {isChandigarhAdmin && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span>🏛️</span>
                  <span>Chandigarh Administration Clerk &amp; Steno-Typist Official Evaluation</span>
                </span>
                <span className="text-[11px] font-normal text-sky-700">
                  Cutoff: <strong>{isHindiTest ? '30.0' : '35.0'} WPM (Net Speed)</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">Net Speed (WPM)</div>
                  <div className={`text-2xl font-black font-mono ${result.netWpm >= (isHindiTest ? 30 : 35) ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {result.netWpm.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">Min: {isHindiTest ? '30.0' : '35.0'} WPM</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">Total Full Errors</div>
                  <div className="text-2xl font-black text-rose-600 font-mono">
                    {result.fullMistakes}
                  </div>
                  <div className="text-[10px] text-slate-500">All errors = 1.0 Full Mistake</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">Gross Speed</div>
                  <div className="text-2xl font-black text-slate-800 font-mono">
                    {result.grossWpm.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">Words ÷ Time</div>
                </div>

                <div className={`p-3 rounded-lg border text-center ${result.netWpm >= (isHindiTest ? 30 : 35) ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="text-[10px] text-slate-500 mb-1">Qualifying Status</div>
                  <div className={`text-lg font-black ${result.netWpm >= (isHindiTest ? 30 : 35) ? 'text-emerald-700' : 'text-red-600'}`}>
                    {result.netWpm >= (isHindiTest ? 30 : 35) ? 'QUALIFIED ✅' : 'NOT QUALIFIED ❌'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-tight">
                    {result.netWpm >= (isHindiTest ? 30 : 35) ? 'Achieved required qualifying speed' : `Below minimum ${isHindiTest ? 30 : 35} WPM standard`}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-700 bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-1">
                <div>
                  • <strong>Strict Full-Error Rule:</strong> As per Chandigarh Administration official guidelines, there is <strong>no half-mistake concept</strong>. Every spacing error, capitalization error, punctuation mistake, spelling substitution, omission, and addition is penalized as <strong>1.0 Full Mistake</strong>.
                </div>
                <div>
                  • <strong>Net Speed Formula:</strong> Net Speed = (Words Typed − Total Errors) ÷ 10 Minutes = <strong>{result.netWpm.toFixed(2)} WPM</strong>. Purely qualifying in nature.
                </div>
              </div>
            </div>
          )}

          {/* ── PUNJAB & HARYANA HIGH COURT OFFICIAL EVALUATION PANEL (Matching TypingMitra result21.php) ── */}
          {isPunjabHaryanaHc && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span>⚖️</span>
                  <span>High Court of Punjab and Haryana — Official Speed Evaluation</span>
                </span>
                <span className="text-[11px] font-normal text-indigo-700">
                  Cutoff: <strong>{isHindiTest ? '25.0' : '30.0'} WPM (Net Speed)</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">Net Speed (WPM)</div>
                  <div className={`text-2xl font-black font-mono ${result.netWpm >= (isHindiTest ? 25 : 30) ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {result.netWpm.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">Min: {isHindiTest ? '25.0' : '30.0'} WPM</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">Total Full Errors</div>
                  <div className="text-2xl font-black text-rose-600 font-mono">
                    {result.fullMistakes}
                  </div>
                  <div className="text-[10px] text-slate-500">All errors = 1.0 Full Mistake</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">Gross Speed</div>
                  <div className="text-2xl font-black text-slate-800 font-mono">
                    {result.grossWpm.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">Words ÷ Time</div>
                </div>

                <div className={`p-3 rounded-lg border text-center ${result.netWpm >= (isHindiTest ? 25 : 30) ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="text-[10px] text-slate-500 mb-1">Qualifying Status</div>
                  <div className={`text-lg font-black ${result.netWpm >= (isHindiTest ? 25 : 30) ? 'text-emerald-700' : 'text-red-600'}`}>
                    {result.netWpm >= (isHindiTest ? 25 : 30) ? 'QUALIFIED ✅' : 'NOT QUALIFIED ❌'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-tight">
                    {result.netWpm >= (isHindiTest ? 25 : 30) ? 'Achieved required qualifying speed' : `Below minimum ${isHindiTest ? 25 : 30} WPM standard`}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-700 bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-1">
                <div>
                  • <strong>Strict Full-Error Rule:</strong> According to Punjab and Haryana High Court (SSSC) rules, <strong>all errors are counted as full mistakes</strong>. Spacing, capitalization, punctuation, spelling substitutions, and omissions count as 1.0 full error (no half mistakes).
                </div>
                <div>
                  • <strong>Official Speed Rule:</strong> Candidate must type at or above <strong>30 WPM</strong> in English or <strong>25 WPM</strong> in Hindi in 10 minutes to qualify. Purely qualifying in nature.
                </div>
              </div>
            </div>
          )}

          {/* ── UNIVERSAL CRITERIA BREAKDOWN TABLE ── */}
          {catEval?.criteriaBreakdown && catEval.criteriaBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <span className="text-base">📋</span>
                <span className="font-bold text-sm text-slate-800">Step-by-Step Calculation — {catConfig.name}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {catEval.criteriaBreakdown.map((row: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-5 py-2.5 text-slate-600 font-medium w-2/3">{row.label}</td>
                        <td className={`px-5 py-2.5 font-bold text-right ${
                          row.status === 'PASS' ? 'text-emerald-600' :
                          row.status === 'FAIL' ? 'text-red-600' :
                          'text-slate-800'
                        }`}>
                          {String(row.value)}
                          {row.status === 'PASS' && ' ✅'}
                          {row.status === 'FAIL' && ' ❌'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">
                Evaluated per official <strong>{catConfig.name}</strong> guidelines. Formula: <em>{catEval.evaluationBadge}</em>
              </div>
            </div>
          )}

          {/* Accordion 1: Error Breakdown */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowErrorBreakdown(!showErrorBreakdown)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Info className="w-4 h-4 text-[#2563eb]" />
                <span>Error Breakdown</span>
              </div>
              {showErrorBreakdown ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showErrorBreakdown && (
              <div className="px-5 pb-5 pt-3 space-y-4 border-t border-slate-100 animate-in fade-in duration-150">
                {isCsirFormula ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {csirFormulaFullErrors}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Substitutions: {result.substitutions}</div>
                        <div>Spelling Errors: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: {csirFormulaHalfErrors}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                      </div>
                    </div>
                  </div>
                ) : isUpssscJa ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {result.fullMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Substitutions: {result.substitutions}</div>
                        <div>Spelling/Repetitions/Incomplete: {result.transpositionErrors}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: {result.halfMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition/Paragraphic/Tabs: 0</div>
                      </div>
                    </div>
                  </div>
                ) : isDelhiPoliceHcm ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {result.fullMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {catEval.errorBreakdown?.extraWords ?? result.extraWordErrors}</div>
                        <div>Omissions: {catEval.errorBreakdown?.omissions ?? result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {(catEval.errorBreakdown?.substitutions ?? result.substitutions) + (catEval.errorBreakdown?.repetitions ?? 0)}</div>
                        <div>Incomplete Words: {catEval.errorBreakdown?.incompleteWords ?? 0}</div>
                        <div>Extra Space Between Words: {catEval.errorBreakdown?.spacingErrors ?? result.spacingErrors}</div>
                        <div>Tab Errors (tab at wrong place / missing): 0</div>
                        <div>Paragraph Break Errors (Enter at wrong place / missing): {catEval.errorBreakdown?.paragraphErrors ?? 0}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: 0</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: 0</div>
                        <div>Capitalization Errors: 0</div>
                        <div>Punctuation Errors: 0</div>
                        <div>Transposition Errors: 0</div>
                      </div>
                      <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5 mt-2 italic">
                        * Note: In Delhi Police HCM (DP HCM), all errors are counted as full error (−1.0 WPM deduction each). No half-mistake concessions are given.
                      </p>
                    </div>
                  </div>
                ) : (isDdaJsa || isDdaSteno || isCcrasLdcUdc) ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {result.fullMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {catEval.errorBreakdown?.extraWords ?? result.extraWordErrors}</div>
                        <div>Omissions: {catEval.errorBreakdown?.omissions ?? result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {(catEval.errorBreakdown?.substitutions ?? result.substitutions) + (catEval.errorBreakdown?.repetitions ?? 0)}</div>
                        <div>Incomplete Words: {catEval.errorBreakdown?.incompleteWords ?? 0}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: 0</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: 0</div>
                        <div>Capitalization Errors: 0</div>
                        <div>Punctuation Errors: 0</div>
                        <div>Transposition Errors: 0</div>
                        <div>Paragraphic Errors: 0</div>
                        <div>Tab Errors: 0</div>
                      </div>
                    </div>
                  </div>
                ) : isRssbLdc ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {result.fullMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {catEval.errorBreakdown?.extraWords ?? result.extraWordErrors}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {(catEval.errorBreakdown?.substitutions ?? result.substitutions) + (catEval.errorBreakdown?.repetitions ?? 0)}</div>
                        <div>Incomplete Words: {catEval.errorBreakdown?.incompleteWords ?? 0}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: 0</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: 0</div>
                        <div>Capitalization Errors: 0</div>
                        <div>Punctuation Errors: 0</div>
                        <div>Transposition Errors: 0</div>
                        <div>Paragraphic Errors: 0</div>
                        <div>Tab Errors: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Not Counted in Errors</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Omitted Words (highlighted only): {catEval.errorBreakdown?.omissions ?? result.omissions}</div>
                        <div>Omitted Punctuation (highlighted only): 0</div>
                      </div>
                      <p className="text-[11px] text-slate-500 italic mt-1.5">
                        Words you did not type are shown in the Original Text panel, but they are not added to Total Errors — they already reduce Words Typed, Net WPM and Accuracy.
                      </p>
                    </div>
                  </div>
                ) : isUpPoliceCo ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {result.fullMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {result.substitutions}</div>
                        <div>Incomplete Words: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: {result.halfMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition Errors: {result.transpositionErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                        <div>Tab Errors: 0</div>
                        <div>Extra Space Errors: 0</div>
                      </div>
                    </div>
                  </div>
                ) : (isBsfHcm || isCsirJsa) ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {isBsfHcm ? bsfTotalErrors : csirTotalErrors}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {result.substitutions}</div>
                        <div>Incomplete Words: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: 0</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition Errors: {result.transpositionErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                        <div>Tab Errors: 0</div>
                      </div>
                      {isBsfHcm && (
                        <p className="text-[11px] text-slate-400 italic pt-1">
                          * Note: In BSF HCM all errors are counted as full error.
                        </p>
                      )}
                    </div>
                  </div>
                ) : isCbseJsa ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {cbseTotalErrors}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {result.substitutions}</div>
                        <div>Incomplete Words: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: {result.halfMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition Errors: {result.transpositionErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                        <div>Tab Errors: 0</div>
                        <div>Extra Space Errors: 0</div>
                      </div>
                      <p className="text-[11px] text-slate-400 italic pt-1">
                        * Note: In CBSE JSA all errors are counted as full error.
                      </p>
                    </div>
                  </div>
                ) : isKvsOrEmrsOrNvs ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {kvsTotalErrors}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {result.substitutions}</div>
                        <div>Incomplete Words: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: 0</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition Errors: {result.transpositionErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                        <div>Tab Errors: 0</div>
                        <div>Extra Space Errors: 0</div>
                      </div>
                      <p className="text-[11px] text-slate-400 italic pt-1">
                        * Note: In {isNvsJsa ? 'NVS' : isEmrsJsa ? 'EMRS' : 'KVS'} JSA all errors are counted as full error.
                      </p>
                    </div>
                  </div>
                ) : isMpCpct ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {mpCpctTotalErrors}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {result.substitutions}</div>
                        <div>Incomplete Words: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: 0</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition Errors: {result.transpositionErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                        <div>Tab Errors: 0</div>
                        <div>Extra Space Errors: 0</div>
                      </div>
                      <p className="text-[11px] text-slate-400 italic pt-1">
                        * Note: In MP CPCT all errors are counted as full error.
                      </p>
                    </div>
                  </div>
                ) : isAllahabadHc ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {ahcTotalErrors}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {result.substitutions}</div>
                        <div>Incomplete Words: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: 0</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition Errors: {result.transpositionErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                        <div>Tab Errors: 0</div>
                        <div>Extra Space Errors: 0</div>
                      </div>
                      <p className="text-[11px] text-slate-400 italic pt-1">
                        * Note: In Allahabad High Court all errors are counted as full error.
                      </p>
                    </div>
                  </div>
                ) : isUttrakhandHc ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {result.fullMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {result.substitutions}</div>
                        <div>Incomplete Words: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: {result.halfMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition Errors: {result.transpositionErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                      </div>
                    </div>
                  </div>
                ) : isDhcJja ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {dhcTotalErrors}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {result.substitutions}</div>
                        <div>Incomplete Words: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: 0</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition Errors: {result.transpositionErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                        <div>Tab Errors: 0</div>
                      </div>
                      <p className="text-[11px] text-slate-400 italic pt-1">
                        * Note: In Delhi High Court (DHC) JJA all errors are counted as full error.
                      </p>
                    </div>
                  </div>
                ) : isDsssbJsa ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {dsssbTotalErrors}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {result.substitutions}</div>
                        <div>Incomplete Words: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: 0</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition Errors: {result.transpositionErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                        <div>Tab Errors: 0</div>
                        <div>Extra Space Errors: 0</div>
                      </div>
                      <p className="text-[11px] text-slate-400 italic pt-1">
                        * Note: In DSSSB all errors are counted as full error.
                      </p>
                    </div>
                  </div>
                ) : isRrbNtpc ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {result.fullMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {result.substitutions}</div>
                        <div>Incomplete Words: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: {result.halfMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition Errors: {result.transpositionErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                        <div>Tab Errors: 0</div>
                        <div>Extra Space Errors: 0</div>
                      </div>
                    </div>
                  </div>
                ) : isSscExam ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {result.fullMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Omissions: {result.omissions}</div>
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Spelling/Substitutions/Repetitions Errors: {result.substitutions}</div>
                        <div>Incomplete Words: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: {result.halfMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition Errors: {result.transpositionErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                      </div>
                    </div>
                  </div>
                ) : isAiims ? (
                  <div className="font-sans text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Full Errors: {result.fullMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Additions: {result.extraWordErrors}</div>
                        <div>Omissions: {result.omissions}</div>
                        <div>Spelling/Substitutions/Repetitions: {result.substitutions}</div>
                        <div>Incomplete Words: 0</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Half Errors: {result.halfMistakes}</h4>
                      <div className="text-slate-600 space-y-0.5 pl-0.5">
                        <div>Spacing Errors: {result.spacingErrors}</div>
                        <div>Capitalization Errors: {result.wrongCapitalizations}</div>
                        <div>Punctuation Errors: {result.punctuationErrors}</div>
                        <div>Transposition Errors: {result.transpositionErrors}</div>
                        <div>Paragraphic Errors: 0</div>
                        <div>Tab Errors: 0</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-bold text-xs text-slate-800 mb-2">
                        Full Errors (1.0 Penalty each) — Total: {result.fullMistakes}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-red-50/80 border border-red-200 text-red-900 flex justify-between">
                          <span>Spelling / Substitutions:</span>
                          <strong className="font-mono">{result.substitutions}</strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-orange-50/80 border border-orange-200 text-orange-900 flex justify-between">
                          <span>Omissions (Missed Words):</span>
                          <strong className="font-mono">{result.omissions}</strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-purple-50/80 border border-purple-200 text-purple-900 flex justify-between">
                          <span>Additions (Extra Words):</span>
                          <strong className="font-mono">{result.extraWordErrors}</strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-xs text-slate-800 mb-2">
                        Half Errors (0.5 Penalty each) — Total: {result.halfMistakes}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 flex justify-between">
                          <span>Capitalization:</span>
                          <strong className="font-mono">{result.wrongCapitalizations}</strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-yellow-50/80 border border-yellow-200 text-yellow-900 flex justify-between">
                          <span>Punctuation:</span>
                          <strong className="font-mono">{result.punctuationErrors}</strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-teal-50/80 border border-teal-200 text-teal-900 flex justify-between">
                          <span>Transposition:</span>
                          <strong className="font-mono">{result.transpositionErrors}</strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-sky-50/80 border border-sky-200 text-sky-900 flex justify-between">
                          <span>Spacing (Split/Join):</span>
                          <strong className="font-mono">{result.spacingErrors}</strong>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Accordion 2: Calculation Formulas */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCalculationFormulas(!showCalculationFormulas)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <span className="text-base">🧮</span>
                <span>Calculation Formulas</span>
              </div>
              {showCalculationFormulas ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showCalculationFormulas && (
              <div className="px-5 pb-5 pt-3 border-t border-slate-100 text-xs text-slate-700 animate-in fade-in duration-150">
                {isCsirFormula ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Keystrokes:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words in Passage:</strong> Total Keystrokes in Passage / 5</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes Typed / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors + (Half Errors / 2)</div>
                    <div><strong>Ignorable Errors:</strong> 5% of Total Words in Passage</div>
                    <div><strong>Actual Errors:</strong> Total Errors - Ignorable Errors</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words in Passage) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> ((Keystrokes Typed / 5) / Time (min)) - Actual Errors</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification Status:</strong> Net WPM ≥ {csirFormulaRequiredSpeed}</div>
                  </div>
                ) : isUpssscJa ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors + (Half Errors / 2)</div>
                    <div><strong>Ignorable Errors:</strong> First 5 errors</div>
                    <div><strong>Penalty:</strong> max(0, (Total Errors - Ignorable Errors) × 5)</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> max(0, (Words Typed - Penalty) / Time (min))</div>
                    <div><strong>Accuracy:</strong> max(0, (Net WPM / Gross WPM) × 100)</div>
                    <div><strong>Qualification:</strong> Net WPM ≥ {upssscRequiredSpeed}</div>
                  </div>
                ) : isDelhiPoliceHcm ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors (In DP HCM all errors are counted as full error)</div>
                    <div><strong>Extra Space Error:</strong> More than one space between two words counts as a full error (1)</div>
                    <div><strong>Tab Error:</strong> Tab pressed where the passage has none, or tab missing where the passage has one (including the first line indent) - full error (1)</div>
                    <div><strong>Paragraph Break Error:</strong> Enter pressed where the passage has no break, or break missing where the passage has one - full error (1)</div>
                    <div><strong>Penalty:</strong> 1 WPM deducted directly from Gross Speed for each full error (no half concession)</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> (Keystrokes / 5) / Time (min) − Total Errors</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification:</strong> Net WPM ≥ {isHindiTest ? 25 : 30} WPM && Marks &gt; 0 (Minimum 10 Marks on 25-Marks scale)</div>
                  </div>
                ) : isDdaJsa ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors</div>
                    <div><strong>Ignorable Errors:</strong> 5% of (Total Keystrokes Typed / 5)</div>
                    <div><strong>Penalty:</strong> (Total Errors) × 10</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> (Keystrokes/5 - Penalty) / Time (min)</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification:</strong> Net WPM ≥ {isHindiTest ? 30 : 35}</div>
                  </div>
                ) : isDdaSteno ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors (In DSSSB all errors are counted as full error)</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> ((Keystrokes/5 - Error) / Time (min))</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification:</strong> Net WPM ≥ {ddaStenoRequiredSpeed}</div>
                  </div>
                ) : (isBsfHcm || isCsirJsa || isCcrasLdcUdc) ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors</div>
                    <div><strong>Ignorable Errors:</strong> 5% of (Total Keystrokes Typed / 5)</div>
                    <div><strong>Penalty:</strong> (Total Errors - Ignorable Errors) × 10</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> ((Keystrokes/5 - Penalty) / Time (min))</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification:</strong> Net WPM ≥ {isBsfHcm ? bsfRequiredSpeed : (isHindiTest ? 30 : 35)}</div>
                  </div>
                ) : isRssbLdc ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Number of words separated by space in typed text</div>
                    <div><strong>Total Errors:</strong> Full Errors + Half Errors</div>
                    <div><strong>Omissions:</strong> Highlighted in the original passage but not added to Total Errors</div>
                    <div><strong>Penalty:</strong> (Total Errors) × 10</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> Words Typed / Time (min)</div>
                    <div><strong>Net WPM:</strong> (Words Typed - Total Errors) / Time (min)</div>
                    <div><strong>Accuracy:</strong> (Words Typed - Total Errors) / Words Typed × 100</div>
                    <div><strong>Marks:</strong> Correct Words × {isHindiTest ? '0.0625' : '0.05'} (Maximum 25 marks)</div>
                    <div><strong>Qualification:</strong> Marks ≥ 9</div>
                  </div>
                ) : isUpPoliceCo ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Words Available in Passage:</strong> Words separated by space in the original passage</div>
                    <div><strong>Total Words Typed:</strong> Words separated by space in typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Errors:</strong> Full Errors + Half Errors / 2</div>
                    <div><strong>Correct Words Typed:</strong> Total Words Typed − Total Errors</div>
                    <div><strong>Gross WPM:</strong> Total Words Typed / Time (min)</div>
                    <div><strong>Net WPM:</strong> (Total Words Typed − Total Errors) / Time (min)</div>
                    <div><strong>Accuracy:</strong> (Correct Words Typed / Total Words Available in Passage) × 100</div>
                    <div><strong>Extra Space Error:</strong> An extra space between two words counts as half error (0.5)</div>
                    <div><strong>Qualification:</strong> Qualified if Net WPM ≥ {isHindiTest ? 25 : 30} AND Accuracy ≥ 85%</div>
                  </div>
                ) : isCbseJsa ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors (All errors are counted as full error)</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> ((Keystrokes/5 - Error) / Time (min)</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification:</strong> Net WPM ≥ {cbseRequiredSpeed}</div>
                  </div>
                ) : isKvsOrEmrsOrNvs ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> ((Keystrokes/5 - Error) / Time (min)</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification:</strong> Net WPM ≥ {isHindiTest ? 30 : 35}</div>
                  </div>
                ) : isMpCpct ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors</div>
                    <div><strong>Penalty:</strong> Total Errors × 1 Word</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> ((Keystrokes Typed / 5) - Total Errors) / Time (min)</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification:</strong> Net WPM ≥ {isHindiTest ? 20 : 30} (50% Scaled Score)</div>
                    <div className="pt-2">
                      <strong className="text-slate-900">Scaled Score Slabs ({isHindiTest ? 'Hindi' : 'English'}):</strong>
                      <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                        {isHindiTest ? (
                          <>
                            <div className="p-1.5 bg-slate-50 border rounded">&lt; 20 NWPM: 0%</div>
                            <div className="p-1.5 bg-slate-50 border rounded">20-25 NWPM: 50%</div>
                            <div className="p-1.5 bg-slate-50 border rounded">26-30 NWPM: 60%</div>
                            <div className="p-1.5 bg-slate-50 border rounded">31-35 NWPM: 70%</div>
                            <div className="p-1.5 bg-slate-50 border rounded">36-40 NWPM: 80%</div>
                            <div className="p-1.5 bg-slate-50 border rounded">41-50 NWPM: 90%</div>
                            <div className="p-1.5 bg-slate-50 border rounded">&gt; 50 NWPM: 100%</div>
                          </>
                        ) : (
                          <>
                            <div className="p-1.5 bg-slate-50 border rounded">&lt; 30 NWPM: 0%</div>
                            <div className="p-1.5 bg-slate-50 border rounded">30-40 NWPM: 50%</div>
                            <div className="p-1.5 bg-slate-50 border rounded">41-50 NWPM: 60%</div>
                            <div className="p-1.5 bg-slate-50 border rounded">51-60 NWPM: 70%</div>
                            <div className="p-1.5 bg-slate-50 border rounded">61-70 NWPM: 80%</div>
                            <div className="p-1.5 bg-slate-50 border rounded">71-80 NWPM: 90%</div>
                            <div className="p-1.5 bg-slate-50 border rounded">&gt; 80 NWPM: 100%</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : isAllahabadHc ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Actual space-separated words typed</div>
                    <div><strong>Total Errors:</strong> Full Errors</div>
                    <div><strong>Ignorable Errors:</strong> 5% of Total Words Typed</div>
                    <div><strong>Penalty:</strong> (Total Errors - Ignorable Errors) × 10</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> ((Keystrokes/5 - Error) / Time (min)</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Correct Words:</strong> Total Words Typed - Total Errors</div>
                    <div><strong>Total Marks:</strong> Correct Words × 0.10 (Max 50)</div>
                    <div><strong>Qualification:</strong> Net WPM ≥ 25 AND Marks ≥ 25</div>
                  </div>
                ) : isUttrakhandHc ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors + (Half Errors / 2)</div>
                    <div><strong>Full Errors:</strong> Omission, substitution, spelling, additions, incomplete words (1.0 each)</div>
                    <div><strong>Half Errors:</strong> Spacing, capitalization, punctuation, transposition (0.5 each)</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> ((Keystrokes Typed / 5) - Total Errors) / Time (min)</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification:</strong> Net Speed ≥ {isHindiTest ? 25 : 30} WPM</div>
                  </div>
                ) : isDhcJja ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors (all errors count as full errors)</div>
                    <div><strong>Ignorable Errors:</strong> 3% of (Total Keystrokes Typed / 5) - Rounded: 0.01-0.49 → 0.5, 0.51-0.99 → 1.0</div>
                    <div><strong>Actual Error:</strong> Total Errors - Ignorable Errors</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> ((Keystrokes/5 - Actual Error) / Time (min)</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification:</strong> Net WPM ≥ 35</div>
                  </div>
                ) : isDsssbJsa ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors</div>
                    <div><strong>Penalty:</strong> (Total Errors) × 2</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> ((Keystrokes/5 - Penalty) / Time (min)</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification:</strong> Net WPM ≥ {isHindiTest ? 30 : 35} && Similarity ≥ 60%</div>
                    <div><strong>Extra Space Error:</strong> An extra space between two words counts as full error (1)</div>
                  </div>
                ) : isRrbNtpc ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors + Half Errors/2</div>
                    <div><strong>Punctuation Error:</strong> Every missing, extra or wrong punctuation mark counts as half error (0.5)</div>
                    <div><strong>Extra Space Error:</strong> An extra space between two words counts as half error (0.5)</div>
                    <div><strong>Ignorable Errors:</strong> 5% of (Total Keystrokes Typed / 5)</div>
                    <div><strong>Penalty:</strong> (Total Errors - Ignorable Errors) × 10</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> ((Keystrokes/5 - Penalty) / Time (min)</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification:</strong> Net WPM ≥ {test.language === 'hi' ? 25 : 30}</div>
                  </div>
                ) : isSscExam ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors + (Half Errors / 2)</div>
                    <div><strong>Error Percentage:</strong> Min(100, (Total Errors / (Total Keystrokes in Passage / 5) × 100))</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong>(Keystrokes / 5)- (Total Errors)/Time</div>
                    <div><strong>Accuracy:</strong>(Net WPM / Gross WPM) × 100)</div>
                    <div><strong>Qualification:</strong> Error % ≤ 7% (UR) or ≤ 10% (Others)</div>
                  </div>
                ) : isAiims ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-800">
                    <div><strong>Total Keystrokes:</strong> Count of characters in final typed text</div>
                    <div><strong>Backspace Pressed:</strong> Number of backspace key presses</div>
                    <div><strong>Total Words Typed:</strong> Total Keystrokes / 5</div>
                    <div><strong>Total Errors:</strong> Full Errors + (Half Errors / 2)</div>
                    <div><strong>Penalty:</strong> Total Errors × 50 Keystrokes</div>
                    <div><strong>Error Percentage:</strong> (Total Errors / Total Words Typed) × 100</div>
                    <div><strong>Gross WPM:</strong> (Keystrokes Typed / 5) / Time (min)</div>
                    <div><strong>Net WPM:</strong> ((Keystrokes - Penalty) / 5) / Time (min)</div>
                    <div><strong>Accuracy:</strong> (Net WPM / Gross WPM) × 100</div>
                    <div><strong>Qualification:</strong> Qualified if Net WPM ≥ {test.language === 'hi' ? 30 : 35}</div>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 font-mono text-[11.5px]">
                      <div><strong>1. Gross WPM:</strong> ({result.totalKeystrokes} Keystrokes ÷ 5) ÷ {result.timeInMinutes.toFixed(2)} min = <strong>{result.grossWpm.toFixed(2)} WPM</strong></div>
                      <div><strong>2. Total Mistakes:</strong> {result.fullMistakes} (Full) + ({result.halfMistakes} Half ÷ 2) = <strong>{result.totalMistakes.toFixed(1)} Mistakes</strong></div>
                      <div><strong>3. Error Percentage:</strong> ({result.totalMistakes.toFixed(1)} ÷ ({totalKeystrokesInPassage} ÷ 5)) × 100 = <strong>{result.errorPercentage.toFixed(2)}%</strong></div>
                      <div><strong>4. Net WPM:</strong> (({result.totalKeystrokes} ÷ 5) − {result.totalMistakes.toFixed(1)}) ÷ {result.timeInMinutes.toFixed(2)} min = <strong>{result.netWpm.toFixed(2)} WPM</strong></div>
                      <div><strong>5. Accuracy:</strong> ({result.netWpm.toFixed(2)} ÷ {result.grossWpm.toFixed(2)}) × 100 = <strong>{result.accuracyPercentage.toFixed(2)}%</strong></div>
                      <div><strong>6. Key Depressions Per Hour (KDPH):</strong> {result.totalKeystrokes} × (60 ÷ {result.timeInMinutes.toFixed(2)}) = <strong>{result.kdph} KDPH</strong></div>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      * Evaluated strictly according to official guidelines for <strong>{catConfig.name}</strong>.
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Original Text Section */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-sm text-slate-900">Original Text</h2>
            <div className="border border-slate-200 rounded-lg p-4 bg-[#fafbfc] text-xs sm:text-sm font-sans leading-relaxed max-h-56 overflow-y-auto">
              {result.alignedOriginalWords && result.alignedOriginalWords.length > 0 ? (
                <div className="flex flex-wrap gap-x-1.5 gap-y-1">
                  {result.alignedOriginalWords
                    .filter((ow) => (!isAiims && !isRrbNtpc && !isDsssbJsa && !isKvsOrEmrsOrNvs && !isCsirJsa && !isMpCpct && !isAllahabadHc && !isUttrakhandHc && !isDhcJja) || ow.status !== 'UNREACHED')
                    .map((ow, idx) => {
                      let cls = 'px-1 py-0.5 rounded text-slate-800';
                      const isPunct = /^[.,!?;:'"()\-–—\/]+$/.test((ow.word || '').trim());
                      if (ow.status === 'CORRECT') cls = 'text-slate-800';
                      else if (isSscExam) {
                        if (ow.status === 'OMISSION' || ow.status === 'UNREACHED' || ow.status === 'FULL_MISTAKE') {
                          cls = isPunct
                            ? 'px-1.5 py-0.5 rounded bg-[#06b6d4] text-white font-medium'
                            : 'px-1.5 py-0.5 rounded bg-[#ef4444] text-white font-medium';
                        } else if (ow.status === 'HALF_MISTAKE') {
                          cls = 'px-1.5 py-0.5 rounded bg-[#06b6d4] text-white font-medium';
                        }
                      } else if (ow.status === 'HALF_MISTAKE') {
                        cls = (isAiims || isRrbNtpc || isDsssbJsa || isKvsOrEmrsOrNvs || isCsirJsa || isMpCpct || isAllahabadHc || isUttrakhandHc || isDhcJja)
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 font-medium'
                          : 'bg-cyan-100 text-cyan-900 border-b border-cyan-400';
                      }
                      else if (ow.status === 'FULL_MISTAKE') cls = 'bg-red-100 text-red-900 line-through border border-red-300';
                      else if (ow.status === 'OMISSION') {
                        cls = (isAiims || isRrbNtpc || isDsssbJsa || isKvsOrEmrsOrNvs || isCsirJsa || isCbseJsa || isUpPoliceCo || isMpCpct || isAllahabadHc || isUttrakhandHc || isDhcJja)
                          ? 'px-1.5 py-0.5 rounded bg-red-200 text-red-900 line-through border border-red-300 font-semibold'
                          : 'bg-red-50 text-red-700 border border-dashed border-red-400 font-semibold';
                      }
                      else if (ow.status === 'UNREACHED') cls = 'text-slate-400';
                      return (
                        <span key={idx} className={cls} title={ow.reason || ''}>
                          {ow.word}
                        </span>
                      );
                    })}
                </div>
              ) : (
                <span className="text-slate-400 italic">No passage text</span>
              )}
            </div>
            {isRssbLdc ? (
              <div className="flex items-center gap-2 pt-1">
                <span className="px-2 py-0.5 rounded bg-red-200 text-red-900 line-through border border-red-300 font-medium text-xs">
                  Omission: Words missing in typed text (not counted as error)
                </span>
              </div>
            ) : (isAiims || isRrbNtpc || isDsssbJsa || isKvsOrEmrsOrNvs || isCsirJsa || isCbseJsa || isUpPoliceCo || isMpCpct || isAllahabadHc || isUttrakhandHc || isDhcJja) && (
              <div className="flex items-center gap-2 pt-1">
                <span className="px-2 py-0.5 rounded bg-red-200 text-red-900 line-through border border-red-300 font-medium text-xs">
                  Omission: Words missing in typed text
                </span>
              </div>
            )}
          </div>

          {/* Your Typed Text Section */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-sm text-slate-900">Your Typed Text</h2>
            <div className="border border-slate-200 rounded-lg p-4 bg-[#fafbfc] text-xs sm:text-sm font-sans leading-relaxed max-h-56 overflow-y-auto">
              {result.alignedTypedWords && result.alignedTypedWords.length > 0 ? (
                <div className="flex flex-wrap gap-x-1.5 gap-y-1">
                  {result.alignedTypedWords.map((tw, idx) => {
                    let cls = 'px-1 py-0.5 rounded text-slate-800';
                    if (tw.status === 'CORRECT') {
                      cls = 'text-slate-800';
                    } else if (isSscExam) {
                      if (tw.status === 'EXTRA') {
                        cls = 'px-1.5 py-0.5 rounded bg-[#eab308] text-black font-semibold shadow-xs';
                      } else if (tw.status === 'FULL_MISTAKE') {
                        cls = 'px-1.5 py-0.5 rounded bg-[#ef4444] text-white font-semibold shadow-xs';
                      } else if (tw.status === 'HALF_MISTAKE') {
                        cls = 'px-1.5 py-0.5 rounded bg-[#06b6d4] text-white font-semibold shadow-xs';
                      }
                    } else if (isAiims || isRrbNtpc || isDsssbJsa || isKvsOrEmrsOrNvs || isCsirJsa || isCbseJsa || isMpCpct || isAllahabadHc || isUttrakhandHc || isDhcJja) {
                      if (tw.status === 'EXTRA') {
                        // Addition
                        cls = 'px-1.5 py-0.5 rounded bg-yellow-400 text-black font-semibold shadow-xs';
                      } else if (tw.status === 'FULL_MISTAKE') {
                        // Full Error
                        cls = 'px-1.5 py-0.5 rounded bg-red-600 text-white font-semibold shadow-xs';
                      } else if (tw.status === 'HALF_MISTAKE') {
                        const reason = (tw.reason || '').toLowerCase();
                        if (reason.includes('case') || reason.includes('capital')) {
                          cls = 'px-1.5 py-0.5 rounded bg-pink-500 text-white font-semibold shadow-xs';
                        } else if (reason.includes('space')) {
                          cls = 'px-1.5 py-0.5 rounded bg-sky-400 text-black font-semibold shadow-xs';
                        } else if (reason.includes('punct')) {
                          cls = 'px-1.5 py-0.5 rounded bg-amber-500 text-white font-semibold shadow-xs';
                        } else {
                          cls = 'px-1.5 py-0.5 rounded bg-pink-500 text-white font-semibold shadow-xs';
                        }
                      }
                    } else {
                      if (tw.status === 'HALF_MISTAKE') cls = 'bg-cyan-100 text-cyan-900 border-b border-cyan-400';
                      else if (tw.status === 'FULL_MISTAKE') cls = 'bg-red-100 text-red-900 line-through border border-red-300';
                      else if (tw.status === 'EXTRA') cls = 'bg-amber-100 text-amber-900 border border-amber-300';
                    }
                    return (
                      <span key={idx} className={cls} title={tw.reason || ''}>
                        {tw.typedWord || tw.word}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="text-slate-400 italic">No text was typed</span>
              )}
            </div>

            {/* Bottom Legend */}
            {(isKvsOrEmrsOrNvs || isCsirJsa || isCbseJsa || isDelhiPoliceHcm || isDdaJsa || isDdaSteno || isCcrasLdcUdc || isRssbLdc || isUpPoliceCo || isMpCpct || isAllahabadHc || isUttrakhandHc || isDhcJja) ? (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-medium">
                <span className="px-2 py-0.5 rounded bg-yellow-400 text-black border border-yellow-500">
                  Addition: Extra words in typed text
                </span>
                <span className="px-2 py-0.5 rounded bg-red-600 text-white border border-red-700">
                  Full Error: Substitutions, spelling, repetitions, incomplete words
                </span>
                <span className="px-2 py-0.5 rounded bg-pink-500 text-white border border-pink-600">
                  Capitalization Error: Incorrect case
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-400 text-black border border-sky-500">
                  Spacing Error: Missing or extra spaces
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white border border-amber-600">
                  Punctuation Error: Missing or wrong punctuation
                </span>
              </div>
            ) : isDsssbJsa ? (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-medium">
                <span className="px-2 py-0.5 rounded bg-yellow-400 text-black border border-yellow-500">
                  Addition: Extra words in typed text
                </span>
                <span className="px-2 py-0.5 rounded bg-red-600 text-white border border-red-700">
                  Full Error: Substitutions, spelling, repetitions, incomplete words
                </span>
                <span className="px-2 py-0.5 rounded bg-pink-500 text-white border border-pink-600">
                  Capitalization Error: Incorrect case
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-400 text-black border border-sky-500">
                  Spacing Error: Missing or extra spaces
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-dashed border-purple-400">
                  Extra Space Between Words (full error)
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white border border-amber-600">
                  Punctuation Error: Missing or wrong punctuation
                </span>
              </div>
            ) : isRrbNtpc ? (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-medium">
                <span className="px-2 py-0.5 rounded bg-yellow-400 text-black border border-yellow-500">
                  Full Error:Addition: Extra words in typed text
                </span>
                <span className="px-2 py-0.5 rounded bg-red-600 text-white border border-red-700">
                  Full Error: Substitutions, spelling, repetitions, incomplete words
                </span>
                <span className="px-2 py-0.5 rounded bg-pink-500 text-white border border-pink-600">
                  Half Error: Capitalization Error: Incorrect case
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-400 text-black border border-sky-500">
                  Half Error:Spacing Error: Missing or extra spaces
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white border border-amber-600">
                  Half Error:Punctuation Error: Missing or wrong punctuation
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-dashed border-purple-400">
                  Half Error: Extra Space Between Words
                </span>
              </div>
            ) : isAiims ? (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-medium">
                <span className="px-2 py-0.5 rounded bg-yellow-400 text-black border border-yellow-500">
                  Addition: Extra words in typed text
                </span>
                <span className="px-2 py-0.5 rounded bg-red-600 text-white border border-red-700">
                  Full Error: Substitutions, spelling, repetitions, incomplete words
                </span>
                <span className="px-2 py-0.5 rounded bg-pink-500 text-white border border-pink-600">
                  Capitalization Error: Incorrect case
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-400 text-black border border-sky-500">
                  Spacing Error: Missing or extra spaces
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white border border-amber-600">
                  Punctuation Error: Missing or wrong punctuation
                </span>
              </div>
            ) : isSscExam ? (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-slate-700 font-medium">
                <span><span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200 font-semibold">Omission:</span> Words omitted,</span>
                <span><span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200 font-semibold">Addition:</span> Extra words,</span>
                <span><span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-200 font-semibold">Half Error:</span> Spacing, capitalization, punctuation, transposition, paragraphic,</span>
                <span><span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200 font-semibold">Full Error:</span> Substitutions, spelling, repetitions, incomplete words</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-slate-600">
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 font-medium">Omission</span>
                <span className="text-slate-500">Words omitted,</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-medium">Addition</span>
                <span className="text-slate-500">Extra words,</span>
                <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-300 font-medium">Half Error</span>
                <span className="text-slate-500">Spacing, capitalization, punctuation, transposition, paragraphic,</span>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 font-medium">Full Error</span>
                <span className="text-slate-500">Substitutions, spelling, repetitions, incomplete words</span>
              </div>
            )}
          </div>

          {/* Bottom Action Buttons (Matching Screenshot) */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 pb-8">
            <Link
              href={test.categoryId ? `/typing-test/category/${test.categoryId}` : '/typing-test'}
              className="px-6 py-2.5 rounded-full bg-[#10b981] hover:bg-[#059669] active:scale-95 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <span>Back to Passages</span>
            </Link>

            <Link
              href="/typing-test/history"
              className="px-6 py-2.5 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-95 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <History className="w-4 h-4" />
              <span>View Test History</span>
            </Link>

            <button
              onClick={() => initDemoPhase(test)}
              className="px-6 py-2.5 rounded-full bg-[#10b981] hover:bg-[#059669] active:scale-95 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Test</span>
            </button>
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
        {/* Top Header with Exact Test Name */}
        <header className="bg-[#286090] text-white px-4 py-2.5 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h1 className="font-extrabold text-xs sm:text-sm tracking-wide uppercase truncate text-white">
              {cleanDisplayTitle(test.title || test.titleHi || 'Typing Skill Test')}
            </h1>
          </div>

          {/* Center: Mock Test Hub Logo */}
          <div className="flex items-center justify-center shrink-0 px-2">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 group cursor-pointer hover:opacity-95 transition"
              title={t.backToHome}
            >
              <div className="bg-white/15 p-1.5 rounded-full shadow-xs flex items-center justify-center h-8 w-8 border border-white/30 shrink-0">
                <Trophy className="h-4 w-4 text-amber-300" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-xs leading-tight text-white tracking-wider uppercase">
                  {t.logoTitle}
                </span>
                <span className="hidden xs:inline text-[7.5px] text-blue-200 font-extrabold tracking-widest uppercase leading-tight">
                  {t.logoSub}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center justify-end gap-4 shrink-0 flex-1">
            <span className="text-[11px] font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-400/40 hidden sm:inline">
              Phase 2: Break Time
            </span>
            <button
              onClick={() => setShowInstructionsModal(true)}
              className="text-xs text-white hover:underline flex items-center gap-1 cursor-pointer font-semibold"
            >
              <Info className="w-3.5 h-3.5 text-[#29b6f6]" />
              View Instructions
            </button>
          </div>
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
              <p className="text-xs sm:text-sm font-bold text-[#286090]">
                {cleanDisplayTitle(test.title)}
              </p>
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
      {/* Hidden Audio element for Typing Keystroke Sound */}
      <audio
        ref={typingAudioRef}
        src="/typing-sound.mp3"
        preload="auto"
        loop
      />

      {/* 1. TOP BLUE STRIP */}
      <div className="h-6 bg-[#286090] w-full" />

      {/* 2. SUB-HEADER / TEST NAME & CANDIDATE ROW (SECTION 1) */}
      <div className="border-b border-slate-300 bg-[#f8f9fa] px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left Side: Test Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h2 className="font-extrabold text-xs sm:text-sm text-[#286090] tracking-wide truncate">
              {cleanDisplayTitle(test.title || testDisplayCode)}
            </h2>
          </div>

          {/* Center: Mock Test Hub Logo */}
          <div className="flex items-center justify-center shrink-0 px-2">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 group cursor-pointer hover:opacity-95 transition"
              title={t.backToHome}
            >
              <div className="bg-[#E6F4FE] p-1.5 rounded-full shadow-xs flex items-center justify-center h-8 w-8 border border-blue-200/80 shrink-0 group-hover:border-blue-400 transition">
                <Trophy className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-xs leading-tight text-slate-900 tracking-wider uppercase group-hover:text-blue-700 transition">
                  {t.logoTitle}
                </span>
                <span className="hidden xs:inline text-[7.5px] text-blue-600 font-extrabold tracking-widest uppercase leading-tight">
                  {t.logoSub}
                </span>
              </div>
            </Link>
          </div>

          {/* Right Side: Digital Countdown Clock & User Profile */}
          <div className="flex items-center justify-end gap-3 sm:gap-4 shrink-0 flex-1">
            {isAdmin && (
              <button
                type="button"
                onClick={phase === 'DEMO' ? handleFinishDemo : handleFinishMainTest}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded shadow-xs border border-emerald-700 transition cursor-pointer"
                title={`Admin Quick Submit: Finish ${phase === 'DEMO' ? 'Demo Test' : 'Main Test'} immediately`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Submit {phase === 'DEMO' ? 'Demo' : 'Test'} (Admin)</span>
              </button>
            )}

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
              <div className="text-xs font-bold text-slate-800 pr-2 flex items-center gap-1">
                <span>{currentUser?.name || 'my user'}</span>
                {isAdmin && (
                  <span className="text-[9px] px-1 py-0.2 bg-purple-100 text-purple-800 border border-purple-300 rounded font-black">
                    ADMIN
                  </span>
                )}
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

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-semibold cursor-pointer transition ${
                soundEnabled
                  ? 'bg-emerald-600/90 border-emerald-400 text-white hover:bg-emerald-600 shadow-2xs'
                  : 'bg-white/15 border-white/30 text-white/80 hover:bg-white/25'
              }`}
              title="Toggle Typing Sound (Click to turn on or off)"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-white" /> : <VolumeX className="w-3.5 h-3.5 text-white/70" />}
              <span>{soundEnabled ? 'Sound: ON' : 'Sound: OFF'}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-semibold cursor-pointer transition ${
                isFullscreen
                  ? 'bg-indigo-600/90 border-indigo-400 text-white hover:bg-indigo-600 shadow-2xs'
                  : 'bg-white/15 border-white/30 text-white/80 hover:bg-white/25'
              }`}
              title="Toggle Full Screen View"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-white" /> : <Maximize2 className="w-3.5 h-3.5 text-white/70" />}
              <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
            </button>

            {/* Delhi Police HCM, DSSSB Steno & Bombay High Court Clerk PDF Download & Paper Mode Buttons */}
            {(Boolean(
              (test?.categoryId || '').includes('bombay') ||
              (test?.title || '').toLowerCase().includes('bombay') ||
              (test?.categoryId || '').includes('delhi-police-hcm') ||
              (test?.title || '').toLowerCase().includes('delhi police hcm') ||
              (test?.categoryId || '').includes('dsssb-stenographer') ||
              (test?.title || '').toLowerCase().includes('dsssb steno')
            )) && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadPassagePdf}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-bold text-xs shadow-xs cursor-pointer transition"
                  title="Download and print authentic passage paper sheet"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-900" />
                  <span>Download Passage PDF</span>
                </button>

                {(Boolean(
                  (test?.categoryId || '').includes('bombay') ||
                  (test?.title || '').toLowerCase().includes('bombay') ||
                  (test?.categoryId || '').includes('delhi-police-hcm') ||
                  (test?.title || '').toLowerCase().includes('delhi police hcm')
                )) && (
                  <button
                    type="button"
                    onClick={() => setIsPaperMode(!isPaperMode)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-semibold cursor-pointer transition ${
                      isPaperMode
                        ? 'bg-amber-500 border-amber-300 text-slate-950 font-bold shadow-xs'
                        : 'bg-white/15 border-white/30 text-white/90 hover:bg-white/25'
                    }`}
                    title="Simulate paper-to-screen typing test as conducted in official exam"
                  >
                    <span>{isPaperMode ? '📄 Paper Mode: ON (Passage Hidden)' : '📄 Paper Mode: OFF'}</span>
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span>
              Retype: <span className={isRetypeAllowed ? 'text-emerald-200 font-bold' : 'text-amber-200'}>{isRetypeAllowed ? 'Allowed ✓ (Speed Counts)' : 'Disabled ✕ (Single Pass)'}</span>
            </span>
            <span>
              Backspace: <span className={isBackspaceEnabled ? 'text-emerald-200 font-bold' : 'text-amber-200'}>{isBackspaceEnabled ? 'Unrestricted ✓' : 'Disabled (No Corrections)'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5. MAIN WORK AREA (SPLIT SCREEN LAYOUT) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 flex flex-col lg:flex-row gap-4">
        {/* Left Column: Top Passage Box + Bottom Typing Box */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Top Box: Passage to type (or Paper Mode banner) */}
          {isPaperMode ? (
            <div className="p-4 bg-amber-50/95 border-2 border-amber-300 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-3 text-amber-950">
                <span className="text-2xl">📄</span>
                <div>
                  <div className="font-extrabold text-sm text-amber-900">
                    {(test?.categoryId || '').includes('bombay') || (test?.title || '').toLowerCase().includes('bombay')
                      ? '🏛️ Bombay High Court Clerk Paper-to-Screen Mode Active'
                      : 'Delhi Police HCM Paper Mode Active'}
                  </div>
                  <div className="text-amber-800 text-[11px] leading-tight">
                    {(test?.categoryId || '').includes('bombay') || (test?.title || '').toLowerCase().includes('bombay')
                      ? 'Passage is hidden on screen to simulate typing from physical printed paper as conducted in official Bombay High Court Clerk exam. Look at your printed sheet / downloaded PDF and type into the enlarged box below.'
                      : 'Passage is hidden on screen to simulate typing from physical printed paper. Look at your printed sheet and type into the enlarged box below.'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadPassagePdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 rounded-md font-bold text-amber-900 cursor-pointer shadow-2xs transition active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download / Print Passage</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaperMode(false)}
                  className="px-3 py-1.5 bg-[#286090] hover:bg-[#204d74] text-white rounded-md font-bold cursor-pointer shadow-2xs transition active:scale-95"
                >
                  👁️ Show Passage On-Screen
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={passageBoxRef}
              style={{ fontSize: `${textSize}px`, lineHeight: `${Math.round(textSize * 1.6)}px` }}
              className="tcs-scrollbar h-56 sm:h-64 p-3 bg-white border border-slate-400 rounded overflow-y-auto text-slate-900 font-sans select-none tracking-normal"
            >
              {currentPassageText}
            </div>
          )}

          {/* Retype status notification bar */}
          {phase === 'MAIN' && (
            isRetypeAllowed ? (
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
                  <span>⚠️ <strong>Passage Completed!</strong> Retyping is disabled for this test. Please review your typed text until time expires.</span>
                </div>
              ) : null
            )
          )}

          {/* Bottom Box: User Typing Area */}
          <div className={`${isPaperMode ? 'h-[440px] sm:h-[500px]' : 'h-56 sm:h-64'} bg-white border-2 border-slate-800 rounded p-1 transition-all duration-200`}>
            <textarea
              ref={typingInputRef}
              autoFocus
              value={currentTypedText}
              placeholder={isPaperMode ? 'Start typing here to begin the test... (Typing from printed paper passage sheet)' : 'Start typing here to begin the test...'}
              style={{ fontSize: `${textSize}px`, lineHeight: `${Math.round(textSize * 1.6)}px` }}
              onChange={e => {
                if (phase === 'DEMO') {
                  setDemoTypedText(e.target.value);
                } else {
                  const val = e.target.value;
                  // If corrections are disabled, ensure text can only append (strictly monotonic forward progress)
                  if (!isBackspaceEnabled) {
                    if (val.length < mainTypedText.length || !val.startsWith(mainTypedText)) {
                      return;
                    }
                  }
                  // If retyping is disabled, block typing new words beyond the passage
                  if (!isRetypeAllowed && passageWordCount > 0) {
                    const valWords = val.trim().length > 0 ? val.trim().split(/\s+/) : [];
                    if (valWords.length > passageWordCount && val.length > mainTypedText.length) {
                      return;
                    }
                  }
                  setMainTypedText(val);
                }
              }}
              onKeyDown={handleKeyDown}
              onClick={e => {
                if (!isBackspaceEnabled) {
                  const el = e.currentTarget;
                  el.setSelectionRange(el.value.length, el.value.length);
                }
              }}
              onSelect={e => {
                if (!isBackspaceEnabled) {
                  const el = e.currentTarget;
                  if (el.selectionStart !== el.value.length || el.selectionEnd !== el.value.length) {
                    el.setSelectionRange(el.value.length, el.value.length);
                  }
                }
              }}
              onCut={e => {
                e.preventDefault();
              }}
              onContextMenu={e => {
                if (!isBackspaceEnabled) {
                  e.preventDefault();
                }
              }}
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

          {/* Quick Submit / End Test Bar (Admin, CBSE JSA, BSF HCM, CSIR Formula, UPSSSC JA, SSC CGL) */}
          {(isAdmin || isCbseTest || isBsfTest || isCsirFormulaTest || isUpssscTest || isSscCglTest) && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 border border-slate-300 rounded-md shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#286090] shrink-0" />
                <span>
                  {phase === 'DEMO' ? 'Demo Warm-up Session' : isSscCglTest ? 'SSC CGL Previous Year Examination Session' : isUpssscTest ? 'UPSSSC JA Examination Session' : isCsirFormulaTest ? 'CSIR EXAM New Rules(FORMULA) Session' : isBsfTest ? 'BSF HCM Examination Session' : isCbseSuperintendentTest ? 'CBSE Superintendent Examination Session' : 'CBSE JSA Examination Session'}
                </span>
                {isAdmin && (
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold border border-purple-300">
                    Admin
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={phase === 'DEMO' ? handleFinishDemo : handleFinishMainTest}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#286090] hover:bg-[#1f4b72] active:scale-95 text-white font-extrabold text-xs rounded shadow-xs border border-[#1f4b72] transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>{phase === 'DEMO' ? 'Finish Demo Test' : 'End / Submit Typing Test'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Instructions Box & Admin Quick Panel */}
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

          {/* Admin Panel in Right Column (Only visible to admins) */}
          {isAdmin && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded text-xs text-slate-700 space-y-2 shadow-xs">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Admin Quick Actions</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-snug">
                As an administrator, you can submit the {phase === 'DEMO' ? 'demo warm-up' : 'main examination'} instantly without waiting for the timer.
              </p>
              <button
                type="button"
                onClick={phase === 'DEMO' ? handleFinishDemo : handleFinishMainTest}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs rounded shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Submit {phase === 'DEMO' ? 'Demo Test' : 'Main Test'} Now</span>
              </button>
            </div>
          )}
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
                  2. Evaluation Guidelines {isCbseSuperintendentExam(test) ? '(Official CBSE Superintendent Standard)' : isUpssscJaExam(test) ? '(Official UPSSSC Junior Assistant Standard)' : isCsirFormulaExam(test) ? '(Official CSIR EXAM New Rules Formula)' : isBsfHcmExam(test) ? '(Official BSF HCM Standard)' : isAiimsExam(test) ? '(Official AIIMS CRE CRE-5 Standard)' : isSscExam(test) ? '(Official SSC Standard)' : '(RRB / Standard)'}:
                </h4>
                {isCbseSuperintendentExam(test) ? (
                  <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-2">
                    <li><strong>Error Classification</strong> = All mistakes (omissions, substitutions, additions, spelling) are counted as Full Errors (1 error each).</li>
                    <li><strong>Total Words Typed</strong> = Total Keystrokes Typed ÷ 5.</li>
                    <li><strong>Net WPM Formula</strong> = ((Total Keystrokes ÷ 5) − Total Errors) ÷ Exam Duration (10 min).</li>
                    <li><strong>Accuracy Calculation</strong> = (Net WPM ÷ Gross WPM) × 100.</li>
                    <li><strong>Qualifying Standard</strong> = <strong>35 WPM (English)</strong> or <strong>30 WPM (Hindi)</strong>.</li>
                  </ul>
                ) : isUpssscJaExam(test) ? (
                  <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-2">
                    <li><strong>Total Mistakes Formula</strong> = Full Errors + (Half Errors ÷ 2).</li>
                    <li><strong>Ignorable Errors</strong> = First 5 errors are exempted from deduction.</li>
                    <li><strong>Penalty Words</strong> = (Total Errors − Ignorable Errors) × 5 words deducted from Total Words Typed.</li>
                    <li><strong>Gross WPM</strong> = (Total Keystrokes ÷ 5) ÷ Exam Duration (5 min).</li>
                    <li><strong>Net Speed Formula</strong> = (Total Words Typed − Penalty) ÷ Exam Duration (5 min).</li>
                    <li><strong>Accuracy Calculation</strong> = (Net WPM ÷ Gross WPM) × 100.</li>
                    <li><strong>Qualifying Standard</strong> = <strong>30 WPM (English)</strong> or <strong>25 WPM (Hindi)</strong>.</li>
                  </ul>
                ) : isCsirFormulaExam(test) ? (
                  <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-2">
                    <li><strong>Total Mistakes Formula</strong> = Full Errors + (Half Errors ÷ 2).</li>
                    <li><strong>Master Passage Words</strong> = Total Keystrokes in Master Passage ÷ 5.</li>
                    <li><strong>Ignorable Errors (5% Margin)</strong> = 5% of Total Words in Master Passage.</li>
                    <li><strong>Actual Errors</strong> = Total Mistakes − Ignorable Errors (floored to 0).</li>
                    <li><strong>Gross WPM</strong> = (Total Keystrokes ÷ 5) ÷ Exam Duration (min).</li>
                    <li><strong>Net Speed Formula</strong> = Gross WPM − Actual Errors.</li>
                    <li><strong>Accuracy Calculation</strong> = (Net WPM ÷ Gross WPM) × 100.</li>
                    <li><strong>Qualifying Standard</strong> = <strong>35 WPM (English)</strong> or <strong>30 WPM (Hindi)</strong>.</li>
                  </ul>
                ) : isBsfHcmExam(test) ? (
                  <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-2">
                    <li><strong>Error Classification</strong>: All mistakes are evaluated as <strong>Full Errors</strong>.</li>
                    <li><strong>Ignorable Errors (5% Margin)</strong> = 5% of Total Words Typed (Total Keystrokes ÷ 5).</li>
                    <li><strong>Penalty</strong> = (Total Errors − Ignorable Errors) × 10 words deduction.</li>
                    <li><strong>Net WPM Formula</strong> = ((Total Keystrokes ÷ 5) − Penalty) ÷ Exam Duration (min).</li>
                    <li><strong>Accuracy Calculation</strong> = (Net WPM ÷ Gross WPM) × 100.</li>
                    <li><strong>Qualifying Standard</strong> = <strong>35 WPM (English)</strong> or <strong>30 WPM (Hindi)</strong>.</li>
                  </ul>
                ) : isAiimsExam(test) ? (
                  <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-2">
                    <li><strong>Total Mistakes Formula</strong> = Number of Full Mistakes + 1/2 the Number of Half Mistakes (NO rounding off).</li>
                    <li><strong>Standard Average Word Length</strong> = 5 strokes (characters/keystrokes).</li>
                    <li><strong>Penalty</strong> = For each full mistake the penalty shall be <strong>50 strokes</strong> (Penalty = Total Mistakes × 50 strokes).</li>
                    <li><strong>Net Speed Formula (15 Min Test)</strong> = (Total No. of Strokes − Penalty) ÷ 75.</li>
                    <li><strong>Gross Speed Formula (15 Min Test)</strong> = Total No. of Strokes ÷ 75.</li>
                    <li><strong>Accuracy Calculation</strong> = (Net Typing Speed ÷ Gross Typing Speed) × 100.</li>
                    <li><strong>Qualifying Standard</strong> = <strong>35 WPM (English)</strong> or <strong>30 WPM (Hindi)</strong>.</li>
                  </ul>
                ) : isSscExam(test) ? (
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
                    {isRetypeAllowed
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
