"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import {
  Lightbulb,
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle,
  Sparkles,
  Lock,
  ChevronDown,
  User,
  Mail,
  ShieldCheck
} from 'lucide-react';

interface HomeSuggestionSectionProps {
  onBack: () => void;
}

export default function HomeSuggestionSection({ onBack }: HomeSuggestionSectionProps) {
  const { currentUser, language } = useAuth();
  const isHindi = language === 'hi';

  const [category, setCategory] = useState('General');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const categories = [
    {
      id: 'General',
      label: isHindi ? '💡 सामान्य सुझाव (General Suggestion)' : '💡 General Suggestion',
    },
    {
      id: 'New Exam Request',
      label: isHindi ? '📚 नई परीक्षा का अनुरोध (New Exam Request)' : '📚 New Exam Request',
    },
    {
      id: 'Feature Request',
      label: isHindi ? '⚡ नई सुविधा का अनुरोध (Feature Request)' : '⚡ Feature Request',
    },
    {
      id: 'UI/UX Improvement',
      label: isHindi ? '🎨 डिज़ाइन व लेआउट सुधार (UI/UX Improvement)' : '🎨 UI/UX Improvement',
    },
    {
      id: 'Bug Report',
      label: isHindi ? '🐛 त्रुटि / प्रश्न समाधान रिपोर्ट (Bug Report)' : '🐛 Bug Report',
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || submitting || !currentUser) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-suggestion',
          data: {
            userId: currentUser.id,
            name: currentUser.name || 'Candidate',
            email: currentUser.email || '',
            category,
            message,
            source: 'web_full_section',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmittedSuccess(true);
        setMessage('');
      } else {
        alert(data.error || 'Failed to submit suggestion');
      }
    } catch (err) {
      console.error('Suggestion submit error:', err);
      alert('Error submitting suggestion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-200">
      
      {/* 1. TOP HEADER BAR */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-amber-50/80 via-white to-orange-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer shrink-0 shadow-2xs"
            title={isHindi ? 'मुख्य पृष्ठ पर वापस जाएं' : 'Back to Home'}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>

          <div className="min-w-0">
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
              {isHindi ? 'सुझाव पेटिका एवं फीचर अनुरोध' : 'Candidate Suggestion Box & Feedback'}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {isHindi ? 'मॉक टेस्ट हब को बेहतर बनाने के लिए अपने विचार सीधे एडमिन को भेजें' : 'Share your suggestions and test requests directly with our team'}
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
        >
          <span>{isHindi ? 'मुख्य पृष्ठ' : 'Back to Home'}</span>
        </button>
      </div>

      {/* 2. AUTH CHECK: ONLY LOGGED-IN USERS CAN ACCESS */}
      {!currentUser ? (
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40 shadow-inner">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {isHindi ? 'सुझाव भेजने के लिए लॉगिन आवश्यक है' : 'Login Required to Access Suggestion Box'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isHindi
                ? 'कृपया अपने अभ्यर्थी खाते में लॉगिन करें ताकि हम आपके सुझाव को आपके प्रोफाइल के साथ सुरक्षित रूप से जोड़ सकें और उस पर कार्यवाही कर सकें।'
                : 'Please sign in to your candidate account so our product team can link and track your valuable feedback.'}
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2 w-full">
            <Link
              href="/auth"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs text-center shadow-md transition"
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 bg-slate-50/40 dark:bg-slate-950/30">
          
          {submittedSuccess ? (
            <div className="max-w-xl mx-auto py-12 px-6 bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/80 rounded-3xl text-center space-y-4 shadow-md animate-in zoom-in-95 duration-200">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-inner">
                <CheckCircle className="h-9 w-9" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {isHindi ? 'धन्यवाद! आपका सुझाव प्राप्त हो गया है 🎉' : 'Thank You! Your Suggestion Has Been Submitted 🎉'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  {isHindi
                    ? 'आपकी प्रतिक्रिया हमारे एडमिन व उत्पाद विकास दल तक सफलतापूर्वक पहुँच गई है। हम इसे आगामी अपडेट्स में लागू करने का प्रयास करेंगे।'
                    : 'Your feedback has been received by our product team. We review every candidate request to make MockTest Hub India’s best testing platform.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => setSubmittedSuccess(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-extrabold text-slate-800 dark:text-slate-200 transition cursor-pointer"
                >
                  {isHindi ? 'एक और सुझाव भेजें' : 'Send Another Suggestion'}
                </button>
                <button
                  onClick={onBack}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-extrabold text-white transition shadow-sm cursor-pointer"
                >
                  {isHindi ? 'मुख्य पृष्ठ पर लौटें' : 'Return to Home'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
              
              {/* 1. Category Dropdown Selector */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider block">
                  {isHindi ? 'सुझाव की श्रेणी चुनें (Select Category)' : 'Select Category'}
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 cursor-pointer pr-10 shadow-2xs"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* 2. Candidate Non-Editable Default Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* Candidate Name (Readonly) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{isHindi ? 'अभ्यर्थी का नाम (Name)' : 'Candidate Name'}</span>
                    </label>
                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" />
                      <span>{isHindi ? 'अपरिवर्तनीय' : 'Verified'}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={currentUser.name || 'Candidate'}
                      className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed select-none opacity-90"
                    />
                  </div>
                </div>

                {/* Candidate Email (Readonly) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{isHindi ? 'ईमेल आईडी (Email)' : 'Registered Email'}</span>
                    </label>
                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" />
                      <span>{isHindi ? 'अपरिवर्तनीय' : 'Verified'}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={currentUser.email || (isHindi ? 'पंजीकृत ईमेल उपलब्ध नहीं' : 'No email registered')}
                      className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed select-none opacity-90"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Detailed Suggestion Textarea */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider block">
                  {isHindi ? 'अपना सुझाव या अनुरोध विस्तार से लिखें' : 'Describe Your Suggestion or Request in Detail'}
                </label>
                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    isHindi
                      ? 'कृपया विस्तार से बताएं कि आप कौन सी परीक्षा का टेस्ट सीरीज चाहते हैं, किस नए फीचर की आवश्यकता है अथवा कौन सा सुधार होना चाहिए...'
                      : 'Please explain in detail what test series, features, improvements or suggestions you would like us to introduce...'
                  }
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none leading-relaxed placeholder:text-slate-400 shadow-2xs"
                />
              </div>

              {/* 4. Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {isHindi ? '🔒 आपका सुझाव सुरक्षित रूप से एडमिन टीम तक पहुंचेगा' : '🔒 Suggestions are sent directly to MockTest Hub developers.'}
                </p>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={onBack}
                    className="px-4.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
                  >
                    {isHindi ? 'रद्द करें' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={!message.trim() || submitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>{isHindi ? 'सुझाव सबमिट करें' : 'Submit Suggestion'}</span>
                        <Send className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          )}

        </div>
      )}

    </div>
  );
}
