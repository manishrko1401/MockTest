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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { ShieldAlert } from 'lucide-react-native';
import { ApiClient } from './api';
import { ThemeColors } from './theme';
import { getCachedUser, saveUserToCache, clearAllCache } from './cache';

import AuthScreen from './screens/AuthScreen';
import AdminPanelScreen from './screens/AdminPanelScreen';
import AdminAnalyticsScreen from './screens/AdminAnalyticsScreen';
import SupportChatScreen from './screens/SupportChatScreen';

type ViewMode = 'auth' | 'admin_panel' | 'analytics' | 'support_chat';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('auth');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedSupportUser, setSelectedSupportUser] = useState<any>(null);

  // Dark theme default for Admin App
  const isDark = true;
  const theme = ThemeColors.dark;

  // Initialize and check auto-login
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const savedEmail = await SecureStore.getItemAsync('tb_user_email');
        const savedPassword = await SecureStore.getItemAsync('tb_user_password');

        if (savedEmail && savedPassword) {
          // Attempt instant load from cache
          const cachedUser = await getCachedUser();
          if (cachedUser && cachedUser.role !== 'STUDENT') {
            setCurrentUser(cachedUser);
            ApiClient.setApiSession(cachedUser.id, cachedUser.currentSessionId);
            setViewMode('admin_panel');
          }

          // Fetch fresh session in background
          const res = await ApiClient.login(savedEmail, savedPassword);
          if (res.success && res.user && res.user.role !== 'STUDENT') {
            setCurrentUser(res.user);
            ApiClient.setApiSession(res.user.id, res.user.currentSessionId);
            await saveUserToCache(res.user);
            setViewMode('admin_panel');
          } else {
            // Role changed or credentials invalid - force logout
            await handleLogout();
          }
        } else {
          setViewMode('auth');
        }
      } catch (err) {
        console.warn("App initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Back handler behavior
  useEffect(() => {
    const onBackPress = () => {
      if (viewMode === 'auth') {
        return false;
      }
      if (viewMode === 'analytics' || viewMode === 'support_chat') {
        setViewMode('admin_panel');
        setSelectedSupportUser(null);
        return true;
      }
      if (viewMode === 'admin_panel') {
        Alert.alert('Exit App', 'Are you sure you want to close the administrator console?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', onPress: () => BackHandler.exitApp() }
        ]);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => backHandler.remove();
  }, [viewMode]);

  const handleLoginSuccess = async (user: any) => {
    setCurrentUser(user);
    ApiClient.setApiSession(user.id, user.currentSessionId);
    await saveUserToCache(user);
    await SecureStore.setItemAsync('tb_user_email', user.email);
    await SecureStore.setItemAsync('tb_user_password', user.passwordHash || user.password || '');
    setViewMode('admin_panel');
  };

  const handleLogout = async () => {
    setLoading(true);
    await SecureStore.deleteItemAsync('tb_user_email');
    await SecureStore.deleteItemAsync('tb_user_password');
    await clearAllCache();
    ApiClient.setApiSession(null, null);
    setCurrentUser(null);
    setViewMode('auth');
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.headerBg} />
        <View style={styles.loadingContent}>
          <View style={[styles.logoIconContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ShieldAlert size={48} color={theme.primary} />
          </View>
          <Text style={[styles.appNameText, { color: theme.text }]}>
            MockTest <Text style={{ color: theme.primary }}>Admin</Text>
          </Text>
          <ActivityIndicator size="large" color={theme.primary} style={styles.spinner} />
          <Text style={[styles.loadingStatusText, { color: theme.textMuted }]}>
            Authenticating administrator session...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.headerBg} />

        {viewMode === 'auth' && (
          <AuthScreen 
            onLoginSuccess={handleLoginSuccess} 
            isDark={isDark} 
          />
        )}

        {viewMode === 'admin_panel' && currentUser && (
          <AdminPanelScreen
            currentUser={currentUser}
            onBack={handleLogout}
            isDark={isDark}
            onOpenSupportChat={(studentUser) => {
              setSelectedSupportUser(studentUser);
              setViewMode('support_chat');
            }}
            onOpenAnalytics={() => setViewMode('analytics')}
          />
        )}

        {viewMode === 'analytics' && (
          <AdminAnalyticsScreen
            onBack={() => setViewMode('admin_panel')}
            isDark={isDark}
          />
        )}

        {viewMode === 'support_chat' && currentUser && selectedSupportUser && (
          <SupportChatScreen
            currentUser={currentUser}
            studentUser={selectedSupportUser}
            onBack={() => {
              setViewMode('admin_panel');
              setSelectedSupportUser(null);
            }}
            isDark={isDark}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  logoIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  spinner: {
    marginVertical: 32,
  },
  loadingStatusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
