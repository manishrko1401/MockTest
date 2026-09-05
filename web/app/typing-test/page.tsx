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
  Play,
  Search,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  BarChart2,
  FileText,
  AlertCircle,
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
  Scale,
  Train,
  Layers,
  Filter
} from 'lucide-react';
import { TypingTest, TypingCategory, TypingAttempt, TypingPassage } from '../lib/typingTypes';

export default function TypingTestPortalPage() {
  const { currentUser, language, setLanguage, theme, toggleTheme } = useAuth();
  const t = TRANSLATIONS[language];
  const router = useRouter();

  const isHindi = language === 'hi';

  const [categories, setCategories] = useState<TypingCategory[]>([]);
  const [userAttempts, setUserAttempts] = useState<TypingAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Filters & Search
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [selectedFilterTab, setSelectedFilterTab] = useState<string>('ALL');

  // Custom Practice Modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customPassageText, setCustomPassageText] = useState('');
  const [customDuration, setCustomDuration] = useState(5);
  const [customDemoDuration, setCustomDemoDuration] = useState(1);
  const [customBreakDuration, setCustomBreakDuration] = useState(1);

  // Fetch only categories (lightweight, <5KB)
  useEffect(() => {
    let active = true;
    setIsMounted(true);

    // 1. Instant client-side hydration from cache
    try {
      const cached = sessionStorage.getItem('cached_typing_categories');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(parsed);
          setIsLoading(false);
        }
      }
      const localAttempts = localStorage.getItem('all_typing_attempts');
      if (localAttempts) {
        const parsedAtt = JSON.parse(localAttempts);
        if (Array.isArray(parsedAtt)) {
          setUserAttempts(parsedAtt);
        }
      }
    } catch (e) {}

    // 2. Fetch fresh data from server
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-typing-categories' })
        });
        const data = await res.json();
        if (data.success && active && Array.isArray(data.categories)) {
          setCategories(data.categories);
          try {
            sessionStorage.setItem('cached_typing_categories', JSON.stringify(data.categories));
          } catch (e) {}
        }
      } catch (err) {
        console.error('Failed to load typing categories:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchCategories();

    // Fetch user attempts in background
    if (currentUser?.id) {
      fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-user-typing-attempts', data: { userId: currentUser.id } })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && active && Array.isArray(data.attempts)) {
            setUserAttempts(data.attempts);
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  // Filtered categories for search & tabs
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      // Search filter
      if (categorySearch.trim()) {
        const q = categorySearch.toLowerCase();
        const matchName = cat.name.toLowerCase().includes(q) || (cat.nameHi && cat.nameHi.toLowerCase().includes(q));
        const matchDesc = cat.description && cat.description.toLowerCase().includes(q);
        const matchId = cat.id.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchId) return false;
      }

      // Tab filter
      if (selectedFilterTab === 'SSC') {
        return cat.id.toLowerCase().includes('ssc') || cat.name.toLowerCase().includes('ssc');
      }
      if (selectedFilterTab === 'RAILWAYS') {
        return cat.id.toLowerCase().includes('rrb') || cat.id.toLowerCase().includes('railway') || cat.name.toLowerCase().includes('ntpc');
      }
      if (selectedFilterTab === 'COURTS') {
        return cat.id.toLowerCase().includes('court') || cat.name.toLowerCase().includes('court') || cat.name.toLowerCase().includes('jca') || cat.name.toLowerCase().includes('clerk');
      }
      if (selectedFilterTab === 'DSSSB') {
        return cat.id.toLowerCase().includes('dsssb') || cat.name.toLowerCase().includes('dsssb') || cat.name.toLowerCase().includes('delhi');
      }
      if (selectedFilterTab === 'STATE_POLICE') {
        return cat.id.toLowerCase().includes('police') || cat.id.toLowerCase().includes('upsssc') || cat.id.toLowerCase().includes('rssb') || cat.id.toLowerCase().includes('rvunl') || cat.id.toLowerCase().includes('cpct');
      }
      if (selectedFilterTab === 'SECRETARIAT') {
        return cat.id.toLowerCase().includes('jsa') || cat.id.toLowerCase().includes('csir') || cat.id.toLowerCase().includes('kvs') || cat.id.toLowerCase().includes('nvs') || cat.id.toLowerCase().includes('emrs') || cat.id.toLowerCase().includes('cbse') || cat.id.toLowerCase().includes('aiims') || cat.id.toLowerCase().includes('spmcil');
      }

      return true;
    });
  }, [categories, categorySearch, selectedFilterTab]);


  const handleStartCustomPractice = () => {
    if (!customPassageText.trim()) return;
    if (!currentUser) {
      router.push('/auth?redirect=' + encodeURIComponent('/typing-test') + '&mode=login');
      return;
    }
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
    router.push(`/typing-test/${customTest.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors" suppressHydrationWarning>
      {/* Navbar header */}
      <header className="h-18 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs" suppressHydrationWarning>
        <div className="flex items-center gap-2.5 sm:gap-4 lg:gap-6 min-w-0">
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
            <Link href="/typing-test" className="text-blue-600 dark:text-blue-400 font-extrabold whitespace-nowrap">
              <span>{isHindi ? 'टाइपिंग परीक्षा' : 'Typing Exams'}</span>
            </Link>
            <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">
              <span>{t.navTestSeries}</span>
            </Link>
            <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">
              <span>{language === 'hi' ? 'सूचनाएं एवं अपडेट्स' : 'Notices & Updates'}</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0" suppressHydrationWarning>
          {/* Profile Button */}
          <Link
            href={currentUser ? "/profile" : "/auth"}
            suppressHydrationWarning
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer active:scale-95 shadow-2xs"
            title={currentUser ? (language === 'hi' ? 'मेरी प्रोफाइल' : 'Profile') : (language === 'hi' ? 'लॉग इन' : 'Login')}
          >
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline" suppressHydrationWarning>{currentUser ? (language === 'hi' ? 'प्रोफाइल' : 'Profile') : (language === 'hi' ? 'लॉग इन' : 'Login')}</span>
          </Link>

          {/* Language selector */}
          <select
            suppressHydrationWarning
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2 py-1.5 lg:px-2.5 lg:py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="en" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">English</option>
            <option value="hi" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">हिन्दी</option>
          </select>

          {/* Theme switcher */}
          <button 
            suppressHydrationWarning
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800"
            title={theme === 'light' ? t.themeDark : t.themeLight}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8" suppressHydrationWarning>
        {/* Search & Category Filter Controls */}
        <div className="space-y-4" suppressHydrationWarning>
          {/* Main Centered Search Bar */}
          <div className="max-w-xl mx-auto">
            <div className="relative shadow-md rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" suppressHydrationWarning>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <input
                suppressHydrationWarning
                type="text"
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                placeholder="Search exams (e.g. SSC, NTPC, JSA, High Court, Delhi Police...)"
                className="w-full pl-12 pr-10 py-3.5 text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
              />
              {categorySearch && (
                <button
                  suppressHydrationWarning
                  onClick={() => setCategorySearch('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap" suppressHydrationWarning>
            {[
              { id: 'ALL', label: 'All Exams' },
              { id: 'SSC', label: 'SSC (CGL, CHSL)' },
              { id: 'RAILWAYS', label: 'RRB NTPC' },
              { id: 'COURTS', label: 'High Courts & Clerks' },
              { id: 'DSSSB', label: 'DSSSB & Delhi' },
              { id: 'STATE_POLICE', label: 'Police & State Exams' },
              { id: 'SECRETARIAT', label: 'Secretariat & JSA' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilterTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedFilterTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                suppressHydrationWarning
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Cards Grid */}
        {isLoading && categories.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <div key={n} className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800/60 animate-pulse border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <Search className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No exams found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Try searching with different keywords</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCategories.map(cat => (
              <div
                key={cat.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 transform-gpu hover:-translate-y-1.5 p-6 flex flex-col items-center text-center justify-between group"
              >
                <div className="flex flex-col items-center w-full space-y-3.5">
                  {/* Category Logo Container */}
                  <div className="w-20 h-20 rounded-full bg-white border-2 border-slate-200/90 dark:border-slate-700/80 shadow-xs flex items-center justify-center p-2 shrink-0 transition-transform duration-300 group-hover:scale-105">
                    {cat.logoUrl ? (
                      <img
                        src={cat.logoUrl}
                        alt={cat.name}
                        loading="lazy"
                        className="w-full h-full object-contain rounded-full"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Keyboard className="w-8 h-8 text-blue-600" />
                    )}
                  </div>

                  {/* Category Title */}
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-snug line-clamp-2 min-h-[2.75rem] flex items-center justify-center">
                    {cat.name}
                  </h3>
                </div>

                {/* Practice Now Button */}
                <div className="mt-5 w-full">
                  <Link
                    href={`/typing-test/category/${cat.id}`}
                    prefetch={true}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                  >
                    <Keyboard className="w-4 h-4" />
                    <span>Practice Now</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Custom Drill Trigger */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-black">{isHindi ? 'अपना खुद का टाइपिंग गद्यांश अभ्यास करें' : 'Practice with Custom Passage Text'}</h3>
            <p className="text-xs text-blue-100">{isHindi ? 'अपना खुद का टेक्स्ट पेस्ट करें और कस्टम टाइमर के साथ तुरंत अभ्यास शुरू करें।' : 'Paste any editorial or custom text and practice with real-time speed & error analysis.'}</p>
          </div>
          <button
            onClick={() => setShowCustomModal(true)}
            className="px-5 py-2.5 rounded-full bg-white text-blue-700 font-extrabold text-xs shadow-md hover:bg-blue-50 transition active:scale-95 cursor-pointer whitespace-nowrap"
            suppressHydrationWarning
          >
            + {isHindi ? 'कस्टम ड्रिल बनाएं' : 'Create Custom Drill'}
          </button>
        </div>
      </main>

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

      {/* Custom Practice Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4" suppressHydrationWarning>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-blue-600" />
                <span>{isHindi ? 'कस्टम टाइपिंग अभ्यास' : 'Custom Typing Drill'}</span>
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
                suppressHydrationWarning
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isHindi ? 'टाइपिंग गद्यांश टेक्स्ट:' : 'Passage Text:'}
                </label>
                <textarea
                  rows={6}
                  value={customPassageText}
                  onChange={e => setCustomPassageText(e.target.value)}
                  placeholder="Paste your custom paragraph here..."
                  className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isHindi ? 'डेमो समय (मिनट):' : 'Demo (Min):'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={customDemoDuration}
                    onChange={e => setCustomDemoDuration(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isHindi ? 'ब्रेक समय (मिनट):' : 'Break (Min):'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={customBreakDuration}
                    onChange={e => setCustomBreakDuration(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isHindi ? 'मुख्य परीक्षा (मिनट):' : 'Main Exam (Min):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={customDuration}
                    onChange={e => setCustomDuration(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
                suppressHydrationWarning
              >
                Cancel
              </button>
              <button
                onClick={handleStartCustomPractice}
                disabled={!customPassageText.trim()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
                suppressHydrationWarning
              >
                Start Custom Drill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
