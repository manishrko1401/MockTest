"use client";

import React, { useMemo, useState } from 'react';
import {
  Plus, Check, Trash2, Pencil, ChevronDown, ChevronRight, Search, RotateCcw, CalendarPlus, X, BookOpenCheck, GraduationCap, Sparkles,
} from 'lucide-react';
import { SectionCard, StatusBadge, Field, btnPrimary, btnSecondary, inputCls } from '../components/SiteUI';
import {
  Syllabus, SyllabusSubject, SyllabusChapter, ChapterStatus, PlannerExam,
  chapterCounts, syllabusCounts, percent, revisionDue, daysBetween, newId, localDay,
} from '../lib/plannerShared';
import { SYLLABUS_TEMPLATES } from '../lib/syllabusTemplates';

// -----------------------------------------------------------------------------
// Syllabus tracker: syllabus → subjects → chapters. A chapter goes Not started →
// In progress → Completed with one click; finished chapters can be marked revised, and
// are flagged "Revise now" after 7 days without revision. Progress per subject and overall,
// with a daily pace when the syllabus is linked to an exam countdown.
// -----------------------------------------------------------------------------

type Filter = 'all' | 'todo' | 'doing' | 'done' | 'revise';
type Props = {
  syllabi: Syllabus[];
  exams: PlannerExam[];
  today: string;
  L: (en: string, hi: string) => string;
  fmtDay: (day: string, opts?: Intl.DateTimeFormatOptions) => string;
  onUpdate: (s: Syllabus) => void;
  onCreate: (name: string, examId: string | null, subjects: SyllabusSubject[]) => Promise<Syllabus | null>;
  onDelete: (s: Syllabus) => void;
  onAddTask: (title: string) => void;
};

const NEXT_STATUS: Record<ChapterStatus, ChapterStatus> = { todo: 'doing', doing: 'done', done: 'todo' };

export default function SyllabusTracker({ syllabi, exams, today, L, fmtDay, onUpdate, onCreate, onDelete, onAddTask }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [bulkFor, setBulkFor] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [newSubject, setNewSubject] = useState('');
  const [creator, setCreator] = useState<{ template: string; name: string; examId: string } | null>(null);
  const [metaEditor, setMetaEditor] = useState<{ name: string; examId: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const selected = syllabi.find(s => s.id === selectedId) || syllabi[0] || null;
  const now = Date.now();

  // ---------- editing helpers (every change saves automatically) ----------
  const update = (fn: (s: Syllabus) => Syllabus) => { if (selected) onUpdate(fn(selected)); };
  const updateSubject = (subjectId: string, fn: (sub: SyllabusSubject) => SyllabusSubject) =>
    update(s => ({ ...s, subjects: s.subjects.map(sub => (sub.id === subjectId ? fn(sub) : sub)) }));
  const updateChapter = (subjectId: string, chapterId: string, fn: (c: SyllabusChapter) => SyllabusChapter) =>
    updateSubject(subjectId, sub => ({ ...sub, chapters: sub.chapters.map(c => (c.id === chapterId ? fn(c) : c)) }));

  const cycleStatus = (subjectId: string, c: SyllabusChapter) => {
    const status = NEXT_STATUS[c.status];
    updateChapter(subjectId, c.id, ch => ({ ...ch, status, completedAt: status === 'done' ? new Date().toISOString() : null }));
  };
  const markRevised = (subjectId: string, c: SyllabusChapter) =>
    updateChapter(subjectId, c.id, ch => ({ ...ch, revisions: Math.min(99, ch.revisions + 1), revisedAt: new Date().toISOString() }));
  const addChapters = (subjectId: string) => {
    const names = bulkText.split('\n').map(n => n.trim().slice(0, 200)).filter(Boolean);
    if (!names.length) return;
    updateSubject(subjectId, sub => ({
      ...sub,
      chapters: [...sub.chapters, ...names.map(name => ({ id: newId(), name, status: 'todo' as const, revisions: 0, completedAt: null, revisedAt: null }))].slice(0, 300),
    }));
    setBulkText('');
    setBulkFor(null);
  };
  const addSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSubject.trim().slice(0, 100);
    if (!name || !selected) return;
    const id = newId();
    update(s => ({ ...s, subjects: [...s.subjects, { id, name, chapters: [] }] }));
    setNewSubject('');
    setBulkFor(id);
  };
  const commitRename = () => {
    if (!renaming) return;
    const value = renaming.value.trim();
    if (value && selected) {
      update(s => ({
        ...s,
        subjects: s.subjects.map(sub => sub.id === renaming.id
          ? { ...sub, name: value.slice(0, 100) }
          : { ...sub, chapters: sub.chapters.map(c => (c.id === renaming.id ? { ...c, name: value.slice(0, 200) } : c)) }),
      }));
    }
    setRenaming(null);
  };

  const createSyllabus = async () => {
    if (!creator || !creator.name.trim()) return;
    setCreating(true);
    const tpl = SYLLABUS_TEMPLATES.find(t => t.id === creator.template);
    const subjects: SyllabusSubject[] = tpl
      ? tpl.subjects.map(s => ({ id: newId(), name: s.name, chapters: s.chapters.map(name => ({ id: newId(), name, status: 'todo' as const, revisions: 0, completedAt: null, revisedAt: null })) }))
      : [];
    const created = await onCreate(creator.name.trim(), creator.examId || null, subjects);
    setCreating(false);
    if (created) { setSelectedId(created.id); setCreator(null); setFilter('all'); setQuery(''); }
  };

  const openCreator = (template = '') => {
    const tpl = SYLLABUS_TEMPLATES.find(t => t.id === template);
    const exam = tpl ? exams.find(e => e.examDate >= today && e.name.toLowerCase().includes(tpl.name.toLowerCase().split(' ').slice(0, 2).join(' '))) : undefined;
    setCreator({ template, name: tpl ? tpl.name : '', examId: exam?.id || '' });
  };

  // ---------- derived ----------
  const counts = selected ? syllabusCounts(selected) : null;
  const reviseCount = selected ? selected.subjects.reduce((a, s) => a + s.chapters.filter(c => revisionDue(c, now)).length, 0) : 0;
  const linkedExam = selected?.examId ? exams.find(e => e.id === selected.examId) : undefined;
  const daysLeft = linkedExam ? daysBetween(today, linkedExam.examDate) : null;
  const remaining = counts ? counts.total - counts.done : 0;

  const matches = (c: SyllabusChapter) => {
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'revise') return revisionDue(c, now);
    return filter === 'all' || c.status === filter;
  };
  const filtering = filter !== 'all' || !!query;

  const statusButton = (subjectId: string, c: SyllabusChapter) => {
    const label = c.status === 'done' ? L('Completed — click to reset', 'पूरा — रीसेट के लिए क्लिक करें')
      : c.status === 'doing' ? L('In progress — click when completed', 'जारी — पूरा होने पर क्लिक करें')
      : L('Not started — click to start', 'शुरू नहीं — शुरू करने के लिए क्लिक करें');
    return (
      <button
        type="button"
        onClick={() => cycleStatus(subjectId, c)}
        title={label}
        aria-label={`${c.name}: ${label}`}
        className={`h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
          c.status === 'done' ? 'bg-[#1e7e34] border-[#1e7e34] text-white'
            : c.status === 'doing' ? 'border-[#1e4e79] bg-[linear-gradient(90deg,#1e4e79_50%,transparent_50%)] dark:border-blue-400'
            : 'border-slate-300 dark:border-slate-600 hover:border-[#1e4e79] hover:bg-[#eef3f8] dark:hover:bg-slate-800'
        }`}
      >
        {c.status === 'done' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>
    );
  };

  const Progress = ({ done, doing, total, tall }: { done: number; doing: number; total: number; tall?: boolean }) => (
    <div className={`${tall ? 'h-3' : 'h-1.5'} rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex`} role="img" aria-label={`${percent(done, total)}%`}>
      <div className="bg-[#1e7e34] transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      <div className="bg-[#1e4e79]/40 dark:bg-blue-400/40 transition-all" style={{ width: `${total ? (doing / total) * 100 : 0}%` }} />
    </div>
  );

  // ---------- empty state ----------
  if (!syllabi.length && !creator) {
    return (
      <SectionCard
        title={L('Track your syllabus', 'अपना सिलेबस ट्रैक करें')}
        description={L('Add your exam’s subjects and chapters, then tick each chapter off as you finish it. Start from a ready-made syllabus or your own.', 'अपनी परीक्षा के विषय और अध्याय जोड़ें, फिर हर अध्याय पूरा होने पर उसे मार्क करें। तैयार सिलेबस से शुरू करें या अपना बनाएं।')}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SYLLABUS_TEMPLATES.map(t => {
            const n = t.subjects.reduce((a, s) => a + s.chapters.length, 0);
            return (
              <button key={t.id} type="button" onClick={() => openCreator(t.id)} className="text-left p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#1e4e79] hover:bg-[#f7f9fc] dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
                <Sparkles className="h-5 w-5 text-[#1e4e79] dark:text-blue-300" />
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{L(t.name, t.nameHi)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{L(`${t.subjects.length} subjects · ${n} chapters`, `${t.subjects.length} विषय · ${n} अध्याय`)}</p>
              </button>
            );
          })}
          <button type="button" onClick={() => openCreator('')} className="text-left p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#1e4e79] hover:bg-[#f7f9fc] dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
            <Plus className="h-5 w-5 text-slate-500" />
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{L('My own syllabus', 'अपना सिलेबस')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{L('Add subjects and chapters yourself', 'विषय और अध्याय स्वयं जोड़ें')}</p>
          </button>
        </div>
      </SectionCard>
    );
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] items-start">
        {/* ───── Syllabus list ───── */}
        <SectionCard bodyClass="p-2">
          <ul className="space-y-1">
            {syllabi.map(s => {
              const c = syllabusCounts(s);
              const active = s.id === selected?.id;
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => { setSelectedId(s.id); setFilter('all'); setQuery(''); }}
                    className={`w-full text-left px-3 py-2.5 rounded-md cursor-pointer transition-colors ${active ? 'bg-[#eef3f8] dark:bg-slate-800 shadow-[inset_3px_0_0_0_#1e4e79]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium truncate ${active ? 'text-[#1e4e79] dark:text-blue-300' : 'text-slate-800 dark:text-slate-100'}`}>{s.name}</span>
                      <span className="text-xs font-semibold tabular-nums text-slate-500">{percent(c.done, c.total)}%</span>
                    </span>
                    <span className="block mt-1.5"><Progress done={c.done} doing={c.doing} total={c.total} /></span>
                    <span className="block mt-1 text-[11px] text-slate-500 dark:text-slate-400">{L(`${c.done}/${c.total} chapters`, `${c.done}/${c.total} अध्याय`)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => openCreator('')} className="mt-2 w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium text-[#1e4e79] dark:text-blue-300 hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer">
            <Plus className="h-4 w-4" />{L('New syllabus', 'नया सिलेबस')}
          </button>
        </SectionCard>

        {/* ───── Selected syllabus ───── */}
        {selected && counts && (
          <div className="space-y-4 min-w-0">
            <SectionCard bodyClass="px-5 sm:px-6 py-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white break-words">{selected.name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {linkedExam ? (
                      <><GraduationCap className="inline h-4 w-4 mr-1 -mt-0.5" />{linkedExam.name} · {fmtDay(linkedExam.examDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                        {daysLeft !== null && daysLeft >= 0 && <> · <span className={daysLeft <= 7 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>{daysLeft === 0 ? L('today', 'आज') : L(`${daysLeft} days left`, `${daysLeft} दिन बाकी`)}</span></>}</>
                    ) : (
                      <button type="button" onClick={() => setMetaEditor({ name: selected.name, examId: '' })} className="text-[#1e4e79] dark:text-blue-300 hover:underline cursor-pointer">{L('Link an exam date to see your daily pace', 'दैनिक गति देखने के लिए परीक्षा तिथि जोड़ें')}</button>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setMetaEditor({ name: selected.name, examId: selected.examId || '' })} className={`${btnSecondary} h-8 px-3 text-xs`}><Pencil className="h-3.5 w-3.5" />{L('Edit', 'संपादित करें')}</button>
                  <button type="button" onClick={() => onDelete(selected)} aria-label={L('Delete syllabus', 'सिलेबस हटाएं')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">{percent(counts.done, counts.total)}%<span className="ml-2 text-sm font-normal text-slate-500">{L('complete', 'पूरा')}</span></span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">{L(`${counts.done} of ${counts.total} chapters`, `${counts.total} में से ${counts.done} अध्याय`)}</span>
                </div>
                <Progress done={counts.done} doing={counts.doing} total={counts.total} tall />
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <StatusBadge tone="green">{L(`${counts.done} completed`, `${counts.done} पूरे`)}</StatusBadge>
                  <StatusBadge tone="blue">{L(`${counts.doing} in progress`, `${counts.doing} जारी`)}</StatusBadge>
                  <StatusBadge tone="slate">{L(`${counts.todo} not started`, `${counts.todo} शुरू नहीं`)}</StatusBadge>
                  {reviseCount > 0 && <StatusBadge tone="amber">{L(`${reviseCount} to revise`, `${reviseCount} रिवीजन बाकी`)}</StatusBadge>}
                </div>
              </div>

              {counts.total > 0 && remaining === 0 ? (
                <p className="text-sm text-[#1e7e34] dark:text-green-400 font-medium">{L('Syllabus complete! Keep revising the chapters marked “Revise now”.', 'सिलेबस पूरा! “अब रिवीजन करें” वाले अध्यायों का रिवीजन करते रहें।')}</p>
              ) : linkedExam && daysLeft !== null && daysLeft > 0 && remaining > 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300 rounded-md bg-[#f5f7fa] dark:bg-slate-800/60 px-3 py-2">
                  {L(`${remaining} chapters left and ${daysLeft} days to go — `, `${remaining} अध्याय बाकी और ${daysLeft} दिन शेष — `)}
                  {remaining >= daysLeft ? (
                    <>{L('about ', 'लगभग ')}<strong className="text-slate-900 dark:text-white">{(remaining / daysLeft).toFixed(remaining / daysLeft < 10 ? 1 : 0)}</strong>{L(' chapters a day.', ' अध्याय प्रतिदिन।')}</>
                  ) : (
                    <>{L('about one chapter every ', 'लगभग हर ')}<strong className="text-slate-900 dark:text-white">{Math.max(1, Math.floor(daysLeft / remaining))}</strong>{L(' days, leaving time to revise.', ' दिन में एक अध्याय, रिवीजन का समय भी बचेगा।')}</>
                  )}
                </p>
              ) : null}
            </SectionCard>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1" role="group" aria-label={L('Show chapters', 'अध्याय दिखाएं')}>
                {([['all', L('All', 'सभी')], ['todo', L('Not started', 'शुरू नहीं')], ['doing', L('In progress', 'जारी')], ['done', L('Completed', 'पूरे')], ['revise', L('Revise now', 'रिवीजन')]] as const).map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
                    className={`h-8 px-3 rounded-full text-xs font-medium border cursor-pointer transition-colors ${filter === id ? 'bg-[#1e4e79] border-[#1e4e79] text-white' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#eef3f8] dark:hover:bg-slate-800'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative sm:w-64">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L('Search chapters', 'अध्याय खोजें')} aria-label={L('Search chapters', 'अध्याय खोजें')} className={`${inputCls} h-9 pl-9`} />
              </div>
            </div>

            {/* Subjects */}
            {selected.subjects.map(sub => {
              const c = chapterCounts(sub.chapters);
              const shown = sub.chapters.filter(matches);
              if (filtering && !shown.length) return null;
              const isCollapsed = !filtering && !!collapsed[sub.id];
              return (
                <section key={sub.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <div className="px-4 sm:px-5 py-3 flex items-center gap-3">
                    <button type="button" onClick={() => setCollapsed(x => ({ ...x, [sub.id]: !x[sub.id] }))} aria-expanded={!isCollapsed} aria-label={isCollapsed ? L('Show chapters', 'अध्याय दिखाएं') : L('Hide chapters', 'अध्याय छिपाएं')} className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer">
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      {renaming?.id === sub.id ? (
                        <input autoFocus value={renaming.value} maxLength={100} onChange={(e) => setRenaming({ id: sub.id, value: e.target.value })} onBlur={commitRename} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }} className={`${inputCls} h-8`} aria-label={L('Subject name', 'विषय का नाम')} />
                      ) : (
                        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{sub.name}</h3>
                      )}
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="flex-1 max-w-xs"><Progress done={c.done} doing={c.doing} total={c.total} /></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">{c.done}/{c.total} · {percent(c.done, c.total)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button type="button" onClick={() => { setBulkFor(bulkFor === sub.id ? null : sub.id); setBulkText(''); setCollapsed(x => ({ ...x, [sub.id]: false })); }} title={L('Add chapters', 'अध्याय जोड़ें')} aria-label={L('Add chapters', 'अध्याय जोड़ें')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-[#1e4e79] hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer"><Plus className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setRenaming({ id: sub.id, value: sub.name })} aria-label={L('Rename subject', 'विषय का नाम बदलें')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-[#1e4e79] hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => { if (window.confirm(L(`Delete "${sub.name}" and its ${sub.chapters.length} chapters?`, `"${sub.name}" और इसके ${sub.chapters.length} अध्याय हटाएं?`))) update(s => ({ ...s, subjects: s.subjects.filter(x => x.id !== sub.id) })); }} aria-label={L('Delete subject', 'विषय हटाएं')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="border-t border-slate-100 dark:border-slate-800">
                      {sub.chapters.length === 0 && bulkFor !== sub.id && (
                        <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{L('No chapters yet. ', 'अभी कोई अध्याय नहीं। ')}<button type="button" onClick={() => setBulkFor(sub.id)} className="text-[#1e4e79] dark:text-blue-300 hover:underline cursor-pointer">{L('Add chapters', 'अध्याय जोड़ें')}</button></p>
                      )}
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {shown.map(ch => {
                          const due = revisionDue(ch, now);
                          return (
                            <li key={ch.id} className="group flex items-center gap-3 px-4 sm:px-5 py-2.5">
                              {statusButton(sub.id, ch)}
                              <div className="flex-1 min-w-0">
                                {renaming?.id === ch.id ? (
                                  <input autoFocus value={renaming.value} maxLength={200} onChange={(e) => setRenaming({ id: ch.id, value: e.target.value })} onBlur={commitRename} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }} className={`${inputCls} h-8`} aria-label={L('Chapter name', 'अध्याय का नाम')} />
                                ) : (
                                  <p className={`text-sm break-words ${ch.status === 'done' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{ch.name}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  {ch.status === 'doing' && <span className="text-[#1e4e79] dark:text-blue-300 font-medium">{L('In progress', 'जारी')}</span>}
                                  {ch.status === 'done' && ch.completedAt && <span className="text-[#1e7e34] dark:text-green-400">{L('Done', 'पूरा')} {fmtDay(localDay(new Date(ch.completedAt)), { day: 'numeric', month: 'short' })}</span>}
                                  {ch.revisions > 0 && <span>· {L(`Revised ×${ch.revisions}`, `रिवीजन ×${ch.revisions}`)}</span>}
                                  {due && <span className="px-1.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-medium">{L('Revise now', 'अब रिवीजन करें')}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {ch.status === 'done' && (
                                  <button type="button" onClick={() => markRevised(sub.id, ch)} title={L('I revised this chapter', 'मैंने इसका रिवीजन किया')} className={`h-8 px-2 inline-flex items-center gap-1 rounded-md text-xs font-medium cursor-pointer ${due ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40' : 'text-slate-600 dark:text-slate-300 hover:bg-[#eef3f8] dark:hover:bg-slate-800'}`}>
                                    <RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">{L('Mark revised', 'रिवीजन किया')}</span>
                                  </button>
                                )}
                                <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                                  {ch.status !== 'done' && (
                                    <button type="button" onClick={() => onAddTask(`${sub.name} – ${ch.name}`)} title={L('Add to today’s tasks', 'आज के कार्यों में जोड़ें')} aria-label={L('Add to today’s tasks', 'आज के कार्यों में जोड़ें')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-[#1e4e79] hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer"><CalendarPlus className="h-3.5 w-3.5" /></button>
                                  )}
                                  <button type="button" onClick={() => setRenaming({ id: ch.id, value: ch.name })} aria-label={L('Rename chapter', 'अध्याय का नाम बदलें')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-[#1e4e79] hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                                  <button type="button" onClick={() => { if (window.confirm(L(`Delete "${ch.name}"?`, `"${ch.name}" हटाएं?`))) updateSubject(sub.id, s => ({ ...s, chapters: s.chapters.filter(x => x.id !== ch.id) })); }} aria-label={L('Delete chapter', 'अध्याय हटाएं')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      {bulkFor === sub.id && (
                        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <textarea autoFocus value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={4}
                            placeholder={L('One chapter per line, e.g.\nPercentage\nProfit & Loss\nTime & Work', 'हर पंक्ति में एक अध्याय, जैसे\nप्रतिशत\nलाभ और हानि\nसमय और कार्य')}
                            className={`${inputCls} h-auto py-2`} aria-label={L('New chapters, one per line', 'नए अध्याय, हर पंक्ति में एक')} />
                          <div className="flex justify-end gap-2">
                            <button type="button" className={btnSecondary} onClick={() => setBulkFor(null)}>{L('Cancel', 'रद्द करें')}</button>
                            <button type="button" className={btnPrimary} onClick={() => addChapters(sub.id)} disabled={!bulkText.trim()}>
                              {L(`Add ${bulkText.split('\n').filter(l => l.trim()).length || ''} chapters`, `${bulkText.split('\n').filter(l => l.trim()).length || ''} अध्याय जोड़ें`)}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}

            {filtering && selected.subjects.every(sub => !sub.chapters.some(matches)) && (
              <p className="text-sm text-slate-500 dark:text-slate-400 px-1">{L('No chapters match this filter.', 'इस फ़िल्टर से कोई अध्याय नहीं मिला।')}</p>
            )}

            {!filtering && (
              <form onSubmit={addSubject} className="flex gap-2">
                <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} maxLength={100} placeholder={L('Add a subject, e.g. General Science', 'विषय जोड़ें, जैसे सामान्य विज्ञान')} aria-label={L('New subject', 'नया विषय')} className={inputCls} />
                <button type="submit" className={`${btnSecondary} shrink-0`} disabled={!newSubject.trim()}><Plus className="h-4 w-4" />{L('Add subject', 'विषय जोड़ें')}</button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ───── New syllabus ───── */}
      {creator && (
        <Dialog title={L('New syllabus', 'नया सिलेबस')} onClose={() => setCreator(null)} L={L}
          footer={<>
            <button type="button" className={btnSecondary} onClick={() => setCreator(null)}>{L('Cancel', 'रद्द करें')}</button>
            <button type="button" className={btnPrimary} disabled={creating || !creator.name.trim()} onClick={createSyllabus}>{L('Create syllabus', 'सिलेबस बनाएं')}</button>
          </>}>
          <Field label={L('Start from', 'शुरुआत')}>
            <div className="grid gap-2">
              {[...SYLLABUS_TEMPLATES.map(t => ({ id: t.id, label: L(t.name, t.nameHi), sub: L(`${t.subjects.length} subjects · ${t.subjects.reduce((a, s) => a + s.chapters.length, 0)} chapters`, `${t.subjects.length} विषय · ${t.subjects.reduce((a, s) => a + s.chapters.length, 0)} अध्याय`) })),
                { id: '', label: L('Blank — I’ll add my own', 'खाली — मैं स्वयं जोड़ूंगा'), sub: L('Add subjects and chapters yourself', 'विषय और अध्याय स्वयं जोड़ें') }].map(opt => (
                <label key={opt.id || 'blank'} className={`flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer ${creator.template === opt.id ? 'border-[#1e4e79] bg-[#eef3f8] dark:bg-slate-800' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                  <input type="radio" name="tpl" checked={creator.template === opt.id} onChange={() => { const t = SYLLABUS_TEMPLATES.find(x => x.id === opt.id); setCreator({ ...creator, template: opt.id, name: t ? t.name : (SYLLABUS_TEMPLATES.some(x => x.name === creator.name) ? '' : creator.name) }); }} className="accent-[#1e4e79]" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900 dark:text-white">{opt.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{opt.sub}</span>
                  </span>
                </label>
              ))}
            </div>
          </Field>
          <Field label={L('Name', 'नाम')}>
            <input value={creator.name} maxLength={100} onChange={(e) => setCreator({ ...creator, name: e.target.value })} placeholder={L('e.g. SSC CGL 2027', 'जैसे SSC CGL 2027')} className={inputCls} />
          </Field>
          <ExamSelect exams={exams} today={today} value={creator.examId} onChange={(examId) => setCreator({ ...creator, examId })} L={L} />
        </Dialog>
      )}

      {/* ───── Edit name / exam ───── */}
      {metaEditor && selected && (
        <Dialog title={L('Edit syllabus', 'सिलेबस संपादित करें')} onClose={() => setMetaEditor(null)} L={L}
          footer={<>
            <button type="button" className={btnSecondary} onClick={() => setMetaEditor(null)}>{L('Cancel', 'रद्द करें')}</button>
            <button type="button" className={btnPrimary} disabled={!metaEditor.name.trim()} onClick={() => { update(s => ({ ...s, name: metaEditor.name.trim().slice(0, 100), examId: metaEditor.examId || null })); setMetaEditor(null); }}>{L('Save', 'सेव करें')}</button>
          </>}>
          <Field label={L('Name', 'नाम')}>
            <input autoFocus value={metaEditor.name} maxLength={100} onChange={(e) => setMetaEditor({ ...metaEditor, name: e.target.value })} className={inputCls} />
          </Field>
          <ExamSelect exams={exams} today={today} value={metaEditor.examId} onChange={(examId) => setMetaEditor({ ...metaEditor, examId })} L={L} />
        </Dialog>
      )}
    </>
  );
}

function ExamSelect({ exams, today, value, onChange, L }: { exams: PlannerExam[]; today: string; value: string; onChange: (id: string) => void; L: Props['L'] }) {
  const upcoming = exams.filter(e => e.examDate >= today || e.id === value);
  return (
    <Field label={L('Exam date (optional)', 'परीक्षा तिथि (वैकल्पिक)')} hint={upcoming.length ? L('Linking an exam shows how many chapters a day you need.', 'परीक्षा जोड़ने से पता चलता है कि रोज़ कितने अध्याय पढ़ने हैं।') : L('Add your exam in “Exam countdown” on the Tasks tab to link it here.', '“परीक्षा उलटी गिनती” में परीक्षा जोड़ें, फिर यहां लिंक करें।')}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} disabled={!upcoming.length}>
        <option value="">{L('No exam linked', 'कोई परीक्षा नहीं')}</option>
        {upcoming.map(e => <option key={e.id} value={e.id}>{e.name} · {e.examDate}</option>)}
      </select>
    </Field>
  );
}

function Dialog({ title, onClose, footer, children, L }: { title: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode; L: Props['L'] }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-lg sm:rounded-lg shadow-xl max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-[#1e4e79] dark:text-blue-300" />{title}</h2>
          <button type="button" onClick={onClose} aria-label={L('Close', 'बंद करें')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4 overflow-y-auto">{children}</div>
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}
