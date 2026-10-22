"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isDesktopApp } from '../lib/desktopApp';
import { ANDROID_APP, androidDownloadUrl } from '../lib/androidApp';

// -----------------------------------------------------------------------------
// "Download Android app": the newest APK straight from this website (no Play Store). The buttons
// are in AppDownload.tsx; on a phone they start the download, elsewhere they open the Android
// download page (a PC can't install an APK).
// -----------------------------------------------------------------------------

export function useAndroidAppDownload() {
  const router = useRouter();
  const [d, setD] = useState({ show: false, android: false });

  useEffect(() => {
    if (isDesktopApp()) return;
    setD({ show: true, android: /Android/i.test(navigator.userAgent || '') });
  }, []);

  /** Starts the download and opens the page with the install steps. */
  const start = () => {
    const a = document.createElement('a');
    a.href = androidDownloadUrl;
    a.download = ANDROID_APP.file;
    document.body.appendChild(a);
    a.click();
    a.remove();
    router.push('/download?platform=android&started=android');
  };

  return { ...d, start };
}
