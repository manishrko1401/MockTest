"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isDesktopApp } from '../lib/desktopApp';
import { WindowsArch, windowsDownloadUrl } from '../lib/windowsApp';

// -----------------------------------------------------------------------------
// "Download for Windows": picks the installer for this PC's processor (ARM64 for Snapdragon /
// ARM, x64 for Intel / AMD) and always the newest version. The buttons are in AppDownload.tsx.
// -----------------------------------------------------------------------------

type Detected = {
  /** false until checked in the browser, and inside the Windows app */
  show: boolean;
  /** a Windows PC (other devices get the download page with both versions) */
  windows: boolean;
  arch: WindowsArch;
  /** the browser told us the processor type (Chrome / Edge); otherwise x64 is a safe guess */
  sure: boolean;
  /** an Android phone (gets the Android app links instead) */
  android: boolean;
};

type UAData = { platform?: string; getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; bitness?: string; platform?: string }> };

export function useWindowsAppDownload() {
  const router = useRouter();
  const [d, setD] = useState<Detected>({ show: false, windows: false, arch: 'x64', sure: false, android: false });

  useEffect(() => {
    if (isDesktopApp()) return;
    const ua = navigator.userAgent || '';
    const uaData = (navigator as unknown as { userAgentData?: UAData }).userAgentData;
    const windows = (uaData?.platform === 'Windows' || /Windows NT/i.test(ua)) && !/Android|iPhone|iPad|Mobile/i.test(ua);
    const fromUa: WindowsArch = /ARM64|aarch64/i.test(ua) ? 'arm64' : 'x64';
    setD({ show: true, windows, arch: fromUa, sure: fromUa === 'arm64', android: /Android/i.test(ua) });
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
