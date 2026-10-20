import React, { useState } from 'react';
import { Linking, ScrollView, Switch, Text, View } from 'react-native';
import { CheckCircle2, Mail, MessageCircle, Phone, Trash2 } from 'lucide-react-native';
import { api } from '../api';
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
          <Text style={{ color: t.textSoft, fontSize: 12, fontWeight: '700' }}>STUDENT'S REPORT</Text>
          <Text selectable style={{ color: t.text, fontSize: 16, marginTop: 6, lineHeight: 22 }}>{report.message}</Text>
          <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 8 }}>{report.userName || 'Visitor (not signed in)'}{report.candidateCode ? ` · ${report.candidateCode}` : ''} · {dateTime(report.createdAt)}</Text>
        </Card>
        <SectionTitle>Question</SectionTitle>
        <Card>
          <Text selectable style={{ color: t.text, fontSize: 15, lineHeight: 22 }}>{question || 'Question text was not included in the report.'}</Text>
          <View style={{ marginTop: 10 }}>
            <KeyValue label="Test" value={report.testTitle || report.testId} />
            <KeyValue label="Question id" value={report.questionId} />
          </View>
        </Card>

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
