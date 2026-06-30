"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { ShieldCheck, ChevronRight, Bell, Trophy, FileText, ArrowLeft, Sun, Moon, Menu, LogOut, LayoutDashboard, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activeMobileTab, setActiveMobileTab] = React.useState<'notice' | 'result' | 'admit_card' | 'answer_key'>('notice');

  if (isMounted && isMobile) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 overflow-x-hidden relative transition-colors duration-200">
        
        {/* Mobile Orbs */}
        <div className="absolute top-10 -left-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-[50%] -right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <header className="h-14 border-b border-slate-200 dark:border-slate-900 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between shadow-sm">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-1.5 rounded-full shadow-sm flex items-center justify-center h-8 w-8 border border-blue-200/50 dark:border-slate-700 shrink-0">
              <Trophy className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-xs leading-none text-slate-900 dark:text-white tracking-wider">{t.logoTitle}</h1>
              <p className="text-[7px] text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase mt-0.5">{t.logoSub}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-905 text-slate-600 dark:text-slate-355 border border-slate-200 dark:border-slate-800 active:scale-95"
            >
              {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </header>

        {/* MOBILE SLIDE-DOWN DRAWER MENU */}
        {mobileMenuOpen && (
          <div className="fixed inset-x-0 top-14 bg-white/95 dark:bg-slate-955/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-900 z-30 shadow-lg p-6 flex flex-col gap-6 animate-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-4 text-sm font-bold text-slate-655 dark:text-slate-300">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2">{t.navHome}</Link>
              <Link href="/mock-tests" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2">{t.navTestSeries}</Link>
              <Link href="/updates" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2 font-black text-blue-600">{t.navUpdates}</Link>
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2">{t.navProfile}</Link>
              {currentUser?.role === 'ADMIN' && (
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2">{t.navAdmin}</Link>
              )}
            </nav>

            <div className="flex flex-col gap-4 border-t border-slate-105 dark:border-slate-900 pt-4">
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
                    className="w-full py-2.5 rounded-xl border border-red-200 text-red-655 dark:border-red-900/40 dark:text-red-400 font-bold text-xs hover:bg-red-50 text-center flex items-center justify-center gap-1"
                  >
                    <LogOut className="h-3.5 w-3.5" /> {t.signOut}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs text-center"
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

        <main className="flex-1 p-4 space-y-6">
          {/* INTRO TITLE */}
          <section className="text-center py-6 space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-905 dark:text-white uppercase">
              {t.updatesTitle}
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
              {t.updatesDesc}
            </p>
          </section>

          {/* MOBILE TABS FILTER */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveMobileTab('notice')}
              className={`flex-1 py-2 text-center rounded-lg font-bold text-[10px] uppercase tracking-wider transition ${
                activeMobileTab === 'notice' 
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-505 hover:text-slate-700'
              }`}
            >
              Notices
            </button>
            <button
              onClick={() => setActiveMobileTab('result')}
              className={`flex-1 py-2 text-center rounded-lg font-bold text-[10px] uppercase tracking-wider transition ${
                activeMobileTab === 'result' 
                  ? 'bg-white dark:bg-slate-800 text-yellow-600 dark:text-white shadow-sm'
                  : 'text-slate-505 hover:text-slate-700'
              }`}
            >
              Results
            </button>
            <button
              onClick={() => setActiveMobileTab('admit_card')}
              className={`flex-1 py-2 text-center rounded-lg font-bold text-[10px] uppercase tracking-wider transition ${
                activeMobileTab === 'admit_card' 
                  ? 'bg-white dark:bg-slate-800 text-green-600 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Admit Cards
            </button>
            <button
              onClick={() => setActiveMobileTab('answer_key')}
              className={`flex-1 py-2 text-center rounded-lg font-bold text-[10px] uppercase tracking-wider transition ${
                activeMobileTab === 'answer_key' 
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Answer Keys
            </button>
          </div>
                  {/* RENDER SELECTED LIST */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-[10px] text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5 px-2">
              {activeMobileTab === 'notice' && <><Bell className="h-4.5 w-4.5 text-blue-600 animate-bounce" /> {t.liveNotices}</>}
              {activeMobileTab === 'result' && <><Trophy className="h-4.5 w-4.5 text-yellow-500" /> {t.resultsMerits}</>}
              {activeMobileTab === 'admit_card' && <><FileText className="h-4.5 w-4.5 text-green-555" /> {t.admitCards}</>}
              {activeMobileTab === 'answer_key' && <><ShieldCheck className="h-4.5 w-4.5 text-purple-500" /> Answer Keys</>}
            </h3>

            <div className="space-y-3.5 max-h-[500px] overflow-y-auto no-scrollbar">
              {noticesList.filter(n => n.category === activeMobileTab).length > 0 ? (
                [...noticesList]
                  .filter(n => n.category === activeMobileTab)
                  .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                  .map((notice) => (
                  <div
                    key={notice.id}
                    className="w-[98%] mx-auto p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase ${
                          activeMobileTab === 'notice' ? 'bg-blue-105 text-blue-700 dark:bg-blue-955 dark:text-blue-400' :
                          activeMobileTab === 'result' ? 'bg-yellow-105 text-yellow-750 dark:bg-yellow-955/50 dark:text-yellow-400' :
                          activeMobileTab === 'admit_card' ? 'bg-green-100 text-green-700 dark:bg-green-955 dark:text-green-400' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400'
                        }`}>
                          {notice.type}
                        </span>
                        {isNewlyPublished(notice.publishDate) && (
                          <span className="animate-pulse bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase">
                            {t.newBadge}
                          </span>
                        )}
                      </div>
                      <span className="text-[7px] text-slate-400 font-bold">{notice.date}</span>
                    </div>

                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-normal">
                      {notice.url ? (
                        <a href={notice.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-0.5">
                          {notice.title}
                          <ChevronRight className="h-3 w-3 inline shrink-0 text-slate-400" />
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
        </main>

        {/* FOOTER */}
        <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-6 px-4 text-center text-[10px] text-slate-500 transition-colors duration-200">
          <p className="font-bold">© 2026 Mock Test CBT Portal. All rights reserved.</p>
        </footer>
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
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-2 rounded-full shadow-sm flex items-center justify-center h-10 w-10 border border-blue-200/50 dark:border-slate-700 shrink-0">
              <Trophy className="h-5.5 w-5.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm leading-tight text-slate-900 dark:text-white tracking-wider">{t.logoTitle}</h1>
              <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase">{t.logoSub}</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-505 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navHome}</Link>
            <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navTestSeries}</Link>
            <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navUpdates}</Link>
            <Link href="/profile" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navProfile}</Link>
            {currentUser?.role === 'ADMIN' && (
              <Link href="/admin" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navAdmin}</Link>
            )}
          </nav>
        </div>

        {/* Auth Buttons / Profile Panel */}
        <div className="flex items-center gap-4">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
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

      {/* BODY CONTENT */}
      <main className="py-12 px-6 md:px-12 max-w-6xl w-full mx-auto flex-1 flex flex-col relative z-10 space-y-8">
        
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-900 pb-6">
          <div>
            <span className="text-[10px] bg-blue-100 border border-blue-200 dark:bg-blue-950 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
              {language === 'hi' ? '📢 लाइव सूचना केंद्र' : '📢 Realtime Advisory Hub'}
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-3 uppercase">
              {t.updatesTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              {t.updatesDesc}
            </p>
          </div>
          
          <Link
            href="/"
            className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm text-slate-700 dark:text-slate-200 self-start sm:self-center"
          >
            <ArrowLeft className="h-4 w-4" /> {t.backToHome}
          </Link>
        </div>

        {/* 4-Column Updates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Column 1: Notices & Announcements */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-6 px-1.5 rounded-3xl shadow-sm flex flex-col lg:min-h-[600px] min-h-0">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 px-3">
              <Bell className="h-4.5 w-4.5 text-blue-600 animate-bounce" /> {t.liveNotices}
            </h3>
            
            <div className="space-y-4 overflow-y-auto flex-1 max-h-[1000px] no-scrollbar">
              {noticesList.filter(n => n.category === 'notice').length > 0 ? (
                [...noticesList]
                  .filter(n => n.category === 'notice')
                  .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                  .map(notice => (
                  <div
                    key={notice.id}
                    className="w-[98%] mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-950/70 transition flex flex-col gap-2"
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
                        <a href={notice.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex items-center gap-1.5">
                          {notice.title}
                          <ChevronRight className="h-3 w-3 inline shrink-0 animate-pulse text-blue-500" />
                        </a>
                      ) : (
                        notice.title
                      )}
                    </h5>
                    {notice.lastDate && (
                      <p className="text-[10px] text-red-500 font-extrabold mt-1 uppercase tracking-wider">
                        {t.lastDate} {notice.lastDate}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs">
                  {language === 'hi' ? 'कोई सक्रिय सूचना नहीं।' : 'No active notices.'}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Live Result Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-6 px-1.5 rounded-3xl shadow-sm flex flex-col lg:min-h-[600px] min-h-0">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 px-3">
              <Trophy className="h-4.5 w-4.5 text-yellow-500 animate-pulse" /> {t.resultsMerits}
            </h3>
            
            <div className="space-y-4 overflow-y-auto flex-1 max-h-[1000px] no-scrollbar">
              {noticesList.filter(n => n.category === 'result').length > 0 ? (
                [...noticesList]
                  .filter(n => n.category === 'result')
                  .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                  .map(notice => (
                  <div
                    key={notice.id}
                    className="w-[98%] mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-950/70 transition flex flex-col gap-2"
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
                        <a href={notice.url} target="_blank" rel="noopener noreferrer" className="hover:text-yellow-600 dark:hover:text-yellow-400 hover:underline flex items-center gap-1.5">
                          {notice.title}
                          <ChevronRight className="h-3 w-3 inline shrink-0 animate-pulse text-yellow-500" />
                        </a>
                      ) : (
                        notice.title
                      )}
                    </h5>
                    {notice.lastDate && (
                      <p className="text-[10px] text-red-500 font-extrabold mt-1 uppercase tracking-wider">
                        {t.lastDate} {notice.lastDate}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs">
                  {language === 'hi' ? 'कोई सक्रिय परिणाम नहीं।' : 'No active results.'}
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Live Admit Card Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-6 px-1.5 rounded-3xl shadow-sm flex flex-col lg:min-h-[600px] min-h-0">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 px-3">
              <FileText className="h-4.5 w-4.5 text-green-550" /> {t.admitCards}
            </h3>
            
            <div className="space-y-4 overflow-y-auto flex-1 max-h-[1000px] no-scrollbar">
              {noticesList.filter(n => n.category === 'admit_card').length > 0 ? (
                [...noticesList]
                  .filter(n => n.category === 'admit_card')
                  .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                  .map(notice => (
                  <div
                    key={notice.id}
                    className="w-[98%] mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-950/70 transition flex flex-col gap-2"
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
                        <a href={notice.url} target="_blank" rel="noopener noreferrer" className="hover:text-green-600 dark:hover:text-green-455 hover:underline flex items-center gap-1.5">
                          {notice.title}
                          <ChevronRight className="h-3 w-3 inline shrink-0 animate-pulse text-green-500" />
                        </a>
                      ) : (
                        notice.title
                      )}
                    </h5>
                    {notice.lastDate && (
                      <p className="text-[10px] text-red-500 font-extrabold mt-1 uppercase tracking-wider">
                        {t.lastDate} {notice.lastDate}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs">
                  {language === 'hi' ? 'कोई सक्रिय प्रवेश पत्र नहीं।' : 'No active admit cards.'}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-6 px-1.5 rounded-3xl shadow-sm flex flex-col lg:min-h-[600px] min-h-0">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 px-3">
              <ShieldCheck className="h-4.5 w-4.5 text-purple-500 animate-pulse" /> Answer Keys
            </h3>
            
            <div className="space-y-4 overflow-y-auto flex-1 max-h-[1000px] no-scrollbar">
              {noticesList.filter(n => n.category === 'answer_key').length > 0 ? (
                [...noticesList]
                  .filter(n => n.category === 'answer_key')
                  .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                  .map(notice => (
                  <div
                    key={notice.id}
                    className="w-[98%] mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-950/70 transition flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block bg-purple-100 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-900 text-purple-700 dark:text-purple-400 text-[8px] font-black px-2 py-0.5 rounded tracking-wider">
                          {notice.type || 'ANSWER KEY'}
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
                        <a href={notice.url} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 dark:hover:text-purple-450 hover:underline flex items-center gap-1.5">
                          {notice.title}
                          <ChevronRight className="h-3 w-3 inline shrink-0 animate-pulse text-purple-500" />
                        </a>
                      ) : (
                        notice.title
                      )}
                    </h5>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs">
                  {language === 'hi' ? 'कोई सक्रिय उत्तर कुंजी नहीं।' : 'No active answer keys.'}
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-12 px-6 md:px-12 mt-auto text-center text-xs text-slate-500 dark:text-slate-500 transition-colors duration-200 font-bold">
        <p>© 2026 {language === 'hi' ? 'मॉक टेस्ट सीबीटी मॉक पोर्टल सिम्युलेटर' : 'Mock Test CBT Mock Portal Simulator'}. {language === 'hi' ? 'सर्वाधिकार सुरक्षित।' : 'All rights reserved.'}</p>
        <p className="mt-1 font-semibold text-slate-400">{language === 'hi' ? 'वास्तविक सरकारी चयन कंप्यूटर आधारित परीक्षाओं का अनुकरण करने के लिए विकसित।' : 'Developed to simulate real-world government selection computer based assessments.'}</p>
      </footer>

    </div>
  );
}
