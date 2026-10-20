"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Download, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useOfflineIndex, downloadForOffline, OfflineKind } from '../lib/desktopApp';

// "Download for offline" on a test tile — only inside the Windows app.
export default function OfflineDownloadButton({ kind, id, className = '' }: { kind: OfflineKind; id: string; className?: string }) {
  const { language, currentUser } = useAuth();
  const hi = language === 'hi';
  const { inApp, items } = useOfflineIndex();
  const [busy, setBusy] = useState(false);
  if (!inApp || !currentUser) return null;

  const saved = items.find(it => it.kind === kind && it.id === id);
  if (saved && !saved.expired && !busy) {
    return (
      <Link href="/offline" data-tour="offline-download" title={hi ? 'इस कंप्यूटर पर डाउनलोड है' : 'Downloaded to this computer'}
        className={`inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium text-[#1e7e34] dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 ${className}`}>
        <CheckCircle2 className="h-3.5 w-3.5" />{hi ? 'ऑफ़लाइन' : 'Offline'}
      </Link>
    );
  }

  const download = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    const r = await downloadForOffline(kind, id);
    setBusy(false);
    if (!r.ok) window.alert(r.error || (hi ? 'डाउनलोड नहीं हो सका।' : 'Download failed.'));
  };

  return (
    <button type="button" onClick={download} disabled={busy} data-tour="offline-download"
      title={hi ? 'बिना इंटरनेट हल करने के लिए डाउनलोड करें' : 'Download to attempt without internet'}
      className={`inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 disabled:opacity-60 cursor-pointer ${className}`}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {busy ? (hi ? 'सेव हो रहा है…' : 'Saving…') : saved?.expired ? (hi ? 'फिर डाउनलोड करें' : 'Download again') : (hi ? 'डाउनलोड' : 'Download')}
    </button>
  );
}
