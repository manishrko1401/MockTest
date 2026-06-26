import React, { useState, useEffect, useRef } from 'react';
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
  StatusBar,
  AppState,
  ActivityIndicator
} from 'react-native';
import { Globe, Award, AlertCircle, Menu, Eye } from 'lucide-react-native';
import { ApiClient } from './api';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface MobileTestScreenProps {
  currentUser: any;
  testId: string;
  onBack: () => void;
  onComplete: () => void;
}

// TCS iON status palette matching useTestEngine.tsx
// 1: NOT_VISITED (Gray)
// 2: NOT_ANSWERED (Red/Orange)
// 3: ANSWERED (Green)
// 4: MARKED_FOR_REVIEW (Purple)
// 5: ANSWERED_AND_MARKED_FOR_REVIEW (Purple with checkmark)
type PaletteState = 1 | 2 | 3 | 4 | 5;

interface MobileQuestion {
  id: string;
  sectionId: string;
  questionType: string;
  content: {
    en: { questionText: string; options: string[] };
    hi: { questionText: string; options: string[] };
  };
  correctOptionIndex: number;
  orderIndex: number;
}

interface MobileSection {
  id: string;
  name: string;
  orderIndex: number;
  positiveMark: number;
  negativeMark: number;
}

export default function MobileTestScreen({
  currentUser,
  testId,
  onBack,
  onComplete
}: MobileTestScreenProps) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<MobileQuestion[]>([]);
  const [sections, setSections] = useState<MobileSection[]>([]);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0); // Index within current section

  const [timeLeft, setTimeLeft] = useState(3600); // 60 mins default
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [violationsCount, setViolationsCount] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // User responses dictionary mapping questionId to state
  const [responses, setResponses] = useState<Record<string, {
    selectedOptionIndex: number | null;
    tempOptionIndex: number | null;
    state: PaletteState;
    elapsedSeconds: number;
  }>>({});

  // AppState monitoring for anti-cheat focus loss
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App went to background (cheating violation)
        setViolationsCount((prev) => {
          const next = prev + 1;
          Alert.alert(
            'Exam Warning',
            `Leaving the app is a focus violation! This has been reported to the administrator. (Violations: ${next}/3)`
          );
          if (next >= 3) {
            handleExamSubmit(true); // Force submit on 3 violations
          }
          return next;
        });
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Initialize Exam Session & Questions
  useEffect(() => {
    const loadExamData = async () => {
      setLoading(true);
      
      // 1. Fetch questions from database
      const res = await ApiClient.getCustomQuestions(testId);
      let list: MobileQuestion[] = [];
      let secs: MobileSection[] = [];
      let durationSeconds = 3600;

      const testTitle = testId.includes('ssc') ? 'SSC' : testId.includes('rrb') ? 'RRB' : 'Mock';

      if (res.success && res.questions && Array.isArray(res.questions) && res.questions.length > 0) {
        // Custom Questions
        const isRRB = testId.includes('rrb');
        const posMark = isRRB ? 1 : 2;
        const negMark = isRRB ? 0.33 : 0.5;

        secs = [{ id: 'sec_paper1', name: 'Mock Test Questions', orderIndex: 0, positiveMark: posMark, negativeMark: negMark }];
        list = res.questions.map((q: any, idx: number) => ({
          id: q.id || `q_custom_${idx}`,
          sectionId: 'sec_paper1',
          questionType: 'mcq',
          orderIndex: idx,
          correctOptionIndex: q.correctIndex !== undefined ? q.correctIndex : q.correctOptionIndex || 0,
          content: {
            en: {
              questionText: q.textEn || q.content?.en?.questionText || '',
              options: q.optionsEn || q.content?.en?.options || []
            },
            hi: {
              questionText: q.textHi || q.content?.hi?.questionText || '',
              options: q.optionsHi || q.content?.hi?.options || []
            }
          }
        }));
      } else {
        // Fallback static question bank mirroring useTestEngine seeds
        if (testId.includes('ssc')) {
          secs = [
            { id: "sec_quant", name: "Quantitative Aptitude", orderIndex: 0, positiveMark: 2, negativeMark: 0.5 },
            { id: "sec_reasoning", name: "General Intelligence & Reasoning", orderIndex: 1, positiveMark: 2, negativeMark: 0.5 },
            { id: "sec_english", name: "English Comprehension", orderIndex: 2, positiveMark: 2, negativeMark: 0.5 }
          ];
          list = [
            {
              id: "q_q1", sectionId: "sec_quant", questionType: "mcq", orderIndex: 0, correctOptionIndex: 1,
              content: {
                en: { questionText: "If x + 1/x = 5, then find the value of x² + 1/x².", options: ["23", "25", "27", "21"] },
                hi: { questionText: "यदि x + 1/x = 5 है, तो x² + 1/x² का मान ज्ञात कीजिए।", options: ["23", "25", "27", "21"] }
              }
            },
            {
              id: "q_q2", sectionId: "sec_quant", questionType: "mcq", orderIndex: 1, correctOptionIndex: 0,
              content: {
                en: { questionText: "The ratio of present ages of A and B is 4:5. After 5 years, the ratio becomes 5:6. What is A's present age?", options: ["20 years", "25 years", "30 years", "15 years"] },
                hi: { questionText: "A और B की वर्तमान आयु का अनुपात 4:5 है। 5 वर्ष बाद यह अनुपात 5:6 हो जाता है। A की वर्तमान आयु क्या है?", options: ["20 वर्ष", "25 वर्ष", "30 वर्ष", "15 वर्ष"] }
              }
            },
            {
              id: "q_r1", sectionId: "sec_reasoning", questionType: "mcq", orderIndex: 0, correctOptionIndex: 3,
              content: {
                en: { questionText: "Identify the pattern and choose the next term in the series: 3, 7, 15, 31, 63, ?", options: ["125", "126", "128", "127"] },
                hi: { questionText: "पैटर्न को पहचानें और श्रृंखला में अगला पद चुनें: 3, 7, 15, 31, 63, ?", options: ["125", "126", "128", "127"] }
              }
            },
            {
              id: "q_e1", sectionId: "sec_english", questionType: "mcq", orderIndex: 0, correctOptionIndex: 0,
              content: {
                en: { questionText: "Select the antonym for the word: OBSTINATE", options: ["Flexible", "Stubborn", "Rigid", "Dogmatic"] },
                hi: { questionText: "दिए गए शब्द का विलोम शब्द चुनें: OBSTINATE (हठी)", options: ["Flexible (लचीला)", "Stubborn (अड़ियल)", "Rigid (कठोर)", "Dogmatic (कट्टर)"] }
              }
            }
          ];
        } else {
          secs = [
            { id: "sec_paper1", name: "Aptitude & General Studies", orderIndex: 0, positiveMark: 2, negativeMark: 0.5 }
          ];
          list = [
            {
              id: "q_gen1", sectionId: "sec_paper1", questionType: "mcq", orderIndex: 0, correctOptionIndex: 1,
              content: {
                en: { questionText: "What is the unit of electric current?", options: ["Volt", "Ampere", "Ohm", "Watt"] },
                hi: { questionText: "विद्युत धारा की इकाई क्या है?", options: ["वोल्ट", "एम्पीयर", "ओम", "वाट"] }
              }
            },
            {
              id: "q_gen2", sectionId: "sec_paper1", questionType: "mcq", orderIndex: 1, correctOptionIndex: 1,
              content: {
                en: { questionText: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Saturn"] },
                hi: { questionText: "किस ग्रह को लाल ग्रह के नाम से जाना जाता है?", options: ["पृथ्वी", "मंगल", "बृहस्पति", "शनि"] }
              }
            }
          ];
        }
      }

      setQuestions(list);
      setSections(secs);

      // 2. Initialize responses state dictionary
      const respDict: Record<string, any> = {};
      list.forEach((q) => {
        respDict[q.id] = {
          selectedOptionIndex: null,
          tempOptionIndex: null,
          state: 1 as PaletteState,
          elapsedSeconds: 0
        };
      });

      // 3. Try to resume from backend ongoing sessions
      const ongoing = currentUser.testSessions?.find(
        (s: any) => s.testId === testId && s.status === 'ONGOING'
      );

      if (ongoing) {
        setTimeLeft(ongoing.timeRemaining ?? durationSeconds);
        setViolationsCount(ongoing.violations ?? 0);
        setCurrentSectionIdx(ongoing.currentSectionIndex ?? 0);
        setCurrentQuestionIdx(ongoing.currentQuestionIndex ?? 0);

        if (ongoing.responses) {
          Object.entries(ongoing.responses).forEach(([qId, val]: any) => {
            if (respDict[qId]) {
              respDict[qId].selectedOptionIndex = val.selectedOptionIndex;
              respDict[qId].tempOptionIndex = val.selectedOptionIndex;
              respDict[qId].state = val.selectedOptionIndex !== null ? 3 : 2;
            }
          });
        }
      }

      // Mark the starting question as visited
      const activeSecQ = list.filter(q => q.sectionId === secs[0].id).sort((a,b)=>a.orderIndex - b.orderIndex);
      if (activeSecQ.length > 0) {
        const firstQId = activeSecQ[0].id;
        if (respDict[firstQId].state === 1) {
          respDict[firstQId].state = 2; // Visited (Not Answered)
        }
      }

      setResponses(respDict);
      setLoading(false);
    };

    loadExamData();
  }, [testId, currentUser]);

  // Timer Tick hook
  useEffect(() => {
    if (loading || !isTimerRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleExamSubmit(true); // Auto-submit when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, isTimerRunning]);

  // Trigger auto-save every 15 seconds to sync state with shared database
  useEffect(() => {
    if (loading || !isTimerRunning) return;

    const autoSaveInterval = setInterval(() => {
      saveOngoingSessionState();
    }, 15000);

    return () => clearInterval(autoSaveInterval);
  }, [loading, isTimerRunning, currentSectionIdx, currentQuestionIdx, responses, timeLeft, violationsCount]);

  const activeSection = sections[currentSectionIdx];
  const sectionQuestions = activeSection
    ? questions
        .filter((q) => q.sectionId === activeSection.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
    : [];

  const activeQuestion = sectionQuestions[currentQuestionIdx];

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optIdx: number) => {
    if (!activeQuestion) return;
    setResponses((prev) => ({
      ...prev,
      [activeQuestion.id]: {
        ...prev[activeQuestion.id],
        tempOptionIndex: optIdx
      }
    }));
  };

  const handleSaveAndNext = () => {
    if (!activeQuestion) return;

    const currentResp = responses[activeQuestion.id];
    const isAnswered = currentResp.tempOptionIndex !== null;

    const updatedResponses = {
      ...responses,
      [activeQuestion.id]: {
        ...currentResp,
        selectedOptionIndex: currentResp.tempOptionIndex,
        state: (isAnswered ? 3 : 2) as PaletteState
      }
    };

    setResponses(updatedResponses);

    // Navigate to next question in section
    if (currentQuestionIdx < sectionQuestions.length - 1) {
      const nextQ = sectionQuestions[currentQuestionIdx + 1];
      if (updatedResponses[nextQ.id].state === 1) {
        updatedResponses[nextQ.id].state = 2; // mark visited
      }
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      // End of section, move to next section if available
      if (currentSectionIdx < sections.length - 1) {
        const nextSec = sections[currentSectionIdx + 1];
        const nextSecQs = questions.filter(q => q.sectionId === nextSec.id).sort((a,b)=>a.orderIndex - b.orderIndex);
        if (nextSecQs.length > 0 && updatedResponses[nextSecQs[0].id].state === 1) {
          updatedResponses[nextSecQs[0].id].state = 2;
        }
        setCurrentSectionIdx(currentSectionIdx + 1);
        setCurrentQuestionIdx(0);
      } else {
        Alert.alert('Section Complete', 'You are on the last question. Open the palette drawer to submit or review.');
      }
    }
  };

  const handleClearResponse = () => {
    if (!activeQuestion) return;
    setResponses((prev) => ({
      ...prev,
      [activeQuestion.id]: {
        ...prev[activeQuestion.id],
        tempOptionIndex: null,
        selectedOptionIndex: null,
        state: 2 // Visited, but not answered
      }
    }));
  };

  const handleMarkForReview = () => {
    if (!activeQuestion) return;

    const currentResp = responses[activeQuestion.id];
    const hasSelection = currentResp.tempOptionIndex !== null;

    const updatedResponses = {
      ...responses,
      [activeQuestion.id]: {
        ...currentResp,
        selectedOptionIndex: currentResp.tempOptionIndex,
        state: (hasSelection ? 5 : 4) as PaletteState
      }
    };

    setResponses(updatedResponses);

    if (currentQuestionIdx < sectionQuestions.length - 1) {
      const nextQ = sectionQuestions[currentQuestionIdx + 1];
      if (updatedResponses[nextQ.id].state === 1) {
        updatedResponses[nextQ.id].state = 2;
      }
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else if (currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx(currentSectionIdx + 1);
      setCurrentQuestionIdx(0);
    }
  };

  const handleJumpToQuestion = (secIdx: number, qIdx: number) => {
    const targetSection = sections[secIdx];
    const targetQs = questions
      .filter((q) => q.sectionId === targetSection.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const targetQ = targetQs[qIdx];

    setResponses((prev) => {
      const copy = { ...prev };
      if (copy[targetQ.id].state === 1) {
        copy[targetQ.id].state = 2;
      }
      return copy;
    });

    setCurrentSectionIdx(secIdx);
    setCurrentQuestionIdx(qIdx);
    setDrawerVisible(false);
  };

  // Sync state with database
  const saveOngoingSessionState = async () => {
    const formattedResponses: Record<string, any> = {};
    Object.entries(responses).forEach(([qId, val]) => {
      formattedResponses[qId] = {
        selectedOptionIndex: val.selectedOptionIndex,
        elapsedSeconds: val.elapsedSeconds
      };
    });

    await ApiClient.saveOngoingSession({
      userId: currentUser.id,
      testId,
      timeRemaining: timeLeft,
      violations: violationsCount,
      currentSectionIndex: currentSectionIdx,
      currentQuestionIndex: currentQuestionIdx,
      responses: formattedResponses
    });
  };

  const handlePauseAndExit = async () => {
    setIsTimerRunning(false);
    Alert.alert(
      'Pause sitting?',
      'Your exam states will be saved to the database. You can resume this attempt anytime.',
      [
        { text: 'Cancel', onPress: () => setIsTimerRunning(true), style: 'cancel' },
        {
          text: 'Save & Exit',
          onPress: async () => {
            setLoading(true);
            await saveOngoingSessionState();
            onBack();
          }
        }
      ]
    );
  };

  // Submit assessment sittings
  const handleExamSubmit = async (forced = false) => {
    setIsTimerRunning(false);

    const performSubmission = async () => {
      setLoading(true);

      // Compute stats
      let correctCount = 0;
      let incorrectCount = 0;
      let unattemptedCount = 0;
      let totalMarks = 0;

      questions.forEach((q) => {
        const resp = responses[q.id];
        const selected = resp ? resp.selectedOptionIndex : null;
        const qSection = sections.find((s) => s.id === q.sectionId);
        const positiveMark = qSection ? qSection.positiveMark : 2;
        const negativeMark = qSection ? qSection.negativeMark : 0.5;

        if (selected === null) {
          unattemptedCount++;
        } else if (selected === q.correctOptionIndex) {
          correctCount++;
          totalMarks += positiveMark;
        } else {
          incorrectCount++;
          totalMarks -= negativeMark;
        }
      });

      const totalQs = questions.length;
      const accuracy = totalQs > 0 ? (correctCount / (correctCount + incorrectCount || 1)) * 100 : 0;

      const formattedResponses: Record<string, any> = {};
      Object.entries(responses).forEach(([qId, val]) => {
        formattedResponses[qId] = {
          selectedOptionIndex: val.selectedOptionIndex,
          elapsedSeconds: val.elapsedSeconds
        };
      });

      const res = await ApiClient.addAttempt({
        userId: currentUser.id,
        testId,
        score: totalMarks,
        maxScore: totalQs * 2, // assume 2 marks max per question on average
        accuracy,
        durationSeconds: 3600 - timeLeft, // assuming 1 hr default test
        violations: violationsCount,
        responses: formattedResponses
      });

      setLoading(false);

      if (res.success) {
        Alert.alert(
          forced ? 'Exam Submitted (Violation Limit)' : 'Exam Submitted Successfully',
          `Assessment summary:\nMarks scored: ${totalMarks.toFixed(1)}\nCorrect answers: ${correctCount}/${totalQs}\nAccuracy: ${accuracy.toFixed(1)}%`,
          [{ text: 'View Performance', onPress: onComplete }]
        );
      } else {
        Alert.alert('Submission Error', res.error || 'Check network connection.');
        setIsTimerRunning(true);
      }
    };

    if (forced) {
      await performSubmission();
    } else {
      Alert.alert(
        'Submit Mock Paper?',
        'Are you sure you want to finish and submit your exam sheet now?',
        [
          { text: 'Cancel', onPress: () => setIsTimerRunning(true), style: 'cancel' },
          { text: 'Submit Paper', onPress: performSubmission }
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Syncing sitting session...</Text>
      </View>
    );
  }

  // Active question details
  const questionContent = activeQuestion?.content[lang];
  const questionText = questionContent?.questionText || '';
  const options = questionContent?.options || [];
  const activeResp = activeQuestion ? responses[activeQuestion.id] : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F2942" />

      {/* CBT Header */}
      <View style={styles.examHeader}>
        <TouchableOpacity style={styles.pauseBtn} onPress={handlePauseAndExit}>
          <Text style={styles.pauseBtnText}>⏸ Pause</Text>
        </TouchableOpacity>

        <View style={styles.timerBlock}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>

        <TouchableOpacity style={styles.langBtn} onPress={() => setLang(lang === 'en' ? 'hi' : 'en')}>
          <Globe size={14} color="#FFF" />
          <Text style={styles.langText}>{lang === 'en' ? 'Hindi' : 'English'}</Text>
        </TouchableOpacity>
      </View>

      {/* Section Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionsRow}>
        {sections.map((sec, idx) => (
          <TouchableOpacity
            key={sec.id}
            style={[styles.sectionTab, currentSectionIdx === idx && styles.sectionTabActive]}
            onPress={() => {
              setCurrentSectionIdx(idx);
              setCurrentQuestionIdx(0);
            }}
          >
            <Text style={[styles.sectionTabText, currentSectionIdx === idx && styles.sectionTabTextActive]}>
              {sec.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Question Panel */}
      <ScrollView style={styles.questionContainer}>
        <View style={styles.questionMetaRow}>
          <Text style={styles.questionIndexText}>QUESTION NO. {currentQuestionIdx + 1}</Text>
          {violationsCount > 0 && (
            <Text style={styles.violationWarning}>Violations: {violationsCount}/3</Text>
          )}
        </View>

        <Text style={styles.questionBody}>{questionText}</Text>

        {/* Options Radio Grid */}
        <View style={styles.optionsBlock}>
          {options.map((opt, i) => {
            const isSelected = activeResp?.tempOptionIndex === i;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.optionItem, isSelected && styles.optionItemActive]}
                onPress={() => handleSelectOption(i)}
              >
                <View style={[styles.optionDot, isSelected && styles.optionDotActive]} />
                <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Control Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleMarkForReview}>
          <Text style={styles.secondaryBtnText}>Mark Review</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleClearResponse}>
          <Text style={styles.secondaryBtnText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveAndNext}>
          <Text style={styles.primaryBtnText}>Save & Next</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Palette Trigger */}
      <TouchableOpacity style={styles.fab} onPress={() => setDrawerVisible(true)}>
        <Menu size={16} color="#FFF" />
        <Text style={styles.fabText}>Palette</Text>
      </TouchableOpacity>

      {/* TCS Palette Drawer Overlay */}
      <Modal
        visible={drawerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.drawerSheet}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>TCS iON Question Palette</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDrawerVisible(false)}>
                <Text style={styles.closeBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            {/* Shape palette list */}
            <ScrollView contentContainerStyle={styles.drawerScroll}>
              {sections.map((sec, secIdx) => {
                const secQs = questions
                  .filter((q) => q.sectionId === sec.id)
                  .sort((a, b) => a.orderIndex - b.orderIndex);

                return (
                  <View key={sec.id} style={styles.drawerSecGroup}>
                    <Text style={styles.drawerSecName}>{sec.name}</Text>
                    <View style={styles.paletteGrid}>
                      {secQs.map((q, qIdx) => {
                        const resp = responses[q.id];
                        const qState = resp ? resp.state : 1;

                        let stateStyle = styles.pNotVisited;
                        let textStyle = styles.pTextDark;
                        let hasCheck = false;

                        if (qState === 2) {
                          stateStyle = styles.pNotAnswered;
                          textStyle = styles.pTextLight;
                        } else if (qState === 3) {
                          stateStyle = styles.pAnswered;
                          textStyle = styles.pTextLight;
                        } else if (qState === 4) {
                          stateStyle = styles.pMarked;
                          textStyle = styles.pTextLight;
                        } else if (qState === 5) {
                          stateStyle = styles.pMarkedAnswered;
                          textStyle = styles.pTextLight;
                          hasCheck = true;
                        }

                        const isActive = currentSectionIdx === secIdx && currentQuestionIdx === qIdx;

                        return (
                          <TouchableOpacity
                            key={q.id}
                            style={[
                              styles.paletteCell,
                              stateStyle,
                              isActive && { borderWidth: 2, borderColor: '#007AFF' }
                            ]}
                            onPress={() => handleJumpToQuestion(secIdx, qIdx)}
                          >
                            <Text style={[styles.paletteCellText, textStyle]}>{qIdx + 1}</Text>
                            {hasCheck && (
                              <View style={styles.miniCheck}>
                                <Text style={styles.miniCheckText}>✓</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.submitPaperBtn} onPress={() => handleExamSubmit(false)}>
              <Text style={styles.submitPaperBtnText}>Submit Complete Paper</Text>
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
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 10,
    fontWeight: '600',
  },
  examHeader: {
    backgroundColor: '#0F2942',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pauseBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  pauseBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  timerBlock: {
    backgroundColor: '#1E3A8A',
    borderWidth: 1,
    borderColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  timerText: {
    color: '#FBBF24',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: 15,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  langText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionsRow: {
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  sectionTab: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  sectionTabActive: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 3,
    borderBottomColor: '#2563EB',
  },
  sectionTabText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  sectionTabTextActive: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  questionContainer: {
    flex: 1,
    padding: 16,
  },
  questionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionIndexText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  violationWarning: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  questionBody: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 20,
  },
  optionsBlock: {
    gap: 10,
    marginBottom: 40,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFF',
  },
  optionItemActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionDot: {
    height: 14,
    width: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    marginRight: 10,
  },
  optionDotActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  optionText: {
    fontSize: 13,
    color: '#374151',
  },
  optionTextActive: {
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  footer: {
    height: 56,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: 'bold',
  },
  primaryBtn: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 76,
    right: 16,
    backgroundColor: '#0F2942',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  fabText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
  },
  drawerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F2942',
  },
  closeBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  closeBtnText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: 'bold',
  },
  drawerScroll: {
    paddingVertical: 14,
  },
  drawerSecGroup: {
    marginBottom: 16,
  },
  drawerSecName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paletteCell: {
    height: SCREEN_WIDTH * 0.12,
    width: SCREEN_WIDTH * 0.12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  paletteCellText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  pNotVisited: {
    backgroundColor: '#E5E7EB',
  },
  pNotAnswered: {
    backgroundColor: '#FEE2E2',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  pAnswered: {
    backgroundColor: '#D1FAE5',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  pMarked: {
    backgroundColor: '#F3E8FF',
    borderRadius: 24,
  },
  pMarkedAnswered: {
    backgroundColor: '#F3E8FF',
    borderRadius: 24,
  },
  pTextDark: {
    color: '#374151',
  },
  pTextLight: {
    color: '#1F2937',
  },
  miniCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10B981',
    height: 12,
    width: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniCheckText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  submitPaperBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  submitPaperBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
