"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FolderLock,
  Cloud,
  CloudOff,
  Upload,
  Plus,
  Search,
  Filter,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Trash2,
  ShieldCheck,
  Info,
  ChevronRight,
  ArrowLeft,
  Sun,
  Moon,
  X,
  Sparkles,
  Award,
  RefreshCw,
  Eye,
  FileCheck
} from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { useIsMobile } from '../useIsMobile';
import {
  requestGoogleDriveAccessToken,
  getOrCreateLockerRootFolder,
  getOrCreateLockerSubFolder,
  uploadFileToGoogleDrive,
  deleteFileFromGoogleDrive,
} from '../lib/googleDriveWeb';

export interface LockerDoc {
  id: string;
  userId: string;
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
}

const CATEGORY_PULLS = [
  { id: 'ALL', label: 'All Files', icon: FolderLock },
  { id: 'ADMIT_CARD', label: 'Admit Cards', icon: Award },
  { id: 'APPLICATION_FORM', label: 'Application Forms', icon: FileText },
  { id: 'PHOTO', label: 'Passport Photos', icon: ImageIcon },
  { id: 'SIGNATURE', label: 'Signatures', icon: FileCheck },
  { id: 'CERTIFICATE', label: 'Certificates', icon: ShieldCheck },
  { id: 'ID_PROOF', label: 'ID Proofs', icon: Info },
];

export default function DocumentLockerPage() {
  const { currentUser, theme, toggleTheme, language } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];
  const { isMobile, isMounted } = useIsMobile();

  // Locker State
  const [documents, setDocuments] = useState<LockerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<LockerDoc | null>(null);
  const [docToDelete, setDocToDelete] = useState<LockerDoc | null>(null);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState<string>('ADMIT_CARD');
  const [uploadExamName, setUploadExamName] = useState('');
  const [uploadYear, setUploadYear] = useState<string>(new Date().getFullYear().toString());
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Auth / Connect Loading
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Load Locker Documents from Backend
  const fetchLockerDocs = async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'locker-get-docs',
          data: { userId: currentUser.id },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents || []);
        setIsDriveConnected(!!data.user?.isLockerConnected);
        setDriveEmail(data.user?.googleDriveEmail || null);
        setRootFolderId(data.user?.googleDriveFolderId || null);
      }
    } catch (err) {
      console.error('Failed to load locker documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchLockerDocs();
    }
  }, [currentUser]);

  // Connect Google Drive
  const handleConnectGoogleDrive = async () => {
    setConnectingDrive(true);
    setConnectError(null);
    try {
      const authRes = await requestGoogleDriveAccessToken();
      setAccessToken(authRes.accessToken);

      // Create or resolve Locker Root Folder in user's Drive
      const folderId = await getOrCreateLockerRootFolder(authRes.accessToken);
      setRootFolderId(folderId);
      setIsDriveConnected(true);
      if (authRes.email) setDriveEmail(authRes.email);

      // Save drive status to backend
      if (currentUser?.id) {
        await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'locker-update-drive-status',
            data: {
              userId: currentUser.id,
              isConnected: true,
              googleDriveEmail: authRes.email || null,
              googleDriveFolderId: folderId,
            },
          }),
        });
      }
    } catch (err: any) {
      console.error('Google Drive connection error:', err);
      setConnectError(err.message || 'Failed to connect Google Drive. Please try again.');
    } finally {
      setConnectingDrive(false);
    }
  };

  // Disconnect Google Drive
  const handleDisconnectGoogleDrive = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? Your files will remain safe in your Drive, but they will not be displayed here until reconnected.')) {
      return;
    }
    if (!currentUser?.id) return;
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'locker-disconnect-drive',
          data: { userId: currentUser.id },
        }),
      });
      setIsDriveConnected(false);
      setDriveEmail(null);
      setAccessToken(null);
    } catch (err) {
      console.error('Error disconnecting drive:', err);
    }
  };

  // Upload Document Handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('Please enter a document title');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      let currentToken = accessToken;
      if (!currentToken) {
        setUploadProgressMsg('Authenticating with Google Drive...');
        const authRes = await requestGoogleDriveAccessToken();
        currentToken = authRes.accessToken;
        setAccessToken(authRes.accessToken);
        if (authRes.email) setDriveEmail(authRes.email);
      }

      setUploadProgressMsg('Resolving Locker Folder in your Google Drive...');
      let targetFolderId = rootFolderId;
      if (!targetFolderId) {
        targetFolderId = await getOrCreateLockerRootFolder(currentToken);
        setRootFolderId(targetFolderId);
      }

      // Determine Category Subfolder
      const subFolderName =
        uploadDocType === 'ADMIT_CARD'
          ? 'Admit Cards & Hall Tickets'
          : uploadDocType === 'APPLICATION_FORM'
          ? 'Application Forms'
          : uploadDocType === 'PHOTO'
          ? 'Passport Photos'
          : uploadDocType === 'SIGNATURE'
          ? 'Signatures'
          : uploadDocType === 'CERTIFICATE'
          ? 'Certificates'
          : uploadDocType === 'ID_PROOF'
          ? 'ID Proofs'
          : 'Other Documents';

      const subFolderId = await getOrCreateLockerSubFolder(
        currentToken,
        targetFolderId,
        subFolderName
      );

      setUploadProgressMsg('Uploading file directly to your Google Drive...');
      const cleanFileName = `${uploadTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.${
        uploadFile.name.split('.').pop() || 'dat'
      }`;

      const driveFile = await uploadFileToGoogleDrive(
        currentToken,
        uploadFile,
        cleanFileName,
        subFolderId
      );

      setUploadProgressMsg('Saving document metadata...');
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'locker-save-meta',
          data: {
            userId: currentUser?.id,
            title: uploadTitle.trim(),
            docType: uploadDocType,
            examName: uploadExamName.trim() || null,
            year: uploadYear ? parseInt(uploadYear, 10) : null,
            driveFileId: driveFile.id,
            driveFolderId: subFolderId,
            driveViewUrl: driveFile.webViewLink,
            driveDownloadUrl: `https://drive.google.com/uc?export=download&id=${driveFile.id}`,
            thumbnailUrl: driveFile.thumbnailLink || null,
            mimeType: driveFile.mimeType,
            fileSizeBytes: driveFile.size || uploadFile.size,
          },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save document metadata');
      }

      // Success
      setIsUploadModalOpen(false);
      setUploadTitle('');
      setUploadExamName('');
      setUploadFile(null);
      fetchLockerDocs();
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Failed to upload document. Please check permissions.');
    } finally {
      setUploading(false);
      setUploadProgressMsg('');
    }
  };

  // Delete Document Handler
  const handleDeleteConfirm = async () => {
    if (!docToDelete || !currentUser?.id) return;
    try {
      // 1. Delete from Google Drive if token is available
      if (accessToken && docToDelete.driveFileId) {
        try {
          await deleteFileFromGoogleDrive(accessToken, docToDelete.driveFileId);
        } catch (e) {
          console.warn('Could not delete directly from Drive (may need re-auth):', e);
        }
      }

      // 2. Delete metadata from Backend
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'locker-delete-doc',
          data: {
            docId: docToDelete.id,
            userId: currentUser.id,
          },
        }),
      });

      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      setDocToDelete(null);
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Category filter
      if (activeCategory !== 'ALL' && doc.docType !== activeCategory) {
        return false;
      }
      // Year filter
      if (selectedYear !== 'ALL' && doc.year?.toString() !== selectedYear) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesExam = (doc.examName || '').toLowerCase().includes(q);
        return matchesTitle || matchesExam;
      }
      return true;
    });
  }, [documents, activeCategory, selectedYear, searchQuery]);

  // Format file size
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    documents.forEach((d) => {
      if (d.year) years.add(d.year.toString());
    });
    return Array.from(years).sort().reverse();
  }, [documents]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <FolderLock className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Student Document Locker</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
            Please log in to your MockTest Hub account to access your personal Google Drive exam locker.
          </p>
          <Link
            href="/auth?mode=login"
            className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-md shadow-blue-500/20"
          >
            Log In to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
              title="Back to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                <FolderLock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  Document Locker
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Google Drive Sync
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Admit Cards • Photos • Signatures • Application Forms
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Document</span>
              <span className="sm:hidden">Upload</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Drive Sync Status Banner */}
        <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 border border-blue-500/20 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                  Personal Google Drive Storage
                </h2>
                {isDriveConnected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    <CloudOff className="w-3.5 h-3.5" /> Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                {isDriveConnected && driveEmail
                  ? `Files are automatically saved in the "MockTest Hub Locker" folder of ${driveEmail}. Your documents remain 100% private and consume your free 15GB Drive quota.`
                  : 'Connect your personal Google Drive to safely store admit cards, application PDFs, cropped photos, and signatures.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            {isDriveConnected ? (
              <button
                onClick={handleDisconnectGoogleDrive}
                className="w-full md:w-auto px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl transition"
              >
                Disconnect Drive
              </button>
            ) : (
              <button
                onClick={handleConnectGoogleDrive}
                disabled={connectingDrive}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {connectingDrive ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    Connect Google Drive
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {connectError && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {connectError}
          </div>
        )}

        {/* Search and Category Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by exam name (e.g. SSC CGL, CTET) or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Year Filter */}
            {availableYears.length > 0 && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORY_PULLS.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              const count =
                cat.id === 'ALL'
                  ? documents.length
                  : documents.filter((d) => d.docType === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading your locker documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-4">
              <FolderLock className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              No documents in this category
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
              Upload your admit cards, confirmation forms, passport size photos, or ID cards to keep them handy for exam days.
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-md shadow-blue-600/20"
            >
              <Upload className="w-4 h-4" /> Upload Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => {
              const isPdf = doc.mimeType?.includes('pdf') || doc.title.toLowerCase().endsWith('.pdf');
              const isImg = doc.mimeType?.startsWith('image/') || doc.thumbnailUrl;

              return (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:shadow-lg hover:border-blue-500/40 transition group"
                >
                  <div>
                    {/* Top Row: Type & Exam */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                        {doc.docType.replace('_', ' ')}
                      </span>
                      {doc.year && (
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {doc.year}
                        </span>
                      )}
                    </div>

                    {/* Preview Thumbnail / Icon */}
                    <div
                      onClick={() => setPreviewDoc(doc)}
                      className="cursor-pointer mb-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 h-32 flex items-center justify-center overflow-hidden relative group-hover:border-blue-500/20 transition"
                    >
                      {doc.thumbnailUrl ? (
                        <img
                          src={doc.thumbnailUrl}
                          alt={doc.title}
                          className="w-full h-full object-cover"
                        />
                      ) : isPdf ? (
                        <div className="flex flex-col items-center gap-1.5 text-rose-500">
                          <FileText className="w-10 h-10" />
                          <span className="text-[11px] font-bold tracking-wider">PDF DOCUMENT</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-blue-500">
                          <ImageIcon className="w-10 h-10" />
                          <span className="text-[11px] font-bold tracking-wider">IMAGE FILE</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                        <Eye className="w-4 h-4" /> View Document
                      </div>
                    </div>

                    {/* Title & Exam Details */}
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {doc.title}
                    </h4>
                    {doc.examName && (
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5 line-clamp-1">
                        🎯 {doc.examName}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      {formatSize(doc.fileSizeBytes)} • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      {doc.driveViewUrl && (
                        <a
                          href={doc.driveViewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                          title="Open in Google Drive"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {doc.driveDownloadUrl && (
                        <a
                          href={doc.driveDownloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => setDocToDelete(doc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Delete from Locker"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Exam Specifications Guidelines Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Standard Exam Document Specifications Reference
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">SSC (CGL, CHSL, MTS)</span>
              <p className="text-slate-600 dark:text-slate-400">Photo: 20-50 KB (3.5x4.5 cm)</p>
              <p className="text-slate-600 dark:text-slate-400">Sign: 10-20 KB (4.0x2.0 cm)</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-purple-600 dark:text-purple-400 block mb-1">UPSC (CSE, CDS, NDA)</span>
              <p className="text-slate-600 dark:text-slate-400">Photo: 20-300 KB JPG</p>
              <p className="text-slate-600 dark:text-slate-400">Sign: 20-300 KB JPG</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">Banking (IBPS, SBI)</span>
              <p className="text-slate-600 dark:text-slate-400">Photo: 20-50 KB (200x230 px)</p>
              <p className="text-slate-600 dark:text-slate-400">Sign: 10-20 KB (140x60 px)</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">Teaching & State PSCs</span>
              <p className="text-slate-600 dark:text-slate-400">Photo: 20-100 KB JPG</p>
              <p className="text-slate-600 dark:text-slate-400">Admit Cards: Clean PDF</p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-auto py-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center text-xs text-slate-500">
        <p className="font-bold">© 2026 MockTest Hub. All rights reserved.</p>
        <div className="mt-2 flex items-center justify-center gap-4 text-[11px] font-bold">
          <Link href="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Contact Us</Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Terms & Conditions</Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Privacy Policy</Link>
        </div>
      </footer>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload Document to Locker
              </h3>
              <button
                onClick={() => !uploading && setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                  Document Type *
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                >
                  <option value="ADMIT_CARD">🎫 Admit Card / Hall Ticket</option>
                  <option value="APPLICATION_FORM">📝 Application Form / Confirmation Page</option>
                  <option value="PHOTO">📷 Passport Size Photo</option>
                  <option value="SIGNATURE">✍️ Signature</option>
                  <option value="CERTIFICATE">📜 Category / Domicile Certificate</option>
                  <option value="ID_PROOF">🆔 Identity Proof (Aadhaar / PAN)</option>
                  <option value="OTHER">📁 Other Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                  Document Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SSC CGL 2026 Tier-1 Admit Card"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                    Target Exam
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SSC CGL"
                    value={uploadExamName}
                    onChange={(e) => setUploadExamName(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                    Year
                  </label>
                  <input
                    type="number"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                  Select File (PDF, JPG, PNG) *
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-400"
                />
              </div>

              {uploadError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {uploadError}
                </p>
              )}

              {uploadProgressMsg && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  {uploadProgressMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {uploading ? 'Saving to Drive...' : 'Save to Google Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {previewDoc.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {previewDoc.examName ? `Exam: ${previewDoc.examName} • ` : ''}
                  {formatSize(previewDoc.fileSizeBytes)}
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 my-4 overflow-auto rounded-xl bg-slate-100 dark:bg-slate-850 flex items-center justify-center min-h-[300px]">
              {previewDoc.mimeType?.startsWith('image/') || previewDoc.thumbnailUrl ? (
                <img
                  src={`https://drive.google.com/thumbnail?id=${previewDoc.driveFileId}&sz=w1000`}
                  alt={previewDoc.title}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                  onError={(e: any) => {
                    // Fallback to iframe if thumbnail fails
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <iframe
                  src={`https://drive.google.com/file/d/${previewDoc.driveFileId}/preview`}
                  className="w-full h-[60vh] border-0 rounded-lg"
                  title={previewDoc.title}
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400">Saved in your Google Drive</span>
              <div className="flex items-center gap-2">
                {previewDoc.driveViewUrl && (
                  <a
                    href={previewDoc.driveViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in Google Drive
                  </a>
                )}
                {previewDoc.driveDownloadUrl && (
                  <a
                    href={previewDoc.driveDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1">
              Delete Document?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to remove &quot;{docToDelete.title}&quot; from your locker?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-rose-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
