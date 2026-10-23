import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react-native';
import { api, db } from '../api';
import { useNav } from '../nav';
import { useTheme } from '../theme';
import { Button, Card, Empty, ErrorBox, Header, KeyValue, ListRow, listPerf, Loading, Pill, SearchBar, SectionTitle, Segmented, dateTime, timeAgo } from '../ui';

// -----------------------------------------------------------------------------
// Activity: every student's mock and typing attempts (newest first, searchable), the
// integrity review of suspicious mock attempts, and which platforms students use.
// -----------------------------------------------------------------------------

const mins = (s?: number | null) => (s ? (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`) : '—');
const round = (n?: number | null, d = 1) => (n === null || n === undefined ? '—' : String(Math.round(n * 10 ** d) / 10 ** d));

/** A searchable, page-by-page list (30 at a time, more when scrolled to the end). */
function usePagedList<T>(action: string, extra: Record<string, unknown> = {}) {
  const [items, setItems] = useState<T[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const loadingMore = useRef(false);
  const key = JSON.stringify(extra);

  const load = useCallback(async (more = false) => {
    if (more && loadingMore.current) return;
    loadingMore.current = more;
    try {
      const r = await api(action, { ...extra, search: search.trim(), offset: more ? (items?.length || 0) : 0, limit: 30 });
      setItems(prev => (more && prev ? [...prev, ...r.attempts] : r.attempts));
      setHasMore(!!r.hasMore);
      setError('');
    } catch (e: any) { setError(e.message); setItems(i => i || []); }
    finally { loadingMore.current = false; }
  }, [action, search, items?.length, key]); // eslint-disable-line react-hooks/exhaustive-deps

  // a new search waits until typing stops
  useEffect(() => { const t = setTimeout(() => load(false), 350); return () => clearTimeout(t); }, [search, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = async () => { setRefreshing(true); await load(false); setRefreshing(false); };
  return { items, hasMore, search, setSearch, error, refreshing, refresh, loadMore: () => hasMore && load(true) };
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <View style={{ padding: 12, paddingBottom: 6 }}><SearchBar value={value} onChangeText={onChange} placeholder={placeholder} /></View>;
}

// ---- Mock test attempts ----------------------------------------------------------------------------

export function MockAttemptsScreen() {
  const t = useTheme();
  const nav = useNav();
  const list = usePagedList<any>('mock-attempts');
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Mock test attempts" subtitle="All students, newest first" onBack={nav.pop} />
      <SearchBox value={list.search} onChange={list.setSearch} placeholder="Student name, email, code or test" />
      {list.error ? <ErrorBox message={list.error} onRetry={list.refresh} /> : null}
      <FlatList
        {...listPerf}
        data={list.items || []}
        keyExtractor={a => a.id}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} colors={[t.primary]} />}
        ListEmptyComponent={list.items === null ? <Loading /> : <Empty title="No attempts found" />}
        renderItem={({ item: a }) => (
          <ListRow
            onPress={() => nav.push({ name: 'user', id: a.userId })}
            title={a.name || 'Student'}
            subtitle={`${a.testTitle || 'Test'}\n${round(a.score)}${a.maxScore ? ` / ${round(a.maxScore)}` : ''} marks · ${round(a.accuracy)}% · ${mins(a.timeSpentSeconds)} · ${a.source || 'web'}`}
            meta={timeAgo(a.completedAt || a.startedAt)}
            right={a.flag ? <Pill text={a.flag === 'flagged' ? 'Flagged' : 'Watch'} tone={a.flag === 'flagged' ? 'danger' : 'warning'} /> : a.status === 'AUTO_SUBMITTED' ? <Pill text="Auto" /> : undefined}
          />
        )}
      />
    </View>
  );
}

// ---- Typing test attempts --------------------------------------------------------------------------

export function TypingAttemptsScreen() {
  const t = useTheme();
  const nav = useNav();
  const list = usePagedList<any>('typing-attempts');
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Typing test attempts" subtitle="All students, newest first" onBack={nav.pop} />
      <SearchBox value={list.search} onChange={list.setSearch} placeholder="Student name or test" />
      {list.error ? <ErrorBox message={list.error} onRetry={list.refresh} /> : null}
      <FlatList
        {...listPerf}
        data={list.items || []}
        keyExtractor={a => a.id}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} colors={[t.primary]} />}
        ListEmptyComponent={list.items === null ? <Loading /> : <Empty title="No attempts found" />}
        renderItem={({ item: a }) => (
          <ListRow
            onPress={() => nav.push({ name: 'typingAttempt', id: a.id })}
            title={a.name || 'Student'}
            subtitle={`${a.testTitle || 'Typing test'}\n${round(a.netWpm)} WPM net · ${round(a.accuracyPercentage)}% · ${a.totalMistakes} mistakes · ${a.language === 'hi' ? 'Hindi' : 'English'}`}
            meta={timeAgo(a.completedAt)}
            right={<Pill text={a.isQualified ? 'Qualified' : 'Not qualified'} tone={a.isQualified ? 'success' : 'danger'} />}
          />
        )}
      />
    </View>
  );
}

export function TypingAttemptScreen({ id }: { id: string }) {
  const t = useTheme();
  const nav = useNav();
  const [a, setA] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { api('typing-attempt', { id }).then(r => setA(r.attempt), e => setError(e.message)); }, [id]);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={a?.testTitle || 'Typing attempt'} subtitle={a ? a.userName : undefined} onBack={nav.pop} />
      {error ? <ErrorBox message={error} /> : !a ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
          <Card style={{ alignItems: 'center' }}>
            {a.isQualified ? <CheckCircle2 size={34} color={t.success} /> : <XCircle size={34} color={t.danger} />}
            <Text style={{ color: a.isQualified ? t.success : t.danger, fontSize: 18, fontWeight: '900', marginTop: 4 }}>{a.isQualified ? 'Qualified' : 'Not qualified'}</Text>
            <View style={{ flexDirection: 'row', alignSelf: 'stretch', marginTop: 12 }}>
              {[[round(a.netWpm), 'Net WPM'], [round(a.grossWpm), 'Gross WPM'], [`${round(a.accuracyPercentage)}%`, 'Accuracy']].map(([v, l]) => (
                <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: t.text, fontSize: 20, fontWeight: '900' }}>{v}</Text>
                  <Text style={{ color: t.textSoft, fontSize: 12 }}>{l}</Text>
                </View>
              ))}
            </View>
          </Card>
          <SectionTitle>Details</SectionTitle>
          <Card>
            <KeyValue label="Student" value={a.userName} />
            <KeyValue label="Finished" value={dateTime(a.completedAt)} />
            <KeyValue label="Language" value={a.language === 'hi' ? 'Hindi' : 'English'} />
            <KeyValue label="Time" value={`${mins(a.timeSpentSeconds)} of ${mins(a.allocatedTimeSeconds)}`} />
            <KeyValue label="Full / half mistakes" value={`${a.fullMistakes} / ${a.halfMistakes}`} />
            <KeyValue label="Error %" value={`${round(a.errorPercentage, 2)}%`} />
            <KeyValue label="Keystrokes" value={`${a.totalKeystrokes} (${a.errorKeystrokes} wrong)`} />
            <KeyValue label="Backspace" value={a.backspaceCount} />
          </Card>
          {a.detailedMistakes?.length ? (
            <>
              <SectionTitle>Mistakes ({a.detailedMistakes.length})</SectionTitle>
              <Card>
                {a.detailedMistakes.slice(0, 80).map((m: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
                    <Text style={{ flex: 1, color: t.success }} numberOfLines={1}>{m.originalWord || '—'}</Text>
                    <Text style={{ flex: 1, color: t.danger }} numberOfLines={1}>{m.typedWord || '(missed)'}</Text>
                    <Text style={{ color: t.textMuted, fontSize: 12 }}>{m.type === 'HALF_MISTAKE' ? 'Half' : m.type === 'OMISSION' ? 'Missed' : m.type === 'EXTRA' ? 'Extra' : 'Full'}</Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
          <SectionTitle>What the student typed</SectionTitle>
          <Card><Text selectable style={{ color: t.text, lineHeight: 22 }}>{a.typedText || '—'}</Text></Card>
        </ScrollView>
      )}
    </View>
  );
}

// ---- Integrity review ------------------------------------------------------------------------------

const REASON: Record<string, string> = {
  fast_correct: 'Too fast to read', faster_than_others: 'Much faster than others', high_score_little_time: 'High score, little time',
  answer_bursts: 'Answer bursts', clock_mismatch: 'Clock mismatch', left_exam: 'Left the exam',
};

export function IntegrityScreen() {
  const t = useTheme();
  const nav = useNav();
  const [status, setStatus] = useState<'open' | 'cleared' | 'cheated'>('open');
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(() => {
    db('integrity-list', { status }).then(r => { setItems(r.items || []); setError(''); }, e => { setError(e.message); setItems([]); });
  }, [status]);
  useEffect(() => { setItems(null); load(); }, [load]);
  const review = async (sessionId: string, next: 'cleared' | 'cheated' | 'open') => {
    setBusy(sessionId + next);
    try { await db('integrity-review', { sessionId, status: next }); load(); } catch (e: any) { setError(e.message); } finally { setBusy(''); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Integrity review" subtitle="Suspicious mock attempts" onBack={nav.pop} />
      <Segmented options={[{ key: 'open', label: 'To review' }, { key: 'cleared', label: 'Fair' }, { key: 'cheated', label: 'Cheated' }]} value={status} onChange={setStatus} />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      <FlatList
        data={items || []}
        keyExtractor={i => i.sessionId}
        contentContainerStyle={{ padding: 12, paddingBottom: 30, gap: 10 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} colors={[t.primary]} />}
        ListEmptyComponent={items === null ? <Loading /> : <Empty title={status === 'open' ? 'Nothing to review' : 'None here'} text={status === 'open' ? 'Suspicious attempts show up here after they are submitted.' : undefined} />}
        renderItem={({ item: i }) => (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={18} color={i.level === 'flagged' ? t.danger : t.warning} />
              <Text style={{ flex: 1, color: t.text, fontWeight: '800' }} numberOfLines={1}>{i.fullName || 'Student'}</Text>
              <Pill text={`${i.score} · ${i.level === 'flagged' ? 'Flagged' : 'Watch'}`} tone={i.level === 'flagged' ? 'danger' : 'warning'} />
            </View>
            <Text style={{ color: t.textSoft, marginTop: 4 }} numberOfLines={2}>{i.testTitle || i.testId}</Text>
            <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>{dateTime(i.createdAt)}{i.retake ? ' · retake' : ''}</Text>
            <View style={{ marginTop: 8, gap: 4 }}>
              {(i.reasons || []).map((r: any) => (
                <Text key={r.code} style={{ color: t.text, fontSize: 13 }}>• <Text style={{ fontWeight: '700' }}>{REASON[r.code] || r.code}</Text> (+{r.points}): {r.detail}</Text>
              ))}
            </View>
            {i.note ? <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 6 }}>Note: {i.note}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {status !== 'cleared' ? <Button small outline tone="success" title="Fair" loading={busy === i.sessionId + 'cleared'} onPress={() => review(i.sessionId, 'cleared')} style={{ flex: 1 }} /> : null}
              {status !== 'cheated' ? <Button small outline tone="danger" title="Cheated" loading={busy === i.sessionId + 'cheated'} onPress={() => review(i.sessionId, 'cheated')} style={{ flex: 1 }} /> : null}
              {status !== 'open' ? <Button small outline title="Reopen" loading={busy === i.sessionId + 'open'} onPress={() => review(i.sessionId, 'open')} style={{ flex: 1 }} /> : null}
              <Button small outline title="Student" onPress={() => nav.push({ name: 'user', id: i.userId })} style={{ flex: 1 }} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}

// ---- Platforms ------------------------------------------------------------------------------------------

const PLATFORM: Record<string, string> = { web_desktop: 'Website (computer)', web_mobile: 'Website (phone)', windows: 'Windows app', android: 'Android app' };

export function PlatformsScreen() {
  const t = useTheme();
  const nav = useNav();
  const [s, setS] = useState<any>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { db('platform-stats').then(r => { setS(r); setError(''); }, e => setError(e.message)); }, []);
  useEffect(load, [load]);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Platforms" subtitle="Website, Windows app, Android app" onBack={nav.pop} />
      {error ? <ErrorBox message={error} onRetry={load} /> : !s ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} colors={[t.primary]} />}>
          {Object.keys(PLATFORM).map(k => {
            const c = s.perPlatform?.[k] || {};
            return (
              <Card key={k} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ flex: 1, color: t.text, fontWeight: '800' }}>{PLATFORM[k]}</Text>
                  {s.online?.[k] ? <Pill text={`${s.online[k]} online`} tone="success" /> : null}
                </View>
                <Text style={{ color: t.text, fontSize: 24, fontWeight: '900', marginTop: 4 }}>{c.users || 0} <Text style={{ color: t.textSoft, fontSize: 13, fontWeight: '600' }}>students</Text></Text>
                <Text style={{ color: t.textSoft, fontSize: 13, marginTop: 2 }}>Today {c.day || 0} · 7 days {c.week || 0} · 30 days {c.month || 0}</Text>
              </Card>
            );
          })}
          <SectionTitle>App versions</SectionTitle>
          <Card>
            {(s.versions || []).length === 0 ? <Text style={{ color: t.textMuted }}>No app users yet.</Text> : (s.versions || []).map((v: any, i: number) => (
              <KeyValue key={i} label={`${v.platform === 'android' ? 'Android' : 'Windows'} ${v.version ? 'v' + v.version : '(not reported)'}${v.version && v.version === s.latestVersion?.[v.platform] ? ' · latest' : ''}`} value={`${v.users} (${v.active} active)`} />
            ))}
          </Card>
          <SectionTitle>How students combine them</SectionTitle>
          <Card>
            <KeyValue label="More than one platform" value={s.mix?.several ?? 0} />
            <KeyValue label="An app and the website" value={s.mix?.app_and_web ?? 0} />
            <KeyValue label="Only one platform" value={s.mix?.one ?? 0} />
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

