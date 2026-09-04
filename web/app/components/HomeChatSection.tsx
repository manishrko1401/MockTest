"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import {
  ShieldCheck,
  ArrowLeft,
  Send,
  Loader2,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Clock,
  User,
  CheckCircle2,
  CheckCheck,
  Lock,
  ExternalLink
} from 'lucide-react';

interface HomeChatSectionProps {
  onBack: () => void;
}

export default function HomeChatSection({ onBack }: HomeChatSectionProps) {
  const { currentUser, language } = useAuth();
  const isHindi = language === 'hi';

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (markAsRead = false) => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-support-messages',
          data: { userId: currentUser.id, markAsRead, readerRole: 'STUDENT' }
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error('Error fetching chat messages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchMessages(true);
      // EGRESS-OPT: 8s is still responsive for a support chat and cuts request volume ~55% vs the previous 3.5s poll.
      const interval = setInterval(() => fetchMessages(true), 8000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputText).trim();
    if (!textToSend || !currentUser?.id || sending) return;

    setInputText('');
    setSending(true);

    const tempMsg = {
      id: 'temp_' + Date.now(),
      sender: 'STUDENT',
      message: textToSend,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-support-message',
          data: {
            userId: currentUser.id,
            userName: currentUser.name || 'Candidate',
            userEmail: currentUser.email || '',
            sender: 'STUDENT',
            message: textToSend
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchMessages(true);
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    {
      title: isHindi ? '👑 पास प्रो सक्रियण' : '👑 Pass Pro Help',
      desc: isHindi ? 'पास प्रो सब्सक्रिप्शन संबंधित जानकारी' : 'Inquire about Pass Pro subscription activation'
    },
    {
      title: isHindi ? '📝 टेस्ट पेपर में त्रुटि' : '📝 Question Discrepancy',
      desc: isHindi ? 'किसी प्रश्न या उत्तर समाधान में विसंगति रिपोर्ट करें' : 'Report discrepancy or wrong solution in test'
    },
    {
      title: isHindi ? '⚡ टेस्ट सीरीज अनुरोध' : '⚡ Request New Exam',
      desc: isHindi ? 'आगामी परीक्षा के लिए नए मॉक टेस्ट उपलब्ध कराएं' : 'Request mock tests for upcoming notification'
    },
    {
      title: isHindi ? '🔑 खाता व पासवर्ड' : '🔑 Account / Login',
      desc: isHindi ? 'लॉगिन समस्या या पासवर्ड सहायता' : 'Assistance regarding candidate login or email'
    }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-200">
      
      {/* 1. TOP CHAT HEADER BAR */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer shrink-0 shadow-2xs"
            title={isHindi ? 'मुख्य पृष्ठ पर वापस जाएं' : 'Back to Home'}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="relative shrink-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse"></span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                {isHindi ? 'मॉक टेस्ट हब सहायता टीम' : 'MockTest Hub Live Support'}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ● Live 24x7
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {isHindi ? 'तकनीकी सहायता प्रतिनिधि आपके संदेश का उत्तर देने के लिए तैयार हैं' : 'Support desk is online to assist with test papers, passes & issues'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://t.me/MockTest_Hub"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] border border-[#229ED9]/30 text-xs font-bold transition"
          >
            <span>Telegram</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* 2. CHAT CONTENT AREA */}
      {!currentUser ? (
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shadow-inner">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {isHindi ? 'लाइव चैट के लिए लॉगिन आवश्यक है' : 'Login Required to Access Live Chat'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isHindi
                ? 'कृपया अपने अभ्यर्थी खाते में लॉगिन करें ताकि सहायता प्रतिनिधि आपके खाते का विवरण देख सकें और तुरंत सहायता कर सकें।'
                : 'Please sign in to your candidate account so our desk can verify your test papers, pass status, and chat in real-time.'}
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2 w-full">
            <Link
              href="/auth"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs text-center shadow-md transition"
            >
              {isHindi ? 'लॉग इन करें' : 'Log In'}
            </Link>
            <button
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
            >
              {isHindi ? 'मुख्य पृष्ठ' : 'Home'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* Scrollable messages container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40 dark:bg-slate-950/30">
            {/* Welcome banner inside chat */}
            <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200/50 dark:border-blue-900/40 rounded-2xl p-4 text-center max-w-xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-700 dark:text-blue-300">
                <Sparkles className="h-4 w-4" />
                <span>{isHindi ? 'मॉक टेस्ट हब लाइव सहायता डेस्क' : 'MockTest Hub Candidate Care'}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isHindi
                  ? 'नमस्ते! किसी भी परीक्षा, टेस्ट परिणाम, पास सक्रियण या तकनीकी सहायता के लिए यहाँ संदेश भेजें।'
                  : 'Hello! Type your message below to directly consult with our technical and academic desk.'}
              </p>
            </div>

            {/* Quick Prompts Pill Row (If no messages yet) */}
            {messages.length === 0 && (
              <div className="max-w-2xl mx-auto space-y-2.5 pt-2">
                <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">
                  {isHindi ? 'त्वरित सहायता विकल्प चुनें' : 'Choose a quick support topic:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(undefined, `${p.title}: ${p.desc}`)}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 text-left transition-all duration-200 shadow-2xs hover:shadow-xs group cursor-pointer"
                    >
                      <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {p.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {p.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Message Bubbles */}
            {messages.map((msg, idx) => {
              const isMe = msg.sender !== 'ADMIN';
              return (
                <div
                  key={msg.id || idx}
                  className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Sender Avatar */}
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 shadow-2xs ${
                      isMe
                        ? 'bg-blue-600 text-white'
                        : 'bg-indigo-600 text-white'
                    }`}>
                      {isMe ? (currentUser.name ? currentUser.name[0].toUpperCase() : 'U') : 'M'}
                    </div>

                    {/* Message Bubble + Header */}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0`}>
                      <div className={`flex items-center gap-1.5 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {isMe ? (currentUser.name || 'You') : 'MockTest Support Team'}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed font-medium shadow-2xs ${
                          isMe
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        
                        {/* Message Timestamp & Seen/Delivered Status */}
                        <div className={`flex items-center gap-1.5 mt-1.5 text-[9px] ${
                          isMe ? 'justify-end text-blue-100' : 'justify-start text-slate-400'
                        }`}>
                          <span>
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>

                          {isMe && (
                            <span
                              className={`inline-flex items-center gap-0.5 ml-1 font-bold ${
                                msg.isRead ? 'text-sky-300' : 'text-blue-200/60'
                              }`}
                              title={msg.isRead ? (isHindi ? 'मॉक टेस्ट टीम द्वारा देखा गया' : 'Seen by Support Team') : (isHindi ? 'डिलीवर हुआ' : 'Delivered to Team')}
                            >
                              <CheckCheck className={`h-3.5 w-3.5 ${msg.isRead ? 'text-sky-300 stroke-[2.5]' : 'text-blue-200/60 stroke-[1.8]'}`} />
                              <span className="text-[8px] uppercase tracking-wider">
                                {msg.isRead ? (isHindi ? 'देखा गया' : 'Seen') : (isHindi ? 'डिलीवर' : 'Delivered')}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* 3. INPUT FORM BAR */}
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
            <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2 max-w-4xl mx-auto">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isHindi ? 'यहाँ अपना प्रश्न या संदेश टाइप करें...' : 'Type your inquiry or message here...'}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{isHindi ? 'भेजें' : 'Send'}</span>
                    <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
