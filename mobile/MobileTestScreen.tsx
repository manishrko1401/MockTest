import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Dimensions,
  FlatList,
  Alert,
  StatusBar
} from 'react-native';

// Dimensions for responsive bottom drawer height
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// TYPES & MOCK DATA
// ============================================================================
interface TestSeries {
  id: string;
  title: string;
  category: string;
  totalTests: number;
  isPremium: boolean;
  enrolled: boolean;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  selectedOption: number | null;
  state: 1 | 2 | 3 | 4 | 5; // TCS iON 5-State Palette
}

const mockTestSeries: TestSeries[] = [
  { id: '1', title: 'SSC CGL Tier 1 Mock Package 2026', category: 'SSC Exams', totalTests: 45, isPremium: true, enrolled: true },
  { id: '2', title: 'SBI PO Full Length Mock Test Series', category: 'Banking', totalTests: 30, isPremium: true, enrolled: false },
  { id: '3', title: 'RRB NTPC Free Sectional Tests', category: 'Railways', totalTests: 15, isPremium: false, enrolled: true },
  { id: '4', title: 'UPSC Prelims CSAT Mock Test Paper', category: 'Civil Services', totalTests: 20, isPremium: true, enrolled: false },
];

const initialQuestions: Question[] = [
  { id: 'q1', text: 'Select the odd term out from the options:', options: ['Mercury', 'Venus', 'Mars', 'Moon'], selectedOption: null, state: 2 },
  { id: 'q2', text: 'A work is completed by 10 men in 15 days. In how many days can 15 men complete the same work?', options: ['12 days', '10 days', '8 days', '15 days'], selectedOption: null, state: 1 },
  { id: 'q3', text: 'Choose the correct synonym of: BENEVOLENT', options: ['Cruel', 'Kind-hearted', 'Greedy', 'Stingy'], selectedOption: null, state: 1 },
  { id: 'q4', text: 'What is the sum of angles of a regular hexagon?', options: ['540°', '720°', '900°', '360°'], selectedOption: null, state: 1 },
  { id: 'q5', text: 'In which year did the Constitution of India come into force?', options: ['1947', '1948', '1950', '1952'], selectedOption: null, state: 1 },
];

// ============================================================================
// MOBILE CONTAINER COMPONENT
// ============================================================================
export default function MobileTestScreen() {
  const [viewMode, setViewMode] = useState<'dashboard' | 'exam'>('dashboard');
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(1800); // 30 mins
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);

  // Timer Tick Hook
  useEffect(() => {
    if (viewMode !== 'exam') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleExamSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [viewMode]);

  const activeQuestion = questions[currentIndex];

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (optionIndex: number) => {
    const updated = [...questions];
    updated[currentIndex].selectedOption = optionIndex;
    setQuestions(updated);
  };

  // 1. SAVE & NEXT ACTION
  const handleSaveAndNext = () => {
    const updated = [...questions];
    const hasSelection = updated[currentIndex].selectedOption !== null;
    updated[currentIndex].state = hasSelection ? 3 : 2; // Answered (3) or Not Answered (2)
    setQuestions(updated);

    if (currentIndex < questions.length - 1) {
      // Mark next question as Visited (Not Answered) if Not Visited
      if (updated[currentIndex + 1].state === 1) {
        updated[currentIndex + 1].state = 2;
      }
      setCurrentIndex(currentIndex + 1);
    } else {
      Alert.alert('End of Section', 'You are on the last question. Use the palette drawer to submit or review.');
    }
  };

  // 2. CLEAR RESPONSE ACTION
  const handleClearResponse = () => {
    const updated = [...questions];
    updated[currentIndex].selectedOption = null;
    updated[currentIndex].state = 2; // Resets state to Not Answered
    setQuestions(updated);
  };

  // 3. MARK FOR REVIEW ACTION
  const handleMarkForReview = () => {
    const updated = [...questions];
    const hasSelection = updated[currentIndex].selectedOption !== null;
    updated[currentIndex].state = hasSelection ? 5 : 4; // Answered & Marked (5) or Marked for Review (4)
    setQuestions(updated);

    if (currentIndex < questions.length - 1) {
      if (updated[currentIndex + 1].state === 1) {
        updated[currentIndex + 1].state = 2;
      }
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    const updated = [...questions];
    // Revert current question if left untouched
    if (updated[currentIndex].state === 1) {
      updated[currentIndex].state = 2;
    }
    // Set target question to visited
    if (updated[index].state === 1) {
      updated[index].state = 2;
    }
    setQuestions(updated);
    setCurrentIndex(index);
    setDrawerVisible(false);
  };

  const handleExamSubmit = () => {
    let correct = 0;
    questions.forEach((q) => {
      // For demo, assume option index 1 is always the correct choice
      if ((q.state === 3 || q.state === 5) && q.selectedOption === 1) {
        correct++;
      }
    });

    Alert.alert(
      'Exam Submitted',
      `Performance Summary:\nCorrect Answers: ${correct}/${questions.length}\nAccuracy: ${((correct / questions.length) * 100).toFixed(1)}%`,
      [
        {
          text: 'Return to Dashboard',
          onPress: () => {
            setViewMode('dashboard');
            setQuestions(initialQuestions.map(q => ({ ...q, selectedOption: null, state: q.id === 'q1' ? 2 : 1 })));
            setCurrentIndex(0);
            setTimeLeft(1800);
          }
        }
      ]
    );
  };

  // ============================================================================
  // VIEW RENDERERS
  // ============================================================================

  if (viewMode === 'dashboard') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.dashHeader}>
          <Text style={styles.dashTitle}>Testbook Pass</Text>
          <Text style={styles.dashSub}>Premium Member • Valid for 365 Days</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Categories Grid */}
          <Text style={styles.sectionHeader}>Explore Test Series</Text>
          <View style={styles.categoriesRow}>
            {['SSC Exams', 'Banking', 'Railways', 'State PSC'].map((cat, i) => (
              <TouchableOpacity key={i} style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Test Series list */}
          <Text style={styles.sectionHeader}>My Active Enrolled Packages</Text>
          {mockTestSeries.map((item) => (
            <View key={item.id} style={styles.testCard}>
              <View style={styles.cardInfo}>
                <View style={styles.badgeRow}>
                  <Text style={styles.tagText}>{item.category}</Text>
                  {item.isPremium ? (
                    <Text style={[styles.badge, styles.premiumBadge]}>PRO</Text>
                  ) : (
                    <Text style={[styles.badge, styles.freeBadge]}>FREE</Text>
                  )}
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.totalTests} Total Tests • Syllabus Tracker Ready</Text>
              </View>

              <TouchableOpacity
                style={styles.cardBtn}
                onPress={() => {
                  setViewMode('exam');
                }}
              >
                <Text style={styles.cardBtnText}>Start Test</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Active Exam Simulator View
  return (
    <SafeAreaView style={styles.examContainer}>
      <StatusBar barStyle="light-content" />
      {/* Exam Header */}
      <View style={styles.examHeader}>
        <View>
          <Text style={styles.examTitle}>SSC CGL Tier 1 CBT</Text>
          <Text style={styles.examSubTitle}>Question {currentIndex + 1} of {questions.length}</Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      {/* Active Question Display */}
      <ScrollView style={styles.questionPanel}>
        <Text style={styles.questionIndex}>QUESTION NO. {currentIndex + 1}</Text>
        <Text style={styles.questionBody}>{activeQuestion.text}</Text>

        <View style={styles.optionsContainer}>
          {activeQuestion.options.map((opt, i) => {
            const isSelected = activeQuestion.selectedOption === i;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.optionBtn, isSelected && styles.optionBtnActive]}
                onPress={() => handleOptionSelect(i)}
              >
                <View style={[styles.optionDot, isSelected && styles.optionDotActive]} />
                <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Controllers */}
      <View style={styles.footerBar}>
        <TouchableOpacity style={styles.outlineButton} onPress={handleMarkForReview}>
          <Text style={styles.outlineButtonText}>Mark Review</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.outlineButton} onPress={handleClearResponse}>
          <Text style={styles.outlineButtonText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSaveAndNext}>
          <Text style={styles.primaryButtonText}>Save & Next</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Action Trigger for Question Drawer */}
      <TouchableOpacity style={styles.fab} onPress={() => setDrawerVisible(true)}>
        <Text style={styles.fabText}>📊 Palette</Text>
      </TouchableOpacity>

      {/* TCS iON Bottom Slide Drawer Overlay */}
      <Modal
        visible={drawerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerSheet}>
            
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>TCS iON Question Palette</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDrawerVisible(false)}>
                <Text style={styles.closeBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            {/* Shape Palette Grid */}
            <View style={styles.gridContent}>
              <FlatList
                data={questions}
                keyExtractor={(item) => item.id}
                numColumns={5}
                renderItem={({ item, index }) => {
                  let styleClass = styles.pNotVisited;
                  let textStyle = styles.pTextDark;
                  let checkMark = false;

                  switch (item.state) {
                    case 2: // Not Answered
                      styleClass = styles.pNotAnswered;
                      textStyle = styles.pTextLight;
                      break;
                    case 3: // Answered
                      styleClass = styles.pAnswered;
                      textStyle = styles.pTextLight;
                      break;
                    case 4: // Marked
                      styleClass = styles.pMarked;
                      textStyle = styles.pTextLight;
                      break;
                    case 5: // Answered & Marked
                      styleClass = styles.pMarkedAnswered;
                      textStyle = styles.pTextLight;
                      checkMark = true;
                      break;
                  }

                  const isActive = index === currentIndex;

                  return (
                    <TouchableOpacity
                      onPress={() => handleJumpToQuestion(index)}
                      style={[
                        styles.paletteCell,
                        styleClass,
                        isActive && { borderWidth: 2, borderColor: '#007AFF' }
                      ]}
                    >
                      <Text style={[styles.paletteText, textStyle]}>{index + 1}</Text>
                      {checkMark && <View style={styles.miniCheck}><Text style={styles.miniCheckText}>✓</Text></View>}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            {/* Form submission */}
            <View style={styles.drawerSubmitArea}>
              <TouchableOpacity style={styles.submitPaperBtn} onPress={handleExamSubmit}>
                <Text style={styles.submitPaperBtnText}>Submit Complete Paper</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES DEFINITION
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  dashHeader: {
    backgroundColor: '#0F2942',
    padding: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  dashTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  dashSub: {
    fontSize: 12,
    color: '#4ADE80',
    marginTop: 4,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#334155',
    marginVertical: 12,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  testCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  badge: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumBadge: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  freeBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginVertical: 4,
  },
  cardMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  cardBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  cardBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Exam Layout Styling
  examContainer: {
    flex: 1,
    backgroundColor: '#0F2942',
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2E587A',
  },
  examTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  examSubTitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  timerBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  timerText: {
    color: '#FBBF24',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  questionPanel: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  questionIndex: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563EB',
    letterSpacing: 1,
    marginBottom: 8,
  },
  questionBody: {
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 20,
  },
  optionsContainer: {
    marginBottom: 40,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFF',
  },
  optionBtnActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionDot: {
    height: 16,
    width: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#94A3B8',
    marginRight: 12,
  },
  optionDotActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  optionText: {
    fontSize: 13,
    color: '#334155',
  },
  optionTextActive: {
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  footerBar: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFF',
  },
  outlineButtonText: {
    color: '#334155',
    fontWeight: 'bold',
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    backgroundColor: '#1E3A8A',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Modal Sheet overlay
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F2942',
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeBtnText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  gridContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  paletteCell: {
    height: SCREEN_WIDTH * 0.13,
    width: SCREEN_WIDTH * 0.13,
    margin: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  paletteText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  pNotVisited: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
    borderWidth: 1,
  },
  pNotAnswered: {
    backgroundColor: '#C62828',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  pAnswered: {
    backgroundColor: '#2E7D32',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  pMarked: {
    backgroundColor: '#4527A0',
    borderRadius: 30,
  },
  pMarkedAnswered: {
    backgroundColor: '#4527A0',
    borderRadius: 30,
  },
  pTextDark: {
    color: '#334155',
  },
  pTextLight: {
    color: '#FFF',
  },
  miniCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#22C55E',
    borderRadius: 8,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  miniCheckText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  drawerSubmitArea: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  submitPaperBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitPaperBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
