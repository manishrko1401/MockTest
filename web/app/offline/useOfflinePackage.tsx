"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { isDesktopApp, offlineOpen, offlineAttempts, offlineAddAttempt, setDesktopExamMode, OfflineKind } from '../lib/desktopApp';
import { OfflineMockAttempt } from '../lib/offlineExam';
import { SiteHeader, SectionCard, btnPrimary, pageBg, container } from '../components/SiteUI';

// Opens a downloaded test (decrypted in memory by the app) for the /offline/* pages.

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string; expired?: boolean }
  | { status: 'ready'; id: string; payload: any; localAttempts: any[] };

/** An offline mock attempt in the shape the analysis page reads. */
export function toRecord(a: OfflineMockAttempt) {
  return {
    id: a.localId, testId: a.testId, title: a.title, score: a.score, maxScore: a.maxScore, accuracy: a.accuracy,
    durationSeconds: a.durationSeconds, status: 'COMPLETED', violations: a.violations,
    date: a.completedAt.slice(0, 10), startedAt: a.completedAt, completedAt: a.completedAt,
    createdAt: a.completedAt, updatedAt: a.completedAt, responses: a.responses, offline: true,
  };
}

export function useOfflinePackage(kind: OfflineKind) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id') || '';
    if (!isDesktopApp()) { setState({ status: 'error', message: 'Offline tests work in the Mock Test Hub Windows app.' }); return; }
    if (!id) { setState({ status: 'error', message: 'No test selected.' }); return; }
    (async () => {
      try {
        const payload = await offlineOpen(kind, id);
        const localAttempts = kind === 'mock' ? await offlineAttempts(kind, id) : [];
        setState({ status: 'ready', id, payload, localAttempts });
      } catch (e: any) {
        const msg = typeof e === 'string' ? e : e?.message || 'This test could not be opened.';
        setState(msg === 'EXPIRED'
          ? { status: 'error', expired: true, message: 'This download has expired. Connect to the internet and download the test again.' }
          : { status: 'error', message: msg });
      }
    })();
  }, [kind]);

  const addMockAttempt = useCallback(async (attempt: OfflineMockAttempt) => {
    if (state.status !== 'ready') return;
    await offlineAddAttempt('mock', state.id, attempt as unknown as Record<string, unknown>);
    setState(s => (s.status === 'ready' ? { ...s, localAttempts: [attempt, ...s.localAttempts] } : s));
  }, [state]);

  return { state, addMockAttempt };
}

export function OfflineMessage({ message, expired }: { message: string; expired?: boolean }) {
  const { language } = useAuth();
  const hi = language === 'hi';
  return (
    <div className={`min-h-screen flex flex-col ${pageBg}`}>
      <SiteHeader />
      <main className={`${container} w-full py-10 flex-1`}>
        <SectionCard title={<span className="inline-flex items-center gap-2">{expired ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <WifiOff className="h-4 w-4 text-slate-500" />}{hi ? 'ऑफ़लाइन टेस्ट' : 'Offline test'}</span>}>
          <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
          <Link href="/offline" className={`${btnPrimary} mt-4`}>{hi ? 'मेरे ऑफ़लाइन टेस्ट' : 'My offline tests'}</Link>
        </SectionCard>
      </main>
    </div>
  );
}

export function OfflineLoading() {
  return (
    <div className={`min-h-screen flex items-center justify-center ${pageBg}`}>
      <div className="h-8 w-8 border-2 border-[#1e4e79] border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
    </div>
  );
}

export const Fallback = () => <OfflineLoading />;
export const SuspenseWrap = ({ children }: { children: React.ReactNode }) => <React.Suspense fallback={<OfflineLoading />}>{children}</React.Suspense>;

/**
 * Protection for downloaded tests on screen: no selecting / copying / right-click / print /
 * save, hidden from screenshots and screen recording (app exam mode), and a faint watermark
 * with the student's name and candidate code (discourages phone photos, traces leaks).
 */
export function OfflineGuard({ screenshotBlock = true, children }: { screenshotBlock?: boolean; children: React.ReactNode }) {
  const { currentUser } = useAuth();
  useEffect(() => {
    const isField = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('input, textarea, [contenteditable="true"]');
    const block = (e: Event) => { if (!isField(e.target)) e.preventDefault(); };
    const keys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'u'].includes(k)) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a'].includes(k) && !isField(e.target)) e.preventDefault();
    };
    const events = ['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart'] as const;
    events.forEach(ev => document.addEventListener(ev, block));
    document.addEventListener('keydown', keys, true);
    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    if (screenshotBlock) setDesktopExamMode(true);
    return () => {
      events.forEach(ev => document.removeEventListener(ev, block));
      document.removeEventListener('keydown', keys, true);
      document.body.style.userSelect = prevSelect;
      if (screenshotBlock) setDesktopExamMode(false);
    };
  }, [screenshotBlock]);

  const mark = currentUser ? `${currentUser.name}${(currentUser as any).candidateCode ? ` · ${(currentUser as any).candidateCode}` : ''}` : 'Mock Test Hub';
  return (
    <>
      {children}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none">
        <div className="absolute -inset-1/2 flex flex-wrap content-start gap-x-24 gap-y-20 rotate-[-24deg] opacity-[0.06] dark:opacity-[0.08]">
          {Array.from({ length: 160 }, (_, i) => (
            <span key={i} className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">{mark}</span>
          ))}
        </div>
      </div>
    </>
  );
}
