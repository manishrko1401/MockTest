import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, UserRound } from 'lucide-react-native';
import { api } from '../api';
import { useLive, useLiveReload } from '../live';
import { useNav } from '../nav';
import { useSession } from '../session';
import { useTheme } from '../theme';
import { confirm, ErrorBox, Header, HeaderButton, Loading, timeAgo } from '../ui';

const QUICK_REPLIES = [
  'Hi! How can we help you?',
  'Thanks for letting us know. We are checking it now.',
  'Please refresh the page and try again.',
  'This has been fixed. Please try again.',
  'Please share a screenshot so we can check.',
  'Thank you! Happy studying.',
];

type Msg = { id: string; fromAdmin: boolean; message: string; isRead: boolean; createdAt: string; pending?: boolean };

export default function ChatScreen({ userId, title }: { userId: string; title?: string }) {
  const t = useTheme();
  const nav = useNav();
  const { can } = useSession();
  const { setActiveChat, pollNow } = useLive();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const list = useRef<FlatList<Msg>>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ user: any; messages: Msg[] }>('support-thread', { userId, markRead: true });
      setUser(res.user);
      setMessages(prev => {
        const pending = prev.filter(m => m.pending);
        return [...res.messages, ...pending];
      });
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // This chat is on screen: its new messages refresh it instead of raising an alert
  useEffect(() => {
    setActiveChat(userId);
    return () => setActiveChat(null);
  }, [userId, setActiveChat]);
  useLiveReload(load);
  // Opening the chat marks it read: update the unread counts now
  useEffect(() => { if (!loading) pollNow(); }, [loading, pollNow]);

  const send = async (body = text.trim()) => {
    if (!body || sending) return;
    const temp: Msg = { id: `tmp-${Date.now()}`, fromAdmin: true, message: body, isRead: false, createdAt: new Date().toISOString(), pending: true };
    setMessages(m => [...m, temp]);
    setText('');
    setSending(true);
    try {
      const res = await api<{ message: Msg }>('support-send', { userId, message: body });
      setMessages(m => m.map(x => (x.id === temp.id ? res.message : x)));
    } catch (e: any) {
      setMessages(m => m.filter(x => x.id !== temp.id));
      setText(body);
      setError(`Not sent: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const remove = (m: Msg) => confirm('Delete message?', 'The student will no longer see it.', 'Delete', async () => {
    try { await api('support-delete-message', { id: m.id }); setMessages(list => list.filter(x => x.id !== m.id)); }
    catch (e: any) { setError(e.message); }
  });

  useEffect(() => { setTimeout(() => list.current?.scrollToEnd({ animated: false }), 50); }, [messages.length]);

  const name = user?.name || title || 'Student';
  const subtitle = user ? [user.candidateCode, user.tier !== 'None' ? user.tier?.replace('Testbook ', '') : null, user.lastSeen ? `seen ${timeAgo(user.lastSeen)} ago` : null].filter(Boolean).join(' · ') : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={name} subtitle={subtitle} onBack={nav.pop}
        right={can.users && user ? <HeaderButton label="Student profile" icon={<UserRound color={t.headerText} size={20} />} onPress={() => nav.push({ name: 'user', id: user.id })} /> : undefined} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {error ? <ErrorBox message={error} onRetry={() => { setError(''); load(); }} /> : null}
        {loading ? <Loading /> : (
          <FlatList
            ref={list}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={{ padding: 12, gap: 6 }}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={<Text style={{ color: t.textMuted, textAlign: 'center', marginTop: 40 }}>No messages yet. Say hello!</Text>}
            renderItem={({ item: m, index }) => {
              const prev = messages[index - 1];
              const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
              return (
                <View>
                  {showDay ? <Text style={{ alignSelf: 'center', color: t.textMuted, fontSize: 11, marginVertical: 8 }}>{new Date(m.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text> : null}
                  <Pressable onLongPress={m.fromAdmin && !m.pending ? () => remove(m) : undefined}
                    style={{ alignSelf: m.fromAdmin ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: m.fromAdmin ? t.bubbleAdmin : t.bubbleStudent, borderRadius: 14, borderBottomRightRadius: m.fromAdmin ? 4 : 14, borderBottomLeftRadius: m.fromAdmin ? 14 : 4, paddingHorizontal: 12, paddingVertical: 8, borderWidth: m.fromAdmin ? 0 : 1, borderColor: t.border }}>
                    <Text selectable style={{ color: m.fromAdmin ? t.bubbleAdminText : t.bubbleStudentText, fontSize: 15, lineHeight: 21 }}>{m.message}</Text>
                    <Text style={{ color: m.fromAdmin ? t.bubbleAdminText : t.textMuted, opacity: 0.75, fontSize: 10, marginTop: 3, alignSelf: 'flex-end' }}>
                      {m.pending ? 'Sending…' : new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}{m.fromAdmin && !m.pending ? (m.isRead ? '  ✓✓ Seen' : '  ✓') : ''}
                    </Text>
                  </Pressable>
                </View>
              );
            }}
          />
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
          {QUICK_REPLIES.map(q => (
            <Pressable key={q} onPress={() => setText(q)} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text numberOfLines={1} style={{ color: t.textSoft, fontSize: 12, maxWidth: 220 }}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, paddingBottom: 10 + insets.bottom, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a reply"
            placeholderTextColor={t.textMuted}
            multiline
            style={{ flex: 1, maxHeight: 120, minHeight: 44, color: t.text, backgroundColor: t.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 }}
          />
          <Pressable onPress={() => send()} disabled={!text.trim() || sending} accessibilityLabel="Send"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? t.primary : t.border, alignItems: 'center', justifyContent: 'center' }}>
            {sending ? <ActivityIndicator color={t.primaryText} size="small" /> : <Send size={20} color={text.trim() ? t.primaryText : t.textMuted} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
