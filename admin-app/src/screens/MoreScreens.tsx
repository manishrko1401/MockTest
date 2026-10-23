import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import {
  BellRing, BookOpen, ClipboardList, Keyboard, LogOut, Moon, MonitorSmartphone, Pencil, Settings2, ShieldAlert, Smartphone, Sun, Trash2,
} from 'lucide-react-native';
import { api, db, getServer, DEFAULT_SERVER } from '../api';
import { useNav } from '../nav';
import { ALERT_LABELS, AlertType, firebaseBuilt, getMuted, registerForPush, setMuted } from '../push';
import { ROLE_LABEL, useSession } from '../session';
import { lift, ThemeMode, useTheme, useThemeMode } from '../theme';
import {
  Avatar, Button, Card, confirm, Empty, ErrorBox, Field, Header, KeyValue, ListRow, listPerf, Loading, MenuCard, MenuRow, Pill, SearchBar, SectionTitle,
  ThemeButton, dateTime,
} from '../ui';

// -----------------------------------------------------------------------------
// More: who is signed in, appearance (light / dark), activity logs, content tools, alerts and
// signing out. Each item shows only for the roles that may open it.
// -----------------------------------------------------------------------------

export function MoreScreen() {
  const t = useTheme();
  const nav = useNav();
  const { user, can, signOut } = useSession();
  const { mode, setMode } = useThemeMode();
  const admin = user.role === 'ADMIN';
  const typingLogs = admin || can.content;

  const modes: { key: ThemeMode; label: string; icon: any }[] = [
    { key: 'system', label: 'Phone', icon: Smartphone },
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header large title="More" right={<ThemeButton />} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 36 }}>
        {/* Who is signed in */}
        <View style={{ backgroundColor: t.hero, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, ...lift(t, 2) }}>
          <View style={{ borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 32 }}><Avatar name={user.name} size={56} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.heroText, fontSize: 19, fontWeight: '900' }} numberOfLines={1}>{user.name}</Text>
            <Text style={{ color: t.heroText, opacity: 0.8, fontSize: 13, marginTop: 1 }} numberOfLines={1}>{user.email}</Text>
            <View style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ color: t.heroText, fontSize: 12, fontWeight: '800' }}>{ROLE_LABEL[user.role] || user.role}</Text>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <SectionTitle>Appearance</SectionTitle>
        <MenuCard style={{ flexDirection: 'row', padding: 6, gap: 6 }}>
          {modes.map(m => {
            const on = mode === m.key;
            return (
              <Pressable key={m.key} onPress={() => setMode(m.key)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 12, borderRadius: 12, backgroundColor: on ? t.primary : 'transparent' }}>
                <m.icon size={20} color={on ? t.primaryText : t.textSoft} />
                <Text style={{ color: on ? t.primaryText : t.text, fontWeight: '800', fontSize: 13 }}>{m.label}</Text>
              </Pressable>
            );
          })}
        </MenuCard>
        <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 6, paddingHorizontal: 2 }}>"Phone" follows the light / dark setting of this phone.</Text>

        {/* Activity */}
        {admin || typingLogs ? (
          <>
            <SectionTitle>Activity</SectionTitle>
            <MenuCard>
              {admin ? <MenuRow icon={ClipboardList} title="Mock test attempts" subtitle="Every student, newest first" onPress={() => nav.push({ name: 'mockAttempts' })} /> : null}
              {typingLogs ? <MenuRow icon={Keyboard} color={t.violet} title="Typing test attempts" subtitle="Speed, accuracy and mistakes" onPress={() => nav.push({ name: 'typingAttempts' })} last={!admin} /> : null}
              {admin ? <MenuRow icon={ShieldAlert} color={t.danger} title="Integrity review" subtitle="Suspicious attempts to check" onPress={() => nav.push({ name: 'integrity' })} /> : null}
              {admin ? <MenuRow icon={MonitorSmartphone} color={t.success} title="Platforms" subtitle="Website, Windows app and Android app" onPress={() => nav.push({ name: 'platforms' })} last /> : null}
            </MenuCard>
          </>
        ) : null}

        {/* Content */}
        {can.content ? (
          <>
            <SectionTitle>Content</SectionTitle>
            <MenuCard>
              <MenuRow icon={BookOpen} title="Mock tests" subtitle="Attempts, analysis, rename or delete" onPress={() => nav.push({ name: 'tests' })} />
              <MenuRow icon={Keyboard} color={t.violet} title="Typing categories" subtitle="Show or hide categories for students" onPress={() => nav.push({ name: 'typingCategories' })} last />
            </MenuCard>
          </>
        ) : null}

        {/* Alerts */}
        <SectionTitle>Alerts</SectionTitle>
        <MenuCard>
          <MenuRow icon={BellRing} color={t.warning} title="Instant alerts" subtitle="Test alert and what to be alerted about" onPress={() => nav.push({ name: 'settings' })} />
          <MenuRow icon={Settings2} color={t.textSoft} title="Android notification settings" subtitle="Sound, vibration and battery" onPress={() => Linking.openSettings()} last />
        </MenuCard>

        {/* Account */}
        <SectionTitle>Account</SectionTitle>
        <MenuCard>
          <MenuRow icon={LogOut} danger title="Sign out" subtitle="Alerts stop on this phone until you sign in again"
            onPress={() => confirm('Sign out?', 'Alerts stop on this phone until you sign in again.', 'Sign out', signOut)} last />
        </MenuCard>

        <Text style={{ color: t.textMuted, fontSize: 12, textAlign: 'center', marginTop: 22 }}>
          MTH Admin {Constants.expoConfig?.version || ''}{getServer() !== DEFAULT_SERVER ? ` · ${getServer()}` : ''}
        </Text>
      </ScrollView>
    </View>
  );
}

// ---- Mock tests --------------------------------------------------------------------------------

export function TestsScreen() {
  const t = useTheme();
  const nav = useNav();
  const [search, setSearch] = useState('');
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const load = useCallback(async (more = false) => {
    if (!more) setLoading(true);
    try {
      const res = await api('content-tests', { search, offset: more ? tests.length : 0, limit: 30 });
      setTests(p => (more ? [...p, ...res.tests] : res.tests)); setDone(res.tests.length < 30); setError('');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); setRefreshing(false); }
  }, [search, tests.length]);
  useEffect(() => { const h = setTimeout(() => load(), 300); return () => clearTimeout(h); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Mock tests" onBack={nav.pop} />
      <View style={{ padding: 12, paddingBottom: 6 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search test, series or exam" /></View>
      {error ? <ErrorBox message={error} onRetry={() => load()} /> : null}
      <FlatList
        {...listPerf}
        data={tests}
        keyExtractor={x => x.id}
        refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={() => { setRefreshing(true); load(); }} />}
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
    </View>
  );
}

// ---- Typing categories --------------------------------------------------------------------------

export function TypingCategoriesScreen() {
  const t = useTheme();
  const nav = useNav();
  const [cats, setCats] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api('typing-categories').then(r => setCats(r.categories), e => setError(e.message)); }, []);
  const toggle = async (c: any, isActive: boolean) => {
    setCats(list => list!.map(x => (x.id === c.id ? { ...x, isActive } : x)));
    try { await api('typing-category-toggle', { id: c.id, isActive }); }
    catch (e: any) { setError(e.message); setCats(list => list!.map(x => (x.id === c.id ? { ...x, isActive: !isActive } : x))); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Typing categories" subtitle="Hidden categories don't show to students" onBack={nav.pop} />
      {error ? <ErrorBox message={error} /> : null}
      {!cats ? (!error ? <Loading /> : null) : (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
          <MenuCard>
            {cats.map((c, i) => (
              <MenuRow key={c.id} icon={Keyboard} color={c.isActive ? t.violet : t.textMuted} title={c.name}
                subtitle={c.isActive ? 'Shown to students' : 'Hidden from students'} switchValue={c.isActive} onSwitch={v => toggle(c, v)} last={i === cats.length - 1} />
            ))}
          </MenuCard>
        </ScrollView>
      )}
    </View>
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
                <MenuCard>
                  {data.recent.map((r: any) => (
                    <ListRow key={r.id} onPress={() => nav.push({ name: 'user', id: r.userId })} left={<Avatar name={r.name} size={34} />}
                      title={r.name} subtitle={`${r.score ?? 0} / ${r.maxScore ?? '—'} marks`} meta={dateTime(r.completedAt).split(',')[0]} />
                  ))}
                </MenuCard>
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

// ---- Instant alerts -------------------------------------------------------------------------------

export function SettingsScreen() {
  const t = useTheme();
  const nav = useNav();
  const { pushConfigured } = useSession();
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
          : r.status === 'no-firebase' ? 'This build has no Firebase: alerts only while the app is open'
            : `Could not register: ${r.error}`,
    );
  }, []);
  useEffect(() => { getMuted().then(setMutedState); check(); }, [check]);

  const toggle = async (type: AlertType, on: boolean) => {
    const next = on ? muted.filter(m => m !== type) : [...muted, type];
    setMutedState(next);
    await setMuted(next);
  };
  const good = status.startsWith('On');

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Instant alerts" onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <Card>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: good ? t.successSoft : t.warningSoft, alignItems: 'center', justifyContent: 'center' }}>
              <BellRing size={21} color={good ? t.success : t.warning} />
            </View>
            <Text style={{ color: t.text, flex: 1, fontWeight: '700', lineHeight: 20 }}>{status}</Text>
          </View>
          {!pushConfigured || !firebaseBuilt ? (
            <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 10, lineHeight: 18 }}>
              While the app is open, new messages pop up within seconds. Alerts when the app is closed need Firebase on the server (FCM_SERVICE_ACCOUNT in Vercel).
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Button style={{ flex: 1 }} small title="Send test alert" loading={testing}
              onPress={async () => {
                setTesting(true); setNote('');
                try {
                  const r = await api('test-push');
                  setNote(!r.configured ? 'The server has no Firebase key yet, so nothing was sent.' : r.sent ? 'Sent. Lock the phone to see how it arrives.' : 'This phone is not registered for alerts yet.');
                } catch (e: any) { setNote(e.message); } finally { setTesting(false); }
              }} />
            <Button style={{ flex: 1 }} small outline title="Check again" onPress={check} />
          </View>
          {note ? <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 10 }}>{note}</Text> : null}
        </Card>

        <SectionTitle>Alert me about</SectionTitle>
        <MenuCard>
          {(Object.keys(ALERT_LABELS) as AlertType[]).map((type, i, all) => (
            <MenuRow key={type} icon={BellRing} color={muted.includes(type) ? t.textMuted : t.primary} title={ALERT_LABELS[type]}
              switchValue={!muted.includes(type)} onSwitch={v => toggle(type, v)} last={i === all.length - 1} />
          ))}
        </MenuCard>
        <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 10, lineHeight: 18 }}>
          For alerts that are never delayed, set Battery for MTH Admin to "Unrestricted" (Android settings › Apps › MTH Admin › Battery). Sound and vibration for each kind can be changed in Android settings › Notifications.
        </Text>
      </ScrollView>
    </View>
  );
}
