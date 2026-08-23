"use client";

import React, { useState, useEffect } from 'react';
import { useAuth, TestCategory } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  Search,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Check,
  Sun,
  Moon,
  Bookmark,
  Trash2,
  ChevronUp,
  ChevronDown,
  Menu,
  TrendingUp,
  Coins,
  MapPin,
  Trophy,
  Target,
  Zap,
  Award,
  UserCheck,
  X,
  Globe,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Star,
  Flag,
  LayoutDashboard
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { EXPLANATIONS } from '../lib/examUtils';
import { TRANSLATIONS } from '../translations';
import { useIsMobile } from '../useIsMobile';
import HomeSupportWidget from '../components/HomeSupportWidget';
import HangingTriColorBalloons from '../components/HangingTriColorBalloons';

import { processQuestionHtml, decodeHtml } from '../lib/mathUtils';
import MathJaxText from '../lib/MathJaxText';


function renderFormattedExplanation(rawExp: any, lang: 'en' | 'hi', qId?: string, asPoints: boolean = false) {
  let expText = "";
  if (typeof rawExp === 'string') {
    expText = rawExp;
  } else if (rawExp && typeof rawExp === 'object') {
    expText = lang === 'hi' ? (rawExp.hi || rawExp.en || "") : (rawExp.en || rawExp.hi || "");
  }

  if (!expText && qId && (EXPLANATIONS as any)[qId]) {
    const fallbackObj = (EXPLANATIONS as any)[qId];
    expText = lang === 'hi' ? (fallbackObj.hi || fallbackObj.en) : (fallbackObj.en || fallbackObj.hi);
  }

  if (!expText) {
    expText = lang === 'hi' 
      ? 'उत्तर का विस्तृत विवरण शीघ्र ही उपलब्ध होगा।' 
      : 'Detailed explanation and concept breakdown will be updated shortly.';
  }

  const decoded = processQuestionHtml(expText).trim();
  const hasHtml = /<[a-z][\s\S]*>/i.test(decoded);

  if (hasHtml) {
    return (
      <MathJaxText
        component="div"
        className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed markup-content space-y-2 pt-1"
        content={decoded}
      />
    );
  }

  const isDiagrammatic = decoded.includes('↓') || 
                        /Rep\.\s*V\./i.test(decoded) || 
                        /\(D\.S\.\)/i.test(decoded) || 
                        /\(I\.S\.\)/i.test(decoded) ||
                        (decoded.includes('\n') && (/\(Active\)/i.test(decoded) || /\(Passive\)/i.test(decoded) || /Sub\.\s*Aux/i.test(decoded)));

  if (isDiagrammatic) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 overflow-x-auto my-1 shadow-xs">
        <pre className="font-mono text-xs sm:text-sm text-slate-850 dark:text-slate-100 leading-snug whitespace-pre">
          {decoded}
        </pre>
      </div>
    );
  }

  // Pre-process plain text: remove leading garbled dots/bullets like ". (3)"
  let cleanText = decoded.replace(/^[\.\s•\-]+(?=\(\d+\)|[A-Z0-9])/g, '');

  // Split lines and join broken line wraps into cohesive entries
  const rawLines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const structuredBlocks: string[] = [];

  for (const line of rawLines) {
    const isNewBlock = 
      /^[\(\[\{]?\d+[\)\]\.\:]/.test(line) || // (1), 1., [1]
      /^Option\s*[\(\[\{]?\d+[\)\]\.\:]/i.test(line) || // Option (1)
      /^[a-zA-Z\u0900-\u097F\s\-]+\s*\([A-Za-z]+\)\s*:/i.test(line) || // elevation (Noun) :
      /^•|^\-/.test(line);

    if (isNewBlock || structuredBlocks.length === 0) {
      structuredBlocks.push(line);
    } else {
      structuredBlocks[structuredBlocks.length - 1] += ' ' + line;
    }
  }

  if (asPoints) {
    return (
      <div className="space-y-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
        {structuredBlocks.map((block, idx) => {
          let bText = block.trim().replace(/^[\.\s•\-]+/, '');
          const colonIdx = bText.indexOf(':');
          if (colonIdx > 0 && colonIdx < 60) {
            const keyPart = bText.substring(0, colonIdx).trim();
            const valuePart = bText.substring(colonIdx + 1).trim();
            return (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white">{keyPart}: </span>
                  <span>{valuePart}</span>
                </div>
              </div>
            );
          }
          return (
            <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />
              <span>{bText}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed pt-1">
      {structuredBlocks.map((block, idx) => {
        let bText = block.trim().replace(/^[\.\s•\-]+/, '');

        // Check if block has key-value format like "(3) depression (Noun) : the state of..."
        const colonIdx = bText.indexOf(':');
        
        if (colonIdx > 0 && colonIdx < 60) {
          const keyPart = bText.substring(0, colonIdx).trim();
          const valuePart = bText.substring(colonIdx + 1).trim();

          return (
            <div key={idx} className="p-3 rounded-xl bg-amber-50/90 dark:bg-slate-900/60 border border-amber-200/70 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                  {keyPart}
                </span>
              </div>
              {valuePart && (
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed pl-4">
                  {valuePart}
                </p>
              )}
            </div>
          );
        }

        // Bullet or numbered item without colon
        const isBullet = /^[\(\[\{]?\d+[\)\]\.]|^•|^\-/.test(bText);

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/50 dark:bg-slate-900/40 border border-amber-200/50 dark:border-slate-800/80">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2"></span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed">
                {bText}
              </span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
            {bText}
          </p>
        );
      })}
    </div>
  );
}

const getCategoryTheme = (catId: string | null) => {
  const id = catId?.toLowerCase() || '';
  if (id.includes('ssc')) {
    return {
      color: 'orange',
      bg: 'bg-orange-50/50 dark:bg-orange-950/15',
      border: 'border-orange-150 dark:border-orange-900/30',
      hoverBorder: 'hover:border-orange-400 dark:hover:border-orange-600',
      iconBg: 'bg-orange-500/10 text-orange-650 dark:text-orange-400',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/45 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/30',
      gradient: 'from-orange-500 to-amber-500',
      accentGlow: 'rgba(249,115,22,0.12)'
    };
  }
  if (id.includes('railway')) {
    return {
      color: 'indigo',
      bg: 'bg-indigo-50/50 dark:bg-indigo-950/15',
      border: 'border-indigo-150 dark:border-indigo-900/30',
      hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-600',
      iconBg: 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
      gradient: 'from-indigo-500 to-blue-550',
      accentGlow: 'rgba(99,102,241,0.12)'
    };
  }
  if (id.includes('banking') || id.includes('bank')) {
    return {
      color: 'emerald',
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/15',
      border: 'border-emerald-150 dark:border-emerald-900/30',
      hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600',
      iconBg: 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
      gradient: 'from-emerald-500 to-teal-500',
      accentGlow: 'rgba(16,185,129,0.12)'
    };
  }
  if (id.includes('teaching')) {
    return {
      color: 'amber',
      bg: 'bg-amber-50/50 dark:bg-amber-950/15',
      border: 'border-amber-150 dark:border-amber-900/30',
      hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
      iconBg: 'bg-amber-500/10 text-amber-650 dark:text-amber-400',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
      gradient: 'from-amber-500 to-orange-500',
      accentGlow: 'rgba(245,158,11,0.12)'
    };
  }
  return {
    color: 'pink',
    bg: 'bg-pink-50/50 dark:bg-pink-950/15',
    border: 'border-pink-150 dark:border-pink-900/30',
    hoverBorder: 'hover:border-pink-400 dark:hover:border-pink-600',
    iconBg: 'bg-pink-500/10 text-pink-650 dark:text-pink-400',
    badgeBg: 'bg-pink-50 dark:bg-pink-950/45 text-pink-700 dark:text-pink-400 border-pink-100 dark:border-pink-900/30',
    gradient: 'from-pink-500 to-rose-500',
    accentGlow: 'rgba(236,72,153,0.12)'
  };
};

// Default Sample High-Yield Practice Questions for fallback when no custom upload exists yet
const SAMPLE_PRACTICE_QUESTIONS: Record<string, any[]> = {
  ssc_practice_domain: [
    {
      id: "ssc_q1",
      questionText: {
        en: "Select the ANTONYM of the word: INVINCIBLE",
        hi: "शब्द का विलोम शब्द (ANTONYM) चुनें: INVINCIBLE"
      },
      options: [
        { en: "small", hi: "small" },
        { en: "invisible", hi: "invisible" },
        { en: "vulnerable", hi: "vulnerable" },
        { en: "reachable", hi: "reachable" }
      ],
      correctOption: 2,
      explanation: {
        en: "vulnerable (Adjective): weak and easily hurt physically or emotionally.\ninvincible (Adjective): too strong to be defeated or unconquerable.",
        hi: "vulnerable (Adjective): शारीरिक या भावनात्मक रूप से कमजोर और आसानी से घायल होने वाला।"
      }
    },
    {
      id: "ssc_q2",
      questionText: {
        en: "If a car travels 240 km in 4 hours, what is its average speed in m/s?",
        hi: "यदि एक कार 4 घंटे में 240 किमी की दूरी तय करती है, तो उसकी औसत गति m/s में क्या है?"
      },
      options: [
        { en: "15 m/s", hi: "15 m/s" },
        { en: "16.67 m/s", hi: "16.67 m/s" },
        { en: "20 m/s", hi: "20 m/s" },
        { en: "25 m/s", hi: "25 m/s" }
      ],
      correctOption: 1,
      explanation: {
        en: "Speed in km/h = 240 / 4 = 60 km/h.\nSpeed in m/s = 60 * (5/18) = 16.67 m/s.",
        hi: "गति km/h में = 240 / 4 = 60 km/h।\nm/s में = 60 * (5/18) = 16.67 m/s।"
      }
    }
  ],
  railways_practice_domain: [
    {
      id: "rrb_q1",
      questionText: {
        en: "What is the SI unit of Work and Energy?",
        hi: "कार्य और ऊर्जा की SI इकाई क्या है?"
      },
      options: [
        { en: "Watt", hi: "वाट" },
        { en: "Joule", hi: "जूल" },
        { en: "Pascal", hi: "पास्कल" },
        { en: "Newton", hi: "न्यूटन" }
      ],
      correctOption: 1,
      explanation: {
        en: "The SI unit of work and energy is Joule (J). 1 Joule = 1 Newton-meter.",
        hi: "कार्य और ऊर्जा का SI मात्रक जूल (J) है। 1 जूल = 1 न्यूटन-मीटर।"
      }
    }
  ],
  banking_practice_domain: [
    {
      id: "bank_q1",
      questionText: {
        en: "If A is the brother of B, B is the sister of C, and C is the father of D, how is A related to D?",
        hi: "यदि A, B का भाई है, B, C की बहन है, और C, D का पिता है, तो A का D से क्या संबंध है?"
      },
      options: [
        { en: "Father", hi: "पिता" },
        { en: "Uncle", hi: "चाचा/मामा" },
        { en: "Brother", hi: "भाई" },
        { en: "Grandfather", hi: "दादा" }
      ],
      correctOption: 1,
      explanation: {
        en: "A is the brother of C (father of D). Therefore, A is the paternal uncle of D.",
        hi: "A, C (D के पिता) का भाई है। इसलिए, A, D का चाचा है।"
      }
    }
  ]
};

const DEFAULT_PRACTICE_CATALOG: TestCategory[] = [
  {
    id: 'railways_practice_domain',
    name: 'Railways Practice Series',
    isPracticeSeries: true,
    isPopular: true,
    description: 'RRB NTPC, Group D General Science & Math Practice',
    countText: '180+ Practice Sets',
    subCategories: []
  },
  {
    id: 'banking_practice_domain',
    name: 'Banking Practice Series',
    isPracticeSeries: true,
    isPopular: true,
    description: 'SBI PO, Clerk Puzzles & DI Practice Sets',
    countText: '150+ Practice Sets',
    subCategories: []
  },
  {
    id: 'state_practice_domain',
    name: 'State Exams Practice Series',
    isPracticeSeries: true,
    isPopular: false,
    description: 'BSSC, UPPSC State Special GK & Aptitude Practice',
    countText: '120+ Practice Sets',
    subCategories: []
  },
  {
    id: 'teaching_practice_domain',
    name: 'Teaching Practice Series',
    isPracticeSeries: true,
    isPopular: false,
    description: 'CTET, State TET Child Development & Pedagogy Practice',
    countText: '100+ Practice Sets',
    subCategories: []
  }
];

export default function PracticeSeriesPage() {
  const { currentUser, examCatalog, theme, toggleTheme, language, setLanguage, logout, toggleBookmark, refreshCatalog } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];
  const { isMobile, isMounted } = useIsMobile();

  useEffect(() => {
    router.replace('/mock-tests');
  }, [router]);

  useEffect(() => {
    if (refreshCatalog) {
      refreshCatalog();
    }
  }, []);

  // customPracticeCategories is no longer needed — categories come from examCatalog (DB)
  // just like the test series page. Keeping state as empty to avoid breaking any lingering references.
  const [customPracticeCategories] = useState<TestCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'tests' | 'bookmarks'>('tests');
  const [expandedBookmarks, setExpandedBookmarks] = useState<Record<string, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // In-memory questions cache for instant 0ms category rendering
  const questionsMemoryCache = React.useRef<Record<string, any[]>>({});
  const [domainQuestions, setDomainQuestions] = useState<any[]>([]);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);
  const [sectionSearchQuery, setSectionSearchQuery] = useState<string>('');
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedOptionMap, setSelectedOptionMap] = useState<Record<number, number>>({});
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  const [viewerLang, setViewerLang] = useState<'en' | 'hi'>(language as any || 'en');
  const [showFinishSummaryModal, setShowFinishSummaryModal] = useState<boolean>(false);
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('incorrect_answer');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [reportSuccessToast, setReportSuccessToast] = useState<boolean>(false);
  const [showMobilePaletteModal, setShowMobilePaletteModal] = useState<boolean>(false);
  const [sectionResultsMap, setSectionResultsMap] = useState<Record<string, any>>({});

  const loadSectionResults = async () => {
    let localMap: Record<string, any> = {};
    try {
      const saved = localStorage.getItem('mth_practice_section_results');
      if (saved) {
        localMap = JSON.parse(saved);
      }
    } catch (e) {}

    setSectionResultsMap(localMap);

    // Restore per-category option selections from localStorage
    try {
      const catId = selectedCategory;
      if (catId) {
        const savedOpts = localStorage.getItem(`mth_practice_options_${catId}`);
        if (savedOpts) {
          setSelectedOptionMap(JSON.parse(savedOpts));
        }
      }
    } catch (e) {}

    if (!currentUser?.id) return; // Guest users rely purely on localStorage

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-practice-attempts',
          data: { userId: currentUser.id }
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.attempts)) {
        const mergedMap = { ...localMap };
        // Also build a merged selectedOptionMap from DB responses
        const mergedOptions: Record<number, number> = {};

        data.attempts.forEach((att: any) => {
          const key = `${att.categoryId}_sec_${att.sectionIndex}`;
          mergedMap[key] = {
            categoryId: att.categoryId,
            sectionIndex: att.sectionIndex,
            score: att.correct ?? 0,
            total: att.total ?? 25,
            correct: att.correct ?? 0,
            wrong: att.wrong ?? 0,
            unattempted: att.unattempted ?? 0,
            attempted: att.attempted ?? 0,
            accuracy: att.accuracy ?? 0,
            completedAt: att.completedAt,
            responses: att.responses ?? null
          };
          // Merge responses from DB into mergedOptions (only for current category)
          if (att.categoryId === selectedCategory && att.responses && typeof att.responses === 'object') {
            Object.entries(att.responses as Record<string, number>).forEach(([qIdx, optIdx]) => {
              mergedOptions[Number(qIdx)] = Number(optIdx);
            });
          }
        });

        setSectionResultsMap(mergedMap);
        try {
          localStorage.setItem('mth_practice_section_results', JSON.stringify(mergedMap));
        } catch (e) {}

        // Restore answer selections for the current category
        if (selectedCategory && Object.keys(mergedOptions).length > 0) {
          setSelectedOptionMap(prev => {
            const merged = { ...mergedOptions, ...prev }; // localStorage takes precedence
            try {
              localStorage.setItem(`mth_practice_options_${selectedCategory}`, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadSectionResults();
    window.addEventListener('practice_results_updated', loadSectionResults);
    return () => {
      window.removeEventListener('practice_results_updated', loadSectionResults);
    };
  }, [currentUser]);

  // Restore user's selected options for the category on reload
  useEffect(() => {
    if (selectedCategory) {
      try {
        const saved = localStorage.getItem(`mth_practice_options_${selectedCategory}`);
        if (saved) {
          setSelectedOptionMap(JSON.parse(saved));
        } else {
          setSelectedOptionMap({});
        }
      } catch (e) {
        setSelectedOptionMap({});
      }
    }
  }, [selectedCategory]);

  const saveSectionResult = async (catId: string, secIdx: number, stats: any) => {
    const key = `${catId}_sec_${secIdx}`;

    // Collect the responses for this section from selectedOptionMap
    const QUESTIONS_PER_SEC = 25;
    const startIdx = secIdx * QUESTIONS_PER_SEC;
    const endIdx = startIdx + QUESTIONS_PER_SEC;
    const sectionResponses: Record<number, number> = {};
    for (let i = startIdx; i < endIdx; i++) {
      if (selectedOptionMap[i] !== undefined) {
        sectionResponses[i] = selectedOptionMap[i];
      }
    }

    const resultObj = {
      categoryId: catId,
      sectionIndex: secIdx,
      score: stats.correct,
      total: stats.total,
      correct: stats.correct,
      wrong: stats.wrong,
      unattempted: stats.unattempted,
      attempted: stats.attempted,
      accuracy: stats.accuracy,
      responses: sectionResponses,
      completedAt: new Date().toISOString()
    };

    try {
      const existing = localStorage.getItem('mth_practice_section_results');
      const map = existing ? JSON.parse(existing) : {};
      map[key] = resultObj;
      localStorage.setItem('mth_practice_section_results', JSON.stringify(map));
      setSectionResultsMap(map);
      window.dispatchEvent(new Event('practice_results_updated'));
    } catch (e) {}

    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-practice-attempt',
          data: {
            userId: currentUser?.id || 'guest',
            categoryId: catId,
            sectionIndex: secIdx,
            correct: stats.correct,
            wrong: stats.wrong,
            unattempted: stats.unattempted,
            attempted: stats.attempted,
            total: stats.total,
            accuracy: stats.accuracy,
            responses: sectionResponses
          }
        })
      });
    } catch (e) {}
  };

  const handleReattemptSection = (secIdx: number) => {
    const start = secIdx * QUESTIONS_PER_SECTION;
    const end = start + QUESTIONS_PER_SECTION;

    // Reset active selections for this section so user starts fresh
    setSelectedOptionMap(prev => {
      const copy = { ...prev };
      for (let i = start; i < end; i++) {
        delete copy[i];
      }
      if (selectedCategory) {
        try {
          localStorage.setItem(`mth_practice_options_${selectedCategory}`, JSON.stringify(copy));
        } catch (e) {}
      }
      return copy;
    });

    setSelectedSectionIndex(secIdx);
    setIsReviewMode(false);
    setCurrentQIndex(0);
    setShowFinishSummaryModal(false);
  };

  useEffect(() => {
    setViewerLang(language as any || 'en');
  }, [language]);

  const searchParams = useSearchParams();
  const [showStarredView, setShowStarredView] = useState<boolean>(false);
  const [starredQuestionsMap, setStarredQuestionsMap] = useState<Record<string, any>>({});
  const [expandedStarredMap, setExpandedStarredMap] = useState<Record<string, boolean>>({});

  const toggleStarredExpand = (qId: string) => {
    setExpandedStarredMap(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const loadStarredQuestions = () => {
    try {
      const saved = localStorage.getItem('mth_starred_questions');
      if (saved) {
        setStarredQuestionsMap(JSON.parse(saved));
      } else {
        setStarredQuestionsMap({});
      }
    } catch (e) {
      setStarredQuestionsMap({});
    }
  };

  useEffect(() => {
    loadStarredQuestions();
    window.addEventListener('mth_starred_updated', loadStarredQuestions);
    return () => {
      window.removeEventListener('mth_starred_updated', loadStarredQuestions);
    };
  }, []);

  useEffect(() => {
    if (searchParams && (searchParams.get('view') === 'starred' || searchParams.get('starred') === 'true')) {
      setShowStarredView(true);
    }
  }, [searchParams]);

  const getDeletedCategoryIds = (): string[] => {
    try {
      const saved = localStorage.getItem('mth_deleted_practice_categories');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  };

  // Categories are sourced entirely from examCatalog (DB-backed), same as test series.
  // No localStorage needed — examCatalog is populated from the DB on every page load
  // via refreshCatalog() (called at component mount above).

  const deletedCategoryIds = getDeletedCategoryIds();

  // Filter ONLY admin-created Practice Series Categories from DB-backed examCatalog.
  const catalogPracticeCategories = examCatalog.filter(c =>
    ((c as any).isPracticeSeries ||
    c.id.includes('_practice') ||
    c.name.toLowerCase().includes('practice')) &&
    !deletedCategoryIds.includes(c.id)
  );

  const combinedCategoriesMap = new Map<string, TestCategory>();
  const seenNameKeys = new Set<string>();

  const addCategoryIfUnique = (c: TestCategory) => {
    if (!c || deletedCategoryIds.includes(c.id)) return;
    const nameKey = (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenNameKeys.has(nameKey)) return;
    seenNameKeys.add(nameKey);
    combinedCategoriesMap.set(c.id, c);
  };

  // Show ONLY admin-created categories from DB (examCatalog).
  catalogPracticeCategories.forEach(addCategoryIfUnique);

  const practiceCatalog = Array.from(combinedCategoriesMap.values());

  // Background prefetcher: preloads all practice category questions into memory cache
  // as soon as practiceCatalog is available, ensuring 0ms opening speed when clicking cards.
  useEffect(() => {
    if (practiceCatalog.length === 0) return;
    practiceCatalog.forEach((cat) => {
      const catId = cat.id;
      if (!questionsMemoryCache.current[catId]) {
        try {
          const saved = localStorage.getItem(`mth_practice_questions_${catId}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              questionsMemoryCache.current[catId] = parsed;
              return;
            }
          }
        } catch (e) {}

        // Non-blocking silent background prefetch
        fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-custom-questions',
            testId: `${catId}_default`,
            categoryId: catId
          })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              if (data.url) {
                fetch(data.url)
                  .then(r => r.ok ? r.json() : null)
                  .then(parsed => {
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      questionsMemoryCache.current[catId] = parsed;
                      try { localStorage.setItem(`mth_practice_questions_${catId}`, JSON.stringify(parsed)); } catch (e) {}
                    }
                  }).catch(() => {});
              } else if (data.customQuestions || data.questions) {
                let questionsArray = data.customQuestions || data.questions;
                if (Array.isArray(questionsArray) && questionsArray.length > 0) {
                  questionsMemoryCache.current[catId] = questionsArray;
                  try { localStorage.setItem(`mth_practice_questions_${catId}`, JSON.stringify(questionsArray)); } catch (e) {}
                }
              }
            }
          })
          .catch(() => {});
      }
    });
  }, [practiceCatalog]);

  // Ultra-Fast Stale-While-Revalidate Question Loader
  // Renders instantly (0ms) from Memory / LocalStorage while revalidating from DB in background
  const loadDomainQuestions = async (catId: string) => {
    setCurrentQIndex(0);
    setSelectedOptionMap({});

    // 1. Instant load from Memory Cache or LocalStorage (0ms lag!)
    let loadedQuestions: any[] = questionsMemoryCache.current[catId] || [];
    if (loadedQuestions.length === 0) {
      try {
        const savedQs = localStorage.getItem(`mth_practice_questions_${catId}`);
        if (savedQs) {
          const parsed = JSON.parse(savedQs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedQuestions = parsed;
            questionsMemoryCache.current[catId] = parsed;
          }
        }
      } catch (e) {}
    }

    if (loadedQuestions.length > 0) {
      setDomainQuestions(loadedQuestions);
      setLoadingQuestions(false);
    } else {
      setLoadingQuestions(true);
    }

    // 2. Fetch fresh questions from DB/S3 API in background
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-custom-questions',
          testId: `${catId}_default`,
          categoryId: catId
        })
      });
      const data = await res.json();
      if (data.success) {
        let freshQuestions: any[] = [];
        if (data.url) {
          try {
            const fetchS3 = await fetch(data.url);
            if (fetchS3.ok) {
              const parsedS3 = await fetchS3.json();
              if (Array.isArray(parsedS3) && parsedS3.length > 0) {
                freshQuestions = parsedS3;
              }
            }
          } catch (s3Err) {}
        }

        if (freshQuestions.length === 0 && (data.customQuestions || data.questions)) {
          let questionsArray = data.customQuestions || data.questions;
          if (typeof questionsArray === 'string') {
            const fetchRes = await fetch(questionsArray);
            questionsArray = await fetchRes.json();
          } else if (questionsArray && typeof questionsArray === 'object' && !Array.isArray(questionsArray)) {
            if (Array.isArray((questionsArray as any).data)) {
              questionsArray = (questionsArray as any).data;
            } else if (Array.isArray((questionsArray as any).questions)) {
              questionsArray = (questionsArray as any).questions;
            }
          }
          if (Array.isArray(questionsArray) && questionsArray.length > 0) {
            freshQuestions = questionsArray;
          }
        }

        if (freshQuestions.length > 0) {
          questionsMemoryCache.current[catId] = freshQuestions;
          setDomainQuestions(freshQuestions);
          try {
            localStorage.setItem(`mth_practice_questions_${catId}`, JSON.stringify(freshQuestions));
          } catch (storageErr) {}
        }
      }
    } catch (e) {
    } finally {
      setLoadingQuestions(false);
    }

    // 3. Fallback to default questions if none uploaded yet
    if (loadedQuestions.length === 0) {
      if (catId.includes('blank') || catId.includes('fill')) {
        try {
          const fetchRes = await fetch('/blanks_all_questions.json');
          if (fetchRes.ok) {
            loadedQuestions = await fetchRes.json();
          }
        } catch (e) {}
      }

      if (catId.includes('speech') || catId.includes('direct')) {
        try {
          const fetchRes = await fetch('/speech_all_questions.json');
          if (fetchRes.ok) {
            loadedQuestions = await fetchRes.json();
          }
        } catch (e) {}
      }

      if (catId === 'english_active_passive_practice' || catId.includes('active_passive') || catId.includes('voice')) {
        try {
          const fetchRes = await fetch('/active_passive_all_questions.json');
          if (fetchRes.ok) {
            loadedQuestions = await fetchRes.json();
          }
        } catch (e) {}
      }

      if (catId.includes('synonym')) {
        try {
          const fetchRes = await fetch('/synonyms_all_questions.json');
          if (fetchRes.ok) {
            loadedQuestions = await fetchRes.json();
          }
        } catch (e) {}
      }

      if (catId.includes('ows') || catId.includes('one_word') || catId.includes('substitution')) {
        try {
          const fetchRes = await fetch('/ows_all_questions.json');
          if (fetchRes.ok) {
            loadedQuestions = await fetchRes.json();
          }
        } catch (e) {}
      }

      if (loadedQuestions.length === 0) {
        loadedQuestions = SAMPLE_PRACTICE_QUESTIONS[catId] || SAMPLE_PRACTICE_QUESTIONS.railways_practice_domain || [];
      }
    }

    setDomainQuestions(loadedQuestions);
    setLoadingQuestions(false);
  };

  const QUESTIONS_PER_SECTION = 25;
  const totalSections = Math.max(1, Math.ceil(domainQuestions.length / QUESTIONS_PER_SECTION));

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedSectionIndex(null);
    setIsReviewMode(false);
    setSectionSearchQuery('');
    loadDomainQuestions(catId);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedSectionIndex(null);
    setIsReviewMode(false);
    setSectionSearchQuery('');
    setShowStarredView(false);
    setShowFinishSummaryModal(false);
    setDomainQuestions([]);
    setCurrentQIndex(0);
    setSelectedOptionMap({});
  };

  const getSectionStats = (secIdx: number) => {
    const start = secIdx * QUESTIONS_PER_SECTION;
    const end = Math.min(start + QUESTIONS_PER_SECTION, domainQuestions.length);
    const secQuestions = domainQuestions.slice(start, end);

    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    secQuestions.forEach((q, relIdx) => {
      const globalIdx = start + relIdx;
      const selectedOpt = selectedOptionMap[globalIdx];
      if (selectedOpt === undefined) {
        unattempted++;
      } else if (selectedOpt === (q.correctOption ?? 0)) {
        correct++;
      } else {
        wrong++;
      }
    });

    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    const saved = selectedCategory ? sectionResultsMap[`${selectedCategory}_sec_${secIdx}`] : null;
    if (saved) {
      const savedTotal = saved.total || secQuestions.length || QUESTIONS_PER_SECTION;
      const savedAttempted = saved.attempted ?? ((saved.correct || 0) + (saved.wrong || 0));
      return {
        total: savedTotal,
        correct: saved.correct || 0,
        wrong: saved.wrong || 0,
        unattempted: saved.unattempted ?? Math.max(0, savedTotal - savedAttempted),
        attempted: savedAttempted,
        accuracy: saved.accuracy || (savedAttempted > 0 ? Math.round(((saved.correct || 0) / savedAttempted) * 100) : 0),
        isCompleted: savedAttempted > 0
      };
    }

    return {
      total: secQuestions.length,
      correct,
      wrong,
      unattempted,
      attempted,
      accuracy,
      isCompleted: attempted === secQuestions.length && secQuestions.length > 0
    };
  };

  const getPracticeStats = () => {
    if (selectedSectionIndex !== null) {
      return getSectionStats(selectedSectionIndex);
    }
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    domainQuestions.forEach((q, idx) => {
      const selectedOpt = selectedOptionMap[idx];
      if (selectedOpt === undefined) {
        unattempted++;
      } else if (selectedOpt === (q.correctOption ?? 0)) {
        correct++;
      } else {
        wrong++;
      }
    });

    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    return {
      total: domainQuestions.length,
      correct,
      wrong,
      unattempted,
      attempted,
      accuracy
    };
  };

  const handleToggleStar = (q: any, categoryIdOverride?: string, categoryNameOverride?: string) => {
    if (!q) return;
    const qId = String(q.id || q.questionText?.en || q.questionText || Math.random());
    const map = { ...starredQuestionsMap };

    if (map[qId]) {
      delete map[qId];
    } else {
      map[qId] = {
        id: qId,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption ?? 0,
        explanation: q.explanation,
        categoryId: categoryIdOverride || selectedCategory || 'general',
        categoryName: categoryNameOverride || activeCategoryObj?.name || 'Practice Series',
        starredAt: Date.now()
      };
    }

    setStarredQuestionsMap(map);
    try {
      localStorage.setItem('mth_starred_questions', JSON.stringify(map));
      window.dispatchEvent(new CustomEvent('mth_starred_updated'));
    } catch (e) {}
  };

  const isStarred = (targetQ: any) => {
    if (!targetQ) return false;
    const targetId = String(targetQ.id || targetQ.questionText?.en || targetQ.questionText || '');
    return !!starredQuestionsMap[targetId];
  };

  const activeCategoryObj = practiceCatalog.find(c => c.id === selectedCategory);
  const themeInfo = getCategoryTheme(selectedCategory);

  const filteredCatalog = practiceCatalog.filter(cat => {
    return cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.description || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getSubCatIcon = (name: string, logoUrl?: string) => {
    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="w-full h-full object-contain p-1"
        />
      );
    }
    const n = name.toLowerCase();
    if (n.includes('cgl') || n.includes('ssc')) return <Award className="h-6 w-6 text-orange-500" />;
    if (n.includes('ntpc') || n.includes('railway') || n.includes('alp')) return <TrendingUp className="h-6 w-6 text-indigo-500" />;
    if (n.includes('po') || n.includes('bank') || n.includes('sbi') || n.includes('clerk')) return <Coins className="h-6 w-6 text-emerald-500" />;
    if (n.includes('ctet') || n.includes('tet') || n.includes('teach')) return <BookOpen className="h-6 w-6 text-amber-500" />;
    if (n.includes('net') || n.includes('ugc')) return <GraduationCap className="h-6 w-6 text-sky-500" />;
    return <MapPin className="h-6 w-6 text-pink-500" />;
  };

  if (!isMounted) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 items-center justify-center">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeQ = domainQuestions[currentQIndex];

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* HEADER NAVBAR */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-900 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 px-4 md:px-12 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-8 min-w-0">
          {/* Desktop Logo */}
          <Link href="/" className="hidden md:flex items-center gap-3">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-2 rounded-full shadow-sm flex items-center justify-center h-10 w-10 border border-blue-200/50 dark:border-slate-700 shrink-0">
              <Trophy className="h-5.5 w-5.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm leading-tight text-slate-900 dark:text-white tracking-wider">{t.logoTitle}</h1>
              <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase">{t.logoSub}</p>
            </div>
          </Link>

          {/* Mobile Left Header Content: Show Category Name when taking Section Test, else Back to Home */}
          {selectedSectionIndex !== null ? (
            <div className="md:hidden flex items-center gap-2 min-w-0">
              <button
                onClick={() => {
                  setSelectedSectionIndex(null);
                  setIsReviewMode(false);
                }}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0"
                title="Back to Sections"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="font-black text-xs text-slate-900 dark:text-white truncate max-w-[170px]">
                {activeCategoryObj?.name}
              </span>
            </div>
          ) : (
            <Link href="/" className="md:hidden flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 font-extrabold text-xs tracking-wide transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>{language === 'hi' ? 'मुख्य पृष्ठ पर वापस जाएं' : 'Back to Home'}</span>
            </Link>
          )}

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navHome}</Link>
            <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navTestSeries}</Link>
            <Link href="/practice-series" className="text-blue-600 dark:text-blue-400 font-extrabold border-b-2 border-blue-600 dark:border-blue-400 pb-1">{t.navPracticeSeries}</Link>
            <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navUpdates}</Link>
            <Link href="/profile" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navProfile}</Link>
          </nav>
        </div>

        {/* Center: Happy 80th Independence Day Celebration Greeting */}
        <div className="relative hidden lg:flex items-center gap-2 bg-gradient-to-r from-orange-500/15 via-white/20 to-emerald-500/15 dark:from-orange-500/25 dark:via-slate-900/40 dark:to-emerald-500/25 border border-orange-500/30 dark:border-orange-500/40 px-4 py-1.5 rounded-full shadow-xs">
          <span className="text-sm animate-flag-sway leading-none">🇮🇳</span>
          <span className="text-xs font-black text-slate-900 dark:text-amber-300 tracking-wide uppercase flex items-center gap-1.5">
            Happy 80th Independence Day! 🇮🇳
          </span>

          {/* Hanging Indian Tri-Color Balloons in the center just below the tile (Big with Cascading Ribbons) */}
          <div className="absolute top-[85%] left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-xl">
            <HangingTriColorBalloons size="lg" variant="center" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Question Palette Button on Mobile View (Extreme Right of top-most header during section tests) */}
          {selectedSectionIndex !== null && (
            <button
              onClick={() => setShowMobilePaletteModal(true)}
              className="md:hidden px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Question Palette"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Palette</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-95 transition cursor-pointer"
              title={theme === 'light' ? t.themeDark : t.themeLight}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>

          <div className={selectedSectionIndex !== null ? 'hidden sm:block' : 'block'}>
            {currentUser ? (
              <Link href="/profile" className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-extrabold flex items-center gap-1.5">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">{currentUser.name.split(' ')[0]}</span>
              </Link>
            ) : (
              <Link href="/auth" className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition">
                {t.logIn}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {showStarredView ? (
          /* STARRED QUESTIONS VIEW (GROUPED DOMAIN CATEGORY WISE) */
          <div className="space-y-6 animate-fade-in">
            {/* Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowStarredView(false)}
                    className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer transition shrink-0"
                    title="Back to Practice Domains"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h2 className="text-xs sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5 whitespace-nowrap">
                      <Star className="h-4 w-4 sm:h-5 sm:w-5 fill-amber-400 text-amber-500 shrink-0" />
                      <span>{language === 'hi' ? 'स्टार प्रश्न' : 'Starred Questions'}</span>
                    </h2>
                    {/* Hide Grouped Domain Category Subtitle on Mobile View */}
                    <p className="hidden sm:block text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                      {language === 'hi' ? 'डोमेन श्रेणी के अनुसार स्टार प्रश्न' : 'Grouped Domain Category-Wise'}
                    </p>
                  </div>
                </div>

                {/* English / Hindi Toggle Button in Center of Top Horizontal Line on Mobile */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg shrink-0">
                  <button
                    onClick={() => setViewerLang('en')}
                    className={`px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black transition ${
                      viewerLang === 'en' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setViewerLang('hi')}
                    className={`px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black transition ${
                      viewerLang === 'hi' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    HI
                  </button>
                </div>

                {/* Mobile Question Badge */}
                <span className="sm:hidden text-[10px] font-extrabold bg-amber-50 text-amber-600 dark:bg-amber-955/40 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40 shrink-0">
                  {Object.keys(starredQuestionsMap).length} Qs
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-2 justify-end w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                {/* Expand / Collapse All Toggle (Hidden on mobile view as requested) */}
                {Object.keys(starredQuestionsMap).length > 0 && (
                  <button
                    onClick={() => {
                      const allKeys = Object.keys(starredQuestionsMap);
                      const allExpanded = allKeys.every(k => expandedStarredMap[k]);
                      if (allExpanded) {
                        setExpandedStarredMap({});
                      } else {
                        const map: Record<string, boolean> = {};
                        allKeys.forEach(k => { map[k] = true; });
                        setExpandedStarredMap(map);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] sm:text-[11px] font-extrabold transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <ChevronDown className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-200 ${Object.keys(starredQuestionsMap).length > 0 && Object.keys(starredQuestionsMap).every(k => expandedStarredMap[k]) ? 'rotate-180' : ''}`} />
                    <span>
                      {Object.keys(starredQuestionsMap).length > 0 && Object.keys(starredQuestionsMap).every(k => expandedStarredMap[k])
                        ? (viewerLang === 'hi' ? 'सब छिपाएं' : 'Collapse All')
                        : (viewerLang === 'hi' ? 'सब देखें' : 'Expand All')}
                    </span>
                  </button>
                )}

                {/* Desktop Question Badge */}
                <span className="text-xs font-extrabold bg-amber-50 text-amber-600 dark:bg-amber-955/40 dark:text-amber-400 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                  {Object.keys(starredQuestionsMap).length} Starred Questions
                </span>
              </div>
            </div>

            {Object.keys(starredQuestionsMap).length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 font-bold text-xs space-y-3">
                <Star className="h-10 w-10 text-amber-400 mx-auto opacity-50 animate-bounce" />
                <p className="text-slate-700 dark:text-slate-200 font-extrabold text-sm">
                  No Starred Questions Saved Yet
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click the ⭐ Star button on any practice question while practicing to bookmark it here for quick review.
                </p>
                <button
                  onClick={() => setShowStarredView(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  Explore Practice Domains
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const starredList = Object.values(starredQuestionsMap);
                  const grouped: Record<string, { categoryName: string; questions: any[] }> = {};

                  starredList.forEach((item: any) => {
                    const catKey = item.categoryId || 'general';
                    if (!grouped[catKey]) {
                      grouped[catKey] = {
                        categoryName: item.categoryName || 'Practice Series Domain',
                        questions: []
                      };
                    }
                    grouped[catKey].questions.push(item);
                  });

                  return Object.entries(grouped).map(([catKey, group]) => (
                    <div key={catKey} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                      {/* Category Domain Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {group.categoryName}
                            </h3>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                              {group.questions.length} Starred Question{group.questions.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Questions List (Minimized by default, click to expand solution) */}
                      <div className="space-y-3">
                        {group.questions.map((item: any, qIdx: number) => {
                          const q = item.questionText ? item : item.questionData || item;
                          const qId = item.id || q.id || `q_${qIdx}`;
                          const isExpanded = !!expandedStarredMap[qId];

                          const questionTextEn = typeof q.questionText === 'string' ? q.questionText : (q.questionText?.en || String(q));
                          const questionTextHi = typeof q.questionText === 'string' ? q.questionText : (q.questionText?.hi || questionTextEn);

                          return (
                            <div key={qId || qIdx} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-all">
                              {/* Header Bar (Collapsed View) */}
                              <div 
                                className="flex items-center justify-between cursor-pointer select-none"
                                onClick={() => toggleStarredExpand(qId)}
                              >
                                <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className="bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 px-2 py-0.5 rounded text-[9px] font-bold text-blue-600 dark:text-blue-400 truncate max-w-xs">
                                      {group.categoryName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
                                      Q #{qIdx + 1}
                                    </span>
                                  </div>
                                  <MathJaxText
                                    component="div"
                                    className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate markup-content"
                                    content={processQuestionHtml(viewerLang === 'hi' ? questionTextHi : questionTextEn)}
                                  />
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleStar(q, item.categoryId, item.categoryName);
                                    }}
                                    className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-955/30 transition cursor-pointer"
                                    title="Remove Starred Question"
                                  >
                                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                                  </button>
                                  {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                                </div>
                              </div>

                              {/* Expanded View */}
                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/60 space-y-4 animate-in fade-in duration-200">
                                  {/* Question Text Box */}
                                  <div className="bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 rounded-xl text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                                    <p className="font-bold text-blue-600 dark:text-blue-400 mb-1">Question (English):</p>
                                    <MathJaxText component="div" className="font-normal mb-3 markup-content" content={processQuestionHtml(questionTextEn)} />
                                    {questionTextHi && questionTextHi !== questionTextEn && (
                                      <>
                                        <p className="font-bold text-blue-600 dark:text-blue-400 mb-1">प्रश्न (Hindi):</p>
                                        <MathJaxText component="div" className="font-normal markup-content" content={processQuestionHtml(questionTextHi)} />
                                      </>
                                    )}
                                  </div>

                                  {/* Options with Highlighted Correct Answer */}
                                  {(q.options || []).length > 0 && (
                                    <div>
                                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Options & Correct Answer</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {(q.options || []).map((opt: any, oIdx: number) => {
                                          const textEn = typeof opt === 'string' ? opt : opt.en || opt.text || String(opt);
                                          const textHi = typeof opt === 'string' ? opt : opt.hi || opt.text || textEn;
                                          const isCorrect = oIdx === (q.correctOption ?? 0);

                                          return (
                                            <div 
                                              key={oIdx} 
                                              className={`p-3 rounded-lg border text-xs flex flex-col gap-1 ${
                                                isCorrect 
                                                  ? 'bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-900/60 text-green-800 dark:text-green-300 font-semibold' 
                                                  : 'bg-white border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 text-slate-700 dark:text-slate-400'
                                              }`}
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1 font-bold">Option {oIdx + 1}: <MathJaxText content={processQuestionHtml(textEn)} className="font-semibold" /></span>
                                                {isCorrect && <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}
                                              </div>
                                              {textHi !== textEn && <span className="text-[10px] opacity-80 mt-0.5 flex items-center gap-1">हिंदी: <MathJaxText content={processQuestionHtml(textHi)} /></span>}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Solution Explanation */}
                                  {q.explanation && (
                                    <div className="pt-1 space-y-1.5">
                                      <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        {viewerLang === 'hi' ? 'व्याख्या / समाधान:' : 'Explanation / Solution:'}
                                      </p>
                                      <div className="pl-1">
                                        {renderFormattedExplanation(q.explanation, viewerLang, q.id, true)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        ) : selectedCategory === null ? (
          /* ALL PRACTICE DOMAINS GRID (FULL WIDTH) */
          <div className="space-y-6">
            {/* Sub Header (Matched to Test Series Page) */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-6">
              <div className="w-full">
                <div className="flex items-center justify-between w-full gap-2">
                  <h2 className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 shrink">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
                    <span className="truncate">{language === 'hi' ? 'अभ्यास सीरीज़ डोमेन' : 'Practice Series Domains'}</span>
                  </h2>

                  {/* Small Starred Questions Button shifted to the EXTREME RIGHT SIDE */}
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setShowStarredView(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-[9.5px] sm:text-xs shadow-xs transition cursor-pointer hover:scale-105 active:scale-95 shrink-0 ml-auto"
                    title="View Starred Questions"
                  >
                    <Star className="h-3 w-3 fill-amber-100 text-amber-100" />
                    <span>{language === 'hi' ? 'स्टार प्रश्न' : 'Starred'} ({Object.keys(starredQuestionsMap).length})</span>
                  </button>
                </div>

                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {language === 'hi' ? 'एडमिन द्वारा अपलोड किए गए प्रश्नों को सीधे वन-बाय-वन हल करने के लिए डोमेन चुनें' : 'Select a category to explore practice series'}
                </p>
              </div>

              {/* Full Width Search Bar */}
              <div className="relative w-full max-w-full sm:max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'hi' ? 'अभ्यास डोमेन खोजें...' : 'Search practice domain...'}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 shadow-sm font-medium"
                />
              </div>
            </div>

            {/* Category Cards Grid — 2 Tiles per Row on Mobile View */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {filteredCatalog.map((cat) => {
                const isSsc = cat.id.includes('ssc');
                const isRailways = cat.id.includes('railway');
                const isBanking = cat.id.includes('bank');
                const isTeaching = cat.id.includes('teach');
                const isUgcNet = cat.id.includes('ugc') || cat.id.includes('state');

                const accentColor = 
                  isSsc ? 'border-t-orange-500 hover:border-orange-400 hover:bg-orange-50/10 dark:hover:bg-orange-950/5' :
                  isRailways ? 'border-t-indigo-500 hover:border-indigo-400 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/5' :
                  isBanking ? 'border-t-emerald-500 hover:border-emerald-400 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/5' :
                  isTeaching ? 'border-t-amber-500 hover:border-amber-400 hover:bg-amber-50/10 dark:hover:bg-amber-950/5' :
                  isUgcNet ? 'border-t-sky-500 hover:border-sky-400 hover:bg-sky-50/10 dark:hover:bg-sky-950/5' :
                  'border-t-pink-500 hover:border-pink-400 hover:bg-pink-50/10 dark:hover:bg-pink-950/5';

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3.5 rounded-xl flex flex-col sm:flex-row justify-between gap-2 group transition-all shadow-sm hover:shadow-md text-left w-full cursor-pointer border-t-4 ${accentColor}`}
                  >
                    {/* Left details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        {/* Target Logo/Icon Container */}
                        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden mb-2 bg-white transition duration-300">
                          {(cat as any).logoUrl ? (
                            <img
                              src={(cat as any).logoUrl}
                              alt={`${cat.name} logo`}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Target className="h-5 w-5 sm:h-6.5 sm:w-6.5 text-blue-600" />
                          )}
                        </div>

                        <h4 className="font-extrabold text-[10px] sm:text-xs text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                          {cat.name}
                        </h4>

                        {cat.description && (
                          <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1.5 line-clamp-2 leading-tight">
                            {cat.description}
                          </p>
                        )}

                        <span className="text-[7.5px] sm:text-[9px] text-slate-400 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">
                          {cat.countText || 'Practice Series'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-[8px] sm:text-[8.5px] uppercase tracking-wider mt-2 sm:mt-3 pt-1 sm:pt-1.5 border-t border-slate-100 dark:border-slate-800/60 w-full">
                        {viewerLang === 'hi' ? "अभ्यास शुरू करें" : "Start Practice"} <ChevronRight className="h-2.5 w-2.5 transition group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          ) : selectedSectionIndex === null ? (
            /* SECTION SELECTION GRID VIEW FOR THE SELECTED CATEGORY */
            <div className="space-y-6 animate-fade-in">
              {/* Navigation Header */}
              <div className="flex flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToCategories}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer transition shrink-0"
                    title="Back to Practice Domains"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{activeCategoryObj?.name}</span>
                    </h2>
                    <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {activeCategoryObj?.description ? `${activeCategoryObj.description} • ` : ''}{domainQuestions.length} Questions Total • Divided into {totalSections} Sections ({QUESTIONS_PER_SECTION} Questions / Section)
                    </p>
                  </div>
                </div>

                {/* Hide Search Bar on Mobile View */}
                <div className="hidden sm:flex items-center gap-2.5">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={sectionSearchQuery}
                      onChange={(e) => setSectionSearchQuery(e.target.value)}
                      placeholder="Search Section #..."
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-xs font-semibold focus:outline-none focus:border-blue-500 w-36 sm:w-44"
                    />
                  </div>
                </div>
              </div>

              {loadingQuestions ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-400 font-bold text-xs space-y-2">
                  <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p>Loading practice sections...</p>
                </div>
              ) : domainQuestions.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-400 font-bold text-xs space-y-3">
                  <p>No practice questions available for this domain yet.</p>
                  <button
                    onClick={handleBackToCategories}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Back to Practice Domains
                  </button>
                </div>
              ) : (
                /* Section Cards Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {Array.from({ length: totalSections }).map((_, secIdx) => {
                    if (sectionSearchQuery.trim()) {
                      const query = sectionSearchQuery.trim().toLowerCase();
                      const secName = `section ${secIdx + 1}`.toLowerCase();
                      if (!secName.includes(query) && String(secIdx + 1) !== query) {
                        return null;
                      }
                    }

                    const startQ = secIdx * QUESTIONS_PER_SECTION + 1;
                    const endQ = Math.min((secIdx + 1) * QUESTIONS_PER_SECTION, domainQuestions.length);
                    const secStats = getSectionStats(secIdx);

                    return (
                      <div
                        key={secIdx}
                        onClick={() => {
                          if (secStats.attempted > 0 || secStats.isCompleted) {
                            handleReattemptSection(secIdx);
                          } else {
                            setSelectedSectionIndex(secIdx);
                            setIsReviewMode(false);
                            setCurrentQIndex(0);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            if (secStats.attempted > 0 || secStats.isCompleted) {
                              handleReattemptSection(secIdx);
                            } else {
                              setSelectedSectionIndex(secIdx);
                              setIsReviewMode(false);
                              setCurrentQIndex(0);
                            }
                          }
                        }}
                        className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                          secStats.isCompleted
                            ? 'bg-emerald-50/60 dark:bg-emerald-955/20 border-emerald-300 dark:border-emerald-800/80 border-t-4 border-t-emerald-500'
                            : secStats.attempted > 0
                            ? 'bg-amber-50/60 dark:bg-amber-955/20 border-amber-300 dark:border-amber-800/80 border-t-4 border-t-amber-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-t-4 border-t-blue-500'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-955/50 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/40">
                            Section {secIdx + 1}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>

                        <h4 className="text-xs font-black text-slate-900 dark:text-white mb-1">
                          Questions {startQ} - {endQ}
                        </h4>

                        <div className="mt-2.5 w-full pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[10px] font-bold">
                          {secStats.attempted > 0 ? (
                            <>
                              <div className="flex flex-col">
                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                                  <Trophy className="h-3 w-3 text-amber-500 shrink-0" />
                                  <span>{secStats.correct}/{secStats.total} Marks</span>
                                </span>
                                <span className="text-[9px] text-slate-400 font-semibold">
                                  {secStats.accuracy}% Accuracy
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSectionIndex(secIdx);
                                  setIsReviewMode(true);
                                  setCurrentQIndex(0);
                                }}
                                className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white dark:bg-blue-955/50 dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 text-[9px] font-extrabold transition cursor-pointer flex items-center gap-1 border border-blue-200 dark:border-blue-800/80 shrink-0 shadow-xs"
                                title="View Solution & Explanations"
                              >
                                <BookOpen className="h-2.5 w-2.5" />
                                <span>{viewerLang === 'hi' ? 'समाधान' : 'Solution'}</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 font-medium">
                              {secStats.total} Questions
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ONE-BY-ONE SECTION PRACTICE VIEWER */
            <div className="space-y-4 animate-fade-in">
              {(() => {
                const currentSectionQuestions = domainQuestions.slice(
                  selectedSectionIndex * QUESTIONS_PER_SECTION,
                  (selectedSectionIndex + 1) * QUESTIONS_PER_SECTION
                );
                const activeQ = currentSectionQuestions[currentQIndex];
                const globalQIndex = (selectedSectionIndex * QUESTIONS_PER_SECTION) + currentQIndex;

                if (!activeQ) {
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-400 font-bold text-xs space-y-3">
                      <p>No question available in this section.</p>
                      <button
                        onClick={() => setSelectedSectionIndex(null)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs cursor-pointer"
                      >
                        Back to Sections
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Section Navigation Header */}
                    <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs w-full">
                      {/* Left: Back Button, Category Name & Section Dropdown */}
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
                        <button
                          onClick={() => {
                            setSelectedSectionIndex(null);
                            setIsReviewMode(false);
                          }}
                          className="hidden sm:flex p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer transition items-center gap-1 text-xs font-bold shrink-0"
                          title="Back to All Sections"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">Sections</span>
                        </button>

                        <span className="hidden sm:inline text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-[180px]">
                          {activeCategoryObj?.name}
                        </span>

                        {/* Section Dropdown */}
                        <select
                          value={selectedSectionIndex}
                          onChange={(e) => {
                            setSelectedSectionIndex(Number(e.target.value));
                            setIsReviewMode(false);
                            setCurrentQIndex(0);
                          }}
                          className="bg-blue-50 dark:bg-blue-955/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-black text-[10.5px] sm:text-xs px-1.5 sm:px-2 py-1 rounded-lg focus:outline-none cursor-pointer shrink-0"
                        >
                          {Array.from({ length: totalSections }).map((_, idx) => {
                            const startQ = idx * QUESTIONS_PER_SECTION + 1;
                            const endQ = Math.min((idx + 1) * QUESTIONS_PER_SECTION, domainQuestions.length);
                            return (
                              <option key={idx} value={idx}>
                                Sec {idx + 1} (Q{startQ}-Q{endQ})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Center: Language Switcher & Question Number Badge */}
                      <div className="flex items-center gap-1.5 justify-center flex-1">
                        {/* Language Switcher */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg shrink-0">
                          <button
                            onClick={() => setViewerLang('en')}
                            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] font-black transition ${
                              viewerLang === 'en' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            EN
                          </button>
                          <button
                            onClick={() => setViewerLang('hi')}
                            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] font-black transition ${
                              viewerLang === 'hi' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            HI
                          </button>
                        </div>

                        {/* Q Number Badge in Center */}
                        <span className="text-[10px] sm:text-[11px] font-extrabold bg-blue-50 text-blue-600 dark:bg-blue-955 dark:text-blue-400 px-2 py-0.5 sm:py-1 rounded-lg border border-blue-200 dark:border-blue-900/40 shrink-0 whitespace-nowrap">
                          Q {currentQIndex + 1}/{currentSectionQuestions.length}
                        </span>
                      </div>

                      {/* Right: Next Sec Button */}
                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        <button
                          onClick={() => {
                            if (selectedSectionIndex < totalSections - 1) {
                              setSelectedSectionIndex(selectedSectionIndex + 1);
                              setIsReviewMode(false);
                              setCurrentQIndex(0);
                            }
                          }}
                          disabled={selectedSectionIndex >= totalSections - 1}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-extrabold transition disabled:opacity-40 cursor-pointer flex items-center gap-1 shadow-xs shrink-0"
                        >
                          <span>Next Sec</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* TWO-COLUMN LAYOUT: QUESTION CARD LEFT, QUESTION PALETTE RIGHT */}
                    <div className="flex flex-col lg:flex-row gap-5 items-start">

                      {/* LEFT COLUMN: QUESTION CARD, OPTIONS & EXPLANATION */}
                      <div className="flex-1 min-w-0 space-y-4 w-full">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
                          {/* Question Text */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                                Section {selectedSectionIndex + 1} • Question #{currentQIndex + 1} of {currentSectionQuestions.length} (Q #{globalQIndex + 1})
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleStar(activeQ)}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1.5 text-xs font-extrabold ${
                                    isStarred(activeQ)
                                      ? 'bg-amber-50 dark:bg-amber-955/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 shadow-xs'
                                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500'
                                  }`}
                                  title={isStarred(activeQ) ? 'Unstar Question' : 'Star Question'}
                                >
                                  <Star className={`h-3.5 w-3.5 ${isStarred(activeQ) ? 'fill-amber-400 text-amber-500' : ''}`} />
                                  <span>{isStarred(activeQ) ? 'Starred' : 'Star'}</span>
                                </button>

                                <button
                                  onClick={() => setShowReportModal(true)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-800 transition cursor-pointer flex items-center gap-1.5 text-xs font-extrabold"
                                  title="Report Question Issue"
                                >
                                  <Flag className="h-3.5 w-3.5" />
                                  <span>{viewerLang === 'hi' ? 'रिपोर्ट' : 'Report'}</span>
                                </button>
                              </div>
                            </div>
                            <MathJaxText
                              component="div"
                              className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed markup-content"
                              content={processQuestionHtml(
                                viewerLang === 'hi'
                                  ? (activeQ.questionText?.hi || activeQ.questionText?.en || String(activeQ))
                                  : (activeQ.questionText?.en || String(activeQ))
                              )}
                            />
                          </div>

                          {/* 4 Multiple Choice Options */}
                          <div className="space-y-2.5 pt-1">
                            {(() => {
                              const rawOpts = activeQ.options || [];
                              const selectedOptIdx = selectedOptionMap[globalQIndex];
                              const hasSelected = selectedOptIdx !== undefined;
                              const correctOptIdx = activeQ.correctOption ?? 0;

                              return rawOpts.map((opt: any, oIdx: number) => {
                                const optTextEn = typeof opt === 'string' ? opt : opt.en || opt.text || String(opt);
                                const optTextHi = typeof opt === 'string' ? opt : opt.hi || optTextEn;
                                const optText = viewerLang === 'hi' ? optTextHi : optTextEn;

                                const isSelected = selectedOptIdx === oIdx;
                                const isCorrect = oIdx === correctOptIdx;

                                let optionStyle = "bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-blue-500/50";

                                if (isReviewMode) {
                                  if (hasSelected) {
                                    if (isCorrect) {
                                      optionStyle = "bg-emerald-50 dark:bg-emerald-955/40 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shadow-xs";
                                    } else if (isSelected && !isCorrect) {
                                      optionStyle = "bg-rose-50 dark:bg-rose-955/40 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 shadow-xs";
                                    } else {
                                      optionStyle = "bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-60";
                                    }
                                  } else if (isCorrect) {
                                    optionStyle = "bg-emerald-50 dark:bg-emerald-955/40 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shadow-xs";
                                  }
                                } else {
                                  if (isSelected) {
                                    optionStyle = "bg-blue-50 dark:bg-blue-955/60 border-blue-500 dark:border-blue-500 text-blue-900 dark:text-blue-100 shadow-xs font-bold";
                                  }
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => {
                                      if (!isReviewMode) {
                                        setSelectedOptionMap(prev => ({ ...prev, [globalQIndex]: oIdx }));
                                      }
                                    }}
                                    className={`w-full text-left p-3 rounded-xl border font-semibold text-xs sm:text-sm transition flex items-center justify-between gap-3 ${
                                      isReviewMode ? 'cursor-default' : 'cursor-pointer'
                                    } ${optionStyle}`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className={`w-6 h-6 rounded-lg border flex items-center justify-center font-black text-xs shrink-0 ${
                                        isSelected && !isReviewMode
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'bg-white/80 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                      }`}>
                                        {oIdx + 1}
                                      </span>
                                      <MathJaxText content={processQuestionHtml(optText)} className="flex-1" />
                                    </div>

                                    {isReviewMode && (
                                      <div>
                                        {isCorrect && (
                                          <span className="flex items-center gap-1 text-[9px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            <Check className="h-3 w-3" /> Correct
                                          </span>
                                        )}
                                        {isSelected && !isCorrect && (
                                          <span className="flex items-center gap-1 text-[9px] bg-rose-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            <X className="h-3 w-3" /> Incorrect
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </button>
                                );
                              });
                            })()}
                          </div>

                          {/* Solution Explanation - ONLY SHOWN IN REVIEW MODE */}
                          {isReviewMode && (
                            <div className="pt-2 space-y-1.5 animate-fade-in">
                              <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {viewerLang === 'hi' ? 'व्याख्या / समाधान:' : 'Explanation / Solution:'}
                              </p>
                              <div className="pl-1">
                                {renderFormattedExplanation(activeQ.explanation, viewerLang, activeQ.id, true)}
                              </div>
                            </div>
                          )}

                          {/* Navigation Toolbar */}
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQIndex === 0}
                                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition disabled:opacity-40 cursor-pointer flex items-center gap-1"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" /> {viewerLang === 'hi' ? 'पिछला' : 'Previous'}
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedOptionMap(prev => {
                                    const copy = { ...prev };
                                    delete copy[globalQIndex];
                                    return copy;
                                  });
                                }}
                                disabled={selectedOptionMap[globalQIndex] === undefined || isReviewMode}
                                className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-955/40 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-bold text-xs transition disabled:opacity-40 cursor-pointer flex items-center gap-1"
                                title="Clear selected response"
                              >
                                <RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                <span>{viewerLang === 'hi' ? 'प्रतिक्रिया साफ़ करें' : 'Clear Response'}</span>
                              </button>
                            </div>

                            <button
                              onClick={() => setCurrentQIndex(prev => Math.min(currentSectionQuestions.length - 1, prev + 1))}
                              disabled={currentQIndex === currentSectionQuestions.length - 1}
                              className="px-4.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                            >
                              <span>
                                {isReviewMode
                                  ? (viewerLang === 'hi' ? 'अगला' : 'Next')
                                  : (viewerLang === 'hi' ? 'सहेजें और अगला' : 'Save & Next')}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT COLUMN: COMPACT CBT QUESTION PALETTE (Hidden on mobile view as requested) */}
                      <div className="hidden lg:block w-72 shrink-0 space-y-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3.5 sticky top-20">
                          {/* Candidate Avatar & Status */}
                          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs uppercase shrink-0">
                              {currentUser?.name ? currentUser.name.substring(0, 2) : 'CBT'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                {currentUser?.name || 'Practice Candidate'}
                              </h4>
                              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block truncate">
                                Section {selectedSectionIndex + 1} ({currentSectionQuestions.length} Qs)
                              </span>
                            </div>
                          </div>

                          {/* Legend Status Counts for Section */}
                          {(() => {
                            let secAttempted = 0;
                            currentSectionQuestions.forEach((_, relIdx) => {
                              const gIdx = (selectedSectionIndex * QUESTIONS_PER_SECTION) + relIdx;
                              if (selectedOptionMap[gIdx] !== undefined) secAttempted++;
                            });
                            const secNotVisited = currentSectionQuestions.length - secAttempted;

                            return (
                              <div className="grid grid-cols-2 gap-1.5 text-[9px] font-extrabold">
                                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-955/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                                  <span className="w-4.5 h-4.5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[9px]">{secAttempted}</span>
                                  <span>Attempted</span>
                                </div>
                                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  <span className="w-4.5 h-4.5 rounded-md bg-slate-400 dark:bg-slate-700 text-white flex items-center justify-center text-[9px]">{secNotVisited}</span>
                                  <span>Not Visited</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Question Palette Matrix */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                              Section Palette ({currentSectionQuestions.length})
                            </span>

                            <div className="grid grid-cols-5 gap-1.5 p-0.5">
                              {currentSectionQuestions.map((q, relIdx) => {
                                const isCurrent = relIdx === currentQIndex;
                                const gIdx = (selectedSectionIndex * QUESTIONS_PER_SECTION) + relIdx;
                                const selectedOpt = selectedOptionMap[gIdx];
                                const hasAttempted = selectedOpt !== undefined;
                                const isCorrect = hasAttempted && selectedOpt === (q.correctOption ?? 0);

                                let btnBg = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";

                                if (isReviewMode) {
                                  if (hasAttempted) {
                                    if (isCorrect) {
                                      btnBg = "bg-emerald-600 text-white border-emerald-700 shadow-xs";
                                    } else {
                                      btnBg = "bg-rose-600 text-white border-rose-700 shadow-xs";
                                    }
                                  } else {
                                    btnBg = "bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-600";
                                  }
                                } else {
                                  if (hasAttempted) {
                                    btnBg = "bg-blue-600 text-white border-blue-700 shadow-xs font-bold";
                                  }
                                }

                                if (isCurrent) {
                                  btnBg += " ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 font-black scale-105";
                                }

                                return (
                                  <button
                                    key={relIdx}
                                    onClick={() => setCurrentQIndex(relIdx)}
                                    className={`h-8 rounded-lg text-xs font-bold transition flex items-center justify-center border cursor-pointer ${btnBg}`}
                                  >
                                    {relIdx + 1}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Finish Section Button (Hidden in solution/review mode) */}
                          {!isReviewMode && (
                            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                              <button
                                onClick={() => {
                                  if (selectedCategory && selectedSectionIndex !== null) {
                                    const stats = getSectionStats(selectedSectionIndex);
                                    saveSectionResult(selectedCategory, selectedSectionIndex, stats);
                                  }
                                  setShowFinishSummaryModal(true);
                                }}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{viewerLang === 'hi' ? 'सेक्शन पूरा करें (परिणाम)' : 'Finish Section'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* MOBILE QUESTION PALETTE MODAL (Opened by Palette Button on Header) */}
                    {showMobilePaletteModal && (
                      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                              <LayoutDashboard className="h-4 w-4 text-amber-500" />
                              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {activeCategoryObj?.name} — Section {selectedSectionIndex + 1}
                              </h3>
                            </div>
                            <button
                              onClick={() => setShowMobilePaletteModal(false)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          {/* Legend Status */}
                          {(() => {
                            let secAttempted = 0;
                            currentSectionQuestions.forEach((_, relIdx) => {
                              const gIdx = (selectedSectionIndex * QUESTIONS_PER_SECTION) + relIdx;
                              if (selectedOptionMap[gIdx] !== undefined) secAttempted++;
                            });
                            const secNotVisited = currentSectionQuestions.length - secAttempted;

                            return (
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold">
                                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-955/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                                  <span className="w-4.5 h-4.5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[9px]">{secAttempted}</span>
                                  <span>Attempted</span>
                                </div>
                                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  <span className="w-4.5 h-4.5 rounded-md bg-slate-400 dark:bg-slate-700 text-white flex items-center justify-center text-[9px]">{secNotVisited}</span>
                                  <span>Not Visited</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Palette Grid */}
                          <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1">
                            {currentSectionQuestions.map((q, relIdx) => {
                              const isCurrent = relIdx === currentQIndex;
                              const gIdx = (selectedSectionIndex * QUESTIONS_PER_SECTION) + relIdx;
                              const selectedOpt = selectedOptionMap[gIdx];
                              const hasAttempted = selectedOpt !== undefined;
                              const isCorrect = hasAttempted && selectedOpt === (q.correctOption ?? 0);

                              let btnBg = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";

                              if (isReviewMode) {
                                if (hasAttempted) {
                                  btnBg = isCorrect ? "bg-emerald-600 text-white border-emerald-700" : "bg-rose-600 text-white border-rose-700";
                                } else {
                                  btnBg = "bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-600";
                                }
                              } else {
                                if (hasAttempted) {
                                  btnBg = "bg-blue-600 text-white border-blue-700 font-bold";
                                }
                              }

                              if (isCurrent) {
                                btnBg += " ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 font-black scale-105";
                              }

                              return (
                                <button
                                  key={relIdx}
                                  onClick={() => {
                                    setCurrentQIndex(relIdx);
                                    setShowMobilePaletteModal(false);
                                  }}
                                  className={`h-10 rounded-xl text-xs font-bold transition flex items-center justify-center border cursor-pointer ${btnBg}`}
                                >
                                  {relIdx + 1}
                                </button>
                              );
                            })}
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            {!isReviewMode && (
                              <button
                                onClick={() => {
                                  if (selectedCategory && selectedSectionIndex !== null) {
                                    const stats = getSectionStats(selectedSectionIndex);
                                    saveSectionResult(selectedCategory, selectedSectionIndex, stats);
                                  }
                                  setShowMobilePaletteModal(false);
                                  setShowFinishSummaryModal(true);
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{viewerLang === 'hi' ? 'सेक्शन पूरा करें' : 'Finish Section'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => setShowMobilePaletteModal(false)}
                              className={`${isReviewMode ? 'w-full' : 'px-4'} py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs cursor-pointer`}
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
      </main>

      {/* PRACTICE FINISH & PERFORMANCE SUMMARY MODAL */}
      {showFinishSummaryModal && (() => {
        const stats = getPracticeStats();
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl space-y-3.5 sm:space-y-5 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              
              {/* Header Icon & Title */}
              <div className="text-center space-y-1 sm:space-y-1.5">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-blue-50 dark:bg-blue-955/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 shadow-xs">
                  <Trophy className="h-5 w-5 sm:h-7 sm:w-7 text-amber-500 animate-bounce" />
                </div>
                <h3 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white">
                  {viewerLang === 'hi' ? 'अभ्यास परिणाम सारांश' : 'Practice Completed!'}
                </h3>
                <p className="text-[10px] sm:text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {activeCategoryObj?.name || 'Practice Series Domain'}
                </p>
              </div>

              {/* Stats Grid: Correct & Wrong Answers */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* Correct Answers */}
                <div className="bg-emerald-50/80 dark:bg-emerald-955/40 border border-emerald-200 dark:border-emerald-900/60 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl space-y-0.5 text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{viewerLang === 'hi' ? 'सही उत्तर' : 'Correct'}</span>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {stats.correct} <span className="text-[10px] sm:text-xs font-bold text-emerald-700/70">/ {stats.total}</span>
                  </p>
                </div>

                {/* Wrong Answers */}
                <div className="bg-rose-50/80 dark:bg-rose-955/40 border border-rose-200 dark:border-rose-900/60 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl space-y-0.5 text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-rose-700 dark:text-rose-400 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>{viewerLang === 'hi' ? 'गलत उत्तर' : 'Wrong'}</span>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                    {stats.wrong} <span className="text-[10px] sm:text-xs font-bold text-rose-700/70">/ {stats.total}</span>
                  </p>
                </div>

                {/* Unattempted */}
                <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-2 sm:p-3 rounded-xl sm:rounded-2xl space-y-0.5 text-center">
                  <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {viewerLang === 'hi' ? 'प्रयास नहीं किया' : 'Unattempted'}
                  </span>
                  <p className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-200">
                    {stats.unattempted}
                  </p>
                </div>

                {/* Accuracy */}
                <div className="bg-blue-50/80 dark:bg-blue-955/40 border border-blue-200 dark:border-blue-900/60 p-2 sm:p-3 rounded-xl sm:rounded-2xl space-y-0.5 text-center">
                  <span className="text-[9px] sm:text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                    {viewerLang === 'hi' ? 'सटीकता' : 'Accuracy'}
                  </span>
                  <p className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400">
                    {stats.accuracy}%
                  </p>
                </div>
              </div>

              {/* Visual Performance Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                  <span>Performance</span>
                  <span>{stats.attempted} / {stats.total} Attempted</span>
                </div>
                <div className="h-2 sm:h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${stats.total > 0 ? (stats.correct / stats.total) * 100 : 0}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                    title={`Correct: ${stats.correct}`}
                  />
                  <div
                    style={{ width: `${stats.total > 0 ? (stats.wrong / stats.total) * 100 : 0}%` }}
                    className="bg-rose-500 h-full transition-all duration-500"
                    title={`Wrong: ${stats.wrong}`}
                  />
                  <div
                    style={{ width: `${stats.total > 0 ? (stats.unattempted / stats.total) * 100 : 0}%` }}
                    className="bg-slate-300 dark:bg-slate-700 h-full transition-all duration-500"
                    title={`Unattempted: ${stats.unattempted}`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-1">
                <button
                  onClick={() => {
                    setIsReviewMode(true);
                    setShowFinishSummaryModal(false);
                    setCurrentQIndex(0);
                  }}
                  className="py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-[10.5px] sm:text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700 text-center"
                >
                  {viewerLang === 'hi' ? 'व्याख्या' : 'Explanation'}
                </button>

                <button
                  onClick={() => {
                    if (selectedSectionIndex !== null) {
                      handleReattemptSection(selectedSectionIndex);
                    }
                  }}
                  className="py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10.5px] sm:text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{viewerLang === 'hi' ? 'पुनः प्रयास' : 'Reattempt'}</span>
                </button>

                {selectedSectionIndex !== null && selectedSectionIndex + 1 < totalSections && (
                  <button
                    onClick={() => {
                      setShowFinishSummaryModal(false);
                      setSelectedSectionIndex(selectedSectionIndex + 1);
                      setCurrentQIndex(0);
                    }}
                    className="py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10.5px] sm:text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>{viewerLang === 'hi' ? `अगला (${selectedSectionIndex + 2})` : `Next (${selectedSectionIndex + 2})`}</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowFinishSummaryModal(false);
                    setSelectedSectionIndex(null);
                  }}
                  className="py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10.5px] sm:text-xs shadow-md transition cursor-pointer text-center"
                >
                  {viewerLang === 'hi' ? 'सेक्शन पर वापस जाएं' : 'Back to Sections'}
                </button>
              </div>

            </div>
          </div>
        );
      })()}
      {/* REPORT QUESTION MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-base">
                <Flag className="h-5 w-5 text-rose-500" />
                <span>{viewerLang === 'hi' ? 'प्रश्न की रिपोर्ट करें' : 'Report Question Issue'}</span>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {viewerLang === 'hi' ? 'समस्या का प्रकार चुनिए:' : 'Select Issue Category:'}
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="incorrect_answer">{viewerLang === 'hi' ? 'गलत उत्तर / विकल्प त्रुटि' : 'Incorrect Answer / Option Error'}</option>
                  <option value="typo_error">{viewerLang === 'hi' ? 'टाइपिंग या वर्तनी त्रुटि' : 'Typo or Spelling Mistake'}</option>
                  <option value="translation_issue">{viewerLang === 'hi' ? 'अनुवाद में समस्या (हिन्दी/अंग्रेजी)' : 'Translation Discrepancy'}</option>
                  <option value="other">{viewerLang === 'hi' ? 'अन्य कारण' : 'Other Reason'}</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {viewerLang === 'hi' ? 'अतिरिक्त टिप्पणी (ऐच्छिक):' : 'Additional Remarks (Optional):'}
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  placeholder={viewerLang === 'hi' ? 'कृपया समस्या का विवरण दें...' : 'Describe what looks incorrect...'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs transition cursor-pointer"
              >
                {viewerLang === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportDetails('');
                  setReportSuccessToast(true);
                  setTimeout(() => setReportSuccessToast(false), 3500);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition cursor-pointer"
              >
                {viewerLang === 'hi' ? 'रिपोर्ट जमा करें' : 'Submit Report'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REPORT SUCCESS TOAST */}
      {reportSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <h5 className="font-extrabold text-xs">
              {viewerLang === 'hi' ? 'रिपोर्ट जमा की गई!' : 'Report Submitted!'}
            </h5>
            <p className="text-[10px] text-slate-400">
              {viewerLang === 'hi' ? 'हमारी टीम जल्द ही इसकी समीक्षा करेगी।' : 'Our content team will review this question.'}
            </p>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-6 px-4 text-center text-xs text-slate-500">
        <p className="font-bold">© 2026 MockTest Hub. All rights reserved.</p>
        <div className="mt-2 flex items-center justify-center gap-4 text-[11px] font-bold">
          <Link href="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Contact Us</Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Terms & Conditions</Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Privacy Policy</Link>
        </div>
      </footer>

      {/* Floating Support & Suggestion Widgets (Hidden on mobile view as requested) */}
      <div className="hidden sm:block">
        <HomeSupportWidget variant="expandable" />
      </div>
    </div>
  );
}
