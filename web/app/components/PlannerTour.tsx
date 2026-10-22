"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';
import { GuidedTour, TourStep } from './GuidedTour';

// -----------------------------------------------------------------------------
// Study Planner tour: shown once (saved on the account) the first time a user opens the
// planner. Replay with "How it works".
// -----------------------------------------------------------------------------

export const START_PLANNER_TOUR_EVENT = 'mth:start-planner-tour';

export function requestPlannerTourStart() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(START_PLANNER_TOUR_EVENT));
}

const STEPS: TourStep[] = [
  {
    targets: [],
    title: { en: 'Your Study Planner', hi: 'आपका स्टडी प्लानर' },
    body: {
      en: 'Plan what to study each day, set daily mock and typing test targets, count down to your exams and track your syllabus, all in one place.',
      hi: 'रोज़ क्या पढ़ना है इसकी योजना बनाएं, दैनिक मॉक और टाइपिंग टेस्ट लक्ष्य तय करें, परीक्षा की उलटी गिनती देखें और सिलेबस ट्रैक करें, सब एक ही जगह।',
    },
  },
  {
    targets: ['[data-tour="pl-views"]'],
    title: { en: 'Two parts', hi: 'दो हिस्से' },
    body: {
      en: 'Tasks & targets is your daily plan. Syllabus tracker lists the subjects and chapters of your exam so you can mark what you have finished.',
      hi: 'कार्य व लक्ष्य आपकी रोज़ की योजना है। सिलेबस ट्रैकर में आपकी परीक्षा के विषय और अध्याय होते हैं, ताकि आप पूरे किए गए अध्याय चिह्नित कर सकें।',
    },
  },
  {
    targets: ['[data-tour="pl-today"]'],
    title: { en: "Today at a glance", hi: 'आज एक नज़र में' },
    body: {
      en: 'How many of today’s tasks you have finished, tasks that are overdue, and how many you completed this week.',
      hi: 'आज के कितने कार्य पूरे हुए, कौन से कार्य बकाया हैं, और इस सप्ताह कितने कार्य पूरे किए।',
    },
  },
  {
    targets: ['[data-tour="pl-targets"]'],
    title: { en: 'Daily test targets', hi: 'दैनिक टेस्ट लक्ष्य' },
    body: {
      en: 'Choose how many mock tests and typing tests to do every day. Progress fills in by itself when you finish tests, and meeting the target every day builds a streak.',
      hi: 'तय करें कि रोज़ कितने मॉक टेस्ट और टाइपिंग टेस्ट देने हैं। टेस्ट पूरा करने पर प्रगति अपने आप भरती है, और रोज़ लक्ष्य पूरा करने से लगातार सफलता (स्ट्रीक) बनती है।',
    },
  },
  {
    targets: ['[data-tour="pl-exams"]'],
    title: { en: 'Exam countdown', hi: 'परीक्षा उलटी गिनती' },
    body: {
      en: 'Add your exam dates to see how many days are left. If an exam has a syllabus, you also see how much of it is done.',
      hi: 'बचे हुए दिन देखने के लिए अपनी परीक्षा तिथियां जोड़ें। अगर परीक्षा का सिलेबस जुड़ा है, तो उसका कितना हिस्सा पूरा हुआ यह भी दिखता है।',
    },
  },
  {
    targets: ['[data-tour="pl-quick"]', '[data-tour="pl-new"]'],
    title: { en: 'Add a task', hi: 'कार्य जोड़ें' },
    body: {
      en: 'Type a task and press Enter to add it for today. Use Details (or New task) to set a date and time, a priority, a checklist, or repeat it on chosen weekdays.',
      hi: 'कार्य लिखें और आज के लिए जोड़ने को Enter दबाएं। तारीख व समय, प्राथमिकता, चेकलिस्ट या चुने हुए दिनों पर दोहराने के लिए विवरण (या नया कार्य) का उपयोग करें।',
    },
  },
  {
    targets: ['[data-tour="pl-tasks"]'],
    title: { en: 'Your tasks', hi: 'आपके कार्य' },
    body: {
      en: 'Today shows what is due now (overdue tasks first), Upcoming shows the next days, and History shows what you finished. Tick a task to mark it done; tap it to edit.',
      hi: 'आज में अभी के कार्य (पहले बकाया), आगामी में आने वाले दिन, और इतिहास में पूरे किए गए कार्य दिखते हैं। कार्य पूरा करने के लिए टिक करें; बदलने के लिए उस पर टैप करें।',
    },
  },
  {
    targets: ['[data-tour="pl-calendar"]'],
    title: { en: 'Calendar', hi: 'कैलेंडर' },
    body: {
      en: 'Days with tasks or exams are marked. Choose a day to see or add tasks for that day.',
      hi: 'जिन दिनों में कार्य या परीक्षा है, वे चिह्नित होते हैं। उस दिन के कार्य देखने या जोड़ने के लिए कोई दिन चुनें।',
    },
  },
  {
    targets: ['[data-tour="pl-views"]'],
    title: { en: 'Syllabus tracker', hi: 'सिलेबस ट्रैकर' },
    body: {
      en: 'Start from a ready syllabus for your exam or make your own: subjects with chapters, marked to do, in progress or done, with revisions. Add any chapter to your tasks in one tap.',
      hi: 'अपनी परीक्षा का तैयार सिलेबस चुनें या अपना बनाएं: विषय और उनके अध्याय, जिन्हें बाकी, जारी या पूरा चिह्नित करें, रिवीजन के साथ। किसी भी अध्याय को एक टैप में कार्यों में जोड़ें।',
    },
  },
  {
    targets: [],
    title: { en: 'Saved to your account', hi: 'आपके खाते में सेव' },
    body: {
      en: 'Your plan is the same on the website, the Windows app and the Android app. Replay this guide any time with “How it works”.',
      hi: 'आपकी योजना वेबसाइट, Windows ऐप और Android ऐप पर एक जैसी रहती है। “यह कैसे काम करता है” से यह गाइड कभी भी दोबारा देखें।',
    },
  },
];

export default function PlannerTour({ ready, showTasks }: {
  /** the planner has loaded */
  ready: boolean;
  /** switch to the Tasks & targets view (the tour shows that view) */
  showTasks: () => void;
}) {
  const { currentUser, completeTour, language } = useAuth();
  const [open, setOpen] = useState(false);
  const startedRef = useRef(false);

  const start = useCallback(() => {
    startedRef.current = true;
    showTasks();
    setTimeout(() => setOpen(true), 250);
  }, [showTasks]);

  // Auto-start once (null = never finished; undefined = not known yet)
  useEffect(() => {
    if (startedRef.current || !ready || !currentUser || currentUser.plannerTourCompletedAt !== null) return;
    const timer = setTimeout(start, 1200);
    return () => clearTimeout(timer);
  }, [ready, currentUser, start]);

  useEffect(() => {
    window.addEventListener(START_PLANNER_TOUR_EVENT, start);
    return () => window.removeEventListener(START_PLANNER_TOUR_EVENT, start);
  }, [start]);

  const finish = () => { setOpen(false); completeTour('planner'); };

  return (
    <GuidedTour
      open={open}
      steps={STEPS}
      language={language}
      onFinish={finish}
      introLabel={{ en: 'Study Planner guide', hi: 'स्टडी प्लानर गाइड' }}
      startLabel={{ en: 'Start guide', hi: 'गाइड शुरू करें' }}
      stepOffset={-1}
      totalSteps={STEPS.length - 1}
    />
  );
}
