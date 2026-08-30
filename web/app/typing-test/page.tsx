"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { TRANSLATIONS } from '../translations';
import {
  Keyboard,
  Trophy,
  Zap,
  Timer,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  Play,
  Filter,
  Search,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  BarChart2,
  FileText,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Languages,
  Flame,
  ShieldCheck,
  ChevronRight,
  Plus,
  ArrowLeft,
  Sun,
  Moon,
  User,
  LayoutGrid,
  Train,
  Scale,
  Layers
} from 'lucide-react';
import { TypingTest, TypingCategory, TypingAttempt, TypingPassage } from '../lib/typingTypes';

export default function TypingTestPortalPage() {
  const { currentUser, language, setLanguage, theme, toggleTheme } = useAuth();
  const t = TRANSLATIONS[language];
  const router = useRouter();

  const isHindi = language === 'hi';

  const [categories, setCategories] = useState<TypingCategory[]>([]);
  const [tests, setTests] = useState<TypingTest[]>([]);
  const [passages, setPassages] = useState<TypingPassage[]>([]);
  const [userAttempts, setUserAttempts] = useState<TypingAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [categorySearch, setCategorySearch] = useState<string>('');

  // Custom Practice Modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customPassageText, setCustomPassageText] = useState('');
  const [customDuration, setCustomDuration] = useState(5);
  const [customDemoDuration, setCustomDemoDuration] = useState(1);
  const [customBreakDuration, setCustomBreakDuration] = useState(1);

  // Fetch tests and categories
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
      if (currentUser?.id) {
        const attRes = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-user-typing-attempts', data: { userId: currentUser.id } })
        });
        const attData = await attRes.json();
        if (attData.success) {
          setUserAttempts(attData.attempts || []);
        }
      }

      // Fetch passages for custom modal
      const pasRes = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-typing-passages' })
      });
      const pasData = await pasRes.json();
      if (pasData.success) {
        setPassages(pasData.passages || []);
      }
    } catch (err) {
      console.error('Failed to load typing tests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.id]);

  // Filtered categories for search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.toLowerCase();
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(q) || 
      (cat.nameHi && cat.nameHi.toLowerCase().includes(q)) ||
      (cat.description && cat.description.toLowerCase().includes(q))
    );
  }, [categories, categorySearch]);

  // Personal Best Stats
  const personalBest = useMemo(() => {
    if (!userAttempts.length) return null;
    const bestNetWpm = Math.max(...userAttempts.map(a => Number(a.netWpm || 0)));
    const avgAccuracy = Math.round((userAttempts.reduce((acc, a) => acc + (Number(a.accuracyPercentage) || 0), 0) / userAttempts.length) * 10) / 10;
    const qualifiedCount = userAttempts.filter(a => a.isQualified).length;
    return {
      bestWpm: bestNetWpm,
      bestNetWpm,
      avgAccuracy,
      totalAttempts: userAttempts.length,
      qualifiedCount
    };
  }, [userAttempts]);

  const handleStartCustomPractice = () => {
    if (!customPassageText.trim()) return;
    // store custom test session into sessionStorage
    const customTest: TypingTest = {
      id: 'custom-' + Date.now(),
      title: 'Custom Typing Drill',
      titleHi: 'कस्टम टाइपिंग अभ्यास',
      categoryId: 'cat-general-speed',
      passageText: customPassageText,
      demoPassageText: 'This is your warm up demo test passage. Type and check your keyboard keys before starting the drill.',
      demoDurationMinutes: customDemoDuration,
      breakDurationMinutes: customBreakDuration,
      mainDurationMinutes: customDuration,
      qualifyingWpm: 35,
      maxErrorPercentage: 5.0,
      backspaceRule: 'ALLOWED',
      allowRetype: true,
      highlightAllowed: true,
      language: 'en',
      difficulty: 'Medium',
      instructions: 'Custom practice drill created by user.',
      orderIndex: 999,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('custom_typing_test', JSON.stringify(customTest));
    }
    router.push('/typing-test/custom');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Navbar header (Matches Test Series Page Header) */}
      <header className="h-18 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-4 lg:gap-6 min-w-0">
          {/* Back button on top left corner */}
          <Link 
            href="/" 
            className="btn-3d btn-3d-slate flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs tracking-wide shadow-sm shrink-0 cursor-pointer"
            title={t.backToHome}
          >
            <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">{t.backToHome}</span>
            <span className="sm:hidden">{t.navHome}</span>
          </Link>

          <span className="h-6 w-[1px] bg-slate-200 dark:border-slate-800 shrink-0"></span>

          <Link href="/" className="flex items-center gap-2.5 lg:gap-3 min-w-0">
            <div className="bg-[#E6F4FE] p-1.5 lg:p-2 rounded-full shadow-sm flex items-center justify-center h-8.5 w-8.5 lg:h-10 lg:w-10 border border-blue-200/60 shrink-0">
              <Trophy className="h-4.5 w-4.5 lg:h-5.5 lg:w-5.5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-xs lg:text-sm leading-tight text-slate-900 dark:text-white tracking-wider truncate">{t.logoTitle}</h1>
              <p className="text-[8px] lg:text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase truncate">{t.logoSub}</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-3 lg:gap-6 text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0 ml-1 lg:ml-3">
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

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Profile Button */}
          <Link
            href={currentUser ? "/profile" : "/auth"}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer active:scale-95 shadow-2xs"
            title={currentUser ? (language === 'hi' ? 'मेरी प्रोफाइल' : 'Profile') : (language === 'hi' ? 'लॉग इन' : 'Login')}
          >
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{currentUser ? (language === 'hi' ? 'प्रोफाइल' : 'Profile') : (language === 'hi' ? 'लॉग इन' : 'Login')}</span>
          </Link>

          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2 py-1.5 lg:px-2.5 lg:py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="en" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">English</option>
            <option value="hi" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">हिन्दी</option>
          </select>

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

      {/* Top Banner / Hero Header */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 -z-10 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="space-y-0.5 max-w-3xl">
              <h1 className="text-base sm:text-lg lg:text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-300">
                {isHindi ? 'टाइपिंग टेस्ट टर्मिनल' : 'Typing Test Terminal'}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-normal">
                {isHindi
                  ? 'असली परीक्षा जैसा अनुभव: डेमो टेस्ट ➔ ब्रेक ➔ मुख्य परीक्षा एवं सटीक सरकारी मूल्यांकन रिपोर्ट।'
                  : 'Authentic 3-phase exam simulation: Demo warm-up ➔ Break ➔ Main Exam with instant Gross & Net WPM.'}
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setShowCustomModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 font-semibold text-xs shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {isHindi ? 'कस्टम ड्रिल' : 'Custom Practice'}
              </button>
            </div>
          </div>

          {/* User Performance Stats Strip */}
          {personalBest && (
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {isHindi ? 'सर्वोत्तम नेट स्पीड' : 'Personal Best Net Speed'}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {personalBest.bestNetWpm} <span className="text-[9px] font-normal">WPM</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{isHindi ? 'औसत शुद्धता' : 'Avg Accuracy'}</div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">{personalBest.avgAccuracy}%</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                  <BarChart2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{isHindi ? 'कुल प्रयास' : 'Total Attempts'}</div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{personalBest.totalAttempts}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{isHindi ? 'क्वालिफाइड' : 'Qualified'}</div>
                  <div className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">{personalBest.qualifiedCount} <span className="text-[9px] font-normal text-slate-500">/ {personalBest.totalAttempts}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* EXAM CATEGORIES TILES SECTION (MATCHING TEST SERIES PAGE) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                {isHindi ? 'परीक्षा श्रेणियाँ' : 'Exam Categories'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isHindi ? 'अभ्यास परीक्षा शुरू करने के लिए एक श्रेणी चुनें' : 'Select a category to explore typing tests'}
              </p>
            </div>

            {/* Categories Search Bar */}
            <div className="relative max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                placeholder={isHindi ? 'श्रेणी खोजें...' : 'Search categories...'}
                className="w-full bg-white dark:bg-slate-900 rounded-xl pl-9 pr-7 py-1.5 text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs placeholder:text-slate-400"
              />
              {categorySearch && (
                <button
                  onClick={() => setCategorySearch('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Exam Category Grid matching Test Series Page */}
          <div className="exam-category-grid">
            {/* Individual Categories Cards */}
            {filteredCategories.map(cat => {
              const categoryTests = tests.filter(t => t.categoryId === cat.id);
              const isSsc = cat.id.includes('ssc');
              const isRailways = cat.id.includes('rrb') || cat.id.includes('railway');
              const isCourt = cat.id.includes('court') || cat.id.includes('clerk');

              return (
                <Link
                  key={cat.id}
                  href={`/typing-test/category/${cat.id}`}
                  className="bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 rounded-2xl flex flex-row justify-between gap-2.5 group text-left w-full cursor-pointer transition-all duration-300 transform-gpu hover:-translate-y-1.5 hover:scale-[1.015] hover:shadow-[0_14px_28px_-6px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_14px_28px_-6px_rgba(0,0,0,0.6),0_0_20px_rgba(59,130,246,0.15)] hover:border-blue-500/40 dark:hover:border-blue-400/40 active:translate-y-0 active:scale-[0.99] relative block"
                >
                  {/* Left details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      {/* Logo/Icon Container - Always crisp white background in both light & dark mode */}
                      <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center border-2 border-slate-200/90 shadow-sm overflow-hidden mb-2 bg-white transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 group-hover:shadow-md p-1.5 shrink-0">
                        {cat.logoUrl ? (
                          <img
                            src={cat.logoUrl}
                            alt={`${cat.name} logo`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="text-blue-500">
                            {isSsc && <Award className="h-6 w-6 sm:h-7 sm:w-7 text-orange-500" />}
                            {isRailways && <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-500" />}
                            {isCourt && <Scale className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-500" />}
                            {!isSsc && !isRailways && !isCourt && <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-pink-500" />}
                          </div>
                        )}
                      </div>
                      <h4 className="font-extrabold text-[11px] sm:text-xs text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {isHindi && cat.nameHi ? cat.nameHi : cat.name}
                      </h4>
                      <span className="text-[8px] sm:text-[9px] text-slate-400 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">
                        {categoryTests.length} {isHindi ? 'टेस्ट' : 'Tests'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-[8.5px] uppercase tracking-wider mt-3 pt-1.5 border-t border-slate-200 dark:border-slate-800/60 w-full">
                      {isHindi ? "कैटेगरी देखें" : "View Category"} <ChevronRight className="h-2.5 w-2.5 transition group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  {/* Right side test title bullets */}
                  {categoryTests.length > 0 && (
                    <div className="border-l border-slate-200/50 dark:border-slate-800/40 pl-2.5 flex flex-col justify-center min-w-[100px] max-w-[125px] shrink-0">
                      <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                        {isHindi ? 'उपलब्ध टेस्ट' : 'Tests List'}
                      </span>
                      <div className="flex flex-col gap-1">
                        {categoryTests.slice(0, 5).map(tst => (
                          <div key={tst.id} className="flex items-center gap-1">
                            <div className="h-1 w-1 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0"></div>
                            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[85px]" title={isHindi && tst.titleHi ? tst.titleHi : tst.title}>
                              {isHindi && tst.titleHi ? tst.titleHi : tst.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Exam Guidelines & SSC DEST Standards Card */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {isHindi ? 'सरकारी परीक्षा टाइपिंग मूल्यांकन नियम (SSC CGL / CHSL DEST Guidelines)' : 'Official Exam Typing Evaluation Guidelines (SSC / Govt Standard)'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {isHindi ? 'सटीक मूल्यांकन सूत्र एवं फुल/हाफ मिस्टेक नियम' : 'Understand Full Mistakes, Half Mistakes, Net WPM, and qualification criteria'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                {isHindi ? 'फुल मिस्टेक्स (Full Mistakes - 100%)' : 'Full Mistakes (1 Penalty)'}
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                <li>{isHindi ? 'किसी शब्द को पूरी तरह छोड़ देना (Omission of word)' : 'Omission of any word in passage'}</li>
                <li>{isHindi ? 'गलत शब्द टाइप करना या स्पेलिंग बदलना (Substitution)' : 'Substitution or wrong spelling of word'}</li>
                <li>{isHindi ? 'अतिरिक्त नया शब्द जोड़ देना (Extra addition)' : 'Addition of any word not in original text'}</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {isHindi ? 'हाफ मिस्टेक्स (Half Mistakes - 50%)' : 'Half Mistakes (0.5 Penalty)'}
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                <li>{isHindi ? 'कैपिटल / स्मॉल लेटर त्रुटि (Case mismatch)' : 'Capital / small letter mismatch'}</li>
                <li>{isHindi ? 'विराम चिह्न या कॉमा त्रुटि (Punctuation)' : 'Punctuation mark error or missing comma'}</li>
                <li>{isHindi ? 'शब्दों के बीच स्पेसिंग की गलती (Spacing error)' : 'Extra or missing space between words'}</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {isHindi ? 'मूल्यांकन सूत्र (Evaluation Formulas)' : 'Evaluation Formulas'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div><strong>SSC DEST & CHSL:</strong> Error % = (Total Mistakes ÷ Master Passage Words) × 100</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-2">Master Passage Words = Total Keystrokes in Master Passage ÷ 5</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-2">Total Mistakes = Full Mistakes + (Half Mistakes / 2)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-2">SSC Result evaluated solely on Error % (5% rule & penalty hidden/not applicable)</div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold pl-2">SSC CGL DEST Cutoffs: UR: 20% | OBC/EWS: 25% | SC/ST/Others: 30%</div>
                <div className="pt-1"><strong>RRB NTPC / Standard:</strong> Net WPM = ((Keystrokes ÷ 5) − Penalty) ÷ Minutes</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Custom Practice Drill Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600">
                  <Keyboard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {isHindi ? 'कस्टम टाइपिंग ड्रिल बनाएँ' : 'Create Custom Practice Drill'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isHindi ? 'अपना गद्यांश पेस्ट करें या पैसेज बैंक से चुनें' : 'Paste custom passage text or choose from passage bank'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Passage Bank quick select */}
            {passages.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isHindi ? 'पैसेज बैंक से तुरंत चुनें (वैकल्पिक)' : 'Pick from Passage Bank (Optional)'}
                </label>
                <select
                  onChange={e => {
                    const sel = passages.find(p => p.id === e.target.value);
                    if (sel) setCustomPassageText(sel.text);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">-- {isHindi ? 'पैसेज चुनें' : 'Select a passage'} --</option>
                  {passages.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.wordCount} words - {p.difficulty})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Passage text area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isHindi ? 'गद्यांश टेक्स्ट (Passage Text)' : 'Passage Text'}
                </label>
                <span className="text-xs text-slate-400">
                  {customPassageText.trim() ? customPassageText.trim().split(/\s+/).length : 0} {isHindi ? 'शब्द' : 'words'}
                </span>
              </div>
              <textarea
                rows={5}
                value={customPassageText}
                onChange={e => setCustomPassageText(e.target.value)}
                placeholder={isHindi ? 'यहाँ अपना अभ्यास गद्यांश पेस्ट करें...' : 'Paste your practice passage here...'}
                className="w-full p-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Durations */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {isHindi ? 'डेमो (मिनट)' : 'Demo (Min)'}
                </label>
                <select
                  value={customDemoDuration}
                  onChange={e => setCustomDemoDuration(Number(e.target.value))}
                  className="w-full mt-1 p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value={0.5}>30s</option>
                  <option value={1}>1 min</option>
                  <option value={2}>2 min</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {isHindi ? 'ब्रेक (मिनट)' : 'Break (Min)'}
                </label>
                <select
                  value={customBreakDuration}
                  onChange={e => setCustomBreakDuration(Number(e.target.value))}
                  className="w-full mt-1 p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value={0.5}>30s</option>
                  <option value={1}>1 min</option>
                  <option value={2}>2 min</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {isHindi ? 'मुख्य परीक्षा' : 'Main (Min)'}
                </label>
                <select
                  value={customDuration}
                  onChange={e => setCustomDuration(Number(e.target.value))}
                  className="w-full mt-1 p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value={2}>2 min</option>
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                onClick={handleStartCustomPractice}
                disabled={!customPassageText.trim()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition"
              >
                {isHindi ? 'कस्टम ड्रिल शुरू करें' : 'Launch Custom Drill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
