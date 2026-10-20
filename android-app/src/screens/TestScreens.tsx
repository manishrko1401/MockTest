import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { BarChart3, ChevronRight, Clock, FileQuestion, Lock, Play, RotateCcw, Search, Trophy } from 'lucide-react-native';
import { useData, flattenTests } from '../data';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useUser } from '../session';
import { useTheme } from '../theme';
import { Button, Card, Empty, Field, Header, KeyValue, Loading, Pill, SectionTitle, Segmented } from '../ui';
import type { MockTestItem, MockUser, TestCategory } from '../shared/webTypes';
import { isCbatTest } from '../shared/examScoring';
import { DownloadButton } from './OfflineScreen';

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
const countTests = (c: TestCategory) => (c.subCategories || []).reduce((n, s: any) => n + (s.tests?.length || 0) + (s.subSubCategories || []).reduce((m: number, ss: any) => m + (ss.tests?.length || 0), 0), 0);

// ---- Tab: categories + search -------------------------------------------------------------------

export function TestsScreen() {
  const t = useTheme();
  const { t: tr, hi } = useI18n();
  const nav = useNav();
  const { catalog, ready, refresh, refreshing } = useData();
  const [search, setSearch] = useState('');
  const all = useMemo(() => flattenTests(catalog), [catalog]);
  const q = search.trim().toLowerCase();
  const results = useMemo(() => (q.length < 2 ? [] : all.filter(x => x.test.title.toLowerCase().includes(q) || x.examName.toLowerCase().includes(q)).slice(0, 60)), [all, q]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={tr('Test Series')} subtitle={hi ? `${all.length} टेस्ट` : `${all.length} tests`} />
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <Field value={search} onChangeText={setSearch} placeholder={hi ? 'परीक्षा या टेस्ट खोजें' : 'Search exams or tests'} />
      </View>
      {q.length >= 2 ? (
        <FlatList
          key="search"
          data={results}
          keyExtractor={x => x.test.id}
          ListEmptyComponent={<Empty title={hi ? 'कुछ नहीं मिला' : 'Nothing found'} icon={<Search size={36} color={t.textMuted} />} />}
          renderItem={({ item: x }) => <TestCard test={x.test} subtitle={`${x.examName}${x.seriesName ? ` › ${x.seriesName}` : ''}`} />}
        />
      ) : !ready ? <Loading /> : (
        <FlatList
          key="categories"
          data={catalog}
          keyExtractor={c => c.id}
          numColumns={2}
          contentContainerStyle={{ padding: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={refresh} />}
          renderItem={({ item: c }) => (
            <Pressable onPress={() => nav.push({ name: 'category', categoryId: c.id })} style={{ flex: 1, margin: 6 }}>
              <Card style={{ alignItems: 'center', minHeight: 140, justifyContent: 'center' }}>
                {c.logoUrl ? <Image source={{ uri: c.logoUrl }} style={{ width: 52, height: 52, borderRadius: 12 }} resizeMode="contain" /> : <Trophy size={40} color={t.primary} />}
                <Text numberOfLines={2} style={{ color: t.text, fontWeight: '700', textAlign: 'center', marginTop: 10 }}>{catName(c, hi)}</Text>
                <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 2 }}>{hi ? `${c.subCategories?.length || 0} परीक्षाएं` : `${c.subCategories?.length || 0} exams`} · {countTests(c)}</Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </View>
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
      <Header title={catName(cat, hi)} subtitle={hi ? `${cat.subCategories.length} परीक्षाएं` : `${cat.subCategories.length} exams`} onBack={nav.pop} />
      <FlatList
        data={cat.subCategories}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        ListEmptyComponent={<Empty title={hi ? 'अभी कोई परीक्षा नहीं' : 'No exams yet'} />}
        renderItem={({ item: s }: any) => {
          const n = (s.tests?.length || 0) + (s.subSubCategories || []).reduce((m: number, ss: any) => m + (ss.tests?.length || 0), 0);
          return (
            <Pressable onPress={() => nav.push({ name: 'exam', categoryId, examId: s.id })}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {cat.logoUrl ? <Image source={{ uri: cat.logoUrl }} style={{ width: 40, height: 40, borderRadius: 10 }} resizeMode="contain" /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: '700', fontSize: 15 }}>{catName(s, hi)}</Text>
                  <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 2 }}>{hi ? `${n} मॉक टेस्ट` : `${n} mock tests`}{s.subSubCategories?.length ? ` · ${s.subSubCategories.length} ${hi ? 'सीरीज़' : 'series'}` : ''}</Text>
                </View>
                <ChevronRight size={18} color={t.textMuted} />
              </Card>
            </Pressable>
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
    if (exam.tests?.length) list.unshift({ key: '_direct', label: `${hi ? 'टेस्ट' : 'Tests'} (${exam.tests.length})`, tests: exam.tests });
    return list;
  }, [exam, hi]);
  const [group, setGroup] = useState<string>('');
  const active = groups.find(g => g.key === group) || groups[0];
  if (!exam) return <View style={{ flex: 1, backgroundColor: t.bg }}><Header title="" onBack={nav.pop} /><Loading /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={catName(exam, hi)} onBack={nav.pop} />
      {groups.length > 1 ? <Segmented options={groups.map(g => ({ key: g.key, label: g.label }))} value={active?.key} onChange={setGroup} /> : null}
      <FlatList
        data={active?.tests || []}
        keyExtractor={x => x.id}
        initialNumToRender={12}
        ListEmptyComponent={<Empty title={hi ? 'अभी कोई टेस्ट नहीं' : 'No tests yet'} />}
        renderItem={({ item }) => <TestCard test={item} />}
      />
    </View>
  );
}

// ---- One test row ----------------------------------------------------------------------------------

export function TestCard({ test, subtitle }: { test: MockTestItem; subtitle?: string }) {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { ongoing, completed } = testStatus(user, test.id);
  const locked = !tierAllows(test.requiredTier, user.subscriptionTier) && completed.length === 0;
  const free = !test.requiredTier || test.requiredTier === 'None';
  return (
    <Pressable onPress={() => nav.push({ name: 'testInfo', testId: test.id })}
      style={({ pressed }) => ({ marginHorizontal: 12, marginTop: 10, backgroundColor: pressed ? t.cardAlt : t.card, borderRadius: 14, borderWidth: 1, borderColor: ongoing ? t.primary : t.border, padding: 14 })}>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
        <Pill text={free ? (hi ? 'फ्री' : 'FREE') : 'PRO'} tone={free ? 'success' : 'warning'} />
        {test.hasSectionalTiming ? <Pill text={hi ? 'सेक्शनल समय' : 'Sectional timing'} /> : null}
        {completed.length ? <Pill text={hi ? `${completed.length} बार दिया` : `Attempted ${completed.length}×`} tone="primary" /> : null}
      </View>
      <Text style={{ color: t.text, fontWeight: '700', fontSize: 15 }}>{hi && test.titleHi ? test.titleHi : test.title}</Text>
      {subtitle ? <Text numberOfLines={1} style={{ color: t.textSoft, fontSize: 12, marginTop: 2 }}>{subtitle}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><FileQuestion size={14} color={t.textMuted} /><Text style={{ color: t.textSoft, fontSize: 12 }}>{test.questionsCount} Qs</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Clock size={14} color={t.textMuted} /><Text style={{ color: t.textSoft, fontSize: 12 }}>{test.durationMinutes} {hi ? 'मिनट' : 'min'}</Text></View>
        <Text style={{ color: t.textSoft, fontSize: 12 }}>{test.maxMarks} {hi ? 'अंक' : 'marks'}</Text>
        <View style={{ flex: 1 }} />
        {locked ? <Lock size={18} color={t.warning} />
          : ongoing ? <Text style={{ color: t.primary, fontWeight: '800' }}>{hi ? 'जारी रखें' : 'Resume'}</Text>
            : completed.length ? <BarChart3 size={18} color={t.primary} />
              : <Play size={18} color={t.primary} />}
      </View>
    </Pressable>
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
  if (!test) return <View style={{ flex: 1, backgroundColor: t.bg }}><Header title="" onBack={nav.pop} /><Empty title={hi ? 'टेस्ट नहीं मिला' : 'Test not found'} /></View>;

  const { ongoing, completed } = testStatus(user, test.id);
  const allowed = tierAllows(test.requiredTier, user.subscriptionTier) || completed.length > 0;
  const cbat = isCbatTest(test.id, catalog);
  const isCtet = test.id.toLowerCase().includes('ctet');
  const start = () => nav.push(cbat ? { name: 'cbatRun', testId: test.id } : { name: 'examRun', testId: test.id, resume: !!ongoing, lang: examLang, l1, l2 });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={hi && test.titleHi ? test.titleHi : test.title} subtitle={entry ? `${entry.examName}${entry.seriesName ? ` › ${entry.seriesName}` : ''}` : undefined} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
        <Card>
          <KeyValue label={hi ? 'प्रश्न' : 'Questions'} value={test.questionsCount} />
          <KeyValue label={hi ? 'समय' : 'Duration'} value={`${test.durationMinutes} ${hi ? 'मिनट' : 'minutes'}`} />
          <KeyValue label={hi ? 'कुल अंक' : 'Total marks'} value={test.maxMarks} />
          {test.positiveMarks != null ? <KeyValue label={hi ? 'अंकन' : 'Marking'} value={`+${test.positiveMarks} / −${test.negativeMarks ?? 0}`} /> : null}
          {test.hasSectionalTiming ? <KeyValue label={hi ? 'सेक्शनल समय' : 'Sectional timing'} value={(test.sectionalTimings || []).map(m => `${m}m`).join(', ') || (hi ? 'हां' : 'Yes')} /> : null}
          {test.testbookTotalUsers ? <KeyValue label={hi ? 'कुल प्रतिभागी' : 'Students'} value={test.testbookTotalUsers.toLocaleString('en-IN')} /> : null}
        </Card>

        {allowed && !cbat ? (
          <>
            <SectionTitle>{hi ? 'प्रश्नों की भाषा' : 'Question language'}</SectionTitle>
            <Segmented options={[{ key: 'en', label: 'English' }, { key: 'hi', label: 'हिन्दी' }]} value={examLang} onChange={setExamLang} />
            {isCtet ? (
              <>
                <SectionTitle>{hi ? 'भाषा I और II' : 'Language I and II'}</SectionTitle>
                <Segmented options={['English', 'Hindi', 'Sanskrit'].map(x => ({ key: x, label: `I: ${x}` }))} value={l1} onChange={setL1} />
                <Segmented options={['English', 'Hindi', 'Sanskrit'].map(x => ({ key: x, label: `II: ${x}` }))} value={l2} onChange={setL2} />
              </>
            ) : null}
            <Card style={{ marginTop: 12, backgroundColor: t.cardAlt }}>
              <Text style={{ color: t.textSoft, fontSize: 13, lineHeight: 19 }}>
                {hi
                  ? '• परीक्षा के दौरान स्क्रीनशॉट नहीं लिए जा सकते।\n• ऐप से बाहर जाना नियम उल्लंघन माना जाता है; 3 बार होने पर टेस्ट अपने आप सबमिट हो जाता है।\n• फ़ोन बंद होने या ऐप बंद होने पर भी आपकी प्रगति सेव रहती है।'
                  : '• Screenshots are blocked during the test.\n• Leaving the app counts as a violation; after 3 the test is submitted automatically.\n• Your progress is saved even if the phone or app closes.'}
              </Text>
            </Card>
          </>
        ) : null}

        <View style={{ marginTop: 16, gap: 10 }}>
          {!allowed ? (
            <Button title={hi ? 'PRO पास के साथ अनलॉक करें' : 'Unlock with PRO pass'} tone="warning" icon={<Lock size={18} color="#fff" />} onPress={() => nav.push({ name: 'pass' })} />
          ) : ongoing ? (
            <Button title={hi ? 'टेस्ट जारी रखें' : 'Resume test'} icon={<Play size={18} color={t.primaryText} />} onPress={start} />
          ) : (
            <Button title={completed.length ? (hi ? 'फिर से दें' : 'Retake test') : (hi ? 'टेस्ट शुरू करें' : 'Start test')} icon={completed.length ? <RotateCcw size={18} color={t.primaryText} /> : <Play size={18} color={t.primaryText} />} onPress={start} />
          )}
          {completed.length ? <Button outline title={hi ? 'परिणाम और समाधान' : 'Result & solutions'} icon={<BarChart3 size={18} color={t.primary} />} onPress={() => nav.push({ name: 'analysis', testId: test.id })} /> : null}
          {allowed ? <DownloadButton kind="mock" id={test.id} /> : null}
        </View>

        {completed.length ? (
          <>
            <SectionTitle>{hi ? 'आपके प्रयास' : 'Your attempts'}</SectionTitle>
            <Card style={{ paddingVertical: 4 }}>
              {completed.map((s, i) => (
                <Pressable key={s.id} onPress={() => nav.push({ name: 'analysis', testId: test.id, attemptId: s.id })} style={{ flexDirection: 'row', paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border, alignItems: 'center' }}>
                  <Text style={{ color: t.text, flex: 1 }}>{s.date}</Text>
                  <Text style={{ color: t.primary, fontWeight: '800' }}>{Math.round((s.score || 0) * 100) / 100}/{s.maxScore}</Text>
                  <ChevronRight size={16} color={t.textMuted} />
                </Pressable>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
