import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenCapture from 'expo-screen-capture';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';
import { CheckCircle2, ChevronRight, Clock, Keyboard, RotateCcw, XCircle } from 'lucide-react-native';
import { request, friendlyError } from '../api';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useUser } from '../session';
import { useTheme } from '../theme';
import { Button, Card, Empty, ErrorBox, Field, Header, IconTile, KeyValue, ListRow, Loading, Pill, SearchBar, SectionTitle, Segmented, StatusBarFor } from '../ui';
import { newLocalId, openOffline, saveOfflineAttempt, syncOutbox } from '../offline';
import { DownloadButton } from './OfflineScreen';
import { detectExamCategory, evaluateTyping, isRrbNtpcExam, isSscCglExam, isSscChslExam, TypingCategory, TypingTest } from '../shared/typingTypes';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;

/** Best / latest attempt per typing test for this student. */
function useMyTypingAttempts() {
  const user = useUser();
  const [attempts, setAttempts] = useState<any[]>([]);
  const load = useCallback(() => {
    request('get-user-typing-attempts', { userId: user.id }).then(r => setAttempts(r.attempts || []), () => {});
  }, [user.id]);
  useEffect(load, [load]);
  return { attempts, reload: load };
}

// ---- Tab: typing exams --------------------------------------------------------------------------

export function TypingHubScreen({ embedded }: { embedded?: boolean } = {}) {
  const t = useTheme();
  const { hi, t: tr } = useI18n();
  const nav = useNav();
  const [cats, setCats] = useState<TypingCategory[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { const r = await request('get-typing-categories'); setCats((r.categories || []).filter((c: TypingCategory) => c.isActive !== false)); setError(''); }
    catch (e) { setError(friendlyError(e)); } finally { setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const list = (cats || []).filter(c => !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {embedded ? null : <Header title={tr('Typing Tests')} subtitle={cats ? (hi ? `${cats.length} परीक्षाएं` : `${cats.length} exams`) : undefined} />}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={hi ? 'परीक्षा खोजें (SSC, DSSSB, हाई कोर्ट…)' : 'Search exams (SSC, DSSSB, High Court…)'} />
        {cats ? <Text style={{ color: t.textSoft, fontSize: 13, fontWeight: '700', marginTop: 16 }}>{hi ? `${cats.length} टाइपिंग परीक्षाएं` : `${cats.length} typing exams`}</Text> : null}
      </View>
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {!cats ? (!error ? <Loading /> : null) : (
        <FlatList
          data={list}
          keyExtractor={c => c.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={<Empty title={hi ? 'कुछ नहीं मिला' : 'Nothing found'} />}
          renderItem={({ item: c }) => {
            const cfg = detectExamCategory(c);
            return (
              <Card onPress={() => nav.push({ name: 'typingCategory', categoryId: c.id })} style={{ marginHorizontal: 16, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <IconTile icon={Keyboard} color={t.teal} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>{hi && c.nameHi ? c.nameHi : c.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <Pill text={`${cfg.standardDurationMinutes} ${hi ? 'मिनट' : 'min'}`} />
                    <Pill tone="teal" text={`EN ${cfg.qualifyingSpeed.en} WPM`} />
                    <Pill tone="violet" text={`HI ${cfg.qualifyingSpeed.hi} WPM`} />
                  </View>
                </View>
                <ChevronRight size={18} color={t.textMuted} />
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

// ---- An exam: rules + passages ---------------------------------------------------------------------

export function TypingCategoryScreen({ categoryId }: { categoryId: string }) {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const [cat, setCat] = useState<TypingCategory | null>(null);
  const [tests, setTests] = useState<TypingTest[] | null>(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [shown, setShown] = useState(50);
  const { attempts, reload } = useMyTypingAttempts();
  useEffect(() => {
    request('get-typing-tests', { categoryId, light: true }).then(r => {
      setTests(r.tests || []);
      setCat((r.categories || []).find((c: TypingCategory) => c.id === categoryId) || null);
      const langs = new Set((r.tests || []).map((x: TypingTest) => x.language));
      if (!langs.has('en') && langs.has('hi')) setLang('hi');
    }, e => setError(friendlyError(e)));
  }, [categoryId]);
  useEffect(() => { if (nav.stack[nav.stack.length - 1]?.name === 'typingCategory') reload(); }, [nav.stack.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const cfg = detectExamCategory(cat || { categoryId });
  const list = (tests || []).filter(x => x.language === lang);
  const best = useMemo(() => {
    const m = new Map<string, any>();
    for (const a of attempts) { const p = m.get(a.testId); if (!p || (a.netWpm || 0) > (p.netWpm || 0)) m.set(a.testId, a); }
    return m;
  }, [attempts]);
  const counts = { en: (tests || []).filter(x => x.language === 'en').length, hi: (tests || []).filter(x => x.language === 'hi').length };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={cat ? (hi && cat.nameHi ? cat.nameHi : cat.name) : ''} onBack={nav.pop} />
      {error ? <ErrorBox message={error} /> : null}
      {!tests ? (!error ? <Loading /> : null) : (
        <FlatList
          data={list.slice(0, shown)}
          keyExtractor={x => x.id}
          onEndReached={() => setShown(s => s + 50)}
          ListHeaderComponent={
            <View style={{ padding: 12 }}>
              <Card>
                <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>{hi ? 'नियम और अंकन' : 'Rules & marking'}</Text>
                <Text style={{ color: t.textSoft, marginTop: 6, lineHeight: 20 }}>{cfg.description}</Text>
                <View style={{ marginTop: 8 }}>
                  <KeyValue label={hi ? 'समय' : 'Duration'} value={`${cfg.standardDurationMinutes} ${hi ? 'मिनट' : 'minutes'}`} />
                  <KeyValue label={hi ? 'आवश्यक स्पीड' : 'Qualifying speed'} value={`${hi ? 'अंग्रेज़ी' : 'English'} ${cfg.qualifyingSpeed.en} · ${hi ? 'हिंदी' : 'Hindi'} ${cfg.qualifyingSpeed.hi} WPM`} />
                  <KeyValue label="Backspace" value={cfg.backspaceAllowed === false ? (hi ? 'अनुमति नहीं' : 'Not allowed') : (hi ? 'अनुमति है' : 'Allowed')} />
                  <KeyValue label={hi ? 'दोबारा टाइप' : 'Retyping'} value={cfg.retypeAllowed ? (hi ? 'अनुमति है' : 'Allowed') : (hi ? 'अनुमति नहीं' : 'Not allowed')} />
                </View>
              </Card>
              <View style={{ marginTop: 12 }}>
                <Segmented options={[{ key: 'en', label: `English (${counts.en})` }, { key: 'hi', label: `हिन्दी (${counts.hi})` }]} value={lang} onChange={setLang} />
              </View>
              {lang === 'hi' ? <Text style={{ color: t.textMuted, fontSize: 12 }}>{hi ? 'हिंदी टेस्ट के लिए फ़ोन का हिंदी (यूनिकोड) कीबोर्ड इस्तेमाल करें।' : 'For Hindi tests, use your phone’s Hindi (Unicode) keyboard.'}</Text> : null}
            </View>
          }
          ListEmptyComponent={<Empty title={hi ? 'इस भाषा में कोई गद्यांश नहीं' : 'No passages in this language'} />}
          renderItem={({ item: x, index }) => {
            const b = best.get(x.id);
            return (
              <ListRow
                onPress={() => nav.push({ name: 'typingRun', testId: x.id })}
                left={<Text style={{ color: t.textMuted, width: 26, fontWeight: '700' }}>{index + 1}</Text>}
                title={hi && x.titleHi ? x.titleHi : x.title}
                subtitle={`${x.mainDurationMinutes || cfg.standardDurationMinutes} ${hi ? 'मिनट' : 'min'}${b ? ` · ${hi ? 'सर्वश्रेष्ठ' : 'Best'} ${Math.round(b.netWpm || 0)} WPM` : ''}`}
                right={b ? (b.isQualified ? <CheckCircle2 size={18} color={t.success} /> : <XCircle size={18} color={t.danger} />) : <ChevronRight size={18} color={t.textMuted} />}
              />
            );
          }}
        />
      )}
    </View>
  );
}

// ---- The typing test --------------------------------------------------------------------------------

type Phase = 'intro' | 'demo' | 'break' | 'main' | 'result';

export function TypingRunScreen({ testId, offline }: { testId: string; offline?: boolean }) {
  useKeepAwake();
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const user = useUser();
  const [test, setTest] = useState<TypingTest | null>(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('intro');
  const [timeLeft, setTimeLeft] = useState(0);
  const [typed, setTyped] = useState('');
  const [backspaces, setBackspaces] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'queued' | 'error'>('idle');
  const [catChoice, setCatChoice] = useState<string>('UR');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const started = useRef(0);
  const lastTick = useRef(Date.now());
  const typedRef = useRef('');
  typedRef.current = typed;

  useEffect(() => {
    if (offline) openOffline('typing', testId).then(p => setTest(p.data.test), (e: any) => setError(e?.message === 'EXPIRED' ? (hi ? 'यह डाउनलोड समाप्त हो गया है।' : 'This download has expired.') : friendlyError(e)));
    else request('get-typing-test-by-id', { id: testId }).then(r => setTest(r.test), e => setError(friendlyError(e)));
  }, [testId, offline, hi]);
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync('typing').catch(() => {});
    return () => { ScreenCapture.allowScreenCaptureAsync('typing').catch(() => {}); };
  }, []);

  // Landscape while the test is on screen (easier with a USB / Bluetooth keyboard, longer lines
  // to read); the scorecard and the rest of the app stay portrait.
  useEffect(() => {
    ScreenOrientation.lockAsync(phase === 'result' ? ScreenOrientation.OrientationLock.PORTRAIT_UP : ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  }, [phase]);
  useEffect(() => () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}); }, []);

  const cfg = detectExamCategory(test || undefined);
  const backspaceAllowed = test ? !(test.backspaceRule === 'DISABLED' || test.enableBackspace === false || cfg.backspaceAllowed === false) : true;
  const needsCategory = test ? (isSscCglExam(test) ? ['UR', 'OBC/EWS', 'SC/ST/Others'] : isSscChslExam(test) ? ['UR/EWS', 'OBC/SC/ST/PwBD/ESM'] : cfg.key === 'spmcil' ? ['UR', 'Reserved'] : null) : null;
  useEffect(() => { if (needsCategory && !needsCategory.includes(catChoice)) setCatChoice(needsCategory[0]); }, [needsCategory?.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const passage = phase === 'demo' ? (test?.demoPassageText || (test?.passageText || '').split(/\s+/).slice(0, 60).join(' ')) : (test?.passageText || '');
  const mainSeconds = Math.round((test?.mainDurationMinutes || cfg.standardDurationMinutes || 10) * 60);

  const startPhase = (p: Phase) => {
    if (!test) return;
    setTyped(''); typedRef.current = '';
    if (p === 'demo') setTimeLeft(Math.round((test.demoDurationMinutes || 1) * 60));
    if (p === 'break') setTimeLeft(Math.round((test.breakDurationMinutes || 0.5) * 60));
    if (p === 'main') { setTimeLeft(mainSeconds); setBackspaces(0); started.current = Date.now(); }
    lastTick.current = Date.now();
    setPhase(p);
  };

  const finishMain = useCallback(async () => {
    if (!test) return;
    const spent = Math.max(1, Math.min(mainSeconds, Math.round((Date.now() - started.current) / 1000)));
    const retype = isRrbNtpcExam(test) || Boolean(test.allowRetype);
    const res = evaluateTyping(test.passageText, typedRef.current, spent, backspaces, test.qualifyingWpm || 35, test.maxErrorPercentage || 5, retype, test, undefined, undefined, undefined, test.language, needsCategory ? catChoice : undefined);
    setResult({ ...res, timeSpent: spent, backspaceCount: backspaces });
    setPhase('result');
    setSaveState('saving');
    const attempt = {
      userId: user.id, userName: user.name, testId: test.id, testTitle: test.title, categoryName: test.categoryId,
      grossWpm: res.grossWpm, netWpm: res.netWpm, accuracyPercentage: res.accuracyPercentage, totalKeystrokes: res.totalKeystrokes,
      correctKeystrokes: res.correctKeystrokes, errorKeystrokes: res.errorKeystrokes, fullMistakes: res.fullMistakes, halfMistakes: res.halfMistakes,
      totalMistakes: res.totalMistakes, errorPercentage: res.errorPercentage, backspaceCount: backspaces, timeSpentSeconds: spent,
      allocatedTimeSeconds: mainSeconds, isQualified: res.isQualified, language: test.language, typedText: typedRef.current, targetText: test.passageText,
      allowRetype: retype, retypeCycles: res.cyclesCompleted, detailedMistakes: res.detailedMistakes,
    };
    if (offline) {
      await saveOfflineAttempt('typing', test.id, { ...attempt, localId: newLocalId(), completedAt: new Date().toISOString() });
      syncOutbox().catch(() => {});
      setSaveState('queued');
      return;
    }
    try {
      await request('save-typing-attempt', {
        userId: user.id, userName: user.name, testId: test.id, testTitle: test.title, categoryName: test.categoryId,
        grossWpm: res.grossWpm, netWpm: res.netWpm, accuracyPercentage: res.accuracyPercentage, totalKeystrokes: res.totalKeystrokes,
        correctKeystrokes: res.correctKeystrokes, errorKeystrokes: res.errorKeystrokes, fullMistakes: res.fullMistakes, halfMistakes: res.halfMistakes,
        totalMistakes: res.totalMistakes, errorPercentage: res.errorPercentage, backspaceCount: backspaces, timeSpentSeconds: spent,
        allocatedTimeSeconds: mainSeconds, isQualified: res.isQualified, language: test.language, typedText: typedRef.current, targetText: test.passageText,
        allowRetype: retype, retypeCycles: res.cyclesCompleted, detailedMistakes: res.detailedMistakes,
      });
      setSaveState('saved');
    } catch { setSaveState('error'); }
  }, [test, mainSeconds, backspaces, user.id, user.name, catChoice, needsCategory, offline]);

  // Timer
  useEffect(() => {
    if (phase !== 'demo' && phase !== 'break' && phase !== 'main') return;
    const timer = setInterval(() => {
      const now = Date.now();
      const d = Math.max(1, Math.min(30, Math.round((now - lastTick.current) / 1000)));
      lastTick.current = now;
      setTimeLeft(s => Math.max(0, s - d));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);
  useEffect(() => {
    if (timeLeft > 0) return;
    if (phase === 'demo') startPhase('break');
    else if (phase === 'break') startPhase('main');
    else if (phase === 'main') finishMain();
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    nav.setBackBlocker(() => { if (phase === 'main' || phase === 'demo') { setConfirmSubmit(true); return true; } return false; });
    return () => nav.setBackBlocker(null);
  });

  const onType = (next: string) => {
    const prev = typedRef.current;
    if (next.length < prev.length) {
      if (!backspaceAllowed) return; // backspace not allowed in this exam
      if (phase === 'main') setBackspaces(b => b + (prev.length - next.length));
    } else if (next.length - prev.length > 15) {
      return; // pasted text is ignored
    }
    setTyped(next);
  };

  if (error) return <View style={{ flex: 1, backgroundColor: t.bg }}><Header title="" onBack={nav.pop} /><ErrorBox message={error} /></View>;
  if (!test) return <View style={{ flex: 1, backgroundColor: t.bg }}><Header title="" onBack={nav.pop} /><Loading /></View>;

  if (phase === 'intro') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Header title={hi && test.titleHi ? test.titleHi : test.title} subtitle={cfg.name} onBack={nav.pop} />
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
          <Card>
            <KeyValue label={hi ? 'भाषा' : 'Language'} value={test.language === 'hi' ? 'हिन्दी' : 'English'} />
            <KeyValue label={hi ? 'डेमो' : 'Demo'} value={`${test.demoDurationMinutes || 1} ${hi ? 'मिनट' : 'min'}`} />
            <KeyValue label={hi ? 'मुख्य टेस्ट' : 'Main test'} value={`${Math.round(mainSeconds / 60)} ${hi ? 'मिनट' : 'min'}`} />
            <KeyValue label={hi ? 'आवश्यक स्पीड' : 'Qualifying speed'} value={`${test.qualifyingWpm || cfg.qualifyingSpeed[test.language]} WPM`} />
            <KeyValue label="Backspace" value={backspaceAllowed ? (hi ? 'अनुमति है' : 'Allowed') : (hi ? 'अनुमति नहीं' : 'Not allowed')} />
          </Card>
          {needsCategory ? (
            <>
              <SectionTitle>{hi ? 'आपकी श्रेणी' : 'Your category'}</SectionTitle>
              <Segmented options={needsCategory.map(c => ({ key: c, label: c }))} value={catChoice} onChange={setCatChoice} />
              <Text style={{ color: t.textMuted, fontSize: 12 }}>{hi ? 'अनुमत गलतियां श्रेणी पर निर्भर करती हैं।' : 'The allowed mistakes depend on your category.'}</Text>
            </>
          ) : null}
          <Card style={{ marginTop: 14, backgroundColor: t.cardAlt }}>
            <Text style={{ color: t.textSoft, lineHeight: 20 }}>
              {hi ? '• पहले छोटा डेमो, फिर ब्रेक, फिर मुख्य समयबद्ध टेस्ट।\n• सुझाव और ऑटो-करेक्ट बंद रखें; पेस्ट किया गया टेक्स्ट नहीं लिया जाता।\n• समय खत्म होते ही परिणाम मिलता है।'
                : '• A short demo, a break, then the main timed test.\n• Keep suggestions and autocorrect off; pasted text is ignored.\n• Your scorecard appears when the time ends.'}
              {test.language === 'hi' ? (hi ? '\n• फ़ोन का हिंदी (यूनिकोड) कीबोर्ड इस्तेमाल करें।' : '\n• Use your phone’s Hindi (Unicode) keyboard.') : ''}
            </Text>
          </Card>
          <Button style={{ marginTop: 16 }} title={hi ? 'डेमो शुरू करें' : 'Start demo'} onPress={() => startPhase('demo')} />
          <Button style={{ marginTop: 10 }} outline title={hi ? 'सीधे मुख्य टेस्ट' : 'Skip to the main test'} onPress={() => startPhase('main')} />
          {!offline ? <View style={{ marginTop: 10 }}><DownloadButton kind="typing" id={test.id} /></View> : null}
        </ScrollView>
      </View>
    );
  }

  if (phase === 'break') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Clock size={40} color={t.primary} />
        <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', marginTop: 10 }}>{hi ? 'ब्रेक' : 'Break'}</Text>
        <Text style={{ color: t.textSoft, marginTop: 6 }}>{hi ? 'मुख्य टेस्ट शुरू होगा' : 'The main test starts in'} {mmss(timeLeft)}</Text>
        <Button style={{ marginTop: 18 }} title={hi ? 'अभी शुरू करें' : 'Start now'} onPress={() => startPhase('main')} />
      </View>
    );
  }

  if (phase === 'result' && result) return <TypingResult test={test} result={result} saveState={saveState} onRetake={() => { setResult(null); setSaveState('idle'); setPhase('intro'); }} />;

  // demo / main typing screen
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TypingDesk
        title={phase === 'demo' ? (hi ? 'डेमो' : 'Demo') : test.title}
        passage={passage} typed={typed} onType={onType} timeLeft={timeLeft}
        highlight={test.highlightAllowed !== false} english={test.language === 'en'}
        note={phase === 'main' && !backspaceAllowed ? (hi ? 'बैकस्पेस बंद' : 'No backspace') : ''}
      />
      <Modal visible={confirmSubmit} transparent animationType="fade" onRequestClose={() => setConfirmSubmit(false)}>
        <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: 24 }}>
          <Card>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{hi ? 'टेस्ट छोड़ें?' : 'Leave the test?'}</Text>
            <Text style={{ color: t.textSoft, marginTop: 8, lineHeight: 20 }}>
              {phase === 'main'
                ? (hi ? 'टेस्ट समय पूरा होने पर अपने आप सबमिट होता है। अभी छोड़ने पर यह प्रयास सेव नहीं होगा।' : 'The test is submitted by itself when the time is up. If you leave now, this attempt is not saved.')
                : (hi ? 'डेमो समय पूरा होने पर अपने आप खत्म होता है।' : 'The demo ends by itself when its time is up.')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button style={{ flex: 1 }} title={hi ? 'जारी रखें' : 'Continue'} onPress={() => setConfirmSubmit(false)} />
              <Button style={{ flex: 1 }} outline tone="danger" title={hi ? 'टेस्ट छोड़ें' : 'Leave test'} onPress={() => { setConfirmSubmit(false); nav.pop(); }} />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

/**
 * The passage and the typing box. Landscape (the usual case, see TypingRunScreen): side by side,
 * both full height, with the timer, word count and submit in one slim bar, so a USB / Bluetooth
 * keyboard user sees everything and the phone's own keyboard never covers the passage. Portrait
 * (a tablet or phone that keeps portrait): passage above, typing box below.
 * The passage scrolls along with the typing so the current word stays in view.
 */
function TypingDesk({ title, passage, typed, onType, timeLeft, highlight, english, note }: {
  title: string; passage: string; typed: string; onType: (v: string) => void; timeLeft: number;
  highlight: boolean; english: boolean; note: string;
}) {
  const t = useTheme();
  const { hi } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const scroller = useRef<ScrollView>(null);
  const [box, setBox] = useState({ view: 0, content: 0 });

  const typedWords = typed.trim().split(/\s+/).filter(Boolean).length;
  const words = passage.split(/(\s+)/);
  let wordIdx = 0;

  // Keep the current place about a third of the way down the passage panel
  const progress = passage.length ? Math.min(1, typed.length / passage.length) : 0;
  useEffect(() => {
    if (!box.view || box.content <= box.view) return;
    const y = Math.max(0, Math.min(box.content - box.view, progress * box.content - box.view / 3));
    scroller.current?.scrollTo({ y, animated: true });
  }, [Math.round(progress * 200), box.view, box.content]); // eslint-disable-line react-hooks/exhaustive-deps

  const fontSize = landscape ? 18 : 17;
  const timer = (
    <View style={{ backgroundColor: timeLeft <= 30 ? '#dc2626' : 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontVariant: ['tabular-nums'] }}>{mmss(timeLeft)}</Text>
    </View>
  );
  const count = <Text style={{ color: landscape ? t.heroText : t.textSoft, opacity: landscape ? 0.85 : 1 }}>{hi ? 'शब्द' : 'Words'}: {typedWords}{note ? ` · ${note}` : ''}</Text>;

  const passagePanel = (
    <ScrollView ref={scroller} onLayout={e => { const v = e.nativeEvent.layout.height; setBox(b => (b.view === v ? b : { ...b, view: v })); }}
      onContentSizeChange={(_, h) => setBox(b => (b.content === h ? b : { ...b, content: h }))}
      style={landscape ? { flex: 1, backgroundColor: t.card, borderRightWidth: 1, borderRightColor: t.border } : { maxHeight: '42%', backgroundColor: t.card, borderBottomWidth: 1, borderBottomColor: t.border }}
      contentContainerStyle={{ padding: 14 }}>
      <Text selectable={false} style={{ color: t.text, fontSize, lineHeight: fontSize * 1.6 }}>
        {words.map((w, i) => {
          if (/^\s+$/.test(w)) return w;
          const idx = wordIdx++;
          const current = highlight && idx === typedWords - (typed.endsWith(' ') || typed.endsWith('\n') ? 0 : 1);
          return <Text key={i} style={current ? { backgroundColor: t.primarySoft, color: t.primary, fontWeight: '700' } : undefined}>{w}</Text>;
        })}
      </Text>
    </ScrollView>
  );
  const input = (
    <TextInput
      value={typed}
      onChangeText={onType}
      multiline
      autoFocus
      autoCorrect={false}
      autoCapitalize="none"
      spellCheck={false}
      autoComplete="off"
      contextMenuHidden
      importantForAutofill="no"
      // Android's full-screen typing box in landscape would hide the passage
      disableFullscreenUI
      keyboardType={english ? 'visible-password' : 'default'}
      placeholder={hi ? 'यहां टाइप करें…' : 'Start typing here…'}
      placeholderTextColor={t.textMuted}
      style={{ flex: 1, padding: 14, fontSize, lineHeight: fontSize * 1.5, color: t.text, textAlignVertical: 'top', backgroundColor: t.bg }}
    />
  );

  if (landscape) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: t.hero, paddingTop: insets.top, paddingLeft: 12 + insets.left, paddingRight: 12 + insets.right }}>
          <StatusBarFor color={t.hero} />
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 46, gap: 12 }}>
            <Text style={{ flex: 1, color: t.heroText, fontWeight: '800' }} numberOfLines={1}>{title}</Text>
            {count}
            {timer}
          </View>
        </View>
        <View style={{ flex: 1, flexDirection: 'row', paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: insets.bottom }}>
          {passagePanel}
          {input}
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: t.hero, paddingTop: insets.top, paddingHorizontal: 12 }}>
        <StatusBarFor color={t.hero} />
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 50, gap: 10 }}>
          <Text style={{ flex: 1, color: t.heroText, fontWeight: '800' }} numberOfLines={1}>{title}</Text>
          {timer}
        </View>
      </View>
      {passagePanel}
      {input}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingBottom: 10 + insets.bottom, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border }}>
        <View style={{ flex: 1 }}>{count}</View>
      </View>
    </View>
  );
}

function TypingResult({ test, result: r, saveState, onRetake }: { test: TypingTest; result: any; saveState: string; onRetake: () => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const ce = r.categoryEvaluation || {};
  const mistakes = (r.detailedMistakes || []).filter((m: any) => m.type !== 'CORRECT').slice(0, 60);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={hi ? 'स्कोरकार्ड' : 'Scorecard'} subtitle={test.title} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 + insets.bottom }}>
        <Card style={{ alignItems: 'center', borderColor: r.isQualified ? t.success : t.danger }}>
          {r.isQualified ? <CheckCircle2 size={36} color={t.success} /> : <XCircle size={36} color={t.danger} />}
          <Text style={{ color: r.isQualified ? t.success : t.danger, fontSize: 20, fontWeight: '900', marginTop: 6 }}>{r.isQualified ? (hi ? 'क्वालिफाइड' : 'Qualified') : (hi ? 'क्वालिफाई नहीं' : 'Not qualified')}</Text>
          {ce.qualificationReason ? <Text style={{ color: t.textSoft, textAlign: 'center', marginTop: 4 }}>{ce.qualificationReason}</Text> : null}
          <View style={{ flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' }}>
            {[[Math.round(r.netWpm * 10) / 10, hi ? 'नेट स्पीड' : 'Net speed'], [Math.round(r.grossWpm * 10) / 10, hi ? 'ग्रॉस स्पीड' : 'Gross speed'], [`${Math.round(r.accuracyPercentage * 10) / 10}%`, hi ? 'शुद्धता' : 'Accuracy']].map(([v, l]) => (
              <View key={String(l)} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ color: t.text, fontSize: 22, fontWeight: '900' }}>{v as any}</Text>
                <Text style={{ color: t.textSoft, fontSize: 12 }}>{l as string}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 12 }} />
          <Pill text={saveState === 'queued' ? (hi ? 'इंटरनेट आने पर अपलोड होगा' : 'Uploads when you are online') : saveState === 'saved' ? (hi ? 'आपके खाते में सेव' : 'Saved to your account') : saveState === 'saving' ? (hi ? 'सेव हो रहा है…' : 'Saving…') : saveState === 'error' ? (hi ? 'सेव नहीं हुआ (इंटरनेट)' : 'Not saved (internet)') : ''} tone={saveState === 'saved' ? 'success' : saveState === 'error' ? 'danger' : 'neutral'} />
        </Card>
        <SectionTitle>{hi ? 'विवरण' : 'Details'}</SectionTitle>
        <Card>
          <KeyValue label={hi ? 'मूल्यांकन' : 'Evaluation'} value={ce.categoryName || ''} />
          {ce.marksObtained != null ? <KeyValue label={hi ? 'अंक' : 'Marks'} value={`${ce.marksObtained}${ce.maxMarks ? ` / ${ce.maxMarks}` : ''}`} /> : null}
          <KeyValue label={hi ? 'पूर्ण गलतियां' : 'Full mistakes'} value={r.fullMistakes} />
          <KeyValue label={hi ? 'आधी गलतियां' : 'Half mistakes'} value={r.halfMistakes} />
          <KeyValue label={hi ? 'त्रुटि %' : 'Error %'} value={`${Math.round(r.errorPercentage * 100) / 100}%`} />
          {ce.permissibleMistakes != null ? <KeyValue label={hi ? 'अनुमत गलतियां' : 'Permissible mistakes'} value={ce.permissibleMistakes} /> : null}
          <KeyValue label={hi ? 'टाइप किए शब्द' : 'Words typed'} value={r.totalWordsTyped} />
          <KeyValue label={hi ? 'कीस्ट्रोक' : 'Keystrokes'} value={r.totalKeystrokes} />
          <KeyValue label="Backspace" value={r.backspaceCount ?? '—'} />
          <KeyValue label={hi ? 'समय' : 'Time'} value={mmss(r.timeSpent || 0)} />
        </Card>
        {mistakes.length ? (
          <>
            <SectionTitle>{hi ? 'गलतियां' : 'Mistakes'} ({mistakes.length})</SectionTitle>
            <Card style={{ paddingVertical: 4 }}>
              {mistakes.map((m: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: t.border, gap: 8 }}>
                  <Text style={{ color: t.success, flex: 1 }} numberOfLines={1}>{m.originalWord || '—'}</Text>
                  <Text style={{ color: t.danger, flex: 1 }} numberOfLines={1}>{m.typedWord || (hi ? '(छूटा)' : '(missed)')}</Text>
                  <Pill text={m.type === 'HALF_MISTAKE' ? (hi ? 'आधी' : 'Half') : m.type === 'OMISSION' ? (hi ? 'छूटा' : 'Missed') : m.type === 'EXTRA' ? (hi ? 'अतिरिक्त' : 'Extra') : (hi ? 'पूर्ण' : 'Full')} tone={m.type === 'HALF_MISTAKE' ? 'warning' : 'danger'} />
                </View>
              ))}
            </Card>
          </>
        ) : null}
        <Button style={{ marginTop: 18 }} title={hi ? 'फिर से दें' : 'Retake'} icon={<RotateCcw size={18} color={t.primaryText} />} onPress={onRetake} />
      </ScrollView>
    </View>
  );
}
