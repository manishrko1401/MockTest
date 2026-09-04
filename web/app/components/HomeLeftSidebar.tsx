"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { TRANSLATIONS } from '../translations';
import {
  Trophy,
  BookOpen,
  Award,
  TrendingUp,
  Coins,
  GraduationCap,
  Sparkles,
  Bell,
  Lock,
  User,
  Crown,
  Gift,
  Share2,
  Shield,
  HelpCircle,
  ChevronRight,
  Zap,
  UserCheck,
  MapPin,
  FileText,
  Send,
  ExternalLink,
  Lightbulb,
  MessageSquare,
  Keyboard,
  BookmarkCheck
} from 'lucide-react';

interface HomeLeftSidebarProps {
  onOpenPassClaim?: () => void;
  activeView?: 'home' | 'chat' | 'suggestion' | 'contact' | 'terms' | 'privacy' | 'referrals';
  onSelectView?: (view: 'home' | 'chat' | 'suggestion' | 'contact' | 'terms' | 'privacy' | 'referrals') => void;
}

export default function HomeLeftSidebar({
  onOpenPassClaim,
  activeView = 'home',
  onSelectView
}: HomeLeftSidebarProps) {
  const { currentUser, language, noticesList } = useAuth();
  const t = TRANSLATIONS[language];
  const isHindi = language === 'hi';
  const isPassPro = currentUser?.subscriptionTier === 'Testbook Pass Pro' || currentUser?.subscriptionTier === 'Testbook Pass';

  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Poll for unread support messages
  useEffect(() => {
    if (!currentUser?.id) {
      setUnreadChatCount(0);
      return;
    }

    if (activeView === 'chat') {
      // The chat view itself marks messages read and shows the full thread —
      // no need for this badge poller to run while it's open.
      setUnreadChatCount(0);
      return;
    }

    // EGRESS-OPT: Ask for just the unread count instead of the full message
    // history — this poller only drives a badge, it never needs message bodies.
    const checkUnread = async () => {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-unread-support-count',
            data: { userId: currentUser.id }
          })
        });
        const data = await res.json();
        if (data.success && typeof data.count === 'number') {
          setUnreadChatCount(data.count);
        }
      } catch (err) {
        console.error('Error fetching unread support chat count:', err);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id, activeView]);

  // Primary Core Shortcuts List (Telegram placed directly below Chat with Team)
  const primaryShortcuts = [
    {
      id: 'test_series',
      title: t.navTestSeries,
      subtitle: isHindi ? '1,500+ सीबीटी मॉक टेस्ट्स' : '1,500+ CBT Mock Tests',
      href: '/mock-tests',
      icon: Award,
      iconColor: 'text-orange-500',
    },
    {
      id: 'typing_test',
      title: isHindi ? 'टाइपिंग टेस्ट' : 'Typing Test',
      subtitle: isHindi ? 'सरकारी परीक्षा स्पीड टेस्ट' : 'Govt Exam DEST Simulator',
      href: '/typing-test',
      icon: Keyboard,
      iconColor: 'text-blue-500',
    },
    {
      id: 'notices',
      title: t.navUpdates,
      subtitle: isHindi ? 'एडमिट कार्ड, परिणाम व सूचनाएं' : 'Admit Cards, Results & Jobs',
      href: '/updates',
      icon: Bell,
      iconColor: 'text-indigo-500',
    },
    {
      id: 'locker',
      title: isHindi ? 'दस्तावेज़ लॉकर' : 'Document Locker',
      subtitle: isHindi ? 'सुरक्षित प्रमाणपत्र वॉल्ट' : 'Secure Certificate Vault',
      href: '/locker',
      icon: Lock,
      iconColor: 'text-emerald-500',
    },
    {
      id: 'applied_saved',
      title: isHindi ? 'आवेदन व सेव परीक्षाएं' : 'Applied & Saved Exams',
      subtitle: isHindi ? 'ट्रैक की गई परीक्षाएं' : 'Tracked & Saved Exams',
      href: '/profile/tracked-jobs',
      icon: BookmarkCheck,
      iconColor: 'text-purple-500',
    },
    {
      id: 'profile',
      title: isHindi ? 'प्रोफाइल एवं विश्लेषिकी' : 'Profile & Dashboard',
      subtitle: currentUser ? currentUser.name : (isHindi ? 'लॉग इन / साइन अप' : 'Login / Register'),
      href: currentUser ? '/profile' : '/auth',
      icon: User,
      iconColor: 'text-purple-500',
    },
    {
      id: 'chat',
      title: isHindi ? 'मॉक टेस्ट टीम से चैट करें' : 'Chat with Team',
      subtitle: '',
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        if (onSelectView) onSelectView('chat');
      },
      icon: MessageSquare,
      iconColor: 'text-blue-500',
    },
    {
      id: 'telegram',
      title: isHindi ? 'टेलीग्राम पर संदेश भेजें' : 'Message on Telegram',
      subtitle: isHindi ? '24x7 त्वरित सहायता' : '24x7 Direct Support',
      href: 'https://t.me/MockTest_Hub',
      isExternal: true,
      icon: Send,
      iconColor: 'text-[#229ED9]',
    },
    {
      id: 'referrals',
      title: isHindi ? 'रेफर और कमाएं' : 'Refer & Earn',
      subtitle: isHindi ? 'सिक्के व पुरस्कार' : 'Coins & Bonus Perks',
      href: '/referrals',
      icon: Share2,
      iconColor: 'text-pink-500',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        if (onSelectView) onSelectView('referrals');
      }
    },
  ];

  // If Admin / Staff, add Admin Shortcut
  if (currentUser && ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role)) {
    primaryShortcuts.push({
      id: 'admin',
      title: t.navAdmin,
      subtitle: isHindi ? 'प्रबंधन एवं प्रश्न निर्माण' : 'Management & Creator',
      href: '/admin',
      icon: Shield,
      iconColor: 'text-red-500',
    });
  }

  const filteredShortcuts = primaryShortcuts;

  return (
    <aside className="w-full md:w-56 lg:w-64 xl:w-72 bg-slate-900 dark:bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 z-20 h-full min-h-0 overflow-hidden select-none">
      {/* Scrollable Navigation List */}
      <div className="p-2.5 space-y-4 flex-1 overflow-y-auto min-h-0 no-scrollbar">

        {/* 1. USER PROFILE / AUTH CARD */}
        {currentUser ? (
          <div className="bg-slate-800/80 dark:bg-slate-900/80 border border-slate-700 dark:border-slate-800 rounded-2xl p-3 shadow-xs text-white">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-slate-700 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 border border-slate-600/50">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-xs text-white truncate">
                  {currentUser.name}
                </h4>
                <p className="text-[9px] font-semibold text-slate-400 truncate">
                  {currentUser.candidateCode?.replace('CGL', 'HUB-ID')}
                </p>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-700/60 dark:border-slate-800 flex items-center justify-between">
              <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isPassPro
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-700/60 text-slate-300 border border-slate-600/60'
              }`}>
                {isPassPro ? (isHindi ? '👑 पास प्रो' : '👑 Pass Pro') : (isHindi ? 'मुफ़्त सदस्य' : 'Free Member')}
              </span>
              <Link
                href="/profile"
                className="text-[10px] text-slate-300 hover:text-white font-extrabold hover:underline flex items-center gap-0.5"
              >
                <span>{isHindi ? 'डैशबोर्ड' : 'Dashboard'}</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/80 dark:bg-slate-900/80 border border-slate-700 dark:border-slate-800 rounded-2xl p-3 shadow-xs text-white">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-slate-700/70 text-slate-300 flex items-center justify-center shrink-0 border border-slate-600/50">
                <User className="h-3.5 w-3.5" />
              </div>
              <div>
                <h4 className="font-extrabold text-[11px] text-white">
                  {isHindi ? 'अभ्यर्थी लॉगिन' : 'Student Account'}
                </h4>
                <p className="text-[9px] text-slate-400">
                  {isHindi ? 'रैंक एवं टेस्ट सुरक्षित करें' : 'Track tests & analytics'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              <Link
                href="/auth"
                className="py-1.5 px-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 text-[10px] font-extrabold text-center transition"
              >
                {t.logIn}
              </Link>
              <Link
                href="/auth"
                className="py-1.5 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-extrabold text-center shadow-xs transition border border-slate-600/60"
              >
                {t.signUp}
              </Link>
            </div>
          </div>
        )}

        {/* 3. PRIMARY SHORTCUTS SECTION */}
        <div>
          <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider px-2 pb-1.5">
            {isHindi ? 'प्रमुख शॉर्टकट' : 'Core Shortcuts'}
          </p>

          <div className="rounded-xl overflow-hidden bg-slate-800/60 dark:bg-slate-900/60 divide-y divide-slate-700/60 dark:divide-slate-800">
            {filteredShortcuts.map((item) => {
              const Icon = item.icon;
              const isItemActive = (item.id === 'chat' && activeView === 'chat') || (item.id === 'referrals' && activeView === 'referrals');
              const hasUnread = (item.id === 'chat' && unreadChatCount > 0);

              const content = (
                <div className={`w-full flex items-center justify-between py-2.5 px-2.5 text-left transition-colors duration-150 text-xs font-bold cursor-pointer group ${
                  isItemActive
                    ? 'bg-slate-700/80 dark:bg-slate-800 text-white border-l-2 border-l-slate-400'
                    : 'hover:bg-slate-700/40 dark:hover:bg-slate-800/50 text-slate-200'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 rounded-lg flex items-center justify-center bg-slate-700/60 dark:bg-slate-800 border border-slate-600/40 dark:border-slate-700 overflow-visible shrink-0 transition-transform duration-200 group-hover:scale-105">
                      <Icon className={`h-4 w-4 ${item.iconColor}`} />
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce shadow-xs z-10">
                          {unreadChatCount}
                        </span>
                      )}
                    </div>
                    <div className="truncate min-w-0">
                      <p className={`text-xs leading-tight truncate font-bold transition-colors ${
                        isItemActive ? 'text-white' : 'text-slate-100 group-hover:text-white'
                      }`}>
                        {item.title}
                      </p>
                      {item.subtitle ? (
                        <p className="text-[9.5px] text-slate-400 mt-0.5 truncate font-normal">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {hasUnread && (
                      <span className="bg-red-500 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-xs">
                        {unreadChatCount} {isHindi ? 'नया' : 'New'}
                      </span>
                    )}
                    {item.isExternal ? (
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                    )}
                  </div>
                </div>
              );

              if (item.isExternal) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full"
                  >
                    {content}
                  </a>
                );
              }

              if (item.onClick) {
                return (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      item.onClick!(e);
                    }}
                    className="w-full block focus:outline-none"
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    if (onSelectView) onSelectView('home');
                  }}
                  className="block w-full"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 4. ALERTS & SUPPORT */}
        <div className="pt-2">
          <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider px-2 pb-1.5">
            {isHindi ? 'सूचनाएं व सहायता' : 'Alerts & Support'}
          </p>

          <div className="rounded-xl overflow-hidden bg-slate-800/60 dark:bg-slate-900/60 divide-y divide-slate-700/60 dark:divide-slate-800">
            {/* Admit Cards */}
            <Link
              href="/updates?category=admit_card"
              onClick={() => {
                if (onSelectView) onSelectView('home');
              }}
              className="w-full flex items-center justify-between py-2.5 px-2.5 text-left transition-colors duration-150 hover:bg-slate-700/40 dark:hover:bg-slate-800/50 text-slate-200 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-700/60 dark:bg-slate-800 border border-slate-600/40 text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition-colors block leading-tight">
                    {t.admitCards}
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-normal block mt-0.5">
                    {isHindi ? 'हॉल टिकट व परीक्षा तिथियां' : 'Hall tickets & Exam dates'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            {/* Results & Merits */}
            <Link
              href="/updates?category=result"
              onClick={() => {
                if (onSelectView) onSelectView('home');
              }}
              className="w-full flex items-center justify-between py-2.5 px-2.5 text-left transition-colors duration-150 hover:bg-slate-700/40 dark:hover:bg-slate-800/50 text-slate-200 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-700/60 dark:bg-slate-800 border border-slate-600/40 text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors block leading-tight">
                    {t.resultsMerits}
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-normal block mt-0.5">
                    {isHindi ? 'मेरिट सूची व कट-ऑफ' : 'Merit lists & Cut-offs'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            {/* Suggestion Box Button (Opens full right section page) */}
            <button
              type="button"
              onClick={() => {
                if (onSelectView) onSelectView('suggestion');
              }}
              className={`w-full flex items-center justify-between py-2.5 px-2.5 text-left transition-colors duration-150 group cursor-pointer ${
                activeView === 'suggestion'
                  ? 'bg-slate-700/80 dark:bg-slate-800 text-white border-l-2 border-l-slate-400'
                  : 'hover:bg-slate-700/40 dark:hover:bg-slate-800/50 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-700/60 dark:bg-slate-800 border border-slate-600/40 text-yellow-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div className="min-w-0 truncate">
                  <span className={`text-xs font-bold block truncate leading-tight ${
                    activeView === 'suggestion' ? 'text-white' : 'text-slate-100 group-hover:text-yellow-300'
                  }`}>
                    {isHindi ? 'सुझाव पेटिका' : 'Suggestion Box'}
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-normal block mt-0.5 truncate">
                    {isHindi ? 'सुझाव या नया टेस्ट अनुरोध' : 'Feature / Test Request'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            </button>

            {/* Help & FAQ */}
            <button
              onClick={() => {
                if (onSelectView) onSelectView('contact');
              }}
              className={`w-full flex items-center justify-between py-2.5 px-2.5 text-left transition-colors duration-150 cursor-pointer group ${
                activeView === 'contact'
                  ? 'bg-slate-700/80 dark:bg-slate-800 text-white border-l-2 border-l-slate-400'
                  : 'hover:bg-slate-700/40 dark:hover:bg-slate-800/50 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-700/60 dark:bg-slate-800 border border-slate-600/40 text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-100 group-hover:text-purple-300 transition-colors block leading-tight">
                    {isHindi ? 'सहायता केंद्र व एफएक्यू' : 'Help & FAQ'}
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-normal block mt-0.5">
                    {isHindi ? 'त्वरित सहायता व दिशा-निर्देश' : '24x7 Guide & FAQs'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </div>
        </div>

      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 dark:bg-slate-950 text-[10px] text-slate-400 font-semibold flex items-center justify-between shrink-0">
        <span>© 2026 MockTest Hub</span>
        <span>v2.4 Pro</span>
      </div>
    </aside>
  );
}
