import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { FileText, Inbox, LayoutDashboard, MoreHorizontal, Users } from 'lucide-react-native';
import { api, clearSession, loadSession, onSignedOut, StaffUser } from './src/api';
import { LiveProvider, useLive } from './src/live';
import { NavProvider, Route, Tab, useNav } from './src/nav';
import { forgetPushToken, getSavedPushToken, registerForPush, setupChannels } from './src/push';
import { Can, SessionProvider, useSession } from './src/session';
import { useTheme } from './src/theme';
import { Badge, Button } from './src/ui';
import LoginScreen from './src/screens/LoginScreen';
import InboxScreen from './src/screens/InboxScreen';
import ChatScreen from './src/screens/ChatScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { FeedbackItemScreen, InquiryScreen, ReportScreen, SuggestionScreen } from './src/screens/DetailScreens';
import { UserScreen, UsersScreen } from './src/screens/UsersScreens';
import { NoticeEditScreen, NoticesScreen } from './src/screens/NoticesScreens';
import { MoreScreen, SettingsScreen, TestScreen } from './src/screens/MoreScreens';

// Pushes that arrive while the app is open are not shown as banners: the live sync shows the
// same message as its own alert a moment later (and skips the chat already on screen).
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const remote = (n.request.trigger as any)?.type === 'push';
    return { shouldShowBanner: !remote, shouldShowList: !remote, shouldPlaySound: !remote, shouldSetBadge: false };
  },
});

const ME_KEY = 'mth_admin_me';
type Me = { can: Can; pushConfigured: boolean };

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const t = useTheme();
  const [user, setUser] = useState<StaffUser | null | undefined>(undefined);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState('');

  const loadMe = useCallback(async () => {
    setError('');
    try {
      const res = await api<Me & { user: StaffUser }>('me');
      const value = { can: res.can, pushConfigured: res.pushConfigured };
      setMe(value);
      AsyncStorage.setItem(ME_KEY, JSON.stringify(value)).catch(() => {});
    } catch (e: any) {
      // Offline: keep working with what was known last time
      const cached = await AsyncStorage.getItem(ME_KEY);
      if (cached) setMe(JSON.parse(cached));
      else setError(e.message);
    }
  }, []);

  useEffect(() => {
    setupChannels().catch(() => {});
    loadSession().then(u => { setUser(u); if (u) loadMe(); });
    return onSignedOut(() => { setUser(null); setMe(null); });
  }, [loadMe]);

  const signOut = useCallback(async () => {
    const pushToken = await getSavedPushToken();
    await api('logout', { pushToken }).catch(() => {});
    await forgetPushToken();
    await clearSession();
    await AsyncStorage.removeItem(ME_KEY);
    Notifications.setBadgeCountAsync(0).catch(() => {});
    setUser(null); setMe(null);
  }, []);

  if (user === undefined) return <Splash />;
  if (!user) return <LoginScreen onSignedIn={u => { setUser(u); loadMe(); }} />;
  if (!me) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {error ? (
          <>
            <Text style={{ color: t.text, fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>{error}</Text>
            <Button title="Try again" onPress={loadMe} />
          </>
        ) : <ActivityIndicator color={t.primary} size="large" />}
      </View>
    );
  }

  const tabs = tabsFor(me.can);
  return (
    <SessionProvider value={{ user, can: me.can, pushConfigured: me.pushConfigured, signOut }}>
      <LiveProvider>
        <NavProvider firstTab={tabs[0]}>
          <Shell tabs={tabs} />
        </NavProvider>
      </LiveProvider>
    </SessionProvider>
  );
}

function tabsFor(can: Can): Tab[] {
  const inbox = can.support || can.reports || can.inquiries || can.suggestions || can.feedback;
  return [inbox ? 'inbox' : null, 'dashboard', can.users ? 'users' : null, can.notices ? 'notices' : null, 'more'].filter(Boolean) as Tab[];
}

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: '#1e4e79', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#fff" size="large" />
    </View>
  );
}

function Shell({ tabs }: { tabs: Tab[] }) {
  const t = useTheme();
  const nav = useNav();
  const { can } = useSession();
  const top = nav.stack[nav.stack.length - 1];

  // Ask for notification permission and register this phone for pushes
  useEffect(() => { registerForPush().catch(() => {}); }, []);

  // Tapping an alert opens what it is about (also when it started the app)
  useEffect(() => {
    try {
      const last = Notifications.getLastNotificationResponse();
      if (last) {
        nav.openTarget(last.notification.request.content.data as any);
        Notifications.clearLastNotificationResponse?.();
      }
    } catch { /* browser preview */ }
    const sub = Notifications.addNotificationResponseReceivedListener(r => nav.openTarget(r.notification.request.content.data as any));
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1, display: top ? 'none' : 'flex' }}>
        {nav.tab === 'inbox' ? <InboxScreen can={can} /> : null}
        {nav.tab === 'dashboard' ? <DashboardScreen /> : null}
        {nav.tab === 'users' ? <UsersScreen /> : null}
        {nav.tab === 'notices' ? <NoticesScreen /> : null}
        {nav.tab === 'more' ? <MoreScreen /> : null}
      </View>
      {top ? <View style={{ flex: 1 }}><RouteScreen route={top} /></View> : null}
      {!top ? <TabBar tabs={tabs} /> : null}
    </View>
  );
}

function RouteScreen({ route }: { route: Route }) {
  switch (route.name) {
    case 'chat': return <ChatScreen key={route.userId} userId={route.userId} title={route.title} />;
    case 'report': return <ReportScreen report={route.report} />;
    case 'inquiry': return <InquiryScreen item={route.item} />;
    case 'suggestion': return <SuggestionScreen item={route.item} />;
    case 'feedbackItem': return <FeedbackItemScreen item={route.item} />;
    case 'user': return <UserScreen key={route.id} id={route.id} />;
    case 'notice': return <NoticeEditScreen notice={route.notice} />;
    case 'test': return <TestScreen test={route.test} />;
    case 'settings': return <SettingsScreen />;
  }
}

const TAB_META: Record<Tab, { label: string; icon: any }> = {
  inbox: { label: 'Inbox', icon: Inbox },
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  users: { label: 'Users', icon: Users },
  notices: { label: 'Notices', icon: FileText },
  more: { label: 'More', icon: MoreHorizontal },
};

function TabBar({ tabs }: { tabs: Tab[] }) {
  const t = useTheme();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { counts } = useLive();
  const inboxCount = counts ? counts.supportThreads + counts.reports + counts.inquiries + counts.suggestions : 0;
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border, paddingBottom: insets.bottom }}>
      {tabs.map(tab => {
        const on = nav.tab === tab;
        const Icon = TAB_META[tab].icon;
        return (
          <Pressable key={tab} onPress={() => nav.setTab(tab)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}>
            <View>
              <Icon size={22} color={on ? t.primary : t.textMuted} />
              {tab === 'inbox' && inboxCount ? <Badge count={inboxCount} style={{ position: 'absolute', top: -6, right: -14 }} /> : null}
            </View>
            <Text style={{ fontSize: 11, marginTop: 3, color: on ? t.primary : t.textMuted, fontWeight: on ? '800' : '600' }}>{TAB_META[tab].label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
