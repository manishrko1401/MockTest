"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import Link from 'next/link';
import HomeSupportWidget from './components/HomeSupportWidget';
import { useRouter } from 'next/navigation';
import { ShieldCheck, GraduationCap, ChevronRight, ChevronLeft, Award, Trophy, Users, User, CheckCircle, Search, Info, Calendar, Bell, HelpCircle, UserCheck, Sun, Moon, FileText, X, Menu, LogOut, LayoutDashboard, Gift, Sparkles, TrendingUp, Coins, BookOpen, MapPin, MessageSquare, Send, Lightbulb, Target, ArrowRight, BookmarkCheck, Lock, Mail, Copy, Check, ExternalLink } from 'lucide-react';
import { TRANSLATIONS } from './translations';
import { getLocalizedName } from './lib/examUtils';
import { useIsMobile } from './useIsMobile';
import VocabSection from './components/VocabSection';
import BackgroundArts from './components/BackgroundArts';
import LiveUpdatesBar from './components/LiveUpdatesBar';
import LeftSideMenu from './components/LeftSideMenu';
import HomeLeftSidebar from './components/HomeLeftSidebar';
import HomeHeroBannerCarousel from './components/HomeHeroBannerCarousel';
import HomeShortcutsSection from './components/HomeShortcutsSection';
import HomeChatSection from './components/HomeChatSection';
import HomeSuggestionSection from './components/HomeSuggestionSection';
import HomeContactSection from './components/HomeContactSection';
import HomeTermsSection from './components/HomeTermsSection';
import HomePrivacySection from './components/HomePrivacySection';
import HomeReferralsSection from './components/HomeReferralsSection';
import PopularExamsMarquee from './components/PopularExamsMarquee';

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
  const [rightView, setRightView] = useState<'home' | 'chat' | 'suggestion' | 'contact' | 'terms' | 'privacy' | 'referrals'>('home');

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
    // If admin has custom catalog items, use them; otherwise use rich default CATEGORIES
    const adminCatalog = examCatalog && examCatalog.length > 0 ? examCatalog : CATEGORIES;
    const popularOnly = adminCatalog.filter((c: any) => c.isPopular === true);
    const targetCatalog = popularOnly.length > 0 ? popularOnly : adminCatalog;

    return targetCatalog.map((c: any) => ({
      id: c.id,
      name: c.name,
      nameHi: c.nameHi || undefined,
      desc: c.desc || c.description || '',
      count: c.count || c.countText || (c.subCategories?.length ? `${c.subCategories.length}+ Tests` : '40+ Tests'),
      logoUrl: c.logoUrl || null,
      subCategories: c.subCategories || (EXAMS_BY_CATEGORY[c.id] ? EXAMS_BY_CATEGORY[c.id].map(e => ({ id: e.id, name: formatSubCategoryName(e.name) })) : [])
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
  const [copiedContactEmail, setCopiedContactEmail] = useState(false);
  const [contactLinks, setContactLinks] = useState<any[]>([
    {
      id: 'email',
      name: 'Gmail / Support',
      badgeText: 'M',
      badgeBg: 'bg-[#EA4335]',
      badgeTextColor: 'text-white',
      iconType: 'mail',
      handle: 'mocktesthubsupport@gmail.com',
      url: 'mailto:mocktesthubsupport@gmail.com?subject=MockTest%20Hub%20Support%20Inquiry',
      descriptionEn: 'Official support for password resets, pass activation & grievances',
      descriptionHi: 'पासवर्ड रीसेट, पास सक्रियण और शिकायतों के लिए आधिकारिक समर्थन',
      category: 'primary',
      isEnabled: true
    },
    {
      id: 'telegram',
      name: 'Telegram',
      badgeText: 'TG',
      badgeBg: 'bg-[#229ED9]',
      badgeTextColor: 'text-white',
      iconType: 'send',
      handle: '@MockTest_Hub',
      url: 'https://t.me/MockTest_Hub',
      descriptionEn: 'Instant exam alerts, free PDF notes, daily quizzes & student community',
      descriptionHi: 'त्वरित परीक्षा अलर्ट, मुफ्त पीडीएफ नोट्स और दैनिक क्विज़',
      category: 'primary',
      isEnabled: true
    },
    {
      id: 'youtube',
      name: 'YouTube',
      badgeText: 'YT',
      badgeBg: 'bg-[#FF0000]',
      badgeTextColor: 'text-white',
      iconType: 'youtube',
      handle: '@MockTestHub',
      url: 'https://youtube.com/@MockTestHub',
      descriptionEn: 'Exam strategy sessions, syllabus deep-dives & question walkthroughs',
      descriptionHi: 'परीक्षा रणनीति सत्र, पाठ्यक्रम विश्लेषण और हल किए गए पेपर',
      category: 'primary',
      isEnabled: true
    },
    {
      id: 'instagram',
      name: 'Instagram',
      badgeText: 'IG',
      badgeBg: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
      badgeTextColor: 'text-white',
      iconType: 'instagram',
      handle: '@mocktesthub',
      url: 'https://instagram.com/mocktesthub',
      descriptionEn: 'Daily GK snippets, motivational quotes & upcoming notification reels',
      descriptionHi: 'दैनिक सामान्य ज्ञान, प्रेरक विचार और आगामी भर्ती रील्स',
      category: 'social',
      isEnabled: true
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      badgeText: 'in',
      badgeBg: 'bg-[#0A66C2]',
      badgeTextColor: 'text-white',
      iconType: 'linkedin',
      handle: 'MockTest Hub',
      url: 'https://linkedin.com/company/mocktesthub',
      descriptionEn: 'Official career opportunities, hiring announcements & platform updates',
      descriptionHi: 'कैरियर के अवसर, भर्ती घोषणाएं और मंच अपडेट',
      category: 'social',
      isEnabled: true
    },
    {
      id: 'reddit',
      name: 'Reddit',
      badgeText: 'R',
      badgeBg: 'bg-[#FF4500]',
      badgeTextColor: 'text-white',
      iconType: 'reddit',
      handle: 'r/MockTestHub',
      url: 'https://reddit.com/r/MockTestHub',
      descriptionEn: 'Aspirant discussions, AMA sessions & competitive prep tips',
      descriptionHi: 'उम्मीदवार चर्चा, प्रश्नोत्तर सत्र और परीक्षा तैयारी युक्तियाँ',
      category: 'community',
      isEnabled: true
    }
  ]);

  useEffect(() => {
    fetch('/api/contact-links')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.links) && data.links.length > 0) {
          setContactLinks(data.links.filter((l: any) => l.isEnabled !== false));
        }
      })
      .catch(err => console.error('Error loading dynamic contact links:', err));
  }, []);

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
  const hasAdminBanners = (noticesList || []).some(n => Boolean(n.imageUrl && n.imageUrl.trim() !== ''));

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const renderNotificationTile = (notice: any, themeColor: 'blue' | 'amber' | 'emerald' | 'purple') => {
    const hoverBorderColors = {
      blue: 'hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/50',
      amber: 'hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/50',
      emerald: 'hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/50',
      purple: 'hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/50',
    };

    const hoverShadowColors = {
      blue: 'hover:shadow-[0_12px_24px_-6px_rgba(59,130,246,0.18),0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_24px_-6px_rgba(59,130,246,0.35),0_0_16px_rgba(59,130,246,0.18)]',
      amber: 'hover:shadow-[0_12px_24px_-6px_rgba(245,158,11,0.18),0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_24px_-6px_rgba(245,158,11,0.35),0_0_16px_rgba(245,158,11,0.18)]',
      emerald: 'hover:shadow-[0_12px_24px_-6px_rgba(16,185,129,0.18),0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_24px_-6px_rgba(16,185,129,0.35),0_0_16px_rgba(16,185,129,0.18)]',
      purple: 'hover:shadow-[0_12px_24px_-6px_rgba(168,85,247,0.18),0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_24px_-6px_rgba(168,85,247,0.35),0_0_16px_rgba(168,85,247,0.18)]',
    };

    return (
      <div
        key={notice.id}
        onClick={() => router.push(`/updates/${notice.id}`)}
        className={`group w-full bg-slate-50/90 dark:bg-slate-950/70 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/90 dark:border-slate-800 ${hoverBorderColors[themeColor]} ${hoverShadowColors[themeColor]} rounded-2xl p-4 shadow-2xs transition-all duration-300 transform-gpu hover:-translate-y-1.5 hover:scale-[1.015] active:translate-y-0 active:scale-[0.99] cursor-pointer flex flex-col gap-2 relative`}
      >
        {/* Top Badges & Date */}
        <div className="flex items-center justify-between gap-2 w-full">
          {isNewlyPublished(notice.publishDate) ? (
            <span className="bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-2xs">
              {t.newBadge}
            </span>
          ) : <span />}
          <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold whitespace-nowrap">{notice.date}</span>
        </div>

        {/* Regular Normal Weight Title (Clean font style) */}
        <h5 className="font-semibold text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug transition-colors">
          {notice.title}
        </h5>

        {/* Last Date Deadline - Only in Live Notices */}
        {notice.category === 'notice' && notice.lastDate && (
          <p className="text-[9.5px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
            <span>{t.lastDate}</span>
            <span>{notice.lastDate}</span>
          </p>
        )}
      </div>
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 30;
    const isRightSwipe = distance < -30;

    if (isLeftSwipe && activeAnnouncements.length > 1) {
      setAnnouncementIndex((prev) => (prev + 1) % activeAnnouncements.length);
    } else if (isRightSwipe && activeAnnouncements.length > 1) {
      setAnnouncementIndex((prev) => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length);
    }
  };

  React.useEffect(() => {
    if (activeAnnouncements.length <= 1) return;
    const timer = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % activeAnnouncements.length);
    }, 5000);
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
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
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
      <div className="flex-1 flex flex-col bg-slate-200/90 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 items-center justify-center">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        <div className="flex-1 flex flex-col bg-slate-200/90 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 overflow-x-hidden relative transition-colors duration-200 mobile-fade-in">
        {/* Mobile Background Arts & Orbs */}
        <BackgroundArts isMobile={true} />
        <div className="absolute top-10 -left-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-[50%] -right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <header className="h-18 border-b border-slate-200 dark:border-slate-900 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between shadow-sm">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-1.5 rounded-full shadow-sm flex items-center justify-center h-8 w-8 border border-blue-200/50 dark:border-slate-700 shrink-0">
              <Trophy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="font-extrabold text-xs leading-none text-slate-900 dark:text-white tracking-wider truncate">{t.logoTitle}</h1>
              <p className="text-[8px] text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase mt-0.5 leading-none truncate">{t.logoSub}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Hamburger / Navigation Menu Button */}
            <button
              onClick={() => handleToggleMenu(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-800 active:scale-95 cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </header>

        {/* Live Notices & Announcements Marquee */}
        <LiveUpdatesBar notices={noticesList} language={language} isMobile={true} />

        {/* MOBILE SLIDE-DOWN DRAWER MENU (Previous / Original Design) */}
        {mobileMenuOpen && (
          <div className="fixed inset-x-0 top-14 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-900 z-50 shadow-2xl p-5 sm:p-6 flex flex-col gap-5 animate-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
              <Link
                href="/"
                onClick={() => handleToggleMenu(false)}
                className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2.5 flex items-center justify-between font-black text-blue-600 dark:text-blue-400"
              >
                <span>{t.navHome}</span>
                <ChevronRight className="h-4 w-4 text-blue-600" />
              </Link>
              <Link
                href="/mock-tests"
                onClick={() => handleToggleMenu(false)}
                className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2.5 flex items-center justify-between"
              >
                <span>{t.navTestSeries}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                href="/typing-test"
                onClick={() => handleToggleMenu(false)}
                className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>{language === 'hi' ? 'टाइपिंग टेस्ट (DEST)' : 'Typing Test & Terminal'}</span>
                  <span className="bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">NEW</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                href="/updates"
                onClick={() => handleToggleMenu(false)}
                className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2.5 flex items-center justify-between"
              >
                <span>{t.navUpdates}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                href="/locker"
                onClick={() => handleToggleMenu(false)}
                className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2.5 flex items-center justify-between"
              >
                <span>{language === 'hi' ? 'दस्तावेज़ लॉकर' : 'Document Locker'}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                href="/profile/tracked-jobs"
                onClick={() => handleToggleMenu(false)}
                className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2.5 flex items-center justify-between"
              >
                <span>{language === 'hi' ? 'ट्रैक की गई परीक्षाएं' : 'Applied & Saved Exams'}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              {currentUser && ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role) && (
                <Link
                  href="/admin"
                  onClick={() => handleToggleMenu(false)}
                  className="hover:text-blue-600 border-b border-slate-100 dark:border-slate-900 pb-2.5 flex items-center justify-between"
                >
                  <span>{t.navAdmin}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              )}
            </nav>

            <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Language / भाषा</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Theme / डार्क मोड</span>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
                </button>
              </div>

              {currentUser ? (
                <div className="flex flex-col gap-2 mt-2">
                  <Link
                    href="/profile"
                    onClick={() => handleToggleMenu(false)}
                    className="w-full py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-extrabold text-xs text-center border border-blue-200 dark:border-blue-900/40 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>{currentUser.name} ({t.dashboard})</span>
                  </Link>
                  <button
                    onClick={() => { logout(); handleToggleMenu(false); }}
                    className="w-full py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:underline text-center cursor-pointer"
                  >
                    {t.signOut}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 mt-2">
                  <Link
                    href="/auth"
                    onClick={() => handleToggleMenu(false)}
                    className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    {t.logIn}
                  </Link>
                  <Link
                    href="/auth"
                    onClick={() => handleToggleMenu(false)}
                    className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs text-center shadow-md shadow-blue-500/20"
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

          {/* 1. FULL WIDTH HERO BANNER CAROUSEL (Only shown if admin uploaded banners) */}
          {hasAdminBanners && (
            <div className="-mx-3 sm:mx-0 w-[calc(100%+1.5rem)] sm:w-full pt-0.5 pb-1 px-0 sm:px-0">
              <HomeHeroBannerCarousel onOpenPassClaim={() => setShowCongratsPopup(true)} />
            </div>
          )}

          {/* 2. 4 PRIMARY ACTION BUTTONS (Same design as desktop) */}
          <div className="w-full grid grid-cols-2 gap-2.5 my-1">
            {/* 1. TEST SERIES */}
            <Link
              href="/mock-tests"
              className="group flex items-start sm:items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-orange-500/50 shadow-xs hover:shadow-md transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Award className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 leading-tight">
                  {language === 'hi' ? 'टेस्ट सीरीज' : 'Test Series'}
                </h4>
                <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium leading-tight mt-0.5">
                  {language === 'hi' ? '1,500+ सीबीटी टेस्ट्स' : '1,500+ CBT Mocks'}
                </p>
              </div>
            </Link>

            {/* 2. NOTICES & ANNOUNCEMENTS */}
            <Link
              href="/updates"
              className="group flex items-start sm:items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 leading-tight">
                  {language === 'hi' ? 'सूचनाएं एवं अलर्ट' : 'Notices & Alerts'}
                </h4>
                <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium leading-tight mt-0.5">
                  {language === 'hi' ? 'एडमिट कार्ड व परिणाम' : 'Admit Cards & Results'}
                </p>
              </div>
            </Link>

            {/* 3. DOCUMENT LOCKER */}
            <Link
              href="/locker"
              className="group flex items-start sm:items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 leading-tight">
                  {language === 'hi' ? 'दस्तावेज़ लॉकर' : 'Document Locker'}
                </h4>
                <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium leading-tight mt-0.5">
                  {language === 'hi' ? 'सुरक्षित प्रमाणपत्र वॉल्ट' : 'Secure Vault'}
                </p>
              </div>
            </Link>

            {/* 4. APPLIED & SAVED EXAMS */}
            <Link
              href="/profile/tracked-jobs"
              className="group flex items-start sm:items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-purple-500/50 shadow-xs hover:shadow-md transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                <BookmarkCheck className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 leading-tight">
                  {language === 'hi' ? 'आवेदन व ट्रैकिंग' : 'Applied & Saved'}
                </h4>
                <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium leading-tight mt-0.5">
                  {language === 'hi' ? 'ट्रैक की गई परीक्षाएं' : 'Tracked Exams'}
                </p>
              </div>
            </Link>
          </div>

          {/* POPULAR CATEGORIES */}
          <section className="space-y-6 pt-2 border-t border-slate-200 dark:border-slate-900 relative z-10">
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
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">{t.liveUpdatesTitle}</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">{t.liveUpdatesDesc}</p>
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
                    ? 'bg-white dark:bg-slate-800 text-green-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Admit Cards
              </button>
            </div>

            {/* RENDER ACTIVE TAB */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm min-h-[300px] flex flex-col justify-between">
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
                        <Link
                          key={notice.id}
                          href={`/updates/${notice.id}`}
                          className={`p-3 rounded-xl border flex flex-col gap-1 shadow-sm transition-all duration-200 hover:scale-[1.015] active:scale-98 cursor-pointer block ${noticeStyle}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            {isNewlyPublished(notice.publishDate) ? (
                              <span className="bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase">
                                {t.newBadge}
                              </span>
                            ) : <span />}
                            <span className="text-[7px] text-slate-400 font-semibold">{notice.date}</span>
                          </div>
                          <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-normal flex items-center justify-between gap-1">
                            <span>{(language === 'hi' && notice.titleHi) ? notice.titleHi : notice.title}</span>
                            <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                          </h5>
                          {notice.category === 'notice' && notice.lastDate && (
                            <p className="text-[8px] text-red-500 font-extrabold mt-0.5 uppercase tracking-wider">
                              {t.lastDate} {notice.lastDate}
                            </p>
                          )}
                        </Link>
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
        </main>

        {/* FOOTER */}
        <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-6 px-4 text-center text-[10px] text-slate-500 transition-colors duration-200">
          <p className="font-bold">© 2026 MockTest Hub. All rights reserved.</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <Link href="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 font-bold transition">Contact Us</Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 font-bold transition">Terms & Conditions</Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
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
      {/* Floating Support Team Overlay Widget on Mobile Home Screen */}
      <HomeSupportWidget />
    </>
  );
}

  return (
    <div className="h-screen max-h-screen h-[100dvh] w-full flex flex-col bg-slate-200/90 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 select-none transition-colors duration-200 overflow-hidden relative">
      
      {/* Background Decorative Arts & Designs (Strictly bounded within viewport) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <BackgroundArts isMobile={false} />
        {/* Decorative Orbs */}
        <div className="absolute top-10 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-[60%] -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* HEADER SECTION */}
      <header className="hidden md:flex h-18 shrink-0 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 items-center justify-between shadow-sm glass-header transition-all duration-350 bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 lg:gap-6 min-w-0">
          {/* Original MockTest Hub Header Logo */}
          <Link href="/" className="flex items-center gap-2.5 lg:gap-3 shrink-0">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-1.5 lg:p-2 rounded-full shadow-sm flex items-center justify-center h-9 w-9 lg:h-10 lg:w-10 border border-blue-200/50 dark:border-slate-700 shrink-0">
              <Trophy className="h-5 w-5 lg:h-5.5 lg:w-5.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="shrink-0">
              <h1 className="font-extrabold text-xs lg:text-sm leading-tight text-slate-900 dark:text-white tracking-wider truncate">{t.logoTitle}</h1>
              <p className="text-[8px] lg:text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase truncate">{t.logoSub}</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-3 lg:gap-6 text-xs font-bold text-slate-505 dark:text-slate-400 shrink-0">
            <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">{t.navTestSeries}</Link>
            <Link href="/typing-test" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">
              <span>{language === 'hi' ? 'टाइपिंग टेस्ट' : 'Typing Test'}</span>
            </Link>
            <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">{t.navUpdates}</Link>
            <Link href="/locker" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">
              <span>{language === 'hi' ? 'दस्तावेज़ लॉकर' : 'Document Locker'}</span>
            </Link>
            {currentUser && ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role) && (
              <Link href="/admin" className="hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap">{t.navAdmin}</Link>
            )}
          </nav>
        </div>

        {/* Auth Buttons / Profile Panel / Language Selector */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2 py-1.5 lg:px-2.5 lg:py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-355 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
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
            <div className="flex items-center gap-2 sm:gap-3">
              <Link 
                href="/profile" 
                className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 transition px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs text-slate-800 dark:text-slate-200 whitespace-nowrap"
              >
                {/* Small Mock Test Hub Logo Emblem */}
                <div className="bg-blue-600/10 dark:bg-blue-950 p-1 rounded-md flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-900/40">
                  <Trophy className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <span>{t.dashboard} ({currentUser.name.split(' ')[0]})</span>
              </Link>
              <button
                onClick={logout}
                className="hidden lg:block text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition text-xs font-bold cursor-pointer"
              >
                {t.signOut}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/auth" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition text-xs font-bold flex items-center gap-1 px-2 py-1">
                <span>{t.logIn}</span>
              </Link>
              <Link href="/auth" className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-3 sm:px-4 rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 whitespace-nowrap">
                <span>{t.signUp}</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main split-pane content: Left Side Menu Section (identical to category page) + Right Main Content */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left Side: Exam Category-Style Sidebar Menu */}
        <HomeLeftSidebar
          onOpenPassClaim={() => setShowCongratsPopup(true)}
          activeView={rightView}
          onSelectView={setRightView}
        />

        {/* Right Side: Home Page Content Container */}
        <main className="flex-1 min-w-0 px-3 md:px-6 pb-0 pt-0 overflow-y-auto overflow-x-hidden edu-grid-pattern relative h-full min-h-0 no-scrollbar flex flex-col space-y-3">
          
          {rightView === 'chat' ? (
            <div className="w-full h-full py-2 sm:py-3">
              <HomeChatSection onBack={() => setRightView('home')} />
            </div>
          ) : rightView === 'suggestion' ? (
            <div className="w-full h-full py-2 sm:py-3">
              <HomeSuggestionSection onBack={() => setRightView('home')} />
            </div>
          ) : rightView === 'contact' ? (
            <div className="w-full h-full py-2 sm:py-3">
              <HomeContactSection onBack={() => setRightView('home')} />
            </div>
          ) : rightView === 'terms' ? (
            <div className="w-full h-full py-2 sm:py-3">
              <HomeTermsSection onBack={() => setRightView('home')} />
            </div>
          ) : rightView === 'privacy' ? (
            <div className="w-full h-full py-2 sm:py-3">
              <HomePrivacySection onBack={() => setRightView('home')} />
            </div>
          ) : rightView === 'referrals' ? (
            <div className="w-full h-full py-2 sm:py-3">
              <HomeReferralsSection onBack={() => setRightView('home')} />
            </div>
          ) : (
            <>
              {/* Live Notices & Announcements Marquee */}
              <div className="-mx-3 md:-mx-6 -mt-0 mb-3 sm:mb-4">
                <LiveUpdatesBar notices={noticesList} language={language} isMobile={false} />
              </div>

              {/* FULL WIDTH 3D HERO BANNER CAROUSEL (Only shown if admin uploaded banners) */}
              {hasAdminBanners && (
                <div className="w-full pt-1 sm:pt-2 pb-1.5 sm:pb-2">
                  <HomeHeroBannerCarousel onOpenPassClaim={() => setShowCongratsPopup(true)} />
                </div>
              )}

          {/* 4 PRIMARY ACTION BUTTONS (Just below Banner Section - Full Text Display) */}
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 lg:gap-3.5 my-1.5">
            {/* 1. TEST SERIES */}
            <Link
              href="/mock-tests"
              className="group flex items-center gap-2 sm:gap-2.5 xl:gap-3 p-2.5 sm:p-3 xl:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-orange-500/50 shadow-xs hover:shadow-md transition-all duration-200 transform-gpu hover:-translate-y-0.5"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 xl:w-11 xl:h-11 rounded-xl bg-orange-500/10 text-orange-500 dark:text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                <Award className="h-4 w-4 sm:h-4.5 sm:w-4.5 xl:h-5.5 xl:w-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-[11px] sm:text-xs xl:text-[13px] text-slate-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-tight line-clamp-1">
                  {language === 'hi' ? 'टेस्ट सीरीज' : 'Test Series'}
                </h4>
                <p className="text-[9px] sm:text-[9.5px] xl:text-[10.5px] text-slate-400 dark:text-slate-500 font-medium leading-tight mt-0.5 line-clamp-1">
                  {language === 'hi' ? '1,500+ सीबीटी टेस्ट्स' : '1,500+ CBT Mocks'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all shrink-0 hidden 2xl:block" />
            </Link>

            {/* 2. NOTICE AND ANNOUNCEMENTS */}
            <Link
              href="/updates"
              className="group flex items-center gap-2 sm:gap-2.5 xl:gap-3 p-2.5 sm:p-3 xl:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/50 shadow-xs hover:shadow-md transition-all duration-200 transform-gpu hover:-translate-y-0.5"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 xl:w-11 xl:h-11 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5 xl:h-5.5 xl:w-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-[11px] sm:text-xs xl:text-[13px] text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight line-clamp-1">
                  {language === 'hi' ? 'सूचनाएं एवं अपडेट्स' : 'Notices & Announcements'}
                </h4>
                <p className="text-[9px] sm:text-[9.5px] xl:text-[10.5px] text-slate-400 dark:text-slate-500 font-medium leading-tight mt-0.5 line-clamp-1">
                  {language === 'hi' ? 'एडमिट कार्ड व परिणाम' : 'Admit Cards & Results'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 hidden 2xl:block" />
            </Link>

            {/* 3. DOCUMENT LOCKER */}
            <Link
              href="/locker"
              className="group flex items-center gap-2 sm:gap-2.5 xl:gap-3 p-2.5 sm:p-3 xl:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all duration-200 transform-gpu hover:-translate-y-0.5"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 xl:w-11 xl:h-11 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                <Lock className="h-4 w-4 sm:h-4.5 sm:w-4.5 xl:h-5.5 xl:w-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-[11px] sm:text-xs xl:text-[13px] text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight line-clamp-1">
                  {language === 'hi' ? 'दस्तावेज़ लॉकर' : 'Document Locker'}
                </h4>
                <p className="text-[9px] sm:text-[9.5px] xl:text-[10.5px] text-slate-400 dark:text-slate-500 font-medium leading-tight mt-0.5 line-clamp-1">
                  {language === 'hi' ? 'सुरक्षित प्रमाणपत्र वॉल्ट' : 'Secure Certificate Vault'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0 hidden 2xl:block" />
            </Link>

            {/* 4. APPLIED & SAVED EXAMS */}
            <Link
              href="/profile/tracked-jobs"
              className="group flex items-center gap-2 sm:gap-2.5 xl:gap-3 p-2.5 sm:p-3 xl:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-purple-500/50 shadow-xs hover:shadow-md transition-all duration-200 transform-gpu hover:-translate-y-0.5"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 xl:w-11 xl:h-11 rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                <BookmarkCheck className="h-4 w-4 sm:h-4.5 sm:w-4.5 xl:h-5.5 xl:w-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-[11px] sm:text-xs xl:text-[13px] text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-tight line-clamp-1">
                  {language === 'hi' ? 'आवेदन व सेव परीक्षाएं' : 'Applied & Saved Exams'}
                </h4>
                <p className="text-[9px] sm:text-[9.5px] xl:text-[10.5px] text-slate-400 dark:text-slate-500 font-medium leading-tight mt-0.5 line-clamp-1">
                  {language === 'hi' ? 'ट्रैक किए गए सभी फॉर्म' : 'View Tracked & Saved Exams'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0 hidden 2xl:block" />
            </Link>
          </div>

      {/* POPULAR EXAM CATEGORIES MARQUEE SECTION (Full width, 0 padding from left & right edges) */}
      <div className="-mx-3 md:-mx-6 w-[calc(100%+1.5rem)] md:w-[calc(100%+3rem)]">
        <PopularExamsMarquee
          categories={displayCategories}
          language={language}
          title={t.popularTitle}
          exploreText={t.exploreTests}
        />
      </div>

      {/* DESKTOP VOCABULARY BOOSTER SECTION - HIDDEN AS REQUESTED */}
      {/* <section className="py-12 px-6 md:px-12 max-w-6xl w-full mx-auto relative z-10 border-t border-slate-200 dark:border-slate-900">
        <VocabSection language={language} />
      </section> */}

      {/* PORTAL UPDATES BOARD (RESULTNOTIFY STYLE 3-COLUMN CONTAINER GRID) */}
      <section className="py-10 md:py-14 px-2 sm:px-4 md:px-6 w-full max-w-[1550px] mx-auto relative z-10 border-t border-slate-300 dark:border-slate-800 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">{t.liveUpdatesTitle}</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 font-semibold">{t.liveUpdatesDesc}</p>
        </div>

        {/* MOBILE & TABLET TABBED UPDATES VIEW (< 1080px) */}
        <div className="block min-[1080px]:hidden max-w-4xl mx-auto space-y-4">
          {/* TAB SELECTION BAR */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setMobileUpdateTab('notice')}
              className={`flex-1 py-2 text-center rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileUpdateTab === 'notice' 
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>{t.liveNotices}</span>
            </button>
            <button
              onClick={() => setMobileUpdateTab('result')}
              className={`flex-1 py-2 text-center rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileUpdateTab === 'result' 
                  ? 'bg-white dark:bg-slate-800 text-yellow-600 dark:text-yellow-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>{t.resultsMerits}</span>
            </button>
            <button
              onClick={() => setMobileUpdateTab('admit_card')}
              className={`flex-1 py-2 text-center rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileUpdateTab === 'admit_card' 
                  ? 'bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{t.admitCards}</span>
            </button>
          </div>

          {/* RENDER ACTIVE TAB */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-sm min-h-[300px] flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                {mobileUpdateTab === 'notice' && <><Bell className="h-4 w-4 text-blue-600 animate-bounce" /> <span>{t.liveNotices}</span></>}
                {mobileUpdateTab === 'result' && <><Trophy className="h-4 w-4 text-yellow-500 animate-pulse" /> <span>{t.resultsMerits}</span></>}
                {mobileUpdateTab === 'admit_card' && <><FileText className="h-4 w-4 text-green-550" /> <span>{t.admitCards}</span></>}
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
                      <Link
                        key={notice.id}
                        href={`/updates/${notice.id}`}
                        className={`p-3 sm:p-3.5 rounded-xl border flex flex-col gap-1 shadow-xs transition-all duration-200 hover:scale-[1.01] active:scale-98 cursor-pointer block ${noticeStyle}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          {isNewlyPublished(notice.publishDate) ? (
                            <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                              {t.newBadge}
                            </span>
                          ) : <span />}
                          <span className="text-[8px] sm:text-[9px] text-slate-400 font-semibold">{notice.date}</span>
                        </div>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-normal flex items-center justify-between gap-1">
                          <span>{(language === 'hi' && notice.titleHi) ? notice.titleHi : notice.title}</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        </h5>
                        {notice.category === 'notice' && notice.lastDate && (
                          <p className="text-[9px] sm:text-[10px] text-red-500 font-extrabold mt-0.5 uppercase tracking-wider">
                            {t.lastDate} {notice.lastDate}
                          </p>
                        )}
                      </Link>
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
              <Link href={`/updates?category=${mobileUpdateTab}`} className="text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                {language === 'hi' ? 'सभी अपडेट देखें' : 'View All Alerts'} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* DESKTOP 3-COLUMN UPDATES VIEW (>= 1080px) - WIDER FULL-WIDTH GRID */}
        <div className="hidden min-[1080px]:grid min-[1080px]:grid-cols-3 gap-5 lg:gap-6 w-full">
          
          {/* Column 1: Live Notices & Announcements (Blue Theme) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 lg:p-6 shadow-sm flex flex-col min-h-[580px] relative w-full">
            <h3 className="font-extrabold text-xs lg:text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-blue-600 animate-bounce shrink-0" />
              <span>{t.liveNotices}</span>
            </h3>

            <div className="space-y-3.5 overflow-y-auto flex-1 max-h-[850px] no-scrollbar p-2 -m-2">
              {noticesList.filter(n => n.category === 'notice').length > 0 ? (
                [...noticesList]
                  .filter(n => n.category === 'notice')
                  .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                  .slice(0, 6)
                  .map((notice) => renderNotificationTile(notice, 'blue'))
              ) : (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  {language === 'hi' ? 'कोई सक्रिय सूचना नहीं।' : 'No active notices.'}
                </div>
              )}
            </div>

            <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800/80">
              <Link 
                href="/updates?category=notice"
                className="w-full py-2.5 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:shadow-sm"
              >
                <span>View All {t.liveNotices}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Column 2: Results & Merit Lists (Amber Theme) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 lg:p-6 shadow-sm flex flex-col min-h-[580px] relative w-full">
            <h3 className="font-extrabold text-xs lg:text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
              <Trophy className="h-4.5 w-4.5 text-amber-500 animate-pulse shrink-0" />
              <span>{t.resultsMerits}</span>
            </h3>

            <div className="space-y-3.5 overflow-y-auto flex-1 max-h-[850px] no-scrollbar p-2 -m-2">
              {noticesList.filter(n => n.category === 'result').length > 0 ? (
                [...noticesList]
                  .filter(n => n.category === 'result')
                  .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                  .slice(0, 6)
                  .map((notice) => renderNotificationTile(notice, 'amber'))
              ) : (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  {language === 'hi' ? 'कोई सक्रिय परिणाम नहीं।' : 'No active results.'}
                </div>
              )}
            </div>

            <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800/80">
              <Link 
                href="/updates?category=result"
                className="w-full py-2.5 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:shadow-sm"
              >
                <span>View All {t.resultsMerits}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Column 3: Admit Cards & City Info (Emerald Theme) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 lg:p-6 shadow-sm flex flex-col min-h-[580px] relative w-full">
            <h3 className="font-extrabold text-xs lg:text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span>{t.admitCards}</span>
            </h3>

            <div className="space-y-3.5 overflow-y-auto flex-1 max-h-[850px] no-scrollbar p-2 -m-2">
              {noticesList.filter(n => n.category === 'admit_card').length > 0 ? (
                [...noticesList]
                  .filter(n => n.category === 'admit_card')
                  .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                  .slice(0, 6)
                  .map((notice) => renderNotificationTile(notice, 'emerald'))
              ) : (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  {language === 'hi' ? 'कोई सक्रिय प्रवेश पत्र नहीं।' : 'No active admit cards.'}
                </div>
              )}
            </div>

            <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800/80">
              <Link 
                href="/updates?category=admit_card"
                className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:shadow-sm"
              >
                <span>View All {t.admitCards}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 px-6 md:px-12 max-w-6xl w-full mx-auto relative z-10 border-t border-slate-200 dark:border-slate-900 space-y-10">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            {language === 'hi' ? 'सामान्यतः पूछे जाने वाले प्रश्न' : 'Frequently Asked Questions'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">
            {language === 'hi' ? 'मॉक टेस्ट, डॉक्यूमेंट लॉकर और प्लेटफ़ॉर्म सुविधाओं के बारे में सभी जानकारी पाएं।' : 'Everything you need to know about mock tests, document locker, and portal features.'}
          </p>
        </div>

        {/* Single Unified FAQ Section (All 10 Questions) */}
        <div className="max-w-4xl w-full mx-auto bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-300 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-3.5">
          {[
            {
              id: 0,
              q: language === 'hi' ? "1. मॉक टेस्ट सीबीटी परीक्षा में शामिल होने के लिए मैं पास कैसे प्राप्त करूं?" : "1. How do I unlock full access to all mock tests?",
              a: language === 'hi' ? "आप अपने प्रोफाइल डैशबोर्ड में जाकर 'पास प्रो' सिम्युलेट करके या पास एक्टिवेट करके सभी एसएससी, रेलवे, बैंकिंग और राज्य स्तरीय असीमित परीक्षाओं को तुरंत अनलॉक कर सकते हैं।" : "You can unlock all full-length mock tests and sectional exams by upgrading to 'Pass Pro' inside the My Profile dashboard."
            },
            {
              id: 1,
              q: language === 'hi' ? "2. डॉक्यूमेंट लॉकर क्या है और क्या मेरी गूगल ड्राइव सुरक्षित है?" : "2. What is Document Locker and is my Google Drive private?",
              a: language === 'hi' ? "डॉक्यूमेंट लॉकर में आपके एडमिट कार्ड, फोटो और प्रमाणपत्र सीधे आपके व्यक्तिगत गूगल ड्राइव में सुरक्षित स्टोर होते हैं। हमारे सर्वर पर आपकी फाइलों का कोई स्टोरेज या अनधिकृत एक्सेस नहीं होता है।" : "Document Locker connects directly with your personal Google Drive to safely organize admit cards and documents. We do not store or access your private files on external servers."
            },
            {
              id: 2,
              q: language === 'hi' ? "3. प्रैक्टिस सीरीज क्या है और यह तैयारी में कैसे मदद करती है?" : "3. What is the Practice Series module and how does it work?",
              a: language === 'hi' ? "प्रैक्टिस सीरीज सेक्शन-वार और टॉपिक-वार अभ्यास के लिए विशेष मॉड्यूल है, जहाँ आप रीजनिंग, गणित, जीके और अंग्रेजी के प्रश्नों का समयबद्ध अभ्यास करके अपनी गति और सटीकता बढ़ा सकते हैं।" : "Practice Series offers targeted, section-wise drills for Quantitative Aptitude, Reasoning, English, and General Awareness to sharpen your speed and accuracy."
            },
            {
              id: 3,
              q: language === 'hi' ? "4. क्या मॉक टेस्ट में हिंदी और अंग्रेजी दोनों भाषाओं में प्रश्न उपलब्ध हैं?" : "4. Are mock test sittings available in both English and Hindi?",
              a: language === 'hi' ? "हाँ, हमारा परीक्षा पोर्टल पूर्णतः द्विभाषी है। आप सीबीटी टेस्ट देते समय किसी भी प्रश्न की भाषा (हिंदी या अंग्रेजी) तुरंत स्क्रीन पर 1-क्लिक में बदल सकते हैं।" : "Yes, the test terminal is fully bilingual. You can switch between English and Hindi for any question seamlessly during your live test session."
            },
            {
              id: 4,
              q: language === 'hi' ? "5. क्या मैं दिए गए टेस्ट को दोबारा हल (Reattempt) कर सकता हूँ?" : "5. Can I reattempt tests and review previous solutions?",
              a: language === 'hi' ? "हाँ! प्रत्येक मॉक टेस्ट में 5 रीअटेम्प्ट की सुविधा मिलती है। आपके सभी पिछले प्रयासों का इतिहास और विस्तृत हल आपके विश्लेषण पृष्ठ पर सुरक्षित रहता है।" : "Yes! Every test supports up to 5 attempts. Your complete attempt history, scores, and detailed step-by-step solutions remain saved on your analysis dashboard."
            },
            {
              id: 5,
              q: language === 'hi' ? "6. टेस्ट सबमिट करने के बाद क्या ऑल इंडिया रैंक और विश्लेषण मिलता है?" : "6. Do I get All India Rank (AIR) and detailed performance analytics?",
              a: language === 'hi' ? "बिल्कुल! टेस्ट सबमिट होते ही आपको ऑल इंडिया रैंक, परसेंटाइल, विषय-वार सटीकता, समय प्रबंधन ग्राफ और टॉपर तुलना रिपोर्ट तुरंत मिलती है।" : "Instantly upon test submission, you receive comprehensive analytics including All India Rank, Percentile, Subject-wise Accuracy, Time Spent Graphs, and Topper comparisons."
            },
            {
              id: 6,
              q: language === 'hi' ? "7. नवीनतम परीक्षा नोटिफिकेशन, एडमिट कार्ड और आंसर-की कहाँ देखें?" : "7. Where can I find latest vacancy notifications, admit cards & results?",
              a: language === 'hi' ? "हमारी वेबसाइट के 'Updates & Notices' सेक्शन में सभी सरकारी भर्तियों, एडमिट कार्ड रिलीज, परीक्षा तिथियों और आंसर-की के आधिकारिक पीडीएफ और सीधे लिंक्स उपलब्ध रहते हैं।" : "Visit the 'Updates & Notices' section to access real-time notifications for upcoming exam dates, admit card releases, syllabi, and official answer keys."
            },
            {
              id: 7,
              q: language === 'hi' ? "8. दैनिक शब्दावली (Daily Vocab) और अध्ययन सामग्री कैसे प्राप्त करें?" : "8. How do I access Daily Vocabulary and study resources?",
              a: language === 'hi' ? "प्लेटफ़ॉर्म पर दैनिक अंग्रेजी वोकैब, हिंदी अर्थ, विलोम-पर्यायवाची और वाक्य प्रयोग उपलब्ध हैं, जो प्रतियोगी परीक्षाओं के अंग्रेजी सेक्शन की तैयारी को मजबूत बनाते हैं।" : "You can browse curated Daily Vocabulary cards complete with parts of speech, Hindi meanings, synonyms, antonyms, and practical usage examples."
            },
            {
              id: 8,
              q: language === 'hi' ? "9. सपोर्ट टीम से संपर्क कैसे करें या कम्युनिटी ग्रुप्स कैसे जॉइन करें?" : "9. How do I reach customer support or join community groups?",
              a: language === 'hi' ? "'Contact Us' पेज पर जाकर आप सीधे एडमिन को संदेश भेज सकते हैं अथवा हमारे आधिकारिक टेलीग्राम, यूट्यूब, इंस्टाग्राम, व्हाट्सएप और रेडिट चैनलों से जुड़ सकते हैं।" : "Head over to the 'Contact Us' page to submit a direct inquiry to our desk or join our verified Telegram, WhatsApp, YouTube, Instagram, and Reddit channels."
            },
            {
              id: 9,
              q: language === 'hi' ? "10. क्या मैं मोबाइल फोन, टैबलेट और लैपटॉप/पीसी सभी पर टेस्ट दे सकता हूँ?" : "10. Can I take tests across mobile, tablet, and desktop devices?",
              a: language === 'hi' ? "हाँ, हमारा वेब और मोबाइल ऐप दोनों पूर्णतः अनुकूलित हैं। आप किसी भी डिवाइस पर अपनी सुविधानुसार टेस्ट दे सकते हैं और आपका डेटा सभी डिवाइस पर सिंक रहता है।" : "Yes, our web portal and Android app are fully responsive and cross-synced. You can seamlessly practice on any smartphone, tablet, or desktop computer."
            }
          ].map((faq) => {
            const isOpen = activeFaq === faq.id;
            return (
              <div key={faq.id} className="border-b border-slate-100 dark:border-slate-800/80 last:border-b-0 pb-3.5 pt-1">
                <button
                  onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between text-left py-1.5 font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer gap-3"
                >
                  <span>{faq.q}</span>
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-xs shrink-0 font-mono">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-2 pb-1 font-medium animate-in fade-in duration-200">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CONTACT US & OFFICIAL CHANNELS SECTION (MANAGED BY ADMIN VIA MANAGE CONTACT LINKS) */}
      <section className="py-10 md:py-14 px-4 sm:px-6 md:px-10 max-w-7xl w-full mx-auto relative z-10 border-t border-slate-300 dark:border-slate-800 space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            {language === 'hi' ? 'संपर्क करें एवं आधिकारिक चैनल' : 'Contact Us & Official Channels'}
          </h2>
        </div>

        {/* Dynamic Contact & Social Links Grid (4 Buttons In A Single Row) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full">
          {contactLinks.map((channel) => {
            const isEmail = channel.id === 'email';

            // Channel button style mapping
            const btnBgStyles: Record<string, string> = {
              email: 'bg-[#EA4335] hover:bg-[#d9382a] text-white',
              telegram: 'bg-[#229ED9] hover:bg-[#1c8ec4] text-white',
              youtube: 'bg-[#FF0000] hover:bg-[#e00000] text-white',
              instagram: 'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-95 text-white',
              linkedin: 'bg-[#0A66C2] hover:bg-[#084e96] text-white',
              reddit: 'bg-[#FF4500] hover:bg-[#e03d00] text-white',
              whatsapp: 'bg-[#25D366] hover:bg-[#20bd5a] text-white',
              x: 'bg-black hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-black',
            };

            const btnBg = btnBgStyles[channel.id] || 'bg-blue-600 hover:bg-blue-700 text-white';

            return (
              <div
                key={channel.id}
                className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-300 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl p-3 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between group gap-2"
              >
                {/* Top Bar: Icon Badge & Channel Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] text-white shrink-0 shadow-2xs ${channel.badgeBg || 'bg-blue-600'}`}>
                    {channel.badgeText || (channel.name ? channel.name.slice(0, 2).toUpperCase() : 'MT')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {channel.name}
                    </h4>
                    <p className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                      {channel.handle}
                    </p>
                  </div>
                </div>

                {/* Bottom Action Buttons (Very Small Compact Sizing) */}
                <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5">
                  <a
                    href={channel.url}
                    target={isEmail ? undefined : "_blank"}
                    rel={isEmail ? undefined : "noopener noreferrer"}
                    className={`flex-1 py-1 px-2 rounded-md font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer ${btnBg}`}
                  >
                    {isEmail ? <Mail className="w-2.5 h-2.5 shrink-0" /> : <ExternalLink className="w-2.5 h-2.5 shrink-0" />}
                    <span className="truncate">
                      {isEmail 
                        ? (language === 'hi' ? 'ईमेल भेजें' : 'Send Email')
                        : (language === 'hi' ? 'खोलें' : `Open ${channel.name}`)}
                    </span>
                  </a>

                  {isEmail && (
                    <button
                      onClick={() => {
                        if (channel.handle) {
                          navigator.clipboard.writeText(channel.handle);
                          setCopiedContactEmail(true);
                          setTimeout(() => setCopiedContactEmail(false), 2000);
                        }
                      }}
                      className="py-1 px-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9px] flex items-center justify-center gap-0.5 transition cursor-pointer shrink-0"
                      title={language === 'hi' ? 'ईमेल कॉपी करें' : 'Copy Email Address'}
                    >
                      {copiedContactEmail ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-green-600 dark:text-green-400" />
                          <span className="text-[8.5px] text-green-600 dark:text-green-400">{language === 'hi' ? 'कॉपी!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5 text-slate-500" />
                          <span className="text-[8.5px]">{language === 'hi' ? 'कॉपी' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Quick Contact & Direct Inquiry Banner (White Color Tile) */}
        <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>{language === 'hi' ? 'सक्रिय सपोर्ट डेस्क' : 'Active Support Desk'}</span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              {language === 'hi' ? 'क्या आपके पास कोई प्रश्न या समस्या है?' : 'Have a question, feedback, or grievance?'}
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium max-w-xl">
              {language === 'hi'
                ? 'हमारे सपोर्ट डेस्क को संदेश भेजें। हमारी टीम 2 घंटे के भीतर आपके प्रश्नों का समाधान करती है।'
                : 'Send a direct ticket to our administrative team. We typically respond within 2 hours.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center">
            <button
              onClick={() => setRightView('contact')}
              className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'सपोर्ट पोर्टल खोलें' : 'Open Support Desk'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER (Full width anchor at the bottom of scroll container) */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-8 px-6 md:px-12 mt-8 -mx-3 md:-mx-6 text-center text-xs text-slate-500 dark:text-slate-400 shrink-0">
        <p className="font-bold">© 2026 MockTest Hub. All rights reserved.</p>
        <p className="mt-1 text-[11px]">Developed to simulate real-world government selection computer based assessments.</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            onClick={() => setRightView('contact')}
            className="hover:text-blue-600 dark:hover:text-blue-400 font-bold transition cursor-pointer"
          >
            Contact Us
          </button>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <button
            onClick={() => setRightView('terms')}
            className="hover:text-blue-600 dark:hover:text-blue-400 font-bold transition cursor-pointer"
          >
            Terms & Conditions
          </button>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <button
            onClick={() => setRightView('privacy')}
            className="hover:text-blue-600 dark:hover:text-blue-400 font-bold transition cursor-pointer"
          >
            Privacy Policy
          </button>
        </div>
      </footer>
            </>
          )}

        </main>
      </div>



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

      {/* Floating Support Team Overlay Widget on Home Screen (Same small circle expandable variant as Test Series page) */}
      <HomeSupportWidget variant="expandable" />
    </div>
  );
}

