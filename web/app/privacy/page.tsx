"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { ShieldCheck, ArrowLeft, Sun, Moon, Lock, Eye, Database, ShieldAlert, Award } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { useIsMobile } from '../useIsMobile';

export default function PrivacyPolicyPage() {
  const { currentUser, theme, toggleTheme, language, setLanguage } = useAuth();
  const t = TRANSLATIONS[language];
  const { isMobile, isMounted } = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const content = {
    en: {
      title: "Privacy Policy",
      subtitle: "Learn how we protect and manage your personal data and test session details.",
      lastUpdated: "Last Updated: July 2026",
      sec1Title: "1. Information We Collect",
      sec1Text: "We collect personal details necessary to provide you with Government exam mock tests and notice alerts. This includes your Name, Email Address, Mobile Number, and Password (stored securely as a hash). We also store your exam history, including attempted sessions, positive/negative marks counters, and bookmarked questions.",
      sec2Title: "2. Candidate Dossier Security",
      sec2Text: "To preserve candidate identity integrity and prevent unauthorized credential modifications, your profile dossier fields (Name, Email, Mobile, and Password) are strictly read-only for administrators. Profile updates can only be modified directly by you through your authorized Student Dashboard. Any administrative modifications to profile settings require secure administrator verification passwords.",
      sec3Title: "3. How We Use Your Data",
      sec3Text: "We use the collected data strictly to run mock test simulation flows, track historical attempt parameters (such as cutoff scores and marks analysis), manage your subscription tier, and display live official notification bulletins.",
      sec4Title: "4. Cookies and Session Storage",
      sec4Text: "We use essential session tokens and cookies to verify your identity. These parameters securely retain your active authentication status across pages and prevent remote credential hijacking. They do not track your browsing habits outside our web domains.",
      sec5Title: "5. Data Retention & Deletion",
      sec5Text: "Your credentials and Mock Test attempt records are stored on our servers until you request account deletion. You can request profile deletion at any time by contacting our support team.",
      sec6Title: "6. Security Countermeasures",
      sec6Text: "We deploy rate-limiting algorithms to block brute-force credential stuffing attempts (limiting failed attempts to 5 before a temporary lockout). Database assets are queried over secure SSL channels using adapter abstraction layouts to prevent SQL injection risks.",
      contactTitle: "Contact Privacy Officer",
      contactText: "For privacy questions, data modification request submissions, or account removal inquiries, contact us at privacy@mocktesthub.in."
    },
    hi: {
      title: "गोपनीयता नीति",
      subtitle: "जानें कि हम आपके व्यक्तिगत डेटा और परीक्षा सत्र विवरणों की सुरक्षा और प्रबंधन कैसे करते हैं।",
      lastUpdated: "अंतिम अपडेट: जुलाई २०२६",
      sec1Title: "1. जानकारी जो हम एकत्र करते हैं",
      sec1Text: "हम आपको सरकारी परीक्षा मॉक टेस्ट और नोटिस अलर्ट प्रदान करने के लिए आवश्यक व्यक्तिगत विवरण एकत्र करते हैं। इसमें आपका नाम, ईमेल पता, मोबाइल नंबर और पासवर्ड (सुरक्षित रूप से हैश के रूप में संग्रहीत) शामिल हैं। हम आपके परीक्षा इतिहास को भी संग्रहीत करते हैं, जिसमें प्रयास किए गए सत्र, सकारात्मक/नकारात्मक अंक और बुकमार्क किए गए प्रश्न शामिल हैं।",
      sec2Title: "2. उम्मीदवार प्रोफ़ाइल सुरक्षा",
      sec2Text: "उम्मीदवार की पहचान की सत्यता बनाए रखने और क्रेडेंशियल में अनधिकृत संशोधनों को रोकने के लिए, आपकी प्रोफ़ाइल के मुख्य फ़ील्ड (नाम, ईमेल, मोबाइल और पासवर्ड) प्रशासकों के लिए पूरी तरह से केवल पठन योग्य (read-only) हैं। प्रोफ़ाइल अपडेट केवल आपके द्वारा अधिकृत छात्र डैशबोर्ड के माध्यम से सीधे संशोधित किए जा सकते हैं।",
      sec3Title: "3. हम आपके डेटा का उपयोग कैसे करते हैं",
      sec3Text: "हम एकत्र किए गए डेटा का उपयोग विशेष रूप से मॉक टेस्ट सिमुलेशन चलाने, पिछले प्रयासों के मापदंडों (जैसे कटऑफ अंक और अंक विश्लेषण) को ट्रैक करने, आपके सदस्यता स्तर को प्रबंधित करने और लाइव आधिकारिक नोटिस दिखाने के लिए करते हैं।",
      sec4Title: "4. कुकीज़ और सत्र संग्रहण",
      sec4Text: "हम आपकी पहचान सत्यापित करने के लिए आवश्यक सत्र टोकन और कुकीज़ का उपयोग करते हैं। ये पैरामीटर पृष्ठों पर आपके सक्रिय प्रमाणीकरण स्थिति को सुरक्षित रूप से बनाए रखते हैं और क्रेडेंशियल चोरी को रोकते हैं।",
      sec5Title: "5. डेटा प्रतिधारण और विलोपन",
      sec5Text: "आपके क्रेडेंशियल और मॉक टेस्ट प्रयास रिकॉर्ड हमारे सर्वर पर तब तक संग्रहीत रहते हैं जब तक आप खाता हटाने का अनुरोध नहीं करते। आप समर्थन टीम से संपर्क करके किसी भी समय प्रोफ़ाइल विलोपन का अनुरोध कर सकते हैं।",
      sec6Title: "6. सुरक्षा प्रति-उपाय",
      sec6Text: "हम क्रूर-बल (brute-force) क्रेडेंशियल चोरी के प्रयासों को अवरुद्ध करने के लिए दर-सीमित (rate-limiting) एल्गोरिदम तैनात करते हैं (अस्थायी लॉकडाउन से पहले विफल प्रयासों को 5 तक सीमित करना)। डेटाबेस संपत्तियों को सुरक्षित एसएसएल चैनलों पर एक्सेस किया जाता है।",
      contactTitle: "गोपनीयता अधिकारी से संपर्क करें",
      contactText: "गोपनीयता संबंधी प्रश्नों, डेटा संशोधन अनुरोध सबमिशन, या खाता हटाने की पूछताछ के लिए, हमसे privacy@mocktesthub.in पर संपर्क करें।"
    }
  };

  const curr = language === 'hi' ? content.hi : content.en;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 font-sans min-h-screen text-slate-800 dark:text-slate-100 select-none transition-colors duration-200">
      
      {/* HEADER NAVBAR */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 px-6 md:px-8 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-2 rounded-full flex items-center justify-center h-9 w-9 border border-blue-200/50 dark:border-slate-700">
              <Award className="h-5 w-5 text-blue-600 dark:text-blue-450" />
            </div>
            <div>
              <h1 className="font-extrabold text-xs md:text-sm leading-tight text-slate-900 dark:text-white tracking-wider">{t.logoTitle}</h1>
              <p className="text-[8px] text-blue-600 dark:text-blue-450 font-bold tracking-widest uppercase">{t.logoSub}</p>
            </div>
          </Link>
          <span className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800   hidden sm:inline"></span>
          <Link 
            href="/" 
            className="hidden sm:flex items-center gap-1.5 text-slate-600 dark:text-slate-350 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> {t.backToHome}
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-205 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-350 border border-slate-200 dark:border-slate-808 text-[10px] sm:text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>

          {/* Theme Switcher */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition border border-slate-200 dark:border-slate-800 flex items-center justify-center"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* MOBILE BACK LINK */}
      <div className="p-4 sm:hidden bg-white dark:bg-slate-955 border-b border-slate-250/20">
        <Link 
          href="/" 
          className="flex items-center gap-1.5 text-slate-655 dark:text-slate-350 font-bold text-xs"
        >
          <ArrowLeft className="h-4 w-4" /> {t.backToHome}
        </Link>
      </div>

      {/* MAIN LAYOUT */}
      <main className="py-12 px-4 sm:px-6 md:px-8 max-w-4xl w-full mx-auto flex-1 flex flex-col relative z-10">
        
        {/* Title Header */}
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-808 pb-6 mb-8">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-450">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-955/40 border border-blue-200/50 dark:border-blue-900/60 px-2 py-0.5 rounded">
              Security Advisory
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {curr.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
            {curr.subtitle}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono">
            {curr.lastUpdated}
          </span>
        </div>

        {/* POLICY GRID */}
        <div className="space-y-6">
          
          {/* Card 1 */}
          <div className="p-5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-blue-50 dark:bg-blue-955/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-900/40 text-blue-600 dark:text-blue-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec1Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-405 leading-relaxed font-medium">{curr.sec1Text}</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 hover:shadow-md transition border-l-4 border-l-emerald-500">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-955/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-emerald-100/50 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                {curr.sec2Title}
                <span className="text-[8px] bg-emerald-105 text-emerald-800 dark:bg-emerald-955/60 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded border border-emerald-250/50 dark:border-emerald-800/60">Candidate Exclusive</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-405 leading-relaxed font-medium">{curr.sec2Text}</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-955/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec3Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-405 leading-relaxed font-medium">{curr.sec3Text}</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-amber-50 dark:bg-amber-955/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-amber-100/50 dark:border-amber-900/40 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec4Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-405 leading-relaxed font-medium">{curr.sec4Text}</p>
            </div>
          </div>

          {/* Card 5 */}
          <div className="p-5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-red-50 dark:bg-red-955/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-red-100/50 dark:border-red-900/40 text-red-600 dark:text-red-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec5Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-405 leading-relaxed font-medium">{curr.sec5Text}</p>
            </div>
          </div>

          {/* Card 6 */}
          <div className="p-5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-teal-50 dark:bg-teal-955/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-teal-100/50 dark:border-teal-900/40 text-teal-600 dark:text-teal-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec6Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-405 leading-relaxed font-medium">{curr.sec6Text}</p>
            </div>
          </div>

        </div>

        {/* SUPPORT / CONTACT FOOTER */}
        <div className="mt-12 p-6 rounded-2xl bg-blue-50/40 dark:bg-blue-955/15 border border-blue-150 dark:border-blue-900/30 text-center space-y-3">
          <h5 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">{curr.contactTitle}</h5>
          <p className="text-xs text-slate-600 dark:text-slate-350 max-w-xl mx-auto leading-relaxed font-semibold">
            {curr.contactText}
          </p>
        </div>

      </main>

      {/* SITE FOOTER */}
      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-808 bg-white dark:bg-slate-955 text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
        © 2026 MockTest Hub. All rights reserved.
      </footer>

    </div>
  );
}
