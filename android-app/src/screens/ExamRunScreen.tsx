import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenCapture from 'expo-screen-capture';
import { useKeepAwake } from 'expo-keep-awake';
import { ChevronLeft, Grid3x3, Languages, TriangleAlert, X } from 'lucide-react-native';
import { request, friendlyError } from '../api';
import { useData } from '../data';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useSession, useUser } from '../session';
import { useTheme } from '../theme';
import { Button, Card } from '../ui';
import QuestionView from '../QuestionView';
import { engineReducer, getSectionQuestions, EngineResumeData, EngineState } from '../shared/examEngine';
import { generateExamSession } from '../shared/examUtils';
import { isRpscRasTest } from '../shared/examScoring';
import { newLocalId, openOffline, saveOfflineAttempt, syncOutbox } from '../offline';

// -----------------------------------------------------------------------------
// The exam screen (TCS iON style), run by the website's own exam engine. Progress is saved
// on the phone on every change and on the server every few seconds in the website's format,
// so a test can continue after the phone or app closes, or on the website. Screenshots are
// blocked; leaving the app counts as a violation (3 submit the test, like the website).
// -----------------------------------------------------------------------------

const EMPTY: EngineState = {
  session: null, currentSectionIndex: 0, currentQuestionIndex: 0, responses: {}, timeRemaining: 0, isTimerRunning: false,
  lastTickEpochMs: Date.now(), language: 'en', violationsCount: 0, maxViolationsAllowed: 3, isExamSubmitted: false, isSyncing: false,
  isRpscRasMode: false, isExtraTimeMode: false, extraTimeRemaining: 0, isExtraTimeRulesShown: false, score: null,
} as any;

const progressKey = (userId: string, testId: string) => `exam_progress_${userId}_${testId}`;
const fmt = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
};

/** TCS palette colours: 1 not visited, 2 not answered, 3 answered, 4 marked, 5 answered + marked */
const PALETTE: Record<number, { bg: string; fg: string; radius: any }> = {
  1: { bg: '#e2e8f0', fg: '#0f172a', radius: 4 },
  2: { bg: '#dc2626', fg: '#fff', radius: { borderTopLeftRadius: 14, borderTopRightRadius: 14 } },
  3: { bg: '#16a34a', fg: '#fff', radius: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 } },
  4: { bg: '#7c3aed', fg: '#fff', radius: 20 },
  5: { bg: '#7c3aed', fg: '#fff', radius: 20 },
};

export default function ExamRunScreen({ testId, resume, lang, l1, l2, offline }: { testId: string; resume?: boolean; lang?: 'en' | 'hi'; l1?: string; l2?: string; offline?: boolean }) {
  useKeepAwake();
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { refreshUser } = useSession();
  const { catalog } = useData();
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(engineReducer, EMPTY);
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready' | 'submitting' | 'failed'>('loading');
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [palette, setPalette] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [violationNote, setViolationNote] = useState(false);
  const [notice, setNotice] = useState('');
  const stateRef = useRef(state);
  stateRef.current = state;
  const title = useRef('');

  // ---- Load the test (and any saved progress) ----
  const load = useCallback(async () => {
    setPhase('loading'); setError('');
    try {
      // Downloaded test: everything comes from the package on this phone
      const pkg = offline ? await openOffline('mock', testId) : null;
      if (!pkg) {
        const access = await request('test-access', { testId });
        if (access.locked) { setLocked(true); setPhase('error'); return; }
      }
      const qs = pkg ? { ...pkg.data.customQs } : await request('get-custom-questions', { testId });
      if (qs.locked) { setLocked(true); setPhase('error'); return; }
      const customQs = Array.isArray(qs.questions) && qs.questions.length ? {
        questions: qs.questions, positiveMarks: qs.positiveMarks, negativeMarks: qs.negativeMarks, durationMinutes: qs.durationMinutes,
        questionsCount: qs.questionsCount, maxMarks: qs.maxMarks, hasSectionalTiming: qs.hasSectionalTiming, sectionalTimings: qs.sectionalTimings,
        lockSectionOnSubmit: qs.lockSectionOnSubmit, sections: qs.sections,
      } : null;
      if (!customQs) { setError(hi ? 'इस टेस्ट के प्रश्न अभी जोड़े नहीं गए हैं।' : "Questions for this test haven't been added yet."); setPhase('error'); return; }
      const session = generateExamSession(testId, pkg ? pkg.data.catalog : catalog, customQs, l1, l2);
      title.current = session.testTitle;

      // Saved progress: the newer of this phone's copy and the server's (e.g. started on the website)
      let resumeData: EngineResumeData | undefined;
      const local = await AsyncStorage.getItem(progressKey(user.id, testId)).then(r => (r ? JSON.parse(r) : null)).catch(() => null);
      const server = pkg ? null : await request('get-exam-progress', { userId: user.id, testId }).then(r => r.progress, () => null);
      const pick = [local, server].filter(p => p && (p.engine || 'tcs') === 'tcs').sort((a, b) => (Number(b.savedAt) || 0) - (Number(a.savedAt) || 0))[0];
      if (pick?.data?.responses) {
        resumeData = {
          responses: pick.data.responses, timeRemaining: pick.timeRemaining, violationsCount: pick.violations || 0,
          currentSectionIndex: pick.currentSectionIndex, currentQuestionIndex: pick.currentQuestionIndex,
          submittedSectionIndices: pick.data.submittedSectionIndices, isExtraTimeMode: pick.data.isExtraTimeMode, extraTimeRemaining: pick.data.extraTimeRemaining,
        };
      }
      dispatch({ type: 'INIT_SESSION', payload: { session, maxViolations: 3, defaultLanguage: lang || 'en', isRpscRasMode: isRpscRasTest(testId, session), resumeData } });
      setPhase('ready');
    } catch (e: any) {
      setError(e?.message === 'EXPIRED' ? (hi ? 'यह डाउनलोड समाप्त हो गया है। इंटरनेट से जुड़कर फिर से डाउनलोड करें।' : 'This download has expired. Connect to the internet and download it again.') : friendlyError(e));
      setPhase('error');
    }
  }, [testId, catalog, l1, l2, lang, user.id, hi, offline]);
  useEffect(() => { load(); }, [load]);

  // ---- Protection: no screenshots while the test is open ----
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync('exam').catch(() => {});
    return () => { ScreenCapture.allowScreenCaptureAsync('exam').catch(() => {}); };
  }, []);

  // ---- Timer ----
  const running = phase === 'ready' && !!state.session && !state.isExamSubmitted && state.isTimerRunning;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => dispatch({ type: stateRef.current.isExtraTimeMode ? 'TICK_EXTRA_TIMER' : 'TICK_TIMER' }), 1000);
    return () => clearInterval(timer);
  }, [running]);

  // ---- Leaving the app = violation ----
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      const st = stateRef.current;
      if (s === 'background' && st.session && !st.isExamSubmitted && phase === 'ready') {
        dispatch({ type: 'ADD_VIOLATION' });
        setViolationNote(true);
      }
    });
    return () => sub.remove();
  }, [phase]);

  // ---- Save progress (phone: each change; server: every 10 s) ----
  const snapshot = useCallback(() => {
    const s = stateRef.current;
    if (!s.session || s.isExamSubmitted) return null;
    return {
      v: 1, engine: 'tcs', testId, userId: user.id, title: s.session.testTitle, source: 'app', savedAt: Date.now(),
      timeRemaining: s.timeRemaining, violations: s.violationsCount, currentSectionIndex: s.currentSectionIndex, currentQuestionIndex: s.currentQuestionIndex,
      data: { responses: s.responses, submittedSectionIndices: s.submittedSectionIndices || [], isExtraTimeMode: s.isExtraTimeMode, extraTimeRemaining: s.extraTimeRemaining },
    };
  }, [testId, user.id]);
  useEffect(() => {
    const p = snapshot();
    if (p) AsyncStorage.setItem(progressKey(user.id, testId), JSON.stringify(p)).catch(() => {});
  }, [state.responses, state.currentQuestionIndex, state.currentSectionIndex, state.violationsCount, snapshot, testId, user.id]);
  useEffect(() => {
    if (phase !== 'ready') return;
    const timer = setInterval(() => {
      const p = snapshot();
      if (p) {
        AsyncStorage.setItem(progressKey(user.id, testId), JSON.stringify(p)).catch(() => {});
        if (!offline) request('save-exam-progress', { userId: user.id, snapshot: p }).catch(() => {});
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [phase, snapshot, testId, user.id]);

  // ---- Back: confirm leaving (progress is kept) ----
  useEffect(() => {
    nav.setBackBlocker(() => {
      if (palette) { setPalette(false); return true; }
      if (phase !== 'ready' || stateRef.current.isExamSubmitted) return false;
      leave();
      return true;
    });
    return () => nav.setBackBlocker(null);
  });
  const [leaving, setLeaving] = useState(false);
  const leave = () => setLeaving(true);

  // ---- Submit: the server scores it with its own answer key ----
  const submitted = state.isExamSubmitted;
  const sendAttempt = useCallback(async () => {
    const s = stateRef.current;
    if (!s.session || !s.score) return;
    setPhase('submitting');
    const responses: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number }> = {};
    let total = 0;
    Object.keys(s.responses).forEach(id => {
      responses[id] = { selectedOptionIndex: s.responses[id].selectedOptionIndex, elapsedSeconds: s.responses[id].elapsedSeconds };
      total += s.responses[id].elapsedSeconds || 0;
    });
    if (offline) {
      // Scored here with the downloaded answer key; uploaded (and re-scored) when online
      await saveOfflineAttempt('mock', testId, {
        localId: newLocalId(), userId: user.id, testId, title: s.session.testTitle, score: s.score.obtainedMarks, maxScore: s.score.totalMarks,
        accuracy: s.score.accuracyPercentage, durationSeconds: total, violations: s.violationsCount, responses, completedAt: new Date().toISOString(),
        ...(l1 ? { lang1: l1, lang2: l2 } : {}),
      });
      await AsyncStorage.removeItem(progressKey(user.id, testId)).catch(() => {});
      syncOutbox().catch(() => {});
      nav.replace({ name: 'analysis', testId, offline: true });
      return;
    }
    try {
      await request('add-attempt', {
        userId: user.id, testId, title: s.session.testTitle, score: s.score.obtainedMarks, maxScore: s.score.totalMarks,
        accuracy: s.score.accuracyPercentage, durationSeconds: total, violations: s.violationsCount, responses, source: 'app',
        ...(l1 ? { lang1: l1, lang2: l2 } : {}),
      });
      await AsyncStorage.removeItem(progressKey(user.id, testId)).catch(() => {});
      await refreshUser();
      nav.replace({ name: 'analysis', testId });
    } catch (e) {
      setError(friendlyError(e));
      setPhase('failed');
    }
  }, [testId, user.id, l1, l2, refreshUser, nav, offline]);
  useEffect(() => { if (submitted && phase === 'ready') sendAttempt(); }, [submitted, phase, sendAttempt]);

  // ---------------------------------------------------------------------------------------------
  if (phase === 'loading' || phase === 'submitting') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <ActivityIndicator color={t.primary} size="large" />
        <Text style={{ color: t.textSoft, marginTop: 12 }}>{phase === 'submitting' ? (hi ? 'आपका टेस्ट सबमिट हो रहा है…' : 'Submitting your test…') : (hi ? 'टेस्ट लोड हो रहा है…' : 'Loading test…')}</Text>
      </View>
    );
  }
  if (phase === 'error' || phase === 'failed') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', padding: 20, paddingTop: insets.top + 20 }}>
        <Card>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>
            {locked ? (hi ? 'यह एक PRO टेस्ट है' : 'This is a PRO test') : phase === 'failed' ? (hi ? 'टेस्ट सबमिट नहीं हो सका' : "Couldn't submit the test") : (hi ? 'टेस्ट नहीं खुल सका' : "Couldn't open the test")}
          </Text>
          <Text style={{ color: t.textSoft, marginTop: 8 }}>
            {locked ? (hi ? 'शुरू करने के लिए PRO पास अनलॉक करें।' : 'Unlock the PRO pass to start it.') : phase === 'failed' ? (hi ? 'आपके उत्तर इस फ़ोन पर सुरक्षित हैं। इंटरनेट जांचें और फिर से कोशिश करें।' : 'Your answers are safe on this phone. Check the internet and try again.') : error}
          </Text>
          <View style={{ gap: 10, marginTop: 16 }}>
            {locked ? <Button title={hi ? 'PRO पास देखें' : 'See PRO pass'} tone="warning" onPress={() => nav.replace({ name: 'pass' })} />
              : phase === 'failed' ? <Button title={hi ? 'फिर से सबमिट करें' : 'Submit again'} onPress={sendAttempt} />
                : <Button title={hi ? 'फिर से कोशिश करें' : 'Try again'} onPress={load} />}
            <Button outline title={hi ? 'वापस जाएं' : 'Go back'} onPress={nav.pop} />
          </View>
        </Card>
      </View>
    );
  }

  const session = state.session!;
  const section = session.sections[state.currentSectionIndex];
  const secQs = getSectionQuestions(session, state.currentSectionIndex);
  const q = secQs[state.currentQuestionIndex];
  const resp = q ? state.responses[q.id] : undefined;
  const examLang = state.language;
  const content = q ? (examLang === 'hi' && q.content.hi?.questionText ? q.content.hi : q.content.en) : null;
  const hasHindi = session.questions.some(x => !!x.content.hi?.questionText && x.content.hi.questionText !== x.content.en.questionText);
  const options = (content?.options || []).map((o: any) => (typeof o === 'string' ? { text: o } : { text: o?.text || '', imageUrl: o?.imageUrl }));
  if (state.isRpscRasMode) options.push({ text: hi ? '(E) प्रश्न अनुत्तरित छोड़ें' : '(E) Leave question unattempted' });
  const answeredBefore = resp?.state === 3 || resp?.state === 5;
  const time = state.isExtraTimeMode ? state.extraTimeRemaining : state.timeRemaining;
  const sectionLocked = (i: number) => (session.hasSectionalTiming || session.lockSectionOnSubmit) && i !== state.currentSectionIndex;
  const tally = (list: { state: number }[]) => list.reduce((c, r) => { c[r.state] = (c[r.state] || 0) + 1; return c; }, {} as Record<number, number>);
  // Palette key: this section; submit summary: the whole test (or this section when submitting a section)
  const sectionCounts = tally(secQs.map(x => state.responses[x.id] || { state: 1 }));
  const counts = tally(Object.values(state.responses));
  const isLastQuestion = state.currentQuestionIndex === secQs.length - 1;
  const lastSection = state.currentSectionIndex === session.sections.length - 1;
  const perSectionSubmit = (session.hasSectionalTiming || session.lockSectionOnSubmit) && !lastSection;

  const select = (i: number) => {
    if (state.isExtraTimeMode) {
      if (answeredBefore) { setNotice(hi ? 'अतिरिक्त समय में उत्तर दिए गए प्रश्न बदले नहीं जा सकते।' : "Answered questions can't be changed during extra time."); return; }
      if (i !== 4) { setNotice(hi ? 'अतिरिक्त समय में केवल विकल्प (E) चुना जा सकता है।' : 'During extra time only option (E) can be chosen.'); return; }
    }
    dispatch({ type: 'SELECT_OPTION', payload: { optionIndex: i } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Top bar */}
      <View style={{ backgroundColor: t.header, paddingTop: insets.top, paddingHorizontal: 10, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 48 }}>
          <Pressable onPress={leave} hitSlop={10} style={{ padding: 6 }} accessibilityLabel="Leave test"><X size={22} color={t.headerText} /></Pressable>
          <Text numberOfLines={1} style={{ flex: 1, color: t.headerText, fontWeight: '700' }}>{session.testTitle}</Text>
          <View style={{ backgroundColor: time <= 300 ? '#dc2626' : 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontVariant: ['tabular-nums'] }}>{state.isExtraTimeMode ? '+' : ''}{fmt(time)}</Text>
          </View>
          {hasHindi ? (
            <Pressable onPress={() => dispatch({ type: 'SET_LANGUAGE', payload: examLang === 'hi' ? 'en' : 'hi' })} style={{ padding: 6 }} accessibilityLabel="Language">
              <Languages size={22} color={t.headerText} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => setPalette(true)} style={{ padding: 6 }} accessibilityLabel="Question palette"><Grid3x3 size={22} color={t.headerText} /></Pressable>
        </View>
        {session.sections.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {session.sections.map((s, i) => {
              const on = i === state.currentSectionIndex;
              const done = (state.submittedSectionIndices || []).includes(i);
              return (
                <Pressable key={s.id} disabled={sectionLocked(i)} onPress={() => dispatch({ type: 'SWITCH_SECTION', payload: { sectionIndex: i } })}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: on ? '#fff' : 'rgba(255,255,255,0.12)', opacity: sectionLocked(i) && !on ? 0.5 : 1 }}>
                  <Text style={{ color: on ? t.header : '#fff', fontWeight: '700', fontSize: 12 }}>{done ? '🔒 ' : ''}{s.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {/* Question info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: t.card, borderBottomWidth: 1, borderBottomColor: t.border, gap: 10 }}>
        <Text style={{ color: t.text, fontWeight: '800' }}>{hi ? 'प्रश्न' : 'Q'} {state.currentQuestionIndex + 1}/{secQs.length}</Text>
        <Text style={{ color: t.success, fontWeight: '700', fontSize: 12 }}>+{q?.positiveMark ?? section?.positiveMark ?? 1}</Text>
        <Text style={{ color: t.danger, fontWeight: '700', fontSize: 12 }}>−{q?.negativeMark ?? section?.negativeMark ?? 0}</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: t.textMuted, fontSize: 12 }}>⏱ {fmt(resp?.elapsedSeconds || 0)}</Text>
      </View>
      {notice ? (
        <Pressable onPress={() => setNotice('')} style={{ backgroundColor: t.warningSoft, padding: 10 }}><Text style={{ color: t.warning, fontWeight: '600' }}>{notice}</Text></Pressable>
      ) : null}

      {q && content ? (
        <QuestionView
          pageKey={`${q.id}-${examLang}`}
          comprehension={content.comprehension}
          questionText={content.questionText}
          imageUrl={content.imageUrl}
          options={options}
          selected={resp?.tempOptionIndex ?? null}
          onSelect={select}
          watermark={`${user.name} · ${user.candidateCode}`}
          labels={{ passage: hi ? 'अनुच्छेद' : 'Passage', explanation: '', yourAnswer: '', correct: '' }}
        />
      ) : <View style={{ flex: 1 }} />}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8, padding: 10, paddingBottom: 10 + insets.bottom, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border }}>
        <Pressable disabled={state.currentQuestionIndex === 0} onPress={() => dispatch({ type: 'JUMP_TO_QUESTION', payload: { sectionIndex: state.currentSectionIndex, questionIndex: state.currentQuestionIndex - 1 } })}
          style={{ width: 44, height: 46, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', opacity: state.currentQuestionIndex === 0 ? 0.4 : 1 }} accessibilityLabel="Previous question">
          <ChevronLeft size={22} color={t.text} />
        </Pressable>
        <Button small outline tone="neutral" title={hi ? 'साफ़ करें' : 'Clear'} onPress={() => dispatch({ type: 'CLEAR_RESPONSE' })} style={{ height: 46 }} disabled={state.isExtraTimeMode && answeredBefore} />
        <Button small outline title={hi ? 'मार्क व आगे' : 'Mark & Next'} onPress={() => dispatch({ type: 'MARK_FOR_REVIEW_AND_NEXT' })} style={{ flex: 1, height: 46, borderColor: '#7c3aed' }} />
        <Button small title={isLastQuestion ? (hi ? 'सेव करें' : 'Save') : (hi ? 'सेव व आगे' : 'Save & Next')} onPress={() => dispatch({ type: 'SAVE_AND_NEXT' })} style={{ flex: 1, height: 46 }} tone="success" />
      </View>

      {/* Palette */}
      <Modal visible={palette} animationType="slide" transparent onRequestClose={() => setPalette(false)}>
        <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: insets.bottom + 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
              <Text style={{ color: t.text, fontWeight: '800', fontSize: 16, flex: 1 }}>{section?.name}</Text>
              <Pressable onPress={() => setPalette(false)} hitSlop={10}><X size={22} color={t.text} /></Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingBottom: 10 }}>
              {[[3, hi ? 'उत्तर दिया' : 'Answered'], [2, hi ? 'उत्तर नहीं दिया' : 'Not answered'], [1, hi ? 'देखा नहीं' : 'Not visited'], [4, hi ? 'रिव्यू' : 'Marked'], [5, hi ? 'उत्तर+रिव्यू' : 'Answered & marked']].map(([s, l]) => (
                <View key={String(s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[{ width: 18, height: 18, backgroundColor: PALETTE[s as number].bg }, typeof PALETTE[s as number].radius === 'number' ? { borderRadius: Math.min(9, PALETTE[s as number].radius) } : PALETTE[s as number].radius]} />
                  <Text style={{ color: t.textSoft, fontSize: 12 }}>{l} ({sectionCounts[s as number] || 0})</Text>
                </View>
              ))}
            </View>
            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 }}>
              {secQs.map((sq, i) => {
                const st = state.responses[sq.id]?.state || 1;
                const p = PALETTE[st];
                const cur = i === state.currentQuestionIndex;
                return (
                  <Pressable key={sq.id} onPress={() => { dispatch({ type: 'JUMP_TO_QUESTION', payload: { sectionIndex: state.currentSectionIndex, questionIndex: i } }); setPalette(false); }}
                    style={[{ width: 46, height: 42, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center', borderWidth: cur ? 2.5 : 0, borderColor: t.primary },
                      typeof p.radius === 'number' ? { borderRadius: p.radius } : p.radius]}>
                    <Text style={{ color: p.fg, fontWeight: '800' }}>{i + 1}</Text>
                    {st === 5 ? <View style={{ position: 'absolute', right: -3, bottom: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: '#16a34a', borderWidth: 2, borderColor: t.card }} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {perSectionSubmit
                ? <Button title={hi ? 'यह सेक्शन सबमिट करें' : 'Submit this section'} tone="warning" onPress={() => { setPalette(false); setConfirmSubmit(true); }} />
                : <Button title={hi ? 'टेस्ट सबमिट करें' : 'Submit test'} tone="danger" onPress={() => { setPalette(false); setConfirmSubmit(true); }} />}
            </View>
          </View>
        </View>
      </Modal>

      {/* Submit confirmation */}
      <Modal visible={confirmSubmit} transparent animationType="fade" onRequestClose={() => setConfirmSubmit(false)}>
        <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: 24 }}>
          <Card>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{perSectionSubmit ? (hi ? 'सेक्शन सबमिट करें?' : 'Submit this section?') : (hi ? 'टेस्ट सबमिट करें?' : 'Submit the test?')}</Text>
            <View style={{ marginTop: 12, gap: 4 }}>
              <Text style={{ color: t.textSoft }}>{hi ? 'उत्तर दिए' : 'Answered'}: <Text style={{ color: t.text, fontWeight: '800' }}>{((perSectionSubmit ? sectionCounts : counts)[3] || 0) + ((perSectionSubmit ? sectionCounts : counts)[5] || 0)}</Text></Text>
              <Text style={{ color: t.textSoft }}>{hi ? 'उत्तर नहीं दिए' : 'Not answered'}: <Text style={{ color: t.text, fontWeight: '800' }}>{(perSectionSubmit ? sectionCounts : counts)[2] || 0}</Text></Text>
              <Text style={{ color: t.textSoft }}>{hi ? 'रिव्यू के लिए' : 'Marked for review'}: <Text style={{ color: t.text, fontWeight: '800' }}>{(perSectionSubmit ? sectionCounts : counts)[4] || 0}</Text></Text>
              <Text style={{ color: t.textSoft }}>{hi ? 'देखे नहीं' : 'Not visited'}: <Text style={{ color: t.text, fontWeight: '800' }}>{(perSectionSubmit ? sectionCounts : counts)[1] || 0}</Text></Text>
            </View>
            {perSectionSubmit ? <Text style={{ color: t.warning, marginTop: 10 }}>{hi ? 'सबमिट करने के बाद आप इस सेक्शन पर वापस नहीं आ सकते।' : "After submitting you can't come back to this section."}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button style={{ flex: 1 }} outline title={hi ? 'वापस' : 'Back'} onPress={() => setConfirmSubmit(false)} />
              <Button style={{ flex: 1 }} tone="danger" title={hi ? 'सबमिट' : 'Submit'} onPress={() => { setConfirmSubmit(false); dispatch({ type: perSectionSubmit ? 'SUBMIT_SECTION' : 'SUBMIT_EXAM' }); }} />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Leave (progress kept) */}
      <Modal visible={leaving} transparent animationType="fade" onRequestClose={() => setLeaving(false)}>
        <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: 24 }}>
          <Card>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{hi ? 'टेस्ट छोड़ें?' : 'Leave the test?'}</Text>
            <Text style={{ color: t.textSoft, marginTop: 8 }}>{hi ? 'आपकी प्रगति सेव है, आप बाद में जारी रख सकते हैं। टाइमर रुक जाएगा।' : 'Your progress is saved and you can continue later. The timer pauses.'}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button style={{ flex: 1 }} outline title={hi ? 'जारी रखें' : 'Stay'} onPress={() => setLeaving(false)} />
              <Button style={{ flex: 1 }} title={hi ? 'छोड़ें' : 'Leave'} onPress={() => {
                const p = snapshot();
                if (p) request('save-exam-progress', { userId: user.id, snapshot: p }).catch(() => {});
                setLeaving(false); refreshUser(); nav.pop();
              }} />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Violation warning */}
      <Modal visible={violationNote && !state.isExamSubmitted} transparent animationType="fade" onRequestClose={() => setViolationNote(false)}>
        <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: 24 }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><TriangleAlert size={22} color={t.danger} /><Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{hi ? 'चेतावनी' : 'Warning'}</Text></View>
            <Text style={{ color: t.textSoft, marginTop: 8 }}>
              {hi ? `आपने टेस्ट के दौरान ऐप छोड़ा (${state.violationsCount}/${state.maxViolationsAllowed})। ${state.maxViolationsAllowed} बार होने पर टेस्ट अपने आप सबमिट हो जाएगा।`
                : `You left the app during the test (${state.violationsCount}/${state.maxViolationsAllowed}). At ${state.maxViolationsAllowed} the test is submitted automatically.`}
            </Text>
            <Button style={{ marginTop: 16 }} title={hi ? 'समझ गया' : 'OK'} onPress={() => setViolationNote(false)} />
          </Card>
        </View>
      </Modal>

      {/* RPSC extra time rules */}
      <Modal visible={state.isExtraTimeRulesShown} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: 24 }}>
          <Card>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{hi ? 'अतिरिक्त 10 मिनट' : 'Extra 10 minutes'}</Text>
            <Text style={{ color: t.textSoft, marginTop: 8 }}>
              {hi ? 'समय समाप्त। बिना उत्तर वाले प्रश्नों के लिए केवल विकल्प (E) "प्रश्न अनुत्तरित छोड़ें" चुना जा सकता है। उत्तर दिए गए प्रश्न बदले नहीं जा सकते।'
                : 'Time is up. For unanswered questions you can only choose option (E) "Leave question unattempted". Answered questions can\'t be changed.'}
            </Text>
            <Button style={{ marginTop: 16 }} title={hi ? 'शुरू करें' : 'Start extra time'} onPress={() => dispatch({ type: 'DISMISS_EXTRA_TIME_RULES' })} />
          </Card>
        </View>
      </Modal>
    </View>
  );
}


