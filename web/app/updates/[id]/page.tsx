"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { 
  ArrowLeft, ExternalLink, ChevronRight, Trophy, Bell, FileText, 
  ShieldCheck, Sun, Moon, Calendar, Clock, Share2, Check, Sparkles, 
  Download, BookOpen, AlertCircle, Building2, User, UserCheck, CheckCircle2,
  Bookmark, BookmarkCheck, Layers, Compass, HelpCircle, ArrowUpRight, ArrowRight, ListChecks,
  LayoutDashboard
} from 'lucide-react';
import { TRANSLATIONS } from '../../translations';
import { useIsMobile } from '../../useIsMobile';

interface NoticeDetailPageProps {
  params: Promise<{ id: string }>;
}

interface ParsedActionLink {
  label: string;
  url: string;
  iconType: 'apply' | 'download' | 'official' | 'video' | 'general';
}

function extractParsedLinks(html: string): ParsedActionLink[] {
  if (!html) return [];
  const links: ParsedActionLink[] = [];

  const idx = html.toLowerCase().indexOf('important link');
  if (idx === -1) return [];

  const linksSection = html.substring(idx);
  const linkRegex = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let match;

  while ((match = linkRegex.exec(linksSection)) !== null) {
    const rawLabel = match[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
    const cell2 = match[2];
    
    const hrefMatch = /href=["']([^"']*)["']/i.exec(cell2);
    if (hrefMatch && rawLabel) {
      const url = hrefMatch[1].trim();
      const lowerLabel = rawLabel.toLowerCase();

      if (
        lowerLabel.includes('whatsapp') || 
        lowerLabel.includes('telegram') || 
        lowerLabel.includes('reels') || 
        lowerLabel.includes('youtube') ||
        lowerLabel.includes('video') ||
        lowerLabel.includes('how to fill') ||
        lowerLabel.includes('watch') ||
        lowerLabel.includes('hindi video') ||
        lowerLabel.includes('short notification')
      ) {
        continue;
      }

      let iconType: 'apply' | 'download' | 'official' | 'video' | 'general' = 'general';
      if (lowerLabel.includes('apply') || lowerLabel.includes('form') || lowerLabel.includes('login') || lowerLabel.includes('registration')) {
        iconType = 'apply';
      } else if (lowerLabel.includes('download') || lowerLabel.includes('notification') || lowerLabel.includes('pdf') || lowerLabel.includes('syllabus') || lowerLabel.includes('result') || lowerLabel.includes('admit')) {
        iconType = 'download';
      } else if (lowerLabel.includes('official') || lowerLabel.includes('website')) {
        iconType = 'official';
      }

      links.push({ label: rawLabel, url, iconType });
    }
  }

  return links;
}

function sanitizeNoticeHtml(html: string): string {
  if (!html) return '';
  let clean = html;

  // 1. Remove <header class="entry-header">...</header>
  clean = clean.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

  // 2. Remove all top <h1>...</h1> tags
  clean = clean.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');

  // 3. Remove individual <h2> tags whose OWN text contains title keywords (prevent cross-h2 matching)
  clean = clean.replace(/<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(?:Application\s*Form|Online\s*Form|Recruitment\s*20\d\d)(?:(?!<\/h2>)[\s\S])*?<\/h2>/gi, (match) => {
    if (/(?:overview|how\s*to|step|instruction|guide|process)/i.test(match)) return match;
    return '';
  });

  // 4. Remove Post Update Date / Post Date paragraphs
  clean = clean.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S])*?Post\s*(?:Update\s*)?Date(?:(?!<\/p>)[\s\S])*?<\/p>/gi, '');

  // 5. Remove Short Description paragraphs
  clean = clean.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S])*?Short\s*Description(?:(?!<\/p>)[\s\S])*?<\/p>/gi, '');

  // 6. Remove video and social media promotion rows in ANY table (Watch Video, Hindi Video, Telegram/Whatsapp)
  clean = clean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Watch\s*Video|Hindi\s*Video|Short\s*Notification\s*\(?[\w\s]*Video|Join\s*Free\s*Information|Information\s*Channel|Official\s*Whatsapp|Official\s*Telegram)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');

  // 7. Remove Selection Procedure / Selection Process / Selection Mode tables, rows, headings, and paragraphs
  clean = clean.replace(/<table[^>]*>(?:(?!<\/table>)[\s\S])*?Selection\s*(?:Procedure|Process|Mode)(?:(?!<\/table>)[\s\S])*?<\/table>/gi, (match) => {
    if (/(?:Application\s*Fee|Important\s*Dates|Age\s*Limit|Vacancy|Eligibility|Overview)/i.test(match)) {
      return match.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?Selection\s*(?:Procedure|Process|Mode)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
    }
    return '';
  });
  clean = clean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?Selection\s*(?:Procedure|Process|Mode)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
  clean = clean.replace(/<h[234][^>]*>(?:(?!<\/h[234]>)[\s\S])*?Selection\s*(?:Procedure|Process|Mode)(?:(?!<\/h[234]>)[\s\S])*?<\/h[234]>/gi, '');
  // 8. Clean fixed inline width attributes from tables, th, td to prevent responsive overflow
  clean = clean.replace(/\s*width=["']?\d+(?:px|%)?["']?/gi, '');

  // 9. Wrap all table elements (like Category-wise Vacancy tables) in a responsive scroll container
  clean = clean.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match) => {
    const tableBody = match.replace(/^<table[^>]*>/i, '').replace(/<\/table>$/i, '');
    return `<div class="notice-table-wrapper overflow-x-auto max-w-full my-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900"><table class="w-full text-left">${tableBody}</table></div>`;
  });

  // 10. Remove any leftover empty paragraphs or &nbsp; at top
  clean = clean.replace(/^(?:\s*<p>\s*(?:&nbsp;|\s*)*<\/p>)*/gi, '');

  return clean.trim();
}

export default function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const { currentUser, updateTrackedJobs, noticesList, theme, toggleTheme, language, setLanguage } = useAuth();
  const router = useRouter();
  const { isMobile, isMounted } = useIsMobile();
  const [noticeId, setNoticeId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState('overview');

  // Save & Track states
  const [isTrackedSaved, setIsTrackedSaved] = React.useState(false);
  const [isTrackedApplied, setIsTrackedApplied] = React.useState(false);
  const [appliedDate, setAppliedDate] = React.useState('');
  const [applicationNo, setApplicationNo] = React.useState('');
  const [saveToast, setSaveToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then(p => setNoticeId(p.id));
  }, [params]);

  const notice = noticeId ? noticesList.find(n => n.id === noticeId) : null;
  const parsedLinks = React.useMemo(() => notice?.contentHtml ? extractParsedLinks(notice.contentHtml) : [], [notice]);
  const sanitizedContent = React.useMemo(() => notice?.contentHtml ? sanitizeNoticeHtml(notice.contentHtml) : '', [notice]);

  // Load tracked state for current user
  React.useEffect(() => {
    if (!noticeId || !currentUser) {
      setIsTrackedSaved(false);
      setIsTrackedApplied(false);
      return;
    }
    try {
      const stored = currentUser.trackedJobs || [];
      const item = stored.find((j: any) => j.noticeId === noticeId);
      if (item) {
        setIsTrackedSaved(!!item.isSaved);
        setIsTrackedApplied(!!item.isApplied);
        setAppliedDate(item.appliedDate || '');
        setApplicationNo(item.applicationNo || '');
      } else {
        setIsTrackedSaved(false);
        setIsTrackedApplied(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [noticeId, currentUser]);

  const saveToTrackedJobs = (newSaved: boolean, newApplied: boolean, dateStr?: string, appNoStr?: string) => {
    if (!notice || !currentUser) return;
    try {
      let list = currentUser.trackedJobs || [];
      const index = list.findIndex((j: any) => j.noticeId === notice.id);

      const updatedObj = {
        noticeId: notice.id,
        title: notice.title,
        category: notice.category,
        date: notice.date,
        lastDate: notice.lastDate,
        isSaved: newSaved,
        isApplied: newApplied,
        appliedDate: dateStr !== undefined ? dateStr : (newApplied ? (appliedDate || new Date().toISOString().split('T')[0]) : ''),
        applicationNo: appNoStr !== undefined ? appNoStr : applicationNo,
        updatedAt: new Date().toISOString()
      };

      let updatedList = [...list];
      if (!newSaved && !newApplied) {
        updatedList = updatedList.filter((j: any) => j.noticeId !== notice.id);
      } else if (index >= 0) {
        updatedList[index] = { ...updatedList[index], ...updatedObj };
      } else {
        updatedList.push(updatedObj);
      }

      updateTrackedJobs(updatedList);
    } catch (e) {
      console.error(e);
    }
  };

  const requireAuthOrRedirect = () => {
    if (!currentUser) {
      router.push('/auth');
      return false;
    }
    return true;
  };

  const handleToggleSave = () => {
    if (!requireAuthOrRedirect()) return;
    const nextSaved = !isTrackedSaved;
    setIsTrackedSaved(nextSaved);
    saveToTrackedJobs(nextSaved, isTrackedApplied);
    setSaveToast(nextSaved ? 'Job saved to your Profile!' : 'Removed from saved jobs.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleToggleApplied = () => {
    if (!requireAuthOrRedirect()) return;
    const nextApplied = !isTrackedApplied;
    const today = new Date().toISOString().split('T')[0];
    setIsTrackedApplied(nextApplied);
    if (nextApplied && !appliedDate) {
      setAppliedDate(today);
    }
    saveToTrackedJobs(isTrackedSaved, nextApplied, nextApplied ? (appliedDate || today) : '');
    setSaveToast(nextApplied ? 'Marked as Applied in your Profile!' : 'Application status reset.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleApplicationNoChange = (val: string) => {
    setApplicationNo(val);
    saveToTrackedJobs(isTrackedSaved, isTrackedApplied, appliedDate, val);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (typeof window !== 'undefined') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Category theme styling
  const categoryConfig: Record<string, {
    bannerBg: string;
    badgeBg: string;
    badgeText: string;
    accentBg: string;
    accentText: string;
    icon: React.ReactNode;
    label: string;
  }> = {
    notice: {
      bannerBg: 'from-blue-600 to-indigo-700',
      badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      badgeText: 'bg-blue-600 text-white',
      accentBg: 'bg-blue-50 dark:bg-blue-950/30',
      accentText: 'text-blue-600 dark:text-blue-400',
      icon: <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      label: 'Recruitment Notification',
    },
    result: {
      bannerBg: 'from-emerald-600 to-teal-700',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      badgeText: 'bg-emerald-600 text-white',
      accentBg: 'bg-emerald-50 dark:bg-emerald-950/30',
      accentText: 'text-emerald-600 dark:text-emerald-400',
      icon: <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      label: 'Exam Result & Selection List',
    },
    admit_card: {
      bannerBg: 'from-amber-600 to-orange-700',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      badgeText: 'bg-amber-600 text-white',
      accentBg: 'bg-amber-50 dark:bg-amber-950/30',
      accentText: 'text-amber-600 dark:text-amber-400',
      icon: <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      label: 'Admit Card / Hall Ticket',
    },
    answer_key: {
      bannerBg: 'from-purple-600 to-violet-700',
      badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      badgeText: 'bg-purple-600 text-white',
      accentBg: 'bg-purple-50 dark:bg-purple-950/30',
      accentText: 'text-purple-600 dark:text-purple-400',
      icon: <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
      label: 'Official Answer Key',
    },
  };

  const config = categoryConfig[notice?.category || 'notice'] || categoryConfig.notice;
  const t = TRANSLATIONS[language];

  if (!isMounted) return null;

  if (!noticeId || noticesList.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-500">Loading recruitment details...</p>
        </div>
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto animate-bounce" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notice Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">The requested recruitment page might have been updated or moved.</p>
          <Link href="/updates" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md">
            <ArrowLeft className="h-4 w-4" /> Return to Advisory Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-sky-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-955 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200 relative pb-20 overflow-x-hidden">

      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[45%] right-0 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* HEADER SECTION (EXACT MATCH WITH NOTIFICATION PAGE) */}
      <header className="h-16 sticky top-0 z-40 px-3 sm:px-6 md:px-12 flex items-center justify-between shadow-sm bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-900">
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0">
          {/* Back Button BEFORE Logo */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer active:scale-95"
            title={language === 'hi' ? 'वापस' : 'Back'}
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            <span className="hidden xs:inline">{language === 'hi' ? 'वापस' : 'Back'}</span>
          </button>

          {/* Logo - Full Mock Test Hub Logo on All Views */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-1.5 sm:p-2 rounded-full shadow-sm flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 border border-blue-200/50 dark:border-slate-700 shrink-0">
              <Trophy className="h-4 w-4 sm:h-5.5 sm:w-5.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-extrabold text-xs sm:text-sm leading-tight text-slate-900 dark:text-white tracking-wider truncate">{t.logoTitle}</h1>
              <p className="text-[7.5px] sm:text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase truncate">{t.logoSub}</p>
            </div>
          </Link>

          {/* Navigation Links (Desktop) */}
          {!isMobile && (
            <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-400">
              <Link href="/" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navHome}</Link>
              <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navTestSeries}</Link>
              <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors font-black text-blue-600">{t.navUpdates}</Link>
              {currentUser && ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role) && (
                <Link href="/admin" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navAdmin}</Link>
              )}
            </nav>
          )}
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2.5">
          {/* My Profile Button */}
          <Link
            href="/profile"
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer active:scale-95 shadow-2xs"
            title={language === 'hi' ? 'मेरी प्रोफ़ाइल' : 'My Profile'}
          >
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className={isMobile ? 'hidden' : ''}>{language === 'hi' ? 'प्रोफ़ाइल' : 'My Profile'}</span>
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
      <main className="max-w-7xl mx-auto px-2.5 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 relative z-10 overflow-x-hidden w-full">

        {/* HERO HEADER CARD (RESULTNOTIFY STYLE TOP CARD) */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 shadow-sm relative overflow-hidden w-full">
          
          {/* Small Share Icon Button on Top Right Corner (Mobile View Only) */}
          <button
            type="button"
            onClick={handleShare}
            className="sm:hidden absolute top-3.5 right-3.5 p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 shrink-0 active:scale-95 transition cursor-pointer shadow-sm z-20 backdrop-blur-xs"
            title="Share Notice Link"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Share2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            
            <div className="flex items-start gap-3 sm:gap-4 md:gap-6 flex-1 min-w-0">
              {/* Category Icon Badge */}
              <div className="p-3 sm:p-3.5 md:p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 shrink-0 flex items-center justify-center">
                {config.icon}
              </div>

              {/* Content Details */}
              <div className="min-w-0 flex-1 space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pr-10 sm:pr-0">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider border ${config.badgeBg}`}>
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
                    {config.label}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-slate-200 dark:border-slate-700">
                    <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500" />
                    Published: {notice.date}
                  </span>

                  {notice.lastDate && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wider animate-pulse">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-500" />
                      Last Date: {notice.lastDate}
                    </span>
                  )}
                </div>

                <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-snug sm:leading-tight tracking-tight break-words">
                  {notice.title}
                </h1>

                {/* Direct Quick Action Pills (Desktop Only) */}
                {notice.url && (
                  <div className="hidden sm:block pt-1">
                    <a
                      href={notice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-yellow-300" /> Direct Apply / Download <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                )}

              </div>
            </div>

            {/* TOP RIGHT ACTION BUTTONS & BOTTOM RIGHT SHARE BUTTON */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 shrink-0 self-stretch lg:self-auto pt-3 lg:pt-0 border-t border-slate-100 dark:border-slate-800/80 lg:border-0">
              
              {/* Actions Row: Save Job & Mark as Applied */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                {/* Save Job Button */}
                <button
                  type="button"
                  onClick={handleToggleSave}
                  className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 shadow-2xs ${
                    isTrackedSaved
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Bookmark className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isTrackedSaved ? 'fill-white text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{isTrackedSaved ? 'Saved Job ✓' : 'Save Job'}</span>
                </button>

                {/* Mark as Applied Button */}
                <button
                  type="button"
                  onClick={handleToggleApplied}
                  className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 shadow-2xs ${
                    isTrackedApplied
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isTrackedApplied ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{isTrackedApplied ? 'Marked Applied ✓' : 'Mark as Applied'}</span>
                </button>
              </div>

              {/* Share Announcement Link Button (Desktop View Only) */}
              <div className="hidden sm:flex pt-1 sm:pt-0 sm:mt-auto justify-end w-full">
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-2xs"
                  title="Share Notice Link"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Share2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                  <span>{copied ? 'Link Copied!' : (language === 'hi' ? 'शेयर करें' : 'Share Announcement')}</span>
                </button>
              </div>

              {/* Direct Apply / Download Button at the Very Bottom (Mobile View Only) */}
              {notice.url && (
                <div className="sm:hidden pt-1 w-full">
                  <a
                    href={notice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-3 rounded-2xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-yellow-300" /> Direct Apply / Download <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              )}

            </div>

          </div>
        </section>

        {/* TWO-COLUMN LAYOUT (LEFT CONTENT + RIGHT SIDEBAR DOCK) */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] w-full">

          {/* LEFT MAIN CONTENT COLUMN */}
          <div className="space-y-4 sm:space-y-6 w-full min-w-0">

            {/* QUICK ACCESS NAVIGATION BAR (RESULTNOTIFY PILL NAV WITH HORIZONTAL SCROLL) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-2 sm:p-2.5 rounded-2xl shadow-sm overflow-x-auto no-scrollbar flex items-center gap-2 sticky top-16 sm:top-20 z-30 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 whitespace-nowrap scroll-smooth touch-pan-x w-full">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2 sm:px-3 py-1 shrink-0 flex items-center gap-1">
                <Compass className="h-3.5 w-3.5 text-blue-500" /> Quick Access:
              </span>

              <button
                onClick={() => scrollToSection('sec-overview')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
                  activeSection === 'overview'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Overview
              </button>

              <button
                onClick={() => scrollToSection('sec-links')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
                  activeSection === 'links'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Important Links ({parsedLinks.length})
              </button>

              <button
                onClick={() => scrollToSection('sec-full-content')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
                  activeSection === 'full-content'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Complete Breakdown
              </button>
            </div>

            {/* 1. OVERVIEW & QUICK METRICS CARD */}
            <div id="sec-overview" className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-sm space-y-3.5 sm:space-y-5 overflow-hidden w-full">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4 gap-2 flex-wrap sm:flex-nowrap min-w-0">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
                    <Building2 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">Recruitment Overview</h2>
                    <p className="text-[9.5px] sm:text-[11px] text-slate-400 font-semibold truncate">Key summary metrics at a glance</p>
                  </div>
                </div>

                <span className="text-[8.5px] sm:text-[10px] bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300 font-extrabold px-2 sm:px-3 py-1 rounded-full uppercase border border-green-200 dark:border-green-800 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="h-3 w-3" /> Official Verified
                </span>
              </div>

              {/* 4 Metrics Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full">
                <div className="bg-slate-50 dark:bg-slate-950/50 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-0.5 min-w-0 flex flex-col justify-center">
                  <span className="text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Notice Category</span>
                  <p className="text-[10.5px] sm:text-xs font-black text-slate-900 dark:text-white uppercase truncate">{notice.category?.replace('_', ' ')}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-0.5 min-w-0 flex flex-col justify-center">
                  <span className="text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Publish Date</span>
                  <p className="text-[10.5px] sm:text-xs font-black text-slate-900 dark:text-white truncate">{notice.date}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-0.5 min-w-0 flex flex-col justify-center">
                  <span className="text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Application Deadline</span>
                  <p className="text-[10.5px] sm:text-xs font-black text-rose-600 dark:text-rose-400 truncate">{notice.lastDate || 'See Notification'}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-0.5 min-w-0 flex flex-col justify-center">
                  <span className="text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Portal Status</span>
                  <p className="text-[10.5px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 truncate">Active Window</p>
                </div>
              </div>
            </div>

            {/* 2. PARSED SOME USEFUL IMPORTANT LINKS GRID CARD (LIGHT THEME) */}
            {parsedLinks.length > 0 && (
              <div id="sec-links" className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 shadow-sm space-y-3.5 sm:space-y-5 overflow-hidden w-full">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4 gap-2 flex-wrap sm:flex-nowrap min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
                      <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs sm:text-base font-black tracking-wide text-slate-900 dark:text-white uppercase truncate">Some Useful Important Links</h2>
                      <p className="text-[9.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-tight mt-0.5">Direct access buttons for online registration, syllabus & notification PDF</p>
                    </div>
                  </div>
                  <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[9px] sm:text-[10px] font-black px-2.5 sm:px-3 py-1 rounded-full uppercase border border-blue-200 dark:border-blue-800 hidden sm:inline-block shrink-0">
                    {parsedLinks.length} Direct Links
                  </span>
                </div>

                {/* Grid of Link Cards in Light Theme */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 w-full">
                  {parsedLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group bg-slate-50 dark:bg-slate-955 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-200 flex items-center justify-between gap-2 sm:gap-3 shadow-2xs hover:shadow-sm active:scale-98 cursor-pointer w-full min-w-0"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/60 group-hover:bg-blue-600 text-blue-700 dark:text-blue-300 group-hover:text-white transition shrink-0">
                          {link.iconType === 'apply' && <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                          {link.iconType === 'download' && <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                          {link.iconType === 'official' && <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                          {link.iconType === 'video' && <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                          {link.iconType === 'general' && <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug break-words">
                            {link.label}
                          </p>
                          <span className="text-[8px] sm:text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block mt-0.5 truncate">
                            Click to Open Direct Portal
                          </span>
                        </div>
                      </div>

                      <span className="bg-blue-600 text-white group-hover:bg-blue-700 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 transition flex items-center gap-0.5 sm:gap-1 shadow-sm">
                        Open <ChevronRight className="h-3 w-3" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 3. COMPLETE RECRUITMENT DETAILS (BODY HTML RENDER) */}
            <div id="sec-full-content" className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 w-full">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Complete Recruitment Breakdown</h2>
                    <p className="text-[11px] text-slate-400 font-semibold">Important dates, application fee, age limit, vacancies & eligibility details</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-extrabold px-3 py-1 rounded-full uppercase">
                  Official Details
                </span>
              </div>

              {sanitizedContent ? (
                <div
                  className="notice-custom-body"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
              ) : (
                <div className="py-16 text-center space-y-4">
                  <AlertCircle className="h-10 w-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Full recruitment breakdown is being updated. Click below to open official portal directly.
                  </p>
                  {notice.url && (
                    <a
                      href={notice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-xs shadow-lg shadow-blue-600/25"
                    >
                      Open Official Link <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDEBAR DOCK (RESULTNOTIFY SIDEBAR STYLE - HIDDEN ON MOBILE VIEW ONLY) */}
          <aside className="space-y-6 hidden md:block">

            {/* STICKY QUICK ACTION CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5 sticky top-24">
              
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Quick Actions</h3>
              </div>

              <div className="space-y-3">
                {notice.url && (
                  <a
                    href={notice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" /> Apply / Download Now <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
              </div>

              {/* APPLICATION CHECKLIST */}
              <div className="bg-slate-50 dark:bg-slate-955 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4 text-blue-500" /> Candidate Checklist:
                </span>
                
                <ul className="text-xs space-y-2 font-bold text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Check eligibility criteria before applying</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Verify age limit as on cut-off date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Keep scanned photo & signature ready</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Submit form before deadline: <strong>{notice.lastDate || 'As per notice'}</strong></span>
                  </li>
                </ul>
              </div>

              {/* SHARE NOTICE CARD */}
              <div className="pt-2">
                <button
                  onClick={handleShare}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
                  <span>{copied ? 'Link Copied to Clipboard!' : 'Share Announcement Link'}</span>
                </button>
              </div>

            </div>

            {/* SAVE & TRACK SECTION (RESULTNOTIFY SIDEBAR FEATURE) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              
              {/* Toast Feedback */}
              {saveToast && (
                <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold p-3 rounded-2xl animate-in fade-in flex items-center justify-between shadow-xs">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {saveToast}
                  </span>
                  <Link href="/profile" className="text-[10px] underline font-black uppercase">
                    View Profile
                  </Link>
                </div>
              )}

              {/* Card Header */}
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                  <BookmarkCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Save & Track</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Track your application progress</p>
                </div>
              </div>

              {/* Actions List */}
              <div className="space-y-2.5">
                
                {/* 1. Bookmark / Save Job Toggle */}
                <button
                  onClick={handleToggleSave}
                  className={`w-full py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition cursor-pointer active:scale-98 ${
                    isTrackedSaved
                      ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-955 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bookmark className={`h-4 w-4 ${isTrackedSaved ? 'fill-blue-600 text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                    <span>{isTrackedSaved ? 'Job Saved to Profile' : 'Save Job'}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* 2. Mark as Applied Toggle */}
                <button
                  onClick={handleToggleApplied}
                  className={`w-full py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition cursor-pointer active:scale-98 ${
                    isTrackedApplied
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-955 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className={`h-4 w-4 ${isTrackedApplied ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    <span>{isTrackedApplied ? 'Marked as Applied ✓' : 'Mark as Applied'}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* Expandable Application Details when Marked as Applied */}
                {isTrackedApplied && (
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Applied Date: {appliedDate || new Date().toISOString().split('T')[0]}
                      </span>
                      <span className="bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">Active</span>
                    </div>
                    
                    <div>
                      <label className="block text-[9.5px] font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">
                        Registration / Roll No. (Optional)
                      </label>
                      <input
                        type="text"
                        value={applicationNo}
                        onChange={(e) => handleApplicationNoChange(e.target.value)}
                        placeholder="e.g. REG-2026-88492"
                        className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400 font-semibold"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Track Updates & Reminders Button */}
                <button
                  onClick={() => {
                    setSaveToast('Reminders synced to your profile!');
                    setTimeout(() => setSaveToast(null), 3000);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-955 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-between transition cursor-pointer active:scale-98"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="h-4 w-4 text-slate-400" />
                    <span>Track Updates & Reminders</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* 4. View My Saved & Applied Jobs Button */}
                <Link
                  href="/profile"
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black flex items-center justify-between transition cursor-pointer active:scale-98 shadow-md shadow-blue-600/20"
                >
                  <div className="flex items-center gap-2.5">
                    <BookmarkCheck className="h-4 w-4 text-yellow-300" />
                    <span>View My Saved & Applied Jobs</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Helper Footer Banner */}
              {!currentUser ? (
                <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 font-semibold space-y-2.5">
                  <p className="leading-snug">
                    Please log in to mark jobs as applied, save notifications, and track your application deadlines in your profile.
                  </p>
                  <Link
                    href="/auth"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-blue-600/20 active:scale-98"
                  >
                    <User className="h-4 w-4" />
                    <span>Log In to Save & Track</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 font-semibold space-y-2">
                  <p className="leading-snug">
                    Saved & applied jobs are automatically synced and tracked in your Profile for future reference.
                  </p>
                  <Link href="/profile" className="inline-flex items-center gap-1.5 font-extrabold text-amber-900 dark:text-amber-200 hover:underline">
                    View My Saved & Applied Jobs <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}

            </div>

          </aside>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-8 px-4 text-center text-xs text-slate-500 font-bold transition-colors duration-200 mt-16">
        <p>© 2026 MockTest Hub. All rights reserved.</p>
      </footer>
    </div>
  );
}
