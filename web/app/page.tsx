"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import Link from 'next/link';
import HomeSupportWidget from './components/HomeSupportWidget';
import { useRouter } from 'next/navigation';
import { ShieldCheck, GraduationCap, ChevronRight, Award, Trophy, Users, User, CheckCircle, Search, Info, Calendar, Bell, HelpCircle, UserCheck, Sun, Moon, FileText, X, Menu, LogOut, LayoutDashboard, Gift, Sparkles, TrendingUp, Coins, BookOpen, MapPin, MessageSquare, Send, Lightbulb, Target } from 'lucide-react';
import { TRANSLATIONS } from './translations';
import { getLocalizedName } from './lib/examUtils';
import { useIsMobile } from './useIsMobile';
import VocabSection from './components/VocabSection';

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
    { id: 'bssc_cgl_mock', name: 'Bihar SSC CGL (Graduate Level) Practice Set' }
  ],
  banking: [
    { id: 'sbi_po_prelims', name: 'SBI PO Preliminary Exam Full Length Mock Test' },
    { id: 'sbi_clerk_pre', name: 'SBI Clerk Prelims Speed Builder Set' }
  ]
};

const CATEGORIES = [
  { id: 'ssc', name: 'SSC Exams', desc: 'SSC CGL, CHSL, MTS, GD Constable', count: '45+ Tests' },
  { id: 'railways', name: 'Railways Exams', desc: 'RRB NTPC, Group D, ALP', count: '30+ Tests' },
  { id: 'ugc_net', name: 'UGC NET Exams', desc: 'Paper 1 & Paper 2 CS/Arts', count: '15+ Tests' },
  { id: 'teaching', name: 'Teaching Exams', desc: 'CTET Paper 1, Paper 2, State TET', count: '20+ Tests' },
  { id: 'state_exams', name: 'All State Exams', desc: 'UPPSC, BSSC, MPSC, RAS', count: '35+ Tests' },
  { id: 'banking', name: 'Banking Exams', desc: 'SBI PO, Clerk, IBPS PO, Clerk', count: '40+ Tests' },
  { id: 'upsc', name: 'UPSC CSE Exams', desc: 'IAS, IPS, IFS, Civil Services GS', count: '50+ Tests' },
  { id: 'defence', name: 'Defence Exams', desc: 'NDA, CDS, AFCAT, CAPF', count: '25+ Tests' },
  { id: 'engineering', name: 'Engineering Exams', desc: 'GATE, AE/JE Civil/Mech/EE', count: '40+ Tests' },
  { id: 'mba', name: 'MBA Entrance Exams', desc: 'CAT, XAT, SNAP, NMAT', count: '15+ Tests' }
];

const SUCCESS_STORIES = [
  {
    id: 's1',
    name: 'Aniket Verma',
    exam: 'SSC CGL 2025 (Excise Inspector)',
    initials: 'AV',
    quote: "Pass Pro was absolute key for my prep. The custom state machine of the test simulator exactly models the live CBT screen. I gave 50 sittings and cleared CGL easily!"
  },
  {
    id: 's2',
    name: 'Surbhi Mishra',
    exam: 'SBI PO 2025 (Probationary Officer)',
    initials: 'SM',
    quote: "Sectional Speed analytics inside the profile screen showed me exactly where I was spending too much time (Quantitative Aptitude). Resetting attempts let me re-verify my weak topics."
  },
  {
    id: 's3',
    name: 'Karan Mehra',
    exam: 'UGC NET 2025 (Assistant Professor)',
    initials: 'KM',
    quote: "Paper-1 was a massive hurdle for me. Giving mock tests on a platform that simulates the actual bilingual pattern (English & Hindi) of UGC NET gave me immense confidence on exam day."
  }
];

const isNewlyPublished = (publishDateStr?: string) => {
  if (!publishDateStr) return false;
  try {
    const now = new Date();
    const pubDate = new Date(publishDateStr);
    pubDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(now.getTime() - pubDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  } catch (e) {
    return false;
  }
};

const getWebCategoryStyle = (id: string) => {
  const nid = id.toLowerCase();
  if (nid.includes('ssc')) {
    return {
      bg: 'bg-orange-50/70 hover:bg-orange-100/80 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/40 hover:border-orange-300 dark:hover:border-orange-700/60 shadow-orange-100/10 dark:shadow-none hover:shadow-md hover:shadow-orange-150/15',
      iconBg: 'bg-orange-100/80 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
      icon: 'Award',
      accentText: 'text-orange-600 dark:text-orange-400',
      btnAccent: 'text-orange-600 dark:text-orange-400 border-orange-200/60 dark:border-orange-900/30',
    };
  }
  if (nid.includes('railway')) {
    return {
      bg: 'bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700/60 shadow-indigo-100/10 dark:shadow-none hover:shadow-md hover:shadow-indigo-150/15',
      iconBg: 'bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
      icon: 'TrendingUp',
      accentText: 'text-indigo-600 dark:text-indigo-400',
      btnAccent: 'text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-900/30',
    };
  }
  if (nid.includes('banking') || nid.includes('bank')) {
    return {
      bg: 'bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700/60 shadow-emerald-100/10 dark:shadow-none hover:shadow-md hover:shadow-emerald-150/15',
      iconBg: 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
      icon: 'Coins',
      accentText: 'text-emerald-600 dark:text-emerald-400',
      btnAccent: 'text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/30',
    };
  }
  if (nid.includes('teaching') || nid.includes('tet') || nid.includes('ctet')) {
    return {
      bg: 'bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700/60 shadow-amber-100/10 dark:shadow-none hover:shadow-md hover:shadow-amber-150/15',
      iconBg: 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
      icon: 'BookOpen',
      accentText: 'text-amber-600 dark:text-amber-400',
      btnAccent: 'text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/30',
    };
  }
  if (nid.includes('ugc') || nid.includes('net')) {
    return {
      bg: 'bg-sky-50/70 hover:bg-sky-100/80 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/40 hover:border-sky-300 dark:hover:border-sky-700/60 shadow-sky-100/10 dark:shadow-none hover:shadow-md hover:shadow-sky-150/15',
      iconBg: 'bg-sky-100/80 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400',
      icon: 'GraduationCap',
      accentText: 'text-sky-600 dark:text-sky-400',
      btnAccent: 'text-sky-600 dark:text-sky-400 border-sky-200/60 dark:border-sky-900/30',
    };
  }
  if (nid.includes('upsc') || nid.includes('civil')) {
    return {
      bg: 'bg-teal-50/70 hover:bg-teal-100/80 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/40 hover:border-teal-300 dark:hover:border-teal-700/60 shadow-teal-100/10 dark:shadow-none hover:shadow-md hover:shadow-teal-150/15',
      iconBg: 'bg-teal-100/80 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400',
      icon: 'ShieldCheck',
      accentText: 'text-teal-600 dark:text-teal-400',
      btnAccent: 'text-teal-600 dark:text-teal-400 border-teal-200/60 dark:border-teal-900/30',
    };
  }
  if (nid.includes('def') || nid.includes('defence') || nid.includes('military')) {
    return {
      bg: 'bg-cyan-50/70 hover:bg-cyan-100/80 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/40 hover:border-cyan-300 dark:hover:border-cyan-700/60 shadow-cyan-100/10 dark:shadow-none hover:shadow-md hover:shadow-cyan-150/15',
      iconBg: 'bg-cyan-100/80 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400',
      icon: 'ShieldCheck',
      accentText: 'text-cyan-600 dark:text-cyan-400',
      btnAccent: 'text-cyan-600 dark:text-cyan-400 border-cyan-200/60 dark:border-cyan-900/30',
    };
  }
  if (nid.includes('eng') || nid.includes('gate') || nid.includes('engineering')) {
    return {
      bg: 'bg-purple-50/70 hover:bg-purple-100/80 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/40 hover:border-purple-300 dark:hover:border-purple-700/60 shadow-purple-100/10 dark:shadow-none hover:shadow-md hover:shadow-purple-150/15',
      iconBg: 'bg-purple-100/80 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
      icon: 'GraduationCap',
      accentText: 'text-purple-600 dark:text-purple-400',
      btnAccent: 'text-purple-600 dark:text-purple-400 border-purple-200/60 dark:border-purple-900/30',
    };
  }
  if (nid.includes('mba') || nid.includes('cat') || nid.includes('entrance')) {
    return {
      bg: 'bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-700/60 shadow-rose-100/10 dark:shadow-none hover:shadow-md hover:shadow-rose-150/15',
      iconBg: 'bg-rose-100/80 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
      icon: 'BookOpen',
      accentText: 'text-rose-600 dark:text-rose-400',
      btnAccent: 'text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/30',
    };
  }

  return {
    bg: 'bg-pink-50/70 hover:bg-pink-100/80 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/40 hover:border-pink-300 dark:hover:border-pink-700/60 shadow-pink-100/10 dark:shadow-none hover:shadow-md hover:shadow-pink-150/15',
    iconBg: 'bg-pink-100/80 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400',
    icon: 'MapPin',
    accentText: 'text-pink-600 dark:text-pink-400',
    btnAccent: 'text-pink-600 dark:text-pink-400 border-pink-200/60 dark:border-pink-900/30',
  };
};

export default function HomeLandingPage() {
  const { currentUser, logout, theme, toggleTheme, noticesList, language, setLanguage, claimPassPro, examCatalog } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];
  
  const [successIndex, setSuccessIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [showCongratsPopup, setShowCongratsPopup] = useState(false);
  const [claiming, setClaiming] = useState(false);

const formatSubCategoryName = (name: string) => {
  let cleanName = name
    .replace(/\s*(?:2025|2026)\s*/g, ' ')
    .split(' - ')[0]
    .split(' (')[0]
    .replace(/(?:Full-Length|Full Length|Practice|Simulator|Mock|Paper-I|Paper-II|Paper 1|Paper-1|Paper 2|Paper-II|Test Paper|Teaching & Research Aptitude|Computer Science & Applications)/gi, '')
    .trim();
  
  // Specific fallbacks to make sure it looks short and recognizable
  if (name.includes('Paper-1') || name.includes('Paper 1')) cleanName += ' Paper 1';
  if (name.includes('Paper-II') || name.includes('Paper 2')) cleanName += ' Paper 2';
  if (name.includes('Paper-I') || name.includes('Paper 1')) cleanName += ' Paper 1';
  
  return cleanName || name;
};

  const testSeriesCatalog = React.useMemo(() => {
    return [...(examCatalog || [])].sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [examCatalog]);

  const displayCategories = React.useMemo(() => {
    const adminCatalog = examCatalog || [];
    // Show popular categories added by admin (isPopular === true)
    const popularOnly = adminCatalog.filter((c: any) => c.isPopular === true);
    const targetCatalog = popularOnly.length > 0 ? popularOnly : adminCatalog;

    return [...targetCatalog]
      .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      .map(c => ({
        id: c.id,
        name: c.name,
        nameHi: c.nameHi,
        desc: c.description || '',
        count: c.countText || (c.subCategories?.length ? `${c.subCategories.length} Exams` : '0 Exams'),
        logoUrl: c.logoUrl || null,
        subCategories: [...(c.subCategories || [])].sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      }));
  }, [examCatalog]);

  const handleClaimPassPro = async () => {
    if (!currentUser) return;
    setClaiming(true);
    try {
      const res = await claimPassPro(currentUser.id, 'Testbook Pass Pro');
      if (res.success) {
        alert(language === 'hi' ? 'बधाई हो! आपका 1 वर्ष का मॉक टेस्ट पास प्रो सफलतापूर्वक सक्रिय कर दिया गया है।' : 'Success! Your 1-Year Mock Test Pass Pro has been claimed and activated.');
        setShowCongratsPopup(false);
        router.push('/profile');
      } else {
        alert(res.error || 'Claim failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Claim failed. Please try again.');
    } finally {
      setClaiming(false);
    }
  };
  
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
      quoteHi: n.titleHi,
      gradient: n.url || 'from-blue-600 to-cyan-500',
      photoUrl: n.imageUrl
    }));

  const testimonials: any[] = dbTestimonials.length > 0 ? dbTestimonials : SUCCESS_STORIES;

  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const activeAnnouncements = (noticesList || []).filter(n => n.category === 'announcement');

  React.useEffect(() => {
    if (activeAnnouncements.length <= 1) return;
    const timer = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % activeAnnouncements.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [activeAnnouncements.length]);

  React.useEffect(() => {
    if (!currentUser) {
      setShowCongratsPopup(false);
      return;
    }

    if (currentUser.subscriptionTier === 'Testbook Pass Pro') {
      setShowCongratsPopup(false);
      return;
    }

    // Show popup every time on load/refresh if user hasn't claimed 1-Year Pass Pro yet
    const timer = setTimeout(() => {
      setShowCongratsPopup(true);
    }, 1500); // 1.5s delay for smooth page rendering

    return () => clearTimeout(timer);
  }, [currentUser?.id, currentUser?.subscriptionTier]);

  const { isMobile, isMounted } = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileUpdateTab, setMobileUpdateTab] = useState<'notice' | 'result' | 'admit_card'>('notice');

  // Screen back navigation screen-by-screen logic for mobile view
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

  const handleToggleExpandCategory = (catId: string) => {
    setExpandedCategoryId(prev => prev === catId ? null : catId);
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#menu') {
        setMobileMenuOpen(true);
      } else {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Initial check
    const initialHash = window.location.hash;
    if (initialHash) {
      handleHashChange();
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const activeTopper = testimonials[successIndex] || testimonials[0] || SUCCESS_STORIES[0];

  if (!isMounted) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 items-center justify-center">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 overflow-x-hidden relative transition-colors duration-200 mobile-fade-in">
        {/* Mobile Orbs */}
        <div className="absolute top-10 -left-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-[50%] -right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <header className="h-14 border-b border-slate-200 dark:border-slate-900 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between shadow-sm">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-1.5 rounded-full shadow-sm flex items-center justify-center h-8 w-8 border border-blue-200/50 dark:border-slate-700 shrink-0">
              <Trophy className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="font-extrabold text-xs leading-none text-slate-900 dark:text-white tracking-wider truncate">{t.logoTitle}</h1>
              <p className="text-[7px] text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase mt-0.5 leading-none truncate">{t.logoSub}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Login / Profile Header Action Button */}
            {currentUser ? (
              <Link
                href="/profile"
                className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 text-[11px] font-extrabold flex items-center gap-1.5 active:scale-95 transition"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>{language === 'hi' ? 'प्रोफाइल' : 'Profile'}</span>
              </Link>
            ) : (
              <Link
                href="/auth"
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[11px] font-extrabold flex items-center gap-1.5 active:scale-95 transition shadow-xs"
              >
                <User className="h-3.5 w-3.5" />
                <span>{t.logIn}</span>
              </Link>
            )}

            {/* Hamburger Button */}
            <button
              onClick={() => handleToggleMenu(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-800 active:scale-95 cursor-pointer"
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
                    {(language === 'hi' && notice.titleHi) ? notice.titleHi : notice.title} ({notice.date})
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
              {currentUser && ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role) && (
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
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{currentUser.candidateCode?.replace('CGL', 'HUB-id')}</p>
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

        {/* HERO SECTION - MOBILE VIEW */}
        <main className="flex-1 flex flex-col p-3 sm:p-4 space-y-4 relative z-10 edu-grid-pattern">
          {/* Floating Mobile Background Art Elements */}
          <div className="absolute top-12 left-4 opacity-[0.06] dark:opacity-[0.04] animate-float pointer-events-none">
            <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10M6 10h10M6 14h10" />
            </svg>
          </div>

          <div className="absolute top-[32%] right-4 opacity-[0.06] dark:opacity-[0.04] animate-float-delayed pointer-events-none">
            <svg className="w-9 h-9 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
            </svg>
          </div>

          {/* 1. ANNOUNCEMENT BANNER PANEL (Fits Banner Completely, Details at Bottom) */}
          <section className="border border-blue-200/80 dark:border-blue-900/50 rounded-2xl flex flex-col justify-between min-h-[240px] bg-slate-950 text-white shadow-md relative overflow-hidden transition-all duration-300">
            {activeAnnouncements.length > 1 && (
              <div className="absolute top-2.5 right-2.5 z-30 flex gap-1 items-center bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-sm">
                {activeAnnouncements.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAnnouncementIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      announcementIndex === idx ? 'bg-blue-400 w-4' : 'bg-white/40 w-1.5'
                    }`}
                  />
                ))}
              </div>
            )}

            {activeAnnouncements.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <Bell className="h-6 w-6 text-slate-500 mb-1" />
                <p className="text-[11px] font-semibold">
                  {language === 'hi' ? 'वर्तमान में कोई सक्रिय घोषणाएं नहीं हैं।' : 'No active announcements at the moment.'}
                </p>
              </div>
            ) : (
              (() => {
                const ann = activeAnnouncements[announcementIndex] || activeAnnouncements[0];
                return (
                  <div className="flex-1 flex flex-col justify-between h-full w-full animate-in fade-in duration-200 bg-slate-950">
                    {/* Banner Image Container - Fits 100% of Image Without Cropping */}
                    <div className="flex-1 w-full relative min-h-[170px] max-h-[220px] flex items-center justify-center bg-slate-950 p-1.5 overflow-hidden">
                      {ann.imageUrl && ann.imageUrl.trim() ? (
                        <img
                          src={ann.imageUrl.trim().replace(/^http:\/\//i, 'https://')}
                          alt={ann.title}
                          className="w-full h-full object-contain max-h-[210px] rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[160px] rounded-lg bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4 text-center space-y-1">
                          <Bell className="h-8 w-8 text-blue-400 animate-bounce" />
                          <h3 className="font-extrabold text-xs text-white line-clamp-2">{ann.title}</h3>
                        </div>
                      )}
                    </div>

                    {/* Small Announcement Info Footer at Bottom (Does NOT Block Banner) */}
                    <div className="shrink-0 w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-2.5 px-3 flex items-center justify-between gap-2 z-20">
                      <div className="flex-1 min-w-0 space-y-0.5 text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="bg-blue-600/90 text-white font-black text-[8px] px-2 py-0.5 rounded border border-blue-400/30 uppercase tracking-wider">
                            {ann.type || 'ANNOUNCEMENT'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5 text-blue-400" /> {ann.date}
                          </span>
                          {ann.lastDate && (
                            <span className="text-[8.5px] font-black text-red-400 flex items-center gap-1 bg-red-950/70 border border-red-800/40 px-1.5 py-0.5 rounded">
                              <span className="h-1 w-1 rounded-full bg-red-500 animate-ping inline-block" />
                              {language === 'hi' ? 'अंतिम तिथि: ' : 'Last: '}{ann.lastDate}
                            </span>
                          )}
                        </div>

                        <h4 className="font-extrabold text-[10px] text-white leading-tight line-clamp-1">
                          {language === 'hi' && ann.titleHi ? ann.titleHi : ann.title}
                        </h4>
                      </div>

                      {ann.url ? (
                        <a
                          href={ann.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-lg transition active:scale-95 shrink-0 cursor-pointer"
                        >
                          <span>{language === 'hi' ? 'विवरण' : 'Details'}</span>
                          <ChevronRight className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })()
            )}
          </section>

          {/* 2. CENTERED HERO TITLE SECTION */}
          <section className="text-center pt-2 pb-2 space-y-3 relative z-10 flex flex-col items-center justify-center">
            
            {/* Completely Wide Limited Time Offer Banner at Top */}
            <div className="w-full bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 dark:from-amber-500/20 dark:to-red-500/20 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-2.5 px-3 flex items-center justify-between gap-2 shadow-xs relative overflow-hidden group">
              <div className="flex items-center gap-2 z-10">
                <div className="bg-amber-500 text-white p-1 rounded-md shrink-0 animate-bounce">
                  <Trophy className="h-3.5 w-3.5" />
                </div>
                <div className="text-left leading-tight">
                  <p className="text-[10px] font-extrabold text-slate-800 dark:text-amber-300 uppercase tracking-wide">
                    {language === 'hi' ? 'सीमित समय का ऑफर!' : 'Limited Time Offer!'}
                  </p>
                  <p className="text-[9px] text-slate-600 dark:text-slate-350 font-medium">
                    {language === 'hi' 
                      ? 'रजिस्टर करें और पाएं Pass Pro!' 
                      : 'Register before 31 Dec 2026 & get Pass Pro!'}
                  </p>
                </div>
              </div>
              <Link
                href={currentUser ? "/profile" : "/auth?tab=signup"}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-[9px] uppercase tracking-wider shrink-0 transition-transform active:scale-95 z-10 shadow-xs"
              >
                {language === 'hi' ? 'दावा करें' : 'Claim Now'}
              </Link>
            </div>

            {/* For Students, By Students Badge Below Offer Banner */}
            <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 font-extrabold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider shadow-xs">
              {t.heroBadge}
            </span>

            {/* Centered Hero Title */}
            <h1 className="text-base sm:text-lg font-black leading-tight text-slate-900 dark:text-white tracking-tight max-w-xs mx-auto">
              {t.heroTitlePrefix}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">
                {t.heroTitleSuffix}
              </span>
            </h1>

            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed font-semibold max-w-xs mx-auto">
              {t.heroDesc}
            </p>

            {/* Test Series Primary Action Button */}
            <div className="pt-1">
              <Link
                href="/mock-tests"
                className="w-full max-w-[180px] bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
              >
                <BookOpen className="h-4 w-4" />
                <span>{language === 'hi' ? 'टेस्ट सीरीज देखें' : 'Explore Test Series'}</span>
              </Link>
            </div>

          </section>

          {/* POPULAR CATEGORIES */}
          <section className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-900 relative z-10">
            <div className="text-center max-w-sm mx-auto">
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">{t.popularTitle}</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">{t.popularDesc}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {displayCategories.map(cat => {
                const style = getWebCategoryStyle(cat.id);
                const IconComponent = 
                  cat.id.includes('ssc') ? Award :
                  cat.id.includes('railways') ? TrendingUp :
                  cat.id.includes('banking') ? Coins :
                  cat.id.includes('teaching') ? BookOpen :
                  cat.id.includes('ugc_net') ? GraduationCap :
                  cat.id.includes('upsc') ? ShieldCheck :
                  cat.id.includes('defence') ? ShieldCheck :
                  cat.id.includes('engg') || cat.id.includes('engineering') ? GraduationCap : MapPin;
                const shadowStyle = 
                  cat.id.includes('ssc') ? 'glow-shadow-amber' :
                  cat.id.includes('railways') ? 'glow-shadow-blue' :
                  cat.id.includes('banking') ? 'glow-shadow-green' :
                  cat.id.includes('teaching') ? 'glow-shadow-amber' :
                  cat.id.includes('ugc_net') ? 'glow-shadow-blue' : 'glow-shadow-purple';

                return (
                  <Link
                    key={cat.id}
                    href={`/mock-tests?cat=${cat.id}`}
                    className={`border p-3.5 rounded-2xl flex flex-col justify-between group transition-all duration-300 text-left w-full relative overflow-hidden active:scale-[0.98] cursor-pointer ${style.bg} ${shadowStyle}`}
                  >
                    {/* Decorative background circle art (watermark) */}
                    <div className="absolute -top-6 -right-6 w-14 h-14 rounded-full bg-current opacity-[0.03] dark:opacity-[0.015] pointer-events-none group-hover:scale-110 transition-transform duration-300" />
                    
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-2.5">
                        {cat.logoUrl ? (
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                            <img
                              src={cat.logoUrl}
                              alt={`${cat.name} logo`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className={`p-2 rounded-lg ${style.iconBg}`}>
                            <IconComponent className="h-4 w-4 animate-pulse" />
                          </div>
                        )}
                        <span className={`text-[9px] font-black tracking-wider ${style.accentText}`}>
                          {cat.count}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white mb-1 line-clamp-1">{getLocalizedName(cat, language)}</h4>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight font-semibold line-clamp-2">{cat.desc}</p>
                    </div>

                    <div className={`flex items-center justify-between font-bold text-[8px] uppercase tracking-wider mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/40 w-full ${style.accentText}`}>
                      <span>{t.exploreTests}</span>
                      <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* MOBILE VOCABULARY BOOSTER SECTION REMOVED FOR MOBILE VIEW AS REQUESTED */}

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
                
                <div className="space-y-3">
                  {noticesList.filter(n => n.category === mobileUpdateTab).length > 0 ? (
                    [...noticesList]
                      .filter(n => n.category === mobileUpdateTab)
                      .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                      .slice(0, 6)
                      .map(notice => {
                      const noticeStyle = 
                        notice.category === 'notice' ? 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30 border-l-4 border-l-blue-500' :
                        notice.category === 'result' ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30 border-l-4 border-l-emerald-500' :
                        notice.category === 'admit_card' ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30 border-l-4 border-l-amber-500' :
                        'bg-purple-50/40 dark:bg-purple-950/10 border-purple-100 dark:border-purple-900/30 border-l-4 border-l-purple-500';

                      return (
                        <div
                          key={notice.id}
                          className={`p-3 rounded-xl border flex flex-col gap-1 shadow-sm transition-all duration-200 hover:scale-[1.015] ${noticeStyle}`}
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
                                {(language === 'hi' && notice.titleHi) ? notice.titleHi : notice.title}
                                <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                              </a>
                            ) : (
                              (language === 'hi' && notice.titleHi) ? notice.titleHi : notice.title
                            )}
                          </h5>
                          <p className="text-[8px] text-red-500 font-extrabold mt-0.5 uppercase tracking-wider">
                            {t.lastDate} {notice.lastDate || (language === 'hi' ? 'उपलब्ध नहीं' : 'N/A')}
                          </p>
                        </div>
                      );
                    })
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
          <div className="mt-2 flex items-center justify-center gap-3">
            <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 font-bold transition">Privacy Policy</Link>
          </div>
        </footer>



        {/* NEW SIGNUP CONGRATULATIONS POPUP (MOBILE VIEW ONLY) */}
        {showCongratsPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
              {/* Background design accents */}
              <div className="absolute -top-10 -right-10 w-36 h-36 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>

              {/* Close cross */}
              <button
                onClick={() => {
                  setShowCongratsPopup(false);
                  sessionStorage.setItem('dismissed_congrats_popup', 'true');
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-55 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 transition"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header Icon */}
              <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-950/60 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-900/40 mb-6 shadow-inner relative">
                <Gift className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-bounce" />
                <Sparkles className="h-4 w-4 text-yellow-500 dark:text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>

              {/* Content */}
              <div className="text-center space-y-2">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  {language === 'hi' ? 'बधाई हो! 🎉' : 'Congratulations! 🎉'}
                </h2>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  {language === 'hi' ? 'मॉक टेस्ट हब टीम से उपहार' : 'Gift from Mock Test Hub Team'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 px-2 pt-2 leading-relaxed">
                  {language === 'hi'
                    ? 'आपके खाते में 1 वर्ष का मॉक टेस्ट पास प्रो (Premium Plan) सक्रिय कर दिया गया है! अब आप सभी प्रीमियम परीक्षाओं का उपयोग कर सकते हैं।'
                    : 'A 1-Year Mock Test Pass Pro subscription has been credited to your account! Explore all features and premium tests immediately.'}
                </p>
              </div>

              {/* Unlocked Benefits list */}
              <div className="mt-6 p-4 bg-slate-55 dark:bg-slate-955/60 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-950/40 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-extrabold text-[10px] shrink-0 mt-0.5">🔓</div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                      {language === 'hi' ? 'असीमित मॉक टेस्ट्स' : 'Unlimited Premium Tests'}
                    </h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {language === 'hi' ? 'सभी एसएससी, बैंकिंग, रेलवे और राज्य स्तरीय प्रीमियम टेस्ट अनलॉक हैं।' : 'Access all SSC, Banking, Railways & State level exams without restriction.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-950/40 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-extrabold text-[10px] shrink-0 mt-0.5">📝</div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                      {language === 'hi' ? 'कस्टम टेस्ट क्रिएटर' : 'Custom Paper Creator'}
                    </h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {language === 'hi' ? 'अपने कमजोर विषयों के अनुसार स्वयं के प्रश्न-पत्र तैयार करें।' : 'Build customizable exam papers focused on your weak subjects.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-950/40 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-extrabold text-[10px] shrink-0 mt-0.5">📊</div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                      {language === 'hi' ? 'पूर्ण स्पीड और गति विश्लेषक' : 'Advanced Speed Analytics'}
                    </h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {language === 'hi' ? 'अपने डैशबोर्ड पर सेक्शनल टाइम, स्पीड और तुलनात्मक परिणाम देखें।' : 'Track sectional timing averages and topper comparative speed details.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="mt-6">
                <button
                  onClick={handleClaimPassPro}
                  disabled={claiming}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3.5 rounded-2xl text-xs transition active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20 uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {claiming ? (
                    <span>{language === 'hi' ? 'प्रोसेसिंग...' : 'Processing...'}</span>
                  ) : (
                    <>
                      <Gift className="h-4.5 w-4.5 animate-pulse" />
                      <span>{language === 'hi' ? '1 वर्ष का पास प्रो दावा करें (Claim Now) 🎁' : 'Claim 1 Year Pass Pro 🎁'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showCongratsPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
            {/* Background design accents */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>

            {/* Close cross */}
            <button
              onClick={() => {
                setShowCongratsPopup(false);
                sessionStorage.setItem('dismissed_congrats_popup', 'true');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-55 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header Icon */}
            <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-950/60 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-900/40 mb-6 shadow-inner relative">
              <Gift className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-bounce" />
              <Sparkles className="h-4 w-4 text-yellow-500 dark:text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            </div>

            {/* Content */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                {language === 'hi' ? 'बधाई हो! 🎉' : 'Congratulations! 🎉'}
              </h2>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                {language === 'hi' ? 'मॉक टेस्ट हब टीम से उपहार' : 'Gift from Mock Test Hub Team'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 px-2 pt-2 leading-relaxed">
                {language === 'hi'
                  ? 'आपके खाते में 1 वर्ष का मॉक टेस्ट पास प्रो (Premium Plan) सक्रिय कर दिया गया है! अब आप सभी प्रीमियम परीक्षाओं का उपयोग कर सकते हैं।'
                  : 'A 1-Year Mock Test Pass Pro subscription has been credited to your account! Explore all features and premium tests immediately.'}
              </p>
            </div>

            {/* Unlocked Benefits list */}
            <div className="mt-6 p-4 bg-slate-55 dark:bg-slate-955/60 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-950/40 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-extrabold text-[10px] shrink-0 mt-0.5">🔓</div>
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                    {language === 'hi' ? 'असीमित मॉक टेस्ट्स' : 'Unlimited Premium Tests'}
                  </h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {language === 'hi' ? 'सभी एसएससी, बैंकिंग, रेलवे और राज्य स्तरीय प्रीमियम टेस्ट अनलॉक हैं।' : 'Access all SSC, Banking, Railways & State level exams without restriction.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-950/40 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-extrabold text-[10px] shrink-0 mt-0.5">📝</div>
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                    {language === 'hi' ? 'कस्टम टेस्ट क्रिएटर' : 'Custom Paper Creator'}
                  </h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {language === 'hi' ? 'अपने कमजोर विषयों के अनुसार स्वयं के प्रश्न-पत्र तैयार करें।' : 'Build customizable exam papers focused on your weak subjects.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-950/40 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-extrabold text-[10px] shrink-0 mt-0.5">📊</div>
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                    {language === 'hi' ? 'पूर्ण स्पीड और गति विश्लेषक' : 'Advanced Speed Analytics'}
                  </h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {language === 'hi' ? 'अपने डैशबोर्ड पर सेक्शनल टाइम, स्पीड और तुलनात्मक परिणाम देखें।' : 'Track sectional timing averages and topper comparative speed details.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="mt-6">
              <button
                onClick={handleClaimPassPro}
                disabled={claiming}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3.5 rounded-2xl text-xs transition active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20 uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {claiming ? (
                  <span>{language === 'hi' ? 'प्रोसेसिंग...' : 'Processing...'}</span>
                ) : (
                  <>
                    <Gift className="h-4.5 w-4.5 animate-pulse" />
                    <span>{language === 'hi' ? '1 वर्ष का पास प्रो दावा करें (Claim Now) 🎁' : 'Claim 1 Year Pass Pro 🎁'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Support Team Overlay Widget on Mobile Home Screen */}
      <HomeSupportWidget />
    </>
  );
}

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 overflow-x-hidden relative transition-colors duration-200">
      
      {/* Decorative Orbs */}
      <div className="absolute top-10 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-[60%] -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* HEADER SECTION */}
      <header className="hidden md:flex h-16 sticky top-0 z-40 px-6 md:px-12 items-center justify-between shadow-sm glass-header transition-all duration-350">
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
            <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navTestSeries}</Link>
            <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navUpdates}</Link>
            <Link href="/profile" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navProfile}</Link>
            {currentUser && ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role) && (
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
                  {(language === 'hi' && notice.titleHi) ? notice.titleHi : notice.title} ({notice.date})
                </Link>
                <span className="ml-6 text-blue-300">|</span>
              </span>
            ))
          )}
        </div>
      )}

      {/* HERO SECTION - Starts immediately below Live Updates Bar */}
      <section className="pt-4 pb-8 md:pt-5 md:pb-10 px-4 md:px-8 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10 edu-grid-pattern">
        
        {/* Floating Book Art */}
        <div className="absolute top-10 left-6 opacity-20 dark:opacity-[0.12] animate-float pointer-events-none hidden xl:block">
          <svg className="w-14 h-14 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10M6 10h10M6 14h10" />
          </svg>
        </div>

        {/* Floating Graduation Cap Art */}
        <div className="absolute bottom-10 left-[45%] opacity-20 dark:opacity-[0.12] animate-float-delayed pointer-events-none hidden xl:block">
          <svg className="w-16 h-16 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
          </svg>
        </div>

        {/* Floating Ruler / Triangle Art */}
        <div className="absolute top-10 right-20 opacity-20 dark:opacity-[0.12] animate-float pointer-events-none hidden xl:block">
          <svg className="w-12 h-12 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 22 2 2v20Z" />
            <path d="M18 18H6V6" />
          </svg>
        </div>

        {/* Left Side: Compact Pitch Title Section + Promo Banner Above Badge */}
        <div className="lg:col-span-4 flex flex-col justify-center space-y-3.5 text-left">
          {/* Compact Promo Banner Above Badge */}
          <div className="w-full max-w-sm bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 dark:from-amber-500/20 dark:to-red-500/20 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-2.5 px-3 flex items-center justify-between gap-2 shadow-xs group">
            <div className="flex items-center gap-2 z-10">
              <div className="bg-amber-500 text-white p-1 rounded-md shrink-0 animate-bounce">
                <Trophy className="h-3.5 w-3.5" />
              </div>
              <div className="text-left leading-tight">
                <p className="text-[10px] font-extrabold text-slate-800 dark:text-amber-300 uppercase tracking-wide">
                  {language === 'hi' ? 'सीमित समय ऑफर!' : 'Limited Time Offer!'}
                </p>
                <p className="text-[9px] text-slate-600 dark:text-slate-350 font-medium">
                  {language === 'hi' 
                    ? 'रजिस्टर करें और पाएं Pass Pro!' 
                    : 'Get Pass Pro on Register!'}
                </p>
              </div>
            </div>
            <Link
              href="/auth"
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-wider shrink-0 transition-transform active:scale-95 z-10 shadow-xs"
            >
              {language === 'hi' ? 'दावा करें' : 'Claim'}
            </Link>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs bg-blue-100 border border-blue-300 dark:bg-blue-950 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs self-start">
            {t.heroBadge}
          </span>
          
          <h1 className="text-xl md:text-3xl font-black leading-snug tracking-tight text-slate-900 dark:text-white">
            {t.heroTitlePrefix}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">{t.heroTitleSuffix}</span>
          </h1>
          
          <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-relaxed max-w-sm font-semibold">
            {t.heroDesc}
          </p>

          <div className="pt-1">
            <Link
              href="/mock-tests"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-md transition active:scale-95"
            >
              <BookOpen className="h-4 w-4" />
              <span>{language === 'hi' ? 'टेस्ट सीरीज देखें' : 'Explore Test Series'}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Side: Wider Full-Height Banner Announcement Panel */}
        <div className="lg:col-span-8 border border-blue-200/80 dark:border-blue-900/50 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[420px] md:min-h-[460px] bg-slate-950 text-white shadow-xl hover:shadow-2xl transition-all duration-300 group">
          {activeAnnouncements.length > 1 && (
            <div className="absolute top-3.5 right-3.5 z-30 flex gap-1.5 items-center bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-md">
              {activeAnnouncements.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnnouncementIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    announcementIndex === idx ? 'bg-blue-400 w-5' : 'bg-white/40 hover:bg-white/70 w-2'
                  }`}
                />
              ))}
            </div>
          )}

          {activeAnnouncements.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
              <Bell className="h-10 w-10 text-slate-600" />
              <p className="text-sm font-semibold">
                {language === 'hi' ? 'वर्तमान में कोई सक्रिय घोषणाएं नहीं हैं।' : 'No active announcements at the moment.'}
              </p>
            </div>
          ) : (
            (() => {
              const ann = activeAnnouncements[announcementIndex] || activeAnnouncements[0];
              return (
                <div className="flex-1 flex flex-col justify-between h-full w-full animate-in fade-in duration-300 bg-slate-950">
                  {/* Top Banner Image Container - Fits Entire Image Completely Without Cropping */}
                  <div className="flex-1 w-full relative min-h-[300px] md:min-h-[340px] flex items-center justify-center bg-slate-950 overflow-hidden p-2">
                    {ann.imageUrl && ann.imageUrl.trim() ? (
                      <img
                        src={ann.imageUrl.trim().replace(/^http:\/\//i, 'https://')}
                        alt={ann.title}
                        className="w-full h-full object-contain max-h-[340px] md:max-h-[380px] rounded-xl group-hover:scale-[1.01] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[280px] rounded-xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-2">
                        <Bell className="h-12 w-12 text-blue-400 animate-bounce" />
                        <h3 className="font-black text-lg md:text-xl text-white max-w-md">{ann.title}</h3>
                      </div>
                    )}
                  </div>

                  {/* Bottom Compact Announcement Info Footer (Does NOT block the banner) */}
                  <div className="shrink-0 w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 px-4 md:px-6 flex items-center justify-between gap-3 z-20">
                    <div className="flex-1 min-w-0 space-y-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-blue-600/90 text-white font-black text-[9px] md:text-[10px] px-2.5 py-0.5 rounded-md border border-blue-400/30 uppercase tracking-wider">
                          {ann.type || 'ANNOUNCEMENT'}
                        </span>
                        <span className="text-[10px] md:text-xs text-slate-400 font-bold flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-blue-400" /> {ann.date}
                        </span>
                        {ann.lastDate && (
                          <span className="text-[10px] md:text-xs font-black text-red-400 flex items-center gap-1 bg-red-950/70 border border-red-800/40 px-2 py-0.5 rounded-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                            {language === 'hi' ? 'अंतिम तिथि: ' : 'Last Date: '}{ann.lastDate}
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-xs md:text-sm text-white leading-snug line-clamp-1">
                        {language === 'hi' && ann.titleHi ? ann.titleHi : ann.title}
                      </h4>
                    </div>

                    {ann.url ? (
                      <a
                        href={ann.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] md:text-xs px-3.5 py-2 rounded-xl transition shadow-md hover:shadow-blue-500/25 active:scale-95 shrink-0 cursor-pointer"
                      >
                        <span>{language === 'hi' ? 'विवरण देखें' : 'View Details'}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </section>

      {/* CATEGORIES SECTION */}
      <section className="py-16 px-6 md:px-12 max-w-6xl w-full mx-auto relative z-10 border-t border-slate-200 dark:border-slate-900">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">{t.popularTitle}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">{t.popularDesc}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {displayCategories.map(cat => {
            const style = getWebCategoryStyle(cat.id);
            const IconComponent = 
              cat.id.includes('ssc') ? Award :
              cat.id.includes('railways') ? TrendingUp :
              cat.id.includes('banking') ? Coins :
              cat.id.includes('teaching') ? BookOpen :
              cat.id.includes('ugc_net') ? GraduationCap :
              cat.id.includes('upsc') ? ShieldCheck :
              cat.id.includes('defence') ? ShieldCheck :
              cat.id.includes('engg') || cat.id.includes('engineering') ? GraduationCap : MapPin;
            const shadowStyle = 
              cat.id.includes('ssc') ? 'glow-shadow-amber' :
              cat.id.includes('railways') ? 'glow-shadow-blue' :
              cat.id.includes('banking') ? 'glow-shadow-green' :
              cat.id.includes('teaching') ? 'glow-shadow-amber' :
              cat.id.includes('ugc_net') ? 'glow-shadow-blue' : 'glow-shadow-purple';

                return (
                  <Link
                    key={cat.id}
                    href={`/mock-tests?cat=${cat.id}`}
                    className={`border hover:scale-[1.03] p-5 rounded-2xl flex flex-col justify-between group transition-all duration-300 text-left w-full cursor-pointer relative overflow-hidden ${style.bg} ${shadowStyle}`}
                  >
                    {/* Decorative background circle art (watermark) */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-current opacity-[0.03] dark:opacity-[0.015] pointer-events-none group-hover:scale-125 transition-transform duration-300" />
                    <div className="absolute -bottom-8 -left-8 w-16 h-16 rounded-full bg-current opacity-[0.02] dark:opacity-[0.01] pointer-events-none group-hover:scale-125 transition-transform duration-300" />
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        {cat.logoUrl ? (
                          <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            <img
                              src={cat.logoUrl}
                              alt={`${cat.name} logo`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className={`p-2.5 rounded-xl ${style.iconBg}`}>
                            <IconComponent className="h-5 w-5 animate-pulse" />
                          </div>
                        )}
                        <span className={`text-[10px] font-black tracking-wider group-hover:underline ${style.accentText}`}>
                          {cat.count}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs md:text-sm text-slate-900 dark:text-white mb-1.5">{getLocalizedName(cat, language)}</h4>
                      <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 leading-normal font-semibold">{cat.desc}</p>
                    </div>

                    <div className={`flex items-center gap-1.5 font-bold text-[9px] md:text-[10px] uppercase tracking-wider mt-5 pt-3 border-t w-full ${style.btnAccent}`}>
                      {t.exploreTests} <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
        </div>
      </section>

      {/* DESKTOP VOCABULARY BOOSTER SECTION */}
      <section className="py-12 px-6 md:px-12 max-w-6xl w-full mx-auto relative z-10 border-t border-slate-200 dark:border-slate-900">
        <VocabSection language={language} />
      </section>

      {/* PORTAL UPDATES BOARD */}
      <section className="py-16 px-6 md:px-12 max-w-6xl w-full mx-auto relative z-10 border-t border-slate-200 dark:border-slate-900 space-y-12">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">{t.liveUpdatesTitle}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">{t.liveUpdatesDesc}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tile 1: Live Notices & Announcements */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-6 px-1.5 rounded-3xl shadow-sm flex flex-col justify-between min-h-[646px]">
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2 px-3">
                <Bell className="h-4.5 w-4.5 text-blue-600 animate-bounce" /> {t.liveNotices}
              </h3>
              
              <div className="space-y-3 flex-1">
                {noticesList.filter(n => n.category === 'notice').length > 0 ? (
                  [...noticesList]
                    .filter(n => n.category === 'notice')
                    .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                    .slice(0, 6)
                    .map(notice => (
                    <div
                      key={notice.id}
                      className="w-[98%] mx-auto p-3.5 rounded-2xl bg-blue-50/40 dark:bg-blue-950/10 border border-blue-155 dark:border-blue-900/30 border-l-4 border-l-blue-500 hover:scale-[1.015] hover:shadow-sm transition-all duration-205 flex flex-col gap-1.5"
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
                      <p className="text-[10px] text-red-500 font-extrabold mt-1 uppercase tracking-wider">
                        {t.lastDate} {notice.lastDate || (language === 'hi' ? 'उपलब्ध नहीं' : 'N/A')}
                      </p>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-6 px-1.5 rounded-3xl shadow-sm flex flex-col justify-between min-h-[646px]">
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2 px-3">
                <Trophy className="h-4.5 w-4.5 text-yellow-500 animate-pulse" /> {t.resultsMerits}
              </h3>
              
              <div className="space-y-3 flex-1">
                {noticesList.filter(n => n.category === 'result').length > 0 ? (
                  [...noticesList]
                    .filter(n => n.category === 'result')
                    .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                    .slice(0, 6)
                    .map(notice => (
                    <div
                      key={notice.id}
                      className="w-[98%] mx-auto p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-155 dark:border-emerald-900/30 border-l-4 border-l-emerald-500 hover:scale-[1.015] hover:shadow-sm transition-all duration-205 flex flex-col gap-1.5"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-6 px-1.5 rounded-3xl shadow-sm flex flex-col justify-between min-h-[646px]">
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2 px-3">
                <FileText className="h-4.5 w-4.5 text-green-550" /> {t.admitCards}
              </h3>
              
              <div className="space-y-3 flex-1">
                {noticesList.filter(n => n.category === 'admit_card').length > 0 ? (
                  [...noticesList]
                    .filter(n => n.category === 'admit_card')
                    .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                    .slice(0, 6)
                    .map(notice => (
                    <div
                      key={notice.id}
                      className="w-[98%] mx-auto p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/10 border border-amber-155 dark:border-amber-900/30 border-l-4 border-l-amber-500 hover:scale-[1.015] hover:shadow-sm transition-all duration-205 flex flex-col gap-1.5"
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
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden glow-shadow-blue border border-blue-400/20">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          {/* Watermarked book background shape */}
          <div className="absolute -left-10 -bottom-10 opacity-[0.08] pointer-events-none">
            <svg className="w-40 h-40 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            </svg>
          </div>
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
        <div className="mt-3 flex items-center justify-center gap-4">
          <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 font-bold transition">Privacy Policy</Link>
        </div>
      </footer>



      {/* NEW SIGNUP CONGRATULATIONS POPUP */}
      {showCongratsPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
            {/* Background design accents */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>

            {/* Close cross */}
            <button
              onClick={() => {
                setShowCongratsPopup(false);
                sessionStorage.setItem('dismissed_congrats_popup', 'true');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-55 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header Icon */}
            <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-950/60 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-900/40 mb-6 shadow-inner relative">
              <Gift className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-bounce" />
              <Sparkles className="h-4 w-4 text-yellow-500 dark:text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            </div>

            {/* Content */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                {language === 'hi' ? 'बधाई हो! 🎉' : 'Congratulations! 🎉'}
              </h2>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                {language === 'hi' ? 'मॉक टेस्ट हब टीम से उपहार' : 'Gift from Mock Test Hub Team'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 px-2 pt-2 leading-relaxed">
                {language === 'hi'
                  ? 'आपके खाते में 1 वर्ष का मॉक टेस्ट पास प्रो (Premium Plan) सक्रिय कर दिया गया है! अब आप सभी प्रीमियम परीक्षाओं का उपयोग कर सकते हैं।'
                  : 'A 1-Year Mock Test Pass Pro subscription has been credited to your account! Explore all features and premium tests immediately.'}
              </p>
            </div>

            {/* Unlocked Benefits list */}
            <div className="mt-6 p-4 bg-slate-55 dark:bg-slate-950/60 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-950/40 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-extrabold text-[10px] shrink-0 mt-0.5">🔓</div>
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                    {language === 'hi' ? 'असीमित मॉक टेस्ट्स' : 'Unlimited Premium Tests'}
                  </h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {language === 'hi' ? 'सभी एसएससी, बैंकिंग, रेलवे और राज्य स्तरीय प्रीमियम टेस्ट अनलॉक हैं।' : 'Access all SSC, Banking, Railways & State level exams without restriction.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-950/40 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-extrabold text-[10px] shrink-0 mt-0.5">📝</div>
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                    {language === 'hi' ? 'कस्टम टेस्ट क्रिएटर' : 'Custom Paper Creator'}
                  </h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {language === 'hi' ? 'अपने कमजोर विषयों के अनुसार स्वयं के प्रश्न-पत्र तैयार करें।' : 'Build customizable exam papers focused on your weak subjects.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-950/40 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-extrabold text-[10px] shrink-0 mt-0.5">📊</div>
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                    {language === 'hi' ? 'पूर्ण स्पीड और गति विश्लेषक' : 'Advanced Speed Analytics'}
                  </h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {language === 'hi' ? 'अपने डैशबोर्ड पर सेक्शनल टाइम, स्पीड और तुलनात्मक परिणाम देखें।' : 'Track sectional timing averages and topper comparative speed details.'}
                  </p>
                </div>
              </div>
            </div>

             {/* Action button */}
            <div className="mt-6">
              <button
                onClick={handleClaimPassPro}
                disabled={claiming}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3.5 rounded-2xl text-xs transition active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20 uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {claiming ? (
                  <span>{language === 'hi' ? 'प्रोसेसिंग...' : 'Processing...'}</span>
                ) : (
                  <>
                    <Gift className="h-4.5 w-4.5 animate-pulse" />
                    <span>{language === 'hi' ? '1 वर्ष का पास प्रो दावा करें (Claim Now) 🎁' : 'Claim 1 Year Pass Pro 🎁'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Support Team Overlay Widget on Home Screen */}
      <HomeSupportWidget />
    </div>
  );
}

