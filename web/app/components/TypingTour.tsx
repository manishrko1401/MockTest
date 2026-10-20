"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { GuidedTour, TourStep, setPendingTour, peekPendingTour, clearPendingTour } from './GuidedTour';
import { useIsDesktopApp } from '../lib/desktopApp';
import { OFFLINE_TOUR_STEPS, appOfflineTourSeen, markAppOfflineTourSeen } from './offlineTourSteps';

// -----------------------------------------------------------------------------
// Typing Tests tour. Part 1 runs on /typing-test and ends by opening one exam with
// ?tour=typing; part 2 continues on that exam's typing page. Shown once per user (saved
// on the account; remembered in the browser for visitors who are not logged in).
// -----------------------------------------------------------------------------

export const START_TYPING_TOUR_EVENT = 'mth:start-typing-tour';
const LOCAL_DONE_KEY = 'mth_typing_tour_done';
const HUB_NUMBERED_STEPS = 3;
/** Steps on the exam page; the Windows app adds download-for-offline and My offline tests */
const examSteps = (inApp: boolean): TourStep[] => {
  if (!inApp) return EXAM_STEPS;
  const list = [...EXAM_STEPS];
  const startIdx = list.findIndex(s => s.targets.includes('[data-tour="tt-start"]'));
  list.splice(startIdx + 1, 0, OFFLINE_TOUR_STEPS.downloadPassage(['[data-tour="tt-start"] [data-tour="offline-download"]', '[data-tour="tt-start"]']));
  list.push(OFFLINE_TOUR_STEPS.myOfflineTests());
  return list;
};
const totalNumberedSteps = (inApp: boolean) => HUB_NUMBERED_STEPS + examSteps(inApp).length;

export function requestTypingTourStart() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(START_TYPING_TOUR_EVENT));
}

const HUB_STEPS: TourStep[] = [
  {
    targets: [],
    title: { en: 'How to use Typing Tests', hi: 'टाइपिंग टेस्ट का उपयोग कैसे करें' },
    body: {
      en: 'A short guide to finding your exam, reading its official rules, choosing a passage and starting a typing test.',
      hi: 'अपनी परीक्षा खोजने, उसके आधिकारिक नियम पढ़ने, गद्यांश चुनने और टाइपिंग टेस्ट शुरू करने की संक्षिप्त जानकारी।',
    },
  },
  {
    targets: ['[data-tour="tt-filters"]'],
    title: { en: 'Find your exam', hi: 'अपनी परीक्षा खोजें' },
    body: {
      en: 'Filter by exam group such as SSC, High Courts, DSSSB or Police, or search by name. Each exam follows its own official typing rules.',
      hi: 'SSC, उच्च न्यायालय, DSSSB या पुलिस जैसे परीक्षा समूह से फ़िल्टर करें, या नाम से खोजें। हर परीक्षा अपने आधिकारिक टाइपिंग नियमों का पालन करती है।',
    },
  },
  {
    targets: ['[data-tour="tt-custom"]'],
    title: { en: 'Custom practice', hi: 'कस्टम अभ्यास' },
    body: {
      en: 'Want to practise with your own text? Paste any paragraph, set the demo, break and test time, and get the same speed and error analysis.',
      hi: 'अपने टेक्स्ट से अभ्यास करना है? कोई भी अनुच्छेद पेस्ट करें, डेमो, ब्रेक और टेस्ट का समय तय करें और वही स्पीड व त्रुटि विश्लेषण पाएं।',
    },
  },
  {
    targets: ['[data-tour="tt-exam"]'],
    title: { en: 'Open an exam', hi: 'परीक्षा खोलें' },
    body: {
      en: 'Each card is one exam’s typing test. Let’s open this one to see its rules and passages.',
      hi: 'हर कार्ड एक परीक्षा का टाइपिंग टेस्ट है। इसके नियम और गद्यांश देखने के लिए इसे खोलते हैं।',
    },
  },
];

const EXAM_STEPS: TourStep[] = [
  {
    targets: ['[data-tour="tt-rules"]'],
    title: { en: 'Rules & marking scheme', hi: 'नियम एवं अंकन योजना' },
    body: {
      en: 'The official formula for this exam: how errors are counted, how speed is calculated and what is needed to qualify.',
      hi: 'इस परीक्षा का आधिकारिक सूत्र: त्रुटियां कैसे गिनी जाती हैं, स्पीड कैसे निकाली जाती है और क्वालिफाई करने के लिए क्या चाहिए।',
    },
  },
  {
    targets: ['[data-tour="tt-details"]'],
    title: { en: 'Examination details', hi: 'परीक्षा विवरण' },
    body: {
      en: 'Test duration, qualifying speed for English and Hindi, evaluation method and whether retyping is allowed.',
      hi: 'टेस्ट की अवधि, अंग्रेज़ी और हिंदी के लिए आवश्यक स्पीड, मूल्यांकन पद्धति और दोबारा टाइप करने की अनुमति।',
    },
  },
  {
    targets: ['[data-tour="tt-performance"]'],
    title: { en: 'Your performance', hi: 'आपका प्रदर्शन' },
    body: {
      en: 'Your best net speed, average accuracy, tests attempted and how many you qualified in this exam. It updates after every test.',
      hi: 'इस परीक्षा में आपकी सर्वोत्तम नेट स्पीड, औसत शुद्धता, दिए गए टेस्ट और क्वालिफाइड टेस्ट। हर टेस्ट के बाद यह अपडेट होता है।',
    },
  },
  {
    targets: ['[data-tour="tt-passages"]'],
    title: { en: 'Choose a passage', hi: 'गद्यांश चुनें' },
    body: {
      en: 'Switch between English and Hindi passages and search by passage name. Each row shows the duration and whether you have attempted it.',
      hi: 'अंग्रेज़ी और हिंदी गद्यांशों के बीच बदलें और नाम से खोजें। हर पंक्ति में अवधि और आपकी प्रयास स्थिति दिखती है।',
    },
  },
  {
    targets: ['[data-tour="tt-start"]'],
    title: { en: 'Start the test', hi: 'टेस्ट शुरू करें' },
    body: {
      en: 'Start Test opens the exam-style typing screen: a short demo, a break, then the main timed test. Backspace and retyping follow the exam’s rules. After a test you can View Result or Retake.',
      hi: 'Start Test परीक्षा जैसी टाइपिंग स्क्रीन खोलता है: छोटा डेमो, ब्रेक, फिर मुख्य समयबद्ध टेस्ट। बैकस्पेस और दोबारा टाइप करना परीक्षा के नियमों के अनुसार होता है। टेस्ट के बाद View Result या Retake करें।',
    },
  },
  {
    targets: [],
    title: { en: 'Your scorecard', hi: 'आपका स्कोरकार्ड' },
    body: {
      en: 'When the time ends you get an official-style scorecard: gross and net speed, accuracy, full and half mistakes, and whether you qualified. Replay this guide any time with “How it works” on the Typing Tests page.',
      hi: 'समय समाप्त होने पर आपको आधिकारिक जैसा स्कोरकार्ड मिलता है: ग्रॉस और नेट स्पीड, शुद्धता, पूर्ण और आधी गलतियां, और क्वालिफाई हुए या नहीं। टाइपिंग टेस्ट पृष्ठ पर “यह कैसे काम करता है” से यह गाइड फिर देखें।',
    },
  },
];

function useTypingTourDone() {
  const { currentUser } = useAuth();
  if (currentUser) return currentUser.typingTourCompletedAt === undefined ? undefined : !!currentUser.typingTourCompletedAt;
  try { return typeof window !== 'undefined' && localStorage.getItem(LOCAL_DONE_KEY) === '1'; } catch { return false; }
}

/** Part 1 — on the Typing Tests page. */
export function TypingHubTour({ ready, targetId, resetFilters }: { ready: boolean; targetId: string | null; resetFilters: () => void }) {
  const { language, currentUser } = useAuth();
  const inApp = useIsDesktopApp() && !!currentUser;
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const router = useRouter();
  const done = useTypingTourDone();
  const [open, setOpen] = useState(false);
  const startedRef = useRef(false);
  const resetRef = useRef(resetFilters);
  resetRef.current = resetFilters;

  const start = useCallback(() => {
    startedRef.current = true;
    resetRef.current();
    setTimeout(() => setOpen(true), 250);
  }, []);

  useEffect(() => {
    if (startedRef.current || done !== false || !ready || !targetId) return;
    const timer = setTimeout(start, 1200);
    return () => clearTimeout(timer);
  }, [done, ready, targetId, start]);

  useEffect(() => {
    window.addEventListener(START_TYPING_TOUR_EVENT, start);
    return () => window.removeEventListener(START_TYPING_TOUR_EVENT, start);
  }, [start]);

  // Finished the tour before the offline features: show only what's new, once on this PC
  useEffect(() => {
    if (!inApp || done !== true || open || startedRef.current || !ready || appOfflineTourSeen('typing')) return;
    const timer = setTimeout(() => { startedRef.current = true; setWhatsNewOpen(true); }, 1200);
    return () => clearTimeout(timer);
  }, [inApp, done, open, ready]);

  const whatsNewSteps: TourStep[] = useMemo(() => [
    OFFLINE_TOUR_STEPS.newIntro('typing'),
    OFFLINE_TOUR_STEPS.downloadPassage([]),
    OFFLINE_TOUR_STEPS.myOfflineTests(),
  ], []);

  const finish = () => {
    setOpen(false);
    setWhatsNewOpen(false);
    if (targetId) { setPendingTour('typing'); router.push(`/typing-test/category/${targetId}`); }
  };

  return (
    <>
    <GuidedTour
      open={open}
      steps={HUB_STEPS}
      language={language}
      onFinish={finish}
      introLabel={{ en: 'Typing Tests guide', hi: 'टाइपिंग टेस्ट गाइड' }}
      startLabel={{ en: 'Start guide', hi: 'गाइड शुरू करें' }}
      finishLabel={{ en: 'Open this exam', hi: 'यह परीक्षा खोलें' }}
      stepOffset={-1}
      totalSteps={totalNumberedSteps(inApp)}
    />
    <GuidedTour
      open={whatsNewOpen && !open}
      steps={whatsNewSteps}
      language={language}
      onFinish={() => { setWhatsNewOpen(false); markAppOfflineTourSeen('typing'); }}
      introLabel={{ en: 'What’s new', hi: 'नया क्या है' }}
      startLabel={{ en: 'Show me', hi: 'दिखाएं' }}
      finishLabel={{ en: 'Got it', hi: 'समझ गया' }}
      stepOffset={-1}
      totalSteps={whatsNewSteps.length - 1}
    />
    </>
  );
}

/** Part 2 — on an exam's typing page, started by ?tour=typing. */
export function TypingExamTour({ ready }: { ready: boolean }) {
  const { language, completeTour, currentUser } = useAuth();
  const inApp = useIsDesktopApp() && !!currentUser;
  const steps = useMemo(() => examSteps(inApp), [inApp]);
  const [open, setOpen] = useState(false);
  const [wantTour] = useState(() => peekPendingTour('typing'));
  const startedRef = useRef(false);

  useEffect(() => {
    if (wantTour) clearPendingTour('typing');
  }, [wantTour]);

  useEffect(() => {
    if (!ready || !wantTour || startedRef.current) return;
    const timer = setTimeout(() => { startedRef.current = true; setOpen(true); }, 700);
    return () => clearTimeout(timer);
  }, [ready, wantTour]);

  const finish = () => {
    setOpen(false);
    if (inApp) markAppOfflineTourSeen('typing');
    if (currentUser) completeTour('typing');
    try { localStorage.setItem(LOCAL_DONE_KEY, '1'); } catch { /* ignore */ }
  };

  return (
    <GuidedTour
      open={open}
      steps={steps}
      language={language}
      onFinish={finish}
      stepOffset={HUB_NUMBERED_STEPS}
      totalSteps={totalNumberedSteps(inApp)}
    />
  );
}
