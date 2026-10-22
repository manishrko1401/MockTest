import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { Award, BookmarkPlus, BookmarkCheck, BriefcaseBusiness, CalendarClock, CheckCircle2, Circle, ExternalLink, FileKey2, Megaphone, Share2, Ticket } from 'lucide-react-native';
import { request, friendlyError } from '../api';
import { useData } from '../data';
import HtmlView from '../HtmlView';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useSession, useUser } from '../session';
import { useTheme } from '../theme';
import { Button, Card, Empty, ErrorBox, Header, HeaderButton, IconTile, ListRow, Loading, Pill, SearchBar, Segmented, Skeleton } from '../ui';
import type { Notice, TrackedJob } from '../shared/webTypes';

const CATS = [
  { key: 'all', en: 'All', hi: 'सभी' },
  { key: 'notice', en: 'Jobs', hi: 'नौकरियां' },
  { key: 'result', en: 'Results', hi: 'परिणाम' },
  { key: 'admit_card', en: 'Admit cards', hi: 'एडमिट कार्ड' },
  { key: 'answer_key', en: 'Answer keys', hi: 'उत्तर कुंजी' },
  { key: 'announcement', en: 'News', hi: 'समाचार' },
] as const;
const TONE: Record<string, any> = { notice: 'primary', result: 'success', admit_card: 'warning', answer_key: 'violet', announcement: 'danger' };
const ICON: Record<string, any> = { notice: BriefcaseBusiness, result: Award, admit_card: Ticket, answer_key: FileKey2, announcement: Megaphone };

export function NoticesScreen({ initialCategory }: { initialCategory?: string }) {
  const t = useTheme();
  const { hi, t: tr } = useI18n();
  const nav = useNav();
  const { notices, refresh, refreshing } = useData();
  const [cat, setCat] = useState<string>(initialCategory || 'all');
  const [search, setSearch] = useState('');
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notices.filter(n => (cat === 'all' || n.category === cat) && (!q || n.title.toLowerCase().includes(q) || (n.titleHi || '').includes(search.trim())));
  }, [notices, cat, search]);
  const color = (c: string) => ({ primary: t.primary, success: t.success, warning: t.accent, violet: t.violet, danger: t.danger } as any)[TONE[c] || 'primary'] || t.primary;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={tr('Notices')} subtitle={hi ? `${list.length} सूचनाएं` : `${list.length} notices`} onBack={nav.pop} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={hi ? 'नौकरी, परिणाम, एडमिट कार्ड खोजें' : 'Search jobs, results, admit cards'} />
      </View>
      <Segmented options={CATS.map(c => ({ key: c.key, label: hi ? c.hi : c.en }))} value={cat} onChange={setCat} />
      <FlatList
        data={list}
        keyExtractor={n => n.id}
        initialNumToRender={12}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={refresh} />}
        ListEmptyComponent={notices.length ? <Empty title={hi ? 'कोई सूचना नहीं मिली' : 'No notices found'} /> : <View style={{ padding: 16 }}><Skeleton rows={5} height={76} /></View>}
        renderItem={({ item: n }) => (
          <Card onPress={() => nav.push({ name: 'notice', notice: n })} style={{ marginHorizontal: 16, marginTop: 10, flexDirection: 'row', gap: 12, padding: 14 }}>
            <IconTile icon={ICON[n.category] || BriefcaseBusiness} color={color(n.category)} size={42} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={3} style={{ color: t.text, fontWeight: '800', lineHeight: 20 }}>{hi && n.titleHi ? n.titleHi : n.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <Pill text={n.type} tone={TONE[n.category] || 'neutral'} />
                <Text style={{ color: t.textSoft, fontSize: 12 }}>{n.date}</Text>
                {n.lastDate ? <Text style={{ color: t.danger, fontSize: 12, fontWeight: '700' }}>{tr('Last date')}: {n.lastDate}</Text> : null}
              </View>
            </View>
          </Card>
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
  const [saving, setSaving] = useState<'' | 'save' | 'apply'>('');

  useEffect(() => {
    request<{ notice: Notice }>('get-single-notice-content', { id: notice.id })
      .then(r => setFull(r.notice), e => setError(friendlyError(e)));
  }, [notice.id]);

  const n = full || notice;
  const tracked = (user.trackedJobs || []) as TrackedJob[];
  const entry = tracked.find(j => j.noticeId === n.id);
  const saved = !!entry && entry.isSaved !== false;
  const applied = !!entry?.isApplied;
  const html = useMemo(() => (full?.contentHtml || '').replace(/<script[\s\S]*?<\/script>/gi, ''), [full]);

  // Saved and applied are kept in the same list as the website's "Applied & Saved Exams"
  // (other details the student added there, like the application number, stay as they are).
  // The entry goes only when it's neither saved nor applied.
  const updateEntry = async (key: 'save' | 'apply', isSaved: boolean, isApplied: boolean) => {
    setSaving(key); setError('');
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; // the phone's own date
    const rest = tracked.filter(j => j.noticeId !== n.id);
    const next: TrackedJob[] = !isSaved && !isApplied ? rest : [...rest, {
      ...(entry || {}),
      noticeId: n.id, title: n.title, category: n.category, date: n.date, lastDate: n.lastDate, officialPortalUrl: n.url,
      isSaved, isApplied,
      appliedDate: isApplied ? (entry?.appliedDate || today) : '',
      updatedAt: new Date().toISOString(),
    } as TrackedJob];
    try {
      await request('update-tracked-jobs', { userId: user.id, trackedJobs: next });
      patchUser({ trackedJobs: next });
    } catch (e) { setError(friendlyError(e)); }
    finally { setSaving(''); }
  };
  const share = () => Share.share({
    message: `${hi && n.titleHi ? n.titleHi : n.title}${n.lastDate ? `\n${tr('Last date')}: ${n.lastDate}` : ''}\nhttps://mocktesthub.vercel.app/updates/${n.id}`,
  }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={hi ? 'सूचना' : 'Notice'} onBack={nav.pop}
        right={<HeaderButton label={hi ? 'शेयर करें' : 'Share'} icon={<Share2 color={t.headerText} size={20} />} onPress={share} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <Card>
          <Pill text={n.type} tone={TONE[n.category] || 'neutral'} />
          <Text selectable style={{ color: t.text, fontSize: 19, fontWeight: '900', lineHeight: 26, marginTop: 10 }}>{hi && n.titleHi ? n.titleHi : n.title}</Text>
          <Text style={{ color: t.textSoft, marginTop: 6 }}>{hi ? 'प्रकाशित' : 'Published'} {n.date}</Text>
          {n.lastDate ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: t.dangerSoft, borderRadius: 10, padding: 10 }}>
              <CalendarClock size={18} color={t.danger} />
              <Text style={{ color: t.danger, fontWeight: '800' }}>{tr('Last date')}: {n.lastDate}</Text>
            </View>
          ) : null}
          {n.url ? <Button style={{ marginTop: 14 }} title={tr('Open official link')} icon={<ExternalLink size={17} color={t.primaryText} />} onPress={() => Linking.openURL(n.url!)} /> : null}
          <Button style={{ marginTop: n.url ? 8 : 14 }} outline tone={applied ? 'success' : 'primary'}
            title={applied ? (hi ? 'आवेदन किया ✓' : 'Applied ✓') : (hi ? 'आवेदन किया चिह्नित करें' : 'Mark as applied')} loading={saving === 'apply'}
            icon={applied ? <CheckCircle2 size={17} color={t.success} /> : <Circle size={17} color={t.primary} />}
            onPress={() => updateEntry('apply', saved, !applied)} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button style={{ flex: 1 }} small outline title={saved ? (hi ? 'सेव किया' : 'Saved') : (hi ? 'सेव करें' : 'Save')} loading={saving === 'save'}
              icon={saved ? <BookmarkCheck size={16} color={t.primary} /> : <BookmarkPlus size={16} color={t.primary} />}
              onPress={() => updateEntry('save', !saved, applied)} />
            <Button style={{ flex: 1 }} small outline title={hi ? 'शेयर करें' : 'Share'} icon={<Share2 size={16} color={t.primary} />} onPress={share} />
          </View>
          {applied && entry?.appliedDate ? (
            <Text style={{ color: t.success, fontSize: 12.5, marginTop: 8 }}>{hi ? 'आवेदन तिथि' : 'Applied on'}: {entry.appliedDate}</Text>
          ) : null}
        </Card>
        {error ? <ErrorBox message={error} /> : null}
        <View style={{ marginTop: 12 }}>
          {!full && !error ? <Skeleton rows={3} height={120} /> : html ? <Card><HtmlView html={html} /></Card> : full ? <Text style={{ color: t.textMuted, textAlign: 'center', marginTop: 20 }}>{hi ? 'पूरी जानकारी के लिए आधिकारिक लिंक देखें।' : 'See the official link for full details.'}</Text> : null}
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
