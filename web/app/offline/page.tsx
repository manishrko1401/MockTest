"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Trash2, Play, BarChart3, Keyboard, Award, CloudUpload, WifiOff, ShieldCheck, Bookmark, ChevronRight } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { SiteHeader, SiteFooter, PageTitle, SectionCard, StatusBadge, btnPrimary, btnSecondary, pageBg, container } from '../components/SiteUI';
import { useOfflineIndex, offlineDelete, offlineAttempts, syncOfflineResults, pendingOfflineResults, OfflineItem } from '../lib/desktopApp';

// "My offline tests" (Windows app): tests downloaded to this PC, results waiting to upload.
export default function OfflineTestsPage() {
  const { language } = useAuth();
  const hi = language === 'hi';
  const L = (en: string, h: string) => (hi ? h : en);
  const { inApp, items } = useOfflineIndex();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);

  const refreshPending = useCallback(() => { pendingOfflineResults().then(setPending); }, []);
  useEffect(() => {
    setMounted(true);
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  useEffect(() => { if (inApp) refreshPending(); }, [inApp, items, refreshPending]);
  useEffect(() => {
    (async () => {
      const counts: Record<string, number> = {};
      for (const it of items) if (it.kind === 'mock') counts[it.id] = (await offlineAttempts('mock', it.id)).length;
      setAttemptCounts(counts);
    })();
  }, [items]);

  const syncNow = async () => {
    setSyncing(true);
    await syncOfflineResults();
    setSyncing(false);
    refreshPending();
  };
  const remove = async (it: OfflineItem) => {
    if (!window.confirm(L(`Remove "${it.title}" from this computer?`, `"${it.title}" को इस कंप्यूटर से हटाएं?`))) return;
    await offlineDelete(it.kind, it.id);
  };
  const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const totalMb = items.reduce((a, it) => a + (it.sizeBytes || 0), 0) / (1024 * 1024);
  const startHref = (it: OfflineItem) => `/offline/${it.kind === 'mock' ? 'exam' : 'typing'}?id=${encodeURIComponent(it.id)}`;

  if (!mounted) return <div className={`min-h-screen ${pageBg}`} />;

  return (
    <div className={`min-h-screen flex flex-col ${pageBg}`}>
      <SiteHeader />
      <PageTitle
        crumbs={[{ label: L('Home', 'होम'), href: '/' }, { label: L('Offline tests', 'ऑफ़लाइन टेस्ट') }]}
        title={L('My offline tests', 'मेरे ऑफ़लाइन टेस्ट')}
        subtitle={L('Tests downloaded to this computer. Attempt them and see the analysis without internet; results upload automatically when you are back online.', 'इस कंप्यूटर पर डाउनलोड किए गए टेस्ट। बिना इंटरनेट टेस्ट दें और विश्लेषण देखें; इंटरनेट आने पर परिणाम अपने आप अपलोड होते हैं।')}
      />
      <main className={`${container} w-full py-6 flex-1 space-y-5`}>
        {!inApp ? (
          <SectionCard title={L('Available in the Windows app', 'विंडोज़ ऐप में उपलब्ध')}>
            <p className="text-sm text-slate-600 dark:text-slate-300">{L('Offline tests can be downloaded and attempted in the Mock Test Hub app for Windows.', 'ऑफ़लाइन टेस्ट Mock Test Hub विंडोज़ ऐप में डाउनलोड और हल किए जा सकते हैं।')}</p>
          </SectionCard>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <SectionCard bodyClass="px-5 py-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">{L('Downloaded', 'डाउनलोड किए गए')}</p>
                <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{items.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{totalMb.toFixed(1)} MB</p>
              </SectionCard>
              <SectionCard bodyClass="px-5 py-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">{L('Results waiting to upload', 'अपलोड के लिए प्रतीक्षित परिणाम')}</p>
                <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{pending}</p>
                {pending > 0 && (online
                  ? <button type="button" onClick={syncNow} disabled={syncing} className="mt-1 text-xs font-medium text-[#1e4e79] dark:text-blue-300 hover:underline cursor-pointer inline-flex items-center gap-1"><CloudUpload className="h-3.5 w-3.5" />{syncing ? L('Uploading…', 'अपलोड हो रहा है…') : L('Upload now', 'अभी अपलोड करें')}</button>
                  : <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><WifiOff className="h-3.5 w-3.5" />{L('Will upload when online', 'इंटरनेट आने पर अपलोड होंगे')}</p>)}
              </SectionCard>
              <SectionCard bodyClass="px-5 py-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-[#1e7e34]" />{L('Protected', 'सुरक्षित')}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{L('Downloads are encrypted and only open in this app on this computer.', 'डाउनलोड एन्क्रिप्टेड हैं और केवल इस कंप्यूटर पर इसी ऐप में खुलते हैं।')}</p>
              </SectionCard>
            </div>

            <Link href="/offline/bookmarks" className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-3.5 hover:border-[#1e4e79] transition-colors">
              <Bookmark className="h-5 w-5 text-yellow-500 fill-yellow-500 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{L('Bookmarked questions', 'बुकमार्क किए गए प्रश्न')}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{L('Your bookmarks with answers and explanations, saved on this computer automatically.', 'उत्तर और व्याख्या सहित आपके बुकमार्क, इस कंप्यूटर पर अपने आप सेव।')}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            </Link>

            <SectionCard title={L('Downloaded tests', 'डाउनलोड किए गए टेस्ट')} bodyClass="p-0">
              {items.length === 0 ? (
                <div className="px-5 py-8 text-center space-y-3">
                  <Download className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">{L('No tests downloaded yet. Use the download button on any mock test or typing test.', 'अभी कोई टेस्ट डाउनलोड नहीं। किसी भी मॉक या टाइपिंग टेस्ट पर डाउनलोड बटन दबाएं।')}</p>
                  <div className="flex justify-center gap-2">
                    <Link href="/mock-tests" className={btnSecondary}><Award className="h-4 w-4" />{L('Test series', 'टेस्ट सीरीज़')}</Link>
                    <Link href="/typing-test" className={btnSecondary}><Keyboard className="h-4 w-4" />{L('Typing tests', 'टाइपिंग टेस्ट')}</Link>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[...items].sort((a, b) => b.downloadedAt - a.downloadedAt).map(it => (
                    <li key={`${it.kind}|${it.id}`} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge tone={it.kind === 'mock' ? 'blue' : 'slate'}>{it.kind === 'mock' ? L('Mock test', 'मॉक टेस्ट') : L('Typing', 'टाइपिंग')}</StatusBadge>
                          {it.expired ? <StatusBadge tone="red">{L('Expired', 'समाप्त')}</StatusBadge> : null}
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white break-words">{it.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {[it.subtitle, it.expired ? L('Download again when online', 'इंटरनेट पर दोबारा डाउनलोड करें') : `${L('Available offline until', 'ऑफ़लाइन उपलब्ध')} ${fmtDate(it.expiresAt)}`, attemptCounts[it.id] ? L(`${attemptCounts[it.id]} offline attempt(s)`, `${attemptCounts[it.id]} ऑफ़लाइन प्रयास`) : ''].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!it.expired && <Link href={startHref(it)} className={`${btnPrimary} h-8 px-3 text-xs`}><Play className="h-3.5 w-3.5" />{L('Start', 'शुरू करें')}</Link>}
                        {!it.expired && it.kind === 'mock' && (
                          <Link href={`/offline/analysis?id=${encodeURIComponent(it.id)}`} className={`${btnSecondary} h-8 px-3 text-xs`}><BarChart3 className="h-3.5 w-3.5" />{L('Analysis', 'विश्लेषण')}</Link>
                        )}
                        <button type="button" onClick={() => remove(it)} aria-label={L('Remove download', 'डाउनलोड हटाएं')} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
