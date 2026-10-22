import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenCapture from 'expo-screen-capture';
import { useKeepAwake } from 'expo-keep-awake';
import { Coffee, Lock, X } from 'lucide-react-native';
import { request, friendlyError } from '../api';
import AutoImage from '../AutoImage';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useSession, useUser } from '../session';
import { useTheme } from '../theme';
import { Button, Card, StatusBarFor } from '../ui';
import { buildCbatBatteriesFromCustomQuestions, CbatBattery, CbatQuestion } from '../shared/cbatData';
import { newLocalId, openOffline, saveOfflineAttempt, syncOutbox } from '../offline';

// -----------------------------------------------------------------------------
// RRB NTPC CBAT (Station Master psycho test): five batteries one after another, each with its
// own timer, locked once finished, with a short rest between. Questions come from the test's
// uploaded questions (the website's own builder); answers are sent like the website and the
// server scores them. Progress is kept on the phone.
// -----------------------------------------------------------------------------

type Stage = { kind: 'intro' | 'run' | 'rest'; battery: number };
type Saved = { stage: Stage; part: number; timeLeft: number; answers: Record<string, string>; savedAt: number };
const key = (u: string, t: string) => `cbat_progress_${u}_${t}`;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const REST_SECONDS = 60;

export default function CbatRunScreen({ testId, offline }: { testId: string; offline?: boolean }) {
  useKeepAwake();
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { refreshUser } = useSession();
  const insets = useSafeAreaInsets();
  const [batteries, setBatteries] = useState<CbatBattery[] | null>(null);
  const [paperTitle, setPaperTitle] = useState('');
  const [error, setError] = useState('');
  const [stage, setStage] = useState<Stage>({ kind: 'intro', battery: 0 });
  const [part, setPart] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const lastTick = useRef(Date.now());

  // ---- Load ----
  const load = useCallback(async () => {
    setError('');
    try {
      const pkg = offline ? await openOffline('mock', testId) : null;
      if (!pkg) {
        const access = await request('test-access', { testId });
        if (access.locked) throw new Error(hi ? 'यह एक PRO टेस्ट है। शुरू करने के लिए PRO पास अनलॉक करें।' : 'This is a PRO test. Unlock the PRO pass to start it.');
        if (access.exists && !access.hasQuestions) throw new Error(hi ? 'इस टेस्ट के प्रश्न अभी जोड़े नहीं गए हैं।' : "Questions for this test haven't been added yet.");
      }
      const qs = pkg ? { ...pkg.data.customQs, title: pkg.title } : await request('get-custom-questions', { testId });
      if (!qs.questions?.length) throw new Error(hi ? 'इस टेस्ट के प्रश्न अभी जोड़े नहीं गए हैं।' : "Questions for this test haven't been added yet.");
      const b = buildCbatBatteriesFromCustomQuestions(qs.questions, qs.sectionalTimings, qs.title || testId, qs.durationMinutes);
      setBatteries(b);
      setPaperTitle(qs.title || '');
      const saved: Saved | null = await AsyncStorage.getItem(key(user.id, testId)).then(r => (r ? JSON.parse(r) : null)).catch(() => null);
      if (saved && saved.stage.battery < b.length) {
        setStage(saved.stage); setPart(saved.part || 0); setTimeLeft(saved.timeLeft); setAnswers(saved.answers || {});
      } else {
        setTimeLeft(b[0].durationSeconds);
      }
    } catch (e: any) { setError(e?.message === 'EXPIRED' ? (hi ? 'यह डाउनलोड समाप्त हो गया है।' : 'This download has expired.') : friendlyError(e)); }
  }, [testId, user.id, hi, offline]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync('cbat').catch(() => {});
    return () => { ScreenCapture.allowScreenCaptureAsync('cbat').catch(() => {}); };
  }, []);

  // ---- Save progress on the phone ----
  useEffect(() => {
    if (!batteries || submitting) return;
    const s: Saved = { stage, part, timeLeft, answers, savedAt: Date.now() };
    AsyncStorage.setItem(key(user.id, testId), JSON.stringify(s)).catch(() => {});
  }, [stage, part, Math.floor(timeLeft / 5), answers, batteries, submitting, testId, user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Submit (server scores it) ----
  const submit = useCallback(async () => {
    if (!batteries) return;
    setSubmitting(true);
    const responses: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number }> = {};
    let correct = 0, attempted = 0, total = 0;
    batteries.forEach(b => b.chunks.forEach(chunk => chunk.forEach(q => {
      total++;
      const a = answers[q.id];
      if (a !== undefined) { attempted++; if (a === q.correctAnswer) correct++; }
      const idx = q.normalOptions.indexOf(a ?? '');
      responses[q.id] = { selectedOptionIndex: idx >= 0 ? idx : null, elapsedSeconds: 15 };
    })));
    const attempt = {
      userId: user.id, testId, title: paperTitle ? `Station Master CBAT - ${paperTitle}` : 'Station Master CBAT (Psycho Test)',
      score: correct, maxScore: total, accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
      durationSeconds: batteries.reduce((s, b) => s + b.durationSeconds, 0), violations: 0, responses,
    };
    if (offline) {
      await saveOfflineAttempt('mock', testId, { ...attempt, localId: newLocalId(), completedAt: new Date().toISOString() });
      await AsyncStorage.removeItem(key(user.id, testId)).catch(() => {});
      syncOutbox().catch(() => {});
      nav.replace({ name: 'analysis', testId, offline: true });
      return;
    }
    try {
      await request('add-attempt', {
        userId: user.id, testId, title: paperTitle ? `Station Master CBAT - ${paperTitle}` : 'Station Master CBAT (Psycho Test)',
        score: correct, maxScore: total, accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
        durationSeconds: batteries.reduce((s, b) => s + b.durationSeconds, 0), violations: 0, responses, source: 'app',
      });
      await AsyncStorage.removeItem(key(user.id, testId)).catch(() => {});
      await refreshUser();
      nav.replace({ name: 'analysis', testId });
    } catch (e) {
      setSubmitting(false);
      setError(`${hi ? 'सबमिट नहीं हो सका' : "Couldn't submit"}: ${friendlyError(e)}`);
    }
  }, [batteries, answers, testId, user.id, paperTitle, refreshUser, nav, hi, offline]);

  const finishBattery = useCallback(() => {
    if (!batteries) return;
    const next = stage.battery + 1;
    if (next >= batteries.length) { submit(); return; }
    setStage({ kind: 'rest', battery: next });
    setPart(0);
    setTimeLeft(REST_SECONDS);
  }, [batteries, stage.battery, submit]);

  // ---- Timer (wall clock, so pauses in rendering don't drift it) ----
  useEffect(() => {
    if (!batteries || submitting || stage.kind === 'intro') return;
    lastTick.current = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = Math.max(1, Math.min(30, Math.round((now - lastTick.current) / 1000)));
      lastTick.current = now;
      setTimeLeft(s => Math.max(0, s - delta));
    }, 1000);
    return () => clearInterval(timer);
  }, [batteries, submitting, stage.kind, stage.battery]);
  useEffect(() => {
    if (!batteries || submitting || timeLeft > 0) return;
    if (stage.kind === 'run') finishBattery();
    else if (stage.kind === 'rest') { setStage({ kind: 'intro', battery: stage.battery }); setTimeLeft(batteries[stage.battery].durationSeconds); }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause the clock while the app is in the background? No: like the real exam it keeps running.
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') lastTick.current = Date.now() - 1000; });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    nav.setBackBlocker(() => { if (batteries && !submitting) { setLeaving(true); return true; } return false; });
    return () => nav.setBackBlocker(null);
  });

  // ---------------------------------------------------------------------------------------------
  if (error && !batteries) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', padding: 20 }}>
        <Card>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{hi ? 'टेस्ट नहीं खुल सका' : "Couldn't open the test"}</Text>
          <Text style={{ color: t.textSoft, marginTop: 8 }}>{error}</Text>
          <View style={{ gap: 10, marginTop: 16 }}>
            <Button title={hi ? 'फिर से कोशिश करें' : 'Try again'} onPress={load} />
            <Button outline title={hi ? 'वापस जाएं' : 'Go back'} onPress={nav.pop} />
          </View>
        </Card>
      </View>
    );
  }
  if (!batteries || submitting) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.primary} size="large" />
        <Text style={{ color: t.textSoft, marginTop: 12 }}>{submitting ? (hi ? 'सबमिट हो रहा है…' : 'Submitting…') : (hi ? 'लोड हो रहा है…' : 'Loading…')}</Text>
      </View>
    );
  }

  const b = batteries[stage.battery];
  const chunk = b.chunks[part] || [];
  const answeredInBattery = b.chunks.flat().filter(q => answers[q.id] !== undefined).length;
  // Battery names already start with "Test-n"
  const label = (n: number, name: string) => (/^test-\d/i.test(name.trim()) ? name : `Test-${n} ${name}`);
  const bName = label(stage.battery + 1, hi ? b.hindiName : b.name);

  const TopBar = (
    <View style={{ backgroundColor: t.hero, paddingTop: insets.top, paddingHorizontal: 10 }}>
      <StatusBarFor color={t.hero} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 50 }}>
        <Pressable onPress={() => setLeaving(true)} style={{ padding: 6 }} accessibilityLabel="Leave test"><X size={22} color={t.heroText} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: t.heroText, fontWeight: '800' }}>{bName}</Text>
          <Text numberOfLines={1} style={{ color: t.heroText, opacity: 0.7, fontSize: 11 }}>{b.batteryKey}</Text>
        </View>
        {stage.kind !== 'intro' ? (
          <View style={{ backgroundColor: timeLeft <= 60 && stage.kind === 'run' ? '#dc2626' : 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontVariant: ['tabular-nums'] }}>{mmss(timeLeft)}</Text>
          </View>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8 }}>
        {batteries.map((x, i) => (
          <View key={x.id} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: i === stage.battery ? '#fff' : 'rgba(255,255,255,0.12)', flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            {i < stage.battery ? <Lock size={11} color="#fff" /> : null}
            <Text style={{ color: i === stage.battery ? t.hero : '#fff', fontSize: 11, fontWeight: '700' }}>Test-{i + 1}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  if (stage.kind === 'intro' || stage.kind === 'rest') {
    const isRest = stage.kind === 'rest';
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {TopBar}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          {isRest ? (
            <Card style={{ alignItems: 'center', marginBottom: 14, backgroundColor: t.primarySoft }}>
              <Coffee size={30} color={t.primary} />
              <Text style={{ color: t.text, fontWeight: '800', fontSize: 16, marginTop: 6 }}>{hi ? 'विश्राम' : 'Rest break'}</Text>
              <Text style={{ color: t.textSoft }}>{hi ? `अगला टेस्ट ${mmss(timeLeft)} में अपने आप शुरू होगा` : `The next test starts by itself in ${mmss(timeLeft)}`}</Text>
            </Card>
          ) : null}
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '800' }}>{label(stage.battery + 1, b.name)}</Text>
          <Text style={{ color: t.textSoft, marginTop: 4 }}>{hi ? `प्रश्न: ${b.totalQuestions} · समय: ${b.durationMinutes} मिनट` : `Questions: ${b.totalQuestions} · Time: ${b.durationMinutes} minutes`}</Text>
          <Card style={{ marginTop: 14 }}>
            {(hi ? b.instructionsHindi : b.instructionsEnglish).map((line, i) => (
              <Text key={i} style={{ color: t.text, marginBottom: 6, lineHeight: 21 }}>›  {line}</Text>
            ))}
          </Card>
          <Button style={{ marginTop: 18 }} title={hi ? 'टेस्ट शुरू करें' : 'Start this test'} onPress={() => { setStage({ kind: 'run', battery: stage.battery }); setPart(0); setTimeLeft(b.durationSeconds); }} />
        </ScrollView>
        <LeaveModal visible={leaving} onStay={() => setLeaving(false)} onLeave={() => { setLeaving(false); nav.pop(); }} />
      </View>
    );
  }

  const choose = (q: CbatQuestion, value: string) => setAnswers(a => {
    const next = { ...a };
    if (next[q.id] === value) delete next[q.id]; else next[q.id] = value; // tap again to unmark (like the real CBAT)
    return next;
  });

  const refImage = chunk.find(q => q.refImageUrl)?.refImageUrl;
  const isRoute = b.batteryKey === 'Short Route Test';
  const isOrdering = b.batteryKey === 'Information Ordering Type -I';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {TopBar}
      {b.chunks.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 10, gap: 8 }}>
          {b.chunks.map((_, i) => (
            <Pressable key={i} onPress={() => setPart(i)} style={{ paddingHorizontal: 14, height: 34, justifyContent: 'center', borderRadius: 999, backgroundColor: i === part ? t.primary : t.card, borderWidth: 1, borderColor: i === part ? t.primary : t.border }}>
              <Text style={{ color: i === part ? t.primaryText : t.text, fontWeight: '700', fontSize: 12 }}>{isRoute ? `Grid - ${i + 1}` : `Part-${i + 1}`}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <FlatList
        data={chunk}
        keyExtractor={q => q.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 20, gap: 10 }}
        ListHeaderComponent={(isRoute || isOrdering) && refImage ? (
          <Card style={{ padding: 8 }}>
            <Text style={{ color: t.primary, fontWeight: '800', marginBottom: 6 }}>{isRoute ? `Grid - ${part + 1}` : (hi ? 'तालिका-1 एवं तालिका-2' : 'Reference tables')}</Text>
            <AutoImage uri={refImage} />
            <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 4 }}>{hi ? 'बड़ा देखने के लिए टैप करें' : 'Tap to enlarge'}</Text>
          </Card>
        ) : null}
        renderItem={({ item: q }) => {
          const num = b.chunks.slice(0, part).reduce((n, c) => n + c.length, 0) + chunk.indexOf(q) + 1;
          return <CbatQuestionCard q={q} num={num} battery={b} value={answers[q.id]} onChoose={v => choose(q, v)} />;
        }}
      />
      <View style={{ flexDirection: 'row', gap: 8, padding: 10, paddingBottom: 10 + insets.bottom, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border, alignItems: 'center' }}>
        <Text style={{ color: t.textSoft, flex: 1 }}>{hi ? `उत्तर दिए: ${answeredInBattery}/${b.totalQuestions}` : `Answered: ${answeredInBattery}/${b.totalQuestions}`}</Text>
        {part < b.chunks.length - 1
          ? <Button small title={hi ? 'अगला भाग' : 'Next part'} onPress={() => setPart(part + 1)} />
          : <Button small tone="success" title={stage.battery === batteries.length - 1 ? (hi ? 'टेस्ट सबमिट करें' : 'Submit test') : (hi ? 'यह टेस्ट समाप्त करें' : 'Finish this test')} onPress={() => setConfirmEnd(true)} />}
      </View>
      {error ? <Pressable onPress={submit} style={{ padding: 10, backgroundColor: t.dangerSoft }}><Text style={{ color: t.danger, fontWeight: '700' }}>{error} — {hi ? 'फिर से कोशिश करने के लिए टैप करें' : 'tap to try again'}</Text></Pressable> : null}

      <Modal visible={confirmEnd} transparent animationType="fade" onRequestClose={() => setConfirmEnd(false)}>
        <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: 24 }}>
          <Card>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{stage.battery === batteries.length - 1 ? (hi ? 'टेस्ट सबमिट करें?' : 'Submit the test?') : (hi ? 'यह टेस्ट समाप्त करें?' : 'Finish this test?')}</Text>
            <Text style={{ color: t.textSoft, marginTop: 8 }}>{hi ? `उत्तर दिए: ${answeredInBattery}/${b.totalQuestions}। समाप्त करने के बाद आप इस टेस्ट पर वापस नहीं आ सकते।` : `Answered ${answeredInBattery} of ${b.totalQuestions}. You can't come back to this test after finishing it.`}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button style={{ flex: 1 }} outline title={hi ? 'वापस' : 'Back'} onPress={() => setConfirmEnd(false)} />
              <Button style={{ flex: 1 }} title={hi ? 'हां' : 'Yes'} onPress={() => { setConfirmEnd(false); finishBattery(); }} />
            </View>
          </Card>
        </View>
      </Modal>
      <LeaveModal visible={leaving} onStay={() => setLeaving(false)} onLeave={() => { setLeaving(false); nav.pop(); }} />
    </View>
  );
}

function LeaveModal({ visible, onStay, onLeave }: { visible: boolean; onStay: () => void; onLeave: () => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay}>
      <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: 24 }}>
        <Card>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{hi ? 'टेस्ट छोड़ें?' : 'Leave the test?'}</Text>
          <Text style={{ color: t.textSoft, marginTop: 8 }}>{hi ? 'आपकी प्रगति इस फ़ोन पर सेव है।' : 'Your progress is saved on this phone.'}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Button style={{ flex: 1 }} outline title={hi ? 'जारी रखें' : 'Stay'} onPress={onStay} />
            <Button style={{ flex: 1 }} title={hi ? 'छोड़ें' : 'Leave'} onPress={onLeave} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

function CbatQuestionCard({ q, num, battery, value, onChoose }: { q: CbatQuestion; num: number; battery: CbatBattery; value?: string; onChoose: (v: string) => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const key = battery.batteryKey;
  const opts = q.normalOptions;
  const Option = ({ v, label, wide }: { v: string; label: string; wide?: boolean }) => {
    const on = value === v;
    return (
      <Pressable onPress={() => onChoose(v)} accessibilityRole="radio" accessibilityState={{ checked: on }}
        style={{ minWidth: wide ? undefined : 44, flex: wide ? 1 : undefined, height: 40, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: on ? t.primary : t.border, backgroundColor: on ? t.primary : t.card }}>
        <Text style={{ color: on ? t.primaryText : t.text, fontWeight: '800' }}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <Card>
      <Text style={{ color: t.textSoft, fontWeight: '800', marginBottom: 6 }}>Q.{num}</Text>
      {key === 'Personality Test' ? (
        <>
          {q.questionHindi ? <Text style={{ color: t.text, fontSize: 15, lineHeight: 22 }}>{q.questionHindi}</Text> : null}
          {q.questionEnglish && q.questionEnglish !== q.questionHindi ? <Text style={{ color: t.textSoft, fontSize: 14, marginTop: 4 }}>{q.questionEnglish}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {(q.optionsHindiEnglish || []).map(o => <Option key={o.key} v={o.key} wide label={`${o.key}. ${hi ? o.textHi : o.textEn}`} />)}
          </View>
        </>
      ) : key === 'Add of Odd Numbers Test' ? (
        <>
          <Text selectable={false} style={{ color: t.text, fontSize: 20, letterSpacing: 3, fontWeight: '700', lineHeight: 30 }}>{q.digitString || q.promptText}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {(q.sumOptions || []).map(o => <Option key={o.key} v={o.key} label={`${o.key}) ${o.val}`} />)}
          </View>
        </>
      ) : key === 'Short Route Test' ? (
        <>
          <Text style={{ color: '#dc2626', fontSize: 18, fontWeight: '800', letterSpacing: 1 }}>{q.routePrompt || q.promptText}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {opts.map(o => <Option key={o} v={o} label={o} />)}
          </View>
        </>
      ) : (
        <>
          {q.imageUrl ? <AutoImage uri={q.imageUrl} /> : null}
          {q.promptText && !q.imageUrl ? <Text style={{ color: t.text, fontSize: 15 }}>{q.promptText}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {opts.map(o => <Option key={o} v={o} label={o} />)}
          </View>
        </>
      )}
    </Card>
  );
}
