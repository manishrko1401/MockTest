"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { FileText, ArrowLeft, Sun, Moon, CheckCircle2, Shield, Scale, FolderLock, Award, AlertCircle } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { useIsMobile } from '../useIsMobile';

export default function TermsAndConditionsPage() {
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
      title: "Terms and Conditions",
      subtitle: "Please review the terms and legal rules governing your access and use of MockTest Hub.",
      lastUpdated: "Last Updated: July 2026",
      sec1Title: "1. Acceptance of Terms",
      sec1Text: "By registering an account, attempting mock tests, or accessing the Document Locker on MockTest Hub, you agree to comply with and be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.",
      sec2Title: "2. Independent Educational Platform",
      sec2Text: "MockTest Hub is an independent educational and assessment technology platform designed to help aspirants prepare for competitive and government recruitment examinations. We are not affiliated with, endorsed by, or operated by any government organization or examination board.",
      sec3Title: "3. Candidate Account & Security",
      sec3Text: "You are responsible for maintaining the confidentiality of your account credentials. You agree not to share your account, sell test passes, or bypass authentication mechanisms. We deploy multi-device session validation to protect your progress and candidate dossier.",
      sec4Title: "4. Google Drive Document Locker & User Privacy",
      sec4Text: "Our Document Locker feature allows you to sync and store your exam admit cards, application forms, photos, signatures, and certificates directly into your own personal Google Drive using the restricted 'drive.file' scope. MockTest Hub, our administrators, and our servers have ZERO access to your Google Drive or any of your personal files; only you, the user yourself, have full and exclusive access and control over your Google Drive and documents at all times. We do not store, copy, or host any of your private documents on our servers.",
      sec5Title: "5. Fair Use & Intellectual Property",
      sec5Text: "All test series questions, solutions, interface layouts, and analysis algorithms are the intellectual property of MockTest Hub or our content partners. Unauthorized copying, scraping, republishing, or commercial redistribution of content is strictly prohibited.",
      sec6Title: "6. Passes, Coins & Referrals",
      sec6Text: "Access to premium mock test series may require a Mock Test Pass or earned Coins. Coins earned through genuine friend referrals or test completion rewards have no real-world cash equivalence and cannot be redeemed for fiat currency.",
      sec7Title: "7. Limitation of Liability",
      sec7Text: "While we make every effort to provide accurate mock tests and official notice bulletins, MockTest Hub shall not be liable for any discrepancies in official exam dates, candidate selection outcomes, or third-party service interruptions.",
      contactTitle: "Grievance & Legal Contact",
      contactText: "For legal inquiries, dispute resolution, or feedback regarding these terms, please reach out to our legal officer at mocktesthubsupport@gmail.com."
    },
    hi: {
      title: "नियम एवं शर्तें",
      subtitle: "कृपया MockTest Hub के उपयोग और सेवाओं को नियंत्रित करने वाले कानूनी नियमों की समीक्षा करें।",
      lastUpdated: "अंतिम अपडेट: जुलाई २०२६",
      sec1Title: "1. शर्तों की स्वीकृति",
      sec1Text: "खाता पंजीकृत करके, मॉक टेस्ट देकर, या MockTest Hub पर दस्तावेज़ लॉकर का उपयोग करके, आप इन नियमों और शर्तों का पालन करने के लिए बाध्य हैं। यदि आप इन शर्तों से सहमत नहीं हैं, तो कृपया हमारी सेवाओं का उपयोग न करें।",
      sec2Title: "2. स्वतंत्र शैक्षिक मंच",
      sec2Text: "MockTest Hub एक स्वतंत्र शैक्षिक और परीक्षा तैयारी मंच है जो उम्मीदवारों को प्रतियोगी परीक्षाओं की तैयारी में मदद करता है। हम किसी भी सरकारी संगठन या परीक्षा बोर्ड से संबद्ध या संचालित नहीं हैं।",
      sec3Title: "3. उम्मीदवार खाता और सुरक्षा",
      sec3Text: "आप अपने खाते के क्रेडेंशियल्स की गोपनीयता बनाए रखने के लिए जिम्मेदार हैं। आप अपना खाता साझा न करने, टेस्ट पास बेचने, या सुरक्षा तंत्र को बायपास न करने के लिए सहमत हैं।",
      sec4Title: "4. गूगल ड्राइव दस्तावेज़ लॉकर और उपयोगकर्ता गोपनीयता",
      sec4Text: "हमारा दस्तावेज़ लॉकर आपको 'drive.file' अनुमति के माध्यम से सीधे अपने व्यक्तिगत Google Drive में प्रवेश पत्र, आवेदन पत्र, फोटो, हस्ताक्षर और प्रमाण पत्र सुरक्षित रखने की सुविधा देता है। MockTest Hub, हमारे प्रशासकों और हमारे सर्वर के पास आपके Google Drive या आपकी किसी भी व्यक्तिगत फ़ाइल तक कोई पहुंच (zero access) नहीं है; केवल और केवल आप (उपयोगकर्ता स्वयं) के पास ही अपने Google Drive और दस्तावेज़ों का पूर्ण और विशेष नियंत्रण व पहुंच है। हम आपके किसी भी निजी दस्तावेज़ को अपने सर्वर पर संग्रहीत या होस्ट नहीं करते हैं।",
      sec5Title: "5. उचित उपयोग और बौद्धिक संपदा",
      sec5Text: "सभी टेस्ट सीरीज़ प्रश्न, समाधान और विश्लेषण एल्गोरिदम MockTest Hub की बौद्धिक संपदा हैं। सामग्री की अनधिकृत नकल, स्क्रैपिंग, या पुनर्वितरण सख्त वर्जित है।",
      sec6Title: "6. पास, कॉइन्स और रेफरल",
      sec6Text: "प्रीमियम टेस्ट सीरीज़ के लिए पास या अर्जित कॉइन्स की आवश्यकता हो सकती है। रेफरल के माध्यम से अर्जित कॉइन्स का कोई नकद मूल्य नहीं है और इन्हें वास्तविक मुद्रा में नहीं बदला जा सकता है।",
      sec7Title: "7. दायित्व की सीमा",
      sec7Text: "सटीक मॉक टेस्ट प्रदान करने के हर संभव प्रयास के बावजूद, MockTest Hub आधिकारिक परीक्षा तिथियों, चयन परिणामों, या तृतीय-पक्ष सेवा व्यवधानों में किसी भी विसंगति के लिए उत्तरदायी नहीं होगा।",
      contactTitle: "कानूनी अधिकारी से संपर्क करें",
      contactText: "कानूनी पूछताछ या इन शर्तों के संबंध में प्रतिक्रिया के लिए, हमसे mocktesthubsupport@gmail.com पर संपर्क करें।"
    }
  };

  const curr = language === 'hi' ? content.hi : content.en;

  return (
    <div className="flex-1 flex flex-col bg-slate-200/90 dark:bg-slate-900 font-sans min-h-screen text-slate-800 dark:text-slate-100 select-none transition-colors duration-200">
      
      {/* HEADER NAVBAR */}
      <header className="h-18 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-sm sticky top-0 z-40 transition-colors duration-200">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-2 rounded-full flex items-center justify-center h-9 w-9 border border-blue-200/50 dark:border-slate-700">
              <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-xs md:text-sm leading-tight text-slate-900 dark:text-white tracking-wider">{t.logoTitle}</h1>
              <p className="text-[8px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase">{t.logoSub}</p>
            </div>
          </Link>
          <span className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:inline"></span>
          <Link 
            href="/" 
            className="hidden sm:flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> {t.backToHome}
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-bold focus:outline-none cursor-pointer"
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
          className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold text-xs"
        >
          <ArrowLeft className="h-4 w-4" /> {t.backToHome}
        </Link>
      </div>

      {/* MAIN LAYOUT */}
      <main className="py-12 px-4 sm:px-6 md:px-8 max-w-4xl w-full mx-auto flex-1 flex flex-col relative z-10">
        
        {/* Title Header */}
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Scale className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/60 px-2 py-0.5 rounded">
              Legal Terms
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
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-900/40 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec1Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec1Text}</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition border-l-4 border-l-amber-500">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-amber-100/50 dark:border-amber-900/40 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                {curr.sec2Title}
                <span className="text-[8px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 font-extrabold px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/60">Notice</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec2Text}</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec3Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec3Text}</p>
            </div>
          </div>

          {/* Card 4 - Google Drive Locker */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition border-l-4 border-l-blue-500">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-900/40 text-blue-600 dark:text-blue-400">
              <FolderLock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                {curr.sec4Title}
                <span className="text-[8px] bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 font-extrabold px-1.5 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/60">100% Private</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec4Text}</p>
            </div>
          </div>

          {/* Card 5 */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-emerald-100/50 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec5Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec5Text}</p>
            </div>
          </div>

          {/* Card 6 */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-purple-100/50 dark:border-purple-900/40 text-purple-600 dark:text-purple-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec6Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec6Text}</p>
            </div>
          </div>

          {/* Card 7 */}
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{curr.sec7Title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{curr.sec7Text}</p>
            </div>
          </div>

        </div>

        {/* SUPPORT / CONTACT FOOTER */}
        <div className="mt-12 p-6 rounded-2xl bg-blue-50/40 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/30 text-center space-y-3">
          <h5 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">{curr.contactTitle}</h5>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed font-semibold">
            {curr.contactText}
          </p>
        </div>

        {/* POLICY NAV LINKS */}
        <div className="mt-8 flex items-center justify-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
          <Link href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">
            Contact Us
          </Link>
          <span>•</span>
          <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
            Privacy Policy
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
