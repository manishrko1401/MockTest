"use client";

import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, User, AlertCircle, CheckCircle2, ChevronLeft, ShieldCheck, Trophy, Phone, Gift, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../lib/firebase';

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

  // Phone auth states
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [phoneNo, setPhoneNo] = useState('');
  const [verificationId, setVerificationId] = useState<any>(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Phone auth password reset states
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('email');
  const [resetPhone, setResetPhone] = useState('');
  const [resetPhoneCode, setResetPhoneCode] = useState('');
  const [resetVerificationId, setResetVerificationId] = useState<any>(null);

  const setupRecaptcha = () => {
    if ((window as any).recaptchaVerifier) {
      return;
    }
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      }
    });
  };

  const handleSendPhoneOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!phoneNo.trim()) {
      setErrorMsg(language === 'hi' ? 'कृपया अपना फोन नंबर दर्ज करें।' : 'Please enter your phone number.');
      return;
    }
    let formattedPhone = phoneNo.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone.replace(/\D/g, '');
    }

    setPhoneLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setVerificationId(confirmationResult);
      setSuccessMsg(language === 'hi' ? 'सत्यापन कोड आपके फोन पर भेजा गया है।' : 'Verification code sent to your phone.');
    } catch (err: any) {
      console.error("Firebase SMS send error:", err);
      setErrorMsg(err.message || (language === 'hi' ? 'सत्यापन कोड भेजने में विफल।' : 'Failed to send verification code.'));
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
          (window as any).recaptchaVerifier = null;
        } catch (e) {}
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!phoneCode.trim()) {
      setErrorMsg(language === 'hi' ? 'कृपया सत्यापन कोड दर्ज करें।' : 'Please enter the verification code.');
      return;
    }

    setPhoneLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await verificationId.confirm(phoneCode);
      const user = result.user;
      const idToken = await user.getIdToken();

      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'phone-auth-login',
          data: {
            phoneNumber: user.phoneNumber,
            idToken
          }
        })
      });

      const backendResult = await res.json();
      if (backendResult.success && backendResult.user) {
        setSuccessMsg(language === 'hi' ? 'लॉगिन सफल!' : 'Login successful!');
        login(backendResult.user);
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        setErrorMsg(backendResult.error || (language === 'hi' ? 'लॉगिन विफल।' : 'Login failed.'));
      }
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setErrorMsg(err.message || (language === 'hi' ? 'गलत कोड। कृपया पुनः प्रयास करें।' : 'Invalid code. Please try again.'));
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleRequestPhoneReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPhone.trim()) {
      setResetError(language === 'hi' ? 'कृपया अपना फोन नंबर दर्ज करें।' : 'Please enter your phone number.');
      return;
    }
    let formattedPhone = resetPhone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone.replace(/\D/g, '');
    }

    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setResetVerificationId(confirmationResult);
      setResetSuccess(language === 'hi' ? 'सत्यापन कोड आपके फोन पर भेजा गया है।' : 'Verification code sent to your phone.');
      setResetStep(2);
    } catch (err: any) {
      console.error("Firebase reset SMS error:", err);
      setResetError(err.message || (language === 'hi' ? 'कोड भेजने में विफल।' : 'Failed to send verification code.'));
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
          (window as any).recaptchaVerifier = null;
        } catch (e) {}
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmPhoneReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPhoneCode.trim()) {
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
      const result = await resetVerificationId.confirm(resetPhoneCode);
      const user = result.user;
      const idToken = await user.getIdToken();

      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'phone-auth-reset-password',
          data: {
            phoneNumber: user.phoneNumber,
            idToken,
            newPassword: resetNewPassword
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(language === 'hi' ? 'पासवर्ड सफलतापूर्वक बदल दिया गया है! अब लॉगिन करें।' : 'Password reset successful! Please login with your new password.');
        setShowResetModal(false);
        setResetPhoneCode('');
        setResetNewPassword('');
        setResetVerificationId(null);
        setPassword(resetNewPassword);
      } else {
        setResetError(data.error || (language === 'hi' ? 'पासवर्ड रीसेट विफल।' : 'Password reset failed.'));
      }
    } catch (err: any) {
      console.error("Phone OTP verification error during reset:", err);
      setResetError(err.message || (language === 'hi' ? 'गलत कोड। कृपया पुनः प्रयास करें।' : 'Invalid code. Please try again.'));
    } finally {
      setResetLoading(false);
    }
  };

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
      const res = await login(email, password);
      if (res.success) {
        setSuccessMsg(t.authLoginSuccess || 'Successfully logged in! Redirecting...');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setErrorMsg(res.error || t.authLoginFail || 'Invalid credentials. Please register or sign up.');
      }
    } else {
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
      if (!mobile.trim()) {
        setErrorMsg(language === 'hi' ? 'कृपया अपना मोबाइल नंबर दर्ज करें।' : 'Please enter your mobile number.');
        return;
      }
      if (!/^\d{10}$/.test(mobile.trim())) {
        setErrorMsg(language === 'hi' ? 'कृपया एक वैध 10-अंकीय मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
        return;
      }
      
      const res = await signup(name, email.trim(), mobile.trim(), password, referralCodeInput.trim() || undefined);
      if (res.success) {
        setSuccessMsg(t.authSignupSuccess || 'Account registered successfully! Redirecting...');
        localStorage.setItem('show_signup_congrats_popup', 'true');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setErrorMsg(res.error || t.authSignupFail || 'Email address already registered. Please login.');
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
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm"
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
          <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-2.5 rounded-full border border-blue-200/50 dark:border-slate-700 shadow-sm flex items-center justify-center h-14 w-14 shrink-0 mb-3">
              <Trophy className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            
            <h1 className="font-black text-2xl tracking-tight leading-none">
              <span className="text-slate-900 dark:text-white">MockTest</span>
              <span className="text-blue-600 dark:text-blue-400 ml-1">Hub</span>
            </h1>
            
            <p className="text-[9px] text-slate-505 dark:text-slate-400 font-bold tracking-widest uppercase mt-1.5 mb-4">
              {language === 'hi' ? 'परीक्षा की तैयारी' : 'Exam Preparation'}
            </p>

            <h2 className="font-extrabold text-xs tracking-wider text-slate-900 dark:text-white mt-1 uppercase">{language === 'hi' ? 'मॉक टेस्ट खाता' : 'MOCK TEST ACCOUNT'}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase mt-0.5">{language === 'hi' ? 'सिंगल साइन-ऑन एक्सेस' : 'Single Sign-On Access'}</p>
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

          {activeTab === 'login' && (
            <div className="flex bg-slate-100 dark:bg-slate-950 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800 mb-5 max-w-[200px]">
              <button
                onClick={() => { setLoginMethod('email'); setErrorMsg(null); setSuccessMsg(null); }}
                type="button"
                className="flex-1 text-center py-1.5 rounded text-[10px] font-extrabold transition-all cursor-pointer uppercase tracking-wider"
                style={{
                  backgroundColor: loginMethod === 'email' ? '#2563eb' : 'transparent',
                  color: loginMethod === 'email' ? '#ffffff' : undefined
                }}
              >
                Email
              </button>
              <button
                onClick={() => { setLoginMethod('phone'); setErrorMsg(null); setSuccessMsg(null); }}
                type="button"
                className="flex-1 text-center py-1.5 rounded text-[10px] font-extrabold transition-all cursor-pointer uppercase tracking-wider"
                style={{
                  backgroundColor: loginMethod === 'phone' ? '#2563eb' : 'transparent',
                  color: loginMethod === 'phone' ? '#ffffff' : undefined
                }}
              >
                Phone (SMS)
              </button>
            </div>
          )}

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
            
            {activeTab === 'login' && loginMethod === 'phone' ? (
              <div className="space-y-4">
                {!verificationId ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                      {language === 'hi' ? 'फोन नंबर' : 'Phone Number'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-550">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneNo}
                        onChange={(e) => setPhoneNo(e.target.value.replace(/[^\d+]/g, ''))}
                        placeholder="e.g. +919123456789"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
                      />
                    </div>
                    <button
                      onClick={handleSendPhoneOtp}
                      disabled={phoneLoading}
                      type="button"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all shadow-md shadow-blue-900/20 mt-4 cursor-pointer disabled:opacity-50"
                    >
                      {phoneLoading ? 'Sending...' : (language === 'hi' ? 'सत्यापन कोड प्राप्त करें' : 'Send Verification OTP')}
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                      {language === 'hi' ? 'सत्यापन कोड (OTP)' : 'Verification Code (OTP)'}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456"
                      className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 text-sm font-bold tracking-widest text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-650 dark:focus:border-blue-500 transition-all"
                    />
                    
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => { setVerificationId(null); setErrorMsg(null); setSuccessMsg(null); }}
                        type="button"
                        className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                      >
                        {language === 'hi' ? 'पीछे' : 'Back'}
                      </button>
                      <button
                        onClick={handleVerifyPhoneOtp}
                        disabled={phoneLoading}
                        type="button"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all shadow-md shadow-blue-900/20 cursor-pointer disabled:opacity-50"
                      >
                        {phoneLoading ? 'Verifying...' : (language === 'hi' ? 'सत्यापित करें और लॉगिन करें' : 'Verify & Login')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
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
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-550">
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
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-550 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {activeTab === 'login' && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email); // prepopulate if they already typed email
                        setResetStep(1);
                        setShowResetModal(true);
                        setResetError(null);
                        setResetSuccess(null);
                      }}
                      className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold hover:underline uppercase tracking-wide cursor-pointer"
                    >
                      {language === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-900/25 active:scale-[0.98] mt-6 cursor-pointer"
                >
                  {activeTab === 'login' 
                    ? (language === 'hi' ? 'खाते में साइन इन करें' : 'Sign In to Account') 
                    : (language === 'hi' ? 'खाता पंजीकृत करें' : 'Register Account')}
                </button>
              </>
            )}

          </form>

          {/* Quick instructions */}
          {activeTab === 'signup' && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center border-t border-slate-200 dark:border-slate-800/80 pt-4 mt-6">
              <p>{language === 'hi' ? 'पूर्ण मॉक टेस्ट इतिहास ट्रैकिंग के साथ एक नया सत्र प्रोफ़ाइल बनाने के लिए साइन अप करें।' : 'Sign up to create a new session profile with full mock test history tracking.'}</p>
            </div>
          )}

        </div>

      </div>

      {/* Password Reset Modal Overlay */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-slate-800 dark:text-white">
            
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 text-sm font-bold bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full h-8 w-8 flex items-center justify-center cursor-pointer border border-slate-250 dark:border-slate-700"
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
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-650 dark:text-red-400 flex items-start gap-2 text-[10px] mb-4">
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

            <div className="flex bg-slate-100 dark:bg-slate-950 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800 mb-4 max-w-[200px]">
              <button
                onClick={() => { setResetMethod('email'); setResetError(null); setResetSuccess(null); setResetStep(1); }}
                type="button"
                className="flex-1 text-center py-1 rounded text-[9px] font-extrabold transition-all cursor-pointer uppercase tracking-wider"
                style={{
                  backgroundColor: resetMethod === 'email' ? '#2563eb' : 'transparent',
                  color: resetMethod === 'email' ? '#ffffff' : undefined
                }}
              >
                Email
              </button>
              <button
                onClick={() => { setResetMethod('phone'); setResetError(null); setResetSuccess(null); setResetStep(1); }}
                type="button"
                className="flex-1 text-center py-1 rounded text-[9px] font-extrabold transition-all cursor-pointer uppercase tracking-wider"
                style={{
                  backgroundColor: resetMethod === 'phone' ? '#2563eb' : 'transparent',
                  color: resetMethod === 'phone' ? '#ffffff' : undefined
                }}
              >
                Phone (SMS)
              </button>
            </div>

            {resetMethod === 'email' ? (
              <>
                {resetStep === 1 ? (
                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      {language === 'hi' 
                        ? 'अपना पंजीकृत ईमेल दर्ज करें। हम आपको पासवर्ड बदलने के लिए एक 6-अंकीय सत्यापन कोड (OTP) भेजेंगे।' 
                        : 'Enter your registered email address. We will send you a 6-digit verification code (OTP) to reset your password.'}
                    </p>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                        {t.authEmail}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Mail className="h-4 w-4" />
                        </div>
                        <input
                          type="email"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
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
                        className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 text-sm font-bold tracking-widest text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                        {language === 'hi' ? 'नया पासवर्ड' : 'New Password'}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-550">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          type={showResetPassword ? "text" : "password"}
                          required
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          placeholder="At least 4 characters"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-550 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
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
              </>
            ) : (
              <>
                {resetStep === 1 ? (
                  <form onSubmit={handleRequestPhoneReset} className="space-y-4">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      {language === 'hi' 
                        ? 'अपना पंजीकृत फोन नंबर दर्ज करें। हम आपको पासवर्ड बदलने के लिए एक 6-अंकीय सत्यापन कोड (OTP) भेजेंगे।' 
                        : 'Enter your registered phone number. We will send you a 6-digit verification code (OTP) to reset your password.'}
                    </p>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                        {language === 'hi' ? 'फोन नंबर' : 'Phone Number'}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-550">
                          <Phone className="h-4 w-4" />
                        </div>
                        <input
                          type="tel"
                          required
                          value={resetPhone}
                          onChange={(e) => setResetPhone(e.target.value.replace(/[^\d+]/g, ''))}
                          placeholder="e.g. +919123456789"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
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
                  <form onSubmit={handleConfirmPhoneReset} className="space-y-4">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      {language === 'hi' 
                        ? 'कृपया अपने फोन पर प्राप्त 6-अंकीय सत्यापन कोड (OTP) और अपना नया पासवर्ड दर्ज करें।' 
                        : 'Please enter the 6-digit verification code (OTP) sent to your phone and choose a new password.'}
                    </p>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                        {language === 'hi' ? 'सत्यापन कोड (OTP)' : 'Verification Code (OTP)'}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={resetPhoneCode}
                        onChange={(e) => setResetPhoneCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 583921"
                        className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 text-sm font-bold tracking-widest text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-650 dark:focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                        {language === 'hi' ? 'नया पासवर्ड' : 'New Password'}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-550">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          type={showResetPassword ? "text" : "password"}
                          required
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          placeholder="At least 4 characters"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-550 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
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
              </>
            )}

          </div>
        </div>
      )}

      {/* Invisible Recaptcha container for Phone Auth */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
