"use client";

import React, { useMemo, useState } from 'react';
import { Activity, Monitor, Smartphone, Search, Moon } from 'lucide-react';
import { platformLabel } from '../../lib/platformLabels';

// -----------------------------------------------------------------------------
// Admin → User management → Live now: every student online right now, what they are doing,
// on which device and since when. Updated every 30 seconds by the admin page.
// -----------------------------------------------------------------------------

export type LivePresence = {
  userId: string; state: 'active' | 'away'; activity: string; platform: string | null;
  onlineSince: string; updatedAt: string; name: string; email: string; candidateCode: string | null;
};

const since = (iso: string, now: number) => {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

/** What a student is doing, with the test / exam part in bold. */
function ActivityText({ text }: { text: string }) {
  const m = /^(Taking|Viewing result:|Test details:|Typing test:|Typing demo:|Reading notice:|Submitted|Finished typing test:|Taking CBAT:|Viewing typing result:)\s*(.*)$/.exec(text);
  if (!m) return <span>{text || '—'}</span>;
  return <span>{m[1]} <strong className="font-semibold text-slate-900 dark:text-white">{m[2]}</strong></span>;
}

export function LiveNowPanel({ online, loadedAt, onOpenUser }: { online: LivePresence[] | null; loadedAt: number; onOpenUser: (userId: string) => void }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (online || []).filter(p => !term || [p.name, p.email, p.candidateCode, p.activity].some(v => (v || '').toLowerCase().includes(term)));
  }, [online, q]);
  const active = (online || []).filter(p => p.state === 'active').length;

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden" aria-labelledby="live-now-title">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <h3 id="live-now-title" className="text-sm font-semibold text-slate-900 dark:text-white">Live now</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {online ? `${active} active · ${online.length - active} away` : 'Loading…'} · updates every 30 s
          </span>
        </div>
        <div className="relative sm:w-64">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, code or activity"
            className="w-full h-8 pl-8 pr-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1e4e79]" />
        </div>
      </div>

      {online && list.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">{online.length ? 'No one matches.' : 'No students online right now.'}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
          {list.map(p => {
            const app = p.platform === 'android' || p.platform === 'windows' || p.platform === 'web_mobile';
            return (
              <li key={p.userId}>
                <button type="button" onClick={() => onOpenUser(p.userId)}
                  className="w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${p.state === 'active' ? 'bg-emerald-500' : 'bg-amber-400'}`} aria-hidden />
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">{p.name || p.email}</span>
                      {p.candidateCode ? <span className="font-mono text-[11px] text-[#1e4e79] dark:text-blue-300">{p.candidateCode}</span> : null}
                      {p.state === 'away' ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded px-1"><Moon className="h-2.5 w-2.5" />Away</span> : null}
                    </span>
                    <span className="block text-xs text-slate-600 dark:text-slate-300 mt-0.5 break-words">
                      <Activity className="inline h-3 w-3 mr-1 -mt-0.5 text-emerald-600" aria-hidden /><ActivityText text={p.activity} />
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="flex items-center justify-end gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {app ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}{platformLabel(p.platform)}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">online {since(p.onlineSince, loadedAt)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
