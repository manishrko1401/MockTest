"use client";

import React, { useEffect, useRef, useState } from 'react';
import MathJaxText from '../lib/MathJaxText';
import { Flag, X, CheckCircle2, Copy, Check, Loader2, BookOpen, FileText, Hash, CalendarDays, Fingerprint } from 'lucide-react';

// -----------------------------------------------------------------------------
// "Report this question": where the question is (exam, test, section, number, date, id), what
// kind of problem it is, and the student's message. Used on the test analysis page; the server
// checks the exam / test / number against the test itself.
// -----------------------------------------------------------------------------

export const REPORT_REASONS: { key: string; en: string; hi: string }[] = [
  { key: 'wrong_answer', en: 'Wrong answer', hi: 'गलत उत्तर' },
  { key: 'wrong_question', en: 'Wrong question', hi: 'गलत प्रश्न' },
  { key: 'options', en: 'Option problem', hi: 'विकल्प में गलती' },
  { key: 'solution', en: 'Solution unclear', hi: 'हल स्पष्ट नहीं' },
  { key: 'typo', en: 'Spelling / typo', hi: 'वर्तनी / टाइपिंग' },
  { key: 'translation', en: 'Translation', hi: 'अनुवाद' },
  { key: 'image', en: 'Image missing', hi: 'चित्र नहीं दिखा' },
  { key: 'other', en: 'Other', hi: 'अन्य' },
];
export const reasonLabel = (key?: string, hi = false) => {
  const r = REPORT_REASONS.find(x => x.key === key);
  return r ? (hi ? r.hi : r.en) : (hi ? 'अन्य' : 'Other');
};

export type ReportInfo = {
  questionId: string;
  examName?: string;
  testTitle?: string;
  sectionName?: string;
  questionNumber?: number | null;
  /** The question as plain text */
  preview?: string;
  /** The question as shown on the page (already processed HTML); shown instead of the preview */
  previewHtml?: string;
};

const MAX = 1000;

/** One line of the details list: icon, label, value (the value wraps, never cut) */
function Detail({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-3.5 py-2.5 min-w-0">
      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-[#1e4e79] dark:text-blue-400" aria-hidden />
      <dt className="w-[92px] shrink-0 text-[13px] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">{children}</dd>
    </div>
  );
}

export function ReportQuestionDialog({ open, info, hi, onClose, onSubmit }: {
  open: boolean;
  info: ReportInfo;
  hi: boolean;
  onClose: () => void;
  onSubmit: (reason: string, message: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const L = (en: string, h: string) => (hi ? h : en);
  const [reason, setReason] = useState('wrong_answer');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // A fresh form for each question
  useEffect(() => {
    if (!open) return;
    setReason('wrong_answer'); setMessage(''); setError(''); setBusy(false); setDone(false); setCopied(false);
    setTimeout(() => box.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 30);
  }, [open, info.questionId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [open, busy, onClose]);

  if (!open) return null;

  const needsMessage = reason === 'other';
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (needsMessage && message.trim().length < 5) { setError(L('Please describe the problem (at least a few words).', 'कृपया समस्या का विवरण लिखें (कम से कम कुछ शब्द)।')); return; }
    setBusy(true); setError('');
    try {
      const r = await onSubmit(reason, message.trim());
      if (r.success) { setDone(true); setTimeout(onClose, 1800); }
      else setError(r.error || L('Could not send the report. Please try again.', 'रिपोर्ट नहीं भेजी जा सकी। फिर कोशिश करें।'));
    } catch {
      setError(L('No connection. Please try again.', 'इंटरनेट नहीं है। फिर कोशिश करें।'));
    } finally { setBusy(false); }
  };

  const today = new Date().toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const copyId = () => {
    navigator.clipboard?.writeText(info.questionId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-[2px] sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="report-title"
        className="w-full sm:max-w-3xl lg:max-w-5xl max-h-[94vh] sm:max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="shrink-0 flex items-start gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <span className="h-10 w-10 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0"><Flag className="h-5 w-5" /></span>
          <div className="flex-1 min-w-0">
            <h2 id="report-title" className="text-lg font-semibold text-slate-900 dark:text-white">{L('Report this question', 'इस प्रश्न की रिपोर्ट करें')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{L('Our team checks every report and fixes the question.', 'हमारी टीम हर रिपोर्ट देखकर प्रश्न ठीक करती है।')}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={L('Close', 'बंद करें')}
            className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50 shrink-0"><X className="h-5 w-5" /></button>
        </div>

        {done ? (
          <div className="px-6 py-14 text-center" role="status">
            <CheckCircle2 className="h-14 w-14 text-green-600 dark:text-green-400 mx-auto" />
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{L('Thank you! Report sent.', 'धन्यवाद! रिपोर्ट भेज दी गई।')}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{L('We will check this question and correct it if needed.', 'हम इस प्रश्न की जांच करके ज़रूरत हो तो सुधार करेंगे।')}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 content-start">
              {/* Where the question is */}
              <section aria-label={L('Question details', 'प्रश्न का विवरण')} className="min-w-0 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{L('Question details', 'प्रश्न का विवरण')}</h3>
                <dl className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 divide-y divide-slate-200 dark:divide-slate-800">
                  <Detail icon={BookOpen} label={L('Exam', 'परीक्षा')}>{info.examName || '—'}</Detail>
                  <Detail icon={FileText} label={L('Test', 'टेस्ट')}>{info.testTitle || '—'}</Detail>
                  <Detail icon={Hash} label={L('Question', 'प्रश्न')}>
                    {info.questionNumber ? `Q${info.questionNumber}` : '—'}
                    {info.sectionName ? <span className="font-medium text-slate-500 dark:text-slate-400"> · {info.sectionName}</span> : null}
                  </Detail>
                  <Detail icon={CalendarDays} label={L('Date', 'दिनांक')}>{today}</Detail>
                  <Detail icon={Fingerprint} label={L('Question ID', 'प्रश्न आईडी')}>
                    <span className="flex flex-wrap items-center gap-2">
                      <code className="font-mono text-[13px] text-slate-800 dark:text-slate-200 break-all">{info.questionId}</code>
                      <button type="button" onClick={copyId} className="shrink-0 h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-[#1e4e79] hover:text-[#1e4e79] dark:hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer">
                        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}{copied ? L('Copied', 'कॉपी हुआ') : L('Copy', 'कॉपी')}
                      </button>
                    </span>
                  </Detail>
                </dl>
                {info.previewHtml || info.preview ? (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-3">
                    <p className="text-[13px] text-slate-500 dark:text-slate-400">{L('The question', 'प्रश्न')}</p>
                    <div className="mt-1 max-h-44 overflow-y-auto pr-1">
                      {info.previewHtml
                        ? <MathJaxText component="div" className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 break-words markup-content [&_img]:max-h-40 [&_img]:max-w-full" content={info.previewHtml} />
                        : <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line break-words">{info.preview}</p>}
                    </div>
                  </div>
                ) : null}
              </section>

              <div className="min-w-0 space-y-5">
              {/* What's wrong */}
              <fieldset>
                <legend className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">{L('What is the problem?', 'समस्या क्या है?')}</legend>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5">
                  {REPORT_REASONS.map((r, i) => {
                    const on = reason === r.key;
                    return (
                      <button key={r.key} type="button" onClick={() => setReason(r.key)} aria-pressed={on} {...(i === 0 ? { 'data-autofocus': true } : {})}
                        className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-medium leading-snug text-center inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e4e79] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${on ? 'border-[#1e4e79] bg-[#1e4e79] text-white dark:border-blue-500 dark:bg-blue-600' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#1e4e79] hover:bg-slate-50 dark:hover:border-blue-400 dark:hover:bg-slate-800'}`}>
                        {on ? <Check className="h-4 w-4 shrink-0" /> : null}<span>{hi ? r.hi : r.en}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label htmlFor="report-message" className="text-sm font-semibold text-slate-900 dark:text-white">
                  {L('Describe the problem', 'समस्या का विवरण')} <span className="font-normal text-slate-500">{needsMessage ? L('(required)', '(ज़रूरी)') : L('(optional)', '(वैकल्पिक)')}</span>
                </label>
                <textarea id="report-message" value={message} onChange={e => setMessage(e.target.value.slice(0, MAX))} rows={4}
                  placeholder={L('For example: the correct answer should be option C, because…', 'उदाहरण: सही उत्तर विकल्प C होना चाहिए, क्योंकि…')}
                  className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-3 text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-y min-h-[110px] focus:outline-none focus:border-[#1e4e79] focus:ring-1 focus:ring-[#1e4e79]" />
                <p className="mt-1 text-xs text-slate-400 text-right tabular-nums">{message.length}/{MAX}</p>
              </div>

              {error ? <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300">{error}</p> : null}
              </div>
            </div>

            {/* Actions */}
            <div className="shrink-0 grid grid-cols-[2fr_3fr] sm:flex sm:justify-end gap-2.5 px-5 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <button type="button" onClick={onClose} disabled={busy}
                className="h-11 sm:min-w-[130px] px-5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50">{L('Cancel', 'रद्द करें')}</button>
              <button type="submit" disabled={busy}
                className="h-11 sm:min-w-[180px] px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}{L('Send report', 'रिपोर्ट भेजें')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
