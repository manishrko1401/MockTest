"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Send, Trash2, X } from 'lucide-react';
import MathJaxText from '../../lib/MathJaxText';
import { processQuestionHtml } from '../../lib/mathUtils';
import type { Question } from '../../useTestEngine';
import { btnPrimary, inputCls } from '../../components/SiteUI';
import { Comparison, RoomMember, RoomMessage, colorFor, fmtTime, initials, roomApi } from '../shared';

// One question in a friends room: the question with the correct answer, which option each
// friend chose and how long they took, and the discussion chat for that question.

const OPT = 'ABCDEFGHIJ';

export default function QuestionDiscussion({
  code, index, comparison, members, question, lang, hi, onClose, onMove, onCountChange,
}: {
  code: string; index: number; comparison: Comparison; members: RoomMember[]; question: Question | null;
  lang: 'en' | 'hi'; hi: boolean; onClose: () => void; onMove: (delta: number) => void; onCountChange: (questionId: string, n: number) => void;
}) {
  const q = comparison.questions[index];
  const section = comparison.sections.find(s => s.id === q.sectionId);
  const nameOf = (id: string) => members.find(m => m.userId === id)?.name || 'Student';
  const [messages, setMessages] = useState<RoomMessage[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(-1);

  const load = useCallback(async () => {
    try {
      const r = await roomApi<{ messages: RoomMessage[] }>('room-messages', { code, questionId: q.id });
      setMessages(r.messages);
      if (r.messages.length !== lastCount.current) {
        lastCount.current = r.messages.length;
        onCountChange(q.id, r.messages.length);
        requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, [code, q.id, onCountChange]);

  // New messages appear within a few seconds while the question is open
  useEffect(() => {
    setMessages(null); setError(''); lastCount.current = -1;
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') onMove(1);
      if (e.key === 'ArrowLeft') onMove(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onMove]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true); setError('');
    try {
      await roomApi('room-send', { code, questionId: q.id, text: t });
      setText('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    try { await roomApi('room-delete-message', { code, id }); await load(); } catch (e: any) { setError(e.message); }
  };

  const content = question ? (question.content[lang]?.questionText ? question.content[lang] : question.content.en) : null;
  const options = (content?.options || []) as any[];
  // who picked which option
  const picks = comparison.results.map(r => ({ userId: r.userId, ans: r.answers[index] }));
  const fastestCorrect = picks.filter(p => p.ans?.[2] === 1).sort((a, b) => a.ans[1] - b.ans[1])[0]?.userId;

  return (
    <div className="fixed inset-0 z-[10000] flex items-stretch sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 sm:rounded-xl shadow-2xl flex flex-col max-h-full sm:max-h-[92vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer" aria-label={hi ? 'पिछला' : 'Previous'}><ChevronLeft className="h-5 w-5" /></button>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{hi ? 'प्रश्न' : 'Question'} {q.n}</div>
              <div className="text-xs text-slate-500 truncate">{section?.name}</div>
            </div>
            <button type="button" onClick={() => onMove(1)} disabled={index === comparison.questions.length - 1} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer" aria-label={hi ? 'अगला' : 'Next'}><ChevronRight className="h-5 w-5" /></button>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label={hi ? 'बंद करें' : 'Close'}><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 min-h-0 grid md:grid-cols-[1fr_360px] overflow-y-auto md:overflow-hidden">
          {/* Question, answer and friends' picks */}
          <div className="p-4 sm:p-5 md:overflow-y-auto space-y-4 text-[15px]">
            {!question ? (
              <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{hi ? 'प्रश्न लोड हो रहा है…' : 'Loading question…'}</div>
            ) : (
              <>
                {content?.comprehension && (
                  <MathJaxText component="div" className="markup-content text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 rounded-md p-3 border border-slate-200 dark:border-slate-800" content={processQuestionHtml(content.comprehension)} />
                )}
                <MathJaxText component="div" className="font-semibold text-slate-900 dark:text-white leading-relaxed markup-content" content={processQuestionHtml(content?.questionText || '')} />
                {content?.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={content.imageUrl} alt="" className="max-h-72 object-contain mx-auto rounded border border-slate-200 dark:border-slate-800" />
                )}
                <div className="space-y-2.5">
                  {options.map((opt, i) => {
                    const label = typeof opt === 'string' ? opt : opt.text;
                    const correct = i === q.correct;
                    const who = picks.filter(p => p.ans?.[0] === i && p.ans?.[2] !== null);
                    return (
                      <div key={i} className={`rounded-lg border p-3 ${correct ? 'border-green-500 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : who.length ? 'border-red-300 bg-red-50/40 dark:border-red-900 dark:bg-red-950/10' : 'border-slate-200 dark:border-slate-800'}`}>
                        <div className="flex items-start gap-3">
                          <span className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${correct ? 'bg-green-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{OPT[i]}</span>
                          <MathJaxText content={processQuestionHtml(label)} className="flex-1 min-w-0" />
                        </div>
                        {who.length > 0 && (
                          <div className="mt-2 ml-9 flex flex-wrap gap-1.5">
                            {who.map(p => (
                              <span key={p.userId} className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 pl-0.5 pr-2 py-0.5 text-xs text-slate-700 dark:text-slate-300">
                                <span className="h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: colorFor(p.userId) }}>{initials(nameOf(p.userId))}</span>
                                {nameOf(p.userId).split(' ')[0]} · {fmtTime(p.ans[1])}{p.userId === fastestCorrect ? ' ⚡' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {picks.some(p => p.ans?.[2] === null) && (
                  <p className="text-xs text-slate-500">
                    {hi ? 'छोड़ा' : 'Skipped'}: {picks.filter(p => p.ans?.[2] === null).map(p => `${nameOf(p.userId).split(' ')[0]} (${fmtTime(p.ans?.[1] || 0)})`).join(', ')}
                  </p>
                )}
                {question.explanation && (question.explanation[lang] || question.explanation.en) && (
                  <div className="rounded-md bg-[#eef3f8] dark:bg-slate-800/50 p-3">
                    <div className="text-xs font-semibold text-[#1e4e79] dark:text-blue-300 mb-1">{hi ? 'व्याख्या' : 'Explanation'}</div>
                    <MathJaxText component="div" className="markup-content text-sm text-slate-700 dark:text-slate-300" content={processQuestionHtml(question.explanation[lang] || question.explanation.en)} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Discussion */}
          <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col min-h-[360px] md:min-h-0">
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white">
              {hi ? 'चर्चा' : 'Discussion'} {messages ? `(${messages.length})` : ''}
            </div>
            <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50/60 dark:bg-slate-950/30">
              {messages === null ? (
                <div className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{hi ? 'लोड हो रहा है…' : 'Loading…'}</div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-slate-500">{hi ? 'अभी कोई संदेश नहीं। अपना तरीका या सवाल लिखें।' : 'No messages yet. Share your method or ask a doubt.'}</p>
              ) : messages.map(m => (
                <div key={m.id} className={`flex gap-2 ${m.mine ? 'flex-row-reverse' : ''}`}>
                  <span className="h-7 w-7 shrink-0 rounded-full text-[11px] font-bold text-white flex items-center justify-center" style={{ background: colorFor(m.userId) }}>{initials(m.name)}</span>
                  <div className={`group max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.mine ? 'bg-[#1e4e79] text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'}`}>
                    <div className={`text-[11px] mb-0.5 flex items-center gap-2 ${m.mine ? 'text-white/70' : 'text-slate-500'}`}>
                      <span className="font-semibold">{m.mine ? (hi ? 'आप' : 'You') : m.name}</span>
                      <span>{new Date(m.createdAt).toLocaleString(hi ? 'hi-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                      {m.canDelete && (
                        <button type="button" onClick={() => remove(m.id)} className="opacity-60 hover:opacity-100 cursor-pointer" aria-label={hi ? 'हटाएं' : 'Delete'}><Trash2 className="h-3 w-3" /></button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words select-text">{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              {error && <p className="text-xs text-[#b02a37]">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea value={text} onChange={e => setText(e.target.value.slice(0, 1000))} rows={2}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  className={`${inputCls} h-auto py-2 resize-none`} placeholder={hi ? 'इस प्रश्न पर लिखें…' : 'Write about this question…'} />
                <button type="button" onClick={send} disabled={sending || !text.trim()} className={`${btnPrimary} h-10 px-3`} aria-label={hi ? 'भेजें' : 'Send'}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
