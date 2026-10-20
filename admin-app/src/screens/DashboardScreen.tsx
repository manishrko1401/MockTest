import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Activity, BookOpenCheck, Crown, Flag, Lightbulb, Mail, MessageCircle, UserPlus, Users } from 'lucide-react-native';
import { api } from '../api';
import { useLive, useLiveReload } from '../live';
import { useNav } from '../nav';
import { useSession } from '../session';
import { useTheme } from '../theme';
import { Card, ErrorBox, Header, Loading, OfflineBar, SectionTitle } from '../ui';

export default function DashboardScreen() {
  const t = useTheme();
  const nav = useNav();
  const { can, user } = useSession();
  const { counts, online } = useLive();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api('dashboard')); setError(''); }
    catch (e: any) { setError(e.message); }
    finally { setRefreshing(false); }
  }, []);
  useLiveReload(load);

  const tot = data?.totals;
  const openInbox = (section: any) => { nav.setInboxSection(section); nav.setTab('inbox'); };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Dashboard" subtitle={`Hi, ${user.name.split(' ')[0]}`} />
      {!online ? <OfflineBar /> : null}
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {error ? <ErrorBox message={error} onRetry={load} /> : null}

        {counts ? (
          <>
            <SectionTitle>Needs attention</SectionTitle>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {can.support ? <Tile icon={<MessageCircle size={18} color={t.primary} />} label="Unread chats" value={counts.supportThreads} hot={counts.supportThreads > 0} onPress={() => openInbox('chats')} /> : null}
              {can.reports ? <Tile icon={<Flag size={18} color={t.danger} />} label="Reported questions" value={counts.reports} hot={counts.reports > 0} onPress={() => openInbox('reports')} /> : null}
              {can.inquiries ? <Tile icon={<Mail size={18} color={t.primary} />} label="Pending inquiries" value={counts.inquiries} hot={counts.inquiries > 0} onPress={() => openInbox('inquiries')} /> : null}
              {can.suggestions ? <Tile icon={<Lightbulb size={18} color={t.warning} />} label="Pending suggestions" value={counts.suggestions} hot={counts.suggestions > 0} onPress={() => openInbox('suggestions')} /> : null}
            </View>
          </>
        ) : null}

        {!tot ? (!error ? <Loading /> : null) : (
          <>
            <SectionTitle>Today</SectionTitle>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Tile icon={<Activity size={18} color={t.success} />} label="Online now" value={tot.onlineNow} />
              <Tile icon={<UserPlus size={18} color={t.primary} />} label="New sign-ups" value={tot.newToday} sub={`${tot.new7d} this week`} />
              <Tile icon={<BookOpenCheck size={18} color={t.primary} />} label="Tests completed" value={tot.testsToday} sub={`${tot.tests7d} this week`} />
              <Tile icon={<BookOpenCheck size={18} color={t.textSoft} />} label="Tests in progress" value={tot.testsInProgress} />
            </View>
            <SectionTitle>Users</SectionTitle>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Tile icon={<Users size={18} color={t.primary} />} label="Total users" value={tot.users} onPress={can.users ? () => nav.setTab('users') : undefined} />
              <Tile icon={<Activity size={18} color={t.primary} />} label="Active (24h)" value={tot.active24h} />
              <Tile icon={<Crown size={18} color={t.warning} />} label="PRO users" value={tot.proUsers} />
              <Tile icon={<BookOpenCheck size={18} color={t.textSoft} />} label="Mock tests" value={tot.mockTests} />
            </View>

            <SectionTitle>Last 14 days</SectionTitle>
            <Card style={{ gap: 18 }}>
              <Bars title="Sign-ups per day" days={data.days} field="signups" />
              <Bars title="Tests completed per day" days={data.days} field="tests" />
            </Card>

            {data.topTests?.length ? (
              <>
                <SectionTitle>Most attempted this week</SectionTitle>
                <Card style={{ paddingVertical: 4 }}>
                  {data.topTests.map((x: any, i: number) => (
                    <Pressable key={x.id} disabled={!can.content} onPress={() => nav.push({ name: 'test', test: { id: x.id, title: x.title } })}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
                      <Text style={{ color: t.textMuted, width: 18, fontWeight: '700' }}>{i + 1}</Text>
                      <Text numberOfLines={1} style={{ color: t.text, flex: 1, fontWeight: '600' }}>{x.title}</Text>
                      <Text style={{ color: t.textSoft, fontWeight: '700' }}>{x.attempts}</Text>
                    </Pressable>
                  ))}
                </Card>
              </>
            ) : null}

            {data.platforms?.length ? (
              <>
                <SectionTitle>Where users were active (7 days)</SectionTitle>
                <Card style={{ paddingVertical: 4 }}>
                  {data.platforms.map((p: any, i: number) => (
                    <View key={p.platform} style={{ flexDirection: 'row', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
                      <Text style={{ color: t.text, flex: 1, textTransform: 'capitalize' }}>{String(p.platform).replace('_', ' ')}</Text>
                      <Text style={{ color: t.textSoft, fontWeight: '700' }}>{p.users}</Text>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Tile({ icon, label, value, sub, onPress, hot }: { icon: React.ReactNode; label: string; value: number; sub?: string; onPress?: () => void; hot?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress}
      style={({ pressed }) => ({ width: '48%', flexGrow: 1, backgroundColor: hot ? t.primarySoft : t.card, borderRadius: 12, borderWidth: 1, borderColor: hot ? t.primary : t.border, padding: 12, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{icon}<Text numberOfLines={1} style={{ color: t.textSoft, fontSize: 12, fontWeight: '600', flex: 1 }}>{label}</Text></View>
      <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginTop: 6 }}>{(value ?? 0).toLocaleString('en-IN')}</Text>
      {sub ? <Text style={{ color: t.textMuted, fontSize: 11 }}>{sub}</Text> : null}
    </Pressable>
  );
}

/** One series, one colour; tap a day to read its value (the latest day is shown by default). */
function Bars({ title, days, field }: { title: string; days: any[]; field: 'signups' | 'tests' }) {
  const t = useTheme();
  const [sel, setSel] = useState(days.length - 1);
  const max = Math.max(1, ...days.map(d => d[field]));
  const H = 84;
  const day = days[sel];
  const label = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text style={{ color: t.text, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: t.textSoft, fontSize: 12 }}>{label(day.day)}: <Text style={{ color: t.text, fontWeight: '800' }}>{day[field]}</Text></Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: H, marginTop: 10, borderBottomWidth: 1, borderBottomColor: t.border }}>
        {days.map((d, i) => (
          <Pressable key={d.day} onPress={() => setSel(i)} accessibilityLabel={`${label(d.day)}: ${d[field]}`}
            style={{ flex: 1, height: H, justifyContent: 'flex-end', paddingHorizontal: 1 }}>
            <View style={{
              height: Math.max(d[field] ? 3 : 0, (d[field] / max) * (H - 6)),
              backgroundColor: t.primary, opacity: i === sel ? 1 : 0.55,
              borderTopLeftRadius: 4, borderTopRightRadius: 4,
            }} />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: t.textMuted, fontSize: 10 }}>{label(days[0].day)}</Text>
        <Text style={{ color: t.textMuted, fontSize: 10 }}>max {max}</Text>
        <Text style={{ color: t.textMuted, fontSize: 10 }}>Today</Text>
      </View>
    </View>
  );
}
