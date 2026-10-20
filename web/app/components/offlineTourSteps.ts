import { TourStep } from './GuidedTour';

// -----------------------------------------------------------------------------
// Tour steps for the Windows app's offline features (download for offline, My offline
// tests, offline bookmarks). Added to the Test Series and Typing tours inside the app, and
// shown once as a short "New in the Windows app" tour to students who finished those tours
// before these features existed.
// -----------------------------------------------------------------------------

/** Per-device marker: the short "new in the app" tour was seen (or the full tour with these steps). */
export const APP_OFFLINE_TOUR_KEY = { tests: 'mth_app_offline_tour_tests_v1', typing: 'mth_app_offline_tour_typing_v1' } as const;

export function appOfflineTourSeen(page: keyof typeof APP_OFFLINE_TOUR_KEY) {
  try { return localStorage.getItem(APP_OFFLINE_TOUR_KEY[page]) === '1'; } catch { return true; }
}
export function markAppOfflineTourSeen(page: keyof typeof APP_OFFLINE_TOUR_KEY) {
  try { localStorage.setItem(APP_OFFLINE_TOUR_KEY[page], '1'); } catch { /* ignore */ }
}

export const OFFLINE_TOUR_STEPS = {
  newIntro: (page: 'tests' | 'typing'): TourStep => ({
    targets: [],
    title: { en: 'New in the Windows app: study offline', hi: 'विंडोज़ ऐप में नया: ऑफ़लाइन पढ़ाई' },
    body: page === 'tests'
      ? {
          en: 'You can now download mock tests to this computer, attempt them without internet and see the full analysis. Your bookmarked questions are saved offline too.',
          hi: 'अब आप मॉक टेस्ट इस कंप्यूटर पर डाउनलोड करके बिना इंटरनेट दे सकते हैं और पूरा विश्लेषण देख सकते हैं। आपके बुकमार्क प्रश्न भी ऑफ़लाइन सेव होते हैं।',
        }
      : {
          en: 'You can now download typing passages to this computer and take the full typing test without internet, with the same scorecard.',
          hi: 'अब आप टाइपिंग गद्यांश इस कंप्यूटर पर डाउनलोड करके बिना इंटरनेट पूरा टाइपिंग टेस्ट दे सकते हैं, उसी स्कोरकार्ड के साथ।',
        },
  }),

  downloadTest: (targets: string[]): TourStep => ({
    targets,
    title: { en: 'Download for offline', hi: 'ऑफ़लाइन के लिए डाउनलोड करें' },
    body: {
      en: 'Press Download on any test to save it to this computer. It is stored encrypted and opens only in this app. Attempt it without internet; your result and analysis appear right away, and the result is uploaded to your account when you are back online.',
      hi: 'किसी भी टेस्ट पर Download दबाकर उसे इस कंप्यूटर पर सेव करें। यह एन्क्रिप्टेड रहता है और केवल इसी ऐप में खुलता है। बिना इंटरनेट टेस्ट दें; परिणाम और विश्लेषण तुरंत दिखता है, और इंटरनेट आने पर परिणाम आपके खाते में अपलोड हो जाता है।',
    },
  }),

  downloadPassage: (targets: string[]): TourStep => ({
    targets,
    title: { en: 'Download a passage for offline', hi: 'ऑफ़लाइन के लिए गद्यांश डाउनलोड करें' },
    body: {
      en: 'Press Download next to a passage to save it to this computer. You can then take the typing test without internet and get the scorecard; the result is uploaded when you are back online. Downloaded passages show “Offline”.',
      hi: 'किसी गद्यांश के आगे Download दबाकर उसे इस कंप्यूटर पर सेव करें। फिर बिना इंटरनेट टाइपिंग टेस्ट दें और स्कोरकार्ड पाएं; इंटरनेट आने पर परिणाम अपलोड हो जाता है। डाउनलोड हुए गद्यांश पर “Offline” दिखता है।',
    },
  }),

  offlineBookmarks: (targets: string[]): TourStep => ({
    targets,
    title: { en: 'Bookmarks work offline', hi: 'बुकमार्क ऑफ़लाइन भी' },
    body: {
      en: 'In the app, a question is saved to this computer the moment you bookmark it, with its answer and explanation. Open them any time, even without internet, from My offline tests → Bookmarked questions.',
      hi: 'ऐप में प्रश्न बुकमार्क करते ही उत्तर और व्याख्या के साथ इस कंप्यूटर पर सेव हो जाता है। बिना इंटरनेट भी इन्हें My offline tests → Bookmarked questions से खोलें।',
    },
  }),

  myOfflineTests: (): TourStep => ({
    targets: ['[data-tour="account"]'],
    title: { en: 'My offline tests', hi: 'मेरे ऑफ़लाइन टेस्ट' },
    body: {
      en: 'Everything you download is in My offline tests (profile menu → Offline tests, or Offline Tests on the home page). If the app opens without internet, it takes you there. Downloads stay available for 30 days.',
      hi: 'आपके सभी डाउनलोड My offline tests में हैं (प्रोफ़ाइल मेनू → Offline tests, या होम पेज पर Offline Tests)। बिना इंटरनेट ऐप खोलने पर वहीं जा सकते हैं। डाउनलोड 30 दिन तक उपलब्ध रहते हैं।',
    },
  }),
};
