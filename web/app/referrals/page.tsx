"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Gift, Coins, ChevronRight, User, Calendar, Check, AlertCircle, ArrowLeft, Sun, Moon, Copy, CheckCircle2, RefreshCw } from 'lucide-react';
import { TRANSLATIONS } from '../translations';

export default function ReferralsTrackerPage() {
  const { currentUser, usersList, theme, toggleTheme, language, setLanguage } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];

  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopyCode = () => {
    if (!currentUser) return;
    navigator.clipboard.writeText(currentUser.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-100 font-sans">
        <div className="text-center p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl max-w-sm shadow-xl">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider mb-2">Authentication Required</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">Please log in to your account to view your referral program progress.</p>
          <Link href="/auth" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs tracking-wider uppercase transition-all shadow-lg active:scale-95">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  // Get referred users from usersList
  const referredUsers = usersList.filter(
    (u) => u.referredBy && u.referredBy.trim().toLowerCase() === currentUser.referralCode.trim().toLowerCase()
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 font-sans min-h-screen text-slate-800 dark:text-slate-100 pb-16 transition-colors duration-200">
      
      {/* Header bar */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 sm:px-8 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <Link href="/profile" className="flex items-center gap-2 text-slate-700 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs sm:text-sm tracking-wide transition-colors">
          <ArrowLeft className="h-4 w-4" /> {language === 'hi' ? "प्रोफ़ाइल पर वापस जाएं" : "Back to Profile"}
        </Link>

        <div className="flex items-center gap-4">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-350 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="en" className="bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200">English</option>
            <option value="hi" className="bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200">हिन्दी</option>
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

      {/* Main container */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 mt-8 space-y-8">
        
        {/* Banner with gradients */}
        <section className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Gift className="h-6 w-6 text-amber-500" />
              {t.referralsPageTitle}
            </h2>
            <p className="text-xs text-slate-650 dark:text-slate-400 max-w-xl leading-relaxed">
              {t.referralsPageDesc}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
            <div className="h-10 w-10 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{t.coinsBalance}</p>
              <p className="text-sm font-black text-amber-500">{currentUser.coins || 0} {t.coinsCount}</p>
            </div>
          </div>
        </section>

        {/* Invite Sharing box */}
        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-center">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">{t.referralCode}</p>
          
          <div className="max-w-xs mx-auto flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200/80 dark:border-slate-800 font-mono text-sm sm:text-base text-slate-800 dark:text-white shadow-inner">
            <span className="font-extrabold select-all tracking-wider">{currentUser.referralCode}</span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-extrabold hover:underline cursor-pointer select-none"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-505 animate-in zoom-in-50" />
                  <span className="text-green-500">{language === 'hi' ? "कॉपी किया" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>{language === 'hi' ? "कॉपी" : "Copy"}</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3">
            {t.referralShareDesc}
          </p>
        </section>

        {/* How it Works / Rules layout */}
        <section className="space-y-4">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2.5">
            {t.referralRulesHeader}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Step 1 */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden group hover:border-amber-500/20 transition-all duration-200">
              <div className="h-9 w-9 bg-blue-100/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-black text-sm">
                1
              </div>
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{t.referralRule1Title}</h4>
              <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{t.referralRule1Desc}</p>
            </div>

            {/* Step 2 */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden group hover:border-amber-500/20 transition-all duration-200">
              <div className="h-9 w-9 bg-purple-100/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center font-black text-sm">
                2
              </div>
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{t.referralRule2Title}</h4>
              <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{t.referralRule2Desc}</p>
            </div>

            {/* Step 3 */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden group hover:border-amber-500/20 transition-all duration-200">
              <div className="h-9 w-9 bg-amber-100/50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center font-black text-sm">
                3
              </div>
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{t.referralRule3Title}</h4>
              <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{t.referralRule3Desc}</p>
            </div>

            {/* Step 4 */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden group hover:border-amber-500/20 transition-all duration-200">
              <div className="h-9 w-9 bg-green-100/50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center font-black text-sm">
                4
              </div>
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{t.referralRule4Title}</h4>
              <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{t.referralRule4Desc}</p>
            </div>

          </div>
        </section>

        {/* Invited friends Tracker list */}
        <section className="space-y-4">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2.5 flex items-center justify-between">
            <span>{t.myReferredFriends}</span>
            <span className="bg-blue-100 dark:bg-blue-955/40 text-blue-700 dark:text-blue-400 font-extrabold text-[10px] px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900 font-mono">
              {referredUsers.length}
            </span>
          </h3>

          {referredUsers.length === 0 ? (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-12 rounded-2xl text-center text-slate-500 shadow-sm">
              <Gift className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-xs font-bold">{t.noReferredFriends}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {referredUsers.map((user) => {
                const hasCompletedTest = user.testSessions && user.testSessions.length > 0;
                
                return (
                  <div 
                    key={user.id}
                    className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 hover:shadow transition-shadow"
                  >
                    {/* User profile info */}
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{user.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-500">{user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          Joined: {user.registeredDate}
                        </p>
                      </div>
                    </div>

                    {/* Progress tracking block */}
                    <div className="flex-1 max-w-md w-full space-y-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">{hasCompletedTest ? t.referralStatusCompleted : t.referralStatusPending}</span>
                        <span className={hasCompletedTest ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-500 animate-pulse"}>
                          {hasCompletedTest ? "100%" : "50%"}
                        </span>
                      </div>

                      {/* Visual Progress bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            hasCompletedTest 
                              ? "bg-gradient-to-r from-green-500 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                              : "bg-gradient-to-r from-amber-400 to-yellow-500 animate-pulse"
                          }`}
                          style={{ width: hasCompletedTest ? '100%' : '50%' }}
                        ></div>
                      </div>

                      {/* Steps indicator */}
                      <div className="flex justify-between text-[9px] font-bold text-slate-400">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <Check className="h-3 w-3 font-extrabold" />
                          <span>{t.referralStep1}</span>
                        </div>
                        <div className={`flex items-center gap-1 ${hasCompletedTest ? 'text-green-600 dark:text-green-400' : 'text-slate-405'}`}>
                          {hasCompletedTest ? (
                            <Check className="h-3 w-3 font-extrabold" />
                          ) : (
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                          )}
                          <span>{t.referralStep2}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
