"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { Lock, Mail, User, AlertCircle, CheckCircle2, ChevronLeft, ShieldCheck, Trophy, Phone, Gift, Sun, Moon, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { isDisposableEmail } from '../lib/botProtection';
import { signInWithGoogle } from '../lib/googleDriveWeb';

export default function AuthPage() {
  const { login, signup, loginWithGoogle, theme, toggleTheme, language, setLanguage, usersList } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'signup' || params.get('mode') === 'signup') {
        setActiveTab('signup');
      }
    }
  }, []);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Anti-Bot States
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password Reset states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = input email, 2 = input OTP + new password
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Render or re-render Cloudflare Turnstile widget
  useEffect(() => {
    if (activeTab !== 'signup') return;
    const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

    const initTurnstile = () => {
      if (typeof window !== 'undefined' && (window as any).turnstile && turnstileContainerRef.current) {
        try {
          if (turnstileWidgetId.current) {
            (window as any).turnstile.remove(turnstileWidgetId.current);
            turnstileWidgetId.current = null;
          }
          turnstileContainerRef.current.innerHTML = '';
          const widgetId = (window as any).turnstile.render(turnstileContainerRef.current, {
            sitekey: siteKey,
            theme: theme === 'dark' ? 'dark' : 'light',
            callback: (token: string) => {
              setTurnstileToken(token);
              setErrorMsg(null);
            },
            'expired-callback': () => {
              setTurnstileToken(null);
            },
            'error-callback': () => {
              // Fallback dummy token for local development / testing without throwing error
              if (siteKey === '1x00000000000000000000AA') {
                setTurnstileToken('dummy-token-pass');
              }
            }
          });
          turnstileWidgetId.current = widgetId;
        } catch (e) {
          console.warn('Turnstile render warning:', e);
        }
      }
    };

    const timer = setTimeout(initTurnstile, 150);
    return () => clearTimeout(timer);
  }, [activeTab, theme, turnstileLoaded]);



  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError(language === 'hi' ? 'कृपया अपना ईमेल पता दर्ज करें।' : 'Please enter your email address.');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request-password-reset',
          data: { email: resetEmail }
        })
      });
      const data = await res.json();
      if (data.success) {
        setResetSuccess(language === 'hi' ? 'सत्यापन कोड आपके ईमेल पर भेज दिया गया है।' : 'Verification code has been sent to your email.');
        setResetStep(2);
      } else {
        setResetError(data.error || (language === 'hi' ? 'ईमेल भेजने में विफल।' : 'Failed to request reset.'));
      }
    } catch (err) {
      setResetError(language === 'hi' ? 'कनेक्शन त्रुटि।' : 'Connection error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp.trim()) {
      setResetError(language === 'hi' ? 'कृपया सत्यापन कोड दर्ज करें।' : 'Please enter the verification code.');
      return;
    }
    if (!resetNewPassword.trim()) {
      setResetError(language === 'hi' ? 'कृपया नया पासवर्ड दर्ज करें।' : 'Please enter a new password.');
      return;
    }
    if (resetNewPassword.length < 4) {
      setResetError(language === 'hi' ? 'पासवर्ड कम से कम 4 वर्णों का होना चाहिए।' : 'Password must be at least 4 characters long.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm-password-reset',
          data: {
            email: resetEmail,
            otp: resetOtp,
            newPassword: resetNewPassword
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(language === 'hi' ? 'पासवर्ड सफलतापूर्वक बदल दिया गया है! अब लॉगिन करें।' : 'Password reset successful! Please login with your new password.');
        setShowResetModal(false);
        // Clear reset states
        setResetOtp('');
        setResetNewPassword('');
        // Autofill password with the new one
        setPassword(resetNewPassword);
        setEmail(resetEmail);
      } else {
        setResetError(data.error || (language === 'hi' ? 'सत्यापन विफल।' : 'Verification failed.'));
      }
    } catch (err) {
      setResetError(language === 'hi' ? 'कनेक्शन त्रुटि।' : 'Connection error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (activeTab === 'login') {
      const user = usersList.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
      if (user && user.isBlocked) {
        setErrorMsg(language === 'hi' ? 'यह खाता ब्लॉक कर दिया गया है। कृपया व्यवस्थापक से संपर्क करें।' : 'This account has been blocked. Please contact the administrator.');
        return;
      }
      setLoading(true);
      try {
        const res = await login(email, password);
        if (res.success) {
          router.push('/');
        } else {
          setErrorMsg(res.error || t.authLoginFail || 'Invalid credentials. Please register or sign up.');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // 1. Honeypot Anti-Bot Trap: Silently reject bots that filled hidden field
      if (honeypot && honeypot.trim().length > 0) {
        console.warn('Bot trap triggered');
        setErrorMsg(language === 'hi' ? 'पंजीकरण पूरा नहीं हो सका।' : 'Registration could not be completed.');
        return;
      }

      if (!name.trim()) {
        setErrorMsg(language === 'hi' ? 'कृपया अपना पूरा नाम दर्ज करें।' : 'Please enter your full name.');
        return;
      }
      if (!email.trim()) {
        setErrorMsg(language === 'hi' ? 'कृपया अपना ईमेल पता दर्ज करें।' : 'Please enter your email address.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setErrorMsg(language === 'hi' ? 'ईमेल गलत है।' : 'Email is incorrect.');
        return;
      }

      // 2. Client-side Disposable / Burner Email Validation
      if (isDisposableEmail(email.trim())) {
        setErrorMsg(t.authDisposableEmailError || (language === 'hi' ? 'अस्थायी या डिस्पोजेबल ईमेल की अनुमति नहीं है। कृपया मान्य ईमेल (उदा. Gmail, Yahoo, Outlook) का उपयोग करें।' : 'Temporary and disposable email addresses are not allowed. Please use a permanent email (e.g. Gmail, Yahoo, Outlook).'));
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

      setLoading(true);
      try {
        const res = await signup(
          name, 
          email.trim(), 
          mobile.trim(), 
          password, 
          referralCodeInput.trim() || undefined,
          honeypot.trim() || undefined,
          turnstileToken || undefined
        );
        if (res.success) {
          localStorage.setItem('show_signup_congrats_popup', 'true');
          router.push('/');
        } else {
          setErrorMsg(res.error || t.authSignupFail || 'Email address already registered. Please login.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGoogleLoading(true);

    try {
      const googleProfile = await signInWithGoogle();
      if (!googleProfile || !googleProfile.email) {
        throw new Error('Google Sign-In was cancelled or failed.');
      }

      // Save drive token for seamless Locker integration
      if (googleProfile.accessToken && typeof window !== 'undefined') {
        try {
          localStorage.setItem('mth_drive_token', googleProfile.accessToken);
        } catch {}
      }

      const res = await loginWithGoogle(
        googleProfile.email,
        googleProfile.name,
        googleProfile.picture
      );

      if (res.success) {
        router.push('/');
      } else {
        setErrorMsg(res.error || 'Failed to authenticate with Google.');
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMsg(err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-200/90 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 p-4 sm:p-6 pt-12 sm:pt-16 pb-20 sm:pb-24 relative overflow-x-hidden transition-colors duration-200 flex flex-col items-center">
      
      {/* Cloudflare Turnstile External Script */}
      <Script 
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" 
        strategy="afterInteractive"
        onLoad={() => setTurnstileLoaded(true)}
      />

      {/* Floating Header Actions (Fixed top-right so it never overlaps or jumps) */}
      <div className="fixed top-3 right-3 sm:top-5 sm:right-6 z-30 flex items-center gap-2 sm:gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1 sm:p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
          className="px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer shadow-xs"
        >
          <option value="en" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">English</option>
          <option value="hi" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">हिन्दी</option>
        </select>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          type="button"
          className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-xs"
          title={theme === 'light' ? t.themeDark : t.themeLight}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>

      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className={`w-full mx-auto relative z-10 transition-all duration-300 ${activeTab === 'signup' ? 'max-w-2xl' : 'max-w-md'}`}>
        
        {/* Top Header / Back & Brand Logo */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-1.5 rounded-xl shadow-xs flex items-center justify-center h-8 w-8 border border-blue-200/50 dark:border-slate-700 shrink-0 group-hover:scale-105 transition-transform">
              <Trophy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <span className="font-black text-xs leading-none text-slate-900 dark:text-white tracking-wider block">
                MockTest <span className="text-blue-600 dark:text-blue-400">Hub</span>
              </span>
              <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase block mt-0.5">
                {language === 'hi' ? 'परीक्षा की तैयारी' : 'Exam Preparation'}
              </span>
            </div>
          </Link>

          <Link href="/" className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors font-bold">
            <ChevronLeft className="h-4 w-4" /> {t.backToHome}
          </Link>
        </div>

        {/* Auth Card Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl dark:shadow-2xl p-5 sm:p-8 backdrop-blur-md bg-opacity-90 dark:bg-opacity-90 transition-all duration-300">
          
          {/* Main Card Logo & Header */}
          <Link href="/" className="group flex flex-col items-center justify-center text-center mb-6 block cursor-pointer">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 sm:p-3 rounded-2xl shadow-md shadow-blue-500/20 flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 shrink-0 mb-2.5 group-hover:scale-105 transition-transform">
              <Trophy className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            
            <h1 className="font-black text-xl sm:text-2xl tracking-tight leading-none">
              <span className="text-slate-900 dark:text-white">MockTest</span>
              <span className="text-blue-600 dark:text-blue-400 ml-1">Hub</span>
            </h1>
            
            <p className="text-[9.5px] sm:text-[10px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase mt-1.5">
              {language === 'hi' ? 'परीक्षा की तैयारी पोर्टल' : 'Exam Preparation Portal'}
            </p>
          </Link>

          {/* Form Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-950 rounded-xl p-1 border border-slate-200 dark:border-slate-800 mb-5">
            <button
              onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
              type="button"
              className="flex-1 text-center py-2 sm:py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
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
              className="flex-1 text-center py-2 sm:py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: activeTab === 'signup' ? '#2563eb' : 'transparent',
                color: activeTab === 'signup' ? '#ffffff' : undefined
              }}
            >
              {t.authRegisterTab}
            </button>
          </div>

          {/* Google Single Sign-On Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 mb-5"
          >
            {googleLoading ? (
              <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{t.authGoogleBtn || 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center mb-5">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
            <span className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t.authOrDivider || 'OR'}
            </span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-start gap-2.5 text-xs mb-5 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 mt-0.5 text-red-600 shrink-0" />
              <span className="font-bold">{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 flex items-start gap-2.5 text-xs mb-5 animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Input Fields Form (1-Column for Login, 2-Column Grid for Signup) */}
          <form onSubmit={handleSubmit}>
            
            {/* Honeypot Anti-Bot Field (Hidden from real humans, trapped bots fill it) */}
            <div style={{ position: 'absolute', opacity: 0, zIndex: -1, width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
              <input
                type="text"
                name="website_url"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {activeTab === 'signup' ? (
              /* ================= 2-COLUMN SIGNUP FORM ================= */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                
                {/* 1. Full Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.authName}</label>
                  <div className="relative" suppressHydrationWarning>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.authNamePlaceholder}
                      suppressHydrationWarning
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* 2. Mobile Number */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.authMobile}</label>
                  <div className="relative" suppressHydrationWarning>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder={t.authMobilePlaceholder || "10-digit number"}
                      suppressHydrationWarning
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* 3. Email Address */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.authEmail}</label>
                  <div className="relative" suppressHydrationWarning>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMsg && errorMsg.includes('disposable')) setErrorMsg(null);
                      }}
                      placeholder={t.authEmailPlaceholder || "name@example.com"}
                      suppressHydrationWarning
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* 4. Password */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.authPassword}</label>
                  <div className="relative" suppressHydrationWarning>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.authPassPlaceholder || "••••••••"}
                      suppressHydrationWarning
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* 5. Referral Code (Optional) */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.authRefOptional}</label>
                  <div className="relative" suppressHydrationWarning>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Gift className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. TB-RAHUL-1029"
                      suppressHydrationWarning
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* 6. Cloudflare Turnstile Bot Protection Widget for Signup */}
                <div className="col-span-1 md:col-span-2 pt-1 flex flex-col items-center justify-center">
                  <div ref={turnstileContainerRef} className="min-h-[65px] flex items-center justify-center" />
                  <p className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {language === 'hi' ? 'क्लाउडफ्लेयर द्वारा बॉट और स्पैम से सुरक्षित' : 'Protected against spam & automated bots by Cloudflare'}
                  </p>
                </div>

                {/* 7. Full-Width Register Button */}
                <div className="col-span-1 md:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-900/25 active:scale-[0.98] cursor-pointer disabled:opacity-60"
                  >
                    {loading 
                      ? (language === 'hi' ? 'कृपया प्रतीक्षा करें...' : 'Please wait...')
                      : (language === 'hi' ? 'खाता पंजीकृत करें' : 'Register Account')}
                  </button>
                </div>

              </div>
            ) : (
              /* ================= 1-COLUMN LOGIN FORM ================= */
              <div className="space-y-4">
                {/* 1. Email Address */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.authEmail}</label>
                  <div className="relative" suppressHydrationWarning>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMsg && errorMsg.includes('disposable')) setErrorMsg(null);
                      }}
                      placeholder={t.authEmailPlaceholder || "name@example.com"}
                      suppressHydrationWarning
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* 2. Password */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.authPassword}</label>
                  <div className="relative" suppressHydrationWarning>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.authPassPlaceholder || "••••••••"}
                      suppressHydrationWarning
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setResetStep(1);
                      setShowResetModal(true);
                      setResetError(null);
                      setResetSuccess(null);
                    }}
                    className="text-[10.5px] text-blue-600 dark:text-blue-400 font-extrabold hover:underline uppercase tracking-wide cursor-pointer"
                  >
                    {language === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                  </button>
                </div>

                {/* Submit Login Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-900/25 active:scale-[0.98] cursor-pointer disabled:opacity-60"
                  >
                    {loading 
                      ? (language === 'hi' ? 'कृपया प्रतीक्षा करें...' : 'Please wait...')
                      : (language === 'hi' ? 'खाते में साइन इन करें' : 'Sign In to Account')}
                  </button>
                </div>
              </div>
            )}

          </form>

          {/* Quick instructions */}
          {activeTab === 'signup' && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center border-t border-slate-200 dark:border-slate-800/80 pt-4 mt-5">
              <p>{language === 'hi' ? 'पूर्ण मॉक टेस्ट इतिहास ट्रैकिंग के साथ एक नया सत्र प्रोफ़ाइल बनाने के लिए साइन अप करें।' : 'Sign up to create a new session profile with full mock test history tracking.'}</p>
            </div>
          )}

        </div>

      </div>

            {/* Password Reset Modal Overlay */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-slate-800 dark:text-white">
            
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full h-8 w-8 flex items-center justify-center cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Lock className="h-5 w-5" />
              <h4 className="font-extrabold text-xs uppercase tracking-wider">
                {language === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Password'}
              </h4>
            </div>

            {resetError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 flex items-start gap-2 text-[10px] mb-4">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="font-bold">{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 flex items-start gap-2 text-[10px] mb-4">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="font-bold">{resetSuccess}</span>
              </div>
            )}

            {resetStep === 1 ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  {language === 'hi' 
                    ? 'अपना पंजीकृत ईमेल पता दर्ज करें। हम आपको पासवर्ड बदलने के लिए एक 6-अंकीय सत्यापन कोड (OTP) भेजेंगे।' 
                    : 'Enter your registered email address. We will send you a 6-digit verification code (OTP) to reset your password.'}
                </p>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    {t.authEmail}
                  </label>
                  <div className="relative" suppressHydrationWarning>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder={t.authEmailPlaceholder || "name@example.com"}
                      suppressHydrationWarning
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all shadow-md shadow-blue-900/20 cursor-pointer disabled:opacity-50"
                >
                  {resetLoading 
                    ? (language === 'hi' ? 'भेज रहा है...' : 'Sending Code...') 
                    : (language === 'hi' ? 'सत्यापन कोड प्राप्त करें' : 'Get Verification Code')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-4">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  {language === 'hi' 
                    ? 'कृपया अपने ईमेल पर प्राप्त 6-अंकीय सत्यापन कोड (OTP) और अपना नया पासवर्ड दर्ज करें।' 
                    : 'Please enter the 6-digit verification code (OTP) sent to your email and choose a new password.'}
                </p>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    {language === 'hi' ? 'सत्यापन कोड (OTP)' : 'Verification Code (OTP)'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 583921"
                    suppressHydrationWarning
                    className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 text-sm font-bold tracking-widest text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    {language === 'hi' ? 'नया पासवर्ड' : 'New Password'}
                  </label>
                  <div className="relative" suppressHydrationWarning>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showResetPassword ? "text" : "password"}
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="At least 4 characters"
                      suppressHydrationWarning
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-600 transition-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setResetStep(1); setResetError(null); setResetSuccess(null); }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    {language === 'hi' ? 'पीछे' : 'Back'}
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all shadow-md shadow-blue-900/20 cursor-pointer disabled:opacity-50"
                  >
                    {resetLoading 
                      ? (language === 'hi' ? 'रीसेट हो रहा है...' : 'Resetting...') 
                      : (language === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Password')}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}


    </div>
  );
}
