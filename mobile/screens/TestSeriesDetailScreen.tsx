import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Play,
  Lock,
  Coins,
  CheckCircle,
  HelpCircle,
  Clock,
  Eye,
  PlusCircle,
  MinusCircle
} from 'lucide-react-native';
import { ApiClient } from '../api';
import { ThemeColors } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TestSeriesDetailScreenProps {
  currentUser: any;
  series: any;
  onBack: () => void;
  onOpenExam: (testId: string) => void;
  onRefreshUser: (userId: string) => Promise<void>;
  onOpenAttemptAnalysis: (attempt: any) => void;
  isDark?: boolean;
  language?: 'en' | 'hi';
}

const LOCALIZATION = {
  en: {
    backToCat: 'Back to Exam Categories',
    papers: 'Papers',
    resume: 'Resume Test',
    start: 'Start Mock Test',
    locked: 'Locked (Requires Pass)',
    reAttempt: 'Re-attempt Test',
    viewAnalysis: 'View Attempt Analysis',
    series: 'Series',
  },
  hi: {
    backToCat: 'परीक्षा श्रेणियों पर वापस जाएं',
    papers: 'पेपर',
    resume: 'टेस्ट जारी रखें',
    start: 'मॉक टेस्ट शुरू करें',
    locked: 'लॉक्ड (पास आवश्यक है)',
    reAttempt: 'पुनः टेस्ट दें',
    viewAnalysis: 'प्रयास विश्लेषण देखें',
    series: 'सीरीज',
  }
};

export default function TestSeriesDetailScreen({
  currentUser,
  series,
  onBack,
  onOpenExam,
  onRefreshUser,
  onOpenAttemptAnalysis,
  isDark = false,
  language = 'en'
}: TestSeriesDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const horizontalScrollRef = useRef<ScrollView>(null);
  const [activeSubSubId, setActiveSubSubId] = useState<string | null>(null);

  const sortedSubSubCategories = React.useMemo(() => {
    if (!series.subSubCategories) return [];
    return [...series.subSubCategories].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [series.subSubCategories]);

  // Load locally-cached ongoing sessions so Resume button shows correctly even when offline
  const [localOngoingIds, setLocalOngoingIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const loadLocalOngoing = async () => {
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const ongoingKeys = allKeys.filter(k => k.startsWith('ongoing_test_'));
        const ids = new Set<string>();
        for (const key of ongoingKeys) {
          const raw = await AsyncStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed?.testId && parsed?.status === 'ONGOING') {
                ids.add(parsed.testId);
              }
            } catch {}
          }
        }
        setLocalOngoingIds(ids);
      } catch (err) {
        console.warn('[Resume] Failed to load local ongoing sessions:', err);
      }
    };
    loadLocalOngoing();
  }, []);

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
    <View style={[styles.container, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
      {/* Decorative Blur Orbs */}
      <View style={[styles.blurOrbLeft, isDark && { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]} />
      <View style={[styles.blurOrbRight, isDark && { backgroundColor: 'rgba(99, 102, 241, 0.08)' }]} />

      {/* Header */}
      <View style={[
        styles.header, 
        isDark && { backgroundColor: ThemeColors.dark.headerBg },
        { paddingTop: insets.top + 10, paddingBottom: 12 }
      ]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft color="#FFF" size={20} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerCategory}>{series.categoryName}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{series.name} {language === 'en' ? 'Series' : 'सीरीज'}</Text>
        </View>
      </View>

      {/* Horizontal Tab Navigator for Sub-subcategories (Sticky at the top) */}
      {sortedSubSubCategories && sortedSubSubCategories.length > 0 && (
        <View style={[styles.tabsWrapper, isDark && { backgroundColor: ThemeColors.dark.bg, borderBottomColor: ThemeColors.dark.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {sortedSubSubCategories.map((subSub: any, index: number) => {
              const isSelected = (activeSubSubId || sortedSubSubCategories[0]?.id) === subSub.id;
              return (
                <TouchableOpacity
                  key={subSub.id}
                  activeOpacity={0.8}
                  style={[
                    styles.tabItem,
                    isSelected && styles.tabItemActive,
                    isDark && isSelected && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
                    isDark && !isSelected && { backgroundColor: '#0B1329', borderColor: '#1F2E54' }
                  ]}
                  onPress={() => {
                    setActiveSubSubId(subSub.id);
                    horizontalScrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
                  }}
                >
                  <Text
                    style={[
                      styles.tabItemText,
                      isSelected && styles.tabItemTextActive,
                      isDark && !isSelected && { color: '#94A3B8' }
                    ]}
                  >
                    {subSub.name} ({subSub.tests?.length || 0})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {sortedSubSubCategories && sortedSubSubCategories.length > 0 ? (
        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const offsetX = e.nativeEvent.contentOffset.x;
            const index = Math.round(offsetX / SCREEN_WIDTH);
            if (sortedSubSubCategories && sortedSubSubCategories[index]) {
              setActiveSubSubId(sortedSubSubCategories[index].id);
            }
          }}
          style={{ flex: 1 }}
        >
          {sortedSubSubCategories.map((subSub: any) => {
            return (
              <View key={subSub.id} style={{ width: SCREEN_WIDTH }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                  <View style={styles.subSubBlock}>
                    <View style={styles.subSubHeaderRow}>
                      <Text style={[styles.subSubTitle, isDark && { color: ThemeColors.dark.text }]}>
                        {subSub.name}
                      </Text>
                      <View style={styles.subSubBadge}>
                        <Text style={styles.subSubBadgeText}>{subSub.tests?.length || 0} Papers</Text>
                      </View>
                    </View>

                    {subSub.tests && subSub.tests.length > 0 ? (
                      [...subSub.tests]
                        .sort((a: any, b: any) => {
                          const ordA = a.orderIndex ?? 0;
                          const ordB = b.orderIndex ?? 0;
                          if (ordA !== ordB) return ordA - ordB;
                          return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
                        })
                        .map((test: any) => {
                        const allowed = hasAccess(test.requiredTier);
                        const completedAttempts = (currentUser.testSessions || [])
                          .filter((s: any) => s.testId === test.id && (s.status === 'COMPLETED' || s.status === 'AUTO_SUBMITTED'))
                          .sort((a: any, b: any) => {
                            const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
                            const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
                            return timeB - timeA;
                          });
                        const attempt = completedAttempts[0];
                        const isCompleted = completedAttempts.length > 0;
                        const isPaused = localOngoingIds.has(test.id) || (currentUser.testSessions || []).some(
                          (s: any) => s.testId === test.id && s.status === 'ONGOING'
                        );

                        let cardBg = isDark ? ThemeColors.dark.card : '#FFFFFF';
                        let cardBorderColor = isDark ? ThemeColors.dark.border : '#E2E8F0';
                        let cardBorderLeftColor = '#2563EB'; // default primary blue
                        let cardBorderLeftWidth = 4;

                        if (isCompleted && attempt) {
                          const isCleared = attempt.score >= (test.testbookCutoffScore || 0);
                          if (isCleared) {
                            cardBg = isDark ? '#062C1E' : '#E8F8F0';
                            cardBorderColor = isDark ? '#065F46' : '#D0F2E0';
                            cardBorderLeftColor = '#10B981';
                          } else {
                            cardBg = isDark ? '#3A1212' : '#FDE8E8';
                            cardBorderColor = isDark ? '#7F1D1D' : '#FCD5D5';
                            cardBorderLeftColor = '#EF4444';
                          }
                        } else if (isPaused) {
                          cardBg = isDark ? '#0C1E36' : '#F0F9FF';
                          cardBorderColor = isDark ? '#1E3A8A' : '#E0F2FE';
                          cardBorderLeftColor = '#3B82F6';
                        } else if (!allowed) {
                          cardBg = isDark ? '#2E1B0E' : '#FEFBF0';
                          cardBorderColor = isDark ? '#78350F' : '#FDE68A';
                          cardBorderLeftColor = '#F59E0B';
                        }

                        return (
                          <View
                            key={test.id}
                            style={[
                              styles.testCard,
                              {
                                backgroundColor: cardBg,
                                borderColor: cardBorderColor,
                                borderLeftColor: cardBorderLeftColor,
                                borderLeftWidth: cardBorderLeftWidth,
                              },
                            ]}
                          >
                            <View style={styles.testCardHeader}>
                              <Text style={[styles.testTitle, isDark && { color: ThemeColors.dark.text }]}>{test.title}</Text>
                              {test.requiredTier !== 'None' ? (
                                <Text style={[styles.badge, styles.proBadge]}>PRO</Text>
                              ) : (
                                <Text style={[styles.badge, styles.freeBadge]}>FREE</Text>
                              )}
                            </View>

                            {/* Test Parameters */}
                            <View style={styles.metaRow}>
                              <View style={styles.metaItem}>
                                <HelpCircle size={14} color={isDark ? ThemeColors.dark.textMuted : '#6B7280'} />
                                <Text style={[styles.metaText, isDark && { color: ThemeColors.dark.textMuted }]}>{test.questionsCount} Qs</Text>
                              </View>
                              <View style={styles.metaItem}>
                                <Clock size={14} color={isDark ? ThemeColors.dark.textMuted : '#6B7280'} />
                                <Text style={[styles.metaText, isDark && { color: ThemeColors.dark.textMuted }]}>{test.durationMinutes} Mins</Text>
                              </View>
                              <View style={styles.metaItem}>
                                <Coins size={14} color={isDark ? ThemeColors.dark.textMuted : '#6B7280'} />
                                <Text style={[styles.metaText, isDark && { color: ThemeColors.dark.textMuted }]}>{test.maxMarks} Marks</Text>
                              </View>
                              <View style={styles.metaItem}>
                                <PlusCircle size={12} color={isDark ? '#34D399' : '#059669'} />
                                <Text style={[styles.metaText, { color: isDark ? '#34D399' : '#059669', fontWeight: 'bold' }]}>+{test.positiveMarks ?? 2}</Text>
                              </View>
                              <View style={styles.metaItem}>
                                <MinusCircle size={12} color={isDark ? '#F87171' : '#DC2626'} />
                                <Text style={[styles.metaText, { color: isDark ? '#F87171' : '#DC2626', fontWeight: 'bold' }]}>-{test.negativeMarks ?? 0.5}</Text>
                              </View>
                            </View>

                            {/* Subtitle / Status */}
                            {isCompleted && attempt && (
                              <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
                                borderColor: isDark ? '#059669' : '#10B981',
                                borderWidth: 1,
                                borderRadius: 8,
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                                gap: 6,
                                marginTop: 4,
                                marginBottom: 12,
                                alignSelf: 'flex-start',
                              }}>
                                <CheckCircle size={13} color="#10B981" />
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#10B981' }}>
                                  {language === 'en' ? 'Attempted' : 'प्रयास पूरा किया'}
                                </Text>
                                <View style={{ width: 1, height: 12, backgroundColor: isDark ? '#334155' : '#D1D5DB' }} />
                                <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#34D399' : '#047857' }}>
                                  {language === 'en' ? 'Last Score:' : 'पिछला स्कोर:'} {attempt.score.toFixed(1)}/{attempt.maxScore.toFixed(0)}
                                </Text>
                              </View>
                            )}
                            {isPaused && (
                              <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                                borderColor: isDark ? '#2563EB' : '#3B82F6',
                                borderWidth: 1,
                                borderRadius: 8,
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                                gap: 6,
                                marginTop: 4,
                                marginBottom: 12,
                                alignSelf: 'flex-start',
                              }}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#3B82F6' }}>
                                  {language === 'en' ? '⏸ In-Progress (Paused)' : '⏸ प्रगति पर है (रुका हुआ)'}
                                </Text>
                              </View>
                            )}

                            {/* Actions */}
                            {allowed ? (
                              <View style={{ gap: 8 }}>
                                {isCompleted && attempt && (
                                  <TouchableOpacity
                                    style={[styles.analysisBtn, isDark && { backgroundColor: '#0B1329', borderColor: '#1F2E54' }]}
                                    onPress={() => onOpenAttemptAnalysis(attempt)}
                                  >
                                    <Eye size={14} color={isDark ? ThemeColors.dark.text : '#475569'} />
                                    <Text style={[styles.analysisBtnText, isDark && { color: ThemeColors.dark.text }]}>
                                      {language === 'en' ? 'Solution & Analysis' : 'समाधान और विश्लेषण'}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                  style={[styles.actionBtn, isPaused && { backgroundColor: '#3B82F6' }]}
                                  onPress={() => onOpenExam(test.id)}
                                >
                                  <Play size={14} color="#FFF" />
                                  <Text style={styles.actionBtnText}>
                                    {isPaused 
                                      ? (language === 'en' ? 'Resume Test sitting' : 'टेस्ट जारी रखें') 
                                      : isCompleted 
                                      ? (language === 'en' ? 'Re-attempt Test' : 'पुनः टेस्ट दें') 
                                      : (language === 'en' ? 'Start Test Now' : 'मॉक टेस्ट शुरू करें')}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <View style={[styles.lockBlock, isDark && { borderTopColor: ThemeColors.dark.border }]}>
                                <View style={styles.lockMsg}>
                                  <Lock size={14} color="#DC2626" />
                                  <Text style={styles.lockMsgText}>
                                    {language === 'en' ? 'Requires' : 'आवश्यकता:'} {test.requiredTier.replace('Testbook', 'Mock Test')}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  style={[styles.unlockBtn, isDark && { backgroundColor: '#0B1329', borderColor: '#1F2E54' }]}
                                  onPress={() => handleUnlockWithCoins(test.title, test.requiredTier)}
                                >
                                  <Coins size={14} color="#D97706" />
                                  <Text style={[styles.unlockBtnText, isDark && { color: '#FBBF24' }]}>
                                    {language === 'en' ? 'Unlock (20 Coins)' : 'अनलॉक करें (20 सिक्के)'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.noTestsText}>No tests available in this series yet.</Text>
                    )}
                  </View>
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, isDark && { color: ThemeColors.dark.text }]}>Available Practice Papers</Text>

          {series.tests && series.tests.length > 0 ? (
            series.tests.map((test: any) => {
              const allowed = hasAccess(test.requiredTier);
              const completedAttempts = (currentUser.testSessions || [])
                .filter((s: any) => s.testId === test.id && (s.status === 'COMPLETED' || s.status === 'AUTO_SUBMITTED'))
                .sort((a: any, b: any) => {
                  const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
                  const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
                  return timeB - timeA;
                });
              const attempt = completedAttempts[0];
              const isCompleted = completedAttempts.length > 0;
              const isPaused = localOngoingIds.has(test.id) || (currentUser.testSessions || []).some(
                (s: any) => s.testId === test.id && s.status === 'ONGOING'
              );

              let cardBg = isDark ? ThemeColors.dark.card : '#FFFFFF';
              let cardBorderColor = isDark ? ThemeColors.dark.border : '#E2E8F0';
              let cardBorderLeftColor = '#2563EB'; // default primary blue
              let cardBorderLeftWidth = 4;

              if (isCompleted && attempt) {
                const isCleared = attempt.score >= (test.testbookCutoffScore || 0);
                if (isCleared) {
                  cardBg = isDark ? '#062C1E' : '#E8F8F0';
                  cardBorderColor = isDark ? '#065F46' : '#D0F2E0';
                  cardBorderLeftColor = '#10B981';
                } else {
                  cardBg = isDark ? '#3A1212' : '#FDE8E8';
                  cardBorderColor = isDark ? '#7F1D1D' : '#FCD5D5';
                  cardBorderLeftColor = '#EF4444';
                }
              } else if (isPaused) {
                cardBg = isDark ? '#0C1E36' : '#F0F9FF';
                cardBorderColor = isDark ? '#1E3A8A' : '#E0F2FE';
                cardBorderLeftColor = '#3B82F6';
              } else if (!allowed) {
                cardBg = isDark ? '#2E1B0E' : '#FEFBF0';
                cardBorderColor = isDark ? '#78350F' : '#FDE68A';
                cardBorderLeftColor = '#F59E0B';
              }

              return (
                <View 
                  key={test.id} 
                  style={[
                    styles.testCard, 
                    {
                      backgroundColor: cardBg,
                      borderColor: cardBorderColor,
                      borderLeftColor: cardBorderLeftColor,
                      borderLeftWidth: cardBorderLeftWidth,
                    }
                  ]}
                >
                  <View style={styles.testCardHeader}>
                    <Text style={[styles.testTitle, isDark && { color: ThemeColors.dark.text }]}>{test.title}</Text>
                    {test.requiredTier !== 'None' ? (
                      <Text style={[styles.badge, styles.proBadge]}>PRO</Text>
                    ) : (
                      <Text style={[styles.badge, styles.freeBadge]}>FREE</Text>
                    )}
                  </View>

                  {/* Test Parameters */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <HelpCircle size={14} color={isDark ? ThemeColors.dark.textMuted : '#6B7280'} />
                      <Text style={[styles.metaText, isDark && { color: ThemeColors.dark.textMuted }]}>{test.questionsCount} Qs</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={14} color={isDark ? ThemeColors.dark.textMuted : '#6B7280'} />
                      <Text style={[styles.metaText, isDark && { color: ThemeColors.dark.textMuted }]}>{test.durationMinutes} Mins</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Coins size={14} color={isDark ? ThemeColors.dark.textMuted : '#6B7280'} />
                      <Text style={[styles.metaText, isDark && { color: ThemeColors.dark.textMuted }]}>{test.maxMarks} Marks</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <PlusCircle size={12} color={isDark ? '#34D399' : '#059669'} />
                      <Text style={[styles.metaText, { color: isDark ? '#34D399' : '#059669', fontWeight: 'bold' }]}>+{test.positiveMarks ?? 2}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MinusCircle size={12} color={isDark ? '#F87171' : '#DC2626'} />
                      <Text style={[styles.metaText, { color: isDark ? '#F87171' : '#DC2626', fontWeight: 'bold' }]}>-{test.negativeMarks ?? 0.5}</Text>
                    </View>
                  </View>

                  {/* Subtitle / Status */}
                  {isCompleted && attempt && (
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
                      borderColor: isDark ? '#059669' : '#10B981',
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      gap: 6,
                      marginTop: 4,
                      marginBottom: 12,
                      alignSelf: 'flex-start',
                    }}>
                      <CheckCircle size={13} color="#10B981" />
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#10B981' }}>
                        {language === 'en' ? 'Attempted' : 'प्रयास पूरा किया'}
                      </Text>
                      <View style={{ width: 1, height: 12, backgroundColor: isDark ? '#334155' : '#D1D5DB' }} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#34D399' : '#047857' }}>
                        {language === 'en' ? 'Last Score:' : 'पिछला स्कोर:'} {attempt.score.toFixed(1)}/{attempt.maxScore.toFixed(0)}
                      </Text>
                    </View>
                  )}
                  {isPaused && (
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                      borderColor: isDark ? '#2563EB' : '#3B82F6',
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      gap: 6,
                      marginTop: 4,
                      marginBottom: 12,
                      alignSelf: 'flex-start',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#3B82F6' }}>
                        {language === 'en' ? '⏸ In-Progress (Paused)' : '⏸ प्रगति पर है (रुका हुआ)'}
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  {allowed ? (
                    <View style={{ gap: 8 }}>
                      {isCompleted && attempt && (
                        <TouchableOpacity
                          style={[styles.analysisBtn, isDark && { backgroundColor: '#0B1329', borderColor: '#1F2E54' }]}
                          onPress={() => onOpenAttemptAnalysis(attempt)}
                        >
                          <Eye size={14} color={isDark ? ThemeColors.dark.text : '#475569'} />
                          <Text style={[styles.analysisBtnText, isDark && { color: ThemeColors.dark.text }]}>
                            {language === 'en' ? 'Solution & Analysis' : 'समाधान और विश्लेषण'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionBtn, isPaused && { backgroundColor: '#3B82F6' }]}
                        onPress={() => onOpenExam(test.id)}
                      >
                        <Play size={14} color="#FFF" />
                        <Text style={styles.actionBtnText}>
                          {isPaused 
                            ? (language === 'en' ? 'Resume Test sitting' : 'टेस्ट जारी रखें') 
                            : isCompleted 
                            ? (language === 'en' ? 'Re-attempt Test' : 'पुनः टेस्ट दें') 
                            : (language === 'en' ? 'Start Test Now' : 'मॉक टेस्ट शुरू करें')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.lockBlock, isDark && { borderTopColor: ThemeColors.dark.border }]}>
                      <View style={styles.lockMsg}>
                        <Lock size={14} color="#DC2626" />
                        <Text style={styles.lockMsgText}>
                          {language === 'en' ? 'Requires' : 'आवश्यकता:'} {test.requiredTier.replace('Testbook', 'Mock Test')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.unlockBtn, isDark && { backgroundColor: '#0B1329', borderColor: '#1F2E54' }]}
                        onPress={() => handleUnlockWithCoins(test.title, test.requiredTier)}
                      >
                        <Coins size={14} color="#D97706" />
                        <Text style={[styles.unlockBtnText, isDark && { color: '#FBBF24' }]}>
                          {language === 'en' ? 'Unlock (20 Coins)' : 'अनलॉक करें (20 सिक्के)'}
                        </Text>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  blurOrbLeft: {
    position: 'absolute',
    top: '15%',
    left: '-20%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(37, 99, 235, 0.04)',
    zIndex: -1,
  },
  blurOrbRight: {
    position: 'absolute',
    bottom: '15%',
    right: '-20%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(79, 70, 229, 0.04)',
    zIndex: -1,
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
    flexWrap: 'wrap',
    gap: 12,
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
  subSubBlock: {
    marginBottom: 20,
  },
  subSubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    paddingLeft: 10,
    marginBottom: 12,
    marginTop: 8,
  },
  subSubTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subSubBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  subSubBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  tabsWrapper: {
    maxHeight: 50,
    marginVertical: 10,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tabItemText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
  },
  tabItemTextActive: {
    color: '#FFFFFF',
  },
});
