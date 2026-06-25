"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, Calendar, AlertCircle, CheckCircle2, ChevronRight, LayoutDashboard, LogOut, KeyRound, Gift, Phone, Sun, Moon } from 'lucide-react';

export default function StudentProfilePage() {
  const { currentUser, updateProfile, updatePassword, logout, theme, toggleTheme } = useAuth();
  const router = useRouter();

  // Input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [mounted, setMounted] = useState(false);

  // Sync input values and set client-only mount flag
  useEffect(() => {
    setMounted(true);
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setMobile(currentUser.mobile || '');
    }
  }, [currentUser]);

  // Toast status states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const triggerToast = (type: 'success' | 'error', msg: string) => {
    setErrorMsg(type === 'error' ? msg : null);
    setSuccessMsg(type === 'success' ? msg : null);
    setTimeout(() => {
      setErrorMsg(null);
      setSuccessMsg(null);
    }, 3000);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !mobile.trim()) {
      triggerToast('error', 'Fields cannot be empty.');
      return;
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      triggerToast('error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    updateProfile(name, email, mobile.trim());
    triggerToast('success', 'Profile details updated successfully!');
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      triggerToast('error', 'Password fields cannot be empty.');
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast('error', 'New passwords do not match.');
      return;
    }
    
    const ok = updatePassword(oldPassword, newPassword);
    if (ok) {
      triggerToast('success', 'Account password successfully updated!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      triggerToast('error', 'Old password verify check failed.');
    }
  };

  const handleSignOut = () => {
    logout();
    router.push('/auth');
  };

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">
        <div className="text-center p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl max-w-sm shadow-xl">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider mb-2">Authentication Required</h3>
          <p className="text-slate-550 dark:text-slate-400 text-xs leading-relaxed mb-6">Please log in to your account to view and manage your profile details.</p>
          <Link href="/auth" className="inline-block bg-blue-600 hover:bg-blue-750 text-white font-bold py-2.5 px-6 rounded-lg text-xs tracking-wider uppercase transition-all shadow-lg active:scale-95">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 font-sans min-h-screen text-slate-850 dark:text-slate-100 select-none pb-12 transition-colors duration-200">
      
      {/* Dynamic Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-2 text-slate-700 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-bold text-sm tracking-wide transition-colors">
          <ChevronRight className="h-4 w-4 rotate-180" /> Back to Home
        </Link>
        
        <div className="flex items-center gap-4">
          {currentUser.role === 'ADMIN' && (
            <Link href="/admin" className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 dark:text-white">
              <LayoutDashboard className="h-3.5 w-3.5 text-blue-500" /> Admin Dashboard
            </Link>
          )}

          {/* Theme switcher */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-850"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 bg-red-100/50 dark:bg-red-950/20 border border-red-300 dark:border-red-900/40 hover:bg-red-200 dark:hover:bg-red-950/40 text-red-650 dark:text-red-400 hover:text-red-650 dark:hover:text-red-300 transition-all px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Log Out
          </button>
        </div>
      </header>

      {/* Main page content area */}
      <div className="max-w-6xl w-full mx-auto px-6 mt-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Summary Card */}
        <aside className="w-full lg:w-80 flex flex-col gap-6">
          
          {/* User profile recap */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl text-center shadow-sm relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center border border-blue-200 dark:border-blue-800/60 mb-4 text-2xl font-bold">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{currentUser.name}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">Candidate Code: {currentUser.candidateCode}</p>
            <p className="text-xs text-slate-650 dark:text-slate-450 mt-2 truncate">{currentUser.email}</p>

            <div className="border-t border-slate-150 dark:border-slate-850 mt-5 pt-5 text-left space-y-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-650 dark:text-slate-400">
                <span className="text-slate-550 dark:text-slate-500 font-bold">System Role</span>
                <span className="bg-blue-100 border border-blue-300 text-blue-750 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  {currentUser.role}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs font-bold text-slate-650 dark:text-slate-400">
                <span className="text-slate-550 dark:text-slate-500 font-bold">Pass Subscription</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  currentUser.subscriptionTier === 'Testbook Pass Pro'
                    ? 'bg-yellow-105/50 border-yellow-300 text-yellow-750 dark:bg-yellow-950/40 dark:border-yellow-700 dark:text-yellow-400'
                    : currentUser.subscriptionTier === 'Testbook Pass'
                    ? 'bg-green-105/50 border-green-300 text-green-750 dark:bg-green-950/40 dark:border-green-700 dark:text-green-400'
                    : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-500'
                }`}>
                  {currentUser.subscriptionTier === 'None' ? 'No Pass' : currentUser.subscriptionTier}
                </span>
              </div>

              {currentUser.subscriptionPurchasedAt && (
                <div className="flex items-center justify-between text-xs font-bold text-slate-655 dark:text-slate-400">
                  <span className="text-slate-550 dark:text-slate-500 font-bold">Pass Purchased</span>
                  <span className="text-slate-800 dark:text-slate-300 font-mono text-[11px]">{currentUser.subscriptionPurchasedAt}</span>
                </div>
              )}

              {currentUser.subscriptionExpiresAt && (
                <div className="flex items-center justify-between text-xs font-bold text-slate-655 dark:text-slate-400">
                  <span className="text-slate-550 dark:text-slate-500 font-bold">Pass Expires</span>
                  <span className="text-slate-800 dark:text-slate-300 font-mono text-[11px]">{currentUser.subscriptionExpiresAt}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-bold text-slate-655 dark:text-slate-400">
                <span className="text-slate-550 dark:text-slate-500 font-bold">Registered On</span>
                <span className="text-slate-800 dark:text-slate-300 font-mono text-[11px] flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  {currentUser.registeredDate}
                </span>
              </div>

              {/* Referral Details block */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-3.5 rounded-xl mt-4">
                <p className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                  <Gift className="h-3 w-3 text-yellow-600 dark:text-yellow-500" /> Share Referral Code
                </p>
                <div className="flex items-center justify-between gap-2 mt-1.5 bg-white dark:bg-slate-950 px-2.5 py-1.5 rounded border border-slate-250 dark:border-slate-800 font-mono text-[11px] text-slate-850 dark:text-white">
                  <span className="font-bold select-all">{currentUser.referralCode}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(currentUser.referralCode);
                      alert("Referral code copied to clipboard!");
                    }}
                    className="text-[9px] text-blue-650 dark:text-blue-400 font-bold hover:underline select-none cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-2.5 text-slate-500 dark:text-slate-400">
                  <span>Successful Invites:</span>
                  <span className="font-bold text-blue-750 bg-blue-100 dark:text-white dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-300 dark:border-blue-900">{currentUser.referralsCount}</span>
                </div>
                {currentUser.referredBy && (
                  <div className="text-[9px] text-slate-500 mt-2">
                    Referred by: <span className="font-mono text-slate-600 dark:text-slate-400">{currentUser.referredBy}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </aside>

        {/* Right Side: Account Settings Grid */}
        <main className="flex-1 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card 1: Profile Details Form */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-xs text-slate-850 dark:text-white uppercase tracking-wider border-b border-slate-150 dark:border-slate-850 pb-4 mb-6 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" /> Manage Profile Details
                </h3>
                
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Candidate Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Registered Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Mobile Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-550">
                        <Phone className="h-3.5 w-3.5" />
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-digit phone"
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-150 dark:border-slate-850 flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs transition-all shadow-lg shadow-blue-900/20 active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Save Profile Details
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Card 2: Password Update Form */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-xs text-slate-850 dark:text-white uppercase tracking-wider border-b border-slate-150 dark:border-slate-850 pb-4 mb-6 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-500" /> Change Security Password
                </h3>
                
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Current Password</label>
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-bold"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-150 dark:border-slate-850 flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs transition-all shadow-lg shadow-blue-900/20 active:scale-95 cursor-pointer"
                    >
                      <KeyRound className="h-4 w-4" /> Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>

          </div>

        </main>
      </div>

      {/* Toast Alert popup */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-green-800 text-green-400 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-red-800 text-red-400 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom duration-300">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

    </div>
  );
}
