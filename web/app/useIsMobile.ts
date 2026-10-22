"use client";

import { useState, useEffect, useLayoutEffect } from 'react';

const useBeforePaint = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useIsMobile(breakpoint: number = 768) {
  // Initialize synchronously from window.innerWidth so the FIRST render
  // already knows if we're on mobile — eliminates the desktop-flash on mobile.
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= breakpoint;
  });
  // isMounted stays false until after hydration so SSR HTML still matches.
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Before the first paint, so the mobile layout replaces the desktop one without a visible flash
  useBeforePaint(() => {
    setIsMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    // Re-run on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return { isMobile, isMounted };
}
