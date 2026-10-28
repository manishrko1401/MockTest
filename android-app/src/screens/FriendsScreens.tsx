import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, KeyboardAvoidingView, Pressable, RefreshControl, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Check, CheckCheck, ChevronRight, DoorOpen, GraduationCap, Hash, MessageCircle, Radio, Search, Send, Share2, Swords, Trash2, UserMinus, UserPlus, Users, X,
} from 'lucide-react-native';
import { friendlyError } from '../api';
import { setOnScreen } from '../push';
import { useI18n } from '../i18n';
import { useNav, useTabSection } from '../nav';
import { TourTarget, useScreenTour, useTourScroll } from '../tour';
import { useTheme } from '../theme';
import { Avatar, Badge, Button, Card, confirm, Empty, ErrorBox, Header, IconButton, IconTile, Pill, SectionTitle, Skeleton, Tabs, StatusBarFor } from '../ui';
import {
  api, ChatMessage, colorFor, Friend, FriendsData, lastSeenText, MyRoom, Person, Relation, showCode, timeLeft, useFriendsBadge,
} from '../friendsApi';

// ---- Tab ------------------------------------------------------------------------------------------

export function FriendsScreen() {
  const t = useTheme();
  const { hi } = useI18n();
  const badge = useFriendsBadge();
  const [tab, setTab] = useState<'rooms' | 'friends'>('rooms');
  // a friend-request notification opens 'friends'
  useTabSection('friends', useCallback((v: string) => { if (v === 'rooms' || v === 'friends') setTab(v); }, []));
  const nav = useNav();
  useScreenTour('app_friends', hi ? [
    { target: 'friends.tabs', fixed: true, title: 'दोस्तों के साथ पढ़ाई', text: '"टेस्ट रूम" में दोस्तों के साथ एक ही टेस्ट दें। "मित्र और चैट" में दोस्त जोड़ें और उनसे बात करें।' },
    { target: 'friends.join', title: 'रूम में जुड़ें', text: 'दोस्त ने रूम कोड भेजा है? यहां लिखें और "जुड़ें" दबाएं।' },
    { target: 'friends.create', title: 'अपना रूम बनाएं', text: 'कोई भी मॉक टेस्ट चुनें और "दोस्तों के साथ दें" दबाएं। तुरंत या 72 घंटे तक कभी भी दें, फिर हर प्रश्न पर अंक, रैंक और समय की तुलना करें।' },
  ] : [
    { target: 'friends.tabs', fixed: true, title: 'Study with friends', text: '"Test rooms": take the same test with friends. "Friends & chat": add friends and talk to them.' },
    { target: 'friends.join', title: 'Join a room', text: 'Got a room code from a friend? Type it here and tap "Join".' },
    { target: 'friends.create', title: 'Create your own room', text: 'Pick any mock test and tap "Take with friends". Take it together now or any time within 72 hours, then compare marks, rank and time on every question.' },
  ], tab === 'rooms' && nav.tab === 'friends' && nav.stack.length === 0);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header large title={hi ? 'दोस्तों के साथ' : 'With Friends'} border={false} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, backgroundColor: t.header }}>
        <TourTarget id="friends.tabs">
        <Tabs options={[
          { key: 'rooms', label: hi ? 'टेस्ट रूम' : 'Test rooms' },
          { key: 'friends', label: hi ? 'मित्र और चैट' : 'Friends & chat', badge: badge.total },
        ]} value={tab} onChange={setTab} />
        </TourTarget>
      </View>
      <View style={{ flex: 1, display: tab === 'rooms' ? 'flex' : 'none' }}><RoomsTab /></View>
      <View style={{ flex: 1, display: tab === 'friends' ? 'flex' : 'none' }}><FriendsTab active={tab === 'friends'} /></View>
    </View>
  );
}

// ---- Test rooms --------------------------------------------------------------------------------

function RoomsTab() {
  const t = useTheme();
  const tourScroll = useTourScroll('app_friends');
  const { hi } = useI18n();
  const nav = useNav();
  const [rooms, setRooms] = useState<MyRoom[] | null>(null);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setRooms((await api<{ rooms: MyRoom[] }>('room-mine')).rooms || []); setError(''); }
    catch (e) { setError(friendlyError(e)); } finally { setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // fresh when coming back from a room
  useEffect(() => { if (nav.stack.length === 0) load(); }, [nav.stack.length, load]);

  const join = async () => {
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length < 4) { setJoinError(hi ? 'रूम कोड लिखें।' : 'Enter the room code.'); return; }
    setJoining(true); setJoinError('');
    try { const r = await api<{ code: string }>('room-join', { code: c }); setCode(''); nav.push({ name: 'room', code: r.code }); }
    catch (e) { setJoinError(friendlyError(e)); } finally { setJoining(false); }
  };
  const hide = (r: MyRoom) => confirm(
    hi ? 'सूची से हटाएं?' : 'Remove from your list?',
    hi ? 'रूम आपकी सूची से हट जाएगा। दोस्तों के लिए यह वैसा ही रहेगा।' : 'The room is removed from your list only. It stays the same for your friends.',
    hi ? 'हटाएं' : 'Remove',
    async () => { setRooms(list => (list || []).filter(x => x.code !== r.code)); await api('room-hide', { code: r.code }).catch(() => load()); },
  );

  const statusPill = (r: MyRoom) => {
    if (r.status === 'closed') return <Pill text={hi ? 'बंद' : 'Closed'} />;
    if (r.status === 'lobby') return <Pill tone="violet" icon={<Radio size={11} color={t.violet} />} text={hi ? 'लॉबी' : 'Lobby'} />;
    if (r.finished) return <Pill tone="success" icon={<Check size={11} color={t.success} />} text={hi ? 'आपने दिया' : 'You finished'} />;
    return <Pill tone="warning" text={hi ? 'टेस्ट बाकी' : 'Test pending'} />;
  };

  return (
    <ScrollView {...tourScroll} contentContainerStyle={{ padding: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={() => { setRefreshing(true); load(); }} />}>
      {/* Join */}
      <TourTarget id="friends.join">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconTile icon={DoorOpen} color={t.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: '800', fontSize: 15.5 }}>{hi ? 'रूम में जुड़ें' : 'Join a room'}</Text>
            <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 1 }}>{hi ? 'दोस्त का भेजा रूम कोड लिखें' : 'Enter the code a friend sent you'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: t.input, borderRadius: 12, borderWidth: 1.5, borderColor: joinError ? t.danger : t.border, paddingHorizontal: 12 }}>
            <Hash size={17} color={t.textMuted} />
            <TextInput value={code} onChangeText={v => { setCode(v.toUpperCase()); setJoinError(''); }} placeholder={hi ? 'रूम कोड' : 'Room code'} placeholderTextColor={t.textMuted}
              autoCapitalize="characters" autoCorrect={false} maxLength={12} onSubmitEditing={join} returnKeyType="go"
              style={{ flex: 1, color: t.text, fontSize: 17, fontWeight: '800', letterSpacing: 2, height: 50, marginLeft: 6 }} />
          </View>
          <Button title={hi ? 'जुड़ें' : 'Join'} loading={joining} onPress={join} style={{ paddingHorizontal: 22 }} />
        </View>
        {joinError ? <Text style={{ color: t.danger, marginTop: 8, fontWeight: '600' }}>{joinError}</Text> : null}
      </Card>
      </TourTarget>

      {/* Create */}
      <TourTarget id="friends.create" style={{ marginTop: 12 }}>
      <Card style={{ backgroundColor: t.primarySoft, borderColor: t.primarySoft }} flat>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconTile icon={Swords} color={t.primary} bg={t.card} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: '800', fontSize: 15.5 }}>{hi ? 'नया रूम बनाएं' : 'Create a room'}</Text>
            <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 1, lineHeight: 18 }}>{hi ? 'कोई भी मॉक टेस्ट खोलें और "दोस्तों के साथ दें" दबाएं।' : 'Open any mock test and tap "Take with friends".'}</Text>
          </View>
        </View>
        <Button style={{ marginTop: 14 }} title={hi ? 'टेस्ट चुनें' : 'Choose a test'} icon={<GraduationCap size={18} color={t.primaryText} />} onPress={() => nav.setTab('tests', 'mock')} />
      </Card>

      </TourTarget>

      {/* My rooms */}
      <SectionTitle>{hi ? 'मेरे रूम' : 'My rooms'}{rooms?.length ? ` (${rooms.length})` : ''}</SectionTitle>
      {error ? <ErrorBox style={{ marginHorizontal: 0 }} message={error} onRetry={load} /> : null}
      {!rooms ? (!error ? <Skeleton rows={2} height={84} /> : null) : rooms.length === 0 ? (
        <Empty title={hi ? 'अभी कोई रूम नहीं' : 'No rooms yet'} text={hi ? 'रूम बनाएं या दोस्त के कोड से जुड़ें।' : 'Create a room, or join one with a friend’s code.'} icon={<Users size={32} color={t.textMuted} />} />
      ) : rooms.map(r => (
        <Card key={r.code} onPress={() => nav.push({ name: 'room', code: r.code })} style={{ marginBottom: 10, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {statusPill(r)}
                <Pill text={r.mode === 'live' ? (hi ? 'लाइव' : 'Live') : (hi ? 'कभी भी' : 'Anytime')} tone={r.mode === 'live' ? 'violet' : 'teal'} />
                {r.isHost ? <Pill text={hi ? 'होस्ट' : 'Host'} tone="primary" /> : null}
              </View>
              <Text numberOfLines={2} style={{ color: t.text, fontWeight: '800', fontSize: 15, lineHeight: 20 }}>{r.testTitle}</Text>
              <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 4 }}>
                {hi ? 'कोड' : 'Code'} {r.code} · {r.members} {hi ? 'सदस्य' : r.members === 1 ? 'member' : 'members'}{r.closesAt && r.status !== 'closed' ? ` · ${timeLeft(r.closesAt, hi)}` : ''}
              </Text>
            </View>
            <IconButton label={hi ? 'सूची से हटाएं' : 'Remove from list'} icon={<Trash2 size={17} color={t.textMuted} />} onPress={() => hide(r)} size={38} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

// ---- Friends & chat -------------------------------------------------------------------------------

function relationButton(rel: Relation | undefined, hi: boolean) {
  if (rel === 'friends') return { label: hi ? 'मित्र हैं' : 'Friends', disabled: true };
  if (rel === 'outgoing') return { label: hi ? 'अनुरोध भेजा' : 'Request sent', disabled: true };
  if (rel === 'incoming') return { label: hi ? 'स्वीकार करें' : 'Accept', disabled: false };
  if (rel === 'self') return { label: hi ? 'यह आप हैं' : 'This is you', disabled: true };
  return { label: hi ? 'मित्र अनुरोध भेजें' : 'Send friend request', disabled: false };
}

function FriendsTab({ active }: { active: boolean }) {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const badge = useFriendsBadge();
  const [data, setData] = useState<FriendsData | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<(Person & { relation?: Relation }) | null | undefined>(undefined);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api<FriendsData>('friends-get')); setError(''); badge.refresh(); }
    catch (e) { setError(friendlyError(e)); } finally { setRefreshing(false); }
  }, [badge.refresh]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (active && nav.stack.length === 0) load(); }, [active, nav.stack.length, load]);
  // refresh while visible (online dots, new messages)
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => { if (AppState.currentState === 'active' && nav.stack.length === 0) load(); }, 20000);
    return () => clearInterval(timer);
  }, [active, nav.stack.length, load]);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true); setSearchError(''); setFound(undefined);
    try { setFound((await api<{ user: any }>('friends-search', { query: q })).user); }
    catch (e) { setSearchError(friendlyError(e)); } finally { setSearching(false); }
  };
  const act = async (key: string, fn: () => Promise<any>) => {
    setBusy(key);
    try { await fn(); await load(); } catch (e) { setError(friendlyError(e)); } finally { setBusy(null); }
  };
  const request = (userId: string) => act(`req:${userId}`, async () => {
    const r = await api<{ relation: Relation }>('friends-request', { friendId: userId });
    setFound(f => (f && f.userId === userId ? { ...f, relation: r.relation } : f));
  });
  const respond = (userId: string, accept: boolean) => act(`res:${userId}`, () => api('friends-respond', { friendId: userId, accept }));
  const remove = (f: Person, title: string) => confirm(title, f.name, hi ? 'हटाएं' : 'Remove', () => act(`rm:${f.userId}`, () => api('friends-remove', { friendId: f.userId })));
  const shareCode = () => data && Share.share({ message: hi ? `MockTest Hub पर मुझे दोस्त बनाएं। मेरा मित्र कोड: ${showCode(data.myCode)}` : `Add me as a friend on MockTest Hub. My Friend code: ${showCode(data.myCode)}` }).catch(() => {});

  if (!data) return <View style={{ padding: 16 }}>{error ? <ErrorBox style={{ marginHorizontal: 0 }} message={error} onRetry={load} /> : <Skeleton rows={4} height={70} />}</View>;
  const rb = found ? relationButton(found.relation, hi) : null;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={() => { setRefreshing(true); load(); }} />}>
      {error ? <ErrorBox style={{ marginHorizontal: 0 }} message={error} /> : null}
      {/* My code */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textSoft, fontSize: 12.5, fontWeight: '700' }}>{hi ? 'आपका मित्र कोड' : 'Your Friend code'}</Text>
          <Text selectable style={{ color: t.text, fontSize: 24, fontWeight: '900', letterSpacing: 2, marginTop: 2 }}>{showCode(data.myCode)}</Text>
          <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>{hi ? 'इसे दोस्तों को भेजें ताकि वे आपको जोड़ सकें' : 'Send it to friends so they can add you'}</Text>
        </View>
        <Button small soft title={hi ? 'शेयर' : 'Share'} icon={<Share2 size={16} color={t.primary} />} onPress={shareCode} />
      </Card>

      {/* Add */}
      <SectionTitle>{hi ? 'मित्र जोड़ें' : 'Add a friend'}</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: t.input, borderRadius: 12, borderWidth: 1.5, borderColor: searchError ? t.danger : t.border, paddingHorizontal: 12 }}>
          <Search size={17} color={t.textMuted} />
          <TextInput value={query} onChangeText={v => { setQuery(v); setSearchError(''); setFound(undefined); }} placeholder={hi ? 'मित्र कोड या ईमेल' : 'Friend code or email'} placeholderTextColor={t.textMuted}
            autoCapitalize="none" autoCorrect={false} onSubmitEditing={search} returnKeyType="search" style={{ flex: 1, color: t.text, fontSize: 15, height: 50, marginLeft: 8 }} />
        </View>
        <Button title={hi ? 'खोजें' : 'Find'} loading={searching} onPress={search} style={{ paddingHorizontal: 20 }} />
      </View>
      {searchError ? <Text style={{ color: t.danger, marginTop: 8, fontWeight: '600' }}>{searchError}</Text> : null}
      {found === null ? <Text style={{ color: t.textSoft, marginTop: 10 }}>{hi ? 'इस कोड या ईमेल से कोई नहीं मिला।' : 'No one found with that code or email.'}</Text> : null}
      {found ? (
        <Card style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={found.name} color={colorFor(found.userId)} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: '800' }}>{found.name}</Text>
            <Text style={{ color: found.online ? t.success : t.textMuted, fontSize: 12.5 }}>{lastSeenText(found, hi)}</Text>
          </View>
          <Button small title={rb!.label} disabled={rb!.disabled} loading={busy === `req:${found.userId}` || busy === `res:${found.userId}`}
            icon={rb!.disabled ? undefined : <UserPlus size={15} color={t.primaryText} />}
            onPress={() => (found.relation === 'incoming' ? respond(found.userId, true) : request(found.userId))} />
        </Card>
      ) : null}

      {/* Requests */}
      {data.incoming.length ? (
        <>
          <SectionTitle>{hi ? 'मित्र अनुरोध' : 'Friend requests'} ({data.incoming.length})</SectionTitle>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {data.incoming.map((r, i) => (
              <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: t.border, backgroundColor: t.primarySoft }}>
                <Avatar name={r.name} color={colorFor(r.userId)} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: '800' }} numberOfLines={1}>{r.name}</Text>
                  <Text style={{ color: t.textSoft, fontSize: 12.5 }}>{hi ? 'आपको जोड़ना चाहते हैं' : 'Wants to be your friend'}</Text>
                </View>
                <Button small title={hi ? 'स्वीकार' : 'Accept'} loading={busy === `res:${r.userId}`} onPress={() => respond(r.userId, true)} />
                <IconButton label={hi ? 'अस्वीकार करें' : 'Reject'} icon={<X size={18} color={t.danger} />} tone="danger" size={40} onPress={() => respond(r.userId, false)} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {/* Friends */}
      <SectionTitle>{hi ? 'आपके मित्र' : 'Your friends'} ({data.friends.length})</SectionTitle>
      {data.friends.length === 0 ? (
        <Empty title={hi ? 'अभी कोई मित्र नहीं' : 'No friends yet'} text={hi ? 'मित्र कोड या ईमेल से दोस्तों को जोड़ें।' : 'Add friends with their Friend code or email.'} icon={<Users size={32} color={t.textMuted} />} />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {[...data.friends].sort((a, b) => (b.unread - a.unread) || ((b.lastMessage?.at || '') > (a.lastMessage?.at || '') ? 1 : -1)).map((f, i) => (
            <FriendRow key={f.userId} f={f} first={i === 0} onOpen={() => nav.push({ name: 'friendChat', friend: f })} onRemove={() => remove(f, hi ? 'मित्र हटाएं?' : 'Remove friend?')} />
          ))}
        </Card>
      )}

      {data.outgoing.length ? (
        <>
          <SectionTitle>{hi ? 'भेजे गए अनुरोध' : 'Requests you sent'}</SectionTitle>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {data.outgoing.map((r, i) => (
              <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
                <Avatar name={r.name} color={colorFor(r.userId)} size={38} />
                <Text style={{ color: t.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>{r.name}</Text>
                <Button small outline tone="neutral" title={hi ? 'रद्द करें' : 'Cancel'} onPress={() => act(`rm:${r.userId}`, () => api('friends-remove', { friendId: r.userId }))} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function FriendRow({ f, first, onOpen, onRemove }: { f: Friend; first: boolean; onOpen: () => void; onRemove: () => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const preview = f.lastMessage ? `${f.lastMessage.mine ? (hi ? 'आप: ' : 'You: ') : ''}${f.lastMessage.text}` : lastSeenText(f, hi);
  return (
    <Pressable onPress={onOpen} onLongPress={onRemove} delayLongPress={450}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: first ? 0 : 1, borderTopColor: t.border, backgroundColor: pressed ? t.cardAlt : 'transparent' })}>
      <View>
        <Avatar name={f.name} color={colorFor(f.userId)} size={46} />
        <View style={{ position: 'absolute', right: 0, bottom: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: f.online ? '#22c55e' : t.textMuted, borderWidth: 2, borderColor: t.card }} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: t.text, fontWeight: f.unread ? '900' : '800', flex: 1, fontSize: 15 }} numberOfLines={1}>{f.name}</Text>
          {f.lastMessage ? <Text style={{ color: f.unread ? t.primary : t.textMuted, fontSize: 11.5, fontWeight: f.unread ? '800' : '500' }}>{shortTime(f.lastMessage.at)}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text style={{ color: f.unread ? t.text : f.online && !f.lastMessage ? t.success : t.textSoft, fontSize: 13, flex: 1, fontWeight: f.unread ? '700' : '400' }} numberOfLines={1}>{preview}</Text>
          {f.unread ? <Badge count={f.unread} /> : <MessageCircle size={16} color={t.textMuted} />}
        </View>
      </View>
    </Pressable>
  );
}

const shortTime = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ---- One chat --------------------------------------------------------------------------------------

export function FriendChatScreen({ friend }: { friend: { userId: string; name: string; code?: string; online?: boolean; lastSeen?: string | null } }) {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const badge = useFriendsBadge();
  const insets = useSafeAreaInsets();
  const [person, setPerson] = useState<any>(friend);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const list = useRef<FlatList<ChatMessage>>(null);
  const cursor = useRef<string | null>(null);
  const known = useRef(new Map<string, ChatMessage>());

  // After the first load only changes come (new, read or deleted messages)
  const load = useCallback(async () => {
    try {
      const r = await api<{ friend: any; messages: ChatMessage[]; partial?: boolean; cursor?: string | null }>('friends-messages', { friendId: friend.userId, ...(cursor.current ? { since: cursor.current } : {}) });
      if (!r.partial) known.current = new Map();
      for (const m of r.messages) { if (m.deleted) known.current.delete(m.id); else known.current.set(m.id, m); }
      setMessages([...known.current.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      if (r.cursor) cursor.current = r.cursor;
      if (r.friend) setPerson(r.friend);
      setError('');
    } catch (e: any) {
      if (e?.code === 'NOT_FRIENDS') { nav.pop(); return; }
      setError(friendlyError(e));
    }
  }, [friend.userId, nav]);
  // no phone banner for this chat while it's open
  useEffect(() => { setOnScreen(`chat-${friend.userId}`); return () => setOnScreen(null); }, [friend.userId]);
  useEffect(() => {
    load().then(() => badge.refresh());
    const timer = setInterval(() => { if (AppState.currentState === 'active') load(); }, 3500);
    return () => clearInterval(timer);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setError('');
    try { await api('friends-send', { friendId: friend.userId, text: body }); setText(''); await load(); }
    catch (e) { setError(friendlyError(e)); } finally { setSending(false); }
  };
  const del = (m: ChatMessage) => confirm(hi ? 'संदेश हटाएं?' : 'Delete message?', m.text.slice(0, 80), hi ? 'हटाएं' : 'Delete', async () => {
    try { await api('friends-delete-message', { id: m.id }); await load(); } catch (e) { setError(friendlyError(e)); }
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.header, paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: t.border }}>
        <StatusBarFor color={t.header} />
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 60, paddingHorizontal: 6, gap: 10 }}>
          <IconButton label={hi ? 'वापस' : 'Back'} icon={<ArrowLeft size={22} color={t.text} />} onPress={nav.pop} tone="neutral" size={42} style={{ backgroundColor: 'transparent' }} />
          <Avatar name={person.name} color={colorFor(friend.userId)} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: '900', fontSize: 16 }} numberOfLines={1}>{person.name}</Text>
            <Text style={{ color: person.online ? t.success : t.textMuted, fontSize: 12.5 }}>{lastSeenText(person, hi)}</Text>
          </View>
          <IconButton label={hi ? 'मित्र हटाएं' : 'Remove friend'} icon={<UserMinus size={19} color={t.textSoft} />} style={{ backgroundColor: 'transparent' }}
            onPress={() => confirm(hi ? 'मित्र हटाएं?' : 'Remove friend?', person.name, hi ? 'हटाएं' : 'Remove', async () => { await api('friends-remove', { friendId: friend.userId }).catch(() => {}); badge.refresh(); nav.pop(); })} />
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {error ? <ErrorBox message={error} /> : null}
        {messages === null ? <ActivityIndicator color={t.primary} style={{ marginTop: 40 }} /> : (
          <FlatList
            ref={list}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={{ padding: 14, gap: 6, flexGrow: 1 }}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={<Empty title={hi ? 'बातचीत शुरू करें' : 'Say hello'} text={hi ? 'टेस्ट की तैयारी पर बात करें या रूम में बुलाएं।' : 'Talk about your preparation, or invite them to a test room.'} icon={<MessageCircle size={32} color={t.textMuted} />} />}
            renderItem={({ item: m }) => <Bubble m={m} onDelete={() => del(m)} onOpenRoom={code => nav.push({ name: 'room', code })} />}
          />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, paddingBottom: 10 + insets.bottom, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border }}>
          <TextInput value={text} onChangeText={setText} placeholder={hi ? 'संदेश लिखें' : 'Type a message'} placeholderTextColor={t.textMuted} multiline maxLength={2000}
            style={{ flex: 1, maxHeight: 120, minHeight: 46, color: t.text, backgroundColor: t.bg, borderRadius: 23, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15 }} />
          <Pressable onPress={send} disabled={!text.trim() || sending} accessibilityLabel={hi ? 'भेजें' : 'Send'}
            style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: text.trim() ? t.primary : t.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
            {sending ? <ActivityIndicator color={t.primaryText} size="small" /> : <Send size={20} color={text.trim() ? t.primaryText : t.textMuted} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ m, onDelete, onOpenRoom }: { m: ChatMessage; onDelete: () => void; onOpenRoom: (code: string) => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const time = new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (m.kind === 'room' && m.meta?.code) {
    return (
      <View style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', width: '82%', backgroundColor: t.card, borderRadius: 16, borderWidth: 1.5, borderColor: t.primary, padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Swords size={18} color={t.primary} />
          <Text style={{ color: t.primary, fontWeight: '900', fontSize: 12.5 }}>{m.meta.mode === 'live' ? (hi ? 'लाइव टेस्ट रूम' : 'Live test room') : (hi ? 'टेस्ट रूम' : 'Test room')}</Text>
        </View>
        <Text style={{ color: t.text, fontWeight: '800', marginTop: 6, lineHeight: 20 }}>{m.meta.testTitle || m.text}</Text>
        <Button small style={{ marginTop: 10 }} title={hi ? 'रूम खोलें' : 'Open room'} onPress={() => onOpenRoom(m.meta!.code!)} />
        <Text style={{ color: t.textMuted, fontSize: 10.5, marginTop: 6, alignSelf: 'flex-end' }}>{time}</Text>
      </View>
    );
  }
  return (
    <Pressable onLongPress={m.mine ? onDelete : undefined} delayLongPress={450}
      style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: m.mine ? t.primary : t.card, borderRadius: 18, borderBottomRightRadius: m.mine ? 5 : 18, borderBottomLeftRadius: m.mine ? 18 : 5, paddingHorizontal: 13, paddingVertical: 8, borderWidth: m.mine ? 0 : 1, borderColor: t.border }}>
      <Text selectable style={{ color: m.mine ? t.primaryText : t.text, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 2 }}>
        <Text style={{ color: m.mine ? t.primaryText : t.textMuted, opacity: 0.75, fontSize: 10.5 }}>{time}</Text>
        {m.mine ? (m.read ? <CheckCheck size={14} color={t.primaryText} /> : <Check size={14} color={t.primaryText} style={{ opacity: 0.75 }} />) : null}
      </View>
    </Pressable>
  );
}

