"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { 
  Mail, 
  Send, 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageSquare, 
  Headphones, 
  Sparkles, 
  HelpCircle, 
  ChevronDown,
  Loader2
} from 'lucide-react';
import { TRANSLATIONS } from '../translations';

interface HomeContactSectionProps {
  onBack: () => void;
}

export default function HomeContactSection({ onBack }: HomeContactSectionProps) {
  const { currentUser, language } = useAuth();
  const t = TRANSLATIONS[language];
  const isHindi = language === 'hi';

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
    }
  ]);

  useEffect(() => {
    if (currentUser) {
      setSenderName(currentUser.name || '');
      setSenderEmail(currentUser.email || '');
    }

    fetch('/api/contact-links')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.links) && data.links.length > 0) {
          setChannels(data.links.filter((l: any) => l.isEnabled !== false));
        }
      })
      .catch(e => console.error('Failed to load dynamic contact links:', e));
  }, [currentUser]);

  const emailChannel = channels.find(c => c.id === 'email');
  const SUPPORT_EMAIL = emailChannel?.handle || 'mocktesthubsupport@gmail.com';

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
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: senderName || 'Anonymous Aspirant',
          email: senderEmail || SUPPORT_EMAIL,
          subject: messageSubject,
          message: messageContent,
          source: 'web_right_pane'
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
      setFormError(err.message || (isHindi ? 'संदेश भेजने में विफल। कृपया पुनः प्रयास करें।' : 'Failed to submit message. Please try again.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const faqs = [
    {
      q: { en: "How do I connect my personal Google Drive to Document Locker?", hi: "मैं अपने व्यक्तिगत Google Drive को दस्तावेज़ लॉकर से कैसे जोड़ूं?" },
      a: { 
        en: "Navigate to Document Locker from the main menu, click 'Connect Google Drive', and sign in with your Google account. We use the secure 'drive.file' scope so our app only manages files created by it, with ZERO access to your personal files.", 
        hi: "मुख्य मेनू से दस्तावेज़ लॉकर पर जाएं, 'Connect Google Drive' पर क्लिक करें और अपने Google खाते से साइन इन करें। हम सुरक्षित 'drive.file' अनुमति का उपयोग करते हैं जिससे आपकी निजी फ़ाइलों तक शून्य पहुंच होती है।" 
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
      q: { en: "How fast does the support team respond to email queries?", hi: "सहायता टीम ईमेल प्रश्नों का कितनी जल्दी उत्तर देती है?" },
      a: { 
        en: "Our candidate support desk monitors mocktesthubsupport@gmail.com 7 days a week. Most inquiries regarding test passes or login assistance are answered within 2 to 4 business hours.", 
        hi: "हमारी सहायता टीम सप्ताह के सातों दिन mocktesthubsupport@gmail.com की निगरानी करती है। अधिकांश प्रश्नों का उत्तर 2 से 4 व्यावसायिक घंटों के भीतर दिया जाता है।" 
      }
    }
  ];

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
              <Headphones className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
              <span>{isHindi ? 'संपर्क करें एवं सहायता केंद्र' : 'Contact Us & Candidate Helpdesk'}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {isHindi ? 'हमारी समर्पित सहायता टीम से किसी भी समय संपर्क करें' : 'Get in touch with the MockTest Hub team'}
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
        
        {/* HERO BANNER CARD */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <span className="px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider border border-white/20 inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {isHindi ? '24x7 उम्मीदवार सहायता' : 'Candidate Assistance Desk'}
            </span>
            <h3 className="text-lg sm:text-2xl font-black tracking-tight">
              {isHindi ? 'हम आपकी परीक्षा तैयारी में मदद के लिए यहाँ हैं' : 'We are here to assist your exam journey'}
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed font-medium">
              {isHindi
                ? 'पास सक्रियण, लॉगिन समस्याएं, टेस्ट सीरीज़ प्रतिक्रिया या तकनीकी सहायता के लिए हमसे संपर्क करें।'
                : 'Reach out for pass activation, login issues, mock test feedback, or general support.'}
            </p>
          </div>
        </div>

        {/* PRIMARY CHANNELS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* EMAIL SUPPORT CARD */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center font-black">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <button
                  onClick={handleCopyEmail}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer transition active:scale-95"
                >
                  {copiedEmail ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedEmail ? (isHindi ? 'कॉपी हुआ' : 'Copied') : (isHindi ? 'कॉपी करें' : 'Copy')}</span>
                </button>
              </div>
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Official Email Support</h4>
              <p className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold break-all">{SUPPORT_EMAIL}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Response time: 2 - 4 business hours</p>
            </div>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Support%20Request`}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition text-center flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>{isHindi ? 'ईमेल भेजें' : 'Send Email'}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* TELEGRAM COMMUNITY CARD */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-black">
                  <Send className="h-4.5 w-4.5" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-black text-[9px] uppercase tracking-wider">
                  Community
                </span>
              </div>
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Telegram Channel</h4>
              <p className="font-mono text-xs text-sky-600 dark:text-sky-400 font-bold">@MockTest_Hub</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Instant exam updates, free PDFs & notes</p>
            </div>
            <a
              href="https://t.me/MockTest_Hub"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 bg-[#229ED9] hover:bg-[#1e8cc1] text-white font-bold text-xs rounded-xl transition text-center flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>{isHindi ? 'टेलीग्राम से जुड़ें' : 'Join Telegram'}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* DIRECT QUERY SUBMISSION FORM */}
        <div className="p-5 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                {isHindi ? 'सीधा संदेश भेजें' : 'Send a Direct Message'}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {isHindi ? 'हमारी टीम आपके ईमेल पर शीघ्र उत्तर देगी' : 'Our support team will respond directly to your email'}
              </p>
            </div>
          </div>

          {formSuccess ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold text-center space-y-1 animate-in fade-in">
              <p className="text-sm font-black">🎉 {isHindi ? 'संदेश सफलतापूर्वक भेजा गया!' : 'Message Sent Successfully!'}</p>
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                {isHindi ? 'हमारी टीम शीघ्र ही आपसे संपर्क करेगी।' : 'We will get back to you shortly via email.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-3">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-xl">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    {isHindi ? 'आपका नाम' : 'Your Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder={isHindi ? 'अपना पूरा नाम लिखें' : 'Enter your full name'}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    {isHindi ? 'ईमेल पता' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder={isHindi ? 'अपना ईमेल दर्ज करें' : 'Enter your email'}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                  {isHindi ? 'संदेश' : 'Message'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder={isHindi ? 'यहाँ अपना संदेश या प्रश्न लिखें...' : 'Write your question or request here...'}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={formSubmitting || !messageContent.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {formSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{isHindi ? 'भेज रहे हैं...' : 'Sending...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{isHindi ? 'संदेश भेजें' : 'Submit Inquiry'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <div className="space-y-3">
          <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>{isHindi ? 'अक्सर पूछे जाने वाले प्रश्न' : 'Frequently Asked Questions'}</span>
          </h4>

          <div className="space-y-2">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 overflow-hidden"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-3.5 text-left font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <span>{isHindi ? faq.q.hi : faq.q.en}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-3.5 pb-3.5 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 leading-relaxed">
                      {isHindi ? faq.a.hi : faq.a.en}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
