"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowLeft, Award, BarChart3, Ban, Check, ChevronLeft, ChevronRight, Clock, Coins, Copy, Crown, Download, Gift, Keyboard,
  KeyRound, Loader2, Lock, Mail, Monitor, MonitorSmartphone, Moon, Phone, RefreshCw, Search, ShieldAlert, Smartphone, Target, Trash2,
  UserCog, UserPlus, Users, X,
} from 'lucide-react';
import { useAuth, type MockUser } from '../../AuthContext';
import { platformLabel, normalizePlatform } from '../../lib/platformLabels';
import { LiveNowPanel, type LivePresence } from './LiveNowPanel';

// -----------------------------------------------------------------------------
// Admin → User management. Overview numbers, who is online now (Live now), the student
// directory (search, filters, sorting, pages, CSV) and one student's page: live status,
// numbers, mock and typing tests, referrals, devices and sign-ins, and the profile editor
// (changes need the admin's password, as before).
// -----------------------------------------------------------------------------

type Overview = any;
const PAGE = 25;
const ROLES = ['STUDENT', 'ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'] as const;
const ROLE_LABEL: Record<string, string> = { STUDENT: 'Student', ADMIN: 'Admin', TEST_CREATOR: 'Test creator', SUPPORT_TEAM: 'Support team', NOTICES_MANAGER: 'Notices manager' };
const TIER_LABEL: Record<string, string> = { None: 'No pass', 'Testbook Pass': 'Pass', 'Testbook Pass Pro': 'Pass Pro' };

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const ago = (iso?: string | null) => {
  if (!iso) return 'never';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} day${d === 1 ? '' : 's'} ago` : fmtDate(iso);
};
const dur = (secs?: number | null) => {
  const s = Math.max(0, Math.round(secs || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
const daysLeft = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null);

const card = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg';
const input = 'h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#1e4e79] focus:ring-1 focus:ring-[#1e4e79]';
const label = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

function Pill({ tone = 'slate', children }: { tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'violet'; children: React.ReactNode }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    amber: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
    blue: 'bg-blue-50 text-[#1e4e79] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    violet: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  };
  return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

const tierTone = (t?: string) => (t === 'Testbook Pass Pro' ? 'amber' : t === 'Testbook Pass' ? 'blue' : 'slate') as any;
const roleTone = (r?: string) => (r === 'ADMIN' ? 'red' : r === 'STUDENT' ? 'slate' : 'violet') as any;

function DeviceIcon({ platform, className = 'h-3.5 w-3.5' }: { platform?: string | null; className?: string }) {
  const p = normalizePlatform(platform);
  return p === 'web_desktop' || p === 'windows' ? <Monitor className={className} /> : <Smartphone className={className} />;
}

function Stat({ icon: Icon, label: l, value, sub, tone = 'text-[#1e4e79] dark:text-blue-400' }: { icon: any; label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Icon className={`h-4 w-4 ${tone}`} />{l}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">{value}</p>
      {sub ? <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p> : null}
    </div>
  );
}

function Status({ live, lastSeen, compact }: { live?: LivePresence | null; lastSeen?: string | null; compact?: boolean }) {
  if (live) {
    return live.state === 'away'
      ? <Pill tone="amber"><Moon className="h-3 w-3" />Away</Pill>
      : <Pill tone="green"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Online</Pill>;
  }
  return <span className={`text-xs text-slate-500 dark:text-slate-400 ${compact ? '' : 'whitespace-nowrap'}`}>Seen {ago(lastSeen)}</span>;
}

// ---- The whole section --------------------------------------------------------------------------

export function UserManagement({ usersList, live, liveAt, onRefresh, showToast, examNameOf, currentUserId }: {
  usersList: MockUser[];
  live: LivePresence[] | null;
  liveAt: number;
  onRefresh: () => Promise<void> | void;
  showToast: (msg: string) => void;
  examNameOf: (testId?: string) => string | null;
  currentUserId?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const liveBy = useMemo(() => new Map((live || []).map(p => [p.userId, p])), [live]);

  const refresh = async () => { setRefreshing(true); try { await onRefresh(); showToast('User list refreshed.'); } finally { setRefreshing(false); } };

  if (selected) {
    const user = usersList.find(u => u.id === selected);
    return <UserPage key={selected} userId={selected} listUser={user} live={liveBy.get(selected) || null} onBack={() => setSelected(null)} onOpen={setSelected} showToast={showToast} examNameOf={examNameOf} onChanged={onRefresh} isSelf={selected === currentUserId} />;
  }

  const week = Date.now() - 7 * 86400000;
  const students = usersList.filter(u => u.role === 'STUDENT');
  const stats = {
    total: usersList.length,
    students: students.length,
    online: live ? live.filter(p => p.state === 'active').length : 0,
    away: live ? live.filter(p => p.state === 'away').length : 0,
    newWeek: usersList.filter(u => u.createdAtIso && new Date(u.createdAtIso).getTime() > week).length,
    activeWeek: usersList.filter(u => u.lastSeen && new Date(u.lastSeen).getTime() > week).length,
    pro: usersList.filter(u => u.subscriptionTier === 'Testbook Pass Pro').length,
    blocked: usersList.filter(u => u.isBlocked).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">User management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{stats.total} accounts · {stats.students} students</p>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing}
          className="h-9 px-3 rounded-md bg-[#1e4e79] hover:bg-[#173d60] text-white text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat icon={Users} label="Total accounts" value={stats.total} sub={`${stats.students} students`} />
        <Stat icon={Activity} label="Online now" value={live ? stats.online : '…'} sub={live ? `${stats.away} away` : 'loading'} tone="text-emerald-600 dark:text-emerald-400" />
        <Stat icon={UserPlus} label="New this week" value={stats.newWeek} tone="text-violet-600 dark:text-violet-400" />
        <Stat icon={Clock} label="Active this week" value={stats.activeWeek} sub={`${Math.round((stats.activeWeek / Math.max(1, stats.total)) * 100)}% of accounts`} />
        <Stat icon={Crown} label="Pass Pro" value={stats.pro} tone="text-amber-600 dark:text-amber-400" />
        <Stat icon={Ban} label="Blocked" value={stats.blocked} tone="text-red-600 dark:text-red-400" />
      </div>

      <LiveNowPanel online={live} loadedAt={liveAt} onOpenUser={setSelected} />

      <Directory usersList={usersList} liveBy={liveBy} liveLoaded={!!live} onOpen={setSelected} />
    </div>
  );
}

// ---- Directory ------------------------------------------------------------------------------------

function Directory({ usersList, liveBy, liveLoaded, onOpen }: { usersList: MockUser[]; liveBy: Map<string, LivePresence>; liveLoaded: boolean; onOpen: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const [tier, setTier] = useState('all');
  const [device, setDevice] = useState('all');
  const [sort, setSort] = useState('active');
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [q, status, role, tier, device, sort]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = usersList.filter(u => {
      if (term && ![u.name, u.email, u.mobile, u.candidateCode, u.referralCode].some(v => (v || '').toLowerCase().includes(term))) return false;
      const lp = liveBy.get(u.id);
      if (status === 'online' && lp?.state !== 'active') return false;
      if (status === 'away' && lp?.state !== 'away') return false;
      if (status === 'offline' && lp) return false;
      if (status === 'blocked' && !u.isBlocked) return false;
      if (role === 'staff' ? u.role === 'STUDENT' : role !== 'all' && u.role !== role) return false;
      if (tier !== 'all' && u.subscriptionTier !== tier) return false;
      if (device !== 'all' && normalizePlatform(lp?.platform || u.lastPlatform) !== device) return false;
      return true;
    });
    const t = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);
    const by: Record<string, (a: MockUser, b: MockUser) => number> = {
      active: (a, b) => Number(!!liveBy.get(b.id)) - Number(!!liveBy.get(a.id)) || t(b.lastSeen) - t(a.lastSeen),
      newest: (a, b) => t(b.createdAtIso) - t(a.createdAtIso),
      name: (a, b) => a.name.localeCompare(b.name),
      tests: (a, b) => (b.testsTaken || 0) - (a.testsTaken || 0),
      coins: (a, b) => (b.coins || 0) - (a.coins || 0),
      referrals: (a, b) => (b.referralsCount || 0) - (a.referralsCount || 0),
    };
    return list.sort(by[sort] || by.active);
  }, [usersList, liveBy, q, status, role, tier, device, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);

  const exportCsv = () => {
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Name', 'Email', 'Mobile', 'Hub ID', 'Role', 'Plan', 'Plan expires', 'Coins', 'Referral code', 'Referred by', 'Referrals', 'Tests taken', 'Joined', 'Last seen', 'Last device', 'Online now', 'Blocked'];
    const lines = rows.map(u => [u.name, u.email, u.mobile, u.candidateCode, ROLE_LABEL[u.role] || u.role, TIER_LABEL[u.subscriptionTier] || u.subscriptionTier, u.subscriptionExpiresAt, u.coins, u.referralCode, u.referredBy, u.referralsCount, u.testsTaken,
      u.createdAtIso, u.lastSeen, platformLabel(u.lastPlatform), liveBy.get(u.id)?.state || 'offline', u.isBlocked ? 'yes' : 'no'].map(cell).join(','));
    const blob = new Blob(['﻿' + [head.map(cell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sel = (value: string, set: (v: string) => void, opts: [string, string][], aria: string) => (
    <select value={value} onChange={e => set(e.target.value)} aria-label={aria} className={`${input} cursor-pointer`}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <section className={card} aria-labelledby="dir-title">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <h3 id="dir-title" className="text-sm font-semibold text-slate-900 dark:text-white flex-1">Directory <span className="font-normal text-slate-500">· {rows.length} of {usersList.length}</span></h3>
          <button type="button" onClick={exportCsv} className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer">
            <Download className="h-3.5 w-3.5" />Export CSV
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <div className="relative lg:col-span-2">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Name, email, mobile, Hub ID or referral code" className={`${input} w-full pl-8`} />
          </div>
          {sel(status, setStatus, [['all', 'Any status'], ['online', 'Online now'], ['away', 'Away'], ['offline', 'Offline'], ['blocked', 'Blocked']], 'Status')}
          {sel(tier, setTier, [['all', 'Any plan'], ['Testbook Pass Pro', 'Pass Pro'], ['Testbook Pass', 'Pass'], ['None', 'No pass']], 'Plan')}
          {sel(role, setRole, [['all', 'Any role'], ['STUDENT', 'Students'], ['staff', 'All staff'], ...ROLES.filter(r => r !== 'STUDENT').map(r => [r, ROLE_LABEL[r]] as [string, string])], 'Role')}
          {sel(device, setDevice, [['all', 'Any device'], ['web_desktop', 'Website (computer)'], ['web_mobile', 'Website (phone)'], ['windows', 'Windows app'], ['android', 'Android app']], 'Device')}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Sort by</span>
          {sel(sort, setSort, [['active', 'Online first, then last seen'], ['newest', 'Newest accounts'], ['name', 'Name A–Z'], ['tests', 'Most tests'], ['coins', 'Most coins'], ['referrals', 'Most referrals']], 'Sort')}
          {!liveLoaded ? <span className="ml-auto inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />loading live status</span> : null}
        </div>
      </div>

      {/* Wide screens: table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-2 font-medium">Student</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium text-right">Tests</th>
              <th className="px-4 py-2 font-medium text-right">Coins</th>
              <th className="px-4 py-2 font-medium">Joined</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {shown.map(u => {
              const lp = liveBy.get(u.id);
              return (
                <tr key={u.id} onClick={() => onOpen(u.id)} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="h-9 w-9 rounded-full bg-[#1e4e79]/10 dark:bg-blue-500/15 text-[#1e4e79] dark:text-blue-300 text-xs font-semibold flex items-center justify-center shrink-0">{initials(u.name)}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">{u.name}{u.isBlocked ? <Pill tone="red"><Ban className="h-3 w-3" />Blocked</Pill> : null}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 break-all">{u.email}</p>
                        {u.candidateCode ? <p className="text-[11px] font-mono text-[#1e4e79] dark:text-blue-300">{u.candidateCode}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[300px]">
                    <div className="flex items-center gap-2 flex-wrap"><Status live={lp} lastSeen={u.lastSeen} /><span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"><DeviceIcon platform={lp?.platform || u.lastPlatform} className="h-3 w-3" />{platformLabel(lp?.platform || u.lastPlatform)}</span></div>
                    {lp?.activity ? <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 break-words">Now: {lp.activity}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={tierTone(u.subscriptionTier)}>{u.subscriptionTier === 'Testbook Pass Pro' ? <Crown className="h-3 w-3" /> : null}{TIER_LABEL[u.subscriptionTier] || u.subscriptionTier}</Pill>
                    {u.subscriptionTier !== 'None' && u.subscriptionExpiresAt ? <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">until {fmtDate(u.subscriptionExpiresAt)}</p> : null}
                  </td>
                  <td className="px-4 py-3"><Pill tone={roleTone(u.role)}>{ROLE_LABEL[u.role] || u.role}</Pill></td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-white">{u.testsTaken ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-white">{u.coins || 0}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(u.createdAtIso)}</td>
                  <td className="px-2 py-3 text-slate-400"><ChevronRight className="h-4 w-4" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Narrow screens: cards */}
      <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {shown.map(u => {
          const lp = liveBy.get(u.id);
          return (
            <li key={u.id}>
              <button type="button" onClick={() => onOpen(u.id)} className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                <span className="h-9 w-9 rounded-full bg-[#1e4e79]/10 dark:bg-blue-500/15 text-[#1e4e79] dark:text-blue-300 text-xs font-semibold flex items-center justify-center shrink-0">{initials(u.name)}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{u.name}</span>
                    <Status live={lp} lastSeen={u.lastSeen} compact />
                    <Pill tone={tierTone(u.subscriptionTier)}>{TIER_LABEL[u.subscriptionTier] || u.subscriptionTier}</Pill>
                    {u.role !== 'STUDENT' ? <Pill tone={roleTone(u.role)}>{ROLE_LABEL[u.role]}</Pill> : null}
                    {u.isBlocked ? <Pill tone="red">Blocked</Pill> : null}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 break-all mt-0.5">{u.email}{u.candidateCode ? ` · ${u.candidateCode}` : ''}</span>
                  {lp?.activity ? <span className="block text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">Now: {lp.activity}</span> : null}
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{u.testsTaken ?? 0} tests · {u.coins || 0} coins · joined {fmtDate(u.createdAtIso)}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 mt-2" />
              </button>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No accounts match these filters.</p> : null}

      {pages > 1 ? (
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <span>{page * PAGE + 1}–{Math.min(rows.length, (page + 1) * PAGE)} of {rows.length}</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page" className="h-8 w-8 rounded-md border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center disabled:opacity-40 cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-2 tabular-nums">Page {page + 1} of {pages}</span>
            <button type="button" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page" className="h-8 w-8 rounded-md border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center disabled:opacity-40 cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ---- One student ------------------------------------------------------------------------------------

const TABS = [
  ['overview', 'Overview', BarChart3], ['tests', 'Mock tests', Target], ['typing', 'Typing', Keyboard],
  ['referrals', 'Referrals', Gift], ['devices', 'Devices & sign-ins', MonitorSmartphone], ['edit', 'Edit profile', UserCog],
] as const;
type Tab = typeof TABS[number][0];

function UserPage({ userId, listUser, live, onBack, onOpen, showToast, examNameOf, onChanged, isSelf }: {
  userId: string; listUser?: MockUser; live: LivePresence | null; onBack: () => void; onOpen: (id: string) => void;
  showToast: (m: string) => void; examNameOf: (testId?: string) => string | null; onChanged: () => Promise<void> | void; isSelf: boolean;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [copied, setCopied] = useState('');

  const load = React.useCallback(() => {
    setError('');
    fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'admin-user-overview', data: { userId } }) })
      .then(r => r.json()).then(j => (j.success ? setData(j) : setError(j.error || 'Could not load this account.'))).catch(() => setError('No connection. Please try again.'));
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  // Live status follows the 30-second updates
  useEffect(() => { const t = setInterval(load, 60 * 1000); return () => clearInterval(t); }, [load]);

  const u = data?.user;
  const name = u?.name || listUser?.name || '';
  const copy = (v: string, key: string) => navigator.clipboard?.writeText(v).then(() => { setCopied(key); setTimeout(() => setCopied(''), 1400); }).catch(() => {});
  const presence = live
    ? { state: live.state, activity: live.activity, platform: live.platform, onlineSince: live.onlineSince }
    : data?.presence?.online ? data.presence : null;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e4e79] dark:text-blue-300 hover:underline cursor-pointer">
        <ArrowLeft className="h-4 w-4" />All users
      </button>

      {/* Header */}
      <section className={`${card} p-5`}>
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {u?.photo ? <img src={u.photo} alt="" className="h-16 w-16 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
            : <span className="h-16 w-16 rounded-full bg-[#1e4e79] text-white text-xl font-semibold flex items-center justify-center shrink-0">{initials(name)}</span>}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{name}</h2>
              {u ? <Pill tone={roleTone(u.role)}>{ROLE_LABEL[u.role] || u.role}</Pill> : null}
              {u ? <Pill tone={tierTone(u.tier)}>{u.tier === 'Testbook Pass Pro' ? <Crown className="h-3 w-3" /> : null}{TIER_LABEL[u.tier] || u.tier}</Pill> : null}
              {u?.isBlocked ? <Pill tone="red"><Ban className="h-3 w-3" />Blocked</Pill> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
              {u?.candidateCode ? (
                <button type="button" onClick={() => copy(u.candidateCode, 'code')} className="inline-flex items-center gap-1.5 font-mono text-[#1e4e79] dark:text-blue-300 cursor-pointer" title="Copy Hub ID">
                  {u.candidateCode}{copied === 'code' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 opacity-60" />}
                </button>
              ) : null}
              {u?.email ? (
                <button type="button" onClick={() => copy(u.email, 'email')} className="inline-flex items-center gap-1.5 break-all cursor-pointer" title="Copy email">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />{u.email}{copied === 'email' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : null}
                </button>
              ) : null}
              {u?.mobile ? <a href={`tel:${u.mobile}`} className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{u.mobile}</a> : null}
              {u ? <span className="inline-flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5 text-slate-400" />Joined {fmtDate(u.joined)}</span> : null}
            </div>
          </div>
          {/* Live status */}
          <div className={`md:w-80 rounded-lg border px-3.5 py-3 ${presence ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40'}`}>
            {presence ? (
              <>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  {presence.state === 'away' ? <><Moon className="h-3.5 w-3.5 text-amber-500" />Away</> : <><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />Online now</>}
                  <span className="font-normal text-slate-500 dark:text-slate-400">· since {fmtDateTime(presence.onlineSince)}</span>
                </p>
                <p className="mt-1 text-sm text-slate-900 dark:text-white break-words">{presence.activity || '—'}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><DeviceIcon platform={presence.platform} className="h-3 w-3" />{platformLabel(presence.platform)}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Offline</p>
                <p className="mt-1 text-sm text-slate-900 dark:text-white">Last seen {ago(u?.lastSeen || listUser?.lastSeen)}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><DeviceIcon platform={u?.lastPlatform || listUser?.lastPlatform} className="h-3 w-3" />{platformLabel(u?.lastPlatform || listUser?.lastPlatform)}{data?.presence?.activity ? ` · last: ${data.presence.activity}` : ''}</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" role="tablist">
        {TABS.map(([key, l, Icon]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px cursor-pointer ${tab === key ? 'border-[#1e4e79] text-[#1e4e79] dark:border-blue-400 dark:text-blue-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            <Icon className="h-4 w-4" />{l}
            {key === 'tests' && data ? <span className="text-[11px] text-slate-400">({data.mock.attempts.length})</span> : null}
            {key === 'referrals' && data ? <span className="text-[11px] text-slate-400">({data.referred.length})</span> : null}
          </button>
        ))}
      </div>

      {error ? <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error} <button type="button" onClick={load} className="underline ml-1 cursor-pointer">Try again</button></p> : null}
      {!data && !error ? <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#1e4e79]" /></div> : null}

      {data && tab === 'overview' ? <OverviewTab d={data} /> : null}
      {data && tab === 'tests' ? <TestsTab d={data} examNameOf={examNameOf} name={name} onReset={() => { load(); onChanged(); }} showToast={showToast} /> : null}
      {data && tab === 'typing' ? <TypingTab d={data} /> : null}
      {data && tab === 'referrals' ? <ReferralsTab d={data} onOpen={onOpen} /> : null}
      {data && tab === 'devices' ? <DevicesTab d={data} /> : null}
      {data && tab === 'edit' ? <EditTab d={data} isSelf={isSelf} showToast={showToast} onSaved={async () => { load(); await onChanged(); }} /> : null}
    </div>
  );
}

function Box({ title, icon: Icon, children, right }: { title: string; icon: any; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className={card}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
        <Icon className="h-4 w-4 text-[#1e4e79] dark:text-blue-400" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex-1">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-3 py-2 first:pt-0 last:pb-0">
          <dt className="w-40 shrink-0 text-slate-500 dark:text-slate-400">{k}</dt>
          <dd className="flex-1 min-w-0 text-slate-900 dark:text-slate-100 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function OverviewTab({ d }: { d: Overview }) {
  const u = d.user;
  const left = daysLeft(u.tierExpiresAt);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Target} label="Mock tests finished" value={d.mock.completed} sub={d.mock.ongoing ? `${d.mock.ongoing} in progress` : undefined} />
        <Stat icon={BarChart3} label="Average accuracy" value={d.mock.avgAccuracy != null ? `${d.mock.avgAccuracy}%` : '—'} sub={d.mock.bestPercent != null ? `best score ${Math.round(d.mock.bestPercent)}%` : undefined} tone="text-emerald-600 dark:text-emerald-400" />
        <Stat icon={Clock} label="Time on tests" value={dur(d.mock.totalSeconds)} tone="text-amber-600 dark:text-amber-400" />
        <Stat icon={Keyboard} label="Typing tests" value={d.typing?.total ?? '—'} sub={d.typing?.bestWpm != null ? `best ${Math.round(d.typing.bestWpm)} WPM` : undefined} tone="text-teal-600 dark:text-teal-400" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Box title="Plan & coins" icon={Crown}>
          <Rows rows={[
            ['Plan', <Pill key="p" tone={tierTone(u.tier)}>{TIER_LABEL[u.tier] || u.tier}</Pill>],
            ['Bought', u.tier === 'None' ? '—' : fmtDate(u.tierPurchasedAt)],
            ['Valid until', u.tier === 'None' ? '—' : <span key="v">{fmtDate(u.tierExpiresAt)}{left != null ? <span className={`ml-2 text-xs ${left < 0 ? 'text-red-600' : left < 15 ? 'text-amber-600' : 'text-slate-500'}`}>{left < 0 ? 'expired' : `${left} days left`}</span> : null}</span>],
            ['Coins', <span key="c" className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-amber-500" />{u.coins || 0}</span>],
          ]} />
        </Box>
        <Box title="Account" icon={UserCog}>
          <Rows rows={[
            ['Joined', fmtDateTime(u.joined)],
            ['Last seen', `${fmtDateTime(u.lastSeen)} (${ago(u.lastSeen)})`],
            ['Devices used', d.devices.length ? d.devices.map((x: any) => platformLabel(x.platform)).join(', ') : '—'],
            ['Signed in on', `${d.signIns.length} device${d.signIns.length === 1 ? '' : 's'}`],
            ['Document Locker', u.lockerConnected ? 'Connected (Google Drive)' : 'Not connected'],
          ]} />
        </Box>
        <Box title="Support & reports" icon={Mail}>
          <Rows rows={[
            ['Support messages', d.support.messages ? `${d.support.messages}${d.support.unread ? ` · ${d.support.unread} unread` : ''} · last ${ago(d.support.lastAt)}` : 'None'],
            ['Questions reported', d.support.reports || 'None'],
          ]} />
        </Box>
        <Box title="Exam integrity" icon={ShieldAlert}>
          <Rows rows={[
            ['Flagged attempts', d.mock.flagged ? <span key="f" className="text-red-600 dark:text-red-400 font-semibold">{d.mock.flagged} to review (Integrity review tab)</span> : 'None'],
            ['Focus alerts', d.mock.attempts.reduce((n: number, a: any) => n + (a.violations || 0), 0)],
          ]} />
        </Box>
      </div>
    </div>
  );
}

function TestsTab({ d, examNameOf, name, onReset, showToast }: { d: Overview; examNameOf: (id?: string) => string | null; name: string; onReset: () => void; showToast: (m: string) => void }) {
  const { resetAttempt } = useAuth();
  const [confirm, setConfirm] = useState<any>(null);
  const list = d.mock.attempts;
  if (!list.length) return <p className={`${card} px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400`}>No mock test attempts yet.</p>;
  const statusPill = (s: string) => s === 'COMPLETED' ? <Pill tone="green">Completed</Pill> : s === 'AUTO_SUBMITTED' ? <Pill tone="amber">Auto-submitted</Pill> : <Pill tone="blue">In progress</Pill>;
  // Integrity check (levels ok / watch / flagged; review status open / cleared / cheated)
  const flag = (i: any) => !i || i.level === 'ok' ? null
    : i.status === 'cheated' ? <Pill tone="red">Marked cheated</Pill> : i.status === 'cleared' ? <Pill tone="slate">Cleared as fair</Pill>
      : <Pill tone={i.level === 'flagged' ? 'red' : 'amber'}><ShieldAlert className="h-3 w-3" />{i.level === 'flagged' ? 'Flagged' : 'Watch'}</Pill>;
  return (
    <section className={card}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-2 font-medium">Test</th><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Score</th><th className="px-4 py-2 font-medium text-right">Accuracy</th><th className="px-4 py-2 font-medium text-right">Time</th>
              <th className="px-4 py-2 font-medium">Checks</th><th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((a: any) => (
              <tr key={a.id} className="align-top">
                <td className="px-4 py-3 min-w-[220px]">
                  <p className="font-medium text-slate-900 dark:text-white">{a.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{[examNameOf(a.testId), ({ android: 'Android app', app: 'Android app', windows: 'Windows app', offline: 'Offline', room: 'Test room' } as Record<string, string>)[a.source] || null].filter(Boolean).join(' · ')}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtDateTime(a.completedAt || a.startedAt)}</td>
                <td className="px-4 py-3">{statusPill(a.status)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{a.status === 'ONGOING' ? '—' : `${Number(a.score || 0).toFixed(1)} / ${a.maxScore ?? '—'}`}</td>
                <td className="px-4 py-3 text-right tabular-nums">{a.accuracy != null && a.status !== 'ONGOING' ? `${Number(a.accuracy).toFixed(1)}%` : '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums text-xs">{dur(a.timeSpentSeconds)}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{flag(a.integrity)}{a.violations ? <Pill tone="amber">{a.violations} focus alert{a.violations === 1 ? '' : 's'}</Pill> : null}{!flag(a.integrity) && !a.violations ? <span className="text-xs text-slate-400">—</span> : null}</div></td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => setConfirm(a)} className="h-8 px-2.5 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-medium inline-flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer whitespace-nowrap">
                    <Trash2 className="h-3.5 w-3.5" />Reset
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {confirm ? (
        <Confirm title="Reset this attempt?" danger confirmLabel="Delete attempt" onCancel={() => setConfirm(null)}
          onConfirm={() => { resetAttempt(d.user.id, confirm.id); showToast('Attempt deleted. The student can take the test again.'); setConfirm(null); setTimeout(onReset, 800); }}>
          The attempt of <strong>{confirm.title}</strong> by <strong>{name}</strong> is deleted permanently, with its answers and result. This can&apos;t be undone.
        </Confirm>
      ) : null}
    </section>
  );
}

function TypingTab({ d }: { d: Overview }) {
  if (!d.typing) return <p className={`${card} px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400`}>Typing results could not be loaded right now.</p>;
  const t = d.typing;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Keyboard} label="Typing tests" value={t.total} sub={`${t.qualified} qualified`} />
        <Stat icon={Award} label="Best speed" value={t.bestWpm != null ? `${Math.round(t.bestWpm)} WPM` : '—'} tone="text-emerald-600 dark:text-emerald-400" />
        <Stat icon={BarChart3} label="Average speed" value={t.avgWpm != null ? `${Math.round(t.avgWpm)} WPM` : '—'} />
        <Stat icon={Target} label="Average accuracy" value={t.avgAccuracy != null ? `${Number(t.avgAccuracy).toFixed(1)}%` : '—'} tone="text-amber-600 dark:text-amber-400" />
      </div>
      {t.attempts.length ? (
        <section className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-2 font-medium">Test</th><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium text-right">Speed</th>
                <th className="px-4 py-2 font-medium text-right">Accuracy</th><th className="px-4 py-2 font-medium text-right">Mistakes</th><th className="px-4 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {t.attempts.map((a: any) => (
                <tr key={a.id}>
                  <td className="px-4 py-2.5"><p className="font-medium text-slate-900 dark:text-white">{a.testTitle}</p><p className="text-[11px] text-slate-500">{a.language === 'hindi' || a.language === 'hi' ? 'Hindi' : 'English'} · {dur(a.timeSpentSeconds)}</p></td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtDateTime(a.completedAt)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{Math.round(a.netWpm || 0)} WPM</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{Number(a.accuracyPercentage || 0).toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{a.totalMistakes ?? '—'}</td>
                  <td className="px-4 py-2.5">{a.isQualified ? <Pill tone="green">Qualified</Pill> : <Pill tone="slate">Not qualified</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : <p className={`${card} px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400`}>No typing tests yet.</p>}
    </div>
  );
}

function ReferralsTab({ d, onOpen }: { d: Overview; onOpen: (id: string) => void }) {
  const u = d.user;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Box title="Referral code" icon={Gift}>
        <Rows rows={[
          ['Their code', u.referralCode ? <span key="c" className="font-mono">{u.referralCode}</span> : '—'],
          ['Joined with code', u.referredBy ? <span key="r" className="font-mono">{u.referredBy}</span> : '—'],
          ['Friends joined', d.referred.length],
          ['Counted referrals', u.referralsCount || 0],
          ['Joining coins paid', u.referralCoinsCredited ? 'Yes' : 'No'],
        ]} />
      </Box>
      <section className={`${card} lg:col-span-2`}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
          <Users className="h-4 w-4 text-[#1e4e79] dark:text-blue-400" /><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Friends who joined ({d.referred.length})</h3>
        </div>
        {d.referred.length ? (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {d.referred.map((r: any) => (
              <li key={r.id}>
                <button type="button" onClick={() => onOpen(r.id)} className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <span className="h-8 w-8 rounded-full bg-[#1e4e79]/10 dark:bg-blue-500/15 text-[#1e4e79] dark:text-blue-300 text-xs font-semibold flex items-center justify-center">{initials(r.name || '')}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-slate-900 dark:text-white">{r.name}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">{r.candidateCode} · joined {fmtDate(r.joined)}</span>
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">{r.tests} test{r.tests === 1 ? '' : 's'}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No one has joined with this code yet.</p>}
      </section>
    </div>
  );
}

function DevicesTab({ d }: { d: Overview }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Box title="Devices used" icon={MonitorSmartphone}>
        {d.devices.length ? (
          <ul className="space-y-3">
            {d.devices.map((x: any) => (
              <li key={x.platform} className="flex items-start gap-3">
                <span className="h-9 w-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"><DeviceIcon platform={x.platform} className="h-4 w-4" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-slate-900 dark:text-white">{platformLabel(x.platform)}{x.appVersion ? <span className="text-xs text-slate-500 font-normal"> · version {x.appVersion}</span> : null}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">{x.osInfo ? `${x.osInfo} · ` : ''}{x.activeDays} active day{x.activeDays === 1 ? '' : 's'} · first {fmtDate(x.firstSeen)} · last {ago(x.lastSeen)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500 dark:text-slate-400">No devices recorded yet.</p>}
      </Box>
      <Box title="Signed in now" icon={KeyRound}>
        {d.signIns.length ? (
          <ul className="space-y-3">
            {d.signIns.map((s: any, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="h-9 w-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"><Lock className="h-4 w-4" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-slate-900 dark:text-white">{s.device}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">signed in {fmtDate(s.createdAt)} · last used {ago(s.lastUsedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500 dark:text-slate-400">Not signed in on any device.</p>}
      </Box>
    </div>
  );
}

function EditTab({ d, isSelf, showToast, onSaved }: { d: Overview; isSelf: boolean; showToast: (m: string) => void; onSaved: () => Promise<void> | void }) {
  const { saveUserProfileByAdmin } = useAuth();
  const u = d.user;
  const [f, setF] = useState(() => ({
    name: u.name || '', email: u.email || '', mobile: u.mobile || '', role: u.role, tier: u.tier,
    purchasedAt: (u.tierPurchasedAt || '').slice(0, 10), expiresAt: (u.tierExpiresAt || '').slice(0, 10), coins: u.coins || 0,
    referralCode: u.referralCode || '', referredBy: u.referredBy || '', referralsCount: u.referralsCount || 0, password: '', isBlocked: !!u.isBlocked,
  }));
  const [ask, setAsk] = useState(false);
  const [adminPw, setAdminPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.type === 'number' ? Number(e.target.value) : e.target.value }));

  const save = async () => {
    if (!adminPw.trim()) { setErr('Enter your admin password.'); return; }
    setBusy(true); setErr('');
    const today = new Date().toISOString().slice(0, 10);
    const yearOn = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    try {
      const r = await saveUserProfileByAdmin(u.id, f.name.trim(), f.email.trim(), f.mobile.trim(), f.referralCode.trim(), f.referredBy.trim() || null, Number(f.referralsCount),
        f.role, f.tier, f.tier === 'None' ? null : (f.purchasedAt || today), f.tier === 'None' ? null : (f.expiresAt || yearOn), f.password.trim(), f.isBlocked, Number(f.coins), adminPw.trim());
      if (r?.success) { showToast('Profile saved.'); setAsk(false); setAdminPw(''); setF(prev => ({ ...prev, password: '' })); await onSaved(); }
      else setErr(r?.error || 'Could not save. Check your admin password.');
    } catch (e: any) { setErr(e?.message || 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={e => { e.preventDefault(); setErr(''); setAsk(true); }} className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Box title="Profile" icon={UserCog}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><label className={label} htmlFor="ue-name">Full name</label><input id="ue-name" required value={f.name} onChange={set('name')} className={`${input} w-full`} /></div>
            <div><label className={label} htmlFor="ue-email">Email</label><input id="ue-email" type="email" required value={f.email} onChange={set('email')} className={`${input} w-full`} /></div>
            <div><label className={label} htmlFor="ue-mobile">Mobile</label><input id="ue-mobile" value={f.mobile} onChange={set('mobile')} className={`${input} w-full`} /></div>
            <div className="sm:col-span-2"><label className={label} htmlFor="ue-pw">New password <span className="text-slate-400 font-normal">(leave empty to keep the current one)</span></label><input id="ue-pw" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} className={`${input} w-full`} /></div>
          </div>
        </Box>
        <Box title="Access" icon={ShieldAlert}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={label} htmlFor="ue-role">Role</label>
              <select id="ue-role" value={f.role} onChange={set('role')} disabled={isSelf} className={`${input} w-full cursor-pointer disabled:opacity-60`}>{ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
              {isSelf ? <p className="text-[11px] text-slate-500 mt-1">You can&apos;t change your own role.</p> : null}
            </div>
            <div><label className={label} htmlFor="ue-tier">Plan</label>
              <select id="ue-tier" value={f.tier} onChange={set('tier')} className={`${input} w-full cursor-pointer`}>{Object.entries(TIER_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </div>
            {f.tier !== 'None' ? (
              <>
                <div><label className={label} htmlFor="ue-bought">Bought on</label><input id="ue-bought" type="date" value={f.purchasedAt} onChange={set('purchasedAt')} className={`${input} w-full`} /></div>
                <div><label className={label} htmlFor="ue-exp">Valid until</label><input id="ue-exp" type="date" value={f.expiresAt} onChange={set('expiresAt')} className={`${input} w-full`} /></div>
              </>
            ) : null}
            <label className={`sm:col-span-2 flex items-start gap-2.5 rounded-md border px-3 py-2.5 cursor-pointer ${f.isBlocked ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30' : 'border-slate-200 dark:border-slate-700'} ${isSelf ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <input type="checkbox" checked={f.isBlocked} onChange={set('isBlocked')} disabled={isSelf} className="mt-0.5 h-4 w-4 accent-red-600" />
              <span><span className="block text-sm font-medium text-slate-900 dark:text-white">Block this account</span><span className="block text-xs text-slate-500 dark:text-slate-400">Signed out everywhere and can&apos;t sign in again until unblocked.</span></span>
            </label>
          </div>
        </Box>
        <Box title="Coins & referrals" icon={Coins}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={label} htmlFor="ue-coins">Coins</label><input id="ue-coins" type="number" min={0} value={f.coins} onChange={set('coins')} className={`${input} w-full`} /></div>
            <div><label className={label} htmlFor="ue-refs">Counted referrals</label><input id="ue-refs" type="number" min={0} value={f.referralsCount} onChange={set('referralsCount')} className={`${input} w-full`} /></div>
            <div><label className={label} htmlFor="ue-code">Their referral code</label><input id="ue-code" value={f.referralCode} onChange={set('referralCode')} className={`${input} w-full font-mono`} /></div>
            <div><label className={label} htmlFor="ue-by">Joined with code</label><input id="ue-by" value={f.referredBy} onChange={set('referredBy')} className={`${input} w-full font-mono`} /></div>
          </div>
        </Box>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="h-10 px-5 rounded-md bg-[#1e4e79] hover:bg-[#173d60] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"><Check className="h-4 w-4" />Save changes</button>
      </div>
      {ask ? (
        <Confirm title="Confirm with your password" confirmLabel={busy ? 'Saving…' : 'Save changes'} busy={busy} onCancel={() => setAsk(false)} onConfirm={save}>
          <p>Changes to <strong>{f.name}</strong>&apos;s account need your admin password.</p>
          <input type="password" autoFocus value={adminPw} onChange={e => setAdminPw(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} placeholder="Admin password" className={`${input} w-full mt-3`} aria-label="Admin password" />
          {err ? <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p> : null}
        </Confirm>
      ) : null}
    </form>
  );
}

function Confirm({ title, children, confirmLabel, onConfirm, onCancel, danger, busy }: { title: string; children: React.ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean; busy?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onCancel, busy]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="um-confirm" className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 id="um-confirm" className="text-base font-semibold text-slate-900 dark:text-white flex-1">{title}</h3>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Close" className="h-8 w-8 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 rounded-b-xl">
          <button type="button" onClick={onCancel} disabled={busy} className="h-9 px-4 rounded-md border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={`h-9 px-4 rounded-md text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1e4e79] hover:bg-[#173d60]'}`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
