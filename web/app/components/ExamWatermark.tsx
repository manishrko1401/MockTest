"use client";

import React from 'react';
import { useAuth } from '../AuthContext';

/**
 * Faint diagonal watermark with the student's name and candidate code over the whole
 * screen. It doesn't block reading or clicking; a photo or screenshot of a question shows
 * whose account it came from (discourages leaking questions, traces leaks). Used on the
 * mock test screens, online and offline.
 */
export default function ExamWatermark() {
  const { currentUser } = useAuth();
  const code = (currentUser as any)?.candidateCode;
  const mark = currentUser ? `${currentUser.name}${code ? ` · ${code}` : ''}` : 'Mock Test Hub';
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none print:hidden">
      <div className="absolute -inset-1/2 flex flex-wrap content-start gap-x-24 gap-y-20 rotate-[-24deg] opacity-[0.06] dark:opacity-[0.08]">
        {Array.from({ length: 160 }, (_, i) => (
          <span key={i} className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">{mark}</span>
        ))}
      </div>
    </div>
  );
}
