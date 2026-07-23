"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { ShieldCheck, X, MessageSquare, Send, Lightbulb, HelpCircle, Loader2 } from 'lucide-react';

interface HomeSupportWidgetProps {
  variant?: 'normal' | 'expandable';
}

export default function HomeSupportWidget({ variant = 'normal' }: HomeSupportWidgetProps) {
  const { currentUser, language } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggestion Box states
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [suggName, setSuggName] = useState(currentUser?.name || '');
  const [suggEmail, setSuggEmail] = useState(currentUser?.email || '');
  const [suggCategory, setSuggCategory] = useState('General');
  const [suggMessage, setSuggMessage] = useState('');
  const [suggSubmitting, setSuggSubmitting] = useState(false);
  const [suggSuccess, setSuggSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setSuggName(currentUser.name);
      if (currentUser.email) setSuggEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggMessage.trim() || !currentUser || suggSubmitting) return;

    setSuggSubmitting(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-suggestion',
          data: {
            userId: currentUser.id,
            name: currentUser.name || 'Registered Candidate',
            email: currentUser.email || '',
            category: suggCategory,
            message: suggMessage,
            source: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'mobile_web' : 'web',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuggSuccess(true);
        setSuggMessage('');
        setTimeout(() => {
          setSuggSuccess(false);
          setSuggestionModalOpen(false);
        }, 2200);
      } else {
        alert(data.error || 'Failed to submit suggestion');
      }
    } catch (err) {
      console.error('Suggestion submit error:', err);
      alert('Error submitting suggestion');
    } finally {
      setSuggSubmitting(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (markAsRead = false) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-support-messages',
          data: { userId: currentUser.id, markAsRead }
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
        if (!chatOpen) {
          const unread = data.messages.filter((m: any) => m.sender === 'ADMIN' && !m.isRead).length;
          setUnreadCount(unread);
        } else {
          setUnreadCount(0);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchMessages();
      const interval = setInterval(() => fetchMessages(false), 8000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (chatOpen) {
      scrollToBottom();
      setUnreadCount(0);
      if (currentUser?.id) {
        fetchMessages(true);
      }
    }
  }, [chatOpen, messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !currentUser?.id || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    const tempMsg = {
      id: 'temp-' + Date.now(),
      userId: currentUser.id,
      sender: 'STUDENT',
      message: text,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-support-message',
          data: {
            userId: currentUser.id,
            sender: 'STUDENT',
            message: text
          }
        })
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.message : m));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // Only show support chat & suggestion floating buttons if user is logged in
  if (!currentUser) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[999] font-sans select-none flex flex-col items-end gap-3">
      {/* SUGGESTION BOX MODAL DIALOG */}
      {suggestionModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-left">
            <button
              onClick={() => setSuggestionModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {suggSuccess ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-slate-850 dark:text-white">
                  {language === 'hi' ? 'धन्यवाद! सुझाव भेजा गया' : 'Thank You! Suggestion Sent'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  {language === 'hi'
                    ? 'आपका मूल्यवान सुझाव मॉकटेस्ट हब टीम को सफलतापूर्वक भेज दिया गया है।'
                    : 'Your valuable suggestion has been successfully submitted to the MockTest Hub Team.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSuggestionSubmit} className="space-y-4">
                <div className="flex items-center gap-3.5 mb-2">
                  <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                    <Lightbulb className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-850 dark:text-white">
                      {language === 'hi' ? 'सुझाव पेटिका' : 'Suggestion Box'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {language === 'hi' ? 'मॉकटेस्ट हब टीम को प्रतिक्रिया भेजें' : 'Share feedback with MockTest Hub Team'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {language === 'hi' ? 'श्रेणी चुनें' : 'Choose Category'}
                  </label>
                  <select
                    value={suggCategory}
                    onChange={(e) => setSuggCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-white rounded-xl px-4.5 py-3 text-xs font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500"
                  >
                    <option value="General">General Suggestion / सामान्य सुझाव</option>
                    <option value="New Exam Request">New Exam Request / नई परीक्षा का अनुरोध</option>
                    <option value="Feature Request">Feature Request / नई सुविधा का अनुरोध</option>
                    <option value="UI/UX Improvement">UI/UX Improvement / वेबसाइट डिज़ाइन सुधार</option>
                    <option value="Bug Report">Bug Report / त्रुटि रिपोर्ट</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {language === 'hi' ? 'आपका सुझाव' : 'Your Suggestion'}
                  </label>
                  <textarea
                    rows={4}
                    value={suggMessage}
                    onChange={(e) => setSuggMessage(e.target.value)}
                    placeholder={language === 'hi' ? 'यहाँ अपना सुझाव या अनुरोध विस्तार से लिखें...' : 'Write your suggestion or feedback in detail...'}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-white rounded-2xl px-4.5 py-3 text-xs font-medium border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500 resize-none placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSuggestionModalOpen(false)}
                    className="px-4.5 py-2.5 rounded-xl border border-slate-250 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 font-extrabold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!suggMessage.trim() || suggSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{suggSubmitting ? 'Submitting...' : 'Submit Suggestion'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CHAT OVERLAY WINDOW */}
      {chatOpen && (
        <div className="fixed bottom-24 right-3 left-3 sm:left-auto sm:right-6 w-[calc(100vw-1.5rem)] sm:w-[380px] h-[480px] max-h-[75vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 z-[9999] text-left">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-black border border-white/30 text-white shadow-inner">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-blue-600"></span>
              </div>
              <div>
                <h4 className="text-sm font-extrabold tracking-wide uppercase">
                  {language === 'hi' ? 'तकनीकी सहायता टीम' : 'Live Chat Support'}
                </h4>
                <p className="text-[10px] text-blue-100 font-medium">
                  {language === 'hi' ? 'सहायता प्रतिनिधि ऑनलाइन हैं' : 'Live Chat Representative is online'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <p className="text-3xl animate-bounce">👋</p>
                <h5 className="text-xs font-bold text-slate-800 dark:text-white">
                  {language === 'hi' ? 'तकनीकी सहायता टीम से बात करें' : 'Chat with Technical Support'}
                </h5>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
                  {language === 'hi' ? 'तकनीकी टीम से सवाल पूछें या सहायता प्राप्त करें।' : 'Send your question below to chat directly with our technical team.'}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender === 'STUDENT';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3.5 rounded-2xl text-xs font-medium shadow-xs leading-relaxed ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-880 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                      }`}
                    >
                      {!isUser && (
                        <p className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                          Technical Support
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <p
                        className={`text-[9px] mt-1 text-right font-mono ${
                          isUser ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <input
              type="text"
              placeholder={language === 'hi' ? 'यहाँ संदेश लिखें...' : 'Type message here...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none border border-transparent focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-2xl transition cursor-pointer shrink-0 shadow-md active:scale-95 flex items-center justify-center"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}

      {/* FLOAT VARIANT WRAPPERS */}
      {variant === 'normal' ? (
        <div className="flex flex-col items-end gap-3">
          {/* FLOATING BUTTON 1: SUGGESTION BOX (JUST ABOVE CHAT) */}
          <button
            onClick={() => {
              setChatOpen(false);
              setSuggestionModalOpen(true);
            }}
            className="relative group flex items-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
          >
            <div className="relative flex items-center justify-center">
              <Lightbulb className="h-4.5 w-4.5 text-amber-100 animate-pulse" />
            </div>
            <span className="font-extrabold text-[10px] tracking-wider uppercase hidden sm:inline-block">
              {language === 'hi' ? 'सुझाव पेटिका' : 'Suggestion Box'}
            </span>
          </button>

          {/* FLOATING BUTTON 2: MOCKTEST HUB TEAM SUPPORT CHAT */}
          <button
            onClick={() => {
              setSuggestionModalOpen(false);
              setChatOpen(prev => !prev);
            }}
            className="relative group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
          >
            <div className="relative flex items-center justify-center">
              <MessageSquare className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-bounce">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="font-extrabold text-[10px] tracking-wider uppercase hidden sm:inline-block">
              {language === 'hi' ? 'मॉकटेस्ट हब टीम' : 'MockTest Hub Team'}
            </span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-3.5">
          {/* FLOATING BUTTON 1: SUGGESTION BOX (COMPACT HOVER EXPANDABLE) */}
          <button
            onClick={() => {
              setChatOpen(false);
              setSuggestionModalOpen(true);
            }}
            className="group flex items-center bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white h-12 w-12 hover:w-44 rounded-full shadow-xl transition-all duration-300 cursor-pointer border border-white/20 px-3.5 overflow-hidden gap-3"
          >
            <Lightbulb className="h-5 w-5 shrink-0 text-amber-100 animate-pulse" />
            <span className="font-extrabold text-[10px] tracking-wider uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {language === 'hi' ? 'सुझाव पेटिका' : 'Suggestion Box'}
            </span>
          </button>

          {/* FLOATING BUTTON 2: MOCKTEST HUB TEAM SUPPORT CHAT (COMPACT HOVER EXPANDABLE) */}
          <button
            onClick={() => {
              setSuggestionModalOpen(false);
              setChatOpen(prev => !prev);
            }}
            className="group flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 w-12 hover:w-48 rounded-full shadow-xl transition-all duration-300 cursor-pointer border border-white/20 px-3.5 overflow-hidden gap-3"
          >
            <div className="relative flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-bounce">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="font-extrabold text-[10px] tracking-wider uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {language === 'hi' ? 'मॉकटेस्ट हब टीम' : 'MockTest Hub Team'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// Re-export CheckCircle
function CheckCircle({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
