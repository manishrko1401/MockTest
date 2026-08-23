"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Sun, 
  Moon, 
  Lock, 
  Eye, 
  Database, 
  ShieldAlert, 
  Award, 
  FolderLock, 
  BarChart3, 
  Bell, 
  Gift, 
  MessageSquare, 
  CheckCircle2, 
  Scale 
} from 'lucide-react';
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
      subtitle: "Learn how we safeguard your personal data, exam attempt analytics, and Google Drive Document Locker.",
      lastUpdated: "Last Updated: August 2026",

      sec1Title: "1. Information We Collect",
      sec1Text: "We collect minimal candidate details required to provide you with a personalized exam simulation experience: your Full Name, Email Address, Mobile Number, and Password (stored strictly as an irreversible cryptographic hash). We also store your exam attempts (question responses, section-wise marks, accuracy percentages, test time analytics) and bookmarked questions.",

      sec2Title: "2. Google Drive Document Locker & Zero-Access Privacy",
      sec2Badge: "100% Private • User Owned",
      sec2Text: "Our Document Locker allows you to save and organize your admit cards, application confirmation PDFs, passport photos, signatures, and certificates directly in your personal Google Drive. We connect via the official Google OAuth 'drive.file' scope, meaning MockTest Hub only requests permission to create and manage the 'MockTest Hub Locker' folder in your Drive. MockTest Hub, our servers, and our administrators have ZERO ACCESS to your personal Google Drive or documents. We never store, copy, host, view, or download your private files on our database servers. Only you, the user yourself, have 100% full and sole access to your Google Drive and documents at all times.",

      sec3Title: "3. Candidate Dossier Security & Integrity",
      sec3Badge: "Tamper-Proof",
      sec3Text: "To prevent unauthorized profile tampering and identity fraud during mock assessments, your core profile fields (Name, Email, Mobile) are protected with strict validation rules. Profile modifications can only be initiated directly by you through your authenticated Student Dashboard.",

      sec4Title: "4. Exam Analytics, Ranks & Leaderboards",
      sec4Text: "When you complete a mock test, our assessment engine computes your score, accuracy rate, percentile, and All-India Rank. Public leaderboards show only your candidate code / display name and aggregated performance metrics. We never expose your contact information or personal documents on leaderboards.",

      sec5Title: "5. Job Tracking & Notification Alerts",
      sec5Text: "If you save or mark official job notices as 'Applied', this preference is linked to your account to provide you with upcoming application deadline reminders and exam date alerts via local and push notifications. You can toggle notification permissions at any time in your device settings.",

      sec6Title: "6. Referral Rewards & Coins Privacy",
      sec6Text: "Our referral program rewards you with Coins when your invited friends register. Referral records track only the signup timestamp and reward verification status. We never share your financial or banking information.",

      sec7Title: "7. Zero Third-Party Advertising & No Data Selling",
      sec7Text: "MockTest Hub is an educational preparation platform. We DO NOT sell, rent, trade, or monetize your personal information with third-party data brokers, marketers, or external advertisers. There are zero tracking ad networks operating on our testing portals.",

      sec8Title: "8. Session Protection & Rate-Limiting Countermeasures",
      sec8Text: "We enforce multi-device session verification and rate-limiting algorithms to block automated brute-force attacks and credential stuffing. All data in transit is encrypted using industry-standard TLS 1.3 / SSL encryption.",

      sec9Title: "9. Data Retention & Right to Account Deletion",
      sec9Text: "Your test attempts and performance history are retained to let you track your exam progress over time. You have the right to request full account deletion and data wiping at any time by contacting our support desk at mocktesthubsupport@gmail.com.",

      contactTitle: "Contact Privacy & Grievance Officer",
      contactText: "For privacy inquiries, data deletion requests, or security feedback, please contact our Data Protection Officer at mocktesthubsupport@gmail.com."
    },
    hi: {
      title: "गोपनीयता नीति",
      subtitle: "जानें कि हम आपके व्यक्तिगत डेटा, परीक्षा विश्लेषण और गूगल ड्राइव दस्तावेज़ लॉकर की सुरक्षा कैसे करते हैं।",
      lastUpdated: "अंतिम अपडेट: अगस्त २०२६",

      sec1Title: "1. जानकारी जो हम एकत्र करते हैं",
      sec1Text: "हम व्यक्तिगत परीक्षा सिमुलेशन अनुभव प्रदान करने के लिए केवल आवश्यक जानकारी एकत्र करते हैं: आपका पूरा नाम, ईमेल पता, मोबाइल नंबर और पासवर्ड (क्रिप्टोग्राफ़िक हैश के रूप में सुरक्षित)। हम आपके मॉक टेस्ट प्रयास (उत्तर, अनुभाग-वार अंक, सटीकता और समय विश्लेषण) और बुकमार्क किए गए प्रश्नों को भी सुरक्षित रखते हैं।",

      sec2Title: "2. गूगल ड्राइव दस्तावेज़ लॉकर और शून्य-पहुंच (Zero-Access) गोपनीयता",
      sec2Badge: "100% निजी • केवल उपयोगकर्ता का अधिकार",
      sec2Text: "हमारा दस्तावेज़ लॉकर आपको अपने प्रवेश पत्र, आवेदन पत्र, पासपोर्ट फोटो, हस्ताक्षर और प्रमाण पत्र सीधे अपने व्यक्तिगत Google Drive में सहेजने की सुविधा देता है। हम आधिकारिक Google OAuth 'drive.file' अनुमति का उपयोग करते हैं, जिससे MockTest Hub केवल आपके ड्राइव में 'MockTest Hub Locker' फ़ोल्डर बनाने और प्रबंधित करने की अनुमति लेता है। MockTest Hub, हमारे सर्वर और हमारे प्रशासकों के पास आपके व्यक्तिगत Google Drive या दस्तावेज़ों तक शून्य पहुंच (ZERO ACCESS) है। हम आपके निजी दस्तावेज़ों को अपने सर्वर पर कभी भी संग्रहीत, डाउनलोड या नहीं देखते हैं। केवल और केवल आप स्वयं ही अपने Google Drive और फ़ाइलों के 100% स्वामी और नियंत्रक हैं।",

      sec3Title: "3. उम्मीदवार प्रोफ़ाइल सुरक्षा और सत्यता",
      sec3Badge: "छेड़छाड़-मुक्त",
      sec3Text: "मॉक टेस्ट के दौरान उम्मीदवार की पहचान की सत्यता बनाए रखने के लिए, आपकी प्रोफ़ाइल के मुख्य फ़ील्ड (नाम, ईमेल, मोबाइल) सुरक्षित प्रमाणीकरण के अधीन हैं। प्रोफ़ाइल संशोधन केवल आपके द्वारा अधिकृत छात्र डैशबोर्ड के माध्यम से ही किए जा सकते हैं।",

      sec4Title: "4. परीक्षा विश्लेषण, रैंक और लीडरबोर्ड",
      sec4Text: "जब आप मॉक टेस्ट पूरा करते हैं, तो हमारा इंजन आपके अंक, सटीकता दर, पर्सेंटाइल और ऑल-इंडिया रैंक की गणना करता है। सार्वजनिक लीडरबोर्ड पर केवल आपका उम्मीदवार कोड / प्रदर्शित नाम और प्रदर्शन आँकड़े दिखाई देते हैं। आपका संपर्क विवरण या निजी दस्तावेज़ कभी भी सार्वजनिक नहीं किए जाते हैं।",

      sec5Title: "5. जॉब ट्रैकिंग और अधिसूचना अलर्ट",
      sec5Text: "यदि आप आधिकारिक जॉब नोटिस को 'Applied' या 'Saved' के रूप में चिह्नित करते हैं, तो यह आपको अंतिम तिथि और परीक्षा तिथियों की अग्रिम सूचनाएं भेजने के लिए उपयोग किया जाता है। आप डिवाइस सेटिंग्स में किसी भी समय नोटिफिकेशन बंद कर सकते हैं।",

      sec6Title: "6. रेफरल पुरस्कार और कॉइन्स गोपनीयता",
      sec6Text: "हमारा रेफरल प्रोग्राम मित्रों को आमंत्रित करने पर कॉइन्स प्रदान करता है। रेफरल रिकॉर्ड केवल साइनअप समय और सत्यापन स्थिति को ट्रैक करते हैं। हम वित्तीय या बैंकिंग जानकारी साझा नहीं करते हैं।",

      sec7Title: "7. कोई तृतीय-पक्ष विज्ञापन नहीं और डेटा बिक्री पर पूर्ण प्रतिबंध",
      sec7Text: "MockTest Hub एक शैक्षिक मंच है। हम आपका व्यक्तिगत डेटा किसी भी तृतीय-पक्ष विज्ञापनदाता, मार्केटिंग कंपनी या डेटा ब्रोकर को कभी नहीं बेचते, किराए पर नहीं देते या साझा नहीं करते हैं।",

      sec8Title: "8. सत्र सुरक्षा और सुरक्षा प्रति-उपाय",
      sec8Text: "हम ब्रूट-फ़ोर्स हमलों को रोकने के लिए बहु-उपकरण सत्र सत्यापन और दर-सीमित (rate-limiting) सुरक्षा तैनात करते हैं। सभी डेटा को उद्योग-मानक TLS 1.3 / SSL एन्क्रिप्शन पर सुरक्षित रूप से प्रेषित किया जाता है।",

      sec9Title: "9. डेटा प्रतिधारण और खाता हटाने का अधिकार",
      sec9Text: "आपके टेस्ट प्रयास और प्रगति इतिहास तब तक सुरक्षित रहते हैं जब तक आप अपना खाता बनाए रखते हैं। आप mocktesthubsupport@gmail.com पर अनुरोध करके किसी भी समय अपना पूरा खाता और डेटा हटाने का अनुरोध कर सकते हैं।",

      contactTitle: "गोपनीयता और शिकायत अधिकारी से संपर्क करें",
      contactText: "गोपनीयता प्रश्नों, डेटा हटाने के अनुरोधों या सुरक्षा सुझावों के लिए, हमारे डेटा सुरक्षा अधिकारी से mocktesthubsupport@gmail.com पर संपर्क करें।"
    }
  };

  const curr = language === 'hi' ? content.hi : content.en;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 font-sans min-h-screen text-slate-800 dark:text-slate-100 select-none transition-colors duration-200">
      
      {/* HEADER NAVBAR */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 md:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
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
          <span className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:inline"></span>
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
            className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>

          {/* Theme Switcher */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition border border-slate-200 dark:border-slate-800 flex items-center justify-center cursor-pointer"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* MOBILE BACK LINK */}
      <div className="p-4 sm:hidden bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <Link 
          href="/" 
          className="flex items-center gap-1.5 text-slate-600 dark:text-slate-350 font-bold text-xs"
        >
          <ArrowLeft className="h-4 w-4" /> {t.backToHome}
        </Link>
      </div>

      {/* MAIN LAYOUT */}
      <main className="py-12 px-4 sm:px-6 md:px-8 max-w-4xl w-full mx-auto flex-1 flex flex-col relative z-10">
        
        {/* Title Header */}
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-450">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/60 px-2 py-0.5 rounded">
              Privacy & Data Protection
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
          
          {/* Card 1: Information Collected */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-900/40 text-blue-600 dark:text-blue-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec1Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec1Text}</p>
            </div>
          </div>

          {/* Card 2: Google Drive Locker (Highlighted) */}
          <div className="p-5 bg-white dark:bg-slate-950 border-2 border-blue-500/80 dark:border-blue-500/60 rounded-2xl shadow-md flex flex-col sm:flex-row gap-4 hover:shadow-lg transition relative overflow-hidden bg-gradient-to-r from-blue-500/5 via-transparent to-emerald-500/5">
            <div className="p-3 bg-blue-600 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 text-white shadow-md shadow-blue-600/30">
              <FolderLock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2 flex-wrap">
                {curr.sec2Title}
                <span className="text-[8px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 font-black px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 uppercase tracking-wide">
                  {curr.sec2Badge}
                </span>
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">{curr.sec2Text}</p>
            </div>
          </div>

          {/* Card 3: Dossier Integrity */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-emerald-100/50 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                {curr.sec3Title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec3Text}</p>
            </div>
          </div>

          {/* Card 4: Exam Analytics & Ranks */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec4Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec4Text}</p>
            </div>
          </div>

          {/* Card 5: Jobs & Notifications */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-amber-100/50 dark:border-amber-900/40 text-amber-600 dark:text-amber-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec5Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec5Text}</p>
            </div>
          </div>

          {/* Card 6: Referrals & Coins */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-purple-100/50 dark:border-purple-900/40 text-purple-600 dark:text-purple-400">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec6Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec6Text}</p>
            </div>
          </div>

          {/* Card 7: Zero Advertising (Highlighted) */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition border-l-4 border-l-emerald-500">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-emerald-100/50 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec7Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec7Text}</p>
            </div>
          </div>

          {/* Card 8: Session Security */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-teal-100/50 dark:border-teal-900/40 text-teal-600 dark:text-teal-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec8Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec8Text}</p>
            </div>
          </div>

          {/* Card 9: Data Retention & Deletion */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-rose-100/50 dark:border-rose-900/40 text-rose-600 dark:text-rose-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec9Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec9Text}</p>
            </div>
          </div>

        </div>

        {/* SUPPORT / CONTACT FOOTER */}
        <div className="mt-12 p-6 rounded-2xl bg-blue-50/40 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/30 text-center space-y-3">
          <h5 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">{curr.contactTitle}</h5>
          <p className="text-xs text-slate-600 dark:text-slate-350 max-w-xl mx-auto leading-relaxed font-semibold">
            {curr.contactText}
          </p>
        </div>

        {/* POLICY NAV LINKS */}
        <div className="mt-8 flex items-center justify-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
          <Link href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">
            Contact Us
          </Link>
          <span>•</span>
          <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
            Terms & Conditions
          </Link>
        </div>

      </main>

      {/* SITE FOOTER */}
      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
        © 2026 MockTest Hub. All rights reserved.
      </footer>

    </div>
  );
}
