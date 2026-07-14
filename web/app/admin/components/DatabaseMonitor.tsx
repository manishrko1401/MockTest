"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Database, RefreshCw, Server, HardDrive, Activity, AlertTriangle,
  CheckCircle2, Clock, Table2, FileText, Zap, TrendingUp, Users,
  BarChart2, Wifi, Info, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";

const FREE_LIMITS = {
  dbSizeMB:        500,
  storageMB:       1024,
  monthlyRequests: 500000,
  bandwidth:       5120,
  mauUsers:        50000,
  realtimeConns:   200,
  poolerConns:     60,
};

interface DbStat {
  tableName: string;
  rowCount: number;
  sizePretty: string;
  sizeBytes: number;
}

interface MonitorData {
  dbSizeMB: number;
  tables: DbStat[];
  totalRows: number;
  connectionCount: number;
  lastRefreshed: string;
  pgVersion: string;
  uptime: string;
}

function StatCard({ icon: Icon, label, value, sub, color = "blue", usedPct, limitLabel }: {
  icon: any; label: string; value: string; sub?: string;
  color?: "blue"|"green"|"amber"|"rose"|"violet"|"cyan";
  usedPct?: number; limitLabel?: string;
}) {
  const pct = usedPct ?? 0;
  const isWarning = pct > 70 && pct < 90;
  const isDanger  = pct >= 90;
  const palettes: Record<string,string> = {
    blue:   "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",
    green:  "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
    amber:  "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400",
    rose:   "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400",
    violet: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400",
    cyan:   "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400",
  };
  const barColors: Record<string,string> = {
    blue:"bg-blue-500", green:"bg-emerald-500", amber:"bg-amber-500",
    rose:"bg-rose-500", violet:"bg-violet-500", cyan:"bg-cyan-500",
  };
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${palettes[color]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</span>
        </div>
        {usedPct !== undefined && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
            isDanger  ? "bg-rose-100 border-rose-300 text-rose-600 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-400" :
            isWarning ? "bg-amber-100 border-amber-300 text-amber-600 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-400" :
                        "bg-white/60 dark:bg-black/20"
          }`}>{pct.toFixed(1)}%</span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black tracking-tight">{value}</p>
        {sub && <p className="text-[11px] opacity-60 mt-0.5 font-medium">{sub}</p>}
      </div>
      {usedPct !== undefined && limitLabel && (
        <div className="space-y-1">
          <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${
              isDanger ? "bg-rose-500" : isWarning ? "bg-amber-500" : barColors[color]
            }`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <p className="text-[10px] opacity-50 font-semibold">Free limit: {limitLabel}</p>
        </div>
      )}
    </div>
  );
}

function LimitRow({ label, used, limit, unit, color }: {
  label: string; used: number; limit: number; unit: string; color: string;
}) {
  const pct = (used / limit) * 100;
  const isDanger = pct >= 90, isWarning = pct >= 70;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        <span className={`font-black ${isDanger ? "text-rose-500" : isWarning ? "text-amber-500" : "text-slate-500 dark:text-slate-400"}`}>
          {used.toLocaleString()} / {limit.toLocaleString()} {unit} · {pct.toFixed(1)}%
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${isDanger ? "bg-rose-500" : isWarning ? "bg-amber-500" : color}`}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export function DatabaseMonitor() {
  const [data, setData]           = useState<MonitorData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showTables, setShowTables] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "db-stats" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to fetch database stats");
      setData(json.stats);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchStats, 60000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchStats]);

  const dbPct   = data ? (data.dbSizeMB / FREE_LIMITS.dbSizeMB) * 100 : 0;
  const connPct = data ? (data.connectionCount / FREE_LIMITS.poolerConns) * 100 : 0;

  return (
    <div className="space-y-6 p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            Supabase Database Monitor
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time database health &amp; free-tier limit tracker</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              autoRefresh ? "bg-emerald-600 text-white border-emerald-700" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            }`}>
            <Activity className={`h-3.5 w-3.5 ${autoRefresh ? "animate-pulse" : ""}`} />
            Auto-Refresh (60s)
          </button>
          <button onClick={fetchStats} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-all">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Now
          </button>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all">
            <ExternalLink className="h-3.5 w-3.5" />
            Supabase Dashboard
          </a>
        </div>
      </div>

      {data && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />
          Last refreshed: {data.lastRefreshed}
          {data.pgVersion && <>&nbsp;·&nbsp;PostgreSQL {data.pgVersion}</>}
          {data.uptime && <>&nbsp;·&nbsp;Uptime: {data.uptime}</>}
        </p>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold">Failed to load database stats</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_,i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={HardDrive} label="Database Size" color="blue"
              value={`${data.dbSizeMB.toFixed(1)} MB`}
              sub={`of ${FREE_LIMITS.dbSizeMB} MB free`}
              usedPct={dbPct} limitLabel="500 MB" />
            <StatCard icon={Server} label="Total Rows" color="violet"
              value={data.totalRows.toLocaleString()}
              sub={`across ${data.tables.length} tables`} />
            <StatCard icon={Wifi} label="Active Connections" color="cyan"
              value={`${data.connectionCount}`}
              sub={`of ${FREE_LIMITS.poolerConns} pooler max`}
              usedPct={connPct} limitLabel="60 conn" />
            <StatCard icon={CheckCircle2} label="Tables" color="green"
              value={`${data.tables.length}`}
              sub="tables in public schema" />
          </div>

          {/* Free Tier Limits */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-black text-slate-800 dark:text-white">Free Plan — Limit Tracker</h3>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">FREE TIER</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <LimitRow label="Database Storage" used={data.dbSizeMB} limit={FREE_LIMITS.dbSizeMB} unit="MB" color="bg-blue-500" />
              <LimitRow label="Pooler Connections" used={data.connectionCount} limit={FREE_LIMITS.poolerConns} unit="conn" color="bg-cyan-500" />
              <LimitRow label="Total Rows (est.)" used={data.totalRows} limit={200000} unit="rows" color="bg-violet-500" />
              <LimitRow label="Tables" used={data.tables.length} limit={100} unit="tables" color="bg-emerald-500" />
            </div>
            <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "File Storage", val: "1 GB" },
                { label: "Bandwidth/month", val: "5 GB" },
                { label: "Edge Func Calls", val: "500K/mo" },
                { label: "Max MAU", val: "50,000" },
              ].map(item => (
                <div key={item.label} className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{item.label}</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{item.val}</p>
                  <p className="text-[9px] text-emerald-500 font-bold mt-0.5">FREE LIMIT</p>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 mx-5 mb-5 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Row count is estimated from pg_stat_user_tables. For exact API request counts and bandwidth, visit the
                <a href="https://supabase.com/dashboard/project/_/reports" target="_blank" rel="noreferrer" className="underline font-bold ml-1">Supabase Reports</a> page.</span>
            </div>
          </div>

          {/* Table Breakdown */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              onClick={() => setShowTables(v => !v)}>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-white">Table Breakdown</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">{data.tables.length} tables</span>
              </div>
              {showTables ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            {showTables && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <th className="py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">#</th>
                      <th className="py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Table Name</th>
                      <th className="py-2 px-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Row Count</th>
                      <th className="py-2 px-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.tables].sort((a,b) => b.sizeBytes - a.sizeBytes).map((t,i) => (
                      <tr key={t.tableName} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-black">{i+1}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{t.tableName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t.rowCount.toLocaleString()}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.sizePretty}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 dark:bg-blue-950/30 border-t-2 border-blue-200 dark:border-blue-800">
                      <td colSpan={2} className="py-2.5 px-3 text-xs font-black text-blue-700 dark:text-blue-400">TOTAL</td>
                      <td className="py-2.5 px-3 text-right text-xs font-black text-blue-700 dark:text-blue-400">{data.totalRows.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-black text-blue-700 dark:text-blue-400">{data.dbSizeMB.toFixed(1)} MB</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Supabase Quick Links
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "SQL Editor",     href: "https://supabase.com/dashboard/project/_/sql/new",           icon: FileText  },
                { label: "Table Editor",   href: "https://supabase.com/dashboard/project/_/editor",            icon: Server    },
                { label: "API Logs",       href: "https://supabase.com/dashboard/project/_/logs/edge-logs",    icon: Activity  },
                { label: "Database Logs",  href: "https://supabase.com/dashboard/project/_/logs/postgres-logs",icon: Database  },
                { label: "Auth Users",     href: "https://supabase.com/dashboard/project/_/auth/users",        icon: Users     },
                { label: "Usage Reports",  href: "https://supabase.com/dashboard/project/_/reports",           icon: BarChart2 },
              ].map(link => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all group">
                  <link.icon className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{link.label}</span>
                  <ExternalLink className="h-3 w-3 ml-auto text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
