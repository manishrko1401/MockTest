import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import {
  BarChart3, CalendarClock, ChevronRight, Clock, Eye, FileQuestion, Languages, Lock, Play, Radio, RotateCcw, Search, ShieldCheck,
  Swords, Target, Trophy, WifiOff,
} from 'lucide-react-native';
import { useData, flattenTests } from '../data';
import { useI18n } from '../i18n';
import { useNav, useTabSection } from '../nav';
import { useUser } from '../session';
import { useTheme } from '../theme';
import { Button, Card, Chip, Empty, ErrorBox, Header, IconTile, Loading, Pill, SearchBar, SectionTitle, Segmented, Sheet, Tabs, round2 } from '../ui';
import type { MockTestItem, MockUser, TestCategory } from '../shared/webTypes';
import { isCbatTest } from '../shared/examScoring';
import { DownloadButton } from './OfflineScreen';
import { TypingHubScreen } from './TypingScreens';
import { ANYTIME_HOURS, api, LIMIT_PICKS, roomLink } from '../friendsApi';
import { friendlyError } from '../api';

export const tierAllows = (required: string | undefined, tier: string | undefined) =>
  !required || required === 'None' ||
  (required === 'Testbook Pass' && (tier === 'Testbook Pass' || tier === 'Testbook Pass Pro')) ||
  (required === 'Testbook Pass Pro' && tier === 'Testbook Pass Pro');

export function testStatus(user: MockUser, testId: string) {
  const sessions = (user.testSessions || []).filter(s => s.testId === testId);
  return {
    ongoing: sessions.find(s => s.status === 'ONGOING'),
    completed: sessions.filter(s => s.status === 'COMPLETED' || s.status === 'AUTO_SUBMITTED'),
  };
}

const catName = (c: { name: string; nameHi?: string }, hi: boolean) => (hi && c.nameHi ? c.nameHi : c.name);
const examTests = (s: any) => (s.subSubCategories || []).reduce((m: number, ss: any) => m + (ss.tests?.length || 0), 0) || (s.tests?.length || 0);
const countTests = (c: TestCategory) => (c.subCategories || []).reduce((n, s: any) => n + examTests(s), 0);

function Logo({ uri, size = 52 }: { uri?: string; size?: number }) {
  const t = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: t.dark ? 0 : 1, borderColor: t.border }}>
      {uri && !failed
        ? <Image source={{ uri }} style={{ width: size * 0.8, height: size * 0.8 }} resizeMode="contain" onError={() => setFailed(true)} />
        : <Trophy size={size * 0.5} color="#1e4e79" />}
    </View>
  );
}

// ---- Tab: mock tests + typing --------------------------------------------------------------------

export function TestsScreen() {
  const t = useTheme();
  const { hi } = useI18n();
  const [kind, setKind] = useState<'mock' | 'typing'>('mock');
  useTabSection('tests', useCallback((v: string) => { if (v === 'mock' || v === 'typing') setKind(v); }, []));
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header large title={hi ? 'टेस्ट' : 'Tests'} border={false} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 6, backgroundColor: t.header }}>
        <Tabs options={[{ key: 'mock', label: hi ? 'मॉक टेस्ट' : 'Mock tests' }, { key: 'typing', label: hi ? 'टाइपिंग टेस्ट' : 'Typing tests' }]} value={kind} onChange={setKind} />
      </View>
      <View style={{ flex: 1, display: kind === 'mock' ? 'flex' : 'none' }}><MockCatalog /></View>
      <View style={{ flex: 1, display: kind === 'typing' ? 'flex' : 'none' }}><TypingHubScreen embedded /></View>
    </View>
  );
}

function MockCatalog() {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const { catalog, ready, refresh, refreshing, error } = useData();
  const [search, setSearch] = useState('');
  const all = useMemo(() => flattenTests(catalog), [catalog]);
  const q = search.trim().toLowerCase();
  const results = useMemo(() => (q.length < 2 ? [] : all.filter(x => x.test.title.toLowerCase().includes(q) || x.examName.toLowerCase().includes(q)).slice(0, 80)), [all, q]);

  const header = (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder={hi ? 'परीक्षा या टेस्ट खोजें' : 'Search exams or tests'} />
      {error === 'offline' && !catalog.length ? <ErrorBox style={{ marginHorizontal: 0 }} message={hi ? 'इंटरनेट नहीं है।' : 'No internet connection.'} onRetry={refresh} /> : null}
      {q.length < 2 ? (
        <Text style={{ color: t.textSoft, fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 4 }}>
          {hi ? `${catalog.length} श्रेणियां · ${all.length} टेस्ट` : `${catalog.length} categories · ${all.length} tests`}
        </Text>
      ) : null}
    </View>
  );

  if (q.length >= 2) {
    return (
      <FlatList
        key="search"
        data={results}
        keyExtractor={x => x.test.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Empty title={hi ? 'कुछ नहीं मिला' : 'Nothing found'} text={hi ? 'दूसरा नाम आज़माएं, जैसे "CGL" या "NTPC"।' : 'Try another name, like "CGL" or "NTPC".'} icon={<Search size={32} color={t.textMuted} />} />}
        renderItem={({ item: x }) => <TestCard test={x.test} subtitle={`${x.examName}${x.seriesName ? ` › ${x.seriesName}` : ''}`} />}
      />
    );
  }
  return (
    <FlatList
      key="categories"
      data={ready ? catalog : []}
      keyExtractor={c => c.id}
      numColumns={2}
      ListHeaderComponent={header}
      ListEmptyComponent={!ready ? <Loading /> : <Empty title={hi ? 'अभी कोई टेस्ट नहीं' : 'No tests yet'} icon={<WifiOff size={30} color={t.textMuted} />} />}
      columnWrapperStyle={{ paddingHorizontal: 10 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={refresh} />}
      renderItem={({ item: c }) => {
        const n = countTests(c);
        return (
          <Card onPress={() => nav.push({ name: 'category', categoryId: c.id })} style={{ flex: 1, margin: 6, padding: 14, minHeight: 150 }}>
            <Logo uri={c.logoUrl} />
            <Text numberOfLines={2} style={{ color: t.text, fontWeight: '800', fontSize: 14.5, marginTop: 12, lineHeight: 19 }}>{catName(c, hi)}</Text>
            <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 4 }}>
              {hi ? `${c.subCategories?.length || 0} परीक्षाएं` : `${c.subCategories?.length || 0} exams`} · {n} {hi ? 'टेस्ट' : 'tests'}
            </Text>
          </Card>
        );
      }}
    />
  );
}

// ---- A category: its exams --------------------------------------------------------------------

export function CategoryScreen({ categoryId }: { categoryId: string }) {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const { catalog } = useData();
  const cat = catalog.find(c => c.id === categoryId);
  if (!cat) return <View style={{ flex: 1, backgroundColor: t.bg }}><Header title="" onBack={nav.pop} /><Loading /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={catName(cat, hi)} subtitle={hi ? `${cat.subCategories.length} परीक्षाएं · ${countTests(cat)} टेस्ट` : `${cat.subCategories.length} exams · ${countTests(cat)} tests`} onBack={nav.pop} />
      <FlatList
        data={cat.subCategories}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Empty title={hi ? 'अभी कोई परीक्षा नहीं' : 'No exams yet'} />}
        renderItem={({ item: s }: any) => {
          const n = examTests(s);
          return (
            <Card onPress={() => nav.push({ name: 'exam', categoryId, examId: s.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Logo uri={cat.logoUrl} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: '800', fontSize: 15.5 }}>{catName(s, hi)}</Text>
                <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 3 }}>{hi ? `${n} मॉक टेस्ट` : `${n} mock tests`}{s.subSubCategories?.length ? ` · ${s.subSubCategories.length} ${hi ? 'सीरीज़' : 'series'}` : ''}</Text>
              </View>
              <ChevronRight size={20} color={t.textMuted} />
            </Card>
          );
        }}
      />
    </View>
  );
}

// ---- An exam: its test series and tests ----------------------------------------------------------

export function ExamTestsScreen({ categoryId, examId }: { categoryId: string; examId: string }) {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const { catalog } = useData();
  const exam: any = catalog.find(c => c.id === categoryId)?.subCategories.find(s => s.id === examId);
  const groups: { key: string; label: string; tests: MockTestItem[] }[] = useMemo(() => {
    if (!exam) return [];
    const list = (exam.subSubCategories || []).filter((ss: any) => ss.tests?.length).map((ss: any) => ({ key: ss.id, label: `${catName(ss, hi)} (${ss.tests.length})`, tests: ss.tests }));
    // Tests that sit directly under the exam (older catalogue copies repeat the series' tests there)
    const inSeries = new Set(list.flatMap((g: any) => g.tests.map((x: any) => x.id)));
    const direct = (exam.tests || []).filter((x: any) => !inSeries.has(x.id));
    if (direct.length) list.unshift({ key: '_direct', label: `${hi ? 'टेस्ट' : 'Tests'} (${direct.length})`, tests: direct });
    return list;
  }, [exam, hi]);
  const [group, setGroup] = useState<string>('');
  const active = groups.find(g => g.key === group) || groups[0];
  if (!exam) return <View style={{ flex: 1, backgroundColor: t.bg }}><Header title="" onBack={nav.pop} /><Loading /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={catName(exam, hi)} subtitle={active ? `${active.tests.length} ${hi ? 'टेस्ट' : 'tests'}` : undefined} onBack={nav.pop} />
      {groups.length > 1 ? <Segmented options={groups.map(g => ({ key: g.key, label: g.label }))} value={active?.key} onChange={setGroup} /> : null}
      <FlatList
        data={active?.tests || []}
        keyExtractor={x => x.id}
        initialNumToRender={10}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: groups.length > 1 ? 0 : 8 }}
        ListEmptyComponent={<Empty title={hi ? 'अभी कोई टेस्ट नहीं' : 'No tests yet'} />}
        renderItem={({ item }) => <TestCard test={item} />}
      />
    </View>
  );
}

// ---- One test ------------------------------------------------------------------------------------

export function TestCard({ test, subtitle }: { test: MockTestItem; subtitle?: string }) {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { ongoing, completed } = testStatus(user, test.id);
  const locked = !tierAllows(test.requiredTier, user.subscriptionTier) && completed.length === 0;
  const free = !test.requiredTier || test.requiredTier === 'None';
  const last = completed[completed.length - 1];
  const action = locked ? { label: hi ? 'अनलॉक' : 'Unlock', tone: t.accent, icon: <Lock size={14} color={t.accent} /> }
    : ongoing ? { label: hi ? 'जारी रखें' : 'Resume', tone: t.primary, icon: <Play size={14} color={t.primary} /> }
      : completed.length ? { label: hi ? 'परिणाम' : 'Result', tone: t.success, icon: <BarChart3 size={14} color={t.success} /> }
        : { label: hi ? 'शुरू करें' : 'Start', tone: t.primary, icon: <Play size={14} color={t.primary} /> };
  return (
    <Card onPress={() => nav.push({ name: 'testInfo', testId: test.id })} style={{ marginHorizontal: 16, marginTop: 10, padding: 14, ...(ongoing ? { borderColor: t.primary, borderWidth: 1.5 } : {}) }}>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <Pill text={free ? (hi ? 'फ्री' : 'FREE') : 'PRO'} tone={free ? 'success' : 'warning'} />
        {test.hasSectionalTiming ? <Pill text={hi ? 'सेक्शनल समय' : 'Sectional timing'} /> : null}
        {completed.length ? <Pill text={hi ? `${completed.length} बार दिया` : `Attempted ${completed.length}×`} tone="primary" /> : null}
      </View>
      <Text style={{ color: t.text, fontWeight: '800', fontSize: 15.5, lineHeight: 21 }}>{hi && test.titleHi ? test.titleHi : test.title}</Text>
      {subtitle ? <Text numberOfLines={1} style={{ color: t.textSoft, fontSize: 12.5, marginTop: 2 }}>{subtitle}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><FileQuestion size={14} color={t.textMuted} /><Text style={{ color: t.textSoft, fontSize: 12.5 }}>{test.questionsCount} Qs</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Clock size={14} color={t.textMuted} /><Text style={{ color: t.textSoft, fontSize: 12.5 }}>{test.durationMinutes} {hi ? 'मिनट' : 'min'}</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Target size={14} color={t.textMuted} /><Text style={{ color: t.textSoft, fontSize: 12.5 }}>{test.maxMarks}</Text></View>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: action.tone + '1A' }}>
          {action.icon}
          <Text style={{ color: action.tone, fontWeight: '800', fontSize: 12.5 }}>{action.label}</Text>
        </View>
      </View>
      {last && !ongoing ? <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 8 }}>{hi ? 'पिछला स्कोर' : 'Last score'} {round2(last.score || 0)}/{last.maxScore}</Text> : null}
    </Card>
  );
}

// ---- Test details + start -------------------------------------------------------------------------

export function TestInfoScreen({ testId }: { testId: string }) {
  const t = useTheme();
  const { hi, lang } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { catalog } = useData();
  const entry = useMemo(() => flattenTests(catalog).find(x => x.test.id === testId), [catalog, testId]);
  const test = entry?.test as MockTestItem | undefined;
  const [examLang, setExamLang] = useState<'en' | 'hi'>(lang);
  const [l1, setL1] = useState('English');
  const [l2, setL2] = useState('Hindi');
  const [roomSheet, setRoomSheet] = useState(false);
  if (!test) return <View style={{ flex: 1, backgroundColor: t.bg }}><Header title="" onBack={nav.pop} /><Empty title={hi ? 'टेस्ट नहीं मिला' : 'Test not found'} /></View>;

  const { ongoing, completed } = testStatus(user, test.id);
  const allowed = tierAllows(test.requiredTier, user.subscriptionTier) || completed.length > 0;
  const cbat = isCbatTest(test.id, catalog);
  const isCtet = test.id.toLowerCase().includes('ctet');
  const start = () => nav.push(cbat ? { name: 'cbatRun', testId: test.id } : { name: 'examRun', testId: test.id, resume: !!ongoing, lang: examLang, l1, l2 });
  const facts = [
    { icon: FileQuestion, value: String(test.questionsCount), label: hi ? 'प्रश्न' : 'Questions', color: t.primary },
    { icon: Clock, value: `${test.durationMinutes}`, label: hi ? 'मिनट' : 'Minutes', color: t.teal },
    { icon: Target, value: String(test.maxMarks), label: hi ? 'अंक' : 'Marks', color: t.violet },
    ...(test.positiveMarks != null ? [{ icon: BarChart3, value: `+${test.positiveMarks}/−${test.negativeMarks ?? 0}`, label: hi ? 'अंकन' : 'Marking', color: t.accent }] : []),
  ];
  const rules = hi
    ? [[ShieldCheck, 'परीक्षा के दौरान स्क्रीनशॉट नहीं लिए जा सकते।'], [Eye, 'ऐप से बाहर जाना नियम उल्लंघन है; 3 बार होने पर टेस्ट अपने आप सबमिट होता है।'], [CalendarClock, 'फ़ोन या ऐप बंद होने पर भी आपकी प्रगति सेव रहती है।']]
    : [[ShieldCheck, 'Screenshots are blocked during the test.'], [Eye, 'Leaving the app is a violation; after 3 the test is submitted automatically.'], [CalendarClock, 'Your progress is saved even if the phone or app closes.']];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={hi ? 'टेस्ट विवरण' : 'Test details'} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <Card>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Pill text={!test.requiredTier || test.requiredTier === 'None' ? (hi ? 'फ्री' : 'FREE') : 'PRO'} tone={!test.requiredTier || test.requiredTier === 'None' ? 'success' : 'warning'} />
            {test.hasSectionalTiming ? <Pill text={hi ? 'सेक्शनल समय' : 'Sectional timing'} /> : null}
            {cbat ? <Pill text="CBAT" tone="violet" /> : null}
          </View>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '900', marginTop: 10, lineHeight: 26 }}>{hi && test.titleHi ? test.titleHi : test.title}</Text>
          {entry ? <Text style={{ color: t.textSoft, marginTop: 4 }}>{entry.examName}{entry.seriesName ? ` › ${entry.seriesName}` : ''}</Text> : null}
          <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
            {facts.map(f => (
              <View key={f.label} style={{ flex: 1, alignItems: 'center', backgroundColor: t.cardAlt, borderRadius: 12, paddingVertical: 10 }}>
                <f.icon size={18} color={f.color} />
                <Text style={{ color: t.text, fontWeight: '900', fontSize: 15, marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>{f.value}</Text>
                <Text style={{ color: t.textSoft, fontSize: 11, fontWeight: '600' }}>{f.label}</Text>
              </View>
            ))}
          </View>
          {test.hasSectionalTiming && test.sectionalTimings?.length ? (
            <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 10 }}>{hi ? 'सेक्शन समय' : 'Section times'}: {test.sectionalTimings.map(m => `${m}m`).join(' · ')}</Text>
          ) : null}
          {test.testbookTotalUsers ? <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 6 }}>{test.testbookTotalUsers.toLocaleString('en-IN')} {hi ? 'विद्यार्थियों ने दिया' : 'students have taken it'}</Text> : null}
        </Card>

        {allowed && !cbat ? (
          <>
            <SectionTitle>{hi ? 'प्रश्नों की भाषा' : 'Question language'}</SectionTitle>
            <Tabs options={[{ key: 'en', label: 'English', icon: <Languages size={15} color={examLang === 'en' ? t.text : t.textSoft} /> }, { key: 'hi', label: 'हिन्दी' }]} value={examLang} onChange={setExamLang} />
            {isCtet ? (
              <>
                <Text style={{ color: t.textSoft, fontWeight: '700', marginTop: 14, marginBottom: 8 }}>{hi ? 'भाषा I' : 'Language I'}</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{['English', 'Hindi', 'Sanskrit'].map(x => <Chip key={x} label={x} on={l1 === x} onPress={() => setL1(x)} />)}</View>
                <Text style={{ color: t.textSoft, fontWeight: '700', marginTop: 14, marginBottom: 8 }}>{hi ? 'भाषा II' : 'Language II'}</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{['English', 'Hindi', 'Sanskrit'].map(x => <Chip key={x} label={x} on={l2 === x} onPress={() => setL2(x)} />)}</View>
              </>
            ) : null}
            <SectionTitle>{hi ? 'ध्यान दें' : 'Before you start'}</SectionTitle>
            <Card flat style={{ gap: 12 }}>
              {rules.map(([Icon, text]: any) => (
                <View key={text} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <Icon size={18} color={t.primary} style={{ marginTop: 1 }} />
                  <Text style={{ color: t.textSoft, flex: 1, lineHeight: 20 }}>{text}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <View style={{ marginTop: 18, gap: 10 }}>
          {!allowed ? (
            <Button title={hi ? 'PRO पास के साथ अनलॉक करें' : 'Unlock with PRO pass'} tone="warning" icon={<Lock size={18} color={t.dark ? '#0b111c' : '#fff'} />} onPress={() => nav.push({ name: 'pass' })} />
          ) : ongoing ? (
            <Button title={hi ? 'टेस्ट जारी रखें' : 'Resume test'} icon={<Play size={18} color={t.primaryText} />} onPress={start} />
          ) : (
            <Button title={completed.length ? (hi ? 'फिर से दें' : 'Retake test') : (hi ? 'टेस्ट शुरू करें' : 'Start test')} icon={completed.length ? <RotateCcw size={18} color={t.primaryText} /> : <Play size={18} color={t.primaryText} />} onPress={start} />
          )}
          {completed.length ? <Button outline title={hi ? 'परिणाम और समाधान' : 'Result & solutions'} icon={<BarChart3 size={18} color={t.primary} />} onPress={() => nav.push({ name: 'analysis', testId: test.id })} /> : null}
          {allowed && !cbat ? <Button soft title={hi ? 'दोस्तों के साथ दें' : 'Take with friends'} icon={<Swords size={18} color={t.primary} />} onPress={() => setRoomSheet(true)} /> : null}
          {allowed ? <DownloadButton kind="mock" id={test.id} /> : null}
        </View>

        {completed.length ? (
          <>
            <SectionTitle>{hi ? 'आपके प्रयास' : 'Your attempts'}</SectionTitle>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {[...completed].reverse().map((s, i) => {
                const pct = s.maxScore ? (s.score || 0) / s.maxScore : 0;
                return (
                  <Pressable key={s.id} onPress={() => nav.push({ name: 'analysis', testId: test.id, attemptId: s.id })}
                    style={({ pressed }) => ({ flexDirection: 'row', padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: t.border, alignItems: 'center', gap: 12, backgroundColor: pressed ? t.cardAlt : 'transparent' })}>
                    <IconTile icon={BarChart3} color={pct >= 0.6 ? t.success : pct >= 0.35 ? t.accent : t.danger} size={38} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.text, fontWeight: '800' }}>{round2(s.score || 0)} / {s.maxScore}</Text>
                      <Text style={{ color: t.textSoft, fontSize: 12.5 }}>{s.date} · {Math.round(s.accuracy || 0)}% {hi ? 'सटीकता' : 'accuracy'}</Text>
                    </View>
                    <ChevronRight size={18} color={t.textMuted} />
                  </Pressable>
                );
              })}
            </Card>
          </>
        ) : null}
      </ScrollView>
      {roomSheet ? <CreateRoomSheet testId={test.id} testTitle={test.title} onClose={() => setRoomSheet(false)} /> : null}
    </View>
  );
}

// ---- New friends room for a test ---------------------------------------------------------------

export function CreateRoomSheet({ testId, testTitle, onClose }: { testId: string; testTitle: string; onClose: () => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const [mode, setMode] = useState<'anytime' | 'live'>('anytime');
  const [hours, setHours] = useState(72);
  const [limit, setLimit] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const create = async () => {
    setBusy(true); setError('');
    try {
      const r = await api<{ code: string }>('room-create', { testId, mode, hours, maxMembers: limit });
      onClose();
      nav.push({ name: 'room', code: r.code });
      Share.share({ message: hi ? `मेरे साथ "${testTitle}" दें! रूम कोड ${r.code}: ${roomLink(r.code)}` : `Take "${testTitle}" with me! Room code ${r.code}: ${roomLink(r.code)}` }).catch(() => {});
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  };
  return (
    <Sheet title={hi ? 'दोस्तों के साथ टेस्ट' : 'Test with friends'} onClose={onClose}
      footer={<Button title={hi ? 'रूम बनाएं और बुलाएं' : 'Create room & invite'} loading={busy} onPress={create} icon={<Swords size={18} color={t.primaryText} />} />}>
      <Text style={{ color: t.textSoft, lineHeight: 20 }} numberOfLines={2}>{testTitle}</Text>
      {error ? <ErrorBox style={{ marginHorizontal: 0 }} message={error} /> : null}
      <Text style={{ color: t.text, fontWeight: '800', marginTop: 18, marginBottom: 10 }}>{hi ? 'कैसे देंगे?' : 'How will you take it?'}</Text>
      <View style={{ gap: 10 }}>
        {([
          ['anytime', Clock, hi ? 'कभी भी' : 'Anytime', hi ? 'हर कोई अपने समय पर दे; बाद में तुलना करें।' : 'Everyone takes it when they like; compare later.'],
          ['live', Radio, hi ? 'लाइव' : 'Live', hi ? 'सब लॉबी में रुकें और आपके Start दबाने पर साथ शुरू करें।' : 'Everyone waits in a lobby and starts together when you press Start.'],
        ] as const).map(([key, Icon, title, text]) => {
          const on = mode === key;
          return (
            <Pressable key={key} onPress={() => setMode(key)} style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: on ? t.primary : t.border, backgroundColor: on ? t.primarySoft : t.card }}>
              <Icon size={20} color={on ? t.primary : t.textSoft} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: '800' }}>{title}</Text>
                <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 2, lineHeight: 18 }}>{text}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {mode === 'anytime' ? (
        <>
          <Text style={{ color: t.text, fontWeight: '800', marginTop: 18, marginBottom: 10 }}>{hi ? 'रूम कितने दिन खुला रहे?' : 'Room stays open for'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ANYTIME_HOURS.map(h => <Chip key={h} label={hi ? `${h / 24} दिन` : `${h / 24} day${h > 24 ? 's' : ''}`} on={hours === h} onPress={() => setHours(h)} />)}
          </View>
        </>
      ) : null}
      <Text style={{ color: t.text, fontWeight: '800', marginTop: 18, marginBottom: 10 }}>{hi ? 'कितने दोस्त जुड़ सकते हैं?' : 'How many friends can join?'}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
        {LIMIT_PICKS.map(n => <Chip key={n} label={String(n)} on={limit === n} onPress={() => setLimit(n)} />)}
      </View>
    </Sheet>
  );
}

