"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Keyboard,
  Search,
  RefreshCw,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Trash2,
  Eye,
  Download,
  Filter,
  ArrowUpDown,
  Clock,
  Zap,
  TrendingUp,
  Target,
  ChevronLeft,
  ChevronRight,
  X,
  Languages,
  Check,
  BarChart2,
  Info,
  ExternalLink
} from 'lucide-react';

interface UserInfo {
  id: string;
  fullName: string;
  email: string;
  candidateCode?: string;
  mobile?: string | null;
}

interface TestInfo {
  id: string;
  title: string;
  titleHi?: string | null;
  categoryId?: string;
  language?: string;
  qualifyingWpm?: number;
  maxErrorPercentage?: number;
  mainDurationMinutes?: number;
}

export interface AdminTypingAttempt {
  id: string;
  userId: string;
  userName: string;
  testId: string;
  testTitle: string;
  categoryName?: string;
  grossWpm: number;
  netWpm: number;
  accuracyPercentage: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  errorKeystrokes: number;
  fullMistakes: number;
  halfMistakes: number;
  totalMistakes: number;
  errorPercentage: number;
  backspaceCount: number;
  timeSpentSeconds: number;
  allocatedTimeSeconds: number;
  isQualified: boolean;
  language: string;
  typedText: string;
  targetText: string;
  allowRetype?: boolean | null;
  retypeCycles?: number | null;
  detailedMistakes?: any;
  completedAt: string;
  createdAt?: string;
  user?: UserInfo;
  test?: TestInfo | null;
}

interface TypingAttemptManagerProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  language?: 'en' | 'hi';
}

export function TypingAttemptManager({ showToast, language = 'en' }: TypingAttemptManagerProps) {
  const [attempts, setAttempts] = useState<AdminTypingAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'qualified' | 'failed'>('all');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'en' | 'hi'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'net_wpm_desc' | 'accuracy_desc' | 'mistakes_asc'>('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Inspect Modal (Exact Result Page)
  const [inspectAttempt, setInspectAttempt] = useState<AdminTypingAttempt | null>(null);
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);

  useEffect(() => {
    if (inspectAttempt) {
      setIframeLoading(true);
    }
  }, [inspectAttempt]);

  // Delete Confirmation Modal
  const [deleteAttemptTarget, setDeleteAttemptTarget] = useState<AdminTypingAttempt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Attempts
  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-admin-typing-attempts',
          limit: 500,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.attempts)) {
        setAttempts(data.attempts);
      } else {
        showToast(data.error || 'Failed to load typing attempts', 'error');
      }
    } catch (err: any) {
      console.error('Error loading typing attempts:', err);
      showToast('Network error while loading typing attempts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, []);

  // Delete Attempt
  const handleDeleteAttempt = async () => {
    if (!deleteAttemptTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-typing-attempt',
          id: deleteAttemptTarget.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Typing attempt log deleted successfully');
        setAttempts(prev => prev.filter(a => a.id !== deleteAttemptTarget.id));
        if (inspectAttempt?.id === deleteAttemptTarget.id) {
          setInspectAttempt(null);
        }
      } else {
        showToast(data.error || 'Failed to delete attempt', 'error');
      }
    } catch (err: any) {
      console.error('Error deleting attempt:', err);
      showToast('Network error while deleting attempt', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteAttemptTarget(null);
    }
  };

  // Unique Categories for dropdown
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    attempts.forEach(a => {
      const cat = a.categoryName || a.test?.categoryId || '';
      if (cat.trim()) cats.add(cat.trim());
    });
    return Array.from(cats).sort();
  }, [attempts]);

  // Filtered & Sorted Attempts
  const filteredAttempts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return attempts.filter(a => {
      // Search
      if (q) {
        const candidateName = (a.user?.fullName || a.userName || '').toLowerCase();
        const candidateEmail = (a.user?.email || '').toLowerCase();
        const candidateCode = (a.user?.candidateCode || '').toLowerCase();
        const testTitle = (a.testTitle || a.test?.title || '').toLowerCase();
        const category = (a.categoryName || a.test?.categoryId || '').toLowerCase();
        const matches =
          candidateName.includes(q) ||
          candidateEmail.includes(q) ||
          candidateCode.includes(q) ||
          testTitle.includes(q) ||
          category.includes(q);
        if (!matches) return false;
      }

      // Category
      if (categoryFilter !== 'all') {
        const cat = a.categoryName || a.test?.categoryId || '';
        if (cat !== categoryFilter) return false;
      }

      // Status
      if (statusFilter === 'qualified' && !a.isQualified) return false;
      if (statusFilter === 'failed' && a.isQualified) return false;

      // Language
      if (languageFilter !== 'all' && a.language !== languageFilter) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime();
      }
      if (sortBy === 'net_wpm_desc') {
        return (b.netWpm || 0) - (a.netWpm || 0);
      }
      if (sortBy === 'accuracy_desc') {
        return (b.accuracyPercentage || 0) - (a.accuracyPercentage || 0);
      }
      if (sortBy === 'mistakes_asc') {
        return (a.totalMistakes || 0) - (b.totalMistakes || 0);
      }
      return 0;
    });
  }, [attempts, searchQuery, categoryFilter, statusFilter, languageFilter, sortBy]);

  // Overall Statistics calculated from the full dataset (or filtered)
  const stats = useMemo(() => {
    const total = filteredAttempts.length;
    if (total === 0) {
      return { total: 0, qualified: 0, qualRate: 0, avgNetWpm: 0, avgAccuracy: 0, avgGrossWpm: 0 };
    }
    const qualified = filteredAttempts.filter(a => a.isQualified).length;
    const qualRate = Math.round((qualified / total) * 100);
    const sumNet = filteredAttempts.reduce((acc, a) => acc + (a.netWpm || 0), 0);
    const sumGross = filteredAttempts.reduce((acc, a) => acc + (a.grossWpm || 0), 0);
    const sumAcc = filteredAttempts.reduce((acc, a) => acc + (a.accuracyPercentage || 0), 0);

    return {
      total,
      qualified,
      qualRate,
      avgNetWpm: Math.round((sumNet / total) * 10) / 10,
      avgGrossWpm: Math.round((sumGross / total) * 10) / 10,
      avgAccuracy: Math.round((sumAcc / total) * 10) / 10,
    };
  }, [filteredAttempts]);

  // Paginated Results
  const totalPages = Math.max(1, Math.ceil(filteredAttempts.length / pageSize));
  const paginatedAttempts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAttempts.slice(start, start + pageSize);
  }, [filteredAttempts, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, languageFilter, sortBy, pageSize]);

  // Time format helper
  const formatSeconds = (sec?: number) => {
    if (!sec || sec <= 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  // CSV Export
  const exportToCsv = () => {
    if (filteredAttempts.length === 0) {
      showToast('No typing attempts to export', 'error');
      return;
    }

    const headers = [
      'Attempt ID',
      'Candidate Name',
      'Candidate Email',
      'Candidate Code',
      'Mobile',
      'Test Title',
      'Category',
      'Language',
      'Net WPM',
      'Gross WPM',
      'Accuracy %',
      'Total Keystrokes',
      'Correct Keystrokes',
      'Error Keystrokes',
      'Full Mistakes',
      'Half Mistakes',
      'Total Mistakes',
      'Backspaces',
      'Time Spent (Sec)',
      'Allocated Time (Sec)',
      'Result',
      'Date Completed',
    ];

    const rows = filteredAttempts.map(a => [
      `"${a.id}"`,
      `"${(a.user?.fullName || a.userName || '').replace(/"/g, '""')}"`,
      `"${(a.user?.email || '').replace(/"/g, '""')}"`,
      `"${(a.user?.candidateCode || '').replace(/"/g, '""')}"`,
      `"${(a.user?.mobile || '').replace(/"/g, '""')}"`,
      `"${(a.testTitle || a.test?.title || '').replace(/"/g, '""')}"`,
      `"${(a.categoryName || a.test?.categoryId || '').replace(/"/g, '""')}"`,
      `"${a.language || 'en'}"`,
      a.netWpm ?? 0,
      a.grossWpm ?? 0,
      a.accuracyPercentage ?? 0,
      a.totalKeystrokes ?? 0,
      a.correctKeystrokes ?? 0,
      a.errorKeystrokes ?? 0,
      a.fullMistakes ?? 0,
      a.halfMistakes ?? 0,
      a.totalMistakes ?? 0,
      a.backspaceCount ?? 0,
      a.timeSpentSeconds ?? 0,
      a.allocatedTimeSeconds ?? 0,
      a.isQualified ? 'QUALIFIED' : 'NOT QUALIFIED',
      `"${new Date(a.completedAt).toLocaleString('en-IN')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `typing_attempts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Typing attempts exported to CSV successfully');
  };

  return (
    <div className="animate-in fade-in duration-200 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {language === 'hi' ? 'टाइपिंग एटेम्पटेड लॉग्स' : 'Typing Attempt Logs'}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              {attempts.length} Total Sittings
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            {language === 'hi'
              ? 'अभ्यर्थियों के टाइपिंग टेस्ट परिणाम, ग्रॉस/नेट स्पीड (WPM), एक्यूरेसी एवं गलतियों का संपूर्ण विश्लेषण।'
              : 'Audit candidate typing test attempts, gross & net WPM, accuracy, mistakes breakdown, and exam qualification status.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCsv}
            disabled={filteredAttempts.length === 0}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
            title="Download CSV report"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchAttempts}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Attempts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filtered Attempts</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              of {attempts.length} total across all tests
            </p>
          </div>
          <div className="h-10 w-10 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex items-center justify-center text-blue-500">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Qualified Candidates */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Qualified / Passed</p>
            <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.qualified} <span className="text-xs font-semibold text-slate-400">({stats.qualRate}%)</span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {stats.total - stats.qualified} failed qualification
            </p>
          </div>
          <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Average Net Speed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average Net Speed</p>
            <h4 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {stats.avgNetWpm} <span className="text-xs font-semibold text-slate-400">WPM</span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Avg Gross: {stats.avgGrossWpm} WPM
            </p>
          </div>
          <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg flex items-center justify-center text-indigo-500">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        {/* Average Accuracy */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average Accuracy</p>
            <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.avgAccuracy}%
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Calculated on keystrokes
            </p>
          </div>
          <div className="h-10 w-10 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex items-center justify-center text-amber-500">
            <Target className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search candidate name, email, candidate code, test title, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider hidden sm:inline">Exam:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 rounded-lg text-xs py-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer max-w-[170px] truncate"
              >
                <option value="all">All Exam Categories</option>
                {uniqueCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider hidden sm:inline">Result:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border border-slate-200 dark:border-slate-800 rounded-lg text-xs py-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">All Results</option>
                <option value="qualified">✅ Qualified (Pass)</option>
                <option value="failed">❌ Not Qualified (Fail)</option>
              </select>
            </div>

            {/* Language Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider hidden sm:inline">Lang:</span>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value as any)}
                className="border border-slate-200 dark:border-slate-800 rounded-lg text-xs py-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">All Languages</option>
                <option value="en">English (EN)</option>
                <option value="hi">Hindi (HI)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-slate-200 dark:border-slate-800 rounded-lg text-xs py-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="net_wpm_desc">Highest Speed (WPM)</option>
                <option value="accuracy_desc">Highest Accuracy</option>
                <option value="mistakes_asc">Fewest Mistakes</option>
              </select>
            </div>

            {/* Clear Filters button */}
            {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || languageFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                  setLanguageFilter('all');
                  setSortBy('newest');
                }}
                className="text-[11px] font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded bg-red-50 dark:bg-red-950/30 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attempt Logs Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Candidate Details
                </th>
                <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Typing Test & Category
                </th>
                <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Speed (Net / Gross)
                </th>
                <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Accuracy & Errors
                </th>
                <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Time & Date
                </th>
                <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                  Result
                </th>
                <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-3"></div>
                    <p className="text-xs text-slate-400 font-bold">Loading typing attempt records...</p>
                  </td>
                </tr>
              ) : paginatedAttempts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 dark:text-slate-500 font-semibold italic">
                    No typing attempts found matching current search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedAttempts.map((a) => {
                  const candidateName = a.user?.fullName || a.userName || 'Guest Candidate';
                  const candidateEmail = a.user?.email || (a.userId === 'guest' ? 'guest@typing.test' : 'N/A');
                  const candidateCode = a.user?.candidateCode || (a.userId === 'guest' ? 'GUEST' : a.userId?.substring(0, 8).toUpperCase());
                  const testTitle = a.testTitle || a.test?.title || 'Unknown Test';
                  const categoryName = a.categoryName || a.test?.categoryId || 'General Typing';

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                      {/* Candidate Details */}
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{candidateName}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate max-w-[180px]" title={candidateEmail}>
                          {candidateEmail}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold border border-slate-200 dark:border-slate-700">
                            ID: {candidateCode}
                          </span>
                          {a.user?.mobile && (
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                              📞 {a.user.mobile}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Typing Test & Category */}
                      <td className="py-3.5 px-4 max-w-[230px]">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/40 w-fit max-w-full truncate" title={categoryName}>
                            📁 {categoryName}
                          </span>
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate" title={testTitle}>
                            {testTitle}
                          </p>
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
                            <span className={`px-1 rounded font-bold uppercase ${a.language === 'hi' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                              {a.language === 'hi' ? 'HINDI' : 'ENGLISH'}
                            </span>
                            <span className="font-mono truncate max-w-[120px]" title={a.testId}>
                              {a.testId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Speed */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-black text-slate-900 dark:text-white">
                              {a.netWpm}
                            </span>
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">
                              Net WPM
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            Gross: <span className="font-bold text-slate-700 dark:text-slate-300">{a.grossWpm} WPM</span>
                          </p>
                          {a.backspaceCount !== undefined && a.backspaceCount > 0 && (
                            <p className="text-[9px] text-slate-400 font-medium">
                              Backspaces: {a.backspaceCount}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Accuracy & Errors */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                              a.accuracyPercentage >= 95
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : a.accuracyPercentage >= 90
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}>
                              {a.accuracyPercentage}% Acc
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            Mistakes: <strong className="text-red-500">{a.totalMistakes ?? 0}</strong>
                            {(a.fullMistakes > 0 || a.halfMistakes > 0) && (
                              <span className="text-[9px] text-slate-400 ml-1">
                                (F: {a.fullMistakes}, H: {a.halfMistakes})
                              </span>
                            )}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            Strokes: {a.correctKeystrokes ?? 0} / {a.totalKeystrokes ?? 0}
                          </p>
                        </div>
                      </td>

                      {/* Time & Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {formatSeconds(a.timeSpentSeconds)}
                            {a.allocatedTimeSeconds > 0 && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                / {formatSeconds(a.allocatedTimeSeconds)}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(a.completedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono">
                            {new Date(a.completedAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </td>

                      {/* Result / Qualification */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          a.isQualified
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                        }`}>
                          {a.isQualified ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              PASS
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              FAIL
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectAttempt(a)}
                            title="Inspect Exact Result Page"
                            className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <a
                            href={`/typing-test/${a.testId}?attemptId=${a.id}&view=analysis`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Exact Result Page in New Tab"
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer inline-flex items-center"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => setDeleteAttemptTarget(a)}
                            title="Delete Attempt Log"
                            className="p-1.5 text-red-500 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredAttempts.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Showing <span className="font-bold text-slate-800 dark:text-slate-200">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {Math.min(currentPage * pageSize, filteredAttempts.length)}
              </span>{' '}
              of <span className="font-bold text-slate-800 dark:text-slate-200">{filteredAttempts.length}</span> attempts
            </div>

            <div className="flex items-center gap-3">
              {/* Page size selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-slate-200 dark:border-slate-700 rounded text-xs py-1 px-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Prev / Next */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INSPECT MODAL - EXACT RESULT PAGE */}
      {inspectAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl h-[92vh] max-h-[92vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl shrink-0 ${
                  inspectAttempt.isQualified
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                }`}>
                  <Keyboard className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                      {inspectAttempt.user?.fullName || inspectAttempt.userName}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      inspectAttempt.isQualified
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {inspectAttempt.isQualified ? 'QUALIFIED' : 'NOT QUALIFIED'}
                    </span>
                    <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold border border-slate-200 dark:border-slate-700">
                      ID: {inspectAttempt.user?.candidateCode || 'GUEST'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                    {inspectAttempt.testTitle || inspectAttempt.test?.title} • <span className="font-semibold text-blue-600 dark:text-blue-400">{inspectAttempt.categoryName}</span>
                  </p>
                </div>
              </div>

              {/* Top Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-2 mr-2">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-100 dark:border-blue-900/40">
                    ⚡ {inspectAttempt.netWpm} Net WPM
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
                    🎯 {inspectAttempt.accuracyPercentage}% Acc
                  </span>
                </div>

                <a
                  href={`/typing-test/${inspectAttempt.testId}?attemptId=${inspectAttempt.id}&view=analysis`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold transition cursor-pointer"
                  title="Open exact result page in a full new browser window"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Open in New Tab</span>
                </a>

                <button
                  onClick={() => setInspectAttempt(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  title="Close Modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Exact Result Page iframe */}
            <div className="relative flex-1 w-full h-full bg-[#edf2f8] overflow-hidden">
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#edf2f8]/90 backdrop-blur-xs z-10">
                  <RefreshCw className="h-7 w-7 text-blue-600 animate-spin mb-2" />
                  <p className="text-xs font-bold text-slate-600">Loading exact typing test result page...</p>
                </div>
              )}
              <iframe
                key={inspectAttempt.id}
                src={`/typing-test/${inspectAttempt.testId}?attemptId=${inspectAttempt.id}&view=analysis&embed=1`}
                onLoad={() => setIframeLoading(false)}
                className="w-full h-full border-0 bg-[#edf2f8]"
                title="Exact Typing Test Result Page"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 text-xs shrink-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Attempt Sitting: <strong className="text-slate-700 dark:text-slate-200">{new Date(inspectAttempt.completedAt).toLocaleString('en-IN')}</strong>
              </span>
              <button
                onClick={() => setInspectAttempt(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteAttemptTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertCircle className="h-6 w-6" />
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-white">Delete Typing Attempt</h4>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              Are you sure you want to permanently delete the typing attempt log of candidate{' '}
              <strong className="text-white">{deleteAttemptTarget.user?.fullName || deleteAttemptTarget.userName}</strong> for{' '}
              <strong className="text-white">{deleteAttemptTarget.testTitle || 'Typing Test'}</strong>? This action is permanent and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteAttemptTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAttempt}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Attempt
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
