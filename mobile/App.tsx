import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  StatusBar,
  BackHandler
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { ApiClient } from './api';
import AuthScreen from './screens/AuthScreen';
import DashboardScreen from './screens/DashboardScreen';
import TestSeriesDetailScreen from './screens/TestSeriesDetailScreen';
import MobileTestScreen from './MobileTestScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import SupportChatScreen from './screens/SupportChatScreen';
import { Trophy } from 'lucide-react-native';
import { ThemeColors } from './theme';

type ViewMode = 'auth' | 'dashboard' | 'series_detail' | 'exam' | 'analysis' | 'support_chat';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('auth');
  const [previousViewMode, setPreviousViewMode] = useState<ViewMode>('dashboard');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Theme state
  const [isDark, setIsDark] = useState(false);

  // App data loaded from database bootstrap
  const [notices, setNotices] = useState<any[]>([]);
  const [examCatalog, setExamCatalog] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Navigation states
  const [selectedSeries, setSelectedSeries] = useState<any>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [activeTestId, setActiveTestId] = useState<string>('');
  const [dashboardTab, setDashboardTab] = useState<'home' | 'tests' | 'notices' | 'profile'>('home');
  const [dashboardCategoryId, setDashboardCategoryId] = useState<string | null>(null);

  // 1. Initial mounting check for saved credentials & bootstrap catalogs
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load saved theme
        const savedTheme = await SecureStore.getItemAsync('app_theme');
        if (savedTheme === 'dark') {
          setIsDark(true);
        }

        // Bootstrap notices & exams catalog from database
        const bootRes = await ApiClient.bootstrap();
        if (bootRes.success) {
          setNotices(bootRes.noticesList || []);
          setExamCatalog(bootRes.examCatalog || []);
          setUsersList(bootRes.usersList || []);
        }

        // Check SecureStore for auto-login
        const savedEmail = await SecureStore.getItemAsync('tb_user_email');
        if (savedEmail) {
          const authRes = await ApiClient.login(savedEmail);
          if (authRes.success && authRes.user) {
            setCurrentUser(authRes.user);
            setViewMode('dashboard');
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // System physical BackButton navigation handler
  useEffect(() => {
    const onBackPress = () => {
      if (viewMode === 'auth') {
        return false;
      }

      if (viewMode === 'series_detail') {
        setViewMode('dashboard');
        return true;
      }

      if (viewMode === 'exam') {
        // Trigger same behavior as exam back arrow
        refreshUserData(currentUser?.id).then(() => {
          setViewMode(previousViewMode);
        });
        return true;
      }

      if (viewMode === 'analysis') {
        setViewMode(previousViewMode);
        return true;
      }

      if (viewMode === 'support_chat') {
        setViewMode('dashboard');
        return true;
      }

      if (viewMode === 'dashboard') {
        if (dashboardCategoryId !== null) {
          setDashboardCategoryId(null);
          return true;
        }
        if (dashboardTab !== 'home') {
          setDashboardTab('home');
          return true;
        }
        return false; // Exit/minimize app if at home
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => backHandler.remove();
  }, [viewMode, previousViewMode, dashboardCategoryId, dashboardTab, currentUser]);

  const handleToggleTheme = async (dark: boolean) => {
    setIsDark(dark);
    await SecureStore.setItemAsync('app_theme', dark ? 'dark' : 'light');
  };

  // Refresh user data (coins, sessions) to keep in sync with Web/Admin changes
  const refreshUserData = async (userId: string) => {
    if (!currentUser?.email) return;
    const res = await ApiClient.login(currentUser.email);
    if (res.success && res.user) {
      setCurrentUser(res.user);
    }
    
    // Refresh notices list and exam catalog to fetch newly uploaded notices
    const bootRes = await ApiClient.bootstrap();
    if (bootRes.success) {
      setNotices(bootRes.noticesList || []);
      setExamCatalog(bootRes.examCatalog || []);
      setUsersList(bootRes.usersList || []);
    }
  };

  // Toggle bookmark for a question
  const handleToggleBookmark = async (testId: string, questionId: string) => {
    if (!currentUser) return;
    const currentBookmarks = currentUser.bookmarkedQuestions || [];
    const exists = currentBookmarks.some((b: any) => b.testId === testId && b.questionId === questionId);

    let updatedBookmarks;
    if (exists) {
      updatedBookmarks = currentBookmarks.filter((b: any) => !(b.testId === testId && b.questionId === questionId));
    } else {
      updatedBookmarks = [...currentBookmarks, { testId, questionId }];
    }

    const updatedUser = { ...currentUser, bookmarkedQuestions: updatedBookmarks };
    setCurrentUser(updatedUser);

    try {
      await ApiClient.toggleBookmark(currentUser.id, updatedBookmarks);
    } catch (err) {
      console.error("Toggle bookmark error:", err);
    }
  };

  const handleLoginSuccess = async (user: any) => {
    setCurrentUser(user);
    await SecureStore.setItemAsync('tb_user_email', user.email);
    
    // Refresh catalog bootstrap data
    const bootRes = await ApiClient.bootstrap();
    if (bootRes.success) {
      setNotices(bootRes.noticesList || []);
      setExamCatalog(bootRes.examCatalog || []);
      setUsersList(bootRes.usersList || []);
    }
    setViewMode('dashboard');
  };

  const handleLogout = async () => {
    setLoading(true);
    await SecureStore.deleteItemAsync('tb_user_email');
    setCurrentUser(null);
    setViewMode('auth');
    setLoading(false);
  };

  // Navigations controllers
  const handleSelectSeries = (series: any) => {
    setSelectedSeries(series);
    setViewMode('series_detail');
  };

  const handleOpenExam = (testId: string) => {
    setPreviousViewMode(viewMode);
    setActiveTestId(testId);
    setViewMode('exam');
  };

  const handleOpenAttemptAnalysis = (attempt: any) => {
    setPreviousViewMode(viewMode);
    setSelectedAttempt(attempt);
    setViewMode('analysis');
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDark ? { backgroundColor: '#0B1329' } : { backgroundColor: '#F8FAFC' }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#0B1329" : "#F8FAFC"} />
        
        {/* Background Decorative Glow Orbs */}
        <View style={[styles.glowOrb, { top: -100, left: -100, backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(186, 230, 253, 0.4)' }]} />
        <View style={[styles.glowOrb, { bottom: -100, right: -100, backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(221, 214, 254, 0.4)' }]} />

        <View style={styles.loadingContent}>
          {/* Logo container */}
          <View style={[styles.logoIconContainer, isDark ? { backgroundColor: '#1E293B', borderColor: '#334155' } : { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
            <Trophy size={48} color={isDark ? '#38BDF8' : '#2563EB'} />
          </View>

          <Text style={[styles.appNameText, isDark ? { color: '#FFFFFF' } : { color: '#0F172A' }]}>
            MockTest <Text style={{ color: '#2563EB' }}>Hub</Text>
          </Text>
          <Text style={[styles.appSubText, isDark ? { color: '#94A3B8' } : { color: '#6B7280' }]}>
            Your Personal CBT Prep Engine
          </Text>

          {/* Premium custom loading animation indicator */}
          <View style={styles.spinnerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>

          <Text style={[styles.loadingStatusText, isDark ? { color: '#64748B' } : { color: '#9CA3AF' }]}>
            Connecting to secure server...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
        <StatusBar 
          barStyle={isDark ? 'light-content' : 'dark-content'} 
          backgroundColor={isDark ? ThemeColors.dark.headerBg : '#0F2942'} 
        />

        {viewMode === 'auth' && (
          <AuthScreen 
            onLoginSuccess={handleLoginSuccess} 
            isDark={isDark} 
            onToggleTheme={handleToggleTheme} 
          />
        )}

        {viewMode === 'dashboard' && currentUser && (
          <DashboardScreen
            currentUser={currentUser}
            notices={notices}
            examCatalog={examCatalog}
            usersList={usersList}
            onLogout={handleLogout}
            onSelectTestSeries={handleSelectSeries}
            onOpenAttemptAnalysis={handleOpenAttemptAnalysis}
            onOpenExam={handleOpenExam}
            onRefreshUser={refreshUserData}
            isDark={isDark}
            onToggleTheme={handleToggleTheme}
            onOpenSupportChat={() => setViewMode('support_chat')}
            activeTab={dashboardTab}
            setActiveTab={setDashboardTab}
            selectedCategoryId={dashboardCategoryId}
            setSelectedCategoryId={setDashboardCategoryId}
          />
        )}

        {viewMode === 'series_detail' && currentUser && selectedSeries && (
          <TestSeriesDetailScreen
            currentUser={currentUser}
            series={selectedSeries}
            onBack={() => setViewMode('dashboard')}
            onOpenExam={handleOpenExam}
            onRefreshUser={refreshUserData}
            onOpenAttemptAnalysis={handleOpenAttemptAnalysis}
            isDark={isDark}
          />
        )}

        {viewMode === 'exam' && currentUser && activeTestId && (
          <MobileTestScreen
            currentUser={currentUser}
            testId={activeTestId}
            examCatalog={examCatalog}
            onBack={async () => {
              await refreshUserData(currentUser.id);
              setViewMode(previousViewMode);
            }}
            onComplete={async (submittedTestId?: string) => {
              // Keep track of the current sessions before login refresh
              const existingSessionIds = new Set((currentUser?.testSessions || []).map((s: any) => s.id));
              
              // Login once to refresh all user data and get attempts
              const res = await ApiClient.login(currentUser.email);
              if (res.success && res.user) {
                setCurrentUser(res.user);
                
                // Find the new session (the one that is not in the set of pre-existing session IDs)
                const newSession = res.user.testSessions.find((s: any) => !existingSessionIds.has(s.id));
                
                if (newSession) {
                  setPreviousViewMode(selectedSeries ? 'series_detail' : 'dashboard');
                  setSelectedAttempt(newSession);
                  setViewMode('analysis');
                } else {
                  // Fallback: take the last session matching testId (insertion order puts newest last)
                  const targetTestId = submittedTestId || activeTestId;
                  const testSessions = res.user.testSessions.filter((s: any) => s.testId === targetTestId);
                  if (testSessions.length > 0) {
                    setPreviousViewMode(selectedSeries ? 'series_detail' : 'dashboard');
                    setSelectedAttempt(testSessions[testSessions.length - 1]);
                    setViewMode('analysis');
                  } else {
                    setViewMode('dashboard');
                  }
                }
              } else {
                setViewMode('dashboard');
              }
            }}
            isDark={isDark}
          />
        )}

        {viewMode === 'analysis' && currentUser && selectedAttempt && (
          <AnalysisScreen
            currentUser={currentUser}
            attempt={selectedAttempt}
            onBack={() => setViewMode(previousViewMode)}
            onToggleBookmark={handleToggleBookmark}
            isDark={isDark}
          />
        )}

        {viewMode === 'support_chat' && currentUser && (
          <SupportChatScreen
            currentUser={currentUser}
            onBack={() => setViewMode('dashboard')}
            isDark={isDark}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  appNameText: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  appSubText: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  spinnerContainer: {
    marginTop: 40,
    marginBottom: 20,
  },
  loadingStatusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
