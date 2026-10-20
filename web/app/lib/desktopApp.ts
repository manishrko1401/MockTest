// -----------------------------------------------------------------------------
// The Mock Test Hub Windows app (desktop/, Tauri) shows this website in its own window and
// exposes window.__TAURI__ to it. These helpers do nothing in a normal browser.
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';

type TauriGlobal = {
  core?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
  notification?: {
    isPermissionGranted: () => Promise<boolean>;
    requestPermission: () => Promise<string>;
    sendNotification: (options: { title: string; body?: string }) => void;
  };
};

const tauri = (): TauriGlobal | undefined =>
  typeof window !== 'undefined' ? (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__ : undefined;

export const isDesktopApp = () => !!tauri()?.core;

/** For showing app-only buttons: false on the server and first render, then the real answer. */
export function useIsDesktopApp() {
  const [inApp, setInApp] = useState(false);
  useEffect(() => { setInApp(isDesktopApp()); }, []);
  return inApp;
}

/** "Exit App" buttons: closes the Windows app completely, after a confirmation. */
export function exitDesktopApp(isHindi = false) {
  const t = tauri();
  if (!t?.core) return;
  if (!window.confirm(isHindi ? 'क्या आप मॉक टेस्ट हब बंद करना चाहते हैं?' : 'Exit Mock Test Hub?')) return;
  t.core.invoke('exit_app').catch(() => { /* older app version */ });
}

/** Exam mode while a test is running: hidden from screenshots, refresh/back keys off (the app is always full screen). */
export function setDesktopExamMode(on: boolean) {
  const t = tauri();
  if (!t?.core) return;
  t.core.invoke('set_exam_mode', { on }).catch(() => { /* older app version */ });
}

/** A Windows notification (asks for permission the first time). */
export async function desktopNotify(title: string, body?: string) {
  const n = tauri()?.notification;
  if (!n) return;
  try {
    let granted = await n.isPermissionGranted();
    if (!granted) granted = (await n.requestPermission()) === 'granted';
    if (granted) n.sendNotification({ title, body });
  } catch { /* notifications unavailable */ }
}

// -----------------------------------------------------------------------------
// Offline tests (Windows app). Downloads are encrypted by the server for this PC and kept
// by the app (desktop/src-tauri/src/offline.rs); they are only opened in memory.
// -----------------------------------------------------------------------------

export type OfflineKind = 'mock' | 'typing';
export type OfflineItem = {
  kind: OfflineKind; id: string; title: string; subtitle?: string; questions?: number | null;
  version?: string; expiresAt: number; downloadedAt: number; sizeBytes: number; expired: boolean;
};

export const invoke = <T,>(cmd: string, args?: Record<string, unknown>) => {
  const t = tauri();
  if (!t?.core) return Promise.reject(new Error('Offline tests are available in the Mock Test Hub Windows app.'));
  return t.core.invoke(cmd, args) as Promise<T>;
};
const OFFLINE_CHANGED = 'mth-offline-changed';
export const announce = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(OFFLINE_CHANGED)); };

export const offlineList = () => invoke<OfflineItem[]>('offline_list').then(items => items.filter(it => it.kind === 'mock' || it.kind === 'typing')).catch(() => [] as OfflineItem[]);
export const offlineOpen = (kind: OfflineKind, id: string) => invoke<any>('offline_open', { kind, id });
export const offlineAttempts = (kind: OfflineKind, id: string) => invoke<any[]>('offline_attempts', { kind, id }).catch(() => [] as any[]);
export async function offlineDelete(kind: OfflineKind, id: string) { await invoke('offline_delete', { kind, id }); announce(); }

/** Saves an attempt finished offline (for offline analysis) and queues it for upload. */
export async function offlineAddAttempt(kind: OfflineKind, id: string, attempt: Record<string, unknown>) {
  await invoke('offline_add_attempt', { kind, id, attempt });
  announce();
}

/** Keeps the offline pages (and the code they need) stored on this PC. */
export function precacheOfflinePages() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/offline-sw.js').then(reg => {
    const sw = reg.active || reg.waiting || reg.installing;
    const urls = ['/offline', '/offline/bookmarks', '/offline/exam', '/offline/typing', '/offline/analysis', '/mathjax-config.js', 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'];
    const send = () => (reg.active || sw)?.postMessage({ type: 'precache', urls });
    if (reg.active) send(); else sw?.addEventListener('statechange', () => { if (reg.active) send(); });
  }).catch(() => { /* not available */ });
}

/** Downloads a test for offline use: encrypted by the server for this PC's key. */
export async function downloadForOffline(kind: OfflineKind, id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const devicePublicKey = await invoke<string>('offline_device_key');
    const res = await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'offline-download', data: { kind, id, devicePublicKey } }),
    });
    const json = await res.json();
    if (!json.success) return { ok: false, error: json.error || 'Download failed' };
    await invoke('offline_store', { kind, id, meta: json.meta, envelope: json.envelope });
    precacheOfflinePages();
    announce();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: typeof e === 'string' ? e : e?.message || 'Download failed' };
  }
}

/** Uploads results finished offline; the server re-scores mock tests with its own answer key. */
export async function syncOfflineResults(): Promise<{ uploaded: number; remaining: number }> {
  const outbox = await invoke<any[]>('outbox_list').catch(() => [] as any[]);
  const done: string[] = [];
  for (const item of outbox) {
    const a = item?.attempt || {};
    try {
      const action = item.kind === 'mock' ? 'add-attempt' : 'save-typing-attempt';
      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data: { ...a, source: 'web' } }),
      });
      const json = await res.json();
      // Uploaded, or permanently refused (don't retry those forever)
      if (json.success || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429)) done.push(a.localId);
    } catch { break; /* offline again */ }
  }
  if (done.length) { await invoke('outbox_remove', { localIds: done }).catch(() => {}); announce(); }
  return { uploaded: done.length, remaining: outbox.length - done.length };
}

export async function pendingOfflineResults(): Promise<number> {
  return (await invoke<any[]>('outbox_list').catch(() => [] as any[])).length;
}

/** Downloaded tests, kept up to date when something is downloaded / deleted / attempted. */
export function useOfflineIndex() {
  const inApp = useIsDesktopApp();
  const [items, setItems] = useState<OfflineItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!inApp) return;
    const refresh = () => { offlineList().then(list => { setItems(list); setLoaded(true); }); };
    refresh();
    window.addEventListener(OFFLINE_CHANGED, refresh);
    return () => window.removeEventListener(OFFLINE_CHANGED, refresh);
  }, [inApp]);
  return { inApp, items, loaded };
}
