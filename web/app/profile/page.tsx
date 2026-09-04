"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Lock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  KeyRound,
  Gift,
  Phone,
  Sun,
  Moon,
  Globe,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  Coins,
  Trophy,
  Bookmark,
  BookmarkCheck,
  ArrowUpRight,
  Trash2,
  FolderLock,
  Copy,
  Check,
  Briefcase,
  Sparkles,
  Award,
  Crown,
  Settings,
  Mail,
  Share2,
  ExternalLink,
  Shield,
  Layers,
  Search,
  Clock
} from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { useIsMobile } from '../useIsMobile';

type ProfileTab = 'overview' | 'details' | 'security' | 'tracked-jobs' | 'subscription' | 'referrals' | 'preferences';

function ProfileContent() {
  const { currentUser, updateProfile, updatePassword, updateTrackedJobs, logout, theme, toggleTheme, language, setLanguage, claimPassPro } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = TRANSLATIONS[language];
  const { isMobile } = useIsMobile();
  const [mounted, setMounted] = useState(false);

  // Set mounted after hydration to avoid SSR/client mismatches on user-specific data
  useEffect(() => { setMounted(true); }, []);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  // Sync tab from query param if available
  useEffect(() => {
    const tabParam = searchParams.get('tab') as ProfileTab;
    if (tabParam && ['overview', 'details', 'security', 'tracked-jobs', 'subscription', 'referrals', 'preferences'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Tracked Jobs State (Saved & Applied)
  const [trackedJobs, setTrackedJobs] = useState<any[]>([]);
  const [jobFilter, setJobFilter] = useState<'all' | 'applied' | 'saved'>('all');
  const [jobSearch, setJobSearch] = useState('');
  const [jobToRemove, setJobToRemove] = useState<{ noticeId: string; title: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Profile Edit Inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');

  // Password Edit Inputs
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Toast status states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setMobile(currentUser.mobile || '');
      setTrackedJobs(currentUser.trackedJobs || []);
    }
  }, [currentUser]);

  const triggerToast = (type: 'success' | 'error', msg: string) => {
    setErrorMsg(type === 'error' ? msg : null);
    setSuccessMsg(type === 'success' ? msg : null);
    setTimeout(() => {
      setErrorMsg(null);
      setSuccessMsg(null);
    }, 3000);
  };

  const copyToClipboard = (text: string, key: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      triggerToast('success', language === 'hi' ? 'क्लिपबोर्ड पर कॉपी किया गया!' : 'Copied to clipboard!');
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !mobile.trim()) {
      triggerToast('error', language === 'hi' ? 'कृपया सभी फ़ील्ड भरें।' : 'Fields cannot be empty.');
      return;
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      triggerToast('error', language === 'hi' ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }
    updateProfile(name.trim(), email.trim(), mobile.trim());
    triggerToast('success', language === 'hi' ? 'प्रोफ़ाइल विवरण सफलतापूर्वक अपडेट किए गए!' : 'Profile details updated successfully!');
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      triggerToast('error', language === 'hi' ? 'पासवर्ड फ़ील्ड खाली नहीं हो सकते।' : 'Password fields cannot be empty.');
      return;
    }
    if (newPassword.length < 6) {
      triggerToast('error', language === 'hi' ? 'पासवर्ड कम से कम 6 वर्णों का होना चाहिए।' : 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast('error', language === 'hi' ? 'नए पासवर्ड मेल नहीं खाते।' : 'New passwords do not match.');
      return;
    }
    
    const ok = updatePassword(oldPassword, newPassword);
    if (ok) {
      triggerToast('success', language === 'hi' ? 'पासवर्ड सफलतापूर्वक बदल दिया गया है!' : 'Account password successfully updated!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      triggerToast('error', language === 'hi' ? 'पुराना पासवर्ड गलत है।' : 'Old password verification failed.');
    }
  };

  const removeTrackedJob = (noticeId: string) => {
    if (!currentUser) return;
    try {
      const updated = trackedJobs.filter(j => j.noticeId !== noticeId);
      setTrackedJobs(updated);
      updateTrackedJobs(updated);
      triggerToast('success', language === 'hi' ? 'जॉब ट्रैकर से हटा दिया गया।' : 'Job removed from tracker.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = () => {
    router.push('/');
    setTimeout(() => logout(), 100);
  };

  const handleClaimPass = async () => {
    if (!currentUser || isClaiming) return;
    setIsClaiming(true);
    try {
      const res = await claimPassPro(currentUser.id, 'Testbook Pass Pro');
      if (res.success) {
        triggerToast('success', language === 'hi' ? 'बधाई हो! 1-Year MockTest Hub Pass Pro सक्रिय हो गया है!' : 'Success! 1-Year MockTest Hub Pass Pro has been activated!');
      } else {
        triggerToast('error', res.error || 'Claim failed.');
      }
    } catch (e) {
      console.error(e);
      triggerToast('error', 'Claim failed.');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
        <div className="text-center p-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl max-w-sm shadow-xl space-y-4">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-200 dark:border-red-800">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="font-extrabold text-base uppercase tracking-wider">Authentication Required</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
            Please log in to your account to view and manage your profile dashboard.
          </p>
          <Link
            href="/auth"
            className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg active:scale-95"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  const isPassPro = (currentUser.subscriptionTier as string) === 'Testbook Pass Pro' || (currentUser.subscriptionTier as string) === 'MockTest Hub Pass Pro';
  const isPass = (currentUser.subscriptionTier as string) === 'Testbook Pass' || (currentUser.subscriptionTier as string) === 'MockTest Hub Pass';

  const getDisplayTierName = (tier: string) => {
    if (tier === 'Testbook Pass Pro' || tier === 'MockTest Hub Pass Pro') return 'Pass Pro';
    if (tier === 'Testbook Pass' || tier === 'MockTest Hub Pass') return 'Pass';
    if (tier === 'None') return language === 'hi' ? 'निःशुल्क स्टार्टर प्लान' : 'Free Tier';
    return tier.replace(/Testbook/gi, '').replace(/MockTest\s*Hub/gi, '').trim() || 'Pass Pro';
  };

  const appliedJobsCount = trackedJobs.filter(j => j.isApplied).length;
  const savedJobsCount = trackedJobs.filter(j => j.isSaved).length;

  const filteredTrackedJobs = trackedJobs
    .filter(j => (jobFilter === 'all' ? true : jobFilter === 'applied' ? j.isApplied : j.isSaved))
    .filter(j => !jobSearch.trim() || j.title.toLowerCase().includes(jobSearch.toLowerCase().trim()));

  const menuItems = [
    {
      id: 'overview' as ProfileTab,
      label: language === 'hi' ? 'अवलोकन और डैशबोर्ड' : 'Overview & Dashboard',
      icon: LayoutDashboard,
      badge: null,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'details' as ProfileTab,
      label: language === 'hi' ? 'व्यक्तिगत जानकारी' : 'Personal Information',
      icon: User,
      badge: null,
      color: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'security' as ProfileTab,
      label: language === 'hi' ? 'सुरक्षा और पासवर्ड' : 'Security & Password',
      icon: Lock,
      badge: null,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'tracked-jobs' as ProfileTab,
      label: language === 'hi' ? 'ट्रैक की गई परीक्षाएं' : 'Saved & Applied Jobs',
      icon: BookmarkCheck,
      badge: trackedJobs.length > 0 ? trackedJobs.length : null,
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      id: 'subscription' as ProfileTab,
      label: language === 'hi' ? 'पास सदस्यता' : 'Pass Membership',
      icon: Crown,
      badge: isPassPro ? 'PRO' : isPass ? 'PASS' : null,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'referrals' as ProfileTab,
      label: language === 'hi' ? 'रेफर और कमाएं' : 'Refer & Earn Rewards',
      icon: Gift,
      badge: currentUser.coins ? `${currentUser.coins} C` : null,
      color: 'text-pink-600 dark:text-pink-400',
    },
    {
      id: 'preferences' as ProfileTab,
      label: language === 'hi' ? 'थीम और भाषा' : 'Theme & Language',
      icon: Settings,
      badge: null,
      color: 'text-slate-600 dark:text-slate-400',
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-200/90 dark:bg-slate-900 font-sans min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-200 relative pb-16 overflow-x-hidden">
      
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-10 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-[60%] -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header matching Test Series Page */}
      <header className="h-18 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-40 shadow-xs">
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
            <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">
              <span>{language === 'hi' ? 'सूचनाएं एवं अपडेट्स' : 'Notices & Announcements'}</span>
            </Link>
            <Link href="/locker" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">
              <span>{language === 'hi' ? 'दस्तावेज़ लॉकर' : 'Document Locker'}</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role) && (
            <Link
              href="/admin"
              className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-blue-500" />
              <span>{t.navAdmin}</span>
            </Link>
          )}

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2 py-1.5 lg:px-2.5 lg:py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800"
            title={theme === 'light' ? t.themeDark : t.themeLight}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
          </button>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200/80 dark:border-red-900/50 text-red-600 dark:text-red-400 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer active:scale-95 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.signOut}</span>
          </button>
        </div>
      </header>

      {/* MOBILE TAB SELECTOR (Horizontal scrollable bar) */}
      <div className="md:hidden sticky top-18 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2 shadow-xs">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800/80'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : item.color}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MAIN MASTER-DETAIL LAYOUT */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
        
        {/* LEFT SIDEBAR NAVIGATION SECTION */}
        <aside className="w-full md:w-72 lg:w-80 shrink-0 space-y-5">
          
          {/* USER MINI PROFILE HERO CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs relative overflow-hidden transition-all duration-300 flex flex-col justify-between h-auto md:h-[152px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* User Info Row */}
            <div className="relative z-10 flex items-center gap-3 min-w-0">
              <div className="relative h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0 border border-white dark:border-slate-800">
                {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                {isPassPro && (
                  <div className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 p-0.5 rounded-full shadow-xs" title="Pass Pro Member">
                    <Crown className="h-2.5 w-2.5" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{currentUser.name}</h3>
                  <span className={`text-[9px] font-medium uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                    isPassPro
                      ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300'
                      : isPass
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
                      : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                  }`}>
                    {isPassPro ? 'Pass Pro' : isPass ? 'Pass' : 'Free'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                    ID: {currentUser.candidateCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Balances Row */}
            <div className="relative z-10 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="bg-slate-50 dark:bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                  <Coins className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 font-medium uppercase truncate leading-none">{t.coinsCount}</p>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white font-mono leading-tight mt-0.5">{currentUser.coins || 0}</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
                  <BookmarkCheck className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 font-medium uppercase truncate leading-none">{language === 'hi' ? 'ट्रैक्ड' : 'Tracked'}</p>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white font-mono leading-tight mt-0.5">{trackedJobs.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* DESKTOP MENU NAVIGATION LIST */}
          <nav className="hidden md:flex flex-col gap-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-3 shadow-xs">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3 py-2">
              {language === 'hi' ? 'खाता सेटिंग्स' : 'Account Navigation'}
            </p>

            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 translate-x-1'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'text-white translate-x-0.5' : 'text-slate-400'}`} />
                  </div>
                </button>
              );
            })}
          </nav>

          {/* QUICK SHORTCUTS CARD */}
          <div className="hidden md:block bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-blue-500/10 border border-purple-200/60 dark:border-purple-900/40 rounded-3xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FolderLock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-black text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                {language === 'hi' ? 'दस्तावेज़ लॉकर' : 'Document Locker Vault'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {language === 'hi'
                ? 'अपने आवेदन पत्र, एडमिट कार्ड और प्रमाणपत्र सुरक्षित रखें।'
                : 'Safely store and access your exam registration cards, roll numbers, and certificates.'}
            </p>
            <Link
              href="/locker"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <span>{language === 'hi' ? 'वॉल्ट खोलें' : 'Open Vault'}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

        </aside>

        {/* RIGHT CONTENT DETAIL PANELS */}
        <main className="flex-1 w-full min-w-0 space-y-6">

          {/* =========================================================================
              TAB 1: OVERVIEW & DASHBOARD
             ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
              
              {/* WELCOME BANNER WITH EMBEDDED PASS DETAILS (COMPACT) */}
              <div className="bg-blue-600 dark:bg-blue-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-sm border border-blue-500/30 relative overflow-hidden flex flex-col justify-between h-auto md:h-[152px]">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-medium tracking-tight text-white">
                      {language === 'hi' ? `नमस्ते, ${currentUser.name}` : `Welcome, ${currentUser.name}`}
                    </h2>
                  </div>

                  {!isPassPro && (
                    <button
                      onClick={handleClaimPass}
                      disabled={isClaiming}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-medium shadow-sm transition active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      <Crown className="h-3.5 w-3.5" />
                      <span>{isClaiming ? 'Activating...' : (language === 'hi' ? '1-Year Pass Pro प्राप्त करें' : 'Claim 1-Year Pass Pro')}</span>
                    </button>
                  )}
                </div>

                {/* PASS DETAILS COMPACT STRIP */}
                <div className="relative z-10 bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-white">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                      <Crown className="h-4 w-4 text-amber-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-normal text-blue-100/80 uppercase tracking-wider">
                        {language === 'hi' ? 'पास योजना' : 'Active Plan'}
                      </p>
                      <p className="text-xs sm:text-sm font-medium truncate text-white mt-0.5">
                        {getDisplayTierName(currentUser.subscriptionTier)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 border-t sm:border-t-0 sm:border-l border-white/15 pt-2 sm:pt-0 sm:pl-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-blue-200" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-normal text-blue-100/80 uppercase tracking-wider">
                        {t.passPurchased}
                      </p>
                      <p className="text-xs font-normal truncate text-white/95 mt-0.5" suppressHydrationWarning>
                        {mounted ? (currentUser.subscriptionPurchasedAt || currentUser.registeredDate || 'N/A') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 border-t sm:border-t-0 sm:border-l border-white/15 pt-2 sm:pt-0 sm:pl-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-amber-200" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-normal text-blue-100/80 uppercase tracking-wider">
                        {t.passExpires}
                      </p>
                      <p className="text-xs font-normal truncate text-white/95 mt-0.5" suppressHydrationWarning>
                        {mounted ? (currentUser.subscriptionExpiresAt || (isPassPro || isPass ? '1-Year Full Validity' : 'No Expiry')) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* STATS 4-GRID */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xs space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase text-slate-400">{language === 'hi' ? 'सदस्यता स्तर' : 'Membership'}</p>
                    <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                      {isPassPro ? 'Pass Pro' : isPass ? 'Pass' : 'Free Tier'}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xs space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <BookmarkCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">{language === 'hi' ? 'आवेदन किए गए जॉब्स' : 'Applied Jobs'}</p>
                    <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">
                      {appliedJobsCount}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xs space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">{t.coinsCount}</p>
                    <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">
                      {currentUser.coins || 0}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xs space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                    <Share2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">{t.referralsCount}</p>
                    <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">
                      {currentUser.referralsCount || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* RECENT TRACKED JOBS PREVIEW */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <BookmarkCheck className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider">
                      {language === 'hi' ? 'हाल ही में ट्रैक की गई परीक्षाएं' : 'Recent Tracked & Saved Exams'}
                    </h3>
                  </div>

                  <button
                    onClick={() => setActiveTab('tracked-jobs')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{language === 'hi' ? 'सभी देखें' : 'View All'}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {trackedJobs.length > 0 ? (
                  <div className="space-y-3">
                    {trackedJobs.slice(0, 3).map((job) => (
                      <div
                        key={job.noticeId}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {job.isApplied && (
                              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                                Applied
                              </span>
                            )}
                            {job.isSaved && (
                              <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                                Saved
                              </span>
                            )}
                            {job.appliedDate && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                📅 {job.appliedDate}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-xs text-slate-800 dark:text-white truncate">
                            {job.title}
                          </h4>
                        </div>

                        <Link
                          href={`/updates/${job.noticeId}`}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 transition"
                        >
                          Details
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs space-y-1 font-medium">
                    <p>{language === 'hi' ? 'अभी कोई जॉब ट्रैक नहीं किया गया है।' : 'No exams tracked yet.'}</p>
                    <Link href="/updates" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                      {language === 'hi' ? 'सरकारी सूचनाएं देखें' : 'Browse Live Notices'}
                    </Link>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB 2: PERSONAL INFORMATION
             ========================================================================= */}
          {activeTab === 'details' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>{t.updateDetails}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'hi' ? 'अपना नाम, ईमेल और मोबाइल नंबर अपडेट करें।' : 'Manage your official candidate name, registered email, and mobile contact.'}
                </p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      {t.fullName}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      {t.emailAddr}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t.mobileNum}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-xs text-slate-400 font-mono font-bold">+91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile number"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Readonly Identity Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">{t.candidateCode}</p>
                    <p className="text-xs font-mono font-black text-slate-800 dark:text-slate-200 mt-0.5">{currentUser.candidateCode}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">{t.registeredOn}</p>
                    <p className="text-xs font-mono font-black text-slate-800 dark:text-slate-200 mt-0.5">{currentUser.registeredDate || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl text-xs shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t.saveProfileBtn}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =========================================================================
              TAB 3: SECURITY & PASSWORD
             ========================================================================= */}
          {activeTab === 'security' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.changePass}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'hi' ? 'अपने खाते को सुरक्षित रखने के लिए समय-समय पर पासवर्ड बदलें।' : 'Ensure your candidate account is secure with a strong unique password.'}
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t.oldPass}
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? "text" : "password"}
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-4 pr-11 py-3 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t.newPass}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-4 pr-11 py-3 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t.confirmPass}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-4 pr-11 py-3 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>{t.updatePassBtn}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =========================================================================
              TAB 4: TRACKED & APPLIED JOBS
             ========================================================================= */}
          {activeTab === 'tracked-jobs' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <BookmarkCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span>{language === 'hi' ? 'मेरे आवेदन किए गए और सेव किए गए जॉब्स' : 'Saved & Applied Jobs Tracker'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'hi' ? 'आवेदन तिथि, पासवर्ड और दस्तावेज़ एक जगह पर ट्रैक करें।' : 'Track and manage your application dates, roll numbers, and deadlines.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setJobFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      jobFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    All ({trackedJobs.length})
                  </button>
                  <button
                    onClick={() => setJobFilter('applied')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                      jobFilter === 'applied'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Applied ({appliedJobsCount})
                  </button>
                  <button
                    onClick={() => setJobFilter('saved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                      jobFilter === 'saved'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                    }`}
                  >
                    <Bookmark className="h-3 w-3" />
                    Saved ({savedJobsCount})
                  </button>
                </div>
              </div>

              {/* SEARCH FILTER */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  placeholder={language === 'hi' ? 'परीक्षा या पद का नाम खोजें...' : 'Search tracked jobs by exam title...'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* JOB CARDS LIST */}
              {filteredTrackedJobs.length > 0 ? (
                <div className="space-y-3.5">
                  {filteredTrackedJobs.map((job) => (
                    <div
                      key={job.noticeId}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 space-y-3 hover:border-blue-400 dark:hover:border-blue-600 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {job.isApplied && (
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Applied
                            </span>
                          )}
                          {job.isSaved && (
                            <span className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                              <Bookmark className="h-3 w-3" /> Saved
                            </span>
                          )}
                          {job.appliedDate && (
                            <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                              📅 Applied: {job.appliedDate}
                            </span>
                          )}
                        </div>

                        {job.isApplied && (
                          <Link
                            href={`/locker?exam=${encodeURIComponent(job.title)}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-200 transition shrink-0"
                          >
                            <FolderLock className="h-3.5 w-3.5" />
                            <span>Vault Files</span>
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 min-w-0">
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                          {job.title}
                        </h4>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/updates/${job.noticeId}`}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                          >
                            <span>Notice</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => setJobToRemove({ noticeId: job.noticeId, title: job.title })}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {job.lastDate && (
                        <p className="text-[10.5px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">
                          Deadline: {job.lastDate}
                        </p>
                      )}
                    </div>
                  ))}

                  <div className="pt-2">
                    <Link
                      href="/profile/tracked-jobs"
                      className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition"
                    >
                      <span>{language === 'hi' ? 'पूर्ण ट्रैक किए गए जॉब्स पोर्टल खोलें' : 'Open Full Tracked Jobs Portal'}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                  <BookmarkCheck className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {language === 'hi' ? 'कोई परीक्षा नहीं मिली।' : 'No matching tracked exams found.'}
                  </p>
                  <Link
                    href="/updates"
                    className="inline-flex items-center gap-1 text-xs font-black text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>{language === 'hi' ? 'सरकारी सूचनाएं ब्राउज़ करें' : 'Browse Live Govt Updates'}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}

            </div>
          )}

          {/* =========================================================================
              TAB 5: MEMBERSHIP & PASSES
             ========================================================================= */}
          {activeTab === 'subscription' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
              
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <span>{t.passSub}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'hi' ? 'अपनी सक्रिय योजना, वैधता और अनलॉक किए गए लाभ देखें।' : 'View your active plan, benefits, and subscription validity.'}
                </p>
              </div>

              {/* CURRENT TIER BANNER CARD */}
              <div className={`p-6 rounded-3xl border relative overflow-hidden ${
                isPassPro
                  ? 'bg-gradient-to-br from-amber-500/15 via-yellow-500/5 to-slate-50 dark:to-slate-950 border-amber-300 dark:border-amber-700/80 shadow-md shadow-amber-500/5'
                  : isPass
                  ? 'bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-slate-50 dark:to-slate-950 border-emerald-300 dark:border-emerald-700/80 shadow-md shadow-emerald-500/5'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {language === 'hi' ? 'वर्तमान सक्रिय योजना' : 'Current Active Plan'}
                    </span>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      {isPassPro && <Crown className="h-6 w-6 text-amber-500" />}
                      <span>{getDisplayTierName(currentUser.subscriptionTier)}</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isPassPro
                        ? 'Unlimited access to all 1,500+ CBT Mock Tests, Custom Question Paper Creator, and Instant Result Analytics.'
                        : isPass
                        ? 'Standard access to test series and question papers.'
                        : 'Upgrade to MockTest Hub Pass Pro to unlock unlimited tests across all government exams.'}
                    </p>
                  </div>

                  {!isPassPro && (
                    <button
                      onClick={handleClaimPass}
                      disabled={isClaiming}
                      className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-black shadow-md transition active:scale-95 shrink-0 flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{isClaiming ? 'Activating...' : (language === 'hi' ? '1-Year MockTest Hub Pass Pro प्राप्त करें' : 'Claim 1-Year MockTest Hub Pass Pro')}</span>
                    </button>
                  )}
                </div>

                {/* Validity Details */}
                {(currentUser.subscriptionPurchasedAt || currentUser.subscriptionExpiresAt) && (
                  <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                    {currentUser.subscriptionPurchasedAt && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{t.passPurchased}</p>
                        <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{currentUser.subscriptionPurchasedAt}</p>
                      </div>
                    )}
                    {currentUser.subscriptionExpiresAt && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{t.passExpires}</p>
                        <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{currentUser.subscriptionExpiresAt}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* UNLOCKED BENEFITS CHECKLIST */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  {language === 'hi' ? 'शामिल विशेषताएं और लाभ' : 'Included Membership Perks'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    '1,500+ Official CBT Mock Tests (SSC, Railways, Banking, Teaching)',
                    'Custom Mock Paper Generator tailored to weak topics',
                    'Real NTA / SSC CBT Simulator with countdown timers',
                    'Comprehensive Sectional Score Breakdown & Analytics',
                    'Encrypted Document Locker & Credential Vault',
                    'Daily live govt exam notifications & answer key releases',
                  ].map((perk, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB 6: REFER & EARN
             ========================================================================= */}
          {activeTab === 'referrals' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
              
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Gift className="h-5 w-5 text-pink-500" />
                  <span>{t.referralTitle}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'hi' ? 'मित्रों को आमंत्रित करें और सिक्के व विशेष पुरस्कार अर्जित करें।' : 'Invite friends to Mock Test Hub and earn coins and exclusive bonus perks.'}
                </p>
              </div>

              {/* REFERRAL CODE BOX */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-slate-50 dark:to-slate-950 border border-pink-200/80 dark:border-pink-900/40 space-y-4">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {language === 'hi' ? 'आपका व्यक्तिगत रेफरल कोड' : 'Your Personal Referral Code'}
                </p>

                <div className="flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-base font-mono font-black text-slate-900 dark:text-white tracking-widest select-all">
                    {currentUser.referralCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(currentUser.referralCode, 'ref_code')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === 'ref_code' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === 'ref_code' ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">{t.referralsCount}</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white font-mono">{currentUser.referralsCount || 0}</p>
                  </div>
                  <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">{t.coinsCount}</p>
                    <p className="text-lg font-black text-yellow-600 dark:text-yellow-400 font-mono">{currentUser.coins || 0}</p>
                  </div>
                </div>
              </div>

              <Link
                href="/referrals"
                className="inline-flex items-center justify-between w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400 transition"
              >
                <span>{language === 'hi' ? 'पूर्ण रेफरल नियम और लीडरबोर्ड देखें' : 'View Full Referral Rules & Rewards Portal'}</span>
                <ChevronRight className="h-4 w-4" />
              </Link>

            </div>
          )}

          {/* =========================================================================
              TAB 7: THEME & LANGUAGE PREFERENCES
             ========================================================================= */}
          {activeTab === 'preferences' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-8 animate-in fade-in slide-in-from-right-2 duration-200">
              
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-slate-500" />
                  <span>{language === 'hi' ? 'थीम और भाषा प्राथमिकताएं' : 'Theme & Language Preferences'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'hi' ? 'अपनी दृश्य थीम और इंटरफ़ेस भाषा अनुकूलित करें।' : 'Customize your default visual theme and preferred site language.'}
                </p>
              </div>

              {/* THEME PICKER */}
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">
                  {language === 'hi' ? 'थीम का चयन करें' : 'Select Visual Theme'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => { if (theme !== 'light') toggleTheme(); }}
                    className={`p-5 rounded-3xl border-2 flex items-center gap-4 transition-all cursor-pointer text-left ${
                      theme === 'light'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-md shadow-blue-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
                      <Sun className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{language === 'hi' ? 'लाइट थीम' : 'Light Mode'}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Crisp, high-contrast white interface</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                    className={`p-5 rounded-3xl border-2 flex items-center gap-4 transition-all cursor-pointer text-left ${
                      theme === 'dark'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-md shadow-blue-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 shrink-0">
                      <Moon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{language === 'hi' ? 'डार्क थीम' : 'Dark Mode'}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Sleek, eye-friendly dark styling</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* LANGUAGE PICKER */}
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">
                  {language === 'hi' ? 'भाषा का चयन करें' : 'Select Interface Language'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => { if (language !== 'en') setLanguage('en'); }}
                    className={`p-5 rounded-3xl border-2 flex items-center gap-4 transition-all cursor-pointer text-left ${
                      language === 'en'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-md shadow-blue-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 font-black text-sm">
                      EN
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{t.enLang}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">English interface & notices</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { if (language !== 'hi') setLanguage('hi'); }}
                    className={`p-5 rounded-3xl border-2 flex items-center gap-4 transition-all cursor-pointer text-left ${
                      language === 'hi'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-md shadow-blue-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0 font-black text-sm">
                      हिं
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{t.hiLang}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">हिन्दी भाषा में अनुवादित पोर्टल</p>
                    </div>
                  </button>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* FLOATING TOAST NOTIFICATION */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-emerald-800 text-emerald-400 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-rose-800 text-rose-400 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom duration-300">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
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
                  {language === 'hi' ? 'ट्रैकर से परीक्षा हटाएं?' : 'Remove Exam from Tracker?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  {language === 'hi' 
                    ? `क्या आप '${jobToRemove.title}' को अपने ट्रैकर से हटाना चाहते हैं?` 
                    : `Are you sure you want to remove '${jobToRemove.title}' from your tracker?`}
                </p>
              </div>
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
                <span>{language === 'hi' ? 'हाँ, हटाएं' : 'Yes, Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function StudentProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
