import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ExternalLink, Plus, Save, Trash2 } from 'lucide-react-native';
import { api, db } from '../api';
import { useLive } from '../live';
import { useNav } from '../nav';
import { useTheme } from '../theme';
import { Button, confirm, Empty, ErrorBox, Field, Header, HeaderButton, ListRow, Loading, OfflineBar, Pill, SectionTitle, Segmented } from '../ui';

const CATEGORIES = [
  { key: 'notice', label: 'Job notice', type: 'JOB' },
  { key: 'result', label: 'Result', type: 'RESULT' },
  { key: 'admit_card', label: 'Admit card', type: 'ADMIT CARD' },
  { key: 'answer_key', label: 'Answer key', type: 'ANSWER KEY' },
  { key: 'announcement', label: 'News', type: 'NEWS' },
] as const;
const LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.key, c.label]));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-10-20" → "20 October 2026" (the website's format) */
const longDate = (ymd: string) => {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ymd;
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function NoticesScreen() {
  const t = useTheme();
  const nav = useNav();
  const { online } = useLive();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const load = useCallback(async (more = false) => {
    if (!more) setLoading(true);
    try {
      const res = await api('notices', { search, category, offset: more ? items.length : 0, limit: 30 });
      setItems(prev => (more ? [...prev, ...res.notices] : res.notices));
      setDone(res.notices.length < 30);
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, category, items.length]);

  useEffect(() => { const h = setTimeout(() => load(), 300); return () => clearTimeout(h); }, [search, category]); // eslint-disable-line react-hooks/exhaustive-deps
  // Back from the editor: show the change
  useEffect(() => { if (nav.stack.length === 0 && !loading) load(); }, [nav.stack.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Notices" right={<HeaderButton label="New notice" icon={<Plus color={t.headerText} size={24} />} onPress={() => nav.push({ name: 'notice' })} />} />
      {!online ? <OfflineBar /> : null}
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <Field value={search} onChangeText={setSearch} placeholder="Search notices" />
      </View>
      <Segmented options={[{ key: 'all', label: 'All' }, ...CATEGORIES.map(c => ({ key: c.key, label: c.label }))] as any} value={category} onChange={setCategory} />
      {error ? <ErrorBox message={error} onRetry={() => load()} /> : null}
      {loading && items.length === 0 ? <Loading /> : (
        <FlatList
          data={items}
          keyExtractor={n => n.id}
          refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={() => { setRefreshing(true); load(); }} />}
          onEndReached={() => { if (!done && !loading) load(true); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Empty title="No notices" />}
          renderItem={({ item: n }) => (
            <ListRow
              onPress={() => nav.push({ name: 'notice', notice: n })}
              title={n.title}
              subtitle={`${n.type} · ${n.date}${n.lastDate ? ` · last date ${n.lastDate}` : ''}`}
              right={<Pill text={LABEL[n.category] || n.category} tone="primary" />}
            />
          )}
        />
      )}
    </View>
  );
}

export function NoticeEditScreen({ notice }: { notice?: any }) {
  const t = useTheme();
  const nav = useNav();
  const editing = !!notice;
  const [f, setF] = useState(() => ({
    title: notice?.title || '', titleHi: notice?.titleHi || '', category: notice?.category || 'notice', type: notice?.type || 'JOB',
    publishDate: notice?.publishDate || today(), lastDate: notice?.lastDate || '', url: notice?.url || '', imageUrl: notice?.imageUrl || '',
  }));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));

  const save = async () => {
    if (!f.title.trim()) { setError('Title is required'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.publishDate)) { setError('Publish date must be YYYY-MM-DD'); return; }
    setBusy('save'); setError('');
    const payload = {
      title: f.title.trim(), titleHi: f.titleHi.trim() || null, category: f.category, type: f.type.trim().toUpperCase() || 'JOB',
      publishDate: f.publishDate, date: longDate(f.publishDate), lastDate: f.lastDate.trim() || null,
      url: f.url.trim() || null, imageUrl: f.imageUrl.trim() || null,
    };
    try {
      if (editing) await db('edit-notice', { id: notice.id, ...payload });
      else await db('add-notice', { id: `nt_${Math.random().toString(36).slice(2, 9)}`, ...payload });
      nav.pop();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(''); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={editing ? 'Edit notice' : 'New notice'} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {error ? <ErrorBox message={error} /> : null}
        <Field label="Title (English)" value={f.title} onChangeText={set('title')} multiline placeholder="e.g. SSC CGL 2026 Notification Out" />
        <Field label="Title (Hindi, optional)" value={f.titleHi} onChangeText={set('titleHi')} multiline />
        <Text style={{ color: t.textSoft, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {CATEGORIES.map(c => {
            const on = f.category === c.key;
            return (
              <Pressable key={c.key} onPress={() => setF(s => ({ ...s, category: c.key, type: editing && s.category === c.key ? s.type : c.type }))}
                style={{ paddingHorizontal: 12, height: 34, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? t.primary : t.card, borderWidth: 1, borderColor: on ? t.primary : t.border }}>
                <Text style={{ color: on ? t.primaryText : t.text, fontWeight: '700', fontSize: 13 }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Field label="Label shown on the notice" value={f.type} onChangeText={set('type')} autoCapitalize="characters" placeholder="JOB, RESULT, ADMIT CARD…" />
        <Field label="Publish date (YYYY-MM-DD)" value={f.publishDate} onChangeText={set('publishDate')} keyboardType="numbers-and-punctuation" />
        <Field label="Last date (optional)" value={f.lastDate} onChangeText={set('lastDate')} placeholder="e.g. 15 November 2026" />
        <Field label="Official link" value={f.url} onChangeText={set('url')} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        <Field label="Image link (optional)" value={f.imageUrl} onChangeText={set('imageUrl')} autoCapitalize="none" keyboardType="url" />
        {f.url ? <Pressable onPress={() => Linking.openURL(f.url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}><ExternalLink size={14} color={t.primary} /><Text style={{ color: t.primary, fontWeight: '600' }}>Check the link</Text></Pressable> : null}
        <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 12 }}>Full notice details (the long description) are edited on the website.</Text>
        <Button title={editing ? 'Save changes' : 'Publish notice'} loading={busy === 'save'} icon={<Save size={18} color={t.primaryText} />} onPress={save} />
        {editing ? (
          <>
            <SectionTitle>Danger zone</SectionTitle>
            <Button outline tone="danger" title="Delete notice" loading={busy === 'delete'} icon={<Trash2 size={18} color={t.danger} />}
              onPress={() => confirm('Delete notice?', 'It disappears from the website and apps.', 'Delete', async () => {
                setBusy('delete');
                try { await db('delete-notice', { id: notice.id }); nav.pop(); } catch (e: any) { setError(e.message); } finally { setBusy(''); }
              })} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
