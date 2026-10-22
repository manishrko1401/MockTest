import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// English / Hindi. Keys are the English text, so a missing translation still reads well.

export type Lang = 'en' | 'hi';
const KEY = 'mth_lang';

const HI: Record<string, string> = {
  'Home': 'होम', 'Tests': 'टेस्ट', 'Typing': 'टाइपिंग', 'Notices': 'सूचनाएं', 'Profile': 'प्रोफ़ाइल',
  'Planner': 'प्लानर', 'Friends': 'दोस्त', 'Me': 'मैं', 'With Friends': 'दोस्तों के साथ', 'Appearance': 'थीम',
  'Sign in': 'लॉग इन करें', 'Create account': 'खाता बनाएं', 'Email': 'ईमेल', 'Password': 'पासवर्ड',
  'Full name': 'पूरा नाम', 'Mobile number': 'मोबाइल नंबर', 'Referral code (optional)': 'रेफ़रल कोड (वैकल्पिक)',
  'Forgot password?': 'पासवर्ड भूल गए?', 'Continue with Google': 'Google से जारी रखें', 'or': 'या',
  'New here?': 'नए हैं?', 'Already have an account?': 'पहले से खाता है?', 'Send code': 'कोड भेजें',
  'Reset password': 'पासवर्ड रीसेट करें', 'Code from email': 'ईमेल वाला कोड', 'New password': 'नया पासवर्ड',
  'Back to sign in': 'लॉग इन पर वापस', 'Hello': 'नमस्ते', 'Latest notices': 'नवीनतम सूचनाएं', 'See all': 'सभी देखें',
  'Test Series': 'टेस्ट सीरीज़', 'Typing Tests': 'टाइपिंग टेस्ट', 'Study Planner': 'स्टडी प्लानर', 'Document Locker': 'डॉक्यूमेंट लॉकर',
  'Saved jobs': 'सेव की गई नौकरियां', 'Help & support': 'सहायता', 'Bookmarks': 'बुकमार्क', 'Offline tests': 'ऑफ़लाइन टेस्ट',
  'Continue your test': 'अपना टेस्ट जारी रखें', 'Recent results': 'हाल के परिणाम', 'All': 'सभी', 'Jobs': 'नौकरियां',
  'Results': 'परिणाम', 'Admit cards': 'एडमिट कार्ड', 'Answer keys': 'उत्तर कुंजी', 'News': 'समाचार', 'Search': 'खोजें',
  'Last date': 'अंतिम तिथि', 'Open official link': 'आधिकारिक लिंक खोलें', 'Save job': 'नौकरी सेव करें', 'Saved': 'सेव है',
  'My account': 'मेरा खाता', 'Edit profile': 'प्रोफ़ाइल बदलें', 'Change password': 'पासवर्ड बदलें', 'Language': 'भाषा',
  'Sign out': 'लॉग आउट', 'Save': 'सेव करें', 'Cancel': 'रद्द करें', 'Current password': 'वर्तमान पासवर्ड',
  'Your plan': 'आपका प्लान', 'Coins': 'कॉइन', 'Refer friends': 'दोस्तों को रेफ़र करें', 'Share': 'शेयर करें',
  'Candidate code': 'कैंडिडेट कोड', 'Type a message': 'संदेश लिखें', 'Support team': 'सहायता टीम',
  'No internet connection': 'इंटरनेट कनेक्शन नहीं है', 'Try again': 'फिर से कोशिश करें', 'Loading…': 'लोड हो रहा है…',
  'Coming in the next update': 'अगले अपडेट में आ रहा है', 'Free': 'फ्री', 'PRO': 'PRO',
};

type Value = { lang: Lang; setLang: (l: Lang) => void; t: (en: string) => string; hi: boolean };
const Ctx = createContext<Value>({ lang: 'en', setLang: () => {}, t: s => s, hi: false });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  useEffect(() => { AsyncStorage.getItem(KEY).then(v => { if (v === 'hi' || v === 'en') setLangState(v); }); }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); AsyncStorage.setItem(KEY, l).catch(() => {}); }, []);
  const t = useCallback((en: string) => (lang === 'hi' ? HI[en] || en : en), [lang]);
  const value = useMemo(() => ({ lang, setLang, t, hi: lang === 'hi' }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
