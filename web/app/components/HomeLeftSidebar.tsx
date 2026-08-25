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
  MessageSquare
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

    const checkUnread = async () => {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-support-messages',
            data: { userId: currentUser.id, markAsRead: activeView === 'chat' }
          })
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          if (activeView === 'chat') {
            setUnreadChatCount(0);
          } else {
            const count = data.messages.filter((m: any) => m.sender === 'ADMIN' && !m.isRead).length;
            setUnreadChatCount(count);
          }
        }
      } catch (err) {
        console.error('Error fetching unread support chat count:', err);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 5000);
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
      id: 'practice',
      title: isHindi ? 'प्रैक्टिस सीरीज़' : 'Practice Series',
      subtitle: isHindi ? 'विषयवार व कस्टम टेस्ट' : 'Topic-wise & Drills',
      href: '/practice-series',
      icon: Zap,
      iconColor: 'text-sky-500',
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
    <aside className="w-full md:w-56 lg:w-64 xl:w-72 bg-slate-100/90 dark:bg-[#060a14] border-r border-slate-200/90 dark:border-slate-800/90 flex flex-col shrink-0 z-20 h-full min-h-0 overflow-hidden select-none">
      {/* Scrollable Navigation List */}
      <div className="p-2.5 space-y-4 flex-1 overflow-y-auto min-h-0 no-scrollbar">

        {/* 1. USER PROFILE / AUTH CARD */}
        {currentUser ? (
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-900 dark:to-slate-850 border border-blue-100 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                  {currentUser.name}
                </h4>
                <p className="text-[9px] font-semibold text-slate-400 truncate">
                  {currentUser.candidateCode?.replace('CGL', 'HUB-ID')}
                </p>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isPassPro
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {isPassPro ? (isHindi ? '👑 पास प्रो' : '👑 Pass Pro') : (isHindi ? 'मुफ़्त सदस्य' : 'Free Member')}
              </span>
              <Link
                href="/profile"
                className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold hover:underline flex items-center gap-0.5"
              >
                <span>{isHindi ? 'डैशबोर्ड' : 'Dashboard'}</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 dark:from-slate-900 dark:to-slate-850 border border-blue-100 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
              <div>
                <h4 className="font-extrabold text-[11px] text-slate-900 dark:text-white">
                  {isHindi ? 'अभ्यर्थी लॉगिन' : 'Student Account'}
                </h4>
                <p className="text-[9px] text-slate-500 dark:text-slate-400">
                  {isHindi ? 'रैंक एवं टेस्ट सुरक्षित करें' : 'Track tests & analytics'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              <Link
                href="/auth"
                className="py-1.5 px-2 rounded-lg border border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[10px] font-extrabold text-center transition"
              >
                {t.logIn}
              </Link>
              <Link
                href="/auth"
                className="py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold text-center shadow-xs transition"
              >
                {t.signUp}
              </Link>
            </div>
          </div>
        )}



        {/* 3. PRIMARY SHORTCUTS SECTION */}
        <div className="space-y-1">
          <p className="text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 pb-0.5">
            {isHindi ? 'प्रमुख शॉर्टकट' : 'Core Shortcuts'}
          </p>

          {filteredShortcuts.map((item) => {
            const Icon = item.icon;
            const isItemActive = (item.id === 'chat' && activeView === 'chat') || (item.id === 'referrals' && activeView === 'referrals');
            const hasUnread = (item.id === 'chat' && unreadChatCount > 0);

            const content = (
              <div className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-200 transform-gpu hover:-translate-y-0.5 hover:scale-[1.015] hover:shadow-md dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4),0_0_10px_rgba(59,130,246,0.1)] text-xs font-bold cursor-pointer active:translate-y-0 active:scale-98 group ${
                isItemActive
                  ? 'bg-blue-500/10 dark:bg-blue-950/50 border border-blue-500/40 shadow-xs'
                  : 'hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-visible shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105">
                    <Icon className={`h-4 w-4 ${item.iconColor}`} />
                    {hasUnread && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-bounce shadow-xs z-10">
                        {unreadChatCount}
                      </span>
                    )}
                  </div>
                  <div className="truncate min-w-0">
                    <p className={`text-xs leading-tight truncate font-bold transition-colors ${
                      isItemActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}>
                      {item.title}
                    </p>
                    {item.subtitle ? (
                      <p className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5 truncate font-normal">
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
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-[#229ED9] group-hover:translate-x-0.5 transition-all shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
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

        {/* 4. ALERTS & SUPPORT */}
        <div className="space-y-1 pt-3 border-t border-slate-200/70 dark:border-slate-800">
          <p className="text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 pb-0.5">
            {isHindi ? 'सूचनाएं व सहायता' : 'Alerts & Support'}
          </p>

          {/* Admit Cards */}
          <Link
            href="/updates?category=admit_card"
            onClick={() => {
              if (onSelectView) onSelectView('home');
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl text-left transition-all duration-200 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 group"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 shrink-0">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600">
                {t.admitCards}
              </span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>

          {/* Results & Merits */}
          <Link
            href="/updates?category=result"
            onClick={() => {
              if (onSelectView) onSelectView('home');
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl text-left transition-all duration-200 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 group"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 shrink-0">
                <Trophy className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-yellow-600">
                {t.resultsMerits}
              </span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>

          {/* Suggestion Box Button (Opens full right section page) */}
          <button
            type="button"
            onClick={() => {
              if (onSelectView) onSelectView('suggestion');
            }}
            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all duration-200 group cursor-pointer ${
              activeView === 'suggestion'
                ? 'bg-amber-500/10 dark:bg-amber-950/50 border border-amber-500/40 shadow-xs'
                : 'hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border border-transparent hover:border-amber-300 dark:hover:border-amber-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Lightbulb className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 truncate">
                <span className={`text-[11px] font-bold block truncate ${
                  activeView === 'suggestion' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400'
                }`}>
                  {isHindi ? 'सुझाव पेटिका' : 'Suggestion Box'}
                </span>
                <span className="text-[8.5px] text-slate-400 font-medium block truncate">
                  {isHindi ? 'सुझाव या नया टेस्ट अनुरोध' : 'Feature / Test Request'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </button>

          {/* Help & FAQ */}
          <button
            onClick={() => {
              if (onSelectView) onSelectView('contact');
            }}
            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all duration-200 cursor-pointer border group ${
              activeView === 'contact'
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                : 'hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border-transparent hover:border-slate-200 dark:hover:border-slate-700/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-950/40 text-purple-600 shrink-0">
                <HelpCircle className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600">
                {isHindi ? 'सहायता केंद्र व एफएक्यू' : 'Help & FAQ'}
              </span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </div>

      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-200/60 dark:bg-slate-950 text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-between shrink-0">
        <span>© 2026 MockTest Hub</span>
        <span>v2.4 Pro</span>
      </div>
    </aside>
  );
}
