"use client";

import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ShieldAlert, Award, ArrowLeft, Search, GraduationCap, ChevronRight, Check, Sun, Moon, Bookmark, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { generateExamSession } from '../exam/[id]/page';
import { EXPLANATIONS } from '../exam/[id]/analysis/page';
import { TRANSLATIONS } from '../translations';

interface MockTestItem {
  id: string;
  title: string;
  questionsCount: number;
  durationMinutes: number;
  maxMarks: number;
  isPremium: boolean;
  requiredTier: 'None' | 'Testbook Pass' | 'Testbook Pass Pro';
}

interface TestSubCategory {
  id: string;
  name: string;
  tests: MockTestItem[];
}

interface TestCategory {
  id: string;
  name: string;
  subCategories: TestSubCategory[];
}

const EXAM_CATALOG: TestCategory[] = [
  {
    id: 'ssc',
    name: 'SSC Exams',
    subCategories: [
      {
        id: 'ssc_cgl',
        name: 'SSC CGL Exams',
        tests: [
          { id: 'ssc_cgl_tier1', title: 'SSC CGL 2026 - Combined Graduate Level (Tier-I) Exam', questionsCount: 100, durationMinutes: 60, maxMarks: 200, isPremium: false, requiredTier: 'None' }
        ]
      },
      {
        id: 'ssc_chsl',
        name: 'SSC CHSL Exams',
        tests: [
          { id: 'ssc_chsl_tier1', title: 'SSC CHSL 2026 - Combined Higher Secondary Level Test', questionsCount: 100, durationMinutes: 60, maxMarks: 200, isPremium: true, requiredTier: 'Testbook Pass' }
        ]
      },
      {
        id: 'ssc_mts',
        name: 'SSC MTS Exams',
        tests: [
          { id: 'ssc_mts_mock', title: 'SSC MTS Full-Length Practice Test Paper', questionsCount: 90, durationMinutes: 90, maxMarks: 270, isPremium: true, requiredTier: 'Testbook Pass' }
        ]
      }
    ]
  },
  {
    id: 'railways',
    name: 'Railways Exams',
    subCategories: [
      {
        id: 'rrb_ntpc',
        name: 'RRB NTPC Exams',
        tests: [
          { id: 'rrb_ntpc_stage1', title: 'RRB NTPC CBT-1 Stage 1 Practice Simulator', questionsCount: 100, durationMinutes: 90, maxMarks: 100, isPremium: false, requiredTier: 'None' }
        ]
      },
      {
        id: 'rrb_group_d',
        name: 'RRB Group D Exams',
        tests: [
          { id: 'rrb_group_d', title: 'RRB Group D Full Length Mock Test', questionsCount: 100, durationMinutes: 90, maxMarks: 100, isPremium: true, requiredTier: 'Testbook Pass' }
        ]
      }
    ]
  },
  {
    id: 'ugc_net',
    name: 'UGC NET Exams',
    subCategories: [
      {
        id: 'ugc_net_p1',
        name: 'UGC NET Paper 1',
        tests: [
          { id: 'ugc_net_paper1', title: 'UGC NET Paper-1 Teaching & Research Aptitude', questionsCount: 50, durationMinutes: 60, maxMarks: 100, isPremium: true, requiredTier: 'Testbook Pass Pro' }
        ]
      },
      {
        id: 'ugc_net_cs',
        name: 'UGC NET Computer Science',
        tests: [
          { id: 'ugc_net_cs', title: 'UGC NET Computer Science & Applications Paper-II', questionsCount: 100, durationMinutes: 120, maxMarks: 200, isPremium: true, requiredTier: 'Testbook Pass Pro' }
        ]
      }
    ]
  },
  {
    id: 'teaching',
    name: 'Teaching Exams',
    subCategories: [
      {
        id: 'ctet_p1',
        name: 'CTET Paper 1 Exams',
        tests: [
          { id: 'ctet_paper1', title: 'CTET 2026 Paper-I (Primary Class I-V) Mock Paper', questionsCount: 150, durationMinutes: 150, maxMarks: 150, isPremium: false, requiredTier: 'None' }
        ]
      },
      {
        id: 'ctet_p2',
        name: 'CTET Paper 2 Exams',
        tests: [
          { id: 'ctet_paper2', title: 'CTET 2026 Paper-II (Mathematics & Science)', questionsCount: 150, durationMinutes: 150, maxMarks: 150, isPremium: true, requiredTier: 'Testbook Pass' }
        ]
      }
    ]
  },
  {
    id: 'state_exams',
    name: 'All State Exams',
    subCategories: [
      {
        id: 'uppsc',
        name: 'UPPSC Exams',
        tests: [
          { id: 'up_psc_prelims', title: 'UPPSC Prelims General Studies (GS Paper 1)', questionsCount: 150, durationMinutes: 120, maxMarks: 200, isPremium: true, requiredTier: 'Testbook Pass Pro' }
        ]
      },
      {
        id: 'bssc',
        name: 'BSSC Exams',
        tests: [
          { id: 'bihar_ssc', title: 'BSSC Inter-Level Full Practice Mock Paper', questionsCount: 150, durationMinutes: 135, maxMarks: 600, isPremium: true, requiredTier: 'Testbook Pass' }
        ]
      }
    ]
  },
  {
    id: 'banking',
    name: 'Banking Exams',
    subCategories: [
      {
        id: 'sbi_po',
        name: 'SBI PO Exams',
        tests: [
          { id: 'sbi_po_prelims', title: 'SBI PO Preliminary Exam Full Length Mock Test', questionsCount: 100, durationMinutes: 60, maxMarks: 100, isPremium: true, requiredTier: 'Testbook Pass Pro' }
        ]
      },
      {
        id: 'ibps_clerk',
        name: 'IBPS Clerk Exams',
        tests: [
          { id: 'ibps_clerk', title: 'IBPS Clerk Preliminary Practice Mock Paper', questionsCount: 100, durationMinutes: 60, maxMarks: 100, isPremium: false, requiredTier: 'None' }
        ]
      }
    ]
  }
];

export default function MockTestsCatalog() {
  const { currentUser, saveUserProfileByAdmin, theme, toggleTheme, toggleBookmark, clearOngoingSession, language, setLanguage } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];
  
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('cat');
      if (cat && ['ssc', 'railways', 'ugc_net', 'teaching', 'state_exams', 'banking'].includes(cat)) {
        return cat;
      }
    }
    return 'ssc';
  });

  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('cat');
      if (cat && ['ssc', 'railways', 'ugc_net', 'teaching', 'state_exams', 'banking'].includes(cat)) {
        setSelectedCategory(cat);
      }
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [upgradePopupOpen, setUpgradePopupOpen] = useState(false);
  const [requiredTierInfo, setRequiredTierInfo] = useState<string>('');

  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const [expandedBookmarks, setExpandedBookmarks] = useState<Record<string, boolean>>({});

  const toggleExpandBookmark = (qId: string) => {
    setExpandedBookmarks(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const currentCategoryObj = EXAM_CATALOG.find(c => c.id === selectedCategory);
  
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
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side Navigation (Categories list) */}
        <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-4 font-sans">{t.examCategories}</h3>
            
            <nav className="space-y-1">
              {EXAM_CATALOG.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setSelectedSubCategory(null);
                    setShowBookmarks(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    selectedCategory === category.id && !showBookmarks
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    {category.name}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 text-center">
            <p className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">{t.unlockAll}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 leading-normal mt-1 mb-3">{t.upgradeDesc}</p>
            <button
              onClick={() => { setRequiredTierInfo('Testbook Pass Pro'); setUpgradePopupOpen(true); }}
              className="w-full bg-yellow-600 hover:bg-yellow-750 text-white py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {t.getPassPro}
            </button>
          </div>
        </aside>

        {/* Right Side Content (Tests list/details) */}
        <main className="flex-1 p-8 overflow-y-auto">
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
              ) : (
                <div className="space-y-4 max-w-4xl">
                  {currentUser.bookmarkedQuestions.map((bm, index) => {
                    const exam = generateExamSession(bm.testId);
                    const question = exam.questions.find(q => q.id === bm.questionId);
                    if (!question) return null;

                    const isExpanded = !!expandedBookmarks[bm.questionId];

                    return (
                      <div key={bm.questionId} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-all">
                        <div 
                          className="flex items-center justify-between cursor-pointer select-none"
                          onClick={() => toggleExpandBookmark(bm.questionId)}
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 px-2 py-0.5 rounded text-[9px] font-bold text-blue-600 dark:text-blue-400">
                                {exam.testTitle}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
                                Question #{index + 1}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {question.content.en.questionText}
                            </p>
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
                              <p className="font-normal mb-3">{question.content.en.questionText}</p>
                              {question.content.en.mathLatex && (
                                <p className="mb-3 font-mono text-[10px] text-yellow-600 dark:text-yellow-500 bg-yellow-500/5 px-2 py-1 rounded">LaTeX: {question.content.en.mathLatex}</p>
                              )}
                              <p className="font-bold text-blue-600 dark:text-blue-400 mb-1">प्रश्न (Hindi):</p>
                              <p className="font-normal">{question.content.hi.questionText}</p>
                              {question.content.hi.mathLatex && (
                                <p className="mt-3 font-mono text-[10px] text-yellow-600 dark:text-yellow-500 bg-yellow-500/5 px-2 py-1 rounded">LaTeX: {question.content.hi.mathLatex}</p>
                              )}
                            </div>

                            {/* Options with Highlighted Correct Answer */}
                            <div>
                              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Options & Correct Answer</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {question.content.en.options.map((opt, oIdx) => {
                                  const textEn = typeof opt === 'string' ? opt : opt.text;
                                  const textHi = typeof question.content.hi.options[oIdx] === 'string' 
                                    ? (question.content.hi.options[oIdx] as string) 
                                    : (question.content.hi.options[oIdx] as any).text;
                                  const isCorrect = oIdx === question.correctOptionIndex;

                                  return (
                                    <div 
                                      key={oIdx} 
                                      className={`p-3 rounded-lg border text-xs flex flex-col gap-1 ${
                                        isCorrect 
                                          ? 'bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-900/60 text-green-800 dark:text-green-350 font-semibold' 
                                          : 'bg-white border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 text-slate-700 dark:text-slate-400'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span>Option {oIdx + 1}: {textEn}</span>
                                        {isCorrect && <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}
                                      </div>
                                      <span className="text-[10px] opacity-80 mt-0.5">हिंदी: {textHi}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Solution Explanation */}
                            <div className="bg-blue-50/40 dark:bg-blue-950/10 p-4 border border-blue-100 dark:border-blue-900/45 rounded-xl">
                              <p className="text-[11px] font-bold text-blue-850 dark:text-blue-400 mb-3 uppercase tracking-wide">{t.explanation}</p>
                              <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                                <div>
                                  <p className="font-bold text-[10px] text-blue-700 dark:text-blue-500 mb-1">{t.englishExplanation}</p>
                                  <p className="whitespace-pre-line">{EXPLANATIONS[question.id]?.en || "No explanation available."}</p>
                                </div>
                                <div className="pt-3 border-t border-blue-100/50 dark:border-blue-950/20">
                                  <p className="font-bold text-[10px] text-blue-700 dark:text-blue-500 mb-1">{t.hindiExplanation}</p>
                                  <p className="whitespace-pre-line">{EXPLANATIONS[question.id]?.hi || "कोई व्याख्या उपलब्ध नहीं है।"}</p>
                                </div>
                              </div>
                            </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                {currentCategoryObj?.subCategories.map(subCat => {
                  const count = subCat.tests.length;
                  const countStr = count === 1 
                    ? (language === 'hi' ? `1 ${t.mocksCount}` : `1 ${t.mocksCount}`)
                    : (language === 'hi' ? `${count} ${t.mocksCount}` : `${count} ${t.mocksCountPlural}`);

                  return (
                    <button
                      key={subCat.id}
                      onClick={() => setSelectedSubCategory(subCat.id)}
                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 p-6 rounded-2xl flex flex-col justify-between group transition-all shadow-sm hover:shadow-md text-left w-full cursor-pointer hover:scale-[1.02] duration-200"
                    >
                      <div>
                        <div className="bg-blue-50 dark:bg-blue-900/25 p-3 rounded-xl text-blue-600 dark:text-blue-400 inline-block mb-4">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {subCat.name}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg">
                          {countStr}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-wider mt-6 pt-4 border-t border-slate-150 dark:border-slate-800/60 w-full">
                        {language === 'hi' ? "टेस्ट देखें" : "View Tests"} <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
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
                const filteredTests = activeSubCat?.tests.filter(t => 
                  t.title.toLowerCase().includes(searchQuery.toLowerCase())
                ) || [];

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
                      <button
                        onClick={() => setSelectedSubCategory(null)}
                        className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm text-slate-700 dark:text-slate-200 cursor-pointer active:scale-95"
                      >
                        <ArrowLeft className="h-4 w-4" /> {t.backToSubcategories}
                      </button>
                    </div>

                    {filteredTests.length === 0 ? (
                      <div className="text-center py-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">
                          {language === 'hi' ? 'कोई मॉक टेस्ट नहीं मिला।' : 'No mock tests found.'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTests.map(test => {
                          const hasPass = currentUser && (
                            (test.requiredTier === 'None') ||
                            (test.requiredTier === 'Testbook Pass' && (currentUser.subscriptionTier === 'Testbook Pass' || currentUser.subscriptionTier === 'Testbook Pass Pro')) ||
                            (test.requiredTier === 'Testbook Pass Pro' && currentUser.subscriptionTier === 'Testbook Pass Pro')
                          );

                          const completed = isCompleted(test.id);
                          const ongoing = getTestStatus(test.id) === 'ONGOING';
                          const attemptsCount = getTestAttempts(test.id).length;

                          return (
                            <div
                              key={test.id}
                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:hover:border-slate-700 transition flex flex-col justify-between shadow-sm"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-4">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    test.requiredTier === 'None'
                                      ? 'bg-green-100 border border-green-300 text-green-700 dark:bg-green-950/40 dark:border-green-800 dark:text-green-400'
                                      : test.requiredTier === 'Testbook Pass'
                                      ? 'bg-blue-100 border border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400'
                                      : 'bg-yellow-100 border border-yellow-300 text-yellow-700 dark:bg-yellow-950/40 dark:border-yellow-800 dark:text-yellow-400'
                                  }`}>
                                    {test.requiredTier === 'None' ? t.freeTest : test.requiredTier.replace('Testbook', language === 'hi' ? 'मॉक टेस्ट' : 'Mock Test')}
                                  </span>
                                  
                                  {ongoing && (
                                    <span className="flex items-center gap-1 text-[9px] bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border border-orange-300 dark:border-orange-850 px-1.5 py-0.5 rounded font-black uppercase">
                                      ⏸ {t.paused}
                                    </span>
                                  )}
                                  {hasPass && !completed && !ongoing && (
                                    <span className="flex items-center gap-1 text-[9px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border border-green-300 dark:border-green-800 px-1.5 py-0.5 rounded font-bold">
                                      <Check className="h-3 w-3" /> {t.unlocked}
                                    </span>
                                  )}
                                  {completed && (
                                    <span className="flex items-center gap-1 text-[9px] bg-green-100 text-green-805 dark:bg-green-950/60 dark:text-green-400 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded font-black">
                                      <Check className="h-3 w-3" /> {t.attempted}
                                    </span>
                                  )}
                                </div>

                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-snug mb-3 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer">
                                  {test.title}
                                </h4>

                                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-900 pt-3 mb-5 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                                  <div>
                                    <p className="text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider text-[8px]">{t.questions}</p>
                                    <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{test.questionsCount} Qs</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider text-[8px]">{t.duration}</p>
                                    <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{test.durationMinutes} Mins</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider text-[8px]">{t.totalMarks}</p>
                                    <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{test.maxMarks} Marks</p>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  if (completed) {
                                    router.push(`/exam/${test.id}/analysis`);
                                  } else {
                                    handleStartExam(test);
                                  }
                                }}
                                className={`w-full text-center py-2.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer ${
                                  completed
                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-950/20'
                                    : ongoing
                                    ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-950/20 font-bold'
                                    : hasPass
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20'
                                    : 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-yellow-900/20'
                                }`}
                              >
                                {completed ? t.viewSolution : ongoing ? t.resumeTest : hasPass ? t.startTest : (language === 'hi' ? 'पास के साथ अनलॉक करें' : 'Unlock with Pass')}
                              </button>

                              {completed && (
                                <button
                                  onClick={() => handleReattemptExam(test)}
                                  disabled={attemptsCount >= 5}
                                  className="w-full text-center py-2.5 mt-2 rounded-lg text-xs font-bold transition-all border border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {attemptsCount >= 5 ? t.maxLimitReached : `${t.reattempt} (${attemptsCount}/5)`}
                                </button>
                              )}
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
