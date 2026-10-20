"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Plus, Check, Trash2, Pencil, Clock, Repeat, Flag, ChevronLeft, ChevronRight, Target, Flame, GraduationCap,
  ListChecks, X, ExternalLink, BookOpen, Award, Keyboard, RotateCcw, Newspaper, StickyNote, CalendarDays, AlertCircle, BookOpenCheck,
} from 'lucide-react';
import SyllabusTracker from './SyllabusTracker';
import { useAuth } from '../AuthContext';
import { SiteHeader, SiteFooter, PageTitle, SectionCard, StatusBadge, Field, btnPrimary, btnSecondary, inputCls, pageBg, container } from '../components/SiteUI';
import {
  PlannerData, PlannerTask, PlannerExam, PlannerTargets, ChecklistItem, Syllabus, SyllabusSubject, syllabusCounts, percent,
  localDay, addDays, weekdayOf, daysBetween, isRepeating, isDone, tasksForDay, checkinKey, targetStreak,
} from '../lib/plannerShared';

// -----------------------------------------------------------------------------
// Study Planner: to-do tasks (today / dated / repeating, with checklists), history,
// exam countdowns, daily mock / typing test targets that fill in from real attempts,
// and a syllabus tracker (subjects -> chapters, with revision tracking).
// /planner#syllabus opens the syllabus view.
// Saved to the account (app/lib/planner.ts), so the website and the Windows app match.
// -----------------------------------------------------------------------------

type Draft = {
  id?: string; title: string; notes: string; category: PlannerTask['category']; priority: PlannerTask['priority'];
  dueDate: string; dueTime: string; repeatDays: number[]; repeatUntil: string; checklist: ChecklistItem[];
};

const CATEGORY_META: Record<PlannerTask['category'], { en: string; hi: string; icon: React.ElementType; cls: string }> = {
  study: { en: 'Study', hi: 'पढ़ाई', icon: BookOpen, cls: 'text-blue-700 bg-blue-50 ring-blue-600/20 dark:text-blue-300 dark:bg-blue-950/40 dark:ring-blue-500/30' },
  mock_test: { en: 'Mock test', hi: 'मॉक टेस्ट', icon: Award, cls: 'text-orange-700 bg-orange-50 ring-orange-600/20 dark:text-orange-300 dark:bg-orange-950/40 dark:ring-orange-500/30' },
  typing: { en: 'Typing', hi: 'टाइपिंग', icon: Keyboard, cls: 'text-indigo-700 bg-indigo-50 ring-indigo-600/20 dark:text-indigo-300 dark:bg-indigo-950/40 dark:ring-indigo-500/30' },
  revision: { en: 'Revision', hi: 'रिवीजन', icon: RotateCcw, cls: 'text-emerald-700 bg-emerald-50 ring-emerald-600/20 dark:text-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-500/30' },
  current_affairs: { en: 'Current affairs', hi: 'करेंट अफेयर्स', icon: Newspaper, cls: 'text-purple-700 bg-purple-50 ring-purple-600/20 dark:text-purple-300 dark:bg-purple-950/40 dark:ring-purple-500/30' },
  other: { en: 'Other', hi: 'अन्य', icon: StickyNote, cls: 'text-slate-600 bg-slate-50 ring-slate-500/20 dark:text-slate-300 dark:bg-slate-800 dark:ring-slate-600/40' },
};
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_HI = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

async function call<T = any>(action: string, data: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || 'Something went wrong. Please try again.');
  return json;
}

const sortTasks = (day: string, checkins: Set<string>) => (a: PlannerTask, b: PlannerTask) => {
  const da = isDone(a, day, checkins), db = isDone(b, day, checkins);
  if (da !== db) return da ? 1 : -1;
  if ((a.dueTime || '99') !== (b.dueTime || '99')) return (a.dueTime || '99') < (b.dueTime || '99') ? -1 : 1;
  if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  return a.createdAt < b.createdAt ? -1 : 1;
};

export default function PlannerPage() {
  const { currentUser, language } = useAuth();
  const isHindi = language === 'hi';
  const L = (en: string, hi: string) => (isHindi ? hi : en);
  const weekdays = isHindi ? WEEKDAYS_HI : WEEKDAYS_EN;
  const fmtDay = useCallback((day: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', { ...opts, timeZone: 'UTC' }), [isHindi]);

  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<PlannerData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<'today' | 'upcoming' | 'history'>('today');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => localDay().slice(0, 7));
  const [historyRange, setHistoryRange] = useState(30);
  const [quick, setQuick] = useState('');
  const [editor, setEditor] = useState<Draft | null>(null);
  const [examEditor, setExamEditor] = useState<PlannerExam | { id?: undefined; name: string; examDate: string; notes: string } | null>(null);
  const [targetsDraft, setTargetsDraft] = useState<PlannerTargets | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'tasks' | 'syllabus'>('tasks');

  const today = localDay();
  useEffect(() => {
    setMounted(true);
    if (window.location.hash === '#syllabus') setView('syllabus');
  }, []);
  const switchView = (v: 'tasks' | 'syllabus') => {
    setView(v);
    try { window.history.replaceState(null, '', v === 'syllabus' ? '#syllabus' : window.location.pathname); } catch { /* ignore */ }
  };

  const load = useCallback(async () => {
    try {
      const json = await call<PlannerData & { success: boolean }>('planner-get', { today: localDay(), tzOffset: new Date().getTimezoneOffset() });
      setData(json);
      setLoadError('');
    } catch (e: any) {
      setLoadError(e.message);
    }
  }, []);
  useEffect(() => { if (currentUser) load(); }, [currentUser?.id, load]);
  // Refresh when coming back to the tab (a test may have been completed meanwhile)
  // ---------- syllabus saving: each change is saved ~0.6s after the last click, one request at a time ----------
  const syllabusTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const syllabusLatest = useRef<Record<string, Syllabus>>({});
  const syllabusChain = useRef<Promise<unknown>>(Promise.resolve());
  const sendSyllabus = useCallback((id: string, keepalive = false) => {
    clearTimeout(syllabusTimers.current[id]);
    delete syllabusTimers.current[id];
    const latest = syllabusLatest.current[id];
    if (!latest) return syllabusChain.current;
    const body = JSON.stringify({ action: 'planner-save-syllabus', data: { syllabus: latest } });
    const send = () => fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: keepalive && body.length < 60000 })
      .then(r => r.json()).then(j => { if (!j.success) throw new Error(j.error); });
    syllabusChain.current = syllabusChain.current.then(send).catch((e) => { setNotice(e?.message || 'Could not save the syllabus.'); setTimeout(() => setNotice(''), 4000); });
    return syllabusChain.current;
  }, []);
  const flushSyllabi = useCallback((keepalive = false) => Promise.all(Object.keys(syllabusTimers.current).map(id => sendSyllabus(id, keepalive))), [sendSyllabus]);

  // Back on the tab: save pending changes first, then refresh (a test may have been finished meanwhile)
  useEffect(() => {
    const onVisibility = async () => {
      if (!currentUser) return;
      if (document.visibilityState === 'hidden') { flushSyllabi(true); return; }
      await flushSyllabi();
      load();
    };
    const onLeave = () => { flushSyllabi(true); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onLeave);
    return () => { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', onLeave); onLeave(); };
  }, [currentUser?.id, load, flushSyllabi]);

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 4000); };
  const fail = (e: any) => { flash(e?.message || L('Something went wrong.', 'कुछ गलत हो गया।')); load(); };

  const tasks = data?.tasks || [];
  const checkins = useMemo(() => new Set((data?.checkins || []).map(c => checkinKey(c.taskId, c.day))), [data?.checkins]);

  // ---------- views ----------
  const todayList = useMemo(() => [...tasksForDay(tasks, today), ...tasks.filter(t => !isRepeating(t) && !t.dueDate)].sort(sortTasks(today, checkins)), [tasks, today, checkins]);
  const overdue = useMemo(() => tasks.filter(t => !isRepeating(t) && t.dueDate && t.dueDate < today && !t.doneAt).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1)), [tasks, today]);
  const upcomingGroups = useMemo(() => {
    const byDay = new Map<string, PlannerTask[]>();
    for (const t of tasks) if (!isRepeating(t) && t.dueDate && t.dueDate > today) (byDay.get(t.dueDate) || byDay.set(t.dueDate, []).get(t.dueDate)!).push(t);
    return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, list]) => ({ day, list: list.sort(sortTasks(day, checkins)) }));
  }, [tasks, today, checkins]);
  const routines = useMemo(() => tasks.filter(isRepeating).sort((a, b) => (a.dueTime || '99').localeCompare(b.dueTime || '99')), [tasks]);
  const selectedList = useMemo(() => {
    if (!selectedDay) return [];
    const list = tasksForDay(tasks, selectedDay);
    if (selectedDay === today) list.push(...tasks.filter(t => !isRepeating(t) && !t.dueDate));
    return list.sort(sortTasks(selectedDay, checkins));
  }, [tasks, selectedDay, today, checkins]);

  const history = useMemo(() => {
    const doneDayOf = (iso: string) => localDay(new Date(iso));
    const days: { day: string; done: PlannerTask[]; missed: PlannerTask[] }[] = [];
    for (let i = 1; i <= historyRange; i++) {
      const day = addDays(today, -i);
      const done: PlannerTask[] = [], missed: PlannerTask[] = [];
      for (const t of tasks) {
        if (isRepeating(t)) {
          if (!tasksForDay([t], day).length || day < localDay(new Date(t.createdAt))) continue;
          (checkins.has(checkinKey(t.id, day)) ? done : missed).push(t);
        } else if (t.doneAt && doneDayOf(t.doneAt) === day) done.push(t);
        else if (!t.doneAt && t.dueDate === day) missed.push(t);
      }
      if (done.length || missed.length) days.push({ day, done, missed });
    }
    const doneCount = days.reduce((a, d) => a + d.done.length, 0);
    const missedCount = days.reduce((a, d) => a + d.missed.length, 0);
    return { days, doneCount, missedCount, rate: doneCount + missedCount ? Math.round((doneCount / (doneCount + missedCount)) * 100) : null };
  }, [tasks, checkins, today, historyRange]);

  const todayDone = todayList.filter(t => isDone(t, today, checkins)).length;
  const weekDone = useMemo(() => {
    const from = addDays(today, -6);
    const oneOff = tasks.filter(t => !isRepeating(t) && t.doneAt && localDay(new Date(t.doneAt)) >= from).length;
    return oneOff + (data?.checkins || []).filter(c => c.day >= from && c.day <= today).length;
  }, [tasks, data?.checkins, today]);

  const targets = data?.targets || { mockTestsPerDay: 0, typingTestsPerDay: 0, reminderTime: null };
  const todayActivity = data?.activity?.[today] || { mock: 0, typing: 0 };
  const streak = data ? targetStreak(data.activity, targets, today) : 0;
  const exams = data?.exams || [];
  const upcomingExams = exams.filter(e => e.examDate >= today);
  const pastExams = exams.length - upcomingExams.length;

  // ---------- actions ----------
  const patchTask = (task: PlannerTask) => setData(d => d && ({ ...d, tasks: d.tasks.some(t => t.id === task.id) ? d.tasks.map(t => (t.id === task.id ? task : t)) : [...d.tasks, task] }));

  const toggleDone = async (task: PlannerTask, day: string) => {
    const done = !isDone(task, day, checkins);
    setData(d => {
      if (!d) return d;
      if (isRepeating(task)) {
        const rest = d.checkins.filter(c => !(c.taskId === task.id && c.day === day));
        return { ...d, checkins: done ? [...rest, { taskId: task.id, day }] : rest };
      }
      return { ...d, tasks: d.tasks.map(t => (t.id === task.id ? { ...t, doneAt: done ? new Date().toISOString() : null } : t)) };
    });
    try { await call('planner-set-done', { id: task.id, done, day }); } catch (e) { fail(e); }
  };

  const saveDraft = async (draft: Draft) => {
    setBusy(true);
    try {
      const repeating = draft.repeatDays.length > 0;
      const json = await call<{ task: PlannerTask }>('planner-save-task', {
        task: {
          ...draft,
          dueDate: draft.dueDate || null,
          dueTime: draft.dueTime || null,
          repeatUntil: repeating ? draft.repeatUntil || null : null,
          checklist: repeating ? [] : draft.checklist,
        },
      });
      patchTask(json.task);
      setEditor(null);
    } catch (e: any) { flash(e.message); } finally { setBusy(false); }
  };

  const toggleChecklist = async (task: PlannerTask, itemId: string) => {
    const updated = { ...task, checklist: task.checklist.map(c => (c.id === itemId ? { ...c, done: !c.done } : c)) };
    patchTask(updated);
    try { await call('planner-save-task', { task: updated }); } catch (e) { fail(e); }
  };

  const deleteTask = async (task: PlannerTask) => {
    if (!window.confirm(L(`Delete "${task.title}"?`, `"${task.title}" हटाएं?`))) return;
    setData(d => d && ({ ...d, tasks: d.tasks.filter(t => t.id !== task.id), checkins: d.checkins.filter(c => c.taskId !== task.id) }));
    try { await call('planner-delete-task', { id: task.id }); } catch (e) { fail(e); }
  };

  const updateSyllabus = (s: Syllabus) => {
    setData(d => d && ({ ...d, syllabi: d.syllabi.map(x => (x.id === s.id ? s : x)) }));
    syllabusLatest.current[s.id] = s;
    clearTimeout(syllabusTimers.current[s.id]);
    syllabusTimers.current[s.id] = setTimeout(() => sendSyllabus(s.id), 600);
  };
  const createSyllabus = async (name: string, examId: string | null, subjects: SyllabusSubject[]) => {
    try {
      const json = await call<{ syllabus: Syllabus }>('planner-save-syllabus', { syllabus: { name, examId, subjects } });
      setData(d => d && ({ ...d, syllabi: [...d.syllabi, json.syllabus] }));
      return json.syllabus;
    } catch (e: any) { flash(e.message); return null; }
  };
  const deleteSyllabus = async (s: Syllabus) => {
    if (!window.confirm(L(`Delete the syllabus "${s.name}"? Your chapter progress will be lost.`, `सिलेबस "${s.name}" हटाएं? आपकी अध्याय प्रगति हट जाएगी।`))) return;
    clearTimeout(syllabusTimers.current[s.id]);
    delete syllabusTimers.current[s.id];
    delete syllabusLatest.current[s.id];
    setData(d => d && ({ ...d, syllabi: d.syllabi.filter(x => x.id !== s.id) }));
    try { await call('planner-delete-syllabus', { id: s.id }); } catch (e) { fail(e); }
  };
  const addChapterTask = async (title: string) => {
    try {
      const json = await call<{ task: PlannerTask }>('planner-save-task', { task: { title, dueDate: today, category: 'study', priority: 'medium' } });
      patchTask(json.task);
      flash(L('Added to today’s tasks', 'आज के कार्यों में जोड़ा गया'));
    } catch (e) { fail(e); }
  };

  const quickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quick.trim();
    if (!title) return;
    setQuick('');
    try {
      const json = await call<{ task: PlannerTask }>('planner-save-task', { task: { title, dueDate: selectedDay || today, category: 'study', priority: 'medium' } });
      patchTask(json.task);
    } catch (err) { fail(err); }
  };

  const newDraft = (day: string | null): Draft => ({
    title: '', notes: '', category: 'study', priority: 'medium', dueDate: day || '', dueTime: '', repeatDays: [], repeatUntil: '', checklist: [],
  });
  const editDraft = (t: PlannerTask): Draft => ({
    id: t.id, title: t.title, notes: t.notes, category: t.category, priority: t.priority, dueDate: t.dueDate || '', dueTime: t.dueTime || '',
    repeatDays: [...t.repeatDays], repeatUntil: t.repeatUntil || '', checklist: t.checklist.map(c => ({ ...c })),
  });

  const saveExam = async () => {
    if (!examEditor) return;
    setBusy(true);
    try {
      const json = await call<{ exam: PlannerExam }>('planner-save-exam', { exam: examEditor });
      setData(d => d && ({ ...d, exams: [...d.exams.filter(x => x.id !== json.exam.id), json.exam].sort((a, b) => (a.examDate < b.examDate ? -1 : 1)) }));
      setExamEditor(null);
    } catch (e: any) { flash(e.message); } finally { setBusy(false); }
  };
  const deleteExam = async (exam: PlannerExam) => {
    if (!window.confirm(L(`Remove "${exam.name}"?`, `"${exam.name}" हटाएं?`))) return;
    setData(d => d && ({ ...d, exams: d.exams.filter(x => x.id !== exam.id) }));
    setExamEditor(null);
    try { await call('planner-delete-exam', { id: exam.id }); } catch (e) { fail(e); }
  };
  const saveTargets = async () => {
    if (!targetsDraft) return;
    setBusy(true);
    try {
      const json = await call<{ targets: PlannerTargets }>('planner-save-targets', targetsDraft);
      setData(d => d && ({ ...d, targets: json.targets }));
      setTargetsDraft(null);
    } catch (e: any) { flash(e.message); } finally { setBusy(false); }
  };

  // ---------- small pieces ----------
  const repeatLabel = (days: number[]) => {
    if (days.length === 7) return L('Every day', 'रोज़');
    if (days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d))) return L('Mon–Fri', 'सोम–शुक्र');
    return days.map(d => weekdays[d]).join(', ');
  };
  const daysLeftLabel = (n: number) =>
    n === 0 ? L('Today', 'आज') : n === 1 ? L('Tomorrow', 'कल') : L(`${n} days left`, `${n} दिन बाकी`);
  const relativeDay = (day: string) => {
    const n = daysBetween(today, day);
    if (n === 0) return L('Today', 'आज');
    if (n === 1) return L('Tomorrow', 'कल');
    if (n === -1) return L('Yesterday', 'कल (बीता)');
    return fmtDay(day);
  };

  const TaskItem = ({ task, day, showDate = false }: { task: PlannerTask; day: string; showDate?: boolean }) => {
    const done = isDone(task, day, checkins);
    const meta = CATEGORY_META[task.category];
    const Icon = meta.icon;
    const hasMore = !!task.notes || task.checklist.length > 0;
    const open = !!expanded[task.id];
    const isOverdue = !isRepeating(task) && !done && !!task.dueDate && task.dueDate < today;
    const checklistDone = task.checklist.filter(c => c.done).length;
    return (
      <li className="group flex items-start gap-3 px-4 sm:px-5 py-3">
        <button
          type="button"
          onClick={() => toggleDone(task, day)}
          aria-label={done ? L('Mark as not done', 'अधूरा करें') : L('Mark as done', 'पूरा करें')}
          className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
            done ? 'bg-[#1e7e34] border-[#1e7e34] text-white' : task.priority === 'high' ? 'border-red-500 hover:bg-red-50 dark:hover:bg-red-950/40' : 'border-slate-400 hover:border-[#1e4e79] hover:bg-[#eef3f8] dark:hover:bg-slate-800'
          }`}
        >
          {done && <Check className="h-3 w-3" strokeWidth={3} />}
        </button>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => hasMore && setExpanded(x => ({ ...x, [task.id]: !x[task.id] }))}
            className={`text-left text-sm font-medium break-words ${done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'} ${hasMore ? 'cursor-pointer hover:text-[#1e4e79] dark:hover:text-blue-300' : 'cursor-default'}`}
          >
            {task.title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ring-1 ring-inset text-[11px] font-medium ${meta.cls}`}><Icon className="h-3 w-3" />{L(meta.en, meta.hi)}</span>
            {task.priority === 'high' && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium"><Flag className="h-3 w-3" />{L('High', 'उच्च')}</span>}
            {task.priority === 'low' && <span className="inline-flex items-center gap-1"><Flag className="h-3 w-3" />{L('Low', 'निम्न')}</span>}
            {task.dueTime && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{task.dueTime}</span>}
            {isRepeating(task) && <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" />{repeatLabel(task.repeatDays)}</span>}
            {task.checklist.length > 0 && <span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3" />{checklistDone}/{task.checklist.length}</span>}
            {isOverdue && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium"><AlertCircle className="h-3 w-3" />{L('Due', 'नियत')} {fmtDay(task.dueDate!)}</span>}
            {showDate && !isOverdue && task.dueDate && !isRepeating(task) && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{relativeDay(task.dueDate)}</span>}
            {task.notes && !open && <span className="inline-flex items-center gap-1"><StickyNote className="h-3 w-3" />{L('Notes', 'नोट्स')}</span>}
          </div>
          {open && (
            <div className="mt-2 space-y-2">
              {task.notes && <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{task.notes}</p>}
              {task.checklist.length > 0 && (
                <ul className="space-y-1">
                  {task.checklist.map(c => (
                    <li key={c.id}>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                        <input type="checkbox" checked={c.done} onChange={() => toggleChecklist(task, c.id)} className="h-4 w-4 accent-[#1e4e79]" />
                        <span className={c.done ? 'line-through text-slate-400' : ''}>{c.text}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
          {task.link && !done && (
            <Link href={task.link} className="h-8 px-2 inline-flex items-center gap-1 rounded-md text-xs font-medium text-[#1e4e79] dark:text-blue-300 hover:bg-[#eef3f8] dark:hover:bg-slate-800">
              {L('Open', 'खोलें')}<ExternalLink className="h-3 w-3" />
            </Link>
          )}
          <button type="button" onClick={() => setEditor(editDraft(task))} aria-label={L('Edit task', 'संपादित करें')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-[#1e4e79] hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => deleteTask(task)} aria-label={L('Delete task', 'हटाएं')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </li>
    );
  };

  const TaskList = ({ list, day, showDate, empty }: { list: PlannerTask[]; day: string; showDate?: boolean; empty?: string }) =>
    list.length ? (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">{list.map(t => <React.Fragment key={`${t.id}|${day}`}>{TaskItem({ task: t, day, showDate })}</React.Fragment>)}</ul>
    ) : empty ? <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">{empty}</p> : null;

  const Bar = ({ value, max, tone = 'navy' }: { value: number; max: number; tone?: 'navy' | 'green' }) => (
    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${tone === 'green' || value >= max ? 'bg-[#1e7e34]' : 'bg-[#1e4e79]'}`} style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
    </div>
  );

  // ---------- calendar ----------
  const calendarCells = useMemo(() => {
    const first = `${calMonth}-01`;
    const start = addDays(first, -weekdayOf(first));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [calMonth]);
  const dayMarks = useMemo(() => {
    const marks: Record<string, { tasks: number; exam: boolean }> = {};
    for (const day of calendarCells) {
      const n = tasksForDay(tasks, day).length;
      if (n) marks[day] = { tasks: n, exam: false };
    }
    for (const e of exams) if (calendarCells.includes(e.examDate)) (marks[e.examDate] ||= { tasks: 0, exam: false }).exam = true;
    return marks;
  }, [calendarCells, tasks, exams]);
  const shiftMonth = (n: number) => {
    const [y, m] = calMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setCalMonth(d.toISOString().slice(0, 7));
  };

  // ---------- page ----------
  if (!mounted) return <div className={`min-h-screen ${pageBg}`} />;

  return (
    <div className={`min-h-screen flex flex-col ${pageBg}`}>
      <SiteHeader />
      <PageTitle
        crumbs={[{ label: L('Home', 'होम'), href: '/' }, { label: L('Study Planner', 'स्टडी प्लानर') }]}
        title={L('Study Planner', 'स्टडी प्लानर')}
        subtitle={L('Plan your daily study, hit your daily test targets and count down to your exams.', 'रोज़ की पढ़ाई की योजना बनाएं, दैनिक टेस्ट लक्ष्य पूरे करें और परीक्षा की उलटी गिनती देखें।')}
        actions={currentUser && view === 'tasks' ? <button type="button" className={btnPrimary} onClick={() => setEditor(newDraft(selectedDay || today))}><Plus className="h-4 w-4" />{L('New task', 'नया कार्य')}</button> : undefined}
      />

      <main className={`${container} w-full py-6 flex-1 space-y-5`}>
        {notice && (
          <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-md bg-slate-900 text-white text-sm shadow-lg">{notice}</div>
        )}

        {!currentUser ? (
          <SectionCard title={L('Log in to use the Study Planner', 'स्टडी प्लानर के लिए लॉग इन करें')} description={L('Your tasks, targets and exam dates are saved to your account, on the website and in the Windows app.', 'आपके कार्य, लक्ष्य और परीक्षा तिथियां आपके खाते में सेव रहती हैं।')}>
            <Link href="/auth?redirect=/planner" className={btnPrimary}>{L('Log in', 'लॉग इन')}</Link>
          </SectionCard>
        ) : loadError && !data ? (
          <SectionCard title={L('Could not load your planner', 'प्लानर लोड नहीं हो सका')} description={loadError}>
            <button type="button" className={btnSecondary} onClick={load}>{L('Try again', 'फिर से कोशिश करें')}</button>
          </SectionCard>
        ) : !data ? (
          <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-40 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />)}</div>
        ) : (
          <>
            {/* ───── Tasks / Syllabus ───── */}
            <div role="tablist" aria-label={L('Planner sections', 'प्लानर अनुभाग')} className="inline-flex p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {([['tasks', L('Tasks & targets', 'कार्य व लक्ष्य'), ListChecks], ['syllabus', L('Syllabus tracker', 'सिलेबस ट्रैकर'), BookOpenCheck]] as const).map(([id, label, Icon]) => (
                <button key={id} role="tab" type="button" aria-selected={view === id} onClick={() => switchView(id)}
                  className={`h-9 px-3 sm:px-4 rounded-md inline-flex items-center gap-2 text-sm font-medium cursor-pointer transition-colors ${view === id ? 'bg-[#1e4e79] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-[#eef3f8] dark:hover:bg-slate-800'}`}>
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </div>

            {view === 'syllabus' ? (
              <SyllabusTracker
                syllabi={data.syllabi || []}
                exams={exams}
                today={today}
                L={L}
                fmtDay={fmtDay}
                onUpdate={updateSyllabus}
                onCreate={createSyllabus}
                onDelete={deleteSyllabus}
                onAddTask={addChapterTask}
              />
            ) : (<>
            {/* ───── Summary cards ───── */}
            <div className="grid gap-4 md:grid-cols-3">
              <SectionCard title={L("Today's tasks", 'आज के कार्य')} bodyClass="px-5 py-4 space-y-3">
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">{todayDone}<span className="text-lg text-slate-400">/{todayList.length}</span></span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{fmtDay(today, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
                {Bar({ value: todayDone, max: todayList.length })}
                <div className="flex flex-wrap gap-2 text-xs">
                  {overdue.length > 0 && <StatusBadge tone="red">{L(`${overdue.length} overdue`, `${overdue.length} बकाया`)}</StatusBadge>}
                  <StatusBadge tone="slate">{L(`${weekDone} done this week`, `इस सप्ताह ${weekDone} पूरे`)}</StatusBadge>
                </div>
              </SectionCard>

              <SectionCard
                title={L('Daily test targets', 'दैनिक टेस्ट लक्ष्य')}
                action={<button type="button" onClick={() => setTargetsDraft({ ...targets })} className="text-xs font-medium text-[#1e4e79] dark:text-blue-300 hover:underline cursor-pointer">{L('Edit', 'बदलें')}</button>}
                bodyClass="px-5 py-4 space-y-3"
              >
                {!targets.mockTestsPerDay && !targets.typingTestsPerDay ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-300">{L('Set how many mock tests and typing tests you want to do every day. Progress fills in by itself.', 'तय करें कि रोज़ कितने मॉक टेस्ट और टाइपिंग टेस्ट देने हैं। प्रगति अपने आप भरती है।')}</p>
                    <button type="button" className={btnSecondary} onClick={() => setTargetsDraft({ mockTestsPerDay: 2, typingTestsPerDay: 1, reminderTime: '20:00' })}><Target className="h-4 w-4" />{L('Set a daily target', 'दैनिक लक्ष्य तय करें')}</button>
                  </div>
                ) : (
                  <>
                    {targets.mockTestsPerDay > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm"><Link href="/mock-tests" className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-[#1e4e79]"><Award className="h-4 w-4 text-orange-500" />{L('Mock tests', 'मॉक टेस्ट')}</Link><span className="tabular-nums font-medium">{Math.min(todayActivity.mock, 99)}/{targets.mockTestsPerDay}</span></div>
                        {Bar({ value: todayActivity.mock, max: targets.mockTestsPerDay })}
                      </div>
                    )}
                    {targets.typingTestsPerDay > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm"><Link href="/typing-test" className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-[#1e4e79]"><Keyboard className="h-4 w-4 text-indigo-500" />{L('Typing tests', 'टाइपिंग टेस्ट')}</Link><span className="tabular-nums font-medium">{Math.min(todayActivity.typing, 99)}/{targets.typingTestsPerDay}</span></div>
                        {Bar({ value: todayActivity.typing, max: targets.typingTestsPerDay })}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                      <Flame className={`h-4 w-4 ${streak ? 'text-orange-500' : 'text-slate-400'}`} />
                      {streak ? L(`${streak}-day streak`, `${streak} दिन की लगातार सफलता`) : L('Complete today’s target to start a streak', 'लगातार सफलता शुरू करने के लिए आज का लक्ष्य पूरा करें')}
                    </div>
                  </>
                )}
              </SectionCard>

              <SectionCard
                title={L('Exam countdown', 'परीक्षा उलटी गिनती')}
                action={<button type="button" onClick={() => setExamEditor({ name: '', examDate: '', notes: '' })} className="text-xs font-medium text-[#1e4e79] dark:text-blue-300 hover:underline cursor-pointer">{L('+ Add exam', '+ परीक्षा जोड़ें')}</button>}
                bodyClass="px-5 py-3"
              >
                {upcomingExams.length === 0 ? (
                  <div className="py-1 space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-300">{L('Add your exam dates to see how many days are left.', 'बचे हुए दिन देखने के लिए अपनी परीक्षा तिथियां जोड़ें।')}</p>
                    <button type="button" className={btnSecondary} onClick={() => setExamEditor({ name: '', examDate: '', notes: '' })}><GraduationCap className="h-4 w-4" />{L('Add exam date', 'परीक्षा तिथि जोड़ें')}</button>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {upcomingExams.slice(0, 3).map(e => {
                      const left = daysBetween(today, e.examDate);
                      return (
                        <li key={e.id}>
                          <button type="button" onClick={() => setExamEditor({ ...e })} className="w-full flex items-center gap-3 py-2 text-left cursor-pointer group">
                            <span className={`w-14 shrink-0 text-center rounded-md py-1 ${left <= 7 ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-[#eef3f8] text-[#1e4e79] dark:bg-slate-800 dark:text-blue-300'}`}>
                              <span className="block text-lg font-semibold tabular-nums leading-tight">{left}</span>
                              <span className="block text-[10px] uppercase tracking-wide">{L('days', 'दिन')}</span>
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-[#1e4e79] dark:group-hover:text-blue-300">{e.name}</span>
                              <span className="block text-xs text-slate-500 dark:text-slate-400">{fmtDay(e.examDate, { day: 'numeric', month: 'short', year: 'numeric' })} · {daysLeftLabel(left)}{(() => {
                                const sy = (data.syllabi || []).find(s => s.examId === e.id);
                                if (!sy) return null;
                                const c = syllabusCounts(sy);
                                return <> · <span className="text-[#1e7e34] dark:text-green-400 font-medium">{L(`${percent(c.done, c.total)}% syllabus`, `${percent(c.done, c.total)}% सिलेबस`)}</span></>;
                              })()}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                    {(upcomingExams.length > 3 || pastExams > 0) && (
                      <li className="pt-2 text-xs text-slate-500 dark:text-slate-400">
                        {upcomingExams.length > 3 && L(`+${upcomingExams.length - 3} more · `, `+${upcomingExams.length - 3} और · `)}
                        {pastExams > 0 && L(`${pastExams} finished`, `${pastExams} समाप्त`)}
                      </li>
                    )}
                  </ul>
                )}
              </SectionCard>
            </div>

            {/* ───── Tasks + calendar ───── */}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                {selectedDay ? (
                  <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{relativeDay(selectedDay)} · {fmtDay(selectedDay, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                    <button type="button" onClick={() => setSelectedDay(null)} className="text-xs font-medium text-[#1e4e79] dark:text-blue-300 hover:underline cursor-pointer">{L('Back to list', 'सूची पर लौटें')}</button>
                  </div>
                ) : (
                  <div role="tablist" className="px-2 sm:px-3 pt-2 border-b border-slate-200 dark:border-slate-800 flex gap-1 overflow-x-auto">
                    {([['today', L('Today', 'आज'), todayList.length - todayDone + overdue.length], ['upcoming', L('Upcoming', 'आगामी'), upcomingGroups.reduce((a, g) => a + g.list.length, 0)], ['history', L('History', 'इतिहास'), 0]] as const).map(([id, label, count]) => (
                      <button
                        key={id}
                        role="tab"
                        aria-selected={tab === id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={`px-3 sm:px-4 h-10 text-sm font-medium border-b-2 -mb-px whitespace-nowrap cursor-pointer ${tab === id ? 'border-[#1e4e79] text-[#1e4e79] dark:text-blue-300 dark:border-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                      >
                        {label}{count > 0 && <span className="ml-1.5 text-xs text-slate-400">{count}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {(tab !== 'history' || selectedDay) && (
                  <form onSubmit={quickAdd} className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex gap-2">
                    <input
                      value={quick}
                      onChange={(e) => setQuick(e.target.value)}
                      maxLength={200}
                      placeholder={selectedDay && selectedDay !== today ? L(`Add a task for ${fmtDay(selectedDay)}…`, `${fmtDay(selectedDay)} के लिए कार्य जोड़ें…`) : L('Add a task for today… (press Enter)', 'आज के लिए कार्य जोड़ें… (Enter दबाएं)')}
                      className={inputCls}
                      aria-label={L('New task', 'नया कार्य')}
                    />
                    <button type="button" onClick={() => setEditor({ ...newDraft(selectedDay || today), title: quick })} className={`${btnSecondary} shrink-0`} title={L('More options', 'अधिक विकल्प')}>
                      <Plus className="h-4 w-4" /><span className="hidden sm:inline">{L('Details', 'विवरण')}</span>
                    </button>
                  </form>
                )}

                {selectedDay ? (
                  TaskList({ list: selectedList, day: selectedDay, empty: L('Nothing planned for this day yet.', 'इस दिन के लिए अभी कुछ नहीं।') })
                ) : tab === 'today' ? (
                  <div>
                    {overdue.length > 0 && (
                      <>
                        <h3 className="px-4 sm:px-5 pt-3 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">{L('Overdue', 'बकाया')}</h3>
                        {TaskList({ list: overdue, day: today })}
                      </>
                    )}
                    {overdue.length > 0 && <h3 className="px-4 sm:px-5 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{L('Today', 'आज')}</h3>}
                    {TaskList({ list: todayList, day: today, empty: L('No tasks for today. Add one above — for example “Attempt 1 full mock test”.', 'आज के लिए कोई कार्य नहीं। ऊपर जोड़ें — जैसे “1 फुल मॉक टेस्ट दें”।') })}
                  </div>
                ) : tab === 'upcoming' ? (
                  <div>
                    {upcomingGroups.length === 0 && routines.length === 0 && <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">{L('No upcoming tasks. Plan ahead with “Details” and pick a date.', 'कोई आगामी कार्य नहीं। “विवरण” से तारीख चुनकर आगे की योजना बनाएं।')}</p>}
                    {upcomingGroups.map(g => (
                      <div key={g.day}>
                        <h3 className="px-4 sm:px-5 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{relativeDay(g.day)}{daysBetween(today, g.day) > 1 && ` · ${L(`in ${daysBetween(today, g.day)} days`, `${daysBetween(today, g.day)} दिन में`)}`}</h3>
                        {TaskList({ list: g.list, day: g.day })}
                      </div>
                    ))}
                    {routines.length > 0 && (
                      <div className="border-t border-slate-100 dark:border-slate-800 mt-2">
                        <h3 className="px-4 sm:px-5 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{L('Repeating routines', 'नियमित दिनचर्या')}</h3>
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                          {routines.map(t => (
                            <li key={t.id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{t.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  <Repeat className="inline h-3 w-3 mr-1" />{repeatLabel(t.repeatDays)}{t.dueTime && ` · ${t.dueTime}`} · {L('from', 'से')} {fmtDay(t.dueDate!)}{t.repeatUntil && ` ${L('to', 'तक')} ${fmtDay(t.repeatUntil)}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button type="button" onClick={() => setEditor(editDraft(t))} aria-label={L('Edit task', 'संपादित करें')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-[#1e4e79] hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => deleteTask(t)} aria-label={L('Delete task', 'हटाएं')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <StatusBadge tone="green">{L(`${history.doneCount} completed`, `${history.doneCount} पूरे`)}</StatusBadge>
                        <StatusBadge tone="red">{L(`${history.missedCount} missed`, `${history.missedCount} छूटे`)}</StatusBadge>
                        {history.rate !== null && <StatusBadge tone="blue">{L(`${history.rate}% completion`, `${history.rate}% पूर्णता`)}</StatusBadge>}
                      </div>
                      <select value={historyRange} onChange={(e) => setHistoryRange(Number(e.target.value))} className="h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" aria-label={L('History range', 'अवधि')}>
                        <option value={7}>{L('Last 7 days', 'पिछले 7 दिन')}</option>
                        <option value={30}>{L('Last 30 days', 'पिछले 30 दिन')}</option>
                        <option value={90}>{L('Last 90 days', 'पिछले 90 दिन')}</option>
                      </select>
                    </div>
                    {history.days.length === 0 ? (
                      <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">{L('Your completed and missed tasks will appear here day by day.', 'आपके पूरे और छूटे हुए कार्य यहां दिन के अनुसार दिखेंगे।')}</p>
                    ) : history.days.map(d => (
                      <div key={d.day} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                        <div className="px-4 sm:px-5 pt-3 flex items-center justify-between gap-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{relativeDay(d.day)}</h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{d.done.length}/{d.done.length + d.missed.length} {L('done', 'पूरे')}</span>
                        </div>
                        <ul className="px-4 sm:px-5 py-2 space-y-1">
                          {d.done.map(t => <li key={`d${t.id}`} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><Check className="h-3.5 w-3.5 text-[#1e7e34] shrink-0" /><span className="truncate">{t.title}</span></li>)}
                          {d.missed.map(t => <li key={`m${t.id}`} className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500"><X className="h-3.5 w-3.5 text-red-500 shrink-0" /><span className="truncate">{t.title}</span></li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Calendar */}
              <SectionCard bodyClass="p-4">
                <div className="flex items-center justify-between mb-3">
                  <button type="button" onClick={() => shiftMonth(-1)} aria-label={L('Previous month', 'पिछला महीना')} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{fmtDay(`${calMonth}-01`, { month: 'long', year: 'numeric' })}</span>
                  <button type="button" onClick={() => shiftMonth(1)} aria-label={L('Next month', 'अगला महीना')} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-7 text-center text-[11px] text-slate-500 dark:text-slate-400 mb-1">{weekdays.map(w => <span key={w}>{w.slice(0, isHindi ? 3 : 2)}</span>)}</div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map(day => {
                    const inMonth = day.startsWith(calMonth);
                    const mark = dayMarks[day];
                    const isToday = day === today, isSel = day === selectedDay;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(isSel ? null : day)}
                        aria-label={fmtDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}
                        aria-pressed={isSel}
                        className={`relative h-9 rounded-md text-sm tabular-nums cursor-pointer transition-colors ${
                          isSel ? 'bg-[#1e4e79] text-white' : isToday ? 'ring-1 ring-inset ring-[#1e4e79] text-[#1e4e79] dark:text-blue-300 font-semibold' : inMonth ? 'text-slate-800 dark:text-slate-200 hover:bg-[#eef3f8] dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-600 hover:bg-[#eef3f8] dark:hover:bg-slate-800'
                        }`}
                      >
                        {Number(day.slice(8))}
                        {mark && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {mark.tasks > 0 && <span className={`h-1 w-1 rounded-full ${isSel ? 'bg-white' : 'bg-[#1e4e79] dark:bg-blue-400'}`} />}
                            {mark.exam && <span className={`h-1 w-1 rounded-full ${isSel ? 'bg-white' : 'bg-red-500'}`} />}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#1e4e79] dark:bg-blue-400" />{L('Tasks', 'कार्य')}</span>
                  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />{L('Exam', 'परीक्षा')}</span>
                  <span className="ml-auto">{L('Tap a day to plan it', 'योजना के लिए दिन चुनें')}</span>
                </div>
              </SectionCard>
            </div>
            </>)}
          </>
        )}
      </main>

      {/* ───── Task editor ───── */}
      {editor && (
        <Modal title={editor.id ? L('Edit task', 'कार्य संपादित करें') : L('New task', 'नया कार्य')} onClose={() => setEditor(null)} closeLabel={L('Close', 'बंद करें')}
          footer={<>
            <button type="button" className={btnSecondary} onClick={() => setEditor(null)}>{L('Cancel', 'रद्द करें')}</button>
            <button type="button" className={btnPrimary} disabled={busy || !editor.title.trim() || (editor.repeatDays.length > 0 && !editor.dueDate)} onClick={() => saveDraft(editor)}>{L('Save task', 'सेव करें')}</button>
          </>}>
          <TaskEditor draft={editor} setDraft={setEditor} L={L} weekdays={weekdays} />
        </Modal>
      )}

      {/* ───── Exam editor ───── */}
      {examEditor && (
        <Modal title={examEditor.id ? L('Edit exam', 'परीक्षा संपादित करें') : L('Add exam', 'परीक्षा जोड़ें')} onClose={() => setExamEditor(null)} closeLabel={L('Close', 'बंद करें')}
          footer={<>
            {examEditor.id && <button type="button" className={`${btnSecondary} mr-auto !text-red-600`} onClick={() => deleteExam(examEditor as PlannerExam)}><Trash2 className="h-4 w-4" />{L('Remove', 'हटाएं')}</button>}
            <button type="button" className={btnSecondary} onClick={() => setExamEditor(null)}>{L('Cancel', 'रद्द करें')}</button>
            <button type="button" className={btnPrimary} disabled={busy || !examEditor.name.trim() || !examEditor.examDate} onClick={saveExam}>{L('Save', 'सेव करें')}</button>
          </>}>
          <Field label={L('Exam name', 'परीक्षा का नाम')}>
            <input autoFocus value={examEditor.name} maxLength={100} onChange={(e) => setExamEditor({ ...examEditor, name: e.target.value })} placeholder={L('e.g. SSC CGL Tier 1', 'जैसे SSC CGL टियर 1')} className={inputCls} />
          </Field>
          <Field label={L('Exam date', 'परीक्षा तिथि')}>
            <input type="date" value={examEditor.examDate} onChange={(e) => setExamEditor({ ...examEditor, examDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label={L('Notes (optional)', 'नोट्स (वैकल्पिक)')}>
            <textarea value={examEditor.notes} maxLength={500} rows={3} onChange={(e) => setExamEditor({ ...examEditor, notes: e.target.value })} placeholder={L('Centre, shift, documents to carry…', 'केंद्र, शिफ्ट, साथ ले जाने वाले दस्तावेज़…')} className={`${inputCls} h-auto py-2`} />
          </Field>
        </Modal>
      )}

      {/* ───── Targets editor ───── */}
      {targetsDraft && (
        <Modal title={L('Daily test targets', 'दैनिक टेस्ट लक्ष्य')} onClose={() => setTargetsDraft(null)} closeLabel={L('Close', 'बंद करें')}
          footer={<>
            <button type="button" className={btnSecondary} onClick={() => setTargetsDraft(null)}>{L('Cancel', 'रद्द करें')}</button>
            <button type="button" className={btnPrimary} disabled={busy} onClick={saveTargets}>{L('Save targets', 'लक्ष्य सेव करें')}</button>
          </>}>
          <p className="text-sm text-slate-600 dark:text-slate-300">{L('Every test you finish counts automatically. Set a target to 0 to turn it off.', 'आपका हर पूरा किया टेस्ट अपने आप गिना जाता है। लक्ष्य बंद करने के लिए 0 रखें।')}</p>
          {([['mockTestsPerDay', L('Mock tests per day', 'प्रतिदिन मॉक टेस्ट')], ['typingTestsPerDay', L('Typing tests per day', 'प्रतिदिन टाइपिंग टेस्ट')]] as const).map(([key, label]) => (
            <Field key={key} label={label}>
              <div className="flex items-center gap-2">
                <button type="button" className={`${btnSecondary} w-10 px-0`} aria-label="−" onClick={() => setTargetsDraft({ ...targetsDraft, [key]: Math.max(0, targetsDraft[key] - 1) })}>−</button>
                <input type="number" min={0} max={20} value={targetsDraft[key]} onChange={(e) => setTargetsDraft({ ...targetsDraft, [key]: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })} className={`${inputCls} w-20 text-center`} />
                <button type="button" className={`${btnSecondary} w-10 px-0`} aria-label="+" onClick={() => setTargetsDraft({ ...targetsDraft, [key]: Math.min(20, targetsDraft[key] + 1) })}>+</button>
              </div>
            </Field>
          ))}
          <Field label={L('Evening reminder (Windows app)', 'शाम का रिमाइंडर (विंडोज़ ऐप)')} hint={L('If the target isn’t done by this time, the Mock Test Hub app reminds you.', 'अगर इस समय तक लक्ष्य पूरा नहीं हुआ, तो ऐप आपको याद दिलाएगा।')}>
            <input type="time" value={targetsDraft.reminderTime || ''} onChange={(e) => setTargetsDraft({ ...targetsDraft, reminderTime: e.target.value || null })} className={`${inputCls} w-40`} />
          </Field>
        </Modal>
      )}

      <SiteFooter />
    </div>
  );
}

// ───── Modal ─────
function Modal({ title, onClose, footer, children, closeLabel }: { title: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode; closeLabel: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={title} className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-lg sm:rounded-lg shadow-xl max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4 overflow-y-auto">{children}</div>
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

// ───── Task editor body ─────
function TaskEditor({ draft, setDraft, L, weekdays }: { draft: Draft; setDraft: (d: Draft) => void; L: (en: string, hi: string) => string; weekdays: string[] }) {
  const [newItem, setNewItem] = useState('');
  const repeating = draft.repeatDays.length > 0;
  const repeatMode = !repeating ? 'never' : draft.repeatDays.length === 7 ? 'daily'
    : draft.repeatDays.length === 5 && [1, 2, 3, 4, 5].every(d => draft.repeatDays.includes(d)) ? 'weekdays' : 'custom';
  const setRepeat = (mode: string) => {
    const days = mode === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : mode === 'weekdays' ? [1, 2, 3, 4, 5] : mode === 'custom' ? (repeating ? draft.repeatDays : [weekdayOf(draft.dueDate || localDay())]) : [];
    setDraft({ ...draft, repeatDays: days, dueDate: days.length && !draft.dueDate ? localDay() : draft.dueDate });
  };
  const addItem = () => {
    const text = newItem.trim();
    if (!text || draft.checklist.length >= 30) return;
    setDraft({ ...draft, checklist: [...draft.checklist, { id: Math.random().toString(36).slice(2, 10), text: text.slice(0, 200), done: false }] });
    setNewItem('');
  };
  const segBtn = (active: boolean) => `h-9 px-3 text-sm border-y border-r first:border-l first:rounded-l-md last:rounded-r-md cursor-pointer ${active ? 'bg-[#1e4e79] border-[#1e4e79] text-white' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-[#eef3f8] dark:hover:bg-slate-800'}`;

  return (
    <>
      <Field label={L('Task', 'कार्य')}>
        <input autoFocus value={draft.title} maxLength={200} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={L('e.g. Attempt SSC CGL full mock test', 'जैसे SSC CGL फुल मॉक टेस्ट दें')} className={inputCls} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={L('Category', 'श्रेणी')}>
          <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Draft['category'] })} className={inputCls}>
            {(Object.keys(CATEGORY_META) as Draft['category'][]).map(c => <option key={c} value={c}>{L(CATEGORY_META[c].en, CATEGORY_META[c].hi)}</option>)}
          </select>
        </Field>
        <Field label={L('Priority', 'प्राथमिकता')}>
          <div className="flex">
            {(['low', 'medium', 'high'] as const).map(p => (
              <button key={p} type="button" aria-pressed={draft.priority === p} onClick={() => setDraft({ ...draft, priority: p })} className={`${segBtn(draft.priority === p)} flex-1`}>
                {p === 'low' ? L('Low', 'निम्न') : p === 'medium' ? L('Normal', 'सामान्य') : L('High', 'उच्च')}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={repeating ? L('Starts on', 'शुरुआत') : L('Date', 'तारीख')} hint={!repeating ? L('Leave empty for “anytime”.', '“कभी भी” के लिए खाली छोड़ें।') : undefined}>
          <input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} className={inputCls} />
        </Field>
        <Field label={L('Time (optional)', 'समय (वैकल्पिक)')} hint={L('The Windows app reminds you at this time.', 'विंडोज़ ऐप इस समय याद दिलाएगा।')}>
          <input type="time" value={draft.dueTime} onChange={(e) => setDraft({ ...draft, dueTime: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <Field label={L('Repeat', 'दोहराएं')}>
        <div className="flex flex-wrap">
          {([['never', L('Never', 'कभी नहीं')], ['daily', L('Every day', 'रोज़')], ['weekdays', L('Mon–Fri', 'सोम–शुक्र')], ['custom', L('Custom', 'चुनें')]] as const).map(([mode, label]) => (
            <button key={mode} type="button" aria-pressed={repeatMode === mode} onClick={() => setRepeat(mode)} className={segBtn(repeatMode === mode)}>{label}</button>
          ))}
        </div>
        {repeatMode === 'custom' && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {weekdays.map((w, i) => {
              const on = draft.repeatDays.includes(i);
              return (
                <button key={w} type="button" aria-pressed={on}
                  onClick={() => { const days = on ? draft.repeatDays.filter(d => d !== i) : [...draft.repeatDays, i].sort(); if (days.length) setDraft({ ...draft, repeatDays: days }); }}
                  className={`h-9 min-w-11 px-2 rounded-md text-sm border cursor-pointer ${on ? 'bg-[#1e4e79] border-[#1e4e79] text-white' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-[#eef3f8] dark:hover:bg-slate-800'}`}>
                  {w}
                </button>
              );
            })}
          </div>
        )}
      </Field>
      {repeating && (
        <Field label={L('Ends on (optional)', 'समाप्ति (वैकल्पिक)')} hint={L('For example, the day of your exam.', 'उदाहरण: आपकी परीक्षा का दिन।')}>
          <input type="date" value={draft.repeatUntil} min={draft.dueDate || undefined} onChange={(e) => setDraft({ ...draft, repeatUntil: e.target.value })} className={inputCls} />
        </Field>
      )}
      {!repeating && (
        <Field label={L('Checklist (optional)', 'चेकलिस्ट (वैकल्पिक)')}>
          {draft.checklist.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {draft.checklist.map(c => (
                <li key={c.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={c.done} onChange={() => setDraft({ ...draft, checklist: draft.checklist.map(x => (x.id === c.id ? { ...x, done: !x.done } : x)) })} className="h-4 w-4 accent-[#1e4e79]" aria-label={c.text} />
                  <input value={c.text} maxLength={200} onChange={(e) => setDraft({ ...draft, checklist: draft.checklist.map(x => (x.id === c.id ? { ...x, text: e.target.value } : x)) })} className={`${inputCls} h-8`} />
                  <button type="button" onClick={() => setDraft({ ...draft, checklist: draft.checklist.filter(x => x.id !== c.id) })} aria-label={L('Remove step', 'हटाएं')} className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input value={newItem} maxLength={200} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} placeholder={L('Add a step, e.g. “Chapter 3 notes”', 'चरण जोड़ें, जैसे “अध्याय 3 नोट्स”')} className={`${inputCls} h-9`} />
            <button type="button" onClick={addItem} className={`${btnSecondary} shrink-0`}><Plus className="h-4 w-4" /></button>
          </div>
        </Field>
      )}
      <Field label={L('Notes (optional)', 'नोट्स (वैकल्पिक)')}>
        <textarea value={draft.notes} maxLength={2000} rows={3} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className={`${inputCls} h-auto py-2`} />
      </Field>
    </>
  );
}
