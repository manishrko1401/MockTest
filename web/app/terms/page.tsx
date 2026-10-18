"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { LegalDocument } from '../components/LegalDocument';

export default function TermsAndConditionsPage() {
  const { language } = useAuth();
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

  const hi = language === 'hi';
  return (
    <LegalDocument
      language={language}
      crumb={hi ? 'नियम एवं शर्तें' : 'Terms & Conditions'}
      title={curr.title}
      subtitle={curr.subtitle}
      lastUpdated={curr.lastUpdated}
      sections={[
        { id: 'acceptance', title: curr.sec1Title, text: curr.sec1Text },
        { id: 'independent-platform', title: curr.sec2Title, text: curr.sec2Text, badge: hi ? 'सूचना' : 'Notice', highlight: true },
        { id: 'account-security', title: curr.sec3Title, text: curr.sec3Text },
        { id: 'document-locker', title: curr.sec4Title, text: curr.sec4Text, badge: hi ? '100% निजी' : '100% Private', highlight: true },
        { id: 'intellectual-property', title: curr.sec5Title, text: curr.sec5Text },
        { id: 'passes-coins', title: curr.sec6Title, text: curr.sec6Text },
        { id: 'liability', title: curr.sec7Title, text: curr.sec7Text },
      ]}
      contactTitle={curr.contactTitle}
      contactText={curr.contactText}
      contactEmail="mocktesthubsupport@gmail.com"
      related={[
        { href: '/privacy', label: hi ? 'गोपनीयता नीति' : 'Privacy Policy' },
        { href: '/contact', label: hi ? 'हमसे संपर्क करें' : 'Contact Us' },
      ]}
    />
  );
}
