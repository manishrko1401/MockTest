// -----------------------------------------------------------------------------
// Bookmarks in the Windows app, offline. When a question is bookmarked, its test's bookmarked
// questions are downloaded right away (encrypted for this PC, one package per test) for the
// offline Bookmarks page. Bookmarks made without internet are kept here and sent to the
// account when the internet is back.
//
// Only test / question ids are kept in localStorage; the questions themselves live in the
// app's encrypted store (desktop/src-tauri/src/offline.rs).
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { isDesktopApp, invoke, announce } from './desktopApp';

export type BookmarkEntry = { testId: string; questionId: string };
type QueuedToggle = BookmarkEntry & { bookmarked: boolean };
type Saved = Record<string, { qids: string[]; at: number }>;
type State = { userId: string; list: BookmarkEntry[]; queue: QueuedToggle[]; saved: Saved; recent?: (QueuedToggle & { at: number })[] };

const KEY = 'mth_offline_bookmarks_v1';
const REFRESH_MS = 12 * 60 * 60 * 1000; // renews the 30-day offline expiry
const CHANGED = 'mth-offline-bookmarks-changed';
/** Fired with the account's bookmark list after bookmarks made offline were uploaded. */
export const ACCOUNT_BOOKMARKS = 'mth-account-bookmarks';
const SAFE_ID = /^[A-Za-z0-9_-]{1,120}$/;
// Account data requested before an upload can arrive after it: uploaded changes are applied on
// top of any account list for this long
const RECENT_MS = 3 * 60 * 1000;

const empty = (userId = ''): State => ({ userId, list: [], queue: [], saved: {} });
const same = (a: BookmarkEntry, b: BookmarkEntry) => a.testId === b.testId && a.questionId === b.questionId;

let state: State | null = null;
let legacyRemoved = false;
const saving = new Set<string>();
const rerun = new Set<string>();

function read(): State {
  if (state) return state;
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '');
    state = s && typeof s.userId === 'string' ? { ...empty(s.userId), ...s } : empty();
  } catch { state = empty(); }
  return state!;
}
function write(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED));
}

function applyToggle(list: BookmarkEntry[], t: QueuedToggle) {
  const rest = list.filter(b => !same(b, t));
  return t.bookmarked ? [...rest, { testId: t.testId, questionId: t.questionId }] : rest;
}

/** This account's state; another account's saved bookmarks are removed from this PC. */
async function forUser(userId: string): Promise<State> {
  const s = read();
  if (s.userId === userId) return s;
  const old = Object.keys(s.saved);
  write(empty(userId));
  for (const testId of old) await invoke('offline_delete', { kind: 'bookmarks', id: testId }).catch(() => {});
  return state!;
}

const online = () => typeof navigator === 'undefined' || navigator.onLine;

/** Downloads (or removes) the offline copy of one test's bookmarked questions. */
async function syncTest(testId: string) {
  const s = read();
  const userId = s.userId;
  if (!userId || !SAFE_ID.test(testId)) return;
  if (saving.has(testId)) { rerun.add(testId); return; }
  const qids = s.list.filter(b => b.testId === testId).map(b => b.questionId);
  saving.add(testId);
  write({ ...read() });
  try {
    if (qids.length === 0) {
      await invoke('offline_delete', { kind: 'bookmarks', id: testId }).catch(() => {});
      const saved = { ...read().saved }; delete saved[testId];
      write({ ...read(), saved });
    } else if (online()) {
      const devicePublicKey = await invoke<string>('offline_device_key');
      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'offline-bookmarks', data: { devicePublicKey, testId, questionIds: qids } }),
      });
      const json = await res.json();
      if (json.success && read().userId === userId) {
        await invoke('offline_store', { kind: 'bookmarks', id: testId, meta: json.meta, envelope: json.envelope });
        write({ ...read(), saved: { ...read().saved, [testId]: { qids, at: Date.now() } } });
        announce();
      }
    }
  } catch { /* offline or older app version: tried again later */ }
  finally {
    saving.delete(testId);
    write({ ...read() });
    if (rerun.delete(testId)) syncTest(testId);
  }
}

/** The account's bookmark list from the server (pending offline changes stay on top). */
export async function setAccountBookmarks(userId: string, list: BookmarkEntry[]) {
  if (!isDesktopApp() || !userId) return;
  const s = await forUser(userId);
  const recent = (s.recent || []).filter(r => Date.now() - r.at < RECENT_MS);
  const next = [...recent, ...s.queue].reduce(applyToggle, [...list]);
  write({ ...s, recent, list: next });
  // An outdated list: the signed-in user gets the corrected one
  if (recent.length && JSON.stringify(next) !== JSON.stringify(list)) {
    window.dispatchEvent(new CustomEvent<BookmarkEntry[]>(ACCOUNT_BOOKMARKS, { detail: next }));
  }
  syncAllBookmarks(); // bookmarks made on another device / the website
}

/** A bookmark was added / removed on screen: save that test's questions for offline now. */
export async function bookmarkChanged(userId: string, testId: string, questionId: string, bookmarked: boolean) {
  if (!isDesktopApp() || !userId) return;
  const s = await forUser(userId);
  write({ ...s, list: applyToggle(s.list, { testId, questionId, bookmarked }) });
  syncTest(testId);
}

/**
 * The server didn't take the change. No internet: keep it and send it later. Refused by the
 * server: undo it here too.
 */
export async function bookmarkNotSaved(userId: string, testId: string, questionId: string, bookmarked: boolean, noInternet: boolean) {
  if (!isDesktopApp() || !userId) return;
  const s = await forUser(userId);
  if (noInternet) {
    write({ ...s, queue: [...s.queue.filter(q => !same(q, { testId, questionId })), { testId, questionId, bookmarked }] });
  } else {
    write({ ...s, list: applyToggle(s.list, { testId, questionId, bookmarked: !bookmarked }) });
    syncTest(testId);
  }
}

/** Sends bookmarks made without internet to the account. */
async function flushQueue() {
  const s = read();
  let accountList: BookmarkEntry[] | null = null;
  for (const t of s.queue) {
    try {
      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-bookmark', data: { userId: s.userId, testId: t.testId, questionId: t.questionId, bookmarked: t.bookmarked } }),
      });
      const json = await res.json().catch(() => ({}));
      if (!json.success && (res.status < 400 || res.status >= 500 || res.status === 401 || res.status === 429)) break;
      if (json.success && Array.isArray(json.bookmarks)) accountList = json.bookmarks;
      const cur = read();
      write({ ...cur, queue: cur.queue.filter(q => !(same(q, t) && q.bookmarked === t.bookmarked)), recent: [...(cur.recent || []), { ...t, at: Date.now() }] });
    } catch { break; /* offline again */ }
  }
  if (accountList) {
    // The account's list after the upload is the truth; the signed-in user is updated with it
    const list = read().queue.reduce(applyToggle, accountList);
    write({ ...read(), list });
    window.dispatchEvent(new CustomEvent<BookmarkEntry[]>(ACCOUNT_BOOKMARKS, { detail: list }));
  }
}

let syncing = false;
let syncAgain = false;
export async function syncAllBookmarks() {
  if (!isDesktopApp() || !read().userId || !online()) return;
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  try { await syncAllOnce(); } finally { syncing = false; }
  if (syncAgain) { syncAgain = false; syncAllBookmarks(); }
}

async function syncAllOnce() {
  await flushQueue();
  if (!legacyRemoved) { legacyRemoved = true; await invoke('offline_delete', { kind: 'bookmarks', id: 'all' }).catch(() => {}); } // earlier single-package format
  const s = read();
  const tests = [...new Set(s.list.map(b => b.testId))];
  for (const testId of tests) {
    if (saving.has(testId)) continue; // being downloaded right now
    const want = s.list.filter(b => b.testId === testId).map(b => b.questionId).join(',');
    const have = s.saved[testId];
    if (!have || have.qids.join(',') !== want || Date.now() - have.at > REFRESH_MS) await syncTest(testId);
  }
  for (const testId of Object.keys(s.saved)) if (!tests.includes(testId)) await syncTest(testId);
}

/** The bookmark list kept on this PC (with changes made offline) and what is saved. */
export function useOfflineBookmarks() {
  const [snap, setSnap] = useState<{ state: State; saving: string[] }>(() => ({ state: empty(), saving: [] }));
  useEffect(() => {
    const update = () => setSnap({ state: read(), saving: [...saving] });
    update();
    window.addEventListener(CHANGED, update);
    return () => window.removeEventListener(CHANGED, update);
  }, []);
  return snap;
}

export type OfflineSaveStatus = 'saved' | 'saving' | 'waiting' | null;

/** For the Bookmark button in the app: is this question saved for offline use yet? */
export function offlineSaveStatus(snap: { state: State; saving: string[] }, testId: string, questionId: string, downloadedTest: boolean): OfflineSaveStatus {
  if (!snap.state.list.some(b => b.testId === testId && b.questionId === questionId)) return null;
  if (snap.saving.includes(testId)) return 'saving';
  if (snap.state.saved[testId]?.qids.includes(questionId) || downloadedTest) return 'saved';
  return 'waiting';
}

export const openBookmarkPackage = (testId: string) => invoke<any>('offline_open', { kind: 'bookmarks', id: testId });
