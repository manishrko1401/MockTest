"use client";

import React, { useEffect, useState } from 'react';
import { MonitorDown, CheckCircle2, WifiOff, Bookmark, ShieldCheck, Bell, Cpu } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { SiteHeader, SiteFooter, PageTitle, SectionCard, pageBg, container } from '../components/SiteUI';
import { useWindowsAppDownload, archLabel } from '../components/WindowsAppDownload';
import { WINDOWS_APP, WindowsArch, windowsDownloadUrl, installerSizeMb } from '../lib/windowsApp';
import { useIsDesktopApp } from '../lib/desktopApp';

// Windows app download page: the right installer for this PC (always the newest version),
// both versions for anyone who needs the other one, and the install steps.
export default function DownloadPage() {
  const { language } = useAuth();
  const hi = language === 'hi';
  const L = (en: string, h: string) => (hi ? h : en);
  const inApp = useIsDesktopApp();
  const dl = useWindowsAppDownload();
  const [started, setStarted] = useState<WindowsArch | null>(null);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('started');
    if (s === 'x64' || s === 'arm64') setStarted(s);
  }, []);

  const startHere = (arch: WindowsArch) => { setStarted(arch); window.location.href = windowsDownloadUrl(arch); };
  const releaseDate = new Date(WINDOWS_APP.releasedAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const features = [
    { icon: WifiOff, t: L('Tests without internet', 'बिना इंटरनेट टेस्ट'), d: L('Download mock and typing tests, attempt them offline, see the full analysis.', 'मॉक व टाइपिंग टेस्ट डाउनलोड करें, ऑफ़लाइन दें, पूरा विश्लेषण देखें।') },
    { icon: Bookmark, t: L('Offline bookmarks', 'ऑफ़लाइन बुकमार्क'), d: L('Bookmarked questions with answers are saved on your PC automatically.', 'उत्तर सहित बुकमार्क प्रश्न आपके पीसी पर अपने आप सेव।') },
    { icon: ShieldCheck, t: L('Focus mode', 'फोकस मोड'), d: L('Full-screen exam window, like the real computer-based exam.', 'असली कंप्यूटर आधारित परीक्षा जैसी फुल-स्क्रीन विंडो।') },
    { icon: Bell, t: L('Reminders', 'रिमाइंडर'), d: L('New notices, last dates and Study Planner tasks as Windows notifications.', 'नई सूचनाएं, अंतिम तिथि व स्टडी प्लानर टास्क की विंडोज़ नोटिफिकेशन।') },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${pageBg}`}>
      <SiteHeader />
      <PageTitle
        crumbs={[{ label: L('Home', 'होम'), href: '/' }, { label: L('Windows app', 'विंडोज़ ऐप') }]}
        title={L('Mock Test Hub for Windows', 'Mock Test Hub विंडोज़ ऐप')}
        subtitle={L(`Version ${WINDOWS_APP.version} · released ${releaseDate} · Windows 10 and 11`, `वर्ज़न ${WINDOWS_APP.version} · ${releaseDate} · विंडोज़ 10 और 11`)}
      />
      <main className={`${container} w-full py-6 flex-1 space-y-5`}>
        {inApp ? (
          <SectionCard>
            <p className="text-sm text-slate-600 dark:text-slate-300">{L('You are already using the Mock Test Hub app.', 'आप पहले से Mock Test Hub ऐप इस्तेमाल कर रहे हैं।')}</p>
          </SectionCard>
        ) : (
          <>
            {started && (
              <div role="status" className="flex items-start gap-3 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div className="text-sm text-green-900 dark:text-green-200">
                  <p className="font-semibold">{L(`Your download has started (${archLabel(started)}).`, `डाउनलोड शुरू हो गया है (${archLabel(started, true)})।`)}</p>
                  <p className="mt-0.5">{L('Open the downloaded file and follow the steps below.', 'डाउनलोड की गई फ़ाइल खोलें और नीचे दिए चरण अपनाएं।')}{' '}
                    <button type="button" onClick={() => startHere(started)} className="font-semibold underline cursor-pointer">{L('Download again', 'फिर से डाउनलोड करें')}</button>
                  </p>
                </div>
              </div>
            )}

            <SectionCard title={L('Download', 'डाउनलोड')}>
              {dl.show && dl.windows ? (
                <div className="space-y-3">
                  <button type="button" onClick={() => startHere(dl.arch)} className="h-11 px-5 rounded-md bg-[#1e4e79] hover:bg-[#173d60] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
                    <MonitorDown className="h-5 w-5" />{L('Download for Windows', 'विंडोज़ के लिए डाउनलोड करें')}
                  </button>
                  <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5" />
                    {dl.sure
                      ? L(`Detected: ${archLabel(dl.arch)} · ${installerSizeMb(dl.arch)} MB`, `पहचाना गया: ${archLabel(dl.arch, true)} · ${installerSizeMb(dl.arch)} MB`)
                      : L(`For ${archLabel(dl.arch)} · ${installerSizeMb(dl.arch)} MB (your browser didn't tell the processor type; on a Snapdragon / ARM PC choose the ARM version below)`, `${archLabel(dl.arch, true)} के लिए · ${installerSizeMb(dl.arch)} MB (स्नैपड्रैगन / ARM पीसी पर नीचे ARM वर्ज़न चुनें)`)}
                  </p>
                </div>
              ) : dl.show ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">{L('The app is for Windows PCs (Windows 10 and 11). Open this page on your Windows computer, or download a version below.', 'यह ऐप विंडोज़ पीसी (विंडोज़ 10 और 11) के लिए है। यह पेज अपने विंडोज़ कंप्यूटर पर खोलें, या नीचे से वर्ज़न डाउनलोड करें।')}</p>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(['x64', 'arm64'] as WindowsArch[]).map(arch => (
                  <button key={arch} type="button" onClick={() => startHere(arch)} className={`text-left rounded-md border px-4 py-3 transition-colors cursor-pointer hover:border-[#1e4e79] ${dl.windows && dl.arch === arch ? 'border-[#1e4e79] bg-[#eef3f8] dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700'}`}>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-white">{arch === 'x64' ? L('Intel / AMD (x64)', 'Intel / AMD (x64)') : L('ARM64 (Snapdragon)', 'ARM64 (स्नैपड्रैगन)')}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{arch === 'x64' ? L('Most laptops and desktops', 'अधिकांश लैपटॉप व डेस्कटॉप') : L('Copilot+ PCs with Snapdragon X and other ARM PCs', 'स्नैपड्रैगन X वाले Copilot+ पीसी व अन्य ARM पीसी')} · {installerSizeMb(arch)} MB</span>
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard title={L('How to install', 'इंस्टॉल कैसे करें')}>
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                <li>{L('Open the downloaded file (MockTestHub_…-setup.exe).', 'डाउनलोड की गई फ़ाइल (MockTestHub_…-setup.exe) खोलें।')}</li>
                <li>{L('If Windows shows "Windows protected your PC", click "More info" and then "Run anyway". This appears because the app is new; it is safe.', 'अगर विंडोज़ "Windows protected your PC" दिखाए, तो "More info" और फिर "Run anyway" पर क्लिक करें। ऐप नया होने के कारण यह दिखता है; यह सुरक्षित है।')}</li>
                <li>{L('Follow the installer. Mock Test Hub is added to the Start menu.', 'इंस्टॉलर के चरण पूरे करें। Mock Test Hub स्टार्ट मेनू में जुड़ जाएगा।')}</li>
                <li>{L('Sign in with your Mock Test Hub account.', 'अपने Mock Test Hub खाते से लॉग इन करें।')}</li>
              </ol>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{L('Already installed? Download and install again to update; your account and downloaded tests stay.', 'पहले से इंस्टॉल है? अपडेट के लिए फिर से डाउनलोड करके इंस्टॉल करें; आपका खाता और डाउनलोड किए टेस्ट बने रहेंगे।')}</p>
            </SectionCard>

            <div className="grid gap-4 sm:grid-cols-2">
              {features.map(f => (
                <SectionCard key={f.t} bodyClass="px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2"><f.icon className="h-4 w-4 text-[#1e4e79] dark:text-blue-400" />{f.t}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{f.d}</p>
                </SectionCard>
              ))}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
