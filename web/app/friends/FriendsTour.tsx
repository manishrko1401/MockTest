"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';
import { GuidedTour, TourStep } from '../components/GuidedTour';

// -----------------------------------------------------------------------------
// With Friends tour: the Test rooms tab (create / join / my rooms, what a room shows), then
// the Friends & chat tab (Friend code, requests, friend list, chat). Shown once (saved on
// the account); replay with "How it works".
// -----------------------------------------------------------------------------

export const START_FRIENDS_TOUR_EVENT = 'mth:start-friends-tour';

export function requestFriendsTourStart() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(START_FRIENDS_TOUR_EVENT));
}

export default function FriendsTour({ ready, showRooms, showFriends }: {
  /** signed in and the page has rendered */
  ready: boolean;
  showRooms: () => void;
  showFriends: () => void;
}) {
  const { currentUser, completeTour, language } = useAuth();
  const [open, setOpen] = useState(false);
  const startedRef = useRef(false);

  const start = useCallback(() => {
    startedRef.current = true;
    showRooms();
    setTimeout(() => setOpen(true), 300);
  }, [showRooms]);

  // Auto-start once (null = never finished; undefined = not known yet)
  useEffect(() => {
    if (startedRef.current || !ready || !currentUser || currentUser.friendsTourCompletedAt !== null) return;
    const timer = setTimeout(start, 1200);
    return () => clearTimeout(timer);
  }, [ready, currentUser, start]);

  useEffect(() => {
    window.addEventListener(START_FRIENDS_TOUR_EVENT, start);
    return () => window.removeEventListener(START_FRIENDS_TOUR_EVENT, start);
  }, [start]);

  const finish = () => { setOpen(false); completeTour('friends'); showRooms(); };

  const steps: TourStep[] = useMemo(() => [
    {
      targets: [],
      title: { en: 'Study with your friends', hi: 'दोस्तों के साथ पढ़ाई करें' },
      body: {
        en: 'Take the same mock test with friends, compare your marks and the time on every question, discuss questions together, and chat with your friends.',
        hi: 'दोस्तों के साथ एक ही मॉक टेस्ट दें, अंक और हर प्रश्न पर लगा समय मिलाएं, प्रश्नों पर साथ में चर्चा करें और दोस्तों से चैट करें।',
      },
    },
    {
      targets: ['[data-tour="fr-tabs"]'],
      title: { en: 'Two tabs', hi: 'दो टैब' },
      body: {
        en: 'Test rooms is where you take tests together. Friends & chat has your friend list, friend requests and messages. A red number shows new requests and unread messages.',
        hi: 'टेस्ट रूम में आप साथ में टेस्ट देते हैं। मित्र और चैट में आपकी मित्र सूची, मित्र अनुरोध और संदेश हैं। लाल संख्या नए अनुरोध और बिना पढ़े संदेश बताती है।',
      },
    },
    {
      targets: ['[data-tour="fr-create"]'],
      title: { en: 'Create a room', hi: 'रूम बनाएं' },
      body: {
        en: 'Search a mock test and choose how to take it: Live (everyone waits in a lobby and starts together when you press Start) or Anytime (friends take it whenever they like for 1, 3 or 7 days). You also choose how many friends can join.',
        hi: 'मॉक टेस्ट खोजें और तय करें कि कैसे देना है: लाइव (सब लॉबी में रुकते हैं और आपके Start दबाने पर साथ शुरू करते हैं) या कभी भी (दोस्त 1, 3 या 7 दिन में जब चाहें दें)। कितने दोस्त जुड़ सकते हैं, यह भी आप चुनते हैं।',
      },
    },
    {
      targets: ['[data-tour="fr-join"]'],
      title: { en: 'Join a room', hi: 'रूम में जुड़ें' },
      body: {
        en: 'Got a room code from a friend? Type it here. You can also just open the invite link they send on WhatsApp.',
        hi: 'किसी दोस्त से रूम कोड मिला? यहां लिखें। आप उनका WhatsApp पर भेजा गया आमंत्रण लिंक भी खोल सकते हैं।',
      },
    },
    {
      targets: ['[data-tour="fr-myrooms"]'],
      title: { en: 'My rooms', hi: 'मेरे रूम' },
      body: {
        en: 'All rooms you made or joined, with their status: lobby, test pending, finished or closed. The bin removes a room from your list only.',
        hi: 'आपके बनाए या जुड़े सभी रूम, उनकी स्थिति के साथ: लॉबी, टेस्ट बाकी, पूरा या बंद। डस्टबिन रूम को सिर्फ़ आपकी सूची से हटाता है।',
      },
    },
    {
      targets: [],
      title: { en: 'Inside a room', hi: 'रूम के अंदर' },
      body: {
        en: 'Invite friends with the code, WhatsApp, or straight from your friend list. After you submit the test you see the leaderboard, section-wise marks, head-to-head with a friend, and every question with each friend’s answer and time. Open any question to discuss it. For fair play, nothing is shown until you have submitted your own test.',
        hi: 'कोड, WhatsApp या सीधे अपनी मित्र सूची से दोस्तों को बुलाएं। टेस्ट जमा करने के बाद लीडरबोर्ड, विषयवार अंक, किसी दोस्त से आमने-सामने तुलना, और हर प्रश्न पर हर दोस्त का उत्तर व समय दिखता है। किसी भी प्रश्न को खोलकर चर्चा करें। निष्पक्षता के लिए, अपना टेस्ट जमा करने से पहले कुछ नहीं दिखता।',
      },
      nextLabel: { en: 'Show Friends & chat', hi: 'मित्र और चैट दिखाएं' },
      onNext: showFriends,
    },
    {
      targets: ['[data-tour="fr-code"]'],
      noBack: true,
      title: { en: 'Your Friend code', hi: 'आपका मित्र कोड' },
      body: {
        en: 'Your own Friend code. Send it to friends so they can add you. Only people who have the code (or your email) can find you.',
        hi: 'आपका अपना मित्र कोड। इसे दोस्तों को भेजें ताकि वे आपको जोड़ सकें। केवल कोड (या आपका ईमेल) जानने वाले ही आपको खोज सकते हैं।',
      },
    },
    {
      targets: ['[data-tour="fr-add"]'],
      title: { en: 'Add a friend', hi: 'मित्र जोड़ें' },
      body: {
        en: 'Enter a friend’s code or email and send a request. Requests you receive appear just below, with Accept and ✕ to reject. You can also add people from a room you took a test in.',
        hi: 'दोस्त का कोड या ईमेल डालें और अनुरोध भेजें। आपको मिले अनुरोध ठीक नीचे दिखते हैं, स्वीकार करने और ✕ से अस्वीकार करने के विकल्प के साथ। जिस रूम में साथ टेस्ट दिया, वहां से भी लोगों को जोड़ सकते हैं।',
      },
    },
    {
      targets: ['[data-tour="fr-list"]'],
      title: { en: 'Your friends', hi: 'आपके मित्र' },
      body: {
        en: 'A green dot means the friend is online now; otherwise you see when they were last active. Friends with new messages come first.',
        hi: 'हरा बिंदु मतलब दोस्त अभी ऑनलाइन है; नहीं तो दिखता है कि वे आख़िरी बार कब सक्रिय थे। नए संदेश वाले मित्र सबसे ऊपर आते हैं।',
      },
    },
    {
      targets: ['[data-tour="fr-chat"]'],
      title: { en: 'Chat', hi: 'चैट' },
      body: {
        en: 'Choose a friend to chat. ✓ means sent and ✓✓ means read. When a friend adds you to a test room, it arrives here with an Open room button.',
        hi: 'चैट के लिए कोई मित्र चुनें। ✓ मतलब भेजा गया और ✓✓ मतलब पढ़ लिया गया। जब कोई दोस्त आपको टेस्ट रूम में जोड़ता है, तो वह यहां "रूम खोलें" बटन के साथ आता है।',
      },
    },
    {
      targets: [],
      title: { en: 'You are ready', hi: 'आप तैयार हैं' },
      body: {
        en: 'Create your first room and send it to a friend. Replay this guide any time with “How it works”.',
        hi: 'अपना पहला रूम बनाएं और किसी दोस्त को भेजें। “यह कैसे काम करता है” से यह गाइड कभी भी दोबारा देखें।',
      },
    },
  ], [showFriends]);

  return (
    <GuidedTour
      open={open}
      steps={steps}
      language={language}
      onFinish={finish}
      introLabel={{ en: 'With Friends guide', hi: 'दोस्तों के साथ गाइड' }}
      startLabel={{ en: 'Start guide', hi: 'गाइड शुरू करें' }}
      stepOffset={-1}
      totalSteps={steps.length - 1}
    />
  );
}
