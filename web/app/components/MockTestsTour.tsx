"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';
import { GuidedTour, TourStep } from './GuidedTour';
import { useIsDesktopApp } from '../lib/desktopApp';
import { OFFLINE_TOUR_STEPS, appOfflineTourSeen, markAppOfflineTourSeen } from './offlineTourSteps';

// -----------------------------------------------------------------------------
// Test Series tour: categories, bookmarks, opening a category → exam → series,
// starting a test and what happens after. The page passes callbacks that open the
// same category/exam/series the tour highlights. Shown once per user (saved on the
// account; remembered in the browser for visitors who are not logged in).
// -----------------------------------------------------------------------------

export const START_TESTS_TOUR_EVENT = 'mth:start-tests-tour';
const LOCAL_DONE_KEY = 'mth_tests_tour_done';

export function requestTestsTourStart() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(START_TESTS_TOUR_EVENT));
}

export default function MockTestsTour({
  ready, atRoot, hasSeries, resetToRoot, openCategory, openExam, openSeries,
}: {
  /** catalog loaded and the page rendered */
  ready: boolean;
  /** the page is showing the top-level category list */
  atRoot: boolean;
  /** the demo exam has test series (otherwise its tests are listed directly) */
  hasSeries: boolean;
  resetToRoot: () => void;
  openCategory: () => void;
  openExam: () => void;
  openSeries: () => void;
}) {
  const { currentUser, completeTour, language } = useAuth();
  // Windows app (signed in): the tour also covers download for offline and offline bookmarks
  const inApp = useIsDesktopApp() && !!currentUser;
  const [open, setOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const startedRef = useRef(false);

  const done = currentUser
    ? (currentUser.testsTourCompletedAt === undefined ? undefined : !!currentUser.testsTourCompletedAt)
    : (() => { try { return typeof window !== 'undefined' && localStorage.getItem(LOCAL_DONE_KEY) === '1'; } catch { return false; } })();

  const start = useCallback(() => {
    startedRef.current = true;
    resetToRoot();
    setTimeout(() => setOpen(true), 250);
  }, [resetToRoot]);

  // Auto-start once, on the top-level list
  useEffect(() => {
    if (startedRef.current || done !== false || !ready || !atRoot) return;
    const timer = setTimeout(start, 1200);
    return () => clearTimeout(timer);
  }, [done, ready, atRoot, start]);

  useEffect(() => {
    window.addEventListener(START_TESTS_TOUR_EVENT, start);
    return () => window.removeEventListener(START_TESTS_TOUR_EVENT, start);
  }, [start]);

  // Finished the tour before the offline features: show only what's new, once on this PC
  useEffect(() => {
    if (!inApp || done !== true || open || startedRef.current || !ready || !atRoot || appOfflineTourSeen('tests')) return;
    const timer = setTimeout(() => { startedRef.current = true; setWhatsNewOpen(true); }, 1200);
    return () => clearTimeout(timer);
  }, [inApp, done, open, ready, atRoot]);

  const finishWhatsNew = () => { setWhatsNewOpen(false); markAppOfflineTourSeen('tests'); };

  const finish = () => {
    setOpen(false);
    setWhatsNewOpen(false);
    if (inApp) markAppOfflineTourSeen('tests');
    if (currentUser) completeTour('tests');
    try { localStorage.setItem(LOCAL_DONE_KEY, '1'); } catch { /* ignore */ }
  };

  const steps: TourStep[] = useMemo(() => {
    const list: TourStep[] = [
      {
        targets: [],
        title: { en: 'How to use Test Series', hi: 'टेस्ट सीरीज का उपयोग कैसे करें' },
        body: {
          en: 'A short guide to finding your exam, choosing a test series, starting a mock test and reviewing your result.',
          hi: 'अपनी परीक्षा खोजने, टेस्ट सीरीज चुनने, मॉक टेस्ट शुरू करने और परिणाम देखने की संक्षिप्त जानकारी।',
        },
      },
      {
        targets: ['[data-tour="ts-sidebar"]', '[data-tour="ts-search"]'],
        title: { en: 'Browse exam categories', hi: 'परीक्षा श्रेणियां देखें' },
        body: {
          en: 'All exam categories are listed here, such as SSC, Railways, Banking and state exams. Use the search box to find your exam quickly.',
          hi: 'सभी परीक्षा श्रेणियां यहां हैं, जैसे SSC, रेलवे, बैंकिंग और राज्य परीक्षाएं। अपनी परीक्षा जल्दी खोजने के लिए सर्च बॉक्स का उपयोग करें।',
        },
      },
      {
        targets: ['[data-tour="ts-bookmarks"]'],
        title: { en: 'Bookmarked questions', hi: 'बुकमार्क किए गए प्रश्न' },
        body: {
          en: 'Questions you bookmark while reviewing a test are saved here with their correct answers and explanations, so you can revise them later.',
          hi: 'टेस्ट की समीक्षा करते समय बुकमार्क किए गए प्रश्न सही उत्तर और व्याख्या के साथ यहां सहेजे जाते हैं, ताकि आप बाद में दोहरा सकें।',
        },
      },
      ...(inApp ? [OFFLINE_TOUR_STEPS.offlineBookmarks(['[data-tour="ts-bookmarks"]'])] : []),
      {
        targets: ['[data-tour="ts-category"]'],
        title: { en: 'Open a category', hi: 'श्रेणी खोलें' },
        body: {
          en: 'Each card is one exam category and shows how many exams it has. Let’s open this one.',
          hi: 'हर कार्ड एक परीक्षा श्रेणी है और उसमें कितनी परीक्षाएं हैं, यह दिखाता है। चलिए इसे खोलते हैं।',
        },
        nextLabel: { en: 'Open this category', hi: 'यह श्रेणी खोलें' },
        onNext: openCategory,
      },
      {
        targets: ['[data-tour="ts-exam"]'],
        title: { en: 'Choose your exam', hi: 'अपनी परीक्षा चुनें' },
        body: {
          en: 'Inside a category you see its exams, for example CGL, CHSL or MTS, with the number of mock tests in each.',
          hi: 'श्रेणी के अंदर उसकी परीक्षाएं दिखती हैं, जैसे CGL, CHSL या MTS, और हर परीक्षा में मॉक टेस्ट की संख्या।',
        },
        nextLabel: { en: 'Open this exam', hi: 'यह परीक्षा खोलें' },
        onNext: openExam,
        noBack: true,
      },
    ];
    if (hasSeries) {
      list.push({
        targets: ['[data-tour="ts-series"]'],
        title: { en: 'Pick a test series', hi: 'टेस्ट सीरीज चुनें' },
        body: {
          en: 'Tests are grouped into series such as Full Tests, Previous Year Papers and Sectional Tests. Pick the type you want to practise.',
          hi: 'टेस्ट सीरीज में बंटे होते हैं, जैसे फुल टेस्ट, पिछले वर्ष के प्रश्नपत्र और सेक्शनल टेस्ट। जिसका अभ्यास करना है वह चुनें।',
        },
        nextLabel: { en: 'Open this series', hi: 'यह सीरीज खोलें' },
        onNext: openSeries,
        noBack: true,
      });
    }
    list.push(
      {
        targets: ['[data-tour="ts-test"]'],
        title: { en: 'Start a mock test', hi: 'मॉक टेस्ट शुरू करें' },
        body: {
          en: 'Each test shows FREE or PRO, the number of questions, duration and total marks. Press Start to begin in the exam-style test window. A paused test shows Resume.',
          hi: 'हर टेस्ट में FREE या PRO, प्रश्नों की संख्या, समय और कुल अंक दिखते हैं। परीक्षा जैसी विंडो में शुरू करने के लिए Start दबाएं। रुके हुए टेस्ट में Resume दिखता है।',
        },
        noBack: true,
      },
      ...(inApp ? [OFFLINE_TOUR_STEPS.downloadTest(['[data-tour="ts-test"] [data-tour="offline-download"]', '[data-tour="ts-test"]'])] : []),
      {
        targets: [],
        title: { en: 'After the test', hi: 'टेस्ट के बाद' },
        body: {
          en: 'When you submit, you get your score, rank and section-wise analysis with detailed solutions. Use Analysis to review and Reattempt to try again. Your recent tests also appear at the top of this page.',
          hi: 'सबमिट करने पर आपको अंक, रैंक और अनुभागवार विश्लेषण विस्तृत समाधान के साथ मिलता है। समीक्षा के लिए Analysis और दोबारा देने के लिए Reattempt का उपयोग करें। आपके हाल के टेस्ट इस पृष्ठ के ऊपर भी दिखते हैं।',
        },
      },
    );
    if (inApp) list.push(OFFLINE_TOUR_STEPS.myOfflineTests());
    return list;
  }, [hasSeries, openCategory, openExam, openSeries, inApp]);

  const whatsNewSteps: TourStep[] = useMemo(() => [
    OFFLINE_TOUR_STEPS.newIntro('tests'),
    OFFLINE_TOUR_STEPS.downloadTest([]),
    OFFLINE_TOUR_STEPS.offlineBookmarks(['[data-tour="ts-bookmarks"]']),
    OFFLINE_TOUR_STEPS.myOfflineTests(),
  ], []);

  return (
    <>
      <GuidedTour
        open={open}
        steps={steps}
        language={language}
        onFinish={finish}
        introLabel={{ en: 'Test Series guide', hi: 'टेस्ट सीरीज गाइड' }}
        startLabel={{ en: 'Start guide', hi: 'गाइड शुरू करें' }}
        stepOffset={-1}
        totalSteps={steps.length - 1}
      />
      <GuidedTour
        open={whatsNewOpen && !open}
        steps={whatsNewSteps}
        language={language}
        onFinish={finishWhatsNew}
        introLabel={{ en: 'What’s new', hi: 'नया क्या है' }}
        startLabel={{ en: 'Show me', hi: 'दिखाएं' }}
        finishLabel={{ en: 'Got it', hi: 'समझ गया' }}
        stepOffset={-1}
        totalSteps={whatsNewSteps.length - 1}
      />
    </>
  );
}
