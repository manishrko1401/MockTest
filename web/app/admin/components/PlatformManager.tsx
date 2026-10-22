"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Monitor, Smartphone, MonitorDown, TabletSmartphone, RefreshCw, Search, ChevronLeft, ChevronRight, ChevronDown, Info } from 'lucide-react';
import { PLATFORM_KEYS, PLATFORM_LABEL, type PlatformKey } from '../../lib/platformLabels';

// -----------------------------------------------------------------------------
// Platforms: which students use the website (computer / phone), the Windows app and the
// Android app, how active each platform is, and which app versions are in use.
// Data: user_platforms (see lib/platformUsage.ts), written from the presence ping.
// -----------------------------------------------------------------------------

type Count = { users: number; day: number; week: number; month: number; new_week: number };
type Stats = {
  perPlatform: Record<PlatformKey, Count>;
  online: Record<PlatformKey, number>;
  mix: { students: number; one: number; several: number; app_and_web: number };
  versions: { platform: 'android' | 'windows'; version: string; users: number; active: number }[];
  devices: { platform: PlatformKey; os: string; users: number }[];
  latestVersion: { windows: string; android: string };
  trackingSince: string | null;
};
type Use = { platform: PlatformKey; firstSeen: string; lastSeen: string; appVersion: string | null; osInfo: string | null; activeDays: number; estimated: boolean };
type Row = { id: string; name: string; email: string; candidateCode: string; role: string; lastSeen: string; platforms: Use[] };

const ICON: Record<PlatformKey, React.ElementType> = { web_desktop: Monitor, web_mobile: Smartphone, windows: MonitorDown, android: TabletSmartphone };
// One colour per platform, the same everywhere on this page (always shown with its name)
const TONE: Record<PlatformKey, string> = {
  web_desktop: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900',
  web_mobile: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-900',
  windows: 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900',
  android: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900',
};
const BAR: Record<PlatformKey, string> = { web_desktop: 'bg-blue-600', web_mobile: 'bg-cyan-600', windows: 'bg-violet-600', android: 'bg-orange-500' };

const api = async (action: string, data: Record<string, unknown> = {}) => {
  const res = await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || 'Request failed');
  return json;
};

const ago = (iso: string | null) => {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 45) return `${Math.round(s / 86400)} days ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const dateOf = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
/** a is an older version than b (1.0.2 < 1.0.10) */
const olderThan = (a: string, b: string) => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0; }
  return false;
};
const unknownVersion = (p: 'android' | 'windows') => (p === 'windows' ? 'Not reported (1.0.2 or older)' : 'Not reported (older app)');

function PlatformBadge({ use, latest }: { use: Use; latest: Stats['latestVersion'] | null }) {
  const Icon = ICON[use.platform];
  const outdated = latest && (use.platform === 'android' || use.platform === 'windows') && use.appVersion && olderThan(use.appVersion, latest[use.platform]);
  return (
    <span title={`${PLATFORM_LABEL[use.platform]}${use.appVersion ? ' v' + use.appVersion : ''}${use.osInfo ? ' · ' + use.osInfo : ''}\nLast used ${ago(use.lastSeen)}${use.estimated ? ' (from test history)' : ''}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${TONE[use.platform]}`}>
      <Icon className="w-3 h-3" />
      {PLATFORM_LABEL[use.platform].replace('Website ', 'Web ')}
      {use.appVersion && <span className={`font-normal ${outdated ? 'underline decoration-dotted' : ''}`}>v{use.appVersion}</span>}
    </span>
  );
}

export function PlatformManager({ showToast }: { showToast: (msg: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [platform, setPlatform] = useState<PlatformKey | ''>('');
  const [mix, setMix] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try { setStats(await api('platform-stats')); } catch (e: any) { showToast(e.message); }
  }, [showToast]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api('platform-users', { platform: platform || undefined, mix: mix || undefined, search: query || undefined, page });
      setRows(r.users); setTotal(r.total);
    } catch (e: any) { showToast(e.message); }
    finally { setLoading(false); }
  }, [platform, mix, query, page, showToast]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { const t = setTimeout(() => { setPage(0); setQuery(search.trim()); }, 350); return () => clearTimeout(t); }, [search]);

  const refresh = () => { loadStats(); loadRows(); };
  const pages = Math.max(1, Math.ceil(total / 50));
  const students = stats?.mix.students || 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Platforms</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Which students use the website, the Windows app and the Android app.
            {stats?.trackingSince ? ` Tracked live since ${dateOf(stats.trackingSince)}; earlier use is estimated from test attempts.` : ' Earlier use is estimated from test attempts.'}
          </p>
        </div>
        <button type="button" onClick={refresh} className="h-8 px-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {/* One card per platform */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PLATFORM_KEYS.map(k => {
          const c = stats?.perPlatform[k];
          const Icon = ICON[k];
          return (
            <button key={k} type="button" onClick={() => { setPlatform(platform === k ? '' : k); setPage(0); }}
              className={`text-left rounded-lg border bg-white dark:bg-slate-900 p-4 transition-colors cursor-pointer ${platform === k ? 'border-[#1e4e79] ring-1 ring-[#1e4e79]' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-semibold ${TONE[k]}`}><Icon className="w-3.5 h-3.5" />{PLATFORM_LABEL[k]}</span>
                {(stats?.online[k] || 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{stats?.online[k]} online
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">{c ? c.users.toLocaleString('en-IN') : '…'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">students{students && c ? ` · ${pct(c.users, students)}% of all` : ''}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                {([['Today', c?.day], ['7 days', c?.week], ['30 days', c?.month]] as const).map(([l, v]) => (
                  <div key={l} className="rounded-md bg-slate-50 dark:bg-slate-800/60 py-1.5">
                    <dd className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{v ?? '…'}</dd>
                    <dt className="text-[11px] text-slate-500 dark:text-slate-400">{l}</dt>
                  </div>
                ))}
              </dl>
              {c && c.new_week > 0 && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{c.new_week} started using it this week</p>}
            </button>
          );
        })}
      </div>

      {/* How students combine platforms */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ['Use more than one platform', stats.mix.several, 'several'],
            ['Use an app and the website', stats.mix.app_and_web, ''],
            ['Use only one platform', stats.mix.one, 'one'],
          ] as const).map(([label, n, f]) => (
            <button key={label} type="button" disabled={!f} onClick={() => { setMix(mix === f ? '' : f); setPage(0); }}
              className={`text-left rounded-lg border bg-white dark:bg-slate-900 px-4 py-3 ${f ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700' : 'cursor-default'} ${f && mix === f ? 'border-[#1e4e79] ring-1 ring-[#1e4e79]' : 'border-slate-200 dark:border-slate-800'}`}>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white tabular-nums">{n.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">({pct(n, students)}%)</span></p>
            </button>
          ))}
        </div>
      )}

      {/* App versions and devices */}
      {stats && (
        <div className="grid gap-3 lg:grid-cols-3">
          {(['android', 'windows'] as const).map(p => {
            const list = stats.versions.filter(v => v.platform === p);
            const max = Math.max(1, ...list.map(v => v.users));
            return (
              <div key={p} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{PLATFORM_LABEL[p]} versions</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Latest: v{stats.latestVersion[p]}</p>
                {list.length === 0 ? <p className="mt-3 text-xs text-slate-500">No one yet.</p> : (
                  <table className="mt-3 w-full text-xs">
                    <thead><tr className="text-left text-slate-500 dark:text-slate-400"><th className="font-medium pb-1">Version</th><th className="font-medium pb-1 text-right">Students</th><th className="font-medium pb-1 text-right">Active 30 d</th></tr></thead>
                    <tbody>
                      {list.map(v => (
                        <tr key={v.version} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-1.5 pr-2">
                            <span className="text-slate-800 dark:text-slate-200">{v.version ? `v${v.version}` : unknownVersion(p)}</span>
                            {v.version === stats.latestVersion[p] && <span className="ml-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Latest</span>}
                            <span className="block h-1 mt-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><span className={`block h-full rounded-full ${BAR[p]}`} style={{ width: `${(v.users / max) * 100}%` }} /></span>
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-slate-800 dark:text-slate-200">{v.users}</td>
                          <td className="py-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400">{v.active}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Devices (last 30 days)</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Operating system per platform</p>
            {stats.devices.filter(d => d.os).length === 0 ? <p className="mt-3 text-xs text-slate-500">Shown once students use the site after this update.</p> : (
              <ul className="mt-3 space-y-1.5 text-xs">
                {stats.devices.filter(d => d.os).slice(0, 10).map(d => (
                  <li key={d.platform + d.os} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0"><span className={`h-2 w-2 rounded-full shrink-0 ${BAR[d.platform]}`} /><span className="truncate text-slate-800 dark:text-slate-200">{d.os}</span><span className="text-slate-500 dark:text-slate-400 truncate">· {PLATFORM_LABEL[d.platform]}</span></span>
                    <span className="tabular-nums text-slate-800 dark:text-slate-200">{d.users}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Students */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="p-3 flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or candidate code"
              className="w-full h-8 pl-8 pr-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white" />
          </div>
          <select value={platform} onChange={e => { setPlatform(e.target.value as PlatformKey | ''); setPage(0); }} className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200">
            <option value="">All platforms</option>
            {PLATFORM_KEYS.map(k => <option key={k} value={k}>{PLATFORM_LABEL[k]}</option>)}
          </select>
          <select value={mix} onChange={e => { setMix(e.target.value); setPage(0); }} className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200">
            <option value="">Any combination</option>
            <option value="several">More than one platform</option>
            <option value="one">Only one platform</option>
            <option value="app_only">Apps only</option>
            <option value="web_only">Website only</option>
          </select>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{total.toLocaleString('en-IN')} students</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="font-medium px-3 py-2">Student</th>
                <th className="font-medium px-3 py-2">Platforms (most recent first)</th>
                <th className="font-medium px-3 py-2 whitespace-nowrap">Last seen</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className={loading ? 'opacity-60' : ''}>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No students match.</td></tr>
              )}
              {rows.map(r => (
                <React.Fragment key={r.id}>
                  <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    <td className="px-3 py-2 min-w-[180px]">
                      <p className="font-semibold text-slate-900 dark:text-white">{r.name || 'Student'}</p>
                      <p className="text-slate-500 dark:text-slate-400">{r.email}{r.role !== 'STUDENT' ? ` · ${r.role}` : ''}</p>
                    </td>
                    <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{r.platforms.map(u => <PlatformBadge key={u.platform} use={u} latest={stats?.latestVersion || null} />)}</div></td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">{ago(r.lastSeen)}</td>
                    <td className="px-2"><ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open === r.id ? 'rotate-180' : ''}`} /></td>
                  </tr>
                  {open === r.id && (
                    <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                      <td colSpan={4} className="px-3 py-3">
                        <PlatformDetails uses={r.platforms} latest={stats?.latestVersion || null} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Page {page + 1} of {pages}</span>
          <div className="flex gap-1">
            <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center disabled:opacity-40 cursor-pointer" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
            <button type="button" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)} className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center disabled:opacity-40 cursor-pointer" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Each platform a student uses, with first / last use, version and device. */
export function PlatformDetails({ uses, latest }: { uses: Use[]; latest: Stats['latestVersion'] | null }) {
  if (!uses.length) return <p className="text-xs text-slate-500 dark:text-slate-400">No platform recorded yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-500 dark:text-slate-400">
            <th className="font-medium py-1 pr-3">Platform</th><th className="font-medium py-1 pr-3">Version</th><th className="font-medium py-1 pr-3">Device</th>
            <th className="font-medium py-1 pr-3">First used</th><th className="font-medium py-1 pr-3">Last used</th><th className="font-medium py-1 text-right">Days active</th>
          </tr>
        </thead>
        <tbody>
          {uses.map(u => {
            const isApp = u.platform === 'android' || u.platform === 'windows';
            const old = isApp && latest && u.appVersion && olderThan(u.appVersion, latest[u.platform as 'android' | 'windows']);
            return (
              <tr key={u.platform} className="border-t border-slate-200/70 dark:border-slate-700/60">
                <td className="py-1.5 pr-3"><PlatformBadge use={{ ...u, appVersion: null }} latest={null} /></td>
                <td className="py-1.5 pr-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  {isApp ? (u.appVersion ? `v${u.appVersion}` : unknownVersion(u.platform as 'android' | 'windows')) : '—'}
                  {old && <span className="ml-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">update available</span>}
                </td>
                <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-300">{u.osInfo || '—'}</td>
                <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateOf(u.firstSeen)}</td>
                <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{ago(u.lastSeen)}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-800 dark:text-slate-200">{u.activeDays}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {uses.some(u => u.estimated) && (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><Info className="w-3 h-3" />Rows from before tracking started are estimated from test attempts (the Windows app counted as “Website” then).</p>
      )}
    </div>
  );
}
