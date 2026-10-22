import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenCapture from 'expo-screen-capture';
import { useKeepAwake } from 'expo-keep-awake';
import { AArrowDown, AArrowUp, ChevronLeft, Clock, LayoutGrid, Lock, Send, TriangleAlert, X } from 'lucide-react-native';
import { request, friendlyError } from '../api';
import { useData } from '../data';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useSession, useUser } from '../session';
import { useTheme } from '../theme';
import { Button, Card, Dialog, ProgressBar, Sheet, StatusBarFor } from '../ui';
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

const FONT_KEY = 'mth_exam_font';
export const FONT_STEPS = [0.9, 1, 1.12, 1.25, 1.4];

/** The exam text size the student picked (kept on the phone, used by solutions too). */
export function useExamFont() {
  const [scale, setScale] = useState(1);
  useEffect(() => { AsyncStorage.getItem(FONT_KEY).then(v => { const n = Number(v); if (FONT_STEPS.includes(n)) setScale(n); }).catch(() => {}); }, []);
  const step = (d: 1 | -1) => setScale(cur => {
    const i = Math.max(0, Math.min(FONT_STEPS.length - 1, FONT_STEPS.indexOf(cur) + d));
    AsyncStorage.setItem(FONT_KEY, String(FONT_STEPS[i])).catch(() => {});
    return FONT_STEPS[i];
  });
  return { scale, bigger: () => step(1), smaller: () => step(-1) };
}

export default function ExamRunScreen({ testId, resume, lang, l1, l2, offline, roomCode }: { testId: string; resume?: boolean; lang?: 'en' | 'hi'; l1?: string; l2?: string; offline?: boolean; roomCode?: string }) {
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
  const font = useExamFont();

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
    const responses: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number; answeredAt?: number }> = {};
    let total = 0;
    Object.keys(s.responses).forEach(id => {
      const r: any = s.responses[id];
      responses[id] = { selectedOptionIndex: r.selectedOptionIndex, elapsedSeconds: r.elapsedSeconds, ...(r.answeredAt ? { answeredAt: r.answeredAt } : {}) };
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
        <Text style={{ color: t.text, marginTop: 14, fontWeight: '800', fontSize: 16 }}>{phase === 'submitting' ? (hi ? 'आपका टेस्ट सबमिट हो रहा है…' : 'Submitting your test…') : (hi ? 'टेस्ट तैयार हो रहा है…' : 'Getting your test ready…')}</Text>
        <Text style={{ color: t.textSoft, marginTop: 4 }}>{phase === 'submitting' ? (hi ? 'कृपया ऐप बंद न करें' : "Please don't close the app") : (hi ? 'प्रश्न लोड हो रहे हैं' : 'Loading questions')}</Text>
      </View>
    );
  }
  if (phase === 'error' || phase === 'failed') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', padding: 20, paddingTop: insets.top + 20 }}>
        <StatusBarFor color={t.bg} />
        <Card>
          {locked ? <Lock size={30} color={t.accent} /> : <TriangleAlert size={30} color={t.danger} />}
          <Text style={{ color: t.text, fontSize: 19, fontWeight: '900', marginTop: 12 }}>
            {locked ? (hi ? 'यह एक PRO टेस्ट है' : 'This is a PRO test') : phase === 'failed' ? (hi ? 'टेस्ट सबमिट नहीं हो सका' : "Couldn't submit the test") : (hi ? 'टेस्ट नहीं खुल सका' : "Couldn't open the test")}
          </Text>
          <Text style={{ color: t.textSoft, marginTop: 8, lineHeight: 21 }}>
            {locked ? (hi ? 'शुरू करने के लिए PRO पास अनलॉक करें।' : 'Unlock the PRO pass to start it.') : phase === 'failed' ? (hi ? 'आपके उत्तर इस फ़ोन पर सुरक्षित हैं। इंटरनेट जांचें और फिर से कोशिश करें।' : 'Your answers are safe on this phone. Check the internet and try again.') : error}
          </Text>
          <View style={{ gap: 10, marginTop: 18 }}>
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
  const answeredInTest = (counts[3] || 0) + (counts[5] || 0);
  const lowTime = time <= 300;
  const summary = perSectionSubmit ? sectionCounts : counts;
  const notVisited = perSectionSubmit ? (sectionCounts[1] || 0) : session.questions.length - Object.keys(state.responses).length + (counts[1] || 0);

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
      <View style={{ backgroundColor: t.hero, paddingTop: insets.top, paddingHorizontal: 8, paddingBottom: session.sections.length > 1 ? 10 : 6 }}>
        <StatusBarFor color={t.hero} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 52 }}>
          <Pressable onPress={leave} hitSlop={8} style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={hi ? 'टेस्ट छोड़ें' : 'Leave test'}><X size={22} color={t.heroText} /></Pressable>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: t.heroText, fontWeight: '800', fontSize: 14.5 }}>{session.testTitle}</Text>
            <Text numberOfLines={1} style={{ color: t.heroText, opacity: 0.7, fontSize: 12 }}>{answeredInTest}/{session.questions.length} {hi ? 'उत्तर दिए' : 'answered'}{roomCode ? ` · ${hi ? 'रूम' : 'Room'} ${roomCode}` : ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: lowTime ? '#dc2626' : 'rgba(255,255,255,0.16)', borderRadius: 10, paddingHorizontal: 10, height: 34 }}>
            <Clock size={15} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, fontVariant: ['tabular-nums'] }}>{state.isExtraTimeMode ? '+' : ''}{fmt(time)}</Text>
          </View>
          {hasHindi ? (
            <Pressable onPress={() => dispatch({ type: 'SET_LANGUAGE', payload: examLang === 'hi' ? 'en' : 'hi' })} style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={hi ? 'भाषा बदलें' : 'Change language'}>
              <View style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{examLang === 'hi' ? 'हि' : 'EN'}</Text>
              </View>
            </Pressable>
          ) : null}
          <Pressable onPress={() => setPalette(true)} style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={hi ? 'प्रश्न सूची' : 'Question palette'}><LayoutGrid size={22} color={t.heroText} /></Pressable>
        </View>
        {session.sections.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 6 }}>
            {session.sections.map((s, i) => {
              const on = i === state.currentSectionIndex;
              const done = (state.submittedSectionIndices || []).includes(i);
              const lockedSec = sectionLocked(i);
              return (
                <Pressable key={s.id} disabled={lockedSec} onPress={() => dispatch({ type: 'SWITCH_SECTION', payload: { sectionIndex: i } })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, height: 32, borderRadius: 16, backgroundColor: on ? '#fff' : 'rgba(255,255,255,0.13)', opacity: lockedSec && !on ? 0.5 : 1 }}>
                  {done || (lockedSec && !on) ? <Lock size={12} color={on ? '#1e4e79' : '#fff'} /> : null}
                  <Text style={{ color: on ? '#1e4e79' : '#fff', fontWeight: '800', fontSize: 12.5 }}>{s.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
      <ProgressBar value={answeredInTest / Math.max(1, session.questions.length)} height={3} color={t.success} track={t.border} />

      {/* Question info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 46, backgroundColor: t.card, borderBottomWidth: 1, borderBottomColor: t.border, gap: 8 }}>
        <Text style={{ color: t.text, fontWeight: '900', fontSize: 15 }}>{hi ? 'प्रश्न' : 'Q'} {state.currentQuestionIndex + 1}<Text style={{ color: t.textMuted, fontWeight: '700' }}>/{secQs.length}</Text></Text>
        <View style={{ backgroundColor: t.successSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: t.success, fontWeight: '800', fontSize: 12 }}>+{q?.positiveMark ?? section?.positiveMark ?? 1}</Text></View>
        <View style={{ backgroundColor: t.dangerSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: t.danger, fontWeight: '800', fontSize: 12 }}>−{q?.negativeMark ?? section?.negativeMark ?? 0}</Text></View>
        {resp?.state === 4 || resp?.state === 5 ? <View style={{ backgroundColor: t.violetSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: t.violet, fontWeight: '800', fontSize: 12 }}>{hi ? 'रिव्यू' : 'Review'}</Text></View> : null}
        <View style={{ flex: 1 }} />
        <Text style={{ color: t.textMuted, fontSize: 12.5, fontVariant: ['tabular-nums'], marginRight: 4 }}>{fmt(resp?.elapsedSeconds || 0)}</Text>
        <Pressable onPress={font.smaller} hitSlop={6} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.cardAlt }} accessibilityLabel={hi ? 'छोटा अक्षर' : 'Smaller text'}><AArrowDown size={17} color={t.text} /></Pressable>
        <Pressable onPress={font.bigger} hitSlop={6} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.cardAlt }} accessibilityLabel={hi ? 'बड़ा अक्षर' : 'Larger text'}><AArrowUp size={17} color={t.text} /></Pressable>
      </View>
      {notice ? (
        <Pressable onPress={() => setNotice('')} style={{ backgroundColor: t.warningSoft, paddingHorizontal: 14, paddingVertical: 10 }}><Text style={{ color: t.warning, fontWeight: '700' }}>{notice}</Text></Pressable>
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
          fontScale={font.scale}
          watermark={`${user.name} · ${user.candidateCode}`}
          labels={{ passage: hi ? 'अनुच्छेद' : 'Passage', explanation: '', yourAnswer: '', correct: '' }}
        />
      ) : <View style={{ flex: 1 }} />}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 + insets.bottom, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border }}>
        <Pressable disabled={state.currentQuestionIndex === 0} onPress={() => dispatch({ type: 'JUMP_TO_QUESTION', payload: { sectionIndex: state.currentSectionIndex, questionIndex: state.currentQuestionIndex - 1 } })}
          style={{ width: 46, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: t.border, alignItems: 'center', justifyContent: 'center', opacity: state.currentQuestionIndex === 0 ? 0.35 : 1 }} accessibilityLabel={hi ? 'पिछला प्रश्न' : 'Previous question'}>
          <ChevronLeft size={22} color={t.text} />
        </Pressable>
        <Button small outline tone="neutral" title={hi ? 'साफ़' : 'Clear'} onPress={() => dispatch({ type: 'CLEAR_RESPONSE' })} style={{ height: 48, paddingHorizontal: 12 }} disabled={state.isExtraTimeMode && answeredBefore} />
        <Button small outline tone="violet" title={hi ? 'मार्क व आगे' : 'Mark & Next'} onPress={() => dispatch({ type: 'MARK_FOR_REVIEW_AND_NEXT' })} style={{ flex: 1, height: 48, paddingHorizontal: 8 }} />
        <Button small title={isLastQuestion ? (hi ? 'सेव करें' : 'Save') : (hi ? 'सेव व आगे' : 'Save & Next')} onPress={() => dispatch({ type: 'SAVE_AND_NEXT' })} style={{ flex: 1.15, height: 48, paddingHorizontal: 8 }} tone="success" />
      </View>

      {/* Palette */}
      {palette ? (
        <Sheet title={section?.name || (hi ? 'प्रश्न' : 'Questions')} onClose={() => setPalette(false)}
          footer={perSectionSubmit
            ? <Button title={hi ? 'यह सेक्शन सबमिट करें' : 'Submit this section'} tone="warning" onPress={() => { setPalette(false); setConfirmSubmit(true); }} />
            : <Button title={hi ? 'टेस्ट सबमिट करें' : 'Submit test'} tone="danger" icon={<Send size={18} color="#fff" />} onPress={() => { setPalette(false); setConfirmSubmit(true); }} />}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[[3, hi ? 'उत्तर दिया' : 'Answered'], [2, hi ? 'उत्तर नहीं' : 'Not answered'], [1, hi ? 'देखा नहीं' : 'Not visited'], [4, hi ? 'रिव्यू' : 'Marked'], [5, hi ? 'उत्तर + रिव्यू' : 'Answered & marked']].map(([s, l]) => {
              const p = PALETTE[s as number];
              return (
                <View key={String(s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.card, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: t.border }}>
                  <View style={[{ width: 16, height: 16, backgroundColor: p.bg }, typeof p.radius === 'number' ? { borderRadius: Math.min(8, p.radius) } : p.radius]} />
                  <Text style={{ color: t.textSoft, fontSize: 12.5, fontWeight: '600' }}>{l}</Text>
                  <Text style={{ color: t.text, fontSize: 12.5, fontWeight: '900' }}>{sectionCounts[s as number] || 0}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 8 }}>
            {secQs.map((sq, i) => {
              const st = state.responses[sq.id]?.state || 1;
              const p = PALETTE[st];
              const cur = i === state.currentQuestionIndex;
              return (
                <Pressable key={sq.id} onPress={() => { dispatch({ type: 'JUMP_TO_QUESTION', payload: { sectionIndex: state.currentSectionIndex, questionIndex: i } }); setPalette(false); }}
                  style={[{ width: 48, height: 44, backgroundColor: st === 1 ? t.cardAlt : p.bg, alignItems: 'center', justifyContent: 'center', borderWidth: cur ? 2.5 : st === 1 ? 1 : 0, borderColor: cur ? t.primary : t.border },
                    typeof p.radius === 'number' ? { borderRadius: Math.max(8, p.radius) } : p.radius]}
                  accessibilityLabel={`${hi ? 'प्रश्न' : 'Question'} ${i + 1}`}>
                  <Text style={{ color: st === 1 ? t.text : p.fg, fontWeight: '900' }}>{i + 1}</Text>
                  {st === 5 ? <View style={{ position: 'absolute', right: -3, bottom: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: '#16a34a', borderWidth: 2, borderColor: t.bg }} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Sheet>
      ) : null}

      {/* Submit confirmation */}
      <Dialog visible={confirmSubmit} onClose={() => setConfirmSubmit(false)} title={perSectionSubmit ? (hi ? 'सेक्शन सबमिट करें?' : 'Submit this section?') : (hi ? 'टेस्ट सबमिट करें?' : 'Submit the test?')}>
        <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            [(summary[3] || 0) + (summary[5] || 0), hi ? 'उत्तर दिए' : 'Answered', t.success],
            [summary[2] || 0, hi ? 'उत्तर नहीं' : 'Not answered', t.danger],
            [summary[4] || 0, hi ? 'रिव्यू' : 'Marked', t.violet],
            [notVisited, hi ? 'देखे नहीं' : 'Not visited', t.textMuted],
          ].map(([n, l, c]) => (
            <View key={String(l)} style={{ width: '47%', backgroundColor: t.cardAlt, borderRadius: 12, padding: 12 }}>
              <Text style={{ color: c as string, fontSize: 22, fontWeight: '900' }}>{n as number}</Text>
              <Text style={{ color: t.textSoft, fontSize: 12.5, fontWeight: '600' }}>{l as string}</Text>
            </View>
          ))}
        </View>
        {perSectionSubmit ? <Text style={{ color: t.warning, marginTop: 12, fontWeight: '600' }}>{hi ? 'सबमिट करने के बाद आप इस सेक्शन पर वापस नहीं आ सकते।' : "After submitting you can't come back to this section."}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Button style={{ flex: 1 }} outline title={hi ? 'वापस' : 'Back'} onPress={() => setConfirmSubmit(false)} />
          <Button style={{ flex: 1 }} tone="danger" title={hi ? 'सबमिट' : 'Submit'} onPress={() => { setConfirmSubmit(false); dispatch({ type: perSectionSubmit ? 'SUBMIT_SECTION' : 'SUBMIT_EXAM' }); }} />
        </View>
      </Dialog>

      {/* Leave (progress kept) */}
      <Dialog visible={leaving} onClose={() => setLeaving(false)} title={hi ? 'टेस्ट छोड़ें?' : 'Leave the test?'}
        text={hi ? 'आपकी प्रगति सेव है, आप बाद में जारी रख सकते हैं। टाइमर रुक जाएगा।' : 'Your progress is saved and you can continue later. The timer pauses.'}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Button style={{ flex: 1 }} outline title={hi ? 'जारी रखें' : 'Stay'} onPress={() => setLeaving(false)} />
          <Button style={{ flex: 1 }} title={hi ? 'छोड़ें' : 'Leave'} onPress={() => {
            const p = snapshot();
            if (p && !offline) request('save-exam-progress', { userId: user.id, snapshot: p }).catch(() => {});
            setLeaving(false); refreshUser(); nav.pop();
          }} />
        </View>
      </Dialog>

      {/* Violation warning */}
      <Dialog visible={violationNote && !state.isExamSubmitted} onClose={() => setViolationNote(false)} icon={<TriangleAlert size={30} color={t.danger} />} title={hi ? 'चेतावनी' : 'Warning'}
        text={hi ? `आपने टेस्ट के दौरान ऐप छोड़ा (${state.violationsCount}/${state.maxViolationsAllowed})। ${state.maxViolationsAllowed} बार होने पर टेस्ट अपने आप सबमिट हो जाएगा।`
          : `You left the app during the test (${state.violationsCount}/${state.maxViolationsAllowed}). At ${state.maxViolationsAllowed} the test is submitted automatically.`}>
        <Button style={{ marginTop: 18 }} title={hi ? 'समझ गया' : 'OK'} onPress={() => setViolationNote(false)} />
      </Dialog>

      {/* RPSC extra time rules */}
      <Dialog visible={!!state.isExtraTimeRulesShown} onClose={() => {}} title={hi ? 'अतिरिक्त 10 मिनट' : 'Extra 10 minutes'}
        text={hi ? 'समय समाप्त। बिना उत्तर वाले प्रश्नों के लिए केवल विकल्प (E) "प्रश्न अनुत्तरित छोड़ें" चुना जा सकता है। उत्तर दिए गए प्रश्न बदले नहीं जा सकते।'
          : 'Time is up. For unanswered questions you can only choose option (E) "Leave question unattempted". Answered questions can\'t be changed.'}>
        <Button style={{ marginTop: 18 }} title={hi ? 'शुरू करें' : 'Start extra time'} onPress={() => dispatch({ type: 'DISMISS_EXTRA_TIME_RULES' })} />
      </Dialog>
    </View>
  );
}
