import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Linking, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, BriefcaseBusiness, ChevronRight, Coins, Crown, Download, FileText, Gift, Globe, Headphones, KeyRound, LogOut, Send, Shield, UserPen } from 'lucide-react-native';
import { getServer, request, friendlyError } from '../api';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useSession, useUser } from '../session';
import { useTheme } from '../theme';
import { Avatar, Button, Card, confirm, Empty, ErrorBox, Field, Header, KeyValue, Loading, Pill, SectionTitle } from '../ui';

function MenuRow({ icon, label, onPress, right, danger }: { icon: React.ReactNode; label: string; onPress: () => void; right?: React.ReactNode; danger?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 14, backgroundColor: pressed ? t.cardAlt : 'transparent' })}>
      {icon}
      <Text style={{ flex: 1, color: danger ? t.danger : t.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
      {right ?? <ChevronRight size={18} color={t.textMuted} />}
    </Pressable>
  );
}

export function ProfileScreen() {
  const t = useTheme();
  const { t: tr, hi, lang, setLang } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { signOut } = useSession();
  const isPro = user.subscriptionTier === 'Testbook Pass Pro';
  const ic = (C: any, color = t.primary) => <C size={20} color={color} />;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={tr('Profile')} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={user.name} size={58} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 19, fontWeight: '800' }} numberOfLines={1}>{user.name}</Text>
            <Text style={{ color: t.textSoft }} numberOfLines={1}>{user.email}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <Pill text={user.candidateCode} />
              {isPro ? <Pill text="PRO" tone="warning" /> : null}
            </View>
          </View>
        </Card>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Coins size={20} color={t.warning} />
            <Text style={{ color: t.text, fontWeight: '800', fontSize: 18, marginTop: 4 }}>{user.coins || 0}</Text>
            <Text style={{ color: t.textSoft, fontSize: 12 }}>{tr('Coins')}</Text>
          </Card>
          <Pressable style={{ flex: 1 }} onPress={() => nav.push({ name: 'pass' })}>
            <Card style={{ alignItems: 'center' }}>
              <Crown size={20} color={isPro ? t.warning : t.textMuted} />
              <Text style={{ color: t.text, fontWeight: '800', fontSize: 15, marginTop: 4 }}>{isPro ? 'PRO' : user.subscriptionTier === 'None' ? (hi ? 'फ्री' : 'Free') : user.subscriptionTier.replace('Testbook ', '')}</Text>
              <Text style={{ color: t.textSoft, fontSize: 12 }}>{tr('Your plan')}</Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => nav.push({ name: 'referrals' })}>
            <Card style={{ alignItems: 'center' }}>
              <Gift size={20} color={t.success} />
              <Text style={{ color: t.text, fontWeight: '800', fontSize: 18, marginTop: 4 }}>{user.referralsCount || 0}</Text>
              <Text style={{ color: t.textSoft, fontSize: 12 }}>{hi ? 'रेफ़रल' : 'Referrals'}</Text>
            </Card>
          </Pressable>
        </View>

        <SectionTitle>{tr('My account')}</SectionTitle>
        <Card style={{ padding: 0 }}>
          <MenuRow icon={ic(UserPen)} label={tr('Edit profile')} onPress={() => nav.push({ name: 'editProfile' })} />
          <MenuRow icon={ic(KeyRound)} label={tr('Change password')} onPress={() => nav.push({ name: 'changePassword' })} />
          <MenuRow icon={ic(Bookmark)} label={tr('Bookmarks')} onPress={() => nav.push({ name: 'bookmarks' })} />
          <MenuRow icon={ic(BriefcaseBusiness)} label={tr('Saved jobs')} onPress={() => nav.push({ name: 'savedJobs' })} />
          <MenuRow icon={ic(Download)} label={tr('Offline tests')} onPress={() => nav.push({ name: 'offline' })} />
          <MenuRow icon={ic(Gift)} label={tr('Refer friends')} onPress={() => nav.push({ name: 'referrals' })} />
        </Card>

        <SectionTitle>{hi ? 'ऐप' : 'App'}</SectionTitle>
        <Card style={{ padding: 0 }}>
          <MenuRow icon={ic(Globe)} label={`${tr('Language')}: ${lang === 'hi' ? 'हिन्दी' : 'English'}`} onPress={() => setLang(lang === 'hi' ? 'en' : 'hi')}
            right={<Text style={{ color: t.primary, fontWeight: '700' }}>{lang === 'hi' ? 'English' : 'हिन्दी'}</Text>} />
          <MenuRow icon={ic(Headphones)} label={tr('Help & support')} onPress={() => nav.push({ name: 'support' })} />
          <MenuRow icon={ic(Shield)} label={hi ? 'गोपनीयता नीति' : 'Privacy policy'} onPress={() => Linking.openURL(`${getServer()}/privacy`)} />
          <MenuRow icon={ic(FileText)} label={hi ? 'नियम और शर्तें' : 'Terms'} onPress={() => Linking.openURL(`${getServer()}/terms`)} />
          <MenuRow icon={<LogOut size={20} color={t.danger} />} label={tr('Sign out')} danger right={<View />}
            onPress={() => confirm(tr('Sign out') + '?', hi ? 'आप इस फ़ोन से लॉग आउट हो जाएंगे।' : 'You will be signed out on this phone.', tr('Sign out'), signOut)} />
        </Card>
        <Text style={{ color: t.textMuted, fontSize: 11, textAlign: 'center', marginTop: 16 }}>MockTest Hub 2.0.0</Text>
      </ScrollView>
    </View>
  );
}

export function EditProfileScreen() {
  const t = useTheme();
  const { t: tr } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { patchUser } = useSession();
  const [name, setName] = useState(user.name);
  const [mobile, setMobile] = useState(user.mobile || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (name.trim().length < 2) { setError('Please enter your full name.'); return; }
    setBusy(true); setError('');
    try {
      await request('update-profile', { userId: user.id, name: name.trim(), email: user.email, mobile: mobile.trim() });
      patchUser({ name: name.trim(), mobile: mobile.trim() });
      nav.pop();
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={tr('Edit profile')} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
        {error ? <ErrorBox message={error} /> : null}
        <Field label={tr('Full name')} value={name} onChangeText={setName} />
        <Field label={tr('Mobile number')} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" maxLength={10} />
        <Card style={{ marginBottom: 14 }}>
          <KeyValue label={tr('Email')} value={user.email} />
          <KeyValue label={tr('Candidate code')} value={user.candidateCode} />
        </Card>
        <Button title={tr('Save')} loading={busy} onPress={save} />
      </ScrollView>
    </View>
  );
}

export function ChangePasswordScreen() {
  const t = useTheme();
  const { t: tr, hi } = useI18n();
  const nav = useNav();
  const user = useUser();
  const [oldPass, setOld] = useState('');
  const [newPass, setNew] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const save = async () => {
    if (newPass.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setBusy(true); setError('');
    try { await request('update-password', { userId: user.id, oldPass, newPass }); setDone(true); }
    catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={tr('Change password')} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
        {done ? (
          <Card><Text style={{ color: t.success, fontWeight: '700' }}>{hi ? 'पासवर्ड बदल गया। दूसरे डिवाइस से लॉग आउट कर दिया गया है।' : 'Password changed. Other devices have been signed out.'}</Text></Card>
        ) : (
          <>
            {error ? <ErrorBox message={error} /> : null}
            <Field label={tr('Current password')} value={oldPass} onChangeText={setOld} secureTextEntry />
            <Field label={tr('New password')} value={newPass} onChangeText={setNew} secureTextEntry autoComplete="new-password" />
            <Button title={tr('Save')} loading={busy} disabled={!oldPass || !newPass} onPress={save} />
            <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 10 }}>{hi ? 'Google से लॉग इन किया है? तो लॉग इन स्क्रीन पर "पासवर्ड भूल गए?" से पासवर्ड बनाएं।' : 'Signed in with Google? Set a password with "Forgot password?" on the sign-in screen.'}</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export function ReferralsScreen() {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const user = useUser();
  const [friends, setFriends] = useState<any[] | null>(null);
  useEffect(() => { request('get-referred-friends', { userId: user.id }).then(r => setFriends(r.friends || r.referredFriends || []), () => setFriends([])); }, [user.id]);
  const share = () => Share.share({
    message: hi
      ? `MockTest Hub पर सरकारी परीक्षाओं की तैयारी करें! मेरा रेफ़रल कोड ${user.referralCode} इस्तेमाल करें: https://mocktesthub.vercel.app/auth?ref=${user.referralCode}`
      : `Prepare for government exams on MockTest Hub! Use my referral code ${user.referralCode}: https://mocktesthub.vercel.app/auth?ref=${user.referralCode}`,
  });
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={hi ? 'दोस्तों को रेफ़र करें' : 'Refer friends'} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Card style={{ alignItems: 'center' }}>
          <Gift size={36} color={t.success} />
          <Text style={{ color: t.text, fontSize: 16, fontWeight: '700', marginTop: 8, textAlign: 'center' }}>{hi ? 'अपना कोड शेयर करें, दोस्त जुड़ें तो कॉइन पाएं' : 'Share your code and earn coins when friends join'}</Text>
          <Text selectable style={{ color: t.primary, fontSize: 28, fontWeight: '900', letterSpacing: 2, marginVertical: 12 }}>{user.referralCode || '—'}</Text>
          <Button title={hi ? 'शेयर करें' : 'Share'} onPress={share} style={{ alignSelf: 'stretch' }} />
        </Card>
        <SectionTitle>{hi ? 'जुड़े हुए दोस्त' : 'Friends who joined'} ({friends?.length ?? 0})</SectionTitle>
        {friends === null ? <Loading /> : friends.length === 0 ? <Text style={{ color: t.textMuted }}>{hi ? 'अभी कोई नहीं।' : 'No one yet.'}</Text> : (
          <Card style={{ paddingVertical: 4 }}>
            {friends.map((f, i) => (
              <View key={f.id || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
                <Avatar name={f.fullName || f.name} size={32} />
                <Text style={{ color: t.text, flex: 1 }}>{f.fullName || f.name}</Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

export function PassScreen() {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { refreshUser } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isPro = user.subscriptionTier === 'Testbook Pass Pro';
  const perks = hi
    ? ['सभी PRO मॉक टेस्ट और सेक्शनल टेस्ट', 'RRB NTPC CBAT (साइको टेस्ट) की सभी बैटरी', 'विस्तृत समाधान और विश्लेषण', 'ऑफ़लाइन डाउनलोड']
    : ['All PRO mock and sectional tests', 'Every RRB NTPC CBAT (psycho test) battery', 'Detailed solutions and analysis', 'Offline downloads'];
  const claim = async () => {
    setBusy(true); setError('');
    try { await request('claim-pass-pro', { userId: user.id, tier: 'Testbook Pass Pro' }); await refreshUser(); }
    catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="PRO Pass" onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Card style={{ alignItems: 'center', borderColor: t.warning }}>
          <Crown size={42} color={t.warning} />
          <Text style={{ color: t.text, fontSize: 22, fontWeight: '900', marginTop: 8 }}>MockTest Hub PRO</Text>
          {isPro ? <Pill text={hi ? `सक्रिय${user.subscriptionExpiresAt ? ` · ${user.subscriptionExpiresAt} तक` : ''}` : `Active${user.subscriptionExpiresAt ? ` · until ${user.subscriptionExpiresAt}` : ''}`} tone="success" /> : null}
          <View style={{ alignSelf: 'stretch', marginTop: 14, gap: 8 }}>
            {perks.map(p => <Text key={p} style={{ color: t.text, fontSize: 15 }}>✓  {p}</Text>)}
          </View>
        </Card>
        {error ? <ErrorBox message={error} /> : null}
        {!isPro ? <Button style={{ marginTop: 14 }} title={hi ? 'PRO पास अनलॉक करें' : 'Unlock PRO pass'} loading={busy} onPress={claim} tone="warning" /> : null}
      </ScrollView>
    </View>
  );
}

// ---- Support chat ----------------------------------------------------------------------------

type Msg = { id: string; sender: 'ADMIN' | 'STUDENT'; message: string; isRead: boolean; createdAt: string; pending?: boolean };

export function SupportChatScreen() {
  const t = useTheme();
  const { t: tr, hi } = useI18n();
  const nav = useNav();
  const user = useUser();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const list = useRef<FlatList<Msg>>(null);

  const load = useCallback(async () => {
    try {
      const r = await request<{ messages: Msg[] }>('get-support-messages', { userId: user.id, markAsRead: true });
      setMessages(prev => [...r.messages, ...(prev || []).filter(m => m.pending)]);
      setError('');
    } catch (e) { if (!messages) setError(friendlyError(e)); }
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [load]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const temp: Msg = { id: `tmp-${Date.now()}`, sender: 'STUDENT', message: body, isRead: false, createdAt: new Date().toISOString(), pending: true };
    setMessages(m => [...(m || []), temp]); setText(''); setSending(true);
    try {
      const r = await request<{ message: Msg }>('send-support-message', { userId: user.id, message: body });
      setMessages(m => (m || []).map(x => (x.id === temp.id ? r.message : x)));
    } catch (e) {
      setMessages(m => (m || []).filter(x => x.id !== temp.id)); setText(body); setError(friendlyError(e));
    } finally { setSending(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={tr('Support team')} subtitle={hi ? 'हम आमतौर पर कुछ घंटों में जवाब देते हैं' : 'We usually reply within a few hours'} onBack={nav.pop} />
      <KeyboardAvoidingView style={{ flex: 1 }}>
        {error ? <ErrorBox message={error} onRetry={load} /> : null}
        {messages === null ? <Loading /> : (
          <FlatList
            ref={list}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={{ padding: 12, gap: 6, flexGrow: 1 }}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={<Empty title={hi ? 'हमें संदेश भेजें' : 'Send us a message'} text={hi ? 'टेस्ट, पास या ऐप से जुड़ा कोई भी सवाल पूछें।' : 'Ask anything about tests, the pass or the app.'} />}
            renderItem={({ item: m }) => {
              const mine = m.sender !== 'ADMIN';
              return (
                <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: mine ? t.bubbleAdmin : t.bubbleStudent, borderRadius: 14, borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4, paddingHorizontal: 12, paddingVertical: 8, borderWidth: mine ? 0 : 1, borderColor: t.border }}>
                  {!mine ? <Text style={{ color: t.primary, fontSize: 11, fontWeight: '800', marginBottom: 2 }}>{tr('Support team')}</Text> : null}
                  <Text selectable style={{ color: mine ? t.bubbleAdminText : t.bubbleStudentText, fontSize: 15, lineHeight: 21 }}>{m.message}</Text>
                  <Text style={{ color: mine ? t.bubbleAdminText : t.textMuted, opacity: 0.75, fontSize: 10, marginTop: 3, alignSelf: 'flex-end' }}>
                    {m.pending ? '…' : new Date(m.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, paddingBottom: 10 + insets.bottom, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border }}>
          <TextInput value={text} onChangeText={setText} placeholder={tr('Type a message')} placeholderTextColor={t.textMuted} multiline
            style={{ flex: 1, maxHeight: 120, minHeight: 44, color: t.text, backgroundColor: t.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 }} />
          <Pressable onPress={send} disabled={!text.trim() || sending} accessibilityLabel="Send"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? t.primary : t.border, alignItems: 'center', justifyContent: 'center' }}>
            {sending ? <ActivityIndicator color={t.primaryText} size="small" /> : <Send size={20} color={text.trim() ? t.primaryText : t.textMuted} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
