"use client";

import React from 'react';
import { Check, CloudOff, Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useOfflineIndex } from '../lib/desktopApp';
import { useOfflineBookmarks, offlineSaveStatus } from '../lib/offlineBookmarks';

// Next to the Bookmark button in the Windows app: shows that a bookmarked question is being /
// has been saved for the offline Bookmarks page. Nothing in a normal browser.
export default function OfflineBookmarkBadge({ testId, questionId }: { testId: string; questionId: string }) {
  const { language } = useAuth();
  const hi = language === 'hi';
  const { inApp, items } = useOfflineIndex();
  const snap = useOfflineBookmarks();
  if (!inApp) return null;
  const downloaded = items.some(it => it.kind === 'mock' && it.id === testId && !it.expired);
  const status = offlineSaveStatus(snap, testId, questionId, downloaded);
  if (!status) return null;

  const view = {
    saving: { icon: <Loader2 className="h-3 w-3 animate-spin" />, text: hi ? 'ऑफ़लाइन सेव हो रहा है…' : 'Saving offline…', tone: 'text-slate-500 dark:text-slate-400' },
    saved: { icon: <Check className="h-3 w-3" />, text: hi ? 'ऑफ़लाइन सेव' : 'Saved offline', tone: 'text-[#1e7e34] dark:text-green-400' },
    waiting: { icon: <CloudOff className="h-3 w-3" />, text: hi ? 'इंटरनेट आने पर ऑफ़लाइन सेव होगा' : 'Saves offline when online', tone: 'text-amber-700 dark:text-amber-400' },
  }[status];

  return (
    <span role="status" className={`inline-flex items-center gap-1 text-[10px] font-semibold ${view.tone}`}>
      {view.icon}{view.text}
    </span>
  );
}
