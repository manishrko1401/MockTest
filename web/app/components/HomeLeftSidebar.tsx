"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { TRANSLATIONS } from '../translations';
import { useIsDesktopApp, exitDesktopApp } from '../lib/desktopApp';
import { WindowsAppMenuItem } from './WindowsAppDownload';
import {
  HardDriveDownload,
  CalendarCheck,
  Power,
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
  const inDesktopApp = useIsDesktopApp();
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
      iconColor: 'text-[#1e4e79] dark:text-blue-400',
    },
    {
      id: 'planner',
      title: isHindi ? 'स्टडी प्लानर' : 'Study Planner',
      subtitle: isHindi ? 'टू-डू, दैनिक लक्ष्य व परीक्षा गिनती' : 'To-do, Daily Targets & Exam Countdown',
      href: '/planner',
      icon: CalendarCheck,
      iconColor: 'text-teal-600 dark:text-teal-400',
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
      iconColor: 'text-[#1e4e79] dark:text-blue-400',
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
    <aside className="w-full md:w-56 lg:w-64 xl:w-72 bg-[#e9eef4] dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700 flex flex-col shrink-0 z-20 h-full min-h-0 overflow-hidden select-none">
      {/* Scrollable Navigation List */}
      <div className="p-3 space-y-5 flex-1 overflow-y-auto min-h-0 no-scrollbar">

        {/* 1. USER PROFILE / AUTH CARD */}
        {currentUser ? (
          <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-md bg-[#1e4e79] text-white font-semibold text-xs flex items-center justify-center shrink-0">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {currentUser.name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {currentUser.candidateCode?.replace('CGL', 'HUB-ID')}
                </p>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                isPassPro
                  ? 'bg-green-50 text-green-700 border border-green-600/30 dark:bg-green-950/40 dark:text-green-400'
                  : 'bg-white text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}>
                {isPassPro ? (isHindi ? 'पास प्रो' : 'Pass Pro') : (isHindi ? 'मुफ़्त सदस्य' : 'Free Member')}
              </span>
              <Link
                href="/profile"
                className="text-xs text-[#1e4e79] dark:text-blue-300 font-medium hover:underline flex items-center gap-0.5"
              >
                <span>{isHindi ? 'डैशबोर्ड' : 'Dashboard'}</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-md bg-[#eef3f8] text-[#1e4e79] flex items-center justify-center shrink-0 dark:bg-slate-800 dark:text-blue-300">
                <User className="h-3.5 w-3.5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                  {isHindi ? 'अभ्यर्थी लॉगिन' : 'Student Account'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isHindi ? 'रैंक एवं टेस्ट सुरक्षित करें' : 'Track tests & analytics'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link
                href="/auth"
                className="h-8 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
              >
                {t.logIn}
              </Link>
              <Link
                href="/auth"
                className="h-8 inline-flex items-center justify-center rounded-md bg-[#1e4e79] hover:bg-[#163c5e] text-white text-xs font-medium transition-colors border border-[#1e4e79]"
              >
                {t.signUp}
              </Link>
            </div>
          </div>
        )}

        {/* 3. PRIMARY SHORTCUTS SECTION */}
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-1 pb-2">
            {isHindi ? 'प्रमुख शॉर्टकट' : 'Core Shortcuts'}
          </p>

          <div className="rounded-lg overflow-hidden bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            {filteredShortcuts.map((item) => {
              const Icon = item.icon;
              const isItemActive = (item.id === 'chat' && activeView === 'chat') || (item.id === 'referrals' && activeView === 'referrals');
              const hasUnread = (item.id === 'chat' && unreadChatCount > 0);

              const content = (
                <div data-tour={item.id === 'notices' ? 'home-notices' : undefined} className={`w-full flex items-center justify-between py-2.5 px-3 text-left transition-colors duration-150 text-xs font-medium cursor-pointer group ${
                  isItemActive
                    ? 'bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-white shadow-[inset_3px_0_0_0_#1e4e79]'
                    : 'hover:bg-[#f2f6fa] dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 rounded-md flex items-center justify-center bg-[#eef3f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-visible shrink-0 transition-transform duration-200">
                      <Icon className={`h-4 w-4 ${item.iconColor}`} />
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-semibold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border border-white dark:border-slate-900 z-10">
                          {unreadChatCount}
                        </span>
                      )}
                    </div>
                    <div className="truncate min-w-0">
                      <p className={`text-xs leading-tight truncate font-medium transition-colors ${
                        isItemActive ? 'text-[#1e4e79] dark:text-white' : 'text-slate-800 dark:text-slate-100'
                      }`}>
                        {item.title}
                      </p>
                      {item.subtitle ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-normal">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {hasUnread && (
                      <span className="bg-red-500 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full animate-pulse shadow-xs">
                        {unreadChatCount} {isHindi ? 'नया' : 'New'}
                      </span>
                    )}
                    {item.isExternal ? (
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-all shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-all shrink-0" />
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
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-1 pb-2">
            {isHindi ? 'सूचनाएं व सहायता' : 'Alerts & Support'}
          </p>

          <div className="rounded-lg overflow-hidden bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            {/* Admit Cards */}
            <Link
              href="/updates?category=admit_card"
              onClick={() => {
                if (onSelectView) onSelectView('home');
              }}
              className="w-full flex items-center justify-between py-2.5 px-3 text-left transition-colors duration-150 hover:bg-[#f2f6fa] dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#eef3f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-colors block leading-tight">
                    {t.admitCards}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block mt-0.5">
                    {isHindi ? 'हॉल टिकट व परीक्षा तिथियां' : 'Hall tickets & Exam dates'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-all shrink-0" />
            </Link>

            {/* Results & Merits */}
            <Link
              href="/updates?category=result"
              onClick={() => {
                if (onSelectView) onSelectView('home');
              }}
              className="w-full flex items-center justify-between py-2.5 px-3 text-left transition-colors duration-150 hover:bg-[#f2f6fa] dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#eef3f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 shrink-0 transition-transform">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-colors block leading-tight">
                    {t.resultsMerits}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block mt-0.5">
                    {isHindi ? 'मेरिट सूची व कट-ऑफ' : 'Merit lists & Cut-offs'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-all shrink-0" />
            </Link>

            {/* Suggestion Box Button (Opens full right section page) */}
            <button
              type="button"
              onClick={() => {
                if (onSelectView) onSelectView('suggestion');
              }}
              className={`w-full flex items-center justify-between py-2.5 px-3 text-left transition-colors duration-150 group cursor-pointer ${
                activeView === 'suggestion'
                  ? 'bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-white shadow-[inset_3px_0_0_0_#1e4e79]'
                  : 'hover:bg-[#f2f6fa] dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#eef3f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-yellow-600 dark:text-yellow-400 shrink-0 transition-transform">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div className="min-w-0 truncate">
                  <span className={`text-xs font-medium block truncate leading-tight ${
                    activeView === 'suggestion' ? 'text-[#1e4e79] dark:text-white' : 'text-slate-800 dark:text-slate-100 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300'
                  }`}>
                    {isHindi ? 'सुझाव पेटिका' : 'Suggestion Box'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block mt-0.5 truncate">
                    {isHindi ? 'सुझाव या नया टेस्ट अनुरोध' : 'Feature / Test Request'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-all shrink-0 ml-1" />
            </button>

            {/* Help & FAQ */}
            <button
              onClick={() => {
                if (onSelectView) onSelectView('contact');
              }}
              className={`w-full flex items-center justify-between py-2.5 px-3 text-left transition-colors duration-150 cursor-pointer group ${
                activeView === 'contact'
                  ? 'bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-white shadow-[inset_3px_0_0_0_#1e4e79]'
                  : 'hover:bg-[#f2f6fa] dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#eef3f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-purple-600 dark:text-purple-400 shrink-0 transition-transform">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-colors block leading-tight">
                    {isHindi ? 'सहायता केंद्र व एफएक्यू' : 'Help & FAQ'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block mt-0.5">
                    {isHindi ? 'त्वरित सहायता व दिशा-निर्देश' : '24x7 Guide & FAQs'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-all shrink-0" />
            </button>

            {/* Offline tests: only inside the Windows app */}
            {inDesktopApp && (
              <Link href="/offline" className="w-full flex items-center justify-between py-2.5 px-3 text-left transition-colors duration-150 hover:bg-[#f2f6fa] dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 group">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#eef3f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#1e4e79] dark:text-blue-400 shrink-0">
                    <HardDriveDownload className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-colors block leading-tight">{isHindi ? 'ऑफ़लाइन टेस्ट' : 'Offline Tests'}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block mt-0.5">{isHindi ? 'बिना इंटरनेट टेस्ट दें' : 'Attempt without internet'}</span>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-all shrink-0" />
              </Link>
            )}

            {/* Download the Windows app: website only (the right installer for this PC) */}
            {!inDesktopApp && <WindowsAppMenuItem hi={isHindi} />}

            {/* Exit App: only inside the Windows app */}
            {inDesktopApp && (
              <button
                type="button"
                onClick={() => exitDesktopApp(isHindi)}
                className="w-full flex items-center justify-between py-2.5 px-3 text-left transition-colors duration-150 cursor-pointer group hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-700 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 shrink-0">
                    <Power className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-red-700 dark:text-red-400 block leading-tight">
                      {isHindi ? 'ऐप बंद करें' : 'Exit App'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block mt-0.5">
                      {isHindi ? 'मॉक टेस्ट हब बंद करें' : 'Close Mock Test Hub'}
                    </span>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-300 dark:border-slate-700 bg-[#e3e9f0] dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
        <span>© 2026 MockTest Hub</span>
        <span>v2.4 Pro</span>
      </div>
    </aside>
  );
}
