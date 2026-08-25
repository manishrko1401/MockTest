"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { TRANSLATIONS } from '../translations';
import {
  Award,
  Zap,
  Bell,
  Lock,
  User,
  Crown,
  Menu,
  Share2,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

interface HomeShortcutsSectionProps {
  onOpenMenu: () => void;
  onOpenPassClaim?: () => void;
}

export default function HomeShortcutsSection({ onOpenMenu, onOpenPassClaim }: HomeShortcutsSectionProps) {
  const { currentUser, language, noticesList } = useAuth();
  const t = TRANSLATIONS[language];
  const isHindi = language === 'hi';
  const isPassPro = currentUser?.subscriptionTier === 'Testbook Pass Pro' || currentUser?.subscriptionTier === 'Testbook Pass';
  const activeNoticeCount = (noticesList || []).filter(n => n.category !== 'testimonial').length;

  const shortcuts = [
    {
      id: 'menu',
      title: isHindi ? 'सभी मेन्यू' : 'All Menu',
      subtitle: isHindi ? 'शॉर्टकट एवं श्रेणियां' : 'Categories & Shortcuts',
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        onOpenMenu();
      },
      icon: Menu,
      badge: isHindi ? 'मेन्यू' : 'Menu',
      bgClass: 'from-blue-600 to-indigo-600 text-white',
      borderClass: 'border-blue-500/40 shadow-blue-500/20',
      iconBg: 'bg-white/20 text-white',
      isSpecial: true,
    },
    {
      id: 'test_series',
      title: t.navTestSeries,
      subtitle: isHindi ? '1,500+ सीबीटी टेस्ट्स' : '1,500+ CBT Mock Tests',
      href: '/mock-tests',
      icon: Award,
      badge: 'LIVE CBT',
      bgClass: 'bg-orange-50/80 hover:bg-orange-100/90 dark:bg-orange-950/30 dark:hover:bg-orange-900/40',
      borderClass: 'border-orange-200/80 dark:border-orange-900/50 hover:border-orange-400',
      iconBg: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400',
    },
    {
      id: 'notices',
      title: t.navUpdates,
      subtitle: isHindi ? 'एडमिट कार्ड व परिणाम' : 'Admit Cards & Results',
      href: '/updates',
      icon: Bell,
      badge: activeNoticeCount > 0 ? `${activeNoticeCount} Alerts` : 'LIVE',
      bgClass: 'bg-indigo-50/80 hover:bg-indigo-100/90 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40',
      borderClass: 'border-indigo-200/80 dark:border-indigo-900/50 hover:border-indigo-400',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'locker',
      title: isHindi ? 'दस्तावेज़ लॉकर' : 'Document Locker',
      subtitle: isHindi ? 'सुरक्षित प्रमाणपत्र वॉल्ट' : 'Secure Certificate Vault',
      href: '/locker',
      icon: Lock,
      badge: 'PIN Safe',
      bgClass: 'bg-emerald-50/80 hover:bg-emerald-100/90 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40',
      borderClass: 'border-emerald-200/80 dark:border-emerald-900/50 hover:border-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'profile',
      title: isHindi ? 'प्रोफाइल एवं डैशबोर्ड' : 'Profile & Dashboard',
      subtitle: currentUser ? currentUser.name : (isHindi ? 'लॉग इन / साइन अप' : 'Login / Register'),
      href: currentUser ? '/profile' : '/auth',
      icon: User,
      badge: isPassPro ? 'PRO' : (currentUser ? 'STUDENT' : 'GUEST'),
      bgClass: 'bg-purple-50/80 hover:bg-purple-100/90 dark:bg-purple-950/30 dark:hover:bg-purple-900/40',
      borderClass: 'border-purple-200/80 dark:border-purple-900/50 hover:border-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
    },
    {
      id: 'pass',
      title: isHindi ? 'पास प्रो (Pass Pro)' : 'Pass Pro Access',
      subtitle: isPassPro ? (isHindi ? 'सक्रिय 👑' : 'Active 👑') : (isHindi ? '1 वर्ष का मुफ़्त पास' : '1-Year Free Gift'),
      href: currentUser ? '/profile' : '#',
      onClick: isPassPro ? undefined : (e: React.MouseEvent) => {
        e.preventDefault();
        if (onOpenPassClaim) onOpenPassClaim();
      },
      icon: Crown,
      badge: isPassPro ? 'UNLOCKED' : 'FREE GIFT',
      bgClass: 'bg-amber-50/80 hover:bg-amber-100/90 dark:bg-amber-950/30 dark:hover:bg-amber-900/40',
      borderClass: 'border-amber-200/80 dark:border-amber-900/50 hover:border-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'practice',
      title: isHindi ? 'प्रैक्टिस सीरीज़' : 'Practice Series',
      subtitle: isHindi ? 'विषयवार व कस्टम टेस्ट' : 'Topic-wise & Drills',
      href: '/practice-series',
      icon: Zap,
      badge: 'TOPICS',
      bgClass: 'bg-sky-50/80 hover:bg-sky-100/90 dark:bg-sky-950/30 dark:hover:bg-sky-900/40',
      borderClass: 'border-sky-200/80 dark:border-sky-900/50 hover:border-sky-400',
      iconBg: 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400',
    },
    {
      id: 'referrals',
      title: isHindi ? 'रेफर और कमाएं' : 'Refer & Earn',
      subtitle: isHindi ? 'सिक्के व पुरस्कार' : 'Coins & Bonus Perks',
      href: '/referrals',
      icon: Share2,
      badge: 'REWARDS',
      bgClass: 'bg-pink-50/80 hover:bg-pink-100/90 dark:bg-pink-950/30 dark:hover:bg-pink-900/40',
      borderClass: 'border-pink-200/80 dark:border-pink-900/50 hover:border-pink-400',
      iconBg: 'bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400',
    }
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 min-[1080px]:px-8 py-2 relative z-10">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-600/10 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Menu className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {isHindi ? 'होम स्क्रीन मेन्यू एवं डायरेक्ट शॉर्टकट' : 'Quick Hub Menu & Direct Shortcuts'}
              </h3>
              <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                {isHindi ? 'टेस्ट सीरीज, सूचनाएं, लॉकर, प्रोफाइल एवं पास तक तुरंत पहुंचें' : 'Instant 1-click access to Test Series, Notices, Document Locker, Profile & Pass'}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenMenu}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 font-black text-[11px] transition active:scale-95 cursor-pointer shadow-2xs"
          >
            <span>{isHindi ? 'पूरा मेन्यू खोलें' : 'Open Left Menu'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Shortcuts Horizontal Scroll / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            const content = (
              <div
                className={`p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer h-full relative overflow-hidden group ${
                  item.isSpecial
                    ? 'bg-gradient-to-r ' + item.bgClass + ' ' + item.borderClass
                    : item.bgClass + ' ' + item.borderClass + ' shadow-2xs'
                }`}
              >
                {/* Top Row: Icon + Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 sm:p-2 rounded-lg ${item.iconBg} transition-transform group-hover:scale-110 shrink-0`}>
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  {item.badge && (
                    <span className={`text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      item.isSpecial
                        ? 'bg-white/20 text-white'
                        : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Bottom Row: Title + Subtitle */}
                <div>
                  <h4 className={`font-extrabold text-[11px] sm:text-xs leading-tight line-clamp-1 ${
                    item.isSpecial ? 'text-white' : 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
                  }`}>
                    {item.title}
                  </h4>
                  <p className={`text-[9px] font-semibold mt-0.5 line-clamp-1 ${
                    item.isSpecial ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );

            if (item.onClick) {
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="text-left w-full h-full block focus:outline-none"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link key={item.id} href={item.href} className="block h-full">
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
