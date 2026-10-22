"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, MonitorDown, Smartphone, ChevronRight, WifiOff, CalendarCheck, Users } from 'lucide-react';
import { isDesktopApp } from '../lib/desktopApp';
import { WINDOWS_APP, installerSizeMb } from '../lib/windowsApp';
import { ANDROID_APP, apkSizeMb } from '../lib/androidApp';
import { useWindowsAppDownload } from './WindowsAppDownload';
import { useAndroidAppDownload } from './AndroidAppDownload';

// -----------------------------------------------------------------------------
// One "Get the app" section for both apps (Windows PC and Android phone). The button for this
// device is highlighted and starts the download; the other one opens its page with the install
// steps. Inside the Windows app only the Android button is shown; on iPhones nothing.
// -----------------------------------------------------------------------------

type Device = { ready: boolean; inApp: boolean; ios: boolean };

function useDevice(): Device {
  const [d, setD] = useState<Device>({ ready: false, inApp: false, ios: false });
  useEffect(() => {
    const ua = navigator.userAgent || '';
    setD({ ready: true, inApp: isDesktopApp(), ios: /iPhone|iPad|iPod/i.test(ua) });
  }, []);
  return d;
}

/** Both download buttons, the one for this device first and highlighted. */
function useAppButtons() {
  const router = useRouter();
  const device = useDevice();
  const win = useWindowsAppDownload();
  const android = useAndroidAppDownload();

  const buttons = [
    {
      key: 'windows' as const,
      icon: MonitorDown,
      label: 'Windows',
      labelHi: 'विंडोज़',
      meta: `v${WINDOWS_APP.version} · ${installerSizeMb(win.arch)} MB`,
      here: win.windows,
      hidden: device.inApp,
      go: () => (win.windows ? win.start() : router.push('/download?platform=windows')),
    },
    {
      key: 'android' as const,
      icon: Smartphone,
      label: 'Android',
      labelHi: 'एंड्रॉइड',
      meta: `v${ANDROID_APP.version} · ${apkSizeMb()} MB`,
      here: android.android,
      hidden: false,
      go: () => (android.android ? android.start() : router.push('/download?platform=android')),
    },
  ].filter(b => !b.hidden);
  if (buttons[1]?.here) buttons.reverse();
  // Nothing installable here (Mac, Linux): Windows stays the main button
  const primary = buttons.find(b => b.here)?.key ?? buttons[0]?.key;

  return { show: device.ready && !device.ios, buttons, primary };
}

/** Home page section with both apps. */
export function AppDownloadCard({ hi }: { hi: boolean }) {
  const { show, buttons, primary } = useAppButtons();
  if (!show) return null;
  return (
    <section aria-labelledby="app-download-title" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:px-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-md bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-blue-400 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 id="app-download-title" className="text-sm font-semibold text-slate-900 dark:text-white">{hi ? 'Mock Test Hub ऐप डाउनलोड करें' : 'Get the Mock Test Hub app'}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{hi ? 'विंडोज़ पीसी और एंड्रॉइड फ़ोन के लिए मुफ़्त। दोनों में एक ही खाते से लॉग इन करें।' : 'Free for your Windows PC and Android phone. Sign in with the same account on both.'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
            <span className="inline-flex items-center gap-1"><WifiOff className="h-3 w-3" />{hi ? 'ऑफ़लाइन टेस्ट (पीसी)' : 'Offline tests (PC)'}</span>
            <span className="inline-flex items-center gap-1"><CalendarCheck className="h-3 w-3" />{hi ? 'स्टडी प्लानर' : 'Study Planner'}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{hi ? 'दोस्तों के साथ टेस्ट' : 'Tests with friends'}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0 md:items-end">
        <div className={`grid gap-2 ${buttons.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} w-full md:w-auto`}>
          {buttons.map(b => {
            const main = b.key === primary;
            return (
              <button key={b.key} type="button" onClick={b.go}
                className={`min-w-0 md:min-w-[156px] h-12 px-3 rounded-md inline-flex items-center gap-2.5 text-left transition-colors cursor-pointer ${main
                  ? 'bg-[#1e4e79] hover:bg-[#173d60] text-white'
                  : 'border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-[#1e4e79] hover:bg-[#eef3f8] dark:hover:bg-slate-800'}`}>
                <b.icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 leading-tight">
                  <span className="block text-sm font-semibold truncate">{hi ? b.labelHi : b.label}</span>
                  <span className={`block text-[11px] truncate ${main ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>{b.meta}</span>
                </span>
              </button>
            );
          })}
        </div>
        <Link href={`/download?platform=${primary}`} className="text-[11px] text-[#1e4e79] dark:text-blue-300 hover:underline self-start md:self-end">
          {hi ? 'इंस्टॉल कैसे करें व सभी वर्ज़न' : 'How to install & all versions'}
        </Link>
      </div>
    </section>
  );
}

/** Home page left menu item: one entry for both apps. */
export function AppDownloadMenuItem({ hi }: { hi: boolean }) {
  const { show } = useAppButtons();
  if (!show) return null;
  return (
    <Link href="/download" className="w-full flex items-center justify-between py-2.5 px-3 text-left transition-colors duration-150 hover:bg-[#f2f6fa] dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 group cursor-pointer">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#eef3f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#1e4e79] dark:text-blue-400 shrink-0">
          <Download className="h-4 w-4" />
        </div>
        <div>
          <span className="text-xs font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-colors block leading-tight">{hi ? 'ऐप डाउनलोड करें' : 'Download App'}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block mt-0.5">{hi ? 'विंडोज़ व एंड्रॉइड' : 'Windows & Android'}</span>
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 transition-all shrink-0" />
    </Link>
  );
}

/** Profile dropdown item. */
export function AppDownloadDropdownItem({ hi, onDone }: { hi: boolean; onDone?: () => void }) {
  const { show } = useAppButtons();
  if (!show) return null;
  return (
    <Link href="/download" role="menuitem" onClick={onDone} className="w-[calc(100%-0.5rem)] flex items-center gap-2 mx-1 px-2 py-2 rounded-md text-left text-slate-700 dark:text-slate-200 transition-colors hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer">
      <Download className="h-4 w-4 text-slate-400" />{hi ? 'ऐप डाउनलोड करें' : 'Download app'}
    </Link>
  );
}

/** Footer link. */
export function AppDownloadFooterLink({ hi }: { hi: boolean }) {
  return <Link href="/download" className="hover:text-slate-800 dark:hover:text-slate-200">{hi ? 'ऐप डाउनलोड' : 'Download app'}</Link>;
}
