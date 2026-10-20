import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWithEtag } from './api';
import { readJson, writeJson } from './storage';
import type { Notice, TestCategory } from './shared/webTypes';

// -----------------------------------------------------------------------------
// Test catalogue and notices: shown from the phone's saved copy at once, refreshed from the
// server in the background (an unchanged catalogue costs nothing: ETag / 304).
// -----------------------------------------------------------------------------

type DataValue = {
  catalog: TestCategory[];
  notices: Notice[];
  ready: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const Ctx = createContext<DataValue | null>(null);
const ETAG_KEY = 'mth_catalog_etag';

const sortNotices = (list: Notice[]) => [...list].sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || '') || b.id.localeCompare(a.id));

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<TestCategory[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      const haveCopy = (await readJson<TestCategory[]>('catalog'))?.length;
      const etag = haveCopy ? await AsyncStorage.getItem(ETAG_KEY) : null;
      const res = await requestWithEtag<any>('bootstrap', etag);
      if (res.data?.success) {
        const cat: TestCategory[] = res.data.examCatalog || [];
        const nts: Notice[] = sortNotices((res.data.noticesList || []).filter((n: Notice) => n.category !== 'testimonial'));
        setCatalog(cat);
        setNotices(nts);
        await writeJson('catalog', cat);
        await writeJson('notices', nts);
        if (res.etag) await AsyncStorage.setItem(ETAG_KEY, res.etag);
      }
      setError(null);
    } catch (e: any) {
      setError(e?.status === 0 ? 'offline' : e?.message || 'error');
    } finally {
      busy.current = false;
      setRefreshing(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [cat, nts] = await Promise.all([readJson<TestCategory[]>('catalog'), readJson<Notice[]>('notices')]);
      if (cat?.length) { setCatalog(cat); setReady(true); }
      if (nts?.length) setNotices(nts);
      refresh();
    })();
  }, [refresh]);

  const value = useMemo(() => ({ catalog, notices, ready, refreshing, error, refresh }), [catalog, notices, ready, refreshing, error, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside DataProvider');
  return v;
}

/** Every test in the catalogue with where it sits (for search, "continue", etc.). */
export function flattenTests(catalog: TestCategory[]) {
  const out: { test: any; categoryId: string; categoryName: string; examId: string; examName: string; seriesId?: string; seriesName?: string }[] = [];
  for (const c of catalog) {
    for (const sub of c.subCategories || []) {
      for (const t of sub.tests || []) out.push({ test: t, categoryId: c.id, categoryName: c.name, examId: sub.id, examName: sub.name });
      for (const ss of (sub as any).subSubCategories || []) {
        for (const t of ss.tests || []) out.push({ test: t, categoryId: c.id, categoryName: c.name, examId: sub.id, examName: sub.name, seriesId: ss.id, seriesName: ss.name });
      }
    }
  }
  return out;
}
