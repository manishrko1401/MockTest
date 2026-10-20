import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Award, FileText, Home, Keyboard, User } from 'lucide-react-native';
import { DataProvider } from './src/data';
import { LanguageProvider, useI18n } from './src/i18n';
import { NavProvider, Route, Tab, useNav } from './src/nav';
import { SessionProvider, useSession } from './src/session';
import { useTheme } from './src/theme';
import { Empty, Header } from './src/ui';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import { NoticeScreen, NoticesScreen, SavedJobsScreen } from './src/screens/NoticeScreens';
import { ChangePasswordScreen, EditProfileScreen, PassScreen, ProfileScreen, ReferralsScreen, SupportChatScreen } from './src/screens/ProfileScreens';
import { CategoryScreen, ExamTestsScreen, TestInfoScreen, TestsScreen } from './src/screens/TestScreens';
import ExamRunScreen from './src/screens/ExamRunScreen';
import CbatRunScreen from './src/screens/CbatRunScreen';
import { TypingCategoryScreen, TypingHubScreen, TypingRunScreen } from './src/screens/TypingScreens';
import PlannerScreen from './src/screens/PlannerScreen';
import LockerScreen from './src/screens/LockerScreen';
import OfflineScreen from './src/screens/OfflineScreen';
import NetInfo from '@react-native-community/netinfo';
import { syncOutbox } from './src/offline';
import { notifyLocal, setupNotifications } from './src/push';
import { AnalysisScreen, BookmarksScreen } from './src/screens/AnalysisScreens';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <LanguageProvider>
        <SessionProvider>
          <Root />
        </SessionProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { user } = useSession();
  if (user === undefined) {
    return <View style={{ flex: 1, backgroundColor: '#1e4e79', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" size="large" /></View>;
  }
  if (!user) return <AuthScreen />;
  return (
    <DataProvider>
      <NavProvider>
        <Shell />
      </NavProvider>
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
    setupNotifications().catch(() => {});
    sync();
    const timer = setInterval(sync, 120000);
    const unsub = NetInfo.addEventListener(s => { if (s.isConnected) sync(); });
    return () => { clearInterval(timer); unsub(); };
  }, [refreshUser]);
  const top = nav.stack[nav.stack.length - 1];
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Tabs stay mounted under the stack, so going back keeps their scroll and filters */}
      <View style={{ flex: 1, display: top ? 'none' : 'flex' }}>
        <TabScreen tab={nav.tab} />
      </View>
      {top ? <View style={{ flex: 1 }}><RouteScreen route={top} /></View> : null}
      {!top ? <TabBar /> : null}
    </View>
  );
}

function TabScreen({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'home': return <HomeScreen />;
    case 'tests': return <TestsScreen />;
    case 'typing': return <TypingHubScreen />;
    case 'notices': return <NoticesScreen />;
    case 'profile': return <ProfileScreen />;
  }
}

function RouteScreen({ route }: { route: Route }) {
  switch (route.name) {
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
    case 'examRun': return <ExamRunScreen key={route.testId} testId={route.testId} resume={route.resume} lang={route.lang} l1={route.l1} l2={route.l2} offline={route.offline} />;
    case 'analysis': return <AnalysisScreen key={`${route.testId}:${route.attemptId || ''}:${route.offline ? 'off' : 'on'}`} testId={route.testId} attemptId={route.attemptId} offline={route.offline} />;
    case 'bookmarks': return <BookmarksScreen />;
    case 'cbatRun': return <CbatRunScreen key={route.testId} testId={route.testId} offline={route.offline} />;
    case 'typingCategory': return <TypingCategoryScreen key={route.categoryId} categoryId={route.categoryId} />;
    case 'typingRun': return <TypingRunScreen key={route.testId} testId={route.testId} offline={route.offline} />;
    case 'planner': return <PlannerScreen />;
    case 'locker': return <LockerScreen />;
    case 'offline': return <OfflineScreen />;
    default: return null;
  }
}

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'tests', label: 'Tests', icon: Award },
  { key: 'typing', label: 'Typing', icon: Keyboard },
  { key: 'notices', label: 'Notices', icon: FileText },
  { key: 'profile', label: 'Profile', icon: User },
];

function TabBar() {
  const t = useTheme();
  const { t: tr } = useI18n();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border, paddingBottom: insets.bottom }}>
      {TABS.map(({ key, label, icon: Icon }) => {
        const on = nav.tab === key;
        return (
          <Pressable key={key} onPress={() => nav.setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
            <Icon size={22} color={on ? t.primary : t.textMuted} />
            <Text style={{ fontSize: 11, marginTop: 3, color: on ? t.primary : t.textMuted, fontWeight: on ? '800' : '600' }}>{tr(label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
