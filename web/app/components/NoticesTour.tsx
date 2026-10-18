"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { GuidedTour, TourStep, setPendingTour, peekPendingTour, clearPendingTour } from './GuidedTour';

// -----------------------------------------------------------------------------
// Notices tour: how to open a live notice, apply, save, mark as applied and share.
// Part 1 runs on /updates and ends by opening the first live notice with ?tour=notices;
// part 2 continues on that notice's detail page. Shown once per user (saved on the
// account; remembered in the browser for visitors who are not logged in).
// -----------------------------------------------------------------------------

export const START_NOTICES_TOUR_EVENT = 'mth:start-notices-tour';
const LOCAL_DONE_KEY = 'mth_notices_tour_done';
const TOTAL_NUMBERED_STEPS = 7; // 2 on the list page + 5 on the detail page

export function requestNoticesTourStart() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(START_NOTICES_TOUR_EVENT));
}

const LIST_STEPS: TourStep[] = [
  {
    targets: [],
    title: { en: 'How to use Notices', hi: 'सूचनाओं का उपयोग कैसे करें' },
    body: {
      en: 'A short guide to finding a notice, applying, saving it, marking it as applied and sharing it.',
      hi: 'सूचना खोजने, आवेदन करने, सहेजने, आवेदन किया चिह्नित करने और साझा करने की संक्षिप्त जानकारी।',
    },
  },
  {
    targets: ['[data-tour="notice-filters"]'],
    title: { en: 'Find a notice', hi: 'सूचना खोजें' },
    body: {
      en: 'Search by exam or post name, or open one category: Live Notices, Results, Admit Cards or Answer Keys.',
      hi: 'परीक्षा या पद के नाम से खोजें, या कोई एक श्रेणी खोलें: लाइव सूचनाएं, परिणाम, प्रवेश पत्र या उत्तर कुंजी।',
    },
  },
  {
    targets: ['[data-tour="notice-row"]'],
    title: { en: 'Open a live notice', hi: 'लाइव सूचना खोलें' },
    body: {
      en: 'Click any notice title to open its full details: important dates, fee, eligibility and official links. Let’s open this one.',
      hi: 'पूरी जानकारी के लिए किसी भी सूचना के शीर्षक पर क्लिक करें: महत्वपूर्ण तिथियां, शुल्क, पात्रता और आधिकारिक लिंक। चलिए इसे खोलते हैं।',
    },
  },
];

const DETAIL_STEPS: TourStep[] = [
  {
    targets: ['[data-tour="notice-apply"]', '#sec-links'],
    title: { en: 'Apply or download', hi: 'आवेदन या डाउनलोड करें' },
    body: {
      en: 'This opens the official application form or notification PDF on the recruiter’s website. The Important links section lists every official link in order.',
      hi: 'यह भर्ती संस्था की वेबसाइट पर आधिकारिक आवेदन पत्र या अधिसूचना PDF खोलता है। महत्वपूर्ण लिंक अनुभाग में सभी आधिकारिक लिंक क्रम से दिए गए हैं।',
    },
  },
  {
    targets: ['[data-tour="notice-save"]'],
    title: { en: 'Save the job', hi: 'नौकरी सहेजें' },
    body: {
      en: 'Save this notice to your profile so you can come back to it later and keep track of its last date.',
      hi: 'इस सूचना को अपनी प्रोफ़ाइल में सहेजें ताकि आप बाद में इसे देख सकें और अंतिम तिथि पर नज़र रख सकें।',
    },
  },
  {
    targets: ['[data-tour="notice-applied"]'],
    title: { en: 'Mark as applied', hi: 'आवेदन किया चिह्नित करें' },
    body: {
      en: 'After you apply, mark it here. You can then store your registration number, password, roll number and exam date, and keep files in your Document Locker.',
      hi: 'आवेदन करने के बाद इसे यहां चिह्नित करें। फिर आप पंजीकरण संख्या, पासवर्ड, रोल नंबर और परीक्षा तिथि सहेज सकते हैं और फ़ाइलें दस्तावेज़ लॉकर में रख सकते हैं।',
    },
  },
  {
    targets: ['[data-tour="notice-share"]'],
    title: { en: 'Share the notice', hi: 'सूचना साझा करें' },
    body: {
      en: 'Copy the link to this notice and send it to friends on WhatsApp, Telegram or anywhere else.',
      hi: 'इस सूचना का लिंक कॉपी करें और दोस्तों को WhatsApp, Telegram या कहीं भी भेजें।',
    },
  },
  {
    targets: ['[data-tour="notice-track"]'],
    title: { en: 'Track your applications', hi: 'अपने आवेदन ट्रैक करें' },
    body: {
      en: 'Saved and applied jobs appear in your profile under “Saved & applied jobs”. You can replay this guide from the Notices page with “How it works”.',
      hi: 'सहेजी गई और आवेदन की गई नौकरियां आपकी प्रोफ़ाइल में “सहेजी एवं आवेदित नौकरियां” में दिखती हैं। सूचना पृष्ठ पर “यह कैसे काम करता है” से यह गाइड फिर देखें।',
    },
  },
];

function useNoticesTourDone() {
  const { currentUser } = useAuth();
  // undefined = unknown yet (never auto-start on unknown)
  if (currentUser) return currentUser.noticesTourCompletedAt === undefined ? undefined : !!currentUser.noticesTourCompletedAt;
  try { return typeof window !== 'undefined' && localStorage.getItem(LOCAL_DONE_KEY) === '1'; } catch { return false; }
}

/** Part 1 — on the notices list page. */
export function NoticesListTour({ firstNoticeId }: { firstNoticeId: string | null }) {
  const { language, completeTour, currentUser } = useAuth();
  const router = useRouter();
  const done = useNoticesTourDone();
  const [open, setOpen] = useState(false);
  const startedRef = useRef(false);

  const start = useCallback(() => { startedRef.current = true; setOpen(true); }, []);

  useEffect(() => {
    if (startedRef.current || done !== false || !firstNoticeId) return;
    const timer = setTimeout(start, 1200);
    return () => clearTimeout(timer);
  }, [done, firstNoticeId, start]);

  useEffect(() => {
    window.addEventListener(START_NOTICES_TOUR_EVENT, start);
    return () => window.removeEventListener(START_NOTICES_TOUR_EVENT, start);
  }, [start]);

  const finish = () => {
    setOpen(false);
    if (firstNoticeId) {
      setPendingTour('notices');
      router.push(`/updates/${firstNoticeId}`);
    } else if (currentUser) {
      completeTour('notices');
    } else {
      try { localStorage.setItem(LOCAL_DONE_KEY, '1'); } catch { /* ignore */ }
    }
  };

  return (
    <GuidedTour
      open={open}
      steps={LIST_STEPS}
      language={language}
      onFinish={finish}
      introLabel={{ en: 'Notices guide', hi: 'सूचना गाइड' }}
      startLabel={{ en: 'Start guide', hi: 'गाइड शुरू करें' }}
      finishLabel={{ en: 'Open this notice', hi: 'यह सूचना खोलें' }}
      stepOffset={-1}
      totalSteps={TOTAL_NUMBERED_STEPS}
    />
  );
}

/** Part 2 — on a notice's detail page, started by ?tour=notices. */
export function NoticeDetailTour({ ready }: { ready: boolean }) {
  const { language, completeTour, currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  // Read ?tour=notices once per component instance (safe under React's dev double-effects)
  const [wantTour] = useState(() => peekPendingTour('notices'));
  const startedRef = useRef(false);

  useEffect(() => {
    if (wantTour) clearPendingTour('notices');
  }, [wantTour]);

  useEffect(() => {
    if (!ready || !wantTour || startedRef.current) return;
    const timer = setTimeout(() => { startedRef.current = true; setOpen(true); }, 700);
    return () => clearTimeout(timer);
  }, [ready, wantTour]);

  const finish = () => {
    setOpen(false);
    if (currentUser) completeTour('notices');
    try { localStorage.setItem(LOCAL_DONE_KEY, '1'); } catch { /* ignore */ }
  };

  return (
    <GuidedTour
      open={open}
      steps={DETAIL_STEPS}
      language={language}
      onFinish={finish}
      stepOffset={2}
      totalSteps={TOTAL_NUMBERED_STEPS}
    />
  );
}
