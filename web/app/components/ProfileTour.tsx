"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';
import { GuidedTour, TourStep } from './GuidedTour';

// -----------------------------------------------------------------------------
// Account / profile page tour. Walks through each section of the page, opening
// them one by one. Shown once (saved on the account); replay with "How it works".
// -----------------------------------------------------------------------------

export const START_PROFILE_TOUR_EVENT = 'mth:start-profile-tour';

export function requestProfileTourStart() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(START_PROFILE_TOUR_EVENT));
}

type Section = 'overview' | 'details' | 'security' | 'tracked-jobs' | 'subscription' | 'referrals' | 'preferences';

// The first card of the open section
const CONTENT = ['[data-tour="pf-content"] > :first-child'];

export default function ProfileTour({ ready, openSection }: { ready: boolean; openSection: (section: Section) => void }) {
  const { currentUser, completeTour, language } = useAuth();
  const [open, setOpen] = useState(false);
  const startedRef = useRef(false);
  const openRef = useRef(openSection);
  openRef.current = openSection;

  const start = useCallback(() => {
    startedRef.current = true;
    openRef.current('overview');
    setTimeout(() => setOpen(true), 200);
  }, []);

  useEffect(() => {
    if (startedRef.current || !ready || !currentUser || currentUser.profileTourCompletedAt !== null) return;
    const timer = setTimeout(start, 1200);
    return () => clearTimeout(timer);
  }, [ready, currentUser, start]);

  useEffect(() => {
    window.addEventListener(START_PROFILE_TOUR_EVENT, start);
    return () => window.removeEventListener(START_PROFILE_TOUR_EVENT, start);
  }, [start]);

  const finish = () => {
    setOpen(false);
    openRef.current('overview');
    completeTour('profile');
  };

  const go = (section: Section) => () => openRef.current(section);

  const steps: TourStep[] = useMemo(() => [
    {
      targets: [],
      title: { en: 'Your account', hi: 'आपका खाता' },
      body: {
        en: 'A quick look at everything in your account: your details, saved jobs, membership, referrals and settings.',
        hi: 'आपके खाते की हर चीज़ पर एक नज़र: आपका विवरण, सहेजी गई नौकरियां, सदस्यता, रेफ़रल और सेटिंग्स।',
      },
    },
    {
      targets: ['[data-tour="pf-header"]'],
      title: { en: 'Your profile', hi: 'आपकी प्रोफ़ाइल' },
      body: {
        en: 'Your name, plan, email and candidate code (Hub ID). Keep your candidate code handy when you contact support.',
        hi: 'आपका नाम, प्लान, ईमेल और उम्मीदवार कोड (Hub ID)। सहायता से संपर्क करते समय अपना उम्मीदवार कोड साथ रखें।',
      },
    },
    {
      targets: ['[data-tour="pf-menu"]', '[data-tour="pf-menu-m"]'],
      title: { en: 'Account menu', hi: 'खाता मेन्यू' },
      body: {
        en: 'Use this menu to move between the sections of your account. Let’s go through them one by one.',
        hi: 'खाते के अनुभागों के बीच जाने के लिए इस मेन्यू का उपयोग करें। चलिए एक-एक करके देखते हैं।',
      },
    },
    {
      targets: CONTENT,
      title: { en: 'Overview', hi: 'अवलोकन' },
      body: {
        en: 'Your coins, referrals and applied jobs at a glance, your membership plan, and the exams you are tracking.',
        hi: 'आपके कॉइन्स, रेफ़रल और आवेदित नौकरियां एक नज़र में, आपका सदस्यता प्लान और ट्रैक की जा रही परीक्षाएं।',
      },
      onNext: go('details'),
    },
    {
      targets: CONTENT,
      title: { en: 'Personal information', hi: 'व्यक्तिगत जानकारी' },
      body: {
        en: 'Update your name and mobile number. Your email is used to sign in and for password reset codes.',
        hi: 'अपना नाम और मोबाइल नंबर अपडेट करें। आपका ईमेल लॉग इन और पासवर्ड रीसेट कोड के लिए उपयोग होता है।',
      },
      onNext: go('security'),
      noBack: true,
    },
    {
      targets: CONTENT,
      title: { en: 'Password & security', hi: 'पासवर्ड एवं सुरक्षा' },
      body: {
        en: 'Change your password here. Use a password you do not use on other websites.',
        hi: 'यहां अपना पासवर्ड बदलें। ऐसा पासवर्ड रखें जो आप दूसरी वेबसाइटों पर उपयोग नहीं करते।',
      },
      onNext: go('tracked-jobs'),
      noBack: true,
    },
    {
      targets: CONTENT,
      title: { en: 'Saved & applied jobs', hi: 'सहेजी एवं आवेदित नौकरियां' },
      body: {
        en: 'Every notice you saved or marked as applied, with its last date. Filter and search them, open a notice, or remove it from your list.',
        hi: 'आपकी हर सहेजी गई या आवेदित सूचना उसकी अंतिम तिथि के साथ। फ़िल्टर करें, खोजें, सूचना खोलें या सूची से हटाएं।',
      },
      onNext: go('subscription'),
      noBack: true,
    },
    {
      targets: CONTENT,
      title: { en: 'Membership', hi: 'सदस्यता' },
      body: {
        en: 'Your current plan and what it unlocks. Premium (PRO) mock tests need a pass, which you can claim or unlock with coins.',
        hi: 'आपका वर्तमान प्लान और उससे मिलने वाली सुविधाएं। प्रीमियम (PRO) मॉक टेस्ट के लिए पास चाहिए, जिसे आप क्लेम कर सकते हैं या कॉइन्स से अनलॉक कर सकते हैं।',
      },
      onNext: go('referrals'),
      noBack: true,
    },
    {
      targets: CONTENT,
      title: { en: 'Refer & earn', hi: 'रेफर करें और कमाएं' },
      body: {
        en: 'Copy your referral code and share it with friends. When they register, you both earn coins.',
        hi: 'अपना रेफ़रल कोड कॉपी करें और दोस्तों के साथ साझा करें। उनके पंजीकरण करने पर आप दोनों को कॉइन्स मिलते हैं।',
      },
      onNext: go('preferences'),
      noBack: true,
    },
    {
      targets: CONTENT,
      title: { en: 'Theme & language', hi: 'थीम एवं भाषा' },
      body: {
        en: 'Choose light or dark mode and English or Hindi for the whole website. Replay this guide any time with “How it works” at the top of this page.',
        hi: 'पूरी वेबसाइट के लिए लाइट या डार्क मोड और अंग्रेज़ी या हिंदी चुनें। इस पृष्ठ के ऊपर “यह कैसे काम करता है” से यह गाइड कभी भी दोबारा देखें।',
      },
      noBack: true,
    },
  ], []);

  return (
    <GuidedTour
      open={open}
      steps={steps}
      language={language}
      onFinish={finish}
      introLabel={{ en: 'Account guide', hi: 'खाता गाइड' }}
      startLabel={{ en: 'Start guide', hi: 'गाइड शुरू करें' }}
      stepOffset={-1}
      totalSteps={steps.length - 1}
    />
  );
}
