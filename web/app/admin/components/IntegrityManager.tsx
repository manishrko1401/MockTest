"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, Clock, Eye, RefreshCw, ShieldAlert, ShieldCheck, Undo2, XCircle, Zap } from 'lucide-react';

// -----------------------------------------------------------------------------
// Integrity review: attempts the server's integrity checks found suspicious (fast correct
// answers, answer bursts, clock mismatch…). An admin looks at the evidence and marks each
// one fair (cleared) or cheated. Flagged attempts stay out of friend-room rankings until
// cleared. Nothing happens to a student automatically.
// -----------------------------------------------------------------------------

type Reason = { code: string; points: number; detail: string; questions?: string[] };
type Item = {
  sessionId: string; userId: string; testId: string; score: number; level: 'flagged' | 'watch'; reasons: Reason[]; stats: any;
  retake: boolean; status: 'open' | 'cleared' | 'cheated'; note: string | null; reviewedAt: string | null; createdAt: string;
  fullName: string; email: string; candidateCode: string; testTitle: string | null; finalScore: number; maxScore: number | null;
  accuracyPercentage: number; timeSpentSeconds: number; source: string; durationMinutes?: number; violationsCount?: number;
  timeline?: [number, number | null, 0 | 1 | null, number, number | null][];
};

const REASON_LABEL: Record<string, string> = {
  fast_correct: 'Too fast to read',
  faster_than_others: 'Much faster than others',
  high_score_little_time: 'High score, little time',
  answer_bursts: 'Answer bursts',
  clock_mismatch: 'Clock mismatch',
  left_exam: 'Left the exam',
};

const api = async (action: string, data: Record<string, unknown> = {}) => {
  const res = await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || 'Request failed');
  return json;
};

const fmtSecs = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);
const letter = (i: number | null) => (i === null || i === undefined ? '–' : String.fromCharCode(65 + i));

function ScoreBadge({ score, level }: { score: number; level: string }) {
  const cls = level === 'flagged'
    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900'
    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold tabular-nums ${cls}`}>
      {level === 'flagged' ? <ShieldAlert className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      {score} · {level === 'flagged' ? 'Flagged' : 'Watch'}
    </span>
  );
}

function StatusBadge({ status }: { status: Item['status'] }) {
  if (status === 'cleared') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />Fair</span>;
  if (status === 'cheated') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400"><XCircle className="w-3.5 h-3.5" />Cheated</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Clock className="w-3.5 h-3.5" />To review</span>;
}

export function IntegrityManager({ showToast }: { showToast: (msg: string) => void }) {
  const [status, setStatus] = useState<'open' | 'cleared' | 'cheated' | 'all'>('open');
  const [level, setLevel] = useState<'all' | 'flagged' | 'watch'>('all');
  const [items, setItems] = useState<Item[] | null>(null);
  const [counts, setCounts] = useState<{ status: string; level: string; n: number }[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { const r = await api('integrity-list', { status, level }); setItems(r.items || []); setCounts(r.counts || []); }
    catch (e: any) { setError(e.message); setItems([]); }
  }, [status, level]);
  useEffect(() => { load(); }, [load]);

  const n = (s: string, l?: string) => counts.filter(c => (s === 'all' || c.status === s) && (!l || c.level === l)).reduce((a, c) => a + c.n, 0);

  if (openId) return <IntegrityDetail sessionId={openId} onBack={() => { setOpenId(null); load(); }} showToast={showToast} />;

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-950 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-[#1e4e79] dark:text-blue-400" />Integrity review</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Attempts the integrity checks found suspicious. Look at the evidence, then mark each one fair or cheated. Flagged attempts stay out of friend-room rankings until cleared; nothing happens to the student automatically.
            </p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            ['To review · flagged', n('open', 'flagged'), 'text-red-700 dark:text-red-400'],
            ['To review · watch', n('open', 'watch'), 'text-amber-700 dark:text-amber-400'],
            ['Marked fair', n('cleared'), 'text-emerald-700 dark:text-emerald-400'],
            ['Marked cheated', n('cheated'), 'text-slate-900 dark:text-white'],
          ].map(([label, value, cls]) => (
            <div key={String(label)} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <div className={`text-2xl font-semibold tabular-nums ${cls}`}>{value as number}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label as string}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          {(['open', 'cleared', 'cheated', 'all'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)} className={`h-8 px-3 rounded-full text-sm border ${status === s ? 'bg-[#1e4e79] border-[#1e4e79] text-white' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              {{ open: 'To review', cleared: 'Fair', cheated: 'Cheated', all: 'All' }[s]}
            </button>
          ))}
          <span className="w-px bg-slate-200 dark:bg-slate-800 mx-1" />
          {(['all', 'flagged', 'watch'] as const).map(l => (
            <button key={l} onClick={() => setLevel(l)} className={`h-8 px-3 rounded-full text-sm border ${level === l ? 'bg-slate-800 border-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              {{ all: 'Any level', flagged: 'Flagged (50+)', watch: 'Watch (25–49)' }[l]}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm dark:bg-red-950/40 dark:text-red-300">{error}</div> : null}

      <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        {items === null ? <div className="p-10 text-center text-slate-500 text-sm">Loading…</div>
          : items.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="mt-3 font-semibold text-slate-900 dark:text-white">Nothing to review</div>
              <div className="text-sm text-slate-500 mt-1">Suspicious attempts appear here as students submit tests.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Student</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Test</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Suspicion</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Why</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Score</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map(it => (
                    <tr key={it.sessionId} onClick={() => setOpenId(it.sessionId)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{it.fullName}</div>
                        <div className="text-xs text-slate-500">{it.candidateCode} · {new Date(it.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-3 py-3 max-w-[260px]">
                        <div className="truncate text-slate-800 dark:text-slate-200">{it.testTitle || it.testId}</div>
                        {it.retake ? <span className="text-[11px] text-slate-500">Retake</span> : null}
                      </td>
                      <td className="px-3 py-3"><ScoreBadge score={it.score} level={it.level} /></td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {it.reasons.map(r => <span key={r.code} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">{REASON_LABEL[r.code] || r.code}</span>)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap text-slate-800 dark:text-slate-200">{Math.round(it.finalScore * 100) / 100}{it.maxScore ? ` / ${it.maxScore}` : ''}<div className="text-xs text-slate-500">{Math.round(it.accuracyPercentage)}% · {fmtSecs(it.timeSpentSeconds)}</div></td>
                      <td className="px-3 py-3"><StatusBadge status={it.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}

function IntegrityDetail({ sessionId, onBack, showToast }: { sessionId: string; onBack: () => void; showToast: (msg: string) => void }) {
  const [item, setItem] = useState<Item | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('integrity-get', { sessionId }).then(r => { setItem(r.item); setHistory(r.history || []); setNote(r.item?.note || ''); }, e => setError(e.message));
  }, [sessionId]);

  const review = async (status: Item['status']) => {
    setBusy(true);
    try {
      await api('integrity-review', { sessionId, status, note });
      setItem(it => (it ? { ...it, status } : it));
      showToast(status === 'cleared' ? 'Marked as fair' : status === 'cheated' ? 'Marked as cheated' : 'Moved back to review');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (!item) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-[#1e4e79] dark:text-blue-400"><ChevronLeft className="w-4 h-4" />Back to the list</button>
        <div className="p-10 text-center text-sm text-slate-500">{error || 'Loading…'}</div>
      </div>
    );
  }

  const timeline = item.timeline || [];
  const maxSecs = Math.max(30, ...timeline.map(r => r[3]));
  // answers within 2 s of the previous one (bursts) are marked
  const sortedAt = timeline.filter(r => r[4] !== null).sort((a, b) => (a[4]! - b[4]!));
  const burstNos = new Set<number>();
  for (let i = 0; i < sortedAt.length; i++) {
    let j = i;
    while (j + 1 < sortedAt.length && sortedAt[j + 1][4]! - sortedAt[i][4]! < 2000) j++;
    if (j - i + 1 >= 3) { for (let k = i; k <= j; k++) burstNos.add(sortedAt[k][0]); i = j; }
  }
  const s = item.stats || {};

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-[#1e4e79] dark:text-blue-400 hover:underline"><ChevronLeft className="w-4 h-4" />Back to the list</button>

      <div className="bg-white dark:bg-slate-950 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap"><ScoreBadge score={item.score} level={item.level} /><StatusBadge status={item.status} />{item.retake ? <span className="text-xs text-slate-500">Retake</span> : null}</div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-2">{item.fullName} <span className="text-slate-500 font-normal text-sm">· {item.candidateCode} · {item.email}</span></h2>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{item.testTitle || item.testId}</div>
            <div className="text-xs text-slate-500 mt-1">Submitted {new Date(item.createdAt).toLocaleString('en-IN')} · from {item.source}</div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center min-w-[300px]">
            {[
              ['Score', `${Math.round(item.finalScore * 100) / 100}${item.maxScore ? `/${item.maxScore}` : ''}`],
              ['Accuracy', `${Math.round(item.accuracyPercentage)}%`],
              ['Time used', `${fmtSecs(s.totalSeconds ?? item.timeSpentSeconds)} of ${item.durationMinutes || Math.round((s.durationSeconds || 0) / 60)}m`],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5">
                <div className="font-semibold text-slate-900 dark:text-white tabular-nums">{v}</div>
                <div className="text-[11px] text-slate-500">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-6 mb-2">Why it was flagged</h3>
        <ul className="space-y-2">
          {item.reasons.map(r => (
            <li key={r.code} className="flex items-start gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-900">
              {r.code === 'answer_bursts' ? <Zap className="w-4 h-4 mt-0.5 text-red-600" /> : <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600" />}
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{REASON_LABEL[r.code] || r.code} <span className="text-slate-500 font-normal tabular-nums">+{r.points}</span></div>
                <div className="text-sm text-slate-600 dark:text-slate-300">{r.detail}</div>
              </div>
            </li>
          ))}
        </ul>
        {s.wallClockSeconds ? <p className="text-xs text-slate-500 mt-3">Real time between the server first seeing this attempt and the submit: {fmtSecs(s.wallClockSeconds)}.</p> : null}

        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex-1">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Note (optional, only admins see it)</span>
            <input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="e.g. Checked the timeline: answers entered from a key"
              className="mt-1 w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white" />
          </label>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => review('cleared')} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"><CheckCircle2 className="w-4 h-4" />Fair attempt</button>
            <button disabled={busy} onClick={() => review('cheated')} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50"><XCircle className="w-4 h-4" />Cheated</button>
            {item.status !== 'open' ? <button disabled={busy} onClick={() => review('open')} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200"><Undo2 className="w-4 h-4" />Reopen</button> : null}
          </div>
        </div>
        {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
      </div>

      {/* Answer timeline: one row per answered question */}
      <div className="bg-white dark:bg-slate-950 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Seconds spent on each question</h3>
        <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300 mt-2 mb-4">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-600" />✓ Correct</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-600" />✗ Wrong</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-600" />– Not answered</span>
          <span className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-red-600" />In a burst (3+ answers within 2 s)</span>
        </div>
        {timeline.length === 0 ? <div className="text-sm text-slate-500">No answer details saved for this attempt.</div> : (
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 sticky top-0 bg-white dark:bg-slate-950">
                <tr><th className="text-left py-1.5 w-12">Q</th><th className="text-left py-1.5 w-16">Answer</th><th className="text-left py-1.5">Time on question</th><th className="text-right py-1.5 w-28">Answered at</th></tr>
              </thead>
              <tbody>
                {timeline.map(([no, sel, ok, secs, at]) => (
                  <tr key={no} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 font-medium text-slate-700 dark:text-slate-300 tabular-nums">{no}</td>
                    <td className="py-1.5 text-slate-700 dark:text-slate-300">{letter(sel)} {ok === 1 ? '✓' : ok === 0 ? '✗' : ''}</td>
                    <td className="py-1.5 pr-4">
                      <div className="flex items-center gap-2" title={`Question ${no}: ${secs} s`}>
                        <div className="flex-1 h-3 rounded-sm bg-slate-100 dark:bg-slate-900 overflow-hidden">
                          <div className={`h-3 rounded-r ${ok === 1 ? 'bg-emerald-600' : ok === 0 ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-600'}`} style={{ width: `${Math.max(1.5, (secs / maxSecs) * 100)}%` }} />
                        </div>
                        <span className="w-12 text-right tabular-nums text-xs text-slate-600 dark:text-slate-300">{secs}s</span>
                      </div>
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-xs text-slate-500">
                      {burstNos.has(no) ? <Zap className="inline w-3.5 h-3.5 text-red-600 mr-1" aria-label="burst" /> : null}
                      {at === null ? '—' : `${(at / 1000).toFixed(1)} s`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-500 mt-3">"Answered at" counts from the student's first answer (seconds), from their device's clock. Older app versions don't send it.</p>
      </div>

      {history.length ? (
        <div className="bg-white dark:bg-slate-950 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">This student's other flagged attempts</h3>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {history.map(h => (
              <li key={h.sessionId} className="py-2 flex items-center gap-3">
                <ScoreBadge score={h.score} level={h.level} />
                <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{h.testTitle}</span>
                <StatusBadge status={h.status} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
