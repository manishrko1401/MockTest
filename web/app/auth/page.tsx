"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { Lock, Mail, User, AlertCircle, CheckCircle2, ShieldCheck, Trophy, Phone, Gift, Eye, EyeOff, X } from 'lucide-react';
import { SiteHeader, SiteFooter, PageTitle, Field, btnPrimary, btnSecondary, inputCls, linkCls, pageBg, container } from '../components/SiteUI';
import { TRANSLATIONS } from '../translations';
import { isDisposableEmail } from '../lib/botProtection';
import { signInWithGoogle } from '../lib/googleDriveWeb';

// A friend's referral code from an invite link, kept until sign-up
const REF_KEY = 'mth_invite_ref';

export default function AuthPage() {
  const { login, signup, loginWithGoogle, theme, toggleTheme, language, setLanguage, usersList } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  const [redirectUrl, setRedirectUrl] = useState<string>('/');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'signup' || params.get('mode') === 'signup') {
        setActiveTab('signup');
      }
      // Invite link (/auth?ref=CODE): fill in the friend's code and open sign-up. Kept for this
      // browser, so the code still counts if they look around first and sign up later.
      const ref = (params.get('ref') || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40);
      let invite = ref;
      try {
        if (ref) localStorage.setItem(REF_KEY, ref);
        else invite = localStorage.getItem(REF_KEY) || '';
      } catch { /* storage blocked */ }
      if (invite) setReferralCodeInput(invite);
      if (ref) setActiveTab('signup');
      const targetRedirect = params.get('redirect') || params.get('returnUrl');
      if (targetRedirect && targetRedirect.startsWith('/') && !targetRedirect.startsWith('//')) {
        setRedirectUrl(targetRedirect);
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
        setResetSuccess(language === 'hi' ? 'अगर इस ईमेल से कोई खाता है, तो सत्यापन कोड भेज दिया गया है। अपना इनबॉक्स और स्पैम फ़ोल्डर देखें।' : 'If an account exists for this email, a verification code has been sent. Check your inbox and spam folder.');
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
    if (resetNewPassword.trim().length < 6) {
      setResetError(language === 'hi' ? 'पासवर्ड कम से कम 6 वर्णों का होना चाहिए।' : 'Password must be at least 6 characters long.');
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
          router.push(redirectUrl);
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

      if (!turnstileToken) {
        setErrorMsg(language === 'hi' ? 'कृपया सुरक्षा जांच पूरी करें।' : 'Please complete the security check.');
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
          try { localStorage.removeItem(REF_KEY); } catch { /* ignore */ }
          localStorage.setItem('show_signup_congrats_popup', 'true');
          router.push(redirectUrl);
        } else {
          setErrorMsg(res.error || t.authSignupFail || 'Email address already registered. Please login.');
          // a captcha token works once: get a fresh one for the next try
          setTurnstileToken(null);
          try { if (turnstileWidgetId.current) (window as any).turnstile?.reset(turnstileWidgetId.current); } catch { /* ignore */ }
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
        googleProfile.picture,
        googleProfile.accessToken,
        referralCodeInput.trim() || undefined
      );

      if (res.success) {
        try { localStorage.removeItem(REF_KEY); } catch { /* ignore */ }
        router.push(redirectUrl);
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

  const isHindi = language === 'hi';
  const isSignup = activeTab === 'signup';
  const switchTab = (tab: 'login' | 'signup') => { setActiveTab(tab); setErrorMsg(null); setSuccessMsg(null); };
  const openReset = () => {
    setResetEmail(email);
    setResetStep(1);
    setShowResetModal(true);
    setResetError(null);
    setResetSuccess(null);
  };

  const benefits = [
    { icon: Trophy, title: isHindi ? 'मॉक टेस्ट एवं विश्लेषण' : 'Mock tests with analysis', desc: isHindi ? 'हर प्रयास का स्कोर, रैंक और अनुभागवार विश्लेषण।' : 'Score, rank and section-wise analysis for every attempt.' },
    { icon: ShieldCheck, title: isHindi ? 'टाइपिंग टेस्ट इतिहास' : 'Typing test history', desc: isHindi ? 'सभी टाइपिंग प्रयास और परिणाम एक स्थान पर।' : 'All your typing attempts and results in one place.' },
    { icon: Lock, title: isHindi ? 'सुरक्षित दस्तावेज़ लॉकर' : 'Secure document locker', desc: isHindi ? 'आवेदन क्रेडेंशियल्स और प्रवेश पत्र सुरक्षित रखें।' : 'Keep application credentials and admit cards safe.' },
    { icon: Gift, title: isHindi ? 'नौकरी ट्रैकिंग एवं रेफ़रल' : 'Job tracking & referrals', desc: isHindi ? 'आवेदन की गई नौकरियां सहेजें और रेफ़रल से कॉइन कमाएं।' : 'Save applied jobs and earn coins through referrals.' },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${pageBg} font-sans`}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setTurnstileLoaded(true)}
      />

      <SiteHeader />

      <PageTitle
        crumbs={[{ label: isHindi ? 'होम' : 'Home', href: '/' }, { label: isSignup ? (isHindi ? 'पंजीकरण' : 'Register') : (isHindi ? 'लॉग इन' : 'Login') }]}
        title={isSignup ? (isHindi ? 'नया खाता बनाएं' : 'Create your account') : (isHindi ? 'अपने खाते में लॉग इन करें' : 'Log in to your account')}
        subtitle={isSignup
          ? (isHindi ? 'मुफ़्त पंजीकरण करें और अपनी तैयारी का पूरा रिकॉर्ड रखें।' : 'Register for free and keep a complete record of your preparation.')
          : (isHindi ? 'अपने टेस्ट, परिणाम और सहेजी गई नौकरियां देखने के लिए लॉग इन करें।' : 'Log in to view your tests, results and saved jobs.')}
      />

      <main className={`${container} w-full flex-1 py-8 pb-14`}>
        <div className={`mx-auto grid gap-6 items-start ${isSignup ? 'max-w-5xl lg:grid-cols-[minmax(0,1fr)_300px]' : 'max-w-4xl lg:grid-cols-[minmax(0,1fr)_300px]'}`}>

          {/* Form card */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 sm:px-6" role="tablist">
              {(['login', 'signup'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => switchTab(tab)}
                  className={`py-3.5 mr-6 text-sm border-b-2 -mb-px cursor-pointer transition-colors ${
                    activeTab === tab
                      ? 'border-[#1e4e79] text-[#1e4e79] dark:border-blue-400 dark:text-blue-300 font-semibold'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab === 'login' ? t.authLoginTab : t.authRegisterTab}
                </button>
              ))}
            </div>

            <div className="px-5 sm:px-6 py-6 space-y-5">
              {/* Messages */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-md border border-red-200 dark:border-red-900/60 border-l-4 border-l-[#b02a37] bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-300" role="alert">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="flex items-start gap-2.5 rounded-md border border-green-200 dark:border-green-900/60 border-l-4 border-l-[#1e7e34] bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-800 dark:text-green-300" role="status">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
                {/* Honeypot anti-bot field (hidden from people) */}
                <div style={{ position: 'absolute', opacity: 0, zIndex: -1, width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                  <input type="text" name="website_url" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
                </div>

                {isSignup ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label={t.authName}>
                      <IconInput icon={User} type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t.authNamePlaceholder} autoComplete="name" />
                    </Field>
                    <Field label={t.authMobile}>
                      <IconInput icon={Phone} type="tel" required maxLength={10} inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} placeholder={t.authMobilePlaceholder || '10-digit number'} autoComplete="tel" />
                    </Field>
                    <Field label={t.authEmail}>
                      <IconInput
                        icon={Mail}
                        type="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (errorMsg && errorMsg.includes('disposable')) setErrorMsg(null); }}
                        placeholder={t.authEmailPlaceholder || 'name@example.com'}
                        autoComplete="email"
                      />
                    </Field>
                    <Field label={t.authPassword}>
                      <IconInput
                        icon={Lock}
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t.authPassPlaceholder || '••••••••'}
                        autoComplete="new-password"
                        right={<PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label={t.authRefOptional}>
                        <IconInput icon={Gift} type="text" value={referralCodeInput} onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())} placeholder="e.g. MT-7KQ2" />
                      </Field>
                    </div>
                    <div className="md:col-span-2 flex flex-col items-center gap-1.5 pt-1">
                      <div ref={turnstileContainerRef} className="min-h-[65px] flex items-center justify-center" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        {isHindi ? 'क्लाउडफ्लेयर द्वारा बॉट और स्पैम से सुरक्षित' : 'Protected against spam and automated bots by Cloudflare'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <button type="submit" disabled={loading} className={`${btnPrimary} w-full h-10`}>
                        {loading ? (isHindi ? 'कृपया प्रतीक्षा करें…' : 'Please wait…') : (isHindi ? 'खाता पंजीकृत करें' : 'Create account')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Field label={t.authEmail}>
                      <IconInput
                        icon={Mail}
                        type="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (errorMsg && errorMsg.includes('disposable')) setErrorMsg(null); }}
                        placeholder={t.authEmailPlaceholder || 'name@example.com'}
                        autoComplete="email"
                      />
                    </Field>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t.authPassword}</label>
                        <button type="button" onClick={openReset} className={`${linkCls} text-sm cursor-pointer`}>
                          {isHindi ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
                        </button>
                      </div>
                      <IconInput
                        icon={Lock}
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t.authPassPlaceholder || '••••••••'}
                        autoComplete="current-password"
                        right={<PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
                      />
                    </div>
                    <button type="submit" disabled={loading} className={`${btnPrimary} w-full h-10`}>
                      {loading ? (isHindi ? 'कृपया प्रतीक्षा करें…' : 'Please wait…') : (isHindi ? 'लॉग इन करें' : 'Log in')}
                    </button>
                  </>
                )}
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                <span>{t.authOrDivider || 'or'}</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
              </div>

              {/* Google sign-in */}
              <button type="button" onClick={handleGoogleAuth} disabled={googleLoading || loading} className={`${btnSecondary} w-full h-10 disabled:opacity-60`}>
                {googleLoading ? (
                  <span className="h-4 w-4 border-2 border-[#1e4e79] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>{t.authGoogleBtn || 'Continue with Google'}</span>
              </button>
            </div>

            {/* Card footer: switch tab */}
            <div className="px-5 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 rounded-b-lg text-sm text-slate-600 dark:text-slate-400 text-center">
              {isSignup ? (
                <>{isHindi ? 'पहले से खाता है?' : 'Already have an account?'}{' '}
                  <button type="button" onClick={() => switchTab('login')} className={`${linkCls} font-medium cursor-pointer`}>{isHindi ? 'लॉग इन करें' : 'Log in'}</button></>
              ) : (
                <>{isHindi ? 'नए उपयोगकर्ता हैं?' : 'New to MockTest Hub?'}{' '}
                  <button type="button" onClick={() => switchTab('signup')} className={`${linkCls} font-medium cursor-pointer`}>{isHindi ? 'मुफ़्त खाता बनाएं' : 'Create a free account'}</button></>
              )}
            </div>
          </section>

          {/* Side information */}
          <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{isHindi ? 'खाते के लाभ' : 'With your account'}</h2>
            </div>
            <ul className="px-5 py-4 space-y-4">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="h-8 w-8 rounded-md bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-blue-300 flex items-center justify-center shrink-0">
                    <b.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{b.title}</span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">{b.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              {isHindi ? 'जारी रखकर आप हमारी ' : 'By continuing you agree to our '}
              <Link href="/terms" className={linkCls}>{isHindi ? 'नियम और शर्तें' : 'Terms'}</Link>
              {isHindi ? ' और ' : ' and '}
              <Link href="/privacy" className={linkCls}>{isHindi ? 'गोपनीयता नीति' : 'Privacy Policy'}</Link>
              {isHindi ? ' से सहमत हैं।' : '.'}
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />

      {/* Password reset dialog */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{isHindi ? 'पासवर्ड रीसेट करें' : 'Reset password'}</h3>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {resetError && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-sm text-red-800 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}
              {resetSuccess && (
                <div className="flex items-start gap-2 rounded-md border border-green-200 dark:border-green-900/60 bg-green-50 dark:bg-green-950/30 px-3 py-2.5 text-sm text-green-800 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              {resetStep === 1 ? (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {isHindi
                      ? 'अपना पंजीकृत ईमेल पता दर्ज करें। हम पासवर्ड बदलने के लिए 6-अंकीय सत्यापन कोड (OTP) भेजेंगे।'
                      : 'Enter your registered email address. We will send a 6-digit verification code (OTP) to reset your password.'}
                  </p>
                  <Field label={t.authEmail}>
                    <IconInput icon={Mail} type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder={t.authEmailPlaceholder || 'name@example.com'} autoComplete="email" />
                  </Field>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setShowResetModal(false)} className={btnSecondary}>{isHindi ? 'रद्द करें' : 'Cancel'}</button>
                    <button type="submit" disabled={resetLoading} className={btnPrimary}>
                      {resetLoading ? (isHindi ? 'भेज रहा है…' : 'Sending…') : (isHindi ? 'सत्यापन कोड भेजें' : 'Send code')}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleConfirmReset} className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {isHindi
                      ? 'अपने ईमेल पर प्राप्त 6-अंकीय सत्यापन कोड और नया पासवर्ड दर्ज करें।'
                      : 'Enter the 6-digit code sent to your email and choose a new password.'}
                  </p>
                  <Field label={isHindi ? 'सत्यापन कोड (OTP)' : 'Verification code (OTP)'}>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      inputMode="numeric"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 583921"
                      className={`${inputCls} text-center font-mono tracking-[0.3em]`}
                    />
                  </Field>
                  <Field label={isHindi ? 'नया पासवर्ड' : 'New password'}>
                    <IconInput
                      icon={Lock}
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder={isHindi ? 'कम से कम 4 वर्ण' : 'At least 4 characters'}
                      autoComplete="new-password"
                      right={<PasswordToggle show={showResetPassword} onToggle={() => setShowResetPassword(!showResetPassword)} />}
                    />
                  </Field>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => { setResetStep(1); setResetError(null); setResetSuccess(null); }} className={btnSecondary}>
                      {isHindi ? 'पीछे' : 'Back'}
                    </button>
                    <button type="submit" disabled={resetLoading} className={btnPrimary}>
                      {resetLoading ? (isHindi ? 'रीसेट हो रहा है…' : 'Resetting…') : (isHindi ? 'पासवर्ड रीसेट करें' : 'Reset password')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───── Module-scope inputs (kept outside the page component so inputs keep focus) ─────
function IconInput({ icon: Icon, right, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ElementType; right?: React.ReactNode }) {
  return (
    <div className="relative" suppressHydrationWarning>
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input {...props} suppressHydrationWarning className={`${inputCls} pl-9 ${right ? 'pr-10' : ''} ${className}`} />
      {right && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  );
}

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" aria-label={show ? 'Hide password' : 'Show password'}>
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
