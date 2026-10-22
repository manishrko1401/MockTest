"use client";

import React, { useMemo, useState } from 'react';
import { Check, Crown, MessageSquare, Minus, Swords, Timer, X, Zap } from 'lucide-react';
import { SectionCard, StatusBadge, inputCls } from '../../components/SiteUI';
import { Comparison as ComparisonData, MemberResult, RoomMember, colorFor, fmtNum, fmtTime, initials } from '../shared';

// The results part of a friends room: leaderboard, section-wise marks, head-to-head with one
// friend, and every question (who got it right and how long each friend took).

type Filter = 'all' | 'tough' | 'missed' | 'split' | 'slow';

function Avatar({ id, name, size = 28 }: { id: string; name: string; size?: number }) {
  return (
    <span className="shrink-0 rounded-full font-bold text-white flex items-center justify-center" style={{ background: colorFor(id), width: size, height: size, fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  );
}

function Cell({ a, fastest }: { a: [number | null, number, 1 | 0 | null] | undefined; fastest: boolean }) {
  if (!a) return <span className="text-slate-300">·</span>;
  const [, t, r] = a;
  const icon = r === 1 ? <Check className="h-3.5 w-3.5" /> : r === 0 ? <X className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />;
  const tone = r === 1 ? 'text-[#1e7e34] bg-green-50 dark:bg-green-950/30 dark:text-green-400' : r === 0 ? 'text-[#b02a37] bg-red-50 dark:bg-red-950/30 dark:text-red-400' : 'text-slate-500 bg-slate-100 dark:bg-slate-800';
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs tabular-nums whitespace-nowrap ${tone} ${fastest ? 'ring-1 ring-amber-400' : ''}`}>
      {icon}{t ? fmtTime(t) : ''}{fastest ? <Zap className="h-3 w-3 text-amber-500" /> : null}
    </span>
  );
}

export default function Comparison({
  data, members, meId, hi, messageCounts, onOpenQuestion,
}: {
  data: ComparisonData; members: RoomMember[]; meId: string; hi: boolean;
  messageCounts: Record<string, number>; onOpenQuestion: (index: number) => void;
}) {
  const nameOf = (id: string) => members.find(m => m.userId === id)?.name || 'Student';
  // Leaderboard order: marks, then accuracy, then less time
  // (attempts under integrity review come last, without a rank)
  const ranked = useMemo(() => [...data.results].sort((a, b) => Number(!!a.underReview) - Number(!!b.underReview) || b.score - a.score || b.accuracy - a.accuracy || a.timeSeconds - b.timeSeconds), [data.results]);
  const meIdx = data.results.findIndex(r => r.userId === meId);
  const mine = data.results[meIdx];
  const others = ranked.filter(r => r.userId !== meId);
  const [rival, setRival] = useState<string>(others[0]?.userId || '');
  const [filter, setFilter] = useState<Filter>('all');
  const [sectionId, setSectionId] = useState<string>('all');
  const rivalRes = data.results.find(r => r.userId === rival) || others[0];
  const waiting = members.filter(m => !m.finished);

  // Columns of the question table: you first, then the others by rank
  const columns = [mine, ...others].filter(Boolean) as MemberResult[];

  const rows = useMemo(() => data.questions.map((q, i) => {
    const answers = data.results.map(r => r.answers[i]);
    const correctTimes = data.results.filter(r => r.answers[i]?.[2] === 1).map(r => ({ id: r.userId, t: r.answers[i][1] }));
    const fastest = correctTimes.sort((a, b) => a.t - b.t)[0]?.id;
    const times = answers.map(a => a?.[1] || 0).filter(t => t > 0);
    const avg = times.length ? times.reduce((s, t) => s + t, 0) / times.length : 0;
    const myA = mine?.answers[i];
    return {
      q, i, fastest, avg,
      tough: answers.every(a => a?.[2] !== 1),
      missed: !!myA && myA[2] !== 1 && answers.some(a => a?.[2] === 1),
      split: new Set(answers.filter(a => a?.[2] !== null).map(a => a![0])).size > 1,
      slow: !!myA && avg > 0 && data.results.length > 1 && myA[1] > avg * 1.5 && myA[1] - avg > 20,
    };
  }), [data, mine]);

  const shown = rows.filter(r => (sectionId === 'all' || r.q.sectionId === sectionId) && (filter === 'all' || r[filter]));
  const counts = { all: rows.length, tough: rows.filter(r => r.tough).length, missed: rows.filter(r => r.missed).length, split: rows.filter(r => r.split).length, slow: rows.filter(r => r.slow).length };

  // Head-to-head
  const h2h = useMemo(() => {
    if (!mine || !rivalRes) return null;
    let both = 0, onlyMe = 0, onlyThem = 0, neither = 0, faster = 0, slower = 0;
    data.questions.forEach((_, i) => {
      const a = mine.answers[i], b = rivalRes.answers[i];
      const ac = a?.[2] === 1, bc = b?.[2] === 1;
      if (ac && bc) { both++; if (a[1] < b[1]) faster++; else if (a[1] > b[1]) slower++; }
      else if (ac) onlyMe++;
      else if (bc) onlyThem++;
      else neither++;
    });
    return { both, onlyMe, onlyThem, neither, faster, slower };
  }, [data.questions, mine, rivalRes]);

  const filters: { id: Filter; en: string; hi: string }[] = [
    { id: 'all', en: 'All', hi: 'सभी' },
    { id: 'missed', en: 'You missed, a friend got it', hi: 'आपसे छूटा, दोस्त ने किया' },
    { id: 'tough', en: 'Nobody got it', hi: 'किसी से नहीं हुआ' },
    { id: 'split', en: 'Different answers', hi: 'अलग-अलग उत्तर' },
    { id: 'slow', en: 'You were slow', hi: 'आपने ज़्यादा समय लिया' },
  ];

  return (
    <div className="space-y-6">
      {/* Leaderboard */}
      <SectionCard title={hi ? 'लीडरबोर्ड' : 'Leaderboard'} description={waiting.length ? (hi ? `${waiting.length} दोस्तों ने अभी टेस्ट पूरा नहीं किया।` : `${waiting.length} still to finish the test.`) : undefined} bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium w-12">#</th>
                <th className="px-3 py-2.5 text-left font-medium">{hi ? 'नाम' : 'Name'}</th>
                <th className="px-3 py-2.5 text-right font-medium">{hi ? 'अंक' : 'Marks'}</th>
                <th className="px-3 py-2.5 text-right font-medium">{hi ? 'सटीकता' : 'Accuracy'}</th>
                <th className="px-3 py-2.5 text-right font-medium whitespace-nowrap">{hi ? 'सही / गलत / छोड़े' : 'Right / Wrong / Skipped'}</th>
                <th className="px-5 py-2.5 text-right font-medium">{hi ? 'समय' : 'Time'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ranked.map((r, i) => (
                <tr key={r.userId} className={r.userId === meId ? 'bg-[#eef3f8] dark:bg-slate-800/50' : ''}>
                  <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">{r.underReview ? '–' : i === 0 ? <Crown className="h-4 w-4 text-amber-500" aria-label="1" /> : i + 1}</td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar id={r.userId} name={nameOf(r.userId)} />
                      <span className="font-medium text-slate-900 dark:text-white whitespace-nowrap">{nameOf(r.userId)}{r.userId === meId ? <span className="text-slate-500 font-normal"> ({hi ? 'आप' : 'you'})</span> : null}</span>
                      {r.underReview ? <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 whitespace-nowrap" title={hi ? 'यह परिणाम जांच में है' : 'This result is being checked'}>{hi ? 'जांच में' : 'Under review'}</span> : null}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap font-semibold text-slate-900 dark:text-white">{fmtNum(r.score)}<span className="font-normal text-slate-500"> / {fmtNum(r.maxScore)}</span></td>
                  <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{fmtNum(r.accuracy)}%</td>
                  <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                    <span className="text-[#1e7e34] dark:text-green-400">{r.correct}</span> / <span className="text-[#b02a37] dark:text-red-400">{r.wrong}</span> / <span className="text-slate-500">{r.skipped}</span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums whitespace-nowrap">{fmtTime(r.timeSeconds)}</td>
                </tr>
              ))}
              {waiting.map(m => (
                <tr key={m.userId} className="text-slate-400">
                  <td className="px-5 py-3">–</td>
                  <td className="px-3 py-3"><span className="flex items-center gap-2.5 opacity-70"><Avatar id={m.userId || m.name} name={m.name} />{m.name}</span></td>
                  <td className="px-3 py-3 text-right" colSpan={4}>{hi ? 'टेस्ट बाकी' : 'Not finished yet'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Section-wise */}
      {data.sections.length > 1 && (
        <SectionCard title={hi ? 'विषयवार अंक' : 'Section-wise marks'} bodyClass="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">{hi ? 'विषय' : 'Section'}</th>
                  {columns.map(r => (
                    <th key={r.userId} className="px-3 py-2.5 text-right font-medium whitespace-nowrap">{r.userId === meId ? (hi ? 'आप' : 'You') : nameOf(r.userId).split(' ')[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.sections.map(s => {
                  const best = Math.max(...columns.map(r => r.sections[s.id]?.score ?? -Infinity));
                  return (
                    <tr key={s.id}>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{s.name}<span className="text-xs text-slate-400"> / {fmtNum(s.maxScore)}</span></td>
                      {columns.map(r => {
                        const v = r.sections[s.id];
                        const top = v && v.score === best && columns.length > 1;
                        return (
                          <td key={r.userId} className={`px-3 py-3 text-right tabular-nums whitespace-nowrap ${top ? 'font-semibold text-[#1e7e34] dark:text-green-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {v ? fmtNum(v.score) : '–'}
                            {v ? <div className="text-[11px] font-normal text-slate-400 whitespace-nowrap">{fmtTime(v.time)}</div> : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Head-to-head */}
      {mine && rivalRes && h2h && (
        <SectionCard
          title={<span className="flex items-center gap-2"><Swords className="h-4 w-4 text-[#1e4e79] dark:text-blue-400" />{hi ? 'आमने-सामने' : 'Head-to-head'}</span>}
          action={others.length > 1 ? (
            <select value={rivalRes.userId} onChange={e => setRival(e.target.value)} className={`${inputCls} h-9 w-48`} aria-label={hi ? 'दोस्त चुनें' : 'Choose a friend'}>
              {others.map(o => <option key={o.userId} value={o.userId}>{nameOf(o.userId)}</option>)}
            </select>
          ) : undefined}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            {[mine, null, rivalRes].map((r, side) => r ? (
              <div key={r.userId} className={`flex items-center gap-3 ${side ? 'flex-row-reverse text-right' : ''}`}>
                <Avatar id={r.userId} name={nameOf(r.userId)} size={44} />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{side ? nameOf(r.userId) : (hi ? 'आप' : 'You')}</div>
                  <div className="text-xl sm:text-2xl font-semibold tabular-nums whitespace-nowrap text-slate-900 dark:text-white">{fmtNum(r.score)}<span className="text-sm font-normal text-slate-500"> / {fmtNum(r.maxScore)}</span></div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">{fmtNum(r.accuracy)}% · {fmtTime(r.timeSeconds)}</div>
                </div>
              </div>
            ) : (
              <div key="vs" className="text-sm font-semibold text-slate-400">VS</div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { v: h2h.onlyMe, en: 'Only you got right', hi: 'सिर्फ़ आपके सही', tone: 'text-[#1e7e34] dark:text-green-400' },
              { v: h2h.onlyThem, en: `Only ${nameOf(rivalRes.userId).split(' ')[0]} got right`, hi: `सिर्फ़ ${nameOf(rivalRes.userId).split(' ')[0]} के सही`, tone: 'text-[#b02a37] dark:text-red-400' },
              { v: h2h.both, en: 'Both right', hi: 'दोनों के सही', tone: 'text-slate-900 dark:text-white' },
              { v: h2h.faster, en: 'Both right, you were faster', hi: 'दोनों सही, आप तेज़', tone: 'text-[#1e4e79] dark:text-blue-300' },
            ].map((x, i) => (
              <div key={i} className="rounded-md border border-slate-200 dark:border-slate-800 px-3 py-3">
                <div className={`text-2xl font-semibold tabular-nums whitespace-nowrap ${x.tone}`}>{x.v}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hi ? x.hi : x.en}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Every question */}
      <SectionCard
        title={hi ? 'हर प्रश्न की तुलना' : 'Question by question'}
        description={hi ? 'हर दोस्त का उत्तर और उस प्रश्न पर लगा समय। ⚡ = सबसे तेज़ सही उत्तर। किसी प्रश्न को खोलकर चर्चा करें।' : "Each friend's answer and the time they spent. ⚡ = fastest correct answer. Open a question to discuss it."}
        bodyClass="p-0"
      >
        <div className="px-5 sm:px-6 py-3 flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          {filters.map(f => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)}
              className={`h-8 px-3 rounded-full text-xs font-medium border cursor-pointer ${filter === f.id ? 'bg-[#1e4e79] border-[#1e4e79] text-white' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#1e4e79]/50'}`}>
              {hi ? f.hi : f.en} <span className="opacity-70">({counts[f.id]})</span>
            </button>
          ))}
          {data.sections.length > 1 && (
            <select value={sectionId} onChange={e => setSectionId(e.target.value)} className="h-8 ml-auto px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200 cursor-pointer" aria-label={hi ? 'विषय' : 'Section'}>
              <option value="all">{hi ? 'सभी विषय' : 'All sections'}</option>
              {data.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium sticky left-0 bg-slate-50 dark:bg-slate-900">{hi ? 'प्र.' : 'Q'}</th>
                {columns.map(r => (
                  <th key={r.userId} className="px-2 py-2.5 text-left font-medium whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Avatar id={r.userId} name={nameOf(r.userId)} size={20} />{r.userId === meId ? (hi ? 'आप' : 'You') : nameOf(r.userId).split(' ')[0]}</span>
                  </th>
                ))}
                <th className="px-2 py-2.5 text-right font-medium whitespace-nowrap"><Timer className="h-3.5 w-3.5 inline" /> {hi ? 'औसत' : 'Avg'}</th>
                <th className="px-4 py-2.5 text-right font-medium">{hi ? 'चर्चा' : 'Discuss'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {shown.length === 0 && (
                <tr><td colSpan={columns.length + 3} className="px-5 py-6 text-center text-slate-500">{hi ? 'इस फ़िल्टर में कोई प्रश्न नहीं।' : 'No questions in this filter.'}</td></tr>
              )}
              {shown.map(({ q, i, fastest, avg, tough }) => (
                <tr key={q.id} onClick={() => onOpenQuestion(i)} className="hover:bg-[#f8fafc] dark:hover:bg-slate-800/40 cursor-pointer">
                  <td className="px-4 py-2 sticky left-0 bg-white dark:bg-slate-900 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {q.n}{tough ? <span className="ml-1.5"><StatusBadge tone="red">{hi ? 'कठिन' : 'Tough'}</StatusBadge></span> : null}
                  </td>
                  {columns.map(r => (
                    <td key={r.userId} className="px-2 py-2 whitespace-nowrap"><Cell a={r.answers[i]} fastest={fastest === r.userId && columns.length > 1} /></td>
                  ))}
                  <td className="px-2 py-2 text-right text-xs text-slate-500 tabular-nums whitespace-nowrap whitespace-nowrap">{avg ? fmtTime(avg) : '–'}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs ${messageCounts[q.id] ? 'text-[#1e4e79] dark:text-blue-300 font-semibold' : 'text-slate-400'}`}>
                      <MessageSquare className="h-3.5 w-3.5" />{messageCounts[q.id] || 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
