import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  Switch
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
  Send,
  Flag,
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Award,
  Trophy,
  User,
  Sun,
  ClipboardList,
  Filter,
  CircleCheck,
  CircleX,
  Clock,
  Menu
} from 'lucide-react-native';
import { ApiClient } from '../api';
import { getCachedQuestions, saveQuestionsToCache } from '../cache';
import { ThemeColors } from '../theme';
import { HtmlText } from '../HtmlText';

interface AnalysisScreenProps {
  currentUser: any;
  attempt: any; // The past session attempt data
  onBack: () => void;
  onToggleBookmark: (testId: string, questionId: string) => void;
  isDark?: boolean;
}

export default function AnalysisScreen({
  currentUser,
  attempt,
  onBack,
  onToggleBookmark,
  isDark = false
}: AnalysisScreenProps) {
  const insets = useSafeAreaInsets();
  // Navigation / Tabs state: 'analysis' | 'solutions'
  const [activeTab, setActiveTab] = useState<'analysis' | 'solutions'>('analysis');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQs, setLoadingQs] = useState(true);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [testPositiveMarks, setTestPositiveMarks] = useState<number | null>(null);
  const [testNegativeMarks, setTestNegativeMarks] = useState<number | null>(null);
  
  // Re-attempt Mode states (Solutions Tab)
  const [reattemptMode, setReattemptMode] = useState(false);
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [selectedSection, setSelectedSection] = useState<string>('All Sections');
  const [paletteVisible, setPaletteVisible] = useState(false);

  // Ref for the horizontal paging ScrollView — same technique as the notice screen
  const solutionScrollRef = useRef<ScrollView>(null);
  const pageWidth = Dimensions.get('window').width;

  // Scroll to a specific question page with a smooth native slide animation
  const scrollToQuestion = (idx: number) => {
    setActiveQuestionIdx(idx);
    solutionScrollRef.current?.scrollTo({ x: idx * pageWidth, animated: true });
  };

  // Abramowitz and Stegun Normal CDF approximation helper
  const calculateNormalCDF = (z: number): number => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804 * Math.exp(-z * z / 2);
    const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return z >= 0 ? 1 - p : p;
  };

  // Filter section modal/dropdown states
  const [sectionDropdownVisible, setSectionDropdownVisible] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'incorrect' | 'unattempted' | 'correct' | 'marked'>('all');
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);

  // Active attempt
  const testAttempts = useMemo(() => {
    return (currentUser?.testSessions || [])
      .filter((s: any) => s.testId === attempt.testId && (s.status === 'COMPLETED' || s.status === 'AUTO_SUBMITTED'))
      .sort((a: any, b: any) => {
        const dateA = new Date(a.startedAt || a.completedAt || 0).getTime();
        const dateB = new Date(b.startedAt || b.completedAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 3);
  }, [currentUser?.testSessions, attempt.testId]);

  // Always default activeAttemptIndex to 0 (which is the latest/current attempt in the descending sorted list)
  const [activeAttemptIndex, setActiveAttemptIndex] = useState(0);

  const getAttemptLabel = (idx: number, attemptLang: 'en' | 'hi' = 'en') => {
    if (idx === 0) {
      return attemptLang === 'hi' ? 'वर्तमान प्रयास' : 'Current Attempt';
    } else if (idx === 1) {
      return attemptLang === 'hi' ? 'पिछला प्रयास' : 'Previous Attempt';
    } else if (idx === 2) {
      return attemptLang === 'hi' ? 'दूसरा प्रयास' : 'Second Previous';
    }
    return attemptLang === 'hi' ? `प्रयास ${idx + 1}` : `Attempt ${idx + 1}`;
  };

  const activeAttempt = testAttempts[activeAttemptIndex] || attempt;

  // Stats calculation
  const totalQs = activeAttempt.questionsCount || activeAttempt.maxQuestions || 200;
  const maxScore = activeAttempt.maxScore || 200;
  
  const scoreVal = activeAttempt.score ?? 0;
  const testbookTotalUsers = activeAttempt.mockTest?.testbookTotalUsers ?? activeAttempt.testbookTotalUsers ?? 5968;
  const averageScore = activeAttempt.mockTest?.testbookAverageScore ?? activeAttempt.testbookAverageScore ?? 46.07;
  const bestScore = activeAttempt.mockTest?.testbookTopperScore ?? activeAttempt.testbookTopperScore ?? 188.75;
  const cutoffScoreStr = activeAttempt.mockTest?.testbookCutoffScore ? `${activeAttempt.mockTest.testbookCutoffScore}-${activeAttempt.mockTest.testbookCutoffScore + 3}` : '126-129';

  // Calculate dynamic rank and percentile using the normal CDF formula
  const calculatedRankData = useMemo(() => {
    const N = testbookTotalUsers;
    const topper = bestScore;
    const avg = averageScore;
    const score = scoreVal;

    const sigma = Math.max(5.0, (topper - avg) / 2.0);
    const z = (score - avg) / sigma;

    const cdf = calculateNormalCDF(z);
    const calculatedPercentile = Number((cdf * 100).toFixed(2));
    const calculatedRank = Math.max(1, Math.min(N, Math.round((1 - cdf) * N)));

    return { rank: calculatedRank, percentile: calculatedPercentile };
  }, [testbookTotalUsers, bestScore, averageScore, scoreVal]);

  const testbookRank = calculatedRankData.rank;
  const percentileVal = calculatedRankData.percentile;
  const accuracyVal = activeAttempt.accuracy ?? 0;

  const isCutoffCleared = useMemo(() => {
    try {
      const parts = cutoffScoreStr.split('-');
      const minCutoff = parseFloat(parts[0]);
      if (!isNaN(minCutoff)) {
        return scoreVal >= minCutoff;
      }
    } catch (e) {}
    return scoreVal >= 120; // fallback
  }, [cutoffScoreStr, scoreVal]);

  const sectionalAnalysis = useMemo(() => {
    // Derive per-test marking scheme (same logic as examUtils.ts + prefer DB metadata)
    const testId = activeAttempt.testId || '';
    const pmFromMeta = activeAttempt.positiveMarks ?? activeAttempt.mockTest?.positiveMarks ?? testPositiveMarks;
    const nmFromMeta = activeAttempt.negativeMarks ?? activeAttempt.mockTest?.negativeMarks ?? testNegativeMarks;
    // Fallbacks match examUtils.ts: RRB = +1/−0.33, SSC/others = +2/−0.5
    const positiveMark: number = (pmFromMeta !== undefined && pmFromMeta !== null) ? Number(pmFromMeta) :
      (testId.includes('rrb') || testId.includes('railway') ? 1 : 2);
    const negativeMark: number = (nmFromMeta !== undefined && nmFromMeta !== null) ? Number(nmFromMeta) :
      (testId.includes('rrb') || testId.includes('railway') ? 0.33 : 0.5);

    const sectionsMap: Record<string, {
      name: string;
      total: number;
      attempted: number;
      correct: number;
      incorrect: number;
      unattempted: number;
      score: number;
      positiveMark: number;
      negativeMark: number;
    }> = {};

    questions.forEach(q => {
      const secName = q.section || q.subject || 'General Section';
      if (!sectionsMap[secName]) {
        sectionsMap[secName] = {
          name: secName,
          total: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          unattempted: 0,
          score: 0,
          positiveMark,
          negativeMark,
        };
      }

      const stats = sectionsMap[secName];
      stats.total++;

      const userResponse = activeAttempt.responses ? activeAttempt.responses[q.id] : null;
      const selectedIdx = userResponse ? userResponse.selectedOptionIndex : null;
      const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctIndex;

      if (selectedIdx === null || selectedIdx === undefined) {
        stats.unattempted++;
      } else {
        stats.attempted++;
        if (selectedIdx === correctIdx) {
          stats.correct++;
          stats.score += positiveMark;
        } else {
          stats.incorrect++;
          stats.score -= negativeMark;
        }
      }
    });

    return Object.values(sectionsMap);
  }, [questions, activeAttempt, testPositiveMarks, testNegativeMarks]);

  // Reconstruct deterministic student responses seed to align with website timers
  let seed = 0;
  const seedString = (currentUser?.id || '') + (activeAttempt?.id || '');
  for (let i = 0; i < seedString.length; i++) {
    seed += seedString.charCodeAt(i);
  }

  // Load questions — Stale-While-Revalidate pattern (0ms local storage load + background revalidation)
  useEffect(() => {
    let isMounted = true;
    const fetchQuestions = async () => {
      // Step 1: Render immediately from device local storage if present
      const cached = await getCachedQuestions(activeAttempt.testId);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        if (isMounted) {
          setQuestions(cached.map((q: any, idx: number) => ({
            ...q,
            id: q.id || `q_custom_${idx}`
          })));
          setLoadingQs(false);
        }
      } else {
        if (isMounted) setLoadingQs(true);
      }

      // Step 2: Background revalidation & fetching fresh marks/explanations
      try {
        const res = await ApiClient.getCustomQuestions(activeAttempt.testId);
        if (!isMounted) return;

        if (res.positiveMarks !== null && res.positiveMarks !== undefined) {
          setTestPositiveMarks(Number(res.positiveMarks));
        }
        if (res.negativeMarks !== null && res.negativeMarks !== undefined) {
          setTestNegativeMarks(Number(res.negativeMarks));
        }
        if (res.success && res.questions && Array.isArray(res.questions)) {
          const mappedQuestions = res.questions.map((q: any, idx: number) => ({
            ...q,
            id: q.id || `q_custom_${idx}`
          }));
          setQuestions(mappedQuestions);
          saveQuestionsToCache(activeAttempt.testId, res.questions);
        } else if (!cached || cached.length === 0) {
          const fallbackList = activeAttempt.testId.includes('ssc') 
            ? [
                { id: "q_q1", textEn: "The Nagpur seminar was 5 days before the Indore seminar. The Bhopal seminar was 2 days before the Nagpur seminar. If Indore seminar was held on 22nd May, what was the date of the Bhopal seminar?", optionsEn: ["14th May", "15th May", "16th May", "17th May"], correctIndex: 1, explanationEn: "Nagpur seminar = 22 - 5 = 17th May. Bhopal seminar = 17 - 2 = 15th May.", textHi: "नागपुर संगोष्ठी इंदौर संगोष्ठी से 5 दिन पहले थी। भोपाल संगोष्ठी नागपुर संगोष्ठी से 2 दिन पहले थी। यदि इंदौर संगोष्ठी 22 मई को आयोजित की गई थी, तो भोपाल संगोष्ठी की तारीख क्या थी?", optionsHi: ["14 मई", "15 मई", "16 मई", "17 मई"], explanationHi: "नागपुर संगोष्ठी = 22 - 5 = 17 मई। भोपाल संगोष्ठी = 17 - 2 = 15 मई।" },
                { id: "q_q2", textEn: "The ratio of present ages of A and B is 4:5. After 5 years, the ratio becomes 5:6. What is A's present age?", optionsEn: ["20 years", "25 years", "30 years", "15 years"], correctIndex: 0, explanationEn: "Let age be 4k and 5k. (4k+5)/(5k+5) = 5/6 => 24k + 30 = 25k + 25 => k = 5. A = 4k = 20.", textHi: "A और B की वर्तमान आयु का अनुपात 4:5 है। 5 वर्ष बाद, अनुपात 5:6 हो जाता है। A की वर्तमान आयु क्या है?", optionsHi: ["20 वर्ष", "25 वर्ष", "30 वर्ष", "15 वर्ष"], explanationHi: "माना वर्तमान आयु 4k और 5k है। (4k+5)/(5k+5) = 5/6 => 24k + 30 = 25k + 25 => k = 5. A = 4k = 20 वर्ष।" }
              ]
            : [
                { id: "q_gen1", textEn: "What is the unit of electric current?", optionsEn: ["Volt", "Ampere", "Ohm", "Watt"], correctIndex: 1, explanationEn: "Electric current is measured in Ampere.", textHi: "विद्युत धारा की इकाई क्या है?", optionsHi: ["वोल्ट", "एम्पीयर", "ओम", "वाट"], explanationHi: "विद्युत धारा की इकाई एम्पीयर है।" },
                { id: "q_gen2", textEn: "Which planet is known as the Red Planet?", optionsEn: ["Earth", "Mars", "Jupiter", "Saturn"], correctIndex: 1, explanationEn: "Mars has iron oxide on its surface giving it a reddish look.", textHi: "किस ग्रह को लाल ग्रह के नाम से जाना जाता है?", optionsHi: ["पृथ्वी", "मंगल", "बृहस्पति", "शनि"], explanationHi: "लोहे के ऑक्साइड के कारण मंगल ग्रह लाल दिखता है।" }
              ];
          setQuestions(fallbackList);
        }
      } catch (err) {
        console.warn("[Cache] Background revalidation fetch failed, keeping local questions:", err);
      } finally {
        if (isMounted) setLoadingQs(false);
      }
    };

    fetchQuestions();
    return () => { isMounted = false; };
  }, [activeAttempt.testId]);

  // Unique list of sections dynamically found in the test
  const testSections = useMemo(() => {
    const sectionsSet = new Set<string>();
    questions.forEach(q => {
      const sec = q.section || q.subject || 'General';
      sectionsSet.add(sec);
    });
    return ['All Sections', ...Array.from(sectionsSet)];
  }, [questions]);

  // Statistics counts based on responses
  const statsCounts = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;

    questions.forEach(q => {
      const userResponse = activeAttempt.responses ? activeAttempt.responses[q.id] : null;
      const selectedIdx = userResponse ? userResponse.selectedOptionIndex : null;
      const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctIndex;
      
      if (selectedIdx === null || selectedIdx === undefined) {
        unattempted++;
      } else if (selectedIdx === correctIdx) {
        correct++;
      } else {
        incorrect++;
      }
    });

    return { correct, incorrect, unattempted };
  }, [questions, activeAttempt, testPositiveMarks, testNegativeMarks]);

  // Filtered questions based on selected Section and category filter
  const filteredQuestions = useMemo(() => {
    return questions.filter((q, idx) => {
      // 1. Section Filter
      if (selectedSection !== 'All Sections') {
        const sec = q.section || q.subject || 'General';
        if (sec !== selectedSection) return false;
      }

      // 2. Category Type Filter
      const userResponse = activeAttempt.responses ? activeAttempt.responses[q.id] : null;
      const selectedIdx = userResponse ? userResponse.selectedOptionIndex : null;
      const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctIndex;
      const isCorrect = selectedIdx === correctIdx;
      const isUnattempted = selectedIdx === null || selectedIdx === undefined;

      if (filterType === 'correct') return isCorrect && !isUnattempted;
      if (filterType === 'incorrect') return !isCorrect && !isUnattempted;
      if (filterType === 'unattempted') return isUnattempted;
      
      return true;
    });
  }, [questions, selectedSection, filterType, activeAttempt]);

  const activeQuestion = filteredQuestions[activeQuestionIdx];

  // Bug Report States
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [reporting, setReporting] = useState(false);

  const handleOpenReportModal = () => {
    if (!activeQuestion) return;
    setReportMessage('');
    setReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    if (!reportMessage.trim()) {
      Alert.alert('Error', 'Please enter a description of the issue');
      return;
    }

    setReporting(true);
    const qText = lang === 'en' ? activeQuestion.textEn : activeQuestion.textHi;
    const res = await ApiClient.reportQuestion({
      questionId: activeQuestion.id || 'unknown',
      questionText: qText || '',
      mockTestId: activeAttempt.testId,
      mockTestTitle: activeAttempt.title,
      message: reportMessage.trim(),
      userId: currentUser?.id || 'unknown',
      candidateCode: currentUser?.candidateCode || ''
    });
    setReporting(false);

    if (res.success) {
      Alert.alert('Report Received', 'Thank you! Our subject experts will review the issue.');
      setReportModalVisible(false);
    } else {
      Alert.alert('Error', res.error || 'Failed to submit report.');
    }
  };

  const isBookmarked = (qId: string) => {
    return (currentUser?.bookmarkedQuestions || []).some(
      (b: any) => b.testId === activeAttempt.testId && b.questionId === qId
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. BLACK TOP HEADER */}
      <View style={[styles.blackHeader, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={styles.blackHeaderLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <ArrowLeft color="#FFF" size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeAttempt.title}
          </Text>
        </View>
        
        <View style={styles.blackHeaderRight}>
          <TouchableOpacity 
            style={styles.langToggleBtn} 
            onPress={() => setLang(lang === 'en' ? 'hi' : 'en')}
          >
            <View style={styles.langIconBg}>
              <Globe size={13} color="#FFF" />
              <Text style={styles.langIconText}>{lang === 'en' ? 'E' : 'अ'}</Text>
            </View>
          </TouchableOpacity>


        </View>
      </View>

      {/* 2. SUB HEADER TAB BAR */}
      <View style={styles.tabBar}>
        {[
          { id: 'analysis', label: 'Analysis' },
          { id: 'solutions', label: 'Solutions' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. TABS CONTAINER */}
      <View style={styles.tabContentArea}>
        
        {/* ==================== TAB 1: ANALYSIS ==================== */}
        {activeTab === 'analysis' && (
          <ScrollView 
            style={styles.analysisScrollView} 
            contentContainerStyle={styles.analysisContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. CUTOFF / PERFORMANCE STATUS BANNER (HIDDEN) */}

            {/* 2. ATTEMPT SWITCHER ROW */}
            {testAttempts.length > 1 && (
              <View style={[styles.attemptSwitcherContainer, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
                <Text style={[styles.attemptSwitcherLabel, isDark && { color: ThemeColors.dark.textMuted }]}>SELECT ATTEMPT TO ANALYZE:</Text>
                <View style={styles.attemptRow}>
                  {testAttempts.map((att: any, idx: number) => {
                    const isSelected = activeAttemptIndex === idx;
                    const dateStr = att.completedAt ? new Date(att.completedAt).toLocaleDateString() : 'Attempt';
                    return (
                      <TouchableOpacity
                        key={att.id}
                        style={[
                          styles.attemptPill,
                          isSelected 
                            ? { backgroundColor: '#2563EB', borderColor: '#2563EB' } 
                            : (isDark ? { backgroundColor: '#111827', borderColor: '#374151' } : { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }),
                          { borderWidth: 1 }
                        ]}
                        onPress={() => setActiveAttemptIndex(idx)}
                      >
                        <Text style={[styles.attemptPillText, isSelected ? { color: '#FFF', fontWeight: 'bold' } : (isDark ? { color: '#E2E8F0' } : { color: '#475569' })]}>
                          {getAttemptLabel(idx, lang)} ({dateStr})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 3. SCORE COMPARISON SPECTRUM (HIDDEN) */}

            {/* Quick Summary Title */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>PERFORMANCE SNAPSHOT</Text>
            </View>

            {/* 4. METRIC CARDS GRID */}
            <View style={styles.metricsGrid}>
              
              {/* Score Card */}
              <View style={[styles.metricCard, { flexDirection: 'column', alignItems: 'stretch' }, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.metricIconBg, { backgroundColor: '#F3E8FF' }]}>
                    <Trophy size={18} color="#A855F7" />
                  </View>
                  <View style={[styles.metricDetails, { flex: 1 }]}>
                    <Text style={styles.metricLabel}>Score</Text>
                    <Text style={[styles.metricValue, isDark && { color: ThemeColors.dark.text }]}>
                      {scoreVal.toFixed(1)}
                      <Text style={styles.metricTotal}>/{maxScore.toFixed(0)}</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* Accuracy Card */}
              <View style={[styles.metricCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
                <View style={[styles.metricIconBg, { backgroundColor: '#DCFCE7' }]}>
                  <Sun size={18} color="#22C55E" />
                </View>
                <View style={styles.metricDetails}>
                  <Text style={styles.metricLabel}>Accuracy</Text>
                  <Text style={[styles.metricValue, isDark && { color: ThemeColors.dark.text }]}>{accuracyVal.toFixed(0)} %</Text>
                </View>
              </View>

              {/* Qs. Attempted Details */}
              <View style={[styles.metricCard, { flexDirection: 'column', alignItems: 'stretch' }, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.metricIconBg, { backgroundColor: '#DBEAFE' }]}>
                    <ClipboardList size={18} color="#3B82F6" />
                  </View>
                  <View style={[styles.metricDetails, { flex: 1 }]}>
                    <Text style={styles.metricLabel}>Qs. Attempted</Text>
                    <Text style={[styles.metricValue, isDark && { color: ThemeColors.dark.text }]}>
                      {statsCounts.correct + statsCounts.incorrect}
                      <Text style={styles.metricTotal}>/{totalQs}</Text>
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.pillsRow, isDark && { borderTopColor: '#334155' }]}>
                  <View style={[styles.pillItem, { backgroundColor: isDark ? '#062C1E' : '#F0FDF4' }]}>
                    <View style={[styles.pillDot, { backgroundColor: '#22C55E' }]} />
                    <Text style={[styles.pillText, { color: isDark ? '#34D399' : '#166534' }]}>Correct: {statsCounts.correct}</Text>
                  </View>
                  <View style={[styles.pillItem, { backgroundColor: isDark ? '#451A03' : '#FEF2F2' }]}>
                    <View style={[styles.pillDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.pillText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>Incorrect: {statsCounts.incorrect}</Text>
                  </View>
                  <View style={[styles.pillItem, { backgroundColor: isDark ? '#1F293B' : '#F8FAFC' }]}>
                    <View style={[styles.pillDot, { backgroundColor: '#64748B' }]} />
                    <Text style={[styles.pillText, { color: isDark ? '#94A3B8' : '#334155' }]}>Unattempt: {statsCounts.unattempted}</Text>
                  </View>
                </View>
              </View>

              {/* Time Taken Card */}
              {(() => {
                // Primary: Sum of elapsedSeconds across all question responses for exact timing
                let spentSec = 0;
                if (activeAttempt.responses && Object.keys(activeAttempt.responses).length > 0) {
                  spentSec = Object.values(activeAttempt.responses).reduce(
                    (sum: number, r: any) => sum + (r.elapsedSeconds || 0),
                    0
                  );
                }

                // Fallback 1: durationSeconds / timeSpentSeconds directly from database
                if (spentSec <= 0) {
                  const rawDur = activeAttempt.durationSeconds ?? activeAttempt.timeSpentSeconds;
                  if (rawDur !== null && rawDur !== undefined && Number(rawDur) > 0) {
                    spentSec = Number(rawDur);
                  }
                }

                // Fallback 2: allotted_minutes × 60 - time_remaining_at_submit
                if (spentSec <= 0) {
                  const allottedSec = (activeAttempt.durationMinutes ?? 60) * 60;
                  const remaining = activeAttempt.timeRemaining ?? activeAttempt.remainingSeconds;
                  if (remaining !== null && remaining !== undefined) {
                    spentSec = Math.max(0, allottedSec - Number(remaining));
                  }
                }

                spentSec = Math.floor(spentSec);
                const hrs = Math.floor(spentSec / 3600);
                const mins = Math.floor((spentSec % 3600) / 60);
                const secs = spentSec % 60;
                const timeStr = spentSec <= 0
                  ? '—'
                  : hrs > 0
                  ? `${hrs}h ${mins}m ${secs}s`
                  : mins > 0
                  ? `${mins}m ${secs}s`
                  : `${secs}s`;
                return (
                  <View style={[styles.metricCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
                    <View style={[styles.metricIconBg, { backgroundColor: '#FEF3C7' }]}>
                      <Clock size={18} color="#F59E0B" />
                    </View>
                    <View style={styles.metricDetails}>
                      <Text style={styles.metricLabel}>Time Taken</Text>
                      <Text style={[styles.metricValue, isDark && { color: ThemeColors.dark.text }]}>{timeStr}</Text>
                    </View>
                  </View>
                );
              })()}

            </View>

            {/* 5. SUBJECT-WISE BREAKDOWN */}
            <View style={[styles.sectionalAnalysisCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
              <Text style={[styles.comparisonTitle, { marginBottom: 12, fontSize: 13 }, isDark && { color: ThemeColors.dark.text }]}>Subject-wise Breakdown</Text>
              
              {sectionalAnalysis.length === 0 ? (
                <Text style={[styles.grayText, { textAlign: 'center', padding: 20 }]}>Subject metrics calculating...</Text>
              ) : (
              sectionalAnalysis.map((sec) => {
                  // maxSecScore = total questions × positiveMark (actual max marks, not question count)
                  const maxSecScore = sec.total * sec.positiveMark;
                  const scorePercent = maxSecScore > 0 ? Math.min(100, Math.max(0, (sec.score / maxSecScore) * 100)) : 0;
                  const secAccuracy = sec.attempted > 0 ? (sec.correct / sec.attempted) * 100 : 0;
                  
                  return (
                    <View key={sec.name} style={[styles.sectionRowItem, isDark && { borderBottomColor: '#334155' }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={[styles.sectionRowTitle, isDark && { color: ThemeColors.dark.text }]}>{sec.name}</Text>
                        <Text style={[styles.sectionRowScore, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                          Score: {sec.score.toFixed(2)}/{maxSecScore.toFixed(0)}
                        </Text>
                      </View>

                      {/* Progress Bar representing Score Ratio */}
                      <View style={[styles.sectionProgressBarBg, isDark && { backgroundColor: '#111827' }]}>
                        <View style={[styles.sectionProgressBarFill, { width: `${scorePercent}%`, backgroundColor: secAccuracy >= 75 ? '#10B981' : (secAccuracy >= 50 ? '#3B82F6' : '#EF4444') }]} />
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={[styles.sectionRowMeta, isDark && { color: ThemeColors.dark.textMuted }]}>
                          Correct: <Text style={{ color: '#10B981', fontWeight: 'bold' }}>{sec.correct}</Text> | Incorrect: <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>{sec.incorrect}</Text> | Unattempted: <Text style={{ color: '#64748B', fontWeight: 'bold' }}>{sec.unattempted}</Text>
                        </Text>
                        <Text style={[styles.sectionRowMeta, { fontWeight: 'bold', color: secAccuracy >= 75 ? '#10B981' : '#64748B' }]}>
                          Accuracy: {secAccuracy.toFixed(0)}%
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
                        <Text style={[styles.sectionRowMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          Marking: <Text style={{ color: '#10B981', fontWeight: 'bold' }}>+{sec.positiveMark}</Text> / <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>−{sec.negativeMark}</Text>
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

          </ScrollView>
        )}

        {/* ==================== TAB 2: SOLUTIONS ==================== */}
        {activeTab === 'solutions' && (
          <View style={styles.solutionsContainer}>
            
            {/* Top Toolbar: Dropdown Switcher, Filters, and Question Palette Menu */}
            <View style={styles.solToolbar}>
              <TouchableOpacity 
                style={styles.dropdownTrigger}
                onPress={() => setSectionDropdownVisible(true)}
              >
                <Text style={styles.dropdownTriggerText}>{selectedSection}</Text>
                <ChevronDown size={14} color="#2563EB" style={{ marginLeft: 4 }} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.filtersBtn}
                onPress={() => setFilterDropdownVisible(true)}
              >
                <Filter size={13} color="#475569" />
                <Text style={styles.filtersBtnText}>
                  {filterType === 'all' ? 'Filters' : filterType.toUpperCase()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.filtersBtn, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: isDark ? '#334155' : '#BFDBFE' }]}
                onPress={() => setPaletteVisible(true)}
              >
                <Menu size={13} color="#2563EB" />
                <Text style={[styles.filtersBtnText, { color: '#2563EB', fontWeight: 'bold' }]}>
                  Palette
                </Text>
              </TouchableOpacity>
            </View>

            {/* Horizontal Scroll Question Numbers Bar */}
            <View style={styles.scrollNumbersRow}>
              {loadingQs ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={styles.grayText}>Loading question roadmap...</Text>
                </View>
              ) : filteredQuestions.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={styles.grayText}>No questions match selected filters.</Text>
                </View>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.circleRowContent}
                >
                  {filteredQuestions.map((q, idx) => {
                    const isSelected = activeQuestionIdx === idx;
                    const userResponse = activeAttempt.responses ? activeAttempt.responses[q.id] : null;
                    const selectedIdx = userResponse ? userResponse.selectedOptionIndex : null;
                    const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctIndex;
                    const isCorrect = selectedIdx === correctIdx;
                     const isUnattempted = selectedIdx === null || selectedIdx === undefined;

                     let bgStyle = styles.circleNeutral;
                     let textCol = '#64748B';

                     if (isSelected) {
                       bgStyle = styles.circleActive;
                       textCol = '#FFFFFF';
                     } else if (!reattemptMode && !revealedSolutions[q.id]) {
                       if (isUnattempted) {
                         bgStyle = styles.circleUnattempted;
                       } else if (isCorrect) {
                         bgStyle = styles.circleCorrect;
                         textCol = '#15803D';
                       } else {
                         bgStyle = styles.circleIncorrect;
                         textCol = '#B91C1C';
                       }
                     }

                      return (
                        <TouchableOpacity
                          key={q.id || idx}
                          style={[styles.circleNav, bgStyle]}
                          onPress={() => scrollToQuestion(idx)}
                        >
                          <Text style={[styles.circleNavText, { color: textCol }]}>{idx + 1}</Text>
                        </TouchableOpacity>
                      );
                   })}
                 </ScrollView>
               )}
             </View>
              {/* Question Workspace Panel — horizontal paging ScrollView with 60fps windowed virtualization */}
              <ScrollView
                ref={solutionScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                decelerationRate="fast"
                bounces={false}
                style={{ flex: 1 }}
                onScroll={(e) => {
                  const newIdx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
                  if (newIdx !== activeQuestionIdx && newIdx >= 0 && newIdx < filteredQuestions.length) {
                    setActiveQuestionIdx(newIdx);
                  }
                }}
                onMomentumScrollEnd={(e) => {
                  const newIdx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
                  if (newIdx !== activeQuestionIdx && newIdx >= 0 && newIdx < filteredQuestions.length) {
                    setActiveQuestionIdx(newIdx);
                  }
                }}
              >
                {filteredQuestions.map((question, qIdx) => {
                  // Windowing optimization: Only mount full HTML tree for current & adjacent (+/- 1) pages
                  const isNearby = Math.abs(qIdx - activeQuestionIdx) <= 1;
                  if (!isNearby) {
                    return (
                      <View
                        key={question.id || qIdx}
                        style={{ width: pageWidth, flex: 1 }}
                      />
                    );
                  }

                  const userResp = activeAttempt.responses ? activeAttempt.responses[question.id] : null;
                  const submittedIdx = userResp ? userResp.selectedOptionIndex : null;
                  const elapsed = userResp ? Number(userResp.elapsedSeconds) || 0 : 0;
                  const correctIdx = question.correctOptionIndex !== undefined ? question.correctOptionIndex : question.correctIndex;
                  const isSolutionRevealed = !reattemptMode || revealedSolutions[question.id];
                 return (
                   <ScrollView
                     key={question.id || qIdx}
                     style={[styles.qWorkspace, { width: pageWidth }]}
                     contentContainerStyle={styles.qWorkspaceContent}
                     showsVerticalScrollIndicator={false}
                     nestedScrollEnabled
                   >
                     <View style={styles.questionCard}>

                       {/* Question stats details bar */}
                       <View style={styles.questionMetaRow}>
                         <View style={styles.metaBadgeCircle}>
                           <Text style={styles.metaBadgeCircleText}>{qIdx + 1}</Text>
                         </View>
                         {elapsed >= 60
                           ? <Text style={styles.metaText}>{Math.floor(elapsed / 60)}m {elapsed % 60}s</Text>
                           : <Text style={styles.metaText}>{elapsed}s</Text>
                         }
                         <Text style={[styles.metaText, { color: '#22C55E', fontWeight: 'bold' }]}>+1.0</Text>
                         <Text style={[styles.metaText, { color: '#EF4444', fontWeight: 'bold' }]}>-0.25</Text>
                         <View style={styles.metaIcons}>
                           <TouchableOpacity style={styles.iconBtn} onPress={handleOpenReportModal}>
                             <AlertTriangle size={17} color="#64748B" />
                           </TouchableOpacity>
                           <TouchableOpacity
                             style={styles.iconBtn}
                             onPress={() => onToggleBookmark(activeAttempt.testId, question.id)}
                           >
                             <Bookmark
                               size={17}
                               color={isBookmarked(question.id) ? '#F59E0B' : '#64748B'}
                               fill={isBookmarked(question.id) ? '#F59E0B' : 'transparent'}
                             />
                           </TouchableOpacity>
                         </View>
                       </View>

                       {/* Website-identical Question Text Box */}
                       <View style={[styles.questionCardBox, isDark && styles.questionCardBoxDark]}>
                         <HtmlText
                           style={styles.questionText}
                           isDark={isDark}
                           html={lang === 'en' ? question.textEn || question.content?.en?.questionText : question.textHi || question.content?.hi?.questionText}
                         />
                       </View>

                       {/* Options List */}
                       <View style={styles.optionsContainer}>
                         {(lang === 'en' ? question.optionsEn || question.content?.en?.options : question.optionsHi || question.content?.hi?.options)?.map((opt: any, optIdx: number) => {
                           const optText = typeof opt === 'string' ? opt : opt.text;
                           const isTempSelected = selectedOptions[question.id] === optIdx;
                           const isSubmittedSelected = submittedIdx === optIdx;
                           const isCorrectOpt = optIdx === correctIdx;

                           let borderCol = '#E2E8F0';
                           let bgCol = '#FFFFFF';
                           let labelCol = '#64748B';

                           if (isSolutionRevealed) {
                             if (isCorrectOpt) {
                               borderCol = '#22C55E'; bgCol = '#F0FDF4'; labelCol = '#15803D';
                             } else if (reattemptMode ? isTempSelected : isSubmittedSelected) {
                               borderCol = '#EF4444'; bgCol = '#FEF2F2'; labelCol = '#B91C1C';
                             }
                           } else if (isTempSelected) {
                             borderCol = '#2563EB'; bgCol = '#EFF6FF'; labelCol = '#1D4ED8';
                           }

                           return (
                             <TouchableOpacity
                               key={optIdx}
                               disabled={isSolutionRevealed}
                               style={[styles.optionCard, { borderColor: borderCol, backgroundColor: bgCol }]}
                               onPress={() => setSelectedOptions(prev => ({ ...prev, [question.id]: optIdx }))}
                             >
                               <Text style={[styles.optionIndexLabel, { color: labelCol }]}>{optIdx + 1}.</Text>
                               <HtmlText style={styles.optionText} isDark={isDark} html={optText} />
                               {isSolutionRevealed && isCorrectOpt && (
                                 <CircleCheck size={16} color="#22C55E" style={{ marginLeft: 'auto' }} />
                               )}
                               {isSolutionRevealed && !isCorrectOpt && (reattemptMode ? isTempSelected : isSubmittedSelected) && (
                                 <CircleX size={16} color="#EF4444" style={{ marginLeft: 'auto' }} />
                               )}
                             </TouchableOpacity>
                           );
                         })}
                       </View>

                       {/* Solution / Explanation block */}
                       {isSolutionRevealed ? (
                         <View style={styles.explanationBox}>
                           <Text style={styles.explanationTitle}>Explanation</Text>
                           <HtmlText
                             style={styles.explanationText}
                             isDark={isDark}
                             html={lang === 'en' ? question.explanationEn || question.explanation?.en : question.explanationHi || question.explanation?.hi}
                           />
                         </View>
                       ) : (
                         <View style={styles.viewSolutionBtnArea}>
                           <TouchableOpacity
                             style={styles.viewSolutionBtn}
                             onPress={() => setRevealedSolutions(prev => ({ ...prev, [question.id]: true }))}
                           >
                             <Text style={styles.viewSolutionBtnText}>View Solution</Text>
                           </TouchableOpacity>
                           <Text style={styles.reattemptHint}>
                             Re-attempt mode is ON. Turn OFF the Re-attempt mode or re-attempt the question to see the solutions.
                           </Text>
                         </View>
                       )}

                     </View>
                   </ScrollView>
                 );
               })}
             </ScrollView>

             {/* Bottom Panel: Question count on the left, Arrow navigation keys on the right */}
             <View style={[styles.solBottomBar, isDark && { backgroundColor: ThemeColors.dark.card, borderTopColor: ThemeColors.dark.border }]}>
               <Text style={[styles.questionCountText, isDark && { color: ThemeColors.dark.text }]}>
                 {filteredQuestions.length > 0 ? `Question ${activeQuestionIdx + 1} of ${filteredQuestions.length}` : '0 of 0'}
               </Text>
               <View style={styles.arrowKeysContainer}>
                 <TouchableOpacity
                   style={[styles.arrowKeyBtn, activeQuestionIdx === 0 && styles.arrowKeyBtnDisabled, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}
                   disabled={activeQuestionIdx === 0}
                   onPress={() => { if (activeQuestionIdx > 0) scrollToQuestion(activeQuestionIdx - 1); }}
                 >
                   <ChevronLeft size={22} color={activeQuestionIdx === 0 ? (isDark ? "#475569" : "#94A3B8") : (isDark ? "#E2E8F0" : "#1E293B")} />
                 </TouchableOpacity>
                 <TouchableOpacity
                   style={[styles.arrowKeyBtn, activeQuestionIdx === filteredQuestions.length - 1 && styles.arrowKeyBtnDisabled, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}
                   disabled={activeQuestionIdx === filteredQuestions.length - 1}
                   onPress={() => { if (activeQuestionIdx < filteredQuestions.length - 1) scrollToQuestion(activeQuestionIdx + 1); }}
                 >
                   <ChevronRight size={22} color={activeQuestionIdx === filteredQuestions.length - 1 ? (isDark ? "#475569" : "#94A3B8") : (isDark ? "#E2E8F0" : "#1E293B")} />
                 </TouchableOpacity>
               </View>
             </View>
           </View>
        )}
      </View>

      {/* 4. MODALS & DROPDOWNS */}
      
      {/* Section Filter Picker Modal */}
      <Modal
        visible={sectionDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSectionDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSectionDropdownVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Section</Text>
            {testSections.map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[styles.modalItem, selectedSection === sec && styles.modalItemActive]}
                onPress={() => {
                  setSelectedSection(sec);
                  setActiveQuestionIdx(0);
                  solutionScrollRef.current?.scrollTo({ x: 0, animated: false });
                  setSectionDropdownVisible(false);
                }}
              >
                <Text style={[styles.modalItemText, selectedSection === sec && styles.modalItemTextActive]}>
                  {sec}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Question Type Filter Modal */}
      <Modal
        visible={filterDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterDropdownVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Questions</Text>
            {[
              { id: 'all', label: 'All Questions' },
              { id: 'correct', label: 'Correct Questions' },
              { id: 'incorrect', label: 'Incorrect Questions' },
              { id: 'unattempted', label: 'Unattempted Questions' }
            ].map((filt) => (
              <TouchableOpacity
                key={filt.id}
                style={[styles.modalItem, filterType === filt.id && styles.modalItemActive]}
                onPress={() => {
                  setFilterType(filt.id as any);
                  setActiveQuestionIdx(0);
                  solutionScrollRef.current?.scrollTo({ x: 0, animated: false });
                  setFilterDropdownVisible(false);
                }}
              >
                <Text style={[styles.modalItemText, filterType === filt.id && styles.modalItemTextActive]}>
                  {filt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bug Report Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.reportOverlay}>
          <View style={styles.reportModalCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitleText}>Report Question Issue</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.reportContent}>
              <Text style={styles.reportLabel}>Please describe the error in this question (e.g. wrong key, typing error, incorrect explanation):</Text>
              <TextInput
                style={styles.reportInput}
                multiline
                numberOfLines={4}
                value={reportMessage}
                onChangeText={setReportMessage}
                placeholder="Type details of the issue here..."
                placeholderTextColor="#94A3B8"
              />

              <TouchableOpacity
                style={[styles.submitReportBtn, reporting && { opacity: 0.7 }]}
                disabled={reporting}
                onPress={handleSubmitReport}
              >
                <Send size={14} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitReportText}>
                  {reporting ? 'Submitting Report...' : 'Submit Report'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. QUESTION PALETTE DRAWER (RIGHT-SIDE MODAL) */}
      <Modal
        visible={paletteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPaletteVisible(false)}
      >
        <View style={styles.paletteModalOverlay}>
          {/* Dimmed backdrop on left */}
          <TouchableOpacity
            style={styles.paletteBackdrop}
            activeOpacity={1}
            onPress={() => setPaletteVisible(false)}
          />

          {/* Right side Drawer */}
          <View style={[styles.paletteDrawerCard, isDark && { backgroundColor: ThemeColors.dark.bg, borderColor: ThemeColors.dark.border }]}>
            
            {/* Drawer Header */}
            <View style={[styles.paletteHeader, isDark && { borderBottomColor: ThemeColors.dark.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={18} color={isDark ? '#60A5FA' : '#2563EB'} />
                <Text style={[styles.paletteTitleText, isDark && { color: ThemeColors.dark.text }]}>
                  {lang === 'hi' ? 'प्रश्न तालिका' : 'Question Palette'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPaletteVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              
              {/* Stats Summary Bar */}
              {(() => {
                let correctCount = 0;
                let incorrectCount = 0;
                let unattemptedCount = 0;

                filteredQuestions.forEach((q) => {
                  const userResponse = activeAttempt.responses ? activeAttempt.responses[q.id] : null;
                  const selectedIdx = userResponse ? userResponse.selectedOptionIndex : null;
                  const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctIndex;

                  if (selectedIdx === null || selectedIdx === undefined) {
                    unattemptedCount++;
                  } else if (selectedIdx === correctIdx) {
                    correctCount++;
                  } else {
                    incorrectCount++;
                  }
                });

                return (
                  <View style={styles.paletteStatsRow}>
                    <View style={[styles.paletteStatChip, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
                      <Text style={[styles.paletteStatCount, { color: '#15803D' }]}>{correctCount}</Text>
                      <Text style={[styles.paletteStatLabel, { color: '#166534' }]}>{lang === 'hi' ? 'सही' : 'Correct'}</Text>
                    </View>

                    <View style={[styles.paletteStatChip, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                      <Text style={[styles.paletteStatCount, { color: '#B91C1C' }]}>{incorrectCount}</Text>
                      <Text style={[styles.paletteStatLabel, { color: '#991B1B' }]}>{lang === 'hi' ? 'गलत' : 'Incorrect'}</Text>
                    </View>

                    <View style={[styles.paletteStatChip, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                      <Text style={[styles.paletteStatCount, { color: '#475569' }]}>{unattemptedCount}</Text>
                      <Text style={[styles.paletteStatLabel, { color: '#334155' }]}>{lang === 'hi' ? 'छूटे' : 'Skipped'}</Text>
                    </View>
                  </View>
                );
              })()}

              {/* Section picker indicator in drawer if sections > 1 */}
              {testSections.length > 1 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.paletteSubLabel, isDark && { color: ThemeColors.dark.textMuted }]}>
                    {lang === 'hi' ? 'अनुभाग चुनें:' : 'SELECT SECTION:'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {testSections.map((sec) => (
                      <TouchableOpacity
                        key={sec}
                        style={[
                          styles.paletteSecPill,
                          selectedSection === sec && styles.paletteSecPillActive,
                          isDark && selectedSection !== sec && { backgroundColor: '#1E293B', borderColor: '#334155' }
                        ]}
                        onPress={() => {
                          setSelectedSection(sec);
                          setActiveQuestionIdx(0);
                          solutionScrollRef.current?.scrollTo({ x: 0, animated: false });
                        }}
                      >
                        <Text style={[
                          styles.paletteSecPillText,
                          selectedSection === sec && { color: '#FFFFFF', fontWeight: 'bold' },
                          isDark && selectedSection !== sec && { color: '#94A3B8' }
                        ]}>
                          {sec}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Filter Pills */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.paletteSubLabel, isDark && { color: ThemeColors.dark.textMuted }]}>
                  {lang === 'hi' ? 'फ़िल्टर:' : 'FILTER BY:'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { id: 'all', label: lang === 'hi' ? 'सभी' : 'All' },
                    { id: 'correct', label: lang === 'hi' ? 'सही' : 'Correct' },
                    { id: 'incorrect', label: lang === 'hi' ? 'गलत' : 'Incorrect' },
                    { id: 'unattempted', label: lang === 'hi' ? 'छूटे' : 'Unattempted' }
                  ].map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={[
                        styles.paletteFilterChip,
                        filterType === f.id && styles.paletteFilterChipActive,
                        isDark && filterType !== f.id && { backgroundColor: '#1E293B', borderColor: '#334155' }
                      ]}
                      onPress={() => {
                        setFilterType(f.id as any);
                        setActiveQuestionIdx(0);
                        solutionScrollRef.current?.scrollTo({ x: 0, animated: false });
                      }}
                    >
                      <Text style={[
                        styles.paletteFilterChipText,
                        filterType === f.id && { color: '#FFFFFF', fontWeight: 'bold' },
                        isDark && filterType !== f.id && { color: '#94A3B8' }
                      ]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Questions Grid */}
              <Text style={[styles.paletteSubLabel, isDark && { color: ThemeColors.dark.textMuted }]}>
                {lang === 'hi' ? 'प्रश्न तालिका (प्रश्न पर टैप करें):' : 'QUESTIONS (TAP TO GO):'}
              </Text>

              {filteredQuestions.length === 0 ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <Text style={styles.grayText}>{lang === 'hi' ? 'कोई प्रश्न उपलब्ध नहीं हैं' : 'No questions match filter'}</Text>
                </View>
              ) : (
                <View style={styles.paletteGridContainer}>
                  {filteredQuestions.map((q, idx) => {
                    const isSelected = activeQuestionIdx === idx;
                    const userResponse = activeAttempt.responses ? activeAttempt.responses[q.id] : null;
                    const selectedIdx = userResponse ? userResponse.selectedOptionIndex : null;
                    const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctIndex;
                    const isCorrect = selectedIdx === correctIdx;
                    const isUnattempted = selectedIdx === null || selectedIdx === undefined;

                    let bgStyle: any = { backgroundColor: '#F1F5F9' };
                    let textCol = '#64748B';
                    let borderCol = '#CBD5E1';

                    if (isSelected) {
                      bgStyle = { backgroundColor: '#2563EB' };
                      textCol = '#FFFFFF';
                      borderCol = '#1D4ED8';
                    } else if (!reattemptMode && !revealedSolutions[q.id]) {
                      if (isUnattempted) {
                        bgStyle = { backgroundColor: '#F1F5F9' };
                        borderCol = '#CBD5E1';
                        textCol = '#475569';
                      } else if (isCorrect) {
                        bgStyle = { backgroundColor: '#DCFCE7' };
                        borderCol = '#22C55E';
                        textCol = '#15803D';
                      } else {
                        bgStyle = { backgroundColor: '#FEE2E2' };
                        borderCol = '#EF4444';
                        textCol = '#B91C1C';
                      }
                    }

                    return (
                      <TouchableOpacity
                        key={q.id || idx}
                        style={[
                          styles.paletteGridItem,
                          bgStyle,
                          { borderColor: borderCol },
                          isSelected && { borderWidth: 2.5, shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }
                        ]}
                        onPress={() => {
                          scrollToQuestion(idx);
                          setPaletteVisible(false);
                        }}
                      >
                        <Text style={[styles.paletteGridItemText, { color: textCol }, isSelected && { fontWeight: '900' }]}>
                          {idx + 1}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Color Legend */}
              <View style={[styles.paletteLegendBox, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
                <Text style={[styles.paletteLegendTitle, isDark && { color: ThemeColors.dark.text }]}>LEGEND:</Text>
                <View style={styles.paletteLegendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#DCFCE7', borderColor: '#22C55E' }]} />
                    <Text style={[styles.legendText, isDark && { color: '#94A3B8' }]}>Correct</Text>
                  </View>

                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]} />
                    <Text style={[styles.legendText, isDark && { color: '#94A3B8' }]}>Incorrect</Text>
                  </View>

                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]} />
                    <Text style={[styles.legendText, isDark && { color: '#94A3B8' }]}>Unattempted</Text>
                  </View>

                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2563EB', borderColor: '#1D4ED8' }]} />
                    <Text style={[styles.legendText, isDark && { color: '#94A3B8' }]}>Active</Text>
                  </View>
                </View>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9'
  },
  // Header styles
  blackHeader: {
    height: 56,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14
  },
  blackHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  backBtn: {
    padding: 4,
    marginRight: 8
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'sans-serif'
  },
  blackHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  langToggleBtn: {
    marginRight: 14,
    padding: 4
  },
  langIconBg: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    borderColor: '#475569',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8
  },
  langIconText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 3
  },
  menuBtn: {
    padding: 6
  },
  menuLine: {
    width: 18,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1
  },
  // Tab Bar styles
  tabBar: {
    height: 48,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent'
  },
  tabButtonActive: {
    borderBottomColor: '#1E293B'
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'sans-serif'
  },
  tabButtonTextActive: {
    color: '#1E293B'
  },
  tabContentArea: {
    flex: 1
  },
  // Tab 1: Analysis Styles
  analysisScrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  analysisContentContainer: {
    padding: 16,
    paddingBottom: 32
  },
  reattemptBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  reattemptText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
    fontFamily: 'sans-serif'
  },
  reattemptIllustration: {
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 12
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.8
  },
  quickSummaryMeta: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  miniDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8
  },
  miniDropdownText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569'
  },
  cutoffLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8'
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 16
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 0.5
  },
  metricIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  metricDetails: {
    justifyContent: 'center'
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 2,
    fontFamily: 'sans-serif'
  },
  metricTotal: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600'
  },
  scoreBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 12
  },
  scoreBreakdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B'
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10
  },
  pillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6
  },
  pillText: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  challengeCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8
  },
  challengeLeft: {
    flex: 1,
    marginRight: 10
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#78350F'
  },
  challengeSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15
  },
  highFiveBg: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 12
  },
  // Redesigned Analysis Styles
  statusBannerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitleText: {
    fontSize: 14,
    fontWeight: '900',
  },
  statusDescText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  attemptSwitcherContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  attemptSwitcherLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 8,
  },
  attemptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attemptPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  attemptPillText: {
    fontSize: 11,
  },
  comparisonSliderCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  comparisonTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 14,
  },
  spectrumTrackBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    position: 'relative',
    marginVertical: 12,
  },
  spectrumMarker: {
    position: 'absolute',
    width: 3,
    height: 12,
    top: -3,
    borderRadius: 1.5,
  },
  spectrumProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  spectrumUserPin: {
    position: 'absolute',
    top: -6,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spectrumPinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  spectrumLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    fontSize: 10,
    color: '#64748B',
  },
  sectionalAnalysisCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionRowItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionRowTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  sectionRowScore: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionProgressBarBg: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 2.5,
    marginTop: 4,
    marginBottom: 6,
  },
  sectionProgressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  sectionRowMeta: {
    fontSize: 10,
    color: '#64748B',
  },
  // Tab 2: Solutions Styles
  solutionsContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  solToolbar: {
    height: 44,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  dropdownTriggerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#60A5FA'
  },
  filtersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  filtersBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    marginLeft: 4,
    textTransform: 'uppercase'
  },
  scrollNumbersRow: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8
  },
  circleRowContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6
  },
  circleNav: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0'
  },
  circleNavText: {
    fontSize: 12,
    fontWeight: '800'
  },
  circleNeutral: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1'
  },
  circleActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B'
  },
  circleCorrect: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC'
  },
  circleIncorrect: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5'
  },
  circleUnattempted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0'
  },
  qWorkspace: {
    flex: 1
  },
  qWorkspaceContent: {
    padding: 16
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 3,
    elevation: 0.5
  },
  questionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8
  },
  metaBadgeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  metaBadgeCircleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B'
  },
  metaText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8'
  },
  metaIcons: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 12
  },
  iconBtn: {
    padding: 2
  },
  questionCardBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    width: '100%',
  },
  questionCardBoxDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 0,
  },
  optionsContainer: {
    gap: 8,
    marginBottom: 16
  },
  optionCard: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  optionIndexLabel: {
    fontSize: 13,
    fontWeight: '800',
    fontStyle: 'italic',
    marginRight: 8,
    marginTop: 1
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1
  },
  viewSolutionBtnArea: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    marginTop: 8
  },
  viewSolutionBtn: {
    borderColor: '#2563EB',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  viewSolutionBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2563EB'
  },
  reattemptHint: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 14,
    paddingHorizontal: 8
  },
  explanationBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12
  },
  explanationTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  explanationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78350F',
    lineHeight: 17
  },
  solBottomBar: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  arrowKeysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  arrowKeyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  arrowKeyBtnDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    opacity: 0.5
  },
  questionCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B'
  },
  // Tab 3: Leaderboard Styles
  leaderboardScrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  leaderboardContentContainer: {
    padding: 16
  },
  leaderboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16
  },
  leaderboardHeader: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16
  },
  leaderboardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 8
  },
  leaderboardSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center'
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  leaderboardYouRow: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderBottomWidth: 0
  },
  leaderboardRankText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
    width: 32
  },
  topRankText: {
    color: '#D97706'
  },
  leaderboardNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155'
  },
  leaderboardScoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B'
  },
  // Modals Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalItemActive: {
    borderBottomColor: '#3B82F6'
  },
  modalItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  modalItemTextActive: {
    color: '#3B82F6',
    fontWeight: '800'
  },
  // Bug report modal
  reportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end'
  },
  reportModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14
  },
  reportTitleText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B'
  },
  reportContent: {
    paddingTop: 14
  },
  reportLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12
  },
  reportInput: {
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    marginBottom: 16
  },
  submitReportBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitReportText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  grayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8'
  },
  // Palette Drawer Overlay (Right Side Modal)
  paletteModalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  paletteBackdrop: {
    flex: 1,
  },
  paletteDrawerCard: {
    width: '84%',
    maxWidth: 360,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  paletteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paletteTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  paletteStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  paletteStatChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  paletteStatCount: {
    fontSize: 16,
    fontWeight: '900',
  },
  paletteStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  paletteSubLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  paletteSecPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paletteSecPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  paletteSecPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  paletteFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paletteFilterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  paletteFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  paletteGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
    paddingTop: 4,
  },
  paletteGridItem: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteGridItemText: {
    fontSize: 13,
    fontWeight: '700',
  },
  paletteLegendBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 8,
    marginBottom: 30,
  },
  paletteLegendTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  paletteLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  }
});
