"use client";

import React, { useEffect, useState } from 'react';
import { MonitorDown, CheckCircle2, WifiOff, Bookmark, ShieldCheck, Bell, Smartphone, CalendarCheck, Users, Moon, BarChart3, AlertTriangle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { SiteHeader, SiteFooter, PageTitle, SectionCard, pageBg, container } from '../components/SiteUI';
import { useWindowsAppDownload, archLabel } from '../components/WindowsAppDownload';
import { WINDOWS_APP, WindowsArch, windowsDownloadUrl, installerSizeMb } from '../lib/windowsApp';
import { ANDROID_APP, androidDownloadUrl, apkSizeMb } from '../lib/androidApp';
import { useIsDesktopApp } from '../lib/desktopApp';

type Platform = 'android' | 'windows';

// App download page: both apps in one section (Windows PC and Android phone, always the newest
// versions), then the install steps for the chosen one. ?platform= picks which steps show first.
export default function DownloadPage() {
  const { language } = useAuth();
  const hi = language === 'hi';
  const L = (en: string, h: string) => (hi ? h : en);
  const inApp = useIsDesktopApp();
  const dl = useWindowsAppDownload();
  const [platform, setPlatform] = useState<Platform>('windows');
  const [started, setStarted] = useState<WindowsArch | 'android' | null>(null);
  const [failed, setFailed] = useState(false);
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const s = q.get('started');
    if (s === 'x64' || s === 'arm64' || s === 'android') setStarted(s);
    const ua = navigator.userAgent || '';
    const onPhone = /Android|iPhone|iPad|Mobile/i.test(ua);
    setPhone(onPhone);
    const p = q.get('platform');
    if (p === 'android' || p === 'windows') setPlatform(p);
    else if (s === 'android' || onPhone) setPlatform('android');
    if (q.get('error')) setFailed(true);
  }, []);

  const pick = (p: Platform) => {
    setPlatform(p);
    window.history.replaceState(null, '', `/download?platform=${p}`);
  };
  const startWindows = (arch: WindowsArch) => { setStarted(arch); setPlatform('windows'); window.location.href = windowsDownloadUrl(arch); };
  const startAndroid = () => { setStarted('android'); setPlatform('android'); setFailed(false); window.location.href = androidDownloadUrl; };
  const dateOf = (d: string) => new Date(d).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const android = platform === 'android';

  const windowsFeatures = [
    { icon: WifiOff, t: L('Tests without internet', 'बिना इंटरनेट टेस्ट'), d: L('Download mock and typing tests, attempt them offline, see the full analysis.', 'मॉक व टाइपिंग टेस्ट डाउनलोड करें, ऑफ़लाइन दें, पूरा विश्लेषण देखें।') },
    { icon: Bookmark, t: L('Offline bookmarks', 'ऑफ़लाइन बुकमार्क'), d: L('Bookmarked questions with answers are saved on your PC automatically.', 'उत्तर सहित बुकमार्क प्रश्न आपके पीसी पर अपने आप सेव।') },
    { icon: ShieldCheck, t: L('Focus mode', 'फोकस मोड'), d: L('Full-screen exam window, like the real computer-based exam.', 'असली कंप्यूटर आधारित परीक्षा जैसी फुल-स्क्रीन विंडो।') },
    { icon: Bell, t: L('Reminders', 'रिमाइंडर'), d: L('New notices, last dates and Study Planner tasks as Windows notifications.', 'नई सूचनाएं, अंतिम तिथि व स्टडी प्लानर टास्क की विंडोज़ नोटिफिकेशन।') },
  ];
  const androidFeatures = [
    { icon: BarChart3, t: L('Mock tests & analysis', 'मॉक टेस्ट व विश्लेषण'), d: L('Every test of the website with questions, solutions and your full analysis.', 'वेबसाइट के सभी टेस्ट, प्रश्न, हल व पूरा विश्लेषण।') },
    { icon: CalendarCheck, t: L('Study Planner', 'स्टडी प्लानर'), d: L('Plan your day, tick off tasks and keep your streak going.', 'दिन की योजना बनाएं, टास्क पूरे करें, स्ट्रीक बनाए रखें।') },
    { icon: Users, t: L('Tests with friends', 'दोस्तों के साथ टेस्ट'), d: L('Create a room, attempt the same test together and compare results.', 'रूम बनाएं, एक ही टेस्ट साथ दें और नतीजों की तुलना करें।') },
    { icon: Moon, t: L('Light / dark theme', 'लाइट / डार्क थीम'), d: L('Easy on the eyes day and night, with adjustable question text size.', 'दिन-रात आंखों के लिए आरामदायक, प्रश्न का टेक्स्ट छोटा-बड़ा करें।') },
  ];
  const features = android ? androidFeatures : windowsFeatures;

  // The app for this device is highlighted (and listed first on phones)
  const windowsHere = dl.windows && !inApp;
  const androidHere = phone && /Android/i.test(typeof navigator === 'undefined' ? '' : navigator.userAgent);
  const panel = (here: boolean) => `rounded-lg border p-4 flex flex-col gap-3 ${here ? 'border-[#1e4e79] bg-[#f5f8fc] dark:bg-slate-800/60' : 'border-slate-200 dark:border-slate-700'}`;
  const mainBtn = 'h-11 px-5 rounded-md bg-[#1e4e79] hover:bg-[#173d60] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer';
  const thisDevice = <span className="text-[11px] font-semibold uppercase tracking-wide text-[#1e4e79] dark:text-blue-300">{L('This device', 'यह डिवाइस')}</span>;

  const windowsPanel = (
    <div key="windows" className={panel(windowsHere)}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-blue-400 flex items-center justify-center shrink-0"><MonitorDown className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{L('Windows PC', 'विंडोज़ पीसी')}</h3>
            {windowsHere && thisDevice}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{L(`Windows 10 and 11 · v${WINDOWS_APP.version} · ${dateOf(WINDOWS_APP.releasedAt)}`, `विंडोज़ 10 और 11 · v${WINDOWS_APP.version} · ${dateOf(WINDOWS_APP.releasedAt)}`)}</p>
        </div>
      </div>
      {inApp ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">{L('You are already using the Windows app.', 'आप पहले से विंडोज़ ऐप इस्तेमाल कर रहे हैं।')}</p>
      ) : (
        <>
          <button type="button" onClick={() => startWindows(dl.arch)} className={mainBtn}>
            <MonitorDown className="h-5 w-5" />{L('Download for Windows', 'विंडोज़ के लिए डाउनलोड करें')}
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {dl.windows && dl.sure
              ? L(`For your ${archLabel(dl.arch, true)} · ${installerSizeMb(dl.arch)} MB`, `आपके ${archLabel(dl.arch, true)} के लिए · ${installerSizeMb(dl.arch)} MB`)
              : L(`For ${archLabel(dl.arch)} · ${installerSizeMb(dl.arch)} MB`, `${archLabel(dl.arch, true)} के लिए · ${installerSizeMb(dl.arch)} MB`)}
            {' · '}
            {(['x64', 'arm64'] as WindowsArch[]).filter(a => a !== dl.arch).map(a => (
              <button key={a} type="button" onClick={() => startWindows(a)} className="text-[#1e4e79] dark:text-blue-300 hover:underline cursor-pointer">
                {a === 'arm64' ? L('ARM (Snapdragon) version', 'ARM (स्नैपड्रैगन) वर्ज़न') : L('Intel / AMD version', 'Intel / AMD वर्ज़न')}
              </button>
            ))}
          </p>
          {phone && <p className="text-xs text-slate-500 dark:text-slate-400">{L('Open this page on your computer to install it there.', 'इसे इंस्टॉल करने के लिए यह पेज अपने कंप्यूटर पर खोलें।')}</p>}
        </>
      )}
    </div>
  );

  const androidPanel = (
    <div key="android" className={panel(androidHere)}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-blue-400 flex items-center justify-center shrink-0"><Smartphone className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{L('Android phone', 'एंड्रॉइड फ़ोन')}</h3>
            {androidHere && thisDevice}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{L(`Android ${ANDROID_APP.minAndroid} and newer · v${ANDROID_APP.version} · ${dateOf(ANDROID_APP.releasedAt)}`, `एंड्रॉइड ${ANDROID_APP.minAndroid} और नया · v${ANDROID_APP.version} · ${dateOf(ANDROID_APP.releasedAt)}`)}</p>
        </div>
      </div>
      <button type="button" onClick={startAndroid} className={mainBtn}>
        <Smartphone className="h-5 w-5" />{L('Download for Android', 'एंड्रॉइड के लिए डाउनलोड करें')}
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400">{L(`${apkSizeMb()} MB · free, no Play Store needed`, `${apkSizeMb()} MB · मुफ़्त, प्ले स्टोर की ज़रूरत नहीं`)}</p>
      {!phone && <p className="text-xs text-slate-500 dark:text-slate-400">{L('Open this page on your Android phone to install it there.', 'इसे इंस्टॉल करने के लिए यह पेज अपने एंड्रॉइड फ़ोन पर खोलें।')}</p>}
    </div>
  );

  const tab = (p: Platform, icon: React.ReactNode, label: string) => (
    <button type="button" role="tab" aria-selected={platform === p} onClick={() => pick(p)}
      className={`flex-1 sm:flex-none h-9 px-4 rounded-md text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${platform === p ? 'bg-[#1e4e79] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
      {icon}{label}
    </button>
  );

  return (
    <div className={`min-h-screen flex flex-col ${pageBg}`}>
      <SiteHeader />
      <PageTitle
        crumbs={[{ label: L('Home', 'होम'), href: '/' }, { label: L('Download app', 'ऐप डाउनलोड') }]}
        title={L('Get the Mock Test Hub app', 'Mock Test Hub ऐप डाउनलोड करें')}
        subtitle={L('Free for your Windows PC and Android phone. Sign in with the same account on both.', 'विंडोज़ पीसी और एंड्रॉइड फ़ोन के लिए मुफ़्त। दोनों में एक ही खाते से लॉग इन करें।')}
      />
      <main className={`${container} w-full py-6 flex-1 space-y-5`}>
        {started && (
          <div role="status" className="flex items-start gap-3 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div className="text-sm text-green-900 dark:text-green-200">
              <p className="font-semibold">{started === 'android'
                ? L('Your Android app download has started.', 'एंड्रॉइड ऐप का डाउनलोड शुरू हो गया है।')
                : L(`Your Windows app download has started (${archLabel(started)}).`, `विंडोज़ ऐप का डाउनलोड शुरू हो गया है (${archLabel(started, true)})।`)}</p>
              <p className="mt-0.5">{L('Open the downloaded file and follow the steps below.', 'डाउनलोड की गई फ़ाइल खोलें और नीचे दिए चरण अपनाएं।')}{' '}
                <button type="button" onClick={() => (started === 'android' ? startAndroid() : startWindows(started))} className="font-semibold underline cursor-pointer">{L('Download again', 'फिर से डाउनलोड करें')}</button>
              </p>
            </div>
          </div>
        )}
        {failed && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{L('The download could not start. Please try again in a minute.', 'डाउनलोड शुरू नहीं हो सका। एक मिनट बाद फिर कोशिश करें।')}</p>
          </div>
        )}

        <SectionCard title={L('Download', 'डाउनलोड')}>
          <div className="grid gap-4 md:grid-cols-2">
            {androidHere ? [androidPanel, windowsPanel] : [windowsPanel, androidPanel]}
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{L('iPhone: there is no iPhone app yet; use this website in Safari.', 'आईफ़ोन: अभी आईफ़ोन ऐप नहीं है; Safari में यही वेबसाइट इस्तेमाल करें।')}</p>
        </SectionCard>

        <SectionCard title={L('How to install', 'इंस्टॉल कैसे करें')}>
          <div role="tablist" aria-label={L('Choose the app', 'ऐप चुनें')} className="flex gap-1 p-1 mb-4 rounded-lg border border-slate-200 dark:border-slate-700 w-full sm:w-fit">
            {tab('android', <Smartphone className="h-4 w-4" />, L('Android phone', 'एंड्रॉइड फ़ोन'))}
            {tab('windows', <MonitorDown className="h-4 w-4" />, L('Windows PC', 'विंडोज़ पीसी'))}
          </div>
          {android ? (
            <>
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                <li>{L(`Tap "Download for Android" and wait for ${ANDROID_APP.file} to finish downloading.`, `"एंड्रॉइड के लिए डाउनलोड करें" दबाएं और ${ANDROID_APP.file} का डाउनलोड पूरा होने दें।`)}</li>
                <li>{L('Open the file from the notification or your Downloads folder.', 'नोटिफिकेशन या Downloads फ़ोल्डर से फ़ाइल खोलें।')}</li>
                <li>{L('If your phone asks, allow "Install unknown apps" for your browser (Chrome) and go back.', 'अगर फ़ोन पूछे, तो अपने ब्राउज़र (Chrome) के लिए "Install unknown apps" की अनुमति दें और वापस आएं।')}</li>
                <li>{L('Tap "Install". If Play Protect shows a warning, tap "More details" and then "Install anyway". This appears because the app is not from the Play Store; it is safe.', '"Install" दबाएं। अगर Play Protect चेतावनी दिखाए, तो "More details" और फिर "Install anyway" दबाएं। ऐप प्ले स्टोर से न होने के कारण यह दिखता है; यह सुरक्षित है।')}</li>
                <li>{L('Open Mock Test Hub and sign in with your account.', 'Mock Test Hub खोलें और अपने खाते से लॉग इन करें।')}</li>
              </ol>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{L('Already installed? Download and install again to update; you stay signed in and your data stays.', 'पहले से इंस्टॉल है? अपडेट के लिए फिर से डाउनलोड करके इंस्टॉल करें; आप लॉग इन रहेंगे और डेटा बना रहेगा।')}</p>
            </>
          ) : (
            <>
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                <li>{L('Open the downloaded file (MockTestHub_…-setup.exe).', 'डाउनलोड की गई फ़ाइल (MockTestHub_…-setup.exe) खोलें।')}</li>
                <li>{L('If Windows shows "Windows protected your PC", click "More info" and then "Run anyway". This appears because the app is new; it is safe.', 'अगर विंडोज़ "Windows protected your PC" दिखाए, तो "More info" और फिर "Run anyway" पर क्लिक करें। ऐप नया होने के कारण यह दिखता है; यह सुरक्षित है।')}</li>
                <li>{L('Follow the installer. Mock Test Hub is added to the Start menu.', 'इंस्टॉलर के चरण पूरे करें। Mock Test Hub स्टार्ट मेनू में जुड़ जाएगा।')}</li>
                <li>{L('Sign in with your Mock Test Hub account.', 'अपने Mock Test Hub खाते से लॉग इन करें।')}</li>
              </ol>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{L('Already installed? Download and install again to update; your account and downloaded tests stay.', 'पहले से इंस्टॉल है? अपडेट के लिए फिर से डाउनलोड करके इंस्टॉल करें; आपका खाता और डाउनलोड किए टेस्ट बने रहेंगे।')}</p>
            </>
          )}
        </SectionCard>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map(f => (
            <SectionCard key={f.t} bodyClass="px-5 py-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2"><f.icon className="h-4 w-4 text-[#1e4e79] dark:text-blue-400" />{f.t}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{f.d}</p>
            </SectionCard>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
