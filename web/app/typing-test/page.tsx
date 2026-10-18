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
  Filter,
  GraduationCap,
  HelpCircle,
  X
} from 'lucide-react';
import { TypingTest, TypingCategory, TypingAttempt, TypingPassage } from '../lib/typingTypes';
import { SiteHeader, SiteFooter, PageTitle, SectionCard, Field, StatusBadge, btnPrimary, btnSecondary, inputCls, pageBg, container } from '../components/SiteUI';
import { TypingHubTour, requestTypingTourStart } from '../components/TypingTour';
import { resetStaleTypingLocalData } from '../lib/typingLocalReset';

// Category theme styling matching mocktest exam categories tiles
const getCategoryTheme = (catId: string, name: string) => {
  const lower = (catId + ' ' + name).toLowerCase();
  if (lower.includes('ssc')) {
    return {
      color: 'orange',
      bg: 'bg-orange-50/50 dark:bg-orange-950/15',
      border: 'border-orange-100 dark:border-orange-900/30',
      hoverBorder: 'hover:border-orange-400 dark:hover:border-orange-600',
      iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/45 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/30',
      gradient: 'from-orange-500 to-amber-500',
      glow: 'shadow-orange-500/10 dark:shadow-orange-500/5',
      accentGlow: 'rgba(249,115,22,0.12)',
      tag: 'SSC Typing',
      tagHi: 'एसएससी टाइपिंग'
    };
  }
  if (lower.includes('railway') || lower.includes('rrb') || lower.includes('ntpc')) {
    return {
      color: 'indigo',
      bg: 'bg-indigo-50/50 dark:bg-indigo-950/15',
      border: 'border-indigo-100 dark:border-indigo-900/30',
      hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-600',
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
      gradient: 'from-indigo-500 to-blue-550',
      glow: 'shadow-indigo-500/10 dark:shadow-indigo-500/5',
      accentGlow: 'rgba(99,102,241,0.12)',
      tag: 'RRB NTPC',
      tagHi: 'रेलवे टाइपिंग'
    };
  }
  if (lower.includes('court') || lower.includes('clerk') || lower.includes('jca') || lower.includes('hc') || lower.includes('jja')) {
    return {
      color: 'sky',
      bg: 'bg-sky-50/50 dark:bg-sky-950/15',
      border: 'border-sky-100 dark:border-sky-900/30',
      hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-600',
      iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      badgeBg: 'bg-sky-50 dark:bg-sky-950/45 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/30',
      gradient: 'from-sky-500 to-indigo-500',
      glow: 'shadow-sky-500/10 dark:shadow-sky-500/5',
      accentGlow: 'rgba(14,165,233,0.12)',
      tag: 'Court / Clerk',
      tagHi: 'कोर्ट / क्लर्क'
    };
  }
  if (lower.includes('dsssb') || lower.includes('delhi')) {
    return {
      color: 'emerald',
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/15',
      border: 'border-emerald-100 dark:border-emerald-900/30',
      hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
      gradient: 'from-emerald-500 to-teal-500',
      glow: 'shadow-emerald-500/10 dark:shadow-emerald-500/5',
      accentGlow: 'rgba(16,185,129,0.12)',
      tag: 'DSSSB Delhi',
      tagHi: 'डीएसएसएसबी'
    };
  }
  if (lower.includes('police') || lower.includes('upsssc') || lower.includes('rssb') || lower.includes('rvunl') || lower.includes('cpct')) {
    return {
      color: 'amber',
      bg: 'bg-amber-50/50 dark:bg-amber-950/15',
      border: 'border-amber-100 dark:border-amber-900/30',
      hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
      gradient: 'from-amber-500 to-orange-500',
      glow: 'shadow-amber-500/10 dark:shadow-amber-500/5',
      accentGlow: 'rgba(245,158,11,0.12)',
      tag: 'Police / State',
      tagHi: 'राज्य / पुलिस'
    };
  }
  if (lower.includes('jsa') || lower.includes('csir') || lower.includes('kvs') || lower.includes('nvs') || lower.includes('emrs') || lower.includes('cbse') || lower.includes('aiims') || lower.includes('secretariat')) {
    return {
      color: 'purple',
      bg: 'bg-purple-50/50 dark:bg-purple-950/15',
      border: 'border-purple-100 dark:border-purple-900/30',
      hoverBorder: 'hover:border-purple-400 dark:hover:border-purple-600',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/45 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900/30',
      gradient: 'from-purple-500 to-pink-500',
      glow: 'shadow-purple-500/10 dark:shadow-purple-500/5',
      accentGlow: 'rgba(168,85,247,0.12)',
      tag: 'Secretariat / JSA',
      tagHi: 'सचिवालय / जेएसए'
    };
  }
  return {
    color: 'blue',
    bg: 'bg-blue-50/50 dark:bg-blue-950/15',
    border: 'border-blue-200 dark:border-blue-900/30',
    hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-600',
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/45 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
    gradient: 'from-blue-500 to-indigo-550',
    glow: 'shadow-blue-500/10 dark:shadow-blue-500/5',
    accentGlow: 'rgba(59,130,246,0.12)',
    tag: 'Typing Drill',
    tagHi: 'टाइपिंग अभ्यास'
  };
};

const getCategoryIcon = (id: string, name: string, logoUrl?: string | null) => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className="w-full h-full object-contain p-1"
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  }
  const lower = (id + ' ' + name).toLowerCase();
  if (lower.includes('ssc')) return <Award className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />;
  if (lower.includes('railway') || lower.includes('rrb') || lower.includes('ntpc')) return <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />;
  if (lower.includes('court') || lower.includes('clerk') || lower.includes('jca') || lower.includes('hc') || lower.includes('jja')) return <Scale className="h-5 w-5 sm:h-6 sm:w-6 text-sky-500" />;
  if (lower.includes('dsssb') || lower.includes('delhi')) return <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />;
  if (lower.includes('police') || lower.includes('upsssc') || lower.includes('rssb') || lower.includes('rvunl') || lower.includes('cpct')) return <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />;
  if (lower.includes('jsa') || lower.includes('csir') || lower.includes('cbse') || lower.includes('secretariat') || lower.includes('aiims')) return <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />;
  return <Keyboard className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />;
};

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
    resetStaleTypingLocalData();

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

  const filterTabs = [
    { id: 'ALL', label: isHindi ? 'सभी परीक्षाएं' : 'All exams' },
    { id: 'SSC', label: 'SSC (CGL, CHSL)' },
    { id: 'COURTS', label: isHindi ? 'उच्च न्यायालय एवं क्लर्क' : 'High Courts & Clerks' },
    { id: 'DSSSB', label: 'DSSSB & Delhi' },
    { id: 'STATE_POLICE', label: isHindi ? 'पुलिस एवं राज्य परीक्षाएं' : 'Police & State exams' },
    { id: 'SECRETARIAT', label: isHindi ? 'सचिवालय एवं JSA' : 'Secretariat & JSA' },
  ];

  // Tour example exam: SSC CGL typing if available, otherwise the first exam
  const typingTourTargetId: string | null = categories.find(c => c.id === 'ssc-cgl-typing')?.id ?? categories[0]?.id ?? null;

  return (
    <div className={`min-h-screen flex flex-col ${pageBg} font-sans`} suppressHydrationWarning>
      <SiteHeader />

      <PageTitle
        crumbs={[{ label: isHindi ? 'होम' : 'Home', href: '/' }, { label: isHindi ? 'टाइपिंग टेस्ट' : 'Typing Tests' }]}
        title={isHindi ? 'टाइपिंग टेस्ट' : 'Typing Tests'}
        subtitle={isHindi
          ? 'सरकारी भर्ती परीक्षाओं के आधिकारिक पैटर्न पर आधारित कंप्यूटर टाइपिंग टेस्ट का अभ्यास करें।'
          : 'Practise computer typing tests built on the official pattern of each government recruitment exam.'}
        actions={<>
          <button type="button" onClick={requestTypingTourStart} className={btnSecondary} suppressHydrationWarning>
            <HelpCircle className="h-4 w-4" />
            {isHindi ? 'यह कैसे काम करता है' : 'How it works'}
          </button>
          <button type="button" onClick={() => setShowCustomModal(true)} className={btnSecondary} suppressHydrationWarning>
            <Keyboard className="h-4 w-4" />
            {isHindi ? 'कस्टम अभ्यास' : 'Custom practice'}
          </button>
        </>}
      />

      <main className={`${container} w-full py-6 pb-12 space-y-5`} suppressHydrationWarning>
        {/* Search + filters */}
        <div data-tour="tt-filters" className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between" suppressHydrationWarning>
          <div className="flex flex-wrap gap-1.5">
            {filterTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilterTab(tab.id)}
                className={`h-8 px-3 rounded-md text-sm border transition-colors cursor-pointer ${
                  selectedFilterTab === tab.id
                    ? 'bg-[#1e4e79] border-[#1e4e79] text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                suppressHydrationWarning
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-80 shrink-0" suppressHydrationWarning>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              suppressHydrationWarning
              type="text"
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              placeholder={isHindi ? 'परीक्षा खोजें (जैसे SSC, NTPC, JSA)' : 'Search exams (e.g. SSC, NTPC, JSA)'}
              className={`${inputCls} pl-9 pr-8`}
            />
            {categorySearch && (
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => setCategorySearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400" suppressHydrationWarning>
          {isLoading && categories.length === 0
            ? (isHindi ? 'परीक्षाएं लोड हो रही हैं…' : 'Loading exams…')
            : (isHindi ? `${filteredCategories.length} परीक्षाएं` : `${filteredCategories.length} exams`)}
        </p>

        {/* Exam grid */}
        {isLoading && categories.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <div key={n} className="h-[88px] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <SectionCard>
            <div className="py-8 text-center">
              <Search className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">{isHindi ? 'कोई परीक्षा नहीं मिली' : 'No exams found'}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{isHindi ? 'कोई दूसरा शब्द खोजें।' : 'Try a different search term or filter.'}</p>
            </div>
          </SectionCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCategories.map(cat => {
              const themeInfo = getCategoryTheme(cat.id, cat.name);
              const catAttempts = userAttempts.filter(a => (a.categoryName || '').toLowerCase() === cat.id.toLowerCase()).length;
              return (
                <Link
                  key={cat.id}
                  data-tour={cat.id === typingTourTargetId ? 'tt-exam' : undefined}
                  href={`/typing-test/category/${cat.id}`}
                  prefetch={true}
                  className="group flex items-start gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition"
                >
                  <div className="w-11 h-11 rounded-md border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center overflow-hidden shrink-0 p-1">
                    {getCategoryIcon(cat.id, cat.name, cat.logoUrl)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300">
                      {isHindi && cat.nameHi ? cat.nameHi : cat.name}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <StatusBadge tone="slate">{isHindi ? themeInfo.tagHi : themeInfo.tag}</StatusBadge>
                      {isMounted && catAttempts > 0 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">{catAttempts} {isHindi ? 'प्रयास' : catAttempts === 1 ? 'attempt' : 'attempts'}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 shrink-0 mt-0.5" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Custom practice */}
        <section data-tour="tt-custom" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{isHindi ? 'अपने गद्यांश से अभ्यास करें' : 'Practise with your own passage'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{isHindi ? 'कोई भी टेक्स्ट पेस्ट करें और स्पीड व त्रुटि विश्लेषण के साथ अभ्यास करें।' : 'Paste any editorial or text and practise with full speed and error analysis.'}</p>
          </div>
          <button type="button" onClick={() => setShowCustomModal(true)} className={`${btnPrimary} self-start sm:self-auto shrink-0`} suppressHydrationWarning>
            {isHindi ? 'कस्टम अभ्यास बनाएं' : 'Create custom drill'}
          </button>
        </section>
      </main>

      <SiteFooter />
      <TypingHubTour
        ready={!isLoading && categories.length > 0}
        targetId={typingTourTargetId}
        resetFilters={() => { setSelectedFilterTab('ALL'); setCategorySearch(''); }}
      />

      {/* Custom practice dialog */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-xl w-full shadow-xl border border-slate-200 dark:border-slate-800" suppressHydrationWarning>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{isHindi ? 'कस्टम टाइपिंग अभ्यास' : 'Custom typing drill'}</h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close"
                suppressHydrationWarning
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label={isHindi ? 'गद्यांश' : 'Passage text'}>
                <textarea
                  rows={6}
                  value={customPassageText}
                  onChange={e => setCustomPassageText(e.target.value)}
                  placeholder={isHindi ? 'अपना गद्यांश यहां पेस्ट करें…' : 'Paste your paragraph here…'}
                  className={`${inputCls} h-auto py-2 leading-relaxed`}
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label={isHindi ? 'डेमो (मिनट)' : 'Demo (min)'}>
                  <input type="number" step="0.5" min="0" value={customDemoDuration} onChange={e => setCustomDemoDuration(Number(e.target.value))} className={inputCls} />
                </Field>
                <Field label={isHindi ? 'ब्रेक (मिनट)' : 'Break (min)'}>
                  <input type="number" step="0.5" min="0" value={customBreakDuration} onChange={e => setCustomBreakDuration(Number(e.target.value))} className={inputCls} />
                </Field>
                <Field label={isHindi ? 'मुख्य टेस्ट (मिनट)' : 'Main test (min)'}>
                  <input type="number" min="1" max="60" value={customDuration} onChange={e => setCustomDuration(Number(e.target.value))} className={inputCls} />
                </Field>
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 rounded-b-lg flex justify-end gap-2">
              <button type="button" onClick={() => setShowCustomModal(false)} className={btnSecondary} suppressHydrationWarning>
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button type="button" onClick={handleStartCustomPractice} disabled={!customPassageText.trim()} className={btnPrimary} suppressHydrationWarning>
                {isHindi ? 'अभ्यास शुरू करें' : 'Start drill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
