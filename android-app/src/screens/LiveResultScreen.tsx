import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Clock, MinusCircle, RotateCcw, Target, XCircle } from 'lucide-react-native';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useTheme } from '../theme';
import { Button, Card, Dialog, Header, Ring, SectionTitle } from '../ui';
import { SolutionsList, SolutionViewer } from './AnalysisScreens';
import type { LiveResult } from '../shared/liveTestShared';
import type { ActiveSession, Question } from '../shared/webTypes';

// -----------------------------------------------------------------------------
// The result of a live test, shown once right after submitting. Nothing is saved (the result
// lives only in this screen), so leaving asks for confirmation.
// -----------------------------------------------------------------------------

const fmtTime = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`;

export default function LiveResultScreen({ result }: { result: LiveResult }) {
  const t = useTheme();
  const { hi, lang } = useI18n();
  const nav = useNav();
  const [viewer, setViewer] = useState<{ list: Question[]; index: number } | null>(null);
  const [leaving, setLeaving] = useState<null | 'back' | 'new'>(null);

  // The questions as a session, so the usual solution grid and viewer can show them
  const session = useMemo<ActiveSession>(() => ({
    sessionId: 'live', testId: result.testId, testTitle: hi ? result.titleHi : result.title, totalDurationSeconds: 0,
    sections: [{ id: 'sec_live', name: hi ? result.titleHi : result.title, orderIndex: 0, positiveMark: result.positiveMarks, negativeMark: result.negativeMarks }],
    questions: result.questions.map((q, i) => ({
      id: q.id, sectionId: 'sec_live', questionType: 'mcq', orderIndex: i, correctOptionIndex: q.correctOptionIndex,
      content: { en: { questionText: q.content.en.questionText, options: q.content.en.options }, hi: { questionText: q.content.hi.questionText, options: q.content.hi.options } },
      explanation: q.explanation,
    })),
  }), [result, hi]);
  const byId = useMemo(() => new Map(result.questions.map(q => [q.id, q])), [result]);
  const status = (q: Question) => byId.get(q.id)?.status || 'skipped';

  // Back: confirm, the result can't be opened again
  useEffect(() => {
    nav.setBackBlocker(() => {
      if (viewer) { setViewer(null); return true; }
      setLeaving('back');
      return true;
    });
    return () => nav.setBackBlocker(null);
  });

  const stat = (icon: React.ReactNode, label: string, value: string) => (
    <View style={{ flex: 1, minWidth: 90, backgroundColor: t.cardAlt, borderRadius: 12, padding: 10, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{icon}<Text style={{ color: t.textSoft, fontSize: 11.5, fontWeight: '700' }}>{label}</Text></View>
      <Text style={{ color: t.text, fontSize: 19, fontWeight: '900', marginTop: 2 }}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={hi ? 'लाइव टेस्ट परिणाम' : 'Live test result'} subtitle={hi ? result.titleHi : result.title} onBack={() => setLeaving('back')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: t.dark ? '#3a2a07' : '#fffbeb', borderColor: t.dark ? '#7c5a10' : '#fcd34d', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <AlertTriangle size={18} color={t.dark ? '#fcd34d' : '#b45309'} />
          <Text style={{ flex: 1, color: t.dark ? '#fde68a' : '#78350f', fontSize: 13, lineHeight: 19 }}>
            {hi ? 'यह परिणाम और समाधान केवल अभी दिखेंगे। ये सहेजे नहीं जाते: इस स्क्रीन से बाहर जाने पर ये चले जाएँगे।'
              : "This result and the solutions are shown only now. They aren't saved: leaving this screen clears them."}
          </Text>
        </View>

        <Card style={{ alignItems: 'center' }}>
          <Ring value={result.maxScore ? Math.max(0, result.score) / result.maxScore : 0} size={120}>
            <Text style={{ color: t.text, fontSize: 26, fontWeight: '900' }}>{result.score}</Text>
            <Text style={{ color: t.textMuted, fontWeight: '700' }}>/ {result.maxScore}</Text>
          </Ring>
          <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 8 }}>{hi ? `सही +${result.positiveMarks}, गलत −${result.negativeMarks}` : `Correct +${result.positiveMarks}, wrong −${result.negativeMarks}`}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, alignSelf: 'stretch' }}>
            {stat(<CheckCircle2 size={13} color={t.success} />, hi ? 'सही' : 'Correct', String(result.correct))}
            {stat(<XCircle size={13} color={t.danger} />, hi ? 'गलत' : 'Wrong', String(result.wrong))}
            {stat(<MinusCircle size={13} color={t.textMuted} />, hi ? 'छोड़े' : 'Skipped', String(result.skipped))}
            {stat(<Target size={13} color={t.primary} />, hi ? 'सटीकता' : 'Accuracy', `${result.accuracy}%`)}
            {stat(<Clock size={13} color={t.textMuted} />, hi ? 'समय' : 'Time', fmtTime(result.timeTakenSeconds))}
          </View>
        </Card>

        <SectionTitle>{hi ? 'विषय-वार प्रदर्शन' : 'Topic-wise performance'}</SectionTitle>
        <Card style={{ paddingVertical: 6 }}>
          {result.areas.map((a, i) => (
            <View key={a.name} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: t.text, fontWeight: '800', flex: 1 }}>{hi ? a.nameHi : a.name}</Text>
                <Text style={{ color: t.text, fontWeight: '900' }}>{a.score}</Text>
              </View>
              <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 2 }}>
                {a.total} {hi ? 'प्रश्न' : 'questions'} · <Text style={{ color: t.success }}>{a.correct} {hi ? 'सही' : 'correct'}</Text> · <Text style={{ color: t.danger }}>{a.wrong} {hi ? 'गलत' : 'wrong'}</Text> · {a.skipped} {hi ? 'छोड़े' : 'skipped'}
              </Text>
            </View>
          ))}
        </Card>

        <SectionTitle>{hi ? 'प्रश्न और समाधान' : 'Questions & solutions'}</SectionTitle>
        <SolutionsList session={session} status={status} onOpen={(list, index) => setViewer({ list, index })} noBookmark />

        <View style={{ gap: 10, marginTop: 20 }}>
          <Button title={hi ? 'नया लाइव टेस्ट दें' : 'Take a new live test'} icon={<RotateCcw size={18} color={t.primaryText} />} onPress={() => setLeaving('new')} />
          <Button outline title={hi ? 'टेस्ट सूची पर जाएँ' : 'Back to tests'} onPress={() => setLeaving('back')} />
        </View>
      </ScrollView>

      {viewer ? (
        <SolutionViewer
          testId={result.testId} testTitle={hi ? result.titleHi : result.title} session={session} list={viewer.list} index={viewer.index} lang={lang}
          chosen={q => byId.get(q.id)?.selectedOptionIndex ?? null} noBookmark
          onClose={() => setViewer(null)} onIndex={i => setViewer(v => (v ? { ...v, index: i } : v))}
        />
      ) : null}

      <Dialog visible={!!leaving} onClose={() => setLeaving(null)} icon={<AlertTriangle size={26} color={t.warning || '#d97706'} />}
        title={hi ? 'परिणाम सहेजा नहीं जाता' : "This result isn't saved"}
        text={hi ? 'बाहर जाने के बाद आप यह परिणाम और समाधान दोबारा नहीं देख पाएँगे।' : "Once you leave, you can't see this result and its solutions again."}>
        <View style={{ gap: 10, marginTop: 6 }}>
          <Button title={leaving === 'new' ? (hi ? 'नया टेस्ट शुरू करें' : 'Start a new test') : (hi ? 'बाहर जाएँ' : 'Leave')}
            onPress={() => { const go = leaving; setLeaving(null); if (go === 'new') nav.replace({ name: 'examRun', testId: result.testId }); else nav.pop(); }} />
          <Button outline title={hi ? 'यहीं रहें' : 'Stay'} onPress={() => setLeaving(null)} />
        </View>
      </Dialog>
    </View>
  );
}
