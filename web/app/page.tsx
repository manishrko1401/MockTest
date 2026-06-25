"use client";

import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import Link from 'next/link';
import { ShieldCheck, GraduationCap, ChevronRight, Award, Trophy, Users, CheckCircle, Search, Info, Calendar, Bell, HelpCircle, UserCheck, Sun, Moon } from 'lucide-react';

const CATEGORIES = [
  { id: 'ssc', name: 'SSC Exams', desc: 'SSC CGL, CHSL, MTS, GD Constable', count: '45+ Tests' },
  { id: 'railways', name: 'Railways Exams', desc: 'RRB NTPC, Group D, ALP', count: '30+ Tests' },
  { id: 'ugc_net', name: 'UGC NET Exams', desc: 'Paper 1 & Paper 2 CS/Arts', count: '15+ Tests' },
  { id: 'teaching', name: 'Teaching Exams', desc: 'CTET Paper 1, Paper 2, State TET', count: '20+ Tests' },
  { id: 'state_exams', name: 'All State Exams', desc: 'UPPSC, BSSC, MPSC, RAS', count: '35+ Tests' },
  { id: 'banking', name: 'Banking Exams', desc: 'SBI PO, Clerk, IBPS PO, Clerk', count: '40+ Tests' }
];

const NOTICES = [
  { id: 'n1', title: 'SSC CGL 2026 Tier 1 Exam Dates Announced', date: '25 June 2026', type: 'EXAM DATE' },
  { id: 'n2', title: 'RRB NTPC Application Window Extended to July 10', date: '24 June 2026', type: 'ADMISSION' },
  { id: 'n3', title: 'CTET 2026 Answer Key & Response Sheet Released', date: '22 June 2026', type: 'RESULT' },
  { id: 'n4', title: 'UPPSC Prelims 2026 Exam Postponed. New Schedule Soon', date: '20 June 2026', type: 'NOTIFICATION' }
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

export default function HomeLandingPage() {
  const { currentUser, logout, theme, toggleTheme } = useAuth();
  
  const [successIndex, setSuccessIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

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
              <h1 className="font-extrabold text-sm leading-tight text-slate-900 dark:text-white tracking-wider">TESTBOOK</h1>
              <p className="text-[9px] text-blue-650 dark:text-blue-400 font-bold tracking-widest uppercase">Exam Preparation</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors">Test Series</Link>
            <Link href="/profile" className="hover:text-blue-600 dark:hover:text-white transition-colors">My Profile</Link>
            <Link href="/admin" className="hover:text-blue-600 dark:hover:text-white transition-colors">Admin Panel</Link>
          </nav>
        </div>

        {/* Auth Buttons / Profile Panel */}
        <div className="flex items-center gap-4">
          {/* Theme switcher */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="flex items-center gap-2 bg-slate-100 border border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700 transition px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm text-slate-800 dark:text-slate-200">
                <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {currentUser.name[0]}
                </div>
                <span>Dashboard ({currentUser.name.split(' ')[0]})</span>
              </Link>
              <button
                onClick={logout}
                className="hidden sm:block text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition text-xs font-bold cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/auth" className="text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-white transition text-xs font-bold">
                Log In
              </Link>
              <Link href="/auth" className="bg-blue-600 hover:bg-blue-750 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-lg shadow-blue-900/25 transition active:scale-95">
                Sign Up
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
            🏆 India's #1 Exam Prep Portal
          </span>
          
          <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
            Unlock Success In Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">Govt Exams</span>
          </h1>
          
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed max-w-lg font-semibold">
            Join 5.1 Crore+ registered aspirants. Get comprehensive CBT mock sittings, instant accuracy graphs, tab-blur security alerts, and full access passes mapped to SSC, Banking, Railways, and State Exams.
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
              placeholder="Search exam (e.g. SSC CGL, RRB NTPC, SBI PO)..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-32 py-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 shadow-sm"
            />
            <Link
              href={`/mock-tests?q=${searchQuery}`}
              className="absolute right-2 top-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-xl text-[10px] transition active:scale-95 shadow-md cursor-pointer"
            >
              Search Mock Test
            </Link>
          </div>

          {/* Counter Badges */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-900 max-w-md">
            <div>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest">Active Users</p>
              <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">5.1 Cr+</h4>
            </div>
            <div>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest">Mock Attempts</p>
              <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">12 Cr+</h4>
            </div>
            <div>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest">Selections</p>
              <h4 className="text-lg font-black text-green-600 dark:text-green-400 mt-1">8.4 Lakh+</h4>
            </div>
          </div>
        </div>

        {/* Right Side: Showcase Board */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-between min-h-[300px]">
          
          <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-850 pb-4 mb-4">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-yellow-500" /> Toppers Testimonials
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
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Popular Exam Mock Series</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">We catalog full sectional mock tests, solved papers, and live analytics for all major domains.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map(cat => (
            <Link
              href={`/mock-tests`}
              key={cat.id}
              className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-6 rounded-2xl flex flex-col justify-between group transition-all shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-650 dark:text-blue-400">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black tracking-wider group-hover:underline">
                    {cat.count}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{cat.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-semibold">{cat.desc}</p>
              </div>
              
              <div className="flex items-center gap-1.5 text-blue-605 dark:text-blue-400 font-bold text-[10px] uppercase tracking-wider mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                Explore Tests <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* PORTAL NOTICE BOARD */}
      <section className="py-16 px-6 md:px-12 max-w-6xl w-full mx-auto relative z-10 border-t border-slate-200 dark:border-slate-900 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Left 2 columns: Information Notice board */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-8 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-blue-650 animate-bounce" /> Live Notices & Announcements
            </h3>
            
            <div className="space-y-4">
              {NOTICES.map(notice => (
                <div
                  key={notice.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-950/70 transition flex justify-between items-start gap-4"
                >
                  <div className="space-y-1.5">
                    <span className="inline-block bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-900 text-blue-700 dark:text-blue-400 text-[8px] font-black px-2 py-0.5 rounded tracking-wider">
                      {notice.type}
                    </span>
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-snug">
                      {notice.title}
                    </h5>
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">{notice.date}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-850 flex justify-end">
            <Link href="/mock-tests" className="text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              View All Advisories <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Right 1 column: Features Info */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          
          {/* Accent decoration */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>

          <div>
            <h3 className="font-black text-sm uppercase tracking-wider mb-6 flex items-center gap-2 text-white">
              <Info className="h-4.5 w-4.5 text-blue-200" /> CBT Engine Security
            </h3>
            
            <ul className="space-y-4 text-xs text-blue-100 font-semibold leading-relaxed">
              <li className="flex gap-2.5 items-start">
                <CheckCircle className="h-4.5 w-4.5 text-blue-200 shrink-0 mt-0.5" />
                <span><strong>Anti-Cheat Shield</strong>: Automatic test submission triggers when client browser loses tab focus.</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <CheckCircle className="h-4.5 w-4.5 text-blue-200 shrink-0 mt-0.5" />
                <span><strong>Bilingual CBT</strong>: Switch languages instantly inside mock sessions (English & Hindi formats).</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <CheckCircle className="h-4.5 w-4.5 text-blue-200 shrink-0 mt-0.5" />
                <span><strong>Detailed Solutions</strong>: Get immediate correctness feedback and conceptual answers.</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-white/10 text-[10px] text-blue-200 font-bold leading-normal">
            For technical assistance or ticket registration, write to support@mocktest.example.com.
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-12 px-6 md:px-12 mt-auto text-center text-xs text-slate-500 dark:text-slate-500 transition-colors duration-200">
        <p className="font-bold">© 2026 Testbook CBT Mock Portal Simulator. All rights reserved.</p>
        <p className="mt-1">Developed to simulate real-world government selection computer based assessments.</p>
      </footer>

    </div>
  );
}
