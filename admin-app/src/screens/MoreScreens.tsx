import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { BellRing, ChevronRight, Keyboard, LogOut, Pencil, Settings as Cog, Trash2 } from 'lucide-react-native';
import { api, db, getServer, DEFAULT_SERVER } from '../api';
import { useNav } from '../nav';
import { ALERT_LABELS, AlertType, firebaseBuilt, getMuted, registerForPush, setMuted } from '../push';
import { ROLE_LABEL, useSession } from '../session';
import { useTheme } from '../theme';
import { Button, Card, confirm, Empty, ErrorBox, Field, Header, KeyValue, ListRow, Loading, Pill, SectionTitle, Segmented, dateTime } from '../ui';

// ---- More tab: content tools + settings ------------------------------------------------------

export function MoreScreen() {
  const t = useTheme();
  const nav = useNav();
  const { can, user } = useSession();
  const [section, setSection] = useState<'tests' | 'typing'>('tests');
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="More" subtitle={`${user.name} · ${ROLE_LABEL[user.role] || user.role}`} />
      <Pressable onPress={() => nav.push({ name: 'settings' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, margin: 12, padding: 14, backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border }}>
        <Cog size={20} color={t.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontWeight: '700' }}>Settings & alerts</Text>
          <Text style={{ color: t.textSoft, fontSize: 12 }}>Instant alerts, what to be alerted about, sign out</Text>
        </View>
        <ChevronRight size={18} color={t.textMuted} />
      </Pressable>
      {can.content ? (
        <>
          <Segmented options={[{ key: 'tests', label: 'Mock tests' }, { key: 'typing', label: 'Typing categories' }]} value={section} onChange={setSection} />
          {section === 'tests' ? <TestsList /> : <TypingCategories />}
        </>
      ) : <Empty title="Content tools are for test creators" text="Ask an admin if you need access." />}
    </View>
  );
}

function TestsList() {
  const t = useTheme();
  const nav = useNav();
  const [search, setSearch] = useState('');
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const load = useCallback(async (more = false) => {
    if (!more) setLoading(true);
    try {
      const res = await api('content-tests', { search, offset: more ? tests.length : 0, limit: 30 });
      setTests(p => (more ? [...p, ...res.tests] : res.tests)); setDone(res.tests.length < 30); setError('');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [search, tests.length]);
  useEffect(() => { const h = setTimeout(() => load(), 300); return () => clearTimeout(h); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (nav.stack.length === 0 && !loading) load(); }, [nav.stack.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <FlatList
      data={tests}
      keyExtractor={x => x.id}
      ListHeaderComponent={<View style={{ paddingHorizontal: 12 }}><Field value={search} onChangeText={setSearch} placeholder="Search test, series or exam" />{error ? <ErrorBox message={error} /> : null}</View>}
      ListEmptyComponent={loading ? <Loading /> : <Empty title="No tests found" />}
      onEndReached={() => { if (!done && !loading) load(true); }}
      onEndReachedThreshold={0.4}
      renderItem={({ item: x }) => (
        <ListRow
          onPress={() => nav.push({ name: 'test', test: x })}
          title={x.title}
          subtitle={`${x.exam} › ${x.series} · ${x.attempts} attempts`}
          right={<View style={{ alignItems: 'flex-end', gap: 4 }}>
            {x.tier !== 'None' ? <Pill text="PRO" tone="warning" /> : <Pill text="FREE" tone="success" />}
            {!x.hasQuestions ? <Pill text="No questions" tone="danger" /> : null}
          </View>}
        />
      )}
    />
  );
}

function TypingCategories() {
  const t = useTheme();
  const [cats, setCats] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api('typing-categories').then(r => setCats(r.categories), e => setError(e.message)); }, []);
  const toggle = async (c: any, isActive: boolean) => {
    setCats(list => list!.map(x => (x.id === c.id ? { ...x, isActive } : x)));
    try { await api('typing-category-toggle', { id: c.id, isActive }); }
    catch (e: any) { setError(e.message); setCats(list => list!.map(x => (x.id === c.id ? { ...x, isActive: !isActive } : x))); }
  };
  if (!cats) return error ? <ErrorBox message={error} /> : <Loading />;
  return (
    <FlatList
      data={cats}
      keyExtractor={c => c.id}
      ListHeaderComponent={<Text style={{ color: t.textSoft, fontSize: 12, paddingHorizontal: 14, paddingBottom: 6 }}>Inactive categories are hidden from students.</Text>}
      renderItem={({ item: c }) => (
        <ListRow
          left={<Keyboard size={20} color={c.isActive ? t.primary : t.textMuted} />}
          title={c.name}
          subtitle={c.isActive ? 'Active' : 'Hidden from students'}
          right={<Switch value={c.isActive} onValueChange={v => toggle(c, v)} />}
        />
      )}
    />
  );
}

// ---- One mock test --------------------------------------------------------------------------

export function TestScreen({ test }: { test: any }) {
  const t = useTheme();
  const nav = useNav();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState(test.title || '');
  const [busy, setBusy] = useState('');
  useEffect(() => { api('test-analysis', { testId: test.id }).then(setData, e => setError(e.message)); }, [test.id]);
  const s = data?.stats;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={test.title || 'Test'} subtitle={test.series ? `${test.exam} › ${test.series}` : test.id} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        {error ? <ErrorBox message={error} /> : null}
        {!data ? (!error ? <Loading /> : null) : (
          <>
            <Card>
              <KeyValue label="Attempts" value={`${s.attempts} by ${s.students} students`} />
              <KeyValue label="Average score" value={s.avgScore ?? '—'} />
              <KeyValue label="Top score" value={s.topScore ?? '—'} />
              <KeyValue label="Avg accuracy" value={s.avgAccuracy != null ? `${s.avgAccuracy}%` : '—'} />
              <KeyValue label="Avg time" value={s.avgMinutes != null ? `${s.avgMinutes} min` : '—'} />
              <KeyValue label="Open reports" value={data.reports} />
              {test.questionsCount != null ? <KeyValue label="Questions" value={`${test.questionsCount}${test.hasQuestions ? '' : ' (not uploaded)'}`} /> : null}
              <KeyValue label="Test id" value={test.id} />
            </Card>
            {data.recent?.length ? (
              <>
                <SectionTitle>Latest attempts</SectionTitle>
                <Card style={{ paddingVertical: 4 }}>
                  {data.recent.map((r: any, i: number) => (
                    <Pressable key={r.id} onPress={() => nav.push({ name: 'user', id: r.userId })} style={{ flexDirection: 'row', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: t.border, gap: 8 }}>
                      <Text numberOfLines={1} style={{ color: t.text, flex: 1, fontWeight: '600' }}>{r.name}</Text>
                      <Text style={{ color: t.textSoft }}>{r.score ?? 0}/{r.maxScore ?? '—'}</Text>
                      <Text style={{ color: t.textMuted, fontSize: 12, width: 72, textAlign: 'right' }}>{dateTime(r.completedAt).split(',')[0]}</Text>
                    </Pressable>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        )}
        <SectionTitle>Rename</SectionTitle>
        <Field value={title} onChangeText={setTitle} />
        <Button title="Save name" loading={busy === 'rename'} disabled={!title.trim() || title.trim() === test.title} icon={<Pencil size={16} color={t.primaryText} />}
          onPress={async () => {
            setBusy('rename');
            try { await db('edit-mocktest-title', { testId: test.id, title: title.trim() }); test.title = title.trim(); } catch (e: any) { setError(e.message); } finally { setBusy(''); }
          }} />
        <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 8 }}>Questions and sections are edited on the website's admin panel.</Text>
        <SectionTitle>Danger zone</SectionTitle>
        <Button outline tone="danger" title="Delete test" loading={busy === 'delete'} icon={<Trash2 size={18} color={t.danger} />}
          onPress={() => confirm('Delete this test?', `"${test.title}" and all its attempts are deleted for everyone. This cannot be undone.`, 'Delete', async () => {
            setBusy('delete');
            try { await db('delete-mocktest', { testId: test.id }); nav.pop(); } catch (e: any) { setError(e.message); } finally { setBusy(''); }
          })} />
      </ScrollView>
    </View>
  );
}

// ---- Settings ------------------------------------------------------------------------------------

export function SettingsScreen() {
  const t = useTheme();
  const nav = useNav();
  const { user, pushConfigured, signOut } = useSession();
  const [muted, setMutedState] = useState<AlertType[]>([]);
  const [status, setStatus] = useState<string>('Checking…');
  const [testing, setTesting] = useState(false);
  const [note, setNote] = useState('');

  const check = useCallback(async () => {
    setStatus('Checking…');
    const r = await registerForPush();
    setStatus(
      r.status === 'ok' ? (r.serverConfigured ? 'On: alerts arrive even when the app is closed' : 'This phone is ready; the server still needs the Firebase key')
        : r.status === 'no-permission' ? 'Notifications are turned off for this app'
          : r.status === 'no-firebase' ? 'This build has no Firebase yet: alerts only while the app is open'
            : `Could not register: ${r.error}`,
    );
  }, []);
  useEffect(() => { getMuted().then(setMutedState); check(); }, [check]);

  const toggle = async (type: AlertType, on: boolean) => {
    const next = on ? muted.filter(m => m !== type) : [...muted, type];
    setMutedState(next);
    await setMuted(next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Settings" onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <Card>
          <KeyValue label="Signed in as" value={user.name} />
          <KeyValue label="Email" value={user.email} />
          <KeyValue label="Role" value={ROLE_LABEL[user.role] || user.role} />
          {getServer() !== DEFAULT_SERVER ? <KeyValue label="Server" value={getServer()} /> : null}
        </Card>

        <SectionTitle>Instant alerts</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <BellRing size={20} color={status.startsWith('On') ? t.success : t.warning} />
            <Text style={{ color: t.text, flex: 1, fontWeight: '600' }}>{status}</Text>
          </View>
          {!pushConfigured || !firebaseBuilt ? (
            <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 8 }}>
              While the app is open, new messages pop up within seconds. For alerts when the app is closed, Firebase must be set up (see the setup steps).
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Button style={{ flex: 1 }} small title="Send test alert" loading={testing}
              onPress={async () => {
                setTesting(true); setNote('');
                try {
                  const r = await api('test-push');
                  setNote(!r.configured ? 'The server has no Firebase key yet, so nothing was sent.' : r.sent ? 'Sent. Lock the phone to see how it arrives.' : 'This phone is not registered for alerts yet.');
                } catch (e: any) { setNote(e.message); } finally { setTesting(false); }
              }} />
            <Button style={{ flex: 1 }} small outline title="Android settings" onPress={() => Linking.openSettings()} />
          </View>
          {note ? <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 8 }}>{note}</Text> : null}
        </Card>

        <SectionTitle>Alert me about</SectionTitle>
        <Card style={{ paddingVertical: 4 }}>
          {(Object.keys(ALERT_LABELS) as AlertType[]).map((type, i) => (
            <View key={type} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
              <Text style={{ color: t.text, flex: 1 }}>{ALERT_LABELS[type]}</Text>
              <Switch value={!muted.includes(type)} onValueChange={v => toggle(type, v)} />
            </View>
          ))}
        </Card>
        <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 8 }}>
          Tip: for alerts that never get delayed, set Battery for MTH Admin to "Unrestricted" in Android settings (Apps › MTH Admin › Battery). Sound and vibration for each kind can be changed in Android settings › Notifications.
        </Text>

        <SectionTitle>Account</SectionTitle>
        <Button outline tone="danger" title="Sign out" icon={<LogOut size={18} color={t.danger} />}
          onPress={() => confirm('Sign out?', 'Alerts stop on this phone until you sign in again.', 'Sign out', signOut)} />
      </ScrollView>
    </View>
  );
}
