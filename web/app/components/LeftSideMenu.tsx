"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { TRANSLATIONS } from '../translations';
import {
  Trophy,
  BookOpen,
  Zap,
  Bell,
  Lock,
  User,
  Crown,
  Gift,
  Share2,
  Shield,
  HelpCircle,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  X,
  Award,
  TrendingUp,
  Coins,
  GraduationCap,
  Sparkles,
  FileText,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  Keyboard,
  BookmarkCheck
} from 'lucide-react';

interface LeftSideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPassClaim?: () => void;
}

export default function LeftSideMenu({ isOpen, onClose, onOpenPassClaim }: LeftSideMenuProps) {
  const { currentUser, logout, theme, toggleTheme, language, setLanguage, noticesList } = useAuth();
  const t = TRANSLATIONS[language];

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isHindi = language === 'hi';
  const activeNoticeCount = (noticesList || []).filter(n => n.category !== 'testimonial').length;
  const isPassPro = currentUser?.subscriptionTier === 'Testbook Pass Pro' || currentUser?.subscriptionTier === 'Testbook Pass';

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <aside
        className="relative w-full max-w-[340px] sm:max-w-[380px] bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-300 ease-out overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
      >
        {/* TOP HEADER / BRANDING */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/40">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 group"
          >
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform flex items-center justify-center h-10 w-10">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight tracking-wider">
                {t.logoTitle}
              </h2>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-0.5">
                {t.logoSub}
              </p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* SCROLLABLE MENU CONTENT */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-5 custom-scrollbar">
          
          {/* USER PROFILE OR LOGIN CARD */}
          {currentUser ? (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/60 dark:to-slate-800/20 border border-blue-100 dark:border-slate-700/60 rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </div>
                  {isPassPro && (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 p-0.5 rounded-full ring-2 ring-white dark:ring-slate-900" title="Pass Pro Active">
                      <Crown className="h-3 w-3" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {currentUser.name}
                    </h3>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    {currentUser.candidateCode?.replace('CGL', 'HUB-ID')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isPassPro
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {isPassPro ? (isHindi ? '👑 पास प्रो सक्रिय' : '👑 Pass Pro Active') : (isHindi ? 'मुफ़्त योजना' : 'Free Member')}
                    </span>
                    {currentUser.coins > 0 && (
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                        <Coins className="h-3 w-3" /> {currentUser.coins}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold text-center flex items-center justify-center gap-1 shadow-xs transition active:scale-95"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>{isHindi ? 'डैशबोर्ड' : 'Dashboard'}</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="py-1.5 px-2.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-bold text-center flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t.signOut}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-4 text-left relative overflow-hidden">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-blue-600/15 dark:bg-blue-600/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    {isHindi ? 'अभ्यर्थी स्वागतम्! 👋' : 'Welcome Aspirant! 👋'}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHindi ? 'मॉक टेस्ट, स्कोर और रैंक ट्रैक करें' : 'Login to save rank & test analytics'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <Link
                  href="/auth"
                  onClick={onClose}
                  className="py-2 px-3 rounded-xl border border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-extrabold text-center transition active:scale-95"
                >
                  {t.logIn}
                </Link>
                <Link
                  href="/auth"
                  onClick={onClose}
                  className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold text-center shadow-md shadow-blue-500/20 transition active:scale-95"
                >
                  {t.signUp}
                </Link>
              </div>
            </div>
          )}



          {/* MAIN NAVIGATION SHORTCUTS */}
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1">
              {isHindi ? 'मुख्य शॉर्टकट' : 'Quick Navigation'}
            </p>

            {/* 1. TEST SERIES */}
            <Link
              href="/mock-tests"
              onClick={onClose}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/70 border border-transparent hover:border-blue-200 dark:hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                  <Award className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {t.navTestSeries}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isHindi ? 'एसएससी, रेलवे, बैंकिंग, टीईटी' : 'SSC, Railway, Banking, Teaching'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>


            {/* 2.5 TYPING SPEED TEST SIMULATOR */}
            <Link
              href="/typing-test"
              onClick={onClose}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/70 border border-transparent hover:border-blue-200 dark:hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Keyboard className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {isHindi ? 'टाइपिंग टेस्ट व टर्मिनल' : 'Typing Test & Terminal'}
                    </h4>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                      DEST
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isHindi ? 'एसएससी, रेलवे व कोर्ट टाइपिंग' : 'SSC, RRB & Court DEST Exam'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>

            {/* 3. NOTICES & ANNOUNCEMENTS */}
            <Link
              href="/updates"
              onClick={onClose}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/70 border border-transparent hover:border-blue-200 dark:hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <Bell className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {t.navUpdates}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isHindi ? 'एडमिट कार्ड, परिणाम और सूचनाएं' : 'Admit Cards, Results & Jobs'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>

            {/* 4. DOCUMENT LOCKER */}
            <Link
              href="/locker"
              onClick={onClose}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/70 border border-transparent hover:border-blue-200 dark:hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {isHindi ? 'दस्तावेज़ लॉकर' : 'Document Locker'}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isHindi ? 'प्रमाणपत्र व एडमिट कार्ड वॉल्ट' : 'Secure Certificate Vault'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>

            {/* 4.5 APPLIED & SAVED EXAMS */}
            <Link
              href="/profile/tracked-jobs"
              onClick={onClose}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/70 border border-transparent hover:border-blue-200 dark:hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <BookmarkCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {isHindi ? 'आवेदन व सेव परीक्षाएं' : 'Applied & Saved Exams'}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isHindi ? 'ट्रैक किए गए फॉर्म व परीक्षाएं' : 'Tracked & Saved Exams'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>

            {/* 5. PROFILE & DASHBOARD */}
            <Link
              href="/profile"
              onClick={onClose}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/70 border border-transparent hover:border-blue-200 dark:hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {isHindi ? 'प्रोफाइल एवं विश्लेषिकी' : 'Profile & Analytics'}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isHindi ? 'गति, स्कोर एवं परीक्षण इतिहास' : 'Speed Graphs & Test History'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* 6. REFER & EARN */}
            <Link
              href="/referrals"
              onClick={onClose}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/70 border border-transparent hover:border-blue-200 dark:hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform">
                  <Share2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {isHindi ? 'रेफर करें और कमाएं' : 'Refer & Earn'}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isHindi ? 'मित्रों को आमंत्रित कर सिक्के प्राप्त करें' : 'Invite friends & get rewards'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>

            {/* 7. ADMIN PANEL (IF ADMIN/STAFF) */}
            {currentUser && ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role) && (
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                    <Shield className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {t.navAdmin}
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {isHindi ? 'प्रबंधन एवं प्रश्न निर्माण' : 'Management & Test Creator'}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 uppercase">
                  Staff
                </span>
              </Link>
            )}
          </div>

          {/* EXAM CATEGORIES SHORTCUT CHIPS */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2">
              {isHindi ? 'लोकप्रिय परीक्षाएं' : 'Popular Exam Categories'}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/mock-tests?cat=ssc"
                onClick={onClose}
                className="p-2 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/30 hover:border-orange-400 text-left transition active:scale-95 group"
              >
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 block truncate">
                  🏆 SSC Exams
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">CGL, CHSL, MTS</span>
              </Link>

              <Link
                href="/mock-tests?cat=railways"
                onClick={onClose}
                className="p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/30 hover:border-indigo-400 text-left transition active:scale-95 group"
              >
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 block truncate">
                  🚆 Railways
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">RRB NTPC, Group D</span>
              </Link>

              <Link
                href="/mock-tests?cat=banking"
                onClick={onClose}
                className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 hover:border-emerald-400 text-left transition active:scale-95 group"
              >
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 block truncate">
                  🏦 Banking
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">SBI PO, Clerk, IBPS</span>
              </Link>

              <Link
                href="/mock-tests?cat=teaching"
                onClick={onClose}
                className="p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 hover:border-amber-400 text-left transition active:scale-95 group"
              >
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 block truncate">
                  📖 Teaching
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">CTET, State TET</span>
              </Link>

              <Link
                href="/mock-tests?cat=ugc_net"
                onClick={onClose}
                className="p-2 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/30 hover:border-sky-400 text-left transition active:scale-95 group"
              >
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 block truncate">
                  🎓 UGC NET
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">Paper 1 & Paper 2</span>
              </Link>

              <Link
                href="/mock-tests?cat=state_exams"
                onClick={onClose}
                className="p-2 rounded-xl bg-pink-50/60 dark:bg-pink-950/20 border border-pink-200/60 dark:border-pink-900/30 hover:border-pink-400 text-left transition active:scale-95 group"
              >
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-pink-600 dark:group-hover:text-pink-400 block truncate">
                  🏛️ State Exams
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">UPPSC, BSSC, RAS</span>
              </Link>
            </div>
          </div>

          {/* NOTICES SUB-SECTIONS */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2">
              {isHindi ? 'सूचनाएं व एडमिट कार्ड' : 'Alerts & Exam Letters'}
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
              <Link
                href="/updates?category=notice"
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition"
              >
                <Bell className="h-3.5 w-3.5 text-blue-500" />
                <span className="truncate">{t.liveNotices}</span>
              </Link>
              <Link
                href="/updates?category=admit_card"
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 flex items-center gap-1.5 transition"
              >
                <FileText className="h-3.5 w-3.5 text-green-500" />
                <span className="truncate">{t.admitCards}</span>
              </Link>
              <Link
                href="/updates?category=result"
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:text-yellow-600 dark:hover:text-yellow-400 flex items-center gap-1.5 transition"
              >
                <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                <span className="truncate">{t.resultsMerits}</span>
              </Link>
              <Link
                href="/contact"
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1.5 transition"
              >
                <HelpCircle className="h-3.5 w-3.5 text-purple-500" />
                <span className="truncate">{isHindi ? 'सहायता केंद्र' : 'Help & FAQ'}</span>
              </Link>
            </div>
          </div>

        </div>

        {/* BOTTOM DRAWER SETTINGS (LANGUAGE, THEME, FOOTER) */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/90 space-y-3 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {/* Language Selector */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase">Lang</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
                className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="en" className="bg-white dark:bg-slate-900">English</option>
                <option value="hi" className="bg-white dark:bg-slate-900">हिन्दी</option>
              </select>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase">Theme</span>
              <div className="flex items-center gap-1">
                {theme === 'light' ? (
                  <>
                    <Moon className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    <span>Light</span>
                  </>
                )}
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1 font-semibold">
            <Link href="/terms" onClick={onClose} className="hover:underline">Terms</Link>
            <span>•</span>
            <Link href="/privacy" onClick={onClose} className="hover:underline">Privacy</Link>
            <span>•</span>
            <Link href="/contact" onClick={onClose} className="hover:underline">Support</Link>
            <span>•</span>
            <span>v2.4 Pro</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
