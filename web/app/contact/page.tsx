"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { 
  Mail, 
  Send, 
  Award, 
  ArrowLeft, 
  Sun, 
  Moon, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageSquare, 
  Headphones, 
  Sparkles, 
  HelpCircle, 
  ShieldCheck, 
  Clock, 
  Globe, 
  Share2 
} from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { useIsMobile } from '../useIsMobile';

interface SocialChannel {
  id: string;
  name: string;
  badgeText: string;
  badgeBg: string;
  badgeTextColor: string;
  iconType: string;
  handle: string;
  url: string;
  description: { en: string; hi: string };
  category: 'primary' | 'social' | 'community';
}

export default function ContactUsPage() {
  const { currentUser, theme, toggleTheme, language, setLanguage } = useAuth();
  const t = TRANSLATIONS[language];
  const { isMobile, isMounted } = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Direct message form state
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [messageSubject, setMessageSubject] = useState('general');
  const [messageContent, setMessageContent] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [channels, setChannels] = useState<any[]>([
    {
      id: 'email',
      name: 'Gmail / Support',
      badgeText: 'M',
      badgeBg: 'bg-[#EA4335]',
      badgeTextColor: 'text-white',
      iconType: 'mail',
      handle: 'mocktesthubsupport@gmail.com',
      url: 'mailto:mocktesthubsupport@gmail.com?subject=MockTest%20Hub%20Support%20Inquiry',
      descriptionEn: 'Official support for password resets, pass activation & grievances',
      descriptionHi: 'पासवर्ड रीसेट, पास सक्रियण और शिकायतों के लिए आधिकारिक समर्थन',
      category: 'primary',
      isEnabled: true
    },
    {
      id: 'telegram',
      name: 'Telegram',
      badgeText: 'TG',
      badgeBg: 'bg-[#229ED9]',
      badgeTextColor: 'text-white',
      iconType: 'send',
      handle: '@MockTest_Hub',
      url: 'https://t.me/MockTest_Hub',
      descriptionEn: 'Instant exam alerts, free PDF notes, daily quizzes & student community',
      descriptionHi: 'त्वरित परीक्षा अलर्ट, मुफ्त पीडीएफ नोट्स और दैनिक क्विज़',
      category: 'primary',
      isEnabled: true
    },
    {
      id: 'youtube',
      name: 'YouTube',
      badgeText: 'YT',
      badgeBg: 'bg-[#FF0000]',
      badgeTextColor: 'text-white',
      iconType: 'youtube',
      handle: '@MockTestHub',
      url: 'https://youtube.com/@MockTestHub',
      descriptionEn: 'Exam strategy sessions, syllabus deep-dives & question walkthroughs',
      descriptionHi: 'परीक्षा रणनीति सत्र, पाठ्यक्रम विश्लेषण और हल किए गए पेपर',
      category: 'primary',
      isEnabled: true
    },
    {
      id: 'instagram',
      name: 'Instagram',
      badgeText: 'IG',
      badgeBg: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
      badgeTextColor: 'text-white',
      iconType: 'instagram',
      handle: '@mocktesthub',
      url: 'https://instagram.com/mocktesthub',
      descriptionEn: 'Daily GK snippets, motivational quotes & upcoming notification reels',
      descriptionHi: 'दैनिक सामान्य ज्ञान, प्रेरक विचार और आगामी भर्ती रील्स',
      category: 'social',
      isEnabled: true
    },
    {
      id: 'x',
      name: 'X / Twitter',
      badgeText: 'X',
      badgeBg: 'bg-black text-white dark:bg-white dark:text-black',
      badgeTextColor: '',
      iconType: 'x',
      handle: '@MockTestHub',
      url: 'https://x.com/MockTestHub',
      descriptionEn: 'Breaking recruitment news, official SSC/UPSC circulars & updates',
      descriptionHi: 'ताजा भर्ती समाचार, आधिकारिक एसएससी/यूपीएससी परिपत्र और अपडेट',
      category: 'social',
      isEnabled: true
    },
    {
      id: 'reddit',
      name: 'Reddit',
      badgeText: 'R',
      badgeBg: 'bg-[#FF4500]',
      badgeTextColor: 'text-white',
      iconType: 'reddit',
      handle: 'r/MockTestHub',
      url: 'https://reddit.com/r/MockTestHub',
      descriptionEn: 'Aspirant discussions, AMA sessions & competitive prep tips',
      descriptionHi: 'उम्मीदवार चर्चा, प्रश्नोत्तर सत्र और परीक्षा तैयारी युक्तियाँ',
      category: 'community',
      isEnabled: true
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Community',
      badgeText: 'WA',
      badgeBg: 'bg-[#25D366]',
      badgeTextColor: 'text-white',
      iconType: 'whatsapp',
      handle: 'MockTest Hub Alerts',
      url: 'https://whatsapp.com/channel/MockTestHub',
      descriptionEn: 'Direct broadcast channel for urgent admit card & result notifications',
      descriptionHi: 'प्रवेश पत्र और परिणाम अधिसूचनाओं के लिए सीधा प्रसारण चैनल',
      category: 'community',
      isEnabled: true
    }
  ]);

  useEffect(() => {
    setMounted(true);
    if (currentUser) {
      setSenderName(currentUser.name || '');
      setSenderEmail(currentUser.email || '');
    }

    // Fetch dynamic contact links from admin settings
    fetch('/api/contact-links')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.links) && data.links.length > 0) {
          setChannels(data.links.filter((l: any) => l.isEnabled !== false));
        }
      })
      .catch(e => console.error('Failed to load dynamic contact links:', e));
  }, [currentUser]);

  if (!mounted) return null;

  const emailChannel = channels.find(c => c.id === 'email');
  const SUPPORT_EMAIL = emailChannel?.handle || 'mocktesthubsupport@gmail.com';
  const SUPPORT_URL = emailChannel?.url || `mailto:${SUPPORT_EMAIL}?subject=MockTest%20Hub%20Support%20Inquiry`;

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;

    setFormSubmitting(true);
    setFormError('');

    try {
      // Send message to dedicated inquiries endpoint
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: senderName || 'Anonymous Aspirant',
          email: senderEmail || SUPPORT_EMAIL,
          subject: messageSubject,
          message: messageContent,
          source: isMobile ? 'mobile_web' : 'web'
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit message');
      }

      setFormSuccess(true);
      setMessageContent('');
      setTimeout(() => setFormSuccess(false), 6000);
    } catch (err: any) {
      console.error('Inquiry submission error:', err);
      setFormError(err.message || (language === 'hi' ? 'संदेश भेजने में विफल। कृपया पुनः प्रयास करें।' : 'Failed to submit message. Please try again.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const faqs = [
    {
      q: { en: "How do I connect my personal Google Drive to Document Locker?", hi: "मैं अपने व्यक्तिगत Google Drive को दस्तावेज़ लॉकर से कैसे जोड़ूं?" },
      a: { 
        en: "Navigate to Document Locker from the main menu, click 'Connect Google Drive', and sign in with your Google account. We use the secure 'drive.file' scope so our app only creates and manages a dedicated 'MockTest Hub Locker' folder in your Drive with ZERO access to your other files.", 
        hi: "मुख्य मेनू से दस्तावेज़ लॉकर पर जाएं, 'Connect Google Drive' पर क्लिक करें और अपने Google खाते से साइन इन करें। हम सुरक्षित 'drive.file' अनुमति का उपयोग करते हैं जिससे हमारा ऐप केवल आपके ड्राइव में 'MockTest Hub Locker' फ़ोल्डर बनाता है और आपकी अन्य फ़ाइलों तक हमारी शून्य पहुंच होती है।" 
      }
    },
    {
      q: { en: "What should I do if I forget my account password?", hi: "यदि मैं अपना खाता पासवर्ड भूल जाऊं तो मुझे क्या करना चाहिए?" },
      a: { 
        en: "Click 'Sign In', select 'Forgot Password', and enter your registered email. We will send a secure 6-digit OTP code to your Gmail to instantly reset your password.", 
        hi: "'साइन इन' पर क्लिक करें, 'पासवर्ड भूल गए?' चुनें और अपना पंजीकृत ईमेल दर्ज करें। हम आपका पासवर्ड तुरंत रीसेट करने के लिए आपके जीमेल पर एक सुरक्षित 6-अंकीय ओटीपी कोड भेजेंगे।" 
      }
    },
    {
      q: { en: "How can I earn Coins to unlock test series for free?", hi: "मुफ्त में टेस्ट सीरीज़ अनलॉक करने के लिए मैं कॉइन्स कैसे कमा सकता हूँ?" },
      a: { 
        en: "Go to your Profile or Referrals page, copy your unique referral link, and share it with your friends. When they register on MockTest Hub, both of you earn instant Coins that can be used to unlock premium mock tests!", 
        hi: "अपनी प्रोफ़ाइल या रेफरल पृष्ठ पर जाएं, अपना अनूठा रेफरल लिंक कॉपी करें और इसे अपने दोस्तों के साथ साझा करें। जब वे पंजीकरण करते हैं, तो आप दोनों को तत्काल कॉइन्स मिलते हैं!" 
      }
    },
    {
      q: { en: "How fast does the support team respond to email queries?", hi: "सहायता टीम ईमेल प्रश्नों का कितनी जल्दी उत्तर देती है?" },
      a: { 
        en: "Our candidate support desk monitors mocktesthubsupport@gmail.com 7 days a week. Most inquiries regarding test passes, login issues, or technical assistance are answered within 2 to 4 business hours.", 
        hi: "हमारी सहायता टीम सप्ताह के सातों दिन mocktesthubsupport@gmail.com की निगरानी करती है। अधिकांश प्रश्नों का उत्तर 2 से 4 व्यावसायिक घंटों के भीतर दिया जाता है।" 
      }
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 font-sans min-h-screen text-slate-800 dark:text-slate-100 select-none transition-colors duration-200">
      
      {/* HEADER NAVBAR */}
      <header className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-sm sticky top-0 z-40 transition-colors duration-200">
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
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 transition border border-slate-200 dark:border-slate-800 flex items-center justify-center cursor-pointer"
            title="Toggle Dark/Light Mode"
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

      {/* MAIN CONTAINER */}
      <main className="py-10 px-4 sm:px-6 md:px-8 max-w-5xl w-full mx-auto flex-1 flex flex-col relative z-10">
        
        {/* HERO SECTION */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold mb-3">
            <Headphones className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'उम्मीदवार सहायता केंद्र' : 'Aspirant Support & Community Hub'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
            {language === 'hi' ? 'हमसे संपर्क करें और जुड़ें' : 'Get in Touch & Connect with Us'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {language === 'hi' 
              ? 'मॉक टेस्ट, दस्तावेज़ लॉकर, परीक्षा तिथियों या किसी भी समस्या के समाधान के लिए हमारे आधिकारिक चैनलों पर संपर्क करें।' 
              : 'Need help with mock tests, document locker sync, pass activation, or exam dates? Connect with us directly across all official channels.'}
          </p>
        </div>

        {/* PRIMARY EMAIL HERO BANNER */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-600/15 mb-10 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <Mail className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  {language === 'hi' ? 'आधिकारिक सहायता ईमेल' : 'Official Support Email'}
                </span>
                <h3 className="text-lg sm:text-2xl font-black tracking-tight">{SUPPORT_EMAIL}</h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  {language === 'hi' ? 'सोमवार से रविवार • त्वरित प्रतिक्रिया' : 'Mon - Sun • 2-4 Hours Average Response Time'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-center">
              <button
                onClick={handleCopyEmail}
                className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold transition flex items-center gap-2 backdrop-blur-sm cursor-pointer"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>{language === 'hi' ? 'कॉपी हो गया!' : 'Email Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{language === 'hi' ? 'ईमेल कॉपी करें' : 'Copy Email'}</span>
                  </>
                )}
              </button>

              <a
                href={SUPPORT_URL}
                className="px-5 py-2.5 rounded-xl bg-white text-blue-600 hover:bg-blue-50 text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{language === 'hi' ? 'ईमेल भेजें' : 'Send Email'}</span>
              </a>
            </div>
          </div>
        </div>

        {/* SOCIAL CHANNELS PILLS GRID (Styled Exactly as Requested) */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {language === 'hi' ? 'आधिकारिक सोशल मीडिया चैनल' : 'Official Social & Community Channels'}
            </h3>
            <span className="text-[11px] text-slate-400 font-bold">
              {channels.length} {language === 'hi' ? 'चैनल उपलब्ध' : 'Verified Handles'}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {channels.map((channel) => {
              return (
                <a
                  key={channel.id}
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 pl-1.5 pr-4 py-1.5 rounded-full shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  {/* Left Circular Badge */}
                  <div className={`w-8 h-8 rounded-full ${channel.badgeBg || 'bg-blue-600'} ${channel.badgeTextColor || 'text-white'} flex items-center justify-center font-black text-xs shrink-0 shadow-xs`}>
                    {channel.badgeText || channel.id.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Channel Name */}
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {channel.name}
                  </span>

                  {/* External Link Icon */}
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition ml-0.5" />
                </a>
              );
            })}
          </div>
        </div>

        {/* TWO-COLUMN SECTION: DIRECT MESSAGE & FAQS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          
          {/* Column 1: Direct Support Message Form */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                {language === 'hi' ? 'त्वरित संदेश भेजें' : 'Send a Quick Message'}
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              {language === 'hi' 
                ? 'कोई प्रश्न या प्रतिक्रिया है? नीचे फ़ॉर्म भरें और हमारी टीम आपसे संपर्क करेगी।' 
                : 'Have a question, feedback, or need pass assistance? Drop us a note below.'}
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-bold text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            {formSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                  {language === 'hi' ? 'संदेश सफलतापूर्वक भेजा गया!' : 'Message Sent Successfully!'}
                </h5>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {language === 'hi' ? 'आपका संदेश एडमिन पैनल इनक्वायरी सेक्शन में दर्ज कर दिया गया है।' : 'Your message has been sent directly to the Admin Inquiries desk.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    {language === 'hi' ? 'आपका नाम' : 'Your Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    {language === 'hi' ? 'ईमेल पता' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    {language === 'hi' ? 'विषय' : 'Topic / Inquiry'}
                  </label>
                  <select
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="general">{language === 'hi' ? 'सामान्य प्रश्न' : 'General Inquiry'}</option>
                    <option value="locker">{language === 'hi' ? 'दस्तावेज़ लॉकर सहायता' : 'Document Locker & Google Drive'}</option>
                    <option value="tests">{language === 'hi' ? 'मॉक टेस्ट व प्रश्न रिपोर्ट' : 'Mock Tests & Question Issue'}</option>
                    <option value="pass">{language === 'hi' ? 'पास व कॉइन्स सहायता' : 'Pass / Coins / Payment'}</option>
                    <option value="feedback">{language === 'hi' ? 'सुझाव व नई सुविधा का अनुरोध' : 'Feedback & Feature Request'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    {language === 'hi' ? 'आपका संदेश' : 'Message Details'}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder={language === 'hi' ? 'कृपया अपनी समस्या या प्रश्न का विवरण लिखें...' : 'Please describe your query or question in detail...'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{formSubmitting ? (language === 'hi' ? 'भेजा जा रहा है...' : 'Sending...') : (language === 'hi' ? 'संदेश सबमिट करें' : 'Submit Inquiry')}</span>
                </button>
              </form>
            )}
          </div>

          {/* Column 2: Frequently Asked Questions Accordion */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                {language === 'hi' ? 'अक्सर पूछे जाने वाले प्रश्न' : 'Frequently Asked Questions'}
              </h4>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition"
                    >
                      <span>{language === 'hi' ? faq.q.hi : faq.q.en}</span>
                      <span className={`text-base text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
                        +
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                        {language === 'hi' ? faq.a.hi : faq.a.en}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Guarantees Box */}
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-extrabold text-slate-900 dark:text-white block mb-0.5">
                  {language === 'hi' ? 'सुरक्षित एवं सत्यापित संचार' : 'Official Verified Communication'}
                </span>
                {language === 'hi' 
                  ? 'हम कभी भी अनधिकृत नंबरों से पासवर्ड या बैंक विवरण नहीं मांगते हैं। केवल आधिकारिक ईमेल और चैनलों पर भरोसा करें।' 
                  : 'We never ask for passwords or OTPs over unofficial calls or SMS. Always verify our official handles above.'}
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM POLICY NAV LINKS */}
        <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
          <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
            Terms & Conditions
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
            Privacy Policy
          </Link>
        </div>

      </main>

      {/* SITE FOOTER */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
        © 2026 MockTest Hub. All rights reserved.
      </footer>

    </div>
  );
}
