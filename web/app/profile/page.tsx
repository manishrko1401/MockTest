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
  Clock,
  HelpCircle,
} from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { useIsMobile } from '../useIsMobile';
import { SiteHeader, SiteFooter, SectionCard, Field, PasswordInput, StatusBadge, btnPrimary, btnSecondary, inputCls } from '../components/SiteUI';
import ProfileTour, { requestProfileTourStart } from '../components/ProfileTour';

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

  const handleUpdatePassword = async (e: React.FormEvent) => {
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
    
    const { success: ok, error } = await updatePassword(oldPassword, newPassword);
    if (ok) {
      triggerToast('success', language === 'hi' ? 'पासवर्ड सफलतापूर्वक बदल दिया गया है!' : 'Account password successfully updated!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      triggerToast('error', language === 'hi' ? 'पुराना पासवर्ड गलत है।' : (error || 'Old password verification failed.'));
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
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] dark:bg-slate-950 px-4 font-sans">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 text-center">
          <div className="h-11 w-11 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <User className="h-5 w-5" />
          </div>
          <h1 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">{language === 'hi' ? 'लॉग इन आवश्यक है' : 'Please sign in'}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {language === 'hi' ? 'अपनी प्रोफ़ाइल देखने के लिए अपने खाते में लॉग इन करें।' : 'Sign in to your account to view and manage your profile.'}
          </p>
          <Link href="/auth" className={`${btnPrimary} w-full mt-5`}>{language === 'hi' ? 'लॉग इन करें' : 'Sign in'}</Link>
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
      label: language === 'hi' ? 'अवलोकन' : 'Overview',
      icon: LayoutDashboard,
      badge: null,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'details' as ProfileTab,
      label: language === 'hi' ? 'व्यक्तिगत जानकारी' : 'Personal information',
      icon: User,
      badge: null,
      color: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'security' as ProfileTab,
      label: language === 'hi' ? 'पासवर्ड और सुरक्षा' : 'Password & security',
      icon: Lock,
      badge: null,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'tracked-jobs' as ProfileTab,
      label: language === 'hi' ? 'सेव और आवेदन किए जॉब्स' : 'Saved & applied jobs',
      icon: BookmarkCheck,
      badge: trackedJobs.length > 0 ? trackedJobs.length : null,
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      id: 'subscription' as ProfileTab,
      label: language === 'hi' ? 'सदस्यता' : 'Membership',
      icon: Crown,
      badge: null,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'referrals' as ProfileTab,
      label: language === 'hi' ? 'रेफर और कमाएं' : 'Refer & earn',
      icon: Gift,
      badge: null,
      color: 'text-pink-600 dark:text-pink-400',
    },
    {
      id: 'preferences' as ProfileTab,
      label: language === 'hi' ? 'थीम और भाषा' : 'Theme & language',
      icon: Settings,
      badge: null,
      color: 'text-slate-600 dark:text-slate-400',
    },
  ];

  const hi = language === 'hi';
  const initials = currentUser.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const planLabel = isPassPro ? 'Pass Pro' : isPass ? 'Pass' : (hi ? 'निःशुल्क' : 'Free');
  const isStaff = ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role);

  const ClaimButton = !isPassPro ? (
    <button type="button" onClick={handleClaimPass} disabled={isClaiming} className={btnPrimary}>
      <Crown className="h-4 w-4" />
      {isClaiming ? (hi ? 'सक्रिय किया जा रहा है…' : 'Activating…') : (hi ? '1-वर्ष Pass Pro प्राप्त करें' : 'Claim 1-Year Pass Pro')}
    </button>
  ) : null;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f5f7fa] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">

      <SiteHeader />

      {/* ───── Account header ───── */}
      <div className="bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-1">
          <nav className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-800 dark:hover:text-slate-200">{hi ? 'होम' : 'Home'}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-700 dark:text-slate-300">{hi ? 'मेरा खाता' : 'My Account'}</span>
          </nav>
          <div data-tour="pf-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 rounded-full bg-[#1e4e79] text-white flex items-center justify-center text-lg font-semibold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-white truncate">{currentUser.name}</h1>
                  <StatusBadge tone={isPassPro ? 'amber' : isPass ? 'green' : 'slate'}>
                    {isPassPro && <Crown className="h-3 w-3" />}
                    {planLabel}
                  </StatusBadge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{currentUser.email}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t.candidateCode}: <span className="font-mono text-slate-700 dark:text-slate-300">{currentUser.candidateCode}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 sm:text-right" suppressHydrationWarning>
              <div>{t.registeredOn}</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{mounted ? (currentUser.registeredDate || '—') : '—'}</div>
              <button
                type="button"
                onClick={requestProfileTourStart}
                className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 hover:bg-[#eef3f8] hover:border-[#1e4e79]/40 hover:text-[#1e4e79] dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <HelpCircle className="h-4 w-4" />
                {hi ? 'यह कैसे काम करता है' : 'How it works'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile section tabs */}
        <div data-tour="pf-menu-m" className="md:hidden border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <div className="flex px-2">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-3 text-sm whitespace-nowrap border-b-2 cursor-pointer ${
                    isActive
                      ? 'border-[#1e4e79] text-[#1e4e79] dark:border-blue-400 dark:text-blue-300 font-medium'
                      : 'border-transparent text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ───── Body ───── */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 mt-6 flex flex-col md:flex-row gap-6 items-start">

        {/* Sidebar */}
        <aside data-tour="pf-menu" className="hidden md:block w-60 shrink-0 sticky top-20">
          <nav className="flex flex-col">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-[#1e4e79] dark:text-blue-300 font-medium border border-slate-200 dark:border-slate-800 shadow-[inset_3px_0_0_0_#1e4e79]'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#1e4e79] dark:text-blue-300' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge && (
                    <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 px-3 text-sm">
            <p className="font-medium text-slate-900 dark:text-white">{hi ? 'दस्तावेज़ लॉकर' : 'Document Locker'}</p>
            <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed text-[13px]">
              {hi ? 'आवेदन पत्र, एडमिट कार्ड और प्रमाणपत्र सुरक्षित रखें।' : 'Keep admit cards, application forms and certificates in one secure place.'}
            </p>
            <Link href="/locker" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-[#1e4e79] dark:text-blue-400 hover:underline">
              {hi ? 'लॉकर खोलें' : 'Open locker'} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>

        {/* Content */}
        <main data-tour="pf-content" className="flex-1 w-full min-w-0 space-y-6">

          {/* ───── Overview ───── */}
          {activeTab === 'overview' && (
            <>
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-200 dark:divide-slate-800">
                {[
                  { label: hi ? 'सदस्यता' : 'Membership', value: planLabel, icon: Crown },
                  { label: hi ? 'आवेदन किए गए जॉब्स' : 'Applied jobs', value: mounted ? appliedJobsCount : '—', icon: CheckCircle2 },
                  { label: t.coinsCount, value: mounted ? (currentUser.coins || 0) : '—', icon: Coins },
                  { label: t.referralsCount, value: mounted ? (currentUser.referralsCount || 0) : '—', icon: Share2 },
                ].map((s, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <s.icon className="h-4 w-4" />
                      {s.label}
                    </div>
                    <div className="mt-1.5 text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">{s.value}</div>
                  </div>
                ))}
              </section>

              <SectionCard
                title={hi ? 'सदस्यता योजना' : 'Membership plan'}
                description={hi ? 'आपकी वर्तमान योजना और उसकी वैधता' : 'Your current plan and its validity'}
                action={ClaimButton}
                bodyClass=""
              >
                <dl className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 text-sm">
                  <div className="px-5 sm:px-6 py-4">
                    <dt className="text-slate-500 dark:text-slate-400">{hi ? 'योजना' : 'Plan'}</dt>
                    <dd className="mt-1 font-medium text-slate-900 dark:text-white">{getDisplayTierName(currentUser.subscriptionTier)}</dd>
                  </div>
                  <div className="px-5 sm:px-6 py-4" suppressHydrationWarning>
                    <dt className="text-slate-500 dark:text-slate-400">{t.passPurchased}</dt>
                    <dd className="mt-1 font-medium text-slate-900 dark:text-white">{mounted ? (currentUser.subscriptionPurchasedAt || currentUser.registeredDate || '—') : '—'}</dd>
                  </div>
                  <div className="px-5 sm:px-6 py-4" suppressHydrationWarning>
                    <dt className="text-slate-500 dark:text-slate-400">{t.passExpires}</dt>
                    <dd className="mt-1 font-medium text-slate-900 dark:text-white">{mounted ? (currentUser.subscriptionExpiresAt || (isPassPro || isPass ? (hi ? '1 वर्ष की वैधता' : '1-year validity') : (hi ? 'कोई समाप्ति नहीं' : 'No expiry'))) : '—'}</dd>
                  </div>
                </dl>
              </SectionCard>

              <SectionCard
                title={hi ? 'हाल ही में ट्रैक की गई परीक्षाएं' : 'Recently tracked exams'}
                description={hi ? 'जिन भर्तियों को आपने सेव या आवेदन किया है' : 'Recruitments you have saved or applied for'}
                action={trackedJobs.length > 0 ? (
                  <button type="button" onClick={() => setActiveTab('tracked-jobs')} className="text-sm font-medium text-[#1e4e79] dark:text-blue-400 hover:underline cursor-pointer shrink-0">
                    {hi ? 'सभी देखें' : 'View all'}
                  </button>
                ) : undefined}
                bodyClass=""
              >
                {trackedJobs.length > 0 ? (
                  <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                    {trackedJobs.slice(0, 4).map((job) => (
                      <li key={job.noticeId} className="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{job.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            {job.isApplied && <StatusBadge tone="green">{hi ? 'आवेदन किया' : 'Applied'}</StatusBadge>}
                            {job.isSaved && !job.isApplied && <StatusBadge tone="blue">{hi ? 'सेव किया' : 'Saved'}</StatusBadge>}
                            {job.lastDate && <span>{hi ? 'अंतिम तिथि' : 'Last date'}: {job.lastDate}</span>}
                          </div>
                        </div>
                        <Link href={`/updates/${job.noticeId}`} className="text-sm font-medium text-[#1e4e79] dark:text-blue-400 hover:underline shrink-0">
                          {hi ? 'सूचना' : 'View notice'}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-6 py-10 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{hi ? 'अभी कोई परीक्षा ट्रैक नहीं की गई है।' : 'You have not tracked any exams yet.'}</p>
                    <Link href="/updates" className="mt-2 inline-block text-sm font-medium text-[#1e4e79] dark:text-blue-400 hover:underline">
                      {hi ? 'नवीनतम सूचनाएं देखें' : 'Browse latest notices'}
                    </Link>
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {/* ───── Personal information ───── */}
          {activeTab === 'details' && (
            <form onSubmit={handleUpdateProfile}>
              <SectionCard
                title={t.updateDetails}
                description={hi ? 'अपना नाम, ईमेल और मोबाइल नंबर अपडेट करें।' : 'Keep your name and contact details up to date.'}
                footer={<button type="submit" className={btnPrimary}>{t.saveProfileBtn}</button>}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
                  <Field label={t.fullName}>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoComplete="name" />
                  </Field>
                  <Field label={t.emailAddr}>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="email" />
                  </Field>
                  <Field label={t.mobileNum} hint={hi ? '10 अंकों का मोबाइल नंबर' : '10-digit Indian mobile number'}>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-500">+91</span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className={`${inputCls} rounded-l-none`}
                        autoComplete="tel-national"
                      />
                    </div>
                  </Field>
                  <div className="hidden sm:block" />
                  <Field label={t.candidateCode} hint={hi ? 'यह आईडी बदली नहीं जा सकती' : 'Assigned by the system and cannot be changed'}>
                    <input type="text" disabled value={currentUser.candidateCode} className={`${inputCls} font-mono`} />
                  </Field>
                  <Field label={t.registeredOn}>
                    <input type="text" disabled value={currentUser.registeredDate || '—'} className={inputCls} />
                  </Field>
                </div>
              </SectionCard>
            </form>
          )}

          {/* ───── Security ───── */}
          {activeTab === 'security' && (
            <form onSubmit={handleUpdatePassword}>
              <SectionCard
                title={t.changePass}
                description={hi ? 'अपने खाते को सुरक्षित रखने के लिए मज़बूत पासवर्ड का उपयोग करें।' : 'Use a strong password that you do not use on other websites.'}
                footer={<button type="submit" className={btnPrimary}><KeyRound className="h-4 w-4" />{t.updatePassBtn}</button>}
              >
                <div className="space-y-5 max-w-md">
                  <Field label={t.oldPass}>
                    <PasswordInput value={oldPassword} onChange={setOldPassword} show={showOldPassword} onToggle={() => setShowOldPassword(v => !v)} autoComplete="current-password" />
                  </Field>
                  <Field label={t.newPass} hint={hi ? 'कम से कम 6 वर्ण' : 'At least 6 characters'}>
                    <PasswordInput value={newPassword} onChange={setNewPassword} show={showNewPassword} onToggle={() => setShowNewPassword(v => !v)} autoComplete="new-password" />
                  </Field>
                  <Field label={t.confirmPass}>
                    <PasswordInput value={confirmPassword} onChange={setConfirmPassword} show={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} autoComplete="new-password" />
                  </Field>
                </div>
              </SectionCard>
            </form>
          )}

          {/* ───── Saved & applied jobs ───── */}
          {activeTab === 'tracked-jobs' && (
            <SectionCard
              title={hi ? 'सेव और आवेदन किए गए जॉब्स' : 'Saved & applied jobs'}
              description={hi ? 'अपनी आवेदन तिथियां और अंतिम तिथियां एक जगह ट्रैक करें।' : 'Track your applications and upcoming deadlines in one place.'}
              bodyClass=""
              footer={trackedJobs.length > 0 ? (
                <Link href="/profile/tracked-jobs" className={btnSecondary}>
                  {hi ? 'पूर्ण जॉब ट्रैकर खोलें' : 'Open full job tracker'}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : undefined}
            >
              <div className="px-5 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="inline-flex rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden text-sm w-fit">
                  {([
                    ['all', `${hi ? 'सभी' : 'All'} (${trackedJobs.length})`],
                    ['applied', `${hi ? 'आवेदन किया' : 'Applied'} (${appliedJobsCount})`],
                    ['saved', `${hi ? 'सेव किया' : 'Saved'} (${savedJobsCount})`],
                  ] as const).map(([id, label], i) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setJobFilter(id)}
                      className={`px-3 h-8 cursor-pointer ${i > 0 ? 'border-l border-slate-300 dark:border-slate-700' : ''} ${
                        jobFilter === id ? 'bg-[#1e4e79] text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    placeholder={hi ? 'परीक्षा या पद खोजें' : 'Search by exam or post'}
                    className={`${inputCls} h-8 pl-9`}
                  />
                </div>
              </div>

              {filteredTrackedJobs.length > 0 ? (
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredTrackedJobs.map((job) => (
                    <li key={job.noticeId} className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">{job.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          {job.isApplied && <StatusBadge tone="green"><CheckCircle2 className="h-3 w-3" />{hi ? 'आवेदन किया' : 'Applied'}</StatusBadge>}
                          {job.isSaved && <StatusBadge tone="blue"><Bookmark className="h-3 w-3" />{hi ? 'सेव किया' : 'Saved'}</StatusBadge>}
                          {job.appliedDate && <span>{hi ? 'आवेदन तिथि' : 'Applied on'}: {job.appliedDate}</span>}
                          {job.lastDate && <span className="text-red-700 dark:text-red-400 font-medium">{hi ? 'अंतिम तिथि' : 'Last date'}: {job.lastDate}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {job.isApplied && (
                          <Link href={`/locker?exam=${encodeURIComponent(job.title)}`} className={`${btnSecondary} h-8 px-3 text-[13px]`}>
                            <FolderLock className="h-3.5 w-3.5" />
                            {hi ? 'दस्तावेज़' : 'Documents'}
                          </Link>
                        )}
                        <Link href={`/updates/${job.noticeId}`} className={`${btnSecondary} h-8 px-3 text-[13px]`}>
                          {hi ? 'सूचना' : 'Notice'}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setJobToRemove({ noticeId: job.noticeId, title: job.title })}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          title={hi ? 'हटाएं' : 'Remove'}
                          aria-label={hi ? 'हटाएं' : 'Remove'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-12 text-center">
                  <BookmarkCheck className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                    {trackedJobs.length === 0
                      ? (hi ? 'आपने अभी तक कोई परीक्षा ट्रैक नहीं की है।' : 'You have not tracked any exams yet.')
                      : (hi ? 'कोई मिलती-जुलती परीक्षा नहीं मिली।' : 'No exams match your filter.')}
                  </p>
                  <Link href="/updates" className="mt-2 inline-block text-sm font-medium text-[#1e4e79] dark:text-blue-400 hover:underline">
                    {hi ? 'सरकारी सूचनाएं देखें' : 'Browse government notices'}
                  </Link>
                </div>
              )}
            </SectionCard>
          )}

          {/* ───── Pass membership ───── */}
          {activeTab === 'subscription' && (
            <>
              <SectionCard
                title={t.passSub}
                description={hi ? 'आपकी सक्रिय योजना, वैधता और लाभ' : 'Your active plan, validity and benefits'}
                footer={ClaimButton || undefined}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${isPassPro ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    <Crown className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{hi ? 'वर्तमान योजना' : 'Current plan'}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{getDisplayTierName(currentUser.subscriptionTier)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                      {isPassPro
                        ? (hi ? 'सभी 1,500+ CBT मॉक टेस्ट, कस्टम प्रश्न पत्र और तत्काल परिणाम विश्लेषण तक असीमित पहुंच।' : 'Unlimited access to all 1,500+ CBT mock tests, the custom question paper creator and instant result analysis.')
                        : isPass
                        ? (hi ? 'टेस्ट सीरीज़ और प्रश्न पत्रों तक मानक पहुंच।' : 'Standard access to test series and question papers.')
                        : (hi ? 'सभी सरकारी परीक्षाओं के असीमित टेस्ट के लिए Pass Pro पर अपग्रेड करें।' : 'Upgrade to Pass Pro to unlock unlimited tests across all government exams.')}
                    </p>
                  </div>
                </div>
                {(currentUser.subscriptionPurchasedAt || currentUser.subscriptionExpiresAt) && (
                  <dl className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-4 text-sm max-w-md">
                    {currentUser.subscriptionPurchasedAt && (
                      <div>
                        <dt className="text-slate-500 dark:text-slate-400">{t.passPurchased}</dt>
                        <dd className="mt-0.5 font-medium text-slate-900 dark:text-white">{currentUser.subscriptionPurchasedAt}</dd>
                      </div>
                    )}
                    {currentUser.subscriptionExpiresAt && (
                      <div>
                        <dt className="text-slate-500 dark:text-slate-400">{t.passExpires}</dt>
                        <dd className="mt-0.5 font-medium text-slate-900 dark:text-white">{currentUser.subscriptionExpiresAt}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </SectionCard>

              <SectionCard title={hi ? 'सदस्यता में शामिल' : "What's included"}>
                <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {[
                    '1,500+ official CBT mock tests (SSC, Railways, Banking, Teaching)',
                    'Custom mock paper generator based on your weak topics',
                    'Real NTA / SSC CBT simulator with countdown timer',
                    'Detailed section-wise score breakdown and analysis',
                    'Encrypted document locker',
                    'Daily government exam notifications and answer keys',
                  ].map((perk, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </>
          )}

          {/* ───── Refer & earn ───── */}
          {activeTab === 'referrals' && (
            <SectionCard
              title={t.referralTitle}
              description={hi ? 'मित्रों को आमंत्रित करें और सिक्के अर्जित करें।' : 'Invite friends to MockTest Hub and earn coins when they join.'}
              footer={
                <Link href="/referrals" className={btnSecondary}>
                  {hi ? 'रेफरल नियम देखें' : 'View referral rules'}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              }
            >
              <div className="max-w-lg">
                <Field label={hi ? 'आपका रेफरल कोड' : 'Your referral code'} hint={hi ? 'यह कोड अपने मित्रों के साथ साझा करें।' : 'Share this code with friends when they sign up.'}>
                  <div className="flex">
                    <input type="text" readOnly value={currentUser.referralCode} className={`${inputCls} rounded-r-none font-mono tracking-wider`} onFocus={(e) => e.target.select()} />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(currentUser.referralCode, 'ref_code')}
                      className="inline-flex items-center gap-1.5 px-4 rounded-r-md border border-l-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      {copiedKey === 'ref_code' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      {copiedKey === 'ref_code' ? (hi ? 'कॉपी हुआ' : 'Copied') : (hi ? 'कॉपी करें' : 'Copy')}
                    </button>
                  </div>
                </Field>
              </div>
              <dl className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-4 max-w-md text-sm">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">{t.referralsCount}</dt>
                  <dd className="mt-0.5 text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">{mounted ? (currentUser.referralsCount || 0) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">{t.coinsCount}</dt>
                  <dd className="mt-0.5 text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">{mounted ? (currentUser.coins || 0) : '—'}</dd>
                </div>
              </dl>
            </SectionCard>
          )}

          {/* ───── Preferences ───── */}
          {activeTab === 'preferences' && (
            <SectionCard
              title={hi ? 'थीम और भाषा' : 'Theme & language'}
              description={hi ? 'साइट की दिखावट और भाषा चुनें।' : 'Choose how the site looks and which language it uses.'}
            >
              <div className="space-y-6 max-w-2xl">
                {([
                  {
                    label: hi ? 'थीम' : 'Theme',
                    options: [
                      { key: 'light', title: hi ? 'लाइट' : 'Light', sub: hi ? 'सफ़ेद पृष्ठभूमि' : 'White background', icon: Sun, active: theme === 'light', onSelect: () => { if (theme !== 'light') toggleTheme(); } },
                      { key: 'dark', title: hi ? 'डार्क' : 'Dark', sub: hi ? 'आंखों के लिए आरामदायक' : 'Easier on the eyes at night', icon: Moon, active: theme === 'dark', onSelect: () => { if (theme !== 'dark') toggleTheme(); } },
                    ],
                  },
                  {
                    label: hi ? 'भाषा' : 'Language',
                    options: [
                      { key: 'en', title: t.enLang, sub: 'English interface and notices', icon: Globe, active: language === 'en', onSelect: () => { if (language !== 'en') setLanguage('en'); } },
                      { key: 'hi', title: t.hiLang, sub: 'हिन्दी इंटरफ़ेस और सूचनाएं', icon: Globe, active: language === 'hi', onSelect: () => { if (language !== 'hi') setLanguage('hi'); } },
                    ],
                  },
                ]).map((group) => (
                  <fieldset key={group.label}>
                    <legend className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{group.label}</legend>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {group.options.map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          onClick={o.onSelect}
                          aria-pressed={o.active}
                          className={`flex items-center gap-3 p-3.5 rounded-md border text-left cursor-pointer transition-colors ${
                            o.active
                              ? 'border-[#1e4e79] ring-1 ring-[#1e4e79] bg-[#1e4e79]/[0.03] dark:border-blue-400 dark:ring-blue-400 dark:bg-blue-400/5'
                              : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <o.icon className={`h-5 w-5 shrink-0 ${o.active ? 'text-[#1e4e79] dark:text-blue-300' : 'text-slate-400'}`} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-slate-900 dark:text-white">{o.title}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{o.sub}</span>
                          </span>
                          <span className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${o.active ? 'border-[#1e4e79] dark:border-blue-400' : 'border-slate-300 dark:border-slate-600'}`}>
                            {o.active && <span className="h-2 w-2 rounded-full bg-[#1e4e79] dark:bg-blue-400" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </SectionCard>
          )}
        </main>
      </div>

      <div className="h-12" />
      <SiteFooter />
      <ProfileTour ready={mounted} openSection={(section) => setActiveTab(section as ProfileTab)} />

      {/* ───── Toast ───── */}
      {(successMsg || errorMsg) && (
        <div role="status" className={`fixed bottom-5 right-5 z-50 max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 border-l-4 ${successMsg ? 'border-l-green-600' : 'border-l-red-600'} rounded-md shadow-lg px-4 py-3 flex items-start gap-2.5 text-sm text-slate-800 dark:text-slate-100`}>
          {successMsg
            ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
            : <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
          <span>{successMsg || errorMsg}</span>
        </div>
      )}

      {/* ───── Remove tracked job dialog ───── */}
      {jobToRemove && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full shadow-xl">
            <div className="px-6 pt-5 pb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {hi ? 'ट्रैकर से परीक्षा हटाएं?' : 'Remove from tracker?'}
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                {hi
                  ? `क्या आप '${jobToRemove.title}' को अपने ट्रैकर से हटाना चाहते हैं?`
                  : `'${jobToRemove.title}' will be removed from your saved and applied jobs.`}
              </p>
            </div>
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 rounded-b-lg flex justify-end gap-2">
              <button type="button" onClick={() => setJobToRemove(null)} className={btnSecondary}>
                {hi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => { removeTrackedJob(jobToRemove.noticeId); setJobToRemove(null); }}
                className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium cursor-pointer"
              >
                {hi ? 'हाँ, हटाएं' : 'Remove'}
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
