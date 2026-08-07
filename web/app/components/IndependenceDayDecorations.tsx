"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles, X, Award } from 'lucide-react';

export function AshokaChakraIcon({ className = "w-5 h-5 text-blue-800" }: { className?: string }) {
  return (
    <svg className={`${className} animate-chakra-spin shrink-0`} viewBox="0 0 100 100" fill="currentColor">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="5" />
      <circle cx="50" cy="50" r="10" fill="currentColor" />
      {/* 24 Spokes of Ashoka Chakra */}
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="50"
          y1="50"
          x2={50 + 44 * Math.cos((i * 15 * Math.PI) / 180)}
          y2={50 + 44 * Math.sin((i * 15 * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="2.5"
        />
      ))}
    </svg>
  );
}

export default function IndependenceDayDecorations() {
  const pathname = usePathname();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // EXCEPT MOCK TEST PAGE: Do not render any decorations or banners on exam simulator pages (/exam/...)
  if (pathname?.startsWith('/exam')) {
    return null;
  }

  return (
    <>
      {/* 1. TOP INDIAN FLAG CELEBRATION HEADER BANNER (Compact & Slim) */}
      {!bannerDismissed && (
        <div className="relative z-50 w-full overflow-hidden shadow-sm">
          {/* Top 2px Saffron-White-Green Tricolor Bar */}
          <div className="h-0.5 w-full tricolor-gradient-bar" />

          {/* Compact Main Indian Flag Banner */}
          <div className="relative bg-gradient-to-r from-orange-600 via-amber-500 to-emerald-600 text-white px-2 py-1 sm:px-4 sm:py-1.5 flex items-center justify-between shadow-xs">
            
            {/* Left Section: Ashoka Chakra + Compact Balloons */}
            <div className="flex items-center space-x-2">
              <div className="bg-white/90 p-0.5 rounded-full shadow-xs flex items-center justify-center border border-blue-900/40">
                <AshokaChakraIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-900" />
              </div>
              <div className="hidden sm:flex items-center space-x-1 opacity-90 animate-balloon-float">
                {/* Saffron Balloon */}
                <div className="w-3.5 h-4 rounded-full bg-orange-400 border border-orange-200 shadow-xs relative flex items-center justify-center">
                  <div className="w-0.5 h-0.5 bg-white/70 rounded-full absolute top-1 left-1" />
                </div>
                {/* White Balloon with Chakra */}
                <div className="w-3.5 h-4 rounded-full bg-slate-100 border border-slate-300 shadow-xs relative flex items-center justify-center">
                  <AshokaChakraIcon className="w-2 h-2 text-blue-900" />
                </div>
                {/* Green Balloon */}
                <div className="w-3.5 h-4 rounded-full bg-emerald-500 border border-emerald-300 shadow-xs relative flex items-center justify-center">
                  <div className="w-0.5 h-0.5 bg-white/70 rounded-full absolute top-1 left-1" />
                </div>
              </div>
            </div>

            {/* Center Content: Indian Flag Greetings */}
            <div className="flex-1 flex items-center justify-center space-x-1.5 text-center text-[10.5px] sm:text-xs font-bold tracking-wide">
              <span className="inline-block animate-flag-sway text-sm sm:text-base">🇮🇳</span>
              <span className="bg-white/25 backdrop-blur-md border border-white/30 px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[11px] font-black uppercase text-white shadow-xs flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-yellow-200 animate-pulse-glow" />
                Happy 80th Independence Day India! 🇮🇳
              </span>
              <span className="hidden md:inline text-xs font-medium">
                Celebrate Freedom & Crack Your Govt Exam! 🇮🇳 Jai Hind!
              </span>
              <span className="inline-block animate-flag-sway text-sm sm:text-base hidden sm:inline-block">🇮🇳</span>
            </div>

            {/* Right Section: Compact Balloons */}
            <div className="flex items-center space-x-1.5">
              <div className="hidden md:flex items-center space-x-1 opacity-90 animate-balloon-float-delayed">
                <div className="w-3.5 h-4 rounded-full bg-orange-400 border border-orange-200 shadow-xs relative flex items-center justify-center">
                  <div className="w-0.5 h-0.5 bg-white/70 rounded-full absolute top-1 left-1" />
                </div>
                <div className="w-3.5 h-4 rounded-full bg-slate-100 border border-slate-300 shadow-xs relative flex items-center justify-center">
                  <AshokaChakraIcon className="w-2 h-2 text-blue-900" />
                </div>
                <div className="w-3.5 h-4 rounded-full bg-emerald-500 border border-emerald-300 shadow-xs relative flex items-center justify-center">
                  <div className="w-0.5 h-0.5 bg-white/70 rounded-full absolute top-1 left-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FLOATING SIDE TRICOLOR BALLOONS (Visible on Mobile & Desktop) */}
      <div className="fixed bottom-4 left-2 sm:bottom-6 sm:left-3 z-40 pointer-events-none flex flex-col items-center gap-1.5 opacity-90 animate-balloon-float scale-75 sm:scale-100 origin-bottom-left">
        <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-900/90 backdrop-blur-md border border-orange-500/50 rounded-full text-[9px] sm:text-[10px] text-white font-black flex items-center gap-1.5 shadow-xl">
          <span className="animate-flag-sway inline-block">🇮🇳</span> Jai Hind!
        </div>
        <div className="flex items-end -space-x-1">
          <div className="w-5 h-7 sm:w-6 sm:h-8 rounded-full bg-orange-500 border border-orange-200 shadow-md relative">
            <div className="w-1 h-1 bg-white/70 rounded-full absolute top-1.5 left-1.5" />
            <div className="w-0.5 h-6 bg-slate-400/40 absolute -bottom-5 left-2.5" />
          </div>
          <div className="w-5 h-7 sm:w-6 sm:h-8 rounded-full bg-slate-100 border border-slate-300 shadow-md relative -top-1.5 flex items-center justify-center">
            <AshokaChakraIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-900" />
            <div className="w-0.5 h-6 bg-slate-400/40 absolute -bottom-5 left-2.5" />
          </div>
          <div className="w-5 h-7 sm:w-6 sm:h-8 rounded-full bg-emerald-600 border border-emerald-300 shadow-md relative">
            <div className="w-1 h-1 bg-white/70 rounded-full absolute top-1.5 left-1.5" />
            <div className="w-0.5 h-6 bg-slate-400/40 absolute -bottom-5 left-2.5" />
          </div>
        </div>
      </div>



      {/* 4. AMBIENT TRICOLOR BACKGROUND LIGHTING */}
      <div className="fixed top-0 left-0 w-80 h-80 bg-orange-500/10 dark:bg-orange-500/15 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed top-0 right-0 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none z-0" />
    </>
  );
}
