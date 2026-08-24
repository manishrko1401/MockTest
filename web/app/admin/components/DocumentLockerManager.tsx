"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderLock,
  Cloud,
  CloudOff,
  Search,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  ShieldCheck,
  Award,
  FileCheck,
  Info,
  Layers,
  Lock,
  Unlock,
  Eye,
  X,
  FileSpreadsheet,
  Users,
  HardDrive,
  Activity,
  TrendingUp
} from 'lucide-react';

interface LockerDocItem {
  id: string;
  title: string;
  docType: 'PHOTO' | 'SIGNATURE' | 'ADMIT_CARD' | 'APPLICATION_FORM' | 'CERTIFICATE' | 'ID_PROOF' | 'OTHER';
  examName?: string | null;
  year?: number | null;
  driveFileId: string;
  driveFolderId?: string | null;
  driveViewUrl?: string | null;
  driveDownloadUrl?: string | null;
  thumbnailUrl?: string | null;
  mimeType: string;
  fileSizeBytes: number;
  tags?: any;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  userId?: string;
  candidateCode?: string;
  googleDriveEmail?: string;
}

interface LockerUserItem {
  id: string;
  fullName: string;
  email: string;
  profilePhoto?: string | null;
  role: string;
  candidateCode?: string;
  mobile?: string;
  isBlocked?: boolean;
  subscriptionTier: string;
  createdAt: string;
  lastSeen?: string | null;
  lastPlatform?: string | null;
  isLockerConnected: boolean;
  googleDriveEmail?: string | null;
  googleDriveFolderId?: string | null;
  lockerPinSetAt?: string | null;
  hasDriveConnected: boolean;
  hasPinSet: boolean;
  docsCount: number;
  totalSizeBytes: number;
  docTypeSummary: Record<string, number>;
  lastUploadAt?: string | null;
  lockerDocuments: LockerDocItem[];
}

interface LockerStatsResponse {
  totalUsersCount: number;
  connectedUsersCount: number;
  adoptionRate: string;
  pinSetUsersCount: number;
  totalDocsCount: number;
  totalStorageBytes: number;
  totalStorageMB: string;
  docTypeCounts: Record<string, number>;
  topExams: { examName: string; count: number }[];
  recentUploads: LockerDocItem[];
  users: LockerUserItem[];
}

interface DocumentLockerManagerProps {
  showToast: (msg: string) => void;
}

const DOC_TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  ADMIT_CARD: { label: 'Admit Card', icon: Award, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800/40' },
  APPLICATION_FORM: { label: 'Application Form', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800/40' },
  PHOTO: { label: 'Passport Photo', icon: ImageIcon, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/30', border: 'border-pink-200 dark:border-pink-800/40' },
  SIGNATURE: { label: 'Signature', icon: FileCheck, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-800/40' },
  CERTIFICATE: { label: 'Certificate', icon: ShieldCheck, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800/40' },
  ID_PROOF: { label: 'ID Proof', icon: Info, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-200 dark:border-cyan-800/40' },
  OTHER: { label: 'Other File', icon: FolderLock, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-800' },
};

export function DocumentLockerManager({ showToast }: DocumentLockerManagerProps) {
  const [stats, setStats] = useState<LockerStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [driveFilter, setDriveFilter] = useState<'ALL' | 'CONNECTED' | 'NOT_CONNECTED'>('ALL');
  const [docsFilter, setDocsFilter] = useState<'ALL' | 'HAS_DOCS' | 'NO_DOCS'>('ALL');
  const [pinFilter, setPinFilter] = useState<'ALL' | 'PIN_ACTIVE' | 'NO_PIN'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'ROSTER' | 'RECENT_UPLOADS' | 'EXAM_BREAKDOWN'>('ROSTER');

  // Inspector modal state
  const [selectedUserForInspector, setSelectedUserForInspector] = useState<LockerUserItem | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const formatFileSize = (bytes?: number | null): string => {
    if (!bytes || bytes === 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin-get-locker-stats' }),
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      } else {
        showToast(data.error || 'Failed to fetch Document Locker statistics');
      }
    } catch (e: any) {
      console.error('Error loading locker stats:', e);
      showToast('Connection error while fetching locker statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Filtered Users Roster
  const filteredUsers = useMemo(() => {
    if (!stats?.users) return [];
    return stats.users.filter((user) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (user.fullName || '').toLowerCase().includes(q);
        const matchesEmail = (user.email || '').toLowerCase().includes(q);
        const matchesDriveEmail = (user.googleDriveEmail || '').toLowerCase().includes(q);
        const matchesCode = (user.candidateCode || '').toLowerCase().includes(q);
        const matchesExam = user.lockerDocuments?.some((d) => (d.examName || '').toLowerCase().includes(q) || (d.title || '').toLowerCase().includes(q));
        if (!matchesName && !matchesEmail && !matchesDriveEmail && !matchesCode && !matchesExam) {
          return false;
        }
      }

      // 2. Google Drive connection filter
      if (driveFilter === 'CONNECTED' && !user.hasDriveConnected) return false;
      if (driveFilter === 'NOT_CONNECTED' && user.hasDriveConnected) return false;

      // 3. Uploaded docs filter
      if (docsFilter === 'HAS_DOCS' && user.docsCount === 0) return false;
      if (docsFilter === 'NO_DOCS' && user.docsCount > 0) return false;

      // 4. PIN filter
      if (pinFilter === 'PIN_ACTIVE' && !user.hasPinSet) return false;
      if (pinFilter === 'NO_PIN' && user.hasPinSet) return false;

      // 5. Document Type filter
      if (typeFilter !== 'ALL') {
        const countForType = user.docTypeSummary?.[typeFilter] || 0;
        if (countForType === 0) return false;
      }

      return true;
    });
  }, [stats?.users, searchQuery, driveFilter, docsFilter, pinFilter, typeFilter]);

  // Admin disconnect user drive
  const handleAdminDisconnect = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to disconnect Google Drive for ${userName}? The user will need to reconnect their Drive.`)) return;

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin-disconnect-user-locker',
          data: { userId },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Google Drive disconnected for ${userName}`);
        fetchStats();
        if (selectedUserForInspector?.id === userId) {
          setSelectedUserForInspector(null);
        }
      } else {
        showToast(data.error || 'Failed to disconnect user');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message);
    }
  };

  // Admin delete document metadata
  const handleAdminDeleteDoc = async (docId: string, docTitle: string) => {
    if (!confirm(`Are you sure you want to delete document record "${docTitle}"?`)) return;

    setDeletingDocId(docId);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin-delete-locker-doc',
          data: { docId },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Document "${docTitle}" deleted from metadata`);
        fetchStats();
        // Update current inspector modal if open
        if (selectedUserForInspector) {
          setSelectedUserForInspector((prev) => {
            if (!prev) return null;
            const updatedDocs = prev.lockerDocuments.filter((d) => d.id !== docId);
            return {
              ...prev,
              lockerDocuments: updatedDocs,
              docsCount: updatedDocs.length,
              totalSizeBytes: updatedDocs.reduce((sum, d) => sum + (d.fileSizeBytes || 0), 0),
            };
          });
        }
      } else {
        showToast(data.error || 'Failed to delete document');
      }
    } catch (e: any) {
      showToast('Error deleting document: ' + e.message);
    } finally {
      setDeletingDocId(null);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!stats?.users || stats.users.length === 0) {
      showToast('No user locker data to export');
      return;
    }

    const headers = ['Candidate Name', 'Account Email', 'Google Drive Email', 'Drive Connected', 'PIN Active', 'Docs Count', 'Total Storage (KB)', 'Last Upload Date'];
    const rows = stats.users.map((u) => [
      `"${u.fullName || ''}"`,
      `"${u.email || ''}"`,
      `"${u.googleDriveEmail || ''}"`,
      u.hasDriveConnected ? 'YES' : 'NO',
      u.hasPinSet ? 'YES' : 'NO',
      u.docsCount,
      (u.totalSizeBytes / 1024).toFixed(2),
      `"${u.lastUploadAt ? new Date(u.lastUploadAt).toISOString() : ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mocktest_document_locker_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Document Locker CSV Report exported successfully!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12 font-sans">
      
      {/* 1. TOP HEADER & TELEMETRY */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
              <FolderLock className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Document Locker & Google Drive Hub
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800/60 flex items-center gap-1">
                  <Cloud className="h-3 w-3" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Comprehensive overview of student document locker engagement, Google Drive connections, uploaded admit cards, forms, photos, and encrypted vault locks.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh Telemetry'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* 2. CORE KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Google Drive Connected Users */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-blue-500/50 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Connected Users</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Cloud className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats?.connectedUsersCount ?? '—'}
            </span>
            <span className="text-xs font-bold text-slate-400">
              / {stats?.totalUsersCount ?? '—'} candidates
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-md">
              {stats?.adoptionRate ?? '0.0'}% Adoption Rate
            </span>
          </div>
        </div>

        {/* Card 2: Total Files & Documents Uploaded */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-indigo-500/50 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Synced Files</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FolderLock className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats?.totalDocsCount ?? '—'}
            </span>
            <span className="text-xs font-bold text-slate-400">
              items in cloud
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-md">
              Admit cards, forms, proofs
            </span>
          </div>
        </div>

        {/* Card 3: PIN Protected Vaults */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">PIN-Protected Vaults</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Lock className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats?.pinSetUsersCount ?? '—'}
            </span>
            <span className="text-xs font-bold text-slate-400">
              active PIN locks
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-md">
              Encrypted PIN Security
            </span>
          </div>
        </div>

        {/* Card 4: Total Storage Managed */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-purple-500/50 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Synced Size</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
              <HardDrive className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats?.totalStorageMB ?? '0.00'} MB
            </span>
            <span className="text-xs font-bold text-slate-400">
              in Drive storage
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black rounded-md">
              Direct Drive.File Scope
            </span>
          </div>
        </div>

      </div>

      {/* 3. DOCUMENT TYPE BREAKDOWN CARDS */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wide">
              Document Category Distribution
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Total {stats?.totalDocsCount || 0} files categorized
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {Object.entries(DOC_TYPE_META).map(([typeKey, meta]) => {
            const count = stats?.docTypeCounts?.[typeKey] || 0;
            const percentage = stats?.totalDocsCount && stats.totalDocsCount > 0 ? ((count / stats.totalDocsCount) * 100).toFixed(0) : '0';
            const Icon = meta.icon;
            return (
              <div
                key={typeKey}
                onClick={() => setTypeFilter(typeFilter === typeKey ? 'ALL' : typeKey)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  typeFilter === typeKey
                    ? 'ring-2 ring-blue-500 border-transparent bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                    : `${meta.bg} ${meta.border} hover:opacity-90`
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                  <span className="text-[10px] font-black text-slate-400">{percentage}%</span>
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white">{count}</div>
                <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {meta.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SUB-NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('ROSTER')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'ROSTER'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Candidate Locker Roster ({filteredUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('RECENT_UPLOADS')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'RECENT_UPLOADS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Recent Cloud Uploads Stream ({stats?.recentUploads?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('EXAM_BREAKDOWN')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'EXAM_BREAKDOWN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Top Exam Vaults</span>
          </button>
        </div>
      </div>

      {/* 5. TAB 1: CANDIDATE LOCKER ROSTER */}
      {activeSubTab === 'ROSTER' && (
        <div className="space-y-4">
          
          {/* Filter Toolbar */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Search Bar */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search candidate name, email, Drive email, exam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Drive Filter */}
              <div>
                <select
                  value={driveFilter}
                  onChange={(e) => setDriveFilter(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">Drive: All Candidates</option>
                  <option value="CONNECTED">Drive: Connected Only</option>
                  <option value="NOT_CONNECTED">Drive: Not Connected</option>
                </select>
              </div>

              {/* Uploaded Files Filter */}
              <div>
                <select
                  value={docsFilter}
                  onChange={(e) => setDocsFilter(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">Files: All States</option>
                  <option value="HAS_DOCS">Files: Has Uploads (&gt; 0)</option>
                  <option value="NO_DOCS">Files: No Uploads (0)</option>
                </select>
              </div>

              {/* PIN Status Filter */}
              <div>
                <select
                  value={pinFilter}
                  onChange={(e) => setPinFilter(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">PIN: All Statuses</option>
                  <option value="PIN_ACTIVE">PIN: Lock Active</option>
                  <option value="NO_PIN">PIN: Not Set</option>
                </select>
              </div>

            </div>
          </div>

          {/* User Roster Table */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Candidate</th>
                    <th className="py-3.5 px-5">Google Drive Status</th>
                    <th className="py-3.5 px-5">Vault PIN</th>
                    <th className="py-3.5 px-5">Uploaded Files</th>
                    <th className="py-3.5 px-5">Storage Used</th>
                    <th className="py-3.5 px-5">Last Activity</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                        <span>Loading candidate document locker records...</span>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <FolderLock className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                        <p className="font-bold text-slate-600 dark:text-slate-400">No matching candidate locker records found.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Try adjusting your search terms or filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition group"
                      >
                        {/* Candidate Info */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                              {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{user.fullName || 'Candidate'}</span>
                                {user.candidateCode && (
                                  <span className="text-[10px] font-mono font-bold text-slate-400">
                                    #{user.candidateCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Google Drive Status */}
                        <td className="py-4 px-5">
                          {user.hasDriveConnected ? (
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Connected
                              </div>
                              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[180px]">
                                {user.googleDriveEmail || user.email}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-[10px] font-bold text-slate-400">
                              <CloudOff className="h-3 w-3" />
                              Not Connected
                            </span>
                          )}
                        </td>

                        {/* Vault PIN */}
                        <td className="py-4 px-5">
                          {user.hasPinSet ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-[10px] font-black text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40">
                              <Lock className="h-3 w-3" />
                              PIN Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                              <Unlock className="h-3 w-3" />
                              Not Set
                            </span>
                          )}
                        </td>

                        {/* Uploaded Files Count & Badges */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {user.docsCount}
                            </span>
                            <span className="text-[11px] text-slate-400">files</span>
                          </div>
                          {user.docsCount > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 max-w-[200px]">
                              {Object.entries(user.docTypeSummary || {}).map(([typeKey, count]) => {
                                if (count === 0) return null;
                                const meta = DOC_TYPE_META[typeKey] || DOC_TYPE_META.OTHER;
                                return (
                                  <span
                                    key={typeKey}
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${meta.bg} ${meta.color}`}
                                    title={`${count} ${meta.label}`}
                                  >
                                    {count} {meta.label.split(' ')[0]}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* Storage Used */}
                        <td className="py-4 px-5 font-bold text-slate-700 dark:text-slate-300">
                          {formatFileSize(user.totalSizeBytes)}
                        </td>

                        {/* Last Activity */}
                        <td className="py-4 px-5 text-[11px] text-slate-400">
                          {user.lastUploadAt ? formatDate(user.lastUploadAt) : 'Never uploaded'}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedUserForInspector(user)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Inspect uploaded files"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Inspect ({user.docsCount})</span>
                            </button>

                            {user.hasDriveConnected && (
                              <button
                                onClick={() => handleAdminDisconnect(user.id, user.fullName)}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                                title="Disconnect Google Drive"
                              >
                                <CloudOff className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 6. TAB 2: RECENT CLOUD UPLOADS STREAM */}
      {activeSubTab === 'RECENT_UPLOADS' && (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Live Upload Activity Stream
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time feed of the last 50 documents synchronized to Google Drive by candidates.
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {stats?.recentUploads?.length || 0} Total Records
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {!stats?.recentUploads || stats.recentUploads.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FolderLock className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="font-bold">No uploaded documents recorded yet.</p>
              </div>
            ) : (
              stats.recentUploads.map((doc) => {
                const meta = DOC_TYPE_META[doc.docType] || DOC_TYPE_META.OTHER;
                const Icon = meta.icon;
                return (
                  <div
                    key={doc.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 p-3 rounded-xl transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${meta.bg} ${meta.border} border`}>
                        <Icon className={`h-5 w-5 ${meta.color}`} />
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{doc.title}</span>
                          <span className={`px-2 py-0.2 text-[9px] font-black rounded-md ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                          <span>Candidate: <strong className="text-slate-600 dark:text-slate-300">{doc.userName}</strong> ({doc.userEmail})</span>
                          {doc.examName && <span>• Exam: <strong className="text-slate-600 dark:text-slate-300">{doc.examName}</strong></span>}
                          {doc.year && <span>• Year: <strong>{doc.year}</strong></span>}
                          <span>• Size: <strong>{formatFileSize(doc.fileSizeBytes)}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <div className="text-right text-[10px] text-slate-400">
                        {formatDate(doc.createdAt)}
                      </div>

                      {doc.driveViewUrl && (
                        <a
                          href={doc.driveViewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-slate-100 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-950/40 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-lg transition"
                          title="Open in Google Drive"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}

                      <button
                        onClick={() => handleAdminDeleteDoc(doc.id, doc.title)}
                        disabled={deletingDocId === doc.id}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer disabled:opacity-50"
                        title="Delete Document Record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 7. TAB 3: TOP EXAM BREAKDOWN */}
      {activeSubTab === 'EXAM_BREAKDOWN' && (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Most Tracked Exam Document Vaults
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Exams for which students are actively saving admit cards, application forms, and hall tickets.
            </p>
          </div>

          {!stats?.topExams || stats.topExams.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Award className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="font-bold">No exam tags associated with uploaded documents yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.topExams.map((item, idx) => (
                <div
                  key={item.examName}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white">{item.examName}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Exam Vault</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-lg border border-indigo-200 dark:border-indigo-800/40">
                    {item.count} docs
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. DOCUMENT INSPECTOR MODAL */}
      {selectedUserForInspector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  {selectedUserForInspector.fullName ? selectedUserForInspector.fullName[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedUserForInspector.fullName}</span>
                    {selectedUserForInspector.candidateCode && (
                      <span className="text-xs text-slate-400 font-mono font-bold">
                        #{selectedUserForInspector.candidateCode}
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>{selectedUserForInspector.email}</span>
                    <span>•</span>
                    <span className="text-blue-500 font-medium">Drive: {selectedUserForInspector.googleDriveEmail || 'Not Connected'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserForInspector(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Summary Pill Bar */}
            <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-4">
                <span>Total Files: <strong className="text-slate-900 dark:text-white">{selectedUserForInspector.docsCount}</strong></span>
                <span>Storage: <strong className="text-slate-900 dark:text-white">{formatFileSize(selectedUserForInspector.totalSizeBytes)}</strong></span>
                <span>PIN Status: <strong className={selectedUserForInspector.hasPinSet ? 'text-emerald-500' : 'text-slate-400'}>{selectedUserForInspector.hasPinSet ? '🔒 Active' : '🔓 Not Set'}</strong></span>
              </div>

              {selectedUserForInspector.hasDriveConnected && (
                <button
                  onClick={() => handleAdminDisconnect(selectedUserForInspector.id, selectedUserForInspector.fullName)}
                  className="text-red-500 hover:text-red-600 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <CloudOff className="h-3 w-3" />
                  Disconnect Drive
                </button>
              )}
            </div>

            {/* Modal Body - Documents List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {selectedUserForInspector.lockerDocuments.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FolderLock className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">No documents uploaded by this candidate yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Files uploaded via web or mobile locker will show up here.</p>
                </div>
              ) : (
                selectedUserForInspector.lockerDocuments.map((doc) => {
                  const meta = DOC_TYPE_META[doc.docType] || DOC_TYPE_META.OTHER;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-blue-500/40 transition flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`p-2.5 rounded-xl shrink-0 ${meta.bg} ${meta.border} border`}>
                          <Icon className={`h-5 w-5 ${meta.color}`} />
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{doc.title}</span>
                            <span className={`px-2 py-0.2 text-[9px] font-black rounded-md ${meta.bg} ${meta.color}`}>
                              {meta.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                            {doc.examName && <span>Exam: <strong className="text-slate-600 dark:text-slate-300">{doc.examName}</strong></span>}
                            {doc.year && <span>• Year: {doc.year}</span>}
                            <span>• Size: {formatFileSize(doc.fileSizeBytes)}</span>
                            <span>• Synced: {formatDate(doc.createdAt)}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                            Drive ID: {doc.driveFileId}
                          </div>
                        </div>
                      </div>

                      {/* Doc Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {doc.driveViewUrl && (
                          <a
                            href={doc.driveViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold transition flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>View</span>
                          </a>
                        )}

                        <button
                          onClick={() => handleAdminDeleteDoc(doc.id, doc.title)}
                          disabled={deletingDocId === doc.id}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer disabled:opacity-50"
                          title="Delete metadata"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setSelectedUserForInspector(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
