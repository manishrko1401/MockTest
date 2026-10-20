import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Award, Bookmark, BriefcaseBusiness, CalendarCheck, ChevronRight, FileText, Headphones, Keyboard, Lock, PlayCircle, Trophy, WifiOff } from 'lucide-react-native';
import { useData, flattenTests } from '../data';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useSession, useUser } from '../session';
import { useTheme } from '../theme';
import { Card, SectionTitle } from '../ui';

export default function HomeScreen() {
  const t = useTheme();
  const { t: tr, hi } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { refreshUser } = useSession();
  const { notices, catalog, refresh, error } = useData();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const titles = useMemo(() => new Map(flattenTests(catalog).map(x => [x.test.id, x.test.title])), [catalog]);
  const sessions = user.testSessions || [];
  const ongoing = sessions.filter(s => s.status === 'ONGOING').slice(0, 2);
  const recent = sessions.filter(s => s.status !== 'ONGOING').sort((a, b) => (b.completedAt || b.date || '').localeCompare(a.completedAt || a.date || '')).slice(0, 3);
  const isPro = user.subscriptionTier === 'Testbook Pass Pro';
  const firstName = (user.name || '').split(' ')[0];

  const actions = [
    { label: tr('Test Series'), icon: Award, color: '#1e4e79', onPress: () => nav.setTab('tests') },
    { label: tr('Typing Tests'), icon: Keyboard, color: '#0f766e', onPress: () => nav.setTab('typing') },
    { label: tr('Notices'), icon: FileText, color: '#b45309', onPress: () => nav.setTab('notices') },
    { label: tr('Bookmarks'), icon: Bookmark, color: '#ca8a04', onPress: () => nav.push({ name: 'bookmarks' }) },
    { label: tr('Study Planner'), icon: CalendarCheck, color: '#7c3aed', onPress: () => nav.push({ name: 'planner' }) },
    { label: tr('Saved jobs'), icon: BriefcaseBusiness, color: '#be185d', onPress: () => nav.push({ name: 'savedJobs' }) },
    { label: tr('Document Locker'), icon: Lock, color: '#475569', onPress: () => nav.push({ name: 'locker' }) },
    { label: tr('Help & support'), icon: Headphones, color: '#0369a1', onPress: () => nav.push({ name: 'support' }) },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={async () => { setRefreshing(true); await Promise.all([refresh(), refreshUser()]); setRefreshing(false); }} />}>
      <View style={{ backgroundColor: t.header, paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 26, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }}>
        <Text style={{ color: t.headerText, opacity: 0.8 }}>{tr('Hello')},</Text>
        <Text style={{ color: t.headerText, fontSize: 24, fontWeight: '800' }} numberOfLines={1}>{firstName || 'Student'} 👋</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{user.candidateCode}</Text>
          </View>
          <Pressable onPress={() => nav.push({ name: 'pass' })} style={{ backgroundColor: isPro ? '#f59e0b' : 'rgba(255,255,255,0.15)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Trophy size={12} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{isPro ? 'PRO' : hi ? 'PRO पास लें' : 'Get PRO pass'}</Text>
          </Pressable>
        </View>
      </View>

      {error === 'offline' ? (
        <Pressable onPress={() => nav.push({ name: 'offline' })} style={{ margin: 14, marginBottom: 0, padding: 12, borderRadius: 12, backgroundColor: t.warningSoft, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <WifiOff size={18} color={t.warning} />
          <Text style={{ color: t.warning, flex: 1, fontWeight: '600' }}>{hi ? 'इंटरनेट नहीं है। डाउनलोड किए टेस्ट खोलें' : 'No internet. Open your downloaded tests'}</Text>
          <ChevronRight size={18} color={t.warning} />
        </Pressable>
      ) : null}

      <View style={{ paddingHorizontal: 14 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, backgroundColor: t.card, borderRadius: 16, paddingVertical: 8, borderWidth: 1, borderColor: t.border }}>
          {actions.map(a => (
            <Pressable key={a.label} onPress={a.onPress} style={{ width: '25%', alignItems: 'center', paddingVertical: 10 }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: a.color + '1A', alignItems: 'center', justifyContent: 'center' }}>
                <a.icon size={22} color={a.color} />
              </View>
              <Text numberOfLines={2} style={{ color: t.text, fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'center', paddingHorizontal: 2 }}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {ongoing.length ? (
          <>
            <SectionTitle>{tr('Continue your test')}</SectionTitle>
            {ongoing.map(s => (
              <Pressable key={s.id} onPress={() => s.testId && nav.push({ name: 'testInfo', testId: s.testId })}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderColor: t.primary }}>
                  <PlayCircle size={28} color={t.primary} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: t.text, fontWeight: '700' }}>{titles.get(s.testId || '') || s.title}</Text>
                    <Text style={{ color: t.textSoft, fontSize: 12 }}>{hi ? 'जहां छोड़ा था वहीं से जारी रखें' : 'Resume where you left off'}</Text>
                  </View>
                  <ChevronRight size={18} color={t.textMuted} />
                </Card>
              </Pressable>
            ))}
          </>
        ) : null}

        {recent.length ? (
          <>
            <SectionTitle>{tr('Recent results')}</SectionTitle>
            <Card style={{ paddingVertical: 4 }}>
              {recent.map((s, i) => (
                <Pressable key={s.id} onPress={() => s.testId && nav.push({ name: 'analysis', testId: s.testId, attemptId: s.id })}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: t.text, fontWeight: '600' }}>{titles.get(s.testId || '') || s.title}</Text>
                    <Text style={{ color: t.textSoft, fontSize: 12 }}>{s.date}</Text>
                  </View>
                  <Text style={{ color: t.primary, fontWeight: '800' }}>{Math.round((s.score || 0) * 100) / 100}/{s.maxScore}</Text>
                  <ChevronRight size={16} color={t.textMuted} />
                </Pressable>
              ))}
            </Card>
          </>
        ) : null}

        <SectionTitle right={<Pressable onPress={() => nav.setTab('notices')}><Text style={{ color: t.primary, fontWeight: '700' }}>{tr('See all')}</Text></Pressable>}>{tr('Latest notices')}</SectionTitle>
        <Card style={{ paddingVertical: 4 }}>
          {notices.slice(0, 6).map((n, i) => (
            <Pressable key={n.id} onPress={() => nav.push({ name: 'notice', notice: n })}
              style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
              <Text numberOfLines={2} style={{ color: t.text, fontWeight: '600' }}>{hi && n.titleHi ? n.titleHi : n.title}</Text>
              <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 2 }}>{n.type} · {n.date}{n.lastDate ? ` · ${tr('Last date')}: ${n.lastDate}` : ''}</Text>
            </Pressable>
          ))}
          {notices.length === 0 ? <Text style={{ color: t.textMuted, paddingVertical: 12 }}>{tr('Loading…')}</Text> : null}
        </Card>
      </View>
    </ScrollView>
  );
}

