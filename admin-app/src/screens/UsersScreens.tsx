import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ban, Crown, Mail, MessageCircle, Phone, ShieldCheck, Trash2, UserCheck } from 'lucide-react-native';
import { api } from '../api';
import { useLive } from '../live';
import { useNav } from '../nav';
import { ROLE_LABEL, useSession } from '../session';
import { lift, useTheme } from '../theme';
import {
  Avatar, Button, Card, confirm, dateTime, Empty, ErrorBox, Header, KeyValue, ListRow, listPerf, Loading, MenuCard, OfflineBar, Pill, SearchBar,
  SectionTitle, Segmented, Stat, timeAgo,
} from '../ui';

// -----------------------------------------------------------------------------
// Users: everyone (search, filters), and one user's details: plan, coins, referrals, their
// mock test and typing test attempts, and (admins) plan / block / role changes.
// -----------------------------------------------------------------------------

const FILTERS = [
  { key: 'all', label: 'All' }, { key: 'online', label: 'Online' }, { key: 'pro', label: 'PRO' },
  { key: 'staff', label: 'Staff' }, { key: 'blocked', label: 'Blocked' },
] as const;

const round = (n?: number | null, d = 1) => (n === null || n === undefined ? '—' : String(Math.round(n * 10 ** d) / 10 ** d));

export function UsersScreen() {
  const t = useTheme();
  const nav = useNav();
  const { online } = useLive();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const load = useCallback(async (more = false) => {
    if (!more) setLoading(true);
    try {
      const res = await api('users', { search, filter, offset: more ? users.length : 0, limit: 30 });
      setUsers(prev => (more ? [...prev, ...res.users] : res.users));
      setTotal(res.total);
      setDone(res.users.length < 30);
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, filter, users.length]);

  useEffect(() => { const h = setTimeout(() => load(), 300); return () => clearTimeout(h); }, [search, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header large title="Users" subtitle={`${total.toLocaleString('en-IN')} found`} />
      {!online ? <OfflineBar /> : null}
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Name, email, mobile or candidate code" />
      </View>
      <Segmented options={FILTERS as any} value={filter} onChange={setFilter} />
      {error ? <ErrorBox message={error} onRetry={() => load()} /> : null}
      {loading && users.length === 0 ? <Loading /> : (
        <FlatList
          {...listPerf}
          data={users}
          keyExtractor={u => u.id}
          refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={() => { setRefreshing(true); load(); }} />}
          onEndReached={() => { if (!done && !loading) load(true); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Empty title="No users found" text="Try another name, email or filter." />}
          renderItem={({ item: u }) => (
            <ListRow
              onPress={() => nav.push({ name: 'user', id: u.id })}
              left={<Avatar name={u.name} />}
              title={u.name}
              subtitle={`${u.email}${u.candidateCode ? ` · ${u.candidateCode}` : ''}`}
              meta={u.lastSeen ? timeAgo(u.lastSeen) : ''}
              right={
                <View style={{ gap: 4, alignItems: 'flex-end' }}>
                  {u.isBlocked ? <Pill text="Blocked" tone="danger" /> : null}
                  {u.role !== 'STUDENT' ? <Pill text={ROLE_LABEL[u.role] || u.role} tone="primary" /> : null}
                  {u.tier === 'Testbook Pass Pro' ? <Pill text="PRO" tone="warning" /> : null}
                </View>
              }
            />
          )}
        />
      )}
    </View>
  );
}

export function UserScreen({ id }: { id: string }) {
  const t = useTheme();
  const nav = useNav();
  const { can, user: me } = useSession();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [tests, setTests] = useState<'mock' | 'typing'>('mock');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api('user', { id })); setError(''); } catch (e: any) { setError(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const update = (key: string, patch: object) => async () => {
    setBusy(key);
    try { await api('user-update', { id, ...patch }); await load(); } catch (e: any) { setError(e.message); } finally { setBusy(''); }
  };

  if (!data) return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="User" onBack={nav.pop} />
      {error ? <ErrorBox message={error} onRetry={load} /> : <Loading />}
    </View>
  );

  const u = data.user;
  const isPro = u.tier === 'Testbook Pass Pro';
  const ts = data.typingStats;
  const mockCount = data.stats?.completed ?? 0;
  const pickRole = () => Alert.alert('Change role', `Current: ${ROLE_LABEL[u.role] || u.role}`, [
    ...['STUDENT', 'SUPPORT_TEAM', 'TEST_CREATOR', 'NOTICES_MANAGER', 'ADMIN'].filter(r => r !== u.role).map(r => ({
      text: ROLE_LABEL[r], onPress: () => confirm('Change role?', `${u.name} becomes ${ROLE_LABEL[r]}.`, 'Change', update('role', { role: r }), r === 'ADMIN'),
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={u.name} subtitle={u.email} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {error ? <ErrorBox message={error} /> : null}

        {/* Profile */}
        <View style={{ backgroundColor: t.hero, borderRadius: 20, padding: 16, ...lift(t, 2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 32 }}><Avatar name={u.name} size={56} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.heroText, fontSize: 19, fontWeight: '900' }} numberOfLines={1}>{u.name}</Text>
              <Text style={{ color: t.heroText, opacity: 0.8, fontSize: 12.5, marginTop: 1 }} numberOfLines={1}>{u.candidateCode || u.email}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                  <Text style={{ color: t.heroText, fontSize: 11.5, fontWeight: '800' }}>{ROLE_LABEL[u.role] || u.role}</Text>
                </View>
                {isPro ? <Pill text="PRO" tone="warning" /> : u.tier !== 'None' ? <Pill text={u.tier.replace('Testbook ', '')} /> : null}
                {u.isBlocked ? <Pill text="Blocked" tone="danger" /> : null}
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 8 }}>
            {[[mockCount, 'Mock tests'], [ts?.total ?? 0, 'Typing tests'], [u.coins ?? 0, 'Coins'], [u.referrals ?? 0, 'Referrals']].map(([v, l]) => (
              <View key={l as string} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ color: t.heroText, fontSize: 18, fontWeight: '900' }}>{v as any}</Text>
                <Text style={{ color: t.heroText, opacity: 0.75, fontSize: 11 }}>{l as string}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {can.support ? <Button style={{ flex: 1 }} small title="Message" icon={<MessageCircle size={16} color={t.primaryText} />} onPress={() => nav.push({ name: 'chat', userId: u.id, title: u.name })} /> : null}
          <Button style={{ flex: 1 }} small outline title="Email" icon={<Mail size={16} color={t.primary} />} onPress={() => Linking.openURL(`mailto:${u.email}`)} />
          {u.mobile ? <Button style={{ flex: 1 }} small outline title="Call" icon={<Phone size={16} color={t.primary} />} onPress={() => Linking.openURL(`tel:${u.mobile}`)} /> : null}
        </View>

        <SectionTitle>Details</SectionTitle>
        <Card>
          <KeyValue label="Email" value={u.email} />
          <KeyValue label="Mobile" value={u.mobile || '—'} />
          <KeyValue label="Candidate code" value={u.candidateCode || '—'} />
          <KeyValue label="Joined" value={dateTime(u.joined)} />
          <KeyValue label="Last seen" value={u.lastSeen ? `${dateTime(u.lastSeen)}${u.platform ? ` · ${u.platform}` : ''}` : '—'} />
          <KeyValue label="Plan" value={u.tier === 'None' ? 'No pass' : `${u.tier.replace('Testbook ', '')}${u.tierExpiresAt ? ` · until ${u.tierExpiresAt}` : ''}`} />
          <KeyValue label="Referral code" value={u.referralCode || '—'} />
          <KeyValue label="Locker" value={u.lockerConnected ? 'Google Drive connected' : 'Not connected'} />
        </Card>

        {/* Tests: mock and typing */}
        <SectionTitle>Tests</SectionTitle>
        <View style={{ marginHorizontal: -12, marginTop: -6 }}>
          <Segmented options={[{ key: 'mock', label: `Mock tests · ${mockCount}` }, { key: 'typing', label: `Typing tests · ${ts?.total ?? 0}` }]} value={tests} onChange={setTests} />
        </View>
        {tests === 'mock' ? (
          <>
            {mockCount ? (
              <Card style={{ flexDirection: 'row', marginBottom: 10 }}>
                <Stat value={mockCount} label="Completed" />
                <Stat value={data.stats?.avgAccuracy != null ? `${data.stats.avgAccuracy}%` : '—'} label="Avg accuracy" />
              </Card>
            ) : null}
            {data.attempts.length === 0 ? <Empty title="No mock tests yet" /> : (
              <MenuCard>
                {data.attempts.map((a: any) => (
                  <View key={a.id} style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={2} style={{ color: t.text, fontWeight: '700' }}>{a.testTitle}</Text>
                      <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 2 }}>
                        {a.status === 'ONGOING' ? 'In progress' : `${round(a.score)} / ${round(a.maxScore)}${a.accuracy != null ? ` · ${Math.round(a.accuracy)}%` : ''}`} · {dateTime(a.completedAt || a.startedAt)} · {a.source}
                      </Text>
                    </View>
                    {can.editUsers ? (
                      <Button small outline tone="danger" title="Reset" icon={<Trash2 size={14} color={t.danger} />}
                        onPress={() => confirm('Reset this attempt?', `Deletes ${u.name}'s attempt of "${a.testTitle}" so it can be taken again.`, 'Reset', async () => {
                          try { await api('user-reset-attempt', { userId: u.id, sessionId: a.id }); await load(); } catch (e: any) { setError(e.message); }
                        })} />
                    ) : null}
                  </View>
                ))}
              </MenuCard>
            )}
          </>
        ) : (
          <>
            {ts?.total ? (
              <Card style={{ flexDirection: 'row', marginBottom: 10 }}>
                <Stat value={round(ts.bestWpm)} label="Best WPM" color={t.violet} />
                <Stat value={round(ts.avgWpm)} label="Avg WPM" />
                <Stat value={`${round(ts.avgAccuracy, 0)}%`} label="Avg accuracy" />
                <Stat value={`${ts.qualified}/${ts.total}`} label="Qualified" color={t.success} />
              </Card>
            ) : null}
            {!data.typingAttempts?.length ? <Empty title="No typing tests yet" /> : (
              <MenuCard>
                {data.typingAttempts.map((a: any) => (
                  <ListRow key={a.id} onPress={() => nav.push({ name: 'typingAttempt', id: a.id })}
                    title={a.testTitle || 'Typing test'}
                    subtitle={`${round(a.netWpm)} WPM · ${round(a.accuracyPercentage)}% · ${a.totalMistakes} mistakes · ${a.language === 'hi' ? 'Hindi' : 'English'}`}
                    meta={timeAgo(a.completedAt)}
                    right={<Pill text={a.isQualified ? 'Qualified' : 'Not qualified'} tone={a.isQualified ? 'success' : 'danger'} />} />
                ))}
              </MenuCard>
            )}
          </>
        )}

        {can.editUsers ? (
          <>
            <SectionTitle>Manage</SectionTitle>
            <View style={{ gap: 10 }}>
              <Button outline tone="warning" title={isPro ? 'Remove PRO pass' : 'Give PRO pass (1 year)'} loading={busy === 'tier'} icon={<Crown size={18} color={t.warning} />}
                onPress={() => confirm(isPro ? 'Remove PRO?' : 'Give PRO?', isPro ? `${u.name} loses PRO tests.` : `${u.name} gets all PRO tests for a year.`, isPro ? 'Remove' : 'Give PRO', update('tier', { tier: isPro ? 'None' : 'Testbook Pass Pro' }), isPro)} />
              {u.id !== me.id ? (
                <Button outline tone={u.isBlocked ? 'success' : 'danger'} title={u.isBlocked ? 'Unblock account' : 'Block account'} loading={busy === 'block'}
                  icon={u.isBlocked ? <UserCheck size={18} color={t.success} /> : <Ban size={18} color={t.danger} />}
                  onPress={() => confirm(u.isBlocked ? 'Unblock?' : 'Block this account?', u.isBlocked ? `${u.name} can sign in again.` : `${u.name} is signed out everywhere and can't sign in.`, u.isBlocked ? 'Unblock' : 'Block', update('block', { isBlocked: !u.isBlocked }), !u.isBlocked)} />
              ) : null}
              {u.id !== me.id ? <Button outline tone="neutral" title="Change role" loading={busy === 'role'} icon={<ShieldCheck size={18} color={t.textSoft} />} onPress={pickRole} /> : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
