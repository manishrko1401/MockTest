import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  FlatList,
  Alert,
  StatusBar,
  AppState,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Globe, Award, AlertCircle, Menu, Eye } from 'lucide-react-native';
import { ApiClient } from './api';
import { ThemeColors } from './theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface MobileTestScreenProps {
  currentUser: any;
  testId: string;
  onBack: () => void;
  onComplete: (submittedTestId?: string) => void;
  isDark?: boolean;
  examCatalog?: any[];
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

const instructionTexts = {
  en: {
    title: "Please read the instructions carefully",
    general: "General Instructions:",
    gen1: "1. The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.",
    gen2: "2. The Question Palette displayed on the right side of screen will show the status of each question using one of the 5 symbols.",
    gen3: "3. You can click on the character '>' arrow to collapse the question palette to maximize the question viewing area.",
    answering: "Navigating to a Question:",
    ans1: "4. To answer a question, select the radio button of one of the options and click 'Save & Next'.",
    ans2: "5. To change your answer, click on the 'Clear Response' button to reset the selection.",
    disclaimer: "I have read and understood all the instructions. All computer hardware allotted to me is in proper working condition. I agree that in case of any cheating or tab switching, the exam will be auto-submitted.",
    btn: "I am ready to begin"
  },
  hi: {
    title: "कृपया निर्देशों को ध्यान से पढ़ें",
    general: "सामान्य निर्देश:",
    gen1: "1. घड़ी सर्वर पर परीक्षा घड़ी के रूप में सेट की जाएगी। स्क्रीन के शीर्ष दाएं कोने में उलटी गिनती घड़ी आपके द्वारा परीक्षा पूरी करने के लिए उपलब्ध शेष समय को प्रदर्शित करेगी।",
    gen2: "2. स्क्रीन के दाईं ओर प्रदर्शित प्रश्न पैलेट 5 प्रतीकों में से किसी एक का उपयोग करके प्रत्येक प्रश्न की स्थिति को दर्शाएगा।",
    gen3: "3. प्रश्न देखने के क्षेत्र को अधिकतम करने के लिए आप प्रश्न पैलेट को बंद करने के लिए '>' तीर पर क्लिक कर सकते हैं।",
    answering: "प्रश्न पर नेविगेट करना:",
    ans1: "4. किसी प्रश्न का उत्तर देने के लिए, विकल्पों में से किसी एक को चुनें और 'Save & Next' पर क्लिक करें।",
    ans2: "5. अपना उत्तर बदलने के लिए, चयन को रीसेट करने के लिए 'Clear Response' बटन पर क्लिक करें।",
    disclaimer: "मैंने सभी निर्देशों को पढ़ और समझ लिया है। मुझे आवंटित सभी कंप्यूटर हार्डवेयर उचित कार्यशील स्थिति में हैं। मैं सहमत हूं कि किसी भी नकल या टैब स्विचिंग के मामले में, परीक्षा स्वतः सबमिट हो जाएगी।",
    btn: "मैं तैयार हूँ (I am ready to begin)"
  }
};

export default function MobileTestScreen({
  currentUser,
  testId,
  onBack,
  onComplete,
  isDark = false,
  examCatalog = []
}: MobileTestScreenProps) {
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Syncing sitting session...');
  const [totalDuration, setTotalDuration] = useState(3600);
  const [questions, setQuestions] = useState<MobileQuestion[]>([]);
  const [sections, setSections] = useState<MobileSection[]>([]);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0); // Index within current section

  const [timeLeft, setTimeLeft] = useState(3600); // 60 mins default
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [violationsCount, setViolationsCount] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const activeQuestionIdRef = useRef<string | null>(null);
  const isExitingRef = useRef(false);

  // Modern custom modal state
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: { text: string; onPress: () => void; style?: 'cancel' | 'default' | 'destructive' }[];
    isPauseModal?: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

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
          setModalConfig({
            visible: true,
            title: 'Exam Warning',
            message: `Leaving the app is a focus violation! This has been reported to the administrator. (Violations: ${next}/3)`,
            buttons: [
              {
                text: 'Understand',
                onPress: () => setModalConfig((prevVal) => ({ ...prevVal, visible: false })),
                style: 'default'
              }
            ]
          });
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

  useEffect(() => {
    const loadExamData = async () => {
      if (isExitingRef.current) return;
      setLoading(true);
      setLoadingText('Syncing sitting session...');
      
      // 1. Fetch questions from database
      const res = await ApiClient.getCustomQuestions(testId);
      let list: MobileQuestion[] = [];
      let secs: MobileSection[] = [];
      let durationSeconds = 3600;

      // Find test details in catalog to get correct duration
      let catalogTest: any = null;
      if (examCatalog && examCatalog.length > 0) {
        for (const cat of examCatalog) {
          for (const sub of cat.subCategories || []) {
            const found = (sub.tests || []).find((t: any) => t.id === testId);
            if (found) {
              catalogTest = found;
              break;
            }
          }
          if (catalogTest) break;
        }
      }

      if (catalogTest && catalogTest.durationMinutes) {
        durationSeconds = catalogTest.durationMinutes * 60;
      } else {
        // Fallbacks
        if (testId.includes('ssc')) {
          durationSeconds = 3600; // 60 mins
        } else if (testId.includes('rrb')) {
          durationSeconds = 5400; // 90 mins
        } else if (testId.includes('ctet')) {
          durationSeconds = 9000; // 150 mins
        } else if (testId.includes('ugc_net')) {
          durationSeconds = testId.includes('paper1') ? 3600 : 7200; // 60 or 120 mins
        }
      }

      setTotalDuration(durationSeconds);

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
                hi: { questionText: "A और B की वर्तमान आयु का अनुपात 4:5 है। 5 वर्ष बाद यह अनुपात 5:6 हो जाता है। A की वर्तमान आयु क्या है?", options: ["20 वर्ष", "25 वर्ष", "30 वर्ष", "15 years"] }
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
              respDict[qId].elapsedSeconds = val.elapsedSeconds ?? 0;
            }
          });
        }
      } else {
        setTimeLeft(durationSeconds);
      }

      // Mark the starting question as visited
      const activeSecQ = list.filter(q => q.sectionId === secs[0].id).sort((a,b)=>a.orderIndex - b.orderIndex);
      if (activeSecQ.length > 0) {
        const firstQId = activeSecQ[0].id;
        if (respDict[firstQId].state === 1) {
          respDict[firstQId].state = 2; // Visited (Not Answered)
        }
      }

      if (isExitingRef.current) return;
      setResponses(respDict);
      setLoading(false);
    };

    loadExamData();
  }, [testId, currentUser, examCatalog]);

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

      const qId = activeQuestionIdRef.current;
      if (qId) {
        setResponses((prev) => {
          const currentResp = prev[qId];
          if (!currentResp) return prev;
          return {
            ...prev,
            [qId]: {
              ...currentResp,
              elapsedSeconds: (currentResp.elapsedSeconds || 0) + 1
            }
          };
        });
      }
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

  // Sync activeQuestion.id with the ref to avoid stale closures in timer interval
  useEffect(() => {
    if (activeQuestion) {
      activeQuestionIdRef.current = activeQuestion.id;
    } else {
      activeQuestionIdRef.current = null;
    }
  }, [activeQuestion?.id]);

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
        setModalConfig({
          visible: true,
          title: 'Section Complete',
          message: 'You are on the last question. Open the palette drawer to submit or review.',
          buttons: [
            {
              text: 'OK',
              onPress: () => setModalConfig((prevVal) => ({ ...prevVal, visible: false })),
              style: 'default'
            }
          ]
        });
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

  const handleCancelInstructions = async () => {
    isExitingRef.current = true;
    setLoading(true);
    setLoadingText('Cancelling exam sitting...');
    try {
      await ApiClient.clearOngoingSession(currentUser.id, testId);
    } catch (err) {
      console.error("Failed to clear ongoing session:", err);
    }
    onBack();
  };

  const handlePauseAndExit = async () => {
    setIsTimerRunning(false);
    setModalConfig({
      visible: true,
      title: 'Test Paused',
      message: 'Your progress has been saved. You can resume this attempt anytime.',
      isPauseModal: true,
      buttons: [
        {
          text: 'Resume',
          onPress: () => {
            setModalConfig((prevVal) => ({ ...prevVal, visible: false }));
            setIsTimerRunning(true);
          },
          style: 'cancel'
        },
        {
          text: 'Back to Home Screen',
          onPress: async () => {
            isExitingRef.current = true;
            setModalConfig((prevVal) => ({ ...prevVal, visible: false }));
            setLoading(true);
            setLoadingText('Saving session progress...');
            await saveOngoingSessionState();
            onBack();
          },
          style: 'destructive'
        }
      ]
    });
  };

  // Submit assessment sittings
  const handleExamSubmit = async (forced = false) => {
    setIsTimerRunning(false);

    const performSubmission = async () => {
      setLoading(true);
      setLoadingText('Submitting your answers...');

      // Compute stats
      let correctCount = 0;
      let incorrectCount = 0;
      let unattemptedCount = 0;
      let totalMarks = 0;
      let totalMaxScore = 0;

      questions.forEach((q) => {
        const resp = responses[q.id];
        const selected = resp ? resp.selectedOptionIndex : null;
        const qSection = sections.find((s) => s.id === q.sectionId);
        const positiveMark = qSection ? qSection.positiveMark : 2;
        const negativeMark = qSection ? qSection.negativeMark : 0.5;

        totalMaxScore += positiveMark;

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
        maxScore: totalMaxScore,
        accuracy,
        durationSeconds: totalDuration - timeLeft,
        violations: violationsCount,
        responses: formattedResponses
      });

      setLoading(false);

      if (res.success) {
        setModalConfig({
          visible: true,
          title: forced ? 'Exam Submitted (Violation Limit)' : 'Exam Submitted Successfully',
          message: `Assessment summary:\nMarks scored: ${totalMarks.toFixed(1)}\nCorrect answers: ${correctCount}/${totalQs}\nAccuracy: ${accuracy.toFixed(1)}%`,
          buttons: [
            {
              text: 'View Performance',
              onPress: () => {
                setModalConfig((prevVal) => ({ ...prevVal, visible: false }));
                setLoading(true);
                setLoadingText('Generating performance analysis...');
                onComplete(testId);
              },
              style: 'default'
            }
          ]
        });
      } else {
        setModalConfig({
          visible: true,
          title: 'Submission Error',
          message: res.error || 'Check network connection.',
          buttons: [
            {
              text: 'OK',
              onPress: () => {
                setModalConfig((prevVal) => ({ ...prevVal, visible: false }));
                setIsTimerRunning(true);
              },
              style: 'default'
            }
          ]
        });
      }
    };

    if (forced) {
      await performSubmission();
    } else {
      setModalConfig({
        visible: true,
        title: 'Submit Mock Paper?',
        message: 'Are you sure you want to finish and submit your exam sheet now?',
        buttons: [
          {
            text: 'Cancel',
            onPress: () => {
              setModalConfig((prevVal) => ({ ...prevVal, visible: false }));
              setIsTimerRunning(true);
            },
            style: 'cancel'
          },
          {
            text: 'Submit Paper',
            onPress: () => {
              setModalConfig((prevVal) => ({ ...prevVal, visible: false }));
              performSubmission();
            },
            style: 'default'
          }
        ]
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={[styles.loadingText, isDark && { color: ThemeColors.dark.text }]}>{loadingText}</Text>
      </View>
    );
  }

  // Active question details
  const questionContent = activeQuestion?.content[lang];
  const questionText = questionContent?.questionText || '';
  const options = questionContent?.options || [];
  const activeResp = activeQuestion ? responses[activeQuestion.id] : null;

  if (showInstructions) {
    const t = instructionTexts[lang];
    
    let examName = "General Mock Test Assessment";
    if (testId.includes('ssc')) {
      examName = "SSC CGL 2026 - Tier-I Combined Graduate Level Exam";
    } else if (testId.includes('rrb') || testId.includes('railway')) {
      examName = "RRB NTPC CBT-1 Stage 1 Practice Simulator";
    } else if (testId.includes('ugc_net')) {
      examName = "UGC NET Paper-1 Teaching & Research Aptitude";
    } else if (testId.includes('ctet') || testId.includes('teaching')) {
      examName = "CTET 2026 Paper-I (Primary Class I-V) Mock Paper";
    }

    let maxMarks = 0;
    questions.forEach(q => {
      const qSec = sections.find(s => s.id === q.sectionId);
      maxMarks += qSec ? qSec.positiveMark : 2;
    });
    if (maxMarks === 0) maxMarks = 200;

    return (
      <SafeAreaView style={[styles.instContainer, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
        <StatusBar 
          barStyle={isDark ? 'light-content' : 'dark-content'} 
          backgroundColor={isDark ? ThemeColors.dark.headerBg : '#0F2942'} 
        />
        {/* Header */}
        <View style={[styles.instHeader, isDark && { backgroundColor: ThemeColors.dark.headerBg }]}>
          <Text style={styles.instHeaderTitle}>Instructions Panel</Text>
          <TouchableOpacity 
            style={[styles.instLangBtn, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]} 
            onPress={() => setLang(lang === 'en' ? 'hi' : 'en')}
          >
            <Globe size={13} color={isDark ? '#94A3B8' : '#4B5563'} />
            <Text style={[styles.instLangText, isDark && { color: '#94A3B8' }]}>
              {lang === 'en' ? 'Hindi' : 'English'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={styles.instScrollContent}>
          <Text style={[styles.instExamName, isDark && { color: '#FFF' }]}>{examName}</Text>
          
          {/* Metadata Row */}
          <View style={[styles.instMetaRow, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
            <View style={styles.instMetaItem}>
              <Text style={[styles.instMetaValue, isDark && { color: '#60A5FA' }]}>{Math.round(totalDuration / 60)} Mins</Text>
              <Text style={[styles.instMetaLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Duration</Text>
            </View>
            <View style={[styles.instMetaDivider, isDark && { backgroundColor: ThemeColors.dark.border }]} />
            <View style={styles.instMetaItem}>
              <Text style={[styles.instMetaValue, isDark && { color: '#60A5FA' }]}>{questions.length} Qs</Text>
              <Text style={[styles.instMetaLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Questions</Text>
            </View>
            <View style={[styles.instMetaDivider, isDark && { backgroundColor: ThemeColors.dark.border }]} />
            <View style={styles.instMetaItem}>
              <Text style={[styles.instMetaValue, isDark && { color: '#60A5FA' }]}>{maxMarks} Marks</Text>
              <Text style={[styles.instMetaLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Max Marks</Text>
            </View>
          </View>

          {/* Instructions Box */}
          <View style={[styles.instTextBox, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
            <Text style={[styles.instTextTitle, isDark && { color: '#60A5FA' }]}>{t.title}</Text>
            
            <Text style={[styles.instTextHeading, isDark && { color: ThemeColors.dark.text }]}>{t.general}</Text>
            <Text style={[styles.instTextBody, isDark && { color: ThemeColors.dark.textMuted }]}>{t.gen1}</Text>
            <Text style={[styles.instTextBody, isDark && { color: ThemeColors.dark.textMuted }]}>{t.gen2}</Text>
            <Text style={[styles.instTextBody, isDark && { color: ThemeColors.dark.textMuted }]}>{t.gen3}</Text>

            <Text style={[styles.instTextHeading, { marginTop: 14 }, isDark && { color: ThemeColors.dark.text }]}>{t.answering}</Text>
            <Text style={[styles.instTextBody, isDark && { color: ThemeColors.dark.textMuted }]}>{t.ans1}</Text>
            <Text style={[styles.instTextBody, isDark && { color: ThemeColors.dark.textMuted }]}>{t.ans2}</Text>
          </View>

          {/* Default Language Selector */}
          <View style={[styles.instLangSelectCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.instLangSelectTitle, isDark && { color: '#FFF' }]}>
                {lang === 'hi' ? 'अपनी डिफ़ॉल्ट परीक्षा भाषा चुनें' : 'Choose your default exam language'}
              </Text>
              <Text style={[styles.instLangSelectSub, isDark && { color: ThemeColors.dark.textMuted }]}>
                {lang === 'hi' ? 'कृपया प्रश्नों को हल करने के लिए डिफ़ॉल्ट भाषा चुनें' : 'Select the default language for viewing questions'}
              </Text>
            </View>
            <View style={styles.instSelectorContainer}>
              <TouchableOpacity
                style={[
                  styles.langSelectorOption,
                  lang === 'en' && styles.langSelectorOptionActive,
                  isDark && { borderColor: ThemeColors.dark.border }
                ]}
                onPress={() => setLang('en')}
              >
                <Text style={[styles.langSelectorText, lang === 'en' && styles.langSelectorTextActive, isDark && lang !== 'en' && { color: ThemeColors.dark.textMuted }]}>English</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.langSelectorOption,
                  lang === 'hi' && styles.langSelectorOptionActive,
                  isDark && { borderColor: ThemeColors.dark.border }
                ]}
                onPress={() => setLang('hi')}
              >
                <Text style={[styles.langSelectorText, lang === 'hi' && styles.langSelectorTextActive, isDark && lang !== 'hi' && { color: ThemeColors.dark.textMuted }]}>हिंदी</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Disclaimer Checkbox */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.checkboxContainer}
            onPress={() => setAgreed(!agreed)}
          >
            <View style={[
              styles.checkbox,
              agreed && styles.checkboxChecked,
              isDark && { borderColor: ThemeColors.dark.border },
              agreed && isDark && { backgroundColor: '#10B981', borderColor: '#10B981' }
            ]}>
              {agreed && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={[styles.checkboxLabel, isDark && { color: ThemeColors.dark.textMuted }]}>
              {t.disclaimer}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer controls */}
        <View style={[styles.instFooter, isDark && { backgroundColor: ThemeColors.dark.bottomNavBg, borderTopColor: ThemeColors.dark.bottomNavBorder }]}>
          <TouchableOpacity 
            style={[styles.instCancelBtn, isDark && { backgroundColor: '#0F172A', borderColor: '#334155' }]} 
            onPress={handleCancelInstructions}
          >
            <Text style={[styles.instCancelText, isDark && { color: ThemeColors.dark.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            disabled={!agreed}
            style={[
              styles.instStartBtn, 
              !agreed && styles.instStartBtnDisabled,
              agreed && isDark && { shadowColor: '#10B981' }
            ]} 
            onPress={() => {
              setShowInstructions(false);
              setIsTimerRunning(true);
            }}
          >
            <Text style={styles.instStartText}>{t.btn}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={isDark ? ThemeColors.dark.headerBg : '#0F2942'} 
      />

      {/* CBT Header */}
      <View style={[styles.examHeader, isDark && { backgroundColor: ThemeColors.dark.headerBg }]}>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.sectionsRow, isDark && { backgroundColor: ThemeColors.dark.card, borderBottomColor: ThemeColors.dark.border }]}>
        {sections.map((sec, idx) => (
          <TouchableOpacity
            key={sec.id}
            style={[
              styles.sectionTab, 
              isDark && { borderRightColor: ThemeColors.dark.border },
              currentSectionIdx === idx && styles.sectionTabActive,
              currentSectionIdx === idx && isDark && { backgroundColor: '#1E293B', borderBottomColor: '#60A5FA' }
            ]}
            onPress={() => {
              setCurrentSectionIdx(idx);
              setCurrentQuestionIdx(0);
            }}
          >
            <Text style={[
              styles.sectionTabText, 
              isDark && { color: ThemeColors.dark.textMuted },
              currentSectionIdx === idx && styles.sectionTabTextActive,
              currentSectionIdx === idx && isDark && { color: '#60A5FA' }
            ]}>
              {sec.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Question Panel */}
      <ScrollView style={[styles.questionContainer, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
        <View style={styles.questionMetaRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.questionIndexText, isDark && { color: '#60A5FA' }]}>QUESTION NO. {currentQuestionIdx + 1}</Text>
            <View style={[
              styles.questionTimerBadge,
              isDark ? { backgroundColor: '#1E293B', borderColor: '#334155' } : { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }
            ]}>
              <Text style={[styles.questionTimerText, isDark ? { color: '#94A3B8' } : { color: '#4B5563' }]}>
                ⏱ {formatTime(activeResp?.elapsedSeconds || 0)}
              </Text>
            </View>
          </View>
          {violationsCount > 0 && (
            <Text style={styles.violationWarning}>Violations: {violationsCount}/3</Text>
          )}
        </View>

        <Text style={[styles.questionBody, isDark && { color: ThemeColors.dark.text }]}>{questionText}</Text>

        {/* Options Radio Grid */}
        <View style={styles.optionsBlock}>
          {options.map((opt, i) => {
            const isSelected = activeResp?.tempOptionIndex === i;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.optionItem, 
                  isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border },
                  isSelected && styles.optionItemActive,
                  isSelected && isDark && { borderColor: '#60A5FA', backgroundColor: '#1E3A8A' }
                ]}
                onPress={() => handleSelectOption(i)}
              >
                <View style={[
                  styles.optionDot, 
                  isDark && { borderColor: ThemeColors.dark.border },
                  isSelected && styles.optionDotActive,
                  isSelected && isDark && { borderColor: '#60A5FA', backgroundColor: '#60A5FA' }
                ]} />
                <Text style={[
                  styles.optionText, 
                  isDark && { color: ThemeColors.dark.text },
                  isSelected && styles.optionTextActive,
                  isSelected && isDark && { color: '#FFF' }
                ]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Control Footer */}
      <View style={[styles.footer, isDark && { backgroundColor: ThemeColors.dark.bottomNavBg, borderTopColor: ThemeColors.dark.bottomNavBorder }]}>
        <TouchableOpacity style={[styles.secondaryBtn, isDark && { backgroundColor: '#0F172A', borderColor: '#334155' }]} onPress={handleMarkForReview}>
          <Text style={[styles.secondaryBtnText, isDark && { color: ThemeColors.dark.text }]}>Mark Review</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondaryBtn, isDark && { backgroundColor: '#0F172A', borderColor: '#334155' }]} onPress={handleClearResponse}>
          <Text style={[styles.secondaryBtnText, isDark && { color: ThemeColors.dark.text }]}>Clear</Text>
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
        <View style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.drawerSheet, isDark && { backgroundColor: ThemeColors.dark.card }]}>
            <View style={[styles.drawerHeader, isDark && { borderBottomColor: ThemeColors.dark.border }]}>
              <Text style={[styles.drawerTitle, isDark && { color: ThemeColors.dark.text }]}>TCS iON Question Palette</Text>
              <TouchableOpacity style={[styles.closeBtn, isDark && { backgroundColor: '#0F172A' }]} onPress={() => setDrawerVisible(false)}>
                <Text style={[styles.closeBtnText, isDark && { color: ThemeColors.dark.text }]}>✕ Close</Text>
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
                    <Text style={[styles.drawerSecName, isDark && { backgroundColor: '#0F172A', color: '#60A5FA' }]}>{sec.name}</Text>
                    <View style={styles.paletteGrid}>
                      {secQs.map((q, qIdx) => {
                        const resp = responses[q.id];
                        const qState = resp ? resp.state : 1;

                        let stateStyle: any = styles.pNotVisited;
                        let textStyle: any = styles.pTextDark;
                        let hasCheck = false;

                        switch (qState) {
                          case 2: // Not Answered
                            stateStyle = isDark ? [styles.pNotAnswered, { backgroundColor: '#7F1D1D' }] : styles.pNotAnswered;
                            textStyle = isDark ? [styles.pTextLight, { color: '#FFF' }] : styles.pTextLight;
                            break;
                          case 3: // Answered
                            stateStyle = isDark ? [styles.pAnswered, { backgroundColor: '#064E3B' }] : styles.pAnswered;
                            textStyle = isDark ? [styles.pTextLight, { color: '#FFF' }] : styles.pTextLight;
                            break;
                          case 4: // Marked
                            stateStyle = isDark ? [styles.pMarked, { backgroundColor: '#581C87' }] : styles.pMarked;
                            textStyle = isDark ? [styles.pTextLight, { color: '#FFF' }] : styles.pTextLight;
                            break;
                          case 5: // Answered & Marked
                            stateStyle = isDark ? [styles.pMarkedAnswered, { backgroundColor: '#581C87' }] : styles.pMarkedAnswered;
                            textStyle = isDark ? [styles.pTextLight, { color: '#FFF' }] : styles.pTextLight;
                            hasCheck = true;
                            break;
                          default:
                            stateStyle = isDark ? [styles.pNotVisited, { backgroundColor: '#334155' }] : styles.pNotVisited;
                            textStyle = isDark ? [styles.pTextDark, { color: '#94A3B8' }] : styles.pTextDark;
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

      {/* Modern Custom Modal for Alerts & Pause */}
      <Modal
        visible={modalConfig.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!modalConfig.isPauseModal) {
            setModalConfig((prev) => ({ ...prev, visible: false }));
          }
        }}
      >
        <View style={[
          styles.customModalOverlay,
          modalConfig.isPauseModal ? styles.customModalOverlayPaused : styles.customModalOverlayStandard
        ]}>
          <View style={[styles.modalContent, isDark && { backgroundColor: ThemeColors.dark.card }]}>
            {modalConfig.isPauseModal && (
              <View style={styles.pauseIconContainer}>
                <Text style={styles.pauseIconText}>⏸</Text>
              </View>
            )}
            <Text style={[styles.modalTitle, isDark && { color: ThemeColors.dark.text }]}>{modalConfig.title}</Text>
            <Text style={[styles.modalMessage, isDark && { color: ThemeColors.dark.textMuted }]}>{modalConfig.message}</Text>
            
            <View style={styles.modalButtonsContainer}>
              {modalConfig.buttons.map((btn, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  style={[
                    styles.modalButton,
                    btn.style === 'cancel' 
                      ? [styles.modalButtonCancel, isDark && { backgroundColor: '#0F172A', borderColor: '#334155' }] 
                      : btn.style === 'destructive' 
                        ? styles.modalButtonDestructive 
                        : styles.modalButtonDefault,
                    modalConfig.buttons.length > 1 && { minWidth: '45%' }
                  ]}
                  onPress={btn.onPress}
                >
                  <Text style={[
                    styles.modalButtonText,
                    btn.style === 'cancel' 
                      ? [styles.modalButtonTextCancel, isDark && { color: ThemeColors.dark.textMuted }] 
                      : styles.modalButtonTextDefault
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
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
  // Modern Custom Modal Styles
  customModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  customModalOverlayStandard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  customModalOverlayPaused: {
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  pauseIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pauseIconText: {
    fontSize: 24,
    color: '#3B82F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F2942',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  modalButtonsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  modalButton: {
    flex: 1,
    minWidth: 120,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonDefault: {
    backgroundColor: '#3B82F6',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtonDestructive: {
    backgroundColor: '#EF4444',
  },
  modalButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalButtonTextDefault: {
    color: '#FFF',
  },
  modalButtonTextCancel: {
    color: '#4B5563',
  },
  instContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  instHeader: {
    height: 56,
    backgroundColor: '#0F2942',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  instHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
  },
  instLangBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  instLangText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: 'bold',
  },
  instScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  instExamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F2942',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instMetaRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
    marginBottom: 16,
  },
  instMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  instMetaValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  instMetaLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  instMetaDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  instTextBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  instTextTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2563EB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
    marginBottom: 10,
  },
  instTextHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  instTextBody: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 16,
    marginBottom: 8,
    paddingLeft: 4,
  },
  instLangSelectCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  instLangSelectTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  instLangSelectSub: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  instSelectorContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  langSelectorOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  langSelectorOptionActive: {
    backgroundColor: '#3B82F6',
  },
  langSelectorText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: 'bold',
  },
  langSelectorTextActive: {
    color: '#FFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginVertical: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    height: 18,
    width: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxTick: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  instFooter: {
    height: 56,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
  },
  instCancelBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  instCancelText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: 'bold',
  },
  instStartBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    shadowColor: '#10B981',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  instStartBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  instStartText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  questionTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  questionTimerText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
});
