"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, Check, CheckCheck, CheckCircle2, Clock, Copy, Crown, Inbox, Info, Keyboard, Loader2, Mail, MessageSquare,
  Monitor, Moon, Pencil, Phone, RefreshCw, RotateCcw, Search, Send, Smartphone, StickyNote, Target, Timer, Trash2, X,
} from 'lucide-react';
import { platformLabel, normalizePlatform } from '../../lib/platformLabels';

// -----------------------------------------------------------------------------
// Admin → Support helpdesk. Numbers at the top; the inbox (waiting for a reply first, how long
// each student has waited); the conversation (day separators, seen ticks, edit / delete own
// replies, quick replies, resolve); and the student next to it (profile, plan, what they're
// doing now, tests, devices, private staff note).
// -----------------------------------------------------------------------------

type Thread = {
  userId: string; name: string; email: string; candidateCode: string | null; mobile: string | null; tier: string; joined: string | null; isBlocked: boolean;
  state: 'waiting' | 'replied' | 'resolved'; total: number; unread: number; firstAt: string | null; lastAt: string | null; waitingSince: string | null;
  lastMessage: string; lastFromStaff: boolean; resolvedAt: string | null; resolvedBy: string | null; note: string;
  presence: { state: string; activity: string; platform: string | null } | null; lastSeen: string | null; lastPlatform: string | null;
};
type Msg = { id: string; sender: 'ADMIN' | 'STUDENT'; message: string; isRead: boolean; createdAt: string };

const api = async (action: string, data: object = {}) => {
  const r = await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data }) });
  return r.json();
};
const ago = (iso?: string | null) => {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}d` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
/** "5m ago", "just now", "never" */
const seen = (iso?: string | null) => { const v = ago(iso); return !v ? 'never' : v === 'now' ? 'just now' : `${v} ago`; };
const waitText = (iso?: string | null) => {
  if (!iso) return '';
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ${m % 60} min` : `${Math.floor(h / 24)} d ${h % 24} h`;
};
const fmtDur = (secs?: number | null) => {
  if (secs == null) return '—';
  const m = Math.round(secs / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ${m % 60} min` : `${Math.floor(h / 24)} d ${h % 24} h`;
};
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date(); const y = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
const TIER: Record<string, string> = { None: 'No pass', 'Testbook Pass': 'Pass', 'Testbook Pass Pro': 'Pass Pro' };

const QUICK_REPLIES: [string, string][] = [
  ['Greeting', 'Hello! Thank you for contacting Mock Test Hub support. How can we help you?'],
  ['Checking', 'Thanks for letting us know. We are checking this and will update you shortly.'],
  ['Fixed', 'This has been fixed now. Please check again and let us know if you face any other problem.'],
  ['Pass Pro', 'Your Pass Pro is active on your account. Please sign out and sign in again once, then all premium tests will open.'],
  ['Update app', 'Please update the app to the latest version (open the app, the update will show), then try again.'],
  ['Hindi', 'नमस्ते! Mock Test Hub सपोर्ट से संपर्क करने के लिए धन्यवाद। हम आपकी समस्या देख रहे हैं और जल्द ही जवाब देंगे।'],
];

const card = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg';

function StatePill({ t }: { t: Thread }) {
  if (t.state === 'resolved') return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"><CheckCircle2 className="h-3 w-3" />Resolved</span>;
  if (t.state === 'waiting') {
    const long = t.waitingSince && Date.now() - new Date(t.waitingSince).getTime() > 24 * 3600 * 1000;
    return <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${long ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900' : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'}`}><Clock className="h-3 w-3" />Waiting {waitText(t.waitingSince)}</span>;
  }
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"><Check className="h-3 w-3" />Replied</span>;
}

function Avatar({ name, online, away, size = 'h-9 w-9' }: { name: string; online?: boolean; away?: boolean; size?: string }) {
  return (
    <span className={`relative ${size} rounded-full bg-[#1e4e79]/10 dark:bg-blue-500/15 text-[#1e4e79] dark:text-blue-300 text-xs font-semibold flex items-center justify-center shrink-0`}>
      {initials(name)}
      {online ? <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${away ? 'bg-amber-400' : 'bg-emerald-500'}`} /> : null}
    </span>
  );
}

export function SupportHelpdesk({ showToast, onUnreadChange }: { showToast: (m: string) => void; onUnreadChange?: (n: number) => void }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<'waiting' | 'unread' | 'all' | 'resolved'>('waiting');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<'list' | 'chat' | 'info'>('list');
  const [loadingInbox, setLoadingInbox] = useState(false);

  const loadInbox = useCallback(async (spin = false) => {
    if (spin) setLoadingInbox(true);
    try {
      const j = await api('support-inbox');
      if (j.success) { setThreads(j.threads); setStats(j.stats); onUnreadChange?.(j.stats.unread); }
    } catch { /* keep the last copy */ }
    if (spin) setLoadingInbox(false);
  }, [onUnreadChange]);
  useEffect(() => {
    loadInbox();
    const t = setInterval(() => { if (document.visibilityState === 'visible') loadInbox(); }, 15000);
    return () => clearInterval(t);
  }, [loadInbox]);

  // First visit with nothing waiting: show all conversations
  const firstLoad = useRef(true);
  useEffect(() => {
    if (threads && firstLoad.current) { firstLoad.current = false; if (!threads.some(t => t.state === 'waiting')) setFilter('all'); }
  }, [threads]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const l = (threads || []).filter(t => {
      if (filter === 'waiting' && t.state !== 'waiting') return false;
      if (filter === 'unread' && !t.unread) return false;
      if (filter === 'resolved' && t.state !== 'resolved') return false;
      return !term || [t.name, t.email, t.candidateCode, t.mobile, t.lastMessage].some(v => (v || '').toLowerCase().includes(term));
    });
    // Waiting longest first; otherwise newest first
    return filter === 'waiting' ? l.sort((a, b) => (a.waitingSince || '').localeCompare(b.waitingSince || '')) : l;
  }, [threads, filter, q]);
  const open = (threads || []).find(t => t.userId === openId) || null;
  const counts = {
    waiting: (threads || []).filter(t => t.state === 'waiting').length,
    unread: (threads || []).filter(t => t.unread).length,
    all: threads?.length || 0,
    resolved: (threads || []).filter(t => t.state === 'resolved').length,
  };

  const select = (id: string) => { setOpenId(id); setMobilePane('chat'); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Support helpdesk</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Messages from students on the website and the apps. Replies also reach their phone as a notification.</p>
        </div>
        <button type="button" onClick={() => loadInbox(true)} className="h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer">
          <RefreshCw className={`h-4 w-4 ${loadingInbox ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {([
          [AlertTriangle, 'Waiting for reply', stats?.waiting, stats?.waitingLong ? `${stats.waitingLong} over 24 hours` : 'none over 24 hours', stats?.waitingLong ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'],
          [Mail, 'Unread messages', stats?.unread, `${stats?.receivedToday ?? 0} received today`, 'text-[#1e4e79] dark:text-blue-400'],
          [Send, 'Replied today', stats?.repliesToday, 'staff messages', 'text-emerald-600 dark:text-emerald-400'],
          [Timer, 'Average first reply', stats ? fmtDur(stats.avgFirstReplySeconds) : undefined, 'last 30 days', 'text-violet-600 dark:text-violet-400'],
          [Inbox, 'Conversations', stats?.total, `${stats?.newThisWeek ?? 0} new this week`, 'text-slate-600 dark:text-slate-300'],
          [CheckCircle2, 'Resolved', stats?.resolved, `${stats?.onlineNow ?? 0} students online now`, 'text-emerald-600 dark:text-emerald-400'],
        ] as const).map(([Icon, l, v, sub, tone]) => (
          <div key={l} className={`${card} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Icon className={`h-4 w-4 ${tone}`} />{l}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">{v ?? '…'}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[330px_1fr_320px] gap-4 lg:h-[calc(100vh-290px)] lg:min-h-[560px]">
        {/* Inbox */}
        <section className={`${card} flex flex-col min-h-0 min-w-0 ${mobilePane === 'list' ? '' : 'hidden lg:flex'}`} aria-label="Conversations">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, Hub ID or message"
                className="w-full h-9 pl-8 pr-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1e4e79]" />
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-md bg-slate-100 dark:bg-slate-800 p-0.5" role="tablist">
              {(['waiting', 'unread', 'all', 'resolved'] as const).map(k => (
                <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
                  className={`h-7 rounded text-[11px] font-semibold capitalize cursor-pointer ${filter === k ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                  {k} <span className="font-normal opacity-70">{counts[k]}</span>
                </button>
              ))}
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {!threads ? <li className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#1e4e79]" /></li> : null}
            {threads && list.length === 0 ? (
              <li className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                {filter === 'waiting' ? <><CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />Everyone has a reply.</> : 'No conversations here.'}
              </li>
            ) : null}
            {list.map(t => (
              <li key={t.userId}>
                <button type="button" onClick={() => select(t.userId)}
                  className={`w-full text-left px-3 py-3 flex items-start gap-3 cursor-pointer ${openId === t.userId ? 'bg-blue-50/70 dark:bg-blue-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                  <Avatar name={t.name} online={!!t.presence} away={t.presence?.state === 'away'} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={`text-sm truncate ${t.unread ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>{t.name}</span>
                      <span className="ml-auto text-[11px] text-slate-400 shrink-0">{ago(t.lastAt)}</span>
                    </span>
                    <span className={`block text-xs truncate mt-0.5 ${t.unread ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                      {t.lastFromStaff ? <span className="text-slate-400">You: </span> : null}{t.lastMessage}
                    </span>
                    <span className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <StatePill t={t} />
                      {t.tier === 'Testbook Pass Pro' ? <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 inline-flex items-center gap-0.5"><Crown className="h-3 w-3" />Pro</span> : null}
                      {t.candidateCode ? <span className="text-[10px] font-mono text-slate-400">{t.candidateCode}</span> : null}
                    </span>
                  </span>
                  {t.unread ? <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">{t.unread}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Conversation */}
        <section className={`${card} flex flex-col min-h-[520px] lg:min-h-0 min-w-0 ${mobilePane === 'chat' ? '' : 'hidden lg:flex'}`} aria-label="Conversation">
          {open ? (
            <Conversation key={open.userId} t={open} showToast={showToast} onChanged={() => loadInbox()} onBack={() => setMobilePane('list')} onInfo={() => setMobilePane('info')} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 dark:text-slate-400">
              <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">Choose a conversation</p>
              <p className="text-xs mt-1">Students waiting longest are at the top of “Waiting”.</p>
            </div>
          )}
        </section>

        {/* Student */}
        <aside className={`${card} min-h-0 min-w-0 overflow-y-auto ${mobilePane === 'info' ? '' : 'hidden xl:block'}`} aria-label="Student details">
          {open ? <StudentPanel key={open.userId} t={open} showToast={showToast} onChanged={() => loadInbox()} onBack={() => setMobilePane('chat')} />
            : <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">The student’s details show here.</p>}
        </aside>
      </div>
    </div>
  );
}

// ---- Conversation --------------------------------------------------------------------------------

function Conversation({ t, showToast, onChanged, onBack, onInfo }: { t: Thread; showToast: (m: string) => void; onChanged: () => void; onBack: () => void; onInfo: () => void }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [quick, setQuick] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async (markRead: boolean) => {
    try {
      const j = await api('get-support-messages', { userId: t.userId, markAsRead: markRead, readerRole: 'ADMIN' });
      if (j.success) setMsgs(j.messages || []);
    } catch { /* keep */ }
  }, [t.userId]);
  useEffect(() => {
    load(true).then(onChanged);
    const i = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 4000);
    return () => clearInterval(i);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (msgs && msgs.length !== lastCount.current) { lastCount.current = msgs.length; end.current?.scrollIntoView({ block: 'end' }); }
  }, [msgs]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const j = await api('send-support-message', { userId: t.userId, sender: 'ADMIN', message: body });
      if (j.success) { setMsgs(m => [...(m || []), j.message]); setText(''); onChanged(); }
      else showToast(j.error || 'Message not sent.');
    } catch { showToast('No connection. Message not sent.'); }
    setSending(false);
    box.current?.focus();
  };
  const saveEdit = async () => {
    if (!editing?.text.trim()) return;
    const j = await api('edit-support-message', { messageId: editing.id, newMessage: editing.text.trim() });
    if (j.success) { setMsgs(m => (m || []).map(x => (x.id === editing.id ? { ...x, message: editing.text.trim() } : x))); setEditing(null); onChanged(); }
    else showToast(j.error || 'Could not edit.');
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this reply? The student will no longer see it.')) return;
    const j = await api('support-delete-message', { messageId: id });
    if (j.success) { setMsgs(m => (m || []).filter(x => x.id !== id)); onChanged(); } else showToast('Could not delete.');
  };
  const setState = async (status: 'resolved' | 'open') => {
    const j = await api('support-thread-update', { userId: t.userId, status });
    if (j.success) { showToast(status === 'resolved' ? 'Marked as resolved.' : 'Opened again.'); onChanged(); } else showToast(j.error || 'Could not update.');
  };

  // Messages grouped by day
  const groups: { day: string; items: Msg[] }[] = [];
  for (const m of msgs || []) {
    const day = dayLabel(m.createdAt);
    if (!groups.length || groups[groups.length - 1].day !== day) groups.push({ day, items: [] });
    groups[groups.length - 1].items.push(m);
  }
  const lastStaff = [...(msgs || [])].reverse().find(m => m.sender === 'ADMIN');

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <button type="button" onClick={onBack} className="lg:hidden h-8 w-8 -ml-1 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Back to conversations"><ArrowLeft className="h-4 w-4" /></button>
        <Avatar name={t.name} online={!!t.presence} away={t.presence?.state === 'away'} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{t.name} {t.candidateCode ? <span className="font-mono text-[11px] font-normal text-slate-400">{t.candidateCode}</span> : null}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {t.presence ? <span className="text-emerald-700 dark:text-emerald-300">{t.presence.state === 'away' ? 'Away' : 'Online'} · {t.presence.activity || platformLabel(t.presence.platform)}</span> : `Last seen ${seen(t.lastSeen)}`}
          </p>
        </div>
        <span className="hidden sm:inline-flex shrink-0"><StatePill t={t} /></span>
        {t.state === 'resolved'
          ? <button type="button" onClick={() => setState('open')} className="shrink-0 h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"><RotateCcw className="h-3.5 w-3.5" />Reopen</button>
          : <button type="button" onClick={() => setState('resolved')} className="shrink-0 h-8 px-2.5 rounded-md border border-emerald-600 text-emerald-700 dark:text-emerald-400 text-xs font-medium inline-flex items-center gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"><CheckCircle2 className="h-3.5 w-3.5" />Resolve</button>}
        <button type="button" onClick={onInfo} className="xl:hidden h-8 w-8 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Student details"><Info className="h-4 w-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50/60 dark:bg-slate-950/40 space-y-4">
        {!msgs ? <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#1e4e79]" /></div> : null}
        {groups.map(g => (
          <div key={g.day} className="space-y-2">
            <div className="flex items-center gap-3 text-[11px] text-slate-400"><span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />{g.day}<span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" /></div>
            {g.items.map(m => {
              const mine = m.sender === 'ADMIN';
              const isEditing = editing?.id === m.id;
              return (
                <div key={m.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${mine ? 'bg-[#1e4e79] text-white rounded-br-md' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-md'}`}>
                    {isEditing ? (
                      <div className="space-y-2 min-w-[240px]">
                        <textarea value={editing!.text} onChange={e => setEditing({ id: m.id, text: e.target.value })} rows={3} autoFocus className="w-full rounded-md p-2 text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none" />
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => setEditing(null)} className="h-7 px-2 rounded text-xs bg-white/20 hover:bg-white/30 cursor-pointer">Cancel</button>
                          <button type="button" onClick={saveEdit} className="h-7 px-2 rounded text-xs bg-white text-[#1e4e79] font-semibold cursor-pointer">Save</button>
                        </div>
                      </div>
                    ) : <p className="whitespace-pre-wrap break-words leading-relaxed">{m.message}</p>}
                    <p className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? 'text-blue-100 justify-end' : 'text-slate-400'}`}>
                      {time(m.createdAt)}
                      {mine ? (m.isRead ? <><CheckCheck className="h-3 w-3" />{lastStaff?.id === m.id ? ' Seen' : ''}</> : <Check className="h-3 w-3" />) : null}
                    </p>
                  </div>
                  {mine && !isEditing ? (
                    <div className="self-center ml-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex flex-col gap-0.5 order-first mr-1">
                      <button type="button" onClick={() => setEditing({ id: m.id, text: m.message })} className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-[#1e4e79] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Edit reply"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => remove(m.id)} className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Delete reply"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
        <div ref={end} />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2">
        {quick ? (
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REPLIES.map(([l, body]) => (
              <button key={l} type="button" onClick={() => { setText(v => (v ? `${v}\n${body}` : body)); setQuick(false); box.current?.focus(); }}
                className="h-7 px-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 hover:border-[#1e4e79] hover:text-[#1e4e79] cursor-pointer" title={body}>{l}</button>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <button type="button" onClick={() => setQuick(v => !v)} aria-pressed={quick} className={`h-10 px-2.5 rounded-md border text-xs font-medium cursor-pointer shrink-0 ${quick ? 'border-[#1e4e79] text-[#1e4e79] bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>Quick replies</button>
          <textarea ref={box} value={text} onChange={e => setText(e.target.value.slice(0, 4000))} rows={Math.min(5, Math.max(1, text.split('\n').length))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Type a reply to ${t.name.split(' ')[0]}…`} aria-describedby="reply-hint"
            className="flex-1 resize-none rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1e4e79] focus:ring-1 focus:ring-[#1e4e79]" />
          <button type="button" onClick={send} disabled={!text.trim() || sending} className="h-10 px-4 rounded-md bg-[#1e4e79] hover:bg-[#173d60] text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send
          </button>
        </div>
        <p id="reply-hint" className="text-[11px] text-slate-400">Enter to send · Shift+Enter for a new line · the student also gets a phone notification</p>
      </div>
    </>
  );
}

// ---- Student panel -------------------------------------------------------------------------------

function StudentPanel({ t, showToast, onChanged, onBack }: { t: Thread; showToast: (m: string) => void; onChanged: () => void; onBack: () => void }) {
  const [ctx, setCtx] = useState<any>(null);
  const [note, setNote] = useState(t.note);
  const [savingNote, setSavingNote] = useState(false);
  const [copied, setCopied] = useState('');
  useEffect(() => {
    let alive = true;
    api('support-student-context', { userId: t.userId }).then(j => { if (alive && j.success) setCtx(j); }).catch(() => {});
    return () => { alive = false; };
  }, [t.userId]);
  const copy = (v: string, k: string) => navigator.clipboard?.writeText(v).then(() => { setCopied(k); setTimeout(() => setCopied(''), 1400); }).catch(() => {});
  const saveNote = async () => {
    setSavingNote(true);
    const j = await api('support-thread-update', { userId: t.userId, note });
    setSavingNote(false);
    if (j.success) { showToast('Note saved.'); onChanged(); } else showToast(j.error || 'Could not save the note.');
  };
  const u = ctx?.user;
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex gap-3 py-1.5 text-sm"><dt className="w-28 shrink-0 text-slate-500 dark:text-slate-400">{k}</dt><dd className="flex-1 min-w-0 text-slate-900 dark:text-slate-100 break-words">{v}</dd></div>
  );

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      <div className="p-4">
        <button type="button" onClick={onBack} className="xl:hidden mb-3 inline-flex items-center gap-1 text-xs font-medium text-[#1e4e79] dark:text-blue-300 cursor-pointer"><ArrowLeft className="h-3.5 w-3.5" />Back to chat</button>
        <div className="flex items-center gap-3">
          <Avatar name={t.name} online={!!t.presence} away={t.presence?.state === 'away'} size="h-12 w-12" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.tier === 'Testbook Pass Pro' ? 'Pass Pro' : TIER[t.tier] || t.tier}{t.isBlocked ? ' · blocked' : ''}</p>
          </div>
        </div>
        {t.presence ? (
          <div className="mt-3 rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/20 px-3 py-2">
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">{t.presence.state === 'away' ? <Moon className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}{t.presence.state === 'away' ? 'Away' : 'Online now'} · {platformLabel(t.presence.platform)}</p>
            <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5 break-words">{t.presence.activity || '—'}</p>
          </div>
        ) : null}
      </div>

      <dl className="p-4">
        {row('Email', <button type="button" onClick={() => copy(t.email, 'e')} className="text-left break-all cursor-pointer hover:text-[#1e4e79]">{t.email}{copied === 'e' ? <Check className="inline h-3.5 w-3.5 ml-1 text-emerald-600" /> : <Copy className="inline h-3 w-3 ml-1 opacity-50" />}</button>)}
        {t.mobile ? row('Mobile', <a href={`tel:${t.mobile}`} className="inline-flex items-center gap-1 hover:text-[#1e4e79]"><Phone className="h-3 w-3" />{t.mobile}</a>) : null}
        {t.candidateCode ? row('Hub ID', <button type="button" onClick={() => copy(t.candidateCode!, 'c')} className="font-mono cursor-pointer hover:text-[#1e4e79]">{t.candidateCode}{copied === 'c' ? <Check className="inline h-3.5 w-3.5 ml-1 text-emerald-600" /> : null}</button>) : null}
        {row('Joined', t.joined ? new Date(t.joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')}
        {row('Last seen', t.presence ? 'now' : `${seen(t.lastSeen)} · ${platformLabel(t.lastPlatform)}`)}
        {u?.tierExpiresAt && t.tier !== 'None' ? row('Plan until', new Date(u.tierExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })) : null}
        {u ? row('Coins', u.coins || 0) : null}
        {row('Conversation', `${t.total} message${t.total === 1 ? '' : 's'} since ${t.firstAt ? new Date(t.firstAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}`)}
        {t.resolvedAt ? row('Resolved', `${seen(t.resolvedAt)}${t.resolvedBy ? ` by ${t.resolvedBy}` : ''}`) : null}
      </dl>

      <div className="p-4">
        <p className="text-xs font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-[#1e4e79]" />Tests</p>
        {!ctx ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 py-2"><p className="text-base font-semibold text-slate-900 dark:text-white">{ctx.mock.completed}</p><p className="text-[10px] text-slate-500">mock tests</p></div>
              <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 py-2"><p className="text-base font-semibold text-slate-900 dark:text-white">{ctx.mock.avgAccuracy != null ? `${Math.round(ctx.mock.avgAccuracy)}%` : '—'}</p><p className="text-[10px] text-slate-500">accuracy</p></div>
              <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 py-2"><p className="text-base font-semibold text-slate-900 dark:text-white">{ctx.typing?.total ?? '—'}</p><p className="text-[10px] text-slate-500 inline-flex items-center gap-0.5"><Keyboard className="h-2.5 w-2.5" />typing</p></div>
            </div>
            {ctx.mock.recent.length ? (
              <ul className="mt-3 space-y-1.5">
                {ctx.mock.recent.map((a: any) => (
                  <li key={a.id} className="text-xs flex items-start gap-2">
                    <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${a.status === 'ONGOING' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                    <span className="flex-1 min-w-0"><span className="block text-slate-800 dark:text-slate-200 truncate">{a.title}</span>
                      <span className="text-slate-500">{a.status === 'ONGOING' ? 'in progress' : `${Number(a.score || 0).toFixed(1)}/${a.maxScore ?? '—'}`} · {seen(a.completedAt || a.startedAt)}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-xs text-slate-500">No tests taken yet.</p>}
            {ctx.support.reports ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{ctx.support.reports} question report{ctx.support.reports === 1 ? '' : 's'} sent</p> : null}
          </>
        )}
      </div>

      {ctx?.devices?.length ? (
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-900 dark:text-white mb-2">Devices</p>
          <ul className="space-y-1.5">
            {ctx.devices.map((d: any) => (
              <li key={d.platform} className="text-xs flex items-center gap-2 text-slate-700 dark:text-slate-300">
                {normalizePlatform(d.platform) === 'web_desktop' || d.platform === 'windows' ? <Monitor className="h-3.5 w-3.5 text-slate-400" /> : <Smartphone className="h-3.5 w-3.5 text-slate-400" />}
                <span className="flex-1">{platformLabel(d.platform)}{d.appVersion ? ` ${d.appVersion}` : ''}{d.osInfo ? <span className="text-slate-400"> · {d.osInfo}</span> : null}</span>
                <span className="text-slate-400">{ago(d.lastSeen)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="p-4">
        <label htmlFor="support-note" className="text-xs font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5"><StickyNote className="h-3.5 w-3.5 text-amber-500" />Staff note <span className="font-normal text-slate-400">(only staff see this)</span></label>
        <textarea id="support-note" value={note} onChange={e => setNote(e.target.value.slice(0, 4000))} rows={3} placeholder="e.g. Payment issue, asked for screenshot on 25 Oct"
          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-amber-50/40 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1e4e79]" />
        <div className="mt-2 flex justify-end">
          <button type="button" onClick={saveNote} disabled={savingNote || note === t.note} className="h-8 px-3 rounded-md bg-[#1e4e79] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40">
            {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Save note
          </button>
        </div>
      </div>
    </div>
  );
}
