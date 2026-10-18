"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { LegalDocument } from '../components/LegalDocument';

export default function PrivacyPolicyPage() {
  const { language } = useAuth();
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

  const hi = language === 'hi';
  return (
    <LegalDocument
      language={language}
      crumb={hi ? 'गोपनीयता नीति' : 'Privacy Policy'}
      title={curr.title}
      subtitle={curr.subtitle}
      lastUpdated={curr.lastUpdated}
      sections={[
        { id: 'information-we-collect', title: curr.sec1Title, text: curr.sec1Text },
        { id: 'document-locker', title: curr.sec2Title, text: curr.sec2Text, badge: curr.sec2Badge, highlight: true },
        { id: 'profile-security', title: curr.sec3Title, text: curr.sec3Text, badge: curr.sec3Badge },
        { id: 'analytics-ranks', title: curr.sec4Title, text: curr.sec4Text },
        { id: 'job-tracking', title: curr.sec5Title, text: curr.sec5Text },
        { id: 'referrals', title: curr.sec6Title, text: curr.sec6Text },
        { id: 'no-data-selling', title: curr.sec7Title, text: curr.sec7Text },
        { id: 'session-protection', title: curr.sec8Title, text: curr.sec8Text },
        { id: 'data-retention', title: curr.sec9Title, text: curr.sec9Text },
      ]}
      contactTitle={curr.contactTitle}
      contactText={curr.contactText}
      contactEmail="mocktesthubsupport@gmail.com"
      related={[
        { href: '/terms', label: hi ? 'नियम एवं शर्तें' : 'Terms & Conditions' },
        { href: '/contact', label: hi ? 'हमसे संपर्क करें' : 'Contact Us' },
      ]}
    />
  );
}
