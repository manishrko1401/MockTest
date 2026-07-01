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
  Bookmark,
  Award,
  Trophy,
  User,
  Sun,
  ClipboardList,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle
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
  // Navigation / Tabs state: 'analysis' | 'solutions' | 'leaderboard'
  const [activeTab, setActiveTab] = useState<'analysis' | 'solutions' | 'leaderboard'>('analysis');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQs, setLoadingQs] = useState(true);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  
  // Re-attempt Mode states (Solutions Tab)
  const [reattemptMode, setReattemptMode] = useState(true);
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [selectedSection, setSelectedSection] = useState<string>('All Sections');

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

  const initialIndex = testAttempts.findIndex((x: any) => x.id === attempt.id);
  const [activeAttemptIndex, setActiveAttemptIndex] = useState(initialIndex !== -1 ? initialIndex : 0);

  useEffect(() => {
    const newIdx = testAttempts.findIndex((x: any) => x.id === attempt.id);
    setActiveAttemptIndex(newIdx !== -1 ? newIdx : 0);
  }, [attempt.id, testAttempts]);

  const activeAttempt = testAttempts[activeAttemptIndex] || attempt;

  // Stats calculation
  const totalQs = activeAttempt.questionsCount || activeAttempt.maxQuestions || 200;
  const maxScore = activeAttempt.maxScore || 200;
  
  // High fidelity fallback matching the screenshot
  const testbookRank = activeAttempt.testbookRank ?? 4886;
  const testbookTotalUsers = activeAttempt.mockTest?.testbookTotalUsers ?? activeAttempt.testbookTotalUsers ?? 5968;
  const scoreVal = activeAttempt.score ?? 0;
  const averageScore = activeAttempt.mockTest?.testbookAverageScore ?? activeAttempt.testbookAverageScore ?? 46.07;
  const bestScore = activeAttempt.mockTest?.testbookTopperScore ?? activeAttempt.testbookTopperScore ?? 188.75;
  const cutoffScoreStr = activeAttempt.mockTest?.testbookCutoffScore ? `${activeAttempt.mockTest.testbookCutoffScore}-${activeAttempt.mockTest.testbookCutoffScore + 3}` : '126-129';
  const percentileVal = activeAttempt.testbookPercentile ?? 18.15;
  const accuracyVal = activeAttempt.accuracy ?? 0;

  // Reconstruct deterministic student responses seed to align with website timers
  let seed = 0;
  const seedString = (currentUser?.id || '') + (activeAttempt?.id || '');
  for (let i = 0; i < seedString.length; i++) {
    seed += seedString.charCodeAt(i);
  }

  // Load questions
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoadingQs(true);
      const cached = await getCachedQuestions(activeAttempt.testId);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setQuestions(cached.map((q: any, idx: number) => ({
          ...q,
          id: q.id || `q_custom_${idx}`
        })));
        setLoadingQs(false);
        ApiClient.getCustomQuestions(activeAttempt.testId).then(res => {
          if (res.success && res.questions && Array.isArray(res.questions)) {
            saveQuestionsToCache(activeAttempt.testId, res.questions);
          }
        }).catch(() => {});
        return;
      }

      const res = await ApiClient.getCustomQuestions(activeAttempt.testId);
      if (res.success && res.questions && Array.isArray(res.questions)) {
        const mappedQuestions = res.questions.map((q: any, idx: number) => ({
          ...q,
          id: q.id || `q_custom_${idx}`
        }));
        setQuestions(mappedQuestions);
        saveQuestionsToCache(activeAttempt.testId, res.questions);
      } else {
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
      setLoadingQs(false);
    };

    fetchQuestions();
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
  }, [questions, activeAttempt]);

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
    <SafeAreaView style={styles.container}>
      {/* 1. BLACK TOP HEADER */}
      <View style={styles.blackHeader}>
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
          
          <TouchableOpacity style={styles.menuBtn} onPress={onBack}>
            <View style={styles.menuLine} />
            <View style={[styles.menuLine, { marginVertical: 4 }]} />
            <View style={styles.menuLine} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. SUB HEADER TAB BAR */}
      <View style={styles.tabBar}>
        {[
          { id: 'analysis', label: 'Analysis' },
          { id: 'solutions', label: 'Solutions' },
          { id: 'leaderboard', label: 'Leaderboard' }
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
            {/* Reattempt Test Banner */}
            <TouchableOpacity 
              style={styles.reattemptBanner} 
              onPress={() => {
                setReattemptMode(true);
                setActiveTab('solutions');
              }}
            >
              <Text style={styles.reattemptText}>Reattempt Test  →</Text>
              <View style={styles.reattemptIllustration}>
                <ClipboardList size={28} color="#DCE7FD" />
              </View>
            </TouchableOpacity>

            {/* Quick Summary Header with Section Switcher & Cutoff */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>QUICK SUMMARY</Text>
              
              <View style={styles.quickSummaryMeta}>
                <TouchableOpacity style={styles.miniDropdown}>
                  <Text style={styles.miniDropdownText}>General</Text>
                  <ChevronDown size={11} color="#475569" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
                <Text style={styles.cutoffLabel}>Cut off: {cutoffScoreStr}</Text>
              </View>
            </View>

            {/* Metric Cards */}
            <View style={styles.metricsGrid}>
              
              {/* Rank Card */}
              <View style={styles.metricCard}>
                <View style={[styles.metricIconBg, { backgroundColor: '#FEE2E2' }]}>
                  <Flag size={18} color="#EF4444" />
                </View>
                <View style={styles.metricDetails}>
                  <Text style={styles.metricLabel}>Rank</Text>
                  <Text style={styles.metricValue}>
                    {testbookRank}
                    <Text style={styles.metricTotal}>/{testbookTotalUsers}</Text>
                  </Text>
                </View>
              </View>

              {/* Score Card */}
              <View style={[styles.metricCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.metricIconBg, { backgroundColor: '#F3E8FF' }]}>
                    <Trophy size={18} color="#A855F7" />
                  </View>
                  <View style={[styles.metricDetails, { flex: 1 }]}>
                    <Text style={styles.metricLabel}>Score</Text>
                    <Text style={styles.metricValue}>
                      {scoreVal.toFixed(1)}
                      <Text style={styles.metricTotal}>/{maxScore.toFixed(0)}</Text>
                    </Text>
                  </View>
                </View>
                <View style={styles.scoreBreakdownRow}>
                  <Text style={styles.scoreBreakdownText}>Average Score: {averageScore.toFixed(2)}</Text>
                  <Text style={styles.scoreBreakdownText}>Best Score: {bestScore.toFixed(2)}</Text>
                </View>
              </View>

              {/* Percentile Card */}
              <View style={styles.metricCard}>
                <View style={[styles.metricIconBg, { backgroundColor: '#F3E8FF' }]}>
                  <User size={18} color="#A855F7" />
                </View>
                <View style={styles.metricDetails}>
                  <Text style={styles.metricLabel}>Percentile</Text>
                  <Text style={styles.metricValue}>{percentileVal.toFixed(2)} %</Text>
                </View>
              </View>

              {/* Accuracy Card */}
              <View style={styles.metricCard}>
                <View style={[styles.metricIconBg, { backgroundColor: '#DCFCE7' }]}>
                  <Sun size={18} color="#22C55E" />
                </View>
                <View style={styles.metricDetails}>
                  <Text style={styles.metricLabel}>Accuracy</Text>
                  <Text style={styles.metricValue}>{accuracyVal.toFixed(0)} %</Text>
                </View>
              </View>

              {/* Qs. Attempted Card */}
              <View style={[styles.metricCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.metricIconBg, { backgroundColor: '#DBEAFE' }]}>
                    <ClipboardList size={18} color="#3B82F6" />
                  </View>
                  <View style={[styles.metricDetails, { flex: 1 }]}>
                    <Text style={styles.metricLabel}>Qs. Attempted</Text>
                    <Text style={styles.metricValue}>
                      {statsCounts.correct + statsCounts.incorrect}
                      <Text style={styles.metricTotal}>/{totalQs}</Text>
                    </Text>
                  </View>
                </View>
                
                <View style={styles.pillsRow}>
                  <View style={[styles.pillItem, { backgroundColor: '#F0FDF4' }]}>
                    <View style={[styles.pillDot, { backgroundColor: '#22C55E' }]} />
                    <Text style={[styles.pillText, { color: '#166534' }]}>Correct: {statsCounts.correct}</Text>
                  </View>
                  <View style={[styles.pillItem, { backgroundColor: '#FEF2F2' }]}>
                    <View style={[styles.pillDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.pillText, { color: '#991B1B' }]}>Incorrect: {statsCounts.incorrect}</Text>
                  </View>
                  <View style={[styles.pillItem, { backgroundColor: '#F8FAFC' }]}>
                    <View style={[styles.pillDot, { backgroundColor: '#64748B' }]} />
                    <Text style={[styles.pillText, { color: '#334155' }]}>Unattempted: {statsCounts.unattempted}</Text>
                  </View>
                </View>
              </View>

            </View>

            {/* Challenge Friends Banner */}
            <View style={styles.challengeCard}>
              <View style={styles.challengeLeft}>
                <Text style={styles.challengeTitle}>Challenge Friends!</Text>
                <Text style={styles.challengeSub}>Invite your friends for a challenge & compare scores!</Text>
              </View>
              <View style={styles.highFiveBg}>
                <Award size={36} color="#FBBF24" />
              </View>
            </View>
          </ScrollView>
        )}

        {/* ==================== TAB 2: SOLUTIONS ==================== */}
        {activeTab === 'solutions' && (
          <View style={styles.solutionsContainer}>
            
            {/* Top Toolbar: Dropdown Switcher, Filters */}
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
                        onPress={() => {
                          setActiveQuestionIdx(idx);
                        }}
                      >
                        <Text style={[styles.circleNavText, { color: textCol }]}>{idx + 1}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Question Workspace Panel */}
            <ScrollView 
              style={styles.qWorkspace} 
              contentContainerStyle={styles.qWorkspaceContent}
              showsVerticalScrollIndicator={false}
            >
              {activeQuestion ? (
                <View style={styles.questionCard}>
                  
                  {/* Question stats details bar */}
                  <View style={styles.questionMetaRow}>
                    <View style={styles.metaBadgeCircle}>
                      <Text style={styles.metaBadgeCircleText}>{activeQuestionIdx + 1}</Text>
                    </View>
                    
                    <Text style={styles.metaText}>0sec</Text>
                    <Text style={[styles.metaText, { color: '#22C55E', fontWeight: 'bold' }]}>+1.0</Text>
                    <Text style={[styles.metaText, { color: '#EF4444', fontWeight: 'bold' }]}>-0.25</Text>

                    <View style={styles.metaIcons}>
                      <TouchableOpacity style={styles.iconBtn} onPress={handleOpenReportModal}>
                        <AlertTriangle size={17} color="#64748B" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.iconBtn}
                        onPress={() => onToggleBookmark(activeAttempt.testId, activeQuestion.id)}
                      >
                        <Bookmark 
                          size={17} 
                          color={isBookmarked(activeQuestion.id) ? '#F59E0B' : '#64748B'}
                          fill={isBookmarked(activeQuestion.id) ? '#F59E0B' : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Question Title */}
                  <HtmlText 
                    style={styles.questionText} 
                    isDark={isDark} 
                    html={lang === 'en' ? activeQuestion.textEn || activeQuestion.content?.en?.questionText : activeQuestion.textHi || activeQuestion.content?.hi?.questionText} 
                  />

                  {/* Options List */}
                  <View style={styles.optionsContainer}>
                    {(lang === 'en' ? activeQuestion.optionsEn || activeQuestion.content?.en?.options : activeQuestion.optionsHi || activeQuestion.content?.hi?.options)?.map((opt: any, optIdx: number) => {
                      const optText = typeof opt === 'string' ? opt : opt.text;
                      const correctIdx = activeQuestion.correctOptionIndex !== undefined ? activeQuestion.correctOptionIndex : activeQuestion.correctIndex;
                      
                      // Identify selected option in current reattempt or historical responses
                      const userResponse = activeAttempt.responses ? activeAttempt.responses[activeQuestion.id] : null;
                      const submittedIdx = userResponse ? userResponse.selectedOptionIndex : null;
                      
                      const isTempSelected = selectedOptions[activeQuestion.id] === optIdx;
                      const isSubmittedSelected = submittedIdx === optIdx;
                      
                      const isCorrectOpt = optIdx === correctIdx;
                      const isSolutionRevealed = !reattemptMode || revealedSolutions[activeQuestion.id];

                      let borderCol = '#E2E8F0';
                      let bgCol = '#FFFFFF';
                      let labelCol = '#64748B';

                      if (isSolutionRevealed) {
                        if (isCorrectOpt) {
                          borderCol = '#22C55E';
                          bgCol = '#F0FDF4';
                          labelCol = '#15803D';
                        } else if (reattemptMode ? isTempSelected : isSubmittedSelected) {
                          borderCol = '#EF4444';
                          bgCol = '#FEF2F2';
                          labelCol = '#B91C1C';
                        }
                      } else {
                        // Not revealed yet (Reattempt Mode on)
                        if (isTempSelected) {
                          borderCol = '#2563EB';
                          bgCol = '#EFF6FF';
                          labelCol = '#1D4ED8';
                        }
                      }

                      return (
                        <TouchableOpacity
                          key={optIdx}
                          disabled={isSolutionRevealed}
                          style={[styles.optionCard, { borderColor: borderCol, backgroundColor: bgCol }]}
                          onPress={() => {
                            setSelectedOptions(prev => ({ ...prev, [activeQuestion.id]: optIdx }));
                          }}
                        >
                          <Text style={[styles.optionIndexLabel, { color: labelCol }]}>
                            {optIdx + 1}.
                          </Text>
                          <HtmlText 
                            style={styles.optionText} 
                            isDark={isDark} 
                            html={optText} 
                          />
                          {isSolutionRevealed && isCorrectOpt && (
                            <CheckCircle2 size={16} color="#22C55E" style={{ marginLeft: 'auto' }} />
                          )}
                          {isSolutionRevealed && !isCorrectOpt && (reattemptMode ? isTempSelected : isSubmittedSelected) && (
                            <XCircle size={16} color="#EF4444" style={{ marginLeft: 'auto' }} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Solution block and explanations */}
                  {(!reattemptMode || revealedSolutions[activeQuestion.id]) ? (
                    <View style={styles.explanationBox}>
                      <Text style={styles.explanationTitle}>Explanation</Text>
                      <HtmlText 
                        style={styles.explanationText} 
                        isDark={isDark} 
                        html={lang === 'en' ? activeQuestion.explanationEn || activeQuestion.explanation?.en : activeQuestion.explanationHi || activeQuestion.explanation?.hi} 
                      />
                    </View>
                  ) : (
                    <View style={styles.viewSolutionBtnArea}>
                      <TouchableOpacity 
                        style={styles.viewSolutionBtn}
                        onPress={() => {
                          setRevealedSolutions(prev => ({ ...prev, [activeQuestion.id]: true }));
                        }}
                      >
                        <Text style={styles.viewSolutionBtnText}>View Solution</Text>
                      </TouchableOpacity>
                      
                      <Text style={styles.reattemptHint}>
                        Re-attempt mode is ON. Turn OFF the Re-attempt mode or re-attempt the question to see the solutions.
                      </Text>
                    </View>
                  )}

                </View>
              ) : (
                <View style={{ flex: 1, paddingVertical: 80, alignItems: 'center' }}>
                  <Text style={styles.grayText}>No question loaded.</Text>
                </View>
              )}
            </ScrollView>

            {/* Bottom Panel: Reattempt Mode toggle, Next arrow */}
            <View style={styles.solBottomBar}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Reattempt Mode</Text>
                <Switch
                  value={reattemptMode}
                  onValueChange={(val) => {
                    setReattemptMode(val);
                    if (!val) {
                      setRevealedSolutions({});
                    }
                  }}
                  trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                  thumbColor={reattemptMode ? '#2563EB' : '#F4F3F4'}
                />
              </View>

              <TouchableOpacity 
                style={styles.nextArrowBtn}
                onPress={() => {
                  if (activeQuestionIdx < filteredQuestions.length - 1) {
                    setActiveQuestionIdx(activeQuestionIdx + 1);
                  }
                }}
              >
                <ChevronRight size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== TAB 3: LEADERBOARD ==================== */}
        {activeTab === 'leaderboard' && (
          <ScrollView 
            style={styles.leaderboardScrollView} 
            contentContainerStyle={styles.leaderboardContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.leaderboardCard}>
              <View style={styles.leaderboardHeader}>
                <Trophy size={28} color="#FBBF24" />
                <Text style={styles.leaderboardTitle}>Rankings & Leaderboard</Text>
                <Text style={styles.leaderboardSub}>Compare your results with other students taking the test</Text>
              </View>
              
              {/* Dummy High-Fidelity Competitor rankings matching test statistics */}
              {[
                { name: 'Rohan Sharma', score: bestScore, rank: 1, isYou: false },
                { name: 'Ankita Verma', score: Math.round(bestScore * 0.95), rank: 2, isYou: false },
                { name: 'Kumar Gaurav', score: Math.round(bestScore * 0.90), rank: 3, isYou: false },
                { name: `${currentUser?.name || 'You'} (Self)`, score: scoreVal, rank: testbookRank, isYou: true },
                { name: 'Average Student', score: averageScore, rank: Math.round(testbookTotalUsers / 2), isYou: false }
              ].sort((a,b) => a.rank - b.rank).map((entry, idx) => (
                <View 
                  key={idx} 
                  style={[
                    styles.leaderboardRow, 
                    entry.isYou ? styles.leaderboardYouRow : null
                  ]}
                >
                  <Text style={[styles.leaderboardRankText, entry.rank <= 3 ? styles.topRankText : null]}>
                    #{entry.rank}
                  </Text>
                  
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.leaderboardNameText, entry.isYou ? { fontWeight: '900', color: '#1E3A8A' } : null]}>
                      {entry.name}
                    </Text>
                  </View>
                  
                  <Text style={styles.leaderboardScoreText}>
                    {entry.score.toFixed(1)} <Text style={{ fontSize: 10, color: '#64748B' }}>marks</Text>
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
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

    </SafeAreaView>
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
  questionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 16
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
    alignItems: 'center'
  },
  optionIndexLabel: {
    fontSize: 13,
    fontWeight: '800',
    fontStyle: 'italic',
    marginRight: 8
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B'
  },
  nextArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center'
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
  }
});
