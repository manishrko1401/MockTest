"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, MockUser } from '../../../AuthContext';
import { ArrowLeft, User, Mail, Phone, Calendar, Coins, Award, Trash2, ShieldAlert, CheckCircle, Save, Key, UserCheck } from 'lucide-react';

const formatTime = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  // Safe Next.js 13/14/15 compatible param resolution
  const resolvedParams = React.use ? React.use(params) : (params as any);
  const userId = resolvedParams.id;

  const { currentUser, resetAttempt } = useAuth();
  
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Edit profile states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editReferralCode, setEditReferralCode] = useState('');
  const [editReferredBy, setEditReferredBy] = useState('');
  const [editReferralsCount, setEditReferralsCount] = useState(0);
  const [editRole, setEditRole] = useState<MockUser['role']>('STUDENT');
  const [editTier, setEditTier] = useState<MockUser['subscriptionTier']>('None');
  const [editPurchasedAt, setEditPurchasedAt] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsBlocked, setEditIsBlocked] = useState(false);
  const [editCoins, setEditCoins] = useState(0);

  // Reset confirmation state
  const [resetTargetSessionId, setResetTargetSessionId] = useState<string | null>(null);

  // Custom password authorization modal states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-user-details',
          data: { userId }
        })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        
        // Populate edit state
        setEditName(data.user.name || '');
        setEditEmail(data.user.email || '');
        setEditMobile(data.user.mobile || '');
        setEditReferralCode(data.user.referralCode || '');
        setEditReferredBy(data.user.referredBy || '');
        setEditReferralsCount(data.user.referralsCount || 0);
        setEditRole(data.user.role || 'STUDENT');
        setEditTier(data.user.subscriptionTier || 'None');
        setEditPurchasedAt(data.user.subscriptionPurchasedAt ? data.user.subscriptionPurchasedAt.split('T')[0] : '');
        setEditExpiry(data.user.subscriptionExpiresAt ? data.user.subscriptionExpiresAt.split('T')[0] : '');
        setEditPassword(data.user.password || '');
        setEditIsBlocked(data.user.isBlocked || false);
        setEditCoins(data.user.coins || 0);
      } else {
        setError(data.error || 'Failed to fetch user details');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPasswordModalOpen(true);
    setAdminPasswordInput('');
    setPasswordError(null);
  };

  const submitSaveProfile = async () => {
    if (!adminPasswordInput.trim()) {
      setPasswordError("Password is required to verify changes.");
      return;
    }

    setSaving(true);
    setPasswordError(null);
    setSaveStatus(null);

    const expiry = editTier === 'None' ? null : (editExpiry || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]);
    const purchasedAt = editTier === 'None' ? null : (editPurchasedAt || new Date().toISOString().split('T')[0]);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-profile-admin',
          data: {
            userId,
            name: editName,
            email: editEmail,
            mobile: editMobile.trim(),
            referralCode: editReferralCode.trim(),
            referredBy: editReferredBy.trim() || null,
            referralsCount: Number(editReferralsCount),
            role: editRole,
            tier: editTier,
            purchasedAt,
            expiry,
            password: editPassword,
            isBlocked: editIsBlocked,
            coins: Number(editCoins),
            adminConfirmPassword: adminPasswordInput.trim()
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus({ type: 'success', message: 'User profile updated successfully!' });
        setIsPasswordModalOpen(false);
        fetchUserDetails();
      } else {
        setPasswordError(data.error || 'Failed to save profile. Check admin password.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'An error occurred while saving profile');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAttemptClick = async (sessionId: string) => {
    try {
      await resetAttempt(userId, sessionId);
      setResetTargetSessionId(null);
      fetchUserDetails();
    } catch (err) {
      console.error(err);
    }
  };

  // Auth Guard
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-200/90 dark:bg-slate-900 p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4 animate-bounce" />
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
          This tab contains administrative controls. Please login with an administrator account to view details.
        </p>
        <Link 
          href="/" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg text-xs transition"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-200/90 dark:bg-slate-900 p-6">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading user dossier...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-200/90 dark:bg-slate-900 p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">User Dossier Error</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
          {error || 'The requested user could not be retrieved.'}
        </p>
        <button 
          onClick={() => window.close()}
          className="bg-slate-200 hover:bg-slate-350 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold py-2 px-6 rounded-lg text-xs transition"
        >
          Close Tab
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200/90 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => window.close()}
            className="flex items-center gap-2 text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold text-xs transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Close Tab
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Dossier ID: {user.id}
            </span>
          </div>
        </div>

        {/* User Dashboard Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-extrabold">{user.name}</h1>
              {user.isBlocked && (
                <span className="bg-red-500/20 border border-red-400/30 text-red-200 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Blocked
                </span>
              )}
            </div>
            <p className="text-xs text-blue-100">{user.email} &bull; Hub ID: <span className="font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded">{user.candidateCode || 'None'}</span></p>
            <p className="text-[10px] text-indigo-155">Registered on: {user.registeredDate}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 text-center">
              <p className="text-[10px] text-indigo-150 font-bold uppercase tracking-wider">Wallet Balance</p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <Coins className="h-4 w-4 text-amber-300" />
                <span className="font-black text-sm">{user.coins || 0}</span>
              </div>
            </div>
            <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 text-center">
              <p className="text-[10px] text-indigo-150 font-bold uppercase tracking-wider">Sittings Taken</p>
              <span className="font-black text-sm mt-0.5 block">{user.testSessions.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left/Middle Column: Edit Profile */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-808 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <UserCheck className="h-5 w-5 text-blue-500" />
                <h2 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Modify Profile Dossier</h2>
              </div>

              {saveStatus && (
                <div className={`p-4 rounded-xl mb-4 text-xs font-bold flex items-center gap-2 border ${
                  saveStatus.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-955/20 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400' 
                    : 'bg-red-50 dark:bg-red-955/20 border-red-200 dark:border-red-808/40 text-red-650 dark:text-red-400'
                }`}>
                  {saveStatus.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
                  {saveStatus.message}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Full Name (Read-Only)</label>
                    <input
                      type="text"
                      readOnly
                      value={editName}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address (Read-Only)</label>
                    <input
                      type="email"
                      readOnly
                      value={editEmail}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Mobile Number (Read-Only)</label>
                    <input
                      type="text"
                      readOnly
                      value={editMobile}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Referral Code</label>
                    <input
                      type="text"
                      required
                      value={editReferralCode}
                      onChange={(e) => setEditReferralCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Referred By (Code)</label>
                    <input
                      type="text"
                      value={editReferredBy}
                      onChange={(e) => setEditReferredBy(e.target.value.toUpperCase())}
                      placeholder="None"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Referrals Count</label>
                    <input
                      type="number"
                      required
                      value={editReferralsCount}
                      onChange={(e) => setEditReferralsCount(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">System Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="STUDENT">Student / User</option>
                      <option value="TEST_CREATOR">Test Creator</option>
                      <option value="SUPPORT_TEAM">Support Team</option>
                      <option value="NOTICES_MANAGER">Notices & Update Manager</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Wallet Coins</label>
                    <input
                      type="number"
                      required
                      value={editCoins}
                      onChange={(e) => setEditCoins(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Subscription Pass</label>
                    <select
                      value={editTier}
                      onChange={(e) => setEditTier(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="None">No Pass</option>
                      <option value="Testbook Pass">Mock Test Pass</option>
                      <option value="Testbook Pass Pro">Mock Test Pass Pro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Account Password (Read-Only)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-450">
                        <Key className="h-3.5 w-3.5" />
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={editPassword}
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-808 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {editTier !== 'None' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/30 dark:bg-blue-955/5 p-4 rounded-xl border border-blue-100 dark:border-blue-950/20">
                    <div>
                      <label className="block text-[10px] font-extrabold text-blue-650 dark:text-blue-400 uppercase tracking-wider mb-2">Pass Purchased Date</label>
                      <input
                        type="date"
                        value={editPurchasedAt}
                        onChange={(e) => setEditPurchasedAt(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-blue-650 dark:text-blue-400 uppercase tracking-wider mb-2">Pass Expiry Date</label>
                      <input
                        type="date"
                        value={editExpiry}
                        onChange={(e) => setEditExpiry(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Block user flag */}
                <div className="flex items-center gap-2 bg-red-50/20 dark:bg-red-955/5 p-4 rounded-xl border border-red-100 dark:border-red-950/20">
                  <input
                    type="checkbox"
                    id="blockedCheckbox"
                    checked={editIsBlocked}
                    onChange={(e) => setEditIsBlocked(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-350 text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                  <label htmlFor="blockedCheckbox" className="text-xs font-bold text-red-650 dark:text-red-400 select-none cursor-pointer">
                    Block this user account (blocks access to mobile and web panels immediately)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-808">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:scale-100"
                  >
                    {saving ? (
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Dossier Changes
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Key Details Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-808 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Award className="h-5 w-5 text-indigo-500" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Access Rights</h3>
              </div>
              
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
                  <span className="font-medium text-slate-500">System Permission:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    user.role === 'ADMIN' 
                      ? 'bg-red-50 dark:bg-red-955/40 text-red-700 dark:text-red-400' 
                      : user.role === 'TEST_CREATOR' 
                      ? 'bg-purple-50 dark:bg-purple-955/40 text-purple-700 dark:text-purple-400' 
                      : user.role === 'SUPPORT_TEAM' 
                      ? 'bg-green-50 dark:bg-green-955/40 text-green-700 dark:text-green-400' 
                      : user.role === 'NOTICES_MANAGER' 
                      ? 'bg-amber-50 dark:bg-amber-955/40 text-amber-700 dark:text-amber-400' 
                      : 'bg-blue-50 dark:bg-blue-955/40 text-blue-755'
                  }`}>
                    {user.role}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
                  <span className="font-medium text-slate-500">Subscription Pass:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                    user.subscriptionTier === 'Testbook Pass Pro'
                      ? 'bg-yellow-50 dark:bg-yellow-955/40 text-yellow-750 font-black'
                      : user.subscriptionTier === 'Testbook Pass'
                      ? 'bg-green-50 dark:bg-green-955/40 text-green-700'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                  }`}>
                    {user.subscriptionTier === 'None' ? 'No Pass' : user.subscriptionTier.replace('Testbook', 'Mock Test')}
                  </span>
                </div>

                {user.subscriptionTier !== 'None' && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
                      <span className="font-medium text-slate-500">Purchased Date:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{user.subscriptionPurchasedAt?.split('T')[0] || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
                      <span className="font-medium text-slate-500">Expires Date:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{user.subscriptionExpiresAt?.split('T')[0] || 'N/A'}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-slate-500">Total Referrals:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{user.referralsCount || 0} user(s)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Width Bottom Panel: Exam Sitting History */}
        <div className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-808 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-extrabold text-sm text-slate-905 dark:text-white uppercase tracking-wider">Exam Sitting History</h3>
            <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-808 font-bold">
              {user.testSessions.length} sessions logged
            </span>
          </div>
          
          {user.testSessions.length > 0 ? (
            <div className="space-y-4">
              {user.testSessions.map((session: any) => {
                const isCompleted = session.status === 'COMPLETED' || session.status === 'AUTO_SUBMITTED';
                const answersSubmitted = Object.keys(session.responses || {}).length;
                const scorePercent = session.maxScore > 0 ? ((session.score / session.maxScore) * 100).toFixed(1) : '0';
                
                const timeTakenSeconds = (() => {
                  if (session.responses && Object.keys(session.responses).length > 0) {
                    const total = Object.values(session.responses).reduce(
                      (sum: number, r: any) => sum + ((r as any).elapsedSeconds ?? 0), 0
                    ) as number;
                    if (total > 0) return total;
                  }
                  if (session.durationSeconds && session.durationSeconds > 0) {
                    return session.durationSeconds;
                  }
                  return 0;
                })();
                
                const timeSpentStr = formatTime(timeTakenSeconds);
                
                return (
                  <div 
                    key={session.id} 
                    className="border border-slate-200 dark:border-slate-808 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-900/10 hover:border-slate-350 dark:hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-xs text-slate-900 dark:text-white">{session.title}</p>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            isCompleted 
                              ? 'bg-green-50 dark:bg-green-955/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/40' 
                              : 'bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-400 border border-amber-105'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">Sitting Date: {session.date} &bull; ID: <span className="font-mono text-[9px]">{session.id}</span></p>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap text-xs">
                        <div className="text-center bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-808 min-w-[70px]">
                          <p className="text-[9px] text-slate-400 font-extrabold uppercase">Score</p>
                          <p className="font-black text-slate-850 dark:text-white mt-0.5">{session.score} / {session.maxScore}</p>
                        </div>
                        
                        <div className="text-center bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-808 min-w-[70px]">
                          <p className="text-[9px] text-slate-400 font-extrabold uppercase">Percent</p>
                          <p className="font-black text-blue-600 mt-0.5">{scorePercent}%</p>
                        </div>

                        <div className="text-center bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-808 min-w-[70px]">
                          <p className="text-[9px] text-slate-400 font-extrabold uppercase">Accuracy</p>
                          <p className="font-black text-indigo-500 mt-0.5">{session.accuracy.toFixed(1)}%</p>
                        </div>

                        <div className="text-center bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-808 min-w-[70px]">
                          <p className="text-[9px] text-slate-400 font-extrabold uppercase">Duration</p>
                          <p className="font-black text-slate-850 dark:text-white mt-0.5">{timeSpentStr} / {session.durationMinutes} min</p>
                        </div>

                        <div className="text-center bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-808 min-w-[70px]">
                          <p className="text-[9px] text-slate-400 font-extrabold uppercase">Violations</p>
                          <p className={`font-black mt-0.5 ${session.violations > 0 ? 'text-red-500' : 'text-slate-850 dark:text-white'}`}>
                            {session.violations}
                          </p>
                        </div>

                        <div className="text-center bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-808 min-w-[70px]">
                          <p className="text-[9px] text-slate-400 font-extrabold uppercase">Answers</p>
                          <p className="font-black text-slate-850 dark:text-white mt-0.5">{answersSubmitted}</p>
                        </div>

                        <div className="pl-2 border-l border-slate-200 dark:border-slate-800">
                          {resetTargetSessionId === session.id ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                              <button 
                                onClick={() => handleResetAttemptClick(session.id)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1.5 rounded text-[10px] transition cursor-pointer"
                              >
                                Confirm Reset
                              </button>
                              <button 
                                onClick={() => setResetTargetSessionId(null)}
                                className="bg-slate-250 dark:bg-slate-850 hover:bg-slate-300 text-slate-650 dark:text-slate-350 font-bold px-2 py-1.5 rounded text-[10px] transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setResetTargetSessionId(session.id)}
                              className="flex items-center gap-1 bg-red-50 hover:bg-red-100 dark:bg-red-955/20 dark:hover:bg-red-955/40 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900/30 hover:border-red-300 font-bold px-2.5 py-1.5 rounded text-[10px] transition cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                              Reset Attempt
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50/20 dark:bg-slate-900/5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <Calendar className="h-10 w-10 text-slate-350 mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-bold">No exam sittings registered for this user yet.</p>
            </div>
          )}
        </div>
      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-808 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-300" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Confirm Administration Authorization</h3>
              </div>
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-white hover:text-slate-200 transition cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                You are about to modify the profile dossier for <span className="font-bold text-slate-900 dark:text-white">{editName}</span>. Please verify your administrator credentials to proceed.
              </p>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Administrator Password</label>
                <input 
                  type="password"
                  required
                  placeholder="Enter admin password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 font-mono"
                  autoFocus
                />
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-808/40 text-red-650 dark:text-red-400 rounded-lg text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 border-t border-slate-100 dark:border-slate-808 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-808 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitSaveProfile}
                disabled={saving}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Authorize & Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
