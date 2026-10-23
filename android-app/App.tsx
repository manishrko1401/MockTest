import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { CalendarCheck, GraduationCap, House, User, Users } from 'lucide-react-native';
import { DataProvider } from './src/data';
import { LanguageProvider, useI18n } from './src/i18n';
import { NavProvider, Route, Tab, useNav } from './src/nav';
import { SessionProvider, useSession } from './src/session';
import { ThemeProvider, useTheme } from './src/theme';
import { Badge } from './src/ui';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import { NoticeScreen, NoticesScreen, SavedJobsScreen } from './src/screens/NoticeScreens';
import { ChangePasswordScreen, EditProfileScreen, PassScreen, ProfileScreen, ReferralsScreen, SupportChatScreen } from './src/screens/ProfileScreens';
import { CategoryScreen, ExamTestsScreen, TestInfoScreen, TestsScreen } from './src/screens/TestScreens';
import ExamRunScreen from './src/screens/ExamRunScreen';
import CbatRunScreen from './src/screens/CbatRunScreen';
import { TypingCategoryScreen, TypingRunScreen } from './src/screens/TypingScreens';
import PlannerScreen from './src/screens/PlannerScreen';
import LockerScreen from './src/screens/LockerScreen';
import OfflineScreen from './src/screens/OfflineScreen';
import { FriendChatScreen, FriendsScreen } from './src/screens/FriendsScreens';
import RoomScreen from './src/screens/RoomScreen';
import NetInfo from '@react-native-community/netinfo';
import { syncOutbox } from './src/offline';
import * as Notifications from 'expo-notifications';
import { notifyLocal, registerPushDevice } from './src/push';
import { request } from './src/api';
import { NotificationsScreen, useOpenNotification } from './src/screens/NotificationsScreen';
import { PassGift } from './src/screens/PassGift';
import { UpdatePrompt } from './src/updater';
import { AnalysisScreen, BookmarksScreen } from './src/screens/AnalysisScreens';
import { FriendsBadgeProvider, useFriendsBadge } from './src/friendsApi';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <LanguageProvider>
          <SessionProvider>
            <Root />
            {/* a newer version on the website: offer it (also before signing in) */}
            <UpdatePrompt />
          </SessionProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const t = useTheme();
  // The window behind the app (seen while screens change) follows the theme too
  React.useEffect(() => { SystemUI.setBackgroundColorAsync(t.bg).catch(() => {}); }, [t.bg]);
  return <StatusBar style={t.dark ? 'light' : 'dark'} />;
}

function Root() {
  const t = useTheme();
  const { user } = useSession();
  if (user === undefined) {
    return <View style={{ flex: 1, backgroundColor: t.hero, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" size="large" /></View>;
  }
  if (!user) return <AuthScreen />;
  return (
    <DataProvider>
      <FriendsBadgeProvider>
        <NavProvider>
          <Shell />
        </NavProvider>
      </FriendsBadgeProvider>
    </DataProvider>
  );
}

function Shell() {
  const t = useTheme();
  const nav = useNav();
  const { refreshUser } = useSession();
  // Results made offline: upload now, every 2 minutes, and as soon as the internet is back
  React.useEffect(() => {
    const sync = () => syncOutbox().then(r => {
      if (!r.uploaded) return;
      refreshUser();
      notifyLocal('results', 'Offline results uploaded', `${r.uploaded} result${r.uploaded > 1 ? 's' : ''} saved to your account.`);
    }).catch(() => {});
    registerPushDevice().catch(() => {});
    sync();
    const timer = setInterval(sync, 120000);
    const unsub = NetInfo.addEventListener(s => { if (s.isConnected) sync(); });
    return () => { clearInterval(timer); unsub(); };
  }, [refreshUser]);
  // A tapped phone notification opens its chat / room / requests / support (also when it
  // started the app); one arriving while the app is open refreshes the badges.
  const badge = useFriendsBadge();
  const openNotification = useOpenNotification();
  React.useEffect(() => {
    const open = (data: any) => {
      if (data?.id) request('notif-read', { ids: [data.id] }).catch(() => {});
      openNotification(data);
      badge.refresh();
    };
    Notifications.getLastNotificationResponseAsync().then(r => {
      if (!r) return;
      open(r.notification.request.content.data);
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }).catch(() => {});
    const tapped = Notifications.addNotificationResponseReceivedListener(r => open(r.notification.request.content.data));
    const arrived = Notifications.addNotificationReceivedListener(() => badge.refresh());
    return () => { tapped.remove(); arrived.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const top = nav.stack[nav.stack.length - 1];
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Tabs stay mounted under the stack, so going back keeps their scroll and filters */}
      <View style={{ flex: 1, display: top ? 'none' : 'flex' }}>
        <TabScreen tab={nav.tab} />
      </View>
      {top ? <View style={{ flex: 1 }}><RouteScreen route={top} /></View> : null}
      {!top ? <TabBar /> : null}
      {/* launch offer: free 1-year Pass Pro until it's claimed */}
      <PassGift />
    </View>
  );
}

function TabScreen({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'home': return <HomeScreen />;
    case 'tests': return <TestsScreen />;
    case 'planner': return <PlannerScreen />;
    case 'friends': return <FriendsScreen />;
    case 'profile': return <ProfileScreen />;
  }
}

function RouteScreen({ route }: { route: Route }) {
  switch (route.name) {
    case 'notices': return <NoticesScreen initialCategory={route.category} />;
    case 'notice': return <NoticeScreen notice={route.notice} />;
    case 'savedJobs': return <SavedJobsScreen />;
    case 'support': return <SupportChatScreen />;
    case 'editProfile': return <EditProfileScreen />;
    case 'changePassword': return <ChangePasswordScreen />;
    case 'referrals': return <ReferralsScreen />;
    case 'pass': return <PassScreen />;
    case 'category': return <CategoryScreen categoryId={route.categoryId} />;
    case 'exam': return <ExamTestsScreen categoryId={route.categoryId} examId={route.examId} />;
    case 'testInfo': return <TestInfoScreen key={route.testId} testId={route.testId} />;
    case 'examRun': return <ExamRunScreen key={route.testId} testId={route.testId} resume={route.resume} lang={route.lang} l1={route.l1} l2={route.l2} offline={route.offline} roomCode={route.roomCode} />;
    case 'analysis': return <AnalysisScreen key={`${route.testId}:${route.attemptId || ''}:${route.offline ? 'off' : 'on'}`} testId={route.testId} attemptId={route.attemptId} offline={route.offline} />;
    case 'bookmarks': return <BookmarksScreen />;
    case 'cbatRun': return <CbatRunScreen key={route.testId} testId={route.testId} offline={route.offline} />;
    case 'typingCategory': return <TypingCategoryScreen key={route.categoryId} categoryId={route.categoryId} />;
    case 'typingRun': return <TypingRunScreen key={route.testId} testId={route.testId} offline={route.offline} />;
    case 'locker': return <LockerScreen />;
    case 'offline': return <OfflineScreen />;
    case 'room': return <RoomScreen key={route.code} code={route.code} />;
    case 'friendChat': return <FriendChatScreen key={route.friend.userId} friend={route.friend} />;
    case 'notifications': return <NotificationsScreen />;
    default: return null;
  }
}

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'tests', label: 'Tests', icon: GraduationCap },
  { key: 'planner', label: 'Planner', icon: CalendarCheck },
  { key: 'friends', label: 'Friends', icon: Users },
  { key: 'profile', label: 'Me', icon: User },
];

function TabBar() {
  const t = useTheme();
  const { t: tr } = useI18n();
  const nav = useNav();
  const badge = useFriendsBadge();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border, paddingBottom: Math.max(insets.bottom, 6), paddingTop: 6 }}>
      {TABS.map(({ key, label, icon: Icon }) => {
        const on = nav.tab === key;
        const count = key === 'friends' ? badge.total : 0;
        return (
          <Pressable key={key} onPress={() => nav.setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tr(label)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}>
            <View style={{ width: 58, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.primarySoft : 'transparent' }}>
              <Icon size={22} color={on ? t.primary : t.textMuted} strokeWidth={on ? 2.4 : 2} />
              {count ? <Badge count={count} style={{ position: 'absolute', top: -3, right: 6, minWidth: 18, height: 18, borderWidth: 2, borderColor: t.card }} /> : null}
            </View>
            <Text style={{ fontSize: 11.5, marginTop: 3, color: on ? t.primary : t.textMuted, fontWeight: on ? '800' : '600' }}>{tr(label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
