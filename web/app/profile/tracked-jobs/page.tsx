"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { useIsMobile } from '../../useIsMobile';
import { TRANSLATIONS } from '../../translations';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Search,
  Trash2,
  X,
  Calendar,
  Sparkles,
  User,
  Sun,
  Moon,
  Trophy,
  ArrowUpRight,
  Briefcase,
  FileText,
} from 'lucide-react';

export default function TrackedJobsPage() {
  const { currentUser, updateTrackedJobs, theme, toggleTheme, language, setLanguage } = useAuth();
  const router = useRouter();
  const { isMobile, isMounted } = useIsMobile();

  const [trackedJobs, setTrackedJobs] = useState<any[]>([]);
  const [jobFilter, setJobFilter] = useState<'all' | 'applied' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobToRemove, setJobToRemove] = useState<{ noticeId: string; title: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setTrackedJobs(currentUser.trackedJobs || []);
  }, [currentUser]);

  const removeTrackedJob = (noticeId: string) => {
    if (!currentUser) return;
    try {
      const updated = trackedJobs.filter(j => j.noticeId !== noticeId);
      setTrackedJobs(updated);
      updateTrackedJobs(updated);
      setToastMsg(language === 'hi' ? 'जॉब को ट्रैकर से हटा दिया गया है' : 'Job removed from tracker');
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredJobs = useMemo(() => {
    return trackedJobs.filter((job: any) => {
      // 1. Tab Filter
      if (jobFilter === 'applied' && !job.isApplied) return false;
      if (jobFilter === 'saved' && !job.isSaved) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (job.title || '').toLowerCase().includes(q);
        const appNoMatch = (job.applicationNo || '').toLowerCase().includes(q);
        return titleMatch || appNoMatch;
      }
      return true;
    });
  }, [trackedJobs, jobFilter, searchQuery]);

  const appliedCount = trackedJobs.filter(j => j.isApplied).length;
  const savedCount = trackedJobs.filter(j => j.isSaved).length;

  const t = TRANSLATIONS[language];

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200 relative pb-20 overflow-x-hidden">
      
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* HEADER NAVBAR */}
      <header className="h-16 sticky top-0 z-40 px-3 sm:px-6 md:px-12 flex items-center justify-between shadow-sm bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0">
          {/* Back Button */}
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer active:scale-95"
            title={language === 'hi' ? 'प्रोफाइल पर वापस' : 'Back to Profile'}
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            <span className="hidden xs:inline">{language === 'hi' ? 'प्रोफाइल' : 'Profile'}</span>
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-1.5 sm:p-2 rounded-full shadow-sm flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 border border-blue-200/50 dark:border-slate-700 shrink-0">
              <Trophy className="h-4 w-4 sm:h-5.5 sm:w-5.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-extrabold text-xs sm:text-sm leading-tight text-slate-900 dark:text-white tracking-wider truncate">{t.logoTitle}</h1>
              <p className="text-[7.5px] sm:text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase truncate">{t.logoSub}</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-400">
              <Link href="/" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navHome}</Link>
              <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navTestSeries}</Link>
              <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navUpdates}</Link>
              {currentUser && ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role) && (
                <Link href="/admin" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navAdmin}</Link>
              )}
            </nav>
          )}
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/profile"
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer active:scale-95 shadow-2xs"
          >
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className={isMobile ? 'hidden' : ''}>{language === 'hi' ? 'मेरी प्रोफ़ाइल' : 'My Profile'}</span>
          </Link>

          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
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

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 md:px-8 py-6 space-y-6 relative z-10">

        {/* HERO BANNER CARD */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 shrink-0 text-blue-600 dark:text-blue-400">
                <Briefcase className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {language === 'hi' ? '💼 मेरे सभी ट्रैक किए गए जॉब्स' : '💼 My Saved & Applied Jobs Tracker'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'hi'
                    ? 'अपनी सभी सहेजी गई और आवेदन की गई भर्तियों के स्टेटस, तिथियां और रोल नंबर एक ही स्थान पर प्रबंधित करें।'
                    : 'Manage application statuses, deadlines, exam dates and registration details in one place.'}
                </p>
              </div>
            </div>

            <Link
              href="/updates"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl transition cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>{language === 'hi' ? 'नई सूचनाएं खोजें' : 'Browse Live Notices'}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Quick Metric Counter Badges */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tracked</span>
                <span className="text-base font-black text-slate-900 dark:text-white">{trackedJobs.length}</span>
              </div>
              <BookmarkCheck className="h-5 w-5 text-slate-400" />
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-955 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Applied</span>
                <span className="text-base font-black text-emerald-800 dark:text-emerald-300">{appliedCount}</span>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>

            <div className="bg-blue-50/60 dark:bg-blue-955 p-3 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">Saved</span>
                <span className="text-base font-black text-blue-800 dark:text-blue-300">{savedCount}</span>
              </div>
              <Bookmark className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </section>

        {/* SEARCH AND FILTER BAR */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'hi' ? 'जॉब शीर्षक या रोल नंबर खोजें...' : 'Search by job title or roll number...'}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setJobFilter('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  jobFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {language === 'hi' ? 'सभी' : 'All'} ({trackedJobs.length})
              </button>

              <button
                type="button"
                onClick={() => setJobFilter('applied')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  jobFilter === 'applied'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{language === 'hi' ? 'आवेदन किया गया' : 'Applied'} ({appliedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setJobFilter('saved')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  jobFilter === 'saved'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>{language === 'hi' ? 'सेव किया गया' : 'Saved'} ({savedCount})</span>
              </button>
            </div>
          </div>
        </section>

        {/* TRACKED JOBS LIST */}
        <section className="space-y-3">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job: any) => (
              <div
                key={job.noticeId}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition group"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {job.isApplied && (
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9.5px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Applied
                      </span>
                    )}
                    {job.isSaved && (
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[9.5px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                        <Bookmark className="h-3 w-3 text-blue-600" /> Saved
                      </span>
                    )}
                    {job.appliedDate && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        Applied: {job.appliedDate}
                      </span>
                    )}
                    {job.applicationNo && (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                        Reg / Roll No: {job.applicationNo}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug break-words">
                    {job.title}
                  </h3>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium flex-wrap">
                    {job.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        Notice Date: {job.date}
                      </span>
                    )}
                    {job.lastDate && (
                      <span className="text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock className="h-3 w-3 text-rose-500" />
                        Deadline: {job.lastDate}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <Link
                    href={`/updates/${job.noticeId}`}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-600/20 active:scale-95 cursor-pointer"
                  >
                    <span>View Full Details</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setJobToRemove({ noticeId: job.noticeId, title: job.title })}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition cursor-pointer active:scale-95"
                    title="Remove from Tracker"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
              <BookmarkCheck className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {searchQuery.trim()
                  ? (language === 'hi' ? 'कोई मेल खाने वाली जॉब नहीं मिली' : 'No matching tracked jobs')
                  : (language === 'hi' ? 'अभी कोई सेव या आवेदन नहीं किया गया' : 'No saved or applied jobs in tracker')}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {searchQuery.trim()
                  ? (language === 'hi' ? 'कृपया अन्य कीवर्ड खोजें या फ़िल्टर साफ़ करें।' : 'Try searching with another keyword or clear the filter.')
                  : (language === 'hi'
                      ? 'अधिसूचनाओं पर जाएं और ट्रैक करने के लिए "Save Job" या "Mark as Applied" पर क्लिक करें।'
                      : 'Visit any live recruitment announcement and click "Save Job" or "Mark as Applied" to track your applications here.')}
              </p>
              <Link
                href="/updates"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-600/20 active:scale-95 pt-1"
              >
                <span>{language === 'hi' ? 'सरकारी सूचनाएं ब्राउज़ करें' : 'Browse Live Notifications'}</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

      </main>

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* CONFIRMATION POPUP MODAL FOR REMOVING TRACKED JOB */}
      {jobToRemove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {language === 'hi' ? 'ट्रैकर से जॉब हटाएं?' : 'Remove Job from Tracker?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  {language === 'hi' 
                    ? `क्या आप वास्तव में '${jobToRemove.title}' को अपने आवेदन और सेव किए गए जॉब ट्रैकर से हटाना चाहते हैं?` 
                    : `Are you sure you want to remove '${jobToRemove.title}' from your saved & applied jobs tracker?`}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-snug">
              {language === 'hi'
                ? 'यह क्रिया आपके प्रोफाइल से इस जॉब के स्टेटस, आवेदन तिथि और रोल नंबर को हटा देगी।'
                : 'This action will reset your tracked status, application date, and registration details for this notification.'}
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setJobToRemove(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer active:scale-95"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => {
                  removeTrackedJob(jobToRemove.noticeId);
                  setJobToRemove(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-rose-600/20 active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>{language === 'hi' ? 'हाँ, हटाएं' : 'Yes, Remove Job'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-8 px-4 text-center text-xs text-slate-500 font-bold transition-colors duration-200 mt-16">
        <p>© 2026 MockTest Hub. All rights reserved.</p>
      </footer>
    </div>
  );
}
