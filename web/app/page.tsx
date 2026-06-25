"use client";

import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import Link from 'next/link';
import { ShieldCheck, GraduationCap, ChevronRight, Award, Trophy, Users, CheckCircle, Search, Info, Calendar, Bell, HelpCircle, UserCheck, Sun, Moon, FileText, X } from 'lucide-react';
import { TRANSLATIONS } from './translations';

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

  const activeTopper = SUCCESS_STORIES[successIndex];

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
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/25">
              <ShieldCheck className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm leading-tight text-slate-900 dark:text-white tracking-wider">{t.logoTitle}</h1>
              <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase">{t.logoSub}</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navTestSeries}</Link>
            <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navUpdates}</Link>
            <Link href="/profile" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navProfile}</Link>
            <Link href="/admin" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navAdmin}</Link>
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

          {/* Counter Badges */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-900 max-w-md">
            <div>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest">{t.activeUsers}</p>
              <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">5.1 Cr+</h4>
            </div>
            <div>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest">{t.mockAttempts}</p>
              <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">12 Cr+</h4>
            </div>
            <div>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest">{t.selections}</p>
              <h4 className="text-lg font-black text-green-600 dark:text-green-400 mt-1">8.4 Lakh+</h4>
            </div>
          </div>
        </div>

        {/* Right Side: Showcase Board */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-between min-h-[300px]">
          
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-yellow-500" /> {t.topperTitle}
            </h3>
            <div className="flex gap-1">
              {SUCCESS_STORIES.map((_, idx) => (
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
              <div className={`h-10 w-10 rounded-full bg-gradient-to-r ${activeTopper.gradient} text-white flex items-center justify-center font-black text-xs shadow-lg`}>
                {activeTopper.initials}
              </div>
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
                  noticesList.filter(n => n.category === 'notice').map(notice => (
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
                  noticesList.filter(n => n.category === 'result').map(notice => (
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
                  noticesList.filter(n => n.category === 'admit_card').map(notice => (
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
