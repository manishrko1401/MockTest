import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { Bell, CheckCheck, Headphones, MessageCircle, UserPlus, Users } from 'lucide-react-native';
import { request, friendlyError } from '../api';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useTheme } from '../theme';
import { Card, Empty, ErrorBox, Header, HeaderButton, Loading, SectionTitle } from '../ui';
import { useFriendsBadge } from '../friendsApi';

// -----------------------------------------------------------------------------
// The bell: friend requests and messages, room invites / joins / starts and support replies
// (the same list as the website's bell), and which of them come as phone notifications.
// -----------------------------------------------------------------------------

export type AppNotification = { id: string; type: string; title: string; body: string; data: Record<string, string>; read: boolean; createdAt: string };

const ICON: Record<string, any> = {
  friend_request: UserPlus, friend_accepted: UserPlus, friend_message: MessageCircle,
  room_invite: Users, room_joined: Users, room_started: Users, support_reply: Headphones,
};

const KINDS = [
  { key: 'requests', en: ['Friend requests', 'New and accepted requests'], hi: ['मित्र अनुरोध', 'नए और स्वीकार किए गए अनुरोध'] },
  { key: 'messages', en: ['Messages from friends', 'One notification per chat'], hi: ['दोस्तों के संदेश', 'हर चैट की एक सूचना'] },
  { key: 'rooms', en: ['Test rooms', 'Added to a room, someone joined, test started'], hi: ['टेस्ट रूम', 'रूम में जोड़ा गया, कोई जुड़ा, टेस्ट शुरू'] },
  { key: 'support', en: ['Support replies', 'When our team answers you'], hi: ['सहायता के जवाब', 'जब हमारी टीम जवाब दे'] },
] as const;

const ago = (iso: string, hi: boolean) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return hi ? 'अभी' : 'now';
  if (s < 3600) return hi ? `${Math.floor(s / 60)} मिनट` : `${Math.floor(s / 60)}m`;
  if (s < 86400) return hi ? `${Math.floor(s / 3600)} घंटे` : `${Math.floor(s / 3600)}h`;
  return new Date(iso).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' });
};

/** Opens what a notification is about (also used when a phone notification is tapped). */
export function useOpenNotification() {
  const nav = useNav();
  return useCallback((data: Record<string, any> | undefined) => {
    if (!data) return;
    if (data.screen === 'chat' && data.friendId) nav.push({ name: 'friendChat', friend: { userId: data.friendId, name: data.friendName || '' } });
    else if (data.screen === 'room' && data.code) nav.push({ name: 'room', code: data.code });
    else if (data.screen === 'friends') nav.setTab('friends', 'friends');
    else if (data.screen === 'support') nav.push({ name: 'support' });
    else nav.push({ name: 'notifications' });
  }, [nav]);
}

export function NotificationsScreen() {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const badge = useFriendsBadge();
  const openTarget = useOpenNotification();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [muted, setMuted] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, prefs] = await Promise.all([request('notif-list'), request('notif-prefs')]);
      setItems(list.items || []); setMuted(prefs.muted || []); setError('');
    } catch (e) { setError(friendlyError(e)); setItems(i => i || []); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (n: AppNotification) => {
    if (!n.read) {
      setItems(list => list?.map(x => (x.id === n.id ? { ...x, read: true } : x)) || null);
      request('notif-read', { ids: [n.id] }).then(() => badge.refresh(), () => {});
    }
    openTarget(n.data);
  };
  const readAll = () => {
    setItems(list => list?.map(x => ({ ...x, read: true })) || null);
    request('notif-read', { all: true }).then(() => badge.refresh(), () => {});
  };
  const toggle = (key: string, on: boolean) => {
    if (!muted) return;
    const next = on ? muted.filter(k => k !== key) : [...muted, key];
    const before = muted;
    setMuted(next);
    request('notif-prefs', { muted: next }).catch(e => { setMuted(before); setError(friendlyError(e)); });
  };

  const unread = (items || []).filter(n => !n.read).length;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={hi ? 'सूचनाएं' : 'Notifications'} onBack={nav.pop}
        right={unread ? <HeaderButton label={hi ? 'सब पढ़ा हुआ' : 'Mark all read'} icon={<CheckCheck size={22} color={t.headerText} />} onPress={readAll} /> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={async () => { setRefreshing(true); await load(); badge.refresh(); setRefreshing(false); }} />}>
        {error ? <ErrorBox message={error} /> : null}
        {items === null ? <Loading /> : items.length === 0 ? (
          <Empty icon={<Bell size={34} color={t.textMuted} />} title={hi ? 'अभी कोई सूचना नहीं' : 'Nothing yet'}
            text={hi ? 'दोस्तों के अनुरोध, संदेश, टेस्ट रूम और सहायता के जवाब यहां दिखेंगे।' : 'Friend requests, messages, test rooms and support replies show up here.'} />
        ) : (
          <Card style={{ paddingVertical: 2 }}>
            {items.map((n, i) => {
              const Icon = ICON[n.type] || Bell;
              return (
                <Pressable key={n.id} onPress={() => open(n)} accessibilityRole="button"
                  style={({ pressed }) => ({ flexDirection: 'row', gap: 12, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: t.border, opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color={t.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <Text style={{ flex: 1, color: t.text, fontWeight: n.read ? '600' : '900' }} numberOfLines={1}>{n.title}</Text>
                      <Text style={{ color: t.textMuted, fontSize: 11.5 }}>{ago(n.createdAt, hi)}</Text>
                    </View>
                    <Text style={{ color: t.textSoft, marginTop: 2, lineHeight: 19 }} numberOfLines={2}>{n.body}</Text>
                  </View>
                  {!n.read ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: t.primary, marginTop: 6 }} /> : null}
                </Pressable>
              );
            })}
          </Card>
        )}

        <SectionTitle>{hi ? 'फ़ोन पर सूचनाएं' : 'Phone notifications'}</SectionTitle>
        <Card style={{ paddingVertical: 2 }}>
          {KINDS.map((k, i) => {
            const [title, sub] = hi ? k.hi : k.en;
            const on = muted ? !muted.includes(k.key) : true;
            return (
              <View key={k.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: '700' }}>{title}</Text>
                  <Text style={{ color: t.textMuted, fontSize: 12.5, marginTop: 1 }}>{sub}</Text>
                </View>
                <Switch value={on} disabled={muted === null} onValueChange={v => toggle(k.key, v)}
                  trackColor={{ true: t.primary, false: t.border }} thumbColor="#ffffff" accessibilityLabel={title} />
              </View>
            );
          })}
        </Card>
        <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 8 }}>
          {hi ? 'बंद की गई सूचनाएं भी इस सूची में दिखती रहेंगी।' : 'Switched-off kinds still appear in this list.'}
        </Text>
      </ScrollView>
    </View>
  );
}
