"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { TRANSLATIONS } from '../translations';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

interface HomeHeroBannerCarouselProps {
  onOpenPassClaim?: () => void;
}

interface BannerSlide {
  id: string;
  type: string;
  bgGradient: string;
  glowColor: string;
  borderColor?: string;
  badgeTop: string;
  badgeTopSub?: string;
  headlineMain: string;
  headlinePrefix?: string;
  features: string[];
  actionText: string;
  actionSub?: string;
  badgeLogo: string;
  badgeBrand: string;
  tagline: string;
  imageUrl?: string;
  href: string;
  onClick?: () => void;
}

export default function HomeHeroBannerCarousel({ onOpenPassClaim }: HomeHeroBannerCarouselProps) {
  const { language, noticesList } = useAuth();
  const isHindi = language === 'hi';

  // Extract ONLY banners uploaded by admin (notices or announcements with a valid imageUrl)
  const adminBanners = useMemo(() => {
    return (noticesList || []).filter(
      (n) => Boolean(n.imageUrl && n.imageUrl.trim() !== '')
    );
  }, [noticesList]);

  // Map admin banners to slides
  const allSlides: BannerSlide[] = useMemo(() => {
    return adminBanners.map((ann, idx) => ({
      id: `custom_${ann.id || idx}`,
      type: 'custom',
      bgGradient: 'from-[#070b19] via-[#0e172e] to-[#070b19]',
      glowColor: 'rgba(59, 130, 246, 0.35)',
      badgeTop: ann.category || 'NOTICE',
      badgeTopSub: '',
      headlineMain: (isHindi && ann.titleHi) ? ann.titleHi : ann.title,
      features: ['Official Exam Announcement & Mock Test Pack'],
      actionText: isHindi ? 'टेस्ट शुरू करें 🔗' : 'Start Test 🔗',
      actionSub: ann.date || '',
      badgeLogo: 'UPDATE',
      badgeBrand: 'PORTAL',
      tagline: 'OFFICIAL NOTIFICATION',
      imageUrl: ann.imageUrl,
      href: ann.url || `/updates/${ann.id}`,
      onClick: undefined,
    }));
  }, [adminBanners, isHindi]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const totalSlides = allSlides.length;

  const nextSlide = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Auto slide timer (every 4.5 seconds when not paused)
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 4500);
    return () => clearInterval(interval);
  }, [nextSlide, isPaused, totalSlides]);

  // When no admin banner has been uploaded or during loading, do NOT show any banner
  if (totalSlides === 0) {
    return null;
  }

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Compute Left, Center, and Right slide indices for the 3D peeking carousel
  const prevIndex = (currentIndex - 1 + totalSlides) % totalSlides;
  const nextIndex = (currentIndex + 1) % totalSlides;

  // Render a Single Slide Banner (Borderless & No Black Sidebars)
  const renderSlideContent = (slide: BannerSlide, isCenter: boolean) => {
    // If it has a full custom image banner (e.g. RRB NTPC Station Master CBAT)
    if (slide.imageUrl && slide.imageUrl.trim() !== '') {
      return (
        <Link
          href={slide.href}
          onClick={(e) => {
            if (slide.onClick) {
              e.preventDefault();
              slide.onClick();
            }
          }}
          className="w-full h-full relative block overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl border-0 shadow-lg select-none group bg-slate-100/60 dark:bg-slate-900/60 flex items-center justify-center"
        >
          <img
            src={slide.imageUrl.trim().replace(/^http:\/\//i, 'https://')}
            alt={slide.headlineMain}
            className="w-full h-full object-contain object-center rounded-xl sm:rounded-2xl md:rounded-3xl select-none pointer-events-none block border-0 transition-transform duration-300 group-hover:scale-[1.01]"
            loading="eager"
          />
        </Link>
      );
    }

    // High-Fidelity Testbook / Ed-Tech 3D Graphic Banner (Borderless, clean edge-to-edge)
    return (
      <div
        className={`w-full h-full relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-r ${slide.bgGradient} p-3 sm:p-4 md:p-5 lg:p-7 text-white flex flex-col justify-between select-none shadow-xl border-0`}
        style={{
          boxShadow: isCenter ? `0 15px 40px -10px ${slide.glowColor}` : 'none'
        }}
      >
        {/* Glow Ambient Highlights in background */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-1.5 z-10">
          {/* Top Headline Pill */}
          <div className="inline-flex items-center gap-1 bg-white text-blue-950 px-2.5 py-0.5 sm:px-4 sm:py-1 rounded-full shadow-md shrink-0">
            <span className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-wider italic">
              {slide.badgeTop}
            </span>
            {slide.badgeTopSub && (
              <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 hidden sm:inline">
                {slide.badgeTopSub}
              </span>
            )}
          </div>

          {/* Top Right Brand Pill / Price Badge */}
          <div className="flex items-center gap-1.5">
            <div className="sm:hidden px-2 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[9.5px] rounded-full shadow-xs">
              ₹1 TRIAL
            </div>
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl shrink-0">
              <span className="text-[7.5px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-widest text-pink-400">
                {slide.badgeBrand}
              </span>
              <span className="text-[8px] sm:text-[10px] md:text-[11px] font-black text-white px-1 sm:px-1.5 py-0.2 bg-gradient-to-r from-pink-600 to-red-600 rounded">
                {slide.badgeLogo}
              </span>
            </div>
          </div>
        </div>

        {/* Middle Main Content Row (Headline + Features) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 md:gap-5 items-center my-auto z-10 py-1 sm:py-2">
          
          {/* Left Column: Big Headline + Feature Checklist + Action Button */}
          <div className="col-span-1 sm:col-span-8 flex flex-col justify-center space-y-1.5 sm:space-y-2.5 min-w-0">
            <h2 className="text-xs xs:text-sm sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black text-cyan-300 tracking-tight leading-tight drop-shadow-md truncate">
              {slide.headlineMain}
            </h2>

            {/* Checklist Container */}
            <div className="p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl bg-blue-950/70 border border-blue-400/20 backdrop-blur-xs grid grid-cols-1 xs:grid-cols-2 gap-x-2 gap-y-1 text-slate-200">
              {slide.features.slice(0, 4).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-1.5 min-w-0">
                  <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-white text-blue-900 flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-600 stroke-[3]" />
                  </div>
                  <span className="text-[8.5px] xs:text-[9.5px] sm:text-[10px] md:text-xs font-bold text-white leading-tight truncate">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="flex items-center gap-2 sm:gap-2.5 pt-0.5 flex-wrap">
              {slide.onClick ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    slide.onClick?.();
                  }}
                  className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-[9.5px] xs:text-[10.5px] sm:text-xs md:text-sm rounded-lg sm:rounded-xl shadow-lg hover:shadow-emerald-500/40 active:scale-95 transition-all transform flex items-center gap-1 cursor-pointer uppercase tracking-wider border-0 shrink-0 whitespace-nowrap"
                >
                  <span>{slide.actionText}</span>
                </button>
              ) : (
                <Link
                  href={slide.href}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-[9.5px] xs:text-[10.5px] sm:text-xs md:text-sm rounded-lg sm:rounded-xl shadow-lg hover:shadow-emerald-500/40 active:scale-95 transition-all transform flex items-center gap-1 cursor-pointer uppercase tracking-wider border-0 shrink-0 whitespace-nowrap"
                >
                  <span>{slide.actionText}</span>
                </Link>
              )}

              {slide.actionSub && (
                <span className="text-[8px] sm:text-[9px] md:text-[10.5px] font-semibold text-slate-300 truncate max-w-[220px]">
                  {slide.actionSub}
                </span>
              )}
            </div>
          </div>

          {/* Right Column: 3D Silver Rupee Coin / Emblem Graphic (Visible on Desktop) */}
          <div className="hidden sm:flex col-span-4 flex-col items-center justify-center relative shrink-0">
            <div className="relative group/coin">
              <div className="absolute -inset-2 bg-cyan-400/30 rounded-full blur-xl animate-pulse" />
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-100 p-1.5 sm:p-2 shadow-[inset_0_4px_10px_rgba(255,255,255,0.8),0_10px_25px_rgba(0,0,0,0.6)] border-2 border-slate-100 flex flex-col items-center justify-center text-slate-800 relative transform group-hover/coin:scale-105 transition-transform duration-300">
                <div className="w-full h-full rounded-full border border-dashed border-slate-400 flex flex-col items-center justify-center text-center p-1 bg-gradient-to-b from-slate-100 via-slate-300 to-slate-200">
                  <span className="text-[8px] sm:text-[9px] md:text-xs font-black text-slate-700 tracking-wider">
                    {isHindi ? 'रुपया' : 'RUPEE'}
                  </span>
                  <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-none drop-shadow-sm my-0.5">
                    ₹1
                  </span>
                  <span className="text-[7.5px] sm:text-[8.5px] md:text-[10px] font-extrabold text-slate-600 tracking-widest">
                    2026
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-1.5 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-400/30">
              <span className="text-[7.5px] sm:text-[8.5px] md:text-[9.5px] font-black text-cyan-300 tracking-wider uppercase">
                {slide.tagline}
              </span>
            </div>
          </div>

        </div>

        {/* Bottom subtle progress indicator line */}
        <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden z-10" />
      </div>
    );
  };

  return (
    <section
      className="w-full relative px-0 sm:px-1 md:px-2 my-1 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D Carousel Stage Wrapper */}
      <div className="relative w-full h-[220px] xs:h-[250px] sm:h-[280px] md:h-[320px] lg:h-[350px] xl:h-[380px] flex items-center justify-center overflow-hidden">
        {allSlides.map((slide, idx) => {
          if (totalSlides <= 1) {
            return (
              <div
                key={slide.id || idx}
                className="absolute inset-0 w-full h-full z-20 transition-all duration-700 ease-out rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl"
              >
                {renderSlideContent(slide, true)}
              </div>
            );
          }

          let offset = (idx - currentIndex + totalSlides) % totalSlides;
          if (offset > totalSlides / 2) offset -= totalSlides;

          const isCenter = offset === 0;
          const isLeft = offset === -1 || (totalSlides === 2 && offset === 1 && currentIndex === 1);
          const isRight = offset === 1 && !isLeft;

          let posStyle = '';
          if (isCenter) {
            posStyle = 'left-1/2 -translate-x-1/2 -translate-y-1/2 w-full sm:w-[94%] md:w-[92%] lg:w-[88%] xl:w-[86%] h-full z-20 opacity-100 scale-100 shadow-2xl pointer-events-auto';
          } else if (isLeft) {
            posStyle = 'left-0 sm:-translate-x-[62%] md:-translate-x-[58%] lg:-translate-x-[55%] -translate-y-1/2 hidden sm:block sm:w-[82%] md:w-[84%] lg:w-[85%] sm:h-[88%] md:h-[90%] z-10 opacity-35 dark:opacity-30 hover:opacity-75 scale-[0.88] shadow-lg cursor-pointer';
          } else if (isRight) {
            posStyle = 'right-0 sm:translate-x-[62%] md:translate-x-[58%] lg:translate-x-[55%] -translate-y-1/2 hidden sm:block sm:w-[82%] md:w-[84%] lg:w-[85%] sm:h-[88%] md:h-[90%] z-10 opacity-35 dark:opacity-30 hover:opacity-75 scale-[0.88] shadow-lg cursor-pointer';
          } else {
            posStyle = 'left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] z-0 opacity-0 scale-75 pointer-events-none';
          }

          return (
            <div
              key={slide.id || idx}
              onClick={() => {
                if (isLeft) prevSlide();
                if (isRight) nextSlide();
              }}
              className={`absolute top-1/2 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] transform-gpu rounded-2xl md:rounded-3xl overflow-hidden will-change-transform ${posStyle}`}
            >
              {renderSlideContent(slide, isCenter)}
            </div>
          );
        })}

        {/* Circular Floating Left Arrow Button */}
        {totalSlides > 1 && (
          <button
            onClick={prevSlide}
            className="absolute left-1 sm:left-2 lg:left-3 top-1/2 -translate-y-1/2 z-30 w-7 h-7 sm:w-8 sm:h-8 lg:w-11 lg:h-11 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white rounded-full shadow-md flex items-center justify-center border border-slate-200/80 dark:border-slate-700 transition-all transform hover:scale-110 active:scale-90 cursor-pointer"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 stroke-[2.5]" />
          </button>
        )}

        {/* Circular Floating Right Arrow Button */}
        {totalSlides > 1 && (
          <button
            onClick={nextSlide}
            className="absolute right-1 sm:right-2 lg:right-3 top-1/2 -translate-y-1/2 z-30 w-7 h-7 sm:w-8 sm:h-8 lg:w-11 lg:h-11 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white rounded-full shadow-md flex items-center justify-center border border-slate-200/80 dark:border-slate-700 transition-all transform hover:scale-110 active:scale-90 cursor-pointer"
            aria-label="Next Slide"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Centered Pagination Indicator Dots */}
      {totalSlides > 1 && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-2 sm:mt-4">
          {allSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`transition-all duration-300 cursor-pointer rounded-full ${
                currentIndex === idx
                  ? 'bg-cyan-500 w-2.5 h-2.5 ring-2 ring-cyan-500/40 shadow-xs'
                  : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 w-1.5 h-1.5 sm:w-2 sm:h-2'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
