import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AArrowDown, AArrowUp, Bookmark, BookmarkCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock, Flag, RotateCcw, Share2, Swords, Target, Trophy, Users, X } from 'lucide-react-native';
import { request, friendlyError } from '../api';
import { useData, flattenTests } from '../data';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useSession, useUser } from '../session';
import { useTheme } from '../theme';
import { TourTarget, useScreenTour, useTourScroll } from '../tour';
import { Button, Card, Dialog, Empty, ErrorBox, Header, HeaderButton, KeyValue, ListRow, Loading, Pill, ProgressBar, Ring, SectionTitle, Segmented, Skeleton, round2, stripHtml, StatusBarFor } from '../ui';
import { useExamFont } from './ExamRunScreen';
import { CreateRoomSheet } from './TestScreens';
import { api, MyRoom } from '../friendsApi';
import QuestionView from '../QuestionView';
import { generateExamSession, EXPLANATIONS } from '../shared/examUtils';
import { isCbatTest, isRpscRasTest, scoreSession } from '../shared/examScoring';
import { matchCbatBatteryKey } from '../shared/cbatData';
import { offlineAttempts, openOffline } from '../offline';
import type { ActiveSession, Question } from '../shared/webTypes';

// RRB NTPC CBAT estimated T-score (same reference values as the website; not the official score)
const CBAT_QUALIFYING_TSCORE = 42;
const CBAT_TSCORE: Record<string, { maxMarks: number; mean: number; sd: number }> = {
  'Classification Test': { maxMarks: 35, mean: 28, sd: 35 * 0.25 },
  'Add of Odd Numbers Test': { maxMarks: 30, mean: 15, sd: 30 * 0.25 },
  'Short Route Test': { maxMarks: 40, mean: 22, sd: 40 * 0.25 },
  'Information Ordering Type -I': { maxMarks: 25, mean: 20, sd: 25 * 0.25 },
  'Personality Test': { maxMarks: 35, mean: 30, sd: 35 * 0.25 },
};
const CBAT_MAX_COMPOSITE = 80 * Object.keys(CBAT_TSCORE).length;
const tScoreOf = (raw: number, mean: number, sd: number) => Math.round((sd ? 50 + 10 * ((raw - mean) / sd) : 50) * 10) / 10;

function CbatTScoreCard({ session, status }: { session: ActiveSession; status: (q: Question) => string }) {
  const t = useTheme();
  const { hi } = useI18n();
  const rows = session.sections.map(sec => {
    const key = matchCbatBatteryKey(sec.name) || (CBAT_TSCORE[sec.name] ? sec.name : null);
    const cfg = key ? CBAT_TSCORE[key] : null;
    const qs = session.questions.filter(q => q.sectionId === sec.id);
    const raw = qs.filter(q => status(q) === 'correct').length;
    return cfg ? { name: key!, raw, max: qs.length || cfg.maxMarks, t: tScoreOf(raw, cfg.mean, cfg.sd) } : null;
  }).filter(Boolean) as { name: string; raw: number; max: number; t: number }[];
  if (!rows.length) return null;
  const full = rows.length >= 3;
  const composite = Math.round(rows.reduce((a, r) => a + r.t, 0) * 10) / 10;
  return (
    <>
      <SectionTitle>{full ? (hi ? 'CBAT टी-स्कोर (अनुमानित)' : 'CBAT T-score (estimated)') : (hi ? 'बैटरी टी-स्कोर (अनुमानित)' : 'Battery T-score (estimated)')}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        {rows.map((r, i) => (
          <View key={r.name} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontWeight: '700' }}>{r.name}</Text>
              <Text style={{ color: t.textSoft, fontSize: 12 }}>{hi ? 'रॉ स्कोर' : 'Raw score'} {r.raw}/{r.max}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: r.t >= CBAT_QUALIFYING_TSCORE ? t.success : t.danger, fontSize: 20, fontWeight: '900' }}>{r.t}</Text>
              <Text style={{ color: r.t >= CBAT_QUALIFYING_TSCORE ? t.success : t.danger, fontSize: 11, fontWeight: '700' }}>{r.t >= CBAT_QUALIFYING_TSCORE ? (hi ? 'योग्य' : 'Qualified') : (hi ? 'अयोग्य' : 'Not qualified')}</Text>
            </View>
          </View>
        ))}
        {full ? (
          <View style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.border }}>
            <KeyValue label={hi ? 'कंपोज़िट टी-स्कोर' : 'Composite T-score'} value={composite} />
            <KeyValue label={hi ? 'मेरिट (30 में से)' : 'Merit (out of 30)'} value={Math.round((composite / CBAT_MAX_COMPOSITE) * 30 * 100) / 100} />
            <KeyValue label={hi ? 'कुल परिणाम' : 'Overall'} value={rows.every(r => r.t >= CBAT_QUALIFYING_TSCORE) ? (hi ? 'योग्य ✓' : 'Qualified ✓') : (hi ? 'अयोग्य' : 'Not qualified')} />
          </View>
        ) : null}
      </Card>
      <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 6 }}>
        {hi ? `अनुमान: असली टी-स्कोर उस शिफ्ट के सभी उम्मीदवारों पर निर्भर करता है। योग्यता के लिए हर बैटरी में ${CBAT_QUALIFYING_TSCORE}+ चाहिए।`
          : `Estimate: the official T-score depends on everyone in that exam shift. Each battery needs ${CBAT_QUALIFYING_TSCORE}+ to qualify.`}
      </Text>
    </>
  );
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;

/** Questions with answers for a test the student has finished (cached for the session). */
const sessionCache = new Map<string, ActiveSession>();
export async function loadAnsweredSession(testId: string, catalog: any[], l1?: string, l2?: string) {
  const key = `${testId}|${l1 || ''}|${l2 || ''}`;
  const hit = sessionCache.get(key);
  if (hit) return hit;
  const qs = await request('get-custom-questions', { testId });
  if (!qs.questions?.length) throw new Error('Questions are not available for this test.');
  const session = generateExamSession(testId, catalog, {
    questions: qs.questions, positiveMarks: qs.positiveMarks, negativeMarks: qs.negativeMarks, durationMinutes: qs.durationMinutes,
    questionsCount: qs.questionsCount, maxMarks: qs.maxMarks, hasSectionalTiming: qs.hasSectionalTiming, sectionalTimings: qs.sectionalTimings, sections: qs.sections,
  }, l1, l2);
  sessionCache.set(key, session);
  return session;
}

export const explanationOf = (q: Question, lang: 'en' | 'hi') => {
  const e: any = (EXPLANATIONS as any)?.[q.id] || q.explanation || {};
  const text = (lang === 'hi' ? e.hi : e.en) || e.en || '';
  return /under review|provided\.|समीक्षा|प्रदान की गई/.test(text) ? '' : text;
};

export function questionInput(q: Question, lang: 'en' | 'hi') {
  const c = lang === 'hi' && q.content.hi?.questionText ? q.content.hi : q.content.en;
  return {
    comprehension: c.comprehension, questionText: c.questionText, imageUrl: c.imageUrl,
    options: (c.options || []).map((o: any) => (typeof o === 'string' ? { text: o } : { text: o?.text || '', imageUrl: o?.imageUrl })),
  };
}

// ---- Result & solutions -------------------------------------------------------------------------

export function AnalysisScreen({ testId, attemptId, offline }: { testId: string; attemptId?: string; offline?: boolean }) {
  const t = useTheme();
  const { hi, lang } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { catalog: liveCatalog } = useData();
  // Downloaded test (offline): the package and the attempts made on this phone
  const [pkg, setPkg] = useState<any>(null);
  const [localAttempts, setLocalAttempts] = useState<any[]>([]);
  useEffect(() => {
    if (!offline) return;
    openOffline('mock', testId).then(setPkg, e => setError(e?.message === 'EXPIRED' ? (hi ? 'यह डाउनलोड समाप्त हो गया है।' : 'This download has expired.') : friendlyError(e)));
    offlineAttempts('mock', testId).then(setLocalAttempts);
  }, [offline, testId, hi]);
  const catalog = offline ? pkg?.data?.catalog || [] : liveCatalog;
  const attempts = useMemo(() => {
    const list: any[] = offline
      ? [...localAttempts.map(a => ({ ...a, id: a.localId, status: 'COMPLETED', date: (a.completedAt || '').slice(0, 10), offline: true })), ...(pkg?.data?.pastAttempts || [])]
      : (user.testSessions || []).filter(s => s.testId === testId && s.status !== 'ONGOING');
    return list.sort((a, b) => (b.completedAt || b.date || '').localeCompare(a.completedAt || a.date || ''));
  }, [offline, localAttempts, pkg, user.testSessions, testId]);
  const [selId, setSelId] = useState(attemptId || attempts[0]?.id);
  const record = attempts.find(a => a.id === selId) || attempts[0];
  const testItem = useMemo(() => flattenTests(catalog).find(x => x.test.id === testId)?.test, [catalog, testId]);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [responses, setResponses] = useState<Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number }> | null>(null);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState<{ list: Question[]; index: number } | null>(null);

  useEffect(() => {
    if (!record) return;
    setResponses(null);
    if (offline) {
      if (!pkg) return;
      setSession(generateExamSession(testId, pkg.data.catalog, pkg.data.customQs, record.lang1, record.lang2));
      setResponses(record.responses || {});
      return;
    }
    setError('');
    Promise.all([
      loadAnsweredSession(testId, catalog),
      request('get-session-responses', { userId: user.id, sessionId: record.id }).then(r => r.responses || {}),
    ]).then(([s, r]) => { setSession(s); setResponses(r); }, e => setError(friendlyError(e)));
  }, [record?.id, testId, catalog, user.id, offline, pkg]); // eslint-disable-line react-hooks/exhaustive-deps

  // Friends rooms for this test (to compare) and the "take with friends" sheet
  const [rooms, setRooms] = useState<MyRoom[]>([]);
  const [roomSheet, setRoomSheet] = useState(false);
  useEffect(() => { if (!offline) api<{ rooms: MyRoom[] }>('room-mine', { testId }).then(r => setRooms(r.rooms || []), () => {}); }, [testId, offline]);
  const scroll = useTourScroll('app_analysis');
  useScreenTour('app_analysis', hi ? [
    { target: 'an.score', title: 'आपका परिणाम', text: 'स्कोर, सटीकता और लगा समय, साथ में सही, गलत और छोड़े गए प्रश्न।' },
    { target: 'an.solutions', title: 'हर प्रश्न का हल', text: 'किसी भी प्रश्न नंबर पर टैप करें: सही उत्तर, आपका उत्तर और पूरा हल। वहीं से बुकमार्क या प्रश्न की रिपोर्ट करें।' },
    { target: 'an.friends', title: 'दोस्तों को चुनौती दें', text: 'यही टेस्ट दोस्तों के साथ दें और हर प्रश्न पर अंक और समय की तुलना करें।' },
  ] : [
    { target: 'an.score', title: 'Your result', text: 'Score, accuracy and time taken, with your correct, wrong and skipped questions.' },
    { target: 'an.solutions', title: 'Every solution', text: 'Tap any question number to see the right answer, your answer and the full solution. Bookmark or report a question from there.' },
    { target: 'an.friends', title: 'Challenge friends', text: 'Take this test with friends and compare marks and time on every question.' },
  ], !!session && !!responses);

  if (!record) {
    return <View style={{ flex: 1, backgroundColor: t.bg }}><Header title={hi ? 'परिणाम' : 'Result'} onBack={nav.pop} />{error ? <ErrorBox message={error} /> : offline && !pkg ? <Loading /> : <Empty title={hi ? 'अभी कोई प्रयास नहीं' : 'No attempts yet'} />}</View>;
  }

  const rpsc = session ? isRpscRasTest(testId, session) : false;
  const score = session && responses ? scoreSession(session, responses as any, rpsc) : null;
  const status = (q: Question) => {
    const r = responses?.[q.id];
    if (!r || r.selectedOptionIndex === null || r.selectedOptionIndex === undefined || (rpsc && r.selectedOptionIndex === 4)) return 'skipped';
    return r.selectedOptionIndex === q.correctOptionIndex ? 'correct' : 'wrong';
  };
  const timeTaken = responses ? Object.values(responses).reduce((a, r) => a + (r.elapsedSeconds || 0), 0) : record.durationSeconds || 0;
  const pct = record.maxScore ? Math.max(0, (record.score || 0) / record.maxScore) : 0;
  const scoreColor = pct >= 0.6 ? t.success : pct >= 0.35 ? t.accent : t.danger;
  const cbat = isCbatTest(testId, catalog);
  const shareScore = () => Share.share({
    message: hi
      ? `मैंने MockTest Hub पर "${record.title}" में ${round2(record.score)}/${record.maxScore} अंक पाए (${Math.round(record.accuracy || 0)}% सटीकता)। आप भी दें: https://mocktesthub.vercel.app`
      : `I scored ${round2(record.score)}/${record.maxScore} in "${record.title}" on MockTest Hub (${Math.round(record.accuracy || 0)}% accuracy). Try it: https://mocktesthub.vercel.app`,
  }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={hi ? 'परिणाम विश्लेषण' : 'Result analysis'} subtitle={record.title} onBack={nav.pop}
        right={<HeaderButton label={hi ? 'शेयर' : 'Share'} icon={<Share2 size={20} color={t.headerText} />} onPress={shareScore} />} />
      <ScrollView {...scroll} contentContainerStyle={{ paddingBottom: 30 }}>
        {attempts.length > 1 ? (
          <Segmented options={attempts.slice(0, 6).map((a, i) => ({ key: a.id, label: i === 0 ? (hi ? 'नवीनतम' : 'Latest') : a.date }))} value={record.id} onChange={setSelId} />
        ) : null}
        <View style={{ paddingHorizontal: 16, paddingTop: attempts.length > 1 ? 0 : 14 }}>
          {error ? <ErrorBox style={{ marginHorizontal: 0 }} message={error} /> : null}

          {/* Score */}
          <TourTarget id="an.score">
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Ring value={pct} size={112} stroke={11} color={scoreColor}>
                <Text style={{ color: t.text, fontSize: 22, fontWeight: '900' }}>{round2(record.score || 0)}</Text>
                <Text style={{ color: t.textMuted, fontSize: 12, fontWeight: '700' }}>/ {record.maxScore}</Text>
              </Ring>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ color: t.textSoft, fontWeight: '700', fontSize: 13 }}>{hi ? 'आपका स्कोर' : 'Your score'}</Text>
                <Pill tone="primary" icon={<Target size={12} color={t.primary} />} text={`${hi ? 'सटीकता' : 'Accuracy'} ${Math.round(record.accuracy || 0)}%`} />
                <Pill icon={<Clock size={12} color={t.textSoft} />} text={`${hi ? 'समय' : 'Time'} ${fmtTime(timeTaken)}`} />
                {record.violations ? <Pill tone="danger" text={`${hi ? 'उल्लंघन' : 'Violations'} ${record.violations}`} /> : null}
              </View>
            </View>
            {score ? (
              <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
                {[[score.correctCount, hi ? 'सही' : 'Correct', t.success, t.successSoft], [score.incorrectCount, hi ? 'गलत' : 'Wrong', t.danger, t.dangerSoft], [score.unattemptedCount, hi ? 'छोड़े' : 'Skipped', t.textSoft, t.cardAlt]].map(([n, l, c, bg]) => (
                  <View key={String(l)} style={{ flex: 1, alignItems: 'center', backgroundColor: bg as string, borderRadius: 12, paddingVertical: 10 }}>
                    <Text style={{ color: c as string, fontSize: 22, fontWeight: '900' }}>{n as number}</Text>
                    <Text style={{ color: t.textSoft, fontSize: 12, fontWeight: '700' }}>{l as string}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
          </TourTarget>

          {/* Where you stand */}
          {record.testbookRank || testItem?.testbookTopperScore ? (
            <>
              <SectionTitle>{hi ? 'आप कहां हैं' : 'Where you stand'}</SectionTitle>
              <Card>
                {record.testbookRank ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <Trophy size={22} color={t.accent} />
                    <Text style={{ color: t.text, fontWeight: '900', fontSize: 18 }}>#{record.testbookRank}</Text>
                    <Text style={{ color: t.textSoft, flex: 1 }}>{testItem?.testbookTotalUsers ? `${hi ? 'में से' : 'of'} ${testItem.testbookTotalUsers.toLocaleString('en-IN')}` : ''}</Text>
                    {record.testbookPercentile != null ? <Pill tone="success" text={`${record.testbookPercentile} %ile`} /> : null}
                  </View>
                ) : null}
                {testItem?.testbookTopperScore && record.maxScore ? (
                  <View style={{ marginBottom: 6 }}>
                    <ProgressBar value={pct} color={scoreColor} height={10} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                      <Text style={{ color: t.textMuted, fontSize: 11.5 }}>0</Text>
                      <Text style={{ color: t.textMuted, fontSize: 11.5 }}>{hi ? 'आप' : 'You'} {round2(record.score)} · {hi ? 'टॉपर' : 'Topper'} {testItem.testbookTopperScore}</Text>
                      <Text style={{ color: t.textMuted, fontSize: 11.5 }}>{record.maxScore}</Text>
                    </View>
                  </View>
                ) : null}
                {testItem?.testbookTopperScore ? <KeyValue label={hi ? 'टॉपर स्कोर' : 'Topper score'} value={testItem.testbookTopperScore} /> : null}
                {testItem?.testbookAverageScore ? <KeyValue label={hi ? 'औसत स्कोर' : 'Average score'} value={testItem.testbookAverageScore} /> : null}
                {testItem?.testbookCutoffScore ? <KeyValue last label={hi ? 'कट-ऑफ' : 'Cut-off'} value={<Text style={{ color: record.score >= testItem.testbookCutoffScore ? t.success : t.danger, fontWeight: '800' }}>{testItem.testbookCutoffScore} · {record.score >= testItem.testbookCutoffScore ? (hi ? 'ऊपर ✓' : 'above ✓') : (hi ? 'नीचे' : 'below')}</Text>} /> : null}
              </Card>
            </>
          ) : null}

          {session && responses ? (
            <>
              {cbat ? <CbatTScoreCard session={session} status={status} /> : null}
              {session.sections.length > 1 ? (
                <>
                  <SectionTitle>{hi ? 'सेक्शन-वार प्रदर्शन' : 'Section-wise performance'}</SectionTitle>
                  <Card style={{ gap: 14 }}>
                    {session.sections.map(sec => {
                      const qs = session.questions.filter(q => q.sectionId === sec.id);
                      const c = qs.filter(q => status(q) === 'correct').length;
                      const w = qs.filter(q => status(q) === 'wrong').length;
                      const marks = qs.reduce((m, q) => m + (status(q) === 'correct' ? (q.positiveMark ?? sec.positiveMark) : status(q) === 'wrong' ? -(q.negativeMark ?? sec.negativeMark) : 0), 0);
                      const max = qs.reduce((m, q) => m + (q.positiveMark ?? sec.positiveMark), 0) || 1;
                      return (
                        <View key={sec.id}>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 }}>
                            <Text style={{ color: t.text, fontWeight: '800', flex: 1 }} numberOfLines={1}>{sec.name}</Text>
                            <Text style={{ color: t.text, fontWeight: '900' }}>{round2(marks)}</Text>
                            <Text style={{ color: t.textMuted, fontWeight: '700' }}> / {round2(max)}</Text>
                          </View>
                          <ProgressBar value={marks / max} color={marks / max >= 0.6 ? t.success : marks / max >= 0.35 ? t.accent : t.danger} />
                          <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 6 }}>
                            <Text style={{ color: t.success, fontWeight: '800' }}>✓ {c}</Text>   <Text style={{ color: t.danger, fontWeight: '800' }}>✗ {w}</Text>   – {qs.length - c - w}  ·  {qs.length} {hi ? 'प्रश्न' : 'questions'}
                          </Text>
                        </View>
                      );
                    })}
                  </Card>
                </>
              ) : null}

              <SectionTitle>{hi ? 'समाधान' : 'Solutions'}</SectionTitle>
              <TourTarget id="an.solutions">
                <SolutionsList session={session} status={status} onOpen={(list, index) => setViewer({ list, index })} />
              </TourTarget>
            </>
          ) : !error ? <View style={{ marginTop: 16 }}><Skeleton rows={3} height={90} /></View> : null}

          {/* With friends */}
          {!offline && rooms.length ? (
            <>
              <SectionTitle>{hi ? 'दोस्तों से तुलना' : 'Compare with friends'}</SectionTitle>
              {rooms.slice(0, 3).map(r => (
                <Card key={r.code} onPress={() => nav.push({ name: 'room', code: r.code })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <Users size={20} color={t.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.text, fontWeight: '800' }}>{hi ? 'रूम' : 'Room'} {r.code}</Text>
                    <Text style={{ color: t.textSoft, fontSize: 12.5 }}>{r.members} {hi ? 'सदस्य' : 'members'}</Text>
                  </View>
                  <ChevronRight size={18} color={t.textMuted} />
                </Card>
              ))}
            </>
          ) : null}

          {record.offline ? <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 12 }}>{hi ? 'यह प्रयास ऑफ़लाइन दिया गया। इंटरनेट आने पर यह आपके खाते में अपलोड हो जाएगा और सर्वर इसे फिर से जांचेगा।' : 'Taken offline. It is uploaded to your account (and re-checked by the server) when you are online.'}</Text> : null}
          <View style={{ gap: 10, marginTop: 20 }}>
            {!offline && !cbat ? <TourTarget id="an.friends"><Button soft title={hi ? 'दोस्तों के साथ दें' : 'Take with friends'} icon={<Swords size={18} color={t.primary} />} onPress={() => setRoomSheet(true)} /></TourTarget> : null}
            <Button outline title={hi ? 'फिर से दें' : 'Retake test'} icon={<RotateCcw size={18} color={t.primary} />}
              onPress={() => nav.replace(offline ? { name: 'examRun', testId, offline: true } : { name: 'testInfo', testId })} />
          </View>
        </View>
      </ScrollView>

      {viewer && session && responses ? (
        <SolutionViewer
          testId={testId} testTitle={record.title} session={session} list={viewer.list} index={viewer.index} lang={lang}
          chosen={(q: Question) => responses[q.id]?.selectedOptionIndex ?? null} rpsc={rpsc}
          onClose={() => setViewer(null)} onIndex={i => setViewer(v => (v ? { ...v, index: i } : v))}
        />
      ) : null}
      {roomSheet ? <CreateRoomSheet testId={testId} testTitle={record.title} onClose={() => setRoomSheet(false)} /> : null}
    </View>
  );
}

/** Question grid with filters. noBookmark: for papers that aren't kept (live tests). */
export function SolutionsList({ session, status, onOpen, noBookmark }: { session: ActiveSession; status: (q: Question) => string; onOpen: (list: Question[], i: number) => void; noBookmark?: boolean }) {
  const t = useTheme();
  const { hi } = useI18n();
  const user = useUser();
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped' | 'bookmarked'>('all');
  const ordered = useMemo(() => session.sections.flatMap(s => session.questions.filter(q => q.sectionId === s.id).sort((a, b) => a.orderIndex - b.orderIndex)), [session]);
  const marks = new Set((user.bookmarkedQuestions || []).filter(b => b.testId === session.testId).map(b => b.questionId));
  const list = ordered.filter(q => filter === 'all' || (filter === 'bookmarked' ? marks.has(q.id) : status(q) === filter));
  const colors: Record<string, [string, string]> = { correct: [t.success, t.dark ? '#0b111c' : '#fff'], wrong: [t.danger, t.dark ? '#0b111c' : '#fff'], skipped: [t.cardAlt, t.text] };
  return (
    <>
      <View style={{ marginHorizontal: -16 }}>
        <Segmented
          options={[
            { key: 'all', label: `${hi ? 'सभी' : 'All'} ${ordered.length}` },
            { key: 'correct', label: `${hi ? 'सही' : 'Correct'} ${ordered.filter(q => status(q) === 'correct').length}` },
            { key: 'wrong', label: `${hi ? 'गलत' : 'Wrong'} ${ordered.filter(q => status(q) === 'wrong').length}` },
            { key: 'skipped', label: `${hi ? 'छोड़े' : 'Skipped'} ${ordered.filter(q => status(q) === 'skipped').length}` },
            ...(noBookmark ? [] : [{ key: 'bookmarked', label: `${hi ? 'बुकमार्क' : 'Bookmarked'} ${marks.size}` }]),
          ]}
          value={filter} onChange={setFilter as any}
        />
      </View>
      <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 }}>
        {list.map((q, i) => {
          const [bg, fg] = colors[status(q)];
          return (
            <Pressable key={q.id} onPress={() => onOpen(list, i)} accessibilityLabel={`${hi ? 'प्रश्न' : 'Question'} ${ordered.indexOf(q) + 1}`}
              style={({ pressed }) => ({ width: 46, height: 42, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1, borderWidth: status(q) === 'skipped' ? 1 : 0, borderColor: t.border })}>
              <Text style={{ color: fg, fontWeight: '900' }}>{ordered.indexOf(q) + 1}</Text>
              {marks.has(q.id) ? <View style={{ position: 'absolute', top: 3, right: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#facc15' }} /> : null}
            </Pressable>
          );
        })}
        {list.length === 0 ? <Text style={{ color: t.textMuted, padding: 4 }}>{hi ? 'कोई प्रश्न नहीं।' : 'No questions here.'}</Text> : null}
      </Card>
      <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 8 }}>{hi ? 'किसी प्रश्न पर टैप करें: सही उत्तर और व्याख्या देखें।' : 'Tap a question to see the correct answer and the explanation.'}</Text>
    </>
  );
}

/** Full-screen question review: correct answer, the student's choice, explanation, bookmark, report. */
export function SolutionViewer({ testId, testTitle, session, list, index, lang, chosen, rpsc, onClose, onIndex, noBookmark }: {
  testId: string; testTitle: string; session?: ActiveSession; list: Question[]; index: number; lang: 'en' | 'hi'; chosen: (q: Question) => number | null; rpsc?: boolean;
  onClose: () => void; onIndex: (i: number) => void;
  /** Live tests: the paper isn't kept, so a bookmark couldn't be opened later */
  noBookmark?: boolean;
}) {
  const t = useTheme();
  const { hi } = useI18n();
  const user = useUser();
  const { patchUser } = useSession();
  const insets = useSafeAreaInsets();
  const font = useExamFont();
  const [qLang, setQLang] = useState(lang);
  const [report, setReport] = useState(false);
  const [note, setNote] = useState('');
  const q = list[index];
  const bookmarks = user.bookmarkedQuestions || [];
  const marked = bookmarks.some(b => b.testId === testId && b.questionId === q.id);
  const input = questionInput(q, qLang);
  if (rpsc) input.options.push({ text: hi ? '(E) प्रश्न अनुत्तरित छोड़ें' : '(E) Leave question unattempted' });

  const toggleBookmark = async () => {
    const next = marked ? bookmarks.filter(b => !(b.testId === testId && b.questionId === q.id)) : [...bookmarks, { testId, questionId: q.id }];
    patchUser({ bookmarkedQuestions: next });
    try { const r = await request('toggle-bookmark', { userId: user.id, testId, questionId: q.id, bookmarked: !marked }); if (r.bookmarks) patchUser({ bookmarkedQuestions: r.bookmarks }); }
    catch (e) { patchUser({ bookmarkedQuestions: bookmarks }); setNote(friendlyError(e)); }
  };
  // Where the question is in the test (the server checks it again against the test itself)
  const qIndex = session ? session.questions.findIndex(x => x.id === q.id) : -1;
  const reportInfo: ReportInfo = {
    questionId: q.id,
    examName: [session?.testCategory, session?.testSubcategory].filter(Boolean).join(' › '),
    testTitle,
    sectionName: session?.sections.find(sec => sec.id === q.sectionId)?.name || '',
    questionNumber: qIndex >= 0 ? qIndex + 1 : null,
    preview: stripHtml(input.questionText).slice(0, 1500),
  };
  const sendReport = async (reason: string, message: string) => {
    await request('report-question', {
      questionId: q.id, reason, message, questionText: stripHtml(input.questionText).slice(0, 2000), mockTestId: testId, mockTestTitle: testTitle,
      examName: reportInfo.examName, sectionName: reportInfo.sectionName, questionNumber: reportInfo.questionNumber, language: qLang,
    });
  };
  const iconBtn = { width: 42, height: 42, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 21 };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ backgroundColor: t.card, paddingTop: insets.top, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: t.border }}>
          <StatusBarFor color={t.card} />
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 56, gap: 2 }}>
            <Pressable onPress={onClose} style={iconBtn} accessibilityLabel={hi ? 'बंद करें' : 'Close'}><X size={22} color={t.text} /></Pressable>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: t.text, fontWeight: '900', fontSize: 16 }}>{hi ? 'प्र.' : 'Q'} {index + 1}<Text style={{ color: t.textMuted, fontWeight: '700' }}> / {list.length}</Text></Text>
            </View>
            {q.content.hi?.questionText ? (
              <Pressable onPress={() => setQLang(l => (l === 'hi' ? 'en' : 'hi'))} style={iconBtn} accessibilityLabel={hi ? 'भाषा बदलें' : 'Change language'}>
                <View style={{ borderWidth: 1.5, borderColor: t.border, borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ color: t.text, fontWeight: '900', fontSize: 12 }}>{qLang === 'hi' ? 'हि' : 'EN'}</Text></View>
              </Pressable>
            ) : null}
            <Pressable onPress={font.smaller} style={iconBtn} accessibilityLabel={hi ? 'छोटा अक्षर' : 'Smaller text'}><AArrowDown size={19} color={t.text} /></Pressable>
            <Pressable onPress={font.bigger} style={iconBtn} accessibilityLabel={hi ? 'बड़ा अक्षर' : 'Larger text'}><AArrowUp size={19} color={t.text} /></Pressable>
            {noBookmark ? null : <Pressable onPress={toggleBookmark} style={iconBtn} accessibilityLabel={hi ? 'बुकमार्क' : 'Bookmark'}>{marked ? <BookmarkCheck size={21} color="#eab308" /> : <Bookmark size={21} color={t.text} />}</Pressable>}
            <Pressable onPress={() => setReport(true)} style={iconBtn} accessibilityLabel={hi ? 'प्रश्न रिपोर्ट करें' : 'Report question'}><Flag size={19} color={t.text} /></Pressable>
          </View>
        </View>
        {note ? <Pressable onPress={() => setNote('')} style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: t.primarySoft }}><Text style={{ color: t.primary, fontWeight: '700' }}>{note}</Text></Pressable> : null}
        <QuestionView
          pageKey={`${q.id}-${qLang}-review`}
          {...input}
          selected={null}
          fontScale={font.scale}
          review={{ correct: q.correctOptionIndex, chosen: chosen(q), explanation: explanationOf(q, qLang) }}
          watermark={`${user.name} · ${user.candidateCode}`}
          labels={{
            passage: hi ? 'अनुच्छेद' : 'Passage', explanation: hi ? 'व्याख्या' : 'Solution', yourAnswer: hi ? 'आपका उत्तर' : 'Your answer', correct: hi ? 'सही उत्तर' : 'Correct answer',
            skipped: hi ? 'उत्तर नहीं दिया' : 'Not answered', right: hi ? 'सही' : 'Correct', wrong: hi ? 'गलत' : 'Wrong',
          }}
        />
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 + insets.bottom, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border }}>
          <Button style={{ flex: 1 }} outline title={hi ? 'पिछला' : 'Previous'} icon={<ChevronLeft size={18} color={t.primary} />} disabled={index === 0} onPress={() => onIndex(index - 1)} />
          <Button style={{ flex: 1 }} title={hi ? 'अगला' : 'Next'} icon={<ChevronRight size={18} color={t.primaryText} />} disabled={index === list.length - 1} onPress={() => onIndex(index + 1)} />
        </View>
        <ReportSheet visible={report} info={reportInfo} onClose={() => setReport(false)} onSubmit={sendReport} />
      </View>
    </Modal>
  );
}

// ---- Report a question ---------------------------------------------------------------------------

const REPORT_REASONS: [string, string, string][] = [
  ['wrong_answer', 'Wrong answer', 'गलत उत्तर'], ['wrong_question', 'Wrong question', 'गलत प्रश्न'],
  ['options', 'Option problem', 'विकल्प में गलती'], ['solution', 'Solution unclear', 'हल स्पष्ट नहीं'],
  ['typo', 'Spelling / typo', 'वर्तनी / टाइपिंग'], ['translation', 'Translation', 'अनुवाद'],
  ['image', 'Image missing', 'चित्र नहीं दिखा'], ['other', 'Other', 'अन्य'],
];
type ReportInfo = { questionId: string; examName?: string; testTitle?: string; sectionName?: string; questionNumber?: number | null; preview?: string };
const REPORT_MAX = 1000;

/** Same as the website: where the question is (exam, test, number, date, id), the kind of problem, a message. */
function ReportSheet({ visible, info, onClose, onSubmit }: { visible: boolean; info: ReportInfo; onClose: () => void; onSubmit: (reason: string, message: string) => Promise<void> }) {
  const t = useTheme();
  const { hi } = useI18n();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('wrong_answer');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // A fresh form for each question
  useEffect(() => {
    if (!visible) return;
    setReason('wrong_answer'); setMessage(''); setBusy(false); setDone(false); setError('');
  }, [visible, info.questionId]);
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(onClose, 1800);
    return () => clearTimeout(timer);
  }, [done, onClose]);

  const needsMessage = reason === 'other';
  const send = async () => {
    if (needsMessage && message.trim().length < 5) { setError(hi ? 'कृपया समस्या का विवरण लिखें (कम से कम कुछ शब्द)।' : 'Please describe the problem (at least a few words).'); return; }
    setBusy(true); setError('');
    try { await onSubmit(reason, message.trim()); setDone(true); }
    catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  };

  const today = new Date().toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const rows: [string, string][] = [
    [hi ? 'परीक्षा' : 'Exam', info.examName || '—'],
    [hi ? 'टेस्ट' : 'Test', info.testTitle || '—'],
    [hi ? 'प्रश्न' : 'Question', `${info.questionNumber ? `Q${info.questionNumber}` : '—'}${info.sectionName ? ` · ${info.sectionName}` : ''}`],
    [hi ? 'दिनांक' : 'Date', today],
  ];
  const label = { color: t.textMuted, fontSize: 12.5, width: 92 } as const;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={() => { if (!busy) onClose(); }} accessibilityLabel={hi ? 'बंद करें' : 'Close'} />
        <View style={{ backgroundColor: t.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%', paddingBottom: insets.bottom }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: t.border }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.dangerSoft, alignItems: 'center', justifyContent: 'center' }}><Flag size={18} color={t.danger} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 17, fontWeight: '900' }}>{hi ? 'इस प्रश्न की रिपोर्ट करें' : 'Report this question'}</Text>
              <Text style={{ color: t.textMuted, fontSize: 12.5, marginTop: 1 }}>{hi ? 'हमारी टीम हर रिपोर्ट देखकर प्रश्न ठीक करती है।' : 'Our team checks every report and fixes the question.'}</Text>
            </View>
            <Pressable onPress={onClose} disabled={busy} hitSlop={8} accessibilityLabel={hi ? 'बंद करें' : 'Close'} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}><X size={20} color={t.textSoft} /></Pressable>
          </View>

          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 }}>
              <CheckCircle2 size={48} color={t.success} />
              <Text style={{ color: t.text, fontSize: 17, fontWeight: '900', marginTop: 12 }}>{hi ? 'धन्यवाद! रिपोर्ट भेज दी गई।' : 'Thank you! Report sent.'}</Text>
              <Text style={{ color: t.textSoft, marginTop: 6, textAlign: 'center' }}>{hi ? 'हम इस प्रश्न की जांच करके ज़रूरत हो तो सुधार करेंगे।' : 'We will check this question and correct it if needed.'}</Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 16 }}>
              <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 14, backgroundColor: t.cardAlt, overflow: 'hidden' }}>
                {rows.map(([k, v]) => (
                  <View key={k} style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: t.border }}>
                    <Text style={label}>{k}</Text>
                    <Text style={{ flex: 1, color: t.text, fontWeight: '700', fontSize: 13.5 }}>{v}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9 }}>
                  <Text style={label}>{hi ? 'प्रश्न आईडी' : 'Question ID'}</Text>
                  <Text selectable style={{ flex: 1, color: t.textSoft, fontSize: 12, fontFamily: Platform.OS === 'android' ? 'monospace' : undefined }}>{info.questionId}</Text>
                </View>
                {info.preview ? <Text selectable style={{ color: t.textSoft, fontSize: 13, lineHeight: 19, paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: t.border }}>{info.preview}</Text> : null}
              </View>

              <View>
                <Text style={{ color: t.text, fontWeight: '800', marginBottom: 8 }}>{hi ? 'समस्या क्या है?' : 'What is the problem?'}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {REPORT_REASONS.map(([key, en, h]) => {
                    const on = reason === key;
                    return (
                      <Pressable key={key} onPress={() => setReason(key)} accessibilityRole="button" accessibilityState={{ selected: on }}
                        style={{ width: '48%', minHeight: 42, borderRadius: 12, borderWidth: 1.5, borderColor: on ? t.primary : t.border, backgroundColor: on ? t.primary : 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                        <Text style={{ color: on ? t.primaryText : t.text, fontWeight: '700', fontSize: 13 }}>{hi ? h : en}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={{ color: t.text, fontWeight: '800' }}>
                  {hi ? 'समस्या का विवरण' : 'Describe the problem'} <Text style={{ color: t.textMuted, fontWeight: '500' }}>{needsMessage ? (hi ? '(ज़रूरी)' : '(required)') : (hi ? '(वैकल्पिक)' : '(optional)')}</Text>
                </Text>
                <TextInput value={message} onChangeText={v => setMessage(v.slice(0, REPORT_MAX))} multiline maxLength={REPORT_MAX}
                  placeholder={hi ? 'उदाहरण: सही उत्तर विकल्प C होना चाहिए, क्योंकि…' : 'For example: the correct answer should be option C, because…'} placeholderTextColor={t.textMuted}
                  style={{ minHeight: 96, marginTop: 8, color: t.text, borderWidth: 1.5, borderColor: t.border, borderRadius: 12, padding: 12, textAlignVertical: 'top', backgroundColor: t.input, fontSize: 15 }} />
                <Text style={{ color: t.textMuted, fontSize: 11.5, textAlign: 'right', marginTop: 4 }}>{message.length}/{REPORT_MAX}</Text>
              </View>

              {error ? <ErrorBox message={error} /> : null}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button style={{ flex: 1 }} outline title={hi ? 'रद्द करें' : 'Cancel'} disabled={busy} onPress={onClose} />
                <Button style={{ flex: 1.4 }} title={hi ? 'रिपोर्ट भेजें' : 'Send report'} icon={<Flag size={17} color={t.primaryText} />} loading={busy} onPress={send} />
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---- Bookmarked questions -------------------------------------------------------------------------

export function BookmarksScreen() {
  const t = useTheme();
  const { hi, lang } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { catalog } = useData();
  const bookmarks = useMemo(() => [...(user.bookmarkedQuestions || [])].reverse(), [user.bookmarkedQuestions]);
  const [sessions, setSessions] = useState<Record<string, ActiveSession | 'error'>>({});
  const [viewer, setViewer] = useState<{ list: Question[]; index: number; testId: string; title: string } | null>(null);
  const titles = useMemo(() => new Map(flattenTests(catalog).map(x => [x.test.id, x.test.title])), [catalog]);

  const load = useCallback(() => {
    const ids = [...new Set(bookmarks.map(b => b.testId))];
    ids.forEach(id => {
      if (sessions[id]) return;
      loadAnsweredSession(id, catalog).then(s => setSessions(m => ({ ...m, [id]: s })), () => setSessions(m => ({ ...m, [id]: 'error' })));
    });
  }, [bookmarks, catalog, sessions]);
  useEffect(load, [bookmarks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = bookmarks.map(b => {
    const s = sessions[b.testId];
    const q = s && s !== 'error' ? s.questions.find(x => x.id === b.questionId) : undefined;
    return { ...b, q, state: s === 'error' ? 'error' : s ? (q ? 'ready' : 'missing') : 'loading' };
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={hi ? 'बुकमार्क किए गए प्रश्न' : 'Bookmarked questions'} subtitle={`${bookmarks.length}`} onBack={nav.pop} />
      <FlatList
        data={items}
        keyExtractor={b => `${b.testId}:${b.questionId}`}
        ListEmptyComponent={<Empty title={hi ? 'अभी कोई बुकमार्क नहीं' : 'No bookmarks yet'} text={hi ? 'टेस्ट के समाधान में किसी प्रश्न को बुकमार्क करें।' : 'Bookmark questions while reviewing a test’s solutions.'} icon={<Bookmark size={40} color={t.textMuted} />} />}
        renderItem={({ item: b }) => (
          <ListRow
            onPress={() => {
              if (b.state !== 'ready') return;
              const sameTest = items.filter(x => x.testId === b.testId && x.q).map(x => x.q!) as Question[];
              setViewer({ list: sameTest, index: sameTest.findIndex(x => x.id === b.questionId), testId: b.testId, title: titles.get(b.testId) || '' });
            }}
            title={titles.get(b.testId) || (hi ? 'टेस्ट' : 'Test')}
            subtitle={b.state === 'ready' ? stripHtml((lang === 'hi' && b.q!.content.hi?.questionText) || b.q!.content.en.questionText).slice(0, 140)
              : b.state === 'loading' ? (hi ? 'लोड हो रहा है…' : 'Loading…') : b.state === 'missing' ? (hi ? 'यह प्रश्न अब उपलब्ध नहीं है' : 'This question is no longer available') : (hi ? 'लोड नहीं हो सका' : "Couldn't load")}
          />
        )}
      />
      {viewer ? (
        <SolutionViewer testId={viewer.testId} testTitle={viewer.title} list={viewer.list} index={viewer.index} lang={lang}
          chosen={() => null} onClose={() => setViewer(null)} onIndex={i => setViewer(v => (v ? { ...v, index: i } : v))} />
      ) : null}
    </View>
  );
}
