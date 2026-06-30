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
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Globe, AlignJustify } from 'lucide-react-native';
import { ApiClient } from './api';
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
    title: "Please read the instructions carefully",
    general: "General Instructions:",
    gen1: "1. The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.",
    gen2: "2. The Question Palette displayed on the right side of screen will show the status of each question using one of the 5 symbols.",
    gen3: "3. You can click on the '>' arrow to collapse the question palette to maximize the question viewing area.",
    answering: "Navigating to a Question:",
    ans1: "4. To answer a question, select the radio button of one of the options and click 'Save & Next'.",
    ans2: "5. To change your answer, click on the 'Clear Response' button to reset the selection.",
    disclaimer: "I have read and understood all the instructions. All computer hardware allotted to me is in proper working condition. I agree that in case of any cheating or tab switching, the exam will be auto-submitted.",
    btn: "I am ready to begin"
  },
  hi: {
    title: "\u0915\u0943\u092a\u092f\u093e \u0928\u093f\u0930\u094d\u0926\u0947\u0936\u094b\u0902 \u0915\u094b \u0927\u094d\u092f\u093e\u0928 \u0938\u0947 \u092a\u0922\u093c\u0947\u0902",
    general: "\u0938\u093e\u092e\u093e\u0928\u094d\u092f \u0928\u093f\u0930\u094d\u0926\u0947\u0936:",
    gen1: "1. \u0918\u0921\u093c\u0940 \u0938\u0930\u094d\u0935\u0930 \u092a\u0930 \u0938\u0947\u091f \u0939\u094b\u0917\u0940\u0964 \u0938\u094d\u0915\u094d\u0930\u0940\u0928 \u0915\u0947 \u0936\u0940\u0930\u094d\u0937 \u0926\u093e\u090f\u0902 \u0915\u094b\u0928\u0947 \u092e\u0947\u0902 \u0909\u0932\u091f\u0940 \u0917\u093f\u0928\u0924\u0940 \u0918\u0921\u093c\u0940 \u0906\u092a\u0915\u0947 \u0926\u094d\u0935\u093e\u0930\u093e \u092a\u0930\u0940\u0915\u094d\u0937\u093e \u092a\u0942\u0930\u0940 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0909\u092a\u0932\u092c\u094d\u0927 \u0936\u0947\u0937 \u0938\u092e\u092f \u092a\u094d\u0930\u0926\u0930\u094d\u0936\u093f\u0924 \u0915\u0930\u0947\u0917\u0940\u0964",
    gen2: "2. \u0938\u094d\u0915\u094d\u0930\u0940\u0928 \u0915\u0947 \u0926\u093e\u090f\u0902 \u0913\u0930 \u092a\u094d\u0930\u0926\u0930\u094d\u0936\u093f\u0924 \u092a\u094d\u0930\u0936\u094d\u0928 \u092a\u0948\u0932\u0947\u091f 5 \u092a\u094d\u0930\u0924\u0940\u0915\u094b\u0902 \u092e\u0947\u0902 \u0938\u0947 \u0915\u093f\u0938\u0940 \u090f\u0915 \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u0930\u0915\u0947 \u092a\u094d\u0930\u0924\u094d\u092f\u0947\u0915 \u092a\u094d\u0930\u0936\u094d\u0928 \u0915\u0940 \u0938\u094d\u0925\u093f\u0924\u093f \u0926\u0930\u094d\u0936\u093e\u090f\u0917\u093e\u0964",
    gen3: "3. \u092a\u094d\u0930\u0936\u094d\u0928 \u0926\u0947\u0916\u0928\u0947 \u0915\u0947 \u0915\u094d\u0937\u0947\u0924\u094d\u0930 \u0915\u094b \u0905\u0927\u093f\u0915\u0924\u092e \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0906\u092a '>' \u0924\u0940\u0930 \u092a\u0930 \u0915\u094d\u0932\u093f\u0915 \u0915\u0930\u0915\u0947 \u092a\u094d\u0930\u0936\u094d\u0928 \u092a\u0948\u0932\u0947\u091f \u092c\u0902\u0926 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964",
    answering: "\u092a\u094d\u0930\u0936\u094d\u0928 \u092a\u0930 \u0928\u0947\u0935\u093f\u0917\u0947\u091f \u0915\u0930\u0928\u093e:",
    ans1: "4. \u0915\u093f\u0938\u0940 \u092a\u094d\u0930\u0936\u094d\u0928 \u0915\u093e \u0909\u0924\u094d\u0924\u0930 \u0926\u0947\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f, \u0935\u093f\u0915\u0932\u094d\u092a\u094b\u0902 \u092e\u0947\u0902 \u0938\u0947 \u0915\u093f\u0938\u0940 \u090f\u0915 \u0915\u094b \u091a\u0941\u0928\u0947\u0902 \u0914\u0930 'Save & Next' \u092a\u0930 \u0915\u094d\u0932\u093f\u0915 \u0915\u0930\u0947\u0902\u0964",
    ans2: "5. \u0905\u092a\u0928\u093e \u0909\u0924\u094d\u0924\u0930 \u092c\u0926\u0932\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f, \u091a\u092f\u0928 \u0915\u094b \u0930\u0940\u0938\u0947\u091f \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f 'Clear Response' \u092c\u091f\u0928 \u092a\u0930 \u0915\u094d\u0932\u093f\u0915 \u0915\u0930\u0947\u0902\u0964",
    disclaimer: "\u092e\u0948\u0902\u0928\u0947 \u0938\u092d\u0940 \u0928\u093f\u0930\u094d\u0926\u0947\u0936\u094b\u0902 \u0915\u094b \u092a\u0922\u093c \u0914\u0930 \u0938\u092e\u091d \u0932\u093f\u092f\u093e \u0939\u0948\u0964 \u092e\u0941\u091d\u0947 \u0906\u0935\u0902\u091f\u093f\u0924 \u0938\u092d\u0940 \u0915\u0902\u092a\u094d\u092f\u0942\u091f\u0930 \u0939\u093e\u0930\u094d\u0921\u0935\u0947\u092f\u0930 \u0909\u091a\u093f\u0924 \u0915\u093e\u0930\u094d\u092f\u0936\u0940\u0932 \u0938\u094d\u0925\u093f\u0924\u093f \u092e\u0947\u0902 \u0939\u0948\u0902\u0964 \u092e\u0948\u0902 \u0938\u0939\u092e\u0924 \u0939\u0942\u0902 \u0915\u093f \u0915\u093f\u0938\u0940 \u092d\u0940 \u0928\u0915\u0932 \u092f\u093e \u091f\u0948\u092c \u0938\u094d\u0935\u093f\u091a\u093f\u0902\u0917 \u0915\u0947 \u092e\u093e\u092e\u0932\u0947 \u092e\u0947\u0902, \u092a\u0930\u0940\u0915\u094d\u0937\u093e \u0938\u094d\u0935\u0924\u0903 \u0938\u092c\u092e\u093f\u091f \u0939\u094b \u091c\u093e\u090f\u0917\u0940\u0964",
    btn: "\u092e\u0948\u0902 \u0924\u0948\u092f\u093e\u0930 \u0939\u0942\u0901 (I am ready to begin)"
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
  const [hasSectionalTiming, setHasSectionalTiming] = useState(false);
  const [questions, setQuestions] = useState<MobileQuestion[]>([]);
  const [sections, setSections] = useState<MobileSection[]>([]);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0); // Index within current section

  const [timeLeft, setTimeLeft] = useState(3600); // 60 mins default
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [violationsCount, setViolationsCount] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'symbols' | 'instructions'>('symbols');
  const [drawerSectionIdx, setDrawerSectionIdx] = useState(0);
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
      if (catalogTest?.hasSectionalTiming) {
        setHasSectionalTiming(true);
      }

      const testTitle = testId.includes('ssc') ? 'SSC' : testId.includes('rrb') ? 'RRB' : 'Mock';

      if (res.success && res.questions && Array.isArray(res.questions) && res.questions.length > 0) {
        // Custom Questions
        const isRRB = testId.includes('rrb');
        const posMark = isRRB ? 1 : 2;
        const negMark = isRRB ? 0.33 : 0.5;

        // Dynamically build sections based on unique question section fields
        const sectionNames: string[] = [];
        res.questions.forEach((q: any) => {
          const sec = q.section || "General Studies";
          if (!sectionNames.includes(sec)) {
            sectionNames.push(sec);
          }
        });

        secs = sectionNames.map((name, idx) => ({
          id: `sec_custom_${idx}`,
          name,
          orderIndex: idx,
          positiveMark: posMark,
          negativeMark: negMark,
          durationSeconds: catalogTest?.hasSectionalTiming && Array.isArray(catalogTest.sectionalTimings)
            ? (catalogTest.sectionalTimings[idx] ?? 0) * 60
            : undefined,
        }));

        const sectionCounters: Record<string, number> = {};
        sectionNames.forEach(name => {
          sectionCounters[name] = 0;
        });

        list = res.questions.map((q: any, idx: number) => {
          const secName = q.section || "General Studies";
          const secId = `sec_custom_${sectionNames.indexOf(secName)}`;
          const qOrder = sectionCounters[secName]++;

          return {
            id: q.id || `q_custom_${idx}`,
            sectionId: secId,
            questionType: 'mcq',
            orderIndex: qOrder,
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
          };
        });
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
                en: { questionText: "If x + 1/x = 5, then find the value of xÃƒâ€šÃ‚Â² + 1/xÃƒâ€šÃ‚Â².", options: ["23", "25", "27", "21"] },
                hi: { questionText: "\u092f\u0926\u093f x + 1/x = 5 \u0939\u0948, \u0924\u094b x\u00b2 + 1/x\u00b2 \u0915\u093e \u092e\u093e\u0928 \u091c\u094d\u091e\u093e\u0924 \u0915\u0940\u091c\u093f\u090f\u0964", options: ["23", "25", "27", "21"] },
              }
            },
            {
              id: "q_q2", sectionId: "sec_quant", questionType: "mcq", orderIndex: 1, correctOptionIndex: 0,
              content: {
                en: { questionText: "The ratio of present ages of A and B is 4:5. After 5 years, the ratio becomes 5:6. What is A's present age?", options: ["20 years", "25 years", "30 years", "15 years"] },
                hi: { questionText: "A \u0914\u0930 B \u0915\u0940 \u0935\u0930\u094d\u0924\u092e\u093e\u0928 \u0906\u092f\u0941 \u0915\u093e \u0905\u0928\u0941\u092a\u093e\u0924 4:5 \u0939\u0948\u0964 5 \u0935\u0930\u094d\u0937 \u092c\u093e\u0926 \u092f\u0939 \u0905\u0928\u0941\u092a\u093e\u0924 5:6 \u0939\u094b \u091c\u093e\u0924\u093e \u0939\u0948\u0964 A \u0915\u0940 \u0935\u0930\u094d\u0924\u092e\u093e\u0928 \u0906\u092f\u0941 \u0915\u094d\u092f\u093e \u0939\u0948?", options: ["20 \u0935\u0930\u094d\u0937", "25 \u0935\u0930\u094d\u0937", "30 \u0935\u0930\u094d\u0937", "15 years"] },
              }
            },
            {
              id: "q_r1", sectionId: "sec_reasoning", questionType: "mcq", orderIndex: 0, correctOptionIndex: 3,
              content: {
                en: { questionText: "Identify the pattern and choose the next term in the series: 3, 7, 15, 31, 63, ?", options: ["125", "126", "128", "127"] },
                hi: { questionText: "\u092a\u0948\u091f\u0930\u094d\u0928 \u092a\u0939\u091a\u093e\u0928\u0947\u0902 \u0914\u0930 \u0936\u094d\u0930\u0943\u0902\u0916\u0932\u093e \u092e\u0947\u0902 \u0905\u0917\u0932\u093e \u092a\u0926 \u091a\u0941\u0928\u0947\u0902: 3, 7, 15, 31, 63, ?", options: ["125", "126", "128", "127"] },
              }
            },
            {
              id: "q_e1", sectionId: "sec_english", questionType: "mcq", orderIndex: 0, correctOptionIndex: 0,
              content: {
                en: { questionText: "Select the antonym for the word: OBSTINATE", options: ["Flexible", "Stubborn", "Rigid", "Dogmatic"] },
                hi: { questionText: "\u0926\u093f\u090f \u0917\u090f \u0936\u092c\u094d\u0926 \u0915\u093e \u0935\u093f\u0932\u094b\u092e \u0936\u092c\u094d\u0926 \u091a\u0941\u0928\u0947\u0902: OBSTINATE (\u0939\u0920\u0940)", options: ["Flexible (\u0932\u091a\u0940\u0932\u093e)", "Stubborn (\u0905\u0921\u093c\u093f\u092f\u0932)", "Rigid (\u0915\u0920\u094b\u0930)", "Dogmatic (\u0915\u091f\u094d\u091f\u0930)"] },
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
                hi: { questionText: "\u0935\u093f\u0926\u094d\u092f\u0941\u0924 \u0927\u093e\u0930\u093e \u0915\u0940 \u0907\u0915\u093e\u0908 \u0915\u094d\u092f\u093e \u0939\u0948?", options: ["\u0935\u094b\u0932\u094d\u091f", "\u090f\u092e\u094d\u092a\u0940\u092f\u0930", "\u0913\u092e", "\u0935\u093e\u091f"] },
              }
            },
            {
              id: "q_gen2", sectionId: "sec_paper1", questionType: "mcq", orderIndex: 1, correctOptionIndex: 1,
              content: {
                en: { questionText: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Saturn"] },
                hi: { questionText: "\u0915\u093f\u0938 \u0917\u094d\u0930\u0939 \u0915\u094b \u0932\u093e\u0932 \u0917\u094d\u0930\u0939 \u0915\u0947 \u0928\u093e\u092e \u0938\u0947 \u091c\u093e\u0928\u093e \u091c\u093e\u0924\u093e \u0939\u0948?", options: ["\u092a\u0943\u0925\u094d\u0935\u0940", "\u092e\u0902\u0917\u0932", "\u092c\u0943\u0939\u0938\u094d\u092a\u0924\u093f", "\u0936\u0928\u093f"] },
              }
            }
          ];
        }
      }

      setQuestions(list);
      setSections(secs);

      // Pre-fetch all question/option images into expo-image disk cache
      // so they appear instantly when users reach each question
      const allHtmlStrings = list.flatMap(q => [
        q.content?.en?.questionText,
        q.content?.hi?.questionText,
        ...(q.content?.en?.options ?? []),
        ...(q.content?.hi?.options ?? []),
      ].filter(Boolean) as string[]);
      preloadImages(allHtmlStrings);

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
        // For sectional timing: start with section 0's duration; else full test duration
        if (catalogTest?.hasSectionalTiming && secs.length > 0 && secs[0].durationSeconds) {
          setTimeLeft(secs[0].durationSeconds);
        } else {
          setTimeLeft(durationSeconds);
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
          if (hasSectionalTiming) {
            // Auto-advance to next section on section timer expiry
            setCurrentSectionIdx(prevSecIdx => {
              const nextSecIdx = prevSecIdx + 1;
              if (nextSecIdx < sections.length) {
                setCurrentQuestionIdx(0);
                const nextSec = sections[nextSecIdx];
                const nextDuration = nextSec?.durationSeconds ?? totalDuration;
                setTimeout(() => setTimeLeft(nextDuration), 0);
                return nextSecIdx;
              } else {
                handleExamSubmit(true);
                return prevSecIdx;
              }
            });
            return 0;
          } else {
            handleExamSubmit(true);
            return 0;
          }
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
  }, [loading, isTimerRunning, hasSectionalTiming, sections, totalDuration]);

  // Trigger auto-save every 15 seconds to sync state with shared database
  useEffect(() => {
    if (loading || !isTimerRunning) return;

    const autoSaveInterval = setInterval(() => {
      saveOngoingSessionState();
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

  const handleSelectOption = useCallback((optIdx: number) => {
    if (!activeQuestionIdRef.current) return;
    const qId = activeQuestionIdRef.current;
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
    if (currentQuestionIdx < sectionQuestions.length - 1) {
      const nextQ = sectionQuestions[currentQuestionIdx + 1];
      if (updatedResponses[nextQ.id].state === 1) {
        updatedResponses[nextQ.id].state = 2; // mark visited
      }
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      // End of section
      if (!hasSectionalTiming && currentSectionIdx < sections.length - 1) {
        // Only auto-advance sections when not in sectional timing mode
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
  };

  const handleClearResponse = useCallback(() => {
    const qId = activeQuestionIdRef.current;
    if (!qId) return;
    setResponses((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        tempOptionIndex: null,
        selectedOptionIndex: null,
        state: 2 // Visited, but not answered
      }
    }));
  }, []);

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
    } else if (!hasSectionalTiming && currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx(currentSectionIdx + 1);
      setCurrentQuestionIdx(0);
    }
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

  // Active question details Ã¢â‚¬â€ fall back to Hindi if English content is empty (bilingual questions)
  const questionContentEn = activeQuestion?.content['en'];
  const questionContentHi = activeQuestion?.content['hi'];
  const questionContent = lang === 'en'
    ? (questionContentEn?.questionText ? questionContentEn : questionContentHi)
    : (questionContentHi?.questionText ? questionContentHi : questionContentEn);
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
        <View style={[styles.instFooter, isDark && { backgroundColor: ThemeColors.dark.bottomNavBg, borderTopColor: ThemeColors.dark.bottomNavBorder }]}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
      <StatusBar 
        barStyle="light-content"
        backgroundColor="#1A1A2E"
      />

      {/* Ã¢â‚¬â€ Header Ã¢â‚¬â€ */}
      <View style={styles.examHeader}>
        {/* Left: pause + timer + exam name */}
        <TouchableOpacity style={styles.pauseTextBtn} onPress={handlePauseAndExit}>
          <Text style={styles.pauseTextBtnText}>|| Pause</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTimer}>{formatTime(timeLeft)}</Text>
          <Text style={styles.headerExamName} numberOfLines={1}>
            {sections[currentSectionIdx]?.name || 'Mock Test'}
          </Text>
        </View>
        {/* Right: hamburger to open palette */}
        <TouchableOpacity style={styles.hamburgerBtn} onPress={() => setDrawerVisible(true)}>
          <AlignJustify size={rs(22)} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Section Tabs ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
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

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Stats Bar ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
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
          {/* Language switcher */}
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

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Question ScrollView ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <ScrollView
        style={[styles.questionContainer, isDark && { backgroundColor: ThemeColors.dark.bg }]}
        contentContainerStyle={styles.questionContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Question number header row */}
        <View style={styles.questionHeaderRow}>
          {/* Blue number badge */}
          <View style={styles.questionNumBadge}>
            <Text style={styles.questionNumText}>{currentQuestionIdx + 1}</Text>
          </View>
          {/* Per-question time spent */}
          <View style={[styles.qTimerPill, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
            <Text style={[styles.qTimerIcon, isDark && { color: '#94A3B8' }]}>Q Time:</Text>
            <Text style={[styles.qTimerVal, isDark && { color: '#3B82F6' }]}>{formatTime(activeResp?.elapsedSeconds || 0)}</Text>
          </View>
        </View>

        {/* Question text */}
        <HtmlText
          style={[styles.questionBody, isDark && { color: ThemeColors.dark.text }]}
          isDark={isDark}
          html={questionText}
        />

        {/* Options as numbered cards */}
        <View style={styles.optionsBlock}>
          {options.map((opt, i) => {
            const isSelected = activeResp?.tempOptionIndex === i;
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
                onPress={() => handleSelectOption(i)}
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
        {violationsCount > 0 && (
          <View style={styles.violationWarningRow}>
            <View style={styles.violationTriangle} />
            <Text style={styles.violationWarning}> Violations: {violationsCount}/3</Text>
          </View>
        )}
      </ScrollView>

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Bottom Navigation Bar ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <View style={[styles.footer, isDark && { backgroundColor: ThemeColors.dark.bottomNavBg, borderTopColor: ThemeColors.dark.bottomNavBorder }]}>
        <TouchableOpacity
          style={[styles.footerBtn, styles.footerBtnOutline, isDark && { borderColor: '#334155' }]}
          onPress={() => {
            if (currentQuestionIdx > 0) {
              setCurrentQuestionIdx(prev => prev - 1);
            } else if (currentSectionIdx > 0) {
              const prevSecIdx = currentSectionIdx - 1;
              const prevSecQs = questions.filter(q => q.sectionId === sections[prevSecIdx].id);
              setCurrentSectionIdx(prevSecIdx);
              setCurrentQuestionIdx(prevSecQs.length - 1);
            }
          }}
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

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Palette Drawer (right slide-in) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <Modal
        visible={drawerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.paletteOverlay}>
          <TouchableOpacity style={styles.paletteOverlayBg} activeOpacity={1} onPress={() => setDrawerVisible(false)} />
          <View style={[styles.paletteDrawer, isDark && { backgroundColor: '#0F1729' }]}>

            {/* Section part buttons */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.partScrollRow} contentContainerStyle={{ paddingHorizontal: rs(12), gap: rs(8) }}>
              {sections.map((sec, idx) => (
                <TouchableOpacity
                  key={sec.id}
                  style={[
                    styles.partBtn,
                    drawerSectionIdx === idx && styles.partBtnActive,
                    isDark && { borderColor: drawerSectionIdx === idx ? '#3B82F6' : '#334155' }
                  ]}
                  onPress={() => setDrawerSectionIdx(idx)}
                >
                  <Text style={[styles.partBtnText, drawerSectionIdx === idx && styles.partBtnTextActive, isDark && { color: drawerSectionIdx === idx ? '#3B82F6' : '#94A3B8' }]}>
                    PART - {String.fromCharCode(65 + idx)}
                  </Text>
                </TouchableOpacity>
              ))}
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
                        setDrawerVisible(false);
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

            {/* Submit button */}
            <TouchableOpacity
              style={styles.paletteSubmitBtn}
              onPress={() => { setDrawerVisible(false); handleExamSubmit(false); }}
            >
              <Text style={styles.paletteSubmitText}>SUBMIT TEST</Text>
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
                <View style={styles.pauseBarsRow}>
                  <View style={styles.pauseBar} />
                  <View style={styles.pauseBar} />
                </View>
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
    </SafeAreaView>
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
  questionBody: {
    fontSize: rs(15),
    color: '#111827',
    lineHeight: rs(22),
    fontWeight: '500',
    marginBottom: vs(18),
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
    alignItems: 'center',
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
  },
  paletteOverlayBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  paletteDrawer: {
    width: SCREEN_WIDTH * 0.82,
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
