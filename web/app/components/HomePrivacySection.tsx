"use client";

import React from 'react';
import { useAuth } from '../AuthContext';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Lock, 
  FolderLock, 
  BarChart3, 
  Bell, 
  Gift, 
  CheckCircle2, 
  Database 
} from 'lucide-react';
import { TRANSLATIONS } from '../translations';

interface HomePrivacySectionProps {
  onBack: () => void;
}

export default function HomePrivacySection({ onBack }: HomePrivacySectionProps) {
  const { language } = useAuth();
  const t = TRANSLATIONS[language];
  const isHindi = language === 'hi';

  const content = {
    en: {
      title: "Privacy Policy",
      subtitle: "Learn how we safeguard your personal data, exam attempt analytics, and Google Drive Document Locker.",
      lastUpdated: "Last Updated: August 2026",

      sec1Title: "1. Information We Collect",
      sec1Text: "We collect minimal candidate details required to provide you with a personalized exam simulation experience: your Full Name, Email Address, Mobile Number, and Password (stored strictly as an irreversible cryptographic hash). We also store your exam attempts and bookmarked questions.",

      sec2Title: "2. Google Drive Document Locker & Zero-Access Privacy",
      sec2Badge: "100% Private • User Owned",
      sec2Text: "Our Document Locker allows you to save and organize your admit cards, application confirmation PDFs, passport photos, signatures, and certificates directly in your personal Google Drive. We connect via the official Google OAuth 'drive.file' scope, meaning MockTest Hub only requests permission to create and manage the 'MockTest Hub Locker' folder in your Drive. MockTest Hub, our servers, and our administrators have ZERO ACCESS to your personal Google Drive or documents. We never store, copy, host, view, or download your private files on our database servers. Only you, the user yourself, have 100% full and sole access to your Google Drive and documents at all times.",

      sec3Title: "3. Candidate Dossier Security & Integrity",
      sec3Badge: "Tamper-Proof",
      sec3Text: "To prevent unauthorized profile tampering and identity fraud during mock assessments, your core profile fields (Name, Email, Mobile) are protected with strict validation rules. Profile modifications can only be initiated directly by you through your authenticated Student Dashboard.",

      sec4Title: "4. Exam Analytics, Ranks & Leaderboards",
      sec4Text: "When you complete a mock test, our assessment engine computes your score, accuracy rate, percentile, and All-India Rank. Public leaderboards show only your candidate code / display name and aggregated performance metrics. We never expose your contact information or personal documents on leaderboards.",

      sec5Title: "5. Job Tracking & Notification Alerts",
      sec5Text: "If you save or mark official job notices as 'Applied', this preference is linked to your account to provide you with upcoming application deadline reminders and exam date alerts via local and push notifications.",

      sec6Title: "6. Referral Rewards & Coins Privacy",
      sec6Text: "Our referral program rewards you with Coins when your invited friends register. Referral records track only the signup timestamp and reward verification status. We never share your financial or banking information.",

      sec7Title: "7. Zero Third-Party Advertising & No Data Selling",
      sec7Text: "MockTest Hub is an educational preparation platform. We DO NOT sell, rent, trade, or monetize your personal information with third-party data brokers, marketers, or external advertisers.",

      sec8Title: "8. Session Protection & Encryption",
      sec8Text: "We enforce multi-device session verification and rate-limiting algorithms to block brute-force attacks. All data in transit is encrypted using industry-standard TLS 1.3 / SSL encryption."
    },
    hi: {
      title: "गोपनीयता नीति (Privacy Policy)",
      subtitle: "जानिए हम आपके व्यक्तिगत डेटा, परीक्षा परिणामों और Google Drive दस्तावेज़ लॉकर की सुरक्षा कैसे करते हैं।",
      lastUpdated: "अंतिम अपडेट: अगस्त २०२६",

      sec1Title: "1. हमारे द्वारा एकत्रित की जाने वाली जानकारी",
      sec1Text: "हम केवल परीक्षा सिमुलेशन अनुभव प्रदान करने के लिए आवश्यक न्यूनतम उम्मीदवार विवरण एकत्र करते हैं: आपका पूरा नाम, ईमेल पता, मोबाइल नंबर, और पासवर्ड (अपरिवर्तनीय क्रिप्टोग्राफ़िक हैश के रूप में सुरक्षित)। हम आपके टेस्ट प्रयासों और बुकमार्क किए गए प्रश्नों को भी सहेजते हैं।",

      sec2Title: "2. गूगल ड्राइव दस्तावेज़ लॉकर एवं शून्य-पहुंच (Zero-Access) गोपनीयता",
      sec2Badge: "१००% निजी • उपयोगकर्ता स्वामित्व",
      sec2Text: "हमारा दस्तावेज़ लॉकर आपको सीधे आपके व्यक्तिगत Google Drive में अपने प्रवेश पत्र, आवेदन पुष्टिकरण पीडीएफ, पासपोर्ट फोटो, हस्ताक्षर और प्रमाण पत्र सहेजने की सुविधा देता है। हम आधिकारिक Google OAuth 'drive.file' अनुमति से जुड़ते हैं। MockTest Hub, हमारे सर्वर और हमारे प्रशासकों के पास आपके Google Drive या किसी भी निजी दस्तावेज़ तक कोई पहुंच (zero access) नहीं है। हम आपके किसी भी निजी दस्तावेज़ को अपने डेटाबेस सर्वर पर कभी भी संग्रहीत, कॉपी, होस्ट या डाउनलोड नहीं करते हैं। केवल आप स्वयं ही अपने Google Drive और फ़ाइलों पर पूर्ण नियंत्रण रखते हैं।",

      sec3Title: "3. उम्मीदवार प्रोफ़ाइल सुरक्षा",
      sec3Badge: "छेड़छाड़-मुक्त",
      sec3Text: "परीक्षा में अनधिकृत प्रोफ़ाइल हेरफेर और पहचान धोखाधड़ी को रोकने के लिए, आपके मुख्य प्रोफ़ाइल फ़ील्ड (नाम, ईमेल, मोबाइल) सख्त सत्यापन नियमों से सुरक्षित हैं।",

      sec4Title: "4. परीक्षा विश्लेषण, रैंक और लीडरबोर्ड",
      sec4Text: "जब आप मॉक टेस्ट पूरा करते हैं, तो हमारा मूल्यांकन इंजन आपका स्कोर, सटीकता दर, पर्सेंटाइल और अखिल भारतीय रैंक की गणना करता है। सार्वजनिक लीडरबोर्ड केवल आपका डिस्प्ले नाम और प्रदर्शन मेट्रिक्स दिखाते हैं।",

      sec5Title: "5. जॉब ट्रैकिंग और अधिसूचना अलर्ट",
      sec5Text: "यदि आप आधिकारिक नौकरी अधिसूचनाओं को 'Applied' के रूप में चिह्नित करते हैं, तो यह वरीयता आपको आगामी आवेदन समय सीमा और परीक्षा तिथि अलर्ट भेजने के लिए उपयोग की जाती है।",

      sec6Title: "6. रेफरल पुरस्कार और कॉइन्स गोपनीयता",
      sec6Text: "हमारा रेफरल कार्यक्रम आपके मित्रों के पंजीकरण पर आपको कॉइन्स से पुरस्कृत करता है। हम आपकी कोई भी वित्तीय जानकारी साझा नहीं करते हैं।",

      sec7Title: "7. कोई विज्ञापन नहीं और डेटा की कोई बिक्री नहीं",
      sec7Text: "MockTest Hub एक शैक्षिक मंच है। हम आपकी व्यक्तिगत जानकारी को तीसरे पक्ष के डेटा दलालों या विपणक को कभी नहीं बेचते, किराए पर नहीं देते या मुद्रीकृत नहीं करते हैं।",

      sec8Title: "8. सत्र सुरक्षा और एन्क्रिप्शन",
      sec8Text: "हम क्रूर-बल हमलों को रोकने के लिए बहु-उपकरण सत्यापन लागू करते हैं। पारगमन में सभी डेटा उद्योग-मानक टीएलएस 1.3 / एसएसएल एन्क्रिप्शन से सुरक्षित है।"
    }
  };

  const curr = isHindi ? content.hi : content.en;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-200">
      
      {/* TOP HEADER WITH BACK BUTTON */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer shrink-0"
            title={isHindi ? 'मुख्य पृष्ठ पर वापस जाएं' : 'Back to Home'}
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-black text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight truncate flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              <span>{curr.title}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {curr.lastUpdated}
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
        >
          {isHindi ? 'होम पर वापस' : 'Back to Home'}
        </button>
      </div>

      {/* SCROLLABLE BODY CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* BANNER */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-md">
          <h3 className="text-base sm:text-xl font-black">{curr.title}</h3>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 font-medium">{curr.subtitle}</p>
        </div>

        {/* ZERO ACCESS DRIVE PRIVACY HIGHLIGHT */}
        <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="font-black text-xs sm:text-sm text-purple-950 dark:text-purple-200 flex items-center gap-2">
              <FolderLock className="h-4.5 w-4.5 text-purple-600" />
              <span>{curr.sec2Title}</span>
            </h4>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-200/60 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-extrabold text-[9px] uppercase tracking-wider">
              {curr.sec2Badge}
            </span>
          </div>
          <p className="text-xs text-purple-900 dark:text-purple-300 leading-relaxed font-medium">
            {curr.sec2Text}
          </p>
        </div>

        {/* PRIVACY CLAUSES */}
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{curr.sec1Title}</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {curr.sec1Text}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-500 shrink-0" />
              <span>{curr.sec4Title}</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {curr.sec4Text}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>{curr.sec5Title}</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {curr.sec5Text}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Gift className="h-4 w-4 text-pink-500 shrink-0" />
              <span>{curr.sec6Title}</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {curr.sec6Text}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{curr.sec7Title}</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {curr.sec7Text}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-600 shrink-0" />
              <span>{curr.sec8Title}</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {curr.sec8Text}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
