import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { CalendarCheck, GraduationCap, House, User, Users } from 'lucide-react-native';
import { DataProvider, flattenTests, useData } from './src/data';
import { LanguageProvider, useI18n } from './src/i18n';
import { NavProvider, Route, Tab, useNav } from './src/nav';
import { SessionProvider, useSession } from './src/session';
import { ThemeProvider, useTheme } from './src/theme';
import { Badge } from './src/ui';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import { NoticeScreen, NoticesScreen, SavedJobsScreen } from './src/screens/NoticeScreens';
import { ChangePasswordScreen, EditProfileScreen, PassScreen, ProfileScreen, ReferralsScreen, SupportChatScreen } from './src/screens/ProfileScreens';
import { CategoryScreen, ExamTestsScreen, SeriesTestsScreen, TestInfoScreen, TestsScreen } from './src/screens/TestScreens';
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
import LiveResultScreen from './src/screens/LiveResultScreen';
import { FriendsBadgeProvider, useFriendsBadge } from './src/friendsApi';
import { TourProvider, TourTarget } from './src/tour';
import { setAppActivity } from './src/presence';

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
  const { user } = useSession();
  if (user === undefined) return <BrandLoading />;
  if (!user) return <AuthScreen />;
  return (
    <DataProvider>
      <FriendsBadgeProvider>
        <NavProvider>
          <TourProvider>
            <Shell />
          </TourProvider>
        </NavProvider>
      </FriendsBadgeProvider>
    </DataProvider>
  );
}

/**
 * While the saved sign-in is checked: the same picture as the system splash (white trophy on
 * brand blue), with the name, and a spinner only if it takes a moment.
 */
function BrandLoading() {
  const { hi } = useI18n();
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => { const timer = setTimeout(() => setSlow(true), 600); return () => clearTimeout(timer); }, []);
  return (
    <View style={{ flex: 1, backgroundColor: BRAND_BLUE, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="MockTest Hub">
      <StatusBar style="light" />
      <Image source={require('./assets/splash-icon.png')} style={{ width: 132, height: 132 }} resizeMode="contain" />
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 6, letterSpacing: 0.3 }}>MockTest Hub</Text>
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13.5, marginTop: 4 }}>{hi ? 'सरकारी परीक्षा की तैयारी' : 'Government exam preparation'}</Text>
      <View style={{ height: 56, justifyContent: 'center', marginTop: 18 }}>
        {slow ? <ActivityIndicator color="#fff" size="large" /> : null}
      </View>
    </View>
  );
}
const BRAND_BLUE = '#1e4e79';

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
  usePresenceActivity(nav.tab, top);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Tabs stay mounted under the stack, so going back keeps their scroll and filters */}
      <View style={{ flex: 1, display: top ? 'none' : 'flex' }}>
        <TabScreen tab={nav.tab} />
      </View>
      {top ? <View style={{ flex: 1 }}><RouteScreen route={top} /></View> : null}
      {!top ? <TourTarget id="tabbar"><TabBar /></TourTarget> : null}
      {/* launch offer: free 1-year Pass Pro until it's claimed */}
      <PassGift />
    </View>
  );
}

/** What the student is doing, in words, for the admin panel's "Live now". */
function usePresenceActivity(tab: Tab, top: Route | undefined) {
  const { catalog } = useData();
  const byId = React.useMemo(() => new Map(flattenTests(catalog).map(x => [x.test.id, x])), [catalog]);
  const words = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase());
  const test = (id: string) => byId.get(id)?.test.title || words(id);
  let text: string;
  if (!top) {
    text = ({ home: 'Home', tests: 'Tests', planner: 'Study Planner', friends: 'With Friends', profile: 'Me (profile)' } as Record<Tab, string>)[tab];
  } else {
    const cat = (id: string) => catalog.find(c => c.id === id);
    switch (top.name) {
      case 'testInfo': text = `Test details: ${test(top.testId)}`; break;
      case 'examRun': text = `Taking ${test(top.testId)}${top.offline ? ' (offline)' : ''}${top.roomCode ? ` · room ${top.roomCode}` : ''}`; break;
      case 'cbatRun': text = `Taking CBAT: ${test(top.testId)}`; break;
      case 'analysis': text = `Viewing result: ${test(top.testId)}`; break;
      case 'category': text = `Tests › ${cat(top.categoryId)?.name || words(top.categoryId)}`; break;
      case 'exam': case 'series': {
        const c = cat(top.categoryId);
        const exam: any = c?.subCategories.find(x => x.id === top.examId);
        const series = top.name === 'series' ? (exam?.subSubCategories || []).find((x: any) => x.id === top.seriesId)?.name : '';
        text = ['Tests', c?.name, exam?.name, series].filter(Boolean).join(' › ');
        break;
      }
      case 'typingCategory': text = `Typing tests › ${words(top.categoryId)}`; break;
      case 'typingRun': text = `Typing test: ${words(top.testId)}${top.offline ? ' (offline)' : ''}`; break;
      case 'notice': text = `Reading notice: ${top.notice?.title || ''}`.trim(); break;
      case 'notices': text = 'Notices'; break;
      case 'room': text = `With Friends: room ${top.code}`; break;
      case 'friendChat': text = `Chatting with ${top.friend.name}`; break;
      case 'support': text = 'Support chat'; break;
      case 'locker': text = 'Document Locker'; break;
      case 'offline': text = 'Offline downloads'; break;
      case 'bookmarks': text = 'Bookmarked questions'; break;
      case 'savedJobs': text = 'Saved jobs'; break;
      case 'pass': text = 'Pass Pro page'; break;
      case 'referrals': text = 'Refer & earn'; break;
      case 'notifications': text = 'Notifications'; break;
      case 'editProfile': text = 'Editing profile'; break;
      case 'changePassword': text = 'Changing password'; break;
      default: text = words((top as Route).name);
    }
  }
  React.useEffect(() => { setAppActivity(text.slice(0, 160)); }, [text]);
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
    case 'series': return <SeriesTestsScreen categoryId={route.categoryId} examId={route.examId} seriesId={route.seriesId} />;
    case 'testInfo': return <TestInfoScreen key={route.testId} testId={route.testId} />;
    case 'examRun': return <ExamRunScreen key={route.testId} testId={route.testId} resume={route.resume} lang={route.lang} l1={route.l1} l2={route.l2} offline={route.offline} roomCode={route.roomCode} />;
    case 'liveResult': return <LiveResultScreen result={route.result} />;
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
