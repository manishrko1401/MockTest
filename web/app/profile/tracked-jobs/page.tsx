"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, TrackedJob } from '../../AuthContext';
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
  FolderLock,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit3,
  FolderOpen,
  Plus,
  Lock,
} from 'lucide-react';

export default function TrackedJobsPage() {
  const { currentUser, updateTrackedJobs, theme, toggleTheme, language, setLanguage } = useAuth();
  const router = useRouter();
  const { isMobile, isMounted } = useIsMobile();

  const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>([]);
  const [jobFilter, setJobFilter] = useState<'all' | 'applied' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobToRemove, setJobToRemove] = useState<{ noticeId: string; title: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Edit Credentials Modal
  const [editingExam, setEditingExam] = useState<TrackedJob | null>(null);
  const [examFormTitle, setExamFormTitle] = useState('');
  const [examFormAppNo, setExamFormAppNo] = useState('');
  const [examFormPassword, setExamFormPassword] = useState('');
  const [examFormRollNo, setExamFormRollNo] = useState('');
  const [examFormExamDate, setExamFormExamDate] = useState('');
  const [examFormCenter, setExamFormCenter] = useState('');
  const [examFormShift, setExamFormShift] = useState('');
  const [examFormNotes, setExamFormNotes] = useState('');

  // Password Visibility toggles map
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const copyToClipboard = (text: string, key: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setToastMsg(language === 'hi' ? 'क्लिपबोर्ड पर कॉपी किया गया!' : 'Copied to clipboard!');
      setTimeout(() => {
        setCopiedKey(null);
        setToastMsg(null);
      }, 2500);
    }
  };

  const handleOpenEditExam = (exam: TrackedJob) => {
    setEditingExam(exam);
    setExamFormTitle(exam.title);
    setExamFormAppNo(exam.applicationNo || '');
    setExamFormPassword(exam.password || '');
    setExamFormRollNo(exam.rollNumber || '');
    setExamFormExamDate(exam.examDate || '');
    setExamFormCenter(exam.examCenter || '');
    setExamFormShift(exam.shiftTime || '');
    setExamFormNotes(exam.notes || '');
  };

  const handleSaveExamDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam || !currentUser) return;

    const list = currentUser.trackedJobs || [];
    const index = list.findIndex((j) => j.noticeId === editingExam.noticeId);

    const updatedJob: TrackedJob = {
      ...editingExam,
      title: examFormTitle.trim() || editingExam.title,
      applicationNo: examFormAppNo.trim() || undefined,
      password: examFormPassword.trim() || undefined,
      rollNumber: examFormRollNo.trim() || undefined,
      examDate: examFormExamDate.trim() || undefined,
      examCenter: examFormCenter.trim() || undefined,
      shiftTime: examFormShift.trim() || undefined,
      notes: examFormNotes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    let updatedList = [...list];
    if (index >= 0) {
      updatedList[index] = updatedJob;
    } else {
      updatedList.push(updatedJob);
    }

    updateTrackedJobs(updatedList);
    setTrackedJobs(updatedList);
    setEditingExam(null);
    setToastMsg(language === 'hi' ? 'परीक्षा क्रेडेंशियल्स सफलतापूर्वक सहेजे गए!' : 'Exam credentials saved successfully!');
    setTimeout(() => setToastMsg(null), 3000);
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
        const rollMatch = (job.rollNumber || '').toLowerCase().includes(q);
        return titleMatch || appNoMatch || rollMatch;
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
      <header className="h-16 sm:h-20 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-sm bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Back Button */}
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer active:scale-95"
            title={language === 'hi' ? 'प्रोफाइल पर वापस' : 'Back to Profile'}
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline">{language === 'hi' ? 'प्रोफाइल' : 'Profile'}</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Briefcase className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-extrabold text-xs sm:text-sm md:text-base text-slate-900 dark:text-white uppercase tracking-tight truncate">
              {language === 'hi' ? 'ट्रैक किए गए जॉब्स' : 'Tracked Jobs & Exam Vault'}
            </span>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <Link
            href="/locker"
            className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Document Locker"
          >
            <FolderLock className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Document Locker</span>
          </Link>

          {/* Language Selector */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
            title="Switch Language"
          >
            {language === 'en' ? 'हिन्दी' : 'English'}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800"
            title={theme === 'light' ? t.themeDark : t.themeLight}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 relative z-10">

        {/* HERO BANNER CARD */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 shadow-sm space-y-3.5 sm:space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 shrink-0 text-blue-600 dark:text-blue-400">
                <Briefcase className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <div className="space-y-1 min-w-0">
                <h1 className="text-sm xs:text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug">
                  {language === 'hi' ? '💼 मेरे सभी ट्रैक किए गए जॉब्स और परीक्षा वॉल्ट' : '💼 My Saved & Applied Jobs Tracker'}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {language === 'hi'
                    ? 'पंजीकरण संख्या, पासवर्ड, एडमिट कार्ड और Google ड्राइव फ़ोल्डर एक ही स्थान पर प्रबंधित करें।'
                    : 'Manage application statuses, passwords, roll numbers, admit cards, and Google Drive folders in one place.'}
                </p>
              </div>
            </div>

            {/* Top Right Corner Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto shrink-0 pt-0.5 md:pt-0">
              <Link
                href="/locker"
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <FolderLock className="h-3.5 w-3.5" />
                <span>{language === 'hi' ? 'दस्तावेज़ लॉकर' : 'Open Document Locker'}</span>
              </Link>
              <Link
                href="/updates"
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>{language === 'hi' ? 'लाइव सूचनाएं' : 'Browse Live Notices'}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-blue-500 hidden xs:inline" />
              </Link>
            </div>
          </div>

          {/* Quick Metric Counter Badges */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-955 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <span className="text-[8.5px] xs:text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Total Tracked</span>
                <span className="text-sm xs:text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">{trackedJobs.length}</span>
              </div>
              <BookmarkCheck className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 shrink-0 ml-1" />
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-955 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <span className="text-[8.5px] xs:text-[9.5px] sm:text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block truncate">Applied</span>
                <span className="text-sm xs:text-base sm:text-lg font-black text-emerald-800 dark:text-emerald-300 leading-tight">{appliedCount}</span>
              </div>
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0 ml-1" />
            </div>

            <div className="bg-blue-50/60 dark:bg-blue-955 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-blue-200/80 dark:border-blue-900/50 flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <span className="text-[8.5px] xs:text-[9.5px] sm:text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block truncate">Saved</span>
                <span className="text-sm xs:text-base sm:text-lg font-black text-blue-800 dark:text-blue-300 leading-tight">{savedCount}</span>
              </div>
              <Bookmark className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0 ml-1" />
            </div>
          </div>
        </section>

        {/* SEARCH AND FILTER BAR */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-2.5 sm:space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'hi' ? 'जॉब शीर्षक, रजिस्ट्रेशन या रोल नंबर खोजें...' : 'Search by job title, reg ID, or roll number...'}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-9 py-2 sm:py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
              <button
                type="button"
                onClick={() => setJobFilter('all')}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold tracking-wide transition active:scale-95 cursor-pointer whitespace-nowrap ${
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
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold tracking-wide transition active:scale-95 cursor-pointer flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  jobFilter === 'applied'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{language === 'hi' ? 'आवेदन' : 'Applied'} ({appliedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setJobFilter('saved')}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold tracking-wide transition active:scale-95 cursor-pointer flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  jobFilter === 'saved'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>{language === 'hi' ? 'सहेजा गया' : 'Saved'} ({savedCount})</span>
              </button>
            </div>
          </div>
        </section>

        {/* TRACKED JOBS LIST WITH 3D HOVER TILES */}
        <section className="space-y-3.5 p-2 -m-2">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job: any) => {
              const isPassVisible = !!visiblePasswords[job.noticeId];

              return (
                <div
                  key={job.noticeId}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between gap-4 shadow-xs transition-all duration-300 transform-gpu hover:-translate-y-1.5 hover:scale-[1.015] hover:shadow-[0_14px_28px_-6px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_14px_28px_-6px_rgba(0,0,0,0.6),0_0_20px_rgba(59,130,246,0.15)] hover:border-blue-400/60 dark:hover:border-blue-500/50 group relative z-0 hover:z-10 space-y-2"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
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

                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                      {job.isApplied && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditExam(job)}
                          className="px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-medium tracking-wide border border-purple-200 dark:border-purple-800 transition-all duration-200 transform-gpu hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 active:scale-[0.99] flex items-center gap-1 cursor-pointer"
                          title="Edit Exam Credentials"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Credentials</span>
                        </button>
                      )}

                      <Link
                        href={`/updates/${job.noticeId}`}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-750 text-white text-xs font-medium tracking-wide transition-all duration-200 transform-gpu hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-500/20 active:translate-y-0 active:scale-[0.99] flex items-center gap-1 shadow-sm cursor-pointer"
                      >
                        <span>Details</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => setJobToRemove({ noticeId: job.noticeId, title: job.title })}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition-all duration-200 transform-gpu hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 active:scale-[0.99] cursor-pointer"
                        title="Remove from Tracker"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* If Applied: Display Protected Document Locker Banner */}
                  {job.isApplied && (
                    <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/50 p-3 rounded-xl flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800 shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {language === 'hi' ? 'सुरक्षित परीक्षा क्रेडेंशियल' : 'PIN Protected Exam Credentials'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {language === 'hi'
                              ? 'पंजीकरण संख्या व पासवर्ड केवल दस्तावेज़ लॉकर में 4-अंकों के पिन से सुरक्षित हैं।'
                              : 'Registration ID & Password are securely stored inside Document Locker.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/locker?exam=${encodeURIComponent(job.title)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium tracking-wide transition-all duration-200 transform-gpu hover:-translate-y-0.5 hover:shadow-md hover:shadow-purple-600/25 active:translate-y-0 active:scale-[0.99] shadow-sm"
                        >
                          <FolderLock className="w-3.5 h-3.5" />
                          <span>{language === 'hi' ? 'लॉकर में देखें' : 'View in Locker'}</span>
                        </Link>

                        {job.driveFolderLink && (
                          <a
                            href={job.driveFolderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 hover:border-blue-400 text-xs font-medium tracking-wide transition-all duration-200 transform-gpu hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 active:scale-[0.99] shadow-2xs"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Google Drive</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
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

      {/* EDIT CREDENTIALS MODAL */}
      {editingExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-600" />
                Edit Exam Credentials & Schedule
              </h3>
              <button
                onClick={() => setEditingExam(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExamDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Exam Title *
                </label>
                <input
                  type="text"
                  value={examFormTitle}
                  onChange={(e) => setExamFormTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Registration / App No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2501009845"
                    value={examFormAppNo}
                    onChange={(e) => setExamFormAppNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Login Password / DOB
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pass@1234 or 15-08-2001"
                    value={examFormPassword}
                    onChange={(e) => setExamFormPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2201019940"
                    value={examFormRollNo}
                    onChange={(e) => setExamFormRollNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    value={examFormExamDate}
                    onChange={(e) => setExamFormExamDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Exam Center / City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New Delhi / TCS iON"
                    value={examFormCenter}
                    onChange={(e) => setExamFormCenter(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Shift / Timing
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shift 2 (12:30 PM)"
                    value={examFormShift}
                    onChange={(e) => setExamFormShift(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Notes
                </label>
                <textarea
                  placeholder="e.g. Carry Original ID, Photo and Pen..."
                  value={examFormNotes}
                  onChange={(e) => setExamFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingExam(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVAL CONFIRMATION MODAL */}
      {jobToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 w-fit mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                {language === 'hi' ? 'जॉब को ट्रैकर से हटाएं?' : 'Remove from Tracker?'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                &quot;{jobToRemove.title}&quot; {language === 'hi' ? 'को आपके ट्रैक किए गए और सहेजे गए जॉब्स से हटा दिया जाएगा।' : 'will be removed from your saved list.'}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setJobToRemove(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  removeTrackedJob(jobToRemove.noticeId);
                  setJobToRemove(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                {language === 'hi' ? 'हटाएं' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
