"use client";

import React, { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../AuthContext';
import { TRANSLATIONS } from '../../../translations';
import {
  Keyboard,
  Trophy,
  Zap,
  Award,
  Play,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Sun,
  Moon,
  User,
  Scale,
  Train,
  AlertCircle,
  Clock,
  RotateCcw,
  BarChart2,
  CheckCircle2,
  Search,
  Check,
  ShieldAlert,
  Info,
  Download,
  Filter,
  Smile,
  Meh,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { TypingTest, TypingCategory, TypingAttempt, isSscExam, isSscCglExam, isSscChslExam, isAiimsExam, detectExamCategory, ExamCategoryConfig } from '../../../lib/typingTypes';

const cleanDisplayTitle = (title: string) => {
  if (!title) return '';
  return title
    .replace(/\s*\((?:Easy|Medium|Hard|आसान|मध्यम|कठिन)\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export default function TypingCategoryDetailPage({
  params
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const resolvedParams = use(params);
  const categoryId = resolvedParams.categoryId;

  const { currentUser, theme, toggleTheme, language, setLanguage } = useAuth();
  const t = TRANSLATIONS[language];
  const isHindi = language === 'hi';
  const router = useRouter();

  const [categories, setCategories] = useState<TypingCategory[]>([]);
  const [tests, setTests] = useState<TypingTest[]>([]);
  const [userAttempts, setUserAttempts] = useState<TypingAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Filters inside category (only language and search)
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>('en');
  const [passageSearch, setPassageSearch] = useState<string>('');

  useEffect(() => {
    let active = true;
    setIsMounted(true);

    // 1. Instant client-side hydration from cache
    try {
      const cachedCats = sessionStorage.getItem('cached_typing_categories');
      if (cachedCats) {
        const parsed = JSON.parse(cachedCats);
        if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
      }
      const cachedTests = sessionStorage.getItem(`cached_typing_tests_${categoryId}`);
      if (cachedTests) {
        const parsedT = JSON.parse(cachedTests);
        if (Array.isArray(parsedT) && parsedT.length > 0) {
          setTests(parsedT);
          setIsLoading(false);
        }
      }
      const localAttempts = localStorage.getItem('all_typing_attempts');
      if (localAttempts) {
        const parsedAtt = JSON.parse(localAttempts);
        if (Array.isArray(parsedAtt)) setUserAttempts(parsedAtt);
      }
    } catch (e) {}

    // 2. Fetch fresh scoped tests
    const fetchCategoryTests = async () => {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-typing-tests',
            data: { categoryId: categoryId === 'all' ? undefined : categoryId, light: true }
          })
        });
        const data = await res.json();
        if (data.success && active) {
          if (Array.isArray(data.tests)) {
            setTests(data.tests);
            try {
              sessionStorage.setItem(`cached_typing_tests_${categoryId}`, JSON.stringify(data.tests));
            } catch (e) {}
          }
          if (Array.isArray(data.categories)) {
            setCategories(data.categories);
            try {
              sessionStorage.setItem('cached_typing_categories', JSON.stringify(data.categories));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error('Failed to load category typing tests:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchCategoryTests();

    // Fetch user attempts in background
    if (currentUser?.id) {
      fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-user-typing-attempts',
          data: { userId: currentUser.id }
        })
      })
        .then(res => res.json())
        .then(attData => {
          if (attData.success && active && Array.isArray(attData.attempts)) {
            setUserAttempts(attData.attempts);
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [categoryId, currentUser?.id]);

  const currentCategory = useMemo(() => {
    if (categoryId === 'all') {
      return {
        id: 'all',
        name: 'Mock Test Hub Typing Test Practice Platform',
        nameHi: 'मॉक टेस्ट हब टाइपिंग टेस्ट प्रैक्टिस प्लेटफॉर्म',
        description: 'Practice and master computer typing test simulation for all central and state government recruitment exams.',
        icon: 'Sparkles',
        logoUrl: '',
        orderIndex: 0,
        isActive: true,
        createdAt: '',
        updatedAt: ''
      } as TypingCategory;
    }
    return categories.find(c => c.id === categoryId || c.id.toLowerCase() === categoryId.toLowerCase()) || null;
  }, [categoryId, categories]);

  // Parse structured metadata from description
  const categoryMeta = useMemo(() => {
    if (!currentCategory?.description) {
      return {
        description: currentCategory ? `${currentCategory.name} official typing test preparation.` : '',
        rules: '',
        pdfUrl: ''
      };
    }
    try {
      const parsed = JSON.parse(currentCategory.description);
      if (parsed && typeof parsed === 'object') {
        return {
          description: parsed.description || '',
          rules: parsed.rules || '',
          pdfUrl: parsed.pdfUrl || ''
        };
      }
    } catch (e) {}
    return {
      description: currentCategory.description,
      rules: '',
      pdfUrl: ''
    };
  }, [currentCategory]);

  // Set of test IDs belonging to this category
  const categoryTestIdSet = useMemo(() => new Set(tests.map(t => t.id)), [tests]);

  // User attempts strictly matching this individual category
  const categoryAttempts = useMemo(() => {
    if (!userAttempts.length) return [];
    if (categoryId === 'all') return userAttempts;

    const catIdNorm = (categoryId || '').toLowerCase().replace(/[-_\s]/g, '');
    const catNameNorm = (currentCategory?.name || '').toLowerCase().replace(/[-_\s]/g, '');

    return userAttempts.filter(a => {
      // 1. Direct test ID match from loaded category tests
      if (categoryTestIdSet.has(a.testId)) return true;

      // 2. Category name or ID match recorded on attempt
      const attemptCatNorm = (a.categoryName || '').toLowerCase().replace(/[-_\s]/g, '');
      if (attemptCatNorm && (attemptCatNorm.includes(catIdNorm) || catIdNorm.includes(attemptCatNorm))) return true;
      if (attemptCatNorm && catNameNorm && (attemptCatNorm.includes(catNameNorm) || catNameNorm.includes(attemptCatNorm))) return true;

      // 3. Test ID substring match (e.g. 'tm-spmcil-typing-6789' with 'spmcil')
      const testIdNorm = (a.testId || '').toLowerCase().replace(/[-_\s]/g, '');
      if (catIdNorm && testIdNorm.includes(catIdNorm)) return true;

      // 4. Test title substring match (e.g. 'SPMCIL Typing Passage 1' with 'SPMCIL')
      const titleNorm = (a.testTitle || '').toLowerCase().replace(/[-_\s]/g, '');
      if (catNameNorm && titleNorm.includes(catNameNorm)) return true;

      // 5. Short keyword check for exam slugs
      const shortKey = catIdNorm
        .replace('typing', '')
        .replace('passage', '')
        .replace('exam', '')
        .replace('test', '');
      if (shortKey.length >= 3 && (testIdNorm.includes(shortKey) || titleNorm.includes(shortKey))) {
        return true;
      }

      return false;
    });
  }, [userAttempts, tests, categoryId, currentCategory?.name, categoryTestIdSet]);

  // Personal Best Stats for this individual category (matching Typing Home Page formula)
  const categoryPersonalBest = useMemo(() => {
    if (!categoryAttempts.length) return null;
    const bestNetWpm = Math.max(...categoryAttempts.map(a => Number(a.netWpm || 0)));
    const avgAccuracy = Math.round((categoryAttempts.reduce((acc, a) => acc + (Number(a.accuracyPercentage) || 0), 0) / categoryAttempts.length) * 10) / 10;
    const qualifiedCount = categoryAttempts.filter(a => a.isQualified).length;
    return {
      bestNetWpm: isFinite(bestNetWpm) ? Math.round(bestNetWpm * 10) / 10 : 0,
      avgAccuracy: isFinite(avgAccuracy) ? avgAccuracy : 0,
      totalAttempts: categoryAttempts.length,
      qualifiedCount
    };
  }, [categoryAttempts]);

  // Filtered only by language and search (no difficulty segregation)
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      if (test.language !== selectedLanguage) return false;

      if (passageSearch.trim()) {
        const q = passageSearch.toLowerCase();
        const rawTitle = (test.title || '').toLowerCase();
        const rawTitleHi = (test.titleHi || '').toLowerCase();
        const cleanT = cleanDisplayTitle(test.title).toLowerCase();
        if (!rawTitle.includes(q) && !rawTitleHi.includes(q) && !cleanT.includes(q)) return false;
      }

      return true;
    });
  }, [tests, selectedLanguage, passageSearch]);

  // Count available passages by language
  const englishCount = useMemo(() => tests.filter(t => t.language === 'en').length, [tests]);
  const hindiCount = useMemo(() => tests.filter(t => t.language === 'hi').length, [tests]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200" suppressHydrationWarning>
      {/* 1. NAVBAR HEADER */}
      <header className="h-18 sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs" suppressHydrationWarning>
        {/* Left Side: Back button + Branding */}
        <div className="flex items-center gap-3">
          <Link
            href="/typing-test"
            className="btn-3d btn-3d-slate flex items-center gap-1.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">{isHindi ? 'टाइपिंग प्लेटफॉर्म' : 'Typing Platform'}</span>
            <span className="sm:hidden">{isHindi ? 'श्रेणियां' : 'Back'}</span>
          </Link>

          <Link href="/" className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800 shrink-0 hover:opacity-90 transition">
            <div className="bg-[#E6F4FE] p-1.5 rounded-full shadow-sm flex items-center justify-center h-8.5 w-8.5 border border-blue-200/60 shrink-0">
              <Trophy className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-xs lg:text-sm leading-tight text-slate-900 dark:text-white tracking-wider truncate">
                {t.logoTitle}
              </h1>
              <p className="text-[8px] lg:text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase truncate">
                {t.logoSub}
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-3 lg:gap-6 text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0 ml-2 lg:ml-4">
            <Link href="/typing-test" className="text-blue-600 dark:text-blue-400 font-extrabold whitespace-nowrap">
              <span>{isHindi ? 'टाइपिंग टेस्ट' : 'Typing Tests'}</span>
            </Link>
            <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">
              <span>{t.navTestSeries}</span>
            </Link>
            <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">
              <span>{language === 'hi' ? 'सूचनाएं' : 'Notices'}</span>
            </Link>
          </nav>
        </div>

        {/* Right Navigation & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5" suppressHydrationWarning>
          {/* Profile Button */}
          <Link
            href={currentUser ? "/profile" : "/auth"}
            suppressHydrationWarning
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer active:scale-95 shadow-2xs shrink-0"
            title={currentUser ? (language === 'hi' ? 'मेरी प्रोफाइल' : 'Profile') : (language === 'hi' ? 'लॉग इन' : 'Login')}
          >
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline" suppressHydrationWarning>{currentUser ? (language === 'hi' ? 'प्रोफाइल' : 'Profile') : (language === 'hi' ? 'लॉग इन' : 'Login')}</span>
          </Link>

          {/* Language Selector */}
          <select
            suppressHydrationWarning
            value={language}
            onChange={e => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none cursor-pointer text-slate-700 dark:text-slate-300"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
          </select>

          {/* Theme Switcher */}
          <button
            suppressHydrationWarning
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            title={theme === 'light' ? t.themeDark : t.themeLight}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* 2. EXAM HEADER CARD */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -z-10 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col items-center max-w-3xl mx-auto space-y-4">
            {/* Category Logo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white border-2 border-slate-200/90 dark:border-slate-700/80 shadow-md p-2 flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105">
              {currentCategory?.logoUrl ? (
                <img
                  src={currentCategory.logoUrl}
                  alt={currentCategory.name}
                  loading="lazy"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Keyboard className="w-12 h-12 text-blue-600" />
              )}
            </div>

            {/* Exam Title */}
            <div>
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900 mb-2">
                Official Typing Simulation
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-300">
                {currentCategory?.name || 'Typing Test'}
              </h1>
            </div>

            {/* Exam Description */}
            {categoryMeta.description && (
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                {categoryMeta.description}
              </p>
            )}

            {/* Typing Rules Box */}
            <div className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-700 text-left space-y-2.5 shadow-2xs mt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2.5">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-extrabold text-sm sm:text-base">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{isHindi ? 'टाइपिंग परीक्षा के नियम एवं मानक' : 'Official Typing Rules & Guidelines'}</span>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-3">
                {(() => {
                  const catConfig = detectExamCategory(currentCategory);
                  const key = catConfig.key;

                  if (key === 'aiims-cre') {
                    return (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                        <div className="font-bold text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>🏛️ AIIMS Common Recruitment Examination (CRE-5) Official Speed & Penalty Formulas</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. MISTAKES & PENALTY CALCULATION:</strong>
                            <div className="font-mono text-[11px] text-emerald-800 dark:text-emerald-400 bg-emerald-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Total Mistakes = Full Mistakes + 1/2 Half Mistakes<br />
                              [Note: NO rounding off e.g. FM=4 & HM=7, Total=7.5]
                            </div>
                            <div>• Standard Average Word length = <strong>5 strokes</strong>.</div>
                            <div>• Penalty = <strong>50 strokes</strong> for each mistake (50 × Total Mistakes).</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. SPEED & ACCURACY (15 Min Test):</strong>
                            <div className="font-mono text-[11px] text-emerald-800 dark:text-emerald-400 bg-emerald-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Net Speed (w.p.m.) = (Total Strokes − Penalty) ÷ 75<br />
                              Gross Speed (w.p.m.) = Total Strokes ÷ 75
                            </div>
                            <div>• Accuracy (%) = (Net Typing Speed ÷ Gross Typing Speed) × 100.</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-emerald-200 dark:border-emerald-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Qualifying Standard: <strong>35 WPM (English) / 30 WPM (Hindi)</strong></span>
                          <span>• Backspace key: <strong>Allowed</strong></span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'ssc-cgl' || key === 'ssc-cgl-previous') {
                    return (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                        <div className="font-bold text-blue-900 dark:text-blue-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>🏛️ Staff Selection Commission (SSC CGL Tier-2 DEST) Official Evaluation Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. PERCENTAGE OF ERRORS FORMULA:</strong>
                            <div className="font-mono text-[11px] text-blue-800 dark:text-blue-400 bg-blue-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Error % = (Total Mistakes ÷ Master Passage Words) × 100<br />
                              Total Mistakes = Full Mistakes + (Half Mistakes ÷ 2)
                            </div>
                            <div>• Master Passage base: <strong>2,000 Key Depressions (~350–400 words)</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. OFFICIAL QUALIFYING CUTOFFS:</strong>
                            <div className="space-y-0.5 text-[11px]">
                              <div>• <strong>UR (General):</strong> Max <strong>20.00% Error</strong> (≥ 80% accuracy)</div>
                              <div>• <strong>OBC / EWS:</strong> Max <strong>25.00% Error</strong> (≥ 75% accuracy)</div>
                              <div>• <strong>SC / ST / PwD / ESM:</strong> Max <strong>30.00% Error</strong> (≥ 70% accuracy)</div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-blue-200 dark:border-blue-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Duration: <strong>15 Minutes</strong></span>
                          <span>• Nature: <strong>Qualifying in Nature</strong></span>
                          <span>• Backspace key: <strong>Allowed</strong></span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'ssc-chsl') {
                    return (
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2">
                        <div className="font-bold text-indigo-900 dark:text-indigo-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>🏛️ Staff Selection Commission (SSC CHSL LDC/DEO) Official Speed & Error Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. SPEED & WORDS FORMULAS (10 Min):</strong>
                            <div className="font-mono text-[11px] text-indigo-800 dark:text-indigo-400 bg-indigo-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Net Words = Gross Typed Words − Total Mistakes<br />
                              Net Speed (WPM) = Net Words ÷ 10 Minutes
                            </div>
                            <div>• Total Mistakes = Full Mistakes + (Half Mistakes ÷ 2).</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. PERMISSIBLE ERROR LIMITS:</strong>
                            <div className="space-y-0.5 text-[11px]">
                              <div>• <strong>UR & EWS:</strong> Max <strong>7.00% Error</strong></div>
                              <div>• <strong>Reserved (OBC/SC/ST/PwBD/ESM):</strong> Max <strong>10.00% Error</strong></div>
                              <div>• Speed Target: <strong>35 WPM (English) / 30 WPM (Hindi)</strong></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-indigo-200 dark:border-indigo-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Duration: <strong>10 Minutes</strong> (1,750 Key Depressions English / 1,500 Hindi)</span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'rrb-ntpc') {
                    return (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                        <div className="font-bold text-amber-900 dark:text-amber-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>🚆 Railway Recruitment Board (RRB NTPC) Official 5% Permissible Margin & Penalty Rule</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. 5% MARGIN & 10x PENALTY:</strong>
                            <div className="font-mono text-[11px] text-amber-800 dark:text-amber-400 bg-amber-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Permissible Mistakes = 5% of Total Typed Words<br />
                              Excess Mistakes = Total Mistakes − Permissible Mistakes<br />
                              Penalty Words = Excess Mistakes × 10
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. FINAL NET SPEED FORMULA:</strong>
                            <div className="font-mono text-[11px] text-amber-800 dark:text-amber-400 bg-amber-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Net Speed (WPM) = (Gross Words − Penalty Words) ÷ 10
                            </div>
                            <div>• Qualifying Threshold: <strong>30 WPM (English) / 25 WPM (Hindi KrutiDev / Mangal)</strong>.</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-amber-200 dark:border-amber-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Test Duration: <strong>10 Minutes</strong></span>
                          <span>• Backspace: <strong>Allowed</strong></span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'delhi-police-hcm') {
                    return (
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2">
                        <div className="font-bold text-purple-900 dark:text-purple-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>👮 Delhi Police Head Constable (Ministerial) Official 25-Marks Scale Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. SPEED & MISTAKE DEDUCTION:</strong>
                            <div className="font-mono text-[11px] text-purple-800 dark:text-purple-400 bg-purple-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Tentative Speed = Total Typed Words ÷ 10<br />
                              Actual Speed = Tentative Speed − Total Mistakes
                            </div>
                            <div>• Each mistake directly deducts <strong>1.0 WPM</strong> from tentative speed.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. OFFICIAL 25-MARKS SCORECARD TABLE:</strong>
                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                              <div>• &lt; 30 WPM = <strong>0 Marks</strong></div>
                              <div>• 30 WPM = <strong>10 Marks</strong></div>
                              <div>• 31–35 WPM = <strong>12 Marks</strong></div>
                              <div>• 36–40 WPM = <strong>15 Marks</strong></div>
                              <div>• 41–45 WPM = <strong>18 Marks</strong></div>
                              <div>• 46–50 WPM = <strong>21 Marks</strong></div>
                              <div className="col-span-2">• &gt; 50 WPM = <strong>25 Marks (Maximum)</strong></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-purple-200 dark:border-purple-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Duration: <strong>10 Minutes</strong></span>
                          <span>• Qualifying: Minimum <strong>30 WPM (10 Marks)</strong> required.</span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'allahabad-hc') {
                    return (
                      <div className="p-3 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-xl space-y-2">
                        <div className="font-bold text-sky-900 dark:text-sky-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>⚖️ High Court of Judicature at Allahabad Official 50-Marks Evaluation System</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. MARKS & DEDUCTION FORMULA:</strong>
                            <div className="font-mono text-[11px] text-sky-800 dark:text-sky-400 bg-sky-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Secured Marks = 50.0 − (Total Mistakes × 0.1)
                            </div>
                            <div>• Every mistake deducts exactly <strong>0.1 Marks</strong> from maximum 50.0 marks.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. QUALIFYING CRITERIA:</strong>
                            <div className="space-y-0.5 text-[11px]">
                              <div>• Minimum Qualifying Marks: <strong>25.0 / 50.0 Marks (50.0%)</strong></div>
                              <div>• Minimum Speed: <strong>25 WPM (500 Words in 15 Minutes)</strong></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-sky-200 dark:border-sky-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Duration: <strong>15 Minutes</strong></span>
                          <span>• Minimum 25.0 marks required for qualification.</span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'mp-cpct') {
                    return (
                      <div className="p-3 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded-xl space-y-2">
                        <div className="font-bold text-teal-900 dark:text-teal-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>🖥️ MP CPCT Official NWPM & Scaled Scorecard Percentage Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-teal-100 dark:border-teal-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. NET SPEED (NWPM) FORMULA:</strong>
                            <div className="font-mono text-[11px] text-teal-800 dark:text-teal-400 bg-teal-50/70 dark:bg-slate-950 p-1.5 rounded">
                              NWPM = Gross WPM − (Total Mistakes ÷ Test Minutes)
                            </div>
                            <div>• Standard Duration: <strong>15 Minutes</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-teal-100 dark:border-teal-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. SCALED SCORE BRACKETS:</strong>
                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                              <div>• &lt; 30 WPM: <strong>Not Qualified</strong></div>
                              <div>• 30–39.9 WPM: <strong>50% Score</strong></div>
                              <div>• 40–49.9 WPM: <strong>60% Score</strong></div>
                              <div>• 50–59.9 WPM: <strong>70% Score</strong></div>
                              <div>• 60–69.9 WPM: <strong>80% Score</strong></div>
                              <div>• ≥ 70 WPM: <strong>100% Score</strong></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-teal-200 dark:border-teal-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Qualifying: Minimum <strong>30 NWPM (English) / 20 NWPM (Hindi)</strong> (50% Scorecard).</span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'rssb-ldc') {
                    return (
                      <div className="p-3 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-xl space-y-2">
                        <div className="font-bold text-orange-900 dark:text-orange-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>🏛️ Rajasthan RSSB LDC Official Section-1 Speed Test Marking System</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-orange-100 dark:border-orange-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. WORD-BY-WORD MARKING FORMULA:</strong>
                            <div className="font-mono text-[11px] text-orange-800 dark:text-orange-400 bg-orange-50/70 dark:bg-slate-950 p-1.5 rounded">
                              English: 0.05 Marks per correct word (Max 25 Marks)<br />
                              Hindi: 0.0625 Marks per correct word (Max 25 Marks)
                            </div>
                            <div>• Passages: 500 Words (English) / 400 Words (Hindi).</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-orange-100 dark:border-orange-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. QUALIFYING MINIMUM MARKS:</strong>
                            <div className="space-y-0.5 text-[11px]">
                              <div>• Minimum Qualifying: <strong>9.0 / 25.0 Marks (36.0%)</strong> in Speed Test</div>
                              <div>• Duration: <strong>10 Minutes</strong></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-orange-200 dark:border-orange-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Candidates scoring below 9.0 marks are disqualified.</span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'delhi-hc-jja') {
                    return (
                      <div className="p-3 bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 rounded-xl space-y-2">
                        <div className="font-bold text-violet-900 dark:text-violet-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>⚖️ High Court of Delhi (DHC JJA / SJA) Official 3% Permissible Margin Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-violet-100 dark:border-violet-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. 3% MARGIN & DECIMAL ROUNDING:</strong>
                            <div className="font-mono text-[11px] text-violet-800 dark:text-violet-400 bg-violet-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Permissible = 3% of Typed Words [0.01-0.49→0.5, 0.51-0.99→1.0]<br />
                              Excess Mistakes = Total Mistakes − Permissible<br />
                              Penalty Words = Excess Mistakes × 10
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-violet-100 dark:border-violet-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. NET SPEED & QUALIFYING:</strong>
                            <div className="font-mono text-[11px] text-violet-800 dark:text-violet-400 bg-violet-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Net Speed = (Gross Words − Penalty Words) ÷ 10
                            </div>
                            <div>• Qualifying Speed: <strong>35 WPM (10 Minutes)</strong>.</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-violet-200 dark:border-violet-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Strict decimal rounding applies to permissible mistake limits.</span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'supreme-court-jca') {
                    return (
                      <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl space-y-2">
                        <div className="font-bold text-red-900 dark:text-red-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>⚖️ Supreme Court of India (JCA) Official Strict 3.00% Error Threshold</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-red-100 dark:border-red-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. ERROR PERCENTAGE:</strong>
                            <div className="font-mono text-[11px] text-red-800 dark:text-red-400 bg-red-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Error % = (Total Mistakes ÷ Total Typed Words) × 100
                            </div>
                            <div>• Maximum Permissible Error: <strong>Strictly 3.00%</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-red-100 dark:border-red-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. SPEED CRITERIA:</strong>
                            <div className="space-y-0.5 text-[11px]">
                              <div>• Minimum Speed: <strong>35 WPM in English</strong></div>
                              <div>• Duration: <strong>10 Minutes</strong></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'spmcil') {
                    return (
                      <div className="p-3 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 rounded-xl space-y-2">
                        <div className="font-bold text-cyan-900 dark:text-cyan-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>🏭 SPMCIL Typing Test Official Evaluation & Direct Deduction Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-cyan-100 dark:border-cyan-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. PERMISSIBLE ERROR MARGIN:</strong>
                            <div className="font-mono text-[11px] text-cyan-800 dark:text-cyan-400 bg-cyan-50/70 dark:bg-slate-950 p-1.5 rounded space-y-0.5">
                              <div>• UR Margin: <strong>5%</strong> of Typed Words</div>
                              <div>• Reserved Margin: <strong>7%</strong> of Typed Words</div>
                              <div>• Actual Error = max(0, Total Errors − Error Allowed)</div>
                              <div>• Direct Deduction: Net Words = Words Typed − Actual Error</div>
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-cyan-100 dark:border-cyan-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. SPEED & TARGETS:</strong>
                            <div>• Qualifying Net Speed: <strong>40 WPM (English) / 30 WPM (Hindi)</strong></div>
                            <div>• Duration: <strong>10 Minutes</strong> (Standard Examination)</div>
                            <div>• Error Types: Full Error (1.0 each) & Half Error (0.5 each)</div>
                            <div>• Net Speed (WPM) = (Keystrokes Typed − Actual Error × 5) ÷ 5 ÷ 10</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'up-police-co') {
                    return (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                        <div className="font-bold text-blue-900 dark:text-blue-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>👮 UP Police Computer Operator Official 85% Accuracy Scheme</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. MANDATORY ACCURACY RULE:</strong>
                            <div className="font-mono text-[11px] text-blue-800 dark:text-blue-400 bg-blue-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Accuracy (%) = ((Total Words − Total Mistakes) ÷ Total Words) × 100
                            </div>
                            <div>• Minimum Accuracy Required: <strong>≥ 85.00%</strong> (Mandatory).</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. SPEED CRITERIA (15 Min):</strong>
                            <div>• English Typing: <strong>30 WPM</strong></div>
                            <div>• Hindi Typing (Unicode / Inscript): <strong>25 WPM</strong></div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'bsf-hcm') {
                    return (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                        <div className="font-bold text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>🛡️ BSF HCM Official 5% Mistake Allowance & 10x Penalty Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. 5% ALLOWANCE & PENALTY:</strong>
                            <div className="font-mono text-[11px] text-emerald-800 dark:text-emerald-400 bg-emerald-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Permissible Mistakes = 5% of Total Words<br />
                              Penalty = (Total Mistakes − Permissible) × 10 words
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. QUALIFYING SPEED:</strong>
                            <div>• <strong>35 WPM (English) / 30 WPM (Hindi)</strong> (10 Minutes).</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'bombay-hc-clerk' || key === 'bombay-hc-clerk-400') {
                    return (
                      <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2.5">
                        <div className="font-bold text-indigo-900 dark:text-indigo-300 text-xs sm:text-sm flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span>⚖️</span>
                            <span>High Court of Judicature at Bombay — Clerk Typing Official Scheme</span>
                          </span>
                          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                            Cutoff: 10.0 / 20.0 Marks (50%) &amp; 40 WPM
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. PASSAGE &amp; SPEED:</strong>
                            <div>• 400 Words English passage in <strong>10 Minutes</strong>.</div>
                            <div>• Minimum Qualifying Speed: <strong>40 WPM (En) / 30 WPM (Hi)</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. MARKS &amp; PENALTY:</strong>
                            <div>• Maximum Marks: <strong>20.00 Marks</strong>.</div>
                            <div>• Penalty: <strong>0.25 Marks deducted per mistake</strong> (1 Mark per 4 mistakes).</div>
                            <div>• Minimum Qualifying: <strong>10.00 Marks (50%)</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">III. TEST MODE &amp; TOOLS:</strong>
                            <div>• <strong>Paper-to-Screen Mode</strong> supported (passage toggle).</div>
                            <div>• <strong>Download Authentic Passage PDF</strong> to practice physical sheet typing.</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'chandigarh-admin-clerk') {
                    return (
                      <div className="p-3.5 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-xl space-y-2.5">
                        <div className="font-bold text-sky-900 dark:text-sky-300 text-xs sm:text-sm flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span>🏛️</span>
                            <span>Chandigarh Administration Clerk &amp; Steno-Typist Official Scheme</span>
                          </span>
                          <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                            Qualifying Cutoff: 35 WPM (Net Speed)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. DURATION &amp; SPEED:</strong>
                            <div>• Duration: <strong>10 Minutes (600 seconds)</strong>.</div>
                            <div>• Minimum Qualifying Speed: <strong>35 WPM (English) / 30 WPM (Hindi)</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. ERROR EVALUATION RULE:</strong>
                            <div>• <strong>All Errors Count as Full Errors (1.0 each)</strong>.</div>
                            <div>• Spacing, capitalization, punctuation &amp; transposition count as 1.0 Full Mistake (no half errors).</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">III. SPEED FORMULA:</strong>
                            <div>• Net Words = <strong>Words Typed − Total Errors</strong>.</div>
                            <div>• Net Speed = <strong>Net Words ÷ 10 Minutes</strong>.</div>
                            <div>• Nature: <strong>Purely Qualifying</strong> (Pass / Fail).</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'punjab-haryana-hc' || categoryId.includes('punjab')) {
                    return (
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2">
                        <div className="font-bold text-indigo-900 dark:text-indigo-300 text-xs sm:text-sm flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span>⚖️</span>
                            <span>High Court of Punjab and Haryana Official Typing Speed Scheme</span>
                          </span>
                          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                            Cutoff: 30 WPM (En) / 25 WPM (Hi)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. DURATION &amp; SPEED:</strong>
                            <div>• Duration: <strong>10 Minutes (600 seconds)</strong>.</div>
                            <div>• Minimum Qualifying Speed: <strong>30 WPM (English) / 25 WPM (Hindi)</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. ERROR EVALUATION RULE:</strong>
                            <div>• <strong>All Errors Count as Full Errors (1.0 each)</strong>.</div>
                            <div>• Spacing, capitalization, punctuation &amp; substitutions count as 1.0 Full Mistake (no half errors).</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">III. SPEED FORMULA:</strong>
                            <div>• Net Words = <strong>Words Typed − Total Errors</strong>.</div>
                            <div>• Net Speed = <strong>Net Words ÷ 10 Minutes</strong>.</div>
                            <div>• Nature: <strong>Purely Qualifying</strong> (Pass / Fail).</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'upsssc-ja' || key === 'upsssc-ja-hindi') {
                    return (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                        <div className="font-bold text-amber-900 dark:text-amber-300 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>🏛️ UPSSSC Junior Assistant Official 5-Minute Typing Speed Standard</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. SPEED & DURATION:</strong>
                            <div>• English Typing: <strong>30 WPM (5 Minutes)</strong></div>
                            <div>• Hindi Typing: <strong>25 WPM (5 Minutes)</strong> (Mangal / KrutiDev)</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. QUALIFICATION:</strong>
                            <div>• Qualifying in nature. Both English and Hindi required as per board rules.</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default / Generic Government Exam Template (DSSSB, KVS, EMRS, CSIR, DDA, etc.)
                  return (
                    <div className="p-3 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                      <div className="font-bold text-slate-900 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                        <span>📝 {catConfig.name} Official Typing Speed, Mistake & Accuracy Formulas</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                        <div className="bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                          <strong className="text-slate-900 dark:text-white">I. MISTAKE COUNTING & ACCURACY:</strong>
                          <div className="font-mono text-[11px] text-blue-700 dark:text-blue-400 bg-blue-50/70 dark:bg-slate-900 p-1.5 rounded">
                            Total Mistakes = Full Mistakes + (Half Mistakes ÷ 2)<br />
                            Accuracy (%) = ((Gross Words − Total Mistakes) ÷ Gross Words) × 100
                          </div>
                          <div>• Permissible Error Cap: <strong>≤ 5.00%</strong></div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                          <strong className="text-slate-900 dark:text-white">II. SPEED CALCULATION FORMULAS:</strong>
                          <div className="font-mono text-[11px] text-blue-700 dark:text-blue-400 bg-blue-50/70 dark:bg-slate-900 p-1.5 rounded">
                            Gross Speed (WPM) = Total Words Typed ÷ Duration<br />
                            Net Speed (WPM) = (Gross Words − Total Mistakes) ÷ Duration
                          </div>
                          <div>• Qualifying Speed: <strong>{catConfig.qualifyingSpeed.en} WPM (English) / {catConfig.qualifyingSpeed.hi} WPM (Hindi)</strong></div>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                        <span>• Standard Duration: <strong>{catConfig.standardDurationMinutes} Minutes</strong></span>
                        <span>• Backspace: <strong>Allowed</strong></span>
                      </div>
                    </div>
                  );
                })()}

                {categoryMeta.rules && (
                  <p className="whitespace-pre-line text-xs text-slate-600 dark:text-slate-400 mt-2">
                    {categoryMeta.rules.replace(/<br\s*\/?>/gi, '\n')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Category Performance Stats Strip (Matching Home Page) */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{isHindi ? `${currentCategory?.name || 'इस परीक्षा'} में आपका व्यक्तिगत प्रदर्शन` : `Your ${currentCategory?.name || 'Category'} Performance`}</span>
            </div>
            {categoryPersonalBest && (
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                {categoryPersonalBest.totalAttempts} {isHindi ? 'प्रयास दर्ज' : 'attempt(s) recorded'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {isHindi ? 'सर्वोत्तम नेट स्पीड' : 'Personal Best Net Speed'}
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {categoryPersonalBest ? categoryPersonalBest.bestNetWpm : '--'} <span className="text-[9px] font-normal">WPM</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{isHindi ? 'औसत शुद्धता' : 'Avg Accuracy'}</div>
                <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {categoryPersonalBest ? `${categoryPersonalBest.avgAccuracy}%` : '--%'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-100 dark:purple-900/50 text-purple-600 dark:text-purple-400">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{isHindi ? 'कुल प्रयास' : 'Total Attempts'}</div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {categoryPersonalBest ? categoryPersonalBest.totalAttempts : 0}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{isHindi ? 'क्वालिफाइड' : 'Qualified'}</div>
                <div className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
                  {categoryPersonalBest ? categoryPersonalBest.qualifiedCount : 0}{' '}
                  <span className="text-[9px] font-normal text-slate-500">
                    / {categoryPersonalBest ? categoryPersonalBest.totalAttempts : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. LANGUAGE SWITCHER */}
        <div className="text-center my-8 space-y-3">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-200">
            {isHindi ? 'भाषा का चयन करें' : 'Select Language'}
          </h2>

          <div className="inline-flex p-1.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm gap-2" suppressHydrationWarning>
            <button
              suppressHydrationWarning
              onClick={() => setSelectedLanguage('en')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                selectedLanguage === 'en'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>English</span>
              {englishCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedLanguage === 'en' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {englishCount}
                </span>
              )}
            </button>

            <button
              suppressHydrationWarning
              onClick={() => setSelectedLanguage('hi')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                selectedLanguage === 'hi'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>हिंदी (Hindi)</span>
              {hindiCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedLanguage === 'hi' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {hindiCount}
                </span>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isHindi ? 'प्रदर्शित' : 'Showing'}{' '}
            <strong className="text-blue-600 dark:text-blue-400 font-bold">
              {selectedLanguage === 'en' ? 'English' : 'Hindi'}
            </strong>{' '}
            {isHindi ? 'गद्यांश' : 'passages'} ({filteredTests.length} {isHindi ? 'उपलब्ध' : 'available'})
          </p>
        </div>

        {/* 4. PASSAGES SECTION & FILTERS */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            {/* Total Available Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {isHindi ? 'उपलब्ध टाइपिंग टेस्ट्स:' : 'Available Typing Tests:'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold text-xs border border-blue-200 dark:border-blue-800">
                {filteredTests.length}
              </span>
            </div>

            {/* Live Search */}
            <div className="relative w-full sm:w-64" suppressHydrationWarning>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                suppressHydrationWarning
                type="text"
                value={passageSearch}
                onChange={e => setPassageSearch(e.target.value)}
                placeholder={isHindi ? 'गद्यांश खोजें...' : 'Search passage...'}
                className="w-full bg-white dark:bg-slate-900 rounded-xl pl-9 pr-7 py-2 text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs placeholder:text-slate-400"
              />
              {passageSearch && (
                <button
                  suppressHydrationWarning
                  onClick={() => setPassageSearch('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 5. PASSAGES TABLE (CLEAN, NO DIFFICULTY CATEGORISATION) */}
          {isLoading && tests.length === 0 ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Search className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {isHindi ? 'कोई गद्यांश नहीं मिला' : 'No Passages Found'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isHindi ? 'कृपया दूसरा शब्द खोजें या भाषा बदलें।' : 'Try switching the language or clearing your search query.'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3.5 px-4 text-center w-16">#</th>
                      <th className="py-3.5 px-4">Passage Name</th>
                      <th className="py-3.5 px-4 text-center w-28">Timing</th>
                      <th className="py-3.5 px-4 text-center w-36">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs sm:text-sm">
                    {filteredTests.map((test, index) => {
                      const testAttempts = userAttempts.filter(a => a.testId === test.id);
                      const hasLocalAttempt = typeof window !== 'undefined' && !!localStorage.getItem(`typing_attempt_${test.id}`);
                      const hasAttempted = testAttempts.length > 0 || hasLocalAttempt;
                      const displayName = cleanDisplayTitle(isHindi && test.titleHi ? test.titleHi : test.title);

                      return (
                        <tr
                          key={test.id}
                          className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors group"
                        >
                          <td className="py-3.5 px-4 text-center font-bold text-slate-500 dark:text-slate-400">
                            {index + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {displayName}
                              </span>
                              {hasAttempted && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <Check className="w-3 h-3" /> Attempted
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                            {test.mainDurationMinutes} Min
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {hasAttempted ? (
                              <div className="flex items-center justify-center gap-1.5 flex-wrap sm:flex-nowrap">
                                <Link
                                  href={`/typing-test/${test.id}?view=analysis`}
                                  prefetch={true}
                                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full font-bold text-xs bg-[#286090] hover:bg-[#1f4b72] text-white shadow-xs hover:shadow-md transition cursor-pointer active:scale-95 whitespace-nowrap"
                                  title="View detailed test scorecard and mistake analysis"
                                >
                                  <BarChart2 className="w-3 h-3 text-white" />
                                  <span>{isHindi ? 'विश्लेषण' : 'Analysis'}</span>
                                </Link>
                                <Link
                                  href={`/typing-test/${test.id}`}
                                  prefetch={true}
                                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition cursor-pointer active:scale-95 whitespace-nowrap"
                                  title="Retake this typing test"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>{isHindi ? 'पुनः दें' : 'Re-attempt'}</span>
                                </Link>
                              </div>
                            ) : (
                              <Link
                                href={`/typing-test/${test.id}`}
                                prefetch={true}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-md transition cursor-pointer active:scale-95 whitespace-nowrap"
                              >
                                <Play className="w-3 h-3 fill-white" />
                                <span>{isHindi ? 'शुरू करें' : 'Start'}</span>
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER (Identical to Home Page with full details) */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-8 px-6 md:px-12 mt-16 text-center text-xs text-slate-500 dark:text-slate-400 shrink-0">
        <p className="font-bold">© 2026 MockTest Hub. All rights reserved.</p>
        <p className="mt-1 text-[11px]">Developed to simulate real-world government selection computer based assessments.</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <Link
            href="/contact"
            className="hover:text-blue-600 dark:hover:text-blue-400 font-bold transition cursor-pointer"
          >
            {isHindi ? 'हमसे संपर्क करें' : 'Contact Us'}
          </Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link
            href="/terms"
            className="hover:text-blue-600 dark:hover:text-blue-400 font-bold transition cursor-pointer"
          >
            {isHindi ? 'नियम और शर्तें' : 'Terms & Conditions'}
          </Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link
            href="/privacy"
            className="hover:text-blue-600 dark:hover:text-blue-400 font-bold transition cursor-pointer"
          >
            {isHindi ? 'गोपनीयता नीति' : 'Privacy Policy'}
          </Link>
        </div>
      </footer>
    </div>
  );
}
