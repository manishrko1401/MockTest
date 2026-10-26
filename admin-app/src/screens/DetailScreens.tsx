import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, Switch, Text, View } from 'react-native';
import { CheckCircle2, Mail, MessageCircle, Phone, Trash2 } from 'lucide-react-native';
import { api, db } from '../api';
import { useLive } from '../live';
import { useNav } from '../nav';
import { useSession } from '../session';
import { useTheme } from '../theme';
import { Button, Card, confirm, dateTime, ErrorBox, Field, Header, KeyValue, Pill, SectionTitle, Segmented, stripHtml } from '../ui';

function useAction() {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError('');
    try { await fn(); } catch (e: any) { setError(e.message); } finally { setBusy(''); }
  };
  return { busy, error, run };
}

// ---- Reported question ----------------------------------------------------------------------

const REASONS: Record<string, string> = {
  wrong_answer: 'Wrong answer', wrong_question: 'Wrong question', options: 'Option problem', solution: 'Solution unclear',
  typo: 'Spelling / typo', translation: 'Translation', image: 'Image missing', other: 'Other',
};
export const reasonLabel = (key?: string) => REASONS[key || ''] || 'Other';

/** The question as it is in the test now: text, options (correct one marked), solution; English / Hindi. */
function QuestionPanel({ report, fallback }: { report: any; fallback: string }) {
  const t = useTheme();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'en' | 'hi'>(report.language === 'hi' ? 'hi' : 'en');
  useEffect(() => {
    let alive = true;
    db('reported-question-view', { id: report.id }).then(r => { if (alive) setData(r); }).catch((e: any) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [report.id]);

  if (error) return <Card><ErrorBox message={error} /><Text selectable style={{ color: t.text, marginTop: 8 }}>{fallback || '—'}</Text></Card>;
  if (!data) return <Card><ActivityIndicator color={t.primary} /></Card>;
  const q = data.question;
  if (!q) return <Card><Text style={{ color: t.warning, fontWeight: '700' }}>This question is no longer in the test (it may have been changed or removed). What the student saw:</Text><Text selectable style={{ color: t.text, marginTop: 8, lineHeight: 22 }}>{fallback || '—'}</Text></Card>;
  const c = q.content?.[lang] || q.content?.en || {};
  const options: string[] = Array.isArray(c.options) ? c.options : [];
  const solution = stripHtml(q.explanation?.[lang] || q.explanation?.en || '');

  return (
    <>
      {q.content?.hi?.questionText ? (
        <View style={{ marginBottom: 10 }}>
          <Segmented options={[{ key: 'en', label: 'English' }, { key: 'hi', label: 'हिन्दी' }]} value={lang} onChange={setLang} />
        </View>
      ) : null}
      <Card>
        {c.comprehension ? <Text selectable style={{ color: t.textSoft, lineHeight: 21, marginBottom: 10 }}>{stripHtml(c.comprehension)}</Text> : null}
        <Text selectable style={{ color: t.text, fontSize: 15.5, lineHeight: 23 }}>{stripHtml(c.questionText) || '—'}</Text>
        {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={{ width: '100%', height: 200, marginTop: 10, borderRadius: 10 }} resizeMode="contain" /> : null}
        <View style={{ gap: 8, marginTop: 12 }}>
          {options.map((o, i) => {
            const right = i === q.correctOptionIndex;
            return (
              <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1.5, borderRadius: 12, padding: 10, borderColor: right ? t.success : t.border, backgroundColor: right ? t.successSoft : 'transparent' }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: right ? t.success : t.cardAlt }}>
                  <Text style={{ color: right ? '#fff' : t.textSoft, fontWeight: '800', fontSize: 12 }}>{String.fromCharCode(65 + i)}</Text>
                </View>
                <Text selectable style={{ flex: 1, color: t.text, lineHeight: 21 }}>{stripHtml(o)}</Text>
                {right ? <CheckCircle2 size={18} color={t.success} /> : null}
              </View>
            );
          })}
        </View>
      </Card>
      <SectionTitle>Solution</SectionTitle>
      <Card><Text selectable style={{ color: t.text, lineHeight: 22 }}>{solution || 'No solution added.'}</Text></Card>
      {data.others?.length ? (
        <>
          <SectionTitle>{`Other reports of this question (${data.others.length})`}</SectionTitle>
          <Card style={{ gap: 10 }}>
            {data.others.map((o: any) => (
              <View key={o.id}>
                <Text style={{ color: t.textMuted, fontSize: 12 }}>{o.candidateCode || 'Visitor'} · {o.createdAt} · {reasonLabel(o.reason)}</Text>
                <Text selectable style={{ color: t.text, marginTop: 2 }}>{o.message || '—'}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
}

export function ReportScreen({ report }: { report: any }) {
  const t = useTheme();
  const nav = useNav();
  const { can } = useSession();
  const { pollNow } = useLive();
  const { busy, error, run } = useAction();
  const [reply, setReply] = useState('');
  const question = stripHtml(report.questionText);
  const done = () => { pollNow(); nav.pop(); };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Reported question" subtitle={report.testTitle} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
        {error ? <ErrorBox message={error} /> : null}
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pill text={reasonLabel(report.reason)} tone="danger" />
            {report.language ? <Pill text={report.language === 'hi' ? 'Hindi' : 'English'} /> : null}
            {report.source ? <Pill text={report.source === 'android' ? 'Android app' : report.source === 'mobile_web' ? 'Website (phone)' : 'Website'} /> : null}
          </View>
          <Text style={{ color: t.textSoft, fontSize: 12, fontWeight: '700', marginTop: 12 }}>STUDENT'S REPORT</Text>
          <Text selectable style={{ color: t.text, fontSize: 16, marginTop: 6, lineHeight: 22 }}>{report.message || '(no message, issue type only)'}</Text>
          <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 8 }}>{report.userName || 'Visitor (not signed in)'}{report.candidateCode ? ` · ${report.candidateCode}` : ''} · {dateTime(report.createdAt)}</Text>
        </Card>
        <SectionTitle>Where</SectionTitle>
        <Card>
          <KeyValue label="Exam" value={report.examName || '—'} />
          <KeyValue label="Test" value={report.testTitle || report.testId || '—'} />
          <KeyValue label="Question" value={`${report.questionNumber ? `Q${report.questionNumber}` : '—'}${report.sectionName ? ` · ${report.sectionName}` : ''}`} />
          <KeyValue label="Date" value={dateTime(report.createdAt)} />
          <KeyValue label="Question id" value={report.questionId} />
        </Card>
        <SectionTitle>Question</SectionTitle>
        <QuestionPanel report={report} fallback={question} />

        {report.userId ? (
          <>
            <SectionTitle>Reply to the student</SectionTitle>
            <Field value={reply} onChangeText={setReply} multiline placeholder="e.g. Thanks! The answer key has been corrected." style={{ minHeight: 90 }} />
            <Button title="Send reply & resolve" loading={busy === 'reply'} disabled={!reply.trim()} icon={<MessageCircle size={18} color={t.primaryText} />}
              onPress={() => run('reply', async () => { await api('report-reply', { id: report.id, message: reply.trim() }); done(); })} />
            <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 6 }}>The reply goes to the student's support chat.</Text>
          </>
        ) : null}

        <View style={{ gap: 10, marginTop: 18 }}>
          {report.userId && can.support ? <Button title="Open chat with student" outline onPress={() => nav.push({ name: 'chat', userId: report.userId, title: report.userName })} icon={<MessageCircle size={18} color={t.primary} />} /> : null}
          {report.testId && can.content ? <Button title="Open test" outline onPress={() => nav.push({ name: 'test', test: { id: report.testId, title: report.testTitle } })} /> : null}
          <Button title="Mark resolved" tone="success" loading={busy === 'resolve'} icon={<CheckCircle2 size={18} color="#fff" />}
            onPress={() => confirm('Mark resolved?', 'The report is removed from the list.', 'Resolve', () => run('resolve', async () => { await api('report-resolve', { id: report.id }); done(); }), false)} />
        </View>
      </ScrollView>
    </View>
  );
}

// ---- Contact inquiry ---------------------------------------------------------------------------

const INQ_STATUS = ['PENDING', 'REPLIED', 'RESOLVED', 'ARCHIVED'] as const;

export function InquiryScreen({ item }: { item: any }) {
  const t = useTheme();
  const nav = useNav();
  const { pollNow } = useLive();
  const { busy, error, run } = useAction();
  const [status, setStatus] = useState<string>(item.status);
  const [notes, setNotes] = useState<string>(item.adminNotes || '');
  const phone = String(item.phone || '').replace(/[^\d+]/g, '');

  const save = (next: string) => run('save', async () => {
    await api('inquiry-update', { id: item.id, status: next, adminNotes: notes });
    setStatus(next); item.status = next; item.adminNotes = notes; pollNow();
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={item.name} subtitle={`Inquiry · ${item.subject}`} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
        {error ? <ErrorBox message={error} /> : null}
        <Card>
          <Text selectable style={{ color: t.text, fontSize: 16, lineHeight: 23 }}>{item.message}</Text>
          <View style={{ marginTop: 12 }}>
            <KeyValue label="Email" value={item.email} />
            <KeyValue label="Phone" value={item.phone} />
            <KeyValue label="Subject" value={item.subject} />
            <KeyValue label="From" value={item.source} />
            <KeyValue label="Received" value={dateTime(item.createdAt)} />
          </View>
        </Card>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Button style={{ flex: 1 }} small title="Email" outline icon={<Mail size={16} color={t.primary} />}
            onPress={() => Linking.openURL(`mailto:${item.email}?subject=${encodeURIComponent(`Re: your message to Mock Test Hub (${item.subject})`)}`)} />
          {phone ? <Button style={{ flex: 1 }} small title="Call" outline icon={<Phone size={16} color={t.primary} />} onPress={() => Linking.openURL(`tel:${phone}`)} /> : null}
          {phone ? <Button style={{ flex: 1 }} small title="WhatsApp" outline onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/^\+/, '').replace(/^(\d{10})$/, '91$1')}`)} /> : null}
        </View>
        <SectionTitle>Status</SectionTitle>
        <Segmented options={INQ_STATUS.map(s => ({ key: s, label: s[0] + s.slice(1).toLowerCase() }))} value={status as any} onChange={s => save(s)} />
        <SectionTitle>Notes (staff only)</SectionTitle>
        <Field value={notes} onChangeText={setNotes} multiline style={{ minHeight: 80 }} placeholder="What was done, follow-ups…" />
        <Button title="Save notes" loading={busy === 'save'} onPress={() => save(status)} />
        <Button style={{ marginTop: 18 }} title="Delete inquiry" tone="danger" outline icon={<Trash2 size={18} color={t.danger} />}
          onPress={() => confirm('Delete inquiry?', 'This cannot be undone.', 'Delete', () => run('delete', async () => { await api('inquiry-delete', { id: item.id }); pollNow(); nav.pop(); }))} />
      </ScrollView>
    </View>
  );
}

// ---- Suggestion ---------------------------------------------------------------------------------

const SUG_STATUS = ['PENDING', 'REVIEWED', 'RESOLVED'] as const;

export function SuggestionScreen({ item }: { item: any }) {
  const t = useTheme();
  const nav = useNav();
  const { can } = useSession();
  const { pollNow } = useLive();
  const { busy, error, run } = useAction();
  const [status, setStatus] = useState<string>(item.status);
  const [reply, setReply] = useState<string>(item.adminReply || '');
  const [toStudent, setToStudent] = useState(!!item.userId);

  const save = (next: string, withReply = false) => run(withReply ? 'reply' : 'status', async () => {
    await api('suggestion-update', { id: item.id, status: next, ...(withReply ? { adminReply: reply.trim(), sendToStudent: toStudent } : {}) });
    setStatus(next); item.status = next; if (withReply) item.adminReply = reply.trim(); pollNow();
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={item.category} subtitle={`Suggestion from ${item.name || 'Visitor'}`} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
        {error ? <ErrorBox message={error} /> : null}
        <Card>
          <Text selectable style={{ color: t.text, fontSize: 16, lineHeight: 23 }}>{item.message}</Text>
          <View style={{ marginTop: 12 }}>
            <KeyValue label="Name" value={item.name} />
            <KeyValue label="Email" value={item.email} />
            <KeyValue label="From" value={item.source} />
            <KeyValue label="Received" value={dateTime(item.createdAt)} />
          </View>
        </Card>
        <SectionTitle>Status</SectionTitle>
        <Segmented options={SUG_STATUS.map(s => ({ key: s, label: s[0] + s.slice(1).toLowerCase() }))} value={status as any} onChange={s => save(s)} />
        <SectionTitle>Reply</SectionTitle>
        <Field value={reply} onChangeText={setReply} multiline style={{ minHeight: 90 }} placeholder="Thanks for the idea! We have added…" />
        {item.userId ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: t.text, flex: 1 }}>Also send to the student's support chat</Text>
            <Switch value={toStudent} onValueChange={setToStudent} />
          </View>
        ) : <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 12 }}>Sent without an account: the reply is saved here only{item.email ? '; you can email them' : ''}.</Text>}
        <Button title="Save reply & mark reviewed" loading={busy === 'reply'} disabled={!reply.trim()} onPress={() => save(status === 'PENDING' ? 'REVIEWED' : status, true)} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {item.email ? <Button style={{ flex: 1 }} small outline title="Email" icon={<Mail size={16} color={t.primary} />} onPress={() => Linking.openURL(`mailto:${item.email}?subject=${encodeURIComponent('Your suggestion to Mock Test Hub')}${reply ? `&body=${encodeURIComponent(reply)}` : ''}`)} /> : null}
          {item.userId && can.support ? <Button style={{ flex: 1 }} small outline title="Open chat" icon={<MessageCircle size={16} color={t.primary} />} onPress={() => nav.push({ name: 'chat', userId: item.userId, title: item.name })} /> : null}
        </View>
        <Button style={{ marginTop: 18 }} title="Delete suggestion" tone="danger" outline icon={<Trash2 size={18} color={t.danger} />}
          onPress={() => confirm('Delete suggestion?', 'This cannot be undone.', 'Delete', () => run('delete', async () => { await api('suggestion-delete', { id: item.id }); pollNow(); nav.pop(); }))} />
      </ScrollView>
    </View>
  );
}

// ---- Feedback ------------------------------------------------------------------------------------

export function FeedbackItemScreen({ item }: { item: any }) {
  const t = useTheme();
  const nav = useNav();
  const { can } = useSession();
  const stars = (n: number) => `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={item.name || 'Student'} subtitle="Feedback" onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Card>
          <Text style={{ color: t.warning, fontSize: 22 }}>{stars(item.platformRating)}</Text>
          <Text style={{ color: t.textSoft, marginTop: 2 }}>Platform {item.platformRating}/5 · Exam {item.examRating}/5</Text>
          {item.text ? <Text selectable style={{ color: t.text, fontSize: 16, marginTop: 12, lineHeight: 23 }}>{item.text}</Text> : <Text style={{ color: t.textMuted, marginTop: 12 }}>No written comment.</Text>}
          <View style={{ marginTop: 12 }}>
            <KeyValue label="Test" value={item.testTitle} />
            <KeyValue label="Email" value={item.email} />
            <KeyValue label="From" value={<Pill text={item.source} />} />
            <KeyValue label="Received" value={dateTime(item.createdAt)} />
          </View>
        </Card>
        <View style={{ gap: 10, marginTop: 14 }}>
          {item.userId && can.support ? <Button title="Message student" icon={<MessageCircle size={18} color={t.primaryText} />} onPress={() => nav.push({ name: 'chat', userId: item.userId, title: item.name })} /> : null}
          {item.testId && can.content ? <Button title="Open test" outline onPress={() => nav.push({ name: 'test', test: { id: item.testId, title: item.testTitle } })} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}
