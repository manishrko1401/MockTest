"use client";

import React from 'react';

export const BackgroundArts: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => {
  if (isMobile) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
        {/* Mobile: Top-Left Floating Open Book */}
        <div className="absolute top-8 left-3 opacity-15 dark:opacity-10 animate-float">
          <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            <line x1="6" y1="8" x2="8" y2="8" />
            <line x1="6" y1="12" x2="10" y2="12" />
          </svg>
        </div>

        {/* Mobile: Top-Right Launching Rocket */}
        <div className="absolute top-24 -right-1 opacity-20 dark:opacity-15 animate-float-delayed">
          <svg className="w-9 h-9 text-indigo-500 transform -rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-2.05 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
            <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" opacity="0.4" />
          </svg>
        </div>

        {/* Mobile: Geometric Triangle and Dashed Circles */}
        <div className="absolute top-[28%] -left-3 opacity-15 dark:opacity-10 animate-spin-slow">
          <svg className="w-16 h-16 text-sky-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="50" cy="50" r="40" strokeDasharray="4 4" />
            <polygon points="50,20 80,75 20,75" strokeWidth="1.2" />
          </svg>
        </div>

        {/* Mobile: Mid Page Graduation Cap & Student Success */}
        <div className="absolute top-[52%] -right-2 opacity-15 dark:opacity-10 animate-float-reverse">
          <svg className="w-10 h-10 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
            <circle cx="12" cy="18" r="1" fill="currentColor" />
          </svg>
        </div>

        {/* Mobile: Lower Section Target / Bulb */}
        <div className="absolute top-[75%] left-3 opacity-15 dark:opacity-10 animate-float">
          <svg className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        </div>

        {/* Mobile: Sparkles */}
        <div className="absolute top-[40%] left-6 opacity-20 dark:opacity-15 animate-pulse-subtle">
          <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
      
      {/* ========================================================================= */}
      {/* 1. HERO SECTION BACKGROUND ARTS (Top Banner, Titles, Empty Left/Right) */}
      {/* ========================================================================= */}

      {/* Floating Rocket with Motion Trail (Top Right Empty Area) */}
      <div className="absolute top-12 right-[4%] opacity-25 dark:opacity-15 animate-float pointer-events-none hidden lg:block">
        <svg className="w-20 h-20 text-indigo-500 transform -rotate-12 hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-2.05 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" opacity="0.3" />
          {/* Flame thrust exhaust */}
          <path d="M3 21c.5-1.5 1.5-2 2-2" stroke="orange" strokeWidth="2" strokeLinecap="round" />
          <path d="M2 19c1.5-.5 2-1.5 2-2" stroke="gold" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Floating Stacks of Books & Knowledge (Hero Far Left) */}
      <div className="absolute top-28 left-[2%] opacity-25 dark:opacity-15 animate-float-delayed pointer-events-none hidden xl:block">
        <svg className="w-16 h-16 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
          <path d="M6 14h10" />
          <path d="M2 22h18" strokeWidth="1.5" />
          <path d="M4 18h16" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* Student / Graduate Silhouette with Cap & Laurel (Hero Mid-Left) */}
      <div className="absolute top-[380px] left-[5%] opacity-20 dark:opacity-10 animate-float pointer-events-none hidden lg:block">
        <svg className="w-18 h-18 text-teal-600 dark:text-teal-400" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {/* Graduation Cap */}
          <path d="M32 10 L56 22 L32 34 L8 22 Z" fill="currentColor" fillOpacity="0.1" />
          <path d="M50 26.5 V42 C50 42 46 44 32 44 C18 44 14 42 14 42 V26.5" />
          <path d="M52 23.5 V36" strokeWidth="2.5" />
          <circle cx="52" cy="38" r="2" fill="currentColor" />
          {/* Diploma Scroll */}
          <rect x="22" y="48" width="20" height="6" rx="2" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
          <line x1="32" y1="48" x2="32" y2="54" strokeWidth="2" stroke="amber" />
        </svg>
      </div>

      {/* Concentric Geometric Radar & Triangle Blueprint (Hero Background Center-Right) */}
      <div className="absolute top-20 right-[25%] opacity-20 dark:opacity-10 animate-spin-slow pointer-events-none hidden md:block">
        <svg className="w-36 h-36 text-blue-400 dark:text-blue-500" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          <circle cx="50" cy="50" r="46" strokeWidth="1" strokeDasharray="4 6" />
          <circle cx="50" cy="50" r="32" strokeWidth="1" strokeDasharray="2 4" />
          <circle cx="50" cy="50" r="16" strokeWidth="1" />
          <line x1="50" y1="4" x2="50" y2="96" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
          <line x1="4" y1="50" x2="96" y2="50" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
        </svg>
      </div>

      {/* Modern Drafting Ruler & Triangle (Hero Center-Left) */}
      <div className="absolute top-4 left-[38%] opacity-20 dark:opacity-10 animate-float-reverse pointer-events-none hidden xl:block">
        <svg className="w-14 h-14 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 22 2 2v20Z" fill="currentColor" fillOpacity="0.08" />
          <path d="M18 18H6V6" />
          <line x1="6" y1="14" x2="9" y2="14" strokeWidth="1" />
          <line x1="6" y1="10" x2="8" y2="10" strokeWidth="1" />
          <line x1="10" y1="18" x2="10" y2="15" strokeWidth="1" />
          <line x1="14" y1="18" x2="14" y2="16" strokeWidth="1" />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* 2. CATEGORIES SECTION (Left & Right Flanks) */}
      {/* ========================================================================= */}

      {/* Open Examination Book with Bookmark (Categories Left Flank) */}
      <div className="absolute top-[850px] left-[1.5%] opacity-25 dark:opacity-15 animate-float pointer-events-none hidden lg:block">
        <svg className="w-20 h-20 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" fill="currentColor" fillOpacity="0.06" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" fill="currentColor" fillOpacity="0.06" />
          <path d="M12 7v14" strokeWidth="1.8" />
          <line x1="6" y1="8" x2="8" y2="8" />
          <line x1="6" y1="12" x2="9" y2="12" />
          <line x1="15" y1="8" x2="18" y2="8" />
          <line x1="15" y1="12" x2="17" y2="12" />
        </svg>
      </div>

      {/* Flying Academic Rocket / Goal Target (Categories Right Flank) */}
      <div className="absolute top-[920px] right-[2%] opacity-25 dark:opacity-15 animate-float-delayed pointer-events-none hidden lg:block">
        <svg className="w-20 h-20 text-amber-500 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
          <circle cx="12" cy="12" r="6" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          {/* Crosshair ticks */}
          <line x1="12" y1="2" x2="12" y2="5" strokeWidth="1.8" />
          <line x1="12" y1="19" x2="12" y2="22" strokeWidth="1.8" />
          <line x1="2" y1="12" x2="5" y2="12" strokeWidth="1.8" />
          <line x1="19" y1="12" x2="22" y2="12" strokeWidth="1.8" />
        </svg>
      </div>

      {/* Geometric Diamond & Polygon Cluster (Categories Section Center-Left) */}
      <div className="absolute top-[1100px] left-[6%] opacity-20 dark:opacity-10 animate-spin-slow pointer-events-none hidden xl:block">
        <svg className="w-24 h-24 text-purple-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="50,10 90,50 50,90 10,50" strokeDasharray="3 3" />
          <circle cx="50" cy="50" r="20" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="3" fill="currentColor" />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* 3. LIVE UPDATES BOARD SECTION (Mid-Page Backdrop) */}
      {/* ========================================================================= */}

      {/* Orbiting Atom / Science & Tech Exam Motif (Updates Left) */}
      <div className="absolute top-[1480px] left-[2%] opacity-25 dark:opacity-15 animate-spin-slow pointer-events-none hidden lg:block">
        <svg className="w-24 h-24 text-sky-500 dark:text-sky-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.4">
          <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(0 50 50)" />
          <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(60 50 50)" />
          <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(120 50 50)" />
          <circle cx="50" cy="50" r="5" fill="currentColor" />
        </svg>
      </div>

      {/* Rising Rocket & Goal Achievement Star (Updates Right) */}
      <div className="absolute top-[1520px] right-[2%] opacity-25 dark:opacity-15 animate-float pointer-events-none hidden lg:block">
        <svg className="w-20 h-20 text-rose-500 dark:text-rose-400" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Rocket fuselage */}
          <path d="M32 8 C20 18 18 36 18 44 L32 40 L46 44 C46 36 44 18 32 8 Z" fill="currentColor" fillOpacity="0.08" />
          <circle cx="32" cy="24" r="4" fill="currentColor" fillOpacity="0.4" />
          {/* Left/Right Wings */}
          <path d="M18 36 L8 46 L18 44 Z" />
          <path d="M46 36 L56 46 L46 44 Z" />
          {/* Flame */}
          <path d="M26 42 C26 54 32 58 32 58 C32 58 38 54 38 42" stroke="orange" strokeWidth="2.5" />
        </svg>
      </div>

      {/* Dotted Matrix Array (Center background texture) */}
      <div className="absolute top-[1750px] right-[8%] opacity-20 dark:opacity-10 animate-pulse-subtle pointer-events-none hidden xl:block">
        <svg className="w-32 h-32 text-indigo-400" viewBox="0 0 100 100" fill="currentColor">
          {[10, 30, 50, 70, 90].map(x =>
            [10, 30, 50, 70, 90].map(y => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="2" opacity="0.6" />
            ))
          )}
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* 4. FAQ & LOWER FOOTER BACKGROUND ARTS */}
      {/* ========================================================================= */}

      {/* Academic Cap & Trophy (FAQ Left) */}
      <div className="absolute top-[2150px] left-[3%] opacity-20 dark:opacity-10 animate-float pointer-events-none hidden lg:block">
        <svg className="w-20 h-20 text-emerald-500 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" strokeWidth="1.8" />
          <path d="M10 14.66V17c0 .55-.45.99-.99 1.01A5 5 0 0 1 4 13.06V4h16v9.06a5 5 0 0 1-5.01 4.95c-.55-.02-.99-.46-.99-1.01v-2.34" fill="currentColor" fillOpacity="0.08" />
          <path d="M12 2v2" strokeWidth="1.8" />
        </svg>
      </div>

      {/* Geometric Hexagon Grid & Sparkles (FAQ Right) */}
      <div className="absolute top-[2220px] right-[4%] opacity-20 dark:opacity-10 animate-float-delayed pointer-events-none hidden lg:block">
        <svg className="w-24 h-24 text-blue-500 dark:text-blue-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" strokeDasharray="4 4" />
          <polygon points="50,20 78,35 78,65 50,80 22,65 22,35" strokeWidth="1.2" fill="currentColor" fillOpacity="0.04" />
          <circle cx="50" cy="50" r="6" fill="currentColor" opacity="0.3" />
        </svg>
      </div>

      {/* Ambient 4-point Sparkles scattered across page */}
      <div className="absolute top-[450px] right-[12%] opacity-30 dark:opacity-20 animate-pulse-subtle pointer-events-none hidden md:block">
        <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
      </div>

      <div className="absolute top-[1350px] left-[15%] opacity-25 dark:opacity-15 animate-pulse-subtle pointer-events-none hidden md:block">
        <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
      </div>

      <div className="absolute top-[2000px] right-[18%] opacity-25 dark:opacity-15 animate-pulse-subtle pointer-events-none hidden md:block">
        <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
      </div>

    </div>
  );
};

export default BackgroundArts;
