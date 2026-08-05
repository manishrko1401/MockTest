"use client";

import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

export default function IndependenceDayBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative z-50 w-full overflow-hidden shadow-md">
      {/* 4px Tricolor Accent Bar */}
      <div className="h-1 w-full tricolor-gradient-bar" />

      {/* Banner Main Section */}
      <div className="relative bg-gradient-to-r from-orange-600 via-amber-500 to-emerald-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between shadow-inner">
        {/* Left Decorative Floating Balloons (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center space-x-1.5 opacity-90 animate-balloon-float">
          {/* Saffron Balloon */}
          <div className="w-4 h-5 rounded-full bg-orange-400 border border-orange-200 shadow-sm relative flex items-center justify-center">
            <div className="w-1 h-1 bg-white/60 rounded-full absolute top-1 left-1" />
          </div>
          {/* White Balloon with Navy Chakra dot */}
          <div className="w-4 h-5 rounded-full bg-slate-100 border border-slate-300 shadow-sm relative flex items-center justify-center">
            <div className="w-1.5 h-1.5 border border-blue-800 rounded-full" />
          </div>
          {/* Green Balloon */}
          <div className="w-4 h-5 rounded-full bg-emerald-500 border border-emerald-300 shadow-sm relative flex items-center justify-center">
            <div className="w-1 h-1 bg-white/60 rounded-full absolute top-1 left-1" />
          </div>
        </div>

        {/* Center Content: Indian Flag Badge + Independence Greetings */}
        <div className="flex-1 flex items-center justify-center space-x-2 text-center text-xs sm:text-sm font-semibold tracking-wide">
          <span className="inline-block animate-flag-sway text-base sm:text-lg">🇮🇳</span>
          <span className="bg-white/20 backdrop-blur-md border border-white/30 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold uppercase text-white shadow-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-yellow-200 animate-pulse-glow" />
            79th Independence Day
          </span>
          <span className="truncate">
            Happy Independence Day! <span className="hidden md:inline">Celebrate Freedom & Crack Your Dream Govt Exam with Mock Test Hub! 🇮🇳</span>
          </span>
          <span className="inline-block animate-flag-sway text-base sm:text-lg hidden sm:inline-block">🇮🇳</span>
        </div>

        {/* Right Floating Balloons & Dismiss Button */}
        <div className="flex items-center space-x-2">
          <div className="hidden md:flex items-center space-x-1.5 opacity-90 animate-balloon-float-delayed">
            {/* Saffron Balloon */}
            <div className="w-4 h-5 rounded-full bg-orange-400 border border-orange-200 shadow-sm relative flex items-center justify-center">
              <div className="w-1 h-1 bg-white/60 rounded-full absolute top-1 left-1" />
            </div>
            {/* White Balloon */}
            <div className="w-4 h-5 rounded-full bg-slate-100 border border-slate-300 shadow-sm relative flex items-center justify-center">
              <div className="w-1.5 h-1.5 border border-blue-800 rounded-full" />
            </div>
            {/* Green Balloon */}
            <div className="w-4 h-5 rounded-full bg-emerald-500 border border-emerald-300 shadow-sm relative flex items-center justify-center">
              <div className="w-1 h-1 bg-white/60 rounded-full absolute top-1 left-1" />
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors"
            title="Dismiss Independence Day Banner"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
