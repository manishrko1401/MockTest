"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { ShieldCheck, Bell, Trophy, FileText, ArrowLeft, X, ArrowRight, Search, HelpCircle } from 'lucide-react';
import { NoticesListTour, requestNoticesTourStart } from '../components/NoticesTour';
import { TRANSLATIONS } from '../translations';
import { SiteHeader, SiteFooter, PageTitle, SectionCard, StatusBadge, btnSecondary, inputCls, linkCls, pageBg, container } from '../components/SiteUI';

const isNewlyPublished = (publishDateStr?: string) => {
  if (!publishDateStr) return false;
  try {
    const pubDate = new Date(publishDateStr);
    const now = new Date();
    pubDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(now.getTime() - pubDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  } catch (e) {
    return false;
  }
};

export default function UpdatesCenterPage() {
  const { noticesList, language } = useAuth();
  const t = TRANSLATIONS[language];
  
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => { setIsMounted(true); }, []);
  const displayNotices = isMounted ? noticesList : [];
  const [categoryFilter, setCategoryFilter] = React.useState<'notice' | 'result' | 'admit_card' | 'answer_key' | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const router = useRouter();

  // Listen to URL search param ?category=...
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateCategoryFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category') as any;
      if (['notice', 'result', 'admit_card', 'answer_key'].includes(cat)) {
        setCategoryFilter(cat);
      } else {
        setCategoryFilter(null);
      }
    };

    updateCategoryFromUrl();
    window.addEventListener('popstate', updateCategoryFromUrl);
    return () => window.removeEventListener('popstate', updateCategoryFromUrl);
  }, []);

  const openCategorySection = (cat: 'notice' | 'result' | 'admit_card' | 'answer_key') => {
    setCategoryFilter(cat);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('category', cat);
      window.history.pushState({}, '', url.toString());
    }
  };

  const clearCategorySection = () => {
    setCategoryFilter(null);
    setSearchQuery('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('category');
      window.history.pushState({}, '', url.toString());
    }
  };

  const isHindi = language === 'hi';
  const q = searchQuery.toLowerCase().trim();
  const matchesSearch = (n: any) =>
    !q ||
    n.title.toLowerCase().includes(q) ||
    (n.type && n.type.toLowerCase().includes(q)) ||
    (n.category && n.category.toLowerCase().includes(q));
  const listFor = (cat: string) =>
    [...displayNotices]
      .filter(n => n.category === cat)
      .filter(matchesSearch)
      .sort((a, b) => b.publishDate.localeCompare(a.publishDate));

  // First live notice: target of the notices tour, which opens it
  const firstLiveNoticeId: string | null = isMounted ? (listFor('notice')[0]?.id ?? null) : null;

  // Single notification row
  const renderTileCard = (notice: any) => (
    <button
      type="button"
      key={notice.id}
      data-tour={notice.id === firstLiveNoticeId ? 'notice-row' : undefined}
      onClick={() => router.push(`/updates/${notice.id}`)}
      className="group w-full text-left px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex flex-col gap-1"
      suppressHydrationWarning
    >
      <span className="text-sm text-slate-800 dark:text-slate-200 leading-snug group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 group-hover:underline underline-offset-2">
        {notice.title}
      </span>
      <span className="flex items-center gap-x-2 gap-y-1 flex-wrap text-xs text-slate-500 dark:text-slate-400">
        <span>{notice.date}</span>
        {notice.type && <><span className="text-slate-300 dark:text-slate-600">|</span><span>{notice.type}</span></>}
        {notice.category === 'notice' && notice.lastDate && (
          <><span className="text-slate-300 dark:text-slate-600">|</span><span className="text-[#b02a37] dark:text-red-400">{t.lastDate} {notice.lastDate}</span></>
        )}
        {isNewlyPublished(notice.publishDate) && <StatusBadge tone="red">{t.newBadge}</StatusBadge>}
      </span>
    </button>
  );

  const categoryMeta = {
    notice: {
      short: t.liveNotices,
      title: isHindi ? 'सभी लाइव सूचनाएं' : 'All Live Notices',
      desc: isHindi ? 'सक्रिय सरकारी भर्ती विज्ञापन और ऑनलाइन आवेदन पत्र' : 'Active government recruitment advertisements and online application forms.',
      icon: Bell,
    },
    result: {
      short: t.resultsMerits,
      title: isHindi ? 'सभी परिणाम और मेरिट लिस्ट' : 'All Results & Merit Lists',
      desc: isHindi ? 'परीक्षा परिणाम, मेरिट सूचियां और कट-ऑफ अंक' : 'Declared exam results, merit lists, score cards and cut-off marks.',
      icon: Trophy,
    },
    admit_card: {
      short: t.admitCards,
      title: isHindi ? 'सभी प्रवेश पत्र और परीक्षा तिथियां' : 'All Admit Cards & Exam Dates',
      desc: isHindi ? 'प्रवेश पत्र डाउनलोड, कॉल लेटर और परीक्षा केंद्र की जानकारी' : 'Hall tickets, exam city intimation slips and call letters.',
      icon: FileText,
    },
    answer_key: {
      short: isHindi ? 'उत्तर कुंजी' : 'Answer Keys',
      title: isHindi ? 'सभी उत्तर कुंजी' : 'All Answer Keys',
      desc: isHindi ? 'अनंतिम और अंतिम उत्तर कुंजी और आपत्ति लिंक' : 'Provisional and final answer keys with objection links.',
      icon: ShieldCheck,
    },
  } as const;


  const ORDER: Array<'notice' | 'result' | 'admit_card' | 'answer_key'> = ['answer_key', 'result', 'admit_card', 'notice'];
  const PREVIEW_LIMIT = 10;
  const activeMeta = categoryFilter ? categoryMeta[categoryFilter] : null;

  const emptyState = (
    <div className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
      {!isMounted
        ? (isHindi ? 'लोड हो रहा है…' : 'Loading…')
        : (isHindi ? 'कोई सूचना नहीं मिली।' : 'No matching notifications found.')}
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col ${pageBg} font-sans`} suppressHydrationWarning>
      <SiteHeader />

      <PageTitle
        crumbs={activeMeta
          ? [{ label: isHindi ? 'होम' : 'Home', href: '/' }, { label: isHindi ? 'सूचनाएं' : 'Notices', href: '/updates' }, { label: activeMeta.short }]
          : [{ label: isHindi ? 'होम' : 'Home', href: '/' }, { label: isHindi ? 'सूचनाएं' : 'Notices' }]}
        title={activeMeta ? activeMeta.title : (isHindi ? 'सूचनाएं एवं अपडेट' : 'Notices & Updates')}
        subtitle={activeMeta
          ? activeMeta.desc
          : (isHindi
            ? 'सरकारी भर्ती की नवीनतम सूचनाएं, परिणाम, प्रवेश पत्र और उत्तर कुंजी एक स्थान पर।'
            : 'Latest government recruitment notices, results, admit cards and answer keys in one place.')}
        actions={activeMeta ? (
          <button type="button" onClick={clearCategorySection} className={btnSecondary} suppressHydrationWarning>
            <ArrowLeft className="h-4 w-4" />
            {isHindi ? 'सभी अनुभाग' : 'All sections'}
          </button>
        ) : (
          <button type="button" onClick={requestNoticesTourStart} className={btnSecondary} suppressHydrationWarning>
            <HelpCircle className="h-4 w-4" />
            {isHindi ? 'यह कैसे काम करता है' : 'How it works'}
          </button>
        )}
      >
        <div data-tour="notice-filters" className="mt-5 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative w-full md:max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeMeta
                ? (isHindi ? `${activeMeta.short} में खोजें` : `Search in ${activeMeta.short}`)
                : (isHindi ? 'नौकरी, परिणाम, प्रवेश पत्र या उत्तर कुंजी खोजें' : 'Search jobs, results, admit cards and answer keys')}
              className={`${inputCls} pl-9 pr-8`}
              suppressHydrationWarning
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Clear search"
                suppressHydrationWarning
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {!activeMeta && (
            <div className="flex flex-wrap gap-1.5">
              {ORDER.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => openCategorySection(cat)}
                  className="h-8 px-3 rounded-md text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  suppressHydrationWarning
                >
                  {categoryMeta[cat].short}
                  {isMounted && <span className="ml-1.5 text-xs text-slate-400">{listFor(cat).length}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </PageTitle>

      <main className={`${container} w-full py-6 pb-12 flex-1`} suppressHydrationWarning>
        {categoryFilter && activeMeta ? (
          (() => {
            const items = listFor(categoryFilter);
            return (
              <SectionCard
                title={<span className="flex items-center gap-2">{React.createElement(activeMeta.icon, { className: 'h-4 w-4 text-[#1e4e79] dark:text-blue-400' })}{activeMeta.short}</span>}
                description={isMounted ? (isHindi ? `${items.length} सूचनाएं` : `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`) : undefined}
                bodyClass="divide-y divide-slate-100 dark:divide-slate-800"
              >
                {items.length > 0 ? items.map(renderTileCard) : emptyState}
              </SectionCard>
            );
          })()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
            {ORDER.map(cat => {
              const meta = categoryMeta[cat];
              const items = listFor(cat);
              return (
                <SectionCard
                  key={cat}
                  title={<span className="flex items-center gap-2">{React.createElement(meta.icon, { className: 'h-4 w-4 text-[#1e4e79] dark:text-blue-400' })}{meta.short}</span>}
                  bodyClass="divide-y divide-slate-100 dark:divide-slate-800"
                  footer={
                    <button type="button" onClick={() => openCategorySection(cat)} className={`${linkCls} text-sm font-medium inline-flex items-center gap-1 cursor-pointer`} suppressHydrationWarning>
                      {isHindi ? 'सभी देखें' : 'View all'}{isMounted && items.length > 0 ? ` (${items.length})` : ''}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  }
                >
                  {items.length > 0 ? items.slice(0, PREVIEW_LIMIT).map(renderTileCard) : emptyState}
                </SectionCard>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
      {!activeMeta && <NoticesListTour firstNoticeId={firstLiveNoticeId} />}
    </div>
  );
}
