"use client";

import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, User, AlertCircle, CheckCircle2, ChevronLeft, ShieldCheck, Phone, Gift, Sun, Moon } from 'lucide-react';

export default function AuthPage() {
  const { login, signup, theme, toggleTheme } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  
  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (activeTab === 'login') {
      const ok = login(email);
      if (ok) {
        setSuccessMsg('Successfully logged in! Redirecting...');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setErrorMsg('Invalid credentials. Use rahul.sharma@example.com or sign up.');
      }
    } else {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (!mobile.trim()) {
        setErrorMsg('Please enter your mobile number.');
        return;
      }
      if (!/^\d{10}$/.test(mobile.trim())) {
        setErrorMsg('Please enter a valid 10-digit mobile number.');
        return;
      }
      
      const ok = signup(name, email, mobile.trim(), referralCodeInput.trim() || undefined);
      if (ok) {
        setSuccessMsg('Account registered successfully! Redirecting...');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setErrorMsg('Email address already registered. Please login.');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 p-6 relative overflow-hidden transition-colors duration-200">
      
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          onClick={toggleTheme}
          type="button"
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
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
          <ChevronLeft className="h-4 w-4" /> Back to Home
        </Link>

        {/* Auth Card Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-2xl p-8 overflow-hidden backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
          
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 mb-3">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h2 className="font-extrabold text-xl tracking-wider text-slate-900 dark:text-white">MOCK TEST ACCOUNT</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-widest uppercase mt-1">Single Sign-On Access</p>
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
              Sign In
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
              Sign Up
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
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
                />
              </div>
            </div>

            {activeTab === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Mobile Number</label>
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
                    placeholder="10-digit number"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
                  />
                </div>
              </div>
            )}

            {activeTab === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Referral Code (Optional)</label>
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
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-900/25 active:scale-[0.98] mt-6 cursor-pointer"
            >
              {activeTab === 'login' ? 'Sign In to Account' : 'Register Account'}
            </button>

          </form>

          {/* Quick instructions */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center border-t border-slate-200 dark:border-slate-800/80 pt-4 mt-6">
            {activeTab === 'login' ? (
              <p>Demo Login: <strong className="text-slate-700 dark:text-slate-300">rahul.sharma@example.com</strong></p>
            ) : (
              <p>Sign up to create a new session profile with full mock test history tracking.</p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
