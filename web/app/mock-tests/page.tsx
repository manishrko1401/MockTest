"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, TestCategory, TestSubCategory, MockTestItem } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ShieldAlert, Award, ArrowLeft, Search, GraduationCap, ChevronRight, Check, Sun, Moon, Bookmark, Trash2, ChevronUp, ChevronDown, Menu, TrendingUp, Coins, MapPin, Sparkles, Trophy } from 'lucide-react';
import { generateExamSession, EXPLANATIONS } from '../lib/examUtils';
import { TRANSLATIONS } from '../translations';
import { useIsMobile } from '../useIsMobile';
import HomeSupportWidget from '../components/HomeSupportWidget';

function decodeHtml(text: string): string {
  if (!text) return "";
  let decoded = text;
  for (let i = 0; i < 3; i++) {
    const temp = decoded
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    if (temp === decoded) break;
    decoded = temp;
  }
  return decoded;
}

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

// Helper functions for premium subcategory card styling
const getCategoryTheme = (catId: string | null) => {
  const id = catId?.toLowerCase() || '';
  if (id.includes('ssc')) {
    return {
      color: 'orange',
      bg: 'bg-orange-50/50 dark:bg-orange-950/15',
      border: 'border-orange-150 dark:border-orange-900/30',
      hoverBorder: 'hover:border-orange-400 dark:hover:border-orange-600',
      iconBg: 'bg-orange-500/10 text-orange-650 dark:text-orange-400',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/45 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/30',
      gradient: 'from-orange-500 to-amber-500',
      glow: 'shadow-orange-500/10 dark:shadow-orange-500/5',
      accentGlow: 'rgba(249,115,22,0.12)'
    };
  }
  if (id.includes('railway')) {
    return {
      color: 'indigo',
      bg: 'bg-indigo-50/50 dark:bg-indigo-950/15',
      border: 'border-indigo-150 dark:border-indigo-900/30',
      hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-600',
      iconBg: 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
      gradient: 'from-indigo-500 to-blue-550',
      glow: 'shadow-indigo-500/10 dark:shadow-indigo-500/5',
      accentGlow: 'rgba(99,102,241,0.12)'
    };
  }
  if (id.includes('banking') || id.includes('bank')) {
    return {
      color: 'emerald',
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/15',
      border: 'border-emerald-150 dark:border-emerald-900/30',
      hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600',
      iconBg: 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
      gradient: 'from-emerald-500 to-teal-500',
      glow: 'shadow-emerald-500/10 dark:shadow-emerald-500/5',
      accentGlow: 'rgba(16,185,129,0.12)'
    };
  }
  if (id.includes('teaching')) {
    return {
      color: 'amber',
      bg: 'bg-amber-50/50 dark:bg-amber-950/15',
      border: 'border-amber-150 dark:border-amber-900/30',
      hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
      iconBg: 'bg-amber-500/10 text-amber-650 dark:text-amber-400',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
      gradient: 'from-amber-500 to-orange-500',
      glow: 'shadow-amber-500/10 dark:shadow-amber-500/5',
      accentGlow: 'rgba(245,158,11,0.12)'
    };
  }
  if (id.includes('ugc') || id.includes('net')) {
    return {
      color: 'sky',
      bg: 'bg-sky-50/50 dark:bg-sky-950/15',
      border: 'border-sky-150 dark:border-sky-900/30',
      hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-600',
      iconBg: 'bg-sky-500/10 text-sky-650 dark:text-sky-400',
      badgeBg: 'bg-sky-50 dark:bg-sky-950/45 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/30',
      gradient: 'from-sky-500 to-indigo-500',
      glow: 'shadow-sky-500/10 dark:shadow-sky-500/5',
      accentGlow: 'rgba(14,165,233,0.12)'
    };
  }
  return {
    color: 'pink',
    bg: 'bg-pink-50/50 dark:bg-pink-950/15',
    border: 'border-pink-155 dark:border-pink-900/30',
    hoverBorder: 'hover:border-pink-400 dark:hover:border-pink-650',
    iconBg: 'bg-pink-500/10 text-pink-650 dark:text-pink-400',
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
  if (n.includes('cgl') || n.includes('cpo')) return <Award className="h-5.5 w-5.5" />;
  if (n.includes('ntpc') || n.includes('group d') || n.includes('alp') || n.includes('si')) return <Trophy className="h-5.5 w-5.5" />;
  if (n.includes('net') || n.includes('science')) return <GraduationCap className="h-5.5 w-5.5" />;
  if (n.includes('chsl') || n.includes('mts') || n.includes('phase')) return <BookOpen className="h-5.5 w-5.5" />;
  return <GraduationCap className="h-5.5 w-5.5" />;
};

export default function MockTestsCatalog() {
  const { currentUser, saveUserProfileByAdmin, theme, toggleTheme, toggleBookmark, clearOngoingSession, language, setLanguage, examCatalog } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];
  
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [examSearchQuery, setExamSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter exam catalog by search query (checks category name or subcategory exam name)
  const getFilteredCatalogForSearch = () => {
    const query = examSearchQuery.toLowerCase().trim();
    if (!query) return examCatalog;
    
    return examCatalog.map(cat => {
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
  };

  const getFilteredSubCategories = () => {
    if (!currentCategoryObj) return [];
    const query = examSearchQuery.toLowerCase().trim();
    if (!query) return currentCategoryObj.subCategories || [];
    return (currentCategoryObj.subCategories || []).filter(sub => 
      sub.name.toLowerCase().includes(query)
    );
  };

  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [activeSubSubId, setActiveSubSubId] = useState<string | null>(null);

  // Reset active sub-subcategory when subcategory changes, but bypass on initial mount to allow query param loading
  const isInitialSubCat = React.useRef(true);
  React.useEffect(() => {
    if (isInitialSubCat.current) {
      isInitialSubCat.current = false;
      return;
    }
    setActiveSubSubId(null);
  }, [selectedSubCategory]);

  // Hash synchronization and back button tracking for mobile view screen-by-screen
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#bookmarks') {
        setShowBookmarks(true);
      } else if (hash.startsWith('#exam-')) {
        const examId = hash.replace('#exam-', '');
        let foundCatId = null;
        for (const cat of examCatalog) {
          if (cat.subCategories.some(sub => sub.id === examId)) {
            foundCatId = cat.id;
            break;
          }
        }
        setShowBookmarks(false);
        if (foundCatId) {
          setSelectedCategory(foundCatId);
        }
        setSelectedSubCategory(examId);
      } else if (hash.startsWith('#category-')) {
        const catId = hash.replace('#category-', '');
        setShowBookmarks(false);
        setSelectedCategory(catId);
        setSelectedSubCategory(null);
      } else {
        setShowBookmarks(false);
        setSelectedCategory(null);
        setSelectedSubCategory(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    // Initial load: parse query params, but check hash first (hash takes precedence on reload if present)
    const initialHash = window.location.hash;
    if (initialHash) {
      handleHashChange();
    } else {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('cat');
      const sub = params.get('sub');
      const subsub = params.get('subsub');
      if (cat) {
        setSelectedCategory(cat);
        if (sub) {
          setSelectedSubCategory(sub);
          if (subsub) {
            setActiveSubSubId(subsub);
          }
        }
      }
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [examCatalog]);

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedSubCategory(null);
    if (typeof window !== 'undefined') {
      window.location.hash = `category-${catId}`;
    }
  };

  const handleSubCategorySelect = (subCatId: string) => {
    setSelectedSubCategory(subCatId);
    if (typeof window !== 'undefined') {
      window.location.hash = `exam-${subCatId}`;
    }
  };

  const handleCategoryBack = () => {
    if (typeof window !== 'undefined') {
      if (window.location.hash.startsWith('#category-')) {
        window.history.back();
      } else {
        setSelectedCategory(null);
        window.location.hash = '';
      }
    } else {
      setSelectedCategory(null);
    }
  };

  const handleSubCategoryBack = () => {
    if (typeof window !== 'undefined') {
      if (window.location.hash.startsWith('#exam-')) {
        window.history.back();
      } else {
        setSelectedSubCategory(null);
        if (selectedCategory) {
          window.location.hash = `category-${selectedCategory}`;
        } else {
          window.location.hash = '';
        }
      }
    } else {
      setSelectedSubCategory(null);
    }
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
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [upgradePopupOpen, setUpgradePopupOpen] = useState(false);
  const [requiredTierInfo, setRequiredTierInfo] = useState<string>('');

  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const [expandedBookmarks, setExpandedBookmarks] = useState<Record<string, boolean>>({});
  // Cache: testId -> list of questions (from API for custom tests, or demo fallback)
  const [bookmarkQsCache, setBookmarkQsCache] = useState<Record<string, any[]>>({});
  const [bookmarkQsLoading, setBookmarkQsLoading] = useState(false);

  const toggleExpandBookmark = (qId: string) => {
    setExpandedBookmarks(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  // Fetch custom questions for each unique testId in bookmarks when the bookmark panel opens
  useEffect(() => {
    if (!showBookmarks || !currentUser?.bookmarkedQuestions?.length) return;

    const uniqueTestIds = [...new Set(currentUser.bookmarkedQuestions.map(b => b.testId))];
    const missingIds = uniqueTestIds.filter(id => !bookmarkQsCache[id]);
    if (missingIds.length === 0) return;

    setBookmarkQsLoading(true);
    Promise.all(
      missingIds.map(async (testId) => {
        try {
          const res = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get-custom-questions', data: { testId } })
          });
          const data = await res.json();
          if (data.success && data.questions?.length) {
            return { testId, questions: data.questions };
          }
        } catch (e) { /* ignore */ }
        // Fallback: use demo session questions
        const session = generateExamSession(testId, examCatalog);
        return { testId, questions: session.questions };
      })
    ).then(results => {
      const newCache: Record<string, any[]> = {};
      results.forEach(r => { if (r) newCache[r.testId] = r.questions; });
      setBookmarkQsCache(prev => ({ ...prev, ...newCache }));
      setBookmarkQsLoading(false);
    });
  }, [showBookmarks, currentUser?.bookmarkedQuestions]);

  // Helper: find a question from the cache by testId + questionId
  const findBookmarkedQuestion = useCallback((testId: string, questionId: string) => {
    const questions = bookmarkQsCache[testId];
    if (!questions) return null;
    // Custom questions from API have different shape — normalise
    return questions.find((q: any) => q.id === questionId) || null;
  }, [bookmarkQsCache]);

  // Trigger MathJax typesetting whenever bookmarks are expanded
  useEffect(() => {
    let active = true;
    let timeoutId: any = null;

    const triggerTypeset = () => {
      if (!active) return;
      const MathJax = (window as any).MathJax;
      if (MathJax?.typesetPromise) {
        try {
          MathJax.typesetPromise().catch((err: any) => {
            console.warn("MathJax typesetting failed:", err);
          });
        } catch (err) {
          console.warn("MathJax typesetting failed:", err);
        }
      } else if (typeof window !== 'undefined') {
        // MathJax not loaded yet, retry in 100ms
        timeoutId = setTimeout(triggerTypeset, 100);
      }
    };

    triggerTypeset();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [expandedBookmarks]);

  const currentCategoryObj = examCatalog.find(c => c.id === selectedCategory);
  
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

  const handlePurchasePass = () => {
    if (!currentUser) return;
    
    // Simulate upgrading tier on the spot
    const newTier = requiredTierInfo === 'Testbook Pass Pro' ? 'Testbook Pass Pro' : 'Testbook Pass';
    const expiry = new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0];
    const purchasedAt = new Date().toISOString().split('T')[0];
    
    saveUserProfileByAdmin(
      currentUser.id,
      currentUser.name,
      currentUser.email,
      currentUser.mobile,
      currentUser.referralCode,
      currentUser.referredBy,
      currentUser.referralsCount,
      currentUser.role,
      newTier,
      purchasedAt,
      expiry
    );
    
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

    clearOngoingSession(test.id);
    router.push(`/exam/${test.id}`);
  };

  const filteredSidebarCategories = examCatalog.filter(category => {
    const query = categorySearchQuery.toLowerCase().trim();
    if (!query) return true;
    
    if (category.name.toLowerCase().includes(query)) return true;
    
    return category.subCategories.some(sub => {
      if (sub.name.toLowerCase().includes(query)) return true;
      
      const matchSubSub = sub.subSubCategories?.some(subsub => 
        subsub.name.toLowerCase().includes(query) ||
        subsub.tests?.some(t => t.title.toLowerCase().includes(query))
      );
      if (matchSubSub) return true;
      
      return sub.tests?.some(t => t.title.toLowerCase().includes(query));
    });
  });

  const { isMobile, isMounted } = useIsMobile();

  if (!mounted) return null;

  if (isMounted && isMobile) {
    // Filter tests by search query
    const getMobileFilteredCatalog = () => {
      if (!searchQuery) return examCatalog;
      return examCatalog.map(cat => ({
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
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 font-sans min-h-screen text-slate-800 dark:text-slate-100 select-none transition-colors duration-200 mobile-fade-in">
        
        {/* MOBILE HEADER */}
        <header className="h-14 border-b border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <Link href="/" className="flex items-center gap-1 text-slate-700 dark:text-white font-bold text-xs">
            <ArrowLeft className="h-4 w-4" /> {t.navHome}
          </Link>
          
          <div className="flex items-center gap-2">
            {/* Bookmarked Questions Button */}
            <button
              onClick={handleToggleBookmarks}
              className={`p-1.5 rounded-lg flex items-center justify-center gap-1 border text-[10px] font-bold transition h-8 ${
                showBookmarks 
                  ? 'bg-yellow-500 border-yellow-500 text-white shadow-sm'
                  : 'bg-slate-105 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title={t.bookmarks}
            >
              <Bookmark className={`h-3.5 w-3.5 ${showBookmarks ? 'fill-white' : ''}`} />
              {currentUser?.bookmarkedQuestions?.length ? (
                <span className="bg-red-500 text-white rounded-full text-[8px] px-1 py-0.5 font-bold leading-none">
                  {currentUser.bookmarkedQuestions.length}
                </span>
              ) : null}
            </button>

            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
              className="px-1.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold outline-none"
            >
              <option value="en">EN</option>
              <option value="hi">हिं</option>
            </select>

            {/* Theme switcher */}
            <button 
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
            >
              {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 flex flex-col gap-5">
          
          {/* SEARCH FILTER */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchMocksPlaceholder}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none shadow-sm"
            />
          </div>

          {/* RENDER BOOKMARKS OVERLAY VIEW */}
          {showBookmarks ? (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase flex items-center gap-1">
                  <Bookmark className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Bookmarked Questions ({currentUser?.bookmarkedQuestions?.length || 0})
                </h3>
                <button
                  onClick={handleCloseBookmarks}
                  className="text-[10px] text-blue-600 font-bold"
                >
                  Back to List
                </button>
              </div>

              {(!currentUser?.bookmarkedQuestions || currentUser.bookmarkedQuestions.length === 0) ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No bookmarked questions yet. Click bookmarks inside mock sittings solutions to review here.
                </div>
              ) : bookmarkQsLoading ? (
                <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  Loading bookmarked questions...
                </div>
              ) : (
                <div className="space-y-3">
                  {currentUser.bookmarkedQuestions.map((bm) => {
                    const rawQ = findBookmarkedQuestion(bm.testId, bm.questionId);
                    if (!rawQ) return null;

                    // Normalise: API raw format has textEn/optionsEn; engine format has content.en
                    const questionTextEn = rawQ.textEn || rawQ.content?.en?.questionText || '';
                    const questionTextHi = rawQ.textHi || rawQ.content?.hi?.questionText || questionTextEn;
                    const optionsEn: string[] = rawQ.optionsEn || rawQ.content?.en?.options || [];
                    const optionsHi: string[] = rawQ.optionsHi || rawQ.content?.hi?.options || optionsEn;
                    const correctIdx: number = rawQ.correctIndex !== undefined ? rawQ.correctIndex : (rawQ.correctOptionIndex ?? 0);
                    const questionText = language === 'hi' ? questionTextHi : questionTextEn;
                    const options = language === 'hi' ? optionsHi : optionsEn;

                    const isExpanded = !!expandedBookmarks[bm.questionId];
                    const explanationEn = rawQ.explanationEn || rawQ.content?.en?.explanationText || EXPLANATIONS[bm.questionId]?.en || '';
                    const explanationHi = rawQ.explanationHi || rawQ.content?.hi?.explanationText || EXPLANATIONS[bm.questionId]?.hi || explanationEn;
                    const questionExplanation = language === 'hi' ? explanationHi : explanationEn;

                    // Find test title from catalog
                    let testTitle = bm.testId;
                    for (const cat of examCatalog) {
                      for (const sub of cat.subCategories || []) {
                        const found = (sub.tests || []).find((t: any) => t.id === bm.testId);
                        if (found) { testTitle = found.title; break; }
                        for (const ss of sub.subSubCategories || []) {
                          const f2 = (ss.tests || []).find((t: any) => t.id === bm.testId);
                          if (f2) { testTitle = f2.title; break; }
                        }
                      }
                    }

                    return (
                      <div
                        key={bm.questionId}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[8px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 font-extrabold px-1.5 py-0.5 rounded uppercase truncate max-w-[60%]">
                            {testTitle}
                          </span>
                          <button
                            onClick={() => toggleBookmark(bm.testId, bm.questionId)}
                            className="p-1 rounded text-red-500 hover:bg-red-50"
                            title="Remove Bookmark"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <p className={`font-bold text-slate-800 dark:text-slate-200 mt-2 ${isExpanded ? 'line-clamp-none' : 'line-clamp-2'}`} dangerouslySetInnerHTML={{ __html: questionText }} />

                        <button
                          onClick={() => toggleExpandBookmark(bm.questionId)}
                          className="mt-3 flex items-center gap-1 text-[9px] text-blue-600 font-extrabold uppercase hover:underline"
                        >
                          {isExpanded ? <>Collapse Solution <ChevronUp className="h-3 w-3" /></> : <>Reveal Solved Options <ChevronDown className="h-3 w-3" /></>}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-200">
                            {options.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="font-extrabold text-[9px] text-slate-400 uppercase">Multiple Choice Options:</p>
                                {options.map((opt, oIdx) => {
                                  const text = typeof opt === 'string' ? opt : (opt as any).text || String(opt);
                                  const isCorrect = oIdx === correctIdx;
                                  return (
                                    <div
                                      key={oIdx}
                                      className={`p-2 rounded-lg text-[10px] font-semibold flex items-center justify-between border ${
                                        isCorrect 
                                          ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-950/20 dark:border-green-900/60 dark:text-green-300' 
                                          : 'bg-white border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      <span dangerouslySetInnerHTML={{ __html: text }} />
                                      {isCorrect && <Check className="h-3 w-3 text-green-600 shrink-0" />}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            {questionExplanation && (
                              <div className="bg-yellow-50/50 dark:bg-yellow-950/10 border border-yellow-200 dark:border-yellow-900/40 p-2.5 rounded-lg">
                                <p className="font-extrabold text-[9px] text-yellow-800 dark:text-yellow-400 uppercase">
                                  {language === 'hi' ? 'विस्तृत व्याख्या और अवधारणा:' : 'Detailed Explanation & Concept:'}
                                </p>
                                <div 
                                  className="text-[10px] text-slate-700 dark:text-slate-300 leading-relaxed mt-1 font-medium markup-content"
                                  dangerouslySetInnerHTML={{ __html: decodeHtml(questionExplanation) }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Case 1: No category selected - Render Top Level Category Cards list */}
              {selectedCategory === null ? (
                <div className="flex-1 overflow-y-auto space-y-4 mobile-fade-in">
                  <div className="mb-2">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Exam Categories
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
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

                      const accentColor = 
                        isSsc ? 'border-t-orange-500 hover:border-orange-400 hover:bg-orange-50/10 dark:hover:bg-orange-950/5' :
                        isRailways ? 'border-t-indigo-500 hover:border-indigo-400 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/5' :
                        isBanking ? 'border-t-emerald-500 hover:border-emerald-400 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/5' :
                        isTeaching ? 'border-t-amber-500 hover:border-amber-400 hover:bg-amber-50/10 dark:hover:bg-amber-950/5' :
                        isUgcNet ? 'border-t-sky-500 hover:border-sky-400 hover:bg-sky-50/10 dark:hover:bg-sky-950/5' :
                        'border-t-pink-500 hover:border-pink-400 hover:bg-pink-50/10 dark:hover:bg-pink-950/5';

                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`w-full flex flex-col items-center text-center p-4 sm:p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/85 rounded-2xl transition-all duration-350 shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-[0.99] border-t-4 border-l-0 border-r-0 border-b-0 cursor-pointer ${accentColor}`}
                        >
                          {/* Logo/Icon Container */}
                          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-850 shadow-sm overflow-hidden mb-3 bg-slate-50 dark:bg-slate-900 transition duration-300">
                            {cat.logoUrl ? (
                              <img
                                src={cat.logoUrl}
                                alt={`${cat.name} logo`}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <div className="text-blue-500">
                                {isSsc && <Award className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />}
                                {isRailways && <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />}
                                {isBanking && <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />}
                                {isTeaching && <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />}
                                {isUgcNet && <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-sky-500" />}
                                {!isSsc && !isRailways && !isBanking && !isTeaching && !isUgcNet && <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500" />}
                              </div>
                            )}
                          </div>
                          <h4 className="font-extrabold text-[11px] sm:text-xs md:text-sm text-slate-850 dark:text-slate-100 mb-2 leading-snug line-clamp-2">
                            {cat.name}
                          </h4>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border border-slate-100 dark:border-slate-800">
                            {cat.subCategories?.length || 0} Exams
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : selectedSubCategory === null ? (
                /* Case 2: Category is selected, but Subcategory (Exam) is not - Render Subcategory (Exam) list */
                <div className="flex-1 overflow-y-auto space-y-4 mobile-fade-in">
                  <button
                    onClick={handleCategoryBack}
                    className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-wider mb-2 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Exam Categories
                  </button>
                  
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {activeCategoryObj?.name}
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Select an exam to view available tests
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {activeCategoryObj?.subCategories.map(subCat => {
                      const count = subCat.tests.length;
                      const countStr = count === 1 
                        ? (language === 'hi' ? `1 ${t.mocksCount}` : `1 Mock Test`)
                        : (language === 'hi' ? `${count} ${t.mocksCount}` : `${count} Mock Tests`);
                      
                      const themeInfo = getCategoryTheme(selectedCategory);

                      return (
                        <button
                          key={subCat.id}
                          onClick={() => handleSubCategorySelect(subCat.id)}
                          className="relative overflow-hidden w-full flex flex-col items-center text-center p-4 sm:p-6 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-[1.03] active:scale-[0.99] cursor-pointer group hover:border-blue-500/20"
                        >
                          {/* Accent Gradient Border at top */}
                          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${themeInfo.gradient}`} />
                          
                          {/* Radial Glow on Hover */}
                          <div 
                            className="absolute -right-16 -top-16 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                            style={{ backgroundColor: themeInfo.accentGlow }}
                          />

                          {/* Icon Container */}
                          <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 shadow-sm group-hover:shadow-md overflow-hidden ${themeInfo.iconBg}`}>
                            {getSubCatIcon(subCat.name, subCat.logoUrl || activeCategoryObj?.logoUrl)}
                          </div>

                          {/* Exam Title */}
                          <h4 className="font-extrabold text-[11px] sm:text-xs md:text-sm text-slate-855 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2.5 leading-snug line-clamp-2">
                            {subCat.name}
                          </h4>

                          {/* Test Count Badge */}
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 sm:px-3.5 sm:py-1.5 rounded-full border transition-all duration-300 ${themeInfo.badgeBg} group-hover:scale-105`}>
                            {countStr}
                          </span>

                          {/* Practice CTA Prompt */}
                          <div className="flex items-center gap-1 text-[9px] uppercase font-black text-blue-600 dark:text-blue-400 tracking-wider mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                            {language === 'hi' ? "तैयारी शुरू करें" : "Start Practice"}
                            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 duration-200" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Case 3: Subcategory (Exam) is selected - Render Tests List under it */
                <div className="flex-1 overflow-y-auto space-y-4 mobile-fade-in">
                  <button
                    onClick={handleSubCategoryBack}
                    className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-wider mb-2 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Exams
                  </button>

                  {(() => {
                    const activeSubCat = activeCategoryObj?.subCategories.find(s => s.id === selectedSubCategory);
                    
                    // Let's group tests by their sub-subcategory
                    const groups = (activeSubCat?.subSubCategories || []).map(subSub => {
                      const filtered = subSub.tests.filter(t => 
                        t.title.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                      return {
                        ...subSub,
                        tests: filtered
                      };
                    }).filter(g => g.tests.length > 0);

                    const fallbackTests = (activeSubCat?.tests || []).filter(t => 
                      t.title.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    return (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                            {activeSubCat?.name}
                          </h2>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Practice with full length test papers
                          </p>
                        </div>

                        {groups.length === 0 && fallbackTests.length === 0 ? (
                          <div className="text-center py-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 text-xs">
                            No tests available for this exam.
                          </div>
                        ) : groups.length > 0 ? (
                          <div className="space-y-4">
                            {/* Horizontal Tab Navigator for Sub-subcategories */}
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
                              {groups.map(group => {
                                const isSelected = (activeSubSubId || groups[0]?.id) === group.id;
                                return (
                                  <button
                                    key={group.id}
                                    onClick={() => setActiveSubSubId(group.id)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition cursor-pointer border ${
                                      isSelected
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                                    }`}
                                  >
                                    {group.name} ({group.tests.length})
                                  </button>
                                );
                              })}
                            </div>

                            {/* Selected Group's Tests */}
                            {(() => {
                              const activeGroup = groups.find(g => g.id === (activeSubSubId || groups[0]?.id));
                              if (!activeGroup) return null;
                              return (
                                <div className="space-y-3 animate-in fade-in duration-300">
                                  {activeGroup.tests.map((test) => {
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
                                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-250/60 dark:border-emerald-900/40 border-l-4 border-l-emerald-500'
                                        : 'bg-rose-50/60 dark:bg-rose-950/20 border border-rose-250/60 dark:border-rose-900/40 border-l-4 border-l-red-500'
                                      : ongoing
                                      ? 'bg-sky-50/30 dark:bg-sky-955/10 border border-sky-200/60 dark:border-sky-900/40 border-l-4 border-l-sky-500'
                                      : 'bg-white dark:bg-slate-900/45 border border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-500';

                                    return (
                                      <div
                                        key={test.id}
                                        className={`p-4.5 rounded-2xl shadow-sm border flex flex-col justify-between items-start gap-4 w-full ${cardStyle}`}
                                      >
                                        <div className="space-y-1.5 flex-1 w-full text-left">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            {isTestPremium ? (
                                              <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-250 dark:border-amber-900/60 uppercase tracking-wider">
                                                PRO
                                              </span>
                                            ) : (
                                              <span className="bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-green-200 dark:border-green-900/60 uppercase tracking-wider">
                                                FREE
                                              </span>
                                            )}

                                            {ongoing && (
                                              <span className="flex items-center gap-1 text-[8px] bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-250 dark:border-orange-900/60 px-1.5 py-0.5 rounded font-black uppercase">
                                                PAUSED
                                              </span>
                                            )}

                                            {completed && (
                                              <span className="flex items-center gap-1 text-[8px] bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900/60 px-1.5 py-0.5 rounded font-black uppercase">
                                                ✓ ATTEMPTED
                                              </span>
                                            )}

                                            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60 uppercase tracking-wider font-mono">
                                              +{test.positiveMarks ?? 2} Right
                                            </span>
                                            <span className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/60 uppercase tracking-wider font-mono">
                                              -{test.negativeMarks ?? 0.5} Wrong
                                            </span>
                                          </div>

                                          <h4 className="font-extrabold text-xs text-slate-850 dark:text-white leading-snug">
                                            {test.title}
                                          </h4>

                                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[8px] text-slate-500 dark:text-slate-400 font-bold pt-0.5">
                                            <span>{test.questionsCount} Qs</span>
                                            <span>•</span>
                                            <span>{test.durationMinutes} Mins</span>
                                            <span>•</span>
                                            <span>{test.maxMarks} Marks</span>
                                            <span>•</span>
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">🌐 EN, HI</span>
                                          </div>

                                          {attemptsCount > 0 && (() => {
                                            const lastAttempt = [...attempts].sort((a, b) => b.date.localeCompare(a.date))[0];
                                            if (!lastAttempt) return null;
                                            return (
                                              <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/80 px-2 py-0.5 rounded text-[8px] font-bold text-slate-600 dark:text-slate-400">
                                                <span>Last Attempt:</span>
                                                <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                                                  {lastAttempt.score}/{lastAttempt.maxScore} marks
                                                </span>
                                              </div>
                                            );
                                          })()}
                                        </div>

                                        <div className="flex items-center gap-2 w-full border-t border-slate-100 dark:border-slate-800/80 pt-3 shrink-0">
                                          {ongoing ? (
                                            <>
                                              <button
                                                onClick={() => handleStartExam(test)}
                                                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-xl text-[10px] text-center shadow-sm cursor-pointer"
                                              >
                                                Resume Test
                                              </button>
                                              <button
                                                onClick={() => handleReattemptExam(test)}
                                                className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-xl text-[10px] border border-slate-200 dark:border-slate-800 cursor-pointer"
                                              >
                                                Reset
                                              </button>
                                            </>
                                          ) : completed ? (
                                            <>
                                              <Link
                                                href={`/exam/${test.id}/analysis`}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-[10px] text-center shadow-sm block"
                                              >
                                                View Analysis
                                              </Link>
                                              <button
                                                onClick={() => handleReattemptExam(test)}
                                                className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-xl text-[10px] border border-slate-200 dark:border-slate-800 cursor-pointer"
                                              >
                                                Reattempt
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              onClick={() => handleStartExam(test)}
                                              className={`w-full text-white font-bold py-2 rounded-xl text-[10px] text-center shadow-sm cursor-pointer ${
                                                hasPass 
                                                  ? 'bg-[#1C3D5A] hover:bg-slate-800' 
                                                  : 'bg-yellow-600 hover:bg-yellow-700'
                                              }`}
                                            >
                                              {hasPass ? 'Start Practice Test' : 'Unlock with Pass'}
                                            </button>
                                          )}
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
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-250/60 dark:border-emerald-900/40 border-l-4 border-l-emerald-500'
                                  : 'bg-rose-50/60 dark:bg-rose-950/20 border border-rose-250/60 dark:border-rose-900/40 border-l-4 border-l-red-500'
                                : ongoing
                                ? 'bg-sky-50/30 dark:bg-sky-950/10 border border-sky-200/60 dark:border-sky-900/40 border-l-4 border-l-sky-500'
                                : 'bg-white dark:bg-slate-900/45 border border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-500';

                              return (
                                <div
                                  key={test.id}
                                  className={`p-4.5 rounded-2xl shadow-sm border flex flex-col justify-between items-start gap-4 w-full ${cardStyle}`}
                                >
                                  <div className="space-y-1.5 flex-1 w-full text-left">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {isTestPremium ? (
                                        <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-250 dark:border-amber-900/60 uppercase tracking-wider">
                                          PRO
                                        </span>
                                      ) : (
                                        <span className="bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-green-200 dark:border-green-900/60 uppercase tracking-wider">
                                          FREE
                                        </span>
                                      )}

                                      {ongoing && (
                                        <span className="flex items-center gap-1 text-[8px] bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-250 dark:border-orange-900/60 px-1.5 py-0.5 rounded font-black uppercase">
                                          PAUSED
                                        </span>
                                      )}

                                      {completed && (
                                        <span className="flex items-center gap-1 text-[8px] bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900/60 px-1.5 py-0.5 rounded font-black uppercase">
                                          ✓ ATTEMPTED
                                        </span>
                                      )}

                                      <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60 uppercase tracking-wider font-mono">
                                        +{test.positiveMarks ?? 2} Right
                                      </span>
                                      <span className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/60 uppercase tracking-wider font-mono">
                                        -{test.negativeMarks ?? 0.5} Wrong
                                      </span>
                                    </div>

                                    <h4 className="font-extrabold text-xs text-slate-850 dark:text-white leading-snug">
                                      {test.title}
                                    </h4>

                                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[8px] text-slate-500 dark:text-slate-400 font-bold pt-0.5">
                                      <span>{test.questionsCount} Qs</span>
                                      <span>•</span>
                                      <span>{test.durationMinutes} Mins</span>
                                      <span>•</span>
                                      <span>{test.maxMarks} Marks</span>
                                      <span>•</span>
                                      <span className="text-blue-600 dark:text-blue-400 font-medium">🌐 EN, HI</span>
                                    </div>

                                    {attemptsCount > 0 && (() => {
                                      const lastAttempt = [...attempts].sort((a, b) => b.date.localeCompare(a.date))[0];
                                      if (!lastAttempt) return null;
                                      return (
                                        <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/80 px-2 py-0.5 rounded text-[8px] font-bold text-slate-600 dark:text-slate-400">
                                          <span>Last Attempt:</span>
                                          <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                                            {lastAttempt.score}/{lastAttempt.maxScore} marks
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  <div className="flex items-center gap-2 w-full border-t border-slate-100 dark:border-slate-800/80 pt-3 shrink-0">
                                    {ongoing ? (
                                      <>
                                        <button
                                          onClick={() => handleStartExam(test)}
                                          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-xl text-[10px] text-center shadow-sm cursor-pointer"
                                        >
                                          Resume Test
                                        </button>
                                        <button
                                          onClick={() => handleReattemptExam(test)}
                                          className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-xl text-[10px] border border-slate-200 dark:border-slate-800 cursor-pointer"
                                        >
                                          Reset
                                        </button>
                                      </>
                                    ) : completed ? (
                                      <>
                                        <Link
                                          href={`/exam/${test.id}/analysis`}
                                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-[10px] text-center shadow-sm block"
                                        >
                                          View Analysis
                                        </Link>
                                        <button
                                          onClick={() => handleReattemptExam(test)}
                                          className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-xl text-[10px] border border-slate-200 dark:border-slate-800 cursor-pointer"
                                        >
                                          Reattempt
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => handleStartExam(test)}
                                        className={`w-full text-white font-bold py-2 rounded-xl text-[10px] text-center shadow-sm cursor-pointer ${
                                          hasPass 
                                            ? 'bg-[#1C3D5A] hover:bg-slate-800' 
                                            : 'bg-yellow-600 hover:bg-yellow-700'
                                        }`}
                                      >
                                        {hasPass ? 'Start Practice Test' : 'Unlock with Pass'}
                                      </button>
                                    )}
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
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0">
            <div className="bg-white dark:bg-slate-905 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center gap-2.5 text-yellow-600 mb-4">
                <ShieldAlert className="h-5.5 w-5.5" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Unlock Gated Mock Test</h4>
              </div>
              
              <p className="text-slate-605 dark:text-slate-300 text-[11px] leading-relaxed mb-6 font-semibold">
                This is a premium assessment test. To start sitting, you need to upgrade your subscription pass to <strong className="text-yellow-600 dark:text-yellow-400">{requiredTierInfo.replace('Testbook', 'Mock Test')}</strong> or higher.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={handlePurchasePass}
                  className="w-full bg-yellow-650 hover:bg-yellow-750 text-white py-3 rounded-xl text-xs font-bold shadow transition"
                >
                  Simulate Unlock Now
                </button>
                <button
                  onClick={() => setUpgradePopupOpen(false)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 font-sans min-h-screen text-slate-800 dark:text-slate-100 select-none transition-colors duration-200">
      
      {/* Navbar header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-2 rounded-full shadow-sm flex items-center justify-center h-10 w-10 border border-blue-200/50 dark:border-slate-700 shrink-0">
              <Trophy className="h-5.5 w-5.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm leading-tight text-slate-900 dark:text-white tracking-wider">{t.logoTitle}</h1>
              <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase">{t.logoSub}</p>
            </div>
          </Link>
          <span className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800"></span>
          <Link href="/" className="flex items-center gap-2 text-slate-650 dark:text-slate-350 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs tracking-wide transition-colors">
            <ArrowLeft className="h-4 w-4" /> {t.backToHome}
          </Link>
        </div>

        <div className="flex items-center gap-3 max-w-md w-full justify-end">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="en" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">English</option>
            <option value="hi" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">हिन्दी</option>
          </select>

          {/* Bookmarked Questions Button */}
          <button
            onClick={() => setShowBookmarks(!showBookmarks)}
            className={`p-2 rounded-xl flex items-center justify-center gap-1.5 border px-3 py-2 text-xs font-bold transition-all active:scale-95 cursor-pointer select-none h-8.5 ${
              showBookmarks 
                ? 'bg-yellow-500 border-yellow-500 text-white shadow-md shadow-yellow-500/20'
                : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title={t.bookmarks}
          >
            <Bookmark className={`h-3.5 w-3.5 ${showBookmarks ? 'fill-white' : ''}`} />
            <span className="hidden sm:inline">{t.bookmarks}</span>
            {currentUser?.bookmarkedQuestions?.length ? (
              <span className="bg-red-500 text-white rounded-full text-[9px] px-1.5 py-0.5">
                {currentUser.bookmarkedQuestions.length}
              </span>
            ) : null}
          </button>



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

      {/* Main split-pane content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        


        {/* Right Side Content (Tests list/details) */}
        <main className="flex-1 p-8 overflow-y-auto edu-grid-pattern relative">
          {showBookmarks ? (
            <div>
              {/* Bookmarked Questions Header */}
              <div className="mb-6">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  {t.bookmarkTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.bookmarkDesc}</p>
              </div>

              {/* Bookmarked List */}
              {(!currentUser || !currentUser.bookmarkedQuestions || currentUser.bookmarkedQuestions.length === 0) ? (
                <div className="text-center py-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                  <Bookmark className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-bold">{t.noBookmarks}</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{t.noBookmarksDesc}</p>
                </div>
              ) : bookmarkQsLoading ? (
                <div className="text-center py-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Loading bookmarked questions...</p>
                </div>
              ) : (
                <div className="space-y-4 max-w-4xl">
                  {currentUser.bookmarkedQuestions.map((bm, index) => {
                    const rawQ = findBookmarkedQuestion(bm.testId, bm.questionId);
                    if (!rawQ) return null;

                    // Normalise: API raw format uses textEn/optionsEn; engine format uses content.en
                    const questionTextEn = rawQ.textEn || rawQ.content?.en?.questionText || '';
                    const questionTextHi = rawQ.textHi || rawQ.content?.hi?.questionText || questionTextEn;
                    const optionsEn: string[] = rawQ.optionsEn || rawQ.content?.en?.options || [];
                    const optionsHi: string[] = rawQ.optionsHi || rawQ.content?.hi?.options || optionsEn;
                    const correctIdx: number = rawQ.correctIndex !== undefined ? rawQ.correctIndex : (rawQ.correctOptionIndex ?? 0);
                    const explanationEn: string = rawQ.explanationEn || EXPLANATIONS[bm.questionId]?.en || '';
                    const explanationHi: string = rawQ.explanationHi || EXPLANATIONS[bm.questionId]?.hi || '';

                    // Find test title from catalog
                    let testTitle = bm.testId;
                    for (const cat of examCatalog) {
                      for (const sub of cat.subCategories || []) {
                        const found = (sub.tests || []).find((t: any) => t.id === bm.testId);
                        if (found) { testTitle = found.title; break; }
                        for (const ss of (sub as any).subSubCategories || []) {
                          const f2 = (ss.tests || []).find((t: any) => t.id === bm.testId);
                          if (f2) { testTitle = f2.title; break; }
                        }
                      }
                    }

                    const isExpanded = !!expandedBookmarks[bm.questionId];

                    return (
                      <div key={bm.questionId} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-all">
                        <div 
                          className="flex items-center justify-between cursor-pointer select-none"
                          onClick={() => toggleExpandBookmark(bm.questionId)}
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 px-2 py-0.5 rounded text-[9px] font-bold text-blue-600 dark:text-blue-400 truncate max-w-xs">
                                {testTitle}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
                                Q #{index + 1}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" dangerouslySetInnerHTML={{ __html: decodeHtml(questionTextEn) }} />
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBookmark(bm.testId, bm.questionId);
                              }}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                              title="Remove Bookmark"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/60 space-y-4">
                            {/* Question Text */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 rounded text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                              <p className="font-bold text-blue-600 dark:text-blue-400 mb-1">Question (English):</p>
                              <div className="font-normal mb-3 markup-content" dangerouslySetInnerHTML={{ __html: decodeHtml(questionTextEn) }} />
                              {questionTextHi && questionTextHi !== questionTextEn && (<>
                                <p className="font-bold text-blue-600 dark:text-blue-400 mb-1">प्रश्न (Hindi):</p>
                                <div className="font-normal markup-content" dangerouslySetInnerHTML={{ __html: decodeHtml(questionTextHi) }} />
                              </>)}
                            </div>

                            {/* Options with Highlighted Correct Answer */}
                            {optionsEn.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Options & Correct Answer</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {optionsEn.map((opt, oIdx) => {
                                    const textEn = typeof opt === 'string' ? opt : (opt as any).text || String(opt);
                                    const rawHiOpt = optionsHi[oIdx];
                                    const textHi = typeof rawHiOpt === 'string' ? rawHiOpt : (rawHiOpt as any)?.text || textEn;
                                    const isCorrect = oIdx === correctIdx;

                                    return (
                                      <div 
                                        key={oIdx} 
                                        className={`p-3 rounded-lg border text-xs flex flex-col gap-1 ${
                                          isCorrect 
                                            ? 'bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-900/60 text-green-800 dark:text-green-300 font-semibold' 
                                            : 'bg-white border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 text-slate-700 dark:text-slate-400'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center gap-1">Option {oIdx + 1}: <span dangerouslySetInnerHTML={{ __html: decodeHtml(textEn) }} /></span>
                                          {isCorrect && <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}
                                        </div>
                                        {textHi !== textEn && <span className="text-[10px] opacity-80 mt-0.5 flex items-center gap-1">हिंदी: <span dangerouslySetInnerHTML={{ __html: decodeHtml(textHi) }} /></span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Solution Explanation */}
                            {(explanationEn || explanationHi) && (
                              <div className="bg-blue-50/40 dark:bg-blue-950/10 p-4 border border-blue-100 dark:border-blue-900/45 rounded-xl">
                                <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400 mb-3 uppercase tracking-wide">{t.explanation}</p>
                                <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                                  {explanationEn && <div>
                                    <p className="font-bold text-[10px] text-blue-700 dark:text-blue-500 mb-1">{t.englishExplanation}</p>
                                    <div className="markup-content" dangerouslySetInnerHTML={{ __html: decodeHtml(explanationEn) }} />
                                  </div>}
                                  {explanationHi && <div className="pt-3 border-t border-blue-100/50 dark:border-blue-950/20">
                                    <p className="font-bold text-[10px] text-blue-700 dark:text-blue-500 mb-1">{t.hindiExplanation}</p>
                                    <div className="markup-content" dangerouslySetInnerHTML={{ __html: decodeHtml(explanationHi) }} />
                                  </div>}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : selectedCategory === null ? (
            <>
              <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div className="animate-in fade-in slide-in-from-top-4 duration-350">
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    {language === 'hi' ? 'परीक्षा श्रेणियाँ' : 'Exam Categories'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
                    placeholder={language === 'hi' ? 'परीक्षा खोजें (उदा. SSC CGL)...' : 'Search exams (e.g. SSC CGL)...'}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-850 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold shadow-sm"
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-300">
                {getFilteredCatalogForSearch().map(cat => {
                  const isSsc = cat.id === 'ssc';
                  const isRailways = cat.id === 'railways';
                  const isBanking = cat.id === 'banking';
                  const isTeaching = cat.id === 'teaching';
                  const isUgcNet = cat.id === 'ugc_net';

                  const accentColor = 
                    isSsc ? 'border-t-orange-500 hover:border-orange-400 hover:bg-orange-50/10 dark:hover:bg-orange-950/5' :
                    isRailways ? 'border-t-indigo-500 hover:border-indigo-400 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/5' :
                    isBanking ? 'border-t-emerald-500 hover:border-emerald-400 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/5' :
                    isTeaching ? 'border-t-amber-500 hover:border-amber-400 hover:bg-amber-50/10 dark:hover:bg-amber-950/5' :
                    isUgcNet ? 'border-t-sky-500 hover:border-sky-400 hover:bg-sky-50/10 dark:hover:bg-sky-950/5' :
                    'border-t-pink-500 hover:border-pink-400 hover:bg-pink-50/10 dark:hover:bg-pink-950/5';

                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSelectedSubCategory(null);
                      }}
                      className={`bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 hover:border-blue-550 dark:hover:border-blue-500 p-3 sm:p-3.5 rounded-xl flex flex-row justify-between gap-2.5 group transition-all shadow-sm hover:shadow-md text-left w-full cursor-pointer hover:scale-[1.02] duration-200 border-t-4 border-l-0 border-r-0 border-b-0 ${accentColor}`}
                    >
                      {/* Left details */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          {/* Logo/Icon Container */}
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-855 shadow-sm overflow-hidden mb-2 bg-slate-55 dark:bg-slate-900 transition duration-300">
                            {cat.logoUrl ? (
                              <img
                                src={cat.logoUrl}
                                alt={`${cat.name} logo`}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <div className="text-blue-500">
                                {isSsc && <Award className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-orange-500" />}
                                {isRailways && <TrendingUp className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-indigo-500" />}
                                {isBanking && <Coins className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-emerald-500" />}
                                {isTeaching && <BookOpen className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-amber-500" />}
                                {isUgcNet && <GraduationCap className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-sky-500" />}
                                {!isSsc && !isRailways && !isBanking && !isTeaching && !isUgcNet && <Sparkles className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-pink-500" />}
                              </div>
                            )}
                          </div>
                          <h4 className="font-extrabold text-[11px] sm:text-xs text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {cat.name}
                          </h4>
                          <span className="text-[8px] sm:text-[9px] text-slate-400 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">
                            {cat.subCategories?.length || 0} Exams
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-[8.5px] uppercase tracking-wider mt-3 pt-1.5 border-t border-slate-155 dark:border-slate-800/60 w-full">
                          {language === 'hi' ? "कैटेगरी देखें" : "View Category"} <ChevronRight className="h-2.5 w-2.5 transition group-hover:translate-x-0.5" />
                        </div>
                      </div>

                      {/* Right side subcategories */}
                      {cat.subCategories && cat.subCategories.length > 0 && (
                        <div className="border-l border-slate-200/50 dark:border-slate-800/40 pl-2.5 flex flex-col justify-center min-w-[100px] max-w-[125px] shrink-0">
                          <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Exams List</span>
                          <div className="flex flex-col gap-1">
                            {cat.subCategories.slice(0, 5).map((sub: any) => (
                              <div key={sub.id} className="flex items-center gap-1">
                                <div className="h-1 w-1 rounded-full bg-blue-500 dark:bg-blue-450 shrink-0"></div>
                                <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[85px]" title={sub.name}>
                                  {formatSubCategoryName(sub.name)}
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
                  className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm text-slate-700 dark:text-slate-200 cursor-pointer active:scale-95 shrink-0"
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
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2 text-xs text-slate-855 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold shadow-sm"
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

                  <div className="text-right animate-in fade-in slide-in-from-top-4 duration-350">
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 justify-end">
                      {currentCategoryObj?.name}
                      <BookOpen className="h-5 w-5 text-blue-500" />
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {language === 'hi' ? TRANSLATIONS.hi.subCatDesc : TRANSLATIONS.en.subCatDesc}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 animate-in fade-in duration-300">
                {getFilteredSubCategories().map(subCat => {
                  const count = subCat.tests.length;
                  const countStr = count === 1 
                    ? (language === 'hi' ? `1 ${t.mocksCount}` : `1 Mock Test`)
                    : (language === 'hi' ? `${count} ${t.mocksCount}` : `${count} Mock Tests`);
                  
                  const themeInfo = getCategoryTheme(selectedCategory);

                  return (
                    <button
                      key={subCat.id}
                      onClick={() => setSelectedSubCategory(subCat.id)}
                      className="relative overflow-hidden w-full flex flex-col items-center text-center p-4 sm:p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-[1.03] active:scale-[0.99] cursor-pointer group hover:border-blue-500/20"
                    >
                      {/* Accent Gradient Border at top */}
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${themeInfo.gradient}`} />
                      
                      {/* Radial Glow on Hover */}
                      <div 
                        className="absolute -right-16 -top-16 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ backgroundColor: themeInfo.accentGlow }}
                      />

                      {/* Icon Container */}
                      <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 shadow-sm group-hover:shadow-md overflow-hidden ${themeInfo.iconBg}`}>
                        {getSubCatIcon(subCat.name, subCat.logoUrl || currentCategoryObj?.logoUrl)}
                      </div>

                      {/* Exam Title */}
                      <h4 className="font-extrabold text-[11px] sm:text-xs md:text-sm text-slate-850 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2.5 leading-snug line-clamp-2">
                        {subCat.name}
                      </h4>

                      {/* Test Count Badge */}
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 sm:px-3.5 sm:py-1.5 rounded-full border transition-all duration-300 ${themeInfo.badgeBg} group-hover:scale-105`}>
                        {countStr}
                      </span>

                      {/* Practice CTA Prompt */}
                      <div className="flex items-center gap-1 text-[9px] uppercase font-black text-blue-600 dark:text-blue-400 tracking-wider mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        {language === 'hi' ? "तैयारी शुरू करें" : "Start Practice"}
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 duration-200" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {(() => {
                const activeSubCat = currentCategoryObj?.subCategories.find(s => s.id === selectedSubCategory);
                // Let's group tests by their sub-subcategory
                const groups = (activeSubCat?.subSubCategories || []).map(subSub => {
                  const filtered = subSub.tests.filter(t => 
                    t.title.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  return {
                    ...subSub,
                    tests: filtered
                  };
                }).filter(g => g.tests.length > 0);

                const fallbackTests = (activeSubCat?.tests || []).filter(t => 
                  t.title.toLowerCase().includes(searchQuery.toLowerCase())
                );

                return (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                      <button
                        onClick={() => setSelectedSubCategory(null)}
                        className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm text-slate-700 dark:text-slate-200 cursor-pointer active:scale-95 shrink-0"
                      >
                        <ArrowLeft className="h-4 w-4" /> {t.backToSubcategories}
                      </button>

                      {currentCategoryObj?.logoUrl && (
                        <div className="flex-1 flex justify-center items-center">
                          <img 
                            src={currentCategoryObj.logoUrl} 
                            alt={`${currentCategoryObj.name} logo`} 
                            className="h-16 w-auto max-h-20 object-contain rounded-xl shadow-sm"
                          />
                        </div>
                      )}

                      <div className="text-right">
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 justify-end">
                          {activeSubCat?.name}
                          <BookOpen className="h-5 w-5 text-blue-500" />
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {t.testSeriesDesc}
                        </p>
                      </div>
                    </div>

                    {groups.length === 0 && fallbackTests.length === 0 ? (
                      <div className="text-center py-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">
                          {language === 'hi' ? 'कोई मॉक टेस्ट नहीं मिला।' : 'No mock tests found.'}
                        </p>
                      </div>
                    ) : groups.length > 0 ? (
                      <div className="space-y-6">
                        {/* Horizontal Tab Navigator for Sub-subcategories */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 dark:border-slate-800">
                          {groups.map(group => {
                            const isSelected = (activeSubSubId || groups[0]?.id) === group.id;
                            return (
                              <button
                                key={group.id}
                                onClick={() => setActiveSubSubId(group.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                                  isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                                }`}
                              >
                                {group.name} ({group.tests.length})
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected Group's Tests */}
                        {(() => {
                          const activeGroup = groups.find(g => g.id === (activeSubSubId || groups[0]?.id));
if (!activeGroup) return null;
                          return (
                            <div className="space-y-3 animate-in fade-in duration-300">
                              {activeGroup.tests.map(test => {
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
                                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-250/60 dark:border-emerald-900/40 border-l-4 border-l-emerald-500'
                                    : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-250/60 dark:border-rose-900/40 border-l-4 border-l-red-500'
                                  : 'bg-white/75 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 border-l-4 border-l-blue-500';

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
                                    key={test.id}
                                    className={`backdrop-blur-sm p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full hover:scale-[1.015] relative overflow-hidden ${cardColorStyle} ${cardGlow}`}
                                  >
                                    <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-slate-400/5 pointer-events-none" />
                                    <div className="space-y-1.5 flex-1 w-full text-left">
                                      <div className="flex flex-wrap items-center gap-2">
                                        {isTestPremium ? (
                                          <span className="bg-amber-500/10 text-amber-700 dark:bg-amber-500/5 dark:text-amber-405 text-[8px] font-black px-2 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-wider">
                                            {language === 'hi' ? 'प्रो' : 'PRO'}
                                          </span>
                                        ) : (
                                          <span className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/5 dark:text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-md border border-emerald-500/20 uppercase tracking-wider">
                                            {language === 'hi' ? 'मुफ़्त' : 'FREE'}
                                          </span>
                                        )}

                                        {ongoing && (
                                          <span className="flex items-center gap-1 text-[8px] bg-orange-500/10 text-orange-700 dark:bg-orange-500/5 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md font-black uppercase">
                                            ⏸ {language === 'hi' ? 'रुका हुआ' : 'PAUSED'}
                                          </span>
                                        )}
                                        
                                        {completed && (
                                          <span className="flex items-center gap-1 text-[8px] bg-blue-500/10 text-blue-700 dark:bg-blue-500/5 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-black uppercase">
                                            ✓ {language === 'hi' ? 'प्रयास किया गया' : 'ATTEMPTED'}
                                          </span>
                                        )}

                                        <span className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/5 dark:text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-md border border-emerald-500/20 uppercase tracking-wider font-mono">
                                          +{test.positiveMarks ?? 2} {language === 'hi' ? 'सही' : 'Right'}
                                        </span>
                                        <span className="bg-red-500/10 text-red-700 dark:bg-red-500/5 dark:text-red-400 text-[8px] font-black px-2 py-0.5 rounded-md border border-red-500/20 uppercase tracking-wider font-mono">
                                          -{test.negativeMarks ?? 0.5} {language === 'hi' ? 'गलत' : 'Wrong'}
                                        </span>
                                      </div>

                                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                                        {test.title}
                                      </h4>

                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-500 dark:text-slate-400 font-bold pt-0.5">
                                        <span>{test.questionsCount} Qs</span>
                                        <span>•</span>
                                        <span>{test.durationMinutes} Mins</span>
                                        <span>•</span>
                                        <span>{test.maxMarks} Marks</span>
                                        <span>•</span>
                                        <span className="text-blue-600 dark:text-blue-400 font-medium">🌐 English, Hindi</span>
                                      </div>

                                      {attemptsCount > 0 && (() => {
                                        const lastAttempt = [...attempts].sort((a, b) => b.date.localeCompare(a.date))[0];
                                        if (!lastAttempt) return null;
                                        return (
                                          <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/80 px-2 py-0.5 rounded text-[8px] font-bold text-slate-600 dark:text-slate-400">
                                            <span>{language === 'hi' ? 'पिछला प्रयास' : 'Last Attempt'}:</span>
                                            <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                                              {lastAttempt.score}/{lastAttempt.maxScore} {language === 'hi' ? 'अंक' : 'marks'}
                                            </span>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 pt-3 sm:pt-0 shrink-0">
                                      {ongoing ? (
                                        <>
                                          <button
                                            onClick={() => handleStartExam(test)}
                                            className="flex-1 sm:w-32 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-lg text-[10px] text-center shadow-sm cursor-pointer"
                                          >
                                            Resume Test
                                          </button>
                                          <button
                                            onClick={() => handleReattemptExam(test)}
                                            className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-lg text-[10px] border border-slate-200 dark:border-slate-800 cursor-pointer"
                                          >
                                            Reset
                                          </button>
                                        </>
                                      ) : completed ? (
                                        <>
                                          <Link
                                            href={`/exam/${test.id}/analysis`}
                                            className="flex-1 sm:w-32 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-[10px] text-center shadow-sm block"
                                          >
                                            View Analysis
                                          </Link>
                                          <button
                                            onClick={() => handleReattemptExam(test)}
                                            className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-lg text-[10px] border border-slate-200 dark:border-slate-800 cursor-pointer"
                                          >
                                            {t.reattempt}
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => handleStartExam(test)}
                                          className={`w-full sm:w-44 text-white font-bold py-2.5 rounded-lg text-[10px] text-center shadow-sm cursor-pointer ${
                                            hasPass 
                                              ? 'bg-[#1C3D5A] hover:bg-slate-800' 
                                              : 'bg-yellow-600 hover:bg-yellow-700'
                                          }`}
                                        >
                                          {hasPass ? 'Start Practice Test' : (language === 'hi' ? 'पास के साथ अनलॉक करें' : 'Unlock with Pass')}
                                        </button>
                                      )}
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
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-250/60 dark:border-emerald-900/40 border-l-4 border-l-emerald-500'
                              : 'bg-rose-50/60 dark:bg-rose-950/20 border border-rose-250/60 dark:border-rose-900/40 border-l-4 border-l-red-500'
                            : 'bg-white/75 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 border-l-4 border-l-blue-500';

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
                              key={test.id}
                              className={`backdrop-blur-sm p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full hover:scale-[1.015] relative overflow-hidden ${cardColorStyle} ${cardGlow}`}
                            >
                              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-slate-400/5 pointer-events-none" />
                              <div className="space-y-1.5 flex-1 w-full text-left">
                                <div className="flex flex-wrap items-center gap-2">
                                  {isTestPremium ? (
                                    <span className="bg-amber-500/10 text-amber-700 dark:bg-amber-500/5 dark:text-amber-405 text-[8px] font-black px-2 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-wider">
                                      {language === 'hi' ? 'प्रो' : 'PRO'}
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/5 dark:text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-md border border-emerald-500/20 uppercase tracking-wider">
                                      {language === 'hi' ? 'मुफ़्त' : 'FREE'}
                                    </span>
                                  )}

                                  {ongoing && (
                                    <span className="flex items-center gap-1 text-[8px] bg-orange-500/10 text-orange-700 dark:bg-orange-500/5 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md font-black uppercase">
                                      ⏸ {language === 'hi' ? 'रुका हुआ' : 'PAUSED'}
                                    </span>
                                  )}
                                  
                                  {completed && (
                                    <span className="flex items-center gap-1 text-[8px] bg-blue-500/10 text-blue-700 dark:bg-blue-500/5 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-black uppercase">
                                      ✓ {language === 'hi' ? 'प्रयास किया गया' : 'ATTEMPTED'}
                                    </span>
                                  )}

                                  <span className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/5 dark:text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-md border border-emerald-500/20 uppercase tracking-wider font-mono">
                                    +{test.positiveMarks ?? 2} {language === 'hi' ? 'सही' : 'Right'}
                                  </span>
                                  <span className="bg-red-500/10 text-red-700 dark:bg-red-500/5 dark:text-red-400 text-[8px] font-black px-2 py-0.5 rounded-md border border-red-500/20 uppercase tracking-wider font-mono">
                                    -{test.negativeMarks ?? 0.5} {language === 'hi' ? 'गलत' : 'Wrong'}
                                  </span>
                                </div>

                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                                  {test.title}
                                </h4>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-500 dark:text-slate-400 font-bold pt-0.5">
                                  <span>{test.questionsCount} Qs</span>
                                  <span>•</span>
                                  <span>{test.durationMinutes} Mins</span>
                                  <span>•</span>
                                  <span>{test.maxMarks} Marks</span>
                                  <span>•</span>
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">🌐 English, Hindi</span>
                                </div>

                                {attemptsCount > 0 && (() => {
                                  const lastAttempt = [...attempts].sort((a, b) => b.date.localeCompare(a.date))[0];
                                  if (!lastAttempt) return null;
                                  return (
                                    <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/80 px-2 py-0.5 rounded text-[8px] font-bold text-slate-600 dark:text-slate-400">
                                      <span>{language === 'hi' ? 'पिछला प्रयास' : 'Last Attempt'}:</span>
                                      <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                                        {lastAttempt.score}/{lastAttempt.maxScore} {language === 'hi' ? 'अंक' : 'marks'}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>

                              <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 pt-3 sm:pt-0 shrink-0">
                                {ongoing ? (
                                  <>
                                    <button
                                      onClick={() => handleStartExam(test)}
                                      className="flex-1 sm:w-32 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-lg text-[10px] text-center shadow-sm cursor-pointer"
                                    >
                                      Resume Test
                                    </button>
                                    <button
                                      onClick={() => handleReattemptExam(test)}
                                      className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-lg text-[10px] border border-slate-200 dark:border-slate-800 cursor-pointer"
                                    >
                                      Reset
                                    </button>
                                  </>
                                ) : completed ? (
                                  <>
                                    <Link
                                      href={`/exam/${test.id}/analysis`}
                                      className="flex-1 sm:w-32 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-[10px] text-center shadow-sm block"
                                    >
                                      View Analysis
                                    </Link>
                                    <button
                                      onClick={() => handleReattemptExam(test)}
                                      className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-lg text-[10px] border border-slate-200 dark:border-slate-800 cursor-pointer"
                                    >
                                      {t.reattempt}
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleStartExam(test)}
                                    className={`w-full sm:w-44 text-white font-bold py-2.5 rounded-lg text-[10px] text-center shadow-sm cursor-pointer ${
                                      hasPass 
                                        ? 'bg-[#1C3D5A] hover:bg-slate-800' 
                                        : 'bg-yellow-600 hover:bg-yellow-700'
                                    }`}
                                  >
                                    {hasPass ? 'Start Practice Test' : (language === 'hi' ? 'पास के साथ अनलॉक करें' : 'Unlock with Pass')}
                                  </button>
                                )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-slate-800 dark:text-white">
            <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-500 mb-4">
              <ShieldAlert className="h-6 w-6" />
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white">Unlock Gated Mock Test</h4>
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
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-yellow-900/20 cursor-pointer"
              >
                Simulate Unlock Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Support Action Menu */}
      <HomeSupportWidget variant="expandable" />
    </div>
  );
}
