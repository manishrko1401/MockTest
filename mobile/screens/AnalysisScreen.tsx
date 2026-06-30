import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Bookmark
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
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQs, setLoadingQs] = useState(true);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [cardOffsets, setCardOffsets] = useState<Record<number, number>>({});
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Get the last 3 completed attempts for this specific test
  const testAttempts = React.useMemo(() => {
    return (currentUser?.testSessions || [])
      .filter((s: any) => s.testId === attempt.testId && (s.status === 'COMPLETED' || s.status === 'AUTO_SUBMITTED'))
      .sort((a: any, b: any) => {
        const dateA = new Date(a.startedAt || a.completedAt || 0).getTime();
        const dateB = new Date(b.startedAt || b.completedAt || 0).getTime();
        return dateB - dateA; // latest first
      })
      .slice(0, 3);
  }, [currentUser?.testSessions, attempt.testId]);

  // Find index of the current prop 'attempt' in testAttempts list, or default to 0
  const initialIndex = testAttempts.findIndex((x: any) => x.id === attempt.id);
  const [activeAttemptIndex, setActiveAttemptIndex] = useState(initialIndex !== -1 ? initialIndex : 0);

  // Synchronize index when attempt changes
  React.useEffect(() => {
    const newIdx = testAttempts.findIndex((x: any) => x.id === attempt.id);
    setActiveAttemptIndex(newIdx !== -1 ? newIdx : 0);
  }, [attempt.id, testAttempts]);

  // The active attempt to display on the screen
  const activeAttempt = testAttempts[activeAttemptIndex] || attempt;

  // Reconstruct deterministic student responses seed to align with the website
  let seed = 0;
  const seedString = (currentUser?.id || '') + (activeAttempt?.id || '');
  for (let i = 0; i < seedString.length; i++) {
    seed += seedString.charCodeAt(i);
  }

  // Modal bug report states
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [reportMessage, setReportMessage] = useState('');
  const [reporting, setReporting] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<number, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'incorrect' | 'overtime' | 'unattempted' | 'correct' | 'marked'>('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'incorrect', label: 'Incorrect' },
    { id: 'overtime', label: 'Overtime' },
    { id: 'unattempted', label: 'Unattempted' },
    { id: 'correct', label: 'Correct' },
    { id: 'marked', label: 'Marked' }
  ];

  const categoryCounts = React.useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let overtime = 0;
    let unattempted = 0;
    let marked = 0;

    questions.forEach((q, idx) => {
      const userResponse = activeAttempt.responses ? activeAttempt.responses[q.id] : null;
      const selectedIdx = userResponse ? userResponse.selectedOptionIndex : null;
      const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctIndex;
      
      const qId = q.id || '';
      const userTime = activeAttempt.responses?.[qId]?.elapsedSeconds ?? (15 + (seed + idx) % 75);
      const avgTime = 30 + (qId ? (qId.charCodeAt(qId.length - 1) % 5) : 0) * 15;

      const isCorrect = selectedIdx === correctIdx;
      const isUnattempted = selectedIdx === null;
      const isOvertime = userTime > avgTime;
      const isMarked = userResponse?.state === 4 || userResponse?.state === 5;

      if (isUnattempted) {
        unattempted++;
      } else if (isCorrect) {
        correct++;
      } else {
        incorrect++;
      }

      if (isOvertime) {
        overtime++;
      }
      if (isMarked) {
        marked++;
      }
    });

    return {
      all: questions.length,
      correct,
      incorrect,
      overtime,
      unattempted,
      marked,
    };
  }, [questions, activeAttempt, seed]);

  const filteredQuestions = React.useMemo(() => {
    return questions.map((q, idx) => ({ q, idx })).filter(({ q, idx }) => {
      if (selectedCategory === 'all') return true;

      const userResponse = activeAttempt.responses ? activeAttempt.responses[q.id] : null;
      const selectedIdx = userResponse ? userResponse.selectedOptionIndex : null;
      const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctIndex;

      const qId = q.id || '';
      const userTime = activeAttempt.responses?.[qId]?.elapsedSeconds ?? (15 + (seed + idx) % 75);
      const avgTime = 30 + (qId ? (qId.charCodeAt(qId.length - 1) % 5) : 0) * 15;

      const isCorrect = selectedIdx === correctIdx;
      const isUnattempted = selectedIdx === null;
      const isOvertime = userTime > avgTime;
      const isMarked = userResponse?.state === 4 || userResponse?.state === 5;

      if (selectedCategory === 'incorrect') {
        return !isUnattempted && !isCorrect;
      }
      if (selectedCategory === 'overtime') {
        return isOvertime;
      }
      if (selectedCategory === 'unattempted') {
        return isUnattempted;
      }
      if (selectedCategory === 'correct') {
        return isCorrect;
      }
      if (selectedCategory === 'marked') {
        return isMarked;
      }
      return true;
    });
  }, [questions, selectedCategory, activeAttempt, seed]);

  const toggleExplanation = (idx: number) => {
    setExpandedExplanations(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const isBookmarked = (qId: string) => {
    return (currentUser?.bookmarkedQuestions || []).some(
      (b: any) => b.testId === activeAttempt.testId && b.questionId === qId
    );
  };

  // Load test questions on mount to show solution explanations
  React.useEffect(() => {
    const fetchQuestions = async () => {
      setExpandedExplanations({});
      setSelectedCategory('all');
      setLoadingQs(true);

      // ── Step 1: Serve from device cache instantly ──────────────────────
      const cached = await getCachedQuestions(activeAttempt.testId);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setQuestions(cached.map((q: any, idx: number) => ({
          ...q,
          id: q.id || `q_custom_${idx}`
        })));
        setLoadingQs(false);

        // Silently refresh cache in background
        ApiClient.getCustomQuestions(activeAttempt.testId).then(res => {
          if (res.success && res.questions && Array.isArray(res.questions)) {
            saveQuestionsToCache(activeAttempt.testId, res.questions);
          }
        }).catch(() => {});
        return;
      }

      // ── Step 2: No cache — fetch from network, then save ──────────────
      const res = await ApiClient.getCustomQuestions(activeAttempt.testId);
      if (res.success && res.questions && Array.isArray(res.questions)) {
        const mappedQuestions = res.questions.map((q: any, idx: number) => ({
          ...q,
          id: q.id || `q_custom_${idx}`
        }));
        setQuestions(mappedQuestions);
        // Save to device for next open
        saveQuestionsToCache(activeAttempt.testId, res.questions);
      } else {
        // Fallback: Generate hardcoded default questions to review if no custom ones are found
        const fallbackList = activeAttempt.testId.includes('ssc') 
          ? [
              { id: "q_q1", textEn: "If x + 1/x = 5, then find the value of x² + 1/x².", optionsEn: ["23", "25", "27", "21"], correctIndex: 1, explanationEn: "x + 1/x = 5 => (x + 1/x)² = 25 => x² + 1/x² + 2 = 25 => x² + 1/x² = 23.", textHi: "यदि x + 1/x = 5 है, तो x² + 1/x² का मान ज्ञात कीजिए।", optionsHi: ["23", "25", "27", "21"], explanationHi: "x + 1/x = 5 => (x + 1/x)² = 25 => x² + 1/x² + 2 = 25 => x² + 1/x² = 23।" },
              { id: "q_q2", textEn: "The ratio of present ages of A and B is 4:5. After 5 years, the ratio becomes 5:6. What is A's present age?", optionsEn: ["20 years", "25 years", "30 years", "15 years"], correctIndex: 0, explanationEn: "Let age be 4k and 5k. (4k+5)/(5k+5) = 5/6 => 24k + 30 = 25k + 25 => k = 5. A = 4k = 20.", textHi: "A और B की वर्तमान आयु का अनुपात 4:5 है।", optionsHi: ["20 वर्ष", "25 वर्ष", "30 वर्ष", "15 वर्ष"], explanationHi: "माना आयु 4k और 5k है। k = 5. A = 20 वर्ष।" },
              { id: "q_r1", textEn: "Identify the pattern and choose the next term in the series: 3, 7, 15, 31, 63, ?", optionsEn: ["125", "126", "128", "127"], correctIndex: 3, explanationEn: "Rule is 2n + 1: 63*2+1 = 127.", textHi: "पैटर्न को पहचानें और श्रृंखला में अगला पद चुनें: 3, 7, 15, 31, 63, ?", optionsHi: ["125", "126", "128", "127"], explanationHi: "नियम 2n + 1 है: 63*2+1 = 127।" },
              { id: "q_e1", textEn: "Select the antonym for the word: OBSTINATE", optionsEn: ["Flexible", "Stubborn", "Rigid", "Dogmatic"], correctIndex: 0, explanationEn: "Obstinate means stubborn. Antonym is flexible.", textHi: "दिए गए शब्द का विलोम शब्द चुनें: OBSTINATE (हठी)", optionsHi: ["Flexible (लचीला)", "Stubborn (अड़ियल)", "Rigid (कठोर)", "Dogmatic (कट्टर)"], explanationHi: "Antonym of Obstinate is Flexible (लचीला)।" }
            ]
          : [
              { id: "q_gen1", textEn: "What is the unit of electric current?", optionsEn: ["Volt", "Ampere", "Ohm", "Watt"], correctIndex: 1, explanationEn: "Electric current is measured in Ampere.", textHi: "विद्युत धारा की इकाई क्या है?", optionsHi: ["वोल्ट", "एम्पीयर", "ओम", "वाट"], explanationHi: "विद्युत धारा की इकाई एम्पीयर है।" },
              { id: "q_gen2", textEn: "Which planet is known as the Red Planet?", optionsEn: ["Earth", "Mars", "Jupiter", "Saturn"], correctIndex: 1, explanationEn: "Mars has iron oxide on its surface giving it a reddish look.", textHi: "किस ग्रह को लाल ग्रह के नाम से जाना जाता है?", optionsHi: ["पृथ्वी", "मंगल", "बृहस्पति", "शनि"], explanationHi: "लोहे के ऑक्साइड के कारण मंगल ग्रह लाल दिखता है।" }
            ];
        setQuestions(fallbackList);
      }
      setLoadingQs(false);
    };

    fetchQuestions();
  }, [activeAttempt.testId]);

  const handleOpenReportModal = (question: any) => {
    setActiveQuestion(question);
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

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
      {/* Decorative Blur Orbs */}
      <View style={[styles.blurOrbLeft, isDark && { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]} />
      <View style={[styles.blurOrbRight, isDark && { backgroundColor: 'rgba(99, 102, 241, 0.08)' }]} />

      {/* Header */}
      <View style={[styles.header, isDark && { backgroundColor: ThemeColors.dark.headerBg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft color="#FFF" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Analytics Summary</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[testAttempts.length > 1 ? 3 : 2]}
      >
        {/* Attempts Navigator (Last 3 Attempts) */}
        {testAttempts.length > 1 && (
          <View style={[styles.attemptsNavigator, isDark ? { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border } : { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
            <TouchableOpacity 
              disabled={activeAttemptIndex >= testAttempts.length - 1} 
              onPress={() => setActiveAttemptIndex(activeAttemptIndex + 1)}
              style={styles.navArrowBtn}
            >
              <ChevronLeft size={20} color={activeAttemptIndex >= testAttempts.length - 1 ? (isDark ? '#475569' : '#D1D5DB') : (isDark ? '#60A5FA' : '#2563EB')} />
            </TouchableOpacity>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.navAttemptsText, isDark && { color: ThemeColors.dark.text }]}>
                Attempt {testAttempts.length - activeAttemptIndex} of {testAttempts.length}
              </Text>
              <Text style={[styles.navAttemptsSubtext, isDark && { color: ThemeColors.dark.textMuted }]}>
                {activeAttemptIndex === 0 ? 'Latest Attempt' : `Previous Attempt (${testAttempts.length - activeAttemptIndex})`}
              </Text>
            </View>

            <TouchableOpacity 
              disabled={activeAttemptIndex <= 0} 
              onPress={() => setActiveAttemptIndex(activeAttemptIndex - 1)}
              style={styles.navArrowBtn}
            >
              <ChevronRight size={20} color={activeAttemptIndex <= 0 ? (isDark ? '#475569' : '#D1D5DB') : (isDark ? '#60A5FA' : '#2563EB')} />
            </TouchableOpacity>
          </View>
        )}
        {/* Statistics Board */}
        <View style={[styles.card, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
          <Text style={[styles.cardTitle, isDark && { color: ThemeColors.dark.text }]}>{activeAttempt.title}</Text>
          <Text style={[styles.cardDate, isDark && { color: ThemeColors.dark.textMuted }]}>Submitted on: {activeAttempt.date}</Text>

          <View style={[styles.scoreRow, isDark && { borderColor: ThemeColors.dark.border }]}>
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreNum, isDark && { color: '#60A5FA' }]}>{activeAttempt.score.toFixed(1)} / {activeAttempt.maxScore.toFixed(0)}</Text>
              <Text style={[styles.scoreLabel, isDark && { color: ThemeColors.dark.textMuted }]}>My Score</Text>
            </View>
            <View style={[styles.divider, isDark && { backgroundColor: ThemeColors.dark.border }]} />
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreNum, isDark && { color: '#60A5FA' }]}>{activeAttempt.accuracy.toFixed(1)}%</Text>
              <Text style={[styles.scoreLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Accuracy</Text>
            </View>
            <View style={[styles.divider, isDark && { backgroundColor: ThemeColors.dark.border }]} />
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreNum, isDark && { color: '#60A5FA' }]}>
                {Math.floor(activeAttempt.durationSeconds / 60)}m {activeAttempt.durationSeconds % 60}s
              </Text>
              <Text style={[styles.scoreLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Duration</Text>
            </View>
          </View>
        </View>

        {/* Slide Navigator Category Filter (Pills) */}
        <View style={[styles.categoryContainer, isDark && { backgroundColor: 'transparent', borderBottomColor: ThemeColors.dark.border }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[
                  styles.categoryPill, 
                  selectedCategory === cat.id ? styles.categoryPillSelected : styles.categoryPillUnselected,
                  isDark && selectedCategory === cat.id && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
                  isDark && selectedCategory !== cat.id && { backgroundColor: '#16223F', borderColor: '#1F2E54' }
                ]}
                onPress={() => setSelectedCategory(cat.id as any)}
              >
                <Text style={[
                  styles.categoryPillText, 
                  selectedCategory === cat.id ? styles.categoryPillTextSelected : styles.categoryPillTextUnselected,
                  isDark && selectedCategory === cat.id && { color: '#FFF' },
                  isDark && selectedCategory !== cat.id && { color: '#9CA3AF' }
                ]}>
                  {cat.label} ({categoryCounts[cat.id as keyof typeof categoryCounts] || 0})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Question sliding navigator wrapper (sticks to top) */}
        <View style={[styles.stickyNavContainer, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
          {!loadingQs && questions.length > 0 && (
            <View style={[styles.navigationCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
              <Text style={[styles.navSectionTitle, isDark && { color: ThemeColors.dark.text }]}>Question Navigator</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navRow}>
                {filteredQuestions.map(({ q, idx }) => {
                  const userResponse = activeAttempt.responses ? activeAttempt.responses[q.id] : null;
                  const selectedIdx = userResponse ? userResponse.selectedOptionIndex : null;
                  const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctIndex;
                  const isCorrect = selectedIdx === correctIdx;
                  const isUnattempted = selectedIdx === null;

                  let circleStyle: any = isDark 
                    ? [styles.circleUnattempted, { backgroundColor: '#0B1329', borderColor: '#1F2E54' }] 
                    : styles.circleUnattempted;
                  let textStyle: any = isDark 
                    ? [styles.circleTextUnattempted, { color: ThemeColors.dark.textMuted }] 
                    : styles.circleTextUnattempted;
                  if (!isUnattempted) {
                    if (isCorrect) {
                      circleStyle = styles.circleCorrect;
                      textStyle = styles.circleTextCorrect;
                    } else {
                      circleStyle = styles.circleIncorrect;
                      textStyle = styles.circleTextIncorrect;
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={q.id || idx}
                      style={[styles.circle, circleStyle]}
                      onPress={() => {
                        const yOffset = cardOffsets[idx];
                        if (yOffset !== undefined && scrollViewRef.current) {
                          scrollViewRef.current.scrollTo({ y: Math.max(0, yOffset - 100), animated: true });
                        }
                      }}
                    >
                      <Text style={[styles.circleText, textStyle]}>{idx + 1}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Solutions Heading & Meta */}
        <View style={{ paddingHorizontal: 16, marginTop: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {selectedCategory === 'all' ? 'FULL TEST' : `${selectedCategory} QUESTIONS`}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#F1F5F9' : '#1E293B', marginTop: 2 }}>
              {filteredQuestions.length} {filteredQuestions.length === 1 ? 'Question' : 'Questions'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.langBtn, isDark && { backgroundColor: '#0B1329', borderColor: '#1F2E54' }]}
            onPress={() => setLang(lang === 'en' ? 'hi' : 'en')}
          >
            <Globe size={14} color={isDark ? '#60A5FA' : '#2563EB'} />
            <Text style={[styles.langBtnText, isDark && { color: '#60A5FA' }]}>{lang === 'en' ? 'Hindi (हिन्दी)' : 'English'}</Text>
          </TouchableOpacity>
        </View>

        {loadingQs ? (
          <Text style={[styles.loadingText, isDark && { color: ThemeColors.dark.textMuted }]}>Loading solution key explanations...</Text>
        ) : filteredQuestions.length === 0 ? (
          <View style={{ paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginVertical: 30 }}>
              No questions found in this category.
            </Text>
          </View>
        ) : (
          filteredQuestions.map(({ q, idx }) => {
            const userResponse = activeAttempt.responses ? activeAttempt.responses[q.id] : null;
            const selectedIdx = userResponse ? userResponse.selectedOptionIndex : null;
            const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctIndex;
            const isCorrect = selectedIdx === correctIdx;
            const isUnattempted = selectedIdx === null;

            const questionBodyText = lang === 'en' ? q.textEn || q.content?.en?.questionText : q.textHi || q.content?.hi?.questionText;
            const optionsList = lang === 'en' ? q.optionsEn || q.content?.en?.options : q.optionsHi || q.content?.hi?.options;
            const explanationText = lang === 'en' ? q.explanationEn || q.explanation?.en : q.explanationHi || q.explanation?.hi;

            // Individual and Average question timers
            const qId = q.id || '';
            const userTime = activeAttempt.responses?.[qId]?.elapsedSeconds ?? (15 + (seed + idx) % 75);
            const avgTime = 30 + (qId ? (qId.charCodeAt(qId.length - 1) % 5) : 0) * 15;

            return (
              <View 
                key={q.id || idx} 
                style={[styles.solutionCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}
                onLayout={(e) => {
                  const { y } = e.nativeEvent.layout;
                  setCardOffsets(prev => ({ ...prev, [idx]: y }));
                }}
              >
                <View style={styles.solCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.solIndex, isDark && { color: '#60A5FA' }]}>Question {idx + 1}</Text>
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      onPress={() => onToggleBookmark(activeAttempt.testId, q.id)}
                      style={{ padding: 4 }}
                    >
                      <Bookmark 
                        size={15} 
                        color={isBookmarked(q.id) ? '#F59E0B' : (isDark ? ThemeColors.dark.textMuted : '#9CA3AF')} 
                        fill={isBookmarked(q.id) ? '#F59E0B' : 'transparent'} 
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {isUnattempted ? (
                    <Text style={[styles.solBadge, styles.unattemptedBadge]}>UNATTEMPTED</Text>
                  ) : isCorrect ? (
                    <Text style={[styles.solBadge, styles.correctBadge]}>✓ CORRECT</Text>
                  ) : (
                    <Text style={[styles.solBadge, styles.incorrectBadge]}>✕ INCORRECT</Text>
                  )}
                </View>

                {/* Question individual vs average time stats */}
                <View style={[styles.timeSpentRow, isDark && { backgroundColor: '#0B1329', borderColor: ThemeColors.dark.border }]}>
                  <View style={styles.timeSpentItem}>
                    <Text style={[styles.timeSpentLabel, isDark && { color: ThemeColors.dark.textMuted }]}>My Time:</Text>
                    <Text style={[styles.timeSpentVal, isDark && { color: ThemeColors.dark.text }]}>{userTime}s</Text>
                  </View>
                  <View style={[styles.timeSpentDivider, isDark && { backgroundColor: ThemeColors.dark.border }]} />
                  <View style={styles.timeSpentItem}>
                    <Text style={[styles.timeSpentLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Avg Time:</Text>
                    <Text style={[styles.timeSpentVal, isDark && { color: ThemeColors.dark.text }]}>{avgTime}s</Text>
                  </View>
                </View>

                {/* Question Text */}
                <HtmlText style={styles.solBody} isDark={isDark} html={questionBodyText} />

                {/* Options List */}
                <View style={styles.optionsBlock}>
                  {optionsList?.map((opt: any, optIdx: number) => {
                    const optText = typeof opt === 'string' ? opt : opt.text;
                    const isCorrectOpt = optIdx === correctIdx;
                    const isSelectedOpt = optIdx === selectedIdx;

                    const optStyle: any = isCorrectOpt 
                      ? [styles.optItem, styles.optCorrect, isDark && { backgroundColor: '#064E3B', borderColor: '#059669' }] 
                      : (isSelectedOpt && !isCorrectOpt) 
                      ? [styles.optItem, styles.optIncorrect, isDark && { backgroundColor: '#7F1D1D', borderColor: '#DC2626' }] 
                      : [styles.optItem, isDark && { backgroundColor: '#0B1329', borderColor: '#1F2E54' }];

                    const dotStyle: any = isCorrectOpt 
                      ? [styles.optDot, { backgroundColor: '#10B981', borderColor: '#10B981' }] 
                      : (isSelectedOpt && !isCorrectOpt) 
                      ? [styles.optDot, { backgroundColor: '#DC2626', borderColor: '#DC2626' }] 
                      : [styles.optDot, isDark && { borderColor: '#475569' }];

                    return (
                      <View key={optIdx} style={optStyle}>
                        <View style={dotStyle} />
                        <HtmlText style={styles.optText} isDark={isDark} html={optText} />
                      </View>
                    );
                  })}
                </View>

                {/* Explanation */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleExplanation(idx)}
                  style={[styles.explanationBox, isDark && { backgroundColor: '#0B1329', borderColor: '#1F2E54' }]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.explanationTitle, isDark && { color: ThemeColors.dark.text }, { marginBottom: 0 }]}>Explanation:</Text>
                    {expandedExplanations[idx] ? (
                      <ChevronUp size={14} color={isDark ? ThemeColors.dark.textMuted : '#4B5563'} />
                    ) : (
                      <ChevronDown size={14} color={isDark ? ThemeColors.dark.textMuted : '#4B5563'} />
                    )}
                  </View>
                  {expandedExplanations[idx] && (
                    <HtmlText
                      style={[styles.explanationText, { marginTop: 6 }]}
                      isDark={isDark}
                      html={explanationText || 'Detailed explanation not provided.'}
                    />
                  )}
                </TouchableOpacity>

                {/* Report button */}
                <TouchableOpacity
                  style={styles.reportBtn}
                  onPress={() => handleOpenReportModal(q)}
                >
                  <Flag size={12} color={isDark ? ThemeColors.dark.textMuted : '#9CA3AF'} />
                  <Text style={[styles.reportBtnText, isDark && { color: ThemeColors.dark.textMuted }]}>Report Issue</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bug Report Modal */}
      <Modal
        visible={reportModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.modalContent, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && { color: ThemeColors.dark.text }]}>Report Question Bug</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X size={20} color={isDark ? ThemeColors.dark.textMuted : '#4B5563'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, isDark && { color: ThemeColors.dark.textMuted }]}>
              Help us correct errors in typing, translations, options, or answer keys.
            </Text>

            <TextInput
              style={[styles.modalInput, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder, color: ThemeColors.dark.text }]}
              placeholder="e.g. The options are missing in Hindi translator, or option 2 should be the correct answer..."
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
              value={reportMessage}
              onChangeText={setReportMessage}
              multiline={true}
              numberOfLines={4}
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleSubmitReport}
              disabled={reporting}
            >
              <Send size={14} color="#FFF" />
              <Text style={styles.modalSubmitBtnText}>
                {reporting ? 'Sending report...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cardDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    paddingTop: 16,
  },
  scoreBlock: {
    flex: 1,
    alignItems: 'center',
  },
  scoreNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  langSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  solutionsHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  langBtnText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  solutionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  solCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  solIndex: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  solBadge: {
    fontSize: 8,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  correctBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  incorrectBadge: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
  },
  unattemptedBadge: {
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
  },
  solBody: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 14,
  },
  optionsBlock: {
    gap: 8,
    marginBottom: 14,
  },
  optItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 10,
    gap: 10,
  },
  optCorrect: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  optIncorrect: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  optDot: {
    height: 12,
    width: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#9CA3AF',
  },
  optText: {
    fontSize: 12,
    color: '#374151',
  },
  explanationBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 10,
  },
  explanationTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  reportBtnText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginVertical: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  modalSubmitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalSubmitBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  timeSpentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  timeSpentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeSpentLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  timeSpentVal: {
    fontSize: 10,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  timeSpentDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#E5E7EB',
  },
  stickyNavContainer: {
    backgroundColor: '#F8FAFC',
    paddingBottom: 2,
    zIndex: 10,
  },
  navigationCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navSectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  navRow: {
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  circleCorrect: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  circleIncorrect: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  circleUnattempted: {
    backgroundColor: '#FFF',
    borderColor: '#9CA3AF',
  },
  circleText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  circleTextCorrect: {
    color: '#FFF',
  },
  circleTextIncorrect: {
    color: '#FFF',
  },
  circleTextUnattempted: {
    color: '#4B5563',
  },
  attemptsNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  navArrowBtn: {
    padding: 8,
    borderRadius: 8,
  },
  navAttemptsText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  navAttemptsSubtext: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  categoryContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryPillUnselected: {
    backgroundColor: '#EDF2F7',
    borderColor: '#E2E8F0',
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  categoryPillTextSelected: {
    color: '#FFFFFF',
  },
  categoryPillTextUnselected: {
    color: '#4A5568',
  },
});
