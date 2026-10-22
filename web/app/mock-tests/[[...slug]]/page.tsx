"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Runs before the browser paints (plain effect on the server), so the page never shows a
// blank frame or the wrong level for a moment when it opens.
const useBeforePaint = typeof window !== 'undefined' ? React.useLayoutEffect : useEffect;
import { useAuth, TestCategory, TestSubCategory, MockTestItem } from '../../AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { TEST_SERIES_BASE, buildTestSeriesPath, resolveTestSeriesPath, testSeriesSegments } from '../../lib/testSeriesUrl';
import Link from 'next/link';
import { BookOpen, ShieldAlert, Award, ArrowLeft, Search, GraduationCap, ChevronRight, Check, Sun, Moon, Bookmark, Trash2, ChevronUp, ChevronDown, Menu, TrendingUp, Coins, MapPin, Sparkles, Trophy, Star, Clock, UploadCloud, FolderOpen, Zap, History, Layers, LayoutGrid, HelpCircle } from 'lucide-react';
import { generateExamSession, EXPLANATIONS, getLocalizedName } from '../../lib/examUtils';
import { TRANSLATIONS } from '../../translations';
import { useIsMobile } from '../../useIsMobile';
import HomeSupportWidget from '../../components/HomeSupportWidget';
import { SiteHeader, PageTitle, btnSecondary } from '../../components/SiteUI';
import MockTestsTour, { requestTestsTourStart } from '../../components/MockTestsTour';
import OfflineDownloadButton from '../../components/OfflineDownloadButton';
import BookmarkedQuestions from '../../components/BookmarkedQuestions';

import { processQuestionHtml, decodeHtml } from '../../lib/mathUtils';
import { formatTestMarkingScheme } from '../../lib/markingUtils';

const renderTestMarkingSchemePill = (test: MockTestItem) => {
  return null;
};

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

const renderSectionalTimingPill = (test: MockTestItem, lang: string = 'en') => {
  if (!test.hasSectionalTiming) return null;

  let timingsArr: number[] = [];
  if (Array.isArray(test.sectionalTimings)) {
    timingsArr = (test.sectionalTimings as any[]).map((n: any) => Number(n)).filter((n: number) => !isNaN(n) && n > 0);
  } else if (typeof test.sectionalTimings === 'string' && (test.sectionalTimings as string).trim()) {
    timingsArr = (test.sectionalTimings as string).split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n) && n > 0);
  }

  const isHi = lang === 'hi';
  const timingText = timingsArr.length > 0 ? `${timingsArr.join('m, ')}m` : (isHi ? 'सक्षम' : 'ENABLED');

  return (
    <span className="bg-purple-500/10 text-purple-700 dark:bg-purple-500/5 dark:text-purple-300 text-[11px] font-semibold px-2 py-0.5 rounded-md border border-purple-500/20 font-mono flex items-center gap-1">
      {isHi ? 'अनुभागीय समय' : 'Sectional timing'}: {timingText}
    </span>
  );
};

const renderLastAttemptMarks = (attempts: any[], lang: string = 'en') => {
  if (!attempts || attempts.length === 0) return null;
  const lastAttempt = [...attempts].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];
  if (!lastAttempt) return null;

  const isHi = lang === 'hi';
  const score = lastAttempt.score ?? 0;
  const maxScore = lastAttempt.maxScore ?? 200;

  return (
    <div className="flex items-center justify-center self-center my-auto shrink-0 mx-auto sm:mx-3">
      <div className="inline-flex items-center justify-center gap-1.5 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 px-3 py-1 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {isHi ? 'पिछला प्रयास:' : 'Last Attempt:'}
        </span>
        <span className="font-semibold text-[#1e4e79] dark:text-blue-400 font-mono text-xs">
          {score}/{maxScore}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {isHi ? 'अंक' : 'marks'}
        </span>
      </div>
    </div>
  );
};

// Helper functions for premium subcategory card styling
const getCategoryTheme = (catId: string | null) => {
  const id = catId?.toLowerCase() || '';
  if (id.includes('ssc')) {
    return {
      color: 'orange',
      bg: 'bg-orange-50/50 dark:bg-orange-950/15',
      border: 'border-orange-100 dark:border-orange-900/30',
      hoverBorder: 'hover:border-orange-400 dark:hover:border-orange-600',
      iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/45 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/30',
      gradient: 'from-orange-500 to-amber-500',
      glow: '',
      accentGlow: 'rgba(249,115,22,0.12)'
    };
  }
  if (id.includes('railway')) {
    return {
      color: 'indigo',
      bg: 'bg-indigo-50/50 dark:bg-indigo-950/15',
      border: 'border-indigo-100 dark:border-indigo-900/30',
      hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-600',
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
      gradient: 'from-indigo-500 to-blue-550',
      glow: '',
      accentGlow: 'rgba(99,102,241,0.12)'
    };
  }
  if (id.includes('banking') || id.includes('bank')) {
    return {
      color: 'emerald',
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/15',
      border: 'border-emerald-100 dark:border-emerald-900/30',
      hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
      gradient: 'from-emerald-500 to-teal-500',
      glow: '',
      accentGlow: 'rgba(16,185,129,0.12)'
    };
  }
  if (id.includes('teaching')) {
    return {
      color: 'amber',
      bg: 'bg-amber-50/50 dark:bg-amber-950/15',
      border: 'border-amber-100 dark:border-amber-900/30',
      hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
      gradient: 'from-amber-500 to-orange-500',
      glow: '',
      accentGlow: 'rgba(245,158,11,0.12)'
    };
  }
  if (id.includes('ugc') || id.includes('net')) {
    return {
      color: 'sky',
      bg: 'bg-sky-50/50 dark:bg-sky-950/15',
      border: 'border-sky-100 dark:border-sky-900/30',
      hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-600',
      iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      badgeBg: 'bg-sky-50 dark:bg-sky-950/45 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/30',
      gradient: 'from-sky-500 to-indigo-500',
      glow: '',
      accentGlow: 'rgba(14,165,233,0.12)'
    };
  }
  return {
    color: 'pink',
    bg: 'bg-pink-50/50 dark:bg-pink-950/15',
    border: 'border-pink-200 dark:border-pink-900/30',
    hoverBorder: 'hover:border-pink-400 dark:hover:border-pink-600',
    iconBg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
    badgeBg: 'bg-pink-50 dark:bg-pink-950/45 text-pink-700 dark:text-pink-400 border-pink-100 dark:border-pink-900/30',
    gradient: 'from-pink-500 to-purple-550',
    glow: 'shadow-pink-500/10 dark:shadow-pink-500/5',
    accentGlow: 'rgba(236,72,153,0.12)'
  };
};

const getSubCatIcon = (name: string, logoUrl?: string | null) => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className="w-full h-full object-contain p-1"
      />
    );
  }
  const n = name.toLowerCase();
  if (n.includes('cgl') || n.includes('cpo')) return <Award className="h-5.5 w-5.5 text-orange-500" />;
  if (n.includes('ntpc') || n.includes('group d') || n.includes('alp') || n.includes('si')) return <Trophy className="h-5.5 w-5.5 text-indigo-500" />;
  if (n.includes('net') || n.includes('science')) return <GraduationCap className="h-5.5 w-5.5 text-sky-500" />;
  if (n.includes('chsl') || n.includes('mts') || n.includes('phase')) return <BookOpen className="h-5.5 w-5.5 text-amber-500" />;
  return <GraduationCap className="h-5.5 w-5.5 text-[#1e4e79]" />;
};

export default function MockTestsCatalog() {
  const { currentUser, claimPassPro, theme, toggleTheme, toggleBookmark, clearOngoingSession, language, setLanguage, examCatalog } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [examSearchQuery, setExamSearchQuery] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');

  useBeforePaint(() => {
    setMounted(true);
  }, []);

  // Filter out Practice Series categories so they ONLY appear on the Practice Series page
  const testSeriesCatalog = React.useMemo(() => {
    return (examCatalog || []).filter(cat => cat.id !== 'practice_series' && !cat.id.startsWith('ps_')).sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [examCatalog]);

  // Tour: one real path through the catalog (category → exam → series that has tests)
  const tourTarget = React.useMemo(() => {
    // Prefer well-known categories as the example, then fall back to catalog order
    const preferred = ['ssc', 'railways'];
    const ordered = [...testSeriesCatalog].sort((a, b) => {
      const ia = preferred.indexOf(a.id); const ib = preferred.indexOf(b.id);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    for (const cat of ordered) {
      for (const sub of cat.subCategories || []) {
        for (const ss of (sub as any).subSubCategories || []) {
          if ((ss.tests || []).length > 0) return { catId: cat.id as string, examId: sub.id as string, seriesId: ss.id as string };
        }
      }
    }
    for (const cat of ordered) {
      const sub = (cat.subCategories || []).find(sc => (sc.tests || []).length > 0);
      if (sub) return { catId: cat.id as string, examId: sub.id as string, seriesId: null as string | null };
    }
    return { catId: (testSeriesCatalog[0]?.id ?? null) as string | null, examId: null as string | null, seriesId: null as string | null };
  }, [testSeriesCatalog]);

  const filteredSidebarCatalog = React.useMemo(() => {
    const q = sidebarSearch.toLowerCase().trim();
    if (!q) return testSeriesCatalog;
    return testSeriesCatalog.filter(cat => {
      const nameEn = (cat.name || '').toLowerCase();
      const nameHi = (cat.nameHi || '').toLowerCase();
      const hasSub = (cat.subCategories || []).some((sub: any) => 
        (sub.name || '').toLowerCase().includes(q) || 
        (sub.nameHi || '').toLowerCase().includes(q)
      );
      return nameEn.includes(q) || nameHi.includes(q) || hasSub;
    });
  }, [testSeriesCatalog, sidebarSearch]);

  // Compute last 5 recent tests attempted or ongoing by the user
  const recentTests = React.useMemo(() => {
    const rawSessions = currentUser?.testSessions || [];

    // Map each testId to its most recent session
    const sessionsMap = new Map<string, any>();

    const getSessionTime = (s: any): number => {
      if (!s) return 0;
      const raw = s.updatedAt || s.completedAt || s.startedAt || s.createdAt || s.savedAt || s.date;
      if (!raw) return 0;
      if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
      const parsed = new Date(raw).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };

    // 1. Add server sessions — keep the most recent session per testId
    (Array.isArray(rawSessions) ? rawSessions : []).forEach((s: any) => {
      if (s && s.testId) {
        const existing = sessionsMap.get(s.testId);
        if (!existing) {
          sessionsMap.set(s.testId, s);
        } else {
          const existingTime = getSessionTime(existing);
          const sTime = getSessionTime(s);
          if (sTime >= existingTime) {
            sessionsMap.set(s.testId, s);
          }
        }
      }
    });

    // 2. Sort: strictly by most recent timestamp
    const sortedSessions = Array.from(sessionsMap.values())
      .filter((s: any) => s && (
        s.status === 'ONGOING' ||
        s.status === 'PAUSED' ||
        s.status === 'COMPLETED' ||
        s.status === 'AUTO_SUBMITTED' ||
        s.score !== undefined
      ))
      .sort((a: any, b: any) => {
        const timeA = getSessionTime(a);
        const timeB = getSessionTime(b);
        return timeB - timeA;
      });

    const recentList: Array<{ test: MockTestItem; session: any; catId: string; subCatId: string; subSubId?: string | null }> = [];

    for (const session of sortedSessions) {
      if (!session.testId) continue;

      let foundTest: MockTestItem | null = null;
      let foundCatId: string | null = null;
      let foundSubCatId: string | null = null;
      let foundSubSubId: string | null = null;

      for (const cat of testSeriesCatalog) {
        // Check top-level category tests
        const topMatch = (cat.tests || []).find((x: any) => x.id === session.testId);
        if (topMatch) {
          foundTest = topMatch;
          foundCatId = cat.id;
          foundSubCatId = '';
          break;
        }

        for (const sub of cat.subCategories || []) {
          // Check specific subSubCategory series tabs first so we match the exact tab (e.g. Full Test vs PYQ)
          for (const ss of (sub.subSubCategories || [])) {
            const t2 = (ss.tests || []).find((x: any) => x.id === session.testId);
            if (t2) { 
              foundTest = t2; 
              foundCatId = cat.id;
              foundSubCatId = sub.id;
              foundSubSubId = ss.id;
              break; 
            }
          }
          if (foundTest) break;

          const t = (sub.tests || []).find((x: any) => x.id === session.testId);
          if (t) { 
            foundTest = t;
            foundCatId = cat.id;
            foundSubCatId = sub.id;
            // Also check if any subSubCategory has this test
            const matchingSs = (sub.subSubCategories || []).find((ss: any) => (ss.tests || []).some((x: any) => x.id === session.testId));
            if (matchingSs) {
              foundSubSubId = matchingSs.id;
            }
            break; 
          }
        }
        if (foundTest) break;
      }

      // Fallback: if not found in catalog hierarchy, construct test metadata from session
      if (!foundTest) {
        foundTest = {
          id: session.testId,
          title: session.title || session.mockTest?.title || 'Mock Test',
          questionsCount: session.mockTest?.questionsCount || 0,
          durationMinutes: session.durationMinutes || session.mockTest?.durationMinutes || 60,
          maxMarks: session.maxScore || session.mockTest?.maxMarks || 200,
          isPremium: false,
          requiredTier: 'None',
        };
        foundCatId = '';
        foundSubCatId = '';
      }

      recentList.push({ 
        test: foundTest, 
        session, 
        catId: foundCatId || '', 
        subCatId: foundSubCatId || '', 
        subSubId: foundSubSubId 
      });

      if (recentList.length >= 5) break;
    }

    return recentList;
  }, [currentUser, testSeriesCatalog]);

  // Filter exam catalog by search query (checks category name or subcategory exam name)
  const getFilteredCatalogForSearch = React.useMemo(() => {
    const query = examSearchQuery.toLowerCase().trim();
    if (!query) return testSeriesCatalog;
    
    return testSeriesCatalog.map(cat => {
      // If the category name matches, keep all its subcategories
      if (cat.name.toLowerCase().includes(query)) {
        return cat;
      }
      // Otherwise, filter subcategories that match
      const matchingSubs = (cat.subCategories || []).filter(sub => 
        sub.name.toLowerCase().includes(query)
      );
      if (matchingSubs.length > 0) {
        return {
          ...cat,
          subCategories: matchingSubs
        };
      }
      return null;
    }).filter(Boolean) as TestCategory[];
  }, [testSeriesCatalog, examSearchQuery]);

  const currentCategoryObj = React.useMemo(() => {
    return testSeriesCatalog.find(c => c.id === selectedCategory);
  }, [testSeriesCatalog, selectedCategory]);

  const getFilteredSubCategories = React.useMemo(() => {
    if (!currentCategoryObj) return [];
    const sortedSubs = [...(currentCategoryObj.subCategories || [])].sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    const query = examSearchQuery.toLowerCase().trim();
    if (!query) return sortedSubs;
    return sortedSubs.filter(sub => 
      sub.name.toLowerCase().includes(query)
    );
  }, [currentCategoryObj, examSearchQuery]);

  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [activeSubSubId, setActiveSubSubId] = useState<string | null>(null);

  // ── URL <-> view state ─────────────────────────────────────────────────────
  // Every level has its own address (like the typing test pages):
  //   /mock-tests/{category}/{exam}/{series}
  // The URL is applied to state on load, on back/forward and on links; user clicks
  // update state, and state is then written back to the URL as a new history entry.
  const pathname = usePathname() || TEST_SERIES_BASE;
  const appliedPathRef = React.useRef<string | null>(null); // path that matches the current state
  // Path the URL just asked for, until the state has caught up with it. Until then the
  // state -> URL effect must not write the old state back (that bounced the page between
  // /mock-tests and the series address forever: the flicker after "Back to Test Series").
  const pendingPathRef = React.useRef<string | null>(null);

  // URL -> state (before paint, so opening a series link doesn't flash the category list first)
  useBeforePaint(() => {
    if (typeof window === 'undefined' || testSeriesCatalog.length === 0) return;
    let segments = testSeriesSegments(pathname);
    let isLegacyLink = false;
    if (segments.length === 0) {
      // Old links: /mock-tests?cat=..&sub=..&subsub=..
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('cat');
      if (cat) {
        segments = [cat, params.get('sub') || '', params.get('subsub') || ''].filter(Boolean);
        isLegacyLink = true;
      }
    }
    const r = resolveTestSeriesPath(testSeriesCatalog, segments);
    const resolvedPath = buildTestSeriesPath(r.categoryId, r.examId, r.seriesId);
    appliedPathRef.current = resolvedPath;
    pendingPathRef.current = buildTestSeriesPath(selectedCategory, selectedSubCategory, activeSubSubId) === resolvedPath ? null : resolvedPath;
    setSelectedCategory(r.categoryId);
    setSelectedSubCategory(r.examId);
    setActiveSubSubId(r.seriesId);
    // Rewrite old query links, raw ids and old hashes to the clean address. Unknown
    // segments are left alone in case a fresher catalog still arrives.
    const keepHash = window.location.hash === '#bookmarks' ? '#bookmarks' : '';
    if ((r.exact || isLegacyLink) && (window.location.pathname !== resolvedPath || window.location.search || window.location.hash !== keepHash)) {
      window.history.replaceState(window.history.state, '', resolvedPath + keepHash);
    }
  }, [pathname, testSeriesCatalog]);

  // state -> URL
  useEffect(() => {
    if (typeof window === 'undefined' || appliedPathRef.current === null) return;
    const target = buildTestSeriesPath(selectedCategory, selectedSubCategory, activeSubSubId);
    if (pendingPathRef.current !== null) {
      if (target === pendingPathRef.current) pendingPathRef.current = null; // state caught up
      return;
    }
    if (target === appliedPathRef.current) return;
    appliedPathRef.current = target;
    window.history.pushState(null, '', target);
  }, [selectedCategory, selectedSubCategory, activeSubSubId]);

  // Page title follows the open category / exam / series
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const cat = testSeriesCatalog.find(c => c.id === selectedCategory);
    const exam = cat?.subCategories?.find(sc => sc.id === selectedSubCategory);
    const series = (exam as any)?.subSubCategories?.find((ss: any) => ss.id === activeSubSubId);
    const parts = [series?.title || series?.name, exam?.name, cat?.name].filter(Boolean);
    document.title = parts.length ? `${parts.join(' - ')} | Test Series | Mock Test Hub` : 'Test Series | Mock Test Hub';
  }, [testSeriesCatalog, selectedCategory, selectedSubCategory, activeSubSubId]);

  // Bookmarks view keeps its #bookmarks hash so back closes it
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onHash = () => setShowBookmarks(window.location.hash === '#bookmarks');
    if (window.location.hash === '#bookmarks') setShowBookmarks(true);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedSubCategory(null);
    setActiveSubSubId(null);
  };

  const handleSubCategorySelect = (subCatId: string) => {
    setSelectedSubCategory(subCatId);
    setActiveSubSubId(null);
  };

  const handleOpenRecentCategory = (catId: string, subCatId: string, subSubId?: string | null) => {
    let targetSubSubId = subSubId;
    if (!targetSubSubId) {
      const cat = testSeriesCatalog.find(c => c.id === catId);
      const sub = cat?.subCategories.find(s => s.id === subCatId);
      if (sub?.subSubCategories && sub.subSubCategories.length > 0) {
        const withTests = sub.subSubCategories.find(ss => ss.tests && ss.tests.length > 0);
        targetSubSubId = withTests ? withTests.id : sub.subSubCategories[0].id;
      }
    }
    setShowBookmarks(false);
    setSelectedCategory(catId || null);
    setSelectedSubCategory(subCatId || null);
    setActiveSubSubId(subCatId ? (targetSubSubId || null) : null);
  };

  const handleCategoryBack = () => {
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setActiveSubSubId(null);
  };

  const handleSubCategoryBack = () => {
    setSelectedSubCategory(null);
    setActiveSubSubId(null);
  };

  const handleToggleBookmarks = () => {
    const nextState = !showBookmarks;
    setShowBookmarks(nextState);
    if (typeof window !== 'undefined') {
      if (nextState) {
        window.location.hash = 'bookmarks';
      } else {
        if (window.location.hash === '#bookmarks') {
          window.history.back();
        } else {
          window.location.hash = '';
        }
      }
    }
  };

  const handleCloseBookmarks = () => {
    setShowBookmarks(false);
    if (typeof window !== 'undefined' && window.location.hash === '#bookmarks') {
      window.history.back();
    }
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [upgradePopupOpen, setUpgradePopupOpen] = useState(false);
  const [requiredTierInfo, setRequiredTierInfo] = useState<string>('');
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);

  const handleStartExam = (test: MockTestItem) => {
    if (!currentUser) {
      router.push('/auth');
      return;
    }

    // Verify Pass Access
    if (test.isPremium) {
      const userTier = currentUser.subscriptionTier;
      
      const hasAccess = 
        (test.requiredTier === 'Testbook Pass' && (userTier === 'Testbook Pass' || userTier === 'Testbook Pass Pro')) ||
        (test.requiredTier === 'Testbook Pass Pro' && userTier === 'Testbook Pass Pro');

      if (!hasAccess) {
        setRequiredTierInfo(test.requiredTier);
        setUpgradePopupOpen(true);
        return;
      }
    }

    router.push(`/exam/${test.id}`);
  };

  const handlePurchasePass = async () => {
    if (!currentUser) return;
    
    // Simulate upgrading tier on the spot
    const newTier = requiredTierInfo === 'Testbook Pass Pro' ? 'Testbook Pass Pro' : 'Testbook Pass';
    
    await claimPassPro(currentUser.id, newTier);
    
    setUpgradePopupOpen(false);
    alert(`Success! You have unlocked ${newTier.replace('Testbook', 'Mock Test')}. You can now start the mock test.`);
  };

  const getTestStatus = (testId: string) => {
    const session = currentUser?.testSessions?.find(s => s.testId === testId);
    return session?.status || null; // 'COMPLETED' | 'AUTO_SUBMITTED' | 'ONGOING' | null
  };

  const isCompleted = (testId: string) => {
    const status = getTestStatus(testId);
    return status === 'COMPLETED' || status === 'AUTO_SUBMITTED';
  };

  const getTestAttempts = (testId: string) => {
    if (!currentUser || !currentUser.testSessions) return [];
    return currentUser.testSessions.filter(
      s => s.testId === testId && (s.status === 'COMPLETED' || s.status === 'AUTO_SUBMITTED')
    );
  };

  const handleReattemptExam = (test: MockTestItem) => {
    if (!currentUser) {
      router.push('/auth');
      return;
    }

    // Wait for the saved progress to be deleted, or the test could resume from it
    clearOngoingSession(test.id).finally(() => router.push(`/exam/${test.id}`));
  };



  const { isMobile, isMounted } = useIsMobile();

  const tourResetToRoot = React.useCallback(() => {
    setShowBookmarks(false);
    setExamSearchQuery('');
    setSidebarSearch('');
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setActiveSubSubId(null);
  }, []);
  const tourOpenCategory = React.useCallback(() => {
    setSelectedCategory(tourTarget.catId);
    setSelectedSubCategory(null);
    setActiveSubSubId(null);
  }, [tourTarget]);
  const tourOpenExam = React.useCallback(() => {
    setSelectedSubCategory(tourTarget.examId);
    setActiveSubSubId(null);
  }, [tourTarget]);
  const tourOpenSeries = React.useCallback(() => {
    if (tourTarget.seriesId) setActiveSubSubId(tourTarget.seriesId);
  }, [tourTarget]);
  const testsTour = (
    <MockTestsTour
      ready={mounted && testSeriesCatalog.length > 0 && !!tourTarget.catId}
      atRoot={selectedCategory === null && !showBookmarks}
      hasSeries={!!tourTarget.seriesId}
      resetToRoot={tourResetToRoot}
      openCategory={tourOpenCategory}
      openExam={tourOpenExam}
      openSeries={tourOpenSeries}
    />
  );

  if (!mounted) return null;

  if (isMounted && isMobile) {
    // Filter tests by search query
    const getMobileFilteredCatalog = () => {
      if (!searchQuery) return testSeriesCatalog;
      return testSeriesCatalog.map(cat => ({
        ...cat,
        subCategories: cat.subCategories.map(sub => ({
          ...sub,
          tests: sub.tests.filter(t => 
            t.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
        })).filter(sub => sub.tests.length > 0)
      })).filter(cat => cat.subCategories.length > 0);
    };

    const filteredCatalog = getMobileFilteredCatalog();
    const activeCategoryObj = filteredCatalog.find(c => c.id === selectedCategory);

    return (
      <div className="flex-1 flex flex-col bg-[#f5f7fa] dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 select-none transition-colors duration-200 mobile-fade-in">
        
        <SiteHeader />
        <PageTitle
          crumbs={[{ label: language === 'hi' ? 'होम' : 'Home', href: '/' }, { label: language === 'hi' ? 'टेस्ट सीरीज' : 'Test Series' }]}
          title={language === 'hi' ? 'टेस्ट सीरीज' : 'Test Series'}
          actions={<>
            <button type="button" onClick={handleToggleBookmarks} data-tour="ts-bookmarks" className={`${btnSecondary} ${showBookmarks ? '!border-[#1e4e79] !text-[#1e4e79] dark:!text-blue-300' : ''}`} title={t.bookmarks}>
              <Bookmark className={`h-4 w-4 ${showBookmarks ? 'fill-current' : ''}`} />
              {t.bookmarks}
              {currentUser?.bookmarkedQuestions?.length ? <span className="text-xs text-slate-500">({currentUser.bookmarkedQuestions.length})</span> : null}
            </button>
            <button type="button" onClick={requestTestsTourStart} className={btnSecondary} title={language === 'hi' ? 'यह कैसे काम करता है' : 'How it works'}>
              <HelpCircle className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">{language === 'hi' ? 'गाइड' : 'How it works'}</span>
            </button>
          </>}
        />

        <main className="flex-1 p-4 flex flex-col gap-5">
          
          {/* SEARCH FILTER (Hidden when sub category is open) */}
          {selectedSubCategory === null && (
            <div data-tour="ts-search" className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchMocksPlaceholder}
                className="w-full bg-white dark:bg-slate-950 rounded-md pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none shadow-sm"
              />
            </div>
          )}

          {/* RENDER BOOKMARKS OVERLAY VIEW */}
          {showBookmarks ? (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                  <Bookmark className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Bookmarked Questions ({currentUser?.bookmarkedQuestions?.length || 0})
                </h3>
                <button
                  onClick={handleCloseBookmarks}
                  className="text-xs text-[#1e4e79] font-bold"
                >
                  Back to List
                </button>
              </div>

              <BookmarkedQuestions />
            </div>
          ) : (
            <>
              {/* Case 1: No category selected - Render Top Level Category Cards list */}
              {selectedCategory === null ? (
                <div className="flex-1 overflow-y-auto space-y-3 mobile-fade-in">
                  
                  {/* NEW SECTION: YOUR RECENT TESTS */}
                  {recentTests.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-50 dark:bg-blue-950/60 p-1.5 rounded-lg text-[#1e4e79] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                            <History className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                              {language === 'hi' ? 'आपके हालिया टेस्ट' : 'Your Recent Tests'}
                            </h3>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                              {language === 'hi' ? 'हाल ही में दिए गए अंतिम 5 टेस्ट' : 'Last 5 attempted or ongoing mock tests'}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full">
                          {recentTests.length} / 5 {language === 'hi' ? 'टेस्ट' : 'Tests'}
                        </span>
                      </div>

                      {/* Horizontal Scroll Row of Tiles with 3D Hover */}
                      <div className="flex gap-3 overflow-x-auto pb-2 pt-1 p-2 -m-2 scrollbar-hide">
                        {recentTests.map(({ test, session, catId, subCatId, subSubId }) => {
                          const isOngoing = session.status === 'ONGOING' || session.status === 'PAUSED';
                          return (
                            <div 
                              key={session.id || test.id}
                              onClick={() => handleOpenRecentCategory(catId, subCatId, subSubId)}
                              className="bg-slate-50/80 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 shadow-2xs transition-all duration-300 hover:border-blue-400/60 dark:hover:border-blue-500/50 flex flex-col justify-between min-h-[95px] min-w-[210px] w-[210px] shrink-0 cursor-pointer relative z-0 hover:z-10"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                                    isOngoing 
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
                                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60'
                                  }`}>
                                    {isOngoing ? (language === 'hi' ? 'अधूरा' : 'Paused') : (language === 'hi' ? 'पूर्ण' : 'Attempted')}
                                  </span>
                                  
                                  {session.score !== undefined && (
                                    <span className="text-[11px] font-semibold text-[#1e4e79] dark:text-blue-400 font-mono">
                                      {session.score}/{session.maxScore || test.maxMarks}
                                    </span>
                                  )}
                                </div>

                                <h4 className="font-semibold text-[11px] text-slate-800 dark:text-slate-100 line-clamp-1 leading-snug" title={getLocalizedName(test, language)}>
                                  {getLocalizedName(test, language)}
                                </h4>
                              </div>

                              {isOngoing ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartExam(test);
                                  }}
                                  className="mt-2.5 w-full py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] text-center shadow-2xs cursor-pointer transition"
                                >
                                  {language === 'hi' ? 'फिर शुरू करें' : 'Resume'}
                                </button>
                              ) : (
                                <div className="mt-2.5 flex items-center gap-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReattemptExam(test);
                                    }}
                                    className="flex-1 py-1 px-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-[11px] text-center shadow-2xs cursor-pointer transition truncate"
                                  >
                                    {language === 'hi' ? 'पुनः प्रयास' : 'Reattempt'}
                                  </button>
                                  <Link
                                    href={`/exam/${test.id}/analysis`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 py-1 px-1 rounded-lg bg-[#1e4e79] hover:bg-[#163c5e] text-white font-semibold text-[11px] text-center shadow-2xs transition border border-[#1e4e79] block truncate"
                                  >
                                    {language === 'hi' ? 'विश्लेषण' : 'Analysis'}
                                  </Link>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* EXAM CATEGORIES SECTION */}
                  <div className="mb-1">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Exam Categories
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select a category to explore mock tests
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredCatalog.map(cat => {
                      const isSsc = cat.id === 'ssc';
                      const isRailways = cat.id === 'railways';
                      const isBanking = cat.id === 'banking';
                      const isTeaching = cat.id === 'teaching';
                      const isUgcNet = cat.id === 'ugc_net';

                      return (
                        <button
                          key={cat.id}
                          data-tour={cat.id === tourTarget.catId ? 'ts-category' : undefined}
                          onClick={() => handleCategorySelect(cat.id)}
                          className="w-full flex flex-col items-center text-center p-4 sm:p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg transition-all duration-300 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer"
                        >
                          {/* Logo/Icon Container */}
                          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden mb-3 bg-white transition duration-300">
                            {cat.logoUrl ? (
                              <img
                                src={cat.logoUrl}
                                alt={`${cat.name} logo`}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <div className="text-[#1e4e79]">
                                {isSsc && <Award className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />}
                                {isRailways && <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />}
                                {isBanking && <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />}
                                {isTeaching && <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />}
                                {isUgcNet && <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-sky-500" />}
                                {!isSsc && !isRailways && !isBanking && !isTeaching && !isUgcNet && <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500" />}
                              </div>
                            )}
                          </div>
                          <h4 className="font-semibold text-[11px] sm:text-xs md:text-sm text-slate-800 dark:text-slate-100 mb-2 leading-snug line-clamp-2">
                            {getLocalizedName(cat, language)}
                          </h4>
                          <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-900 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border border-slate-100 dark:border-slate-800">
                            {cat.subCategories?.length || 0} Exams
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : selectedSubCategory === null ? (
                /* Case 2: Category is selected, but Subcategory (Exam) is not - Render Subcategory (Exam) list */
                <div className="flex-1 overflow-y-auto space-y-4 mobile-fade-in no-scrollbar">
                  <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                    <button
                      onClick={handleCategoryBack}
                      className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-[#1e4e79] dark:text-blue-400 font-semibold text-[11px] px-3.5 py-1.5 rounded-md cursor-pointer shadow-sm shrink-0"
                    >
                      <ArrowLeft className="h-4 w-4" /> {language === 'hi' ? 'परीक्षा श्रेणियां' : 'Back to Categories'}
                    </button>
                    
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate text-right">
                      {getLocalizedName(activeCategoryObj, language)}
                    </h2>
                  </div>

                  {!activeCategoryObj?.subCategories || activeCategoryObj.subCategories.length === 0 ? (
                    <div className="text-center py-10 sm:py-14 px-4 sm:px-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm space-y-3 sm:space-y-4 max-w-xl mx-auto my-4 sm:my-6">
                      <div className="relative inline-flex items-center justify-center">
                        <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-lg bg-[#1e4e79] text-white flex items-center justify-center shadow-lg">
                          <UploadCloud className="h-7 w-7 sm:h-8 sm:w-8" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                          {language === 'hi' ? 'जल्द ही नए मॉक टेस्ट अपलोड हो रहे हैं!' : 'Uploading Mock Tests Soon!'}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                          {language === 'hi'
                            ? 'हमारी विशेषज्ञ टीम इस श्रेणी के लिए उच्च-गुणवत्ता वाले मॉक टेस्ट, अभ्यास सेट और विस्तृत समाधान तैयार कर रही है। जल्द ही नए टेस्ट उपलब्ध होंगे!'
                            : 'Our expert team is actively creating high-quality mock tests, practice sets, and detailed solutions for this category. Stay tuned — new tests are uploaded regularly!'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {activeCategoryObj.subCategories.map(subCat => {
                        const count = subCat.tests.length;
                        const countStr = count === 1 
                          ? (language === 'hi' ? `1 ${t.mocksCount}` : `1 Mock Test`)
                          : (language === 'hi' ? `${count} ${t.mocksCount}` : `${count} Mock Tests`);
                        
                        const themeInfo = getCategoryTheme(selectedCategory);

                        return (
                          <button
                            key={subCat.id}
                            data-tour={subCat.id === tourTarget.examId ? 'ts-exam' : undefined}
                            onClick={() => handleSubCategorySelect(subCat.id)}
                            className="relative overflow-hidden w-full flex flex-col items-center text-center p-4 sm:p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg transition-all duration-300 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer group"
                          >
                            {/* Radial Glow on Hover */}
                            <div 
                              className="absolute -right-16 -top-16 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                              style={{ backgroundColor: themeInfo.accentGlow }}
                            />

                            {/* Icon Container */}
                            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center mb-3 transition-all duration-300 shadow-sm overflow-hidden bg-white border border-slate-100">
                              {getSubCatIcon(subCat.name, subCat.logoUrl || activeCategoryObj?.logoUrl)}
                            </div>

                            {/* Exam Title */}
                            <h4 className="font-semibold text-[11px] sm:text-xs md:text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#1e4e79] dark:group-hover:text-blue-400 transition-colors mb-2.5 leading-snug line-clamp-2">
                              {getLocalizedName(subCat, language)}
                            </h4>

                            {/* Test Count Badge */}
                            <span className={`text-[11px] sm:text-xs font-semibold px-2 py-0.5 sm:px-3.5 sm:py-1.5 rounded-full border transition-all duration-300 ${themeInfo.badgeBg}`}>
                              {countStr}
                            </span>

                            {/* Practice CTA Prompt */}
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#1e4e79] dark:text-blue-400 mt-4 opacity-90 group-hover:opacity-100 transition-opacity duration-200">
                              {language === 'hi' ? "तैयारी शुरू करें" : "Start Practice"}
                              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 duration-200" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Case 3: Subcategory (Exam) is selected - Render Tests List under it */
                <div className="flex-1 overflow-y-auto space-y-4 mobile-fade-in no-scrollbar">
                  {(() => {
                    const activeSubCat = activeCategoryObj?.subCategories.find(s => s.id === selectedSubCategory);
                    
                    // Let's group tests by their sub-subcategory
                    const groups = [...(activeSubCat?.subSubCategories || [])]
                      .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                      .map(subSub => {
                        const sortedTests = [...(subSub.tests || [])].sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
                        const filtered = sortedTests.filter(t => 
                          t.title.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                        return {
                          ...subSub,
                          tests: filtered
                        };
                      });

                    const fallbackTests = (activeSubCat?.tests || []).filter(t => 
                      t.title.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    return (
                      <div className="space-y-4">
                        {/* Subcategory Header: Back button & Subcategory Name on the same horizontal line */}
                        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                          <button
                            onClick={() => {
                              if (activeSubSubId !== null) {
                                setActiveSubSubId(null);
                              } else {
                                handleSubCategoryBack();
                              }
                            }}
                            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-[#1e4e79] dark:text-blue-400 font-semibold text-[11px] px-3.5 py-1.5 rounded-md cursor-pointer shadow-sm shrink-0"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            {activeSubSubId !== null
                              ? (language === 'hi' ? 'सीरीज सूची' : 'Back to Series')
                              : (language === 'hi' ? 'सभी परीक्षाएं' : 'Back to Exams')}
                          </button>

                          <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate text-right">
                            {getLocalizedName(activeSubCat, language)}
                          </h2>
                        </div>

                        {groups.length === 0 && fallbackTests.length === 0 ? (
                          <div className="text-center py-10 sm:py-14 px-4 sm:px-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm space-y-3 sm:space-y-4 max-w-xl mx-auto my-4 sm:my-6">
                            <div className="relative inline-flex items-center justify-center">
                              <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-lg bg-[#1e4e79] text-white flex items-center justify-center shadow-lg">
                                <UploadCloud className="h-7 w-7 sm:h-8 sm:w-8" />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                                {language === 'hi' ? 'जल्द ही नए मॉक टेस्ट अपलोड हो रहे हैं!' : 'Uploading Mock Tests Soon!'}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                                {language === 'hi'
                                  ? 'हमारी विशेषज्ञ टीम इस श्रेणी के लिए उच्च-गुणवत्ता वाले मॉक टेस्ट, अभ्यास सेट और विस्तृत समाधान तैयार कर रही है। जल्द ही नए टेस्ट उपलब्ध होंगे!'
                                  : 'Our expert team is actively creating high-quality mock tests, practice sets, and detailed solutions for this category. Stay tuned — new tests are uploaded regularly!'}
                              </p>
                            </div>
                          </div>
                        ) : groups.length > 0 && (activeSubSubId === null || activeSubSubId === 'all') ? (
                          /* Sub-subcategory List Page: ONLY sub-subcategories in list format matching mock test card format */
                          <div className="space-y-3">
                            <div className="mb-1">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                {language === 'hi' ? 'अभ्यास परीक्षा शुरू करने के लिए एक टेस्ट सीरीज चुनें:' : 'Select a test series to start practicing:'}
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {groups.map(group => {
                                const count = group.tests.length;
                                const countStr = count === 1 
                                  ? (language === 'hi' ? `1 ${t.mocksCount}` : `1 Mock Test`)
                                  : (language === 'hi' ? `${count} ${t.mocksCount}` : `${count} Mock Tests`);

                                return (
                                  <button
                                    key={group.id}
                                    data-tour={group.id === tourTarget.seriesId ? 'ts-series' : undefined}
                                    onClick={() => setActiveSubSubId(group.id)}
                                    className="bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 p-3 sm:p-3.5 rounded-md flex flex-row justify-between gap-2.5 group transition-all shadow-sm hover:shadow-sm text-left w-full cursor-pointer"
                                  >
                                    {/* Left details */}
                                    <div className="flex-1 flex flex-col justify-between min-w-0">
                                      <div>
                                        {/* Icon Container */}
                                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-md flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden mb-2 bg-white transition duration-300">
                                          {getSubCatIcon(group.name, activeCategoryObj?.logoUrl)}
                                        </div>

                                        {/* Sub-Sub Category Title on left side */}
                                        <h4 className="font-semibold text-[11px] sm:text-xs text-slate-900 dark:text-white mb-1 group-hover:text-[#1e4e79] dark:group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                                          {getLocalizedName(group.name, language)}
                                        </h4>

                                        {/* Test Count Badge */}
                                        <span className="text-[11px] sm:text-[11px] text-slate-400 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">
                                          {countStr}
                                        </span>
                                      </div>

                                      {/* CTA Prompt */}
                                      <div className="flex items-center gap-1 text-[#1e4e79] dark:text-blue-400 font-bold text-[11px] mt-3 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 w-full">
                                        {language === 'hi' ? "तैयारी शुरू करें" : "Start Practice"} <ChevronRight className="h-2.5 w-2.5 transition group-hover:translate-x-0.5" />
                                      </div>
                                    </div>

                                    {/* Right side series info panel (replacing raw test list) */}
                                    <div className="border-l border-slate-200/60 dark:border-slate-800/60 pl-2.5 flex flex-col justify-center min-w-[100px] sm:min-w-[115px] max-w-[130px] shrink-0">
                                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1.5">
                                        {language === 'hi' ? 'सीरीज विवरण' : 'Series Details'}
                                      </span>
                                      <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                          <Check className="h-2.5 w-2.5 shrink-0" />
                                          <span>{language === 'hi' ? 'फुल व सेक्शनल' : 'Full & Sectional'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[#1e4e79] dark:text-blue-400 font-semibold">
                                          <Sparkles className="h-2.5 w-2.5 shrink-0 text-[#1e4e79]" />
                                          <span>{language === 'hi' ? 'नवीनतम पैटर्न' : 'Latest Pattern'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                          <span className="text-[11px]"></span>
                                          <span>{language === 'hi' ? 'अंग्रेजी व हिंदी' : 'English & Hindi'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : groups.length > 0 && activeSubSubId !== null ? (
                          /* Mocktest List Page for selected sub-subcategory */
                          <div className="space-y-4">
                            {/* Tests in selected sub-subcategory */}
                            {(() => {
                              const activeGroup = groups.find(g => g.id === activeSubSubId);
                              if (!activeGroup || activeGroup.tests.length === 0) {
                                return (
                                  <div className="text-center py-8 px-4 bg-white dark:bg-slate-950 rounded-lg space-y-2">
                                    <Clock className="h-6 w-6 text-[#1e4e79] mx-auto animate-pulse" />
                                    <h4 className="text-xs font-semibold text-slate-800 dark:text-white">
                                      {language === 'hi' ? 'कोई मॉक टेस्ट नहीं मिला' : 'No Mock Tests Found'}
                                    </h4>
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-3.5 p-2 -m-2">
                                  {activeGroup.tests.map((test) => {
                                    const attempts = getTestAttempts(test.id);
                                    const status = getTestStatus(test.id);
                                    const isTestPremium = test.isPremium;
                                    const completed = isCompleted(test.id);
                                    const ongoing = status === 'ONGOING';
                                    const hasPass = currentUser && (
                                      (test.requiredTier === 'None') ||
                                      (test.requiredTier === 'Testbook Pass' && (currentUser.subscriptionTier === 'Testbook Pass' || currentUser.subscriptionTier === 'Testbook Pass Pro')) ||
                                      (test.requiredTier === 'Testbook Pass Pro' && currentUser.subscriptionTier === 'Testbook Pass Pro')
                                    );

                                    const latestAttempt = attempts.length > 0 ? [...attempts].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0] : null;
                                    const isCleared = completed && latestAttempt && (latestAttempt.score || 0) >= (test.testbookCutoffScore || 0);

                                    const cardStyle = completed
                                      ? isCleared
                                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 '
                                        : 'bg-rose-50/60 dark:bg-rose-950/20 '
                                      : ongoing
                                      ? 'bg-sky-50/30 dark:bg-sky-950/10 '
                                      : 'bg-white dark:bg-slate-900/45 ';

                                    return (
                                      <div
                                        data-tour="ts-test"
                                        key={test.id}
                                        className={`border border-slate-200/90 dark:border-slate-800 p-4.5 rounded-lg shadow-xs transition-all duration-300 hover:border-blue-400/60 dark:hover:border-blue-500/50 flex flex-col justify-between items-start gap-4 w-full relative z-0 hover:z-10 ${cardStyle}`}
                                      >
                                        <div className="space-y-1.5 flex-1 w-full text-left">
                                           <div className="flex items-center justify-between gap-1.5 w-full">
                                             <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                               {isTestPremium ? (
                                                 <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[11px] font-semibold px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/60">
                                                   PRO
                                                 </span>
                                               ) : (
                                                 <span className="bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-[11px] font-semibold px-1.5 py-0.5 rounded border border-green-200 dark:border-green-900/60">
                                                   FREE
                                                 </span>
                                               )}

                                               {ongoing && (
                                                 <span className="flex items-center gap-1 text-[11px] bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60 px-1.5 py-0.5 rounded font-semibold">
                                                   PAUSED
                                                 </span>
                                               )}

                                               {completed && (
                                                 <span className="flex items-center gap-1 text-[11px] bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900/60 px-1.5 py-0.5 rounded font-semibold">
                                                   ✓ ATTEMPTED
                                                 </span>
                                               )}

                                               {renderTestMarkingSchemePill(test)}
                                               {renderSectionalTimingPill(test, language)}
                                             </div>

                                             {latestAttempt && (
                                               <div className="inline-flex items-center gap-1 bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900/60 px-2 py-0.5 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 shrink-0 font-mono ml-auto">
                                                 <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                   {language === 'hi' ? 'अंक:' : 'Score:'}
                                                 </span>
                                                 <span className="font-semibold text-[#1e4e79] dark:text-blue-400 text-[11px]">
                                                   {latestAttempt.score ?? 0}/{latestAttempt.maxScore ?? test.maxMarks}
                                                 </span>
                                               </div>
                                             )}
                                           </div>

                                          <h4 className="font-semibold text-xs text-slate-800 dark:text-white leading-snug">
                                            {getLocalizedName(test, language)}
                                          </h4>
                                          
                                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-bold pt-0.5">
                                            <span>{test.questionsCount} Qs</span>
                                            <span>•</span>
                                            <span>{test.durationMinutes} Mins</span>
                                            <span>•</span>
                                            <span>{test.maxMarks} Marks</span>
                                            <span>•</span>
                                            <span className="text-[#1e4e79] dark:text-blue-400 font-medium">EN, HI</span>
                                          </div>

                                          {renderTestMarkingSchemePill(test)}
                                        </div>

                                        <div className="flex items-center gap-2 w-full border-t border-slate-100 dark:border-slate-800/80 pt-3 shrink-0">
                                          {ongoing ? (
                                            <>
                                              <button
                                                onClick={() => handleStartExam(test)}
                                                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-md text-xs text-center shadow-sm cursor-pointer"
                                              >
                                                Resume Test
                                              </button>
                                              <button
                                                onClick={() => handleReattemptExam(test)}
                                                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-2 rounded-md text-xs cursor-pointer shrink-0"
                                              >
                                                Reset
                                              </button>
                                            </>
                                          ) : completed ? (
                                            <>
                                              <Link
                                                href={`/exam/${test.id}/analysis`}
                                                className="flex-1 bg-[#1e4e79] hover:bg-[#163c5e] text-white font-bold py-2 rounded-md text-xs text-center shadow-sm block"
                                              >
                                                View Analysis
                                              </Link>
                                              <button
                                                onClick={() => handleReattemptExam(test)}
                                                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-2 rounded-md text-xs cursor-pointer shrink-0"
                                              >
                                                Reattempt
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              onClick={() => handleStartExam(test)}
                                              className={`flex-1 text-white font-bold py-2 rounded-md text-xs text-center shadow-sm cursor-pointer ${
                                                hasPass 
                                                  ? 'bg-[#1C3D5A] hover:bg-slate-800' 
                                                  : 'bg-yellow-600 hover:bg-yellow-700'
                                              }`}
                                            >
                                              {hasPass ? 'Start Practice Test' : 'Unlock with Pass'}
                                            </button>
                                          )}
                                          {hasPass && <OfflineDownloadButton kind="mock" id={test.id} className="shrink-0" />}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="space-y-3.5 p-2 -m-2">
                            {fallbackTests.map((test) => {
                              const attempts = getTestAttempts(test.id);
                              const attemptsCount = attempts.length;
                              const status = getTestStatus(test.id);
                              const isTestPremium = test.isPremium;
                              const completed = isCompleted(test.id);
                              const ongoing = status === 'ONGOING';
                              const hasPass = currentUser && (
                                (test.requiredTier === 'None') ||
                                (test.requiredTier === 'Testbook Pass' && (currentUser.subscriptionTier === 'Testbook Pass' || currentUser.subscriptionTier === 'Testbook Pass Pro')) ||
                                (test.requiredTier === 'Testbook Pass Pro' && currentUser.subscriptionTier === 'Testbook Pass Pro')
                              );

                              const latestAttempt = attempts.length > 0 ? [...attempts].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0] : null;
                              const isCleared = completed && latestAttempt && (latestAttempt.score || 0) >= (test.testbookCutoffScore || 0);

                              const cardStyle = completed
                                ? isCleared
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 '
                                  : 'bg-rose-50/60 dark:bg-rose-950/20 '
                                : ongoing
                                ? 'bg-sky-50/30 dark:bg-sky-950/10 '
                                : 'bg-white dark:bg-slate-900/45 ';

                              return (
                                <div
                                  data-tour="ts-test"
                                  key={test.id}
                                  className={`border border-slate-200/90 dark:border-slate-800 p-4.5 rounded-lg shadow-xs transition-all duration-300 hover:border-blue-400/60 dark:hover:border-blue-500/50 flex flex-col justify-between items-start gap-4 w-full relative z-0 hover:z-10 ${cardStyle}`}
                                >
                                  <div className="space-y-1.5 flex-1 w-full text-left">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {isTestPremium ? (
                                        <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[11px] font-semibold px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/60">
                                          PRO
                                        </span>
                                      ) : (
                                        <span className="bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-[11px] font-semibold px-1.5 py-0.5 rounded border border-green-200 dark:border-green-900/60">
                                          FREE
                                        </span>
                                      )}

                                      {ongoing && (
                                        <span className="flex items-center gap-1 text-[11px] bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60 px-1.5 py-0.5 rounded font-semibold">
                                          PAUSED
                                        </span>
                                      )}

                                      {completed && (
                                        <span className="flex items-center gap-1 text-[11px] bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900/60 px-1.5 py-0.5 rounded font-semibold">
                                          ✓ ATTEMPTED
                                        </span>
                                      )}

                                      {renderTestMarkingSchemePill(test)}
                                    </div>

                                    <h4 className="font-semibold text-xs text-slate-800 dark:text-white leading-snug">
                                      {test.title}
                                    </h4>

                                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-bold pt-0.5">
                                      <span>{test.questionsCount} Qs</span>
                                      <span>•</span>
                                      <span>{test.durationMinutes} Mins</span>
                                      <span>•</span>
                                      <span>{test.maxMarks} Marks</span>
                                      <span>•</span>
                                      <span className="text-[#1e4e79] dark:text-blue-400 font-medium">EN, HI</span>
                                    </div>

                                    {renderSectionalTimingPill(test, language)}
                                  </div>

                                  {renderLastAttemptMarks(attempts, language)}

                                  <div className="flex items-center gap-2 w-full border-t border-slate-100 dark:border-slate-800/80 pt-3 shrink-0">
                                    {ongoing ? (
                                      <>
                                        <button
                                          onClick={() => handleStartExam(test)}
                                          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-md text-xs text-center shadow-sm cursor-pointer"
                                        >
                                          Resume Test
                                        </button>
                                        <button
                                          onClick={() => handleReattemptExam(test)}
                                          className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-md text-xs cursor-pointer"
                                        >
                                          Reset
                                        </button>
                                      </>
                                    ) : completed ? (
                                      <>
                                        <Link
                                          href={`/exam/${test.id}/analysis`}
                                          className="flex-1 bg-[#1e4e79] hover:bg-[#163c5e] text-white font-bold py-2 rounded-md text-xs text-center shadow-sm block"
                                        >
                                          View Analysis
                                        </Link>
                                        <button
                                          onClick={() => handleReattemptExam(test)}
                                          className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-md text-xs cursor-pointer"
                                        >
                                          Reattempt
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => handleStartExam(test)}
                                        className={`w-full text-white font-bold py-2 rounded-md text-xs text-center shadow-sm cursor-pointer ${
                                          hasPass 
                                            ? 'bg-[#1C3D5A] hover:bg-slate-800' 
                                            : 'bg-yellow-600 hover:bg-yellow-700'
                                        }`}
                                      >
                                        {hasPass ? 'Start Practice Test' : 'Unlock with Pass'}
                                      </button>
                                    )}
                                    {hasPass && <OfflineDownloadButton kind="mock" id={test.id} className="shrink-0" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}

        </main>

        {/* Upgrade subscription modal (mobile adapted) */}
        {upgradePopupOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center gap-2.5 text-yellow-600 mb-4">
                <ShieldAlert className="h-5.5 w-5.5" />
                <h4 className="font-semibold text-xs text-slate-900 dark:text-white">Unlock Gated Mock Test</h4>
              </div>
              
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed mb-6 font-semibold">
                This is a premium assessment test. To start sitting, you need to upgrade your subscription pass to <strong className="text-yellow-600 dark:text-yellow-400">{requiredTierInfo.replace('Testbook', 'Mock Test')}</strong> or higher.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={handlePurchasePass}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-md text-xs font-bold shadow transition"
                >
                  Simulate Unlock Now
                </button>
                <button
                  onClick={() => setUpgradePopupOpen(false)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-md text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {testsTour}
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-[#f5f7fa] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 select-none transition-colors duration-200 overflow-hidden">
      
      <SiteHeader fluid />
      <h1 className="sr-only">{language === 'hi' ? 'टेस्ट सीरीज' : 'Test Series'}</h1>

      {/* Main split-pane content */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side: Exam Categories Navigation Sidebar */}
        <aside className="w-full md:w-56 lg:w-64 xl:w-72 bg-[#f5f7fa] dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-20 h-full min-h-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-[#1e4e79] dark:text-blue-400" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                {language === 'hi' ? 'परीक्षा श्रेणियां' : 'Exam Categories'}
              </h3>
            </div>
            <span className="text-xs font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md ring-1 ring-inset ring-slate-300 dark:ring-slate-700 tabular-nums">
              {filteredSidebarCatalog.length}
            </span>
          </div>

          {/* Search bar in place of All Categories button at the top */}
          <div className="px-3 pb-2">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder={language === 'hi' ? 'श्रेणी खोजें...' : 'Search categories...'}
                className="w-full h-9 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md pl-8.5 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1e4e79] focus:ring-2 focus:ring-[#1e4e79]/15 dark:focus:border-blue-400 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {sidebarSearch && (
                <button
                  onClick={() => setSidebarSearch('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none text-[11px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="px-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleToggleBookmarks}
              data-tour="ts-bookmarks"
              className={`w-full flex items-center justify-between gap-2 px-3 h-9 rounded-md text-sm border transition-colors cursor-pointer shadow-[0_1px_2px_rgba(15,23,42,0.05)] ${
                showBookmarks
                  ? 'bg-[#eef3f8] dark:bg-slate-800 border-[#1e4e79]/40 text-[#1e4e79] dark:text-blue-300 font-medium'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2"><Bookmark className={`h-4 w-4 ${showBookmarks ? 'fill-current' : ''}`} />{t.bookmarks}</span>
              {currentUser?.bookmarkedQuestions?.length ? <span className="text-xs text-slate-500 dark:text-slate-400">{currentUser.bookmarkedQuestions.length}</span> : null}
            </button>
            <button
              type="button"
              onClick={requestTestsTourStart}
              className="mt-2 w-full flex items-center justify-center gap-1.5 h-8 rounded-md text-sm text-slate-600 dark:text-slate-300 hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            >
              <HelpCircle className="h-4 w-4" />
              {language === 'hi' ? 'यह कैसे काम करता है' : 'How it works'}
            </button>
          </div>
          <div data-tour="ts-sidebar" className="p-3 flex-1 overflow-y-auto min-h-0 no-scrollbar">
            {filteredSidebarCatalog.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                {language === 'hi' ? 'कोई श्रेणी नहीं मिली' : 'No categories found'}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.05)] overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
              {filteredSidebarCatalog.map(cat => {
                const isSelected = selectedCategory === cat.id && !showBookmarks;
                const isSsc = cat.id === 'ssc';
                const isRailways = cat.id === 'railways';
                const isBanking = cat.id === 'banking';
                const isTeaching = cat.id === 'teaching';
                const isUgcNet = cat.id === 'ugc_net';

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedSubCategory(null);
                      setActiveSubSubId(null);
                      setShowBookmarks(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors text-xs cursor-pointer group ${
                      isSelected
                        ? 'bg-[#eef3f8] dark:bg-slate-800/70 text-[#1e4e79] dark:text-blue-300 shadow-[inset_3px_0_0_0_#1e4e79]'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-[#f5f7fa] dark:hover:bg-slate-800/50'
                    }`}
                  >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                      {cat.logoUrl ? (
                        <img src={cat.logoUrl} alt={cat.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="text-[#1e4e79]">
                          {isSsc && <Award className="h-4 w-4 text-orange-500" />}
                          {isRailways && <TrendingUp className="h-4 w-4 text-indigo-500" />}
                          {isBanking && <Coins className="h-4 w-4 text-emerald-500" />}
                          {isTeaching && <BookOpen className="h-4 w-4 text-amber-500" />}
                          {isUgcNet && <GraduationCap className="h-4 w-4 text-sky-500" />}
                          {!isSsc && !isRailways && !isBanking && !isTeaching && !isUgcNet && <Sparkles className="h-4 w-4 text-pink-500" />}
                        </div>
                      )}
                    </div>
                    <div className="truncate">
                      <p className={`text-[13px] leading-tight truncate ${isSelected ? 'font-semibold text-[#1e4e79] dark:text-blue-300' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
                        {getLocalizedName(cat, language)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {cat.subCategories?.length || 0} {language === 'hi' ? 'परीक्षाएं' : 'Exams'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                    isSelected ? 'text-[#1e4e79] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300'
                  }`} />
                </button>
              );
            })}
              </div>
            )}
          </div>
        </aside>

        {/* Right Side Content (Tests list/details) */}
        <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-5 overflow-y-auto relative h-full min-h-0 no-scrollbar">
          {showBookmarks ? (
            <div>
              {/* Bookmarked Questions Header */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  {t.bookmarkTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.bookmarkDesc}</p>
              </div>

              <BookmarkedQuestions />
            </div>
          ) : selectedCategory === null ? (
            <>
              <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#1e4e79]" />
                    {language === 'hi' ? 'परीक्षा श्रेणियाँ' : 'Exam Categories'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'hi' ? 'अभ्यास परीक्षा शुरू करने के लिए एक श्रेणी चुनें' : 'Select a category to explore mock tests'}
                  </p>
                </div>

                {/* Categories Search Bar */}
                <div className="relative max-w-sm w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={examSearchQuery}
                    onChange={(e) => setExamSearchQuery(e.target.value)}
                    placeholder={language === 'hi' ? 'परीक्षाएं खोजें...' : 'Search exams, categories...'}
                    className="w-full bg-white dark:bg-slate-950 rounded-md pl-9.5 pr-8 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1e4e79] focus:ring-1 focus:ring-[#1e4e79]/15 transition-all font-semibold shadow-2xs placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  {examSearchQuery && (
                    <button
                      onClick={() => setExamSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* NEW SECTION: YOUR RECENT TESTS */}
              {recentTests.length > 0 && !examSearchQuery && (
                <div className="mb-6 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-50 dark:bg-blue-950/60 p-1.5 rounded-lg text-[#1e4e79] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                        <History className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                          {language === 'hi' ? 'आपके हालिया टेस्ट' : 'Your Recent Tests'}
                        </h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                          {language === 'hi' ? 'हाल ही में दिए गए अंतिम 5 टेस्ट' : 'Last 5 attempted or ongoing mock tests'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full">
                      {recentTests.length} / 5 {language === 'hi' ? 'टेस्ट' : 'Tests'}
                    </span>
                  </div>

                  {/* Single Row with Horizontal Scroll on <1080px, 5 Columns Grid without scrollbar on >=1080px */}
                  <div className="flex min-[1080px]:grid min-[1080px]:grid-cols-5 overflow-x-auto min-[1080px]:overflow-visible max-[1079px]:custom-horizontal-scroll min-[1080px]:no-scrollbar pb-2 min-[1080px]:pb-0 gap-2.5 p-1.5 -m-1.5">
                    {recentTests.map(({ test, session, catId, subCatId, subSubId }) => {
                      const isOngoing = session.status === 'ONGOING' || session.status === 'PAUSED';
                      return (
                        <div 
                          key={session.id || test.id}
                          onClick={() => handleOpenRecentCategory(catId, subCatId, subSubId)}
                          className="min-w-[175px] sm:min-w-[190px] min-[1080px]:min-w-0 flex-1 shrink-0 min-[1080px]:shrink bg-slate-50/80 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 shadow-2xs transition-all duration-300 hover:border-blue-400/60 dark:hover:border-blue-500/50 flex flex-col justify-between min-h-[88px] cursor-pointer relative z-0 hover:z-10 group"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                                isOngoing 
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60'
                              }`}>
                                {isOngoing ? (language === 'hi' ? 'अधूरा' : 'Paused') : (language === 'hi' ? 'पूर्ण' : 'Attempted')}
                              </span>
                              
                              {session.score !== undefined && (
                                <span className="text-[11px] font-semibold text-[#1e4e79] dark:text-blue-400 font-mono">
                                  {session.score}/{session.maxScore || test.maxMarks}
                                </span>
                              )}
                            </div>

                            <h4 className="font-semibold text-[11px] text-slate-800 dark:text-slate-100 line-clamp-1 leading-snug" title={getLocalizedName(test, language)}>
                              {getLocalizedName(test, language)}
                            </h4>
                          </div>

                          {isOngoing ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartExam(test);
                              }}
                              className="mt-2.5 w-full py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] text-center shadow-2xs cursor-pointer transition"
                            >
                              {language === 'hi' ? 'फिर शुरू करें' : 'Resume'}
                            </button>
                          ) : (
                            <div className="mt-2.5 flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReattemptExam(test);
                                }}
                                className="flex-1 py-1 px-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-[11px] text-center shadow-2xs cursor-pointer transition truncate"
                              >
                                {language === 'hi' ? 'पुनः प्रयास' : 'Reattempt'}
                              </button>
                              <Link
                                href={`/exam/${test.id}/analysis`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 py-1 px-1 rounded-lg bg-[#1e4e79] hover:bg-[#163c5e] text-white font-semibold text-[11px] text-center shadow-2xs transition border border-[#1e4e79] block truncate"
                              >
                                {language === 'hi' ? 'विश्लेषण' : 'Analysis'}
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="exam-category-grid">
                {getFilteredCatalogForSearch.map(cat => {
                  const isSsc = cat.id === 'ssc';
                  const isRailways = cat.id === 'railways';
                  const isBanking = cat.id === 'banking';
                  const isTeaching = cat.id === 'teaching';
                  const isUgcNet = cat.id === 'ugc_net';

                  return (
                    <button
                      key={cat.id}
                      data-tour={cat.id === tourTarget.catId ? 'ts-category' : undefined}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSelectedSubCategory(null);
                        setActiveSubSubId(null);
                      }}
                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 rounded-lg flex flex-row justify-between gap-2.5 group text-left w-full cursor-pointer transition-all duration-300 hover:border-blue-500/40 dark:hover:border-blue-400/40 relative"
                    >
                      {/* Left details */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          {/* Logo/Icon Container */}
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-md flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden mb-2 bg-white transition-all duration-300 group-hover:shadow-sm">
                            {cat.logoUrl ? (
                              <img
                                src={cat.logoUrl}
                                alt={`${cat.name} logo`}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <div className="text-[#1e4e79]">
                                {isSsc && <Award className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-orange-500" />}
                                {isRailways && <TrendingUp className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-indigo-500" />}
                                {isBanking && <Coins className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-emerald-500" />}
                                {isTeaching && <BookOpen className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-amber-500" />}
                                {isUgcNet && <GraduationCap className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-sky-500" />}
                                {!isSsc && !isRailways && !isBanking && !isTeaching && !isUgcNet && <Sparkles className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-pink-500" />}
                              </div>
                            )}
                          </div>
                          <h4 className="font-semibold text-[11px] sm:text-xs text-slate-900 dark:text-white mb-1 group-hover:text-[#1e4e79] dark:group-hover:text-blue-400 transition-colors truncate">
                            {getLocalizedName(cat, language)}
                          </h4>
                          <span className="text-[11px] sm:text-[11px] text-slate-400 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">
                            {cat.subCategories?.length || 0} Exams
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-[#1e4e79] dark:text-blue-400 font-bold text-[11px] mt-3 pt-1.5 border-t border-slate-200 dark:border-slate-800/60 w-full">
                          {language === 'hi' ? "कैटेगरी देखें" : "View Category"} <ChevronRight className="h-2.5 w-2.5 transition group-hover:translate-x-0.5" />
                        </div>
                      </div>

                      {/* Right side subcategories */}
                      {cat.subCategories && cat.subCategories.length > 0 && (
                        <div className="border-l border-slate-200/50 dark:border-slate-800/40 pl-2.5 flex flex-col justify-center min-w-[100px] max-w-[125px] shrink-0">
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Exams List</span>
                          <div className="flex flex-col gap-1">
                            {cat.subCategories.slice(0, 5).map((sub: any) => (
                              <div key={sub.id} className="flex items-center gap-1">
                                <div className="h-1 w-1 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0"></div>
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[85px]" title={getLocalizedName(sub, language)}>
                                  {getLocalizedName(formatSubCategoryName(sub.name), language)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : selectedSubCategory === null ? (
            <>
              <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-400/60 px-4 py-2 rounded-md text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer shadow-sm shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" /> {language === 'hi' ? 'श्रेणियों पर वापस जाएं' : 'Back to Categories'}
                </button>

                <div className="flex items-center gap-4 max-w-xl w-full justify-end flex-wrap md:flex-nowrap">
                  {/* Search Bar in Subcategory View */}
                  <div className="relative max-w-xs w-full">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={examSearchQuery}
                      onChange={(e) => setExamSearchQuery(e.target.value)}
                      placeholder={language === 'hi' ? 'इस श्रेणी में खोजें...' : 'Search in this category...'}
                      className="w-full bg-white dark:bg-slate-950 rounded-md pl-10 pr-10 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-[#1e4e79] focus:ring-2 focus:ring-[#1e4e79]/15 transition-all font-semibold shadow-sm"
                    />
                    {examSearchQuery && (
                      <button
                        onClick={() => setExamSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none text-[11px] font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="text-right">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 justify-end">
                      {getLocalizedName(currentCategoryObj, language)}
                      <BookOpen className="h-5 w-5 text-[#1e4e79]" />
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {language === 'hi' ? TRANSLATIONS.hi.subCatDesc : TRANSLATIONS.en.subCatDesc}
                    </p>
                  </div>
                </div>
              </div>

              {getFilteredSubCategories.length === 0 ? (
                <div className="text-center py-10 sm:py-14 px-4 sm:px-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm space-y-3 sm:space-y-4 max-w-xl mx-auto my-4 sm:my-6">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-lg bg-[#1e4e79] text-white flex items-center justify-center shadow-lg">
                      <UploadCloud className="h-7 w-7 sm:h-8 sm:w-8" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                      {language === 'hi' ? 'जल्द ही नए मॉक टेस्ट अपलोड हो रहे हैं!' : 'Uploading Mock Tests Soon!'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                      {language === 'hi'
                        ? 'हमारी विशेषज्ञ टीम इस श्रेणी के लिए उच्च-गुणवत्ता वाले मॉक टेस्ट, अभ्यास सेट और विस्तृत समाधान तैयार कर रही है। जल्द ही नए टेस्ट उपलब्ध होंगे!'
                        : 'Our expert team is actively creating high-quality mock tests, practice sets, and detailed solutions for this category. Stay tuned — new tests are uploaded regularly!'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="exam-category-grid">
                  {getFilteredSubCategories.map(subCat => {
                  const count = subCat.tests.length;
                  const countStr = count === 1 
                    ? (language === 'hi' ? `1 ${t.mocksCount}` : `1 Mock Test`)
                    : (language === 'hi' ? `${count} ${t.mocksCount}` : `${count} Mock Tests`);
                  
                  const isSsc = selectedCategory === 'ssc' || subCat.id.includes('ssc');
                  const isRailways = selectedCategory === 'railways' || subCat.id.includes('railway');
                  const isBanking = selectedCategory === 'banking' || subCat.id.includes('bank');
                  const isTeaching = selectedCategory === 'teaching' || subCat.id.includes('teach');
                  const isUgcNet = selectedCategory === 'ugc_net' || subCat.id.includes('ugc') || subCat.id.includes('state');

                  const subSubList = (subCat.subSubCategories && subCat.subSubCategories.length > 0)
                    ? subCat.subSubCategories.map((ssc: any) => ssc.title || ssc.name)
                    : (subCat.tests || []).map((t: any) => t.title);

                  return (
                    <button
                      key={subCat.id}
                      data-tour={subCat.id === tourTarget.examId ? 'ts-exam' : undefined}
                      onClick={() => { setSelectedSubCategory(subCat.id); setActiveSubSubId(null); }}
                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 rounded-lg flex flex-row justify-between gap-2.5 group text-left w-full cursor-pointer transition-all duration-300 hover:border-blue-500/40 dark:hover:border-blue-400/40 relative"
                    >
                      {/* Left details */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          {/* Icon Container */}
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-md flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden mb-2 bg-white transition-all duration-300 group-hover:shadow-sm">
                            {getSubCatIcon(subCat.name, subCat.logoUrl || currentCategoryObj?.logoUrl)}
                          </div>

                          {/* Exam Title */}
                          <h4 className="font-semibold text-[11px] sm:text-xs text-slate-900 dark:text-white mb-1 group-hover:text-[#1e4e79] dark:group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                            {getLocalizedName(subCat, language)}
                          </h4>

                          {/* Test Count Badge */}
                          <span className="text-[11px] sm:text-[11px] text-slate-400 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">
                            {countStr}
                          </span>
                        </div>

                        {/* CTA Prompt */}
                        <div className="flex items-center gap-1 text-[#1e4e79] dark:text-blue-400 font-bold text-[11px] mt-3 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 w-full">
                          {language === 'hi' ? "तैयारी शुरू करें" : "Start Practice"} <ChevronRight className="h-2.5 w-2.5 transition group-hover:translate-x-0.5" />
                        </div>
                      </div>

                      {/* Right side sub-subcategories / test series list */}
                      {subSubList && subSubList.length > 0 && (
                        <div className="border-l border-slate-200/50 dark:border-slate-800/40 pl-2.5 flex flex-col justify-center min-w-[100px] max-w-[125px] shrink-0">
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Series List</span>
                          <div className="flex flex-col gap-1">
                            {subSubList.slice(0, 5).map((itemTitle: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1">
                                <div className="h-1 w-1 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0"></div>
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[85px]" title={getLocalizedName(itemTitle, language)}>
                                  {getLocalizedName(formatSubCategoryName(itemTitle), language)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              )}
            </>
          ) : (
            <>
              {(() => {
                const activeSubCat = currentCategoryObj?.subCategories.find(s => s.id === selectedSubCategory);
                // Let's group tests by their sub-subcategory
                const groups = [...(activeSubCat?.subSubCategories || [])]
                  .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                  .map(subSub => {
                    const sortedTests = [...(subSub.tests || [])].sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
                    const filtered = sortedTests.filter(t => 
                      t.title.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    return {
                      ...subSub,
                      tests: filtered
                    };
                  });

                const fallbackTests = (activeSubCat?.tests || []).filter(t => 
                  t.title.toLowerCase().includes(searchQuery.toLowerCase())
                );

                return (
                  <div className="space-y-6">
                    <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                      <button
                        onClick={() => {
                          if (activeSubSubId !== null) {
                            setActiveSubSubId(null);
                          } else {
                            setSelectedSubCategory(null);
                          }
                        }}
                        className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-400/60 px-4 py-2 rounded-md text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer shadow-sm shrink-0"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {activeSubSubId !== null
                          ? (language === 'hi' ? 'सीरीज सूची पर वापस जाएं' : 'Back to Series List')
                          : t.backToSubcategories}
                      </button>

                      {currentCategoryObj?.logoUrl && (
                        <div className="flex-1 flex justify-center items-center">
                          <div className="bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm">
                            <img 
                              src={currentCategoryObj.logoUrl} 
                              alt={`${currentCategoryObj.name} logo`} 
                              className="h-14 sm:h-16 w-auto max-h-20 object-contain rounded-md"
                            />
                          </div>
                        </div>
                      )}

                      <div className="text-right">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 justify-end">
                          {getLocalizedName(activeSubCat, language)}
                          <BookOpen className="h-5 w-5 text-[#1e4e79]" />
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {t.testSeriesDesc}
                        </p>
                      </div>
                    </div>

                    {groups.length === 0 && fallbackTests.length === 0 ? (
                      <div className="text-center py-10 sm:py-14 px-4 sm:px-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm space-y-3 sm:space-y-4 max-w-xl mx-auto my-4 sm:my-6">
                        <div className="relative inline-flex items-center justify-center">
                          <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-lg bg-[#1e4e79] text-white flex items-center justify-center shadow-lg">
                            <UploadCloud className="h-7 w-7 sm:h-8 sm:w-8" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                            {language === 'hi' ? 'जल्द ही नए मॉक टेस्ट अपलोड हो रहे हैं!' : 'Uploading Mock Tests Soon!'}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                            {language === 'hi'
                              ? 'हमारी विशेषज्ञ टीम इस श्रेणी के लिए उच्च-गुणवत्ता वाले मॉक टेस्ट, अभ्यास सेट और विस्तृत समाधान तैयार कर रही है। जल्द ही नए टेस्ट उपलब्ध होंगे!'
                              : 'Our expert team is actively creating high-quality mock tests, practice sets, and detailed solutions for this category. Stay tuned — new tests are uploaded regularly!'}
                          </p>
                        </div>
                      </div>
                    ) : groups.length > 0 && (activeSubSubId === null || activeSubSubId === 'all') ? (
                      /* Sub-subcategory List Page: ONLY sub-subcategories in rectangle tile grid format (3 tiles per row on desktop) */
                      <div className="space-y-3.5">
                        <div className="mb-2">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            {language === 'hi' ? 'अभ्यास परीक्षा शुरू करने के लिए एक टेस्ट सीरीज चुनें:' : 'Select a test series to start practicing:'}
                          </p>
                        </div>
                        <div className="exam-category-grid">
                          {groups.map(group => {
                            const count = group.tests.length;
                            const countStr = count === 1 
                              ? (language === 'hi' ? `1 ${t.mocksCount}` : `1 Mock Test`)
                              : (language === 'hi' ? `${count} ${t.mocksCount}` : `${count} Mock Tests`);

                            const isSsc = selectedCategory === 'ssc' || group.id.includes('ssc');
                            const isRailways = selectedCategory === 'railways' || group.id.includes('railway');
                            const isBanking = selectedCategory === 'banking' || group.id.includes('bank');
                            const isTeaching = selectedCategory === 'teaching' || group.id.includes('teach');
                            const isUgcNet = selectedCategory === 'ugc_net' || group.id.includes('ugc') || group.id.includes('state');

                            return (
                              <button
                                key={group.id}
                                data-tour={group.id === tourTarget.seriesId ? 'ts-series' : undefined}
                                onClick={() => setActiveSubSubId(group.id)}
                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 rounded-lg flex flex-row justify-between gap-2.5 group text-left w-full cursor-pointer transition-all duration-300 hover:border-blue-500/40 dark:hover:border-blue-400/40 relative"
                              >
                                {/* Left details */}
                                <div className="flex-1 flex flex-col justify-between min-w-0">
                                  <div>
                                    {/* Icon Container */}
                                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-md flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden mb-2 bg-white transition-all duration-300 group-hover:shadow-sm">
                                      {getSubCatIcon(group.name, currentCategoryObj?.logoUrl)}
                                    </div>

                                    {/* Sub-Sub Category Title on left side */}
                                    <h4 className="font-semibold text-[11px] sm:text-xs text-slate-900 dark:text-white mb-1 group-hover:text-[#1e4e79] dark:group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                                      {getLocalizedName(group.name, language)}
                                    </h4>

                                    {/* Test Count Badge */}
                                    <span className="text-[11px] sm:text-[11px] text-slate-400 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">
                                      {countStr}
                                    </span>
                                  </div>

                                  {/* CTA Prompt */}
                                  <div className="flex items-center gap-1 text-[#1e4e79] dark:text-blue-400 font-bold text-[11px] mt-3 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 w-full">
                                    {language === 'hi' ? "तैयारी शुरू करें" : "Start Practice"} <ChevronRight className="h-2.5 w-2.5 transition group-hover:translate-x-0.5" />
                                  </div>
                                </div>

                                {/* Right side series info panel (replacing raw test list) */}
                                <div className="border-l border-slate-200/60 dark:border-slate-800/60 pl-2.5 flex flex-col justify-center min-w-[100px] sm:min-w-[115px] max-w-[130px] shrink-0">
                                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1.5">
                                    {language === 'hi' ? 'सीरीज विवरण' : 'Series Details'}
                                  </span>
                                  <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                      <Check className="h-2.5 w-2.5 shrink-0" />
                                      <span>{language === 'hi' ? 'फुल व सेक्शनल' : 'Full & Sectional'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[#1e4e79] dark:text-blue-400 font-semibold">
                                      <Sparkles className="h-2.5 w-2.5 shrink-0 text-[#1e4e79]" />
                                      <span>{language === 'hi' ? 'नवीनतम पैटर्न' : 'Latest Pattern'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                      <span className="text-[11px]"></span>
                                      <span>{language === 'hi' ? 'अंग्रेजी व हिंदी' : 'English & Hindi'}</span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : groups.length > 0 && activeSubSubId !== null ? (
                      /* Mocktest List Page for selected sub-subcategory */
                      <div className="space-y-6">
                        {/* Horizontal Tab Navigator */}
                        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                          <div className="flex gap-2 overflow-x-auto pb-2.5 custom-horizontal-scroll flex-1">
                            {groups.map(group => {
                              const isSelected = activeSubSubId === group.id;
                              return (
                                <button
                                  key={group.id}
                                  data-tour={group.id === tourTarget.seriesId ? 'ts-series' : undefined}
                                  onClick={() => setActiveSubSubId(group.id)}
                                  className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                                    isSelected
                                      ? 'bg-[#1e4e79] border-[#1e4e79] text-white shadow-sm font-semibold'
                                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                                  }`}
                                >
                                  {getLocalizedName(group.name, language)} ({group.tests.length})
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Active group's tests */}
                        {(() => {
                          const activeGroup = groups.find(g => g.id === activeSubSubId);
                          if (!activeGroup || activeGroup.tests.length === 0) {
                            return (
                              <div className="text-center py-10 sm:py-12 px-4 sm:px-6 bg-white dark:bg-slate-900 rounded-lg space-y-3 max-w-xl mx-auto my-2">
                                <div className="h-12 w-12 rounded-lg bg-blue-500/10 text-[#1e4e79] dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
                                  <Clock className="h-6 w-6 animate-pulse" />
                                </div>
                                <h4 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                                  {language === 'hi' ? 'इस श्रेणी में अभी कोई टेस्ट उपलब्ध नहीं है' : 'No tests available in this series yet.'}
                                </h4>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-3">
                              {activeGroup.tests.map((test) => {
                                const hasPass = currentUser && (
                                  (test.requiredTier === 'None') ||
                                  (test.requiredTier === 'Testbook Pass' && (currentUser.subscriptionTier === 'Testbook Pass' || currentUser.subscriptionTier === 'Testbook Pass Pro')) ||
                                  (test.requiredTier === 'Testbook Pass Pro' && currentUser.subscriptionTier === 'Testbook Pass Pro')
                                );

                                const completed = isCompleted(test.id);
                                const ongoing = getTestStatus(test.id) === 'ONGOING';
                                const attempts = getTestAttempts(test.id);
                                const attemptsCount = attempts.length;
                                const isTestPremium = test.isPremium;

                                const latestAttempt = attempts.length > 0 ? [...attempts].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0] : null;
                                const isCleared = completed && latestAttempt && (latestAttempt.score || 0) >= (test.testbookCutoffScore || 0);

                                const cardColorStyle = completed
                                  ? isCleared
                                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
                                    : 'bg-rose-50/60 dark:bg-rose-950/20'
                                  : 'bg-white/75 dark:bg-slate-900/40 ';

                                const cardGlow = completed
                                  ? isCleared
                                    ? 'glow-shadow-green'
                                    : 'glow-shadow-purple'
                                  : selectedCategory === 'ssc' ? 'glow-shadow-amber' :
                                    selectedCategory === 'railways' ? 'glow-shadow-blue' :
                                    selectedCategory === 'banking' ? 'glow-shadow-green' :
                                    selectedCategory === 'teaching' ? 'glow-shadow-amber' :
                                    selectedCategory === 'ugc_net' ? 'glow-shadow-blue' : 
                                    'glow-shadow-purple';

                                return (
                                  <div
                                    data-tour="ts-test"
                                    key={test.id}
                                    className={` border border-slate-200/90 dark:border-slate-800 p-5 rounded-lg shadow-xs transition-all duration-300 hover:border-blue-400/60 dark:hover:border-blue-500/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full relative overflow-hidden z-0 hover:z-10 ${cardColorStyle} ${cardGlow}`}
                                  >
                                    <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-slate-400/5 pointer-events-none" />
                                    <div className="space-y-1.5 flex-1 w-full text-left">
                                      <div className="flex flex-wrap items-center gap-2">
                                        {isTestPremium ? (
                                          <span className="bg-amber-500/10 text-amber-700 dark:bg-amber-500/5 dark:text-amber-400 text-[11px] font-semibold px-2 py-0.5 rounded-md border border-amber-500/20">
                                            {language === 'hi' ? 'प्रो' : 'PRO'}
                                          </span>
                                        ) : (
                                          <span className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/5 dark:text-emerald-400 text-[11px] font-semibold px-2 py-0.5 rounded-md border border-emerald-500/20">
                                            {language === 'hi' ? 'मुफ़्त' : 'FREE'}
                                          </span>
                                        )}

                                        {ongoing && (
                                          <span className="flex items-center gap-1 text-[11px] bg-orange-500/10 text-orange-700 dark:bg-orange-500/5 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md font-semibold">
                                            ⏸ {language === 'hi' ? 'रुका हुआ' : 'PAUSED'}
                                          </span>
                                        )}
                                        
                                        {completed && (
                                          <span className="flex items-center gap-1 text-[11px] bg-blue-500/10 text-[#1e4e79] dark:bg-blue-500/5 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-semibold">
                                            ✓ {language === 'hi' ? 'प्रयास किया गया' : 'ATTEMPTED'}
                                          </span>
                                        )}
                                        {renderSectionalTimingPill(test, language)}
                                      </div>

                                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">
                                        {test.title}
                                      </h4>

                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-bold pt-0.5">
                                        <span>{test.questionsCount} Qs</span>
                                        <span>•</span>
                                        <span>{test.durationMinutes} Mins</span>
                                        <span>•</span>
                                        <span>{test.maxMarks} Marks</span>
                                        <span>•</span>
                                        <span className="text-[#1e4e79] dark:text-blue-400 font-medium">English, Hindi</span>
                                      </div>
                                    </div>

                                    {renderLastAttemptMarks(attempts, language)}

                                    <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 pt-3 sm:pt-0 shrink-0">
                                      {ongoing ? (
                                        <>
                                          <button
                                            onClick={() => handleStartExam(test)}
                                            className="flex-1 sm:w-32 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-lg text-xs text-center shadow-sm cursor-pointer"
                                          >
                                            Resume Test
                                          </button>
                                          <button
                                            onClick={() => handleReattemptExam(test)}
                                            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer"
                                          >
                                            Reset
                                          </button>
                                        </>
                                      ) : completed ? (
                                        <>
                                          <Link
                                            href={`/exam/${test.id}/analysis`}
                                            className="flex-1 sm:w-32 bg-[#1e4e79] hover:bg-[#163c5e] text-white font-bold py-2 rounded-lg text-xs text-center shadow-sm block"
                                          >
                                            View Analysis
                                          </Link>
                                          <button
                                            onClick={() => handleReattemptExam(test)}
                                            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer"
                                          >
                                            {t.reattempt}
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => handleStartExam(test)}
                                          className={`w-full sm:w-44 text-white font-bold py-2.5 rounded-lg text-xs text-center shadow-sm cursor-pointer ${
                                            hasPass 
                                              ? 'bg-[#1C3D5A] hover:bg-slate-800' 
                                              : 'bg-yellow-600 hover:bg-yellow-700'
                                          }`}
                                        >
                                          {hasPass ? 'Start Practice Test' : (language === 'hi' ? 'पास के साथ अनलॉक करें' : 'Unlock with Pass')}
                                        </button>
                                      )}
                                      {hasPass && <OfflineDownloadButton kind="mock" id={test.id} className="shrink-0" />}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {fallbackTests.map(test => {
                          const hasPass = currentUser && (
                            (test.requiredTier === 'None') ||
                            (test.requiredTier === 'Testbook Pass' && (currentUser.subscriptionTier === 'Testbook Pass' || currentUser.subscriptionTier === 'Testbook Pass Pro')) ||
                            (test.requiredTier === 'Testbook Pass Pro' && currentUser.subscriptionTier === 'Testbook Pass Pro')
                          );

                          const completed = isCompleted(test.id);
                          const ongoing = getTestStatus(test.id) === 'ONGOING';
                          const attempts = getTestAttempts(test.id);
                          const attemptsCount = attempts.length;
                          const isTestPremium = test.isPremium;

                          const latestAttempt = attempts.length > 0 ? [...attempts].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0] : null;
                          const isCleared = completed && latestAttempt && (latestAttempt.score || 0) >= (test.testbookCutoffScore || 0);

                          const cardColorStyle = completed
                            ? isCleared
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 '
                              : 'bg-rose-50/60 dark:bg-rose-950/20 '
                            : 'bg-white/75 dark:bg-slate-900/40 ';

                          const cardGlow = completed
                            ? isCleared
                              ? 'glow-shadow-green'
                              : 'glow-shadow-purple'
                            : selectedCategory === 'ssc' ? 'glow-shadow-amber' :
                              selectedCategory === 'railways' ? 'glow-shadow-blue' :
                              selectedCategory === 'banking' ? 'glow-shadow-green' :
                              selectedCategory === 'teaching' ? 'glow-shadow-amber' :
                              selectedCategory === 'ugc_net' ? 'glow-shadow-blue' : 
                              'glow-shadow-purple';

                          return (
                            <div
                              data-tour="ts-test"
                              key={test.id}
                              className={` border border-slate-200/90 dark:border-slate-800 p-5 rounded-lg shadow-xs transition-all duration-300 hover:border-blue-400/60 dark:hover:border-blue-500/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full relative overflow-hidden z-0 hover:z-10 ${cardColorStyle} ${cardGlow}`}
                            >
                              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-slate-400/5 pointer-events-none" />
                              <div className="space-y-1.5 flex-1 w-full text-left">
                                <div className="flex flex-wrap items-center gap-2">
                                  {isTestPremium ? (
                                    <span className="bg-amber-500/10 text-amber-700 dark:bg-amber-500/5 dark:text-amber-400 text-[11px] font-semibold px-2 py-0.5 rounded-md border border-amber-500/20">
                                      {language === 'hi' ? 'प्रो' : 'PRO'}
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/5 dark:text-emerald-400 text-[11px] font-semibold px-2 py-0.5 rounded-md border border-emerald-500/20">
                                      {language === 'hi' ? 'मुफ़्त' : 'FREE'}
                                    </span>
                                  )}

                                  {ongoing && (
                                    <span className="flex items-center gap-1 text-[11px] bg-orange-500/10 text-orange-700 dark:bg-orange-500/5 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md font-semibold">
                                      ⏸ {language === 'hi' ? 'रुका हुआ' : 'PAUSED'}
                                    </span>
                                  )}
                                  
                                  {completed && (
                                    <span className="flex items-center gap-1 text-[11px] bg-blue-500/10 text-[#1e4e79] dark:bg-blue-500/5 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-semibold">
                                      ✓ {language === 'hi' ? 'प्रयास किया गया' : 'ATTEMPTED'}
                                    </span>
                                  )}
                                  {renderSectionalTimingPill(test, language)}
                                </div>

                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">
                                  {test.title}
                                </h4>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-bold pt-0.5">
                                  <span>{test.questionsCount} Qs</span>
                                  <span>•</span>
                                  <span>{test.durationMinutes} Mins</span>
                                  <span>•</span>
                                  <span>{test.maxMarks} Marks</span>
                                  <span>•</span>
                                  <span className="text-[#1e4e79] dark:text-blue-400 font-medium">English, Hindi</span>
                                </div>
                              </div>

                              {renderLastAttemptMarks(attempts, language)}

                              <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 pt-3 sm:pt-0 shrink-0">
                                {ongoing ? (
                                  <>
                                    <button
                                      onClick={() => handleStartExam(test)}
                                      className="flex-1 sm:w-32 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-lg text-xs text-center shadow-sm cursor-pointer"
                                    >
                                      Resume Test
                                    </button>
                                    <button
                                      onClick={() => handleReattemptExam(test)}
                                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer"
                                    >
                                      Reset
                                    </button>
                                  </>
                                ) : completed ? (
                                  <>
                                    <Link
                                      href={`/exam/${test.id}/analysis`}
                                      className="flex-1 sm:w-32 bg-[#1e4e79] hover:bg-[#163c5e] text-white font-bold py-2 rounded-lg text-xs text-center shadow-sm block"
                                    >
                                      View Analysis
                                    </Link>
                                    <button
                                      onClick={() => handleReattemptExam(test)}
                                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer"
                                    >
                                      {t.reattempt}
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleStartExam(test)}
                                    className={`w-full sm:w-44 text-white font-bold py-2.5 rounded-lg text-xs text-center shadow-sm cursor-pointer ${
                                      hasPass 
                                        ? 'bg-[#1C3D5A] hover:bg-slate-800' 
                                        : 'bg-yellow-600 hover:bg-yellow-700'
                                    }`}
                                  >
                                    {hasPass ? 'Start Practice Test' : (language === 'hi' ? 'पास के साथ अनलॉक करें' : 'Unlock with Pass')}
                                  </button>
                                )}
                                {hasPass && <OfflineDownloadButton kind="mock" id={test.id} className="shrink-0" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </main>
      </div>

      {/* Subscription Upgrade Overlay Dialog */}
      {upgradePopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-md p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-slate-800 dark:text-white">
            <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-500 mb-4">
              <ShieldAlert className="h-6 w-6" />
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Unlock Gated Mock Test</h4>
            </div>
            
            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed mb-6 font-semibold">
              This is a premium assessment test. To start sitting, you need to upgrade your subscription pass to <strong className="text-yellow-600 dark:text-yellow-400">{requiredTierInfo.replace('Testbook', 'Mock Test')}</strong> or higher.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUpgradePopupOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchasePass}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg cursor-pointer"
              >
                Simulate Unlock Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Support Action Menu */}
      {testsTour}
      <HomeSupportWidget variant="expandable" />
    </div>
  );
}
