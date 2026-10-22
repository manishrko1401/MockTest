import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell, Bookmark, BriefcaseBusiness, CalendarCheck, ChevronRight, Crown, Download, FileText, GraduationCap, Headphones, Keyboard, Lock,
  Newspaper, PlayCircle, Swords, Users, WifiOff,
} from 'lucide-react-native';
import { request } from '../api';
import { useData, flattenTests } from '../data';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useSession, useUser } from '../session';
import { lift, useTheme } from '../theme';
import { Badge, Banner, Card, IconTile, LinkText, Pill, ProgressBar, Ring, SectionTitle, StatusBarCover, round2 } from '../ui';
import { useFriendsBadge } from '../friendsApi';
import { isDone, checkinKey, localDay, tasksForDay, PlannerData } from '../shared/plannerShared';

function greeting(hi: boolean) {
  const h = new Date().getHours();
  if (h < 12) return hi ? 'सुप्रभात' : 'Good morning';
  if (h < 17) return hi ? 'नमस्ते' : 'Good afternoon';
  return hi ? 'शुभ संध्या' : 'Good evening';
}

export default function HomeScreen() {
  const t = useTheme();
  const { t: tr, hi } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { refreshUser } = useSession();
  const { notices, catalog, refresh, error } = useData();
  const friendsBadge = useFriendsBadge();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [plan, setPlan] = useState<PlannerData | null>(null);

  const loadPlan = useCallback(() => {
    request<PlannerData>('planner-get', { today: localDay(), tzOffset: new Date().getTimezoneOffset() }).then(setPlan, () => {});
  }, []);
  useEffect(() => { loadPlan(); }, [loadPlan]);

  const titles = useMemo(() => new Map(flattenTests(catalog).map(x => [x.test.id, x.test.title])), [catalog]);
  const sessions = user.testSessions || [];
  const ongoing = sessions.filter(s => s.status === 'ONGOING').slice(0, 2);
  const done = sessions.filter(s => s.status !== 'ONGOING');
  const recent = [...done].sort((a, b) => (b.completedAt || b.date || '').localeCompare(a.completedAt || a.date || '')).slice(0, 4);
  const avgAccuracy = done.length ? Math.round(done.reduce((a, s) => a + (s.accuracy || 0), 0) / done.length) : 0;
  const best = done.reduce((m, s) => Math.max(m, s.maxScore ? (s.score || 0) / s.maxScore : 0), 0);
  const isPro = user.subscriptionTier === 'Testbook Pass Pro';
  const firstName = (user.name || '').split(' ')[0];

  // Today's plan
  const today = plan?.today || localDay();
  const checkins = useMemo(() => new Set((plan?.checkins || []).map(c => checkinKey(c.taskId, c.day))), [plan]);
  const todayTasks = plan ? tasksForDay(plan.tasks, today) : [];
  const tasksDone = todayTasks.filter(x => isDone(x, today, checkins)).length;
  const act = plan?.activity?.[today] || { mock: 0, typing: 0 };
  const nextExam = plan ? [...plan.exams].filter(e => e.examDate >= today).sort((a, b) => a.examDate.localeCompare(b.examDate))[0] : undefined;
  const daysToExam = nextExam ? Math.round((new Date(`${nextExam.examDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000) : null;

  const actions = [
    { label: hi ? 'मॉक टेस्ट' : 'Mock tests', icon: GraduationCap, color: t.primary, onPress: () => nav.setTab('tests', 'mock') },
    { label: tr('Typing'), icon: Keyboard, color: t.teal, onPress: () => nav.setTab('tests', 'typing') },
    { label: tr('Notices'), icon: Bell, color: t.accent, onPress: () => nav.push({ name: 'notices' }) },
    { label: tr('Bookmarks'), icon: Bookmark, color: t.violet, onPress: () => nav.push({ name: 'bookmarks' }) },
    { label: tr('Saved jobs'), icon: BriefcaseBusiness, color: '#db2777', onPress: () => nav.push({ name: 'savedJobs' }) },
    { label: hi ? 'लॉकर' : 'Locker', icon: Lock, color: t.textSoft, onPress: () => nav.push({ name: 'locker' }) },
    { label: hi ? 'डाउनलोड' : 'Downloads', icon: Download, color: t.success, onPress: () => nav.push({ name: 'offline' }) },
    { label: hi ? 'सहायता' : 'Support', icon: Headphones, color: '#0284c7', onPress: () => nav.push({ name: 'support' }) },
  ];

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} progressViewOffset={insets.top} onRefresh={async () => {
        setRefreshing(true); await Promise.all([refresh(), refreshUser()]); loadPlan(); friendsBadge.refresh(); setRefreshing(false);
      }} />}>
      {/* Welcome */}
      <View style={{ backgroundColor: t.hero, paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 64, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.heroText, opacity: 0.75, fontSize: 14, fontWeight: '600' }}>{greeting(hi)},</Text>
            <Text style={{ color: t.heroText, fontSize: 26, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 }} numberOfLines={1}>{firstName || (hi ? 'विद्यार्थी' : 'Student')}</Text>
          </View>
          <Pressable onPress={() => nav.push({ name: 'notices' })} accessibilityLabel={tr('Notices')}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
            <Newspaper size={20} color="#fff" />
          </Pressable>
          {/* friend requests, messages, rooms, support replies */}
          <Pressable onPress={() => nav.push({ name: 'notifications' })}
            accessibilityLabel={hi ? `सूचनाएं${friendsBadge.notifications ? ` (${friendsBadge.notifications} नई)` : ''}` : `Notifications${friendsBadge.notifications ? ` (${friendsBadge.notifications} new)` : ''}`}
            style={{ width: 44, height: 44, borderRadius: 22, marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={21} color="#fff" />
            {friendsBadge.notifications ? <Badge count={friendsBadge.notifications} inverted style={{ position: 'absolute', top: -2, right: -2 }} /> : null}
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 }}>{user.candidateCode}</Text>
          </View>
          <Pressable onPress={() => nav.push({ name: 'pass' })} style={{ backgroundColor: isPro ? '#f59e0b' : 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, flexDirection: 'row', gap: 5, alignItems: 'center' }}>
            <Crown size={13} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{isPro ? 'PRO' : hi ? 'PRO पास लें' : 'Get PRO pass'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: -46 }}>
        {/* Progress */}
        <Card style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, ...lift(t, 2) }}>
          <Ring value={avgAccuracy / 100} size={68} stroke={8} color={t.success}>
            <Text style={{ color: t.text, fontWeight: '900', fontSize: 15 }}>{avgAccuracy}%</Text>
          </Ring>
          <View style={{ flex: 1, flexDirection: 'row', marginLeft: 8 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: t.text, fontSize: 20, fontWeight: '900' }}>{done.length}</Text>
              <Text style={{ color: t.textSoft, fontSize: 12, fontWeight: '600' }}>{hi ? 'टेस्ट दिए' : 'Tests taken'}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: t.text, fontSize: 20, fontWeight: '900' }}>{Math.round(best * 100)}%</Text>
              <Text style={{ color: t.textSoft, fontSize: 12, fontWeight: '600' }}>{hi ? 'सर्वश्रेष्ठ' : 'Best score'}</Text>
            </View>
          </View>
        </Card>

        {error === 'offline' ? (
          <View style={{ marginTop: 12 }}>
            <Banner tone="warning" icon={<WifiOff size={18} color={t.warning} />} text={hi ? 'इंटरनेट नहीं है। डाउनलोड किए टेस्ट खोलें' : 'No internet. Open your downloaded tests'}
              onPress={() => nav.push({ name: 'offline' })} right={<ChevronRight size={18} color={t.warning} />} />
          </View>
        ) : null}

        {/* Continue */}
        {ongoing.map(s => (
          <Card key={s.id} onPress={() => s.testId && nav.push({ name: 'testInfo', testId: s.testId })} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: t.primary, borderWidth: 1.5 }}>
            <PlayCircle size={34} color={t.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.primary, fontSize: 12, fontWeight: '800' }}>{tr('Continue your test')}</Text>
              <Text numberOfLines={1} style={{ color: t.text, fontWeight: '800', fontSize: 15, marginTop: 1 }}>{titles.get(s.testId || '') || s.title}</Text>
            </View>
            <ChevronRight size={20} color={t.textMuted} />
          </Card>
        ))}

        {/* Quick actions */}
        <Card style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4, paddingVertical: 8 }}>
          {actions.map(a => (
            <Pressable key={a.label} onPress={a.onPress} style={({ pressed }) => ({ width: '25%', alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: pressed ? t.cardAlt : 'transparent' })}>
              <IconTile icon={a.icon} color={a.color} size={46} />
              <Text numberOfLines={1} style={{ color: t.text, fontSize: 12, fontWeight: '700', marginTop: 7 }}>{a.label}</Text>
            </Pressable>
          ))}
        </Card>

        {/* Today's plan */}
        <SectionTitle right={<LinkText onPress={() => nav.setTab('planner')}>{hi ? 'प्लानर खोलें' : 'Open planner'}</LinkText>}>{hi ? 'आज की योजना' : "Today's plan"}</SectionTitle>
        <Card onPress={() => nav.setTab('planner')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconTile icon={CalendarCheck} color={t.violet} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>
                {todayTasks.length ? (hi ? `${todayTasks.length} में से ${tasksDone} कार्य पूरे` : `${tasksDone} of ${todayTasks.length} tasks done`) : (hi ? 'आज के लिए कोई कार्य नहीं' : 'No tasks for today')}
              </Text>
              <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 2 }}>
                {nextExam && daysToExam !== null ? (hi ? `${nextExam.name} में ${daysToExam} दिन` : `${daysToExam} days to ${nextExam.name}`) : (hi ? 'परीक्षा तिथि जोड़ें और लक्ष्य तय करें' : 'Add your exam date and daily targets')}
              </Text>
            </View>
          </View>
          {todayTasks.length ? <View style={{ marginTop: 12 }}><ProgressBar value={tasksDone / todayTasks.length} color={t.violet} /></View> : null}
          {plan && (plan.targets.mockTestsPerDay || plan.targets.typingTestsPerDay) ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {plan.targets.mockTestsPerDay ? <Pill tone={act.mock >= plan.targets.mockTestsPerDay ? 'success' : 'primary'} text={`${hi ? 'मॉक' : 'Mock'} ${act.mock}/${plan.targets.mockTestsPerDay}`} /> : null}
              {plan.targets.typingTestsPerDay ? <Pill tone={act.typing >= plan.targets.typingTestsPerDay ? 'success' : 'teal'} text={`${hi ? 'टाइपिंग' : 'Typing'} ${act.typing}/${plan.targets.typingTestsPerDay}`} /> : null}
            </View>
          ) : null}
        </Card>

        {/* With friends */}
        <Card onPress={() => nav.setTab('friends')} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.primarySoft, borderColor: t.primarySoft }} flat>
          <IconTile icon={Swords} color={t.primary} bg={t.card} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>{hi ? 'दोस्तों के साथ टेस्ट दें' : 'Take a test with friends'}</Text>
            <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 2 }}>{hi ? 'एक ही टेस्ट, फिर अंक और समय की तुलना' : 'Same test, then compare marks and time'}</Text>
          </View>
          {friendsBadge.total ? <Badge count={friendsBadge.total} /> : <Users size={20} color={t.primary} />}
        </Card>

        {/* Recent results */}
        {recent.length ? (
          <>
            <SectionTitle>{tr('Recent results')}</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {recent.map(s => {
                const pct = s.maxScore ? Math.max(0, (s.score || 0) / s.maxScore) : 0;
                return (
                  <Card key={s.id} onPress={() => s.testId && nav.push({ name: 'analysis', testId: s.testId, attemptId: s.id })} style={{ width: 210, padding: 14 }}>
                    <Text numberOfLines={2} style={{ color: t.text, fontWeight: '800', fontSize: 14, minHeight: 38 }}>{titles.get(s.testId || '') || s.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }}>
                      <Text style={{ color: t.primary, fontWeight: '900', fontSize: 22 }}>{round2(s.score || 0)}</Text>
                      <Text style={{ color: t.textMuted, fontWeight: '700' }}> / {s.maxScore}</Text>
                    </View>
                    <View style={{ marginTop: 8 }}><ProgressBar value={pct} height={6} color={pct >= 0.6 ? t.success : pct >= 0.35 ? t.accent : t.danger} /></View>
                    <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 8 }}>{s.date} · {Math.round(s.accuracy || 0)}% {hi ? 'सटीक' : 'accuracy'}</Text>
                  </Card>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {/* Notices */}
        <SectionTitle right={<LinkText onPress={() => nav.push({ name: 'notices' })}>{tr('See all')}</LinkText>}>{tr('Latest notices')}</SectionTitle>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {notices.slice(0, 5).map((n, i) => (
            <Pressable key={n.id} onPress={() => nav.push({ name: 'notice', notice: n })}
              style={({ pressed }) => ({ flexDirection: 'row', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: t.border, backgroundColor: pressed ? t.cardAlt : 'transparent' })}>
              <IconTile icon={FileText} color={t.accent} size={38} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={{ color: t.text, fontWeight: '700', lineHeight: 19 }}>{hi && n.titleHi ? n.titleHi : n.title}</Text>
                <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 3 }}>{n.type} · {n.date}{n.lastDate ? ` · ${tr('Last date')}: ${n.lastDate}` : ''}</Text>
              </View>
            </Pressable>
          ))}
          {notices.length === 0 ? <Text style={{ color: t.textMuted, padding: 16 }}>{tr('Loading…')}</Text> : null}
        </Card>
      </View>
    </ScrollView>
    {/* stays behind the clock while the page scrolls */}
    <StatusBarCover color={t.hero} />
    </View>
  );
}
