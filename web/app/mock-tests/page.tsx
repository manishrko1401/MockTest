"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, TestCategory, TestSubCategory, MockTestItem } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ShieldAlert, Award, ArrowLeft, Search, GraduationCap, ChevronRight, Check, Sun, Moon, Bookmark, Trash2, ChevronUp, ChevronDown, Menu, TrendingUp, Coins, MapPin, Sparkles } from 'lucide-react';
import { generateExamSession, EXPLANATIONS } from '../lib/examUtils';
import { TRANSLATIONS } from '../translations';
import { useIsMobile } from '../useIsMobile';

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

export default function MockTestsCatalog() {
  const { currentUser, saveUserProfileByAdmin, theme, toggleTheme, toggleBookmark, clearOngoingSession, language, setLanguage, examCatalog } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];
  
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('cat');
      return cat || 'ssc';
    }
    return 'ssc';
  });

  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [activeSubSubId, setActiveSubSubId] = useState<string | null>(null);

  // Reset active sub-subcategory when subcategory changes
  React.useEffect(() => {
    setActiveSubSubId(null);
  }, [selectedSubCategory]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('cat');
      if (cat) {
        setSelectedCategory(cat);
      }
    }
  }, []);

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
    if (typeof window !== 'undefined' && (window as any).MathJax) {
      try {
        (window as any).MathJax.typesetPromise();
      } catch (err) {
        console.warn("MathJax typesetting failed:", err);
      }
    }
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
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 font-sans min-h-screen text-slate-800 dark:text-slate-100 select-none transition-colors duration-200">
        
        {/* MOBILE HEADER */}
        <header className="h-14 border-b border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <Link href="/" className="flex items-center gap-1 text-slate-700 dark:text-white font-bold text-xs">
            <ArrowLeft className="h-4 w-4" /> {t.navHome}
          </Link>
          
          <div className="flex items-center gap-2">
            {/* Bookmarked Questions Button */}
            <button
              onClick={() => setShowBookmarks(!showBookmarks)}
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
                  onClick={() => setShowBookmarks(false)}
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
                    const expl = EXPLANATIONS[bm.questionId] || {};

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

                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: questionText }} />

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
                            
                            {(expl.en || expl.hi) && (
                              <div className="bg-yellow-50/50 dark:bg-yellow-950/10 border border-yellow-200 dark:border-yellow-900/40 p-2.5 rounded-lg">
                                <p className="font-extrabold text-[9px] text-yellow-800 dark:text-yellow-400 uppercase">Correct Explanation:</p>
                                <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-relaxed mt-1 font-medium">
                                  {language === 'hi' ? (expl.hi || 'विवरण उपलब्ध नहीं है।') : (expl.en || 'No explanation text provided.')}
                                </p>
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
              {/* CATEGORY SWIPE TAB BAR */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0 border-b border-slate-200 dark:border-slate-800">
                {filteredCatalog.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedSubCategory(null);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer border ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {cat.name.split(' ')[0]} Exams
                  </button>
                ))}
              </div>

              {/* MOCK TESTS CARD LIST GROUPED BY SUB-CATEGORY */}
              <div className="flex-1 space-y-6 overflow-y-auto">
                {activeCategoryObj ? (
                  activeCategoryObj.subCategories.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No matching tests found.
                    </div>
                  ) : (
                    activeCategoryObj.subCategories.map((subCat) => (
                      <div key={subCat.id} className="space-y-3">
                        {/* Sub Category Title Banner */}
                        <div className="flex items-center gap-1.5 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider pl-1">
                          <GraduationCap className="h-4 w-4 text-blue-500" />
                          <span>{subCat.name}</span>
                        </div>

                        {/* Test Cards List */}
                        <div className="space-y-3">
                          {subCat.tests.map((test) => {
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
                                 ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 border-l-4 border-l-emerald-500'
                                 : 'bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 border-l-4 border-l-red-500'
                               : ongoing
                               ? 'bg-sky-50/30 dark:bg-sky-950/10 border border-sky-200/60 dark:border-sky-900/40 border-l-4 border-l-sky-500'
                               : 'bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-500 hover:border-slate-350 dark:hover:border-slate-700';

                             return (
                               <div
                                 key={test.id}
                                 className={`p-4.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full ${cardStyle}`}
                               >
                                 <div className="space-y-1.5 flex-1 w-full text-left">
                                   <div className="flex flex-wrap items-center gap-2">
                                     {isTestPremium ? (
                                       <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-250 dark:border-amber-900/60 uppercase tracking-wider">
                                         {language === 'hi' ? 'प्रो' : 'PRO'}
                                       </span>
                                     ) : (
                                       <span className="bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-green-200 dark:border-green-900/60 uppercase tracking-wider">
                                         {language === 'hi' ? 'मुफ़्त' : 'FREE'}
                                       </span>
                                     )}

                                     {ongoing && (
                                       <span className="flex items-center gap-1 text-[8px] bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-250 dark:border-orange-900/60 px-1.5 py-0.5 rounded font-black uppercase">
                                         ⏸ {language === 'hi' ? 'रुका हुआ' : 'PAUSED'}
                                       </span>
                                     )}
                                     
                                     {completed && (
                                       <span className="flex items-center gap-1 text-[8px] bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900/60 px-1.5 py-0.5 rounded font-black uppercase">
                                         ✓ {language === 'hi' ? 'प्रयास किया गया' : 'ATTEMPTED'}
                                       </span>
                                     )}
                                     
                                     <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60 uppercase tracking-wider font-mono">
                                       +{test.positiveMarks ?? 2} {language === 'hi' ? 'सही' : 'Right'}
                                     </span>
                                     <span className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/60 uppercase tracking-wider font-mono">
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
                                         className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-lg text-[10px] border border-slate-200 dark:border-slate-805 cursor-pointer"
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
                                         className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-lg text-[10px] border border-slate-200 dark:border-slate-805 cursor-pointer"
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
                      </div>
                    ))
                  )
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Select a category to view exams.
                  </div>
                )}
              </div>
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
        <Link href="/" className="flex items-center gap-2 text-slate-700 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-bold text-sm tracking-wide transition-colors">
          <ArrowLeft className="h-4 w-4" /> {t.backToHome}
        </Link>

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

          {/* Search filter */}
          <div className="relative max-w-xs w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchMocksPlaceholder}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

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
        
        {/* Left Side Navigation (Categories list) */}
        <aside className="w-full lg:w-64 bg-white dark:bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shrink-0 lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
          <div className="flex flex-col flex-1 min-h-0">
            <h3 className="font-extrabold text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-4 font-sans shrink-0">{t.examCategories}</h3>
            
            {/* Category Search Input */}
            <div className="relative mb-4 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                placeholder={language === 'hi' ? 'श्रेणी खोजें...' : 'Search categories...'}
                className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-7 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
              />
              {categorySearchQuery && (
                <button
                  onClick={() => setCategorySearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-605 dark:hover:text-slate-300 focus:outline-none text-[10px] font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <nav className="space-y-1 flex-1 overflow-y-auto pr-1 scrollbar-thin">
              {filteredSidebarCategories.length > 0 ? (
                filteredSidebarCategories.map((category) => {
                  const isSelected = selectedCategory === category.id && !showBookmarks;
                  const SidebarIcon = 
                    category.id === 'ssc' ? Award :
                    category.id === 'railways' ? TrendingUp :
                    category.id === 'banking' ? Coins :
                    category.id === 'teaching' ? BookOpen :
                    category.id === 'ugc_net' ? GraduationCap : MapPin;

                  const activeGrad = 
                    category.id === 'ssc' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow shadow-amber-500/25' :
                    category.id === 'railways' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow shadow-blue-500/25' :
                    category.id === 'banking' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow shadow-emerald-500/25' :
                    category.id === 'teaching' ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow shadow-amber-500/25' :
                    category.id === 'ugc_net' ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow shadow-sky-500/25' : 
                    'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow shadow-purple-500/25';

                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setSelectedSubCategory(null);
                        setShowBookmarks(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? `${activeGrad}`
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <SidebarIcon className={`h-4 w-4 ${isSelected ? 'animate-pulse' : ''}`} />
                        {category.name}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  {language === 'hi' ? 'कोई श्रेणी नहीं मिली' : 'No categories found'}
                </div>
              )}
            </nav>
          </div>

          {/* Hide Unlock All / Get Pass Pro tab for now */}
          {/* <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 text-center">
            <p className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">{t.unlockAll}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 leading-normal mt-1 mb-3">{t.upgradeDesc}</p>
            <button
              onClick={() => { setRequiredTierInfo('Testbook Pass Pro'); setUpgradePopupOpen(true); }}
              className="w-full bg-yellow-600 hover:bg-yellow-750 text-white py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {t.getPassPro}
            </button>
          </div> */}
        </aside>

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
          ) : selectedSubCategory === null ? (
            <>
              <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-350">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  {language === 'hi' ? TRANSLATIONS.hi.subCatTitle : TRANSLATIONS.en.subCatTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {language === 'hi' ? TRANSLATIONS.hi.subCatDesc : TRANSLATIONS.en.subCatDesc}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
                {currentCategoryObj?.subCategories.map(subCat => {
                  const count = subCat.tests.length;
                  const countStr = count === 1 
                    ? (language === 'hi' ? `1 ${t.mocksCount}` : `1 ${t.mocksCount}`)
                    : (language === 'hi' ? `${count} ${t.mocksCount}` : `${count} ${t.mocksCountPlural}`);

                  return (
                    <button
                      key={subCat.id}
                      onClick={() => setSelectedSubCategory(subCat.id)}
                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 p-4 rounded-xl flex flex-col justify-between group transition-all shadow-sm hover:shadow-md text-left w-full cursor-pointer hover:scale-[1.02] duration-200"
                    >
                      <div>
                        <div className="bg-blue-50 dark:bg-blue-900/25 p-2 rounded-lg text-blue-600 dark:text-blue-400 inline-block mb-3">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {subCat.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">
                          {countStr}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-[9px] uppercase tracking-wider mt-4 pt-2.5 border-t border-slate-150 dark:border-slate-800/60 w-full">
                        {language === 'hi' ? "टेस्ट देखें" : "View Tests"} <ChevronRight className="h-3 w-3 transition group-hover:translate-x-1" />
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
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-blue-500" />
                          {activeSubCat?.name}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {t.testSeriesDesc}
                        </p>
                      </div>

                      {currentCategoryObj?.logoUrl && (
                        <div className="flex-1 flex justify-center items-center">
                          <img 
                            src={currentCategoryObj.logoUrl} 
                            alt={`${currentCategoryObj.name} logo`} 
                            className="h-20 w-auto max-h-24 object-contain rounded-xl shadow-sm"
                          />
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedSubCategory(null)}
                        className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm text-slate-700 dark:text-slate-200 cursor-pointer active:scale-95 shrink-0"
                      >
                        <ArrowLeft className="h-4 w-4" /> {t.backToSubcategories}
                      </button>
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

    </div>
  );
}
