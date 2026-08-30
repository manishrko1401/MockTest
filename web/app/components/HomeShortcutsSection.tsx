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
  Menu,
  Share2,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Keyboard,
  BookmarkCheck
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
      id: 'typing_test',
      title: isHindi ? 'टाइपिंग टेस्ट' : 'Typing Test',
      subtitle: isHindi ? 'एसएससी व रेलवे DEST' : 'SSC & RRB Skill Simulator',
      href: '/typing-test',
      icon: Keyboard,
      badge: 'DEST NEW',
      bgClass: 'bg-blue-50/80 hover:bg-blue-100/90 dark:bg-blue-950/30 dark:hover:bg-blue-900/40',
      borderClass: 'border-blue-200/80 dark:border-blue-900/50 hover:border-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
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
      id: 'applied_saved',
      title: isHindi ? 'आवेदन व सेव परीक्षाएं' : 'Applied & Saved Exams',
      subtitle: isHindi ? 'ट्रैक की गई परीक्षाएं' : 'Tracked & Saved Exams',
      href: '/profile/tracked-jobs',
      icon: BookmarkCheck,
      badge: 'TRACKED',
      bgClass: 'bg-purple-50/80 hover:bg-purple-100/90 dark:bg-purple-950/30 dark:hover:bg-purple-900/40',
      borderClass: 'border-purple-200/80 dark:border-purple-900/50 hover:border-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
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
      <div className="bg-slate-900 dark:bg-slate-950 backdrop-blur-md border border-slate-700/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-slate-800 text-white border border-slate-700 flex items-center justify-center font-bold shadow-xs">
              <Menu className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                {isHindi ? 'होम स्क्रीन मेन्यू एवं डायरेक्ट शॉर्टकट' : 'Quick Hub Menu & Direct Shortcuts'}
              </h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                {isHindi ? 'टेस्ट सीरीज, सूचनाएं, लॉकर, प्रोफाइल एवं पास तक तुरंत पहुंचें' : 'Instant 1-click access to Test Series, Notices, Document Locker, Profile & Pass'}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenMenu}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black text-[11px] transition active:scale-95 cursor-pointer shadow-xs"
          >
            <span>{isHindi ? 'पूरा मेन्यू खोलें' : 'Open Left Menu'}</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>

        {/* Shortcuts Horizontal Scroll / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-y sm:divide-y-0 divide-slate-700/60 dark:divide-slate-800 bg-slate-800/60 dark:bg-slate-900/60 rounded-xl overflow-hidden">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            const content = (
              <div
                className={`p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-150 hover:bg-slate-700/40 dark:hover:bg-slate-800/50 active:scale-95 cursor-pointer h-full relative overflow-hidden group ${
                  item.isSpecial
                    ? 'bg-slate-700/60 text-white'
                    : 'text-slate-200'
                }`}
              >
                {/* Top Row: Icon + Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-slate-700/60 dark:bg-slate-800 border border-slate-600/40 text-slate-200 transition-transform group-hover:scale-110 shrink-0">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-300 group-hover:text-white" />
                  </div>
                  {item.badge && (
                    <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-700/60 text-slate-300 border border-slate-600/40">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Bottom Row: Title + Subtitle */}
                <div>
                  <h4 className="font-extrabold text-[11px] sm:text-xs leading-tight line-clamp-1 text-slate-100 group-hover:text-white">
                    {item.title}
                  </h4>
                  <p className="text-[9px] font-semibold mt-0.5 line-clamp-1 text-slate-400">
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
