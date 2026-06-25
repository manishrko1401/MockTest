"use client";

import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ShieldAlert, Award, ArrowLeft, Search, GraduationCap, ChevronRight, Check, Sun, Moon } from 'lucide-react';

interface MockTestItem {
  id: string;
  title: string;
  questionsCount: number;
  durationMinutes: number;
  maxMarks: number;
  isPremium: boolean;
  requiredTier: 'None' | 'Testbook Pass' | 'Testbook Pass Pro';
}

interface TestCategory {
  id: string;
  name: string;
  tests: MockTestItem[];
}

const EXAM_CATALOG: TestCategory[] = [
  {
    id: 'ssc',
    name: 'SSC Exams',
    tests: [
      { id: 'ssc_cgl_tier1', title: 'SSC CGL 2026 - Combined Graduate Level (Tier-I) Exam', questionsCount: 100, durationMinutes: 60, maxMarks: 200, isPremium: false, requiredTier: 'None' },
      { id: 'ssc_chsl_tier1', title: 'SSC CHSL 2026 - Combined Higher Secondary Level Test', questionsCount: 100, durationMinutes: 60, maxMarks: 200, isPremium: true, requiredTier: 'Testbook Pass' },
      { id: 'ssc_mts_mock', title: 'SSC MTS Full-Length Practice Test Paper', questionsCount: 90, durationMinutes: 90, maxMarks: 270, isPremium: true, requiredTier: 'Testbook Pass' }
    ]
  },
  {
    id: 'railways',
    name: 'Railways Exams',
    tests: [
      { id: 'rrb_ntpc_stage1', title: 'RRB NTPC CBT-1 Stage 1 Practice Simulator', questionsCount: 100, durationMinutes: 90, maxMarks: 100, isPremium: false, requiredTier: 'None' },
      { id: 'rrb_group_d', title: 'RRB Group D Full Length Mock Test', questionsCount: 100, durationMinutes: 90, maxMarks: 100, isPremium: true, requiredTier: 'Testbook Pass' }
    ]
  },
  {
    id: 'ugc_net',
    name: 'UGC NET Exams',
    tests: [
      { id: 'ugc_net_paper1', title: 'UGC NET Paper-1 Teaching & Research Aptitude', questionsCount: 50, durationMinutes: 60, maxMarks: 100, isPremium: true, requiredTier: 'Testbook Pass Pro' },
      { id: 'ugc_net_cs', title: 'UGC NET Computer Science & Applications Paper-II', questionsCount: 100, durationMinutes: 120, maxMarks: 200, isPremium: true, requiredTier: 'Testbook Pass Pro' }
    ]
  },
  {
    id: 'teaching',
    name: 'Teaching Exams',
    tests: [
      { id: 'ctet_paper1', title: 'CTET 2026 Paper-I (Primary Class I-V) Mock Paper', questionsCount: 150, durationMinutes: 150, maxMarks: 150, isPremium: false, requiredTier: 'None' },
      { id: 'ctet_paper2', title: 'CTET 2026 Paper-II (Mathematics & Science)', questionsCount: 150, durationMinutes: 150, maxMarks: 150, isPremium: true, requiredTier: 'Testbook Pass' }
    ]
  },
  {
    id: 'state_exams',
    name: 'All State Exams',
    tests: [
      { id: 'up_psc_prelims', title: 'UPPSC Prelims General Studies (GS Paper 1)', questionsCount: 150, durationMinutes: 120, maxMarks: 200, isPremium: true, requiredTier: 'Testbook Pass Pro' },
      { id: 'bihar_ssc', title: 'BSSC Inter-Level Full Practice Mock Paper', questionsCount: 150, durationMinutes: 135, maxMarks: 600, isPremium: true, requiredTier: 'Testbook Pass' }
    ]
  },
  {
    id: 'banking',
    name: 'Banking Exams',
    tests: [
      { id: 'sbi_po_prelims', title: 'SBI PO Preliminary Exam Full Length Mock Test', questionsCount: 100, durationMinutes: 60, maxMarks: 100, isPremium: true, requiredTier: 'Testbook Pass Pro' },
      { id: 'ibps_clerk', title: 'IBPS Clerk Preliminary Practice Mock Paper', questionsCount: 100, durationMinutes: 60, maxMarks: 100, isPremium: false, requiredTier: 'None' }
    ]
  }
];

export default function MockTestsCatalog() {
  const { currentUser, saveUserProfileByAdmin, theme, toggleTheme } = useAuth();
  const router = useRouter();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('ssc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [upgradePopupOpen, setUpgradePopupOpen] = useState(false);
  const [requiredTierInfo, setRequiredTierInfo] = useState<string>('');

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
    alert(`Success! You have unlocked ${newTier}. You can now start the mock test.`);
  };

  const isCompleted = (testId: string) => {
    return currentUser?.testSessions?.some(s => s.testId === testId);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 font-sans min-h-screen text-slate-800 dark:text-slate-100 select-none transition-colors duration-200">
      
      {/* Navbar header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-slate-700 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-bold text-sm tracking-wide transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="flex items-center gap-4 max-w-sm w-full justify-end">
          {/* Search filter */}
          <div className="relative max-w-xs w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mock exams..."
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Theme switcher */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-850"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
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
            <h3 className="font-extrabold text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-4 font-sans">Exam Categories</h3>
            
            <nav className="space-y-1">
              {EXAM_CATALOG.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    selectedCategory === category.id
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
            <p className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Unlock All Tests</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 leading-normal mt-1 mb-3">Upgrade to Pass Pro for unrestricted CBT practice.</p>
            <button
              onClick={() => { setRequiredTierInfo('Testbook Pass Pro'); setUpgradePopupOpen(true); }}
              className="w-full bg-yellow-600 hover:bg-yellow-750 text-white py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Get Pass Pro
            </button>
          </div>
        </aside>

        {/* Right Side Content (Tests display) */}
        <main className="flex-1 p-8 overflow-y-auto">
          
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              {currentCategoryObj?.name} Test Series
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Simulate real examination CBT patterns. Select any card below to begin sitting.</p>
          </div>

          {/* Test cards list grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentCategoryObj?.tests
              .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(test => {
                const hasPass = currentUser && (
                  (test.requiredTier === 'None') ||
                  (test.requiredTier === 'Testbook Pass' && (currentUser.subscriptionTier === 'Testbook Pass' || currentUser.subscriptionTier === 'Testbook Pass Pro')) ||
                  (test.requiredTier === 'Testbook Pass Pro' && currentUser.subscriptionTier === 'Testbook Pass Pro')
                );

                const completed = isCompleted(test.id);

                return (
                  <div
                    key={test.id}
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-350 dark:hover:border-slate-700 transition flex flex-col justify-between shadow-sm"
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
                          {test.requiredTier === 'None' ? 'FREE TEST' : test.requiredTier}
                        </span>
                        
                        {hasPass && !completed && (
                          <span className="flex items-center gap-1 text-[9px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border border-green-300 dark:border-green-800 px-1.5 py-0.5 rounded font-bold">
                            <Check className="h-3 w-3" /> UNLOCKED
                          </span>
                        )}
                        {completed && (
                          <span className="flex items-center gap-1 text-[9px] bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-400 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded font-black">
                            <Check className="h-3 w-3" /> ATTEMPTED
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-snug mb-3 hover:text-blue-650 dark:hover:text-blue-400 transition cursor-pointer">
                        {test.title}
                      </h4>

                      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-900 pt-3 mb-5 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                        <div>
                          <p className="text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider text-[8px]">Questions</p>
                          <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{test.questionsCount} Qs</p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider text-[8px]">Duration</p>
                          <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{test.durationMinutes} Mins</p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider text-[8px]">Total Marks</p>
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
                          : hasPass
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20'
                          : 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-yellow-900/20'
                      }`}
                    >
                      {completed ? 'View Solution & Analysis' : hasPass ? 'Start Test' : 'Unlock with Pass'}
                    </button>
                  </div>
                );
              })}
          </div>

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
            
            <p className="text-slate-600 dark:text-slate-350 text-xs leading-relaxed mb-6 font-semibold">
              This is a premium assessment test. To start sitting, you need to upgrade your subscription pass to <strong className="text-yellow-600 dark:text-yellow-400">{requiredTierInfo}</strong> or higher.
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
