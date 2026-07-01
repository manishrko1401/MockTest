import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  StatusBar,
  BackHandler,
  Alert
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { ApiClient } from './api';
import { getCachedCatalog, saveCatalogToCache, clearAllCache, getLastSyncTimestamp, setLastSyncTimestamp, mergeCatalogDelta, invalidateQuestionsCache, getCachedUser, saveUserToCache } from './cache';
import AuthScreen from './screens/AuthScreen';
import DashboardScreen from './screens/DashboardScreen';
import TestSeriesDetailScreen from './screens/TestSeriesDetailScreen';
import MobileTestScreen from './MobileTestScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import SupportChatScreen from './screens/SupportChatScreen';
import { Trophy } from 'lucide-react-native';
import { ThemeColors } from './theme';
import { requestNotificationPermissions, triggerLocalNotification } from './notifications';
import { registerBackgroundFetchAsync } from './backgroundTask';

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
        // Check for OTA Updates in production
        if (!__DEV__) {
          try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
              await Updates.fetchUpdateAsync();
              Alert.alert(
                "Update Available",
                "A new version of the app is available. Restart the app to apply the update?",
                [
                  { text: "Later" },
                  { text: "Restart Now", onPress: async () => await Updates.reloadAsync() }
                ]
              );
            }
          } catch (updateErr) {
            console.warn("OTA Update check failed:", updateErr);
          }
        }

        // Request notifications permissions
        await requestNotificationPermissions();

        // Register background fetch task
        await registerBackgroundFetchAsync();

        // Load saved theme
        const savedTheme = await SecureStore.getItemAsync('app_theme');
        if (savedTheme === 'dark') {
          setIsDark(true);
        }

        // ── Step 1: Serve cached catalog instantly (zero network wait) ──────
        const cachedCatalog = await getCachedCatalog();
        if (cachedCatalog) {
          setNotices(cachedCatalog.noticesList || []);
          setExamCatalog(cachedCatalog.examCatalog || []);
          setUsersList(cachedCatalog.usersList || []);
        }

        // ── Step 2: Smart delta sync — only download what's new ─────────────
        const lastSyncedAt = await getLastSyncTimestamp();
        const syncRes = await ApiClient.catalogSync(lastSyncedAt);

        if (syncRes.success) {
          let updatedCatalog: typeof cachedCatalog;

          if (syncRes.isFullSync || !cachedCatalog) {
            // First ever sync — server sent full catalog, save it as-is
            updatedCatalog = {
              examCatalog: syncRes.examCatalog || [],
              noticesList: syncRes.noticesList || [],
              usersList: [],
            };
          } else if (syncRes.hasNewData) {
            // Delta sync — merge new/updated items into existing local catalog
            updatedCatalog = mergeCatalogDelta(cachedCatalog, {
              newCategories: syncRes.newCategories || [],
              newExams: syncRes.newExams || [],
              newSeries: syncRes.newSeries || [],
              newTests: syncRes.newTests || [],
              newNotices: syncRes.newNotices || [],
              updatedTestIds: syncRes.updatedTestIds || [],
            });

            // Invalidate question cache for any tests whose content was updated
            if (syncRes.updatedTestIds?.length > 0) {
              for (const testId of syncRes.updatedTestIds) {
                await invalidateQuestionsCache(testId);
              }
              console.log(`[Sync] Invalidated question cache for ${syncRes.updatedTestIds.length} updated test(s)`);
            }
          } else {
            // No new data — nothing to update
            updatedCatalog = cachedCatalog;
          }

          if (updatedCatalog) {
            setNotices(updatedCatalog.noticesList || []);
            setExamCatalog(updatedCatalog.examCatalog || []);
            await saveCatalogToCache(updatedCatalog);
          }

          // Save sync timestamp so next launch only fetches new delta
          await setLastSyncTimestamp(syncRes.syncedAt);

          // Seed seen notices if they don't exist yet
          const storedNotices = await AsyncStorage.getItem('seen_notices');
          if (!storedNotices) {
            const allNotices = updatedCatalog?.noticesList || [];
            const initialIds = allNotices.map((n: any) => n.id);
            await AsyncStorage.setItem('seen_notices', JSON.stringify(initialIds));
          }
        }

        // Check SecureStore for auto-login and cached profile
        const savedEmail = await SecureStore.getItemAsync('tb_user_email');
        const savedPassword = await SecureStore.getItemAsync('tb_user_password');
        
        if (savedEmail && savedPassword) {
          // Serve cached user profile instantly if available (zero delay)
          const cachedUser = await getCachedUser();
          if (cachedUser) {
            setCurrentUser(cachedUser);
            setViewMode('dashboard');
            // Don't stop loading here — background sync below will call setLoading(false) via finally()
          }

          // Fetch fresh user profile in background (always runs, finally() stops the spinner)
          ApiClient.login(savedEmail, savedPassword).then(async (authRes) => {
            if (authRes.success && authRes.user) {
              setCurrentUser(authRes.user);
              await saveUserToCache(authRes.user);
            }
          }).catch(err => {
            console.warn('[Sync] Background user sync failed:', err);
          }).finally(() => {
            setLoading(false); // ← single authoritative place to stop the spinner
          });
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Initialization error:", err);
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

  // 1b. Listen to notification taps/clicks to route the user
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'notice') {
        setDashboardTab('notices');
        setViewMode('dashboard');
      } else if (data?.type === 'support') {
        setViewMode('support_chat');
      }
    });

    return () => subscription.remove();
  }, []);

  // 1c. Background Polling for Notices & Support Messages
  useEffect(() => {
    if (!currentUser?.id) return;

    let isMounted = true;

    // Check for new notices and notify
    const checkNewNotices = async (newNoticesList: any[]) => {
      try {
        const stored = await AsyncStorage.getItem('seen_notices');
        let seenIds: string[] = stored ? JSON.parse(stored) : [];

        // If no seen notices yet, seed it with the currently loaded notices to avoid spamming
        if (seenIds.length === 0) {
          seenIds = newNoticesList.map((n: any) => n.id);
          await AsyncStorage.setItem('seen_notices', JSON.stringify(seenIds));
          return;
        }

        const newAlerts: any[] = [];
        const updatedSeenIds = [...seenIds];

        for (const notice of newNoticesList) {
          if (!seenIds.includes(notice.id)) {
            newAlerts.push(notice);
            updatedSeenIds.push(notice.id);
          }
        }

        if (newAlerts.length > 0) {
          await AsyncStorage.setItem('seen_notices', JSON.stringify(updatedSeenIds));
          for (const notice of newAlerts) {
            let notificationTitle = 'New Announcement';
            if (notice.category === 'admit_card') {
              notificationTitle = 'New Admit Card Notice!';
            } else if (notice.category === 'result') {
              notificationTitle = 'New Exam Result Notice!';
            } else if (notice.category === 'notice') {
              notificationTitle = 'New Notice & Alert!';
            } else if (notice.category === 'answer_key') {
              notificationTitle = 'New Answer Key Notice!';
            }

            await triggerLocalNotification(
              notificationTitle,
              notice.title,
              { type: 'notice', id: notice.id }
            );
          }
        }
      } catch (err) {
        console.error("Error checking new notices:", err);
      }
    };

    // Check for new support messages from admin
    const checkNewSupportMessages = async () => {
      // Don't show notifications if user is already chatting
      if (viewMode === 'support_chat') return;

      try {
        // Fetch support messages but don't mark them as read yet (markAsRead = false)
        const res = await ApiClient.getSupportMessages(currentUser.id, false);
        if (!isMounted) return;

        if (res.success && res.messages) {
          const messagesList = res.messages;
          const storageKey = `seen_messages_${currentUser.id}`;
          const stored = await AsyncStorage.getItem(storageKey);
          let seenIds: string[] = stored ? JSON.parse(stored) : [];

          // If no messages stored yet, seed them
          if (seenIds.length === 0) {
            seenIds = messagesList.map((m: any) => m.id);
            await AsyncStorage.setItem(storageKey, JSON.stringify(seenIds));
            return;
          }

          const newAlerts: any[] = [];
          const updatedSeenIds = [...seenIds];

          for (const msg of messagesList) {
            if (msg.sender === 'ADMIN' && !seenIds.includes(msg.id)) {
              newAlerts.push(msg);
              updatedSeenIds.push(msg.id);
            }
          }

          if (newAlerts.length > 0) {
            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedSeenIds));
            for (const msg of newAlerts) {
              await triggerLocalNotification(
                'Support Team Response',
                msg.message,
                { type: 'support', id: msg.id }
              );
            }
          }
        }
      } catch (err) {
        console.error("Error checking support messages:", err);
      }
    };

    // Execute first checks immediately
    checkNewSupportMessages();

    // Poll for catalog updates every 90 seconds using lightweight delta sync
    const noticesInterval = setInterval(async () => {
      try {
        const lastSyncedAt = await getLastSyncTimestamp();
        const syncRes = await ApiClient.catalogSync(lastSyncedAt);
        if (syncRes.success && isMounted && syncRes.hasNewData) {
          const existing = await getCachedCatalog();
          if (existing) {
            let updated;
            if (syncRes.isFullSync) {
              updated = { examCatalog: syncRes.examCatalog || [], noticesList: syncRes.noticesList || [], usersList: existing.usersList };
            } else {
              updated = mergeCatalogDelta(existing, {
                newCategories: syncRes.newCategories || [],
                newExams: syncRes.newExams || [],
                newSeries: syncRes.newSeries || [],
                newTests: syncRes.newTests || [],
                newNotices: syncRes.newNotices || [],
                updatedTestIds: syncRes.updatedTestIds || [],
              });
              // Invalidate question cache for updated tests
              for (const testId of (syncRes.updatedTestIds || [])) {
                await invalidateQuestionsCache(testId);
              }
            }
            setNotices(updated.noticesList);
            setExamCatalog(updated.examCatalog);
            await saveCatalogToCache(updated);
            await setLastSyncTimestamp(syncRes.syncedAt);
            checkNewNotices(updated.noticesList);
          }
        }
      } catch (err) {
        console.error('Catalog sync polling error:', err);
      }
    }, 90000);

    // Poll support messages every 60 seconds (down from 8s)
    const supportInterval = setInterval(() => {
      checkNewSupportMessages();
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(noticesInterval);
      clearInterval(supportInterval);
    };
  }, [currentUser, viewMode]);

  const handleToggleTheme = async (dark: boolean) => {
    setIsDark(dark);
    await SecureStore.setItemAsync('app_theme', dark ? 'dark' : 'light');
  };

  // Refresh user data (coins, sessions) to keep in sync with Web/Admin changes
  const refreshUserData = async (userId: string) => {
    if (!currentUser?.email) return;
    // ✅ Use SecureStore password — NOT the stale currentUser.password from DB response
    const savedPassword = await SecureStore.getItemAsync('tb_user_password');
    if (!savedPassword) return;
    const res = await ApiClient.login(currentUser.email, savedPassword);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      await saveUserToCache(res.user);
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
    await saveUserToCache(updatedUser);

    try {
      await ApiClient.toggleBookmark(currentUser.id, updatedBookmarks);
    } catch (err) {
      console.error("Toggle bookmark error:", err);
    }
  };

  const handleLoginSuccess = async (user: any) => {
    setCurrentUser(user);
    await saveUserToCache(user);
    await SecureStore.setItemAsync('tb_user_email', user.email);
    await SecureStore.setItemAsync('tb_user_password', user.password);
    
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
    await SecureStore.deleteItemAsync('tb_user_password');
    // Clear device cache so a different login doesn't see stale data
    await clearAllCache();
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
              const res = await ApiClient.login(currentUser.email, currentUser.password);
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
