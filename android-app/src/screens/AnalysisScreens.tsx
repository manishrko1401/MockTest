import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Flag, RotateCcw, X } from 'lucide-react-native';
import { request, friendlyError } from '../api';
import { useData, flattenTests } from '../data';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useSession, useUser } from '../session';
import { useTheme } from '../theme';
import { Button, Card, Empty, ErrorBox, Header, HeaderButton, KeyValue, ListRow, Loading, Pill, SectionTitle, Segmented, stripHtml } from '../ui';
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
async function loadAnsweredSession(testId: string, catalog: any[], l1?: string, l2?: string) {
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

const explanationOf = (q: Question, lang: 'en' | 'hi') => {
  const e: any = (EXPLANATIONS as any)?.[q.id] || q.explanation || {};
  const text = (lang === 'hi' ? e.hi : e.en) || e.en || '';
  return /under review|provided\.|समीक्षा|प्रदान की गई/.test(text) ? '' : text;
};

function questionInput(q: Question, lang: 'en' | 'hi') {
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

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={hi ? 'परिणाम विश्लेषण' : 'Result analysis'} subtitle={record.title} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
        {attempts.length > 1 ? (
          <Segmented options={attempts.slice(0, 5).map((a, i) => ({ key: a.id, label: i === 0 ? (hi ? 'नवीनतम' : 'Latest') : a.date }))} value={record.id} onChange={setSelId} />
        ) : null}
        {error ? <ErrorBox message={error} /> : null}

        <Card style={{ alignItems: 'center' }}>
          <Text style={{ color: t.textSoft, fontWeight: '600' }}>{hi ? 'आपका स्कोर' : 'Your score'}</Text>
          <Text style={{ color: t.primary, fontSize: 40, fontWeight: '900' }}>{Math.round((record.score || 0) * 100) / 100}<Text style={{ fontSize: 20, color: t.textSoft }}> / {record.maxScore}</Text></Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Pill text={`${hi ? 'शुद्धता' : 'Accuracy'} ${Math.round(record.accuracy || 0)}%`} tone="primary" />
            <Pill text={`${hi ? 'समय' : 'Time'} ${fmtTime(timeTaken)}`} />
            {record.violations ? <Pill text={`${hi ? 'उल्लंघन' : 'Violations'} ${record.violations}`} tone="danger" /> : null}
          </View>
          {score ? (
            <View style={{ flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' }}>
              {[[score.correctCount, hi ? 'सही' : 'Correct', t.success], [score.incorrectCount, hi ? 'गलत' : 'Wrong', t.danger], [score.unattemptedCount, hi ? 'छोड़े' : 'Skipped', t.textMuted]].map(([n, l, c]) => (
                <View key={String(l)} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: c as string, fontSize: 22, fontWeight: '900' }}>{n as number}</Text>
                  <Text style={{ color: t.textSoft, fontSize: 12 }}>{l as string}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        {record.testbookRank || testItem?.testbookTopperScore ? (
          <>
            <SectionTitle>{hi ? 'आप कहां हैं' : 'Where you stand'}</SectionTitle>
            <Card>
              {record.testbookRank ? <KeyValue label={hi ? 'अनुमानित रैंक' : 'Estimated rank'} value={`#${record.testbookRank}${testItem?.testbookTotalUsers ? ` / ${testItem.testbookTotalUsers.toLocaleString('en-IN')}` : ''}`} /> : null}
              {record.testbookPercentile != null ? <KeyValue label={hi ? 'पर्सेंटाइल' : 'Percentile'} value={`${record.testbookPercentile}`} /> : null}
              {testItem?.testbookTopperScore ? <KeyValue label={hi ? 'टॉपर स्कोर' : 'Topper score'} value={testItem.testbookTopperScore} /> : null}
              {testItem?.testbookAverageScore ? <KeyValue label={hi ? 'औसत स्कोर' : 'Average score'} value={testItem.testbookAverageScore} /> : null}
              {testItem?.testbookCutoffScore ? <KeyValue label={hi ? 'कट-ऑफ' : 'Cut-off'} value={`${testItem.testbookCutoffScore} · ${record.score >= testItem.testbookCutoffScore ? (hi ? 'ऊपर ✓' : 'above ✓') : (hi ? 'नीचे' : 'below')}`} /> : null}
              {testItem?.testbookTopperScore && record.maxScore ? (
                <View style={{ marginTop: 12 }}>
                  <View style={{ height: 10, borderRadius: 5, backgroundColor: t.cardAlt, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.max(2, Math.min(100, (record.score / record.maxScore) * 100))}%`, height: 10, backgroundColor: t.primary, borderRadius: 5 }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ color: t.textMuted, fontSize: 11 }}>0</Text>
                    <Text style={{ color: t.textMuted, fontSize: 11 }}>{hi ? 'टॉपर' : 'Topper'} {testItem.testbookTopperScore}</Text>
                    <Text style={{ color: t.textMuted, fontSize: 11 }}>{record.maxScore}</Text>
                  </View>
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {session && responses ? (
          <>
            {isCbatTest(testId, catalog) ? <CbatTScoreCard session={session} status={status} /> : null}
            {session.sections.length > 1 ? (
              <>
                <SectionTitle>{hi ? 'सेक्शन-वार प्रदर्शन' : 'Section-wise performance'}</SectionTitle>
                <Card style={{ paddingVertical: 4 }}>
                  {session.sections.map((sec, i) => {
                    const qs = session.questions.filter(q => q.sectionId === sec.id);
                    const c = qs.filter(q => status(q) === 'correct').length;
                    const w = qs.filter(q => status(q) === 'wrong').length;
                    const marks = qs.reduce((m, q) => m + (status(q) === 'correct' ? (q.positiveMark ?? sec.positiveMark) : status(q) === 'wrong' ? -(q.negativeMark ?? sec.negativeMark) : 0), 0);
                    return (
                      <View key={sec.id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
                        <View style={{ flexDirection: 'row' }}>
                          <Text style={{ color: t.text, fontWeight: '700', flex: 1 }}>{sec.name}</Text>
                          <Text style={{ color: t.primary, fontWeight: '800' }}>{Math.round(marks * 100) / 100}</Text>
                        </View>
                        <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 2 }}>✓ {c}  ✗ {w}  – {qs.length - c - w}  ·  {qs.length} {hi ? 'प्रश्न' : 'questions'}</Text>
                      </View>
                    );
                  })}
                </Card>
              </>
            ) : null}

            <SectionTitle>{hi ? 'समाधान' : 'Solutions'}</SectionTitle>
            <SolutionsList session={session} status={status} onOpen={(list, index) => setViewer({ list, index })} />
          </>
        ) : !error ? <Loading /> : null}

        {record.offline ? <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 12 }}>{hi ? 'यह प्रयास ऑफ़लाइन दिया गया। इंटरनेट आने पर यह आपके खाते में अपलोड हो जाएगा और सर्वर इसे फिर से जांचेगा।' : 'Taken offline. It is uploaded to your account (and re-checked by the server) when you are online.'}</Text> : null}
        <Button style={{ marginTop: 18 }} outline title={hi ? 'फिर से दें' : 'Retake test'} icon={<RotateCcw size={18} color={t.primary} />}
          onPress={() => nav.replace(offline ? { name: 'examRun', testId, offline: true } : { name: 'testInfo', testId })} />
      </ScrollView>

      {viewer && session && responses ? (
        <SolutionViewer
          testId={testId} testTitle={record.title} list={viewer.list} index={viewer.index} lang={lang}
          chosen={(q: Question) => responses[q.id]?.selectedOptionIndex ?? null} rpsc={rpsc}
          onClose={() => setViewer(null)} onIndex={i => setViewer(v => (v ? { ...v, index: i } : v))}
        />
      ) : null}
    </View>
  );
}

function SolutionsList({ session, status, onOpen }: { session: ActiveSession; status: (q: Question) => string; onOpen: (list: Question[], i: number) => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const user = useUser();
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped' | 'bookmarked'>('all');
  const ordered = useMemo(() => session.sections.flatMap(s => session.questions.filter(q => q.sectionId === s.id).sort((a, b) => a.orderIndex - b.orderIndex)), [session]);
  const marks = new Set((user.bookmarkedQuestions || []).filter(b => b.testId === session.testId).map(b => b.questionId));
  const list = ordered.filter(q => filter === 'all' || (filter === 'bookmarked' ? marks.has(q.id) : status(q) === filter));
  const colors: Record<string, string> = { correct: t.success, wrong: t.danger, skipped: t.textMuted };
  return (
    <>
      <Segmented
        options={[
          { key: 'all', label: `${hi ? 'सभी' : 'All'} ${ordered.length}` },
          { key: 'correct', label: `${hi ? 'सही' : 'Correct'} ${ordered.filter(q => status(q) === 'correct').length}` },
          { key: 'wrong', label: `${hi ? 'गलत' : 'Wrong'} ${ordered.filter(q => status(q) === 'wrong').length}` },
          { key: 'skipped', label: `${hi ? 'छोड़े' : 'Skipped'} ${ordered.filter(q => status(q) === 'skipped').length}` },
          { key: 'bookmarked', label: `${hi ? 'बुकमार्क' : 'Bookmarked'} ${marks.size}` },
        ]}
        value={filter} onChange={setFilter as any}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        {list.map((q, i) => (
          <Pressable key={q.id} onPress={() => onOpen(list, i)}
            style={{ width: 44, height: 40, borderRadius: 8, backgroundColor: colors[status(q)] + (status(q) === 'skipped' ? '33' : ''), alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: status(q) === 'skipped' ? t.text : '#fff', fontWeight: '800' }}>{ordered.indexOf(q) + 1}</Text>
            {marks.has(q.id) ? <View style={{ position: 'absolute', top: 2, right: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: '#facc15' }} /> : null}
          </Pressable>
        ))}
      </View>
      {list.length === 0 ? <Text style={{ color: t.textMuted, marginTop: 8 }}>{hi ? 'कोई प्रश्न नहीं।' : 'No questions here.'}</Text> : null}
    </>
  );
}

/** Full-screen question review: correct answer, the student's choice, explanation, bookmark, report. */
export function SolutionViewer({ testId, testTitle, list, index, lang, chosen, rpsc, onClose, onIndex }: {
  testId: string; testTitle: string; list: Question[]; index: number; lang: 'en' | 'hi'; chosen: (q: Question) => number | null; rpsc?: boolean;
  onClose: () => void; onIndex: (i: number) => void;
}) {
  const t = useTheme();
  const { hi } = useI18n();
  const user = useUser();
  const { patchUser } = useSession();
  const insets = useSafeAreaInsets();
  const [qLang, setQLang] = useState(lang);
  const [report, setReport] = useState(false);
  const [reportText, setReportText] = useState('');
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
  const sendReport = async () => {
    try {
      await request('report-question', { questionId: q.id, message: reportText.trim(), questionText: stripHtml(input.questionText).slice(0, 2000), mockTestId: testId, mockTestTitle: testTitle, candidateCode: user.candidateCode });
      setReport(false); setReportText(''); setNote(hi ? 'धन्यवाद! हमारी टीम इसकी जांच करेगी।' : 'Thank you! Our team will check it.');
    } catch (e) { setNote(friendlyError(e)); }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ backgroundColor: t.header, paddingTop: insets.top, paddingHorizontal: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 52, gap: 4 }}>
            <Pressable onPress={onClose} style={{ padding: 8 }} accessibilityLabel="Close"><X size={22} color={t.headerText} /></Pressable>
            <Text style={{ flex: 1, color: t.headerText, fontWeight: '800' }}>{hi ? 'प्रश्न' : 'Question'} {index + 1} / {list.length}</Text>
            {q.content.hi?.questionText ? <Pressable onPress={() => setQLang(l => (l === 'hi' ? 'en' : 'hi'))} style={{ padding: 8 }}><Text style={{ color: t.headerText, fontWeight: '800' }}>{qLang === 'hi' ? 'EN' : 'हि'}</Text></Pressable> : null}
            <Pressable onPress={toggleBookmark} style={{ padding: 8 }} accessibilityLabel="Bookmark">{marked ? <BookmarkCheck size={22} color="#facc15" /> : <Bookmark size={22} color={t.headerText} />}</Pressable>
            <Pressable onPress={() => setReport(true)} style={{ padding: 8 }} accessibilityLabel="Report question"><Flag size={20} color={t.headerText} /></Pressable>
          </View>
        </View>
        {note ? <Pressable onPress={() => setNote('')} style={{ padding: 10, backgroundColor: t.primarySoft }}><Text style={{ color: t.primary, fontWeight: '600' }}>{note}</Text></Pressable> : null}
        <QuestionView
          pageKey={`${q.id}-${qLang}-review`}
          {...input}
          selected={null}
          review={{ correct: q.correctOptionIndex, chosen: chosen(q), explanation: explanationOf(q, qLang) }}
          watermark={`${user.name} · ${user.candidateCode}`}
          labels={{ passage: hi ? 'अनुच्छेद' : 'Passage', explanation: hi ? 'व्याख्या' : 'Explanation', yourAnswer: hi ? 'आपका उत्तर' : 'Your answer', correct: hi ? 'सही उत्तर' : 'Correct answer' }}
        />
        <View style={{ flexDirection: 'row', gap: 10, padding: 10, paddingBottom: 10 + insets.bottom, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border }}>
          <Button style={{ flex: 1 }} outline title={hi ? 'पिछला' : 'Previous'} icon={<ChevronLeft size={18} color={t.primary} />} disabled={index === 0} onPress={() => onIndex(index - 1)} />
          <Button style={{ flex: 1 }} title={hi ? 'अगला' : 'Next'} icon={<ChevronRight size={18} color={t.primaryText} />} disabled={index === list.length - 1} onPress={() => onIndex(index + 1)} />
        </View>
        <Modal visible={report} transparent animationType="fade" onRequestClose={() => setReport(false)}>
          <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: 24 }}>
            <Card>
              <Text style={{ color: t.text, fontSize: 17, fontWeight: '800' }}>{hi ? 'प्रश्न रिपोर्ट करें' : 'Report this question'}</Text>
              <TextInput value={reportText} onChangeText={setReportText} multiline placeholder={hi ? 'क्या गलत है? (जैसे उत्तर गलत है)' : "What's wrong? (e.g. the answer is wrong)"} placeholderTextColor={t.textMuted}
                style={{ minHeight: 90, marginTop: 12, color: t.text, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 10, textAlignVertical: 'top' }} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Button style={{ flex: 1 }} outline title={hi ? 'रद्द करें' : 'Cancel'} onPress={() => setReport(false)} />
                <Button style={{ flex: 1 }} title={hi ? 'भेजें' : 'Send'} disabled={reportText.trim().length < 3} onPress={sendReport} />
              </View>
            </Card>
          </View>
        </Modal>
      </View>
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
