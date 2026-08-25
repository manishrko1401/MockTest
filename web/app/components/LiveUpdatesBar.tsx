"use client";

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

export interface NoticeItem {
  id: string;
  title: string;
  titleHi?: string;
  date: string;
}

interface LiveUpdatesBarProps {
  notices: NoticeItem[];
  language: 'en' | 'hi';
  isMobile?: boolean;
}

export default function LiveUpdatesBar({ notices, language, isMobile = false }: LiveUpdatesBarProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);

  const posRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Speed in pixels per second: ~28px/s is calm, slow, and comfortable
  const speed = isMobile ? 24 : 28;

  useEffect(() => {
    let active = true;

    const step = (time: number) => {
      if (!active) return;

      if (lastTimeRef.current !== null) {
        const delta = Math.min((time - lastTimeRef.current) / 1000, 0.1);
        
        if (!isPausedRef.current && contentRef.current) {
          const singleWidth = contentRef.current.scrollWidth / 2;
          if (singleWidth > 0) {
            posRef.current += speed * delta;
            if (posRef.current >= singleWidth) {
              posRef.current = posRef.current % singleWidth;
            }
            contentRef.current.style.transform = `translate3d(-${posRef.current}px, 0, 0)`;
          }
        }
      }

      lastTimeRef.current = time;
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [speed, notices]);

  if (!notices || notices.length === 0) return null;

  // Duplicate list once so it wraps seamlessly
  const displayNotices = [...notices, ...notices];

  if (isMobile) {
    return (
      <div 
        className="relative bg-blue-600/95 dark:bg-blue-950/90 text-white text-[10.5px] py-1.5 px-2.5 sm:px-3.5 flex items-center gap-2 border-b border-blue-500/20 z-20 shrink-0 font-bold overflow-hidden shadow-2xs select-none"
        onMouseEnter={() => { isPausedRef.current = true; }}
        onMouseLeave={() => { isPausedRef.current = false; }}
        onTouchStart={() => { isPausedRef.current = true; }}
        onTouchEnd={() => { isPausedRef.current = false; }}
      >
        <span className="bg-red-500 text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse shrink-0 flex items-center gap-1 shadow-xs border border-red-400/30 select-none pointer-events-none">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
          {language === 'hi' ? 'लाइव' : 'Live'}
        </span>
        <div className="flex-1 overflow-hidden relative">
          <div 
            ref={contentRef}
            className="inline-flex items-center whitespace-nowrap will-change-transform"
          >
            {displayNotices.map((notice, idx) => (
              <span key={`${notice.id}-${idx}`} className="inline-flex items-center mx-3">
                <Link href={`/updates/${notice.id}`} className="hover:underline hover:text-blue-200 transition-colors">
                  {(language === 'hi' && notice.titleHi) ? notice.titleHi : notice.title} ({notice.date})
                </Link>
                <span className="ml-3 text-blue-300/60 select-none">|</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative bg-blue-600/95 dark:bg-blue-950/90 text-white text-xs py-1.5 px-4 sm:px-6 lg:px-8 flex items-center gap-3 border-b border-blue-500/20 z-30 shrink-0 font-bold overflow-hidden shadow-2xs select-none"
      onMouseEnter={() => { isPausedRef.current = true; }}
      onMouseLeave={() => { isPausedRef.current = false; }}
      onTouchStart={() => { isPausedRef.current = true; }}
      onTouchEnd={() => { isPausedRef.current = false; }}
    >
      <span className="bg-red-500 text-[8.5px] font-black text-white px-2 py-0.5 rounded uppercase tracking-wider animate-pulse shrink-0 flex items-center gap-1 shadow-xs border border-red-400/30 select-none pointer-events-none">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
        {language === 'hi' ? 'लाइव अपडेट' : 'Live Updates'}
      </span>
      <div className="flex-1 overflow-hidden relative">
        <div 
          ref={contentRef}
          className="inline-flex items-center whitespace-nowrap will-change-transform"
        >
          {displayNotices.map((notice, idx) => (
            <span key={`${notice.id}-${idx}`} className="inline-flex items-center mx-5">
              <Link href={`/updates/${notice.id}`} className="hover:underline hover:text-blue-200 transition-colors">
                {(language === 'hi' && notice.titleHi) ? notice.titleHi : notice.title} ({notice.date})
              </Link>
              <span className="ml-5 text-blue-300/60 select-none">|</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
