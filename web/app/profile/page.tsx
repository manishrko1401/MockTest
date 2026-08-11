"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, Calendar, AlertCircle, CheckCircle2, ChevronRight, ChevronDown, ChevronUp, LayoutDashboard, LogOut, KeyRound, Gift, Phone, Sun, Moon, Globe, ArrowLeft, ShieldCheck, Menu, X, Eye, EyeOff, Coins, Trophy, Bookmark, BookmarkCheck, ArrowUpRight, Trash2 } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { useIsMobile } from '../useIsMobile';

export default function StudentProfilePage() {
  const { currentUser, updateProfile, updatePassword, updateTrackedJobs, logout, theme, toggleTheme, language, setLanguage } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];

  // Tracked Jobs State (Saved & Applied)
  const [trackedJobs, setTrackedJobs] = useState<any[]>([]);
  const [jobFilter, setJobFilter] = useState<'all' | 'applied' | 'saved'>('all');

  // Confirmation Modal State for Job Removal
  const [jobToRemove, setJobToRemove] = useState<{ noticeId: string; title: string } | null>(null);

  useEffect(() => {
    if (!currentUser || typeof window === 'undefined') return;
    try {
      const userKey = `mocktesthub_tracked_jobs_${currentUser.id}`;
      const stored = currentUser.trackedJobs || JSON.parse(localStorage.getItem(userKey) || '[]');
      setTrackedJobs(stored);
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  const removeTrackedJob = (noticeId: string) => {
    if (!currentUser) return;
    try {
      const updated = trackedJobs.filter(j => j.noticeId !== noticeId);
      setTrackedJobs(updated);
      updateTrackedJobs(updated);
    } catch (e) {
      console.error(e);
    }
  };

  // Input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Accordion minimized states for mobile view
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false);

  const [mounted, setMounted] = useState(false);

  const { isMobile } = useIsMobile();

  // Sync input values and set client-only mount flag
  useEffect(() => {
    setMounted(true);
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setMobile(currentUser.mobile || '');
    }
  }, [currentUser]);

  // Toast status states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const triggerToast = (type: 'success' | 'error', msg: string) => {
    setErrorMsg(type === 'error' ? msg : null);
    setSuccessMsg(type === 'success' ? msg : null);
    setTimeout(() => {
      setErrorMsg(null);
      setSuccessMsg(null);
    }, 3000);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !mobile.trim()) {
      triggerToast('error', 'Fields cannot be empty.');
      return;
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      triggerToast('error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    updateProfile(name, email, mobile.trim());
    triggerToast('success', 'Profile details updated successfully!');
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      triggerToast('error', 'Password fields cannot be empty.');
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast('error', 'New passwords do not match.');
      return;
    }
    
    const ok = updatePassword(oldPassword, newPassword);
    if (ok) {
      triggerToast('success', 'Account password successfully updated!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      triggerToast('error', 'Old password verify check failed.');
    }
  };

  const handleSignOut = () => {
    router.push('/');
    // Delay logout slightly so router navigation starts before currentUser becomes null
    setTimeout(() => logout(), 100);
  };

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">
        <div className="text-center p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl max-w-sm shadow-xl">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider mb-2">Authentication Required</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">Please log in to your account to view and manage your profile details.</p>
          <Link href="/auth" className="inline-block bg-blue-600 hover:bg-blue-750 text-white font-bold py-2.5 px-6 rounded-lg text-xs tracking-wider uppercase transition-all shadow-lg active:scale-95">
            Log In
          </Link>
        </div>
      </div>
    );
  }


  if (mounted && isMobile) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 select-none pb-8 transition-colors duration-200">
        
        {/* MOBILE HEADER */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/" className="flex items-center gap-1 text-slate-705 dark:text-white hover:text-blue-600 font-bold text-xs shrink-0">
              <ArrowLeft className="h-4 w-4" /> {t.navHome}
            </Link>

            {/* Mocktest Hub Logo */}
            <div className="flex items-center gap-1.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 shrink-0">
              <Trophy className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-black text-[10px] tracking-wider text-slate-900 dark:text-white uppercase leading-none">
                Mocktest Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
              className="px-1.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-905 border border-slate-202 dark:border-slate-800 text-[10px] font-bold outline-none cursor-pointer"
            >
              <option value="en">EN</option>
              <option value="hi">हिं</option>
            </select>

            {/* Theme Toggler */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-202 dark:border-slate-800"
            >
              {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200/80 dark:border-red-900/40 text-red-600 dark:text-red-400 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold cursor-pointer active:scale-95 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{language === 'hi' ? 'साइन आउट' : 'Sign Out'}</span>
            </button>
          </div>
        </header>

        {/* MAIN CONTAINER */}
        <main className="flex-1 p-4 space-y-6 relative">
          
          {/* TOAST STATS MESSAGES */}
          {successMsg && (
            <div className="fixed top-16 inset-x-4 z-50 p-3 bg-green-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
              <CheckCircle2 className="h-4.5 w-4.5" /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="fixed top-16 inset-x-4 z-50 p-3 bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
              <AlertCircle className="h-4.5 w-4.5" /> {errorMsg}
            </div>
          )}

          {/* PROFILE CARD */}
          <section className="glass-card glow-shadow-blue p-5 rounded-3xl text-center relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-450 mx-auto flex items-center justify-center border border-blue-200 dark:border-blue-800 mb-3 text-lg font-bold">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{currentUser.name}</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">{t.candidateCode}: {currentUser.candidateCode}</p>
            <p className="text-[10px] text-slate-600 mt-1 truncate">{currentUser.email}</p>

            <div className="border-t border-slate-100 dark:border-slate-800 mt-4 pt-4 text-left space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{t.sysRole}</span>
                <span className="bg-blue-100 border border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                  {currentUser.role}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{t.passSub}</span>
                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                  currentUser.subscriptionTier === 'Testbook Pass Pro'
                    ? 'bg-yellow-100 border-yellow-250 text-yellow-750 dark:bg-yellow-950/40 dark:border-yellow-905 dark:text-yellow-405'
                    : currentUser.subscriptionTier === 'Testbook Pass'
                    ? 'bg-green-150 border-green-250 text-green-750 dark:bg-green-955/40 dark:border-green-905 dark:text-green-405'
                    : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800'
                }`}>
                  {currentUser.subscriptionTier === 'None' ? t.noPass : currentUser.subscriptionTier.replace('Testbook', language === 'hi' ? 'मॉक टेस्ट' : 'Mock Test')}
                </span>
              </div>

              {currentUser.subscriptionPurchasedAt && (
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>{t.passPurchased}</span>
                  <span className="text-slate-800 dark:text-slate-300 font-mono text-[10px]">{currentUser.subscriptionPurchasedAt}</span>
                </div>
              )}

              {currentUser.subscriptionExpiresAt && (
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>{t.passExpires}</span>
                  <span className="text-slate-800 dark:text-slate-300 font-mono text-[10px]">{currentUser.subscriptionExpiresAt}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{t.registeredOn}</span>
                <span className="text-slate-805 dark:text-slate-300 font-mono text-[10px] flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {currentUser.registeredDate}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-yellow-650 dark:text-yellow-500" /> {t.coinsBalance}</span>
                <span className="text-yellow-650 dark:text-yellow-400 font-mono font-black text-xs">{currentUser.coins || 0} {t.coinsCount}</span>
              </div>

              {/* Referral Details block */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-3.5 rounded-xl mt-4">
                <p className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <Gift className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500" /> {t.referralTitle}
                </p>
                <div className="flex items-center justify-between gap-2 mt-1.5 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-800 dark:text-white shadow-sm">
                  <span className="font-bold select-all">{currentUser.referralCode}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(currentUser.referralCode);
                      alert(language === 'hi' ? "रेफरल कोड कॉपी किया गया!" : "Referral code copied!");
                    }}
                    className="text-[9px] text-blue-650 dark:text-blue-400 font-bold"
                  >
                    Copy
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-2.5 text-slate-500">
                  <span>{t.referralsCount}:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 dark:text-white dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">{currentUser.referralsCount}</span>
                </div>
                <Link 
                  href="/referrals" 
                  className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline select-none cursor-pointer animate-pulse"
                >
                  <span>{language === 'hi' ? "नियम और आमंत्रित मित्र देखें" : "View Rules & Referred Friends"}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>

          {/* SAVED & APPLIED JOBS TRACKER SECTION */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 shrink-0">
                  <BookmarkCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {language === 'hi' ? 'मेरे आवेदन किए गए और सेव किए गए जॉब्स' : 'My Applied & Saved Jobs Tracker'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Track your application dates, roll numbers, and saved alerts</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                <button
                  onClick={() => setJobFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    jobFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {language === 'hi' ? 'सभी' : 'All'} ({trackedJobs.length})
                </button>
                <button
                  onClick={() => setJobFilter('applied')}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                    jobFilter === 'applied'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {language === 'hi' ? 'आवेदन किया गया' : 'Applied'} ({trackedJobs.filter(j => j.isApplied).length})
                </button>
                <button
                  onClick={() => setJobFilter('saved')}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                    jobFilter === 'saved'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                  }`}
                >
                  <Bookmark className="h-3 w-3" />
                  {language === 'hi' ? 'सेव किया गया' : 'Saved'} ({trackedJobs.filter(j => j.isSaved).length})
                </button>
              </div>
            </div>

            {trackedJobs.filter(j => jobFilter === 'all' ? true : (jobFilter === 'applied' ? j.isApplied : j.isSaved)).length > 0 ? (
              <div className="space-y-3">
                {trackedJobs
                  .filter(j => jobFilter === 'all' ? true : (jobFilter === 'applied' ? j.isApplied : j.isSaved))
                  .map((job: any) => (
                    <div 
                      key={job.noticeId}
                      className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-955 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 group hover:border-blue-300 dark:hover:border-blue-700 transition"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {job.isApplied && (
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Applied
                            </span>
                          )}
                          {job.isSaved && (
                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                              <Bookmark className="h-3 w-3 text-blue-600" /> Saved
                            </span>
                          )}
                          {job.appliedDate && (
                            <span className="text-[10px] text-slate-500 font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                              📅 Applied Date: {job.appliedDate}
                            </span>
                          )}
                          {job.applicationNo && (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-extrabold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                              Reg / Roll No: {job.applicationNo}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs sm:text-sm text-slate-850 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                          {job.title}
                        </h4>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold flex-wrap">
                          {job.date && <span>Notice Date: {job.date}</span>}
                          {job.lastDate && (
                            <span className="text-rose-600 font-bold uppercase tracking-wider">
                              Deadline: {job.lastDate}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60 dark:border-slate-800">
                        <Link
                          href={`/updates/${job.noticeId}`}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                        >
                          <span>View Details</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                        
                        <button
                          type="button"
                          onClick={() => setJobToRemove({ noticeId: job.noticeId, title: job.title })}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Remove from Tracker"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <BookmarkCheck className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {language === 'hi' ? 'अभी कोई सेव या आवेदन नहीं किया गया' : 'No saved or applied jobs yet'}
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  {language === 'hi'
                    ? 'अधिसूचनाओं पर जाएं और ट्रैक करने के लिए "Save Job" या "Mark as Applied" पर क्लिक करें।'
                    : 'Visit any notification announcement and click "Save Job" or "Mark as Applied" to track your applications here.'}
                </p>
                <Link
                  href="/updates"
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline pt-1"
                >
                  <span>{language === 'hi' ? 'सरकारी सूचनाएं ब्राउज़ करें' : 'Browse Government Notifications'}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </section>

          {/* ACCOUNT SETTINGS FORM STACK */}
          <section className="space-y-4">
            
            {/* Details Update Form Accordion */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-extrabold text-[11px] text-slate-850 dark:text-white uppercase tracking-wider">
                    {t.updateDetails}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                  <span className="text-[9.5px] font-bold">
                    {isDetailsExpanded ? (language === 'hi' ? 'छुपायें' : 'Minimize') : (language === 'hi' ? 'खोलें' : 'Expand')}
                  </span>
                  {isDetailsExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  )}
                </div>
              </button>

              {isDetailsExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-200">
                  <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{t.fullName}</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{t.emailAddr}</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-805 dark:text-slate-202 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-505 font-bold uppercase tracking-wider mb-1">{t.mobileNum}</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-mono">+91</span>
                        <input
                          type="tel"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          className="w-full bg-slate-55 dark:bg-slate-955 border border-slate-202 dark:border-slate-800 rounded-xl pl-11 pr-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-750 text-white font-bold py-2.5 rounded-xl text-xs shadow transition cursor-pointer"
                    >
                      {t.saveProfileBtn}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Password Update Form Accordion */}
            <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => setIsPasswordExpanded(!isPasswordExpanded)}
                className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-extrabold text-[11px] text-slate-850 dark:text-white uppercase tracking-wider">
                    {t.changePass}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                  <span className="text-[9.5px] font-bold">
                    {isPasswordExpanded ? (language === 'hi' ? 'छुपायें' : 'Minimize') : (language === 'hi' ? 'खोलें' : 'Expand')}
                  </span>
                  {isPasswordExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  )}
                </div>
              </button>

              {isPasswordExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-200">
                  <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{t.oldPass}</label>
                      <div className="relative">
                        <input
                          type={showOldPassword ? "text" : "password"}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="w-full bg-slate-55 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                        >
                          {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{t.newPass}</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-slate-55 dark:bg-slate-955 border border-slate-202 dark:border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-202 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{t.confirmPass}</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-slate-55 dark:bg-slate-955 border border-slate-202 dark:border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-850 dark:text-slate-202 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition cursor-pointer"
                    >
                      {t.updatePassBtn}
                    </button>
                  </form>
                </div>
              )}
            </div>

          </section>

        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 select-none pb-12 transition-colors duration-200 edu-grid-pattern relative">
      
      {/* Decorative Orbs */}
      <div className="absolute top-10 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-[60%] -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Dynamic Header */}
      <header className="h-16 sticky top-0 z-40 px-6 md:px-12 flex items-center justify-between shadow-sm glass-header transition-all duration-350">
        <Link href="/" className="flex items-center gap-2 text-slate-700 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-bold text-sm tracking-wide transition-colors">
          <ChevronRight className="h-4 w-4 rotate-180" /> {t.backToHome}
        </Link>
        
        <div className="flex items-center gap-4">
          {['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role) && (
            <Link href="/admin" className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 dark:text-white">
              <LayoutDashboard className="h-3.5 w-3.5 text-blue-500" /> {t.navAdmin}
            </Link>
          )}

          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
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

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 bg-red-100/50 dark:bg-red-950/20 border border-red-300 dark:border-red-900/40 hover:bg-red-200 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> {t.signOut}
          </button>
        </div>
      </header>

      {/* Main page content area */}
      <div className="max-w-6xl w-full mx-auto px-6 mt-8 flex flex-col lg:flex-row gap-8">        {/* Left Side: Summary Card */}
        <aside className="w-full lg:w-80 flex flex-col gap-6">
          
          {/* User profile recap */}
          <div className="glass-card glow-shadow-blue p-6 rounded-3xl text-center relative overflow-hidden transition-all duration-300">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>
            {/* Background watermarks */}
            <div className="absolute -bottom-8 -right-8 w-20 h-20 rounded-full bg-blue-600/5 pointer-events-none" />

            <div className="relative h-20 w-20 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-150 dark:from-blue-900/30 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center border border-blue-200 dark:border-blue-800/60 mb-4 text-2xl font-bold shadow-inner">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{currentUser.name}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-505 font-bold uppercase tracking-wider mt-1">{t.candidateCode}: {currentUser.candidateCode}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 truncate">{currentUser.email}</p>

            <div className="border-t border-slate-200 dark:border-slate-800 mt-5 pt-5 text-left space-y-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <span className="text-slate-500 dark:text-slate-500 font-bold">{t.sysRole}</span>
                <span className="bg-blue-100 border border-blue-300 text-blue-750 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  {currentUser.role}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <span className="text-slate-500 dark:text-slate-500 font-bold">{t.passSub}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  currentUser.subscriptionTier === 'Testbook Pass Pro'
                    ? 'bg-yellow-105/50 border-yellow-300 text-yellow-750 dark:bg-yellow-950/40 dark:border-yellow-700 dark:text-yellow-400'
                    : currentUser.subscriptionTier === 'Testbook Pass'
                    ? 'bg-green-105/50 border-green-300 text-green-750 dark:bg-green-950/40 dark:border-green-700 dark:text-green-400'
                    : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-500'
                }`}>
                  {currentUser.subscriptionTier === 'None' ? t.noPass : currentUser.subscriptionTier.replace('Testbook', language === 'hi' ? 'मॉक टेस्ट' : 'Mock Test')}
                </span>
              </div>

              {currentUser.subscriptionPurchasedAt && (
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span className="text-slate-500 dark:text-slate-500 font-bold">{t.passPurchased}</span>
                  <span className="text-slate-800 dark:text-slate-300 font-mono text-[11px]">{currentUser.subscriptionPurchasedAt}</span>
                </div>
              )}

              {currentUser.subscriptionExpiresAt && (
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span className="text-slate-500 dark:text-slate-500 font-bold">{t.passExpires}</span>
                  <span className="text-slate-800 dark:text-slate-300 font-mono text-[11px]">{currentUser.subscriptionExpiresAt}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <span className="text-slate-500 dark:text-slate-500 font-bold">{t.registeredOn}</span>
                <span className="text-slate-800 dark:text-slate-300 font-mono text-[11px] flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  {currentUser.registeredDate}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <span className="text-slate-500 dark:text-slate-500 font-bold flex items-center gap-1.5"><Coins className="h-4 w-4 text-yellow-650 dark:text-yellow-500" /> {t.coinsBalance}</span>
                <span className="text-yellow-650 dark:text-yellow-400 font-mono font-black text-sm">{currentUser.coins || 0} {t.coinsCount}</span>
              </div>

              {/* Referral Details block */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl mt-4">
                <p className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                  <Gift className="h-3 w-3 text-yellow-600 dark:text-yellow-500" /> {t.referralTitle}
                </p>
                <div className="flex items-center justify-between gap-2 mt-1.5 bg-white dark:bg-slate-950 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-white">
                  <span className="font-bold select-all">{currentUser.referralCode}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(currentUser.referralCode);
                      alert(language === 'hi' ? "रेफरल कोड क्लिपबोर्ड पर कॉपी किया गया!" : "Referral code copied to clipboard!");
                    }}
                    className="text-[9px] text-blue-600 dark:text-blue-400 font-bold hover:underline select-none cursor-pointer"
                  >
                    {language === 'hi' ? "कॉपी" : "Copy"}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-2.5 text-slate-500 dark:text-slate-400">
                  <span>{t.referralsCount}:</span>
                  <span className="font-bold text-blue-750 bg-blue-100 dark:text-white dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-300 dark:border-blue-900">{currentUser.referralsCount}</span>
                </div>
                {currentUser.referredBy && (
                  <div className="text-[9px] text-slate-500 mt-2">
                    {t.referredBy}: <span className="font-mono text-slate-600 dark:text-slate-400">{currentUser.referredBy}</span>
                  </div>
                )}
                <Link 
                  href="/referrals" 
                  className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-850 text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline select-none cursor-pointer"
                >
                  <span>{language === 'hi' ? "नियम और आमंत्रित मित्र देखें" : "View Rules & Referred Friends"}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

        </aside>

        {/* Right Side: Account Settings & Tracker */}
        <main className="flex-1 space-y-8">
          
          {/* SAVED & APPLIED JOBS TRACKER SECTION (DESKTOP) */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 shrink-0">
                  <BookmarkCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {language === 'hi' ? 'मेरे आवेदन किए गए और सेव किए गए जॉब्स' : 'My Applied & Saved Jobs Tracker'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Track your application dates, roll numbers, and saved alerts</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setJobFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    jobFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {language === 'hi' ? 'सभी' : 'All'} ({trackedJobs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setJobFilter('applied')}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                    jobFilter === 'applied'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {language === 'hi' ? 'आवेदन किया गया' : 'Applied'} ({trackedJobs.filter(j => j.isApplied).length})
                </button>
                <button
                  type="button"
                  onClick={() => setJobFilter('saved')}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                    jobFilter === 'saved'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                  }`}
                >
                  <Bookmark className="h-3 w-3" />
                  {language === 'hi' ? 'सेव किया गया' : 'Saved'} ({trackedJobs.filter(j => j.isSaved).length})
                </button>
              </div>
            </div>

            {trackedJobs.filter(j => jobFilter === 'all' ? true : (jobFilter === 'applied' ? j.isApplied : j.isSaved)).length > 0 ? (
              <div className="space-y-3">
                {trackedJobs
                  .filter(j => jobFilter === 'all' ? true : (jobFilter === 'applied' ? j.isApplied : j.isSaved))
                  .map((job: any) => (
                    <div 
                      key={job.noticeId}
                      className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-955 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 group hover:border-blue-300 dark:hover:border-blue-700 transition"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {job.isApplied && (
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Applied
                            </span>
                          )}
                          {job.isSaved && (
                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                              <Bookmark className="h-3 w-3 text-blue-600" /> Saved
                            </span>
                          )}
                          {job.appliedDate && (
                            <span className="text-[10px] text-slate-500 font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                              📅 Applied Date: {job.appliedDate}
                            </span>
                          )}
                          {job.applicationNo && (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-extrabold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                              Reg / Roll No: {job.applicationNo}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs sm:text-sm text-slate-850 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                          {job.title}
                        </h4>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold flex-wrap">
                          {job.date && <span>Notice Date: {job.date}</span>}
                          {job.lastDate && (
                            <span className="text-rose-600 font-bold uppercase tracking-wider">
                              Deadline: {job.lastDate}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60 dark:border-slate-800">
                        <Link
                          href={`/updates/${job.noticeId}`}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                        >
                          <span>View Details</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                        
                        <button
                          type="button"
                          onClick={() => setJobToRemove({ noticeId: job.noticeId, title: job.title })}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Remove from Tracker"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <BookmarkCheck className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {language === 'hi' ? 'अभी कोई सेव या आवेदन नहीं किया गया' : 'No saved or applied jobs yet'}
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  {language === 'hi'
                    ? 'अधिसूचनाओं पर जाएं और ट्रैक करने के लिए "Save Job" या "Mark as Applied" पर क्लिक करें।'
                    : 'Visit any notification announcement and click "Save Job" or "Mark as Applied" to track your applications here.'}
                </p>
                <Link
                  href="/updates"
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline pt-1"
                >
                  <span>{language === 'hi' ? 'सरकारी सूचनाएं ब्राउज़ करें' : 'Browse Government Notifications'}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </section>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card 1: Profile Details Form */}
            <div className="glass-card glow-shadow-blue p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden transition-all duration-300">
              <div>
                <h3 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" /> {t.updateDetails}
                </h3>
                
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.fullName}</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.emailAddr}</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.mobileNum}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Phone className="h-3.5 w-3.5" />
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-digit phone"
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs transition-all shadow-lg shadow-blue-900/20 active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" /> {t.saveProfileBtn}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Card 2: Password Update Form */}
            <div className="glass-card glow-shadow-purple p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden transition-all duration-300">
              <div>
                <h3 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-500" /> {t.changePass}
                </h3>
                
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.oldPass}</label>
                    <div className="relative">
                      <input
                        type={showOldPassword ? "text" : "password"}
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.newPass}</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.confirmPass}</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs transition-all shadow-lg shadow-blue-900/20 active:scale-95 cursor-pointer"
                    >
                      <KeyRound className="h-4 w-4" /> {t.updatePassBtn}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Card 3: Default Theme Settings */}
            <div className="glass-card glow-shadow-amber p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden transition-all duration-300">
              <div>
                <h3 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 flex items-center gap-2">
                  <Sun className="h-4 w-4 text-blue-500" /> {language === 'hi' ? 'डिफ़ॉल्ट थीम प्राथमिकता' : 'Default Theme Preference'}
                </h3>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed font-semibold">
                  {language === 'hi' ? 'अपनी डिफ़ॉल्ट विज़ुअल थीम प्राथमिकता कॉन्फ़िगर करें। सेटिंग तुरंत सहेज ली जाती है।' : 'Configure your default visual preference. The setting is saved instantly and applies globally.'}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      if (theme !== 'light') toggleTheme();
                    }}
                    type="button"
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs cursor-pointer transition active:scale-95 ${
                      theme === 'light'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300'
                    }`}
                  >
                    <Sun className="h-4 w-4" /> {language === 'hi' ? 'लाइट (सफेद)' : 'Light (White)'}
                  </button>
                  <button
                    onClick={() => {
                      if (theme !== 'dark') toggleTheme();
                    }}
                    type="button"
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs cursor-pointer transition active:scale-95 ${
                      theme === 'dark'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300'
                    }`}
                  >
                    <Moon className="h-4 w-4" /> {language === 'hi' ? 'डार्क' : 'Dark'}
                  </button>
                </div>
              </div>
            </div>

            {/* Card 4: Default Language Settings */}
            <div className="glass-card glow-shadow-green p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden transition-all duration-300">
              <div>
                <h3 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" /> {t.defaultLangCard}
                </h3>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed font-semibold">
                  {t.defaultLangDesc}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      if (language !== 'en') setLanguage('en');
                    }}
                    type="button"
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs cursor-pointer transition active:scale-95 ${
                      language === 'en'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300'
                    }`}
                  >
                    {t.enLang}
                  </button>
                  <button
                    onClick={() => {
                      if (language !== 'hi') setLanguage('hi');
                    }}
                    type="button"
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs cursor-pointer transition active:scale-95 ${
                      language === 'hi'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300'
                    }`}
                  >
                    {t.hiLang}
                  </button>
                </div>
              </div>
            </div>

          </div>

        </main>
      </div>

      {/* Toast Alert popup */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-green-800 text-green-400 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>{successMsg}</span>
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

            <div className="p-3.5 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-snug">
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
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition cursor-pointer shadow-md shadow-rose-600/20 active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>{language === 'hi' ? 'हाँ, हटाएं' : 'Yes, Remove Job'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
