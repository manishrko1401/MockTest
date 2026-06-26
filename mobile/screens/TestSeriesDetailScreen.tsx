import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import {
  ArrowLeft,
  Play,
  Lock,
  Coins,
  CheckCircle,
  HelpCircle,
  Clock,
  Eye
} from 'lucide-react-native';
import { ApiClient } from '../api';

interface TestSeriesDetailScreenProps {
  currentUser: any;
  series: any;
  onBack: () => void;
  onOpenExam: (testId: string) => void;
  onRefreshUser: (userId: string) => Promise<void>;
  onOpenAttemptAnalysis: (attempt: any) => void;
}

export default function TestSeriesDetailScreen({
  currentUser,
  series,
  onBack,
  onOpenExam,
  onRefreshUser,
  onOpenAttemptAnalysis
}: TestSeriesDetailScreenProps) {

  // Helper to check if a user has access to a mock test based on their subscription tier
  const hasAccess = (requiredTier: string) => {
    if (requiredTier === 'None') return true;
    
    const userTier = currentUser.subscriptionTier;
    if (userTier === 'Testbook Pass Pro') {
      return true; // Pro unlocks everything
    }
    if (userTier === 'Testbook Pass') {
      return requiredTier === 'Testbook Pass'; // Standard can only unlock standard
    }
    return false;
  };

  const handleUnlockWithCoins = async (testTitle: string, requiredTierName: string) => {
    const userCoins = currentUser.coins || 0;
    const unlockCost = 20;

    if (userCoins < unlockCost) {
      Alert.alert(
        'Insufficient Coins',
        `You need ${unlockCost} coins to unlock this package, but you only have ${userCoins} coins. Invite friends to earn more coins!`
      );
      return;
    }

    Alert.alert(
      'Unlock Premium Package',
      `Unlock all "${requiredTierName}" tests for ${unlockCost} coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock Now',
          onPress: async () => {
            // Deduct coins and update subscription on server
            const nextTier = requiredTierName;
            const updatedCoins = userCoins - unlockCost;

            const res = await ApiClient.saveProfileAdmin({
              userId: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              mobile: currentUser.mobile,
              referralCode: currentUser.referralCode,
              referredBy: currentUser.referredBy,
              referralsCount: currentUser.referralsCount,
              role: currentUser.role,
              tier: nextTier,
              purchasedAt: new Date().toISOString().split('T')[0],
              expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days validity
              password: currentUser.password,
              isBlocked: currentUser.isBlocked,
              coins: updatedCoins
            });

            if (res.success) {
              Alert.alert('Unlocked!', `You have successfully unlocked "${requiredTierName}"!`);
              await onRefreshUser(currentUser.id);
            } else {
              Alert.alert('Error', res.error || 'Failed to unlock package.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft color="#FFF" size={20} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerCategory}>{series.categoryName}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{series.name} Series</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Available Practice Papers</Text>

        {series.tests && series.tests.length > 0 ? (
          series.tests.map((test: any) => {
            const allowed = hasAccess(test.requiredTier);
            const attempt = currentUser.testSessions?.find(
              (s: any) => s.testId === test.id && (s.status === 'COMPLETED' || s.status === 'AUTO_SUBMITTED')
            );
            const isCompleted = !!attempt;
            const isPaused = currentUser.testSessions?.some(
              (s: any) => s.testId === test.id && s.status === 'ONGOING'
            );

            return (
              <View key={test.id} style={styles.testCard}>
                <View style={styles.testCardHeader}>
                  <Text style={styles.testTitle}>{test.title}</Text>
                  {test.requiredTier !== 'None' ? (
                    <Text style={[styles.badge, styles.proBadge]}>PRO</Text>
                  ) : (
                    <Text style={[styles.badge, styles.freeBadge]}>FREE</Text>
                  )}
                </View>

                {/* Test Parameters */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <HelpCircle size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{test.questionsCount} Questions</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{test.durationMinutes} Mins</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Coins size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{test.maxMarks} Marks</Text>
                  </View>
                </View>

                {/* Subtitle / Status */}
                {isCompleted && (
                  <View style={styles.statusCompletedRow}>
                    <CheckCircle size={14} color="#10B981" />
                    <Text style={styles.statusCompletedText}>Attempted & Completed</Text>
                  </View>
                )}
                {isPaused && (
                  <Text style={styles.statusPausedText}>⏸ Test attempt in-progress (paused)</Text>
                )}

                {/* Actions */}
                {allowed ? (
                  <View style={{ gap: 8 }}>
                    {isCompleted && attempt && (
                      <TouchableOpacity
                        style={styles.analysisBtn}
                        onPress={() => onOpenAttemptAnalysis(attempt)}
                      >
                        <Eye size={14} color="#475569" />
                        <Text style={styles.analysisBtnText}>Solution & Analysis</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionBtn, isPaused && { backgroundColor: '#3B82F6' }]}
                      onPress={() => onOpenExam(test.id)}
                    >
                      <Play size={14} color="#FFF" />
                      <Text style={styles.actionBtnText}>
                        {isPaused ? 'Resume Test sitting' : isCompleted ? 'Re-attempt Test' : 'Start Test Now'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.lockBlock}>
                    <View style={styles.lockMsg}>
                      <Lock size={14} color="#DC2626" />
                      <Text style={styles.lockMsgText}>Requires {test.requiredTier}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.unlockBtn}
                      onPress={() => handleUnlockWithCoins(test.title, test.requiredTier)}
                    >
                      <Coins size={14} color="#D97706" />
                      <Text style={styles.unlockBtnText}>Unlock (20 Coins)</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <Text style={styles.noTestsText}>No tests available in this series yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#0F2942',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerCategory: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  testCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  testTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    lineHeight: 18,
  },
  badge: {
    fontSize: 8,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadge: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  freeBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  statusCompletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  statusCompletedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  statusPausedText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '700',
    marginBottom: 12,
  },
  analysisBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  analysisBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lockBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginTop: 4,
  },
  lockMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockMsgText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
  },
  unlockBtn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unlockBtnText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: 'bold',
  },
  noTestsText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});
