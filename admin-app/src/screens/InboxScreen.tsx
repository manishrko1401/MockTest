import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { AlertTriangle, Bell, Flag, Lightbulb, Mail, MessageCircle, Star } from 'lucide-react-native';
import { api } from '../api';
import { useLive, useLiveReload } from '../live';
import { InboxSection, useNav } from '../nav';
import { useTheme } from '../theme';
import { Avatar, Badge, Empty, ErrorBox, Field, Header, HeaderButton, ListRow, Loading, OfflineBar, Pill, Segmented, stripHtml, timeAgo } from '../ui';
import { Can } from '../session';

const PAGE = 30;

/** Paginated list that reloads when something new arrives. */
function usePaged<T>(action: string, params: object, key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const extra = useRef<any>(null);

  const load = useCallback(async (mode: 'reset' | 'more' | 'quiet') => {
    if (mode === 'reset') setLoading(true);
    try {
      const offset = mode === 'more' ? items.length : 0;
      const limit = mode === 'quiet' ? Math.max(PAGE, items.length) : PAGE;
      const res = await api<any>(action, { ...paramsRef.current, limit: Math.min(limit, 100), offset });
      const list: T[] = res[key] || [];
      extra.current = res;
      setItems(prev => (mode === 'more' ? [...prev, ...list] : list));
      setDone(list.length < (mode === 'quiet' ? Math.min(limit, 100) : PAGE));
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [action, key, items.length]);

  return { items, setItems, loading, refreshing, setRefreshing, error, done, load, extra };
}

export default function InboxScreen({ can }: { can: Can }) {
  const t = useTheme();
  const nav = useNav();
  const { counts, online } = useLive();
  const sections = useMemo(() => {
    const list: { key: InboxSection; label: string; count?: number }[] = [];
    if (can.support) list.push({ key: 'chats', label: 'Chats', count: counts?.supportThreads });
    if (can.reports) list.push({ key: 'reports', label: 'Reported', count: counts?.reports });
    if (can.inquiries) list.push({ key: 'inquiries', label: 'Inquiries', count: counts?.inquiries });
    if (can.suggestions) list.push({ key: 'suggestions', label: 'Suggestions', count: counts?.suggestions });
    if (can.feedback) list.push({ key: 'feedback', label: 'Feedback' });
    return list;
  }, [can, counts]);
  const section = sections.some(s => s.key === nav.inboxSection) ? nav.inboxSection : sections[0]?.key;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header large title="Inbox" subtitle={counts ? `${counts.supportUnread} unread chat messages` : undefined}
        right={<HeaderButton label="Settings" icon={<Bell color={t.headerText} size={20} />} onPress={() => nav.push({ name: 'settings' })} />} />
      {!online ? <OfflineBar /> : null}
      <Segmented options={sections} value={section as InboxSection} onChange={nav.setInboxSection} />
      <View style={{ flex: 1 }}>
        {section === 'chats' ? <Chats /> : null}
        {section === 'reports' ? <Reports /> : null}
        {section === 'inquiries' ? <Inquiries /> : null}
        {section === 'suggestions' ? <Suggestions /> : null}
        {section === 'feedback' ? <Feedback /> : null}
      </View>
    </View>
  );
}

function PagedList<T>({ paged, render, empty, header }: { paged: ReturnType<typeof usePaged<T>>; render: (item: T) => React.ReactElement; empty: React.ReactElement; header?: React.ReactElement }) {
  const t = useTheme();
  if (paged.loading && paged.items.length === 0) return <Loading />;
  return (
    <FlatList
      data={paged.items}
      keyExtractor={(it: any) => it.id || it.userId}
      renderItem={({ item }) => render(item)}
      ListHeaderComponent={<>{paged.error ? <ErrorBox message={paged.error} onRetry={() => paged.load('reset')} /> : null}{header}</>}
      ListEmptyComponent={paged.error ? null : empty}
      refreshControl={<RefreshControl refreshing={paged.refreshing} colors={[t.primary]} onRefresh={() => { paged.setRefreshing(true); paged.load('reset'); }} />}
      onEndReached={() => { if (!paged.done && !paged.loading) paged.load('more'); }}
      onEndReachedThreshold={0.4}
    />
  );
}

function Chats() {
  const t = useTheme();
  const nav = useNav();
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const paged = usePaged<any>('support-threads', { search, unreadOnly }, 'threads');
  useLiveReload(() => paged.load('quiet'));
  useEffect(() => { const h = setTimeout(() => paged.load('reset'), 300); return () => clearTimeout(h); }, [search, unreadOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <PagedList
      paged={paged}
      header={
        <View style={{ paddingHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}><Field value={search} onChangeText={setSearch} placeholder="Search name, email or code" /></View>
            <Pressable onPress={() => setUnreadOnly(u => !u)} style={{ marginBottom: 12, height: 46, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', backgroundColor: unreadOnly ? t.primary : t.card, borderWidth: 1, borderColor: unreadOnly ? t.primary : t.border }}>
              <Text style={{ color: unreadOnly ? t.primaryText : t.text, fontWeight: '700', fontSize: 13 }}>Unread</Text>
            </Pressable>
          </View>
        </View>
      }
      empty={<Empty title={unreadOnly ? 'All caught up' : 'No chats yet'} text={unreadOnly ? 'No unread support messages.' : undefined} icon={<MessageCircle size={40} color={t.textMuted} />} />}
      render={(c: any) => (
        <ListRow
          unread={c.unread > 0}
          onPress={() => nav.push({ name: 'chat', userId: c.userId, title: c.name })}
          left={<Avatar name={c.name} />}
          title={`${c.name || 'Student'}${c.candidateCode ? ` · ${c.candidateCode}` : ''}`}
          subtitle={`${c.lastFromAdmin ? 'You: ' : ''}${c.lastMessage}`}
          meta={timeAgo(c.lastAt)}
          right={<Badge count={c.unread} />}
        />
      )}
    />
  );
}

function Reports() {
  const t = useTheme();
  const nav = useNav();
  const paged = usePaged<any>('reports', {}, 'reports');
  useLiveReload(() => paged.load(paged.items.length ? 'quiet' : 'reset'));
  return (
    <PagedList
      paged={paged}
      empty={<Empty title="No reported questions" text="Reports from students appear here instantly." icon={<Flag size={40} color={t.textMuted} />} />}
      render={(r: any) => (
        <ListRow
          onPress={() => nav.push({ name: 'report', report: r })}
          left={<View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.dangerSoft, alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={20} color={t.danger} /></View>}
          title={r.testTitle || 'Reported question'}
          subtitle={`${r.userName || 'Visitor'}: ${r.message}\n${stripHtml(r.questionText).slice(0, 90)}`}
          meta={timeAgo(r.createdAt)}
        />
      )}
    />
  );
}

const INQUIRY_FILTERS = [{ key: 'PENDING', label: 'Pending' }, { key: 'REPLIED', label: 'Replied' }, { key: 'RESOLVED', label: 'Resolved' }, { key: 'ALL', label: 'All' }] as const;
function Inquiries() {
  const t = useTheme();
  const nav = useNav();
  const [status, setStatus] = useState<string>('PENDING');
  const paged = usePaged<any>('inquiries', { status }, 'inquiries');
  useLiveReload(() => paged.load(paged.items.length ? 'quiet' : 'reset'));
  useEffect(() => { paged.load('reset'); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <PagedList
      paged={paged}
      header={<Segmented options={INQUIRY_FILTERS as any} value={status} onChange={setStatus} />}
      empty={<Empty title="No inquiries" icon={<Mail size={40} color={t.textMuted} />} />}
      render={(i: any) => (
        <ListRow
          unread={i.status === 'PENDING'}
          onPress={() => nav.push({ name: 'inquiry', item: i })}
          left={<Avatar name={i.name} />}
          title={`${i.name} · ${i.subject}`}
          subtitle={i.message}
          meta={timeAgo(i.createdAt)}
        />
      )}
    />
  );
}

const SUGGESTION_FILTERS = [{ key: 'PENDING', label: 'Pending' }, { key: 'REVIEWED', label: 'Reviewed' }, { key: 'RESOLVED', label: 'Resolved' }, { key: 'ALL', label: 'All' }] as const;
function Suggestions() {
  const t = useTheme();
  const nav = useNav();
  const [status, setStatus] = useState<string>('PENDING');
  const paged = usePaged<any>('suggestions', { status }, 'suggestions');
  useLiveReload(() => paged.load(paged.items.length ? 'quiet' : 'reset'));
  useEffect(() => { paged.load('reset'); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <PagedList
      paged={paged}
      header={<Segmented options={SUGGESTION_FILTERS as any} value={status} onChange={setStatus} />}
      empty={<Empty title="No suggestions" icon={<Lightbulb size={40} color={t.textMuted} />} />}
      render={(s: any) => (
        <ListRow
          unread={s.status === 'PENDING'}
          onPress={() => nav.push({ name: 'suggestion', item: s })}
          left={<View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.warningSoft, alignItems: 'center', justifyContent: 'center' }}><Lightbulb size={20} color={t.warning} /></View>}
          title={`${s.name || 'Visitor'} · ${s.category}`}
          subtitle={s.message}
          meta={timeAgo(s.createdAt)}
        />
      )}
    />
  );
}

function Feedback() {
  const t = useTheme();
  const nav = useNav();
  const [low, setLow] = useState(false);
  const paged = usePaged<any>('feedback', { maxRating: low ? 3 : 5 }, 'feedback');
  useLiveReload(() => paged.load(paged.items.length ? 'quiet' : 'reset'));
  useEffect(() => { paged.load('reset'); }, [low]); // eslint-disable-line react-hooks/exhaustive-deps
  const avg = paged.extra.current?.average;
  return (
    <PagedList
      paged={paged}
      header={
        <View style={{ paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {avg ? <Text style={{ color: t.textSoft, flex: 1 }}>Average: platform <Text style={{ fontWeight: '800', color: t.text }}>{avg.platform ?? '—'}</Text>, exams <Text style={{ fontWeight: '800', color: t.text }}>{avg.exam ?? '—'}</Text> ({avg.total})</Text> : <View style={{ flex: 1 }} />}
          <Pressable onPress={() => setLow(l => !l)} style={{ paddingHorizontal: 12, height: 34, borderRadius: 999, justifyContent: 'center', backgroundColor: low ? t.danger : t.card, borderWidth: 1, borderColor: low ? t.danger : t.border }}>
            <Text style={{ color: low ? '#fff' : t.text, fontWeight: '700', fontSize: 12 }}>Low ratings</Text>
          </Pressable>
        </View>
      }
      empty={<Empty title="No feedback" icon={<Star size={40} color={t.textMuted} />} />}
      render={(f: any) => (
        <ListRow
          onPress={() => nav.push({ name: 'feedbackItem', item: f })}
          left={<Avatar name={f.name} />}
          title={f.name || 'Student'}
          subtitle={`${'★'.repeat(f.platformRating)}${'☆'.repeat(5 - f.platformRating)}  ${f.text || f.testTitle}`}
          meta={timeAgo(f.createdAt)}
          right={f.platformRating <= 2 ? <Pill text="Low" tone="danger" /> : undefined}
        />
      )}
    />
  );
}
