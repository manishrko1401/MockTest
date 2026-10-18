"use client";

import React, { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../AuthContext';
import { TRANSLATIONS } from '../../../translations';
import {
  Keyboard,
  Trophy,
  Zap,
  Award,
  Play,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Sun,
  Moon,
  User,
  Scale,
  Train,
  AlertCircle,
  Clock,
  RotateCcw,
  BarChart2,
  CheckCircle2,
  Search,
  Check,
  ShieldAlert,
  Info,
  Download,
  Filter,
  Smile,
  Meh,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { SiteHeader, SiteFooter } from '../../../components/SiteUI';
import { TypingExamTour } from '../../../components/TypingTour';
import { resetStaleTypingLocalData } from '../../../lib/typingLocalReset';
import { TypingTest, TypingCategory, TypingAttempt, isSscExam, isSscCglExam, isSscChslExam, isAiimsExam, detectExamCategory, ExamCategoryConfig } from '../../../lib/typingTypes';

const cleanDisplayTitle = (title: string) => {
  if (!title) return '';
  return title
    .replace(/\s*\((?:Easy|Medium|Hard|आसान|मध्यम|कठिन)\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Plain bordered section with a solid heading bar — standard government-portal panel.
const Panel = ({ title, right, children, bodyClass = 'px-5 sm:px-6 py-5' }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; bodyClass?: string }) => (
  <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
    <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800">
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h2>
      {right}
    </div>
    <div className={bodyClass}>{children}</div>
  </section>
);

export default function TypingCategoryDetailPage({
  params
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const resolvedParams = use(params);
  const categoryId = resolvedParams.categoryId;

  const { currentUser, theme, toggleTheme, language, setLanguage } = useAuth();
  const t = TRANSLATIONS[language];
  const isHindi = language === 'hi';
  const router = useRouter();

  const [categories, setCategories] = useState<TypingCategory[]>([]);
  const [tests, setTests] = useState<TypingTest[]>([]);
  const [userAttempts, setUserAttempts] = useState<TypingAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Filters inside category (only language and search)
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>('en');
  const [passageSearch, setPassageSearch] = useState<string>('');

  // Pagination — render 50 tests at a time instead of the whole list at once
  const TESTS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);
  const passagesSectionRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setIsMounted(true);
    resetStaleTypingLocalData();

    // 1. Instant client-side hydration from cache
    try {
      const cachedCats = sessionStorage.getItem('cached_typing_categories');
      if (cachedCats) {
        const parsed = JSON.parse(cachedCats);
        if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
      }
      const cachedTests = sessionStorage.getItem(`cached_typing_tests_${categoryId}`);
      if (cachedTests) {
        const parsedT = JSON.parse(cachedTests);
        if (Array.isArray(parsedT) && parsedT.length > 0) {
          setTests(parsedT);
          setIsLoading(false);
        }
      }
      const localAttempts = localStorage.getItem('all_typing_attempts');
      if (localAttempts) {
        const parsedAtt = JSON.parse(localAttempts);
        if (Array.isArray(parsedAtt)) setUserAttempts(parsedAtt);
      }
    } catch (e) {}

    // 2. Fetch fresh scoped tests
    const fetchCategoryTests = async () => {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-typing-tests',
            data: { categoryId: categoryId === 'all' ? undefined : categoryId, light: true }
          })
        });
        const data = await res.json();
        if (data.success && active) {
          if (Array.isArray(data.tests)) {
            setTests(data.tests);
            try {
              sessionStorage.setItem(`cached_typing_tests_${categoryId}`, JSON.stringify(data.tests));
            } catch (e) {}
          }
          if (Array.isArray(data.categories)) {
            setCategories(data.categories);
            try {
              sessionStorage.setItem('cached_typing_categories', JSON.stringify(data.categories));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error('Failed to load category typing tests:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchCategoryTests();

    // Fetch user attempts in background
    if (currentUser?.id) {
      fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-user-typing-attempts',
          data: { userId: currentUser.id }
        })
      })
        .then(res => res.json())
        .then(attData => {
          if (attData.success && active && Array.isArray(attData.attempts)) {
            setUserAttempts(attData.attempts);
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [categoryId, currentUser?.id]);

  const currentCategory = useMemo(() => {
    if (categoryId === 'all') {
      return {
        id: 'all',
        name: 'Mock Test Hub Typing Test Practice Platform',
        nameHi: 'मॉक टेस्ट हब टाइपिंग टेस्ट प्रैक्टिस प्लेटफॉर्म',
        description: 'Practice and master computer typing test simulation for all central and state government recruitment exams.',
        icon: 'Sparkles',
        logoUrl: '',
        orderIndex: 0,
        isActive: true,
        createdAt: '',
        updatedAt: ''
      } as TypingCategory;
    }
    return categories.find(c => c.id === categoryId || c.id.toLowerCase() === categoryId.toLowerCase()) || null;
  }, [categoryId, categories]);

  // Parse structured metadata from description
  const categoryMeta = useMemo(() => {
    if (!currentCategory?.description) {
      return {
        description: currentCategory ? `${currentCategory.name} official typing test preparation.` : '',
        rules: '',
        pdfUrl: ''
      };
    }
    try {
      const parsed = JSON.parse(currentCategory.description);
      if (parsed && typeof parsed === 'object') {
        return {
          description: parsed.description || '',
          rules: parsed.rules || '',
          pdfUrl: parsed.pdfUrl || ''
        };
      }
    } catch (e) {}
    return {
      description: currentCategory.description,
      rules: '',
      pdfUrl: ''
    };
  }, [currentCategory]);

  // Set of test IDs belonging to this category
  const categoryTestIdSet = useMemo(() => new Set(tests.map(t => t.id)), [tests]);

  // User attempts strictly matching this individual category
  const categoryAttempts = useMemo(() => {
    if (!userAttempts.length) return [];
    if (categoryId === 'all') return userAttempts;

    const catIdNorm = (categoryId || '').toLowerCase().replace(/[-_\s]/g, '');
    const catNameNorm = (currentCategory?.name || '').toLowerCase().replace(/[-_\s]/g, '');

    return userAttempts.filter(a => {
      // 1. Direct test ID match from loaded category tests
      if (categoryTestIdSet.has(a.testId)) return true;

      // 2. Category name or ID match recorded on attempt
      const attemptCatNorm = (a.categoryName || '').toLowerCase().replace(/[-_\s]/g, '');
      if (attemptCatNorm && (attemptCatNorm.includes(catIdNorm) || catIdNorm.includes(attemptCatNorm))) return true;
      if (attemptCatNorm && catNameNorm && (attemptCatNorm.includes(catNameNorm) || catNameNorm.includes(attemptCatNorm))) return true;

      // 3. Test ID substring match (e.g. 'tm-spmcil-typing-6789' with 'spmcil')
      const testIdNorm = (a.testId || '').toLowerCase().replace(/[-_\s]/g, '');
      if (catIdNorm && testIdNorm.includes(catIdNorm)) return true;

      // 4. Test title substring match (e.g. 'SPMCIL Typing Passage 1' with 'SPMCIL')
      const titleNorm = (a.testTitle || '').toLowerCase().replace(/[-_\s]/g, '');
      if (catNameNorm && titleNorm.includes(catNameNorm)) return true;

      // 5. Short keyword check for exam slugs
      const shortKey = catIdNorm
        .replace('typing', '')
        .replace('passage', '')
        .replace('exam', '')
        .replace('test', '');
      if (shortKey.length >= 3 && (testIdNorm.includes(shortKey) || titleNorm.includes(shortKey))) {
        return true;
      }

      return false;
    });
  }, [userAttempts, tests, categoryId, currentCategory?.name, categoryTestIdSet]);

  // Personal Best Stats for this individual category (matching Typing Home Page formula)
  const categoryPersonalBest = useMemo(() => {
    if (!categoryAttempts.length) return null;
    const bestNetWpm = Math.max(...categoryAttempts.map(a => Number(a.netWpm || 0)));
    const avgAccuracy = Math.round((categoryAttempts.reduce((acc, a) => acc + (Number(a.accuracyPercentage) || 0), 0) / categoryAttempts.length) * 10) / 10;
    const qualifiedCount = categoryAttempts.filter(a => a.isQualified).length;
    return {
      bestNetWpm: isFinite(bestNetWpm) ? Math.round(bestNetWpm * 10) / 10 : 0,
      avgAccuracy: isFinite(avgAccuracy) ? avgAccuracy : 0,
      totalAttempts: categoryAttempts.length,
      qualifiedCount
    };
  }, [categoryAttempts]);

  // Filtered only by language and search (no difficulty segregation)
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      if (test.language !== selectedLanguage) return false;

      if (passageSearch.trim()) {
        const q = passageSearch.toLowerCase();
        const rawTitle = (test.title || '').toLowerCase();
        const rawTitleHi = (test.titleHi || '').toLowerCase();
        const cleanT = cleanDisplayTitle(test.title).toLowerCase();
        if (!rawTitle.includes(q) && !rawTitleHi.includes(q) && !cleanT.includes(q)) return false;
      }

      return true;
    });
  }, [tests, selectedLanguage, passageSearch]);

  // Reset to page 1 whenever the underlying list changes shape (language/search/category)
  // so the user never lands on a now-out-of-range page.
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLanguage, passageSearch, categoryId]);

  const totalPages = Math.max(1, Math.ceil(filteredTests.length / TESTS_PER_PAGE));

  // Clamp in case filteredTests shrank (e.g. new data arrived) after the reset effect above ran.
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedTests = useMemo(() => {
    const start = (safeCurrentPage - 1) * TESTS_PER_PAGE;
    return filteredTests.slice(start, start + TESTS_PER_PAGE);
  }, [filteredTests, safeCurrentPage]);

  const goToPage = (page: number) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(clamped);
    passagesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Count available passages by language
  const englishCount = useMemo(() => tests.filter(t => t.language === 'en').length, [tests]);
  const hindiCount = useMemo(() => tests.filter(t => t.language === 'hi').length, [tests]);

  // Official per-exam rules content (unchanged copy), rendered inside the "Rules" tab.
  const renderOfficialRules = () => {
                  const catConfig = detectExamCategory(currentCategory);
                  const key = catConfig.key;

                  if (key === 'aiims-cre') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>AIIMS Common Recruitment Examination (CRE-5) Official Speed & Penalty Formulas</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. MISTAKES & PENALTY CALCULATION:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Total Mistakes = Full Mistakes + 1/2 Half Mistakes<br />
                              [Note: NO rounding off e.g. FM=4 & HM=7, Total=7.5]
                            </div>
                            <div>• Standard Average Word length = <strong>5 strokes</strong>.</div>
                            <div>• Penalty = <strong>50 strokes</strong> for each mistake (50 × Total Mistakes).</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. SPEED & ACCURACY (15 Min Test):</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Net Speed (w.p.m.) = (Total Strokes − Penalty) ÷ 75<br />
                              Gross Speed (w.p.m.) = Total Strokes ÷ 75
                            </div>
                            <div>• Accuracy (%) = (Net Typing Speed ÷ Gross Typing Speed) × 100.</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Qualifying Standard: <strong>35 WPM (English) / 30 WPM (Hindi)</strong></span>
                          <span>• Backspace key: <strong>Allowed</strong></span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'ssc-cgl' || key === 'ssc-cgl-previous') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>Staff Selection Commission (SSC CGL Tier-2 DEST) Official Evaluation Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. PERCENTAGE OF ERRORS FORMULA:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Error % = (Total Mistakes ÷ Master Passage Words) × 100<br />
                              Total Mistakes = Full Mistakes + (Half Mistakes ÷ 2)
                            </div>
                            <div>• Master Passage base: <strong>2,000 Key Depressions (~350–400 words)</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. OFFICIAL QUALIFYING CUTOFFS:</strong>
                            <div className="space-y-0.5 text-[11px]">
                              <div>• <strong>UR (General):</strong> Max <strong>20.00% Error</strong> (≥ 80% accuracy)</div>
                              <div>• <strong>OBC / EWS:</strong> Max <strong>25.00% Error</strong> (≥ 75% accuracy)</div>
                              <div>• <strong>SC / ST / PwD / ESM:</strong> Max <strong>30.00% Error</strong> (≥ 70% accuracy)</div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Duration: <strong>15 Minutes</strong></span>
                          <span>• Nature: <strong>Qualifying in Nature</strong></span>
                          <span>• Backspace key: <strong>Allowed</strong></span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'ssc-chsl') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>Staff Selection Commission (SSC CHSL LDC/DEO) Official Speed & Error Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. SPEED & WORDS FORMULAS (10 Min):</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Net Words = Gross Typed Words − Total Mistakes<br />
                              Net Speed (WPM) = Net Words ÷ 10 Minutes
                            </div>
                            <div>• Total Mistakes = Full Mistakes + (Half Mistakes ÷ 2).</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. PERMISSIBLE ERROR LIMITS:</strong>
                            <div className="space-y-0.5 text-[11px]">
                              <div>• <strong>UR & EWS:</strong> Max <strong>7.00% Error</strong></div>
                              <div>• <strong>Reserved (OBC/SC/ST/PwBD/ESM):</strong> Max <strong>10.00% Error</strong></div>
                              <div>• Speed Target: <strong>35 WPM (English) / 30 WPM (Hindi)</strong></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Duration: <strong>10 Minutes</strong> (1,750 Key Depressions English / 1,500 Hindi)</span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'rrb-ntpc') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>Railway Recruitment Board (RRB NTPC) Official 5% Permissible Margin & Penalty Rule</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. 5% MARGIN & 10x PENALTY:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Permissible Mistakes = 5% of Total Typed Words<br />
                              Excess Mistakes = Total Mistakes − Permissible Mistakes<br />
                              Penalty Words = Excess Mistakes × 10
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. FINAL NET SPEED FORMULA:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Net Speed (WPM) = (Gross Words − Penalty Words) ÷ 10
                            </div>
                            <div>• Qualifying Threshold: <strong>30 WPM (English) / 25 WPM (Hindi KrutiDev / Mangal)</strong>.</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Test Duration: <strong>10 Minutes</strong></span>
                          <span>• Backspace: <strong>Allowed</strong></span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'delhi-police-hcm') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>Delhi Police Head Constable (Ministerial) Official 25-Marks Scale Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. SPEED & MISTAKE DEDUCTION:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Tentative Speed = Total Typed Words ÷ 10<br />
                              Actual Speed = Tentative Speed − Total Mistakes
                            </div>
                            <div>• Each mistake directly deducts <strong>1.0 WPM</strong> from tentative speed.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. OFFICIAL 25-MARKS SCORECARD TABLE:</strong>
                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                              <div>• &lt; 30 WPM = <strong>0 Marks</strong></div>
                              <div>• 30 WPM = <strong>10 Marks</strong></div>
                              <div>• 31–35 WPM = <strong>12 Marks</strong></div>
                              <div>• 36–40 WPM = <strong>15 Marks</strong></div>
                              <div>• 41–45 WPM = <strong>18 Marks</strong></div>
                              <div>• 46–50 WPM = <strong>21 Marks</strong></div>
                              <div className="col-span-2">• &gt; 50 WPM = <strong>25 Marks (Maximum)</strong></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Duration: <strong>10 Minutes</strong></span>
                          <span>• Qualifying: Minimum <strong>30 WPM (10 Marks)</strong> required.</span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'allahabad-hc') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>High Court of Judicature at Allahabad Official 50-Marks Evaluation System</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. MARKS & DEDUCTION FORMULA:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Secured Marks = 50.0 − (Total Mistakes × 0.1)
                            </div>
                            <div>• Every mistake deducts exactly <strong>0.1 Marks</strong> from maximum 50.0 marks.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. QUALIFYING CRITERIA:</strong>
                            <div className="space-y-0.5 text-[11px]">
                              <div>• Minimum Qualifying Marks: <strong>25.0 / 50.0 Marks (50.0%)</strong></div>
                              <div>• Minimum Speed: <strong>25 WPM (500 Words in 15 Minutes)</strong></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Duration: <strong>15 Minutes</strong></span>
                          <span>• Minimum 25.0 marks required for qualification.</span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'mp-cpct') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>MP CPCT Official NWPM & Scaled Scorecard Percentage Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. NET SPEED (NWPM) FORMULA:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              NWPM = Gross WPM − (Total Mistakes ÷ Test Minutes)
                            </div>
                            <div>• Standard Duration: <strong>15 Minutes</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. SCALED SCORE BRACKETS:</strong>
                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                              <div>• &lt; 30 WPM: <strong>Not Qualified</strong></div>
                              <div>• 30–39.9 WPM: <strong>50% Score</strong></div>
                              <div>• 40–49.9 WPM: <strong>60% Score</strong></div>
                              <div>• 50–59.9 WPM: <strong>70% Score</strong></div>
                              <div>• 60–69.9 WPM: <strong>80% Score</strong></div>
                              <div>• ≥ 70 WPM: <strong>100% Score</strong></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Qualifying: Minimum <strong>30 NWPM (English) / 20 NWPM (Hindi)</strong> (50% Scorecard).</span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'rssb-ldc') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>Rajasthan RSSB LDC Official Section-1 Speed Test Marking System</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. WORD-BY-WORD MARKING FORMULA:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              English: 0.05 Marks per correct word (Max 25 Marks)<br />
                              Hindi: 0.0625 Marks per correct word (Max 25 Marks)
                            </div>
                            <div>• Passages: 500 Words (English) / 400 Words (Hindi).</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. QUALIFYING MINIMUM MARKS:</strong>
                            <div className="space-y-0.5 text-[11px]">
                              <div>• Minimum Qualifying: <strong>9.0 / 25.0 Marks (36.0%)</strong> in Speed Test</div>
                              <div>• Duration: <strong>10 Minutes</strong></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Candidates scoring below 9.0 marks are disqualified.</span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'delhi-hc-jja') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>High Court of Delhi (DHC JJA / SJA) Official 3% Permissible Margin Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. 3% MARGIN & DECIMAL ROUNDING:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Permissible = 3% of Typed Words [0.01-0.49→0.5, 0.51-0.99→1.0]<br />
                              Excess Mistakes = Total Mistakes − Permissible<br />
                              Penalty Words = Excess Mistakes × 10
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. NET SPEED & QUALIFYING:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Net Speed = (Gross Words − Penalty Words) ÷ 10
                            </div>
                            <div>• Qualifying Speed: <strong>35 WPM (10 Minutes)</strong>.</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1">
                          <span>• Strict decimal rounding applies to permissible mistake limits.</span>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'supreme-court-jca') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>Supreme Court of India (JCA) Official Strict 3.00% Error Threshold</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. ERROR PERCENTAGE:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Error % = (Total Mistakes ÷ Total Typed Words) × 100
                            </div>
                            <div>• Maximum Permissible Error: <strong>Strictly 3.00%</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. SPEED CRITERIA:</strong>
                            <div className="space-y-0.5 text-[11px]">
                              <div>• Minimum Speed: <strong>35 WPM in English</strong></div>
                              <div>• Duration: <strong>10 Minutes</strong></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'spmcil') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>SPMCIL Typing Test Official Evaluation & Direct Deduction Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. PERMISSIBLE ERROR MARGIN:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded space-y-0.5">
                              <div>• UR Margin: <strong>5%</strong> of Typed Words</div>
                              <div>• Reserved Margin: <strong>7%</strong> of Typed Words</div>
                              <div>• Actual Error = max(0, Total Errors − Error Allowed)</div>
                              <div>• Direct Deduction: Net Words = Words Typed − Actual Error</div>
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. SPEED & TARGETS:</strong>
                            <div>• Qualifying Net Speed: <strong>40 WPM (English) / 30 WPM (Hindi)</strong></div>
                            <div>• Duration: <strong>10 Minutes</strong> (Standard Examination)</div>
                            <div>• Error Types: Full Error (1.0 each) & Half Error (0.5 each)</div>
                            <div>• Net Speed (WPM) = (Keystrokes Typed − Actual Error × 5) ÷ 5 ÷ 10</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'up-police-co') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>UP Police Computer Operator Official 85% Accuracy Scheme</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. MANDATORY ACCURACY RULE:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Accuracy (%) = ((Total Words − Total Mistakes) ÷ Total Words) × 100
                            </div>
                            <div>• Minimum Accuracy Required: <strong>≥ 85.00%</strong> (Mandatory).</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. SPEED CRITERIA (15 Min):</strong>
                            <div>• English Typing: <strong>30 WPM</strong></div>
                            <div>• Hindi Typing (Unicode / Inscript): <strong>25 WPM</strong></div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'bsf-hcm') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>BSF HCM Official 5% Mistake Allowance & 10x Penalty Formula</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. 5% ALLOWANCE & PENALTY:</strong>
                            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950 p-1.5 rounded">
                              Permissible Mistakes = 5% of Total Words<br />
                              Penalty = (Total Mistakes − Permissible) × 10 words
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. QUALIFYING SPEED:</strong>
                            <div>• <strong>35 WPM (English) / 30 WPM (Hindi)</strong> (10 Minutes).</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'bombay-hc-clerk' || key === 'bombay-hc-clerk-400') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span></span>
                            <span>High Court of Judicature at Bombay — Clerk Typing Official Scheme</span>
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">
                            Cutoff: 10.0 / 20.0 Marks (50%) &amp; 40 WPM
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. PASSAGE &amp; SPEED:</strong>
                            <div>• 400 Words English passage in <strong>10 Minutes</strong>.</div>
                            <div>• Minimum Qualifying Speed: <strong>40 WPM (En) / 30 WPM (Hi)</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. MARKS &amp; PENALTY:</strong>
                            <div>• Maximum Marks: <strong>20.00 Marks</strong>.</div>
                            <div>• Penalty: <strong>0.25 Marks deducted per mistake</strong> (1 Mark per 4 mistakes).</div>
                            <div>• Minimum Qualifying: <strong>10.00 Marks (50%)</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">III. TEST MODE &amp; TOOLS:</strong>
                            <div>• <strong>Paper-to-Screen Mode</strong> supported (passage toggle).</div>
                            <div>• <strong>Download Authentic Passage PDF</strong> to practice physical sheet typing.</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'chandigarh-admin-clerk') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span></span>
                            <span>Chandigarh Administration Clerk &amp; Steno-Typist Official Scheme</span>
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">
                            Qualifying Cutoff: 35 WPM (Net Speed)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. DURATION &amp; SPEED:</strong>
                            <div>• Duration: <strong>10 Minutes (600 seconds)</strong>.</div>
                            <div>• Minimum Qualifying Speed: <strong>35 WPM (English) / 30 WPM (Hindi)</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. ERROR EVALUATION RULE:</strong>
                            <div>• <strong>All Errors Count as Full Errors (1.0 each)</strong>.</div>
                            <div>• Spacing, capitalization, punctuation &amp; transposition count as 1.0 Full Mistake (no half errors).</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">III. SPEED FORMULA:</strong>
                            <div>• Net Words = <strong>Words Typed − Total Errors</strong>.</div>
                            <div>• Net Speed = <strong>Net Words ÷ 10 Minutes</strong>.</div>
                            <div>• Nature: <strong>Purely Qualifying</strong> (Pass / Fail).</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'punjab-haryana-hc' || categoryId.includes('punjab')) {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span></span>
                            <span>High Court of Punjab and Haryana Official Typing Speed Scheme</span>
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">
                            Cutoff: 30 WPM (En) / 25 WPM (Hi)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. DURATION &amp; SPEED:</strong>
                            <div>• Duration: <strong>10 Minutes (600 seconds)</strong>.</div>
                            <div>• Minimum Qualifying Speed: <strong>30 WPM (English) / 25 WPM (Hindi)</strong>.</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. ERROR EVALUATION RULE:</strong>
                            <div>• <strong>All Errors Count as Full Errors (1.0 each)</strong>.</div>
                            <div>• Spacing, capitalization, punctuation &amp; substitutions count as 1.0 Full Mistake (no half errors).</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">III. SPEED FORMULA:</strong>
                            <div>• Net Words = <strong>Words Typed − Total Errors</strong>.</div>
                            <div>• Net Speed = <strong>Net Words ÷ 10 Minutes</strong>.</div>
                            <div>• Nature: <strong>Purely Qualifying</strong> (Pass / Fail).</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (key === 'upsssc-ja' || key === 'upsssc-ja-hindi') {
                    return (
                      <div className="space-y-2.5">
                        <div className="font-semibold text-[#1e4e79] dark:text-blue-300 text-[13px] sm:text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                          <span>UPSSSC Junior Assistant Official 5-Minute Typing Speed Standard</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">I. SPEED & DURATION:</strong>
                            <div>• English Typing: <strong>30 WPM (5 Minutes)</strong></div>
                            <div>• Hindi Typing: <strong>25 WPM (5 Minutes)</strong> (Mangal / KrutiDev)</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-100 dark:border-slate-900/60 space-y-1">
                            <strong className="text-slate-900 dark:text-white">II. QUALIFICATION:</strong>
                            <div>• Qualifying in nature. Both English and Hindi required as per board rules.</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default / Generic Government Exam Template (DSSSB, KVS, EMRS, CSIR, DDA, etc.)
                  return (
                    <div className="space-y-2.5">
                      <div className="font-bold text-slate-900 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                        <span>{catConfig.name} Official Typing Speed, Mistake & Accuracy Formulas</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                        <div className="bg-white dark:bg-slate-950 p-2.5 rounded-none border border-slate-200 dark:border-slate-800 space-y-1">
                          <strong className="text-slate-900 dark:text-white">I. MISTAKE COUNTING & ACCURACY:</strong>
                          <div className="font-mono text-[11px] text-slate-700 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900 p-1.5 rounded">
                            Total Mistakes = Full Mistakes + (Half Mistakes ÷ 2)<br />
                            Accuracy (%) = ((Gross Words − Total Mistakes) ÷ Gross Words) × 100
                          </div>
                          <div>• Permissible Error Cap: <strong>≤ 5.00%</strong></div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-none border border-slate-200 dark:border-slate-800 space-y-1">
                          <strong className="text-slate-900 dark:text-white">II. SPEED CALCULATION FORMULAS:</strong>
                          <div className="font-mono text-[11px] text-slate-700 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900 p-1.5 rounded">
                            Gross Speed (WPM) = Total Words Typed ÷ Duration<br />
                            Net Speed (WPM) = (Gross Words − Total Mistakes) ÷ Duration
                          </div>
                          <div>• Qualifying Speed: <strong>{catConfig.qualifyingSpeed.en} WPM (English) / {catConfig.qualifyingSpeed.hi} WPM (Hindi)</strong></div>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                        <span>• Standard Duration: <strong>{catConfig.standardDurationMinutes} Minutes</strong></span>
                        <span>• Backspace: <strong>Allowed</strong></span>
                      </div>
                    </div>
                  );
  };

  const examConfig = detectExamCategory(currentCategory);

  const evaluationLabel = (() => {
    const m = examConfig.evaluationMode;
    if (m === 'SSC_CGL_DEST' || m === 'SSC_CHSL_NET') return isHindi ? 'त्रुटि % आधारित' : 'Error % based';
    if (m.endsWith('_MARKS')) return isHindi ? 'अंक आधारित' : 'Marks based';
    if (m === 'MP_CPCT_SCALED') return isHindi ? 'स्केल्ड स्कोर' : 'Scaled score';
    if (m === 'AIIMS_CRE_STROKES') return isHindi ? 'कीस्ट्रोक पेनल्टी' : 'Keystroke penalty';
    return isHindi ? 'नेट स्पीड आधारित' : 'Net speed based';
  })();

  // Best result per passage, so each row can show how the student did last time.
  const attemptsByTest = useMemo(() => {
    const map = new Map<string, { best: number; qualified: boolean; count: number }>();
    for (const a of userAttempts) {
      const prev = map.get(a.testId);
      const net = Number(a.netWpm || 0);
      map.set(a.testId, {
        best: Math.max(prev?.best ?? 0, isFinite(net) ? net : 0),
        qualified: (prev?.qualified ?? false) || !!a.isQualified,
        count: (prev?.count ?? 0) + 1,
      });
    }
    return map;
  }, [userAttempts]);

  // Compact page list with ellipses: 1 … 4 5 [6] 7 8 … 20
  const pageNumbers = useMemo(() => {
    const pages: Array<number | 'gap'> = [];
    const add = (p: number) => { if (!pages.includes(p)) pages.push(p); };
    add(1);
    for (let p = safeCurrentPage - 1; p <= safeCurrentPage + 1; p++) {
      if (p > 1 && p < totalPages) add(p);
    }
    if (totalPages > 1) add(totalPages);
    const out: Array<number | 'gap'> = [];
    pages.sort((a, b) => (a as number) - (b as number)).forEach((p, i, arr) => {
      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) out.push('gap');
      out.push(p);
    });
    return out;
  }, [safeCurrentPage, totalPages]);

  const [descExpanded, setDescExpanded] = useState(false);

  // Admin-entered descriptions sometimes arrive HTML-escaped (e.g. &quot;B&quot;).
  const heroDescription = (categoryMeta.description || '')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');


  const infoRows: Array<[string, React.ReactNode]> = [
    [isHindi ? 'परीक्षा' : 'Examination', currentCategory?.name || '—'],
    [isHindi ? 'परीक्षा की अवधि' : 'Test duration', `${examConfig.standardDurationMinutes} ${isHindi ? 'मिनट' : 'minutes'}`],
    [isHindi ? 'न्यूनतम स्पीड (अंग्रेज़ी)' : 'Qualifying speed (English)', `${examConfig.qualifyingSpeed.en} WPM`],
    [isHindi ? 'न्यूनतम स्पीड (हिंदी)' : 'Qualifying speed (Hindi)', `${examConfig.qualifyingSpeed.hi} WPM`],
    [isHindi ? 'मूल्यांकन पद्धति' : 'Evaluation method', evaluationLabel],
    [isHindi ? 'पुनः टाइपिंग' : 'Retyping', examConfig.retypeAllowed ? (isHindi ? 'अनुमत' : 'Allowed') : (isHindi ? 'अनुमत नहीं' : 'Not allowed')],
    [isHindi ? 'उपलब्ध गद्यांश' : 'Passages available', `${englishCount} English, ${hindiCount} Hindi`],
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fa] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans" suppressHydrationWarning>
      <SiteHeader />

      {/* ───── Page title ───── */}
      <div className="bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-1">
          <nav className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="text-[#1e4e79] dark:text-blue-400 hover:underline">{isHindi ? 'होम' : 'Home'}</Link>
            <span>/</span>
            <Link href="/typing-test" className="text-[#1e4e79] dark:text-blue-400 hover:underline">{isHindi ? 'टाइपिंग टेस्ट' : 'Typing Tests'}</Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300">{currentCategory?.name || '…'}</span>
          </nav>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 border border-slate-200 dark:border-slate-800 bg-white flex items-center justify-center p-1.5 shrink-0">
              {currentCategory?.logoUrl ? (
                <img
                  src={currentCategory.logoUrl}
                  alt={currentCategory.name}
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <Keyboard className="w-8 h-8 text-[#1e4e79]" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {currentCategory?.name || (isLoading ? '…' : 'Typing Test')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {isHindi ? 'ऑनलाइन टाइपिंग टेस्ट अभ्यास — आधिकारिक परीक्षा पैटर्न पर आधारित' : 'Online typing test practice based on the official examination pattern'}
              </p>
              {heroDescription && (
                <div className="mt-2 max-w-4xl">
                  <p className={`text-[13px] leading-relaxed text-slate-600 dark:text-slate-400 ${descExpanded ? '' : 'line-clamp-2'}`}>
                    {heroDescription}
                  </p>
                  {heroDescription.length > 220 && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded(v => !v)}
                      className="text-xs text-[#1e4e79] dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {descExpanded ? (isHindi ? 'कम दिखाएं' : 'Show less') : (isHindi ? 'और पढ़ें' : 'Read more')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-12 space-y-6">
        {/* ───── Rules & marking scheme + exam info ───── */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div data-tour="tt-rules">
          <Panel title={isHindi ? 'टाइपिंग परीक्षा के नियम एवं अंकन योजना' : 'Rules & Marking Scheme'}>
            <div className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed space-y-3">
              {renderOfficialRules()}
              {categoryMeta.rules && (
                <p className="whitespace-pre-line text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-700">
                  {categoryMeta.rules.replace(/<br\s*\/?>/gi, '\n')}
                </p>
              )}
            </div>
          </Panel>
          </div>

          <div className="space-y-6">
            <div data-tour="tt-details">
            <Panel title={isHindi ? 'परीक्षा विवरण' : 'Examination Details'} bodyClass="">
              <table className="w-full text-[13px]">
                <tbody>
                  {infoRows.map(([k, v], i) => (
                    <tr key={i} className="border-b last:border-b-0 border-slate-200 dark:border-slate-700">
                      <th scope="row" className="text-left font-medium text-slate-500 dark:text-slate-400 px-4 py-2.5 w-[48%] align-top">{k}</th>
                      <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            </div>

          </div>
        </div>

        {/* ───── Your performance (horizontal) ───── */}
        <div data-tour="tt-performance">
        <Panel
          title={isHindi ? 'आपका प्रदर्शन' : 'Your Performance'}
          bodyClass=""
        >
          {currentUser ? (() => {
            const total = categoryPersonalBest?.totalAttempts ?? 0;
            const qualified = categoryPersonalBest?.qualifiedCount ?? 0;
            const qualifiedPct = total > 0 ? Math.round((qualified / total) * 100) : 0;
            const stats: Array<{ label: string; value: React.ReactNode; note?: React.ReactNode }> = [
              {
                label: isHindi ? 'सर्वोत्तम नेट स्पीड' : 'Best net speed',
                value: categoryPersonalBest ? <>{categoryPersonalBest.bestNetWpm}<span className="text-sm font-normal text-slate-500 dark:text-slate-400"> WPM</span></> : '—',
                note: isHindi ? 'इस परीक्षा में आपका सर्वश्रेष्ठ' : 'Your best in this exam',
              },
              {
                label: isHindi ? 'औसत शुद्धता' : 'Average accuracy',
                value: categoryPersonalBest ? `${categoryPersonalBest.avgAccuracy}%` : '—',
                note: isHindi ? 'सभी प्रयासों का औसत' : 'Across all attempts',
              },
              {
                label: isHindi ? 'कुल प्रयास' : 'Tests attempted',
                value: total,
                note: isHindi ? 'इस परीक्षा श्रेणी में' : 'In this exam category',
              },
              {
                label: isHindi ? 'क्वालिफाइड' : 'Qualified',
                value: <>{qualified}<span className="text-sm font-normal text-slate-500 dark:text-slate-400"> / {total}</span></>,
                note: (
                  <span className="flex items-center gap-2">
                    <span className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <span className="block h-full rounded-full bg-[#1e7e34]" style={{ width: `${qualifiedPct}%` }} />
                    </span>
                    <span className="tabular-nums">{qualifiedPct}%</span>
                  </span>
                ),
              },
            ];
            return (
              <dl className="grid grid-cols-2 md:grid-cols-4">
                {stats.map((st, i) => (
                  <div
                    key={i}
                    className={`px-5 py-4 border-slate-200 dark:border-slate-700 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''} ${i === 1 ? 'md:border-r' : ''} ${i === 2 ? 'md:border-r' : ''}`}
                  >
                    <dt className="text-xs text-slate-500 dark:text-slate-400">{st.label}</dt>
                    <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">{st.value}</dd>
                    {st.note && <dd className="mt-1 text-xs text-slate-500 dark:text-slate-400">{st.note}</dd>}
                  </div>
                ))}
              </dl>
            );
          })() : (
            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                {isHindi
                  ? 'अपनी सर्वोत्तम स्पीड, शुद्धता और क्वालिफाइड टेस्ट देखने के लिए लॉग इन करें।'
                  : 'Log in to see your best speed, accuracy and qualified tests for this exam.'}
              </p>
              <Link href="/auth" className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-[#1e4e79] hover:bg-[#163c5e] text-white text-sm font-medium transition-colors shrink-0">
                {isHindi ? 'लॉग इन करें' : 'Log in'}
              </Link>
            </div>
          )}
        </Panel>
        </div>

        {/* ───── Available typing tests ───── */}
        <div ref={passagesSectionRef} className="scroll-mt-20">
          <Panel
            title={<>{isHindi ? 'उपलब्ध टाइपिंग टेस्ट' : 'Available Typing Tests'} <span className="font-normal text-slate-500 dark:text-slate-400">({filteredTests.length})</span></>}
            bodyClass=""
          >
            {/* Toolbar */}
            <div data-tour="tt-passages" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-[#f8f9fb] dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-[13px]" suppressHydrationWarning>
                <span className="text-slate-600 dark:text-slate-400 font-medium">{isHindi ? 'भाषा:' : 'Language:'}</span>
                <div className="inline-flex border border-slate-300 dark:border-slate-600 rounded overflow-hidden">
                  {([
                    { id: 'en', label: `English (${englishCount})` },
                    { id: 'hi', label: `हिंदी (${hindiCount})` },
                  ] as const).map((l, i) => (
                    <button
                      key={l.id}
                      suppressHydrationWarning
                      type="button"
                      onClick={() => setSelectedLanguage(l.id)}
                      className={`px-3 py-1.5 text-xs font-semibold cursor-pointer ${i > 0 ? 'border-l border-slate-300 dark:border-slate-600' : ''} ${
                        selectedLanguage === l.id
                          ? 'bg-[#1e4e79] text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative w-full sm:w-64" suppressHydrationWarning>
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  suppressHydrationWarning
                  type="text"
                  value={passageSearch}
                  onChange={e => setPassageSearch(e.target.value)}
                  placeholder={isHindi ? 'गद्यांश का नाम खोजें' : 'Search by passage name'}
                  className="w-full h-8 pl-8 pr-7 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-[13px] text-slate-800 dark:text-slate-200 outline-none focus:border-[#1e4e79] focus:ring-1 focus:ring-[#1e4e79]"
                />
                {passageSearch && (
                  <button
                    suppressHydrationWarning
                    type="button"
                    onClick={() => setPassageSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {isLoading && tests.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-slate-500">{isHindi ? 'लोड हो रहा है…' : 'Loading tests…'}</div>
            ) : !currentCategory && categories.length > 0 ? (
              // Category set Inactive (or removed) by an admin
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{isHindi ? 'यह टाइपिंग परीक्षा अभी उपलब्ध नहीं है' : 'This typing exam is not available right now'}</p>
                <Link href="/typing-test" className="inline-block mt-3 text-xs font-semibold text-[#1e4e79] dark:text-blue-300 hover:underline">{isHindi ? 'सभी टाइपिंग परीक्षाएं देखें' : 'See all typing exams'}</Link>
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{isHindi ? 'कोई गद्यांश नहीं मिला' : 'No passages found'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{isHindi ? 'कृपया दूसरा शब्द खोजें या भाषा बदलें।' : 'Try another language or clear the search.'}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] border-collapse">
                    <thead>
                      <tr className="bg-[#eef1f5] dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-left">
                        <th className="px-3 sm:px-4 py-2.5 font-semibold w-12 sm:w-16 border-b border-slate-300 dark:border-slate-600">{isHindi ? 'क्र.' : 'S.No.'}</th>
                        <th className="px-4 py-2.5 font-semibold border-b border-slate-300 dark:border-slate-600">{isHindi ? 'गद्यांश' : 'Passage'}</th>
                        <th className="px-4 py-2.5 font-semibold w-24 border-b border-slate-300 dark:border-slate-600 hidden sm:table-cell">{isHindi ? 'अवधि' : 'Duration'}</th>
                        <th className="px-4 py-2.5 font-semibold w-48 border-b border-slate-300 dark:border-slate-600 hidden md:table-cell">{isHindi ? 'स्थिति' : 'Status'}</th>
                        <th className="px-3 sm:px-4 py-2.5 font-semibold text-right sm:w-48 border-b border-slate-300 dark:border-slate-600">{isHindi ? 'कार्रवाई' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTests.map((test, index) => {
                        const stats = attemptsByTest.get(test.id);
                        const hasLocalAttempt = typeof window !== 'undefined' && !!localStorage.getItem(`typing_attempt_${test.id}`);
                        const hasAttempted = !!stats || hasLocalAttempt;
                        const displayName = cleanDisplayTitle(isHindi && test.titleHi ? test.titleHi : test.title);
                        const status = stats ? (
                          <span>
                            <span className={stats.qualified ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-red-700 dark:text-red-400 font-semibold'}>
                              {stats.qualified ? (isHindi ? 'क्वालिफाइड' : 'Qualified') : (isHindi ? 'क्वालिफाइड नहीं' : 'Not qualified')}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400"> · {isHindi ? 'सर्वश्रेष्ठ' : 'Best'} {Math.round(stats.best * 10) / 10} WPM</span>
                          </span>
                        ) : hasAttempted ? (
                          <span className="text-slate-700 dark:text-slate-300">{isHindi ? 'प्रयास किया' : 'Attempted'}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">{isHindi ? 'प्रयास नहीं किया' : 'Not attempted'}</span>
                        );

                        return (
                          <tr key={test.id} className="border-b border-slate-200 dark:border-slate-700 even:bg-[#fafbfc] dark:even:bg-slate-900/40 hover:bg-[#f1f6fb] dark:hover:bg-slate-800/60">
                            <td className="px-3 sm:px-4 py-3 text-slate-500 dark:text-slate-400 tabular-nums align-top">
                              {(safeCurrentPage - 1) * TESTS_PER_PAGE + index + 1}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="font-semibold text-slate-900 dark:text-white">{displayName}</div>
                              <div className="md:hidden text-xs mt-0.5">
                                <span className="sm:hidden text-slate-500 dark:text-slate-400">{test.mainDurationMinutes} {isHindi ? 'मिनट' : 'min'} · </span>
                                {status}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 hidden sm:table-cell align-top">
                              {test.mainDurationMinutes} {isHindi ? 'मिनट' : 'min'}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell align-top text-xs">{status}</td>
                            <td data-tour="tt-start" className="px-3 sm:px-4 py-3 text-right align-top whitespace-nowrap">
                              {hasAttempted ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <Link
                                    href={`/typing-test/${test.id}?view=analysis`}
                                    prefetch={true}
                                    className="inline-flex items-center h-7 px-2.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-[#1e4e79] dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                  >
                                    {isHindi ? 'परिणाम' : 'View Result'}
                                  </Link>
                                  <Link
                                    href={`/typing-test/${test.id}`}
                                    prefetch={true}
                                    className="inline-flex items-center h-7 px-2.5 rounded bg-[#1e4e79] hover:bg-[#163c5e] text-white text-xs font-semibold"
                                  >
                                    {isHindi ? 'पुनः दें' : 'Retake'}
                                  </Link>
                                </div>
                              ) : (
                                <Link
                                  href={`/typing-test/${test.id}`}
                                  prefetch={true}
                                  className="inline-flex items-center h-7 px-3 rounded bg-[#1e7e34] hover:bg-[#186429] text-white text-xs font-semibold"
                                >
                                  {isHindi ? 'टेस्ट शुरू करें' : 'Start Test'}
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#f8f9fb] dark:bg-slate-900/60">
                    <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      {isHindi
                        ? `${filteredTests.length} में से ${(safeCurrentPage - 1) * TESTS_PER_PAGE + 1} – ${Math.min(safeCurrentPage * TESTS_PER_PAGE, filteredTests.length)} प्रदर्शित`
                        : `Showing ${(safeCurrentPage - 1) * TESTS_PER_PAGE + 1} to ${Math.min(safeCurrentPage * TESTS_PER_PAGE, filteredTests.length)} of ${filteredTests.length} entries`}
                    </p>
                    <div className="inline-flex border border-slate-300 dark:border-slate-600 rounded overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => goToPage(safeCurrentPage - 1)}
                        disabled={safeCurrentPage <= 1}
                        className="px-3 h-8 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:text-slate-400 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isHindi ? 'पिछला' : 'Previous'}
                      </button>
                      {pageNumbers.map((p, i) =>
                        p === 'gap' ? (
                          <span key={`gap-${i}`} className="px-2.5 h-8 flex items-center border-l border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-400">…</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => goToPage(p)}
                            aria-current={p === safeCurrentPage ? 'page' : undefined}
                            className={`min-w-9 px-2.5 h-8 border-l border-slate-300 dark:border-slate-600 tabular-nums cursor-pointer ${
                              p === safeCurrentPage
                                ? 'bg-[#1e4e79] text-white font-semibold'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => goToPage(safeCurrentPage + 1)}
                        disabled={safeCurrentPage >= totalPages}
                        className="px-3 h-8 border-l border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:text-slate-400 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isHindi ? 'अगला' : 'Next'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Panel>
        </div>
      </main>

      <SiteFooter />
      <TypingExamTour ready={!isLoading} />
    </div>
  );
}
