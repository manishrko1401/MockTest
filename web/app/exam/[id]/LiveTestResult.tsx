"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, RotateCcw, Target, Trophy, XCircle, MinusCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { QuestionReviewBody } from '../../components/QuestionReviewBody';
import type { LiveResult } from '../../lib/liveTestShared';

// -----------------------------------------------------------------------------
// Result of a live test, shown once right after submitting. Nothing is saved: leaving this
// screen (or reloading) clears it, so the page asks before the student leaves.
// -----------------------------------------------------------------------------

type Filter = 'all' | 'correct' | 'wrong' | 'skipped';

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return `${m}m ${String(sec).padStart(2, '0')}s`;
};

export default function LiveTestResult({ result, error, submitting, language, onRetry, onNewTest, onExit }: {
  result: LiveResult | null;
  error: string;
  submitting: boolean;
  language: 'en' | 'hi';
  onRetry: () => void;
  onNewTest: () => void;
  onExit: () => void;
}) {
  const hi = language === 'hi';
  const [lang, setLang] = useState<'en' | 'hi'>(language);
  const [filter, setFilter] = useState<Filter>('all');
  const leavingRef = useRef(false);

  // The result exists only on this screen: ask before the tab is closed or reloaded
  useEffect(() => {
    if (!result) return;
    const warn = (e: BeforeUnloadEvent) => { if (leavingRef.current) return; e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [result]);

  const shown = useMemo(() => (result?.questions || []).filter(q => filter === 'all' || q.status === filter), [result, filter]);

  const leave = (go: () => void) => {
    if (window.confirm(hi ? 'यह परिणाम सहेजा नहीं जाता। बाहर जाने पर यह दोबारा नहीं दिखेगा। जारी रखें?' : "This result isn't saved. Once you leave, you can't see it again. Continue?")) {
      leavingRef.current = true;
      go();
    }
  };

  if (!result) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-xl border border-slate-200 dark:border-slate-800">
          {submitting || !error ? (
            <>
              <Loader2 className="h-9 w-9 animate-spin text-blue-600 mx-auto" />
              <p className="mt-4 font-semibold text-slate-800 dark:text-slate-100">{hi ? 'आपका परिणाम तैयार हो रहा है…' : 'Checking your answers…'}</p>
            </>
          ) : (
            <>
              <AlertTriangle className="h-9 w-9 text-amber-500 mx-auto" />
              <p className="mt-3 font-semibold text-slate-800 dark:text-slate-100">{hi ? 'परिणाम नहीं मिल सका' : "Couldn't get your result"}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{error}</p>
              <div className="mt-5 flex gap-2 justify-center">
                <button onClick={onRetry} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer">{hi ? 'फिर से कोशिश करें' : 'Try again'}</button>
                <button onClick={onExit} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold cursor-pointer">{hi ? 'बाहर जाएँ' : 'Exit'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const pct = result.maxScore ? Math.max(0, (result.score / result.maxScore) * 100) : 0;
  const stat = (icon: React.ReactNode, label: string, value: string, tone: string) => (
    <div className={`rounded-xl border p-3 text-center ${tone}`}>
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">{icon}{label}</div>
      <p className="text-xl font-bold mt-0.5 font-mono">{value}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-100 dark:bg-slate-950 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-5 sm:py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> {hi ? 'लाइव टेस्ट परिणाम' : 'Live test result'}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">{hi ? result.titleHi : result.title}</h1>
          </div>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 text-xs font-bold">
            {(['en', 'hi'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} className={`px-3 py-1.5 cursor-pointer ${lang === l ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'}`}>{l === 'en' ? 'English' : 'हिंदी'}</button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{hi
            ? 'यह परिणाम और समाधान केवल अभी दिखेंगे। ये सहेजे नहीं जाते: इस पेज से बाहर जाने या रीलोड करने पर ये चले जाएँगे।'
            : "This result and the solutions are shown only now. They aren't saved: leaving or reloading this page clears them."}</span>
        </div>

        {/* Score */}
        <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center"><Trophy className="h-8 w-8" /></div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{hi ? 'आपका स्कोर' : 'Your score'}</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white font-mono">{result.score}<span className="text-lg text-slate-400"> / {result.maxScore}</span></p>
              </div>
            </div>
            <div className="sm:ml-auto sm:w-64">
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} /></div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{hi ? `सही +${result.positiveMarks}, गलत −${result.negativeMarks}` : `Correct +${result.positiveMarks}, wrong −${result.negativeMarks}`}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-4">
            {stat(<CheckCircle2 className="h-3 w-3" />, hi ? 'सही' : 'Correct', String(result.correct), 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300')}
            {stat(<XCircle className="h-3 w-3" />, hi ? 'गलत' : 'Wrong', String(result.wrong), 'border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300')}
            {stat(<MinusCircle className="h-3 w-3" />, hi ? 'छोड़े' : 'Skipped', String(result.skipped), 'border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-200')}
            {stat(<Target className="h-3 w-3" />, hi ? 'सटीकता' : 'Accuracy', `${result.accuracy}%`, 'border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300')}
            {stat(<Clock className="h-3 w-3" />, hi ? 'समय' : 'Time', fmtTime(result.timeTakenSeconds), 'border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-200')}
          </div>
        </div>

        {/* Area-wise */}
        <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <p className="px-5 pt-4 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100">{hi ? 'विषय-वार प्रदर्शन' : 'Topic-wise performance'}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="text-left px-5 py-2">{hi ? 'विषय' : 'Topic'}</th>
                  <th className="px-3 py-2">{hi ? 'प्रश्न' : 'Qs'}</th>
                  <th className="px-3 py-2">{hi ? 'सही' : 'Correct'}</th>
                  <th className="px-3 py-2">{hi ? 'गलत' : 'Wrong'}</th>
                  <th className="px-3 py-2">{hi ? 'छोड़े' : 'Skipped'}</th>
                  <th className="px-3 py-2">{hi ? 'अंक' : 'Marks'}</th>
                </tr>
              </thead>
              <tbody className="text-center text-slate-700 dark:text-slate-200">
                {result.areas.map(a => (
                  <tr key={a.name} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="text-left px-5 py-2 font-medium">{hi ? a.nameHi : a.name}</td>
                    <td className="px-3 py-2 font-mono">{a.total}</td>
                    <td className="px-3 py-2 font-mono text-emerald-600">{a.correct}</td>
                    <td className="px-3 py-2 font-mono text-rose-600">{a.wrong}</td>
                    <td className="px-3 py-2 font-mono">{a.skipped}</td>
                    <td className="px-3 py-2 font-mono font-bold">{a.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Solutions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mr-auto">{hi ? 'प्रश्न और समाधान' : 'Questions & solutions'}</p>
          {([
            ['all', hi ? 'सभी' : 'All', result.questions.length],
            ['correct', hi ? 'सही' : 'Correct', result.correct],
            ['wrong', hi ? 'गलत' : 'Wrong', result.wrong],
            ['skipped', hi ? 'छोड़े' : 'Skipped', result.skipped],
          ] as [Filter, string, number][]).map(([f, label, n]) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${filter === f ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{label} ({n})</button>
          ))}
        </div>
        <div className="mt-3 space-y-3">
          {shown.map(q => {
            const number = result.questions.indexOf(q) + 1;
            const badge = q.status === 'correct'
              ? <span className="text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300">{hi ? 'सही' : 'Correct'}</span>
              : q.status === 'wrong'
                ? <span className="text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300">{hi ? 'गलत' : 'Wrong'}</span>
                : <span className="text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300">{hi ? 'छोड़ा' : 'Skipped'}</span>;
            return (
              <div key={q.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Q{number}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">{(hi ? result.areas.find(a => a.name === q.area)?.nameHi : null) || q.area}</span>
                  <span className="ml-auto [&>span]:px-2 [&>span]:py-0.5 [&>span]:rounded-full">{badge}</span>
                </div>
                <QuestionReviewBody question={q} lang={lang} hi={hi} selectedOptionIndex={q.selectedOptionIndex} />
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 mt-5 -mx-4 px-4 py-3 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 justify-end">
          <button onClick={() => leave(onExit)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold cursor-pointer">
            <ArrowLeft className="h-4 w-4" />{hi ? 'टेस्ट सूची पर जाएँ' : 'Back to tests'}
          </button>
          <button onClick={() => leave(onNewTest)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer">
            <RotateCcw className="h-4 w-4" />{hi ? 'नया लाइव टेस्ट दें' : 'Take a new live test'}
          </button>
        </div>
      </div>
    </div>
  );
}
