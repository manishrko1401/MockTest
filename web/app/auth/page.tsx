"use client";

import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, User, AlertCircle, CheckCircle2, ChevronLeft, ShieldCheck, Phone, Gift, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { TRANSLATIONS } from '../translations';

export default function AuthPage() {
  const { login, signup, theme, toggleTheme, language, setLanguage, usersList } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (activeTab === 'login') {
      const user = usersList.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
      if (user && user.isBlocked) {
        setErrorMsg(language === 'hi' ? 'यह खाता ब्लॉक कर दिया गया है। कृपया व्यवस्थापक से संपर्क करें।' : 'This account has been blocked. Please contact the administrator.');
        return;
      }
      const ok = login(email);
      if (ok) {
        setSuccessMsg(t.authLoginSuccess || 'Successfully logged in! Redirecting...');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setErrorMsg(t.authLoginFail || 'Invalid credentials. Please register or sign up.');
      }
    } else {
      if (!name.trim()) {
        setErrorMsg(language === 'hi' ? 'कृपया अपना पूरा नाम दर्ज करें।' : 'Please enter your full name.');
        return;
      }
      if (!mobile.trim()) {
        setErrorMsg(language === 'hi' ? 'कृपया अपना मोबाइल नंबर दर्ज करें।' : 'Please enter your mobile number.');
        return;
      }
      if (!/^\d{10}$/.test(mobile.trim())) {
        setErrorMsg(language === 'hi' ? 'कृपया एक वैध 10-अंकीय मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
        return;
      }
      
      const ok = signup(name, email, mobile.trim(), password, referralCodeInput.trim() || undefined);
      if (ok) {
        setSuccessMsg(t.authSignupSuccess || 'Account registered successfully! Redirecting...');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setErrorMsg(t.authSignupFail || 'Email address already registered. Please login.');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 p-6 relative overflow-hidden transition-colors duration-200">
      
      {/* Floating Header Actions */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
          className="px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer shadow-sm"
        >
          <option value="en" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">English</option>
          <option value="hi" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">हिन्दी</option>
        </select>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          type="button"
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm"
          title={theme === 'light' ? t.themeDark : t.themeLight}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>

      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full mx-auto relative z-10">
        
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors mb-6 font-bold">
          <ChevronLeft className="h-4 w-4" /> {t.backToHome}
        </Link>

        {/* Auth Card Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-2xl p-8 overflow-hidden backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
          
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 mb-3">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h2 className="font-extrabold text-xl tracking-wider text-slate-900 dark:text-white">{language === 'hi' ? 'मॉक टेस्ट खाता' : 'MOCK TEST ACCOUNT'}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-widest uppercase mt-1">{language === 'hi' ? 'सिंगल साइन-ऑन एक्सेस' : 'Single Sign-On Access'}</p>
          </div>

          {/* Form Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-950 rounded-lg p-1 border border-slate-200 dark:border-slate-800 mb-6">
            <button
              onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
              type="button"
              className="flex-1 text-center py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: activeTab === 'login' ? '#2563eb' : 'transparent',
                color: activeTab === 'login' ? '#ffffff' : undefined
              }}
            >
              {t.authLoginTab}
            </button>
            <button
              onClick={() => { setActiveTab('signup'); setErrorMsg(null); setSuccessMsg(null); }}
              type="button"
              className="flex-1 text-center py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: activeTab === 'signup' ? '#2563eb' : 'transparent',
                color: activeTab === 'signup' ? '#ffffff' : undefined
              }}
            >
              {t.authRegisterTab}
            </button>
          </div>

          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-650 dark:text-red-400 flex items-start gap-2.5 text-xs mb-5 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 mt-0.5 text-red-600" />
              <span className="font-bold">{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 flex items-start gap-2.5 text-xs mb-5 animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Input Fields Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {activeTab === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.authName}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.authNamePlaceholder}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.authEmail}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.authEmailPlaceholder || "name@example.com"}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
                />
              </div>
            </div>

            {activeTab === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.authMobile}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder={t.authMobilePlaceholder || "10-digit number"}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
                  />
                </div>
              </div>
            )}

            {activeTab === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.authRefOptional}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Gift className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={referralCodeInput}
                    onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. TB-RAHUL-1029"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.authPassword}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.authPassPlaceholder || "••••••••"}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-900/25 active:scale-[0.98] mt-6 cursor-pointer"
            >
              {activeTab === 'login' 
                ? (language === 'hi' ? 'खाते में साइन इन करें' : 'Sign In to Account') 
                : (language === 'hi' ? 'खाता पंजीकृत करें' : 'Register Account')}
            </button>

          </form>

          {/* Quick instructions */}
          {activeTab === 'signup' && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center border-t border-slate-200 dark:border-slate-800/80 pt-4 mt-6">
              <p>{language === 'hi' ? 'पूर्ण मॉक टेस्ट इतिहास ट्रैकिंग के साथ एक नया सत्र प्रोफ़ाइल बनाने के लिए साइन अप करें।' : 'Sign up to create a new session profile with full mock test history tracking.'}</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
