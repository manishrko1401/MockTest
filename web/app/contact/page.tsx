"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { Mail, Send, Copy, Check, ExternalLink, ShieldCheck, Clock, ChevronDown } from 'lucide-react';
import { SiteHeader, SiteFooter, PageTitle, SectionCard, Field, btnPrimary, btnSecondary, inputCls, linkCls, pageBg, container } from '../components/SiteUI';
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

  const hi = language === 'hi';

  return (
    <div className={`min-h-screen flex flex-col ${pageBg} font-sans`}>
      <SiteHeader />
      <PageTitle
        crumbs={[{ label: hi ? 'होम' : 'Home', href: '/' }, { label: hi ? 'संपर्क करें' : 'Contact Us' }]}
        title={hi ? 'हमसे संपर्क करें' : 'Contact us'}
        subtitle={hi
          ? 'मॉक टेस्ट, दस्तावेज़ लॉकर, पास सक्रियण या परीक्षा तिथियों से जुड़ी सहायता के लिए हमसे संपर्क करें।'
          : 'Get help with mock tests, Document Locker sync, pass activation or exam dates. We usually reply within 2 to 4 hours.'}
      />

      <main className={`${container} w-full flex-1 py-6 pb-12 space-y-6`}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">

          {/* Message form */}
          <SectionCard
            title={hi ? 'संदेश भेजें' : 'Send us a message'}
            description={hi ? 'कोई प्रश्न या प्रतिक्रिया है? नीचे फ़ॉर्म भरें, हमारी टीम आपसे संपर्क करेगी।' : 'Have a question, feedback or need help with a pass? Our team will get back to you.'}
          >
            {formError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-md border border-red-200 dark:border-red-900/60 border-l-4 border-l-[#b02a37] bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-300" role="alert">
                {formError}
              </div>
            )}

            {formSuccess ? (
              <div className="rounded-md border border-green-200 dark:border-green-900/60 border-l-4 border-l-[#1e7e34] bg-green-50 dark:bg-green-950/30 px-4 py-4 flex items-start gap-3" role="status">
                <Check className="w-5 h-5 text-[#1e7e34] dark:text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900 dark:text-green-200">{hi ? 'संदेश सफलतापूर्वक भेजा गया' : 'Message sent'}</p>
                  <p className="text-sm text-green-800 dark:text-green-300 mt-0.5">{hi ? 'आपका संदेश हमारी सहायता टीम तक पहुंच गया है।' : 'Your message has reached our support team. We will reply by email.'}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={hi ? 'आपका नाम' : 'Your name'}>
                    <input type="text" required value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="e.g. Rahul Sharma" autoComplete="name" className={inputCls} />
                  </Field>
                  <Field label={hi ? 'ईमेल पता' : 'Email address'}>
                    <input type="email" required value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="student@example.com" autoComplete="email" className={inputCls} />
                  </Field>
                </div>
                <Field label={hi ? 'विषय' : 'Topic'}>
                  <select value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} className={`${inputCls} cursor-pointer`}>
                    <option value="general">{hi ? 'सामान्य प्रश्न' : 'General inquiry'}</option>
                    <option value="locker">{hi ? 'दस्तावेज़ लॉकर सहायता' : 'Document Locker & Google Drive'}</option>
                    <option value="tests">{hi ? 'मॉक टेस्ट व प्रश्न रिपोर्ट' : 'Mock tests & question issue'}</option>
                    <option value="pass">{hi ? 'पास व कॉइन्स सहायता' : 'Pass / coins / payment'}</option>
                    <option value="feedback">{hi ? 'सुझाव व नई सुविधा का अनुरोध' : 'Feedback & feature request'}</option>
                  </select>
                </Field>
                <Field label={hi ? 'आपका संदेश' : 'Message'}>
                  <textarea
                    required
                    rows={6}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder={hi ? 'कृपया अपनी समस्या या प्रश्न का विवरण लिखें…' : 'Please describe your question or issue in detail…'}
                    className={`${inputCls} h-auto py-2.5 leading-relaxed resize-y`}
                  />
                </Field>
                <div className="flex justify-end">
                  <button type="submit" disabled={formSubmitting} className={btnPrimary}>
                    <Send className="w-4 h-4" />
                    {formSubmitting ? (hi ? 'भेजा जा रहा है…' : 'Sending…') : (hi ? 'संदेश भेजें' : 'Send message')}
                  </button>
                </div>
              </form>
            )}
          </SectionCard>

          <div className="space-y-6">
            {/* Support email */}
            <SectionCard title={hi ? 'सहायता ईमेल' : 'Support email'}>
              <div className="flex items-start gap-3">
                <span className="h-9 w-9 rounded-md bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <a href={SUPPORT_URL} className={`${linkCls} text-sm font-medium break-all`}>{SUPPORT_EMAIL}</a>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {hi ? 'सोमवार से रविवार • 2-4 घंटे में उत्तर' : 'Mon – Sun • Replies in 2–4 hours'}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={handleCopyEmail} className={btnSecondary}>
                  {copiedEmail ? <Check className="w-4 h-4 text-[#1e7e34]" /> : <Copy className="w-4 h-4" />}
                  {copiedEmail ? (hi ? 'कॉपी हो गया' : 'Copied') : (hi ? 'कॉपी करें' : 'Copy')}
                </button>
                <a href={SUPPORT_URL} className={btnPrimary}>
                  <Send className="w-4 h-4" />
                  {hi ? 'ईमेल भेजें' : 'Email us'}
                </a>
              </div>
            </SectionCard>

            {/* Official channels */}
            <SectionCard
              title={hi ? 'आधिकारिक चैनल' : 'Official channels'}
              description={hi ? `${channels.length} सत्यापित चैनल` : `${channels.length} verified handles`}
              bodyClass="p-0"
            >
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {channels.map((channel) => (
                  <li key={channel.id}>
                    <a href={channel.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <span className={`w-8 h-8 rounded-md ${channel.badgeBg || 'bg-[#1e4e79]'} ${channel.badgeTextColor || 'text-white'} flex items-center justify-center font-semibold text-xs shrink-0`}>
                        {channel.badgeText || channel.id.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300">{channel.name}</span>
                        {channel.handle && <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{channel.handle}</span>}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </SectionCard>

            {/* Safety note */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 bg-white dark:bg-slate-900 px-4 py-3.5 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white block">{hi ? 'केवल आधिकारिक संचार' : 'Official communication only'}</span>
                {hi
                  ? 'हम कभी भी अनधिकृत नंबरों से पासवर्ड या बैंक विवरण नहीं मांगते हैं। केवल आधिकारिक ईमेल और चैनलों पर भरोसा करें।'
                  : 'We never ask for passwords or OTPs over unofficial calls or SMS. Always verify our official handles above.'}
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <SectionCard title={hi ? 'अक्सर पूछे जाने वाले प्रश्न' : 'Frequently asked questions'} bodyClass="p-0">
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx}>
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full px-5 sm:px-6 py-4 text-left flex items-center justify-between gap-3 text-sm font-medium text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <span>{hi ? faq.q.hi : faq.q.en}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-4 -mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {hi ? faq.a.hi : faq.a.en}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          {hi ? 'संबंधित पृष्ठ:' : 'Related:'}{' '}
          <Link href="/terms" className={linkCls}>{hi ? 'नियम एवं शर्तें' : 'Terms & Conditions'}</Link>
          <span className="mx-1.5 text-slate-300 dark:text-slate-600">|</span>
          <Link href="/privacy" className={linkCls}>{hi ? 'गोपनीयता नीति' : 'Privacy Policy'}</Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
