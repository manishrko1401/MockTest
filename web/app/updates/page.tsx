"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { ShieldCheck, ChevronRight, Bell, Trophy, FileText, ArrowLeft, Sun, Moon, Menu, LogOut, X, ArrowRight, Search, Filter, User } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { useIsMobile } from '../useIsMobile';

const isNewlyPublished = (publishDateStr?: string) => {
  if (!publishDateStr) return false;
  try {
    const pubDate = new Date(publishDateStr);
    const now = new Date();
    pubDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(now.getTime() - pubDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  } catch (e) {
    return false;
  }
};

export default function UpdatesCenterPage() {
  const { currentUser, logout, theme, toggleTheme, noticesList, language, setLanguage } = useAuth();
  const t = TRANSLATIONS[language];
  
  const { isMobile, isMounted } = useIsMobile();
  const displayNotices = isMounted ? noticesList : [];
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activeMobileTab, setActiveMobileTab] = React.useState<'notice' | 'result' | 'admit_card' | 'answer_key'>('notice');
  const [categoryFilter, setCategoryFilter] = React.useState<'notice' | 'result' | 'admit_card' | 'answer_key' | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const router = useRouter();

  // Listen to URL search param ?category=...
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateCategoryFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category') as any;
      if (['notice', 'result', 'admit_card', 'answer_key'].includes(cat)) {
        setCategoryFilter(cat);
      } else {
        setCategoryFilter(null);
      }
    };

    updateCategoryFromUrl();
    window.addEventListener('popstate', updateCategoryFromUrl);
    return () => window.removeEventListener('popstate', updateCategoryFromUrl);
  }, []);

  const openCategorySection = (cat: 'notice' | 'result' | 'admit_card' | 'answer_key') => {
    setCategoryFilter(cat);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('category', cat);
      window.history.pushState({}, '', url.toString());
    }
  };

  const clearCategorySection = () => {
    setCategoryFilter(null);
    setSearchQuery('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('category');
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleToggleMenu = (open: boolean) => {
    setMobileMenuOpen(open);
    if (typeof window !== 'undefined') {
      if (open) {
        window.location.hash = 'menu';
      } else {
        if (window.location.hash === '#menu') {
          window.history.back();
        } else {
          window.location.hash = '';
        }
      }
    }
  };

  const handleTabClick = (tab: 'notice' | 'result' | 'admit_card' | 'answer_key') => {
    setActiveMobileTab(tab);
    if (typeof window !== 'undefined') {
      if (tab === 'notice') {
        if (window.location.hash.startsWith('#tab-')) {
          window.history.back();
        } else {
          window.location.hash = '';
        }
      } else {
        window.location.hash = `tab-${tab}`;
      }
    }
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#tab-')) {
        const tabName = hash.replace('#tab-', '') as any;
        setActiveMobileTab(tabName);
      } else {
        setActiveMobileTab('notice');
      }

      if (hash === '#menu') {
        setMobileMenuOpen(true);
      } else {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    const initialHash = window.location.hash;
    if (initialHash) {
      handleHashChange();
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Helper render for single tile item (Normal font weight, no bolding, no numberings, no arrow buttons)
  const renderTileCard = (notice: any, idx: number, themeColor: 'blue' | 'amber' | 'emerald' | 'purple') => {
    const typeTagColors = {
      blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      emerald: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      purple: 'bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    };

    const hoverBorderColors = {
      blue: 'hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/50',
      amber: 'hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/50',
      emerald: 'hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/50',
      purple: 'hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/50',
    };

    const hoverShadowColors = {
      blue: 'hover:shadow-[0_12px_24px_-6px_rgba(59,130,246,0.18),0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_24px_-6px_rgba(59,130,246,0.35),0_0_16px_rgba(59,130,246,0.18)]',
      amber: 'hover:shadow-[0_12px_24px_-6px_rgba(245,158,11,0.18),0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_24px_-6px_rgba(245,158,11,0.35),0_0_16px_rgba(245,158,11,0.18)]',
      emerald: 'hover:shadow-[0_12px_24px_-6px_rgba(16,185,129,0.18),0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_24px_-6px_rgba(16,185,129,0.35),0_0_16px_rgba(16,185,129,0.18)]',
      purple: 'hover:shadow-[0_12px_24px_-6px_rgba(168,85,247,0.18),0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_24px_-6px_rgba(168,85,247,0.35),0_0_16px_rgba(168,85,247,0.18)]',
    };

    return (
      <div
        key={notice.id}
        onClick={() => router.push(`/updates/${notice.id}`)}
        className={`group w-full bg-slate-50/90 dark:bg-slate-950/70 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/90 dark:border-slate-800 ${hoverBorderColors[themeColor]} ${hoverShadowColors[themeColor]} rounded-2xl p-4 shadow-2xs transition-all duration-300 transform-gpu hover:-translate-y-1.5 hover:scale-[1.015] active:translate-y-0 active:scale-[0.99] cursor-pointer flex flex-col gap-2 relative`}
      >
        {/* Top Badges & Date */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${typeTagColors[themeColor]}`}>
              {notice.type}
            </span>
            {isNewlyPublished(notice.publishDate) && (
              <span className="bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-2xs">
                {t.newBadge}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold whitespace-nowrap">{notice.date}</span>
        </div>

        {/* Regular Normal Weight Title (Clean font, not bolded) */}
        <h5 className="font-semibold text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug transition-colors">
          {notice.title}
        </h5>

        {/* Last Date Deadline - Only in Live Notices section */}
        {notice.category === 'notice' && notice.lastDate && (
          <p className="text-[9.5px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
            <span>{t.lastDate}</span>
            <span>{notice.lastDate}</span>
          </p>
        )}
      </div>
    );
  };

  // Section meta information for Category Dedicated Page
  const categoryMeta = {
    notice: {
      title: language === 'hi' ? 'सभी लाइव सूचनाएं' : 'All Live Notices',
      desc: language === 'hi' ? 'सक्रिय सरकारी भर्ती विज्ञापन और ऑनलाइन आवेदन पत्र' : 'Browse all active government job recruitment releases & online application forms',
      icon: Bell,
      color: 'blue',
      topBorder: 'border-t-blue-600',
      badgeBg: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    },
    result: {
      title: language === 'hi' ? 'सभी लाइव परिणाम और मेरिट लिस्ट' : 'All Results & Merit Lists',
      desc: language === 'hi' ? 'परीक्षा परिणाम, मेरिट सूचियां और कट-ऑफ अंक' : 'Explore all declared exam results, merit lists, score cards & cutoff marks',
      icon: Trophy,
      color: 'amber',
      topBorder: 'border-t-amber-500',
      badgeBg: 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
    admit_card: {
      title: language === 'hi' ? 'सभी प्रवेश पत्र और परीक्षा तिथियां' : 'All Admit Cards & Exam Dates',
      desc: language === 'hi' ? 'प्रवेश पत्र डाउनलोड, कॉल लेटर और परीक्षा केंद्र की जानकारी' : 'Download hall tickets, exam city intimation slips & call letters',
      icon: FileText,
      color: 'emerald',
      topBorder: 'border-t-emerald-600',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    },
    answer_key: {
      title: language === 'hi' ? 'सभी उत्तर कुंजी' : 'All Answer Keys',
      desc: language === 'hi' ? 'अनंतिम और अंतिम उत्तर कुंजी और आपत्ति दर्ज करने के लिंक' : 'Check provisional answer keys, final key sheets & objection tracking links',
      icon: ShieldCheck,
      color: 'purple',
      topBorder: 'border-t-purple-600',
      badgeBg: 'bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    },
  };

  if (isMounted && isMobile) {
    return (
      <div className="flex-1 flex flex-col bg-slate-200/90 dark:bg-slate-900 font-sans min-h-screen text-slate-800 dark:text-slate-100 overflow-x-hidden relative transition-colors duration-200 mobile-fade-in">
        
        {/* Mobile Header - Increased Height */}
        <header className="h-18 border-b border-slate-200 dark:border-slate-900 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            {/* Back Button BEFORE Logo */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/');
                }
              }}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer active:scale-95 transition"
              title={language === 'hi' ? 'वापस' : 'Back'}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-[11px] font-bold">{language === 'hi' ? 'वापस' : 'Back'}</span>
            </button>

            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="bg-[#E6F4FE] dark:bg-slate-800 p-1.5 rounded-full shadow-sm flex items-center justify-center h-8 w-8 border border-blue-200/50 dark:border-slate-700 shrink-0">
                <Trophy className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="font-extrabold text-xs leading-none text-slate-900 dark:text-white tracking-wider truncate">{t.logoTitle}</h1>
                <p className="text-[7px] text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase mt-0.5 leading-none truncate">{t.logoSub}</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleMenu(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-95"
            >
              {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </header>

        {/* MOBILE SLIDE-DOWN DRAWER MENU */}
        {mobileMenuOpen && (
          <div className="fixed inset-x-0 top-18 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-900 z-30 shadow-lg p-6 flex flex-col gap-6 animate-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-4 text-sm font-bold text-slate-600 dark:text-slate-300">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2">{t.navHome}</Link>
              <Link href="/mock-tests" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2">{t.navTestSeries}</Link>
              <Link href="/updates" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2 font-black text-blue-600">{t.navUpdates}</Link>
              {currentUser && ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role) && (
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2">{t.navAdmin}</Link>
              )}
            </nav>

            <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-900 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">{t.langSelect}:</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Theme:</span>
                <button
                  onClick={toggleTheme}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center gap-1.5"
                >
                  {theme === 'light' ? <><Moon className="h-3.5 w-3.5" /> Dark</> : <><Sun className="h-3.5 w-3.5" /> Light</>}
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 space-y-4">

          {/* TOP FULL-WIDTH STRETCH SEARCH BAR (MOBILE) */}
          <div className="w-full">
            <div className="relative flex items-center w-full bg-white dark:bg-slate-900 border-2 border-blue-500/20 dark:border-slate-800 focus-within:border-blue-600 dark:focus-within:border-blue-500 rounded-2xl p-2.5 shadow-md shadow-blue-500/5 transition-all duration-200 group">
              <div className="pl-2 pr-1 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors shrink-0">
                <Search className="h-4.5 w-4.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'hi'
                    ? 'सभी नौकरियों, रिजल्ट, एडमिट कार्ड और आंसर की में खोजें...'
                    : 'Search in all Jobs, Results, Admit Cards & Answer Keys...'
                }
                className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none px-1"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* MOBILE TABS FILTER */}
          <div className="flex bg-slate-200/70 dark:bg-slate-900 p-1 rounded-2xl shrink-0 gap-1 border border-slate-300/50 dark:border-slate-800">
            <button
              onClick={() => handleTabClick('notice')}
              className={`flex-1 py-2 text-center rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition ${
                activeMobileTab === 'notice' 
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Notices
            </button>
            <button
              onClick={() => handleTabClick('result')}
              className={`flex-1 py-2 text-center rounded-lg font-extrabold text-[10px] uppercase tracking-wider transition ${
                activeMobileTab === 'result' 
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Results
            </button>
            <button
              onClick={() => handleTabClick('admit_card')}
              className={`flex-1 py-2 text-center rounded-lg font-extrabold text-[10px] uppercase tracking-wider transition ${
                activeMobileTab === 'admit_card' 
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Admit Cards
            </button>
            <button
              onClick={() => handleTabClick('answer_key')}
              className={`flex-1 py-2 text-center rounded-lg font-extrabold text-[10px] uppercase tracking-wider transition ${
                activeMobileTab === 'answer_key' 
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Answer Keys
            </button>
          </div>

          {/* RENDER SELECTED MOBILE LIST IN RESULTNOTIFY CARD STYLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                {activeMobileTab === 'notice' && <><Bell className="h-4.5 w-4.5 text-blue-600" /> {t.liveNotices}</>}
                {activeMobileTab === 'result' && <><Trophy className="h-4.5 w-4.5 text-amber-500" /> {t.resultsMerits}</>}
                {activeMobileTab === 'admit_card' && <><FileText className="h-4.5 w-4.5 text-emerald-600" /> {t.admitCards}</>}
                {activeMobileTab === 'answer_key' && <><ShieldCheck className="h-4.5 w-4.5 text-purple-600" /> Answer Keys</>}
              </span>
            </h3>

            <div className="space-y-3 max-h-[550px] overflow-y-auto no-scrollbar">
              {displayNotices
                .filter(n => n.category === activeMobileTab)
                .filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim()))).length > 0 ? (
                [...displayNotices]
                  .filter(n => n.category === activeMobileTab)
                  .filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim())))
                  .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                  .map((notice, idx) => {
                    const themeMap: Record<string, 'blue' | 'amber' | 'emerald' | 'purple'> = {
                      notice: 'blue',
                      result: 'amber',
                      admit_card: 'emerald',
                      answer_key: 'purple',
                    };
                    return renderTileCard(notice, idx, themeMap[activeMobileTab]);
                  })
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  {t.noAlerts || 'No active alerts in this section.'}
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-6 px-4 text-center text-[10px] text-slate-500 font-bold">
          <p>© 2026 MockTest Hub. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  // DESKTOP LAYOUT (RESULTNOTIFY DESIGN)
  const matchingTotalCount = displayNotices.filter(n =>
    !searchQuery.trim() ||
    n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
    (n.category && n.category.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  ).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-200/90 dark:bg-slate-900 font-sans min-h-screen text-slate-800 dark:text-slate-100 overflow-x-hidden relative transition-colors duration-200">
      
      {/* Header matching Test Series Page */}
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
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-1.5 lg:p-2 rounded-full shadow-sm flex items-center justify-center h-8.5 w-8.5 lg:h-10 lg:w-10 border border-blue-200/50 dark:border-slate-700 shrink-0">
              <Trophy className="h-4.5 w-4.5 lg:h-5.5 lg:w-5.5 text-blue-600 dark:text-blue-400" />
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
            <Link href="/typing-test" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">
              <span>{language === 'hi' ? 'टाइपिंग टेस्ट' : 'Typing Test'}</span>
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

      {/* BODY CONTENT */}
      <main className="py-6 sm:py-8 px-3 sm:px-6 lg:px-8 xl:px-10 max-w-[1800px] w-full mx-auto flex-1 flex flex-col relative z-10 space-y-6">

        {/* IF CATEGORY FILTER IS ACTIVE -> DEDICATED SECTION PAGE FOR THAT PARTICULAR SECTION */}
        {categoryFilter && categoryMeta[categoryFilter] ? (
          <div className="space-y-4">
            {/* Category Page Compact Title Header (Above Search Bar) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl shrink-0 ${categoryMeta[categoryFilter].badgeBg}`}>
                  {React.createElement(categoryMeta[categoryFilter].icon, { className: "h-5 w-5" })}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                      {categoryMeta[categoryFilter].title}
                    </h2>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${categoryMeta[categoryFilter].badgeBg}`}>
                      {categoryFilter.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                    {categoryMeta[categoryFilter].desc}
                  </p>
                </div>
              </div>

              {/* Back to All Sections Button */}
              <button
                onClick={clearCategorySection}
                className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0 active:scale-95"
                title={language === 'hi' ? 'सभी अनुभागों पर वापस जाएं' : 'Back to All Sections'}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{language === 'hi' ? 'सभी अनुभाग' : 'All Sections'}</span>
                <span className="sm:hidden">{language === 'hi' ? 'वापस' : 'Back'}</span>
              </button>
            </div>

            {/* Search Bar Under Category Header */}
            <div className="w-full">
              <div className="relative flex items-center w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus-within:border-blue-600 dark:focus-within:border-blue-500 rounded-2xl p-2.5 sm:p-3 shadow-2xs transition-all group">
                <div className="pl-2 sm:pl-3 pr-2 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors shrink-0">
                  <Search className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'hi'
                      ? `इस अनुभाग (${categoryMeta[categoryFilter].title}) में खोजें...`
                      : `Search in ${categoryMeta[categoryFilter].title}...`
                  }
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none px-2"
                />
                {searchQuery && (
                  <div className="flex items-center gap-2 pr-1 shrink-0">
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition cursor-pointer active:scale-95"
                      title="Clear Search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Category Items List Format (Single Column Vertical List) */}
            <div className="flex flex-col gap-3.5 w-full p-2.5 -m-2.5">
              {displayNotices
                .filter(n => n.category === categoryFilter)
                .filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim())))
                .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                .map((notice, idx) => renderTileCard(notice, idx, categoryMeta[categoryFilter].color as any))}
            </div>

            {displayNotices.filter(n => n.category === categoryFilter).filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim()))).length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-semibold">
                {language === 'hi' ? 'कोई परिणाम नहीं मिला।' : 'No matching notifications found in this section.'}
              </div>
            )}
          </div>
        ) : (
          /* STANDARD ALL-SECTIONS VIEW */
          <>
            {/* TOP FULL-WIDTH STRETCH SEARCH BAR (DESKTOP) */}
            <div className="w-full">
              <div className="relative flex items-center w-full bg-white dark:bg-slate-900 border-2 border-blue-500/25 dark:border-slate-800 focus-within:border-blue-600 dark:focus-within:border-blue-500 rounded-2xl md:rounded-3xl p-2.5 sm:p-3.5 shadow-md shadow-blue-500/5 transition-all duration-200 group">
                <div className="pl-2 sm:pl-3 pr-2 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors shrink-0">
                  <Search className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'hi'
                      ? 'सभी नौकरियों, रिजल्ट, एडमिट कार्ड और आंसर की में खोजें...'
                      : 'Search across all Jobs, Results, Admit Cards & Answer Keys...'
                  }
                  className="w-full bg-transparent text-sm sm:text-base font-extrabold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none px-2 tracking-wide"
                />
                {searchQuery && (
                  <div className="flex items-center gap-2 pr-1 shrink-0">
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition cursor-pointer active:scale-95"
                      title="Clear Search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* TOP QUICK FEATURE CARDS (RESULTNOTIFY TOP QUICK BAR) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-4.5 w-full">
              
              {/* Quick Card 1: Latest Notices */}
              <div 
                onClick={() => openCategorySection('notice')}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-3 group hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-[0_10px_20px_-4px_rgba(59,130,246,0.15)] dark:hover:shadow-[0_10px_20px_-4px_rgba(59,130,246,0.3)] transition-all duration-300 transform-gpu hover:-translate-y-1.5 hover:scale-[1.015] active:translate-y-0 active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/50 shrink-0 transition-transform duration-300 group-hover:scale-110">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{t.liveNotices}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Job notices & forms</p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition flex items-center justify-center shrink-0">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Quick Card 2: Results & Merits */}
              <div 
                onClick={() => openCategorySection('result')}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-3 group hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-[0_10px_20px_-4px_rgba(245,158,11,0.15)] dark:hover:shadow-[0_10px_20px_-4px_rgba(245,158,11,0.3)] transition-all duration-300 transform-gpu hover:-translate-y-1.5 hover:scale-[1.015] active:translate-y-0 active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50 shrink-0 transition-transform duration-300 group-hover:scale-110">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{t.resultsMerits}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Merit lists & scores</p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition flex items-center justify-center shrink-0">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Quick Card 3: Admit Cards */}
              <div 
                onClick={() => openCategorySection('admit_card')}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-3 group hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-[0_10px_20px_-4px_rgba(168,85,247,0.15)] dark:hover:shadow-[0_10px_20px_-4px_rgba(16,185,129,0.3)] transition-all duration-300 transform-gpu hover:-translate-y-1.5 hover:scale-[1.015] active:translate-y-0 active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50 shrink-0 transition-transform duration-300 group-hover:scale-110">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{t.admitCards}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Hall tickets & dates</p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition flex items-center justify-center shrink-0">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Quick Card 4: Answer Keys */}
              <div 
                onClick={() => openCategorySection('answer_key')}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-3 group hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-[0_10px_20px_-4px_rgba(168,85,247,0.15)] dark:hover:shadow-[0_10px_20px_-4px_rgba(168,85,247,0.3)] transition-all duration-300 transform-gpu hover:-translate-y-1.5 hover:scale-[1.015] active:translate-y-0 active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/50 dark:border-purple-800/50 shrink-0 transition-transform duration-300 group-hover:scale-110">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Answer Keys</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Provisional & final</p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition flex items-center justify-center shrink-0">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>

            </div>

            {/* 4-COLUMN UPDATES GRID (MAXIMUM WIDTH TILE CONTAINERS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-4.5 w-full">
              
              {/* Column 1: Latest Notices (Blue Theme) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-xs flex flex-col min-h-[600px] relative w-full">
                <div className="px-1 pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-black text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Bell className="h-4 w-4" /> {t.liveNotices}
                  </span>
                </div>
                {/* List Starts Directly */}
                <div className="space-y-3 overflow-y-auto flex-1 max-h-[850px] no-scrollbar w-full">
                  {displayNotices.filter(n => n.category === 'notice').filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim()))).length > 0 ? (
                    [...displayNotices]
                      .filter(n => n.category === 'notice')
                      .filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim())))
                      .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                      .map((notice, idx) => renderTileCard(notice, idx, 'blue'))
                  ) : (
                    <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                      {language === 'hi' ? 'कोई परिणाम नहीं।' : 'No matching notices.'}
                    </div>
                  )}
                </div>

                {/* Bottom View All Button */}
                <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800/80">
                  <button 
                    onClick={() => openCategorySection('notice')}
                    className="w-full py-2.5 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:shadow-sm"
                  >
                    <span>View All {t.liveNotices}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Column 2: Results & Merits (Amber Theme) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-xs flex flex-col min-h-[600px] relative w-full">
                <div className="px-1 pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Trophy className="h-4 w-4" /> {t.resultsMerits}
                  </span>
                </div>
                {/* List Starts Directly */}
                <div className="space-y-3 overflow-y-auto flex-1 max-h-[850px] no-scrollbar w-full">
                  {displayNotices.filter(n => n.category === 'result').filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim()))).length > 0 ? (
                    [...displayNotices]
                      .filter(n => n.category === 'result')
                      .filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim())))
                      .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                      .map((notice, idx) => renderTileCard(notice, idx, 'amber'))
                  ) : (
                    <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                      {language === 'hi' ? 'कोई परिणाम नहीं।' : 'No matching results.'}
                    </div>
                  )}
                </div>

                {/* Bottom View All Button */}
                <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800/80">
                  <button 
                    onClick={() => openCategorySection('result')}
                    className="w-full py-2.5 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:shadow-sm"
                  >
                    <span>View All {t.resultsMerits}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Column 3: Admit Cards (Emerald Theme) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-xs flex flex-col min-h-[600px] relative w-full">
                <div className="px-1 pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-black text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> {t.admitCards}
                  </span>
                </div>
                {/* List Starts Directly */}
                <div className="space-y-3 overflow-y-auto flex-1 max-h-[850px] no-scrollbar w-full">
                  {displayNotices.filter(n => n.category === 'admit_card').filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim()))).length > 0 ? (
                    [...displayNotices]
                      .filter(n => n.category === 'admit_card')
                      .filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim())))
                      .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                      .map((notice, idx) => renderTileCard(notice, idx, 'emerald'))
                  ) : (
                    <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                      {language === 'hi' ? 'कोई परिणाम नहीं।' : 'No matching admit cards.'}
                    </div>
                  )}
                </div>

                {/* Bottom View All Button */}
                <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800/80">
                  <button 
                    onClick={() => openCategorySection('admit_card')}
                    className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:shadow-sm"
                  >
                    <span>View All {t.admitCards}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Column 4: Answer Keys (Purple Theme) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-xs flex flex-col min-h-[600px] relative w-full">
                <div className="px-1 pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-black text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> Answer Keys
                  </span>
                </div>
                {/* List Starts Directly */}
                <div className="space-y-3 overflow-y-auto flex-1 max-h-[850px] no-scrollbar w-full">
                  {displayNotices.filter(n => n.category === 'answer_key').filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim()))).length > 0 ? (
                    [...displayNotices]
                      .filter(n => n.category === 'answer_key')
                      .filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase().trim())))
                      .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                      .map((notice, idx) => renderTileCard(notice, idx, 'purple'))
                  ) : (
                    <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                      {language === 'hi' ? 'कोई परिणाम नहीं।' : 'No matching answer keys.'}
                    </div>
                  )}
                </div>

                {/* Bottom View All Button */}
                <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800/80">
                  <button 
                    onClick={() => openCategorySection('answer_key')}
                    className="w-full py-2.5 px-4 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/70 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:shadow-sm"
                  >
                    <span>View All Answer Keys</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-10 px-6 md:px-12 mt-auto text-center text-xs text-slate-500 dark:text-slate-500 transition-colors duration-200 font-bold">
        <p>© 2026 MockTest Hub. {language === 'hi' ? 'सर्वाधिकार सुरक्षित।' : 'All rights reserved.'}</p>
        <p className="mt-1 font-semibold text-slate-400">{language === 'hi' ? 'वास्तविक सरकारी चयन कंप्यूटर आधारित परीक्षाओं का अनुकरण करने के लिए विकसित।' : 'Developed to simulate real-world government selection computer based assessments.'}</p>
      </footer>

    </div>
  );
}
