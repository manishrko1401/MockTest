"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, TrackedJob } from '../AuthContext';
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
  ChevronDown,
  ArrowLeft,
  Sun,
  Moon,
  X,
  Sparkles,
  Award,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  FileCheck,
  Calendar,
  KeyRound,
  MapPin,
  Clock,
  Briefcase,
  Edit3,
  FolderOpen,
  LayoutGrid,
  List,
  Lock,
  Unlock,
  Shield,
  FileSpreadsheet,
  Layers,
  Mail,
  Send,
  Trophy,
  Loader2,
} from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { useIsMobile } from '../useIsMobile';
import {
  requestGoogleDriveAccessToken,
  getOrCreateLockerRootFolder,
  getOrCreateLockerSubFolder,
  getOrCreateExamFolder,
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

type NavSection = 'APPLIED_EXAMS' | 'ALL' | 'ADMIT_CARD' | 'APPLICATION_FORM' | 'PHOTO' | 'SIGNATURE' | 'CERTIFICATE' | 'ID_PROOF';

const MENU_ITEMS: { id: NavSection; label: string; labelHi: string; icon: any; color: string }[] = [
  { id: 'APPLIED_EXAMS', label: 'Applied Exams Vault', labelHi: 'आवेदन किए गए परीक्षा वॉल्ट', icon: Briefcase, color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' },
  { id: 'ALL', label: 'All Files & Documents', labelHi: 'सभी फ़ाइलें और दस्तावेज़', icon: FolderLock, color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' },
  { id: 'ADMIT_CARD', label: 'Admit Cards & Hall Tickets', labelHi: 'प्रवेश पत्र (Admit Cards)', icon: Award, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  { id: 'APPLICATION_FORM', label: 'Application Forms', labelHi: 'आवेदन फॉर्म (Application Forms)', icon: FileText, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  { id: 'PHOTO', label: 'Passport Photos', labelHi: 'पासपोर्ट फोटो (Photos)', icon: ImageIcon, color: 'text-pink-600 dark:text-pink-400 bg-pink-500/10' },
  { id: 'SIGNATURE', label: 'Signatures', labelHi: 'हस्ताक्षर (Signatures)', icon: FileCheck, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' },
  { id: 'CERTIFICATE', label: 'Certificates & Marksheets', labelHi: 'प्रमाण पत्र और मार्कशीट', icon: ShieldCheck, color: 'text-teal-600 dark:text-teal-400 bg-teal-500/10' },
  { id: 'ID_PROOF', label: 'Govt ID Proofs', labelHi: 'पहचान पत्र (Aadhaar/PAN)', icon: Info, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10' },
];

export default function DocumentLockerPage() {
  const { currentUser, updateTrackedJobs, theme, toggleTheme, language } = useAuth();
  const router = useRouter();
  const t = TRANSLATIONS[language];
  const { isMobile } = useIsMobile();

  // ==========================================
  // PIN & SECURITY LOCK STATE
  // ==========================================
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [userLockerPin, setUserLockerPin] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string | null>(null);
  const [isPinShake, setIsPinShake] = useState<boolean>(false);
  const [isPinVerifying, setIsPinVerifying] = useState<boolean>(false);

  // First-Time Setup State
  const [setupStep, setSetupStep] = useState<'CREATE' | 'CONFIRM'>('CREATE');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');

  // Forgot / Reset PIN with OTP Modal State
  const [isForgotPinModalOpen, setIsForgotPinModalOpen] = useState<boolean>(false);
  const [forgotOtpStep, setForgotOtpStep] = useState<'SEND_OTP' | 'VERIFY_OTP'>('SEND_OTP');
  const [maskedTargetEmail, setMaskedTargetEmail] = useState<string>('');
  const [isDriveEmailTarget, setIsDriveEmailTarget] = useState<boolean>(false);
  const [forgotOtpInput, setForgotOtpInput] = useState<string>('');
  const [forgotNewPinInput, setForgotNewPinInput] = useState<string>('');
  const [forgotConfirmPinInput, setForgotConfirmPinInput] = useState<string>('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Change PIN Modal State (when unlocked)
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState<boolean>(false);
  const [changeOldPinInput, setChangeOldPinInput] = useState<string>('');
  const [changeNewPinInput, setChangeNewPinInput] = useState<string>('');
  const [changeConfirmPinInput, setChangeConfirmPinInput] = useState<string>('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeLoading, setChangeLoading] = useState<boolean>(false);

  // Active Menu / Section & View Mode
  const [activeSection, setActiveSection] = useState<NavSection>('APPLIED_EXAMS');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Locker Data State
  const [documents, setDocuments] = useState<LockerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<LockerDoc | null>(null);
  const [docToDelete, setDocToDelete] = useState<LockerDoc | null>(null);
  const [examToDelete, setExamToDelete] = useState<TrackedJob | null>(null);
  const [deleteExamPinInput, setDeleteExamPinInput] = useState<string>('');
  const [deleteExamError, setDeleteExamError] = useState<string | null>(null);
  const [deleteExamLoading, setDeleteExamLoading] = useState<boolean>(false);
  const [editingExam, setEditingExam] = useState<TrackedJob | null>(null);

  // Form States for Exam
  const [examFormTitle, setExamFormTitle] = useState('');
  const [examFormCategory, setExamFormCategory] = useState('');
  const [examFormAppNo, setExamFormAppNo] = useState('');
  const [examFormPassword, setExamFormPassword] = useState('');
  const [examFormRollNo, setExamFormRollNo] = useState('');
  const [examFormExamDate, setExamFormExamDate] = useState('');
  const [examFormCenter, setExamFormCenter] = useState('');
  const [examFormShift, setExamFormShift] = useState('');
  const [examFormNotes, setExamFormNotes] = useState('');

  // Password Visibility toggles map & Copy Feedback
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  // Check initial PIN status & Session unlock (5 min auto-lock)
  useEffect(() => {
    if (!currentUser) return;

    // Check if unlocked in current browser tab session with timestamp
    const sessionVal = sessionStorage.getItem(`locker_unlocked_${currentUser.id}`);
    if (sessionVal) {
      const parsedTime = parseInt(sessionVal, 10);
      const isStillValid = !isNaN(parsedTime) && Date.now() - parsedTime < 5 * 60 * 1000;
      if (isStillValid || sessionVal === 'true') {
        setIsUnlocked(true);
        sessionStorage.setItem(`locker_unlocked_${currentUser.id}`, Date.now().toString());
      } else {
        sessionStorage.removeItem(`locker_unlocked_${currentUser.id}`);
        setIsUnlocked(false);
      }
    }

    // Set user PIN from auth or backend
    setUserLockerPin(currentUser.lockerPin || null);
  }, [currentUser]);

  // 5-Minute Inactivity Auto-Lock Timer
  useEffect(() => {
    if (!isUnlocked || !currentUser?.id) return;

    const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes in ms
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      sessionStorage.setItem(`locker_unlocked_${currentUser.id}`, Date.now().toString());
      timeoutId = setTimeout(() => {
        handleLockVault();
      }, AUTO_LOCK_TIMEOUT);
    };

    // Initial timer
    resetTimer();

    // Event listeners to refresh user activity
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => resetTimer();

    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity));
    };
  }, [isUnlocked, currentUser?.id]);

  // Resend OTP Cooldown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
        if (data.user?.lockerPin !== undefined) {
          setUserLockerPin(data.user.lockerPin || null);
        }
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

  // Handle URL Query params (e.g. ?exam=SSC+CGL&action=upload)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const examParam = params.get('exam');
      const actionParam = params.get('action');

      if (examParam) {
        setUploadExamName(examParam);
        setSearchQuery(examParam);
      }
      if (actionParam === 'upload') {
        setIsUploadModalOpen(true);
      }
    }
  }, []);

  // Trigger PIN validation when 4 digits are typed
  const handlePinDigitInput = (digit: string) => {
    setPinError(null);
    if (enteredPin.length < 4) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      if (next.length === 4) {
        verifyEnteredPin(next);
      }
    }
  };

  const handlePinBackspace = () => {
    setPinError(null);
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setPinError(null);
    setEnteredPin('');
  };

  // Verify PIN against stored PIN
  const verifyEnteredPin = async (pin: string) => {
    if (!currentUser?.id) return;
    setIsPinVerifying(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'locker-verify-pin',
          data: { userId: currentUser.id, pin },
        }),
      });
      const data = await res.json();

      if (data.success && data.isCorrect) {
        setIsUnlocked(true);
        sessionStorage.setItem(`locker_unlocked_${currentUser.id}`, Date.now().toString());
        setEnteredPin('');
        setPinError(null);
      } else {
        setIsPinShake(true);
        setPinError(language === 'hi' ? 'गलत पिन! कृपया पुनः प्रयास करें।' : 'Incorrect PIN. Please try again.');
        setTimeout(() => {
          setIsPinShake(false);
          setEnteredPin('');
        }, 800);
      }
    } catch (err) {
      console.error('PIN verification error:', err);
      setPinError('Error verifying PIN. Please try again.');
    } finally {
      setIsPinVerifying(false);
    }
  };

  // Lock Vault
  const handleLockVault = () => {
    if (!currentUser?.id) return;
    sessionStorage.removeItem(`locker_unlocked_${currentUser.id}`);
    setIsUnlocked(false);
    setEnteredPin('');
    setPinError(null);
  };

  // First-Time PIN Setup: Step 1 Submit
  const handleFirstTimePinNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPinInput)) {
      setPinError('PIN must be exactly 4 numeric digits.');
      return;
    }
    setPinError(null);
    setSetupStep('CONFIRM');
  };

  // First-Time PIN Setup: Step 2 Submit (Save to DB)
  const handleFirstTimePinConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput !== confirmPinInput) {
      setPinError(language === 'hi' ? 'पिन मेल नहीं खाता! कृपया दोबारा दर्ज करें।' : 'PINs do not match. Please re-enter.');
      return;
    }
    if (!currentUser?.id) return;

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'locker-set-pin',
          data: { userId: currentUser.id, pin: newPinInput },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUserLockerPin(newPinInput);
        setIsUnlocked(true);
        sessionStorage.setItem(`locker_unlocked_${currentUser.id}`, 'true');
        setPinSuccessMsg('Security PIN set successfully!');
        setNewPinInput('');
        setConfirmPinInput('');
        setTimeout(() => setPinSuccessMsg(null), 3000);
      } else {
        setPinError(data.error || 'Failed to set PIN.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Connection error setting PIN.');
    }
  };

  // ==========================================
  // FORGOT PIN: SEND OTP TO CONNECTED GMAIL
  // ==========================================
  const handleSendResetOtp = async () => {
    if (!currentUser?.id) return;
    setForgotLoading(true);
    setForgotError(null);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'locker-send-reset-otp',
          data: { userId: currentUser.id },
        }),
      });
      const data = await res.json();

      if (data.success) {
        setMaskedTargetEmail(data.maskedEmail || 'your connected email');
        setIsDriveEmailTarget(!!data.isGoogleDriveEmail);
        setForgotOtpStep('VERIFY_OTP');
        setResendCooldown(60);
      } else {
        setForgotError(data.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Connection error while sending OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ==========================================
  // FORGOT PIN: VERIFY OTP & SET NEW PIN
  // ==========================================
  const handleVerifyOtpAndResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!/^\d{6}$/.test(forgotOtpInput.trim())) {
      setForgotError('Please enter the 6-digit OTP sent to your email.');
      return;
    }
    if (!/^\d{4}$/.test(forgotNewPinInput.trim())) {
      setForgotError('New PIN must be exactly 4 digits.');
      return;
    }
    if (forgotNewPinInput.trim() !== forgotConfirmPinInput.trim()) {
      setForgotError('New PIN and Confirm PIN do not match.');
      return;
    }
    if (!currentUser?.id) return;

    setForgotLoading(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'locker-verify-otp-and-reset-pin',
          data: {
            userId: currentUser.id,
            otp: forgotOtpInput.trim(),
            newPin: forgotNewPinInput.trim(),
          },
        }),
      });
      const data = await res.json();

      if (data.success) {
        setUserLockerPin(forgotNewPinInput.trim());
        setIsUnlocked(true);
        sessionStorage.setItem(`locker_unlocked_${currentUser.id}`, 'true');
        setIsForgotPinModalOpen(false);
        setForgotOtpInput('');
        setForgotNewPinInput('');
        setForgotConfirmPinInput('');
        setForgotOtpStep('SEND_OTP');
        setPinSuccessMsg('PIN reset successfully! Vault unlocked.');
        setTimeout(() => setPinSuccessMsg(null), 3500);
      } else {
        setForgotError(data.error || 'OTP verification failed.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Error verifying OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Change PIN (from Unlocked State)
  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);

    if (!/^\d{4}$/.test(changeOldPinInput.trim())) {
      setChangeError('Current PIN must be exactly 4 numeric digits.');
      return;
    }
    if (!/^\d{4}$/.test(changeNewPinInput.trim())) {
      setChangeError('New PIN must be exactly 4 numeric digits.');
      return;
    }
    if (changeNewPinInput.trim() !== changeConfirmPinInput.trim()) {
      setChangeError('New PIN and Confirm PIN do not match.');
      return;
    }
    if (!currentUser?.id) return;

    setChangeLoading(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'locker-change-pin',
          data: {
            userId: currentUser.id,
            oldPin: changeOldPinInput.trim(),
            newPin: changeNewPinInput.trim(),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUserLockerPin(changeNewPinInput.trim());
        setIsChangePinModalOpen(false);
        setChangeOldPinInput('');
        setChangeNewPinInput('');
        setChangeConfirmPinInput('');
        setPinSuccessMsg('Security PIN updated successfully!');
        setTimeout(() => setPinSuccessMsg(null), 3000);
      } else {
        setChangeError(data.error || 'Failed to update PIN.');
      }
    } catch (err: any) {
      setChangeError(err.message || 'Error updating PIN.');
    } finally {
      setChangeLoading(false);
    }
  };

  // Connect Google Drive
  const handleConnectGoogleDrive = async () => {
    if (!currentUser?.email) return;
    setConnectingDrive(true);
    setConnectError(null);
    try {
      const authRes = await requestGoogleDriveAccessToken(undefined, currentUser.email);
      setAccessToken(authRes.accessToken);

      const folderId = await getOrCreateLockerRootFolder(authRes.accessToken);
      setRootFolderId(folderId);
      setIsDriveConnected(true);
      if (authRes.email) setDriveEmail(authRes.email);

      if (currentUser?.id) {
        await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'locker-update-drive-status',
            data: {
              userId: currentUser.id,
              isConnected: true,
              googleDriveEmail: authRes.email || currentUser.email,
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
    if (!confirm(language === 'hi' ? 'क्या आप वाकई Google Drive डिस्कनेक्ट करना चाहते हैं?' : 'Are you sure you want to disconnect Google Drive? Your files will remain safe in your Drive.')) {
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

  // Upload File Handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    if (!currentUser?.id) return;

    setUploading(true);
    setUploadProgressMsg('Connecting to Google Drive...');
    setUploadError(null);

    try {
      let token = accessToken;
      if (!token) {
        setUploadProgressMsg('Authenticating with Google Drive...');
        const authRes = await requestGoogleDriveAccessToken(undefined, currentUser.email);
        token = authRes.accessToken;
        setAccessToken(token);
        setIsDriveConnected(true);
        if (authRes.email) setDriveEmail(authRes.email);
      }

      setUploadProgressMsg('Resolving Google Drive Folder...');
      let targetFolderId = rootFolderId;
      let targetFolderLink: string | undefined = undefined;

      if (!targetFolderId) {
        targetFolderId = await getOrCreateLockerRootFolder(token);
        setRootFolderId(targetFolderId);
      }

      if (uploadExamName.trim()) {
        setUploadProgressMsg(`Creating exam folder "${uploadExamName.trim()}" in Google Drive...`);
        const examFolder = await getOrCreateExamFolder(token, targetFolderId, uploadExamName.trim());
        targetFolderId = examFolder.folderId;
        targetFolderLink = examFolder.folderWebViewLink;
      } else {
        targetFolderId = await getOrCreateLockerSubFolder(token, targetFolderId, uploadDocType);
      }

      setUploadProgressMsg('Uploading file directly to Google Drive...');
      const fileName = uploadTitle.trim() || uploadFile.name;
      const driveFile = await uploadFileToGoogleDrive(token, uploadFile, fileName, targetFolderId);

      setUploadProgressMsg('Saving document information...');
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'locker-save-meta',
          data: {
            userId: currentUser.id,
            title: fileName,
            docType: uploadDocType,
            examName: uploadExamName.trim() || null,
            year: uploadYear ? parseInt(uploadYear, 10) : new Date().getFullYear(),
            driveFileId: driveFile.id,
            driveFolderId: targetFolderId,
            driveViewUrl: driveFile.webViewLink,
            driveDownloadUrl: driveFile.webContentLink,
            thumbnailUrl: driveFile.thumbnailLink || null,
            mimeType: uploadFile.type || 'application/octet-stream',
            fileSizeBytes: uploadFile.size,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.document) {
        setDocuments((prev) => [data.document, ...prev]);

        if (uploadExamName.trim() && currentUser.trackedJobs && targetFolderLink) {
          const updatedJobs = currentUser.trackedJobs.map((j) => {
            if (j.title.toLowerCase().trim() === uploadExamName.toLowerCase().trim()) {
              return {
                ...j,
                driveFolderId: targetFolderId,
                driveFolderLink: targetFolderLink,
              };
            }
            return j;
          });
          updateTrackedJobs(updatedJobs);
        }

        setIsUploadModalOpen(false);
        setUploadTitle('');
        setUploadExamName('');
        setUploadFile(null);
      } else {
        throw new Error(data.message || 'Failed to save document metadata.');
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Upload failed. Please check permissions and try again.');
    } finally {
      setUploading(false);
      setUploadProgressMsg('');
    }
  };

  // Delete Document
  const handleDeleteConfirm = async () => {
    if (!docToDelete || !currentUser?.id) return;
    try {
      let token = accessToken;
      if (!token && isDriveConnected) {
        try {
          const authRes = await requestGoogleDriveAccessToken(undefined, currentUser.email);
          token = authRes.accessToken;
          setAccessToken(token);
        } catch (e) {
          console.warn('Could not acquire token for drive delete:', e);
        }
      }

      if (token && docToDelete.driveFileId) {
        try {
          await deleteFileFromGoogleDrive(token, docToDelete.driveFileId);
        } catch (err) {
          console.warn('Could not delete file from Google Drive:', err);
        }
      }

      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'locker-delete-doc',
          data: {
            id: docToDelete.id,
            userId: currentUser.id,
          },
        }),
      });

      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      setDocToDelete(null);
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, key: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  // Open Edit Exam Modal
  const handleOpenEditExam = (exam: TrackedJob) => {
    setEditingExam(exam);
    setExamFormTitle(exam.title);
    setExamFormCategory(exam.category || '');
    setExamFormAppNo(exam.applicationNo || '');
    setExamFormPassword(exam.password || '');
    setExamFormRollNo(exam.rollNumber || '');
    setExamFormExamDate(exam.examDate || '');
    setExamFormCenter(exam.examCenter || '');
    setExamFormShift(exam.shiftTime || '');
    setExamFormNotes(exam.notes || '');
  };

  // Save Edited Exam
  const handleSaveEditedExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam || !currentUser) return;

    const list = currentUser.trackedJobs || [];
    const index = list.findIndex((j) => j.noticeId === editingExam.noticeId);

    const updatedJob: TrackedJob = {
      ...editingExam,
      title: examFormTitle.trim() || editingExam.title,
      category: examFormCategory.trim() || editingExam.category,
      applicationNo: examFormAppNo.trim() || undefined,
      password: examFormPassword.trim() || undefined,
      rollNumber: examFormRollNo.trim() || undefined,
      examDate: examFormExamDate.trim() || undefined,
      examCenter: examFormCenter.trim() || undefined,
      shiftTime: examFormShift.trim() || undefined,
      notes: examFormNotes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    let updatedList = [...list];
    if (index >= 0) {
      updatedList[index] = updatedJob;
    } else {
      updatedList.push(updatedJob);
    }

    updateTrackedJobs(updatedList);
    setEditingExam(null);
  };

  // Add Manual Applied Exam to Locker
  const handleSaveNewExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examFormTitle.trim() || !currentUser) return;

    const newJob: TrackedJob = {
      noticeId: `manual_${Date.now()}`,
      title: examFormTitle.trim(),
      category: examFormCategory.trim() || 'Exam',
      date: new Date().toISOString().split('T')[0],
      isApplied: true,
      isSaved: false,
      appliedDate: new Date().toISOString().split('T')[0],
      applicationNo: examFormAppNo.trim() || undefined,
      password: examFormPassword.trim() || undefined,
      rollNumber: examFormRollNo.trim() || undefined,
      examDate: examFormExamDate.trim() || undefined,
      examCenter: examFormCenter.trim() || undefined,
      shiftTime: examFormShift.trim() || undefined,
      notes: examFormNotes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    const list = currentUser.trackedJobs || [];
    updateTrackedJobs([newJob, ...list]);
    setIsAddExamModalOpen(false);
    setExamFormTitle('');
    setExamFormCategory('');
    setExamFormAppNo('');
    setExamFormPassword('');
    setExamFormRollNo('');
    setExamFormExamDate('');
    setExamFormCenter('');
    setExamFormShift('');
    setExamFormNotes('');
  };

  // Delete Exam from Vault with PIN Verification
  const handleDeleteExamWithPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser?.id || !examToDelete) return;
    if (deleteExamPinInput.length !== 4) {
      setDeleteExamError(language === 'hi' ? 'कृपया 4-अंकों का पिन दर्ज करें' : 'Please enter 4-digit PIN');
      return;
    }

    setDeleteExamLoading(true);
    setDeleteExamError(null);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'locker-verify-pin',
          data: { userId: currentUser.id, pin: deleteExamPinInput },
        }),
      });
      const data = await res.json();

      if (data.success && data.isCorrect) {
        const list = currentUser.trackedJobs || [];
        const updated = list.filter((j) => j.noticeId !== examToDelete.noticeId);
        updateTrackedJobs(updated);
        setExamToDelete(null);
        setDeleteExamPinInput('');
        setDeleteExamError(null);
      } else {
        setDeleteExamError(language === 'hi' ? 'गलत सिक्योरिटी पिन! पुनः प्रयास करें।' : 'Incorrect Security PIN. Please try again.');
        setDeleteExamPinInput('');
      }
    } catch (err) {
      console.error('Error verifying PIN for deletion:', err);
      setDeleteExamError(language === 'hi' ? 'पिन सत्यापन में त्रुटि' : 'Error verifying PIN');
    } finally {
      setDeleteExamLoading(false);
    }
  };

  // Applied Exams List
  const appliedExams = useMemo(() => {
    const jobs = currentUser?.trackedJobs || [];
    return jobs.filter((j) => j.isApplied);
  }, [currentUser]);

  // Section Counts
  const counts = useMemo(() => {
    const map: { [key in NavSection]: number } = {
      APPLIED_EXAMS: appliedExams.length,
      ALL: documents.length,
      ADMIT_CARD: documents.filter((d) => d.docType === 'ADMIT_CARD').length,
      APPLICATION_FORM: documents.filter((d) => d.docType === 'APPLICATION_FORM').length,
      PHOTO: documents.filter((d) => d.docType === 'PHOTO').length,
      SIGNATURE: documents.filter((d) => d.docType === 'SIGNATURE').length,
      CERTIFICATE: documents.filter((d) => d.docType === 'CERTIFICATE').length,
      ID_PROOF: documents.filter((d) => d.docType === 'ID_PROOF').length,
    };
    return map;
  }, [appliedExams, documents]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (activeSection !== 'ALL' && activeSection !== 'APPLIED_EXAMS' && doc.docType !== activeSection) {
        return false;
      }
      if (selectedYear !== 'ALL' && doc.year?.toString() !== selectedYear) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesExam = (doc.examName || '').toLowerCase().includes(q);
        return matchesTitle || matchesExam;
      }
      return true;
    });
  }, [documents, activeSection, selectedYear, searchQuery]);

  // Filtered Applied Exams
  const filteredAppliedExams = useMemo(() => {
    if (!searchQuery.trim()) return appliedExams;
    const q = searchQuery.toLowerCase();
    return appliedExams.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.category && e.category.toLowerCase().includes(q)) ||
        (e.applicationNo && e.applicationNo.toLowerCase().includes(q)) ||
        (e.rollNumber && e.rollNumber.toLowerCase().includes(q))
    );
  }, [appliedExams, searchQuery]);

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

  const activeSectionInfo = MENU_ITEMS.find((m) => m.id === activeSection) || MENU_ITEMS[0];

  // Auth requirement guard
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

  // Loading guard while fetching initial PIN and document status
  if (loading && !isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {language === 'hi' ? 'दस्तावेज़ लॉकर खुल रहा है...' : 'Accessing Document Locker...'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {language === 'hi' ? 'सुरक्षा स्थिति सत्यापित हो रही है...' : 'Verifying vault security status...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: FIRST-TIME 4-DIGIT PIN SETUP FLOW (If user has never set a PIN)
  // =========================================================================
  if (!userLockerPin && !isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-6">
          
          {/* MockTest Hub Logo & Branding */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-2.5 rounded-2xl border border-blue-200/50 dark:border-slate-700 shadow-md flex items-center justify-center h-14 w-14 shrink-0 mb-2.5">
              <Trophy className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="font-black text-2xl tracking-tight leading-none flex items-center justify-center">
              <span className="text-slate-900 dark:text-white">MockTest</span>
              <span className="text-blue-600 dark:text-blue-400 ml-1">Hub</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-1">
              {language === 'hi' ? 'परीक्षा की तैयारी' : 'Exam Preparation'}
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {language === 'hi' ? 'डॉक्यूमेंट लॉकर सिक्योरिटी पिन सेट करें' : 'Set Document Locker Security PIN'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {language === 'hi'
                ? 'अपने प्रवेश पत्र, आवेदन पासवर्ड और निजी Google Drive फ़ाइलों को सुरक्षित रखने के लिए 4-अंकों का पिन बनाएं।'
                : 'Protect your Admit Cards, Registration Passwords, and Personal Google Drive Folders with a 4-digit Security PIN.'}
            </p>
          </div>

          {pinError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {setupStep === 'CREATE' ? (
            <form onSubmit={handleFirstTimePinNext} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  {language === 'hi' ? '4-अंकों का पिन दर्ज करें' : 'Enter 4-Digit PIN'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="••••"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  autoFocus
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] py-3 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 font-bold"
                />
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="w-1/2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition hover:bg-slate-200"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={newPinInput.length !== 4}
                  className="w-1/2 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  Next Step
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFirstTimePinConfirm} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  {language === 'hi' ? 'पुष्टि करने के लिए दोबारा पिन दर्ज करें' : 'Confirm Your 4-Digit PIN'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="••••"
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  autoFocus
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] py-3 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 font-bold"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSetupStep('CREATE');
                    setConfirmPinInput('');
                    setPinError(null);
                  }}
                  className="w-1/2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition hover:bg-slate-200 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={confirmPinInput.length !== 4}
                  className="w-1/2 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  Save & Unlock
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOCKER LOCKED SCREEN (PIN Pad & Auto-Unlock)
  // =========================================================================
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div
          className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl space-y-6 transition-transform duration-200 ${
            isPinShake ? 'animate-shake translate-x-1 ring-2 ring-rose-500' : ''
          }`}
        >
          {/* MockTest Hub Logo & Branding */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-2.5 rounded-2xl border border-blue-200/50 dark:border-slate-700 shadow-md flex items-center justify-center h-12 w-12 shrink-0 mb-2">
              <Trophy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="font-black text-xl tracking-tight leading-none flex items-center justify-center">
              <span className="text-slate-900 dark:text-white">MockTest</span>
              <span className="text-blue-600 dark:text-blue-400 ml-1">Hub</span>
            </h1>
            <p className="text-[8px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">
              {language === 'hi' ? 'परीक्षा की तैयारी' : 'Exam Preparation'}
            </p>
          </div>

          {/* Header Lock Icon */}
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto border border-purple-200 dark:border-purple-800 shadow-sm">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {language === 'hi' ? 'डॉक्यूमेंट लॉकर लॉक है' : 'Document Locker Locked'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'hi'
                ? 'वॉल्ट खोलने के लिए अपना 4-अंकों का पिन दर्ज करें'
                : 'Enter your 4-digit PIN to access your vault'}
            </p>
          </div>

          {/* Keyboard PIN Entry Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (enteredPin.length === 4) {
                verifyEnteredPin(enteredPin);
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {language === 'hi' ? '4-अंकों का पिन दर्ज करें' : 'ENTER 4-DIGIT PIN'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                placeholder="••••"
                value={enteredPin}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setEnteredPin(cleaned);
                  setPinError(null);
                  if (cleaned.length === 4) {
                    verifyEnteredPin(cleaned);
                  }
                }}
                required
                autoFocus
                className="w-full text-center text-2xl font-mono tracking-[0.5em] py-3 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 font-bold"
              />
            </div>

            {pinError && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 animate-pulse">
                {pinError}
              </p>
            )}

            {pinSuccessMsg && (
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {pinSuccessMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={enteredPin.length !== 4 || isPinVerifying}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-600/20 cursor-pointer flex items-center justify-center gap-2"
            >
              {isPinVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'hi' ? 'सत्यापित हो रहा है...' : 'Verifying...'}</span>
                </>
              ) : (
                <span>{language === 'hi' ? 'वॉल्ट खोलें' : 'Unlock Vault'}</span>
              )}
            </button>
          </form>

          {/* Forgot PIN & Back to Home Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
            <Link href="/" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              {language === 'hi' ? '← मुख्य पृष्ठ' : '← Back to Home'}
            </Link>
            <button
              type="button"
              onClick={() => {
                setForgotError(null);
                setForgotOtpInput('');
                setForgotNewPinInput('');
                setForgotConfirmPinInput('');
                setForgotOtpStep('SEND_OTP');
                setIsForgotPinModalOpen(true);
              }}
              className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              {language === 'hi' ? 'पिन भूल गए?' : 'Forgot PIN?'}
            </button>
          </div>
        </div>

        {/* FORGOT PIN: RESET VIA OTP TO CONNECTED GMAIL MODAL */}
        {isForgotPinModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {language === 'hi' ? 'Gmail OTP से पिन रीसेट करें' : 'Reset PIN via Gmail OTP'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {language === 'hi' ? 'सुरक्षित 6-अंकों का सत्यापन कोड' : 'Secure 6-Digit Verification Code'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsForgotPinModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {forgotError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotOtpStep === 'SEND_OTP' ? (
                /* STEP 1: SEND OTP BUTTON */
                <div className="space-y-4 text-center py-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-200 dark:border-blue-800">
                    <Send className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {language === 'hi' ? 'सत्यापन कोड भेजें' : 'Send Verification Code'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                      {language === 'hi'
                        ? 'आपके कनेक्टेड Google Drive Gmail (या पंजीकृत खाते) पर 6-अंकों का OTP भेजा जाएगा।'
                        : 'A 6-digit verification code will be sent to your connected Google Drive Gmail (or registered account email).'}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsForgotPinModalOpen(false)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendResetOtp}
                      disabled={forgotLoading}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5" />
                          <span>Send OTP to Gmail</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 2: ENTER OTP & NEW 4-DIGIT PIN */
                <form onSubmit={handleVerifyOtpAndResetPin} className="space-y-4">
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-purple-900 dark:text-purple-200">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>OTP Sent Successfully!</span>
                    </p>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-1">
                      Check inbox of <span className="font-mono font-bold text-purple-900 dark:text-white">{maskedTargetEmail}</span> for the 6-digit code.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Enter 6-Digit OTP Code *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      pattern="\d{6}"
                      placeholder="123456"
                      value={forgotOtpInput}
                      onChange={(e) => setForgotOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      autoFocus
                      className="w-full text-center font-mono text-xl tracking-[0.4em] py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-black focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                        New 4-Digit PIN *
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="••••"
                        value={forgotNewPinInput}
                        onChange={(e) => setForgotNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        required
                        className="w-full text-center font-mono text-lg tracking-[0.3em] py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                        Confirm PIN *
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="••••"
                        value={forgotConfirmPinInput}
                        onChange={(e) => setForgotConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        required
                        className="w-full text-center font-mono text-lg tracking-[0.3em] py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleSendResetOtp}
                      disabled={resendCooldown > 0 || forgotLoading}
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsForgotPinModalOpen(false)}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={forgotLoading || forgotOtpInput.length !== 6 || forgotNewPinInput.length !== 4}
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-600/20 cursor-pointer"
                      >
                        {forgotLoading ? 'Verifying...' : 'Set PIN & Unlock'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: UNLOCKED DOCUMENT LOCKER DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      
      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
              title={language === 'hi' ? 'मुख्य पृष्ठ पर वापस जाएं' : 'Back to Home'}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-purple-600/20">
                <FolderLock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Document Locker</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> PIN Protected
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Your private exam vault for Admit Cards, Application Forms & Credentials
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Lock Vault Button */}
            <button
              onClick={handleLockVault}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition cursor-pointer"
              title="Lock Document Locker"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock Vault</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              onClick={() => {
                setUploadExamName('');
                setIsUploadModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload File</span>
              <span className="sm:hidden">Upload</span>
            </button>
          </div>
        </div>
      </header>

      {/* PIN SUCCESS TOAST */}
      {pinSuccessMsg && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{pinSuccessMsg}</span>
        </div>
      )}

      {/* MAIN TWO-COLUMN SPLIT LAYOUT (LEFT SIDEBAR MENU + RIGHT DETAILS) */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col md:flex-row gap-6 items-start">
        
        {/* ======================================================== */}
        {/* LEFT SIDEBAR MENU SECTION (280px - 320px)                */}
        {/* ======================================================== */}
        <aside className="w-full md:w-80 shrink-0 space-y-4 md:sticky md:top-20">
          
          {/* 1. GOOGLE DRIVE SYNC CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Google Drive Sync
                  </h3>
                  <p className="text-[10px] text-slate-400">100% Private Cloud Storage</p>
                </div>
              </div>

              {isDriveConnected ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <CloudOff className="w-3 h-3" /> Offline
                </span>
              )}
            </div>

            {isDriveConnected ? (
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                {driveEmail && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate font-mono bg-slate-50 dark:bg-slate-850 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    📧 {driveEmail}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <a
                    href={`https://drive.google.com/drive/folders/${rootFolderId || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Open Drive</span>
                  </a>
                  <button
                    onClick={handleDisconnectGoogleDrive}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/40 transition cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={handleConnectGoogleDrive}
                  disabled={connectingDrive}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {connectingDrive ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Connect Google Drive</span>
                    </>
                  )}
                </button>

                {connectError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{connectError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. NAVIGATION MENU LIST */}
          <nav className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {language === 'hi' ? 'लॉकर मेन्यू नेविगेशन' : 'Locker Navigation'}
            </div>

            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const count = counts[item.id] || 0;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : item.color
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate">{language === 'hi' ? item.labelHi : item.label}</span>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* 3. SIDEBAR QUICK ACTIONS & SECURITY SETTINGS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {language === 'hi' ? 'त्वरित क्रियाएँ और सुरक्षा' : 'Actions & Security'}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  setExamFormTitle('');
                  setExamFormCategory('');
                  setExamFormAppNo('');
                  setExamFormPassword('');
                  setExamFormRollNo('');
                  setExamFormExamDate('');
                  setExamFormCenter('');
                  setExamFormShift('');
                  setExamFormNotes('');
                  setIsAddExamModalOpen(true);
                }}
                className="w-full py-2 px-3 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Applied Exam</span>
              </button>

              <button
                onClick={() => {
                  setUploadExamName('');
                  setIsUploadModalOpen(true);
                }}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
              </button>

              <button
                onClick={() => {
                  setChangeError(null);
                  setChangeOldPinInput('');
                  setChangeNewPinInput('');
                  setChangeConfirmPinInput('');
                  setIsChangePinModalOpen(true);
                }}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Change Security PIN</span>
              </button>
            </div>

            {/* Filter by Exam Year */}
            {availableYears.length > 0 && activeSection !== 'APPLIED_EXAMS' && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Filter by Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold"
                >
                  <option value="ALL">All Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="p-3.5 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              All your credentials and uploaded files are protected by your 4-digit PIN and stored safely in your Google Drive.
            </span>
          </div>

        </aside>

        {/* ======================================================== */}
        {/* RIGHT CONTENT & DETAILS SECTION                          */}
        {/* ======================================================== */}
        <main className="flex-1 w-full space-y-4 min-w-0">

          {/* TOP CONTROLS & BREADCRUMB BAR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    Locker Section
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-bold">
                    {activeSection === 'APPLIED_EXAMS' ? `${filteredAppliedExams.length} Exams` : `${filteredDocuments.length} Files`}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <activeSectionInfo.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span>{language === 'hi' ? activeSectionInfo.labelHi : activeSectionInfo.label}</span>
                </h2>
              </div>

              {/* View Switcher & Actions */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {activeSection !== 'APPLIED_EXAMS' && (
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg transition ${
                        viewMode === 'grid'
                          ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-lg transition ${
                        viewMode === 'list'
                          ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title="List View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {activeSection === 'APPLIED_EXAMS' ? (
                  <button
                    onClick={() => {
                      setExamFormTitle('');
                      setExamFormCategory('');
                      setExamFormAppNo('');
                      setExamFormPassword('');
                      setExamFormRollNo('');
                      setExamFormExamDate('');
                      setExamFormCenter('');
                      setExamFormShift('');
                      setExamFormNotes('');
                      setIsAddExamModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Applied Exam</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setUploadDocType(activeSection === 'ALL' ? 'ADMIT_CARD' : activeSection);
                      setUploadExamName('');
                      setIsUploadModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload to this Folder</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeSection === 'APPLIED_EXAMS'
                    ? 'Search by Exam name, Category, Registration ID, or Roll Number...'
                    : 'Search documents by filename, title, or exam name...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: APPLIED EXAMS VAULT VIEW                          */}
          {/* ======================================================== */}
          {activeSection === 'APPLIED_EXAMS' && (
            <div className="space-y-4">
              {filteredAppliedExams.length === 0 ? (
                <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-3">
                  <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {searchQuery ? 'No matching applied exams found.' : 'No applied exams in your vault yet.'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {searchQuery
                      ? 'Try searching with a different term or clear your search.'
                      : 'Mark any recruitment notice as "Applied" from the Live Notices section or click "Add Applied Exam" to store your registration details and admit cards.'}
                  </p>
                  <button
                    onClick={() => {
                      setExamFormTitle('');
                      setExamFormCategory('');
                      setExamFormAppNo('');
                      setExamFormPassword('');
                      setExamFormRollNo('');
                      setExamFormExamDate('');
                      setExamFormCenter('');
                      setExamFormShift('');
                      setExamFormNotes('');
                      setIsAddExamModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Applied Exam
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {filteredAppliedExams.map((exam) => {
                    const examDocs = documents.filter(
                      (d) =>
                        d.examName?.toLowerCase().trim() === exam.title.toLowerCase().trim() ||
                        (exam.category && d.examName?.toLowerCase().trim() === exam.category.toLowerCase().trim())
                    );
                    const isPassVisible = !!visiblePasswords[exam.noticeId];

                    return (
                      <div
                        key={exam.noticeId}
                        className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 hover:border-purple-500/40 shadow-sm transition flex flex-col justify-between"
                      >
                        {/* Header */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                                  {exam.category || 'Exam'}
                                </span>
                                {exam.appliedDate && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    📅 Applied: {exam.appliedDate}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                                {exam.title}
                              </h3>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleOpenEditExam(exam)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition cursor-pointer"
                                title="Edit Credentials"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {exam.driveFolderLink && (
                                <a
                                  href={exam.driveFolderLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                                  title="Open Google Drive Exam Folder"
                                >
                                  <FolderOpen className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setDeleteExamPinInput('');
                                  setDeleteExamError(null);
                                  setExamToDelete(exam);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                title={language === 'hi' ? 'परीक्षा डेटा हटाएं' : 'Delete Exam Data'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Credentials Matrix Box - Registration No, Password, Roll Number in Same Horizontal Line */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                            {/* Application / Reg No */}
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                Registration / App No
                              </span>
                              {exam.applicationNo ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
                                    {exam.applicationNo}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(exam.applicationNo!, `reg_${exam.noticeId}`)}
                                    className="p-1 text-slate-400 hover:text-purple-600 transition cursor-pointer shrink-0"
                                    title="Copy Registration Number"
                                  >
                                    {copiedKey === `reg_${exam.noticeId}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Not entered</span>
                              )}
                            </div>

                            {/* Password / DOB */}
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                Portal Password / DOB
                              </span>
                              {exam.password ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
                                    {isPassVisible ? exam.password : '••••••••'}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setVisiblePasswords((prev) => ({
                                        ...prev,
                                        [exam.noticeId]: !prev[exam.noticeId],
                                      }))
                                    }
                                    className="p-1 text-slate-400 hover:text-purple-600 transition cursor-pointer shrink-0"
                                    title={isPassVisible ? 'Hide Password' : 'Show Password'}
                                  >
                                    {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(exam.password!, `pass_${exam.noticeId}`)}
                                    className="p-1 text-slate-400 hover:text-purple-600 transition cursor-pointer shrink-0"
                                    title="Copy Password"
                                  >
                                    {copiedKey === `pass_${exam.noticeId}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Not entered</span>
                              )}
                            </div>

                            {/* Roll Number */}
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                Roll Number
                              </span>
                              {exam.rollNumber ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
                                    {exam.rollNumber}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(exam.rollNumber!, `roll_${exam.noticeId}`)}
                                    className="p-1 text-slate-400 hover:text-purple-600 transition cursor-pointer shrink-0"
                                    title="Copy Roll Number"
                                  >
                                    {copiedKey === `roll_${exam.noticeId}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Not entered</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Associated Documents Section */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <FolderLock className="w-3.5 h-3.5 text-purple-600" />
                              <span>Uploaded Docs ({examDocs.length})</span>
                            </span>
                            <button
                              onClick={() => {
                                setUploadExamName(exam.title);
                                setUploadDocType('ADMIT_CARD');
                                setIsUploadModalOpen(true);
                              }}
                              className="text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Upload File
                            </button>
                          </div>

                          {examDocs.length > 0 ? (
                            <div className="space-y-1.5">
                              {examDocs.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-850 text-xs border border-slate-200/60 dark:border-slate-800"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                      {doc.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => setPreviewDoc(doc)}
                                      className="p-1 text-slate-400 hover:text-blue-600 transition"
                                      title="Preview Document"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    {doc.driveViewUrl && (
                                      <a
                                        href={doc.driveViewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 text-slate-400 hover:text-blue-600 transition"
                                        title="Open in Drive"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              No Admit Card or Application Form uploaded yet for this exam.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: ALL FILES & CATEGORY DOCUMENT BROWSER             */}
          {/* ======================================================== */}
          {activeSection !== 'APPLIED_EXAMS' && (
            <div className="space-y-4">
              {filteredDocuments.length === 0 ? (
                <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-3">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {searchQuery ? 'No matching documents found.' : 'No files uploaded in this folder yet.'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {searchQuery
                      ? 'Try searching with a different filename or clear your search filter.'
                      : 'Upload your Admit Cards, Application Forms, Passport Photos, or Certificates to safely store them in Google Drive.'}
                  </p>
                  <button
                    onClick={() => {
                      setUploadDocType(activeSection === 'ALL' ? 'ADMIT_CARD' : activeSection);
                      setUploadExamName('');
                      setIsUploadModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <Upload className="w-4 h-4" /> Upload Document
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                /* GRID VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 hover:border-purple-500/40 hover:shadow-md transition group flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Thumbnail / Header */}
                        <div
                          onClick={() => setPreviewDoc(doc)}
                          className="h-32 w-full rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center overflow-hidden cursor-pointer relative group/thumb"
                        >
                          {doc.mimeType?.startsWith('image/') || doc.thumbnailUrl ? (
                            <img
                              src={`https://drive.google.com/thumbnail?id=${doc.driveFileId}&sz=w400`}
                              alt={doc.title}
                              className="w-full h-full object-contain p-2"
                              onError={(e: any) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="text-center p-3 space-y-1">
                              <FileText className="w-8 h-8 text-blue-500 mx-auto" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                PDF Document
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center gap-2 text-white text-xs font-bold">
                            <Eye className="w-4 h-4" /> Preview
                          </div>
                        </div>

                        {/* Title & Metadata */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {doc.docType.replace('_', ' ')}
                            </span>
                            {doc.year && (
                              <span className="text-[9px] font-mono text-slate-400">
                                {doc.year}
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition leading-snug line-clamp-2">
                            {doc.title}
                          </h4>
                          {doc.examName && (
                            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-bold truncate mt-0.5">
                              Exam: {doc.examName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <span className="text-[10px] font-mono">{formatSize(doc.fileSizeBytes)}</span>
                        <div className="flex items-center gap-1">
                          {doc.driveViewUrl && (
                            <a
                              href={doc.driveViewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {doc.driveDownloadUrl && (
                            <a
                              href={doc.driveDownloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                              title="Download File"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setDocToDelete(doc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer"
                            title="Delete File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* LIST VIEW */
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                          {doc.mimeType?.startsWith('image/') ? (
                            <ImageIcon className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {doc.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono flex-wrap">
                            <span className="font-bold text-purple-600 dark:text-purple-400 uppercase">
                              {doc.docType.replace('_', ' ')}
                            </span>
                            {doc.examName && <span>• {doc.examName}</span>}
                            <span>• {formatSize(doc.fileSizeBytes)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Preview</span>
                        </button>
                        {doc.driveViewUrl && (
                          <a
                            href={doc.driveViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                            title="Open in Drive"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => setDocToDelete(doc)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ======================================================== */}
      {/* MODALS & DIALOGS                                         */}
      {/* ======================================================== */}

      {/* MODAL 1: Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload Document to Google Drive
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Document Type *
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold"
                >
                  <option value="ADMIT_CARD">Admit Card / Hall Ticket</option>
                  <option value="APPLICATION_FORM">Application Form / Confirmation</option>
                  <option value="PHOTO">Passport Size Photo</option>
                  <option value="SIGNATURE">Signature</option>
                  <option value="CERTIFICATE">Certificate / Marksheet</option>
                  <option value="ID_PROOF">Govt ID Proof (Aadhaar/PAN)</option>
                  <option value="OTHER">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SSC CGL 2025 Tier-1 Admit Card"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Associated Exam Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. SSC CGL 2025 or CTET July 2025"
                  value={uploadExamName}
                  onChange={(e) => setUploadExamName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  A dedicated folder with this exam name will be auto-created in your Google Drive.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Select File (PDF, JPEG, PNG) *
                </label>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {uploading && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3 text-xs text-blue-700 dark:text-blue-300">
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>{uploadProgressMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? 'Uploading...' : 'Upload & Save to Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Exam Credentials Modal */}
      {editingExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-600" />
                Edit Exam Credentials
              </h3>
              <button
                onClick={() => setEditingExam(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Exam Title
                </label>
                <input
                  type="text"
                  value={examFormTitle}
                  onChange={(e) => setExamFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Registration / App No
                  </label>
                  <input
                    type="text"
                    value={examFormAppNo}
                    onChange={(e) => setExamFormAppNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Login Password / DOB
                  </label>
                  <input
                    type="text"
                    value={examFormPassword}
                    onChange={(e) => setExamFormPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={examFormRollNo}
                    onChange={(e) => setExamFormRollNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Notes
                </label>
                <textarea
                  value={examFormNotes}
                  onChange={(e) => setExamFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingExam(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Manual Applied Exam Modal */}
      {isAddExamModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-600" />
                Add Applied Exam to Vault
              </h3>
              <button
                onClick={() => setIsAddExamModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Exam Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SSC CGL 2025 or CTET July 2025"
                  value={examFormTitle}
                  onChange={(e) => setExamFormTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. SSC, Banking, Railways"
                  value={examFormCategory}
                  onChange={(e) => setExamFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Registration / App No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2501009845"
                    value={examFormAppNo}
                    onChange={(e) => setExamFormAppNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Login Password / DOB
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pass@1234"
                    value={examFormPassword}
                    onChange={(e) => setExamFormPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2201019940"
                    value={examFormRollNo}
                    onChange={(e) => setExamFormRollNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddExamModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  Save Exam to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Preview Modal */}
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in Google Drive
                  </a>
                )}
                {previewDoc.driveDownloadUrl && (
                  <a
                    href={previewDoc.driveDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Delete Document Confirmation */}
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
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5.5: Delete Exam Confirmation with PIN Entry */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                {language === 'hi' ? 'परीक्षा डेटा हटाएं?' : 'Delete Exam Data?'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === 'hi'
                  ? `"${examToDelete.title}" और इसके क्रेडेंशियल्स को हटाने के लिए 4-अंकों का लॉकर पिन दर्ज करें:`
                  : `Enter your 4-digit Locker PIN to delete "${examToDelete.title}" and its saved credentials:`}
              </p>
            </div>

            <form onSubmit={handleDeleteExamWithPin} className="space-y-4">
              <div className="space-y-1">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  autoFocus
                  value={deleteExamPinInput}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setDeleteExamPinInput(cleaned);
                    setDeleteExamError(null);
                  }}
                  required
                  className="w-full text-center text-xl font-mono tracking-[0.4em] py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 font-bold"
                />
              </div>

              {deleteExamError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-1.5 justify-center">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{deleteExamError}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setExamToDelete(null);
                    setDeleteExamPinInput('');
                    setDeleteExamError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={deleteExamLoading || deleteExamPinInput.length !== 4}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  {deleteExamLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{language === 'hi' ? 'सत्यापित हो रहा है...' : 'Verifying...'}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'hi' ? 'पिन दर्ज कर हटाएं' : 'Delete Exam'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Change Security PIN Modal */}
      {isChangePinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {language === 'hi' ? 'सिक्योरिटी पिन बदलें' : 'Change Security PIN'}
                </h3>
              </div>
              <button
                onClick={() => setIsChangePinModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {changeError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{changeError}</span>
              </div>
            )}

            <form onSubmit={handleChangePinSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Current 4-Digit PIN *
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={changeOldPinInput}
                  onChange={(e) => setChangeOldPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  className="w-full text-center font-mono text-base py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    New 4-Digit PIN *
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={changeNewPinInput}
                    onChange={(e) => setChangeNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                    className="w-full text-center font-mono text-base py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Confirm PIN *
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={changeConfirmPinInput}
                    onChange={(e) => setChangeConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                    className="w-full text-center font-mono text-base py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsChangePinModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changeLoading || changeNewPinInput.length !== 4}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-600/20"
                >
                  {changeLoading ? 'Updating...' : 'Update PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
