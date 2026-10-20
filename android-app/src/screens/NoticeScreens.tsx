import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { BookmarkPlus, BookmarkCheck, ExternalLink, Share2 } from 'lucide-react-native';
import { request, friendlyError } from '../api';
import { useData } from '../data';
import HtmlView from '../HtmlView';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useSession, useUser } from '../session';
import { useTheme } from '../theme';
import { Button, Card, Empty, ErrorBox, Field, Header, HeaderButton, ListRow, Loading, Pill, Segmented } from '../ui';
import type { Notice, TrackedJob } from '../shared/webTypes';

const CATS = [
  { key: 'all', en: 'All', hi: 'सभी' },
  { key: 'notice', en: 'Jobs', hi: 'नौकरियां' },
  { key: 'result', en: 'Results', hi: 'परिणाम' },
  { key: 'admit_card', en: 'Admit cards', hi: 'एडमिट कार्ड' },
  { key: 'answer_key', en: 'Answer keys', hi: 'उत्तर कुंजी' },
  { key: 'announcement', en: 'News', hi: 'समाचार' },
] as const;
const TONE: Record<string, any> = { notice: 'primary', result: 'success', admit_card: 'warning', answer_key: 'neutral', announcement: 'danger' };

export function NoticesScreen() {
  const t = useTheme();
  const { hi, t: tr } = useI18n();
  const nav = useNav();
  const { notices, refresh, refreshing } = useData();
  const [cat, setCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notices.filter(n => (cat === 'all' || n.category === cat) && (!q || n.title.toLowerCase().includes(q) || (n.titleHi || '').includes(search.trim())));
  }, [notices, cat, search]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={tr('Notices')} subtitle={`${list.length}`} />
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <Field value={search} onChangeText={setSearch} placeholder={tr('Search')} />
      </View>
      <Segmented options={CATS.map(c => ({ key: c.key, label: hi ? c.hi : c.en }))} value={cat} onChange={setCat} />
      <FlatList
        data={list}
        keyExtractor={n => n.id}
        initialNumToRender={15}
        refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={refresh} />}
        ListEmptyComponent={notices.length ? <Empty title={hi ? 'कोई सूचना नहीं मिली' : 'No notices found'} /> : <Loading />}
        renderItem={({ item: n }) => (
          <ListRow
            onPress={() => nav.push({ name: 'notice', notice: n })}
            title={hi && n.titleHi ? n.titleHi : n.title}
            subtitle={`${n.date}${n.lastDate ? ` · ${tr('Last date')}: ${n.lastDate}` : ''}`}
            right={<Pill text={n.type} tone={TONE[n.category] || 'neutral'} />}
          />
        )}
      />
    </View>
  );
}

export function NoticeScreen({ notice }: { notice: Notice }) {
  const t = useTheme();
  const { hi, t: tr } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { patchUser } = useSession();
  const [full, setFull] = useState<Notice | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request<{ notice: Notice }>('get-single-notice-content', { id: notice.id })
      .then(r => setFull(r.notice), e => setError(friendlyError(e)));
  }, [notice.id]);

  const n = full || notice;
  const tracked = (user.trackedJobs || []) as TrackedJob[];
  const saved = tracked.some(j => j.noticeId === n.id);
  const html = useMemo(() => (full?.contentHtml || '').replace(/<script[\s\S]*?<\/script>/gi, ''), [full]);

  const toggleSave = async () => {
    setSaving(true);
    const next: TrackedJob[] = saved
      ? tracked.filter(j => j.noticeId !== n.id)
      : [...tracked, { noticeId: n.id, title: n.title, category: n.category, date: n.date, lastDate: n.lastDate, isSaved: true, officialPortalUrl: n.url, updatedAt: new Date().toISOString() }];
    try {
      await request('update-tracked-jobs', { userId: user.id, trackedJobs: next });
      patchUser({ trackedJobs: next });
    } catch (e) { setError(friendlyError(e)); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={n.type} onBack={nav.pop}
        right={<HeaderButton label="Share" icon={<Share2 color={t.headerText} size={20} />} onPress={() => Share.share({ message: `${n.title}\nhttps://mocktesthub.vercel.app/updates/${n.id}` })} />} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
        <Card>
          <Text selectable style={{ color: t.text, fontSize: 18, fontWeight: '800', lineHeight: 25 }}>{hi && n.titleHi ? n.titleHi : n.title}</Text>
          <Text style={{ color: t.textSoft, marginTop: 6 }}>{n.date}{n.lastDate ? ` · ${tr('Last date')}: ${n.lastDate}` : ''}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            {n.url ? <Button style={{ flex: 1 }} small title={tr('Open official link')} icon={<ExternalLink size={16} color={t.primaryText} />} onPress={() => Linking.openURL(n.url!)} /> : null}
            {n.category === 'notice' ? (
              <Button style={{ flex: 1 }} small outline title={saved ? tr('Saved') : tr('Save job')} loading={saving}
                icon={saved ? <BookmarkCheck size={16} color={t.primary} /> : <BookmarkPlus size={16} color={t.primary} />} onPress={toggleSave} />
            ) : null}
          </View>
        </Card>
        {error ? <ErrorBox message={error} /> : null}
        <View style={{ marginTop: 12 }}>
          {!full && !error ? <Loading /> : html ? <Card><HtmlView html={html} /></Card> : full ? <Text style={{ color: t.textMuted, textAlign: 'center', marginTop: 20 }}>{hi ? 'पूरी जानकारी के लिए आधिकारिक लिंक देखें।' : 'See the official link for full details.'}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

export function SavedJobsScreen() {
  const t = useTheme();
  const { hi, t: tr } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { notices } = useData();
  const jobs = ((user.trackedJobs || []) as TrackedJob[]).slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={tr('Saved jobs')} onBack={nav.pop} />
      <FlatList
        data={jobs}
        keyExtractor={j => j.noticeId}
        ListEmptyComponent={<Empty title={hi ? 'कोई सेव की गई नौकरी नहीं' : 'No saved jobs yet'} text={hi ? 'किसी नौकरी की सूचना पर "नौकरी सेव करें" दबाएं।' : 'Open a job notice and press "Save job".'} />}
        renderItem={({ item: j }) => (
          <ListRow
            onPress={() => { const n = notices.find(x => x.id === j.noticeId); nav.push({ name: 'notice', notice: n || { id: j.noticeId, title: j.title, category: j.category as any, date: j.date, lastDate: j.lastDate, type: 'JOB', publishDate: '' } }); }}
            title={j.title}
            subtitle={`${j.date}${j.lastDate ? ` · ${tr('Last date')}: ${j.lastDate}` : ''}`}
            right={j.isApplied ? <Pill text={hi ? 'आवेदन किया' : 'Applied'} tone="success" /> : undefined}
          />
        )}
      />
    </View>
  );
}
