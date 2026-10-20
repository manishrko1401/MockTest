"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, WifiOff } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { TRANSLATIONS } from '../../translations';
import BookmarkedQuestions, { OfflineBookmarks, TestQuestions } from '../../components/BookmarkedQuestions';
import { SiteHeader, SiteFooter, PageTitle, pageBg, container } from '../../components/SiteUI';
import { isDesktopApp, offlineOpen, useOfflineIndex } from '../../lib/desktopApp';
import { useOfflineBookmarks, openBookmarkPackage } from '../../lib/offlineBookmarks';
import { generateExamSession } from '../../lib/examUtils';
import { OfflineMessage, OfflineLoading, OfflineGuard } from '../useOfflinePackage';

// Bookmarked questions without internet (Windows app). Each test's bookmarked questions are
// downloaded (encrypted) the moment they're bookmarked; a bookmark made offline in a
// downloaded test is shown from that test's download.

/** All questions of a downloaded test, built the same way as on the Bookmarks page online. */
function fromDownloadedTest(testId: string, payload: any): TestQuestions | null {
  const d = payload?.data;
  if (!d?.customQs?.questions?.length) return null;
  const session = generateExamSession(testId, d.catalog, d.customQs);
  return {
    status: 'ready',
    title: payload.title || session.testTitle,
    questions: session.questions.map((q: any, i: number) => ({ ...q, qNo: i + 1 })),
    sectionNames: Object.fromEntries(session.sections.map(s => [s.id, s.name])),
  };
}

export default function OfflineBookmarksPage() {
  const { language, currentUser } = useAuth();
  const hi = language === 'hi';
  const t = TRANSLATIONS[hi ? 'hi' : 'en'];
  const { items, loaded } = useOfflineIndex();
  const { state: saved } = useOfflineBookmarks();
  const [inApp, setInApp] = useState<boolean | null>(null);
  const [tests, setTests] = useState<Record<string, TestQuestions> | null>(null);

  // Saved for another account that used this PC: not shown
  const list = useMemo(
    () => (saved.userId && (!currentUser || currentUser.id === saved.userId) ? saved.list : []),
    [saved, currentUser],
  );
  const testIds = useMemo(() => [...new Set(list.map(b => b.testId))], [list]);
  const downloaded = useMemo(() => new Set(items.filter(it => it.kind === 'mock' && !it.expired).map(it => it.id)), [items]);
  const savedAt = useMemo(() => Math.max(0, ...Object.values(saved.saved).map(s => s.at)), [saved]);

  useEffect(() => { setInApp(isDesktopApp()); }, []);
  useEffect(() => {
    if (!inApp || !loaded) return; // wait for the list of downloaded tests
    let cancelled = false;
    (async () => {
      const out: Record<string, TestQuestions> = {};
      for (const testId of testIds) {
        const wanted = list.filter(b => b.testId === testId).map(b => b.questionId);
        let entry: TestQuestions | null = null;
        try { entry = (await openBookmarkPackage(testId))?.data?.test || null; } catch { /* not saved (yet) or expired */ }
        const complete = entry?.status === 'ready' && wanted.every(id => entry!.questions.some((q: any) => q.id === id));
        if (!complete && downloaded.has(testId)) {
          try { entry = fromDownloadedTest(testId, await offlineOpen('mock', testId)) || entry; } catch { /* expired */ }
        }
        if (entry) out[testId] = entry;
      }
      if (!cancelled) setTests(out);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inApp, loaded, testIds.join('|'), list.length, downloaded]);

  const offline = useMemo<OfflineBookmarks | null>(() => (tests ? {
    bookmarks: list,
    tests,
    analysisHref: (testId: string) => (downloaded.has(testId) ? `/offline/analysis?id=${encodeURIComponent(testId)}` : null),
  } : null), [tests, list, downloaded]);

  if (inApp === false) return <OfflineMessage message={hi ? 'ऑफ़लाइन बुकमार्क Mock Test Hub विंडोज़ ऐप में काम करते हैं।' : 'Offline bookmarks work in the Mock Test Hub Windows app.'} />;
  if (!offline) return <OfflineLoading />;

  const fmt = (ms: number) => new Date(ms).toLocaleString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  return (
    <OfflineGuard>
      <div className={`min-h-screen flex flex-col ${pageBg}`}>
        <SiteHeader />
        <PageTitle
          crumbs={[{ label: hi ? 'होम' : 'Home', href: '/' }, { label: hi ? 'ऑफ़लाइन टेस्ट' : 'Offline tests', href: '/offline' }, { label: t.bookmarkTitle }]}
          title={<span className="inline-flex items-center gap-2"><Bookmark className="h-5 w-5 text-yellow-500 fill-yellow-500" />{t.bookmarkTitle} ({list.length})</span>}
          subtitle={t.bookmarkDesc}
        />
        <main className={`${container} w-full py-6 flex-1 space-y-4`}>
          <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex flex-wrap items-center gap-1.5">
            <WifiOff className="h-3.5 w-3.5" />
            {hi
              ? `इस कंप्यूटर पर सेव${savedAt ? ` (अंतिम अपडेट ${fmt(savedAt)})` : ''}। नया बुकमार्क करते ही प्रश्न यहां सेव हो जाता है।`
              : `Saved on this computer${savedAt ? ` (last updated ${fmt(savedAt)})` : ''}. A question is saved here as soon as you bookmark it.`}
            <Link href="/offline" className="font-medium text-[#1e4e79] dark:text-blue-300 hover:underline">{hi ? 'मेरे ऑफ़लाइन टेस्ट' : 'My offline tests'}</Link>
          </p>
          <BookmarkedQuestions offline={offline} />
        </main>
        <SiteFooter />
      </div>
    </OfflineGuard>
  );
}
