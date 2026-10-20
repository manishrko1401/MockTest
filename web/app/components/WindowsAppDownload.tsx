"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MonitorDown, ChevronRight, WifiOff, Bookmark, ShieldCheck } from 'lucide-react';
import { isDesktopApp } from '../lib/desktopApp';
import { WINDOWS_APP, WindowsArch, windowsDownloadUrl, installerSizeMb } from '../lib/windowsApp';

// -----------------------------------------------------------------------------
// "Download for Windows": picks the installer for this PC's processor (ARM64 for Snapdragon /
// ARM, x64 for Intel / AMD) and always the newest version. Never shown inside the Windows app,
// and only offered on Windows PCs.
// -----------------------------------------------------------------------------

type Detected = {
  /** false until checked in the browser, and inside the Windows app */
  show: boolean;
  /** a Windows PC (other devices get the download page with both versions) */
  windows: boolean;
  arch: WindowsArch;
  /** the browser told us the processor type (Chrome / Edge); otherwise x64 is a safe guess */
  sure: boolean;
};

type UAData = { platform?: string; getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; bitness?: string; platform?: string }> };

export function useWindowsAppDownload() {
  const router = useRouter();
  const [d, setD] = useState<Detected>({ show: false, windows: false, arch: 'x64', sure: false });

  useEffect(() => {
    if (isDesktopApp()) return;
    const ua = navigator.userAgent || '';
    const uaData = (navigator as unknown as { userAgentData?: UAData }).userAgentData;
    const windows = (uaData?.platform === 'Windows' || /Windows NT/i.test(ua)) && !/Android|iPhone|iPad|Mobile/i.test(ua);
    const fromUa: WindowsArch = /ARM64|aarch64/i.test(ua) ? 'arm64' : 'x64';
    setD({ show: true, windows, arch: fromUa, sure: fromUa === 'arm64' });
    if (!windows || !uaData?.getHighEntropyValues) return;
    // Chrome / Edge report the real processor ("arm" or "x86")
    uaData.getHighEntropyValues(['architecture', 'bitness']).then(v => {
      if (v.architecture === 'arm') setD(p => ({ ...p, arch: 'arm64', sure: true }));
      else if (v.architecture === 'x86') setD(p => ({ ...p, arch: 'x64', sure: true }));
    }).catch(() => { /* keep the guess */ });
  }, []);

  /** Starts the download and opens the page with the install steps. */
  const start = (arch: WindowsArch = d.arch) => {
    const a = document.createElement('a');
    a.href = windowsDownloadUrl(arch);
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
    router.push(`/download?started=${arch}`);
  };

  return { ...d, start };
}

export const archLabel = (arch: WindowsArch, hi = false) =>
  arch === 'arm64' ? (hi ? 'ARM (Snapdragon) PC' : 'ARM (Snapdragon) PCs') : (hi ? 'Intel / AMD PC' : 'Intel / AMD PCs');

/** Home page left menu item. */
export function WindowsAppMenuItem({ hi }: { hi: boolean }) {
  const dl = useWindowsAppDownload();
  if (!dl.show) return null;
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#eef3f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#1e4e79] dark:text-blue-400 shrink-0">
          <MonitorDown className="h-4 w-4" />
        </div>
        <div>
          <span className="text-xs font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-colors block leading-tight">{hi ? 'विंडोज़ ऐप डाउनलोड करें' : 'Download Windows App'}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block mt-0.5">{hi ? 'ऑफ़लाइन टेस्ट व फोकस मोड' : 'Offline tests & focus mode'}</span>
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-all shrink-0" />
    </>
  );
  const cls = 'w-full flex items-center justify-between py-2.5 px-3 text-left transition-colors duration-150 hover:bg-[#f2f6fa] dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 group cursor-pointer';
  return dl.windows
    ? <button type="button" onClick={() => dl.start()} className={cls}>{body}</button>
    : <Link href="/download" className={cls}>{body}</Link>;
}

/** Profile dropdown item. */
export function WindowsAppDropdownItem({ hi, onDone }: { hi: boolean; onDone?: () => void }) {
  const dl = useWindowsAppDownload();
  if (!dl.show) return null;
  const cls = 'w-[calc(100%-0.5rem)] flex items-center gap-2 mx-1 px-2 py-2 rounded-md text-left text-slate-700 dark:text-slate-200 transition-colors hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer';
  const label = <><MonitorDown className="h-4 w-4 text-slate-400" />{hi ? 'विंडोज़ ऐप डाउनलोड करें' : 'Download Windows app'}</>;
  return dl.windows
    ? <button type="button" role="menuitem" onClick={() => { onDone?.(); dl.start(); }} className={cls}>{label}</button>
    : <Link href="/download" role="menuitem" onClick={onDone} className={cls}>{label}</Link>;
}

/** Footer link (hidden inside the Windows app). */
export function WindowsAppFooterLink({ hi }: { hi: boolean }) {
  const dl = useWindowsAppDownload();
  if (!dl.show) return null;
  return <Link href="/download" className="hover:text-slate-800 dark:hover:text-slate-200">{hi ? 'विंडोज़ ऐप' : 'Windows app'}</Link>;
}

/** Home page card (Windows PCs only). */
export function WindowsAppCard({ hi }: { hi: boolean }) {
  const dl = useWindowsAppDownload();
  if (!dl.show || !dl.windows) return null;
  const other: WindowsArch = dl.arch === 'arm64' ? 'x64' : 'arm64';
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
      <div className="w-10 h-10 rounded-md bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-blue-400 flex items-center justify-center shrink-0">
        <MonitorDown className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{hi ? 'Mock Test Hub विंडोज़ ऐप' : 'Mock Test Hub for Windows'}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
          <span className="inline-flex items-center gap-1"><WifiOff className="h-3 w-3" />{hi ? 'बिना इंटरनेट टेस्ट' : 'Tests without internet'}</span>
          <span className="inline-flex items-center gap-1"><Bookmark className="h-3 w-3" />{hi ? 'ऑफ़लाइन बुकमार्क' : 'Offline bookmarks'}</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{hi ? 'फुल-स्क्रीन फोकस मोड' : 'Full-screen focus mode'}</span>
        </p>
      </div>
      <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
        <button type="button" onClick={() => dl.start()} className="h-9 px-4 rounded-md bg-[#1e4e79] hover:bg-[#173d60] text-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer">
          <MonitorDown className="h-4 w-4" />{hi ? 'डाउनलोड करें' : 'Download for Windows'}
        </button>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          v{WINDOWS_APP.version} · {archLabel(dl.arch, hi)} · {installerSizeMb(dl.arch)} MB ·{' '}
          <button type="button" onClick={() => dl.start(other)} className="text-[#1e4e79] dark:text-blue-300 hover:underline cursor-pointer">
            {other === 'arm64' ? (hi ? 'ARM वर्ज़न' : 'ARM version') : (hi ? 'Intel/AMD वर्ज़न' : 'Intel/AMD version')}
          </button>
        </span>
      </div>
    </div>
  );
}
