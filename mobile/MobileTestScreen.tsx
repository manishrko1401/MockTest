import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  ActivityIndicator,
  TextInput,
  Animated,
  PanResponder,
  Platform,
  BackHandler
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Globe, AlignJustify, ShieldCheck, ChevronDown, Check, Moon, Sun, Clock } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { ApiClient, BASE_URL } from './api';
import { getCachedQuestions, saveQuestionsToCache } from './cache';
import { SpinningDotsLoader } from './SpinningDotsLoader';
import { ThemeColors } from './theme';
import { HtmlText, preloadImages } from './HtmlText';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Responsive scale helpers
const rs = (size: number) => Math.round(size * (SCREEN_WIDTH / 390));
const vs = (size: number) => Math.round(size * (SCREEN_HEIGHT / 844));

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
  positiveMark?: number;
  negativeMark?: number;
}

interface MobileSection {
  id: string;
  name: string;
  orderIndex: number;
  positiveMark: number;
  negativeMark: number;
  durationSeconds?: number; // Set when sectional timing is enabled
}

const instructionTexts = {
  en: {
    title: "Please read all instructions carefully before starting the examination",
    general: "General Instructions:",
    gen1: "1. The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.",
    gen2: "2. The Question Palette displayed on the right side of screen will show the status of each question using color symbols.",
    gen3: "3. You can click on the '>' arrow to collapse the question palette to maximize the question viewing area.",
    gen4: "4. Do not refresh or switch tabs during the exam. Any suspicious tab switches may result in auto-submission.",
    answering: "Navigating to & Answering a Question:",
    ans1: "5. To answer a question, select the radio button of one of the options and click 'Save & Next'.",
    ans2: "6. To change your answer, click on the 'Clear Response' button to reset the selection.",
    ans3: "7. To mark a question for review, click 'Mark for Review & Next'.",
    rpscTitle: "Special Instructions (RPSC RAS Mandatory-Attempt Rule):",
    rpsc1: "8. Unattempted questions after main exam time must be marked in the 10-minute extra time phase using Option (E) 'Leave Question Unattempted'.",
    rpsc2: "9. Failure to mark Option (E) for unattempted questions will attract a penalty of -0.44 negative marks per unattempted question.",
    disclaimer: "I have read and understood all the instructions. All computer hardware allotted to me is in proper working condition. I agree that in case of any cheating or tab switching, the exam will be auto-submitted.",
    btn: "I am ready to begin"
  },
  hi: {
    title: "परीक्षा शुरू करने से पहले कृपया सभी निर्देशों को ध्यान से पढ़ें",
    general: "सामान्य निर्देश:",
    gen1: "1. सर्वर घड़ी के अनुसार उलटी गिनती का समय स्क्रीन के ऊपरी दाएं कोने पर प्रदर्शित होगा।",
    gen2: "2. स्क्रीन के दाईं ओर प्रश्न पैलेट रंग प्रतीकों का उपयोग करके प्रत्येक प्रश्न की स्थिति दर्शाएगा।",
    gen3: "3. प्रश्न क्षेत्र को बड़ा करने के लिए आप '>' तीर पर क्लिक करके पैलेट छुपा सकते हैं।",
    gen4: "4. परीक्षा के दौरान पेज रीफ्रेश या टैब स्विच न करें। ऐसा करने पर परीक्षा स्वतः सबमिट हो सकती है।",
    answering: "प्रश्न पर जाना और उत्तर देना:",
    ans1: "5. उत्तर देने के लिए विकल्प चुनें और 'Save & Next' पर क्लिक करें।",
    ans2: "6. चयन बदलने के लिए 'Clear Response' पर क्लिक करके रीसेट करें।",
    ans3: "7. समीक्षा के लिए चिन्हित करने हेतु 'Mark for Review & Next' पर क्लिक करें।",
    rpscTitle: "विशेष निर्देश (RPSC RAS अनिवार्य प्रयास नियम):",
    rpsc1: "8. मुख्य समय समाप्त होने के बाद अनुत्तरित प्रश्नों के लिए 10 मिनट का अतिरिक्त समय मिलेगा, जिसमें विकल्प (E) 'प्रश्न अनुत्तरित छोड़ें' चुनना अनिवार्य है।",
    rpsc2: "9. अनुत्तरित प्रश्नों पर विकल्प (E) न चुनने पर प्रति प्रश्न -0.44 अंक का दंड लागू होगा।",
    disclaimer: "मैंने सभी निर्देशों को पढ़ और समझ लिया है। मुझे आवंटित सभी कंप्यूटर हार्डवेयर उचित कार्यशील स्थिति में हैं। मैं सहमत हूं कि किसी भी नकल या टैब स्विचिंग के मामले में परीक्षा स्वतः सबमिट हो जाएगी।",
    btn: "मैं तैयार हूँ (I am ready to begin)"
  }
};

const formatTime = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

interface QuestionCardItemProps {
  q: MobileQuestion;
  qIdx: number;
  lang: 'en' | 'hi';
  isDark: boolean;
  qResp: any;
  onSelectOption: (optionIdx: number, qId: string) => void;
  posMarkText: string;
  negMarkText: string;
}

const QuestionCardItem = React.memo<QuestionCardItemProps>(({
  q,
  qIdx,
  lang,
  isDark,
  qResp,
  onSelectOption,
  posMarkText,
  negMarkText,
}) => {
  const qContentEn = q?.content['en'];
  const qContentHi = q?.content['hi'];
  const qContent = lang === 'en'
    ? (qContentEn?.questionText ? qContentEn : qContentHi)
    : (qContentHi?.questionText ? qContentHi : qContentEn);
  const qText = qContent?.questionText || '';
  const qOptions = qContent?.options || [];

  return (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
      <ScrollView
        style={[styles.questionContainer, isDark && { backgroundColor: ThemeColors.dark.bg }]}
        contentContainerStyle={styles.questionContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Question sub-header bar (website style) */}
        <View style={[styles.qSubHeaderBar, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
          <Text style={[styles.qTypeText, isDark && { color: '#60A5FA' }]}>Question Type: MCQ</Text>
          <View style={styles.qMarksRow}>
            <View style={styles.posMarkBadge}>
              <Text style={styles.posMarkText}>{posMarkText}</Text>
            </View>
            <View style={styles.negMarkBadge}>
              <Text style={styles.negMarkText}>{negMarkText}</Text>
            </View>
          </View>
        </View>

        {/* Question number header row */}
        <View style={styles.questionHeaderRow}>
          {/* Blue number badge */}
          <View style={styles.questionNumBadge}>
            <Text style={styles.questionNumText}>
              {lang === 'hi' ? 'प्रश्न ' : 'Q. '}{qIdx + 1}
            </Text>
          </View>
          {/* Per-question time spent */}
          <View style={[styles.qTimerPill, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
            <Text style={[styles.qTimerIcon, isDark && { color: '#94A3B8' }]}>Q Time:</Text>
            <Text style={[styles.qTimerVal, isDark && { color: '#3B82F6' }]}>{formatTime(qResp?.elapsedSeconds || 0)}</Text>
          </View>
        </View>

        {/* Website-identical Question Text Box */}
        <View style={[styles.questionCardBox, isDark && styles.questionCardBoxDark]}>
          <HtmlText
            style={[styles.questionBody, isDark && { color: ThemeColors.dark.text }]}
            isDark={isDark}
            html={qText}
          />
        </View>

        {/* Options as numbered cards */}
        <View style={styles.optionsBlock}>
          {qOptions.map((opt, i) => {
            const isSelected = qResp?.tempOptionIndex === i;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.75}
                style={[
                  styles.optionCard,
                  isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border },
                  isSelected && styles.optionCardSelected,
                  isSelected && isDark && { borderColor: '#3B82F6', backgroundColor: '#1E3A8A' },
                ]}
                onPress={() => onSelectOption(i, q.id)}
              >
                <View style={[
                  styles.optionNumCircle,
                  isDark && { borderColor: '#475569' },
                  isSelected && styles.optionNumCircleSelected,
                ]}>
                  <Text style={[styles.optionNumText, isSelected && styles.optionNumTextSelected]}>
                    {i + 1}
                  </Text>
                </View>
                <HtmlText
                  style={[styles.optionText, isDark && { color: ThemeColors.dark.text }, isSelected && styles.optionTextSelected]}
                  isDark={isDark}
                  html={opt}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}, (prev, next) => {
  return (
    prev.q.id === next.q.id &&
    prev.qIdx === next.qIdx &&
    prev.lang === next.lang &&
    prev.isDark === next.isDark &&
    prev.posMarkText === next.posMarkText &&
    prev.negMarkText === next.negMarkText &&
    prev.qResp?.tempOptionIndex === next.qResp?.tempOptionIndex &&
    prev.qResp?.elapsedSeconds === next.qResp?.elapsedSeconds
  );
});

export default function MobileTestScreen({
  currentUser,
  testId,
  onBack,
  onComplete,
  isDark = false,
  examCatalog = []
}: MobileTestScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Syncing sitting session...');
  const [totalDuration, setTotalDuration] = useState(3600);
  const [hasSectionalTiming, setHasSectionalTiming] = useState(false);
  const [questions, setQuestions] = useState<MobileQuestion[]>([]);
  const [sections, setSections] = useState<MobileSection[]>([]);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0); // Index within current section

  const [timeLeft, setTimeLeft] = useState(3600); // 60 mins default
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [violationsCount, setViolationsCount] = useState(0);
  const [requestingUpload, setRequestingUpload] = useState(false);
  const [isRequested, setIsRequested] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(`requested_upload_${testId}`).then(val => {
      if (val === 'true') setIsRequested(true);
    }).catch(() => {});
  }, [testId]);

  const handleRequestUpload = async () => {
    if (requestingUpload || isRequested) return;
    setRequestingUpload(true);
    try {
      await ApiClient.submitSuggestion({
        userId: currentUser?.id || 'guest_mobile',
        name: currentUser?.name || 'Mobile App Candidate',
        email: currentUser?.email || 'guest@app.com',
        category: 'Test Upload Request',
        message: `Request to upload questions for test: ${mockTestTitle || 'Mock Test'} (Test ID: ${testId})`,
        source: 'app'
      });
      setIsRequested(true);
      await AsyncStorage.setItem(`requested_upload_${testId}`, 'true');
      Alert.alert('Request Received 🚀', 'Your upload request for this test has been submitted to the admin suggestion box!');
    } catch (err) {
      setIsRequested(true);
      Alert.alert('Request Received 🚀', 'Your upload request for this test has been submitted to the admin suggestion box!');
    } finally {
      setRequestingUpload(false);
    }
  };
  const [websiteRating, _setWebsiteRating] = useState(0);
  const [examRating, _setExamRating] = useState(0);
  const [feedbackText, _setFeedbackText] = useState("");

  const websiteRatingRef = useRef(0);
  const examRatingRef = useRef(0);
  const feedbackTextRef = useRef("");

  const appRatingGoldenBlink = useRef(new Animated.Value(0)).current;
  const examRatingGoldenBlink = useRef(new Animated.Value(0)).current;

  const triggerRatingBlink = (blinkApp: boolean, blinkExam: boolean) => {
    const anims: Animated.CompositeAnimation[] = [];
    if (blinkApp) {
      appRatingGoldenBlink.setValue(0);
      anims.push(
        Animated.sequence([
          Animated.timing(appRatingGoldenBlink, { toValue: 1, duration: 160, useNativeDriver: false }),
          Animated.timing(appRatingGoldenBlink, { toValue: 0, duration: 160, useNativeDriver: false }),
          Animated.timing(appRatingGoldenBlink, { toValue: 1, duration: 160, useNativeDriver: false }),
          Animated.timing(appRatingGoldenBlink, { toValue: 0, duration: 160, useNativeDriver: false }),
          Animated.timing(appRatingGoldenBlink, { toValue: 1, duration: 180, useNativeDriver: false }),
          Animated.timing(appRatingGoldenBlink, { toValue: 0, duration: 250, useNativeDriver: false }),
        ])
      );
    }
    if (blinkExam) {
      examRatingGoldenBlink.setValue(0);
      anims.push(
        Animated.sequence([
          Animated.timing(examRatingGoldenBlink, { toValue: 1, duration: 160, useNativeDriver: false }),
          Animated.timing(examRatingGoldenBlink, { toValue: 0, duration: 160, useNativeDriver: false }),
          Animated.timing(examRatingGoldenBlink, { toValue: 1, duration: 160, useNativeDriver: false }),
          Animated.timing(examRatingGoldenBlink, { toValue: 0, duration: 160, useNativeDriver: false }),
          Animated.timing(examRatingGoldenBlink, { toValue: 1, duration: 180, useNativeDriver: false }),
          Animated.timing(examRatingGoldenBlink, { toValue: 0, duration: 250, useNativeDriver: false }),
        ])
      );
    }
    if (anims.length > 0) {
      Animated.parallel(anims).start();
    }
  };

  const triggerRatingBlinkRef = useRef(triggerRatingBlink);
  triggerRatingBlinkRef.current = triggerRatingBlink;

  const setWebsiteRating = (val: number) => {
    _setWebsiteRating(val);
    websiteRatingRef.current = val;
  };
  const setExamRating = (val: number) => {
    _setExamRating(val);
    examRatingRef.current = val;
  };
  const setFeedbackText = (val: string) => {
    _setFeedbackText(val);
    feedbackTextRef.current = val;
  };
  const [mockTestTitle, setMockTestTitle] = useState("");
  const [drawerMounted, setDrawerMounted] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(SCREEN_WIDTH * 0.82)).current;
  const overlayOpacity = drawerAnimation.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.82],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  const openDrawer = () => {
    setDrawerSectionIdx(currentSectionIdx);
    setDrawerMounted(true);
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnimation, {
      toValue: SCREEN_WIDTH * 0.82,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setDrawerMounted(false);
      }
    });
  };

  useEffect(() => {
    if (drawerMounted) {
      Animated.timing(drawerAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [drawerMounted]);

  const [drawerTab, setDrawerTab] = useState<'symbols' | 'instructions'>('symbols');
  const [drawerSectionIdx, setDrawerSectionIdx] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [ctetDefaultLang, setCtetDefaultLang] = useState<string>('');
  const [ctetLang1, setCtetLang1] = useState<string>('');
  const [ctetLang2, setCtetLang2] = useState<string>('');
  const [ctetAgreed, setCtetAgreed] = useState<boolean>(false);
  const [ctetDefaultLangModal, setCtetDefaultLangModal] = useState<boolean>(false);
  const [ctetLang1Modal, setCtetLang1Modal] = useState<boolean>(false);
  const [ctetLang2Modal, setCtetLang2Modal] = useState<boolean>(false);
  const rawQuestionsRef = useRef<any[]>([]);
  const activeQuestionIdRef = useRef<string | null>(null);
  const isExitingRef = useRef(false);

  // Refs to avoid stale closures inside the timer setInterval
  const sectionsRef = useRef<MobileSection[]>([]);
  const questionsRef = useRef<MobileQuestion[]>([]);
  const totalDurationRef = useRef<number>(3600);
  const hasSectionalTimingRef = useRef<boolean>(false);
  const currentSectionIdxRef = useRef<number>(0);

  // Live refs for AppState handler (avoids stale closure — always reflects latest state)
  const responsesRef = useRef<Record<string, any>>({});
  const timeLeftRef = useRef<number>(3600);
  const violationsCountRef = useRef<number>(0);
  const currentSectionIdxLiveRef = useRef<number>(0);
  const currentQuestionIdxLiveRef = useRef<number>(0);

  const handleSaveAndNextRef = useRef<() => void>(() => {});
  const handlePreviousQuestionRef = useRef<() => void>(() => {});
  // Ref so the timer interval always calls the latest handleExamSubmit without stale closure
  const handleExamSubmitRef = useRef<(forced?: boolean) => void>(() => {});
  const questionsPagerRef = useRef<ScrollView>(null);
  const lastSectionIdxRef = useRef<number>(0);
  // Flag: true when the next scroll event was triggered by a button press (not user swipe).
  // Prevents the useEffect scrollTo from firing for user-initiated swipes (avoids double-navigation).
  const isProgrammaticScrollRef = useRef<boolean>(false);

  // Network connectivity tracking
  const isOnlineRef = useRef<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Modern custom modal state
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: { text: string; onPress: () => void; style?: 'cancel' | 'default' | 'destructive' }[];
    isPauseModal?: boolean;
    isSubmittedModal?: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  // Lock hardware back press completely when Exam Submitted popup is visible
  useEffect(() => {
    const onHardwareBack = () => {
      if (modalConfig.visible && modalConfig.isSubmittedModal) {
        return true; // Strictly consume and block back press
      }
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backSub.remove();
  }, [modalConfig.visible, modalConfig.isSubmittedModal]);

  // User responses dictionary mapping questionId to state
  const [responses, setResponses] = useState<Record<string, {
    selectedOptionIndex: number | null;
    tempOptionIndex: number | null;
    state: PaletteState;
    elapsedSeconds: number;
  }>>({});

  // AppState monitoring for anti-cheat focus loss
  const appState = useRef(AppState.currentState);

  // Subscribe to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      isOnlineRef.current = online;
      setIsOnline(online);
    });
    // Initial check
    NetInfo.fetch().then(state => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      isOnlineRef.current = online;
      setIsOnline(online);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        if (!isExitingRef.current) {
          // Immediately save session progress, then pause the test
          saveOngoingSessionStateLocally();
          if (isOnlineRef.current) {
            saveOngoingSessionState();
          }
          handlePauseAndExit();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [testId, currentUser?.id]);


  const findTestInCatalog = (tId: string) => {
    if (!examCatalog || examCatalog.length === 0) return null;
    for (const cat of examCatalog) {
      for (const sub of cat.subCategories || []) {
        for (const ss of sub.subSubCategories || []) {
          const found = (ss.tests || []).find((t: any) => t.id === tId);
          if (found) return found;
        }
        const found = (sub.tests || []).find((t: any) => t.id === tId);
        if (found) return found;
      }
    }
    return null;
  };

  const applyToScreen = async (
    list: MobileQuestion[],
    secs: MobileSection[],
    durationSeconds: number,
    catalogTest: any
  ) => {
    setQuestions(list);
    setSections(secs);
    sectionsRef.current = secs;
    totalDurationRef.current = durationSeconds;
    hasSectionalTimingRef.current = catalogTest?.hasSectionalTiming ?? false;

    // Pre-warm expo-image disk cache for all question/option images
    const allHtmlStrings = list.flatMap(q => [
      q.content?.en?.questionText,
      q.content?.hi?.questionText,
      ...(q.content?.en?.options ?? []),
      ...(q.content?.hi?.options ?? []),
    ].filter(Boolean) as string[]);
    preloadImages(allHtmlStrings);

    // Initialise response state dictionary
    const respDict: Record<string, any> = {};
    list.forEach((q) => {
      respDict[q.id] = {
        selectedOptionIndex: null,
        tempOptionIndex: null,
        state: 1 as PaletteState,
        elapsedSeconds: 0
      };
    });

    // 1. Resume from server ongoing session first (synced across web & app)
    let ongoing: any = currentUser?.testSessions?.find(
      (s: any) => s.testId === testId && (s.status === 'ONGOING' || s.status === 'PAUSED')
    );

    // 2. Fallback: check local storage if offline or not found
    if (!ongoing) {
      try {
        const localOngoing = await AsyncStorage.getItem(`ongoing_test_${testId}`);
        if (localOngoing) {
          ongoing = JSON.parse(localOngoing);
          if (ongoing?.status !== 'ONGOING' && ongoing?.status !== 'PAUSED') ongoing = null;
        }
      } catch (err) {
        console.warn('[Cache] Failed to load local ongoing session:', err);
      }
    }

    if (ongoing) {
      setShowInstructions(false);
      setIsTimerRunning(true);
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
      if (catalogTest?.hasSectionalTiming && secs.length > 0 && secs[0].durationSeconds) {
        setTimeLeft(secs[0].durationSeconds);
      } else {
        setTimeLeft(durationSeconds);
      }
    }

    // Mark starting question as visited
    const activeSecQ = list
      .filter(q => q.sectionId === secs[0]?.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    if (activeSecQ.length > 0) {
      const firstQId = activeSecQ[0].id;
      if (respDict[firstQId]?.state === 1) respDict[firstQId].state = 2;
    }

    if (!isExitingRef.current) {
      setResponses(respDict);
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadExamData = async () => {
      if (isExitingRef.current) return;
      setLoading(true);
      setLoadingText('Loading test...');

      const initialCatalogTest = findTestInCatalog(testId);
      let resolvedTitle = initialCatalogTest?.title;
      if (!resolvedTitle) {
        if (testId.includes('ssc')) {
          resolvedTitle = "SSC CGL 2026 - Tier-I Combined Graduate Level Exam";
        } else if (testId.includes('rrb') || testId.includes('railway')) {
          resolvedTitle = "RRB NTPC CBT-1 Stage 1 Practice Simulator";
        } else if (testId.includes('ugc_net')) {
          resolvedTitle = "UGC NET Paper-1 Teaching & Research Aptitude";
        } else if (testId.includes('ctet') || testId.includes('teaching')) {
          resolvedTitle = "CTET 2026 Paper-I (Primary Class I-V) Mock Paper";
        } else {
          resolvedTitle = "General Mock Test Assessment";
        }
      }
      setMockTestTitle(resolvedTitle);

      // ──────────────────────────────────────────────────────────────────
      // Shared builder: turns raw API questions into screen state
      // ──────────────────────────────────────────────────────────────────
      const buildScreenFromApiQuestions = (rawQuestions: any[], customQsMeta?: any) => {
        // Save questions to local device storage for 0ms offline/instant rendering next time
        if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
          saveQuestionsToCache(testId, rawQuestions);
        }

        // Find test details in catalog to get correct duration & timing config
        const catalogTest = findTestInCatalog(testId);

        let durationSeconds = 3600;
        if (catalogTest?.durationMinutes) {
          durationSeconds = catalogTest.durationMinutes * 60;
        } else {
          if (testId.includes('ssc'))         durationSeconds = 3600;
          else if (testId.includes('rrb'))    durationSeconds = 5400;
          else if (testId.includes('ctet'))   durationSeconds = 9000;
          else if (testId.includes('ugc_net')) durationSeconds = testId.includes('paper1') ? 3600 : 7200;
        }

        setTotalDuration(durationSeconds);
        totalDurationRef.current = durationSeconds;

        if (catalogTest?.hasSectionalTiming) {
          setHasSectionalTiming(true);
          hasSectionalTimingRef.current = true;
        }

        // Resolve overall default positive and negative marks from customQsMeta or catalogTest
        const isRRB = testId.includes('rrb') || testId.includes('railway');
        const posMark = customQsMeta?.positiveMarks !== undefined && customQsMeta?.positiveMarks !== null && customQsMeta?.positiveMarks !== ''
          ? Number(customQsMeta.positiveMarks)
          : (catalogTest?.positiveMarks !== undefined && catalogTest?.positiveMarks !== null ? Number(catalogTest.positiveMarks) : (isRRB ? 1 : 2));

        const negMark = customQsMeta?.negativeMarks !== undefined && customQsMeta?.negativeMarks !== null && customQsMeta?.negativeMarks !== ''
          ? Number(customQsMeta.negativeMarks)
          : (catalogTest?.negativeMarks !== undefined && catalogTest?.negativeMarks !== null ? Number(catalogTest.negativeMarks) : (isRRB ? 0.33 : 0.5));

        const sectionNames: string[] = [];
        rawQuestions.forEach((q: any) => {
          const sec = q.section || 'General Studies';
          if (!sectionNames.includes(sec)) sectionNames.push(sec);
        });

        let parsedTimings: number[] = [];
        if (catalogTest?.sectionalTimings) {
          if (Array.isArray(catalogTest.sectionalTimings)) {
            parsedTimings = catalogTest.sectionalTimings.map((t: any) => Number(t));
          } else if (typeof catalogTest.sectionalTimings === 'string') {
            try {
              const parsed = JSON.parse(catalogTest.sectionalTimings);
              if (Array.isArray(parsed)) parsedTimings = parsed.map((t: any) => Number(t));
            } catch (e) {
              console.error('Failed to parse sectional timings:', e);
            }
          }
        }

        // Section rules mapping from customQsMeta (res.sections / res.sectionsBreakdown) or catalogTest.sections
        const customSectionsMap: Record<string, { positiveMark: number; negativeMark: number }> = {};
        const metaSections = customQsMeta?.sections || customQsMeta?.sectionsBreakdown || catalogTest?.sections || [];
        if (Array.isArray(metaSections)) {
          metaSections.forEach((s: any) => {
            if (s && (s.name || s.sectionName)) {
              const sKey = (s.name || s.sectionName).trim().toLowerCase();
              customSectionsMap[sKey] = {
                positiveMark: s.positiveMarks !== undefined ? Number(s.positiveMarks) : (s.positiveMark !== undefined ? Number(s.positiveMark) : posMark),
                negativeMark: s.negativeMarks !== undefined ? Number(s.negativeMarks) : (s.negativeMark !== undefined ? Number(s.negativeMark) : negMark),
              };
            }
          });
        }

        // Also inspect rawQuestions items for section-level marks or question-level marks
        if (rawQuestions && Array.isArray(rawQuestions)) {
          rawQuestions.forEach((q: any) => {
            const sKey = (q.section || 'General Studies').trim().toLowerCase();
            if (sKey && !customSectionsMap[sKey]) {
              const sPos = q.sectionPositiveMark !== undefined ? Number(q.sectionPositiveMark) : (q.sectionPositiveMarks !== undefined ? Number(q.sectionPositiveMarks) : undefined);
              const sNeg = q.sectionNegativeMark !== undefined ? Number(q.sectionNegativeMark) : (q.sectionNegativeMarks !== undefined ? Number(q.sectionNegativeMarks) : undefined);
              if (sPos !== undefined || sNeg !== undefined) {
                customSectionsMap[sKey] = {
                  positiveMark: sPos !== undefined ? sPos : posMark,
                  negativeMark: sNeg !== undefined ? sNeg : negMark,
                };
              }
            }
          });
        }

        const builtSecs: MobileSection[] = sectionNames.map((name, idx) => {
          const secKey = name.trim().toLowerCase();
          const secRule = customSectionsMap[secKey];

          // Fallback: If no section rule found, compute section's positive & negative mark from questions in this section
          const secQs = rawQuestions.filter(q => (q.section || 'General Studies').trim().toLowerCase() === secKey);
          const firstQWithPos = secQs.find(q => q.positiveMarks !== undefined || q.positiveMark !== undefined);
          const firstQWithNeg = secQs.find(q => q.negativeMarks !== undefined || q.negativeMark !== undefined);

          const defaultSecPos = firstQWithPos ? (firstQWithPos.positiveMarks !== undefined ? Number(firstQWithPos.positiveMarks) : Number(firstQWithPos.positiveMark)) : posMark;
          const defaultSecNeg = firstQWithNeg ? (firstQWithNeg.negativeMarks !== undefined ? Number(firstQWithNeg.negativeMarks) : Number(firstQWithNeg.negativeMark)) : negMark;

          return {
            id: `sec_custom_${idx}`,
            name,
            orderIndex: idx,
            positiveMark: secRule?.positiveMark !== undefined ? secRule.positiveMark : defaultSecPos,
            negativeMark: secRule?.negativeMark !== undefined ? secRule.negativeMark : defaultSecNeg,
            durationSeconds: catalogTest?.hasSectionalTiming && parsedTimings.length > idx
              ? (parsedTimings[idx] ?? 0) * 60
              : undefined,
          };
        });

        const sectionCounters: Record<string, number> = {};
        sectionNames.forEach(name => { sectionCounters[name] = 0; });

        const builtList: MobileQuestion[] = rawQuestions.map((q: any, idx: number) => {
          const secName = q.section || 'General Studies';
          const secId = `sec_custom_${sectionNames.indexOf(secName)}`;
          const secObj = builtSecs.find(s => s.id === secId);
          const qOrder = sectionCounters[secName]++;

          const qPosMark = q.positiveMarks !== undefined && q.positiveMarks !== null && q.positiveMarks !== ''
            ? Number(q.positiveMarks)
            : (q.positiveMark !== undefined && q.positiveMark !== null && q.positiveMark !== '' ? Number(q.positiveMark) : secObj?.positiveMark);

          const qNegMark = q.negativeMarks !== undefined && q.negativeMarks !== null && q.negativeMarks !== ''
            ? Number(q.negativeMarks)
            : (q.negativeMark !== undefined && q.negativeMark !== null && q.negativeMark !== '' ? Number(q.negativeMark) : secObj?.negativeMark);

          return {
            id: (q.id !== undefined && q.id !== null && q.id !== '')
              ? String(q.id)
              : `q_custom_${idx}`,
            sectionId: secId,
            questionType: 'mcq',
            orderIndex: qOrder,
            correctOptionIndex: q.correctIndex !== undefined ? q.correctIndex : q.correctOptionIndex || 0,
            positiveMark: qPosMark,
            negativeMark: qNegMark,
            content: (() => {
              let qTextEn = q.textEn || q.content?.en?.questionText || q.questionText || q.text || '';
              let qTextHi = q.textHi || q.content?.hi?.questionText || q.questionText || q.textHi || qTextEn || '';

              const imgEn = q.imageUrlEn || q.imageUrl || q.content?.en?.imageUrl;
              if (imgEn && !qTextEn.includes('<img') && !qTextEn.includes(imgEn)) {
                const fullImg = imgEn.startsWith('//') ? 'https:' + imgEn : imgEn;
                qTextEn = `${qTextEn}\n<p><img src="${fullImg}" /></p>`;
              }

              const imgHi = q.imageUrlHi || q.imageUrl || q.content?.hi?.imageUrl || imgEn;
              if (imgHi && !qTextHi.includes('<img') && !qTextHi.includes(imgHi)) {
                const fullImgHi = imgHi.startsWith('//') ? 'https:' + imgHi : imgHi;
                qTextHi = `${qTextHi}\n<p><img src="${fullImgHi}" /></p>`;
              }

              const optsEn = q.optionsEn || q.content?.en?.options || q.options || [];
              const optsHi = q.optionsHi || q.content?.hi?.options || q.optionsHi || optsEn || [];

              return {
                en: { questionText: qTextEn, options: optsEn },
                hi: { questionText: qTextHi, options: optsHi }
              };
            })()
          };
        });

        return { builtList, builtSecs, durationSeconds, catalogTest };
      };

      // ──────────────────────────────────────────────────────────────────
      // STEP 1 — Try device cache first (instant, no network needed)
      // ──────────────────────────────────────────────────────────────────
      const cachedRaw = await getCachedQuestions(testId);
      if (cachedRaw && cachedRaw.length > 0) {
        rawQuestionsRef.current = cachedRaw;
        // Serve from device immediately
        const { builtList, builtSecs, durationSeconds, catalogTest } = buildScreenFromApiQuestions(cachedRaw);
        await applyToScreen(builtList, builtSecs, durationSeconds, catalogTest);


        return;
      }

      // ──────────────────────────────────────────────────────────────────
      // STEP 2 — No cache: fetch from Vercel, then save to device
      // ──────────────────────────────────────────────────────────────────
      setLoadingText('Downloading questions...');
      const res = await ApiClient.getCustomQuestions(testId);

      if (res.success && res.questions && Array.isArray(res.questions) && res.questions.length > 0) {
        // Save to device for next time
        saveQuestionsToCache(testId, res.questions);
        rawQuestionsRef.current = res.questions;
        const { builtList, builtSecs, durationSeconds, catalogTest } = buildScreenFromApiQuestions(res.questions, res);
        await applyToScreen(builtList, builtSecs, durationSeconds, catalogTest);
      } else {
        AsyncStorage.removeItem(`ongoing_test_${testId}`).catch(() => {});
        if (currentUser?.id) {
          ApiClient.clearOngoingSession(currentUser.id, testId).catch(() => {});
        }
        const catalogTest = findTestInCatalog(testId);
        await applyToScreen([], [], catalogTest?.durationMinutes ? catalogTest.durationMinutes * 60 : 3600, catalogTest);
      }
      setLoading(false);
    };

    loadExamData();
  }, [testId]);

  const getCtetFallbackQuestions = (tId: string, l1: string, l2: string) => {
    const lowerId = (tId || '').toLowerCase();
    const isPaper2 = lowerId.includes('paper2') || lowerId.includes('paper-2') || lowerId.includes('paper_2') || lowerId.includes('paper 2') || lowerId.includes('p2') || lowerId.includes('ctet2');

    const selectedL1 = l1 || 'English';
    const selectedL2 = l2 || 'Hindi';

    const secs: MobileSection[] = isPaper2 ? [
      { id: "sec_cdp", name: "Child Development & Pedagogy", orderIndex: 0, positiveMark: 1, negativeMark: 0 },
      { id: "sec_math_sci", name: "Mathematics & Science", orderIndex: 1, positiveMark: 1, negativeMark: 0 },
      { id: "sec_social", name: "Social Studies", orderIndex: 2, positiveMark: 1, negativeMark: 0 },
      { id: "sec_lang1", name: `Language - I (${selectedL1})`, orderIndex: 3, positiveMark: 1, negativeMark: 0 },
      { id: "sec_lang2", name: `Language - II (${selectedL2})`, orderIndex: 4, positiveMark: 1, negativeMark: 0 },
    ] : [
      { id: "sec_cdp", name: "Child Development & Pedagogy", orderIndex: 0, positiveMark: 1, negativeMark: 0 },
      { id: "sec_math", name: "Mathematics", orderIndex: 1, positiveMark: 1, negativeMark: 0 },
      { id: "sec_evs", name: "Environmental Studies (EVS)", orderIndex: 2, positiveMark: 1, negativeMark: 0 },
      { id: "sec_lang1", name: `Language - I (${selectedL1})`, orderIndex: 3, positiveMark: 1, negativeMark: 0 },
      { id: "sec_lang2", name: `Language - II (${selectedL2})`, orderIndex: 4, positiveMark: 1, negativeMark: 0 },
    ];

    let qLang1Content = {
      en: { questionText: "Read the passage: What is the primary objective of Language-I acquisition in early childhood?", options: ["Natural exposure and meaningful context", "Rote memorization of rules", "Direct grammar translation", "Strict penalization of errors"] },
      hi: { questionText: "भाषा-I (Language-I) अर्जन के संदर्भ में प्राथमिक उद्देश्य क्या है?", options: ["स्वाभाविक अवसर एवं सार्थक परिवेश", "नियमों को रटना", "व्याकरण अनुवाद", "त्रुटियों पर दंड देना"] }
    };
    if (selectedL1 === 'Hindi') {
      qLang1Content = {
        en: { questionText: "भाषा-I (हिंदी): 'प्राथमिक स्तर पर हिंदी भाषा शिक्षण का मुख्य उद्देश्य क्या है?'", options: ["बच्चों को विभिन्न संदर्भों में भाषा प्रयोग की क्षमता विकसित करना", "केवल पाठ्यपुस्तक पढ़ाना", "व्याकरण के नियम रटाना", "सुलेख लिखवाना"] },
        hi: { questionText: "भाषा-I (हिंदी): 'प्राथमिक स्तर पर हिंदी भाषा शिक्षण का मुख्य उद्देश्य क्या है?'", options: ["बच्चों को विभिन्न संदर्भों में भाषा प्रयोग की क्षमता विकसित करना", "केवल पाठ्यपुस्तक पढ़ाना", "व्याकरण के नियम रटाना", "सुलेख लिखवाना"] }
      };
    } else if (selectedL1 === 'Sanskrit') {
      qLang1Content = {
        en: { questionText: "Language-I (Sanskrit): 'संस्कृत भाषा शिक्षणस्य मुख्याद्देश्यं किम् अस्ति?'", options: ["संभाषणकौशलवर्धनम् एवं बोधात्मकता", "केवललेखनम्", "कण्ठस्थीकरणम्", "अनुवादमात्रम्"] },
        hi: { questionText: "भाषा-I (संस्कृत): 'संस्कृत भाषा शिक्षणस्य मुख्याद्देश्यं किम् अस्ति?'", options: ["संभाषणकौशलवर्धनम् एवं बोधात्मकता", "केवललेखनम्", "कण्ठस्थीकरणम्", "अनुवादमात्रम्"] }
      };
    }

    let qLang2Content = {
      en: { questionText: "Language-II (Hindi): 'द्वितीय भाषा (Language-II) के रूप में हिंदी शिक्षण की प्रभावकारी विधि कौन सी है?'", options: ["संप्रेषणात्मक दृष्टिकोण (Communicative Approach)", "केवल व्याकरण अनुवाद विधि", "रटना", "पाठ्यपुस्तक तक सीमित रहना"] },
      hi: { questionText: "भाषा-II (हिंदी): 'द्वितीय भाषा (Language-II) के रूप में हिंदी शिक्षण की प्रभावकारी विधि कौन सी है?'", options: ["संप्रेषणात्मक दृष्टिकोण (Communicative Approach)", "केवल व्याकरण अनुवाद विधि", "रटना", "पाठ्यपुस्तक तक सीमित रहना"] }
    };
    if (selectedL2 === 'English') {
      qLang2Content = {
        en: { questionText: "Language-II (English): Which approach emphasizes learning language through meaningful interaction in real-world contexts?", options: ["Communicative Language Teaching (CLT)", "Grammar Translation Method", "Audio-Lingual Method", "Direct Method"] },
        hi: { questionText: "Language-II (English): Which approach emphasizes learning language through meaningful interaction in real-world contexts?", options: ["Communicative Language Teaching (CLT)", "Grammar Translation Method", "Audio-Lingual Method", "Direct Method"] }
      };
    } else if (selectedL2 === 'Sanskrit') {
      qLang2Content = {
        en: { questionText: "Language-II (Sanskrit): 'कस्य विधेः अपरान्नाम पाठ्यपुस्तकविधिः इति अस्ति?'", options: ["डॉ. वेस्ट-महोदयस्य विधिः", "भण्डारकर-विधिः", "आगमन-विधिः", "निगमन-विधिः"] },
        hi: { questionText: "भाषा-II (संस्कृत): 'कस्य विधेः अपरान्नाम पाठ्यपुस्तकविधिः इति अस्ति?'", options: ["डॉ. वेस्ट-महोदयस्य विधिः", "भण्डारकर-विधिः", "आगमन-विधिः", "निगमन-विधिः"] }
      };
    }

    const list: MobileQuestion[] = [
      {
        id: "q_cdp1", sectionId: "sec_cdp", questionType: "mcq", orderIndex: 0, correctOptionIndex: 0,
        content: {
          en: { questionText: "According to Jean Piaget, at which stage of cognitive development does a child develop object permanence?", options: ["Sensorimotor Stage", "Pre-operational Stage", "Concrete Operational Stage", "Formal Operational Stage"] },
          hi: { questionText: "जीन पियाजे के अनुसार, संज्ञानात्मक विकास के किस चरण में बच्चा 'वस्तु स्थायित्व' (Object Permanence) विकसित करता है?", options: ["संवेदी-गामक अवस्था (Sensorimotor)", "पूर्व-संक्रियात्मक अवस्था", "मूर्त संक्रियात्मक अवस्था", "अमूर्त संक्रियात्मक अवस्था"] }
        }
      },
      {
        id: "q_l1_1", sectionId: "sec_lang1", questionType: "mcq", orderIndex: 0, correctOptionIndex: 0,
        content: qLang1Content
      },
      {
        id: "q_l2_1", sectionId: "sec_lang2", questionType: "mcq", orderIndex: 0, correctOptionIndex: 0,
        content: qLang2Content
      }
    ];

    return { builtList: list, builtSecs: secs, durationSeconds: 9000 };
  };

  const handleStartCtetExam = async () => {
    const isCtetFormValid = 
      ctetDefaultLang !== '' && ctetDefaultLang !== '-- Select --' &&
      ctetLang1 !== '' && ctetLang1 !== '-- Select --' &&
      ctetLang2 !== '' && ctetLang2 !== '-- Select --' &&
      ctetAgreed;

    if (!isCtetFormValid) return;

    const chosenExamLang = ctetDefaultLang === 'Hindi' ? 'hi' : 'en';
    setLang(chosenExamLang);

    const catalogTest = findTestInCatalog(testId);
    let list: MobileQuestion[] = [];
    let secs: MobileSection[] = [];

    const rawQs = rawQuestionsRef.current;
    const lowerId = (testId || '').toLowerCase();
    const isPaper2 = lowerId.includes('paper2') || lowerId.includes('paper-2') || lowerId.includes('paper_2') || lowerId.includes('paper 2') || lowerId.includes('p2') || lowerId.includes('ctet2');

    if (Array.isArray(rawQs) && rawQs.length > 0) {
      const targetSecConfigs = isPaper2 ? [
        { id: 'sec_cdp', name: 'Child Development & Pedagogy', matchSection: 'child development' },
        { id: 'sec_social', name: 'Social Studies', matchSection: 'social studies' },
        { id: 'sec_lang1', name: `Language - I (${ctetLang1})`, matchSection: `${ctetLang1.toLowerCase()} - i` },
        { id: 'sec_lang2', name: `Language - II (${ctetLang2})`, matchSection: `${ctetLang2.toLowerCase()} - ii` },
      ] : [
        { id: 'sec_cdp', name: 'Child Development & Pedagogy', matchSection: 'child development' },
        { id: 'sec_math', name: 'Mathematics', matchSection: 'mathematics' },
        { id: 'sec_evs', name: 'Environmental Studies (EVS)', matchSection: 'environmental studies' },
        { id: 'sec_lang1', name: `Language - I (${ctetLang1})`, matchSection: `${ctetLang1.toLowerCase()} - i` },
        { id: 'sec_lang2', name: `Language - II (${ctetLang2})`, matchSection: `${ctetLang2.toLowerCase()} - ii` },
      ];

      secs = targetSecConfigs.map((cfg, idx) => ({
        id: cfg.id,
        name: cfg.name,
        orderIndex: idx,
        positiveMark: 1,
        negativeMark: 0,
      }));

      targetSecConfigs.forEach((cfg) => {
        const matchingRawQs = rawQs.filter((item: any) => {
          const secStr = String(item.section || item.subject || '').trim().toLowerCase();
          if (cfg.id === 'sec_lang1') {
            return (
              secStr === `${ctetLang1.toLowerCase()} - i` ||
              secStr === `language - i (${ctetLang1.toLowerCase()})` ||
              secStr === `language 1 (${ctetLang1.toLowerCase()})` ||
              (secStr.includes(ctetLang1.toLowerCase()) && (secStr.includes('- i') || secStr.includes('1') || secStr.includes('i'))) ||
              secStr === 'language - i' || secStr === 'language 1'
            );
          }
          if (cfg.id === 'sec_lang2') {
            return (
              secStr === `${ctetLang2.toLowerCase()} - ii` ||
              secStr === `language - ii (${ctetLang2.toLowerCase()})` ||
              secStr === `language 2 (${ctetLang2.toLowerCase()})` ||
              (secStr.includes(ctetLang2.toLowerCase()) && (secStr.includes('- ii') || secStr.includes('2') || secStr.includes('ii'))) ||
              secStr === 'language - ii' || secStr === 'language 2'
            );
          }
          return secStr.includes(cfg.matchSection.toLowerCase());
        });

        matchingRawQs.forEach((q: any, qIdx: number) => {
          list.push({
            id: (q.id !== undefined && q.id !== null && q.id !== '') ? String(q.id) : `q_ctet_${cfg.id}_${qIdx}`,
            sectionId: cfg.id,
            questionType: 'mcq',
            orderIndex: qIdx,
            correctOptionIndex: q.correctIndex !== undefined ? q.correctIndex : q.correctOptionIndex || 0,
            content: {
              en: {
                questionText: q.textEn || q.content?.en?.questionText || q.questionText || '',
                options: q.optionsEn || q.content?.en?.options || q.options || [],
              },
              hi: {
                questionText: q.textHi || q.content?.hi?.questionText || q.questionText || q.textEn || '',
                options: q.optionsHi || q.content?.hi?.options || q.options || q.optionsEn || [],
              }
            }
          });
        });
      });
    }

    if (list.length === 0) {
      const fallbackData = getCtetFallbackQuestions(testId, ctetLang1, ctetLang2);
      list = fallbackData.builtList;
      secs = fallbackData.builtSecs;
    }

    await applyToScreen(list, secs, 9000, catalogTest);
    setShowInstructions(false);
    setIsTimerRunning(true);
  };

  // Keep refs in sync with state so the timer interval always reads fresh values
  useEffect(() => { sectionsRef.current = sections; }, [sections]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { totalDurationRef.current = totalDuration; }, [totalDuration]);
  useEffect(() => { hasSectionalTimingRef.current = hasSectionalTiming; }, [hasSectionalTiming]);
  useEffect(() => { currentSectionIdxRef.current = currentSectionIdx; }, [currentSectionIdx]);

  // Live refs for AppState crash-save handler (always reflects latest exam state)
  useEffect(() => { responsesRef.current = responses; }, [responses]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { violationsCountRef.current = violationsCount; }, [violationsCount]);
  useEffect(() => { currentSectionIdxLiveRef.current = currentSectionIdx; }, [currentSectionIdx]);
  useEffect(() => { currentQuestionIdxLiveRef.current = currentQuestionIdx; }, [currentQuestionIdx]);

  useEffect(() => {
    const sectionChanged = lastSectionIdxRef.current !== currentSectionIdx;
    lastSectionIdxRef.current = currentSectionIdx;

    if (isProgrammaticScrollRef.current || sectionChanged) {
      // Only call scrollTo when triggered by a button press or section change.
      // For user swipes, the pager has already moved — calling scrollTo again causes
      // a double-snap / auto-swipe misbehavior.
      isProgrammaticScrollRef.current = false;
      questionsPagerRef.current?.scrollTo({
        x: currentQuestionIdx * SCREEN_WIDTH,
        animated: !sectionChanged,
      });
    }
  }, [currentQuestionIdx, currentSectionIdx]);

  // Timer Tick hook — uses refs to avoid stale closure bugs with sectional timing
  useEffect(() => {
    if (loading || !isTimerRunning) return;

    const interval = setInterval(() => {
      // Update per-question elapsed time
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

      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Read fresh values from refs to avoid stale closures
          const isSectional = hasSectionalTimingRef.current;
          const allSections = sectionsRef.current;
          const currentSecIdx = currentSectionIdxRef.current;

          if (isSectional) {
            const nextSecIdx = currentSecIdx + 1;
            if (nextSecIdx < allSections.length) {
              // Advance to next section: update section index, reset question, restart timer
              isProgrammaticScrollRef.current = true;
              setCurrentSectionIdx(nextSecIdx);
              setCurrentQuestionIdx(0);
              const nextSec = allSections[nextSecIdx];
              const nextDuration = nextSec?.durationSeconds ?? totalDurationRef.current;
              // Show section transition notification
              setModalConfig({
                visible: true,
                title: `Section Time Up — Moving to Section ${nextSecIdx + 1}`,
                message: `Time for "${allSections[currentSecIdx]?.name}" has expired.\nNow starting: "${nextSec?.name}"\nTime allotted: ${Math.round(nextDuration / 60)} minutes.`,
                buttons: [
                  {
                    text: 'Start Next Section',
                    onPress: () => setModalConfig((prevVal) => ({ ...prevVal, visible: false })),
                    style: 'default'
                  }
                ]
              });
              // Restart the timer for the next section duration
              setTimeout(() => {
                setTimeLeft(nextDuration);
                setIsTimerRunning(false);
                setIsTimerRunning(true);
              }, 50);
              return 0;
            } else {
              // Last section expired — force submit (use ref to avoid stale closure)
              handleExamSubmitRef.current(true);
              return 0;
            }
          } else {
            // Non-sectional: global timer expired (use ref to avoid stale closure)
            handleExamSubmitRef.current(true);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, isTimerRunning]);

  // Trigger auto-save every 15 seconds to sync state with shared database (skip when offline)
  useEffect(() => {
    if (loading || !isTimerRunning) return;

    const autoSaveInterval = setInterval(() => {
      if (isOnlineRef.current) {
        saveOngoingSessionState();
      }
      // Always save locally regardless of network state
      saveOngoingSessionStateLocally();
    }, 15000);

    return () => clearInterval(autoSaveInterval);
  }, [loading, isTimerRunning, currentSectionIdx, currentQuestionIdx, responses, timeLeft, violationsCount]);

  const activeSection = sections[currentSectionIdx];
  const sectionQuestions = useMemo(
    () => activeSection
      ? questions.filter((q) => q.sectionId === activeSection.id).sort((a, b) => a.orderIndex - b.orderIndex)
      : [],
    [questions, activeSection?.id]
  );

  const activeQuestion = sectionQuestions[currentQuestionIdx];

  // All useMemo hooks MUST be before any conditional returns (Rules of Hooks)
  const answeredCount = useMemo(
    () => Object.values(responses).filter(r => r.state === 3 || r.state === 5).length,
    [responses]
  );
  const currentSecQs = useMemo(
    () => questions.filter(q => q.sectionId === sections[currentSectionIdx]?.id),
    [questions, sections, currentSectionIdx]
  );
  const drawerSecQs = useMemo(
    () => questions
      .filter(q => q.sectionId === sections[drawerSectionIdx]?.id)
      .sort((a, b) => a.orderIndex - b.orderIndex),
    [questions, sections, drawerSectionIdx]
  );
  const drawerSecAnswered = useMemo(
    () => drawerSecQs.filter(q => responses[q.id]?.state === 3 || responses[q.id]?.state === 5).length,
    [drawerSecQs, responses]
  );
  const drawerSecUnanswered = drawerSecQs.length - drawerSecAnswered;
  const minutesLeft = Math.floor(timeLeft / 60);

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

  const handleSelectOption = useCallback((optIdx: number, qId = activeQuestionIdRef.current) => {
    if (!qId) return;
    setResponses((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        tempOptionIndex: optIdx
      }
    }));
  }, []);

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
    let nextSecIdx = currentSectionIdx;
    let nextQIdx = currentQuestionIdx;
    if (currentQuestionIdx < sectionQuestions.length - 1) {
      const nextQ = sectionQuestions[currentQuestionIdx + 1];
      if (updatedResponses[nextQ.id].state === 1) {
        updatedResponses[nextQ.id].state = 2; // mark visited
      }
      nextQIdx = currentQuestionIdx + 1;
      isProgrammaticScrollRef.current = true;
      setCurrentQuestionIdx(nextQIdx);
    } else {
      // End of section
      if (!hasSectionalTiming && currentSectionIdx < sections.length - 1) {
        // Only auto-advance sections when not in sectional timing mode
        const nextSec = sections[currentSectionIdx + 1];
        const nextSecQs = questions.filter(q => q.sectionId === nextSec.id).sort((a,b)=>a.orderIndex - b.orderIndex);
        if (nextSecQs.length > 0 && updatedResponses[nextSecQs[0].id].state === 1) {
          updatedResponses[nextSecQs[0].id].state = 2;
        }
        nextSecIdx = currentSectionIdx + 1;
        nextQIdx = 0;
        isProgrammaticScrollRef.current = true;
        setCurrentSectionIdx(nextSecIdx);
        setCurrentQuestionIdx(nextQIdx);
      } else {
        setModalConfig({
          visible: true,
          title: hasSectionalTiming ? 'Section Complete' : 'Section Complete',
          message: hasSectionalTiming
            ? 'You have reached the end of this section. Wait for the section timer to expire to move to the next section.'
            : 'You are on the last question. Open the palette drawer to submit or review.',
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
    saveOngoingSessionStateLocally(updatedResponses, timeLeft, violationsCount, nextSecIdx, nextQIdx);
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIdx > 0) {
      isProgrammaticScrollRef.current = true;
      setCurrentQuestionIdx(prev => prev - 1);
    } else if (!hasSectionalTiming && currentSectionIdx > 0) {
      // Only allow going back to previous section when sectional timing is NOT active
      const prevSecIdx = currentSectionIdx - 1;
      const prevSecQs = questions.filter(q => q.sectionId === sections[prevSecIdx].id);
      isProgrammaticScrollRef.current = true;
      setCurrentSectionIdx(prevSecIdx);
      setCurrentQuestionIdx(prevSecQs.length - 1);
    }
    // When hasSectionalTiming is true and we are on question 0, do nothing —
    // the user cannot navigate back to a section whose timer has already expired.
  };

  const confirmNextSection = () => {
    if (currentSectionIdx < sections.length - 1) {
      const nextSecIdx = currentSectionIdx + 1;
      const nextSec = sections[nextSecIdx];
      const nextSecQs = questions.filter(q => q.sectionId === nextSec.id).sort((a,b) => a.orderIndex - b.orderIndex);
      
      setResponses(prev => {
        const updated = { ...prev };
        if (nextSecQs.length > 0 && updated[nextSecQs[0].id]?.state === 1) {
          updated[nextSecQs[0].id].state = 2;
        }
        return updated;
      });

      isProgrammaticScrollRef.current = true;
      setCurrentSectionIdx(nextSecIdx);
      setCurrentQuestionIdx(0);

      // Reset section timer if sectional timing is active
      if (hasSectionalTiming && nextSec.durationSeconds) {
        setTimeLeft(nextSec.durationSeconds);
      }
    } else {
      handleExamSubmit(false);
    }
  };

  const handleSubmitSection = () => {
    const activeSec = sections[currentSectionIdx];
    if (!activeSec) {
      confirmNextSection();
      return;
    }

    // Pause timer while section submit confirmation modal is active
    setIsTimerRunning(false);

    const secQs = questions.filter(q => q.sectionId === activeSec.id);
    const secTime = secQs.reduce((acc, q) => acc + (responses[q.id]?.elapsedSeconds || 0), 0);
    const m = Math.floor(secTime / 60);
    const s = secTime % 60;
    const timeStr = `${m}m ${s}s`;

    const answeredCount = secQs.filter(q => responses[q.id]?.state === 3 || responses[q.id]?.state === 5).length;
    const markedCount = secQs.filter(q => responses[q.id]?.state === 4).length;
    const unattemptedCount = secQs.length - answeredCount - markedCount;

    const isLastSection = currentSectionIdx >= sections.length - 1;

    setModalConfig({
      visible: true,
      title: isLastSection ? 'Submit Final Section?' : `Submit Section: ${activeSec.name}?`,
      message: `Section Performance Summary:\n⏱ Time Utilized: ${timeStr}\n✅ Answered: ${answeredCount}/${secQs.length}\n🔖 Marked for Review: ${markedCount}\n⚪ Unattempted: ${unattemptedCount}\n\nDo you want to submit this section now?`,
      buttons: [
        {
          text: 'Cancel',
          onPress: () => {
            setModalConfig(prev => ({ ...prev, visible: false }));
            setIsTimerRunning(true);
          },
          style: 'cancel'
        },
        {
          text: isLastSection ? 'Submit Test' : 'Submit Section',
          onPress: () => {
            setModalConfig(prev => ({ ...prev, visible: false }));
            confirmNextSection();
            setIsTimerRunning(true);
          },
          style: 'default'
        }
      ]
    });
  };

  useEffect(() => { handleSaveAndNextRef.current = handleSaveAndNext; }, [handleSaveAndNext]);
  useEffect(() => { handlePreviousQuestionRef.current = handlePreviousQuestion; }, [handlePreviousQuestion]);

  const handleClearResponse = useCallback(() => {
    const qId = activeQuestionIdRef.current;
    if (!qId) return;
    setResponses((prev) => {
      const updated = {
        ...prev,
        [qId]: {
          ...prev[qId],
          tempOptionIndex: null,
          selectedOptionIndex: null,
          state: 2 as PaletteState
        }
      };
      saveOngoingSessionStateLocally(updated);
      return updated;
    });
  }, [currentSectionIdx, currentQuestionIdx, timeLeft, violationsCount]);

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

    let nextSecIdx = currentSectionIdx;
    let nextQIdx = currentQuestionIdx;
    if (currentQuestionIdx < sectionQuestions.length - 1) {
      const nextQ = sectionQuestions[currentQuestionIdx + 1];
      if (updatedResponses[nextQ.id].state === 1) {
        updatedResponses[nextQ.id].state = 2;
      }
      nextQIdx = currentQuestionIdx + 1;
      isProgrammaticScrollRef.current = true;
      setCurrentQuestionIdx(nextQIdx);
    } else if (!hasSectionalTiming && currentSectionIdx < sections.length - 1) {
      nextSecIdx = currentSectionIdx + 1;
      nextQIdx = 0;
      isProgrammaticScrollRef.current = true;
      setCurrentSectionIdx(nextSecIdx);
      setCurrentQuestionIdx(nextQIdx);
    }
    saveOngoingSessionStateLocally(updatedResponses, timeLeft, violationsCount, nextSecIdx, nextQIdx);
  };

  const handleJumpToQuestion = (secIdx: number, qIdx: number) => {
    // Block cross-section navigation in sectional timing mode
    if (hasSectionalTiming && secIdx !== currentSectionIdx) return;
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

    isProgrammaticScrollRef.current = true;
    setCurrentSectionIdx(secIdx);
    setCurrentQuestionIdx(qIdx);
    setDrawerMounted(false);
  };

  // Save progress locally to AsyncStorage (Auto-save)
  const saveOngoingSessionStateLocally = async (
    currentResps = responses,
    currTime = timeLeft,
    currViolations = violationsCount,
    currSec = currentSectionIdx,
    currQ = currentQuestionIdx
  ) => {
    if (!questionsRef.current || questionsRef.current.length === 0) return;
    try {
      const formattedResponses: Record<string, any> = {};
      Object.entries(currentResps).forEach(([qId, val]) => {
        formattedResponses[qId] = {
          selectedOptionIndex: val.selectedOptionIndex,
          elapsedSeconds: val.elapsedSeconds
        };
      });

      await AsyncStorage.setItem(
        `ongoing_test_${testId}`,
        JSON.stringify({
          testId,
          testTitle: mockTestTitle || '',
          status: 'ONGOING',
          timeRemaining: currTime,
          violations: currViolations,
          currentSectionIndex: currSec,
          currentQuestionIndex: currQ,
          responses: formattedResponses,
          updatedAt: new Date().toISOString()
        })
      );
    } catch (err) {
      console.warn('[Cache] Failed to save ongoing progress locally:', err);
    }
  };

  // Sync state with database
  const saveOngoingSessionState = async () => {
    if (!questions || questions.length === 0) return;
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
      await AsyncStorage.removeItem(`ongoing_test_${testId}`);
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
            await saveOngoingSessionStateLocally();
            if (isOnlineRef.current) {
              try {
                await saveOngoingSessionState();
              } catch (e) {
                console.warn('Failed to sync ongoing session to server:', e);
              }
            }
            onBack();
          },
          style: 'destructive'
        }
      ]
    });
  };

  // Submit assessment sittings (works fully offline — queues result and syncs later)
  const handleExamSubmit = async (forced = false) => {
    setIsTimerRunning(false);

    const performSubmission = async () => {
      // Mark as exiting/submitted immediately to prevent background auto-save from clobbering this submission
      isExitingRef.current = true;

      // Clear ongoing test IMMEDIATELY at start of submission so it can never be resumed
      try {
        await AsyncStorage.removeItem(`ongoing_test_${testId}`);
      } catch {}

      setLoading(true);
      setLoadingText('Processing your answers...');

      // ── Read from REFS not state — avoids stale closure when called from timer ──
      // The timer interval only depends on [loading, isTimerRunning], so `responses`,
      // `questions`, `sections` and `violationsCount` would be stale state in that closure.
      const liveResponses = responsesRef.current;
      const liveQuestions = questionsRef.current;
      const liveSections = sectionsRef.current;
      const liveViolations = violationsCountRef.current;

      // Compute stats locally — no network needed
      let correctCount = 0;
      let incorrectCount = 0;
      let unattemptedCount = 0;
      let totalMarks = 0;
      let totalMaxScore = 0;

      liveQuestions.forEach((q) => {
        const resp = liveResponses[q.id];
        const selected = resp ? (resp.selectedOptionIndex !== null ? resp.selectedOptionIndex : resp.tempOptionIndex) : null;
        const qSection = liveSections.find((s) => s.id === q.sectionId);
        const positiveMark = q.positiveMark !== undefined && q.positiveMark !== null
          ? Number(q.positiveMark)
          : (qSection ? qSection.positiveMark : 2);
        const negativeMark = q.negativeMark !== undefined && q.negativeMark !== null
          ? Number(q.negativeMark)
          : (qSection ? qSection.negativeMark : 0.5);

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

      const totalQs = liveQuestions.length;
      const accuracy = totalQs > 0 ? (correctCount / (correctCount + incorrectCount || 1)) * 100 : 0;

      const formattedResponses: Record<string, any> = {};
      Object.entries(liveResponses).forEach(([qId, val]) => {
        formattedResponses[qId] = {
          selectedOptionIndex: val.selectedOptionIndex !== null ? val.selectedOptionIndex : val.tempOptionIndex,
          elapsedSeconds: val.elapsedSeconds
        };
      });

       const totalSpentSeconds = Object.values(liveResponses).reduce((sum, r: any) => sum + (r.elapsedSeconds || 0), 0);

       const attemptPayload = {
         userId: currentUser.id,
         testId,
         title: mockTestTitle || 'Mock Test',
         score: totalMarks,
         maxScore: totalMaxScore,
         accuracy,
         durationSeconds: Math.max(1, totalSpentSeconds),
         violations: liveViolations,
         responses: formattedResponses
       };

      // ── OFFLINE BRANCH: queue the result locally for later sync ─────────
      if (!isOnlineRef.current) {
        try {
          await AsyncStorage.setItem(
            `pending_submit_${testId}`,
            JSON.stringify({ ...attemptPayload, queuedAt: Date.now(), correctCount, incorrectCount, totalQs, unattemptedCount })
          );
        } catch (err) {
          console.warn('[Offline] Failed to queue result locally:', err);
        }

        setLoading(false);
        setModalConfig({
          visible: true,
          title: forced ? '⏱ Time Up — Result Saved Offline' : '✅ Result Saved Offline',
          message: `You are currently offline. Your result has been saved on this device.\n\nMarks scored: ${totalMarks.toFixed(1)}\nCorrect answers: ${correctCount}/${totalQs}\nAccuracy: ${accuracy.toFixed(1)}%\n\n📡 Your result will automatically sync to the server when internet is restored.`,
          isSubmittedModal: true,
          buttons: [
            {
              text: 'Back to Home',
              onPress: () => {
                setModalConfig((prevVal) => ({ ...prevVal, visible: false }));
                onBack();
              },
              style: 'default'
            }
          ]
        });
        return;
      }

      // ── ONLINE BRANCH: submit directly to server ─────────────────────────
      setLoadingText('Submitting your answers...');
      const res = await ApiClient.addAttempt(attemptPayload);

      setLoading(false);

      if (res.success) {
        try {
          // Clear any pending offline queue for this test if it existed
          await AsyncStorage.removeItem(`pending_submit_${testId}`);
        } catch {}
        setModalConfig({
          visible: true,
          title: forced ? 'Time Up — Exam Submitted' : 'Exam Submitted Successfully',
          message: `Assessment summary:\nMarks scored: ${totalMarks.toFixed(1)}\nCorrect answers: ${correctCount}/${totalQs}\nAccuracy: ${accuracy.toFixed(1)}%`,
          isSubmittedModal: true,
          buttons: [
            {
              text: 'View Performance',
              onPress: async () => {
                const missingApp = !websiteRatingRef.current;
                const missingExam = !examRatingRef.current;

                if (missingApp || missingExam) {
                  // Blink the unrated star row(s) to highlight them without any alert dialog
                  triggerRatingBlinkRef.current(missingApp, missingExam);
                  return;
                }

                // Always submit feedback/rating so every test completion is recorded in admin panel
                try {
                  fetch(`${BASE_URL}/api/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: currentUser?.id,
                      testId: testId,
                      platformRating: websiteRatingRef.current || 0,
                      examRating: examRatingRef.current || 0,
                      feedbackText: feedbackTextRef.current || '',
                      source: 'app'
                    })
                  }).catch(e => console.warn("Feedback submission failed:", e));
                } catch (e) {
                  console.warn("Feedback submission error:", e);
                }

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
        // Server returned error — queue offline as fallback
        try {
          await AsyncStorage.setItem(
            `pending_submit_${testId}`,
            JSON.stringify({ ...attemptPayload, queuedAt: Date.now(), correctCount, incorrectCount, totalQs, unattemptedCount })
          );
        } catch {}
        setModalConfig({
          visible: true,
          title: 'Saved — Will Sync Later',
          message: `Server returned an error but your result was saved locally.\n\nMarks scored: ${totalMarks.toFixed(1)}\nCorrect: ${correctCount}/${totalQs} | Accuracy: ${accuracy.toFixed(1)}%\n\n📡 Result will sync automatically when connection is restored.`,
          isSubmittedModal: true,
          buttons: [
            {
              text: 'Back to Home',
              onPress: () => {
                setModalConfig((prevVal) => ({ ...prevVal, visible: false }));
                onBack();
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
        message: isOnlineRef.current
          ? 'Are you sure you want to finish and submit your exam sheet now?'
          : '⚠️ You are offline. Your result will be saved on this device and synced automatically when internet is available.',
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
            text: isOnlineRef.current ? 'Submit Paper' : 'Save & Exit',
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

  // Keep handleExamSubmitRef always pointing at the latest handleExamSubmit
  // so the timer interval can call it without a stale closure
  useEffect(() => {
    handleExamSubmitRef.current = handleExamSubmit;
  });

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
        <SpinningDotsLoader size={56} isDark={isDark} message={loadingText} />
      </View>
    );
  }

  if (!loading && questions.length === 0) {
    return (
      <View style={[styles.instContainer, isDark && { backgroundColor: ThemeColors.dark.bg }, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <StatusBar 
          barStyle={isDark ? 'light-content' : 'dark-content'} 
          backgroundColor={isDark ? ThemeColors.dark.headerBg : '#0F2942'} 
        />
        <View style={{
          width: '100%',
          maxWidth: 340,
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
          borderWidth: 1,
          borderRadius: 20,
          padding: 24,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 8,
        }}>
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
            borderColor: '#F59E0B',
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Clock size={32} color="#F59E0B" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', textAlign: 'center', marginBottom: 8 }}>
            Test Uploaded Soon
          </Text>
          <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
            Questions for <Text style={{ fontWeight: '700', color: '#3B82F6' }}>{mockTestTitle || 'this mock test'}</Text> are currently being curated and will be uploaded soon. Please check back later!
          </Text>
          <View style={{
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
            borderWidth: 1,
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 14,
            width: '100%',
            marginBottom: 20,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#FBBF24' : '#D97706', textAlign: 'center' }}>
              ⚡ यह टेस्ट जल्द ही ऐप पर उपलब्ध होगा।
            </Text>
          </View>
          <TouchableOpacity
            style={{
              width: '100%',
              backgroundColor: isRequested ? 'rgba(16, 185, 129, 0.15)' : '#F59E0B',
              borderColor: isRequested ? '#10B981' : '#D97706',
              borderWidth: 1,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              marginBottom: 12,
            }}
            onPress={handleRequestUpload}
            disabled={requestingUpload || isRequested}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: isRequested ? '#10B981' : '#0F172A' }}>
              {isRequested ? '✓ Upload Requested' : requestingUpload ? 'Submitting Request...' : '🚀 Request to Upload Test'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              width: '100%',
              backgroundColor: '#2563EB',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
            }}
            onPress={onBack}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>Return to Test Series</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Active question details Ã¢â‚¬â€ fall back to Hindi if English content is empty (bilingual questions)
  const questionContentEn = activeQuestion?.content['en'];
  const questionContentHi = activeQuestion?.content['hi'];
  const questionContent = lang === 'en'
    ? (questionContentEn?.questionText ? questionContentEn : questionContentHi)
    : (questionContentHi?.questionText ? questionContentHi : questionContentEn);
  const questionText = questionContent?.questionText || '';
  const options = questionContent?.options || [];
  const activeResp = activeQuestion ? responses[activeQuestion.id] : null;

  const examName = mockTestTitle || "General Mock Test Assessment";

  if (showInstructions) {
    const isCtetFullTest = (testId || '').toLowerCase().includes('ctet');
    if (isCtetFullTest) {
      const lowerId = (testId || '').toLowerCase();
      const isPaper2 = lowerId.includes('paper2') || lowerId.includes('paper-2') || lowerId.includes('paper_2') || lowerId.includes('paper 2') || lowerId.includes('p2') || lowerId.includes('ctet2');
      const totalSections = isPaper2 ? 4 : 5;
      const lang1SectionText = isPaper2 ? "3rd" : "4th";
      const lang2SectionText = isPaper2 ? "4th" : "5th";

      const isCtetFormValid = 
        ctetDefaultLang !== '' && ctetDefaultLang !== '-- Select --' &&
        ctetLang1 !== '' && ctetLang1 !== '-- Select --' &&
        ctetLang2 !== '' && ctetLang2 !== '-- Select --' &&
        ctetAgreed;

      return (
        <View style={[styles.instContainer, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
          <StatusBar 
            barStyle={isDark ? 'light-content' : 'dark-content'} 
            backgroundColor={isDark ? ThemeColors.dark.headerBg : '#0F2942'} 
          />
          {/* Header */}
          <View style={[
            styles.instHeader, 
            isDark && { backgroundColor: ThemeColors.dark.headerBg },
            { height: vs(56) + insets.top, paddingTop: insets.top, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ShieldCheck size={20} color="#2563EB" style={{ marginRight: 8 }} />
              <Text style={styles.instHeaderTitle}>CTET Instructions Panel</Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={[styles.instScrollContent, { padding: 16 }]}>
            <View style={[{
              backgroundColor: isDark ? ThemeColors.dark.card : '#FFFFFF',
              borderColor: isDark ? ThemeColors.dark.border : '#E2E8F0',
              borderWidth: 1,
              borderRadius: 12,
              padding: 16,
            }]}>
              
              {/* Header Metadata */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#1F2E54' : '#F1F5F9', marginBottom: 14 }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: isDark ? '#FFFFFF' : '#0F172A' }}>Duration: 150 Mins</Text>
                <Text style={{ fontWeight: '700', fontSize: 13, color: isDark ? '#FFFFFF' : '#0F172A' }}>Maximum Marks: 150</Text>
              </View>

              {/* Section 1: Instructions List */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 10 }}>
                  Read the following instructions carefully.
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 6, lineHeight: 18 }}>
                  1. The test contain {totalSections} sections having total 150 questions.
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 6, lineHeight: 18 }}>
                  2. Each question has 4 options out of which only one is correct.
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 6, lineHeight: 18 }}>
                  3. You have to finish the test in 150 minutes.
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 6, lineHeight: 18 }}>
                  4. There is no negative marking in this test.
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 6, lineHeight: 18 }}>
                  5. You will be awarded 1 mark for each correct answer.
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 6, lineHeight: 18 }}>
                  6. There is no negative marking for the questions that you have not attempted.
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 6, lineHeight: 18 }}>
                  7. You can write this test only once. Make sure that you complete the test before you submit the test.
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: isDark ? '#1F2E54' : '#E2E8F0', marginVertical: 14 }} />

              {/* Section 2: Language Selectors */}
              {/* 1. Default Language */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: isDark ? '#FFFFFF' : '#0F172A' }}>
                    Choose your default language:
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setCtetDefaultLangModal(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                      borderWidth: 1,
                      borderRadius: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      minWidth: 130,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: ctetDefaultLang ? (isDark ? '#FFFFFF' : '#0F172A') : (isDark ? '#94A3B8' : '#64748B') }}>
                      {ctetDefaultLang || '-- Select --'}
                    </Text>
                    <ChevronDown size={14} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 11, color: isDark ? '#F87171' : '#DC2626', fontWeight: '500', marginTop: 4 }}>
                  Please note all questions will appear in your default language. This language can be changed for a particular question later on
                </Text>
              </View>

              {/* 2. Language - I */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: isDark ? '#FFFFFF' : '#0F172A' }}>
                    Language - I:
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setCtetLang1Modal(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                      borderWidth: 1,
                      borderRadius: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      minWidth: 130,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: ctetLang1 ? (isDark ? '#FFFFFF' : '#0F172A') : (isDark ? '#94A3B8' : '#64748B') }}>
                      {ctetLang1 || '-- Select --'}
                    </Text>
                    <ChevronDown size={14} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 11, color: isDark ? '#F87171' : '#DC2626', fontWeight: '500', marginTop: 4 }}>
                  Please note all questions in {lang1SectionText} section will appear based on your selection here. This CANNOT be changed later on once the test starts
                </Text>
              </View>

              {/* 3. Language - II */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: isDark ? '#FFFFFF' : '#0F172A' }}>
                    Language - II:
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setCtetLang2Modal(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                      borderWidth: 1,
                      borderRadius: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      minWidth: 130,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: ctetLang2 ? (isDark ? '#FFFFFF' : '#0F172A') : (isDark ? '#94A3B8' : '#64748B') }}>
                      {ctetLang2 || '-- Select --'}
                    </Text>
                    <ChevronDown size={14} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 11, color: isDark ? '#F87171' : '#DC2626', fontWeight: '500', marginTop: 4 }}>
                  Please note all questions in {lang2SectionText} section will appear based on your selection here. This CANNOT be changed later on once the test starts
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: isDark ? '#1F2E54' : '#E2E8F0', marginVertical: 14 }} />

              {/* Section 3: Declaration */}
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 8 }}>
                  Declaration:
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.checkboxContainer}
                  onPress={() => setCtetAgreed(!ctetAgreed)}
                >
                  <View style={[
                    styles.checkbox,
                    ctetAgreed && styles.checkboxChecked,
                    isDark && { borderColor: ThemeColors.dark.border },
                    ctetAgreed && isDark && { backgroundColor: '#10B981', borderColor: '#10B981' }
                  ]}>
                    {ctetAgreed && (
                      <View style={styles.checkboxTickContainer}>
                        <View style={styles.checkboxTickShort} />
                        <View style={styles.checkboxTickLong} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.checkboxLabel, isDark && { color: ThemeColors.dark.textMuted }]}>
                    I have understood and agree to all the instructions.
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>

          {/* Footer controls */}
          <View style={[
            styles.instFooter, 
            isDark && { backgroundColor: ThemeColors.dark.bottomNavBg, borderTopColor: ThemeColors.dark.bottomNavBorder },
            { height: vs(56) + insets.bottom, paddingBottom: insets.bottom }
          ]}>
            <TouchableOpacity 
              style={[styles.instCancelBtn, isDark && { backgroundColor: '#0B1329', borderColor: '#1F2E54' }]} 
              onPress={handleCancelInstructions}
            >
              <Text style={[styles.instCancelText, isDark && { color: ThemeColors.dark.text }]}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              disabled={!isCtetFormValid}
              style={[
                styles.instStartBtn, 
                !isCtetFormValid && styles.instStartBtnDisabled,
                isCtetFormValid && { backgroundColor: '#46cae4' }
              ]} 
              onPress={handleStartCtetExam}
            >
              <Text style={styles.instStartText}>I am ready to begin</Text>
            </TouchableOpacity>
          </View>
          {/* Default Lang Modal */}
          <Modal visible={ctetDefaultLangModal} transparent animationType="fade" onRequestClose={() => setCtetDefaultLangModal(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => setCtetDefaultLangModal(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <View style={{ width: '100%', maxWidth: 300, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0', padding: 14, elevation: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 10 }}>
                  Choose your default language:
                </Text>
                {['-- Select --', 'English', 'Hindi'].map(opt => {
                  const isSel = (opt === '-- Select --' && !ctetDefaultLang) || ctetDefaultLang === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      activeOpacity={0.7}
                      onPress={() => {
                        setCtetDefaultLang(opt === '-- Select --' ? '' : opt);
                        setCtetDefaultLangModal(false);
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        marginBottom: 4,
                        backgroundColor: isSel ? (isDark ? '#0284C7' : '#0284C7') : (isDark ? '#0F172A' : '#F8FAFC'),
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: isSel ? '700' : '500', color: isSel ? '#FFFFFF' : (isDark ? '#E2E8F0' : '#334155') }}>
                        {opt}
                      </Text>
                      {isSel && <Check size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Language 1 Modal */}
          <Modal visible={ctetLang1Modal} transparent animationType="fade" onRequestClose={() => setCtetLang1Modal(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => setCtetLang1Modal(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <View style={{ width: '100%', maxWidth: 300, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0', padding: 14, elevation: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 10 }}>
                  Language - I:
                </Text>
                {['-- Select --', 'English', 'Hindi', 'Sanskrit'].map(opt => {
                  const isSel = (opt === '-- Select --' && !ctetLang1) || ctetLang1 === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      activeOpacity={0.7}
                      onPress={() => {
                        setCtetLang1(opt === '-- Select --' ? '' : opt);
                        setCtetLang1Modal(false);
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        marginBottom: 4,
                        backgroundColor: isSel ? (isDark ? '#0284C7' : '#0284C7') : (isDark ? '#0F172A' : '#F8FAFC'),
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: isSel ? '700' : '500', color: isSel ? '#FFFFFF' : (isDark ? '#E2E8F0' : '#334155') }}>
                        {opt}
                      </Text>
                      {isSel && <Check size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Language 2 Modal */}
          <Modal visible={ctetLang2Modal} transparent animationType="fade" onRequestClose={() => setCtetLang2Modal(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => setCtetLang2Modal(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <View style={{ width: '100%', maxWidth: 300, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0', padding: 14, elevation: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 10 }}>
                  Language - II:
                </Text>
                {['-- Select --', 'English', 'Hindi', 'Sanskrit'].map(opt => {
                  const isSel = (opt === '-- Select --' && !ctetLang2) || ctetLang2 === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      activeOpacity={0.7}
                      onPress={() => {
                        setCtetLang2(opt === '-- Select --' ? '' : opt);
                        setCtetLang2Modal(false);
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        marginBottom: 4,
                        backgroundColor: isSel ? (isDark ? '#0284C7' : '#0284C7') : (isDark ? '#0F172A' : '#F8FAFC'),
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: isSel ? '700' : '500', color: isSel ? '#FFFFFF' : (isDark ? '#E2E8F0' : '#334155') }}>
                        {opt}
                      </Text>
                      {isSel && <Check size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      );
    }

    const t = instructionTexts[lang];

    let maxMarks = 0;
    questions.forEach(q => {
      const qSec = sections.find(s => s.id === q.sectionId);
      maxMarks += q.positiveMark !== undefined && q.positiveMark !== null ? Number(q.positiveMark) : (qSec ? qSec.positiveMark : 2);
    });
    if (maxMarks === 0) maxMarks = 200;

    const isRpscRas = (testId || '').toLowerCase().includes('rpsc') || (examName || '').toLowerCase().includes('rpsc') || (examName || '').toLowerCase().includes('ras');

    return (
      <View style={[styles.instContainer, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
        <StatusBar 
          barStyle={isDark ? 'light-content' : 'dark-content'} 
          backgroundColor={isDark ? ThemeColors.dark.headerBg : '#0F2942'} 
        />
        {/* Header */}
        <View style={[
          styles.instHeader, 
          isDark && { backgroundColor: ThemeColors.dark.headerBg },
          { height: vs(56) + insets.top, paddingTop: insets.top, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
            <ShieldCheck size={18} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={[styles.instHeaderTitle, { flex: 1 }]} numberOfLines={1}>
              {examName || 'Mock Exam Instructions Panel'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.instLangBtn, isDark && { backgroundColor: '#16223F', borderColor: '#1F2E54' }]} 
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
          
          {/* Metadata Row Grid (Duration, Qs, Max Marks, Total Sections) */}
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
            <View style={[styles.instMetaDivider, isDark && { backgroundColor: ThemeColors.dark.border }]} />
            <View style={styles.instMetaItem}>
              <Text style={[styles.instMetaValue, { color: '#10B981' }]}>{sections.length} Secs</Text>
              <Text style={[styles.instMetaLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Sections</Text>
            </View>
          </View>

          {/* Section Breakdown Table */}
          {sections.length > 0 && (
            <View style={[
              styles.instTextBox,
              { padding: 12, marginBottom: 14 },
              isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }
            ]}>
              <Text style={[{ fontSize: 12, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' }, isDark ? { color: '#E2E8F0' } : { color: '#334155' }]}>
                {lang === 'hi' ? 'परीक्षा संरचना एवं खंड विवरण' : 'Exam Structure & Section Breakdown'}
              </Text>
              <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0' }}>
                <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#1E293B' : '#F1F5F9', paddingVertical: 8, paddingHorizontal: 10 }}>
                  <Text style={{ flex: 2, fontSize: 11, fontWeight: '800', color: isDark ? '#CBD5E1' : '#475569' }}>Section</Text>
                  <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', textAlign: 'center', color: isDark ? '#CBD5E1' : '#475569' }}>Qs</Text>
                  <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', textAlign: 'center', color: '#10B981' }}>+Mark</Text>
                  <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', textAlign: 'center', color: '#EF4444' }}>-Mark</Text>
                  <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '800', textAlign: 'right', color: '#3B82F6' }}>Total</Text>
                </View>
                {sections.map((sec, idx) => {
                  const secQs = questions.filter(q => q.sectionId === sec.id).length;
                  const secMarks = secQs * (sec.positiveMark || 2);
                  return (
                    <View
                      key={sec.id || idx}
                      style={{
                        flexDirection: 'row',
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        borderTopWidth: idx > 0 ? 1 : 0,
                        borderTopColor: isDark ? '#334155' : '#F1F5F9',
                        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      }}
                    >
                      <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: isDark ? '#E2E8F0' : '#1E293B' }}>{sec.name}</Text>
                      <Text style={{ flex: 1, fontSize: 11, textAlign: 'center', color: isDark ? '#94A3B8' : '#64748B' }}>{secQs}</Text>
                      <Text style={{ flex: 1, fontSize: 11, textAlign: 'center', fontWeight: '700', color: '#10B981' }}>+{sec.positiveMark}</Text>
                      <Text style={{ flex: 1, fontSize: 11, textAlign: 'center', fontWeight: '700', color: '#EF4444' }}>-{sec.negativeMark}</Text>
                      <Text style={{ flex: 1.2, fontSize: 11, textAlign: 'right', fontWeight: '800', color: '#3B82F6' }}>{secMarks}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Question Palette Status Legend */}
          <View style={[
            styles.instTextBox,
            { padding: 12, marginBottom: 14 },
            isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }
          ]}>
            <Text style={[{ fontSize: 12, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' }, isDark ? { color: '#E2E8F0' } : { color: '#334155' }]}>
              {lang === 'hi' ? 'प्रश्न पैलेट स्थिति गाइड' : 'Question Palette Status Legend'}
            </Text>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569' }}>1</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94A3B8' : '#475569' }}>
                  {lang === 'hi' ? 'देखा नहीं गया (Not Visited)' : 'Not Visited'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>2</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94A3B8' : '#475569' }}>
                  {lang === 'hi' ? 'उत्तर नहीं दिया गया (Not Answered)' : 'Not Answered'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>3</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94A3B8' : '#475569' }}>
                  {lang === 'hi' ? 'उत्तर दिया गया (Answered)' : 'Answered'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>4</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94A3B8' : '#475569' }}>
                  {lang === 'hi' ? 'समीक्षा के लिए चिह्नित (Marked for Review)' : 'Marked for Review'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>5</Text>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399', position: 'absolute', top: 2, right: 2 }} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94A3B8' : '#475569' }}>
                  {lang === 'hi' ? 'उत्तर दिया एवं समीक्षा के लिए चिह्नित' : 'Answered & Marked for Review'}
                </Text>
              </View>
            </View>
          </View>

          {/* Instructions Box */}
          <View style={[styles.instTextBox, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
            <Text style={[styles.instTextTitle, isDark && { color: '#60A5FA' }]}>{t.title}</Text>
            
            <Text style={[styles.instTextHeading, isDark && { color: ThemeColors.dark.text }]}>{t.general}</Text>
            <Text style={[styles.instTextBody, isDark && { color: ThemeColors.dark.textMuted }]}>{t.gen1}</Text>
            <Text style={[styles.instTextBody, isDark && { color: ThemeColors.dark.textMuted }]}>{t.gen2}</Text>
            <Text style={[styles.instTextBody, isDark && { color: ThemeColors.dark.textMuted }]}>{t.gen3}</Text>
            <Text style={[styles.instTextBody, isDark && { color: ThemeColors.dark.textMuted }]}>{t.gen4}</Text>

            <Text style={[styles.instTextHeading, { marginTop: 14 }, isDark && { color: ThemeColors.dark.text }]}>{t.answering}</Text>
            <Text style={[styles.instTextBody, isDark && { color: ThemeColors.dark.textMuted }]}>{t.ans1}</Text>
            <Text style={[styles.instTextBody, isDark && { color: ThemeColors.dark.textMuted }]}>{t.ans2}</Text>
            <Text style={[styles.instTextBody, isDark && { color: ThemeColors.dark.textMuted }]}>{t.ans3}</Text>

            {isRpscRas && (
              <View style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#F1F5F9' }}>
                <Text style={[{ fontWeight: '800', color: '#EF4444', marginBottom: 4 }]}>{t.rpscTitle}</Text>
                <Text style={[{ fontSize: 11, color: isDark ? '#FCA5A5' : '#DC2626', marginBottom: 4 }]}>{t.rpsc1}</Text>
                <Text style={[{ fontSize: 11, color: isDark ? '#FCA5A5' : '#DC2626' }]}>{t.rpsc2}</Text>
              </View>
            )}
          </View>

          {/* Default Language Selector */}
          <View style={[styles.instLangSelectCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.instLangSelectTitle, isDark && { color: '#FFF' }]}>
                {lang === 'hi' ? '\u0905\u092a\u0928\u0940 \u0921\u093f\u092b\u093c\u0949\u0932\u094d\u091f \u092a\u0930\u0940\u0915\u094d\u0937\u093e \u092d\u093e\u0937\u093e \u091a\u0941\u0928\u0947\u0902' : 'Choose your default exam language'}
              </Text>
              <Text style={[styles.instLangSelectSub, isDark && { color: ThemeColors.dark.textMuted }]}>
                {lang === 'hi' ? '\u092a\u094d\u0930\u0936\u094d\u0928\u094b\u0902 \u0915\u094b \u0926\u0947\u0916\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0921\u093f\u092b\u093c\u0949\u0932\u094d\u091f \u092d\u093e\u0937\u093e \u091a\u0941\u0928\u0947\u0902' : 'Select the default language for viewing questions'}
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
                <Text style={[styles.langSelectorText, lang === 'hi' && styles.langSelectorTextActive, isDark && lang !== 'hi' && { color: ThemeColors.dark.textMuted }]}>{'हिंदी'}</Text>
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
              {agreed && (
                <View style={styles.checkboxTickContainer}>
                  <View style={styles.checkboxTickShort} />
                  <View style={styles.checkboxTickLong} />
                </View>
              )}
            </View>
            <Text style={[styles.checkboxLabel, isDark && { color: ThemeColors.dark.textMuted }]}>
              {t.disclaimer}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer controls */}
        <View style={[
          styles.instFooter, 
          isDark && { backgroundColor: ThemeColors.dark.bottomNavBg, borderTopColor: ThemeColors.dark.bottomNavBorder },
          { height: vs(56) + insets.bottom, paddingBottom: insets.bottom }
        ]}>
          <TouchableOpacity 
            style={[styles.instCancelBtn, isDark && { backgroundColor: '#0B1329', borderColor: '#1F2E54' }]} 
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
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
      <StatusBar 
        barStyle="light-content"
        backgroundColor="#1A1A2E"
      />

      {/* Ã¢â‚¬â€ Header Ã¢â‚¬â€ */}
      <View style={[
        styles.examHeader,
        { paddingTop: insets.top + vs(10), minHeight: vs(56) + insets.top }
      ]}>
        {/* Left: pause + timer + exam name */}
        <TouchableOpacity style={styles.pauseTextBtn} onPress={handlePauseAndExit}>
          <Text style={styles.pauseTextBtnText}>|| Pause</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(4) }}>
            {hasSectionalTiming && (
              <View style={styles.sectionTimerBadge}>
                <Text style={styles.sectionTimerBadgeText}>⏱ SEC</Text>
              </View>
            )}
            <Text style={[
              styles.headerTimer,
              hasSectionalTiming && timeLeft <= 120 && styles.headerTimerUrgent
            ]}>{formatTime(timeLeft)}</Text>
          </View>
          <Text style={[styles.headerExamName, { fontSize: rs(10) }]} numberOfLines={1}>
            {examName}
          </Text>
        </View>
        <TouchableOpacity style={styles.hamburgerBtn} onPress={openDrawer}>
          <AlignJustify size={rs(22)} color="#FFF" />
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Offline - answers are saved locally and will sync when internet is restored
          </Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.sectionsRow, isDark && { backgroundColor: ThemeColors.dark.card, borderBottomColor: ThemeColors.dark.border }]}
        contentContainerStyle={styles.sectionsRowContent}
      >
        {sections.map((sec, idx) => {
          const isActiveSec = currentSectionIdx === idx;
          const isLocked = hasSectionalTiming && !isActiveSec;
          return (
            <TouchableOpacity
              key={sec.id}
              style={[
                styles.sectionTab,
                isActiveSec && styles.sectionTabActive,
                isLocked && { opacity: 0.45 },
              ]}
              onPress={() => {
                if (isLocked) return;
                isProgrammaticScrollRef.current = true;
                setCurrentSectionIdx(idx);
                setCurrentQuestionIdx(0);
              }}
              disabled={isLocked}
            >
              <Text style={[
                styles.sectionTabText,
                isDark && { color: ThemeColors.dark.textMuted },
                isActiveSec && styles.sectionTabTextActive,
              ]}>
                {isLocked ? '🔒 ' : ''}{sec.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.statsBar, isDark && { backgroundColor: isDark ? '#0F1729' : '#F9FAFB', borderBottomColor: ThemeColors.dark.border }]}>
        <Text style={[styles.statsText, isDark && { color: ThemeColors.dark.textMuted }]}>
          Answered: <Text style={styles.statsHighlight}>{answeredCount}</Text>
        </Text>
        <View style={styles.statsRight}>
          {minutesLeft <= 15 && (
            <Text style={[styles.statsWarning, { marginRight: rs(8) }]}>
              Last {minutesLeft} Mins{hasSectionalTiming ? ' (Section)' : ''}
            </Text>
          )}
          <View style={[styles.langToggleRow, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
            <TouchableOpacity
              style={[styles.langToggleBtn, lang === 'en' && styles.langToggleBtnActive]}
              onPress={() => setLang('en')}
            >
              <Text style={[styles.langToggleTxt, lang === 'en' && styles.langToggleTxtActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langToggleBtn, lang === 'hi' && styles.langToggleBtnActive]}
              onPress={() => setLang('hi')}
            >
              <Text style={[styles.langToggleTxt, lang === 'hi' && styles.langToggleTxtActive]}>{'हि'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        ref={questionsPagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
        keyboardShouldPersistTaps="handled"
        scrollsToTop={false}
        removeClippedSubviews={Platform.OS === 'android'}
        onMomentumScrollEnd={(e) => {
          const pageIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          if (pageIndex !== currentQuestionIdxLiveRef.current) {
            setCurrentQuestionIdx(pageIndex);
          }
        }}
        style={{ flex: 1 }}
      >
        {sectionQuestions.map((q, qIdx) => {
          const isNearVisible = Math.abs(qIdx - currentQuestionIdx) <= 2;
          if (!isNearVisible) {
            return <View key={q.id} style={{ width: SCREEN_WIDTH, flex: 1 }} />;
          }

          const posVal = q.positiveMark !== undefined && q.positiveMark !== null ? q.positiveMark : (activeSection?.positiveMark ?? 2);
          const negVal = q.negativeMark !== undefined && q.negativeMark !== null ? q.negativeMark : (activeSection?.negativeMark ?? 0.5);

          const posMarkText = `+${posVal}`;
          const negMarkText = `-${negVal}`;

          return (
            <QuestionCardItem
              key={q.id}
              q={q}
              qIdx={qIdx}
              lang={lang}
              isDark={isDark}
              qResp={responses[q.id]}
              onSelectOption={handleSelectOption}
              posMarkText={posMarkText}
              negMarkText={negMarkText}
            />
          );
        })}
      </ScrollView>

      {/* — Bottom Navigation Bar — */}
      <View style={[
        styles.footer, 
        isDark && { backgroundColor: ThemeColors.dark.bottomNavBg, borderTopColor: ThemeColors.dark.bottomNavBorder },
        { paddingBottom: Math.max(insets.bottom, vs(8)) }
      ]}>
        <TouchableOpacity
          style={[styles.footerBtn, styles.footerBtnOutline, isDark && { borderColor: '#334155' }]}
          onPress={handlePreviousQuestion}
        >
          <Text style={[styles.footerBtnOutlineText, isDark && { color: '#94A3B8' }]}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerBtn, styles.footerBtnMarkReview, isDark && { borderColor: '#334155' }]}
          onPress={handleMarkForReview}
        >
          <Text style={styles.footerBtnMarkReviewText}>Mark For Review</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerBtn, styles.footerBtnPrimary]}
          onPress={handleSaveAndNext}
        >
          <Text style={styles.footerBtnPrimaryText}>Save & Next</Text>
        </TouchableOpacity>
      </View>

      {/* Palette Drawer (right slide-in) */}
      <Modal
        visible={drawerMounted}
        animationType="fade"
        transparent={true}
        onRequestClose={closeDrawer}
      >
        <View style={styles.paletteOverlay}>
          <Animated.View style={[styles.paletteOverlayBg, { opacity: overlayOpacity }]} pointerEvents="auto">
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View style={[
            styles.paletteDrawer, 
            isDark && { backgroundColor: '#0F1729' },
            { transform: [{ translateX: drawerAnimation }] }
          ]}>

            {/* Section part buttons */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.partScrollRow} contentContainerStyle={{ paddingHorizontal: rs(12), gap: rs(8) }}>
              {sections.map((sec, idx) => {
                const isLocked = hasSectionalTiming && idx !== currentSectionIdx;
                return (
                  <TouchableOpacity
                    key={sec.id}
                    disabled={isLocked}
                    style={[
                      styles.partBtn,
                      drawerSectionIdx === idx && styles.partBtnActive,
                      isLocked && { opacity: 0.45 },
                      isDark && { borderColor: drawerSectionIdx === idx ? '#3B82F6' : '#334155' }
                    ]}
                    onPress={() => setDrawerSectionIdx(idx)}
                  >
                    <Text style={[styles.partBtnText, drawerSectionIdx === idx && styles.partBtnTextActive, isDark && { color: drawerSectionIdx === idx ? '#3B82F6' : '#94A3B8' }]}>
                      {isLocked ? '🔒 ' : ''}PART - {String.fromCharCode(65 + idx)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Section name + stats */}
            <View style={[styles.paletteSecHeader, isDark && { borderBottomColor: '#1E293B' }]}>
              <Text style={[styles.paletteSecTitle, isDark && { color: '#F1F5F9' }]}>
                {sections[drawerSectionIdx]?.name || ''}
              </Text>
              <View style={styles.paletteStatRow}>
                <View style={styles.paletteStat}>
                  <View style={[styles.paletteStatDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={[styles.paletteStatLabel, isDark && { color: '#94A3B8' }]}>Answered Qs</Text>
                  <Text style={[styles.paletteStatValue, isDark && { color: '#F1F5F9' }]}>{drawerSecAnswered}</Text>
                </View>
                <View style={styles.paletteStat}>
                  <View style={[styles.paletteStatDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={[styles.paletteStatLabel, isDark && { color: '#94A3B8' }]}>Unanswered Qs</Text>
                  <Text style={[styles.paletteStatValue, isDark && { color: '#F1F5F9' }]}>{drawerSecUnanswered}</Text>
                </View>
              </View>
            </View>

            {/* Question grid */}
            <ScrollView contentContainerStyle={styles.paletteGridContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.paletteGrid}>
                {drawerSecQs.map((q, qIdx) => {
                  const resp = responses[q.id];
                  const qState = resp ? resp.state : 1;
                  const isActive = currentSectionIdx === drawerSectionIdx && currentQuestionIdx === qIdx;

                  let cellBg = '#3B82F6'; // unanswered / default blue
                  let cellBorder = 'transparent';
                  let textColor = '#FFF';
                  let hasCheck = false;

                  switch (qState) {
                    case 1: // Not visited
                      cellBg = '#3B82F6';
                      break;
                    case 2: // Not answered (visited but no selection)
                      cellBg = '#3B82F6';
                      break;
                    case 3: // Answered
                      cellBg = '#22C55E';
                      break;
                    case 4: // Marked for review
                      cellBg = '#8B5CF6';
                      break;
                    case 5: // Answered & Marked
                      cellBg = '#8B5CF6';
                      hasCheck = true;
                      break;
                  }

                  if (isActive) {
                    cellBorder = '#FFF';
                  }

                  return (
                    <TouchableOpacity
                      key={q.id}
                      style={[
                        styles.paletteCell,
                        { backgroundColor: cellBg, borderColor: cellBorder },
                      ]}
                      onPress={() => {
                        handleJumpToQuestion(drawerSectionIdx, qIdx);
                        setDrawerMounted(false);
                      }}
                    >
                      <Text style={[styles.paletteCellText, { color: textColor }]}>{qIdx + 1}</Text>
                      {hasCheck && (
                        <View style={styles.miniCheck}>
                          <Text style={styles.miniCheckText}>ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Submit section button ONLY if test has sectional timing enabled */}
            {hasSectionalTiming && sections && sections.length > 1 && (
              <TouchableOpacity
                style={[styles.paletteSubmitBtn, { backgroundColor: '#059669', marginBottom: 10 }]}
                onPress={() => {
                  setDrawerMounted(false);
                  handleSubmitSection();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.paletteSubmitText}>
                  {currentSectionIdx < sections.length - 1 ? 'SUBMIT SECTION' : 'SUBMIT FINAL SECTION'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={styles.paletteSubmitBtn}
              onPress={() => { setDrawerMounted(false); handleExamSubmit(false); }}
            >
              <Text style={styles.paletteSubmitText}>SUBMIT TEST</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Modern Custom Modal for Alerts & Pause */}
      <Modal
        visible={modalConfig.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!modalConfig.isPauseModal && !modalConfig.isSubmittedModal) {
            setModalConfig((prev) => ({ ...prev, visible: false }));
          }
        }}
      >
        <View style={[
          styles.customModalOverlay,
          modalConfig.isPauseModal ? styles.customModalOverlayPaused : styles.customModalOverlayStandard
        ]}>
          <View style={[styles.modalContent, isDark && { backgroundColor: ThemeColors.dark.card }]}>
            {modalConfig.isPauseModal ? (
              <View style={{ marginVertical: 12, width: '100%', alignItems: 'center' }}>
                <View style={{
                  height: 48,
                  width: 48,
                  borderRadius: 24,
                  backgroundColor: '#FEF3C7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12
                }}>
                  <Text style={{ fontSize: 24 }}>⏳</Text>
                </View>
                
                <Text style={[styles.modalTitle, isDark && { color: ThemeColors.dark.text }, { marginBottom: 4 }]}>
                  {modalConfig.title}
                </Text>
                <Text style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: isDark ? '#94A3B8' : '#64748B',
                  textAlign: 'center',
                  marginBottom: 16,
                  paddingHorizontal: 8,
                  lineHeight: 16
                }}>
                  Your exam timer and questions are hidden. Review your progress summary below to resume.
                </Text>

                {/* Progress Summary Grid */}
                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  gap: 8,
                  width: '100%',
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                  paddingVertical: 12,
                  marginBottom: 16
                }}>
                  {/* Total Questions */}
                  <View style={{
                    width: '47%',
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 8,
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>Total Questions:</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDark ? '#F1F5F9' : '#1E293B', marginTop: 2 }}>{questions.length}</Text>
                  </View>

                  {/* Time Left */}
                  <View style={{
                    width: '47%',
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 8,
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>Time Left:</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#F59E0B', marginTop: 2, fontFamily: 'monospace' }}>{formatTime(timeLeft)}</Text>
                  </View>

                  {/* Attempted Qs */}
                  <View style={{
                    width: '47%',
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 8,
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>Attempted Qs:</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#10B981', marginTop: 2 }}>
                      {Object.values(responses).filter(r => r.state === 3 || r.state === 5).length}
                    </Text>
                  </View>

                  {/* Remaining Qs */}
                  <View style={{
                    width: '47%',
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 8,
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>Remaining Qs:</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#EF4444', marginTop: 2 }}>
                      {questions.length - Object.values(responses).filter(r => r.state === 3 || r.state === 5).length}
                    </Text>
                  </View>

                  {/* Marked for Review Qs */}
                  <View style={{
                    width: '100%',
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 8,
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>Marked for Review Qs:</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#6366F1', marginTop: 2 }}>
                      {Object.values(responses).filter(r => r.state === 4 || r.state === 5).length}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Text style={[styles.modalTitle, isDark && { color: ThemeColors.dark.text }]}>{modalConfig.title}</Text>
                <Text style={[styles.modalMessage, isDark && { color: ThemeColors.dark.textMuted }]}>{modalConfig.message}</Text>
              </>
            )}
            
            {modalConfig.isSubmittedModal && (() => {
              const appStarColor = appRatingGoldenBlink.interpolate({
                inputRange: [0, 1],
                outputRange: [isDark ? '#334155' : '#CBD5E1', '#F59E0B'],
              });
              const examStarColor = examRatingGoldenBlink.interpolate({
                inputRange: [0, 1],
                outputRange: [isDark ? '#334155' : '#CBD5E1', '#F59E0B'],
              });
              const appBorderColor = appRatingGoldenBlink.interpolate({
                inputRange: [0, 1],
                outputRange: [websiteRating > 0 ? '#10B981' : (isDark ? '#334155' : '#E2E8F0'), '#F59E0B'],
              });
              const examBorderColor = examRatingGoldenBlink.interpolate({
                inputRange: [0, 1],
                outputRange: [examRating > 0 ? '#10B981' : (isDark ? '#334155' : '#E2E8F0'), '#F59E0B'],
              });

              return (
                <View style={{ marginVertical: 10, width: '100%', alignItems: 'stretch' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: 'bold', color: isDark ? '#FFF' : '#1E293B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {lang === 'hi' ? '⭐ रेटिंग और प्रतिक्रिया' : '⭐ Ratings & Feedback'}
                    </Text>
                  </View>
                  
                  {/* 1. Rate App Experience */}
                  <Animated.View style={{
                    marginBottom: 10,
                    backgroundColor: isDark ? '#0B1329' : '#F8FAFC',
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: appBorderColor,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: isDark ? '#E2E8F0' : '#1E293B' }}>
                        {lang === 'hi' ? '1. ऐप अनुभव को रेटिंग दें' : '1. Rate App Experience'}
                      </Text>
                      {websiteRating > 0 && (
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>
                          ✓ {websiteRating} / 5
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          activeOpacity={0.7}
                          onPress={() => setWebsiteRating(star)}
                          style={{ padding: 2 }}
                        >
                          <Animated.Text style={{ fontSize: 26, color: star <= websiteRating ? '#F59E0B' : appStarColor }}>★</Animated.Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </Animated.View>

                  {/* 2. Rate Exam Experience */}
                  <Animated.View style={{
                    marginBottom: 10,
                    backgroundColor: isDark ? '#0B1329' : '#F8FAFC',
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: examBorderColor,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: isDark ? '#E2E8F0' : '#1E293B' }}>
                        {lang === 'hi' ? '2. परीक्षा अनुभव को रेटिंग दें' : '2. Rate Exam Experience'}
                      </Text>
                      {examRating > 0 && (
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>
                          ✓ {examRating} / 5
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          activeOpacity={0.7}
                          onPress={() => setExamRating(star)}
                          style={{ padding: 2 }}
                        >
                          <Animated.Text style={{ fontSize: 26, color: star <= examRating ? '#F59E0B' : examStarColor }}>★</Animated.Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </Animated.View>

                  {/* 3. Written Feedback (Optional) */}
                  <View style={{ marginTop: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#94A3B8' : '#64748B' }}>
                        {lang === 'hi' ? '3. प्रतिक्रिया लिखें (वैकल्पिक):' : '3. Write Feedback (Optional):'}
                      </Text>
                      <Text style={{ fontSize: 9.5, color: '#64748B', fontStyle: 'italic' }}>
                        {lang === 'hi' ? 'वैकल्पिक' : 'Optional'}
                      </Text>
                    </View>
                    <TextInput
                      value={feedbackText}
                      onChangeText={setFeedbackText}
                      placeholder={lang === 'hi' ? 'कृपया अपने विचार लिखें (वैकल्पिक)...' : 'Share your suggestions or feedback (optional)...'}
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      multiline
                      numberOfLines={2}
                      style={{
                        backgroundColor: isDark ? '#0B1329' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        borderWidth: 1,
                        borderRadius: 8,
                        padding: 8,
                        fontSize: 11,
                        color: isDark ? '#FFF' : '#1E293B',
                        textAlignVertical: 'top',
                        height: 48,
                        fontWeight: '500'
                      }}
                    />
                  </View>
                </View>
              );
            })()}

            <View style={styles.modalButtonsContainer}>
              {modalConfig.buttons.map((btn, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  style={[
                    styles.modalButton,
                    btn.style === 'cancel' 
                      ? [styles.modalButtonCancel, isDark && { backgroundColor: '#0B1329', borderColor: '#1F2E54' }] 
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Header ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  examHeader: {
    backgroundColor: '#1A1A2E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    paddingVertical: vs(10),
    minHeight: vs(56),
  },
  pauseTextBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: rs(6),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: vs(6),
    paddingHorizontal: rs(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(10),
  },
  pauseTextBtnText: {
    color: '#FFF',
    fontSize: rs(12),
    fontWeight: 'bold',
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTimer: {
    color: '#FFF',
    fontSize: rs(17),
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  headerExamName: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: rs(11),
    marginTop: 2,
  },
  sectionTimerBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: rs(4),
    paddingHorizontal: rs(5),
    paddingVertical: vs(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTimerBadgeText: {
    color: '#FFF',
    fontSize: rs(9),
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerTimerUrgent: {
    color: '#FCA5A5',
  },
  hamburgerBtn: {
    width: rs(36),
    height: rs(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: rs(8),
  },

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Section Tabs ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  sectionsRow: {
    maxHeight: vs(44),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  sectionsRowContent: {
    alignItems: 'center',
    paddingHorizontal: rs(4),
  },
  sectionTab: {
    paddingHorizontal: rs(16),
    paddingVertical: vs(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#1A1A2E',
  },
  sectionTabText: {
    fontSize: rs(13),
    color: '#9CA3AF',
    fontWeight: '600',
  },
  sectionTabTextActive: {
    color: '#111827',
    fontWeight: 'bold',
  },

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Stats Bar ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rs(14),
    paddingVertical: vs(6),
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statsText: {
    fontSize: rs(11),
    color: '#374151',
  },
  statsHighlight: {
    color: '#F97316',
    fontWeight: 'bold',
  },
  statsWarning: {
    fontSize: rs(11),
    color: '#EF4444',
    fontWeight: 'bold',
  },
  statsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  langToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: rs(6),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  langToggleBtn: {
    paddingHorizontal: rs(10),
    paddingVertical: vs(3),
  },
  langToggleBtnActive: {
    backgroundColor: '#2563EB',
    borderRadius: rs(5),
  },
  langToggleTxt: {
    fontSize: rs(11),
    fontWeight: 'bold',
    color: '#6B7280',
  },
  langToggleTxtActive: {
    color: '#FFF',
  },
  qTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: rs(6),
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: rs(8),
    paddingVertical: vs(3),
    gap: rs(4),
  },
  qTimerIcon: {
    fontSize: rs(10),
    color: '#64748B',
    fontWeight: '600',
  },
  qTimerVal: {
    fontSize: rs(11),
    color: '#0369A1',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Question Area ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  questionContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  questionContentContainer: {
    padding: rs(16),
    paddingBottom: vs(24),
  },
  questionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(14),
    gap: rs(8),
  },
  questionNumBadge: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(6),
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumText: {
    color: '#FFF',
    fontSize: rs(14),
    fontWeight: 'bold',
  },
  questionTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: '#F3F4F6',
    borderRadius: rs(20),
    paddingHorizontal: rs(10),
    paddingVertical: vs(4),
  },
  questionTimerIcon: {
    fontSize: rs(12),
    color: '#6B7280',
  },
  questionTimerValue: {
    fontSize: rs(12),
    color: '#4B5563',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  questionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: rs(12),
  },
  actionIcon: {
    padding: rs(4),
  },
  qSubHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: vs(6),
    marginBottom: vs(12),
  },
  qTypeText: {
    fontSize: rs(11),
    fontWeight: 'bold',
    color: '#0747A6',
  },
  qMarksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  posMarkBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingHorizontal: rs(6),
    paddingVertical: vs(2),
    borderRadius: rs(4),
  },
  posMarkText: {
    color: '#15803D',
    fontSize: rs(10),
    fontWeight: 'bold',
  },
  negMarkBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: rs(6),
    paddingVertical: vs(2),
    borderRadius: rs(4),
  },
  negMarkText: {
    color: '#B91C1C',
    fontSize: rs(10),
    fontWeight: 'bold',
  },
  questionCardBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: rs(10),
    padding: rs(14),
    marginBottom: vs(16),
    width: '100%',
  },
  questionCardBoxDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  questionBody: {
    fontSize: rs(15),
    color: '#111827',
    lineHeight: rs(22),
    fontWeight: '500',
    marginBottom: vs(4),
  },
  violationWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: vs(8),
    marginHorizontal: rs(4),
  },
  violationTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: rs(6),
    borderRightWidth: rs(6),
    borderBottomWidth: rs(10),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#DC2626',
    marginRight: rs(5),
  },
  violationWarning: {
    fontSize: rs(11),
    color: '#DC2626',
    fontWeight: 'bold',
  },

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Options ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  optionsBlock: {
    gap: vs(10),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: rs(10),
    padding: rs(12),
    backgroundColor: '#FFF',
    gap: rs(12),
  },
  optionCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionNumCircle: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(14),
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: vs(1),
  },
  optionNumCircleSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  optionNumText: {
    fontSize: rs(12),
    color: '#4B5563',
    fontWeight: 'bold',
  },
  optionNumTextSelected: {
    color: '#FFF',
  },
  optionText: {
    flex: 1,
    fontSize: rs(13),
    color: '#374151',
    textAlign: 'left',
  },
  optionTextSelected: {
    color: '#1E40AF',
    fontWeight: '600',
  },

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Bottom Nav Bar ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(12),
    paddingVertical: vs(8),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFF',
    gap: rs(8),
  },
  footerBtn: {
    flex: 1,
    paddingVertical: vs(10),
    borderRadius: rs(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnOutline: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: 'transparent',
  },
  footerBtnOutlineText: {
    color: '#2563EB',
    fontSize: rs(12),
    fontWeight: '700',
  },
  footerBtnMarkReview: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: 'transparent',
  },
  footerBtnMarkReviewText: {
    color: '#2563EB',
    fontSize: rs(12),
    fontWeight: '700',
  },
  footerBtnPrimary: {
    backgroundColor: '#2563EB',
  },
  footerBtnPrimaryText: {
    color: '#FFF',
    fontSize: rs(12),
    fontWeight: '700',
  },

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Palette Drawer ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  paletteOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  paletteOverlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  paletteDrawer: {
    width: SCREEN_WIDTH * 0.82,
    height: '100%',
    backgroundColor: '#FFF',
    flexDirection: 'column',
  },
  paletteTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  paletteTabBtn: {
    flex: 1,
    paddingVertical: vs(12),
    alignItems: 'center',
  },
  paletteTabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  paletteTabText: {
    fontSize: rs(13),
    color: '#6B7280',
    fontWeight: '600',
  },
  paletteTabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  partScrollRow: {
    maxHeight: vs(52),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  partBtn: {
    paddingHorizontal: rs(12),
    paddingVertical: vs(8),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: rs(6),
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: vs(8),
  },
  partBtnActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  partBtnText: {
    fontSize: rs(11),
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  partBtnTextActive: {
    color: '#2563EB',
  },
  paletteSecHeader: {
    paddingHorizontal: rs(14),
    paddingTop: vs(10),
    paddingBottom: vs(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paletteSecTitle: {
    fontSize: rs(14),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: vs(8),
  },
  paletteStatRow: {
    gap: vs(4),
  },
  paletteStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  paletteStatDot: {
    width: rs(10),
    height: rs(10),
    borderRadius: rs(5),
  },
  paletteStatLabel: {
    flex: 1,
    fontSize: rs(12),
    color: '#374151',
  },
  paletteStatValue: {
    fontSize: rs(13),
    fontWeight: 'bold',
    color: '#111827',
  },
  paletteGridContainer: {
    paddingHorizontal: rs(14),
    paddingTop: vs(10),
    paddingBottom: vs(10),
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  paletteCell: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(6),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  paletteCellText: {
    fontSize: rs(13),
    fontWeight: 'bold',
    color: '#FFF',
  },
  miniCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10B981',
    height: rs(12),
    width: rs(12),
    borderRadius: rs(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniCheckText: {
    color: '#FFF',
    fontSize: rs(8),
    fontWeight: 'bold',
  },
  paletteSubmitBtn: {
    backgroundColor: '#64748B',
    paddingVertical: vs(14),
    alignItems: 'center',
    marginTop: 'auto',
  },
  paletteSubmitText: {
    color: '#FFF',
    fontSize: rs(13),
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Custom Modal ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  customModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(24),
  },
  customModalOverlayStandard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  customModalOverlayPaused: {
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: rs(20),
    padding: rs(24),
    width: '100%',
    maxWidth: rs(340),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  pauseIconContainer: {
    width: rs(60),
    height: rs(60),
    borderRadius: rs(30),
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(16),
  },
  pauseIconContainer2: {
    fontSize: rs(24),
    color: '#3B82F6',
  },
  pauseIconText: {
    fontSize: rs(24),
    color: '#3B82F6',
  },
  pauseBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(5),
  },
  pauseBar: {
    width: rs(8),
    height: rs(26),
    borderRadius: rs(3),
    backgroundColor: '#3B82F6',
  },
  modalTitle: {
    fontSize: rs(18),
    fontWeight: 'bold',
    color: '#0F2942',
    textAlign: 'center',
    marginBottom: vs(8),
  },
  modalMessage: {
    fontSize: rs(13),
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: vs(18),
    marginBottom: vs(24),
  },
  modalButtonsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: rs(12),
    flexWrap: 'wrap',
  },
  modalButton: {
    flex: 1,
    minWidth: rs(120),
    paddingVertical: vs(12),
    borderRadius: rs(10),
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
    fontSize: rs(13),
    fontWeight: 'bold',
  },
  modalButtonTextDefault: {
    color: '#FFF',
  },
  modalButtonTextCancel: {
    color: '#4B5563',
  },

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Loading ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    fontSize: rs(13),
    color: '#6B7280',
    marginTop: vs(10),
    fontWeight: '600',
  },

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Instructions Screen ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  instContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  instHeader: {
    height: vs(56),
    backgroundColor: '#0F2942',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rs(16),
  },
  instHeaderTitle: {
    fontSize: rs(15),
    fontWeight: 'bold',
    color: '#FFF',
  },
  instLangBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: vs(5),
    paddingHorizontal: rs(10),
    borderRadius: rs(6),
  },
  instLangText: {
    fontSize: rs(11),
    color: '#4B5563',
    fontWeight: 'bold',
  },
  instScrollContent: {
    padding: rs(16),
    paddingBottom: vs(40),
  },
  instExamName: {
    fontSize: rs(16),
    fontWeight: 'bold',
    color: '#0F2942',
    textAlign: 'center',
    marginBottom: vs(16),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instMetaRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: vs(14),
    marginBottom: vs(16),
  },
  instMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  instMetaValue: {
    fontSize: rs(15),
    fontWeight: 'bold',
    color: '#2563EB',
  },
  instMetaLabel: {
    fontSize: rs(10),
    color: '#6B7280',
    marginTop: vs(4),
    fontWeight: '600',
  },
  instMetaDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  instTextBox: {
    backgroundColor: '#FFF',
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: rs(16),
    marginBottom: vs(16),
  },
  instTextTitle: {
    fontSize: rs(13),
    fontWeight: 'bold',
    color: '#2563EB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: vs(8),
    marginBottom: vs(10),
  },
  instTextHeading: {
    fontSize: rs(11),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: vs(6),
  },
  instTextBody: {
    fontSize: rs(11),
    color: '#4B5563',
    lineHeight: rs(16),
    marginBottom: vs(8),
    paddingLeft: rs(4),
  },
  instLangSelectCard: {
    backgroundColor: '#FFF',
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: rs(14),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  instLangSelectTitle: {
    fontSize: rs(12),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  instLangSelectSub: {
    fontSize: rs(9),
    color: '#6B7280',
    marginTop: vs(2),
    fontWeight: '600',
  },
  instSelectorContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: rs(8),
    overflow: 'hidden',
  },
  langSelectorOption: {
    paddingVertical: vs(6),
    paddingHorizontal: rs(12),
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  langSelectorOptionActive: {
    backgroundColor: '#3B82F6',
  },
  langSelectorText: {
    fontSize: rs(11),
    color: '#4B5563',
    fontWeight: 'bold',
  },
  langSelectorTextActive: {
    color: '#FFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(12),
    marginVertical: vs(20),
    paddingHorizontal: rs(4),
  },
  checkbox: {
    height: rs(18),
    width: rs(18),
    borderRadius: rs(4),
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: vs(2),
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxTickContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxTickShort: {
    position: 'absolute',
    width: rs(5),
    height: rs(2),
    backgroundColor: '#FFF',
    borderRadius: 1,
    bottom: rs(5),
    left: rs(2),
    transform: [{ rotate: '45deg' }],
  },
  checkboxTickLong: {
    position: 'absolute',
    width: rs(9),
    height: rs(2),
    backgroundColor: '#FFF',
    borderRadius: 1,
    bottom: rs(6),
    right: rs(1),
    transform: [{ rotate: '-55deg' }],
  },
  checkboxTick: {
    color: '#FFF',
    fontSize: rs(10),
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: rs(12),
    color: '#4B5563',
    lineHeight: rs(18),
  },
  instFooter: {
    height: vs(56),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    backgroundColor: '#FFF',
  },
  instCancelBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: rs(8),
    paddingVertical: vs(10),
    paddingHorizontal: rs(20),
  },
  instCancelText: {
    fontSize: rs(12),
    color: '#4B5563',
    fontWeight: 'bold',
  },
  instStartBtn: {
    backgroundColor: '#10B981',
    borderRadius: rs(8),
    paddingVertical: vs(10),
    paddingHorizontal: rs(24),
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
    fontSize: rs(12),
    color: '#FFF',
    fontWeight: 'bold',
  },

  offlineBanner: {
    backgroundColor: '#7F1D1D',
    paddingVertical: vs(5),
    paddingHorizontal: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: '#991B1B',
  },
  offlineBannerText: {
    color: '#FEE2E2',
    fontSize: rs(10),
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Keep legacy props to avoid TS errors in modal render
  modalOverlay: { flex: 1 },
  drawerSheet: {},
  drawerHeader: {},
  drawerTitle: {},
  closeBtn: {},
  closeBtnText: {},
  drawerScroll: {},
  drawerSecGroup: {},
  drawerSecName: {},
  submitPaperBtn: {},
  submitPaperBtnText: {},
  fab: {},
  fabText: {},
  questionMetaRow: {},
  questionIndexText: {},
  questionTimerBadge: {},
  questionTimerText: {},
  secondaryBtn: {},
  secondaryBtnText: {},
  primaryBtn: {},
  primaryBtnText: {},
  optionItem: {},
  optionItemActive: {},
  optionDot: {},
  optionDotActive: {},
  pNotVisited: {},
  pNotAnswered: {},
  pAnswered: {},
  pMarked: {},
  pMarkedAnswered: {},
  pTextDark: {},
  pTextLight: {},
});
