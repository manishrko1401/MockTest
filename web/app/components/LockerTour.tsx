"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';
import { GuidedTour, TourStep } from './GuidedTour';

// -----------------------------------------------------------------------------
// Document Locker tour: shown once (saved on the account) the first time a user
// sees the unlocked locker dashboard. Replay with "How it works".
// -----------------------------------------------------------------------------

export const START_LOCKER_TOUR_EVENT = 'mth:start-locker-tour';

export function requestLockerTourStart() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(START_LOCKER_TOUR_EVENT));
}

const STEPS: TourStep[] = [
  {
    targets: [],
    title: { en: 'Your Document Locker', hi: 'आपका दस्तावेज़ लॉकर' },
    body: {
      en: 'One safe place for everything you need for your exams: application numbers, passwords, admit cards, photos, signatures and certificates.',
      hi: 'परीक्षाओं के लिए ज़रूरी हर चीज़ का एक सुरक्षित स्थान: आवेदन संख्या, पासवर्ड, प्रवेश पत्र, फोटो, हस्ताक्षर और प्रमाण पत्र।',
    },
  },
  {
    targets: ['[data-tour="lk-drive"]'],
    title: { en: 'Google Drive sync', hi: 'Google Drive सिंक' },
    body: {
      en: 'Connect your Google Drive once. Your files are stored in a “MockTest Hub Locker” folder in your own Drive, and only you can open them. Use Open Drive to see them in Google Drive.',
      hi: 'एक बार अपनी Google Drive जोड़ें। फ़ाइलें आपकी अपनी Drive के “MockTest Hub Locker” फ़ोल्डर में रहती हैं और केवल आप उन्हें खोल सकते हैं। Google Drive में देखने के लिए Open Drive दबाएं।',
    },
  },
  {
    targets: ['[data-tour="lk-menu"]'],
    title: { en: 'Locker sections', hi: 'लॉकर अनुभाग' },
    body: {
      en: 'Applied Exams Vault keeps one card per exam you applied for. The other sections sort your files by type: admit cards, application forms, photos, signatures, certificates and ID proofs. The number shows how many items each has.',
      hi: 'आवेदित परीक्षा वॉल्ट में हर आवेदित परीक्षा का एक कार्ड होता है। बाकी अनुभाग फ़ाइलों को प्रकार के अनुसार रखते हैं: प्रवेश पत्र, आवेदन पत्र, फोटो, हस्ताक्षर, प्रमाण पत्र और पहचान पत्र। संख्या बताती है कि हर अनुभाग में कितनी चीज़ें हैं।',
    },
  },
  {
    targets: ['[data-tour="lk-actions"]'],
    title: { en: 'Quick actions', hi: 'त्वरित क्रियाएं' },
    body: {
      en: 'Add an exam you applied for, upload a document, or change your 4-digit security PIN. When you have files from several years, filter them by exam year here.',
      hi: 'आवेदित परीक्षा जोड़ें, दस्तावेज़ अपलोड करें या अपना 4-अंकीय सुरक्षा PIN बदलें। कई वर्षों की फ़ाइलें होने पर यहां परीक्षा वर्ष से फ़िल्टर करें।',
    },
  },
  {
    targets: ['[data-tour="lk-controls"]'],
    title: { en: 'Search and view', hi: 'खोजें और देखें' },
    body: {
      en: 'Search across exams and files by name, and switch between grid and list view for your documents.',
      hi: 'नाम से परीक्षाएं और फ़ाइलें खोजें, और दस्तावेज़ों के लिए ग्रिड और सूची दृश्य के बीच बदलें।',
    },
  },
  {
    targets: ['[data-tour="lk-content"]'],
    title: { en: 'Your vault', hi: 'आपका वॉल्ट' },
    body: {
      en: 'Each exam card stores your registration number, password and roll number, with a copy button for each, plus the documents linked to that exam. Files can be previewed, downloaded or deleted.',
      hi: 'हर परीक्षा कार्ड में पंजीकरण संख्या, पासवर्ड और रोल नंबर कॉपी बटन के साथ, और उस परीक्षा से जुड़े दस्तावेज़ रहते हैं। फ़ाइलें देखी, डाउनलोड या हटाई जा सकती हैं।',
    },
  },
  {
    targets: ['[data-tour="lk-upload"]'],
    title: { en: 'Upload a document', hi: 'दस्तावेज़ अपलोड करें' },
    body: {
      en: 'Choose the document type and the exam it belongs to, then pick the file. It is saved straight to your Google Drive and appears in the right section here.',
      hi: 'दस्तावेज़ का प्रकार और उससे जुड़ी परीक्षा चुनें, फिर फ़ाइल चुनें। यह सीधे आपकी Google Drive में सहेजी जाती है और यहां सही अनुभाग में दिखती है।',
    },
  },
  {
    targets: ['[data-tour="lk-lock"]'],
    title: { en: 'Lock your locker', hi: 'अपना लॉकर लॉक करें' },
    body: {
      en: 'Lock the locker when you are done, especially on a shared device. Opening it again needs your 4-digit PIN. If you forget the PIN, you can reset it with your account password or an email code.',
      hi: 'काम पूरा होने पर लॉकर लॉक करें, खासकर साझा डिवाइस पर। दोबारा खोलने के लिए 4-अंकीय PIN चाहिए। PIN भूलने पर खाते के पासवर्ड या ईमेल कोड से रीसेट करें।',
    },
  },
  {
    targets: [],
    title: { en: 'Tip: fill it automatically', hi: 'सुझाव: अपने आप भरें' },
    body: {
      en: 'When you mark a job notice as “Applied” on the Notices page, it appears here in your Applied Exams Vault. Replay this guide any time with “How it works”.',
      hi: 'सूचना पृष्ठ पर किसी नौकरी को “आवेदन किया” चिह्नित करने पर वह यहां आवेदित परीक्षा वॉल्ट में दिखती है। “यह कैसे काम करता है” से यह गाइड कभी भी दोबारा देखें।',
    },
  },
];

export default function LockerTour({ ready }: { ready: boolean }) {
  const { currentUser, completeTour, language } = useAuth();
  const [open, setOpen] = useState(false);
  const startedRef = useRef(false);

  const start = useCallback(() => { startedRef.current = true; setOpen(true); }, []);

  // Auto-start once, the first time the user sees the unlocked dashboard
  useEffect(() => {
    if (startedRef.current || !ready || !currentUser || currentUser.lockerTourCompletedAt !== null) return;
    const timer = setTimeout(start, 1200);
    return () => clearTimeout(timer);
  }, [ready, currentUser, start]);

  useEffect(() => {
    window.addEventListener(START_LOCKER_TOUR_EVENT, start);
    return () => window.removeEventListener(START_LOCKER_TOUR_EVENT, start);
  }, [start]);

  const finish = () => { setOpen(false); completeTour('locker'); };

  return (
    <GuidedTour
      open={open}
      steps={STEPS}
      language={language}
      onFinish={finish}
      introLabel={{ en: 'Document Locker guide', hi: 'दस्तावेज़ लॉकर गाइड' }}
      startLabel={{ en: 'Start guide', hi: 'गाइड शुरू करें' }}
      stepOffset={-1}
      totalSteps={STEPS.length - 1}
    />
  );
}
