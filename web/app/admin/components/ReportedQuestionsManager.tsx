"use client";

import React, { useMemo, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, ChevronDown, Copy, Eye, Flag, Loader2, Search, Smartphone, Monitor, Trash2, X, Check, CalendarDays, Layers, Globe } from 'lucide-react';
import type { ReportedQuestion } from '../../AuthContext';
import { REPORT_REASONS, reasonLabel } from '../../components/ReportQuestionDialog';
import MathJaxLoader from '../../components/MathJaxLoader';
import { QuestionReviewBody } from '../../components/QuestionReviewBody';

// -----------------------------------------------------------------------------
// Admin → Reported questions. Reports are grouped per question (most reported first): exam,
// test, section, question number, date, question id, issue type, each student's message and
// who sent it. "View question" shows the question exactly as on the student's result analysis
// page (same component), in English and Hindi. "Resolve" removes all reports of that question.
// -----------------------------------------------------------------------------

type Group = { questionId: string; reports: ReportedQuestion[]; latest: ReportedQuestion };

const plain = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const dayOf = (r: ReportedQuestion) => (r.createdAtIso ? new Date(r.createdAtIso) : null);

export function ReportedQuestionsManager({ list, hi, onDelete, showToast }: {
  list: ReportedQuestion[];
  hi: boolean;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string) => void;
}) {
  const L = (en: string, h: string) => (hi ? h : en);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ReportedQuestion | null>(null);
  const [busy, setBusy] = useState('');

  const groups = useMemo<Group[]>(() => {
    const term = search.trim().toLowerCase();
    const map = new Map<string, ReportedQuestion[]>();
    for (const r of list) {
      if (reason !== 'all' && (r.reason || 'other') !== reason) continue;
      if (term && ![r.questionId, r.mockTestTitle, r.examName, r.message, r.questionText, r.candidateCode, r.mockTestId].some(v => (v || '').toLowerCase().includes(term))) continue;
      const g = map.get(r.questionId) || [];
      g.push(r);
      map.set(r.questionId, g);
    }
    return [...map.entries()]
      .map(([questionId, reports]) => ({ questionId, reports, latest: reports[0] }))
      .sort((a, b) => b.reports.length - a.reports.length || (dayOf(b.latest)?.getTime() || 0) - (dayOf(a.latest)?.getTime() || 0));
  }, [list, search, reason]);

  const today = new Date().toDateString();
  const stats = {
    total: list.length,
    today: list.filter(r => dayOf(r)?.toDateString() === today).length,
    questions: new Set(list.map(r => r.questionId)).size,
    tests: new Set(list.map(r => r.mockTestId).filter(Boolean)).size,
  };

  const resolve = async (g: Group) => {
    if (!window.confirm(L(`Resolve this question? Its ${g.reports.length} report(s) will be removed.`, `इस प्रश्न को हल करें? इसकी ${g.reports.length} रिपोर्ट हट जाएंगी।`))) return;
    setBusy(g.questionId);
    let failed = 0;
    for (const r of g.reports) { const res = await onDelete(r.id); if (!res.success) failed++; }
    setBusy('');
    showToast(failed ? L(`${failed} report(s) could not be removed.`, `${failed} रिपोर्ट नहीं हटीं।`) : L('Question resolved.', 'प्रश्न हल किया गया।'));
  };
  const removeOne = async (r: ReportedQuestion) => {
    if (!window.confirm(L('Delete this report?', 'यह रिपोर्ट हटाएं?'))) return;
    setBusy(r.id);
    const res = await onDelete(r.id);
    setBusy('');
    showToast(res.success ? L('Report deleted.', 'रिपोर्ट हटाई गई।') : res.error || L('Could not delete.', 'हटाया नहीं जा सका।'));
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          [AlertCircle, L('Open reports', 'खुली रिपोर्ट'), stats.total, 'text-red-600 dark:text-red-400'],
          [CalendarDays, L('Today', 'आज'), stats.today, 'text-amber-600 dark:text-amber-400'],
          [Flag, L('Questions reported', 'रिपोर्ट किए प्रश्न'), stats.questions, 'text-[#1e4e79] dark:text-blue-400'],
          [Layers, L('Tests affected', 'प्रभावित टेस्ट'), stats.tests, 'text-violet-600 dark:text-violet-400'],
        ] as const).map(([Icon, label, n, color]) => (
          <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Icon className={`h-4 w-4 ${color}`} />{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">{n}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L('Search exam, test, question ID, message or candidate code', 'परीक्षा, टेस्ट, प्रश्न आईडी, संदेश या कोड खोजें')}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1e4e79]" />
        </div>
        <select value={reason} onChange={e => setReason(e.target.value)} aria-label={L('Issue type', 'समस्या का प्रकार')}
          className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200">
          <option value="all">{L('All issue types', 'सभी प्रकार')}</option>
          {REPORT_REASONS.map(r => <option key={r.key} value={r.key}>{hi ? r.hi : r.en}</option>)}
        </select>
      </div>

      {/* Reported questions */}
      {groups.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-14 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400 mx-auto" />
          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{list.length ? L('No reports match.', 'कोई रिपोर्ट नहीं मिली।') : L('No reported questions. All clear!', 'कोई रिपोर्ट नहीं। सब ठीक है!')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const r = g.latest;
            const isOpen = open === g.questionId;
            return (
              <article key={g.questionId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
                      <Flag className="h-3 w-3" />{reasonLabel(r.reason, hi)}
                    </span>
                    {g.reports.length > 1 ? (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                        {L(`${g.reports.length} reports`, `${g.reports.length} रिपोर्ट`)}
                      </span>
                    ) : null}
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">{r.createdAt}</span>
                  </div>

                  <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    <div><dt className="text-[11px] text-slate-500 dark:text-slate-400">{L('Exam', 'परीक्षा')}</dt><dd className="font-medium text-slate-900 dark:text-white break-words">{r.examName || '—'}</dd></div>
                    <div><dt className="text-[11px] text-slate-500 dark:text-slate-400">{L('Test', 'टेस्ट')}</dt><dd className="font-medium text-slate-900 dark:text-white break-words">{r.mockTestTitle || '—'}</dd></div>
                    <div><dt className="text-[11px] text-slate-500 dark:text-slate-400">{L('Question', 'प्रश्न')}</dt><dd className="font-medium text-slate-900 dark:text-white">{r.questionNumber ? `Q${r.questionNumber}` : '—'}{r.sectionName ? ` · ${r.sectionName}` : ''}</dd></div>
                    <div><dt className="text-[11px] text-slate-500 dark:text-slate-400">{L('Question ID', 'प्रश्न आईडी')}</dt><dd className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{r.questionId}</dd></div>
                  </dl>

                  {r.questionText ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{plain(r.questionText)}</p> : null}

                  <div className="mt-3 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-950 px-3 py-2">
                    <p className="text-[11px] font-semibold text-red-700 dark:text-red-300">{L('Report message', 'रिपोर्ट संदेश')}</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">{r.message || <span className="italic text-slate-500">{L('(no message, issue type only)', '(संदेश नहीं, केवल प्रकार)')}</span>}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setViewing(r)}
                      className="h-9 px-3 rounded-md bg-[#1e4e79] hover:bg-[#173d60] text-white text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"><Eye className="h-4 w-4" />{L('View question', 'प्रश्न देखें')}</button>
                    <button type="button" onClick={() => resolve(g)} disabled={busy === g.questionId}
                      className="h-9 px-3 rounded-md border border-green-600 text-green-700 dark:text-green-400 dark:border-green-500 text-sm font-medium inline-flex items-center gap-1.5 hover:bg-green-50 dark:hover:bg-green-950/30 cursor-pointer disabled:opacity-50">
                      {busy === g.questionId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{L('Resolve', 'हल करें')}
                    </button>
                    <button type="button" onClick={() => setOpen(isOpen ? null : g.questionId)} aria-expanded={isOpen}
                      className="h-9 px-3 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer ml-auto">
                      {L(`Reports (${g.reports.length})`, `रिपोर्ट (${g.reports.length})`)}<ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <ul className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                    {g.reports.map(x => (
                      <li key={x.id} className="px-4 py-3 flex items-start gap-3">
                        <span className="mt-0.5 text-slate-400">{x.source === 'android' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono font-semibold text-[#1e4e79] dark:text-blue-300">{x.candidateCode || L('Visitor', 'अतिथि')}</span>
                            {' · '}{x.createdAt}{' · '}{reasonLabel(x.reason, hi)}{' · '}{x.language === 'hi' ? 'हिन्दी' : 'English'}{' · '}{x.source === 'android' ? 'Android app' : x.source === 'mobile_web' ? 'Website (phone)' : 'Website'}
                          </p>
                          <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words mt-0.5">{x.message || '—'}</p>
                        </div>
                        <button type="button" onClick={() => removeOne(x)} disabled={busy === x.id} aria-label={L('Delete report', 'रिपोर्ट हटाएं')}
                          className="h-8 w-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center justify-center cursor-pointer disabled:opacity-50">
                          {busy === x.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {viewing ? <QuestionViewer report={viewing} hi={hi} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}

/** The reported question: text, options (correct one marked), solution; English / Hindi. */
function QuestionViewer({ report, hi, onClose }: { report: ReportedQuestion; hi: boolean; onClose: () => void }) {
  const L = (en: string, h: string) => (hi ? h : en);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'en' | 'hi'>(report.language === 'hi' ? 'hi' : 'en');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reported-question-view', data: { id: report.id } }) })
      .then(r => r.json())
      .then(j => { if (!alive) return; if (j.success) setData(j); else setError(j.error || L('Could not load the question.', 'प्रश्न लोड नहीं हुआ।')); })
      .catch(() => alive && setError(L('No connection. Please try again.', 'इंटरनेट नहीं है।')));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { alive = false; document.removeEventListener('keydown', onKey); };
  }, [report.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = data?.question;
  const loc = data?.location;
  const number = loc?.number || report.questionNumber;
  const section = loc?.sectionName || report.sectionName;
  const hasHindi = !!q?.content?.hi?.questionText;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-2 sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <MathJaxLoader />
      <div role="dialog" aria-modal="true" aria-labelledby="qview-title" className="w-full max-w-4xl max-h-[94vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="shrink-0 flex items-start gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <BookOpen className="h-5 w-5 text-[#1e4e79] dark:text-blue-400 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 id="qview-title" className="text-lg font-semibold text-slate-900 dark:text-white">{L('Reported question', 'रिपोर्ट किया गया प्रश्न')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 break-words">
              {[loc?.examName || report.examName, loc?.testTitle || report.mockTestTitle].filter(Boolean).join(' › ') || report.mockTestId}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={L('Close', 'बंद करें')} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-950/40 px-3 sm:px-6 py-5 space-y-5">
          {/* What the student reported */}
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/20 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-red-700 dark:text-red-300">
              <Flag className="h-3.5 w-3.5" /><span className="font-semibold">{reasonLabel(report.reason, hi)}</span>
              <span className="text-slate-500 dark:text-slate-400">· {report.candidateCode || L('Visitor', 'अतिथि')} · {report.createdAt} · {report.language === 'hi' ? 'हिन्दी' : 'English'}</span>
            </div>
            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">{report.message || <span className="italic text-slate-500">{L('(no message, issue type only)', '(संदेश नहीं, केवल प्रकार)')}</span>}</p>
          </div>

          {error ? <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p> : null}
          {!data && !error ? <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#1e4e79]" /></div> : null}

          {data && !q ? (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              {L('This question is no longer in the test (it may have been changed or removed). What the student saw:', 'यह प्रश्न अब टेस्ट में नहीं है (बदला या हटाया गया हो सकता है)। छात्र ने जो देखा:')}
              <p className="mt-1 text-slate-800 dark:text-slate-200">{plain(report.questionText || '') || '—'}</p>
            </div>
          ) : null}

          {q ? (
            // The question exactly as on the student's result analysis page
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-5 gap-3">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-widest">{L('Question', 'प्रश्न')} {number || ''}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono break-all">(ID: {report.questionId})</span>
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(report.questionId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}
                    className="text-slate-400 hover:text-[#1e4e79] cursor-pointer" aria-label={L('Copy question ID', 'प्रश्न आईडी कॉपी करें')}>{copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}</button>
                  {section ? <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{section}</span> : null}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(q.positiveMark != null || q.negativeMark != null) ? (
                    <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">+{q.positiveMark ?? '—'} / −{q.negativeMark ?? '—'}</span>
                  ) : null}
                  {hasHindi ? (
                    <button type="button" onClick={() => setLang(l => (l === 'en' ? 'hi' : 'en'))}
                      className="flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer">
                      <Globe className="h-3.5 w-3.5 text-blue-500" /><span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
                    </button>
                  ) : null}
                </div>
              </div>
              <QuestionReviewBody question={q} lang={lang} hi={hi} />
            </div>
          ) : null}

          {data?.others?.length ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{L(`Other reports of this question (${data.others.length})`, `इस प्रश्न की अन्य रिपोर्ट (${data.others.length})`)}</p>
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {data.others.map((o: any) => (
                  <li key={o.id} className="py-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{o.candidateCode || L('Visitor', 'अतिथि')} · {o.createdAt} · {reasonLabel(o.reason, hi)}</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">{o.message || '—'}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
