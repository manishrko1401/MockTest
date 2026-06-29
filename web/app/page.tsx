"use client";

import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import Link from 'next/link';
import { ShieldCheck, GraduationCap, ChevronRight, Award, Trophy, Users, CheckCircle, Search, Info, Calendar, Bell, HelpCircle, UserCheck, Sun, Moon, FileText, X, Menu, LogOut, LayoutDashboard } from 'lucide-react';
import { TRANSLATIONS } from './translations';
import { useIsMobile } from './useIsMobile';

const EXAMS_BY_CATEGORY: Record<string, { id: string; name: string }[]> = {
  ssc: [
    { id: 'ssc_cgl_tier1', name: 'SSC CGL 2026 - Combined Graduate Level (Tier-I) Exam' },
    { id: 'ssc_chsl_tier1', name: 'SSC CHSL 2026 - Combined Higher Secondary Level Test' },
    { id: 'ssc_mts_mock', name: 'SSC MTS Full-Length Practice Test Paper' }
  ],
  railways: [
    { id: 'rrb_ntpc_stage1', name: 'RRB NTPC CBT-1 Stage 1 Practice Simulator' },
    { id: 'rrb_group_d', name: 'RRB Group D Full Length Mock Test' }
  ],
  ugc_net: [
    { id: 'ugc_net_paper1', name: 'UGC NET Paper-1 Teaching & Research Aptitude' },
    { id: 'ugc_net_cs', name: 'UGC NET Computer Science & Applications Paper-II' }
  ],
  teaching: [
    { id: 'ctet_paper1', name: 'CTET 2026 Paper-I (Primary Class I-V) Mock Paper' },
    { id: 'ctet_paper2', name: 'CTET 2026 Paper-II (Mathematics & Science)' }
  ],
  state_exams: [
    { id: 'up_psc_prelims', name: 'UPPSC Prelims General Studies (GS Paper 1)' },
    { id: 'bihar_ssc', name: 'BSSC Inter-Level Full Practice Mock Paper' }
  ],
  banking: [
    { id: 'sbi_po_prelims', name: 'SBI PO Preliminary Exam Full Length Mock Test' },
    { id: 'ibps_clerk', name: 'IBPS Clerk Preliminary Practice Mock Paper' }
  ]
};

const CATEGORIES = [
  { id: 'ssc', name: 'SSC Exams', desc: 'SSC CGL, CHSL, MTS, GD Constable', count: '45+ Tests' },
  { id: 'railways', name: 'Railways Exams', desc: 'RRB NTPC, Group D, ALP', count: '30+ Tests' },
  { id: 'ugc_net', name: 'UGC NET Exams', desc: 'Paper 1 & Paper 2 CS/Arts', count: '15+ Tests' },
  { id: 'teaching', name: 'Teaching Exams', desc: 'CTET Paper 1, Paper 2, State TET', count: '20+ Tests' },
  { id: 'state_exams', name: 'All State Exams', desc: 'UPPSC, BSSC, MPSC, RAS', count: '35+ Tests' },
  { id: 'banking', name: 'Banking Exams', desc: 'SBI PO, Clerk, IBPS PO, Clerk', count: '40+ Tests' }
];

const SUCCESS_STORIES = [
  {
    id: 's1',
    name: 'Aniket Verma',
    exam: 'SSC CGL 2025 (Selected: Excise Inspector)',
    initials: 'AV',
    gradient: 'from-blue-600 to-cyan-500',
    quote: "Testbook Pass Pro was absolute key for my prep. The custom state machine of the test simulator exactly models the live CBT screen. I gave 50 sittings and cleared CGL easily!"
  },
  {
    id: 's2',
    name: 'Surbhi Mishra',
    exam: 'SBI PO 2025 (Selected: Probationary Officer)',
    initials: 'SM',
    gradient: 'from-purple-600 to-pink-500',
    quote: "Sectional Speed analytics inside the profile screen showed me exactly where I was spending too much time (Quantitative Aptitude). Resetting attempts let me re-verify my weak topics."
  },
  {
    id: 's3',
    name: 'Karan Mehra',
    exam: 'UGC NET 2025 (Selected: Assistant Professor)',
    initials: 'KM',
    gradient: 'from-orange-600 to-amber-500',
    quote: "Paper-1 was a massive hurdle for me. Giving mock tests on a platform that simulates the actual bilingual pattern (English & Hindi) of UGC NET gave me immense confidence on exam day."
  }
];

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

export default function HomeLandingPage() {
  const { currentUser, logout, theme, toggleTheme, noticesList, language, setLanguage } = useAuth();
  const t = TRANSLATIONS[language];
  
  const [successIndex, setSuccessIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModalCategory, setSelectedModalCategory] = useState<string | null>(null);
  
  const [calculatorQuestions, setCalculatorQuestions] = useState<number>(100);
  const [calculatorCorrect, setCalculatorCorrect] = useState<number>(75);
  const [calculatorIncorrect, setCalculatorIncorrect] = useState<number>(12);
  const [calculatorPosMark, setCalculatorPosMark] = useState<number>(2);
  const [calculatorNegMark, setCalculatorNegMark] = useState<number>(0.5);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const dbTestimonials = (noticesList || [])
    .filter(n => n.category === 'testimonial')
    .map(n => ({
      id: n.id,
      name: n.title,
      exam: n.date,
      initials: n.lastDate || n.title.slice(0, 2).toUpperCase(),
      quote: n.type,
      gradient: n.url || 'from-blue-600 to-cyan-500',
      photoUrl: n.imageUrl
    }));

  const testimonials: any[] = dbTestimonials.length > 0 ? dbTestimonials : SUCCESS_STORIES;

  // Auto-slide testimonials every 10 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      setSuccessIndex((prev) => (prev + 1) % testimonials.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const { isMobile, isMounted } = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileUpdateTab, setMobileUpdateTab] = useState<'notice' | 'result' | 'admit_card'>('notice');

  const activeTopper = testimonials[successIndex] || testimonials[0] || SUCCESS_STORIES[0];

  if (isMounted && isMobile) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 overflow-x-hidden relative transition-colors duration-200">
        {/* Mobile Orbs */}
        <div className="absolute top-10 -left-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-[50%] -right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <header className="h-14 border-b border-slate-200 dark:border-slate-900 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between shadow-sm">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" className="h-8 w-8 object-contain" alt="Logo" />
            <div>
              <h1 className="font-extrabold text-xs leading-none text-slate-900 dark:text-white tracking-wider">{t.logoTitle}</h1>
              <p className="text-[7px] text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase mt-0.5">{t.logoSub}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-800 active:scale-95"
            >
              {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </header>

        {/* Live Notices & Announcements Marquee */}
        {noticesList && noticesList.length > 0 && (
          <div className="bg-blue-600/90 dark:bg-blue-950/80 text-white text-[10px] py-2 px-4 flex items-center gap-2 border-b border-blue-500/20 z-20 shrink-0 font-bold">
            <span className="bg-red-500 text-[8px] text-white px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse shrink-0">
              {language === 'hi' ? 'लाइव अपडेट' : 'Live Updates'}
            </span>
            {React.createElement(
              'marquee',
              {
                behavior: 'scroll',
                direction: 'left',
                scrollamount: '3.5',
                className: 'cursor-pointer flex-1',
                onMouseOver: (e: any) => e.currentTarget.stop(),
                onMouseOut: (e: any) => e.currentTarget.start(),
              },
              noticesList.map((notice) => (
                <span key={notice.id} className="mx-4 hover:underline">
                  <Link href="/updates">
                    {notice.title} ({notice.date})
                  </Link>
                  <span className="ml-4 text-blue-300">|</span>
                </span>
              ))
            )}
          </div>
        )}

        {/* MOBILE SLIDE-DOWN DRAWER MENU */}
        {mobileMenuOpen && (
          <div className="fixed inset-x-0 top-14 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-205 dark:border-slate-900 z-30 shadow-lg p-6 flex flex-col gap-6 animate-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-4 text-sm font-bold text-slate-655 dark:text-slate-300">
              <Link href="/mock-tests" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2">{t.navTestSeries}</Link>
              <Link href="/updates" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2">{t.navUpdates}</Link>
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2">{t.navProfile}</Link>
              {currentUser?.role === 'ADMIN' && (
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2">{t.navAdmin}</Link>
              )}
            </nav>

            <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-900 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-505">{t.langSelect}:</span>
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

            <div className="border-t border-slate-100 dark:border-slate-900 pt-4 flex flex-col gap-2">
              {currentUser ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      {currentUser.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{currentUser.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{currentUser.candidateCode}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 rounded-xl border border-red-200 text-red-650 dark:border-red-900/40 dark:text-red-400 font-bold text-xs hover:bg-red-50 text-center flex items-center justify-center gap-1"
                  >
                    <LogOut className="h-3.5 w-3.5" /> {t.signOut}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-300 font-bold text-xs text-center"
                  >
                    {t.logIn}
                  </Link>
                  <Link
                    href="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs text-center shadow"
                  >
                    {t.signUp}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HERO SECTION */}
        <main className="flex-1 flex flex-col p-4 space-y-8 relative z-10">
          <section className="text-center pt-8 pb-4 space-y-4">
            <span className="inline-flex items-center gap-1 bg-blue-105 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 font-black px-3 py-1 rounded-full text-[9px] uppercase tracking-wider">
              {t.heroBadge}
            </span>

            <h1 className="text-3xl font-black leading-tight text-slate-900 dark:text-white">
              {t.heroTitlePrefix}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">
                {t.heroTitleSuffix}
              </span>
            </h1>

            <p className="text-slate-655 dark:text-slate-400 text-xs leading-relaxed max-w-sm mx-auto font-semibold">
              {t.heroDesc}
            </p>

            {/* Quick search exam */}
            <div className="relative max-w-md w-full mx-auto pt-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-2xl pl-10 pr-24 py-3 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 shadow-sm"
              />
              <Link
                href={`/mock-tests?q=${searchQuery}`}
                className="absolute right-1.5 top-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-xl text-[9px] transition active:scale-95 shadow"
              >
                {t.searchBtn.split(' ')[0]}
              </Link>
            </div>

          </section>

          {/* TOPPERS TESTIMONIAL PANEL */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between min-h-[220px]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <h3 className="font-extrabold text-[10px] text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-yellow-500" /> Topper Testimonials
              </h3>
              <div className="flex gap-1">
                {testimonials.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSuccessIndex(idx)}
                    className={`h-1.5 w-1.5 rounded-full transition-all ${successIndex === idx ? 'bg-blue-500 w-3' : 'bg-slate-300 dark:bg-slate-700'}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center min-h-[100px]">
              <p className="text-slate-700 dark:text-slate-300 italic text-[11px] leading-relaxed mb-4 font-medium">
                "{activeTopper.quote}"
              </p>
              
              <div className="flex items-center gap-2.5">
                {activeTopper.photoUrl ? (
                  <img src={activeTopper.photoUrl} alt={activeTopper.name} className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow" />
                ) : (
                  <div className={`h-8 w-8 rounded-full bg-gradient-to-r ${activeTopper.gradient} text-white flex items-center justify-center font-black text-[10px] shadow`}>
                    {activeTopper.initials}
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-[11px] text-slate-900 dark:text-white leading-none">{activeTopper.name}</h4>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1">{activeTopper.exam.split(' (')[0]}</p>
                </div>
              </div>
            </div>
          </section>

          {/* POPULAR CATEGORIES */}
          <section className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-900">
            <div className="text-center max-w-sm mx-auto">
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">{t.popularTitle}</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">{t.popularDesc}</p>
            </div>

            <div className="flex flex-col gap-4">
              {CATEGORIES.map(cat => (
                <button
                  onClick={() => setSelectedModalCategory(cat.id)}
                  key={cat.id}
                  className="bg-white dark:bg-slate-900/40 border border-slate-205 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between group text-left w-full shadow-sm"
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                        <GraduationCap className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-[9px] text-blue-600 dark:text-blue-400 font-black tracking-wider">
                        {cat.count}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-905 dark:text-white mb-1">{cat.name}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">{cat.desc}</p>
                  </div>
                  
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-[9px] uppercase tracking-wider mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 w-full">
                    {t.exploreTests} <ChevronRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* MOBILE TABS UPDATES SECTION */}
          <section className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-900">
            <div className="text-center max-w-sm mx-auto">
              <h2 className="text-lg font-black tracking-tight text-slate-905 dark:text-white uppercase">{t.liveUpdatesTitle}</h2>
              <p className="text-[10px] text-slate-505 dark:text-slate-400 mt-1 font-semibold">{t.liveUpdatesDesc}</p>
            </div>

            {/* TAB SELECTION BAR */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              <button
                onClick={() => setMobileUpdateTab('notice')}
                className={`flex-1 py-2 text-center rounded-lg font-bold text-[10px] uppercase tracking-wider transition ${
                  mobileUpdateTab === 'notice' 
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Notices
              </button>
              <button
                onClick={() => setMobileUpdateTab('result')}
                className={`flex-1 py-2 text-center rounded-lg font-bold text-[10px] uppercase tracking-wider transition ${
                  mobileUpdateTab === 'result' 
                    ? 'bg-white dark:bg-slate-800 text-yellow-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Results
              </button>
              <button
                onClick={() => setMobileUpdateTab('admit_card')}
                className={`flex-1 py-2 text-center rounded-lg font-bold text-[10px] uppercase tracking-wider transition ${
                  mobileUpdateTab === 'admit_card' 
                    ? 'bg-white dark:bg-slate-805 text-green-600 dark:text-white shadow-sm'
                    : 'text-slate-505 hover:text-slate-700'
                }`}
              >
                Admit Cards
              </button>
            </div>

            {/* RENDER ACTIVE TAB */}
            <div className="bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm min-h-[300px] flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-[10px] text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  {mobileUpdateTab === 'notice' && <><Bell className="h-4 w-4 text-blue-600 animate-bounce" /> {t.liveNotices}</>}
                  {mobileUpdateTab === 'result' && <><Trophy className="h-4 w-4 text-yellow-500" /> {t.resultsMerits}</>}
                  {mobileUpdateTab === 'admit_card' && <><FileText className="h-4 w-4 text-green-550" /> {t.admitCards}</>}
                </h3>
                
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {noticesList.filter(n => n.category === mobileUpdateTab).length > 0 ? (
                    [...noticesList]
                      .filter(n => n.category === mobileUpdateTab)
                      .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                      .map(notice => (
                      <div
                        key={notice.id}
                        className="p-3 rounded-xl bg-slate-55 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded tracking-wide ${
                              mobileUpdateTab === 'notice' ? 'bg-blue-105 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                              mobileUpdateTab === 'result' ? 'bg-yellow-100 text-yellow-750 dark:bg-yellow-950/50 dark:text-yellow-400' :
                              'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                            }`}>
                              {notice.type}
                            </span>
                            {isNewlyPublished(notice.publishDate) && (
                              <span className="animate-pulse bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase">
                                {t.newBadge}
                              </span>
                            )}
                          </div>
                          <span className="text-[7px] text-slate-400 font-semibold">{notice.date}</span>
                        </div>
                        <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-normal">
                          {notice.url ? (
                            <a href={notice.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-0.5">
                              {notice.title}
                              <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                            </a>
                          ) : (
                            notice.title
                          )}
                        </h5>
                        {notice.lastDate && (
                          <p className="text-[8px] text-red-500 font-extrabold mt-0.5 uppercase tracking-wider">
                            {t.lastDate} {notice.lastDate}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      {t.noAlerts || 'No active alerts in this section.'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Link href="/updates" className="text-[8px] uppercase font-black text-blue-600 dark:text-blue-450 hover:underline flex items-center gap-0.5">
                  {language === 'hi' ? 'सभी अपडेट देखें' : 'View All Alerts'} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </section>

          {/* CBT Security Banner */}
          <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col gap-4">
              <div>
                <h3 className="font-black text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Info className="h-4 w-4 text-blue-250" /> CBT Security
                </h3>
                <p className="text-[10px] text-blue-100 leading-relaxed font-semibold">
                  Strict browser focus tracking to simulate real exam environments.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 border-t border-white/10 pt-3">
                <div className="flex gap-2 items-start text-[10px]">
                  <CheckCircle className="h-3.5 w-3.5 text-blue-200 shrink-0 mt-0.5" />
                  <span><strong>Anti-Cheat Shield</strong>: Losses of focus auto-submit sittings.</span>
                </div>
                <div className="flex gap-2 items-start text-[10px]">
                  <CheckCircle className="h-3.5 w-3.5 text-blue-200 shrink-0 mt-0.5" />
                  <span><strong>Bilingual sittings</strong>: English & Hindi switch seamlessly.</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-6 px-4 text-center text-[10px] text-slate-500 transition-colors duration-200">
          <p className="font-bold">© 2026 Mock Test CBT Portal. All rights reserved.</p>
        </footer>

        {/* Categories modal logic remains exactly same, styled adaptively */}
        {selectedModalCategory && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0">
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-250 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <GraduationCap className="h-4.5 w-4.5 text-blue-600" />
                    {CATEGORIES.find(c => c.id === selectedModalCategory)?.name}
                  </h4>
                  <button
                    onClick={() => setSelectedModalCategory(null)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-[10px] text-slate-505 leading-normal mb-4 font-semibold">
                  Select an exam category option:
                </p>

                <div className="space-y-2.5">
                  {EXAMS_BY_CATEGORY[selectedModalCategory]?.map((exam) => (
                    <Link
                      key={exam.id}
                      href={`/mock-tests?cat=${selectedModalCategory}`}
                      onClick={() => setSelectedModalCategory(null)}
                      className="w-full flex items-center justify-between p-3.5 bg-slate-55 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-800 dark:text-slate-200"
                    >
                      <span className="flex-1 pr-2">{exam.name}</span>
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedModalCategory(null)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl text-xs font-bold mt-6"
              >
                Close View
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 overflow-x-hidden relative transition-colors duration-200">
      
      {/* Decorative Orbs */}
      <div className="absolute top-10 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-[60%] -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* HEADER SECTION */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-900 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 px-6 md:px-12 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" className="h-10 w-10 object-contain" alt="Logo" />
            <div>
              <h1 className="font-extrabold text-sm leading-tight text-slate-900 dark:text-white tracking-wider">{t.logoTitle}</h1>
              <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase">{t.logoSub}</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-505 dark:text-slate-400">
            <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navTestSeries}</Link>
            <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navUpdates}</Link>
            <Link href="/profile" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navProfile}</Link>
            {currentUser?.role === 'ADMIN' && (
              <Link href="/admin" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navAdmin}</Link>
            )}
          </nav>
        </div>

        {/* Auth Buttons / Profile Panel / Language Selector */}
        <div className="flex items-center gap-4">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-355 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
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

          {currentUser ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="flex items-center gap-2 bg-slate-100 border border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700 transition px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm text-slate-800 dark:text-slate-200">
                <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {currentUser.name[0]}
                </div>
                <span>{t.dashboard} ({currentUser.name.split(' ')[0]})</span>
              </Link>
              <button
                onClick={logout}
                className="hidden sm:block text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition text-xs font-bold cursor-pointer"
              >
                {t.signOut}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/auth" className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition text-xs font-bold">
                {t.logIn}
              </Link>
              <Link href="/auth" className="bg-blue-600 hover:bg-blue-750 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-lg shadow-blue-900/25 transition active:scale-95">
                {t.signUp}
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Live Notices & Announcements Marquee */}
      {noticesList && noticesList.length > 0 && (
        <div className="bg-blue-600/90 dark:bg-blue-950/80 text-white text-xs py-2 px-8 flex items-center gap-3 border-b border-blue-500/20 z-30 shrink-0 font-bold">
          <span className="bg-red-500 text-[9px] text-white px-2 py-0.5 rounded uppercase tracking-wider animate-pulse shrink-0">
            {language === 'hi' ? 'लाइव अपडेट' : 'Live Updates'}
          </span>
          {React.createElement(
            'marquee',
            {
              behavior: 'scroll',
              direction: 'left',
              scrollamount: '4',
              className: 'cursor-pointer flex-1',
              onMouseOver: (e: any) => e.currentTarget.stop(),
              onMouseOut: (e: any) => e.currentTarget.start(),
            },
            noticesList.map((notice) => (
              <span key={notice.id} className="mx-6 hover:underline">
                <Link href="/updates">
                  {notice.title} ({notice.date})
                </Link>
                <span className="ml-6 text-blue-300">|</span>
              </span>
            ))
          )}
        </div>
      )}

      {/* HERO SECTION */}
      <section className="py-16 md:py-24 px-6 md:px-12 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left Side: Pitch Title */}
        <div className="space-y-6">
          <span className="inline-flex items-center gap-1.5 text-[10px] bg-blue-100 border border-blue-300 dark:bg-blue-950 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            {t.heroBadge}
          </span>
          
          <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
            {t.heroTitlePrefix}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">{t.heroTitleSuffix}</span>
          </h1>
          
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed max-w-lg font-semibold">
            {t.heroDesc}
          </p>

          {/* Quick search exam */}
          <div className="relative max-w-md w-full pt-2">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-32 py-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 shadow-sm"
            />
            <Link
              href={`/mock-tests?q=${searchQuery}`}
              className="absolute right-2 top-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-xl text-[10px] transition active:scale-95 shadow-md cursor-pointer"
            >
              {t.searchBtn}
            </Link>
          </div>

        </div>

        {/* Right Side: Showcase Board */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-between min-h-[300px]">
          
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-yellow-500" /> {t.topperTitle}
            </h3>
            <div className="flex gap-1">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSuccessIndex(idx)}
                  className={`h-2 w-2 rounded-full transition-all cursor-pointer ${successIndex === idx ? 'bg-blue-500 w-4' : 'bg-slate-300 dark:bg-slate-700'}`}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-300">
            <p className="text-slate-700 dark:text-slate-300 italic text-xs md:text-sm leading-relaxed mb-6 font-semibold">
              "{activeTopper.quote}"
            </p>
            
            <div className="flex items-center gap-3">
              {activeTopper.photoUrl ? (
                <img src={activeTopper.photoUrl} alt={activeTopper.name} className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-lg" />
              ) : (
                <div className={`h-10 w-10 rounded-full bg-gradient-to-r ${activeTopper.gradient} text-white flex items-center justify-center font-black text-xs shadow-lg`}>
                  {activeTopper.initials}
                </div>
              )}
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{activeTopper.name}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">{activeTopper.exam}</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CATEGORIES SECTION */}
      <section className="py-16 px-6 md:px-12 max-w-6xl w-full mx-auto relative z-10 border-t border-slate-200 dark:border-slate-900">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">{t.popularTitle}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">{t.popularDesc}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map(cat => (
            <button
              onClick={() => setSelectedModalCategory(cat.id)}
              key={cat.id}
              className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-6 rounded-2xl flex flex-col justify-between group transition-all shadow-sm text-left w-full cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black tracking-wider group-hover:underline">
                    {cat.count}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{cat.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-semibold">{cat.desc}</p>
              </div>
              
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-wider mt-6 pt-4 border-t border-slate-200 dark:border-slate-880 w-full">
                {t.exploreTests} <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* PORTAL UPDATES BOARD */}
      <section className="py-16 px-6 md:px-12 max-w-6xl w-full mx-auto relative z-10 border-t border-slate-200 dark:border-slate-900 space-y-12">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">{t.liveUpdatesTitle}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">{t.liveUpdatesDesc}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tile 1: Live Notices & Announcements */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[646px]">
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-blue-600 animate-bounce" /> {t.liveNotices}
              </h3>
              
              <div className="space-y-3 overflow-y-auto max-h-[442px] pr-1 scrollbar-thin">
                {noticesList.filter(n => n.category === 'notice').length > 0 ? (
                  [...noticesList]
                    .filter(n => n.category === 'notice')
                    .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                    .map(notice => (
                    <div
                      key={notice.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-950/70 transition flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-900 text-blue-700 dark:text-blue-400 text-[8px] font-black px-2 py-0.5 rounded tracking-wider">
                            {notice.type}
                          </span>
                          {isNewlyPublished(notice.publishDate) && (
                            <span className="animate-pulse bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                              {t.newBadge}
                            </span>
                          )}
                        </div>
                        <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">{notice.date}</span>
                      </div>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-snug">
                        {notice.url ? (
                          <a href={notice.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex items-center gap-1">
                            {notice.title}
                            <ChevronRight className="h-3 w-3 inline shrink-0 animate-pulse text-blue-500" />
                          </a>
                        ) : (
                          notice.title
                        )}
                      </h5>
                      {notice.lastDate && (
                        <p className="text-[10px] text-red-505 font-extrabold mt-1 uppercase tracking-wider">
                          {t.lastDate} {notice.lastDate}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
                    {language === 'hi' ? 'फिलहाल कोई सक्रिय नोटिस नहीं है।' : 'No active notices at the moment.'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Link href="/updates" className="text-[9px] uppercase font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                {language === 'hi' ? 'सभी नोटिस देखें' : 'View All Notices'} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Tile 2: Live Result Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[646px]">
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                <Trophy className="h-4.5 w-4.5 text-yellow-500 animate-pulse" /> {t.resultsMerits}
              </h3>
              
              <div className="space-y-3 overflow-y-auto max-h-[442px] pr-1 scrollbar-thin">
                {noticesList.filter(n => n.category === 'result').length > 0 ? (
                  [...noticesList]
                    .filter(n => n.category === 'result')
                    .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                    .map(notice => (
                    <div
                      key={notice.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-950/70 transition flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block bg-yellow-100 dark:bg-yellow-950/50 border border-yellow-300 dark:border-yellow-900/50 text-yellow-700 dark:text-yellow-400 text-[8px] font-black px-2 py-0.5 rounded tracking-wider">
                            {notice.type}
                          </span>
                          {isNewlyPublished(notice.publishDate) && (
                            <span className="animate-pulse bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                              {t.newBadge}
                            </span>
                          )}
                        </div>
                        <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">{notice.date}</span>
                      </div>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-snug">
                        {notice.url ? (
                          <a href={notice.url} target="_blank" rel="noopener noreferrer" className="hover:text-yellow-600 dark:hover:text-yellow-400 hover:underline flex items-center gap-1">
                            {notice.title}
                            <ChevronRight className="h-3 w-3 inline shrink-0 animate-pulse text-yellow-500" />
                          </a>
                        ) : (
                          notice.title
                        )}
                      </h5>
                      {notice.lastDate && (
                        <p className="text-[10px] text-red-505 font-extrabold mt-1 uppercase tracking-wider">
                          {t.lastDate} {notice.lastDate}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
                    {language === 'hi' ? 'फिलहाल कोई सक्रिय परिणाम नहीं हैं।' : 'No active results at the moment.'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Link href="/updates" className="text-[9px] uppercase font-black text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1">
                {language === 'hi' ? 'सभी परिणाम देखें' : 'View All Results'} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Tile 3: Live Admit Card Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[646px]">
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-green-550" /> {t.admitCards}
              </h3>
              
              <div className="space-y-3 overflow-y-auto max-h-[442px] pr-1 scrollbar-thin">
                {noticesList.filter(n => n.category === 'admit_card').length > 0 ? (
                  [...noticesList]
                    .filter(n => n.category === 'admit_card')
                    .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                    .map(notice => (
                    <div
                      key={notice.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-950/70 transition flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block bg-green-100 dark:bg-green-950 border border-green-300 dark:border-green-900 text-green-700 dark:text-green-400 text-[8px] font-black px-2 py-0.5 rounded tracking-wider">
                            {notice.type}
                          </span>
                          {isNewlyPublished(notice.publishDate) && (
                            <span className="animate-pulse bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                              {t.newBadge}
                            </span>
                          )}
                        </div>
                        <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">{notice.date}</span>
                      </div>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-snug">
                        {notice.url ? (
                          <a href={notice.url} target="_blank" rel="noopener noreferrer" className="hover:text-green-600 dark:hover:text-green-400 hover:underline flex items-center gap-1">
                            {notice.title}
                            <ChevronRight className="h-3 w-3 inline shrink-0 animate-pulse text-green-550" />
                          </a>
                        ) : (
                          notice.title
                        )}
                      </h5>
                      {notice.lastDate && (
                        <p className="text-[10px] text-red-505 font-extrabold mt-1 uppercase tracking-wider">
                          {t.lastDate} {notice.lastDate}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
                    {language === 'hi' ? 'फिलहाल कोई सक्रिय एडमिट कार्ड नहीं हैं।' : 'No active admit cards at the moment.'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Link href="/updates" className="text-[9px] uppercase font-black text-green-600 dark:text-green-400 hover:underline flex items-center gap-1">
                {language === 'hi' ? 'सभी एडमिट कार्ड देखें' : 'View All Admit Cards'} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

        </div>

        {/* CBT Engine Security - Full Width Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 md:pr-8">
              <h3 className="font-black text-sm uppercase tracking-wider mb-3 flex items-center gap-2 text-white">
                <Info className="h-4.5 w-4.5 text-blue-200" /> CBT Engine Security
              </h3>
              <p className="text-xs text-blue-100 leading-relaxed font-semibold">
                Our simulated exam client enforces strict browser state tracking to align with live public service commission examinations.
              </p>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex gap-2.5 items-start">
                <CheckCircle className="h-4.5 w-4.5 text-blue-200 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold"><strong>Anti-Cheat Shield</strong>: Automatic test submission triggers when client browser loses tab focus.</span>
              </div>
              <div className="flex gap-2.5 items-start">
                <CheckCircle className="h-4.5 w-4.5 text-blue-200 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold"><strong>Bilingual CBT</strong>: Switch languages instantly inside mock sessions (English & Hindi formats).</span>
              </div>
              <div className="flex gap-2.5 items-start">
                <CheckCircle className="h-4.5 w-4.5 text-blue-200 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold"><strong>Detailed Solutions</strong>: Get immediate correctness feedback, time tracking, and conceptual answers.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 px-6 md:px-12 max-w-6xl w-full mx-auto relative z-10 border-t border-slate-200 dark:border-slate-900 space-y-12">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            {language === 'hi' ? 'सामान्यतः पूछे जाने वाले प्रश्न' : 'Frequently Asked Questions'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">
            {language === 'hi' ? 'हमारे प्लेटफ़ॉर्म के बारे में सामान्य प्रश्नों के उत्तर पाएं।' : 'Find quick answers about our testing client.'}
          </p>
        </div>

        <div className="max-w-2xl mx-auto w-full">
          {/* Dynamic FAQ Accordion */}
          <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-md space-y-6">
            <div className="space-y-3">
              {[
                {
                  q: language === 'hi' ? "मॉक टेस्ट सीबीटी परीक्षा में शामिल होने के लिए मैं पास कैसे प्राप्त करूं?" : "How do I unlock full access to CBT mock tests?",
                  a: language === 'hi' ? "आप अपने प्रोफाइल डैशबोर्ड में जाकर 'पास प्रो' सिम्युलेट करके असीमित अभ्यास परीक्षाओं को तुरंत अनलॉक कर सकते हैं।" : "You can unlock all practice tests by upgrading your subscription to 'Pass Pro' inside the My Profile settings tab."
                },
                {
                  q: language === 'hi' ? "क्या परीक्षा के दौरान टैब स्विच करने पर परीक्षा खुद सबमिट हो जाती है?" : "Does the portal auto-submit if I switch browser tabs?",
                  a: language === 'hi' ? "हाँ, सीबीटी परीक्षा स्क्रीन की सुरक्षा बनाए रखने के लिए, यदि आप परीक्षा सत्र के दौरान टैब बदलते हैं या विंडो ब्लर करते हैं, तो आपकी परीक्षा तुरंत स्वतः सबमिट हो जाएगी।" : "Yes, to align with real competitive exams, our engine has an anti-cheat shield that automatically submits your paper if you switch browser tabs."
                },
                {
                  q: language === 'hi' ? "क्या मैं दिए गए टेस्ट को दोबारा हल या रीअटेम्प्ट कर सकता हूँ?" : "Can I reattempt tests to improve my accuracy?",
                  a: language === 'hi' ? "हाँ! आप किसी भी टेस्ट को 5 बार तक रीअटेम्प्ट कर सकते हैं। रीअटेम्प्ट करने से पिछले प्रयास सुरक्षित रहेंगे और नया स्कोर विश्लेषण सिंक होगा।" : "Yes! Every mock test supports up to 5 attempts. Reattempting will archive your previous metrics while letting you re-solve questions."
                },
                {
                  q: language === 'hi' ? "क्या मॉक टेस्ट में हिंदी और अंग्रेजी दोनों भाषाओं में प्रश्न उपलब्ध हैं?" : "Are mock sittings available in both English and Hindi formats?",
                  a: language === 'hi' ? "बिल्कुल। हमारी परीक्षा प्रणाली पूर्ण रूप से द्विभाषी है। आप सीबीटी सत्र के दौरान प्रश्न स्तर पर तुरंत भाषा बदल सकते हैं।" : "Absolutely. The exam terminal is fully bilingual. You can switch any question between English and Hindi translations instantly during the session."
                }
              ].map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div key={idx} className="border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left py-2 font-extrabold text-xs text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <span className="text-slate-400 text-sm ml-2">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1.5 pb-2 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-12 px-6 md:px-12 mt-auto text-center text-xs text-slate-500 dark:text-slate-500 transition-colors duration-200">
        <p className="font-bold">© 2026 Mock Test CBT Mock Portal Simulator. All rights reserved.</p>
        <p className="mt-1">Developed to simulate real-world government selection computer based assessments.</p>
      </footer>

      {/* Category Exams Popup Modal */}
      {selectedModalCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                  {CATEGORIES.find(c => c.id === selectedModalCategory)?.name} Options
                </h4>
                <button
                  onClick={() => setSelectedModalCategory(null)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-semibold">
                Select an exam category option to redirect to its dedicated mock sittings and full solutions:
              </p>

              <div className="space-y-3">
                {EXAMS_BY_CATEGORY[selectedModalCategory]?.map((exam) => (
                  <Link
                    key={exam.id}
                    href={`/mock-tests?cat=${selectedModalCategory}`}
                    onClick={() => setSelectedModalCategory(null)}
                    className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-900/60 rounded-xl transition group text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <span>{exam.name}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition group-hover:text-blue-600" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
              <button
                onClick={() => setSelectedModalCategory(null)}
                className="bg-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
