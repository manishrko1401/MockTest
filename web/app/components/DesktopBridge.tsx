"use client";

import { useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { isDesktopApp, desktopNotify, precacheOfflinePages, syncOfflineResults } from '../lib/desktopApp';
import { setAccountBookmarks, syncAllBookmarks } from '../lib/offlineBookmarks';
import { PlannerData, localDay, tasksForDay, isDone, isRepeating, checkinKey, daysBetween } from '../lib/plannerShared';

// -----------------------------------------------------------------------------
// Only active inside the Mock Test Hub Windows app (it keeps running in the tray):
//   - new job notices → a Windows notification (checked every 30 minutes)
//   - saved jobs whose last date is within 3 days → a reminder, once a day per job
//   - Study Planner: task reminders at their time, a morning exam countdown, and an evening
//     nudge if the daily test target isn't done (all once per day)
// -----------------------------------------------------------------------------

const SEEN_KEY = 'desktop_seen_notice_ids';
const REMINDED_KEY = 'desktop_last_date_reminders';
const NOTICE_CHECK_MS = 30 * 60 * 1000;

const readJson = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
};
const writeJson = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full */ }
};

async function checkNewNotices(etagRef: { current: string | null }) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (etagRef.current) headers['If-None-Match'] = etagRef.current;
  const res = await fetch('/api/db', { method: 'POST', headers, cache: 'no-store', body: JSON.stringify({ action: 'bootstrap' }) });
  if (res.status === 304 || !res.ok) return;
  etagRef.current = res.headers.get('ETag');
  const data = await res.json();
  const notices: { id: string; title: string; category?: string }[] = (data.noticesList || []).filter((n: any) => n?.id && n.category !== 'testimonial');
  if (!notices.length) return;

  const seen = readJson<string[] | null>(SEEN_KEY, null);
  writeJson(SEEN_KEY, notices.map(n => n.id).slice(0, 2000));
  if (!seen) return; // first run: remember what exists, don't announce it
  const seenSet = new Set(seen);
  const fresh = notices.filter(n => !seenSet.has(n.id));
  if (fresh.length === 0) return;
  if (fresh.length <= 3) {
    for (const n of fresh) await desktopNotify('New notice', n.title);
  } else {
    await desktopNotify(`${fresh.length} new notices`, fresh.slice(0, 3).map(n => n.title).join(' · '));
  }
}

function remindLastDates(jobs: { noticeId: string; title: string; lastDate?: string; isApplied?: boolean }[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = today.toISOString().slice(0, 10);
  const reminded = readJson<Record<string, string>>(REMINDED_KEY, {});
  for (const job of jobs) {
    if (!job.lastDate || job.isApplied) continue;
    const last = new Date(job.lastDate);
    if (Number.isNaN(last.getTime())) continue;
    last.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((last.getTime() - today.getTime()) / 86400000);
    if (daysLeft < 0 || daysLeft > 3 || reminded[job.noticeId] === todayKey) continue;
    reminded[job.noticeId] = todayKey;
    desktopNotify(
      daysLeft === 0 ? 'Last date is today' : `Last date in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      job.title,
    );
  }
  writeJson(REMINDED_KEY, reminded);
}

const PLANNER_SENT_KEY = 'desktop_planner_reminders';

async function fetchPlanner(): Promise<PlannerData | null> {
  try {
    const res = await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'planner-get', data: { today: localDay(), tzOffset: new Date().getTimezoneOffset() } }),
    });
    const json = await res.json();
    return json.success ? json : null;
  } catch { return null; }
}

function plannerReminders(data: PlannerData) {
  const now = new Date();
  const today = localDay(now);
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const sent = readJson<Record<string, string>>(PLANNER_SENT_KEY, {});
  const once = (key: string, notify: () => void) => {
    if (sent[key]) return;
    sent[key] = today;
    notify();
  };

  // Tasks due now (a few minutes' grace, in case the computer was asleep at the exact minute)
  const checkins = new Set(data.checkins.map(c => checkinKey(c.taskId, c.day)));
  const todays = [...tasksForDay(data.tasks, today), ...data.tasks.filter(t => !isRepeating(t) && !t.dueDate)];
  for (const t of todays) {
    if (!t.dueTime || isDone(t, today, checkins) || t.dueTime > hhmm) continue;
    const [h, m] = t.dueTime.split(':').map(Number);
    if (now.getHours() * 60 + now.getMinutes() - (h * 60 + m) > 10) continue;
    once(`task|${t.id}|${today}`, () => desktopNotify(`Task: ${t.title}`, t.notes ? t.notes.slice(0, 120) : `Planned for ${t.dueTime}`));
  }

  // Morning exam countdown
  const upcoming = data.exams.filter(e => e.examDate >= today).slice(0, 2);
  if (now.getHours() >= 8 && upcoming.length) {
    once(`exams|${today}`, () => desktopNotify(
      'Exam countdown',
      upcoming.map(e => {
        const n = daysBetween(today, e.examDate);
        return `${e.name}: ${n === 0 ? 'today' : n === 1 ? 'tomorrow' : `${n} days left`}`;
      }).join(' · '),
    ));
  }

  // Evening target nudge
  const { mockTestsPerDay: m, typingTestsPerDay: ty, reminderTime } = data.targets;
  const done = data.activity[today] || { mock: 0, typing: 0 };
  if (reminderTime && hhmm >= reminderTime && (done.mock < m || done.typing < ty)) {
    const left = [m > done.mock ? `${m - done.mock} mock test${m - done.mock > 1 ? 's' : ''}` : '', ty > done.typing ? `${ty - done.typing} typing test${ty - done.typing > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ');
    once(`target|${today}`, () => desktopNotify('Daily target not done yet', `${left} left for today. You can still make it!`));
  }

  // Forget keys from earlier days
  for (const k of Object.keys(sent)) if (sent[k] !== today) delete sent[k];
  writeJson(PLANNER_SENT_KEY, sent);
}

export default function DesktopBridge() {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!isDesktopApp()) return;
    const etagRef = { current: null as string | null };
    const run = () => { checkNewNotices(etagRef).catch(() => { /* offline */ }); };
    run();
    const timer = setInterval(run, NOTICE_CHECK_MS);
    return () => clearInterval(timer);
  }, []);

  const trackedJobs = currentUser?.trackedJobs;
  useEffect(() => {
    if (!isDesktopApp() || !trackedJobs?.length) return;
    remindLastDates(trackedJobs);
    const timer = setInterval(() => remindLastDates(trackedJobs), 6 * 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [trackedJobs]);

  // Offline tests: keep the offline pages stored, and upload results finished offline
  // (now, every 2 minutes, and as soon as the internet comes back)
  const userId = currentUser?.id;
  useEffect(() => {
    if (!isDesktopApp() || !userId) return;
    precacheOfflinePages();
    const sync = () => { if (navigator.onLine) syncOfflineResults().catch(() => {}); };
    sync();
    const timer = setInterval(sync, 2 * 60 * 1000);
    window.addEventListener('online', sync);
    return () => { clearInterval(timer); window.removeEventListener('online', sync); };
  }, [userId]);

  // Bookmarked questions for the offline Bookmarks page. A new bookmark is downloaded the
  // moment it's made (AuthContext.toggleBookmark); this keeps the list in step, sends bookmarks
  // made offline, and catches up on start, every 10 minutes and when the internet is back.
  const bookmarks = currentUser?.bookmarkedQuestions;
  useEffect(() => {
    if (!isDesktopApp() || !userId) return;
    setAccountBookmarks(userId, bookmarks || []);
  }, [userId, bookmarks]);
  useEffect(() => {
    if (!isDesktopApp() || !userId) return;
    const sync = () => { syncAllBookmarks(); };
    const first = setTimeout(sync, 1500);
    const timer = setInterval(sync, 10 * 60 * 1000);
    window.addEventListener('online', sync);
    return () => { clearTimeout(first); clearInterval(timer); window.removeEventListener('online', sync); };
  }, [userId]);

  useEffect(() => {
    if (!isDesktopApp() || !userId) return;
    let data: PlannerData | null = null;
    let lastFetch = 0;
    const tick = async () => {
      // Refresh every 10 minutes (targets count tests done since)
      if (!data || Date.now() - lastFetch > 10 * 60 * 1000) {
        const fresh = await fetchPlanner();
        if (fresh) { data = fresh; lastFetch = Date.now(); }
      }
      if (data) plannerReminders(data);
    };
    tick();
    const timer = setInterval(tick, 30 * 1000);
    return () => clearInterval(timer);
  }, [userId]);

  return null;
}
