"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';
import { GuidedTour, TourStep } from './GuidedTour';

// -----------------------------------------------------------------------------
// Welcome tour for new users.
// Starts automatically once for accounts whose tourCompletedAt is null (new signups),
// and can be replayed any time via the "Take the tour" link (window event / ?tour=1).
// Each step highlights the first visible element matching its selectors; when none is
// visible (e.g. nav links hidden on phones) the step is shown as a centred card.
// -----------------------------------------------------------------------------

export const START_TOUR_EVENT = 'mth:start-tour';

/** Ask the tour to start (used by the header's "Take the tour" link on the home page). */
export function requestTourStart() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(START_TOUR_EVENT));
}

const STEPS: TourStep[] = [
  {
    targets: [],
    title: { en: 'Welcome to MockTest Hub', hi: 'MockTest Hub में आपका स्वागत है' },
    body: {
      en: 'Take a one-minute tour of the main features: mock tests, typing tests, notices and your document locker.',
      hi: 'मुख्य सुविधाओं का एक मिनट का परिचय लें: मॉक टेस्ट, टाइपिंग टेस्ट, सूचनाएं और आपका दस्तावेज़ लॉकर।',
    },
  },
  {
    targets: ['[data-tour="nav-tests"]', '[data-tour="home-tests"]'],
    title: { en: 'Test Series', hi: 'टेस्ट सीरीज' },
    body: {
      en: 'Full-length CBT mock tests organised by exam. Choose a category, then an exam and a series. After each test you get your score, rank, section-wise analysis and detailed solutions.',
      hi: 'परीक्षा के अनुसार पूर्ण CBT मॉक टेस्ट। श्रेणी, परीक्षा और सीरीज चुनें। हर टेस्ट के बाद अंक, रैंक, अनुभागवार विश्लेषण और विस्तृत समाधान मिलते हैं।',
    },
  },
  {
    targets: ['[data-tour="nav-typing"]', '[data-tour="home-typing"]'],
    title: { en: 'Typing Tests', hi: 'टाइपिंग टेस्ट' },
    body: {
      en: 'Practise typing tests that follow each exam’s official rules (SSC, courts, state exams). Every test has a demo, a break and the main test, and ends with an official-style scorecard.',
      hi: 'हर परीक्षा (SSC, न्यायालय, राज्य परीक्षाएं) के आधिकारिक नियमों पर आधारित टाइपिंग टेस्ट। हर टेस्ट में डेमो, ब्रेक और मुख्य टेस्ट होता है, और अंत में आधिकारिक जैसा स्कोरकार्ड मिलता है।',
    },
  },
  {
    targets: ['[data-tour="nav-notices"]', '[data-tour="home-notices"]'],
    title: { en: 'Notices', hi: 'सूचनाएं' },
    body: {
      en: 'Latest government job notices, results, admit cards and answer keys. Open any notice for important dates and links, then save it or mark it as applied to track it in your profile.',
      hi: 'नवीनतम सरकारी नौकरी सूचनाएं, परिणाम, प्रवेश पत्र और उत्तर कुंजी। महत्वपूर्ण तिथियों और लिंक के लिए सूचना खोलें, फिर उसे सहेजें या आवेदन किया चिह्नित करें।',
    },
  },
  {
    targets: ['[data-tour="nav-locker"]', '[data-tour="home-locker"]'],
    title: { en: 'Document Locker', hi: 'दस्तावेज़ लॉकर' },
    body: {
      en: 'Keep application numbers, passwords, admit cards and results in one place. Files are stored in your own Google Drive and the locker is protected by your 4-digit PIN.',
      hi: 'आवेदन संख्या, पासवर्ड, प्रवेश पत्र और परिणाम एक स्थान पर रखें। फ़ाइलें आपकी अपनी Google Drive में रहती हैं और लॉकर आपके 4-अंकीय PIN से सुरक्षित है।',
    },
  },
  {
    targets: ['[data-tour="account"]', '[data-tour="mobile-menu"]'],
    title: { en: 'Your account', hi: 'आपका खाता' },
    body: {
      en: 'Open this menu for your profile, saved and applied jobs, bookmarks and Refer & Earn. You can replay this tour from here at any time with “Take the tour”.',
      hi: 'प्रोफ़ाइल, सहेजी गई नौकरियों, बुकमार्क और रेफर एवं कमाएं के लिए यह मेन्यू खोलें। “टूर देखें” से आप यह परिचय कभी भी दोबारा देख सकते हैं।',
    },
  },
];

export default function WelcomeTour({ blocked = false }: { blocked?: boolean }) {
  const { currentUser, completeTour, language } = useAuth();
  const [open, setOpen] = useState(false);
  const autoStartedRef = useRef(false);

  const start = useCallback(() => setOpen(true), []);
  const finish = useCallback(() => { setOpen(false); completeTour('welcome'); }, [completeTour]);

  // Auto-start for new users (after any signup/claim popup has closed)
  useEffect(() => {
    if (autoStartedRef.current || open || blocked) return;
    if (!currentUser || currentUser.tourCompletedAt !== null) return;
    const timer = setTimeout(() => {
      if (!autoStartedRef.current) { autoStartedRef.current = true; start(); }
    }, 2500);
    return () => clearTimeout(timer);
  }, [currentUser, blocked, open, start]);

  // Replay: "Take the tour" link (event) or /?tour=1 (read once per instance — safe under dev double-effects)
  const [wantTour] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tour') === '1');
  useEffect(() => {
    const onStart = () => { autoStartedRef.current = true; start(); };
    window.addEventListener(START_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_TOUR_EVENT, onStart);
  }, [start]);

  useEffect(() => {
    if (!wantTour) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === '1') {
      params.delete('tour');
      const qs = params.toString();
      window.history.replaceState(window.history.state, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    }
    const timer = setTimeout(() => { autoStartedRef.current = true; start(); }, 600);
    return () => clearTimeout(timer);
  }, [wantTour, start]);

  return (
    <GuidedTour
      open={open}
      steps={STEPS}
      language={language}
      onFinish={finish}
      introLabel={{ en: 'Quick tour', hi: 'परिचय' }}
      startLabel={{ en: 'Start tour', hi: 'टूर शुरू करें' }}
      stepOffset={-1}
      totalSteps={STEPS.length - 1}
    />
  );
}
