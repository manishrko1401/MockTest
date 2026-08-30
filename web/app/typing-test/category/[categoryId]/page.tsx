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
  Plus,
  ArrowLeft,
  Sun,
  Moon,
  User,
  Scale,
  Train,
  AlertCircle,
  Clock,
  Languages,
  RotateCcw,
  BarChart2,
  CheckCircle2
} from 'lucide-react';
import { TypingTest, TypingCategory, TypingAttempt, isSscExam, isSscCglExam, isSscChslExam } from '../../../lib/typingTypes';

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

  const [tests, setTests] = useState<TypingTest[]>([]);
  const [categories, setCategories] = useState<TypingCategory[]>([]);
  const [userAttempts, setUserAttempts] = useState<TypingAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-typing-tests' })
        });
        const data = await res.json();
        if (data.success) {
          setTests(data.tests || []);
          setCategories(data.categories || []);
        }

        // Fetch user attempts
        let attemptsList: TypingAttempt[] = [];
        try {
          const attRes = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'get-user-typing-attempts',
              data: { userId: currentUser?.id }
            })
          });
          const attData = await attRes.json();
          if (attData.success && Array.isArray(attData.attempts)) {
            attemptsList = attData.attempts;
          }
        } catch (e) {
          console.error('Failed to fetch user typing attempts:', e);
        }

        // Also merge local storage attempts
        if (typeof window !== 'undefined') {
          try {
            const allLocal = JSON.parse(localStorage.getItem('all_typing_attempts') || '[]');
            if (Array.isArray(allLocal) && allLocal.length > 0) {
              const existingIds = new Set(attemptsList.map(a => a.id));
              for (const loc of allLocal) {
                if (loc && loc.testId && (!loc.id || !existingIds.has(loc.id))) {
                  attemptsList.push(loc);
                }
              }
            }
          } catch (e) {}
        }

        setUserAttempts(attemptsList);
      } catch (err) {
        console.error('Failed to load typing tests:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser?.id]);

  const currentCategory = useMemo(() => {
    if (categoryId === 'all') {
      return {
        id: 'all',
        name: 'All Govt Exam Typing Tests',
        nameHi: 'सभी सरकारी परीक्षा टाइपिंग टेस्ट्स',
        description: 'Complete collection of DEST & typing speed test simulators for SSC, Railway NTPC, High Court, and State examinations.',
        icon: 'Sparkles',
        logoUrl: ''
      };
    }
    return categories.find(c => c.id === categoryId) || null;
  }, [categoryId, categories]);

  // Filtered tests in this category
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      if (categoryId !== 'all' && test.categoryId !== categoryId) return false;
      return true;
    });
  }, [tests, categoryId]);

  const getCategoryIcon = (catId?: string) => {
    if (!catId || catId === 'all') return Sparkles;
    if (catId.includes('cgl')) return Trophy;
    if (catId.includes('chsl') || catId.includes('ssc')) return Award;
    if (catId.includes('rrb') || catId.includes('railway')) return Train;
    if (catId.includes('court') || catId.includes('clerk')) return Scale;
    return Keyboard;
  };

  const CatIcon = getCategoryIcon(currentCategory?.id);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* 1. PORTAL HEADER (h-18 STANDARD) */}
      <header className="h-18 sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs">
        {/* Left Side: Back button + Branding */}
        <div className="flex items-center gap-3">
          <Link
            href="/typing-test"
            className="btn-3d btn-3d-slate flex items-center gap-1.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">{isHindi ? 'सभी श्रेणियां' : 'All Categories'}</span>
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

          {/* Navigation Links just after Mock Test Logo */}
          <nav className="hidden md:flex items-center gap-3 lg:gap-6 text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0 ml-2 lg:ml-4">
            <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">
              <span>{t.navTestSeries}</span>
            </Link>
            <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">
              <span>{language === 'hi' ? 'सूचनाएं एवं अपडेट्स' : 'Notices & Announcements'}</span>
            </Link>
            <Link href="/locker" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">
              <span>{language === 'hi' ? 'दस्तावेज़ लॉकर' : 'Document Locker'}</span>
            </Link>
          </nav>
        </div>

        {/* Right Navigation & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Profile Button */}
          <Link
            href={currentUser ? "/profile" : "/auth"}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer active:scale-95 shadow-2xs shrink-0"
            title={currentUser ? (language === 'hi' ? 'मेरी प्रोफाइल' : 'Profile') : (language === 'hi' ? 'लॉग इन' : 'Login')}
          >
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{currentUser ? (language === 'hi' ? 'प्रोफाइल' : 'Profile') : (language === 'hi' ? 'लॉग इन' : 'Login')}</span>
          </Link>

          {/* Language Selector */}
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none cursor-pointer text-slate-700 dark:text-slate-300"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
          </select>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            title={theme === 'light' ? t.themeDark : t.themeLight}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* 2. CATEGORY HERO BANNER */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="absolute top-0 right-0 -z-10 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border-2 border-slate-200/90 flex items-center justify-center shadow-sm shrink-0 overflow-hidden p-1.5 transition-all">
                {currentCategory?.logoUrl ? (
                  <img
                    src={currentCategory.logoUrl}
                    alt={currentCategory.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                    <CatIcon className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 uppercase">
                    Exam Category
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {filteredTests.length} {isHindi ? 'टेस्ट उपलब्ध' : 'Tests Available'}
                  </span>
                </div>
                <h1 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {isHindi && currentCategory?.nameHi ? currentCategory.nameHi : currentCategory?.name || 'Typing Tests'}
                </h1>
                {currentCategory?.description && (
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 max-w-2xl line-clamp-1">
                    {currentCategory.description}
                  </p>
                )}
              </div>
            </div>

            <Link
              href="/typing-test"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-2xs transition shrink-0"
            >
              <ArrowLeft className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              {isHindi ? 'दूसरी श्रेणी चुनें' : 'Change Category'}
            </Link>
          </div>
        </div>
      </section>

      {/* 3. MAIN WORKSPACE / TESTS CATALOG */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Tests Count Bar */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {isHindi ? 'उपलब्ध टाइपिंग टेस्ट्स' : 'Available Typing Tests'}
            </h2>
            <span className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              {filteredTests.length}
            </span>
          </div>
        </div>

        {/* Tests List - Long Tiles */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <Keyboard className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isHindi ? 'कोई टाइपिंग टेस्ट उपलब्ध नहीं है' : 'No Typing Tests Available'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {isHindi ? 'इस श्रेणी में अभी कोई टेस्ट उपलब्ध नहीं है।' : 'There are currently no tests available in this category.'}
            </p>
            <Link
              href="/typing-test"
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {isHindi ? 'दूसरी श्रेणी देखें' : 'View Other Categories'}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTests.map(test => {
              const cat = categories.find(c => c.id === test.categoryId);
              const testAttempts = userAttempts.filter(a => a.testId === test.id);
              const hasLocalAttempt = typeof window !== 'undefined' && !!localStorage.getItem(`typing_attempt_${test.id}`);
              const hasAttempted = testAttempts.length > 0 || hasLocalAttempt;

              return (
                <div
                  key={test.id}
                  className="backdrop-blur-sm border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-[1.008] hover:shadow-[0_14px_28px_-6px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_14px_28px_-6px_rgba(0,0,0,0.6),0_0_20px_rgba(59,130,246,0.15)] hover:border-blue-400/60 dark:hover:border-blue-500/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full relative overflow-hidden z-0 hover:z-10 bg-white/80 dark:bg-slate-900/60"
                >
                  <div className="space-y-2 flex-1 w-full text-left">
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-[8.5px] sm:text-[9px] font-black px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60 uppercase tracking-wider flex items-center gap-1.5">
                        {cat?.logoUrl ? (
                          <div className="w-4 h-4 bg-white rounded flex items-center justify-center p-0.5 border border-slate-200 shrink-0 shadow-2xs">
                            <img src={cat.logoUrl} alt="" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <Keyboard className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        )}
                        {cat ? (isHindi && cat.nameHi ? cat.nameHi : cat.name) : 'Typing Test'}
                      </span>

                      <span className={`text-[8.5px] sm:text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                        test.language === 'hi' 
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/60' 
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60'
                      }`}>
                        {test.language === 'hi' ? 'हिंदी (Hindi)' : 'English'}
                      </span>

                      <span className={`text-[8.5px] sm:text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                        test.difficulty === 'Hard'
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/60'
                          : test.difficulty === 'Easy'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60'
                          : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-900/60'
                      }`}>
                        {test.difficulty}
                      </span>

                      {hasAttempted && (
                        <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[8.5px] sm:text-[9px] font-black px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          {isHindi ? 'प्रयास किया गया' : 'Attempted'}
                        </span>
                      )}

                      {test.allowRetype ? (
                        <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[8.5px] sm:text-[9px] font-black px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60 uppercase tracking-wider">
                          ✓ {isHindi ? 'पुनः टाइपिंग सक्रिय' : 'Retype Allowed'}
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[8.5px] sm:text-[9px] font-black px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                          {isHindi ? 'सिंगल पास' : 'Single Pass'}
                        </span>
                      )}

                      {test.enableBackspace === false || test.backspaceRule === 'DISABLED' ? (
                        <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 text-[8.5px] sm:text-[9px] font-black px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/60 uppercase tracking-wider">
                          {isHindi ? 'बैकस्पेस बंद' : 'Backspace Disabled'}
                        </span>
                      ) : (
                        <span className="bg-slate-50 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300 text-[8.5px] sm:text-[9px] font-black px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                          {isHindi ? 'फुल बैकस्पेस' : 'Backspace Allowed'}
                        </span>
                      )}
                    </div>

                    {/* Test Title */}
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                        {isHindi && test.titleHi ? test.titleHi : test.title}
                      </h4>
                    </div>

                    {/* Key Metrics / Structure Line */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-bold pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>{isHindi ? 'समय:' : 'Duration:'} {test.demoDurationMinutes + test.breakDurationMinutes + test.mainDurationMinutes} Mins</span>
                        <span className="text-slate-400 font-normal">({test.demoDurationMinutes}m Demo + {test.breakDurationMinutes}m Break + {test.mainDurationMinutes}m Main)</span>
                      </span>
                      <span>•</span>
                      {isSscCglExam(test) ? (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>{isHindi ? 'त्रुटि %:' : 'Error%:'} <strong className="text-slate-800 dark:text-slate-200">UR: 20% | OBC: 25% | SC/ST: 30%</strong></span>
                        </span>
                      ) : isSscChslExam(test) ? (
                        <>
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>{isHindi ? 'त्रुटि %:' : 'Error%:'} <strong className="text-slate-800 dark:text-slate-200">UR &amp; EWS: 7% | Reserved: 10%</strong></span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>{isHindi ? 'स्पीड:' : 'Target:'} <strong className="text-slate-800 dark:text-slate-200">{test.language === 'hi' ? '30' : '35'} WPM</strong></span>
                          </span>
                        </>
                      ) : isSscExam(test) ? (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>{isHindi ? 'परिणाम:' : 'Result Basis:'} <strong className="text-slate-800 dark:text-slate-200">Error % &le; {test.maxErrorPercentage}%</strong></span>
                        </span>
                      ) : (
                        <>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>{isHindi ? 'कटऑफ:' : 'Target:'} <strong className="text-slate-800 dark:text-slate-200">{test.qualifyingWpm} WPM</strong></span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>{isHindi ? 'अधिकतम त्रुटि:' : 'Max Error:'} <strong className="text-slate-800 dark:text-slate-200">{test.maxErrorPercentage}%</strong></span>
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        🌐 {test.language === 'hi' ? 'Hindi' : 'English'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: If attempted -> Analysis & Retest. Otherwise -> Start Test */}
                  <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 pt-3 sm:pt-0 shrink-0">
                    {hasAttempted ? (
                      <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                        <Link
                          href={`/typing-test/${test.id}?view=analysis`}
                          className="btn-3d btn-3d-blue w-full sm:w-auto inline-flex items-center justify-center gap-1.5 py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer whitespace-nowrap"
                        >
                          <BarChart2 className="w-4 h-4" />
                          <span>{isHindi ? 'विश्लेषण' : 'Analysis'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/typing-test/${test.id}`}
                          className="btn-3d btn-3d-slate w-full sm:w-auto inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer whitespace-nowrap"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>{isHindi ? 'पुनः प्रयास' : 'Retest'}</span>
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/typing-test/${test.id}`}
                        className="btn-3d btn-3d-blue w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>{isHindi ? 'टेस्ट शुरू करें' : 'Start Test'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
