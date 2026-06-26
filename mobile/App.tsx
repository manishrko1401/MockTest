import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  SafeAreaView,
  StatusBar
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiClient } from './api';
import AuthScreen from './screens/AuthScreen';
import DashboardScreen from './screens/DashboardScreen';
import TestSeriesDetailScreen from './screens/TestSeriesDetailScreen';
import MobileTestScreen from './MobileTestScreen';
import AnalysisScreen from './screens/AnalysisScreen';

type ViewMode = 'auth' | 'dashboard' | 'series_detail' | 'exam' | 'analysis';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('auth');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // App data loaded from database bootstrap
  const [notices, setNotices] = useState<any[]>([]);
  const [examCatalog, setExamCatalog] = useState<any[]>([]);

  // Navigation states
  const [selectedSeries, setSelectedSeries] = useState<any>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [activeTestId, setActiveTestId] = useState<string>('');

  // 1. Initial mounting check for saved credentials & bootstrap catalogs
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Bootstrap notices & exams catalog from database
        const bootRes = await ApiClient.bootstrap();
        if (bootRes.success) {
          setNotices(bootRes.noticesList || []);
          setExamCatalog(bootRes.examCatalog || []);
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

  // Refresh user data (coins, sessions) to keep in sync with Web/Admin changes
  const refreshUserData = async (userId: string) => {
    if (!currentUser?.email) return;
    const res = await ApiClient.login(currentUser.email);
    if (res.success && res.user) {
      setCurrentUser(res.user);
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
    setActiveTestId(testId);
    setViewMode('exam');
  };

  const handleOpenAttemptAnalysis = (attempt: any) => {
    setSelectedAttempt(attempt);
    setViewMode('analysis');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Connecting to Testbook Server...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F2942" />

      {viewMode === 'auth' && (
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      )}

      {viewMode === 'dashboard' && currentUser && (
        <DashboardScreen
          currentUser={currentUser}
          notices={notices}
          examCatalog={examCatalog}
          onLogout={handleLogout}
          onSelectTestSeries={handleSelectSeries}
          onOpenAttemptAnalysis={handleOpenAttemptAnalysis}
          onOpenExam={handleOpenExam}
          onRefreshUser={refreshUserData}
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
        />
      )}

      {viewMode === 'exam' && currentUser && activeTestId && (
        <MobileTestScreen
          currentUser={currentUser}
          testId={activeTestId}
          onBack={async () => {
            await refreshUserData(currentUser.id);
            setViewMode('dashboard');
          }}
          onComplete={async () => {
            await refreshUserData(currentUser.id);
            // Grab the last attempt to redirect to analysis screen
            const res = await ApiClient.login(currentUser.email);
            if (res.success && res.user) {
              setCurrentUser(res.user);
              const sortedAttempts = [...res.user.testSessions].sort((a: any, b: any) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              );
              if (sortedAttempts.length > 0) {
                setSelectedAttempt(sortedAttempts[0]);
                setViewMode('analysis');
              } else {
                setViewMode('dashboard');
              }
            } else {
              setViewMode('dashboard');
            }
          }}
        />
      )}

      {viewMode === 'analysis' && currentUser && selectedAttempt && (
        <AnalysisScreen
          currentUser={currentUser}
          attempt={selectedAttempt}
          onBack={() => setViewMode('dashboard')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
});
