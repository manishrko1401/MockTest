"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { isDesktopApp, desktopAppVersion } from '../lib/desktopApp';

// -----------------------------------------------------------------------------
// Tells the server the signed-in student is here and what they are doing (admin → Live now;
// friends see them online). Every minute while the tab is visible, on every page change,
// "away" when the tab is hidden and "left" when it closes. Pages with more to say (the exam,
// a result, a typing test, a notice) call setPresenceActivity().
// -----------------------------------------------------------------------------

const PRESENCE_EVENT = 'mth:presence';
let pageActivity: { path: string; text: string } | null = null;

/** A page's own description ("Taking SSC CGL Full Test 1 · Q23 of 100"); null to use the default. */
export function setPresenceActivity(text: string | null) {
  if (typeof window === 'undefined') return;
  pageActivity = text ? { path: window.location.pathname, text } : null;
  window.dispatchEvent(new Event(PRESENCE_EVENT));
}

const words = (s: string) => decodeURIComponent(s).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase());

/** The page in words, from its address. */
function describePath(path: string): string {
  const p = path.replace(/\/+$/, '') || '/';
  const seg = p.split('/').filter(Boolean);
  if (p === '/') return 'Home';
  switch (seg[0]) {
    case 'mock-tests': return seg.length > 1 ? `Test Series › ${seg.slice(1).map(words).join(' › ')}` : 'Test Series';
    case 'exam': return seg[2] === 'analysis' ? `Viewing result: ${words(seg[1])}` : `Taking a test: ${words(seg[1])}`;
    case 'typing-test': return seg[1] === 'category' ? `Typing tests › ${words(seg[2] || '')}` : seg[1] ? `Typing test: ${words(seg[1])}` : 'Typing tests';
    case 'updates': return seg[1] ? 'Reading a notice' : 'Notices';
    case 'friends': return seg[1] ? `With Friends: room ${seg[1].toUpperCase()}` : 'With Friends';
    case 'planner': return 'Study Planner';
    case 'locker': return 'Document Locker';
    case 'profile': return seg[1] === 'tracked-jobs' ? 'Saved jobs' : 'Profile';
    case 'referrals': return 'Refer & earn';
    case 'offline': return seg[1] ? `Offline: ${words(seg[1])}` : 'Offline downloads';
    case 'admin': return 'Admin panel';
    case 'auth': return 'Sign in page';
    case 'download': return 'Download app page';
    default: return words(seg.join(' › '));
  }
}

export default function PresenceReporter() {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const userId = currentUser?.id;
  const sendRef = useRef<(state?: 'active' | 'away' | 'left') => void>(() => {});

  useEffect(() => {
    if (!userId) return;
    // The server tells computer from phone by the browser; the Windows app says so itself
    const inWindowsApp = isDesktopApp();
    let appVersion: string | null = null;
    if (inWindowsApp) desktopAppVersion().then(v => { appVersion = v; });

    const activity = () => {
      const path = window.location.pathname;
      return pageActivity && pageActivity.path === path ? pageActivity.text : describePath(path);
    };
    const body = (state: string) => JSON.stringify({
      action: 'ping',
      data: { userId, state, activity: activity(), ...(inWindowsApp ? { platform: 'windows', version: appVersion } : { platform: 'web' }) },
    });
    const send = (state: 'active' | 'away' | 'left' = document.visibilityState === 'visible' ? 'active' : 'away') => {
      if (state === 'left') {
        // The page is closing: a beacon still gets through
        try {
          if (navigator.sendBeacon?.('/api/db', new Blob([body(state)], { type: 'application/json' }))) return;
        } catch { /* fall back to fetch */ }
      }
      fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(state), keepalive: true }).catch(() => {});
    };
    sendRef.current = send;

    send();
    const onVisibility = () => send();
    const onLeave = () => send('left');
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const onActivity = () => { if (debounce) clearTimeout(debounce); debounce = setTimeout(() => send(), 1500); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onLeave);
    window.addEventListener(PRESENCE_EVENT, onActivity);
    // Every minute while the tab is visible (the server keeps someone online for 2 minutes)
    const heartbeat = setInterval(() => { if (document.visibilityState === 'visible') send('active'); }, 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener(PRESENCE_EVENT, onActivity);
      clearInterval(heartbeat);
      if (debounce) clearTimeout(debounce);
      sendRef.current = () => {};
    };
  }, [userId]);

  // A new page: say so straight away (a page's own description replaces this a moment later)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    sendRef.current();
  }, [pathname]);

  return null;
}
