import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ban, Crown, Mail, MessageCircle, Phone, ShieldCheck, Trash2, UserCheck } from 'lucide-react-native';
import { api } from '../api';
import { useLive } from '../live';
import { useNav } from '../nav';
import { ROLE_LABEL, useSession } from '../session';
import { useTheme } from '../theme';
import { Avatar, Button, Card, confirm, dateTime, Empty, ErrorBox, Field, Header, KeyValue, ListRow, Loading, OfflineBar, Pill, SectionTitle, Segmented, timeAgo } from '../ui';

const FILTERS = [
  { key: 'all', label: 'All' }, { key: 'online', label: 'Online' }, { key: 'pro', label: 'PRO' },
  { key: 'staff', label: 'Staff' }, { key: 'blocked', label: 'Blocked' },
] as const;

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
      <Header title="Users" subtitle={`${total.toLocaleString('en-IN')} found`} />
      {!online ? <OfflineBar /> : null}
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <Field value={search} onChangeText={setSearch} placeholder="Name, email, mobile or candidate code" autoCapitalize="none" />
      </View>
      <Segmented options={FILTERS as any} value={filter} onChange={setFilter} />
      {error ? <ErrorBox message={error} onRetry={() => load()} /> : null}
      {loading && users.length === 0 ? <Loading /> : (
        <FlatList
          data={users}
          keyExtractor={u => u.id}
          refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={() => { setRefreshing(true); load(); }} />}
          onEndReached={() => { if (!done && !loading) load(true); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Empty title="No users found" />}
          renderItem={({ item: u }) => (
            <ListRow
              onPress={() => nav.push({ name: 'user', id: u.id })}
              left={<Avatar name={u.name} />}
              title={`${u.name}${u.candidateCode ? ` · ${u.candidateCode}` : ''}`}
              subtitle={u.email}
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
  const pickRole = () => Alert.alert('Change role', `Current: ${ROLE_LABEL[u.role] || u.role}`, [
    ...['STUDENT', 'SUPPORT_TEAM', 'TEST_CREATOR', 'NOTICES_MANAGER', 'ADMIN'].filter(r => r !== u.role).map(r => ({
      text: ROLE_LABEL[r], onPress: () => confirm('Change role?', `${u.name} becomes ${ROLE_LABEL[r]}.`, 'Change', update('role', { role: r }), r === 'ADMIN'),
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={u.name} subtitle={u.email} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
        {error ? <ErrorBox message={error} /> : null}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={u.name} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{u.name}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <Pill text={ROLE_LABEL[u.role] || u.role} tone={u.role === 'STUDENT' ? 'neutral' : 'primary'} />
                {isPro ? <Pill text="PRO" tone="warning" /> : u.tier !== 'None' ? <Pill text={u.tier.replace('Testbook ', '')} /> : null}
                {u.isBlocked ? <Pill text="Blocked" tone="danger" /> : null}
              </View>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <KeyValue label="Email" value={u.email} />
            <KeyValue label="Mobile" value={u.mobile || '—'} />
            <KeyValue label="Candidate code" value={u.candidateCode || '—'} />
            <KeyValue label="Joined" value={dateTime(u.joined)} />
            <KeyValue label="Last seen" value={u.lastSeen ? `${dateTime(u.lastSeen)} (${u.platform || 'web'})` : '—'} />
            <KeyValue label="Plan expires" value={isPro || u.tier !== 'None' ? u.tierExpiresAt || '—' : '—'} />
            <KeyValue label="Coins" value={u.coins} />
            <KeyValue label="Referrals" value={`${u.referrals} (code ${u.referralCode || '—'})`} />
            <KeyValue label="Tests done" value={`${data.stats?.completed ?? 0}${data.stats?.avgAccuracy != null ? ` · ${data.stats.avgAccuracy}% avg accuracy` : ''}`} />
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {can.support ? <Button style={{ flex: 1 }} small title="Message" icon={<MessageCircle size={16} color={t.primaryText} />} onPress={() => nav.push({ name: 'chat', userId: u.id, title: u.name })} /> : null}
          <Button style={{ flex: 1 }} small outline title="Email" icon={<Mail size={16} color={t.primary} />} onPress={() => Linking.openURL(`mailto:${u.email}`)} />
          {u.mobile ? <Button style={{ flex: 1 }} small outline title="Call" icon={<Phone size={16} color={t.primary} />} onPress={() => Linking.openURL(`tel:${u.mobile}`)} /> : null}
        </View>

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

        <SectionTitle>Recent tests ({data.attempts.length})</SectionTitle>
        {data.attempts.length === 0 ? <Text style={{ color: t.textMuted }}>No tests yet.</Text> : (
          <Card style={{ paddingVertical: 4 }}>
            {data.attempts.map((a: any, i: number) => (
              <View key={a.id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: t.text, fontWeight: '600' }}>{a.testTitle}</Text>
                  <Text style={{ color: t.textSoft, fontSize: 12 }}>
                    {a.status === 'ONGOING' ? 'In progress' : `${a.score ?? 0}/${a.maxScore ?? '—'}${a.accuracy != null ? ` · ${Math.round(a.accuracy)}%` : ''}`} · {dateTime(a.completedAt || a.startedAt)} · {a.source}
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
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
