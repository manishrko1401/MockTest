"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { 
  Gift, 
  Coins, 
  Share2, 
  Copy, 
  CheckCircle2, 
  ArrowLeft, 
  User, 
  Calendar, 
  AlertCircle, 
  Sparkles,
  Award,
  ChevronRight
} from 'lucide-react';
import { TRANSLATIONS } from '../translations';

interface HomeReferralsSectionProps {
  onBack: () => void;
}

export default function HomeReferralsSection({ onBack }: HomeReferralsSectionProps) {
  const { currentUser, language } = useAuth();
  const t = TRANSLATIONS[language];
  const isHindi = language === 'hi';

  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.referralCode) {
      setLoading(true);
      fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-referred-friends',
          data: { referralCode: currentUser.referralCode }
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.referredFriends)) {
          setReferredUsers(data.referredFriends);
        }
      })
      .catch(err => console.error("Error fetching referred friends:", err))
      .finally(() => setLoading(false));
    }
  }, [currentUser?.referralCode]);

  const handleCopyCode = () => {
    if (!currentUser?.referralCode) return;
    navigator.clipboard.writeText(currentUser.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!currentUser?.referralCode) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mocktesthub.com';
    const link = `${origin}/auth?ref=${currentUser.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!currentUser) {
    return (
      <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden p-6 items-center justify-center text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <Gift className="h-7 w-7" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
            {isHindi ? 'लॉगिन आवश्यक है' : 'Authentication Required'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isHindi
              ? 'रेफर और कमाएं कार्यक्रम देखने एवं अपने कॉइन्स ट्रैक करने के लिए कृपया लॉगिन करें।'
              : 'Please log in to your account to access your referral code and track reward coins.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {isHindi ? 'वापस जाएं' : 'Go Back'}
          </button>
          <Link
            href="/auth"
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20"
          >
            {isHindi ? 'लॉगिन करें' : 'Log In'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-200">
      
      {/* TOP HEADER WITH BACK BUTTON */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer shrink-0"
            title={isHindi ? 'मुख्य पृष्ठ पर वापस जाएं' : 'Back to Home'}
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-black text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight truncate flex items-center gap-2">
              <Gift className="h-4.5 w-4.5 text-amber-500" />
              <span>{isHindi ? 'रेफर और कमाएं' : 'Refer & Earn Rewards'}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {isHindi ? 'दोस्तों को आमंत्रित करें और मुफ्त टेस्ट सीरीज़ अनलॉक करने के लिए कॉइन्स पाएं' : 'Invite your friends and earn reward coins to unlock test series'}
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
        >
          {isHindi ? 'होम पर वापस' : 'Back to Home'}
        </button>
      </div>

      {/* SCROLLABLE BODY CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* BANNER WITH COIN BALANCE */}
        <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 z-10">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold text-[9.5px] uppercase tracking-wider inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              {isHindi ? 'रेफरल बोनस' : 'Candidate Referral Program'}
            </span>
            <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
              {t.referralsPageTitle}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed font-medium">
              {t.referralsPageDesc}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
            <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{t.coinsBalance}</p>
              <p className="text-base font-black text-amber-500">{currentUser.coins || 0} {t.coinsCount}</p>
            </div>
          </div>
        </div>

        {/* SHARE CODE & LINK BOX */}
        <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl sm:rounded-3xl text-center space-y-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {t.referralCode}
          </p>

          <div className="max-w-md mx-auto flex flex-col sm:flex-row items-center justify-center gap-2.5">
            {/* Referral Code Box */}
            <div className="w-full sm:flex-1 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-sm sm:text-base text-slate-900 dark:text-white shadow-inner">
              <span className="font-extrabold select-all tracking-wider">{currentUser.referralCode}</span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-extrabold hover:underline cursor-pointer select-none"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 animate-in zoom-in-50" />
                    <span className="text-emerald-600">{isHindi ? "कॉपी हुआ" : "Copied"}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>{isHindi ? "कोड कॉपी" : "Copy Code"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Share Referral Link Button */}
            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>{isHindi ? 'लिंक कॉपी हुआ!' : 'Link Copied!'}</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span>{isHindi ? 'रेफरल लिंक कॉपी करें' : 'Copy Invite Link'}</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
            {t.referralShareDesc}
          </p>
        </div>

        {/* HOW IT WORKS / RULES */}
        <div className="space-y-3">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-blue-600" />
            <span>{t.referralRulesHeader}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-1.5">
              <div className="h-8 w-8 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-black text-xs">
                1
              </div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t.referralRule1Title}</h4>
              <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">{t.referralRule1Desc}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-1.5">
              <div className="h-8 w-8 bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center font-black text-xs">
                2
              </div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t.referralRule2Title}</h4>
              <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">{t.referralRule2Desc}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-1.5">
              <div className="h-8 w-8 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center font-black text-xs">
                3
              </div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t.referralRule3Title}</h4>
              <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">{t.referralRule3Desc}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-1.5">
              <div className="h-8 w-8 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center font-black text-xs">
                4
              </div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t.referralRule4Title}</h4>
              <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">{t.referralRule4Desc}</p>
            </div>
          </div>
        </div>

        {/* INVITED FRIENDS TRACKER */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.myReferredFriends}
            </h3>
            <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900 font-mono">
              {referredUsers.length} {isHindi ? 'उम्मीदवार' : 'Aspirants'}
            </span>
          </div>

          {referredUsers.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center text-slate-500 dark:text-slate-400">
              <Gift className="h-9 w-9 text-slate-400 dark:text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold">{t.noReferredFriends}</p>
              <p className="text-[10px] text-slate-400 mt-1">Share your code with study buddies to start earning!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {referredUsers.map((user) => (
                <div 
                  key={user.id}
                  className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div className="truncate min-w-0">
                      <p className="font-extrabold text-xs text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3")}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/40">
                      <Coins className="h-3 w-3" />
                      <span>+100 Coins</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
