"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, MockUser, MockTestRecord } from '../AuthContext';
import { TRANSLATIONS } from '../translations';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Upload, Database, Users, TrendingUp, BarChart2, BookOpen, AlertCircle, CheckCircle2, Search, Trash2, Edit, Calendar, UserCheck, RefreshCw, X, Award, ChevronRight, FileText, Sun, Moon, Bell, PlusCircle, FolderPlus, Layers, Globe, ArrowLeft, Menu, Coins, Megaphone, MessageSquare, MessageCircle, ArrowUp, ArrowDown, Gift, Lightbulb, Key, ShieldAlert, Zap } from 'lucide-react';
import { useIsMobile } from '../useIsMobile';
import { BulkQuestionImporter } from './components/BulkQuestionImporter';
import { MockTestManager } from './components/MockTestManager';
import { DatabaseMonitor } from './components/DatabaseMonitor';
import { VocabManager } from './components/VocabManager';
import { PracticeSeriesManager } from './components/PracticeSeriesManager';

// ============================================================================
// MOCK ANALYTICS DATA FOR REPORT GENERATION
// ============================================================================
const percentileData = [
  { testName: 'Mock 1', studentPercentile: 72, topperPercentile: 99 },
  { testName: 'Mock 2', studentPercentile: 78, topperPercentile: 98 },
  { testName: 'Mock 3', studentPercentile: 82, topperPercentile: 99 },
  { testName: 'Mock 4', studentPercentile: 85, topperPercentile: 100 },
  { testName: 'Mock 5', studentPercentile: 89, topperPercentile: 99 },
  { testName: 'Mock 6', studentPercentile: 93, topperPercentile: 100 },
];

const sectionalTimeData = [
  { section: 'Quantitative', studentTimeMin: 22, topperTimeMin: 18, avgUserTimeMin: 25 },
  { section: 'Reasoning', studentTimeMin: 14, topperTimeMin: 11, avgUserTimeMin: 16 },
  { section: 'English', studentTimeMin: 10, topperTimeMin: 8, avgUserTimeMin: 12 },
  { section: 'General Awareness', studentTimeMin: 6, topperTimeMin: 5, avgUserTimeMin: 7 },
];

const accuracySpeedVariance = [
  { difficulty: 'Easy', studentAccuracy: 95, topperAccuracy: 98, timePerQSeconds: 32 },
  { difficulty: 'Medium', studentAccuracy: 84, topperAccuracy: 90, timePerQSeconds: 58 },
  { difficulty: 'Hard', studentAccuracy: 56, topperAccuracy: 72, timePerQSeconds: 92 },
];

const scoreVariance = [
  { name: 'Student Score', value: 162.5 },
  { name: 'Topper Score', value: 186.0 },
  { name: 'Cutoff Score', value: 135.0 },
  { name: 'Avg Score', value: 114.5 },
];

// ============================================================================
// HELPER: Format seconds into Hh Mm Ss (same logic as analysis page)
// ============================================================================
const formatExactTime = (secs: number): string => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

const computeExactTimeSpent = (session: any): number => {
  // Priority 1: Sum per-question elapsedSeconds — same as analysis page
  if (session.responses && Object.keys(session.responses).length > 0) {
    const total = Object.values(session.responses).reduce(
      (sum: number, r: any) => sum + (r?.elapsedSeconds ?? 0), 0
    ) as number;
    if (total > 0) return total;
  }
  // Fallback 1: timeSpentSeconds if recorded
  if (session.timeSpentSeconds && session.timeSpentSeconds > 0) return session.timeSpentSeconds;
  // Fallback 2: timer-elapsed (totalDuration - timeRemaining)
  if (session.durationSeconds && session.durationSeconds > 0) return session.durationSeconds;
  return 0;
};

const isUserOnline = (lastSeenStr?: string | null): boolean => {
  if (!lastSeenStr) return false;
  const lastSeen = new Date(lastSeenStr).getTime();
  if (isNaN(lastSeen)) return false;
  return (Date.now() - lastSeen) <= 5 * 60 * 1000;
};

const formatTimeAgo = (dateStr?: string | null): string => {
  if (!dateStr) return 'Never';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Never';
  const diffMs = Date.now() - time;
  const mins = Math.floor(diffMs / (1000 * 60));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ============================================================================
// CORE ADMIN COMPONENT
// ============================================================================
export default function AdminAnalytics() {
  const { isMobile, isMounted } = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'analytics' | 'users' | 'notices' | 'testimonials' | 'categories' | 'subcategories' | 'subsubcategories' | 'mocks' | 'reports' | 'announcements' | 'support' | 'dbmonitor' | 'feedback' | 'attempts' | 'suggestions' | 'vocab' | 'practice_series'>('analytics');

  const selectTab = (tab: 'upload' | 'analytics' | 'users' | 'notices' | 'testimonials' | 'categories' | 'subcategories' | 'subsubcategories' | 'mocks' | 'reports' | 'announcements' | 'support' | 'dbmonitor' | 'feedback' | 'attempts' | 'suggestions' | 'vocab' | 'practice_series') => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };
  const [jsonInput, setJsonInput] = useState<string>('');

  // Support team states
  const [supportUsers, setSupportUsers] = useState<any[]>([]);
  const [selectedSupportUserId, setSelectedSupportUserId] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportInputText, setSupportInputText] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportUsersLoading, setSupportUsersLoading] = useState(false);
  const [supportSending, setSupportSending] = useState(false);
  const [supportSearchQuery, setSupportSearchQuery] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');

  // Feedbacks state
  const [feedbacksList, setFeedbacksList] = useState<any[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  // Attempts state
  const [attemptsList, setAttemptsList] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [attemptsSearch, setAttemptsSearch] = useState('');
  const [attemptsPlatformFilter, setAttemptsPlatformFilter] = useState<'all' | 'web' | 'app' | 'mobile_web'>('all');
  const [attemptsStatusFilter, setAttemptsStatusFilter] = useState<'all' | 'ONGOING' | 'COMPLETED' | 'AUTO_SUBMITTED'>('all');

  const fetchAttempts = async () => {
    setLoadingAttempts(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-attempts' })
      });
      const data = await res.json();
      if (data.success) {
        setAttemptsList(data.attempts || []);
      }
    } catch (e) {
      console.error('Failed to fetch attempts:', e);
    } finally {
      setLoadingAttempts(false);
    }
  };

  const handleAdminResetAttempt = async (userId: string, sessionId: string, userName: string, sessionTitle: string) => {
    if (!confirm(`Are you sure you want to reset the attempt for ${userName} on "${sessionTitle}"? The candidate will be able to take the test again.`)) return;
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-attempt',
          data: { userId, sessionId }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Attempt reset successfully');
        fetchAttempts();
      } else {
        showToast('Failed to reset attempt: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      console.error(e);
      showToast('Error resetting attempt: ' + e.message);
    }
  };

  const handleAdminClearSession = async (userId: string, testId: string, userName: string, sessionTitle: string) => {
    if (!confirm(`Are you sure you want to clear the ongoing session for ${userName} on "${sessionTitle}"?`)) return;
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear-ongoing-session',
          data: { userId, testId }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Ongoing session cleared successfully');
        fetchAttempts();
      } else {
        showToast('Failed to clear session: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      console.error(e);
      showToast('Error clearing session: ' + e.message);
    }
  };

  const handleSaveEditMessage = async (messageId: string, text: string) => {
    if (!text.trim()) return;
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit-support-message',
          data: { messageId, newMessage: text.trim() }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSupportMessages(prev => prev.map(msg => msg.id === messageId ? data.message : msg));
        setEditingMessageId(null);
        showToast('Message updated successfully');
        fetchSupportUsers(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFeedbacks = async () => {
    setLoadingFeedbacks(true);
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      if (data.success) {
        setFeedbacksList(data.feedbacks || []);
      }
    } catch (e) {
      console.error('Failed to fetch feedbacks:', e);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const deleteFeedback = async (id: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this feedback and rating entry? This action cannot be undone.");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/feedback?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Feedback deleted successfully.');
        setFeedbacksList(prev => prev.filter(f => f.id !== id));
      } else {
        showToast(data.error || 'Failed to delete feedback.');
      }
    } catch (e: any) {
      console.error('Failed to delete feedback:', e);
      showToast(e.message || 'Connection error');
    }
  };

  useEffect(() => {
    if (activeTab === 'feedback') {
      fetchFeedbacks();
    } else if (activeTab === 'attempts') {
      fetchAttempts();
    }
  }, [activeTab]);

  // Poll support users list
  const fetchSupportUsers = async (showLoading = false) => {
    if (showLoading) setSupportUsersLoading(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-support-users' })
      });
      const data = await res.json();
      if (data.success) {
        setSupportUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
    if (showLoading) setSupportUsersLoading(false);
  };

  // Poll support messages for active chat
  const fetchSupportMessages = async (userId: string, markAsRead = false) => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-support-messages',
          data: { userId, markAsRead, readerRole: 'ADMIN' }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSupportMessages(data.messages || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Poll user list every 4 seconds
  React.useEffect(() => {
    fetchSupportUsers(true);
    const interval = setInterval(() => {
      fetchSupportUsers(false);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Poll messages every 3 seconds if a user is selected
  React.useEffect(() => {
    if (!selectedSupportUserId) {
      setSupportMessages([]);
      return;
    }
    fetchSupportMessages(selectedSupportUserId, true);
    const interval = setInterval(() => {
      fetchSupportMessages(selectedSupportUserId, false);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedSupportUserId]);

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupportUserId || !supportInputText.trim() || supportSending) return;
    const text = supportInputText.trim();
    setSupportInputText('');
    setSupportSending(true);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-support-message',
          data: { userId: selectedSupportUserId, sender: 'ADMIN', message: text }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSupportMessages(prev => [...prev, data.message]);
        fetchSupportUsers(false);
      }
    } catch (e) {
      console.error(e);
    }
    setSupportSending(false);
  };

  const totalUnseenCount = supportUsers.reduce((sum, u) => sum + (u.unseenCount || 0), 0);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [selectedUploadTestId, setSelectedUploadTestId] = useState<string>('');
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState<number>(0);
  const [previewLanguage, setPreviewLanguage] = useState<'en' | 'hi'>('en');

  // Easy Form Importer states
  const [importerMode, setImporterMode] = useState<'json' | 'form'>('json');
  const [formTextEn, setFormTextEn] = useState('');
  const [formTextHi, setFormTextHi] = useState('');
  const [opt1En, setOpt1En] = useState('');
  const [opt1Hi, setOpt1Hi] = useState('');
  const [opt2En, setOpt2En] = useState('');
  const [opt2Hi, setOpt2Hi] = useState('');
  const [opt3En, setOpt3En] = useState('');
  const [opt3Hi, setOpt3Hi] = useState('');
  const [opt4En, setOpt4En] = useState('');
  const [opt4Hi, setOpt4Hi] = useState('');
  const [opt5En, setOpt5En] = useState('');
  const [opt5Hi, setOpt5Hi] = useState('');
  const [formCorrectIndex, setFormCorrectIndex] = useState(0);
  const [formExplanationEn, setFormExplanationEn] = useState('');
  const [formExplanationHi, setFormExplanationHi] = useState('');
  const [formQuestionsList, setFormQuestionsList] = useState<any[]>([]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  // Question sections setup
  const defaultSections = [
    "General Studies",
    "Quantitative Aptitude",
    "General Intelligence & Reasoning",
    "English Comprehension",
    "Mathematics",
    "General Awareness"
  ];
  const [selectedSection, setSelectedSection] = useState('General Studies');
  const [customSectionName, setCustomSectionName] = useState('');

  const getAvailableSections = () => {
    const fromForm = formQuestionsList.map(q => q.section).filter(Boolean);
    const fromParsed = parsedQuestions.map(q => q.section).filter(Boolean);
    const allSecs = [...defaultSections, ...fromForm, ...fromParsed];
    return Array.from(new Set(allSecs));
  };

  // Notices states
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeType, setNoticeType] = useState('EXAM DATE');
  const [noticeCategory, setNoticeCategory] = useState<'notice' | 'result' | 'admit_card'>('notice');
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().split('T')[0]);
  const [noticeSearch, setNoticeSearch] = useState('');
  const [noticeUrl, setNoticeUrl] = useState('');
  const [noticeLastDate, setNoticeLastDate] = useState('');

  // Announcements states
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementType, setAnnouncementType] = useState('NEWS');
  const [announcementDate, setAnnouncementDate] = useState(new Date().toISOString().split('T')[0]);
  const [announcementUrl, setAnnouncementUrl] = useState('');
  const [announcementImageUrl, setAnnouncementImageUrl] = useState('');
  const [announcementSearch, setAnnouncementSearch] = useState('');

  // Testimonials states
  const [testiName, setTestiName] = useState('');
  const [testiExam, setTestiExam] = useState('');
  const [testiQuote, setTestiQuote] = useState('');
  const [testiInitials, setTestiInitials] = useState('');
  const [testiGradient, setTestiGradient] = useState('from-blue-600 to-cyan-500');
  const [testiPhotoUrl, setTestiPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingNotice, setIsUploadingNotice] = useState(false);
  const [isUploadingCategoryLogo, setIsUploadingCategoryLogo] = useState(false);
  const [isUploadingAnnouncement, setIsUploadingAnnouncement] = useState(false);
  const [testiSearch, setTestiSearch] = useState('');

  // User Management state from context
  const { 
    currentUser,
    login,
    logout,
    usersList, 
    saveUserProfileByAdmin, 
    resetAttempt, 
    theme, 
    toggleTheme, 
    noticesList, 
    addNotice, 
    deleteNotice, 
    language, 
    setLanguage,
    examCatalog,
    addCategory,
    editCategory,
    deleteCategory,
    addSubCategory,
    editSubCategory,
    deleteSubCategory,
    addSubSubCategory,
    editSubSubCategory,
    deleteSubSubCategory,
    addMockTest,
    editMockTestTitle,
    deleteMockTest,
    reorderCategories,
    reorderSubCategories,
    reorderSubSubCategories,
    reorderMockTests,
    reportedQuestionsList,
    deleteReportedQuestion,
    mergeUserSessions,
    refreshCatalog,
    refreshUsersList,
  } = useAuth();
  const t = TRANSLATIONS[language];

  // Admin Authentication State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);

    const isHardcodedAdmin = adminEmail.trim().toLowerCase() === 'admin@mocktest.com' && adminPassword === 'test@admin123';
    const targetEmail = isHardcodedAdmin ? 'admin@mocktest.com' : adminEmail.trim().toLowerCase();
    const targetPassword = isHardcodedAdmin ? 'password123' : adminPassword;

    const res = await login(targetEmail, targetPassword);
    if (res.success && res.user) {
      const allowedAdminRoles = ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'];
      if (allowedAdminRoles.includes(res.user.role)) {
        showToast('Access authorized successfully!');
        // Always refresh the exam catalog from DB after admin login
        await refreshCatalog();
      } else {
        setAdminLoginError('Unauthorized access: your role does not have administrative permissions.');
        logout();
      }
    } else {
      setAdminLoginError(res.error || 'Invalid ID or Password.');
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [presenceFilter, setPresenceFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Detail editor states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editReferralCode, setEditReferralCode] = useState('');
  const [editReferredBy, setEditReferredBy] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsBlocked, setEditIsBlocked] = useState(false);
  const [editCoins, setEditCoins] = useState<number>(0);

  // Custom password authorization modal states for profile dossier updates
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Category management form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryLogoUrl, setNewCategoryLogoUrl] = useState('');
  const [newCategoryIsPopular, setNewCategoryIsPopular] = useState(false);
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryCountText, setNewCategoryCountText] = useState('');
  const [newSubCategoryParent, setNewSubCategoryParent] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [newSubSubCategoryParentCategory, setNewSubSubCategoryParentCategory] = useState('');
  const [newSubSubCategoryParentSubCategory, setNewSubSubCategoryParentSubCategory] = useState('');
  const [newSubSubCategoryName, setNewSubSubCategoryName] = useState('');

  // Category/subcategory/mock edit states
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryLogoUrl, setEditingCategoryLogoUrl] = useState('');
  const [editingCategoryIsPopular, setEditingCategoryIsPopular] = useState(false);
  const [editingCategoryDescription, setEditingCategoryDescription] = useState('');
  const [editingCategoryCountText, setEditingCategoryCountText] = useState('');
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<string | null>(null);
  const [editingSubCategoryName, setEditingSubCategoryName] = useState('');
  const [editingSubSubCategoryId, setEditingSubSubCategoryId] = useState<string | null>(null);
  const [editingSubSubCategoryName, setEditingSubSubCategoryName] = useState('');
  const [editingMockTestId, setEditingMockTestId] = useState<string | null>(null);
  const [editingMockTestTitle, setEditingMockTestTitle] = useState('');
  const [editingMockTestbookTotalUsers, setEditingMockTestbookTotalUsers] = useState(0);
  const [editingMockTestbookTopperScore, setEditingMockTestbookTopperScore] = useState(0.0);
  const [editingMockTestbookAverageScore, setEditingMockTestbookAverageScore] = useState(0.0);
  const [editingMockTestbookCutoffScore, setEditingMockTestbookCutoffScore] = useState(0.0);

  // Redesign Collapsible Open/Closed States
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [isCreateSubCategoryOpen, setIsCreateSubCategoryOpen] = useState(false);
  const [isCreateSubSubCategoryOpen, setIsCreateSubSubCategoryOpen] = useState(false);
  const [isCreateNoticeOpen, setIsCreateNoticeOpen] = useState(false);
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);

  // Mock test management form states
  const [newMockTestbookTotalUsers, setNewMockTestbookTotalUsers] = useState(0);
  const [newMockTestbookTopperScore, setNewMockTestbookTopperScore] = useState(0.0);
  const [newMockTestbookAverageScore, setNewMockTestbookAverageScore] = useState(0.0);
  const [newMockTestbookCutoffScore, setNewMockTestbookCutoffScore] = useState(0.0);
  const [newMockCategoryParent, setNewMockCategoryParent] = useState('');
  const [newMockSubCategoryParent, setNewMockSubCategoryParent] = useState('');
  const [newMockSubSubCategoryParent, setNewMockSubSubCategoryParent] = useState('');
  const [newMockTitle, setNewMockTitle] = useState('');
  const [newMockQsCount, setNewMockQsCount] = useState(100);
  const [newMockDuration, setNewMockDuration] = useState(60);
  const [newMockMaxMarks, setNewMockMaxMarks] = useState(200);
  const [newMockRequiredTier, setNewMockRequiredTier] = useState<'None' | 'Testbook Pass' | 'Testbook Pass Pro'>('None');
  const [newMockHasSectionalTiming, setNewMockHasSectionalTiming] = useState(false);
  const [newMockSectionalTimingsStr, setNewMockSectionalTimingsStr] = useState(''); // comma-separated minutes
  const [newMockPositiveMarks, setNewMockPositiveMarks] = useState(2.0);
  const [newMockNegativeMarks, setNewMockNegativeMarks] = useState(0.5);
  const [editingMockPositiveMarks, setEditingMockPositiveMarks] = useState(2.0);
  const [editingMockNegativeMarks, setEditingMockNegativeMarks] = useState(0.5);
  const [editReferralsCount, setEditReferralsCount] = useState<number>(0);
  const [editRole, setEditRole] = useState<'STUDENT' | 'ADMIN' | 'TEST_CREATOR' | 'SUPPORT_TEAM' | 'NOTICES_MANAGER'>('STUDENT');
  const [editTier, setEditTier] = useState<'None' | 'Testbook Pass' | 'Testbook Pass Pro'>('None');
  const [editExpiry, setEditExpiry] = useState('');
  const [editPurchasedAt, setEditPurchasedAt] = useState('');
  
  // Set default tab based on user role
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'TEST_CREATOR') {
        setActiveTab('upload');
      } else if (currentUser.role === 'SUPPORT_TEAM') {
        setActiveTab('support');
      } else if (currentUser.role === 'NOTICES_MANAGER') {
        setActiveTab('notices');
      } else {
        setActiveTab('analytics');
      }
    }
  }, [currentUser]);

  // Sync local edit states with updated usersList (ensures instant UI updates on save)
  // Note: we DON'T overwrite testSessions here since they are loaded lazily
  useEffect(() => {
    if (selectedUserId) {
      const updatedUser = usersList.find(u => u.id === selectedUserId);
      if (updatedUser) {
        setEditName(updatedUser.name);
        setEditEmail(updatedUser.email);
        setEditMobile(updatedUser.mobile || '');
        setEditReferralCode(updatedUser.referralCode || '');
        setEditReferredBy(updatedUser.referredBy || '');
        setEditReferralsCount(updatedUser.referralsCount || 0);
        setEditRole(updatedUser.role);
        setEditTier(updatedUser.subscriptionTier);
        setEditExpiry(updatedUser.subscriptionExpiresAt || '');
        setEditPurchasedAt(updatedUser.subscriptionPurchasedAt || '');
        setEditPassword(updatedUser.password || 'password123');
        setEditIsBlocked(updatedUser.isBlocked || false);
        setEditCoins(updatedUser.coins || 0);
      }
    }
  }, [usersList, selectedUserId]);

  const hasTabAccess = (tab: string): boolean => {
    if (!currentUser) return false;
    const role = currentUser.role;
    if (role === 'ADMIN') return true;
    if (role === 'TEST_CREATOR') {
      return ['upload', 'categories', 'subcategories', 'subsubcategories', 'mocks'].includes(tab);
    }
    if (role === 'SUPPORT_TEAM') {
      return ['support', 'suggestions'].includes(tab);
    }
    if (role === 'NOTICES_MANAGER') {
      return ['notices', 'announcements', 'testimonials'].includes(tab);
    }
    return false;
  };

  // Suggestion Box state & API handlers
  const [suggestionsList, setSuggestionsList] = useState<any[]>([]);
  const [suggestionStatusFilter, setSuggestionStatusFilter] = useState<'ALL' | 'PENDING' | 'REVIEWED' | 'RESOLVED'>('ALL');
  const [suggestionCategoryFilter, setSuggestionCategoryFilter] = useState<string>('ALL');
  const [suggestionSearch, setSuggestionSearch] = useState<string>('');
  const [suggestionReplyingId, setSuggestionReplyingId] = useState<string | null>(null);
  const [suggestionReplyText, setSuggestionReplyText] = useState<string>('');

  const fetchSuggestions = async () => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-suggestions' }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.suggestions)) {
        setSuggestionsList(data.suggestions);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchSuggestions();
    }
  }, [currentUser]);

  const handleUpdateSuggestionStatus = async (id: string, status: string, adminReply?: string) => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-suggestion-status',
          data: { id, status, adminReply }
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Suggestion updated successfully`);
        fetchSuggestions();
        setSuggestionReplyingId(null);
        setSuggestionReplyText('');
      } else {
        showToast(`Failed: ${data.error}`);
      }
    } catch (err) {
      showToast('Error updating suggestion');
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this suggestion?')) return;
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-suggestion',
          data: { id }
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Suggestion deleted');
        fetchSuggestions();
      } else {
        showToast(`Failed: ${data.error}`);
      }
    } catch (err) {
      showToast('Error deleting suggestion');
    }
  };

  // Toast & Modal confirmation states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ userId: string; sessionId: string; userName: string; sessionTitle: string } | null>(null);

  const getCustomQuestionsCount = (testId: string) => {
    for (const cat of examCatalog) {
      for (const sub of cat.subCategories) {
        for (const subSub of (sub.subSubCategories || [])) {
          const found = subSub.tests.find(t => t.id === testId);
          if (found) {
            return (found as any).customQuestionsCount || 0;
          }
        }
      }
    }
    return 0;
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  useEffect(() => {
    const fetchExistingQuestions = async () => {
      if (!selectedUploadTestId) {
        setFormQuestionsList([]);
        setParsedQuestions([]);
        setJsonInput('');
        setEditingQuestionIndex(null);
        return;
      }

      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-custom-questions',
            data: { testId: selectedUploadTestId }
          })
        });
        const data = await res.json();
        if (data.success && data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          setFormQuestionsList(data.questions);
          setParsedQuestions(data.questions);
          setJsonInput(JSON.stringify(data.questions, null, 2));
          setPreviewQuestionIndex(0);
          setEditingQuestionIndex(null);
          showToast(`Loaded ${data.questions.length} existing question(s) from this mock test.`);
        } else {
          // No questions found
          setFormQuestionsList([]);
          setParsedQuestions([]);
          setJsonInput('[]');
          setPreviewQuestionIndex(0);
          setEditingQuestionIndex(null);
        }
      } catch (e) {
        console.error("Failed to fetch questions:", e);
        showToast("Error loading existing mock test questions.");
      }
    };

    fetchExistingQuestions();
  }, [selectedUploadTestId]);

  const handleSelectUser = async (user: MockUser) => {
    setSelectedUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditMobile(user.mobile || '');
    setEditReferralCode(user.referralCode || '');
    setEditReferredBy(user.referredBy || '');
    setEditReferralsCount(user.referralsCount || 0);
    setEditRole(user.role);
    setEditTier(user.subscriptionTier);
    setEditExpiry(user.subscriptionExpiresAt || '');
    setEditPurchasedAt(user.subscriptionPurchasedAt || '');
    setEditPassword(user.password || 'password123');
    setEditIsBlocked(user.isBlocked || false);
    setEditCoins(user.coins || 0);

    // Lazily load full user details (including test sessions) if not yet loaded
    if (!user.testSessions || user.testSessions.length === 0) {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-user-details', data: { userId: user.id } })
        });
        const result = await res.json();
        if (result.success && result.user) {
          mergeUserSessions(user.id, result.user.testSessions);
        }
      } catch (e) {
        console.error('Failed to load user sessions:', e);
      }
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setIsPasswordModalOpen(true);
    setAdminPasswordInput('');
    setPasswordError(null);
  };

  const submitSaveProfile = async () => {
    if (!selectedUserId) return;
    if (!adminPasswordInput.trim()) {
      setPasswordError("Password is required to verify changes.");
      return;
    }

    setSavingProfile(true);
    setPasswordError(null);

    const expiry = editTier === 'None' ? null : (editExpiry || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]);
    const purchasedAt = editTier === 'None' ? null : (editPurchasedAt || new Date().toISOString().split('T')[0]);

    try {
      const result = await saveUserProfileByAdmin(
        selectedUserId,
        editName,
        editEmail,
        editMobile.trim(),
        editReferralCode.trim(),
        editReferredBy.trim() || null,
        Number(editReferralsCount),
        editRole,
        editTier,
        purchasedAt,
        expiry,
        editPassword.trim(),
        editIsBlocked,
        Number(editCoins),
        adminPasswordInput.trim()
      );

      if (result && result.success) {
        showToast('User profile updated successfully!');
        setIsPasswordModalOpen(false);
      } else {
        setPasswordError(result?.error || 'Failed to save profile. Check admin password.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'An error occurred while saving profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetAttempt = (userId: string, sessionId: string) => {
    resetAttempt(userId, sessionId);
    showToast('Exam attempt successfully deleted and reset!');
  };

  const confirmResetAction = () => {
    if (resetTarget) {
      handleResetAttempt(resetTarget.userId, resetTarget.sessionId);
      setResetConfirmOpen(false);
      setResetTarget(null);
    }
  };

  const handleBulkUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadStatus(null);

    if (!selectedUploadTestId) {
      setUploadStatus({ type: 'error', message: 'Please select a mock test to verify questions for.' });
      return;
    }

    if (!jsonInput.trim()) {
      setUploadStatus({ type: 'error', message: 'Input cannot be empty.' });
      return;
    }

    try {
      const parsedData = JSON.parse(jsonInput);
      const questionsArray = (Array.isArray(parsedData) ? parsedData : [parsedData]).map((q: any) => {
        const textEn = (q.textEn || q.questionText || q.question || q.text || q.question_text || q.textHi || "").toString().trim();
        const textHi = (q.textHi || q.questionText || q.question || q.text || q.question_text || textEn).toString().trim();
        
        let rawOpts = q.optionsEn || q.options || q.optionsHi;
        if (!Array.isArray(rawOpts) || rawOpts.length < 2) {
          if (q.option1 || q.opt1) {
            rawOpts = [q.option1 || q.opt1, q.option2 || q.opt2, q.option3 || q.opt3, q.option4 || q.opt4, q.option5].filter(Boolean);
          }
        }
        const optionsEn = Array.isArray(rawOpts) && rawOpts.length >= 2 ? rawOpts.map((o: any) => String(o).trim()) : ["Option A", "Option B", "Option C", "Option D"];
        const optionsHi = Array.isArray(q.optionsHi) && q.optionsHi.length >= 2 ? q.optionsHi.map((o: any) => String(o).trim()) : optionsEn;
        
        let correctIndex = 0;
        if (typeof q.correctIndex === 'number') {
          correctIndex = q.correctIndex;
        } else if (typeof q.correctAnswer === 'number') {
          correctIndex = q.correctAnswer;
        } else if (typeof q.answer === 'number') {
          correctIndex = q.answer;
        } else if (typeof q.correct_option === 'number') {
          correctIndex = Math.max(0, q.correct_option - 1);
        } else if (typeof q.correct_answer === 'number') {
          correctIndex = Math.max(0, q.correct_answer - 1);
        } else if (q.correctAnswer || q.answer || q.correct_option || q.correct_answer) {
          const str = (q.correctAnswer || q.answer || q.correct_option || q.correct_answer).toString().trim().toUpperCase();
          if (str === 'A' || str === '1' || str === 'OPT1' || str === 'OPTION 1' || str === 'OPTION A') correctIndex = 0;
          else if (str === 'B' || str === '2' || str === 'OPT2' || str === 'OPTION 2' || str === 'OPTION B') correctIndex = 1;
          else if (str === 'C' || str === '3' || str === 'OPT3' || str === 'OPTION 3' || str === 'OPTION C') correctIndex = 2;
          else if (str === 'D' || str === '4' || str === 'OPT4' || str === 'OPTION 4' || str === 'OPTION D') correctIndex = 3;
          else {
            const matchIdx = optionsEn.findIndex(o => o.toUpperCase() === str);
            if (matchIdx !== -1) correctIndex = matchIdx;
          }
        }
        if (correctIndex < 0 || correctIndex >= optionsEn.length) correctIndex = 0;

        const explanationEn = (q.explanationEn || q.explanation || q.solution || q.answer_explanation || q.sol || "").toString().trim();
        const explanationHi = (q.explanationHi || q.explanation || q.solution || q.answer_explanation || q.sol || explanationEn).toString().trim();

        return {
          id: q.id || 'q_' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 6),
          textEn,
          textHi,
          optionsEn,
          optionsHi,
          correctIndex,
          explanationEn,
          explanationHi,
          section: q.section || 'General Studies'
        };
      });

      setParsedQuestions(questionsArray);
      setFormQuestionsList(questionsArray);
      setJsonInput(JSON.stringify(questionsArray, null, 2));
      setPreviewQuestionIndex(0);
      setUploadStatus({
        type: 'success',
        message: `Successfully verified and loaded ${questionsArray.length} questions into Live Preview!`
      });
    } catch (err: any) {
      setUploadStatus({
        type: 'error',
        message: err.message || 'Malformed JSON content. Please structure questions schema matching database model.'
      });
      setParsedQuestions([]);
    }
  };

  const handleConfirmIngestCustomQuestions = async () => {
    if (!selectedUploadTestId) {
      showToast('Error: No target mock test selected.');
      return;
    }
    if (parsedQuestions.length === 0) {
      showToast('Error: No verified questions to save.');
      return;
    }
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-custom-questions',
          data: { testId: selectedUploadTestId, questions: parsedQuestions }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Successfully saved ${parsedQuestions.length} questions to mock test!`);
        setUploadStatus({
          type: 'success',
          message: `Custom question paper of ${parsedQuestions.length} question(s) successfully uploaded and saved for the target mock test!`
        });
        refreshCatalog();
      } else {
        showToast('Error: ' + (data.error || 'Failed to save questions to database.'));
      }
    } catch (e) {
      showToast('Error saving questions.');
    }
  };

  // Sample JSON Template
  const loadTemplate = () => {
    const template = [
      {
        textEn: "What is the unit of electric current?",
        textHi: "विद्युत धारा की इकाई क्या है?",
        optionsEn: ["Ampere", "Volt", "Ohm", "Watt"],
        optionsHi: ["ऐम्पियर", "वोल्ट", "ओम", "वाट"],
        correctIndex: 0,
        explanationEn: "Ampere is the base unit of electric current.",
        explanationHi: "ऐम्पियर विद्युत धारा की मूल इकाई है।",
        section: "General Studies"
      },
      {
        textEn: "Is light an electromagnetic wave?",
        textHi: "क्या प्रकाश एक विद्युत चुंबकीय तरंग है?",
        optionsEn: ["Yes", "No"],
        optionsHi: ["हाँ", "नहीं"],
        correctIndex: 0,
        explanationEn: "Yes, light is an electromagnetic wave.",
        explanationHi: "हाँ, प्रकाश एक विद्युत चुंबकीय तरंग है।",
        section: "General Studies"
      }
    ];
    setJsonInput(JSON.stringify(template, null, 2));
  };

  const handleAddFormQuestion = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTextEn.trim() || !formTextHi.trim()) {
      showToast("Question text is required in both English and Hindi");
      return;
    }

    if (!opt1En.trim() || !opt1Hi.trim() || !opt2En.trim() || !opt2Hi.trim()) {
      showToast("First 2 options are required in both English and Hindi");
      return;
    }

    const optionsEn = [opt1En.trim(), opt2En.trim()];
    const optionsHi = [opt1Hi.trim(), opt2Hi.trim()];

    if (opt3En.trim() || opt3Hi.trim()) {
      optionsEn.push(opt3En.trim() || "Option 3");
      optionsHi.push(opt3Hi.trim() || "विकल्प 3");
    }
    if (opt4En.trim() || opt4Hi.trim()) {
      optionsEn.push(opt4En.trim() || "Option 4");
      optionsHi.push(opt4Hi.trim() || "विकल्प 4");
    }
    if (opt5En.trim() || opt5Hi.trim()) {
      optionsEn.push(opt5En.trim() || "Option 5");
      optionsHi.push(opt5Hi.trim() || "विकल्प 5");
    }

    if (formCorrectIndex >= optionsEn.length) {
      showToast(`Correct option index is out of bounds (max: ${optionsEn.length})`);
      return;
    }

    const sectionToSave = selectedSection === 'create_new' ? customSectionName.trim() : selectedSection;
    if (!sectionToSave) {
      showToast("Please specify a section name");
      return;
    }

    const newQ = {
      id: editingQuestionIndex !== null && formQuestionsList[editingQuestionIndex]?.id
        ? formQuestionsList[editingQuestionIndex].id
        : 'q_' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 6),
      textEn: formTextEn.trim(),
      textHi: formTextHi.trim(),
      optionsEn,
      optionsHi,
      correctIndex: Number(formCorrectIndex),
      explanationEn: formExplanationEn.trim() || undefined,
      explanationHi: formExplanationHi.trim() || undefined,
      section: sectionToSave
    };

    let updatedList;
    if (editingQuestionIndex !== null) {
      updatedList = [...formQuestionsList];
      updatedList[editingQuestionIndex] = newQ;
      setEditingQuestionIndex(null);
      showToast("Question updated in list!");
    } else {
      updatedList = [...formQuestionsList, newQ];
      showToast("Question added to preview list!");
    }

    setFormQuestionsList(updatedList);
    setJsonInput(JSON.stringify(updatedList, null, 2));
    setParsedQuestions(updatedList);
    setPreviewQuestionIndex(editingQuestionIndex !== null ? editingQuestionIndex : updatedList.length - 1);

    // Clear form inputs
    setFormTextEn('');
    setFormTextHi('');
    setOpt1En('');
    setOpt1Hi('');
    setOpt2En('');
    setOpt2Hi('');
    setOpt3En('');
    setOpt3Hi('');
    setOpt4En('');
    setOpt4Hi('');
    setOpt5En('');
    setOpt5Hi('');
    setFormCorrectIndex(0);
    setFormExplanationEn('');
    setFormExplanationHi('');
    setSelectedSection(sectionToSave);
    setCustomSectionName('');
  };

  const handleClearFormQuestions = () => {
    if (window.confirm("Are you sure you want to clear all questions built so far?")) {
      setFormQuestionsList([]);
      setJsonInput('[]');
      setParsedQuestions([]);
      setPreviewQuestionIndex(0);
      showToast("Questions list cleared.");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setTestiPhotoUrl(data.url);
        showToast("Topper photo uploaded to Tigris successfully!");
      } else {
        showToast(`Upload failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      showToast("Upload failed due to connection error.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const uploadFileToTigrisDirect = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        return data.url;
      } else {
        showToast(`Upload failed: ${data.error || "Unknown error"}`);
        return null;
      }
    } catch (err) {
      console.error("Direct S3 upload error:", err);
      showToast("Upload failed due to connection error.");
      return null;
    }
  };

  const handleAddTestimonialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testiName || !testiExam || !testiQuote) {
      alert("Name, Exam details, and Quote are required!");
      return;
    }

    const initialsVal = testiInitials.trim() || testiName.slice(0, 2).toUpperCase();
    
    addNotice(
      testiName.trim(),
      testiQuote.trim(),
      'testimonial',
      testiExam.trim(),
      testiGradient,
      initialsVal,
      testiPhotoUrl || undefined
    );

    setTestiName('');
    setTestiExam('');
    setTestiQuote('');
    setTestiInitials('');
    setTestiGradient('from-blue-600 to-cyan-500');
    setTestiPhotoUrl('');
    showToast("Testimonial created successfully!");
  };

  const allowedAdminRoles = ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'];
  const hasAdminAccess = currentUser && allowedAdminRoles.includes(currentUser.role);

  if (!hasAdminAccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 font-sans text-slate-100 relative overflow-hidden px-4">
        {/* DEBUG STRIP */}
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#111',color:'#0f0',fontSize:'11px',padding:'4px 12px',display:'flex',gap:'16px'}}>
          <span>≡ƒæñ currentUser: {currentUser ? `${currentUser.name} (${currentUser.role})` : 'null'}</span>
          <span>≡ƒôï usersList: {usersList.length}</span>
          <span>≡ƒôÜ catalog: {examCatalog.length}</span>
          <span>≡ƒöÆ hasAccess: {String(!!hasAdminAccess)}</span>
        </div>
        {/* Ambient background blur circles */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-md relative z-10">
          <div className="text-center mb-6">
            <div className="bg-blue-600/10 border border-blue-500/30 p-3.5 rounded-full inline-flex items-center justify-center mb-4">
              <Database className="h-7 w-7 text-blue-500 animate-pulse" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider text-white">Admin Authentication</h2>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-1">Management Suite Gating</p>
          </div>

          {adminLoginError && (
            <div className="bg-red-950/40 border border-red-900/50 p-3 rounded-lg text-red-400 text-xs font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{adminLoginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Admin ID / Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@mocktest.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-bold transition-all"
              />
            </div>

            <div>
              <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Security Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-bold transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-blue-900/35 cursor-pointer mt-2"
            >
              Sign In to Suite
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <Link href="/" className="text-slate-500 hover:text-slate-350 text-xs font-bold inline-flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      
      {/* SIDEBAR NAVIGATION BACKDROP ON MOBILE */}
      {isMounted && isMobile && mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity duration-200"
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className={`
        ${isMounted && isMobile 
          ? `fixed inset-y-0 left-0 z-50 w-64 shadow-2xl transition-transform duration-300 transform ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}` 
          : 'w-64 border-r border-slate-200 dark:border-slate-800'
        }
        bg-white dark:bg-slate-950 p-6 flex flex-col justify-between h-full shrink-0
      `}>
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-sidebar-scroll::-webkit-scrollbar {
            width: 4px;
          }
          .custom-sidebar-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-sidebar-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 2px;
          }
          .dark .custom-sidebar-scroll::-webkit-scrollbar-thumb {
            background: #334155;
          }
          .custom-sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}} />
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0 mb-4 pr-1 custom-sidebar-scroll">
          {/* Brand logo */}
          <div className="flex items-center gap-3 mb-8 shrink-0">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm leading-tight text-slate-900 dark:text-white tracking-wider">MOCK TEST ADMIN</h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase font-sans">Management Suite</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-2 font-sans">
            {hasTabAccess('analytics') && (
              <button
                onClick={() => selectTab('analytics')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart2 className="h-4 w-4" />
                Student Performance
              </button>
            )}
            {hasTabAccess('upload') && (
              <button
                onClick={() => selectTab('upload')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Upload className="h-4 w-4" />
                Bulk Question Importer
              </button>
            )}
            <button
              onClick={() => selectTab('vocab')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                activeTab === 'vocab'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Vocab Upload & Manager
            </button>
            <button
              onClick={() => selectTab('practice_series')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                activeTab === 'practice_series'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
              Practice Series Manager
            </button>
            {hasTabAccess('users') && (
              <button
                onClick={() => selectTab('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="h-4 w-4" />
                User Management
              </button>
            )}
            {hasTabAccess('notices') && (
              <button
                onClick={() => selectTab('notices')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'notices'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Bell className="h-4 w-4" />
                Live Notices & Updates
              </button>
            )}
            {hasTabAccess('announcements') && (
              <button
                onClick={() => selectTab('announcements')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'announcements'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Megaphone className="h-4 w-4" />
                {language === 'hi' ? 'αñåαñºαñ┐αñòαñ╛αñ░αñ┐αñò αñÿαÑïαñ╖αñúαñ╛αñÅαñü' : 'Manage Announcements'}
              </button>
            )}
            {hasTabAccess('testimonials') && (
              <button
                onClick={() => selectTab('testimonials')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'testimonials'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Award className="h-4 w-4" />
                {language === 'hi' ? 'αñ¬αÑìαñ░αñ╢αñéαñ╕αñ╛αñ¬αññαÑìαñ░ αñ¬αÑìαñ░αñ¼αñéαñºαñò' : 'Topper Testimonials'}
              </button>
            )}
            {hasTabAccess('categories') && (
              <button
                onClick={() => selectTab('categories')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'categories'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FolderPlus className="h-4 w-4" />
                {language === 'hi' ? 'αñ¬αñ░αÑÇαñòαÑìαñ╖αñ╛ αñ╢αÑìαñ░αÑçαñúαñ┐αñ»αñ╛αñé' : 'Exam Categories'}
              </button>
            )}
            {hasTabAccess('subcategories') && (
              <button
                onClick={() => selectTab('subcategories')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'subcategories'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="h-4 w-4" />
                {language === 'hi' ? 'αñëαñ¬-αñ╢αÑìαñ░αÑçαñúαñ┐αñ»αñ╛αñé' : 'Sub Categories'}
              </button>
            )}
            {hasTabAccess('subsubcategories') && (
              <button
                onClick={() => selectTab('subsubcategories')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'subsubcategories'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4" />
                {language === 'hi' ? 'αñëαñ¬-αñëαñ¬-αñ╢αÑìαñ░αÑçαñúαñ┐αñ»αñ╛αñé' : 'Sub Sub Categories'}
              </button>
            )}
            {hasTabAccess('mocks') && (
              <button
                onClick={() => selectTab('mocks')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'mocks'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                {language === 'hi' ? 'αñ«αÑëαñò αñƒαÑçαñ╕αÑìαñƒ αñ¬αÑìαñ░αñ¼αñéαñºαñ┐αññ αñòαñ░αÑçαñé' : 'Manage Mock Tests'}
              </button>
            )}
            {hasTabAccess('reports') && (
              <button
                onClick={() => selectTab('reports')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlertCircle className="h-4 w-4" />
                {language === 'hi' ? 'αñ░αñ┐αñ¬αÑïαñ░αÑìαñƒ αñòαñ┐αñÅ αñùαñÅ αñ¬αÑìαñ░αñ╢αÑìαñ¿' : 'Reported Questions'}
              </button>
            )}
            {hasTabAccess('support') && (
              <button
                onClick={() => selectTab('support')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'support'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4" />
                  <span>{language === 'hi' ? 'αñ╕αñ¬αÑïαñ░αÑìαñƒ αñƒαÑÇαñ«' : 'Support Team'}</span>
                </div>
                {totalUnseenCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                    {totalUnseenCount}
                  </span>
                )}
              </button>
            )}
            {hasTabAccess('dbmonitor') && (
              <button
                onClick={() => selectTab('dbmonitor')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'dbmonitor'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Database className="h-4 w-4" />
                DB Monitor
              </button>
            )}
            {hasTabAccess('feedback') && (
              <button
                onClick={() => selectTab('feedback')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'feedback'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                User Feedbacks
              </button>
            )}
            {hasTabAccess('suggestions') && (
              <button
                onClick={() => selectTab('suggestions')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'suggestions'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Lightbulb className="h-4 w-4" />
                  <span>{language === 'hi' ? 'सुझाव पेटिका' : 'Suggestion Box'}</span>
                </div>
                {suggestionsList.filter(s => s.status === 'PENDING').length > 0 && (
                  <span className="bg-amber-500 text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center animate-pulse">
                    {suggestionsList.filter(s => s.status === 'PENDING').length}
                  </span>
                )}
              </button>
            )}
            {hasTabAccess('attempts') && (
              <button
                onClick={() => selectTab('attempts')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'attempts'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Test Attempt Logs
              </button>
            )}
          </nav>
        </div>

        {/* Refresh + System telemetry */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
          <button
            onClick={async () => {
              await refreshCatalog();
              showToast('Catalog refreshed from database!');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Data
          </button>
          <div className="text-[10px] text-slate-500">
            <p>Database: Connected (PostgreSQL)</p>
            <p>Active sessions: 1,429</p>
            <p>System load: Normal</p>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP BAR */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 sm:px-8 flex items-center justify-between transition-colors duration-200">
          <div className="flex items-center gap-3">
            {isMounted && isMobile && (
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 cursor-pointer"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>
            )}
            <h2 className="text-xs sm:text-sm md:text-base font-extrabold tracking-wide text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[300px] md:max-w-none">
              {activeTab === 'analytics' 
                ? (language === 'hi' ? 'αñ¢αñ╛αññαÑìαñ░ αñ╡αñ┐αñ╢αÑìαñ▓αÑçαñ╖αñú αñöαñ░ αñ╕αÑìαñ¬αÑÇαñí αñíαÑêαñ╢αñ¼αÑïαñ░αÑìαñí' : 'Student Analytics & Speed Dashboard')
                : activeTab === 'upload' 
                ? (language === 'hi' ? 'αñÑαÑïαñò αñ¬αÑìαñ░αñ╢αÑìαñ¿ αñ¬αÑìαñ░αñ╡αñ┐αñ╖αÑìαñƒαñ┐ αñƒαñ░αÑìαñ«αñ┐αñ¿αñ▓' : 'Bulk Question Ingestion Terminal')
                : activeTab === 'users'
                ? (language === 'hi' ? 'αñëαñ¬αñ»αÑïαñùαñòαñ░αÑìαññαñ╛ αñ¬αÑìαñ░αñ¼αñéαñºαñ¿ αñöαñ░ αñ¬αñ╣αÑüαñüαñÜ αñ¿αñ┐αñ»αñéαññαÑìαñ░αñú' : 'User Management & Access Control')
                : activeTab === 'notices'
                ? (language === 'hi' ? 'αñ▓αñ╛αñçαñ╡ αñàαñ¬αñíαÑçαñƒ αñöαñ░ αñ¿αÑïαñƒαñ┐αñ╕ αñ¬αÑìαñ░αñ¼αñéαñºαñò' : 'Live Updates & Notices Manager')
                : activeTab === 'testimonials'
                ? (language === 'hi' ? 'αñ¬αÑìαñ░αñ╢αñéαñ╕αñ╛αñ¬αññαÑìαñ░ αñ¬αÑìαñ░αñ¼αñéαñºαñò' : 'Toppers Testimonials Manager')
                : activeTab === 'categories'
                ? (language === 'hi' ? 'αñ¬αñ░αÑÇαñòαÑìαñ╖αñ╛ αñ╢αÑìαñ░αÑçαñúαñ┐αñ»αñ╛αñé αñ¬αÑìαñ░αñ¼αñéαñºαñ┐αññ αñòαñ░αÑçαñé' : 'Manage Exam Categories')
                : activeTab === 'subcategories'
                ? (language === 'hi' ? 'αñ¬αñ░αÑÇαñòαÑìαñ╖αñ╛ αñëαñ¬-αñ╢αÑìαñ░αÑçαñúαñ┐αñ»αñ╛αñé αñ¬αÑìαñ░αñ¼αñéαñºαñ┐αññ αñòαñ░αÑçαñé' : 'Manage Exam Subcategories')
                : activeTab === 'subsubcategories'
                ? (language === 'hi' ? 'αñ¬αñ░αÑÇαñòαÑìαñ╖αñ╛ αñëαñ¬-αñëαñ¬-αñ╢αÑìαñ░αÑçαñúαñ┐αñ»αñ╛αñé αñ¬αÑìαñ░αñ¼αñéαñºαñ┐αññ αñòαñ░αÑçαñé' : 'Manage Exam Sub-Subcategories')
                : activeTab === 'mocks'
                ? (language === 'hi' ? 'αñ«αÑëαñò αñƒαÑçαñ╕αÑìαñƒ αñ¬αÑìαñ░αñ¼αñéαñºαñ┐αññ αñòαñ░αÑçαñé' : 'Manage Mock Tests')
                : activeTab === 'announcements'
                ? (language === 'hi' ? 'αñåαñºαñ┐αñòαñ╛αñ░αñ┐αñò αñÿαÑïαñ╖αñúαñ╛ αñ¬αÑìαñ░αñòαñ╛αñ╢αñò' : 'Official Announcements Publisher')
                : activeTab === 'support'
                ? (language === 'hi' ? 'सपोर्ट टीम हेल्पडेस्क' : 'Support Team Helpdesk')
                : activeTab === 'vocab'
                ? (language === 'hi' ? 'वोकैब अपलोड और शब्दावली प्रबंधक' : 'Vocab Upload & Catalog Manager')
                : activeTab === 'attempts'
                ? (language === 'hi' ? 'टेस्ट एटेम्पटेड लॉग्स' : 'Test Attempt Logs & Active Sittings')
                : (language === 'hi' ? 'रिपोर्ट किए गए प्रश्न' : 'Reported Questions')}
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Back to Home Link */}
            <Link href="/" className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors mr-2">
              {t.backToHome}
            </Link>

            {/* Language selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
              className="px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">English</option>
              <option value="hi" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">αñ╣αñ┐αñ¿αÑìαñªαÑÇ</option>
            </select>

            {/* Theme switcher */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800"
              title={theme === 'light' ? t.themeDark : t.themeLight}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            <span className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800"></span>

            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{language === 'hi' ? 'αñÅαñ¬αÑÇαñåαñê αñ╕αñ░αÑìαñ╡αñ░ αñæαñ¿αñ▓αñ╛αñçαñ¿' : 'API Server Online'}</span>
            </div>
          </div>
        </header>

        {/* CONTAINER CONTENT */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* TAB 1: STUDENT PERFORMANCE METRICS */}
          {activeTab === 'analytics' && hasTabAccess('analytics') && (
            <div className="space-y-8">
              
              {/* Core Cards KPI Summary */}
              <div className="grid grid-cols-4 gap-6">
                
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-900/30 text-blue-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Avg. Percentile Rank</p>
                    <p className="text-xl font-extrabold text-white">87.2%</p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-900/30 text-green-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Accuracy Score</p>
                    <p className="text-xl font-extrabold text-white">78.3%</p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-900/30 text-purple-400">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Competitors Beat</p>
                    <p className="text-xl font-extrabold text-white">18.4K</p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-yellow-900/30 text-yellow-400">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mock Tests Taken</p>
                    <p className="text-xl font-extrabold text-white">48</p>
                  </div>
                </div>

              </div>

              {/* Graphic Charts Grid */}
              <div className="grid grid-cols-2 gap-8">
                
                {/* Chart 1: Percentile Tracking */}
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl">
                  <h3 className="font-extrabold text-xs text-white mb-4 uppercase tracking-wider">Percentile Growth (Student vs. Topper)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={percentileData}>
                        <defs>
                          <linearGradient id="colorStudent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                        <XAxis dataKey="testName" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Area type="monotone" dataKey="studentPercentile" name="Student %" stroke="#3b82f6" fillOpacity={1} fill="url(#colorStudent)" />
                        <Area type="monotone" dataKey="topperPercentile" name="Topper %" stroke="#10b981" fill="none" strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Sectional Time Allocation */}
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl">
                  <h3 className="font-extrabold text-xs text-white mb-4 uppercase tracking-wider">Sectional Speed Comparison (Time in Minutes)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectionalTimeData}>
                        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                        <XAxis dataKey="section" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="studentTimeMin" name="Student (Min)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="topperTimeMin" name="Topper (Min)" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="avgUserTimeMin" name="Avg Candidate" fill="#475569" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 3: Accuracy vs. Speed Metrics */}
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl">
                  <h3 className="font-extrabold text-xs text-white mb-4 uppercase tracking-wider">Accuracy (%) vs. Speed (Seconds per Question)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={accuracySpeedVariance}>
                        <CartesianGrid stroke="#1e293b" />
                        <XAxis dataKey="difficulty" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="studentAccuracy" name="Student Acc %" stroke="#3b82f6" strokeWidth={2} />
                        <Line type="monotone" dataKey="timePerQSeconds" name="Time Spent (s)" stroke="#fbbf24" strokeWidth={2} />
                        <Line type="monotone" dataKey="topperAccuracy" name="Topper Acc %" stroke="#10b981" strokeDasharray="3 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 4: Score Variance relative to topper */}
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl">
                  <h3 className="font-extrabold text-xs text-white mb-4 uppercase tracking-wider">Total score benchmarks (SSC CGL)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scoreVariance} layout="vertical">
                        <CartesianGrid stroke="#1e293b" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: BULK QUESTION UPLOADER PORTAL */}
          {activeTab === 'upload' && hasTabAccess('upload') && (
            <BulkQuestionImporter
              examCatalog={examCatalog}
              selectedUploadTestId={selectedUploadTestId}
              setSelectedUploadTestId={setSelectedUploadTestId}
              importerMode={importerMode}
              setImporterMode={setImporterMode}
              loadTemplate={loadTemplate}
              jsonInput={jsonInput}
              setJsonInput={setJsonInput}
              uploadStatus={uploadStatus}
              handleBulkUploadSubmit={handleBulkUploadSubmit}
              parsedQuestions={parsedQuestions}
              formQuestionsList={formQuestionsList}
              handleClearFormQuestions={handleClearFormQuestions}
              editingQuestionIndex={editingQuestionIndex}
              setEditingQuestionIndex={setEditingQuestionIndex}
              getAvailableSections={getAvailableSections}
              customSectionName={customSectionName}
              setCustomSectionName={setCustomSectionName}
              selectedSection={selectedSection}
              setSelectedSection={setSelectedSection}
              formTextEn={formTextEn}
              setFormTextEn={setFormTextEn}
              formTextHi={formTextHi}
              setFormTextHi={setFormTextHi}
              opt1En={opt1En}
              setOpt1En={setOpt1En}
              opt1Hi={opt1Hi}
              setOpt1Hi={setOpt1Hi}
              opt2En={opt2En}
              setOpt2En={setOpt2En}
              opt2Hi={opt2Hi}
              setOpt2Hi={setOpt2Hi}
              opt3En={opt3En}
              setOpt3En={setOpt3En}
              opt3Hi={opt3Hi}
              setOpt3Hi={setOpt3Hi}
              opt4En={opt4En}
              setOpt4En={setOpt4En}
              opt4Hi={opt4Hi}
              setOpt4Hi={setOpt4Hi}
              opt5En={opt5En}
              setOpt5En={setOpt5En}
              opt5Hi={opt5Hi}
              setOpt5Hi={setOpt5Hi}
              formCorrectIndex={formCorrectIndex}
              setFormCorrectIndex={setFormCorrectIndex}
              formExplanationEn={formExplanationEn}
              setFormExplanationEn={setFormExplanationEn}
              formExplanationHi={formExplanationHi}
              setFormExplanationHi={setFormExplanationHi}
              handleAddFormQuestion={handleAddFormQuestion}
              previewLanguage={previewLanguage}
              setPreviewLanguage={setPreviewLanguage}
              previewQuestionIndex={previewQuestionIndex}
              setPreviewQuestionIndex={setPreviewQuestionIndex}
              handleConfirmIngestCustomQuestions={handleConfirmIngestCustomQuestions}
              showToast={showToast}
              setFormQuestionsList={setFormQuestionsList}
              setParsedQuestions={setParsedQuestions}
            />
          )}

          {/* TAB: VOCABULARY MANAGEMENT PORTAL */}
          {activeTab === 'vocab' && (
            <VocabManager />
          )}

          {/* TAB: PRACTICE SERIES MANAGER PORTAL */}
          {activeTab === 'practice_series' && (
            <PracticeSeriesManager
              examCatalog={examCatalog}
              showToast={showToast}
              onRefreshCatalog={refreshCatalog}
            />
          )}

          {/* TAB 3: USER MANAGEMENT PORTAL */}
          {activeTab === 'users' && hasTabAccess('users') && (
            <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">User Management Portal</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage user credentials, passes, roles, referral data, and view attempt histories</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      await refreshUsersList();
                      showToast('Users directory refreshed from database!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-755 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh List
                  </button>
                  <span className="text-xs font-bold text-slate-550 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                    {usersList.length} user{usersList.length !== 1 ? 's' : ''} registered
                  </span>
                </div>
              </div>

              {/* Live Presence Summary Cards */}
              {(() => {
                const onlineUsers = usersList.filter(u => isUserOnline(u.lastSeen));
                const onlineApp = onlineUsers.filter(u => u.lastPlatform === 'app').length;
                const onlineWeb = onlineUsers.filter(u => u.lastPlatform !== 'app').length;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Users</p>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{usersList.length}</h4>
                    </div>
                    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live Online</p>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      </div>
                      <h4 className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{onlineUsers.length} online</h4>
                    </div>
                    <div className="bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/40 rounded-xl p-3 shadow-xs">
                      <p className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider">📱 Mobile App</p>
                      <h4 className="text-xl font-black text-violet-700 dark:text-violet-300 mt-0.5">{onlineApp} active</h4>
                    </div>
                    <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl p-3 shadow-xs">
                      <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">💻 Website</p>
                      <h4 className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5">{onlineWeb} active</h4>
                    </div>
                  </div>
                );
              })()}

              {/* Collapsible Edit Profile Form */}
              {!selectedUserId && (
                <div className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-808 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(!isEditUserOpen)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      {selectedUserId ? (
                        (() => {
                          const activeUser = usersList.find(u => u.id === selectedUserId);
                          return (
                            <>
                              <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                                Edit Profile: {activeUser?.name || 'Loading...'}
                              </p>
                              <p className="text-[11px] text-blue-650 dark:text-blue-400 font-bold">Roll Code: {activeUser?.candidateCode || 'None'}</p>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <p className="font-extrabold text-sm text-slate-900 dark:text-white">Profile Editor (No User Selected)</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Select a user from the table below to edit details</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`transition-transform duration-200 ${isEditUserOpen ? 'rotate-180' : ''}`}>
                    <ArrowDown className="h-4 w-4 text-slate-500" />
                  </div>
                </button>

                {isEditUserOpen && (
                  <div className="border-t border-slate-200 dark:border-slate-808 p-6 bg-white dark:bg-slate-955">
                    {selectedUserId ? (
                      (() => {
                        const activeUser = usersList.find(u => u.id === selectedUserId);
                        if (!activeUser) return null;

                        return (
                          <form onSubmit={handleSaveProfile} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                                <input
                                  type="text"
                                  required
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                                <input
                                  type="email"
                                  required
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Mobile Number</label>
                                <input
                                  type="text"
                                  required
                                  maxLength={10}
                                  value={editMobile}
                                  onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, ''))}
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
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
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="STUDENT">Student (Candidate)</option>
                                  <option value="TEST_CREATOR">Test Creator</option>
                                  <option value="SUPPORT_TEAM">Support Team</option>
                                  <option value="NOTICES_MANAGER">Notices & Update Manager</option>
                                  <option value="ADMIN">System Administrator</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Subscription Pass Tier</label>
                                <select
                                  value={editTier}
                                  onChange={(e) => setEditTier(e.target.value as any)}
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="None">None (No Pass)</option>
                                  <option value="Testbook Pass">Mock Test Pass (Basic)</option>
                                  <option value="Testbook Pass Pro">Mock Test Pass Pro (Full Gating Access)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Account Password</label>
                                <input
                                  type="text"
                                  required
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  placeholder="User password"
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              {editTier !== 'None' && (
                                <>
                                  <div>
                                    <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Pass Purchased Date</label>
                                    <input
                                      type="date"
                                      required
                                      value={editPurchasedAt}
                                      onChange={(e) => setEditPurchasedAt(e.target.value)}
                                      className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Pass Expiry Date</label>
                                    <input
                                      type="date"
                                      required
                                      value={editExpiry}
                                      onChange={(e) => setEditExpiry(e.target.value)}
                                      className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    />
                                  </div>
                                </>
                              )}

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Account Status</label>
                                <select
                                  value={editIsBlocked ? 'true' : 'false'}
                                  onChange={(e) => setEditIsBlocked(e.target.value === 'true')}
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="false">Active (Unblocked)</option>
                                  <option value="true">Suspended (Blocked)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Coins Balance</label>
                                <div className="relative flex items-center">
                                  <span className="absolute left-3 text-amber-400">
                                    <Coins className="h-3.5 w-3.5 text-amber-400" />
                                  </span>
                                  <input
                                    type="number"
                                    required
                                    value={editCoins}
                                    onChange={(e) => setEditCoins(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-808 pt-4">
                              <button
                                type="button"
                                onClick={() => setSelectedUserId(null)}
                                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-808 text-slate-650 dark:text-slate-400 font-bold py-2 px-5 rounded-lg text-xs transition cursor-pointer"
                              >
                                Deselect
                              </button>
                              <button
                                type="submit"
                                className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-5 rounded-lg text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-md cursor-pointer"
                              >
                                <UserCheck className="h-4 w-4" />
                                Save Changes
                              </button>
                            </div>
                          </form>
                        );
                      })()
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center py-6">No user selected. Click the "Edit Profile" button on any user in the table below to load details here.</p>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* Users List & Search Card ΓÇö Full Width */}
              {!selectedUserId && (
                <div className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-808 p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Registered Users Directory</h3>
                  
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <Search className="h-3.5 w-3.5" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search name, email, roll code..."
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer w-full sm:w-auto"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="STUDENT">Student</option>
                      <option value="TEST_CREATOR">Test Creator</option>
                      <option value="SUPPORT_TEAM">Support Team</option>
                      <option value="NOTICES_MANAGER">Notices & Update Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>

                    <select
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer w-full sm:w-auto"
                    >
                      <option value="ALL">All Passes</option>
                      <option value="None">No Pass</option>
                      <option value="Testbook Pass">Pass</option>
                      <option value="Testbook Pass Pro">Pass Pro</option>
                    </select>

                    <select
                      value={presenceFilter}
                      onChange={(e: any) => setPresenceFilter(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer w-full sm:w-auto font-bold"
                    >
                      <option value="ALL">All Online & Offline</option>
                      <option value="ONLINE">🟢 Online Now</option>
                      <option value="OFFLINE">⚪ Offline</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                        <th className="pb-3 px-4">User Details</th>
                        <th className="pb-3 px-4">System Role</th>
                        <th className="pb-3 px-4">Access Pass</th>
                        <th className="pb-3 px-4 text-center">Referrals (T/S/P)</th>
                        <th className="pb-3 px-4 text-center">Attempts</th>
                        <th className="pb-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {[...usersList]
                        .filter(u => {
                          const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                (u.candidateCode && u.candidateCode.toLowerCase().includes(searchTerm.toLowerCase()));
                          const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
                          const matchesTier = tierFilter === 'ALL' || u.subscriptionTier === tierFilter;
                          const onlineStatus = isUserOnline(u.lastSeen);
                          const matchesPresence = presenceFilter === 'ALL' || (presenceFilter === 'ONLINE' ? onlineStatus : !onlineStatus);
                          return matchesSearch && matchesRole && matchesTier && matchesPresence;
                        })
                        .map(user => {
                          const isSelected = selectedUserId === user.id;
                          const code = user.referralCode?.trim().toLowerCase() || '';
                          const referredList = code 
                            ? usersList.filter(u => u.referredBy && u.referredBy.trim().toLowerCase() === code)
                            : [];
                          const refTotal = referredList.length;
                          const refSuccessful = referredList.filter(u => {
                            return u.testSessions && u.testSessions.some((s: any) => {
                              if (s.status !== 'COMPLETED' && s.status !== 'AUTO_SUBMITTED') return false;
                              const durationMinutes = s.durationMinutes ?? 60;
                              const totalSec = durationMinutes * 60;
                              const spentSec = Number(s.durationSeconds ?? s.timeSpentSeconds ?? 0);
                              return spentSec >= totalSec * 0.75;
                            });
                          }).length;
                          const refPending = refTotal - refSuccessful;
                          return (
                            <tr
                              key={user.id}
                              onClick={() => handleSelectUser(user)}
                              className={`hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer ${
                                isSelected ? 'bg-slate-100 dark:bg-slate-900/60 border-l-2 border-blue-500' : ''
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-slate-905 dark:text-white text-xs">{user.name}</p>
                                  {isUserOnline(user.lastSeen) ? (
                                    <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      Online ({user.lastPlatform === 'app' ? '📱 App' : user.lastPlatform === 'mobile_web' ? '📱 Web Mobile' : '💻 Web'})
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded">
                                      Active: {formatTimeAgo(user.lastSeen)}
                                    </span>
                                  )}
                                  {user.isBlocked && (
                                    <span className="bg-red-50 dark:bg-red-955/45 border border-red-200 dark:border-red-808 text-red-650 dark:text-red-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      Blocked
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">{user.email}</p>
                                {user.candidateCode && (
                                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold mt-0.5">
                                    Hub ID: <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-[9px] border border-slate-200 dark:border-slate-808 text-slate-800 dark:text-white">{user.candidateCode}</span>
                                  </p>
                                )}
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Joined: {user.registeredDate}</p>
                                <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 text-[10px] font-black mt-1">
                                  <Coins className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                                  <span>{user.coins || 0} Coins</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  user.role === 'ADMIN' 
                                    ? 'bg-red-50 dark:bg-red-955/40 border border-red-200 dark:border-red-808 text-red-700 dark:text-red-400' 
                                    : user.role === 'TEST_CREATOR' 
                                    ? 'bg-purple-50 dark:bg-purple-955/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400' 
                                    : user.role === 'SUPPORT_TEAM' 
                                    ? 'bg-green-50 dark:bg-green-955/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' 
                                    : user.role === 'NOTICES_MANAGER' 
                                    ? 'bg-amber-50 dark:bg-amber-955/40 border border-amber-200/50 text-amber-700 dark:text-amber-450' 
                                    : 'bg-blue-50 dark:bg-blue-955/40 border border-blue-200 dark:border-blue-800 text-blue-750 dark:text-blue-450'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  user.subscriptionTier === 'Testbook Pass Pro'
                                    ? 'bg-yellow-50 dark:bg-yellow-955/40 border border-yellow-200 dark:border-yellow-700 text-yellow-750 dark:text-yellow-405 font-extrabold'
                                    : user.subscriptionTier === 'Testbook Pass'
                                    ? 'bg-green-50 dark:bg-green-955/40 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400'
                                    : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                }`}>
                                  {user.subscriptionTier === 'None' ? 'No Pass' : user.subscriptionTier.replace('Testbook', 'Mock Test')}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                                  {refTotal}
                                </div>
                                {refTotal > 0 && (
                                  <div className="text-[9px] mt-0.5 whitespace-nowrap">
                                    <span className="text-green-600 dark:text-green-400 font-extrabold">{refSuccessful} S</span>
                                    <span className="text-slate-400 mx-1">/</span>
                                    <span className="text-amber-600 dark:text-amber-500 font-extrabold">{refPending} P</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-slate-800 dark:text-slate-300">
                                {(() => {
                                  const uniqueTests = new Set();
                                  user.testSessions.forEach((s: any) => {
                                    if (s.status !== 'COMPLETED' && s.status !== 'AUTO_SUBMITTED') return;
                                    const durationMinutes = s.durationMinutes ?? 60;
                                    const totalSec = durationMinutes * 60;
                                    const spentSec = Number(s.durationSeconds ?? s.timeSpentSeconds ?? 0);
                                    if (spentSec >= totalSec * 0.75) {
                                      uniqueTests.add(s.testId);
                                    }
                                  });
                                  return uniqueTests.size;
                                })()}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectUser(user);
                                  }}
                                  className="text-blue-650 hover:text-blue-750 dark:text-blue-400 dark:hover:text-blue-300 font-bold bg-blue-50 dark:bg-blue-955/20 border border-blue-200 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                >
                                  View Dossier
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              )}

              {/* Detailed User Management Dossier & Sitting History section ΓÇö shows when selectedUserId is active */}
              {selectedUserId && (
                (() => {
                  const activeUser = usersList.find(u => u.id === selectedUserId);
                  if (!activeUser) return null;

                  // Calculate referral breakdown for activeUser
                  const activeCode = activeUser.referralCode?.trim().toLowerCase() || '';
                  const activeReferredList = activeCode 
                    ? usersList.filter(u => u.referredBy && u.referredBy.trim().toLowerCase() === activeCode)
                    : [];
                  const activeRefTotal = activeReferredList.length;
                  const activeRefSuccessfulList = activeReferredList.filter(u => {
                    return u.testSessions && u.testSessions.some((s: any) => {
                      if (s.status !== 'COMPLETED' && s.status !== 'AUTO_SUBMITTED') return false;
                      const durationMinutes = s.durationMinutes ?? 60;
                      const totalSec = durationMinutes * 60;
                      const spentSec = Number(s.durationSeconds ?? s.timeSpentSeconds ?? 0);
                      return spentSec >= totalSec * 0.75;
                    });
                  });
                  const activeRefSuccessful = activeRefSuccessfulList.length;
                  const activeRefPending = activeRefTotal - activeRefSuccessful;

                  return (
                    <div className="space-y-6 animate-in fade-in duration-200 text-xs">
                      {/* Back button */}
                      <button 
                        type="button"
                        onClick={() => setSelectedUserId(null)}
                        className="flex items-center gap-2 text-slate-550 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-extrabold text-xs transition cursor-pointer"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Registered Users Directory
                      </button>

                      {/* User Header Card */}
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in slide-in-from-top-4 duration-250">
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-lg font-extrabold">{activeUser.name}</h2>
                            {activeUser.isBlocked && (
                              <span className="bg-red-500/20 border border-red-400/30 text-red-205 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Blocked
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-blue-100">{activeUser.email} &bull; Hub ID: <span className="font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded">{activeUser.candidateCode || 'None'}</span></p>
                          <p className="text-[10px] text-indigo-200">Registered on: {activeUser.registeredDate || 'N/A'}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-center">
                            <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-wider">Wallet Balance</p>
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                              <Coins className="h-3.5 w-3.5 text-amber-300" />
                              <span className="font-black text-xs">{activeUser.coins || 0} Coins</span>
                            </div>
                          </div>
                          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-center">
                            <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-wider">Sittings Taken</p>
                            <span className="font-black text-xs mt-0.5 block">{activeUser.testSessions?.length || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Main Details and Edit Form */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-808 p-6 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <UserCheck className="h-5 w-5 text-blue-500" />
                            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Modify Profile Dossier</h2>
                          </div>
                          
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
                                <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Mobile Number (Read-Only)</label>
                                <input
                                  type="text"
                                  readOnly
                                  value={editMobile}
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Referral Code</label>
                                <input
                                  type="text"
                                  required
                                  value={editReferralCode}
                                  onChange={(e) => setEditReferralCode(e.target.value.toUpperCase())}
                                  className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Referred By (Code)</label>
                                <input
                                  type="text"
                                  value={editReferredBy}
                                  onChange={(e) => setEditReferredBy(e.target.value.toUpperCase())}
                                  placeholder="None"
                                  className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Referrals Count</label>
                                <input
                                  type="number"
                                  required
                                  value={editReferralsCount}
                                  onChange={(e) => setEditReferralsCount(Number(e.target.value))}
                                  className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">System Role</label>
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value as any)}
                                  className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="STUDENT">Student (Candidate)</option>
                                  <option value="TEST_CREATOR">Test Creator</option>
                                  <option value="SUPPORT_TEAM">Support Team</option>
                                  <option value="NOTICES_MANAGER">Notices & Update Manager</option>
                                  <option value="ADMIN">System Administrator</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Subscription Pass Tier</label>
                                <select
                                  value={editTier}
                                  onChange={(e) => setEditTier(e.target.value as any)}
                                  className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="None">None (No Pass)</option>
                                  <option value="Testbook Pass">Mock Test Pass (Basic)</option>
                                  <option value="Testbook Pass Pro">Mock Test Pass Pro (Full Gating Access)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Coins Balance</label>
                                <input
                                  type="number"
                                  required
                                  value={editCoins}
                                  onChange={(e) => setEditCoins(Number(e.target.value))}
                                  className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Account Password (Read-Only)</label>
                                <input
                                  type="text"
                                  readOnly
                                  value={editPassword}
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
                                />
                              </div>
                            </div>

                            {editTier !== 'None' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/30 dark:bg-blue-955/5 p-4 rounded-xl border border-blue-100 dark:border-blue-950/20">
                                <div>
                                  <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Pass Purchased Date</label>
                                  <input
                                    type="date"
                                    required
                                    value={editPurchasedAt}
                                    onChange={(e) => setEditPurchasedAt(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Pass Expiry Date</label>
                                  <input
                                    type="date"
                                    required
                                    value={editExpiry}
                                    onChange={(e) => setEditExpiry(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-550 cursor-pointer"
                                  />
                                </div>
                              </div>
                            )}

                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Account Status</label>
                              <select
                                value={editIsBlocked ? 'true' : 'false'}
                                onChange={(e) => setEditIsBlocked(e.target.value === 'true')}
                                className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                              >
                                <option value="false">Active (Unblocked)</option>
                                <option value="true">Suspended (Blocked)</option>
                              </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-808">
                              <button
                                type="submit"
                                className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-md cursor-pointer"
                              >
                                <UserCheck className="h-4 w-4" />
                                Save Dossier Changes
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* Sidebar info */}
                        <div className="space-y-6">
                          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-808 p-6 rounded-2xl shadow-sm">
                            <h3 className="font-extrabold text-sm text-slate-905 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-105 dark:border-slate-808">Access Rights</h3>
                            <div className="space-y-4 text-xs">
                              <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-905">
                                <span className="font-medium text-slate-550">System Permission:</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  activeUser.role === 'ADMIN' 
                                    ? 'bg-red-50 dark:bg-red-955/40 text-red-700 dark:text-red-400' 
                                    : activeUser.role === 'TEST_CREATOR' 
                                    ? 'bg-purple-50 dark:bg-purple-955/40 text-purple-700 dark:text-purple-400' 
                                    : activeUser.role === 'SUPPORT_TEAM' 
                                    ? 'bg-green-50 dark:bg-green-955/40 text-green-700 dark:text-green-400' 
                                    : activeUser.role === 'NOTICES_MANAGER' 
                                    ? 'bg-amber-50 dark:bg-amber-955/40 text-amber-700 dark:text-amber-450' 
                                    : 'bg-blue-50 dark:bg-blue-955/40 text-blue-755'
                                }`}>
                                  {activeUser.role}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-905">
                                <span className="font-medium text-slate-550">Subscription Pass:</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  activeUser.subscriptionTier === 'Testbook Pass Pro'
                                    ? 'bg-yellow-50 dark:bg-yellow-955/40 text-yellow-755 font-black'
                                    : activeUser.subscriptionTier === 'Testbook Pass'
                                    ? 'bg-green-50 dark:bg-green-955/40 text-green-700'
                                    : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                                }`}>
                                  {activeUser.subscriptionTier === 'None' ? 'No Pass' : activeUser.subscriptionTier.replace('Testbook', 'Mock Test')}
                                </span>
                              </div>
                              {activeUser.subscriptionTier !== 'None' && (
                                <>
                                  <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-905">
                                    <span className="font-medium text-slate-550">Purchased Date:</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{activeUser.subscriptionPurchasedAt?.split('T')[0] || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-905">
                                    <span className="font-medium text-slate-550">Expires Date:</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{activeUser.subscriptionExpiresAt?.split('T')[0] || 'N/A'}</span>
                                  </div>
                                </>
                              )}
                              <div className="flex justify-between items-center py-2">
                                <span className="font-medium text-slate-555">Total Referrals:</span>
                                <span className="font-extrabold text-slate-900 dark:text-white">{activeUser.referralsCount || 0} user(s)</span>
                              </div>
                            </div>
                          </div>

                          {/* Referral Details Card */}
                          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-808 p-6 rounded-2xl shadow-sm">
                            <h3 className="font-extrabold text-sm text-slate-905 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-105 dark:border-slate-808 flex items-center gap-2">
                              <Gift className="h-4 w-4 text-amber-500" />
                              Referral Stats
                            </h3>
                            <div className="space-y-3.5 text-xs text-left">
                              <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-905">
                                <span className="font-medium text-slate-550">Total Invited:</span>
                                <span className="font-black text-slate-900 dark:text-white">{activeRefTotal} user(s)</span>
                              </div>
                              <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-905">
                                <span className="font-medium text-slate-550 flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                  Successful Referrals:
                                </span>
                                <span className="font-black text-green-600 dark:text-green-400">{activeRefSuccessful} user(s)</span>
                              </div>
                              <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-905">
                                <span className="font-medium text-slate-550 flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                                  Pending First Test:
                                </span>
                                <span className="font-black text-amber-600 dark:text-amber-500">{activeRefPending} user(s)</span>
                              </div>
                              
                              {/* Short list of referred users names */}
                              {activeRefTotal > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                  <p className="text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Referred Friends List</p>
                                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                    {activeReferredList.map(refUser => {
                                      const isSuccessful = activeRefSuccessfulList.some(u => u.id === refUser.id);
                                      return (
                                        <div key={refUser.id} className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-808/30 text-[10px]">
                                          <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-202">{refUser.name}</p>
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500">{refUser.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")}</p>
                                          </div>
                                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                            isSuccessful 
                                              ? 'bg-green-50 dark:bg-green-955/20 text-green-700 dark:text-green-400 border border-green-200/50' 
                                              : 'bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-450 border border-amber-200/50'
                                          }`}>
                                            {isSuccessful ? 'SUCCESS' : 'PENDING'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Full Width Exam Sitting History */}
                      <div className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-808 p-6 rounded-2xl shadow-sm text-left">
                        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200 dark:border-slate-808 font-bold">
                          <h3 className="font-extrabold text-sm text-slate-905 dark:text-white uppercase tracking-wider">Exam Sitting History</h3>
                          <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-808 font-bold">
                            {activeUser.testSessions?.length || 0} sessions logged
                          </span>
                        </div>
                        
                        {activeUser.testSessions && activeUser.testSessions.length > 0 ? (
                          <div className="space-y-4">
                            {activeUser.testSessions.map(session => (
                              <div key={session.id} className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl p-4 text-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-808 pb-3 mb-3">
                                  <div>
                                    <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{session.title}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 font-semibold">
                                      <Calendar className="h-3 w-3" /> Attempted on {session.date}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      session.status === 'COMPLETED'
                                        ? 'bg-green-50 dark:bg-green-955/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                        : session.status === 'AUTO_SUBMITTED'
                                        ? 'bg-yellow-50 dark:bg-yellow-955/40 border border-yellow-200 dark:border-yellow-805 text-yellow-750 dark:text-yellow-405'
                                        : 'bg-blue-50 dark:bg-blue-955/40 border border-blue-200 dark:border-blue-800 text-blue-750 dark:text-blue-400'
                                    }`}>
                                      {session.status}
                                    </span>
                                    
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setResetTarget({
                                          userId: activeUser.id,
                                          sessionId: session.id,
                                          userName: activeUser.name,
                                          sessionTitle: session.title
                                        });
                                        setResetConfirmOpen(true);
                                      }}
                                      className="text-red-650 hover:text-red-750 dark:text-red-400 dark:hover:text-red-300 font-bold flex items-center gap-1 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" /> Reset Attempt
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                                  <div>
                                    <p className="text-slate-550 dark:text-slate-400 text-[10px] uppercase font-extrabold tracking-wider">Score Obtained</p>
                                    <p className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5">{session.score.toFixed(1)} / {session.maxScore}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-550 dark:text-slate-400 text-[10px] uppercase font-extrabold tracking-wider">Accuracy Percentage</p>
                                    <p className="text-sm font-black text-green-600 dark:text-green-400 mt-0.5">{session.accuracy.toFixed(1)}%</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-550 dark:text-slate-400 text-[10px] uppercase font-extrabold tracking-wider">Time Spent</p>
                                    <p className="text-sm font-black text-yellow-600 dark:text-yellow-405 mt-0.5">
                                      {formatExactTime(computeExactTimeSpent(session))}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-slate-555 dark:text-slate-400 text-[10px] uppercase font-extrabold tracking-wider">Cheat Violations</p>
                                    <p className={`text-sm font-black mt-0.5 ${session.violations > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-300'}`}>
                                      {session.violations} Focus Alert{session.violations === 1 ? '' : 's'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-808 rounded-xl text-slate-500 text-xs">
                            <FileText className="h-8 w-8 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                            This user has not sat for any exam sittings yet.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}
                    {/* TAB 4: NOTICES & ANNOUNCEMENTS MANAGER */}
          {activeTab === 'notices' && hasTabAccess('notices') && (
            <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Live Notices & Updates Manager</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Publish and manage live notices, results, and admit cards visible on client home screens</p>
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                  {noticesList.length} total alert{noticesList.length !== 1 ? 's' : ''} active
                </span>
              </div>

              {/* Info alert */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/25 p-4 rounded-2xl flex items-start gap-3">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">Live Updates Engine</p>
                  <p className="text-slate-655 dark:text-slate-400 font-semibold leading-relaxed">
                    Publish exam alerts, admit card download releases, and result sheets directly to the homepage updates grid. All additions will update client dashboards instantly via context state.
                  </p>
                </div>
              </div>

              {/* Collapsible Publish Card */}
              <div className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsCreateNoticeOpen(!isCreateNoticeOpen)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <PlusCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white">Publish New Update / Alert</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Click to expand the alert publication form</p>
                    </div>
                  </div>
                  <div className={`transition-transform duration-200 ${isCreateNoticeOpen ? 'rotate-180' : ''}`}>
                    <ArrowDown className="h-4 w-4 text-slate-500" />
                  </div>
                </button>

                {isCreateNoticeOpen && (
                  <div className="border-t border-slate-200 dark:border-slate-808 p-6 bg-white dark:bg-slate-950">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!noticeTitle.trim()) return;
                      addNotice(noticeTitle, noticeType, noticeCategory, noticeDate, noticeUrl, noticeLastDate);
                      setNoticeTitle('');
                      setNoticeUrl('');
                      setNoticeLastDate('');
                      setIsCreateNoticeOpen(false);
                      showToast('Notice published successfully!');
                    }} className="space-y-5 text-xs">
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Update Category</label>
                          <select
                            value={noticeCategory}
                            onChange={(e) => setNoticeCategory(e.target.value as any)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="notice">Live Notices & Announcements</option>
                            <option value="result">Live Result Section</option>
                            <option value="admit_card">Live Admit Card Section</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Label Tag (e.g. EXAM DATE, MERIT LIST)</label>
                          <input
                            type="text"
                            required
                            value={noticeType}
                            onChange={(e) => setNoticeType(e.target.value)}
                            placeholder="EXAM DATE, RESULT, ADMISSION, etc."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Publish Date</label>
                          <input
                            type="date"
                            required
                            value={noticeDate}
                            onChange={(e) => setNoticeDate(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {noticeCategory === 'notice' && (
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Application Last Date (Optional)</label>
                            <input
                              type="date"
                              value={noticeLastDate}
                              onChange={(e) => setNoticeLastDate(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Attachment URL / File (Optional)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={noticeUrl}
                              onChange={(e) => setNoticeUrl(e.target.value)}
                              placeholder="https://example.com/advisory or upload file"
                              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                            />
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              id="notice-attachment-upload"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setIsUploadingNotice(true);
                                const url = await uploadFileToTigrisDirect(file);
                                if (url) {
                                  setNoticeUrl(url);
                                  showToast("Attachment uploaded successfully to Tigris!");
                                }
                                setIsUploadingNotice(false);
                              }}
                            />
                            <label
                              htmlFor={isUploadingNotice ? undefined : "notice-attachment-upload"}
                              className={`bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition inline-flex items-center gap-1.5 shrink-0 ${
                                isUploadingNotice ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"
                              }`}
                            >
                              <Upload className={`h-3.5 w-3.5 ${isUploadingNotice ? "animate-bounce" : ""}`} />
                              {isUploadingNotice ? "Uploading..." : "Upload File"}
                            </label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Update Heading Title</label>
                        <textarea
                          required
                          value={noticeTitle}
                          onChange={(e) => setNoticeTitle(e.target.value)}
                          placeholder="Type notice title description..."
                          rows={3}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 resize-none"
                        />
                      </div>

                      <div className="flex justify-end pt-3">
                        <button
                          type="submit"
                          className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-md cursor-pointer"
                        >
                          Publish Alert
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Active Board List ΓÇö Full Width */}
              <div className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-808 p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Bell className="h-4.5 w-4.5 text-blue-500" /> Active Updates Board
                  </h3>
                  
                  {/* Search bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={noticeSearch}
                      onChange={(e) => setNoticeSearch(e.target.value)}
                      placeholder="Search updates..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-808 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Heading Title</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Label Tag</th>
                        <th className="py-3 px-4">Publish Date</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {noticesList.filter(n => 
                        n.title.toLowerCase().includes(noticeSearch.toLowerCase()) ||
                        n.type.toLowerCase().includes(noticeSearch.toLowerCase()) ||
                        n.category.toLowerCase().includes(noticeSearch.toLowerCase())
                      ).length > 0 ? (
                        noticesList.filter(n => 
                          n.title.toLowerCase().includes(noticeSearch.toLowerCase()) ||
                          n.type.toLowerCase().includes(noticeSearch.toLowerCase()) ||
                          n.category.toLowerCase().includes(noticeSearch.toLowerCase())
                        ).map((notice) => (
                          <tr key={notice.id} className="border-b border-slate-200 dark:border-slate-808 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition text-slate-800 dark:text-slate-300">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 max-w-md">
                              {notice.url ? (
                                <a href={notice.url} target="_blank" rel="noopener noreferrer" className="text-blue-650 hover:text-blue-750 dark:text-blue-400 dark:hover:text-blue-350 hover:underline flex items-center gap-1 mb-1">
                                  {notice.title}
                                  <ChevronRight className="h-3 w-3 inline animate-pulse" />
                                </a>
                              ) : (
                                <span className="block mb-1">{notice.title}</span>
                              )}
                              {notice.lastDate && (
                                <span className="block text-[10px] text-red-650 dark:text-red-500 font-extrabold mt-1 uppercase tracking-wider">
                                  Last Date: {notice.lastDate}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 capitalize">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                notice.category === 'notice'
                                  ? 'bg-blue-50 dark:bg-blue-955/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                                  : notice.category === 'result'
                                  ? 'bg-yellow-50 dark:bg-yellow-955/40 text-yellow-750 dark:text-yellow-405 border border-yellow-200 dark:border-yellow-900'
                                  : 'bg-green-50 dark:bg-green-955/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900'
                              }`}>
                                {notice.category === 'notice' ? 'Announcement' : notice.category === 'result' ? 'Result' : 'Admit Card'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-105 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">{notice.type}</span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-[11px] text-slate-500 dark:text-slate-400">{notice.date}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  deleteNotice(notice.id);
                                  showToast('Notice deleted successfully.');
                                }}
                                className="text-red-600 hover:text-red-700 dark:text-red-405 dark:hover:text-red-300 font-bold bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-10 text-slate-500 font-semibold">
                            No updates match the search filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
                    {/* TAB 5: CATEGORIES MANAGEMENT */}
          {activeTab === 'categories' && hasTabAccess('categories') && (
            <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Manage Exam Categories</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Create, edit, reorder, and delete main exam categories</p>
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                  {examCatalog.length} categor{examCatalog.length !== 1 ? 'ies' : 'y'} active
                </span>
              </div>

              {/* Collapsible Add Category Card */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsCreateCategoryOpen(!isCreateCategoryOpen)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <FolderPlus className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white">Create New Category</p>
                      <p className="text-[11px] text-slate-400">Click to expand the category creation form</p>
                    </div>
                  </div>
                  <div className={`transition-transform duration-200 ${isCreateCategoryOpen ? 'rotate-180' : ''}`}>
                    <ArrowDown className="h-4 w-4 text-slate-500" />
                  </div>
                </button>

                {isCreateCategoryOpen && (
                  <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-950">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newCategoryName.trim()) return;
                        addCategory(
                          newCategoryName.trim(), 
                          newCategoryLogoUrl.trim() || undefined,
                          newCategoryIsPopular,
                          newCategoryDescription.trim(),
                          newCategoryCountText.trim()
                        );
                        setNewCategoryName('');
                        setNewCategoryLogoUrl('');
                        setNewCategoryIsPopular(false);
                        setNewCategoryDescription('');
                        setNewCategoryCountText('');
                        setIsCreateCategoryOpen(false);
                        showToast('Category created successfully!');
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">
                          Category Name
                        </label>
                        <input
                          type="text"
                          required
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="e.g. UPSC Exams, SSC Exams"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-805 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">
                          Category Logo Image URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCategoryLogoUrl}
                            onChange={(e) => setNewCategoryLogoUrl(e.target.value)}
                            placeholder="e.g. https://example.com/logo.png or upload image"
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-805 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                          <input
                            type="file"
                            accept="image/*"
                            id="new-category-logo-upload"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingCategoryLogo(true);
                              const url = await uploadFileToTigrisDirect(file);
                              if (url) {
                                setNewCategoryLogoUrl(url);
                                showToast("Logo uploaded successfully to Tigris!");
                              }
                              setIsUploadingCategoryLogo(false);
                            }}
                          />
                          <label
                            htmlFor={isUploadingCategoryLogo ? undefined : "new-category-logo-upload"}
                            className={`bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition inline-flex items-center gap-1.5 shrink-0 ${
                              isUploadingCategoryLogo ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"
                            }`}
                          >
                            <Upload className={`h-3.5 w-3.5 ${isUploadingCategoryLogo ? "animate-bounce" : ""}`} />
                            {isUploadingCategoryLogo ? "Uploading..." : "Upload Logo"}
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">
                          Description (e.g. SSC CGL, CHSL, MTS, GD Constable)
                        </label>
                        <input
                          type="text"
                          value={newCategoryDescription}
                          onChange={(e) => setNewCategoryDescription(e.target.value)}
                          placeholder="List sub-exams or a brief description"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">
                          Test Count / Badge Text (e.g. 45+ Tests)
                        </label>
                        <input
                          type="text"
                          value={newCategoryCountText}
                          onChange={(e) => setNewCategoryCountText(e.target.value)}
                          placeholder="e.g. 45+ Tests"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1.5">
                        <input
                          type="checkbox"
                          id="newCategoryIsPopular"
                          checked={newCategoryIsPopular}
                          onChange={(e) => setNewCategoryIsPopular(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="newCategoryIsPopular" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer">
                          Show in Popular Exam Mock Series section on homepage
                        </label>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition active:scale-95 cursor-pointer shadow-md"
                        >
                          Create Category
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Categories Table Card — Full Width */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-6">
                  Active Exam Categories
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">
                        <th className="py-3 px-4">Logo</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Count Text</th>
                        <th className="py-3 px-4">Popular?</th>
                        <th className="py-3 px-4">Sub Categories</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examCatalog.map(cat => (
                        <tr key={cat.id} className="border-b border-slate-50 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          
                          {/* Logo */}
                          <td className="py-3.5 px-4">
                            {editingCategoryId === cat.id ? (
                              <div className="flex items-center gap-1.5 w-36">
                                <input
                                  type="text"
                                  value={editingCategoryLogoUrl}
                                  onChange={(e) => setEditingCategoryLogoUrl(e.target.value)}
                                  placeholder="e.g. Logo URL"
                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold w-20 flex-1 min-w-0"
                                />
                                <input
                                  type="file"
                                  accept="image/*"
                                  id={`edit-category-logo-${cat.id}`}
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setIsUploadingCategoryLogo(true);
                                    const url = await uploadFileToTigrisDirect(file);
                                    if (url) {
                                      setEditingCategoryLogoUrl(url);
                                      showToast("Logo uploaded successfully to Tigris!");
                                    }
                                    setIsUploadingCategoryLogo(false);
                                  }}
                                />
                                <label
                                  htmlFor={isUploadingCategoryLogo ? undefined : `edit-category-logo-${cat.id}`}
                                  className={`bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition inline-flex items-center justify-center cursor-pointer shrink-0 ${
                                    isUploadingCategoryLogo ? "opacity-50 pointer-events-none" : ""
                                  }`}
                                  title="Upload Logo to Tigris"
                                >
                                  <Upload className={`h-3.5 w-3.5 ${isUploadingCategoryLogo ? "animate-bounce" : ""}`} />
                                </label>
                              </div>
                            ) : cat.logoUrl ? (
                              <img
                                src={cat.logoUrl}
                                alt={cat.name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                None
                              </div>
                            )}
                          </td>

                          {/* Name */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-200">
                            {editingCategoryId === cat.id ? (
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold w-28"
                              />
                            ) : (
                              <span>{cat.name}</span>
                            )}
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4 text-slate-650 dark:text-slate-350">
                            {editingCategoryId === cat.id ? (
                              <input
                                type="text"
                                value={editingCategoryDescription}
                                onChange={(e) => setEditingCategoryDescription(e.target.value)}
                                placeholder="List sub-exams"
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold w-40"
                              />
                            ) : (
                              <span>{cat.description || <span className="text-slate-400 italic">None</span>}</span>
                            )}
                          </td>

                          {/* Count Text */}
                          <td className="py-3.5 px-4 text-slate-650 dark:text-slate-350 font-semibold">
                            {editingCategoryId === cat.id ? (
                              <input
                                type="text"
                                value={editingCategoryCountText}
                                onChange={(e) => setEditingCategoryCountText(e.target.value)}
                                placeholder="e.g. 45+ Tests"
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold w-24"
                              />
                            ) : (
                              <span>{cat.countText || <span className="text-slate-400 italic">None</span>}</span>
                            )}
                          </td>

                          {/* Is Popular checkbox */}
                          <td className="py-3.5 px-4">
                            {editingCategoryId === cat.id ? (
                              <input
                                type="checkbox"
                                checked={editingCategoryIsPopular}
                                onChange={(e) => setEditingCategoryIsPopular(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            ) : cat.isPopular ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Popular</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">Regular</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-500">{cat.subCategories.length} Sub-cat(s)</td>
                          <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                            {editingCategoryId === cat.id ? (
                              <>
                                <button
                                  onClick={() => {
                                    if (editingCategoryName.trim()) {
                                      editCategory(
                                        cat.id,
                                        editingCategoryName.trim(),
                                        editingCategoryLogoUrl.trim() || undefined,
                                        editingCategoryIsPopular,
                                        editingCategoryDescription.trim(),
                                        editingCategoryCountText.trim()
                                      );
                                      setEditingCategoryId(null);
                                      showToast('Category updated successfully.');
                                    }
                                  }}
                                  className="text-green-555 dark:text-green-400 font-bold bg-green-50 dark:bg-green-955/20 border border-green-200 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingCategoryId(null)}
                                  className="text-slate-550 dark:text-slate-405 font-bold bg-slate-50 dark:bg-slate-955/20 border border-slate-200 dark:border-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  disabled={examCatalog.indexOf(cat) === 0}
                                  onClick={() => {
                                    const idx = examCatalog.indexOf(cat);
                                    if (idx > 0) {
                                      const newCatalog = [...examCatalog];
                                      [newCatalog[idx], newCatalog[idx - 1]] = [newCatalog[idx - 1], newCatalog[idx]];
                                      reorderCategories(newCatalog);
                                      showToast('Category moved up successfully.');
                                    }
                                  }}
                                  className="text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  disabled={examCatalog.indexOf(cat) === examCatalog.length - 1}
                                  onClick={() => {
                                    const idx = examCatalog.indexOf(cat);
                                    if (idx < examCatalog.length - 1) {
                                      const newCatalog = [...examCatalog];
                                      [newCatalog[idx], newCatalog[idx + 1]] = [newCatalog[idx + 1], newCatalog[idx]];
                                      reorderCategories(newCatalog);
                                      showToast('Category moved down successfully.');
                                    }
                                  }}
                                  className="text-slate-500 hover:text-slate-705 disabled:opacity-30 disabled:pointer-events-none p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCategoryId(cat.id);
                                    setEditingCategoryName(cat.name);
                                    setEditingCategoryLogoUrl(cat.logoUrl || '');
                                    setEditingCategoryIsPopular(cat.isPopular || false);
                                    setEditingCategoryDescription(cat.description || '');
                                    setEditingCategoryCountText(cat.countText || '');
                                  }}
                                  className="text-blue-500 hover:text-blue-650 font-bold bg-blue-50 dark:bg-blue-955/20 border border-blue-200 dark:border-blue-900/30 hover:bg-blue-105 dark:hover:bg-blue-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    deleteCategory(cat.id);
                                    showToast('Category deleted successfully.');
                                  }}
                                  className="text-red-500 hover:text-red-650 font-bold bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 hover:bg-red-105 dark:hover:bg-red-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
                    {/* TAB 6: SUB-CATEGORIES MANAGEMENT */}
          {activeTab === 'subcategories' && hasTabAccess('subcategories') && (
            <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Manage Sub-Categories</h2>
                  <p className="text-xs text-slate-505 dark:text-slate-400 mt-0.5">Create, edit, reorder, and delete exam sub-categories under main categories</p>
                </div>
                <span className="text-xs font-bold text-slate-505 dark:text-slate-400 bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 px-3 py-1.5 rounded-lg">
                  {examCatalog.reduce((acc, cat) => acc + cat.subCategories.length, 0)} sub-categor{examCatalog.reduce((acc, cat) => acc + cat.subCategories.length, 0) !== 1 ? 'ies' : 'y'} active
                </span>
              </div>

              {/* Collapsible Add Card */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsCreateSubCategoryOpen(!isCreateSubCategoryOpen)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <Layers className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white">Create Sub-Category</p>
                      <p className="text-[11px] text-slate-400">Click to expand the subcategory creation form</p>
                    </div>
                  </div>
                  <div className={`transition-transform duration-200 ${isCreateSubCategoryOpen ? 'rotate-180' : ''}`}>
                    <ArrowDown className="h-4 w-4 text-slate-505" />
                  </div>
                </button>

                {isCreateSubCategoryOpen && (
                  <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-955">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newSubCategoryParent || !newSubCategoryName.trim()) {
                          alert('Please select a parent category and enter a name.');
                          return;
                        }
                        addSubCategory(newSubCategoryParent, newSubCategoryName.trim());
                        setNewSubCategoryName('');
                        setIsCreateSubCategoryOpen(false);
                        showToast('Subcategory created successfully!');
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                            Parent Category
                          </label>
                          <select
                            required
                            value={newSubCategoryParent}
                            onChange={(e) => setNewSubCategoryParent(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="">-- Select Parent Category --</option>
                            {examCatalog.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                            Sub Category Name
                          </label>
                          <input
                            type="text"
                            required
                            value={newSubCategoryName}
                            onChange={(e) => setNewSubCategoryName(e.target.value)}
                            placeholder="e.g. SSC CGL, IBPS RRB PO"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition active:scale-95 cursor-pointer shadow-md"
                        >
                          Create Sub Category
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Subcategories Table Card ΓÇö Full Width */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-808 rounded-2xl shadow-sm p-6">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-6">
                  Active Sub Categories
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-808 text-slate-404 uppercase text-[9px] tracking-wider font-extrabold">
                        <th className="py-3 px-4">Parent Category</th>
                        <th className="py-3 px-4">Sub Category Name</th>
                        <th className="py-3 px-4">Mock Tests Count</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examCatalog.flatMap(cat => 
                        cat.subCategories.map(sub => (
                          <tr key={sub.id} className="border-b border-slate-50 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-500">{cat.name}</td>
                            <td className="py-3.5 px-4 font-bold text-slate-909 dark:text-slate-202">
                              {editingSubCategoryId === sub.id ? (
                                <input
                                  type="text"
                                  value={editingSubCategoryName}
                                  onChange={(e) => setEditingSubCategoryName(e.target.value)}
                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-505 font-bold w-full max-w-xs"
                                />
                              ) : (
                                <span>{sub.name}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-505">{sub.tests.length} mock test(s)</td>
                            <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                              {editingSubCategoryId === sub.id ? (
                                <>
                                  <button
                                    onClick={() => {
                                      if (editingSubCategoryName.trim()) {
                                        editSubCategory(cat.id, sub.id, editingSubCategoryName.trim());
                                        setEditingSubCategoryId(null);
                                        showToast('Subcategory renamed successfully.');
                                      }
                                    }}
                                    className="text-green-555 dark:text-green-400 font-bold bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-909/30 hover:bg-green-105 dark:hover:bg-green-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingSubCategoryId(null)}
                                    className="text-slate-550 dark:text-slate-405 font-bold bg-slate-50 dark:bg-slate-955/20 border border-slate-202 dark:border-slate-808/30 hover:bg-slate-105 dark:hover:bg-slate-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    disabled={cat.subCategories.indexOf(sub) === 0}
                                    onClick={() => {
                                      const idx = cat.subCategories.indexOf(sub);
                                      if (idx > 0) {
                                        const newSubs = [...cat.subCategories];
                                        [newSubs[idx], newSubs[idx - 1]] = [newSubs[idx - 1], newSubs[idx]];
                                        reorderSubCategories(cat.id, newSubs);
                                        showToast('Subcategory moved up successfully.');
                                      }
                                    }}
                                    className="text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-202 dark:border-slate-800 cursor-pointer"
                                    title="Move Up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    disabled={cat.subCategories.indexOf(sub) === cat.subCategories.length - 1}
                                    onClick={() => {
                                      const idx = cat.subCategories.indexOf(sub);
                                      if (idx < cat.subCategories.length - 1) {
                                        const newSubs = [...cat.subCategories];
                                        [newSubs[idx], newSubs[idx + 1]] = [newSubs[idx + 1], newSubs[idx]];
                                        reorderSubCategories(cat.id, newSubs);
                                        showToast('Subcategory moved down successfully.');
                                      }
                                    }}
                                    className="text-slate-500 hover:text-slate-705 disabled:opacity-30 disabled:pointer-events-none p-1.5 rounded bg-slate-55 dark:bg-slate-909 border border-slate-202 dark:border-slate-800 cursor-pointer"
                                    title="Move Down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingSubCategoryId(sub.id);
                                      setEditingSubCategoryName(sub.name);
                                    }}
                                    className="text-blue-500 hover:text-blue-650 font-bold bg-blue-50 dark:bg-blue-955/20 border border-blue-200 dark:border-blue-900/30 hover:bg-blue-105 dark:hover:bg-blue-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      deleteSubCategory(cat.id, sub.id);
                                      showToast('Subcategory deleted successfully.');
                                    }}
                                    className="text-red-500 hover:text-red-655 font-bold bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 hover:bg-red-105 dark:hover:bg-red-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
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
                    {/* TAB 6.5: SUB-SUB-CATEGORIES MANAGEMENT */}
          {activeTab === 'subsubcategories' && hasTabAccess('subsubcategories') && (
            <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Manage Sub-Sub-Categories</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Create, edit, reorder, and delete subject sub-subcategories nested under sub-categories</p>
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                  {examCatalog.reduce((acc, cat) => acc + cat.subCategories.reduce((subAcc, sub) => subAcc + (sub.subSubCategories || []).length, 0), 0)} sub-sub-categor{examCatalog.reduce((acc, cat) => acc + cat.subCategories.reduce((subAcc, sub) => subAcc + (sub.subSubCategories || []).length, 0), 0) !== 1 ? 'ies' : 'y'} active
                </span>
              </div>

              {/* Collapsible Add Card */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsCreateSubSubCategoryOpen(!isCreateSubSubCategoryOpen)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white">Create Sub-Sub Category</p>
                      <p className="text-[11px] text-slate-400">Click to expand the sub-subcategory creation form</p>
                    </div>
                  </div>
                  <div className={`transition-transform duration-200 ${isCreateSubSubCategoryOpen ? 'rotate-180' : ''}`}>
                    <ArrowDown className="h-4 w-4 text-slate-505" />
                  </div>
                </button>

                {isCreateSubSubCategoryOpen && (
                  <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-950">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newSubSubCategoryParentCategory || !newSubSubCategoryParentSubCategory || !newSubSubCategoryName.trim()) {
                          alert('Please select parent category, subcategory and enter a name.');
                          return;
                        }
                        addSubSubCategory(newSubSubCategoryParentCategory, newSubSubCategoryParentSubCategory, newSubSubCategoryName.trim());
                        setNewSubSubCategoryName('');
                        setIsCreateSubSubCategoryOpen(false);
                        showToast('Sub-subcategory created successfully!');
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">
                            Parent Category
                          </label>
                          <select
                            required
                            value={newSubSubCategoryParentCategory}
                            onChange={(e) => {
                              setNewSubSubCategoryParentCategory(e.target.value);
                              setNewSubSubCategoryParentSubCategory('');
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="">-- Select Parent Category --</option>
                            {examCatalog.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">
                            Parent Sub Category
                          </label>
                          <select
                            required
                            value={newSubSubCategoryParentSubCategory}
                            onChange={(e) => setNewSubSubCategoryParentSubCategory(e.target.value)}
                            disabled={!newSubSubCategoryParentCategory}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="">-- Select Parent Sub Category --</option>
                            {examCatalog.find(c => c.id === newSubSubCategoryParentCategory)?.subCategories.map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            )) || null}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">
                            Sub-Sub Category Name
                          </label>
                          <input
                            type="text"
                            required
                            value={newSubSubCategoryName}
                            onChange={(e) => setNewSubSubCategoryName(e.target.value)}
                            placeholder="e.g. Quantitative Aptitude, Reasoning"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition active:scale-95 cursor-pointer shadow-md"
                        >
                          Create Sub-Sub Category
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Sub-subcategories Table Card ΓÇö Full Width */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-6">
                  Active Sub-Sub Categories
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-808 text-slate-404 uppercase text-[9px] tracking-wider font-extrabold">
                        <th className="py-3 px-4">Parent Category</th>
                        <th className="py-3 px-4">Sub Category</th>
                        <th className="py-3 px-4">Sub-Sub Category Name</th>
                        <th className="py-3 px-4">Mock Tests Count</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examCatalog.flatMap(cat => 
                        cat.subCategories.flatMap(sub => 
                          (sub.subSubCategories || []).map(subsub => (
                            <tr key={subsub.id} className="border-b border-slate-50 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-500">{cat.name}</td>
                              <td className="py-3.5 px-4 font-bold text-slate-500">{sub.name}</td>
                              <td className="py-3.5 px-4 font-bold text-slate-909 dark:text-slate-202">
                                {editingSubSubCategoryId === subsub.id ? (
                                  <input
                                    type="text"
                                    value={editingSubSubCategoryName}
                                    onChange={(e) => setEditingSubSubCategoryName(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-808 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold w-full max-w-xs"
                                  />
                                ) : (
                                  <span>{subsub.name}</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-505">{subsub.tests.length} mock test(s)</td>
                              <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                                {editingSubSubCategoryId === subsub.id ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        if (editingSubSubCategoryName.trim()) {
                                          editSubSubCategory(cat.id, sub.id, subsub.id, editingSubSubCategoryName.trim());
                                          setEditingSubSubCategoryId(null);
                                          showToast('Sub-subcategory renamed successfully.');
                                        }
                                      }}
                                      className="text-green-555 dark:text-green-400 font-bold bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-909/30 hover:bg-green-105 dark:hover:bg-green-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingSubSubCategoryId(null)}
                                      className="text-slate-550 dark:text-slate-405 font-bold bg-slate-50 dark:bg-slate-955/20 border border-slate-202 dark:border-slate-808/30 hover:bg-slate-105 dark:hover:bg-slate-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      disabled={sub.subSubCategories.indexOf(subsub) === 0}
                                      onClick={() => {
                                        const idx = sub.subSubCategories.indexOf(subsub);
                                        if (idx > 0) {
                                          const newSubSubs = [...sub.subSubCategories];
                                          [newSubSubs[idx], newSubSubs[idx - 1]] = [newSubSubs[idx - 1], newSubSubs[idx]];
                                          reorderSubSubCategories(cat.id, sub.id, newSubSubs);
                                          showToast('Sub-subcategory moved up successfully.');
                                        }
                                      }}
                                      className="text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-202 dark:border-slate-800 cursor-pointer"
                                      title="Move Up"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      disabled={sub.subSubCategories.indexOf(subsub) === sub.subSubCategories.length - 1}
                                      onClick={() => {
                                        const idx = sub.subSubCategories.indexOf(subsub);
                                        if (idx < sub.subSubCategories.length - 1) {
                                          const newSubSubs = [...sub.subSubCategories];
                                          [newSubSubs[idx], newSubSubs[idx + 1]] = [newSubSubs[idx + 1], newSubSubs[idx]];
                                          reorderSubSubCategories(cat.id, sub.id, newSubSubs);
                                          showToast('Sub-subcategory moved down successfully.');
                                        }
                                      }}
                                      className="text-slate-500 hover:text-slate-705 disabled:opacity-30 disabled:pointer-events-none p-1.5 rounded bg-slate-55 dark:bg-slate-909 border border-slate-202 dark:border-slate-800 cursor-pointer"
                                      title="Move Down"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingSubSubCategoryId(subsub.id);
                                        setEditingSubSubCategoryName(subsub.name);
                                      }}
                                      className="text-blue-500 hover:text-blue-655 font-bold bg-blue-50 dark:bg-blue-955/20 border border-blue-200 dark:border-blue-900/30 hover:bg-blue-105 dark:hover:bg-blue-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        deleteSubSubCategory(cat.id, sub.id, subsub.id);
                                        showToast('Sub-subcategory deleted successfully.');
                                      }}
                                      className="text-red-500 hover:text-red-655 font-bold bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 hover:bg-red-105 dark:hover:bg-red-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
                    {/* TAB 7: MOCK TESTS MANAGEMENT */}
          {activeTab === 'mocks' && hasTabAccess('mocks') && (
            <MockTestManager
              examCatalog={examCatalog}
              newMockCategoryParent={newMockCategoryParent}
              setNewMockCategoryParent={setNewMockCategoryParent}
              newMockSubCategoryParent={newMockSubCategoryParent}
              setNewMockSubCategoryParent={setNewMockSubCategoryParent}
              newMockSubSubCategoryParent={newMockSubSubCategoryParent}
              setNewMockSubSubCategoryParent={setNewMockSubSubCategoryParent}
              editingMockTestId={editingMockTestId}
              setEditingMockTestId={setEditingMockTestId}
              newMockTitle={newMockTitle}
              setNewMockTitle={setNewMockTitle}
              newMockDuration={newMockDuration}
              setNewMockDuration={setNewMockDuration}
              newMockQsCount={newMockQsCount}
              setNewMockQsCount={setNewMockQsCount}
              newMockMaxMarks={newMockMaxMarks}
              setNewMockMaxMarks={setNewMockMaxMarks}
              newMockRequiredTier={newMockRequiredTier}
              setNewMockRequiredTier={setNewMockRequiredTier}
              newMockHasSectionalTiming={newMockHasSectionalTiming}
              setNewMockHasSectionalTiming={setNewMockHasSectionalTiming}
              newMockSectionalTimingsStr={newMockSectionalTimingsStr}
              setNewMockSectionalTimingsStr={setNewMockSectionalTimingsStr}
              newMockPositiveMarks={newMockPositiveMarks}
              setNewMockPositiveMarks={setNewMockPositiveMarks}
              newMockNegativeMarks={newMockNegativeMarks}
              setNewMockNegativeMarks={setNewMockNegativeMarks}
              newMockTestbookTotalUsers={newMockTestbookTotalUsers}
              setNewMockTestbookTotalUsers={setNewMockTestbookTotalUsers}
              newMockTestbookTopperScore={newMockTestbookTopperScore}
              setNewMockTestbookTopperScore={setNewMockTestbookTopperScore}
              newMockTestbookAverageScore={newMockTestbookAverageScore}
              setNewMockTestbookAverageScore={setNewMockTestbookAverageScore}
              newMockTestbookCutoffScore={newMockTestbookCutoffScore}
              setNewMockTestbookCutoffScore={setNewMockTestbookCutoffScore}
              addMockTest={addMockTest}
              showToast={showToast}
              getCustomQuestionsCount={getCustomQuestionsCount}
              reorderMockTests={reorderMockTests}
              deleteMockTest={deleteMockTest}
              editingMockTestTitle={editingMockTestTitle}
              setEditingMockTestTitle={setEditingMockTestTitle}
              editingMockPositiveMarks={editingMockPositiveMarks}
              setEditingMockPositiveMarks={setEditingMockPositiveMarks}
              editingMockNegativeMarks={editingMockNegativeMarks}
              setEditingMockNegativeMarks={setEditingMockNegativeMarks}
              editingMockTestbookTotalUsers={editingMockTestbookTotalUsers}
              setEditingMockTestbookTotalUsers={setEditingMockTestbookTotalUsers}
              editingMockTestbookTopperScore={editingMockTestbookTopperScore}
              setEditingMockTestbookTopperScore={setEditingMockTestbookTopperScore}
              editingMockTestbookAverageScore={editingMockTestbookAverageScore}
              setEditingMockTestbookAverageScore={setEditingMockTestbookAverageScore}
              editingMockTestbookCutoffScore={editingMockTestbookCutoffScore}
              setEditingMockTestbookCutoffScore={setEditingMockTestbookCutoffScore}
              editMockTestTitle={editMockTestTitle}
            />
          )}

          {/* TAB 8: REPORTED QUESTIONS */}
          {activeTab === 'reports' && hasTabAccess('reports') && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 max-w-md relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder={language === 'hi' ? 'αñ¬αÑìαñ░αñ╢αÑìαñ¿ αñåαñêαñíαÑÇ, αñ¬αñ░αÑÇαñòαÑìαñ╖αñ╛ αñ»αñ╛ αñ╕αñéαñªαÑçαñ╢ αñ╕αÑç αñûαÑïαñ£αÑçαñé...' : 'Search by Question ID, Test, or message...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-xs text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors font-semibold"
                  />
                </div>
                
                <div className="flex gap-4 shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                    <span>{language === 'hi' ? 'αñòαÑüαñ▓ αñ░αñ┐αñ¬αÑïαñ░αÑìαñƒ:' : 'Total Reports:'} <strong className="text-slate-850 dark:text-white font-extrabold">{reportedQuestionsList.length}</strong></span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-6">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-6">
                  {language === 'hi' ? 'αñ░αñ┐αñ¬αÑïαñ░αÑìαñƒ αñòαñ┐αñÅ αñùαñÅ αñ¬αÑìαñ░αñ╢αÑìαñ¿' : 'Reported Question Logs'}
                </h3>

                <div className="overflow-x-auto max-h-[600px] overflow-y-auto pr-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-white dark:bg-slate-950 z-10 border-b border-slate-200 dark:border-slate-800">
                      <tr className="text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider font-bold">
                        <th className="py-3 px-4">{language === 'hi' ? 'αñ¬αÑìαñ░αñ╢αÑìαñ¿ αñåαñêαñíαÑÇ' : 'Question ID'}</th>
                        <th className="py-3 px-4">{language === 'hi' ? 'αñ«αÑëαñò αñƒαÑçαñ╕αÑìαñƒ' : 'Mock Test'}</th>
                        <th className="py-3 px-4">{language === 'hi' ? 'αñ¬αÑìαñ░αñ╢αÑìαñ¿ αñ¬αñ╛αñá' : 'Question Text'}</th>
                        <th className="py-3 px-4">{language === 'hi' ? 'αñ╡αñ┐αñ╡αñ░αñú / αñ╕αñéαñªαÑçαñ╢' : 'Report Message'}</th>
                        <th className="py-3 px-4">{language === 'hi' ? 'αñ░αñ┐αñ¬αÑïαñ░αÑìαñƒαñ░ (αñ░αÑïαñ▓ αñòαÑïαñí)' : 'Reporter (Roll Code)'}</th>
                        <th className="py-3 px-4">{language === 'hi' ? 'αñªαñ┐αñ¿αñ╛αñéαñò αñöαñ░ αñ╕αñ«αñ»' : 'Report Date & Time'}</th>
                        <th className="py-3 px-4 text-right">{language === 'hi' ? 'αñòαñ╛αñ░αÑìαñ░αñ╡αñ╛αñê' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportedQuestionsList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500 font-bold">
                            {language === 'hi' ? 'αñòαÑïαñê αñ░αñ┐αñ¬αÑïαñ░αÑìαñƒ αñòαñ┐αñÅ αñùαñÅ αñ¬αÑìαñ░αñ╢αÑìαñ¿ αñ¿αñ╣αÑÇαñé αñ«αñ┐αñ▓αÑçαÑñ' : 'No reported questions found.'}
                          </td>
                        </tr>
                      ) : (
                        reportedQuestionsList
                          .filter(rq => {
                            const term = searchTerm.toLowerCase().trim();
                            if (!term) return true;
                            return (
                              rq.questionId.toLowerCase().includes(term) ||
                              rq.mockTestTitle.toLowerCase().includes(term) ||
                              rq.message.toLowerCase().includes(term) ||
                              rq.questionText.toLowerCase().includes(term) ||
                              (rq.candidateCode && rq.candidateCode.toLowerCase().includes(term))
                            );
                          })
                          .map((rq) => (
                            <tr key={rq.id} className="border-b border-slate-50 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                              <td className="py-4 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                {rq.questionId}
                              </td>
                              <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-200">
                                <div className="leading-tight">
                                  <div>{rq.mockTestTitle || 'N/A'}</div>
                                  <div className="text-[9px] text-slate-400 font-normal">{rq.mockTestId || 'N/A'}</div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-slate-500 max-w-[200px] truncate font-medium" title={rq.questionText}>
                                {rq.questionText || <span className="italic text-slate-400 font-normal">No question sample</span>}
                              </td>
                              <td className="py-4 px-4 text-slate-700 dark:text-slate-350 max-w-[250px] whitespace-normal font-semibold">
                                <div className="bg-red-50/40 dark:bg-red-950/10 border border-red-100 dark:border-red-950 p-2.5 rounded-lg text-slate-855 dark:text-slate-300">
                                  {rq.message}
                                </div>
                              </td>
                              <td className="py-4 px-4 whitespace-nowrap font-bold">
                                {rq.candidateCode ? (
                                  <span className="font-mono bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded border border-blue-100 dark:border-blue-900/30 text-[10px]">
                                    {rq.candidateCode}
                                  </span>
                                ) : (
                                  <span className="italic text-slate-400 font-normal">Guest / N/A</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-slate-450 dark:text-slate-500 whitespace-nowrap font-semibold">
                                {rq.createdAt}
                              </td>
                              <td className="py-4 px-4 text-right whitespace-nowrap">
                                <button
                                  onClick={async () => {
                                    const confirmDelete = window.confirm(
                                      "Are you sure you want to delete this reported question log?"
                                    );
                                    if (confirmDelete) {
                                      const res = await deleteReportedQuestion(rq.id);
                                      if (res.success) {
                                        showToast("Report log deleted successfully.");
                                      } else {
                                        showToast(res.error || "Failed to delete log.");
                                      }
                                    }
                                  }}
                                  className="text-red-650 dark:text-red-405 hover:text-red-700 dark:hover:text-red-300 font-bold bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/40 transition px-2.5 py-1 rounded-lg cursor-pointer text-[10px]"
                                >
                                  Delete Log
                                </button>
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

          {/* TAB 10: SUPPORT TEAM HELP DESK */}
          {activeTab === 'support' && hasTabAccess('support') && (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-[calc(100vh-12rem)] flex animate-in fade-in duration-200">
              
              {/* User List sidebar (1/3 width) */}
              <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="h-4.5 w-4.5 text-blue-500" /> Conversations ({supportUsers.length})
                  </h3>
                  {supportUsersLoading && (
                    <RefreshCw className="h-3.5 w-3.5 text-slate-400 animate-spin" />
                  )}
                </div>

                <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs">
                    <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search any user name or email..."
                      value={supportSearchQuery}
                      onChange={(e) => setSupportSearchQuery(e.target.value)}
                      className="bg-transparent w-full focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
                  {(() => {
                    const filteredUsers = supportUsers.filter(u => {
                      if (!supportSearchQuery) return true;
                      const q = supportSearchQuery.toLowerCase();
                      return (
                        u.name?.toLowerCase().includes(q) ||
                        u.email?.toLowerCase().includes(q) ||
                        u.id?.toLowerCase().includes(q) ||
                        u.candidateCode?.toLowerCase().includes(q)
                      );
                    });

                    if (filteredUsers.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold italic">
                          No users found matching "{supportSearchQuery}".
                        </div>
                      );
                    }

                    return filteredUsers.map((user) => {
                      const isSelected = selectedSupportUserId === user.id;
                      const initials = user.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';
                      
                      return (
                        <div
                          key={user.id}
                          onClick={() => setSelectedSupportUserId(user.id)}
                          className={`w-full text-left p-4 flex items-center justify-between gap-3 transition-colors text-xs font-sans cursor-pointer relative group ${
                            isSelected 
                              ? 'bg-blue-50/60 dark:bg-blue-950/20' 
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-10 w-10 rounded-full bg-blue-600/10 dark:bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-black flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 dark:text-white truncate">{user.name}</span>
                                {user.lastMessage && (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 whitespace-nowrap ml-2">
                                    {new Date(user.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mb-1">{user.email}</p>
                              {user.lastMessage && (
                                <p className={`text-[11px] truncate leading-tight ${user.unseenCount > 0 ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-500 dark:text-slate-400 font-semibold'}`}>
                                  {user.lastMessage.sender === 'ADMIN' ? 'You: ' : ''}{user.lastMessage.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {user.unseenCount > 0 && (
                              <span className="bg-emerald-500 text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                                {user.unseenCount}
                              </span>
                            )}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const confirmDelete = window.confirm(
                                  `Are you sure you want to delete the support conversation with ${user.name}? This will delete all messages permanently.`
                                );
                                if (confirmDelete) {
                                  try {
                                    const res = await fetch('/api/db', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'delete-support-conversation',
                                        data: { userId: user.id }
                                      })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      showToast(`Deleted conversation with ${user.name}`);
                                      if (selectedSupportUserId === user.id) {
                                        setSelectedSupportUserId(null);
                                      }
                                      fetchSupportUsers(false);
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-900 rounded-lg cursor-pointer"
                              title="Delete Conversation"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Chat Viewport (2/3 width) */}
              <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950">
                {selectedSupportUserId ? (
                  <>
                    {/* Active User Header */}
                    {(() => {
                      const selectedUser = supportUsers.find(u => u.id === selectedSupportUserId);
                      return (
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/20 dark:bg-slate-900/10">
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">{selectedUser?.name || 'Loading user...'}</h4>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{selectedUser?.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500"></span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active session</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20 dark:bg-slate-900/5">
                      {supportMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 italic font-semibold">
                          No messages in this conversation.
                        </div>
                      ) : (
                        supportMessages.map((msg) => {
                          const isStudent = msg.sender === 'STUDENT';
                          const isEditing = editingMessageId === msg.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isStudent ? 'justify-start' : 'justify-end'} group/msg`}
                            >
                              <div className={`max-w-[70%] p-3.5 rounded-xl border text-xs font-medium shadow-xs relative ${
                                isStudent
                                  ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs'
                                  : 'bg-blue-600 border-blue-600 text-white rounded-br-xs'
                              }`}>
                                {isEditing ? (
                                  <div className="flex flex-col gap-2 min-w-[200px]">
                                    <textarea
                                      value={editingMessageText}
                                      onChange={(e) => setEditingMessageText(e.target.value)}
                                      className="w-full bg-blue-700 text-white border border-blue-500 rounded p-1.5 focus:outline-none text-xs"
                                      rows={2}
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setEditingMessageId(null)}
                                        className="bg-blue-700 hover:bg-blue-800 text-blue-200 px-2 py-1 rounded text-[10px] font-bold"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEditMessage(msg.id, editingMessageText)}
                                        className="bg-white hover:bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-bold"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                                    <div className="flex items-center justify-between mt-1.5 gap-4">
                                      {!isStudent && (
                                        <button
                                          onClick={() => {
                                            setEditingMessageId(msg.id);
                                            setEditingMessageText(msg.message);
                                          }}
                                          className="opacity-0 group-hover/msg:opacity-100 transition-opacity text-[9px] text-blue-200 hover:text-white underline cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                      )}
                                      <div className={`text-[8px] font-bold flex-1 text-right ${
                                        isStudent ? 'text-slate-400 dark:text-slate-505' : 'text-blue-200'
                                      }`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Chat Footer Input */}
                    <form onSubmit={handleSendAdminMessage} className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                      <input
                        type="text"
                        required
                        value={supportInputText}
                        onChange={(e) => setSupportInputText(e.target.value)}
                        placeholder="Type a reply here..."
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                      />
                      <button
                        type="submit"
                        disabled={!supportInputText.trim() || supportSending}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg disabled:bg-blue-300 disabled:shadow-none cursor-pointer"
                      >
                        Reply
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500">
                    <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-full mb-4">
                      <MessageCircle className="h-10 w-10 text-slate-350 dark:text-slate-700" />
                    </div>
                    <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-750 dark:text-white mb-1">Select a Student</h4>
                    <p className="text-xs max-w-sm leading-relaxed font-semibold">
                      Click a student conversation from the list to start responding to tickets and chatting in real-time.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 9: ANNOUNCEMENTS MANAGER */}
          {activeTab === 'announcements' && hasTabAccess('announcements') && (
            <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Official Announcements Publisher</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Publish special alerts and visual news banner cards that slide horizontally on the mobile app home screen</p>
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                  {noticesList.filter(n => n.category === 'announcement').length} announcement{noticesList.filter(n => n.category === 'announcement').length !== 1 ? 's' : ''} active
                </span>
              </div>

              {/* Info alert */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/25 p-4 rounded-2xl flex items-start gap-3">
                <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">Mobile Banner Engine</p>
                  <p className="text-slate-650 dark:text-slate-400 font-semibold leading-relaxed">
                    Create and publish official announcements that will appear as a swipable horizontal carousel on the mobile app home screen. Announcements are saved as a special category of notices.
                  </p>
                </div>
              </div>

              {/* Collapsible Publish Card */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsCreateAnnouncementOpen(!isCreateAnnouncementOpen)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <Megaphone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white">Publish Announcement</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Click to expand the announcement editor</p>
                    </div>
                  </div>
                  <div className={`transition-transform duration-200 ${isCreateAnnouncementOpen ? 'rotate-180' : ''}`}>
                    <ArrowDown className="h-4 w-4 text-slate-500" />
                  </div>
                </button>

                {isCreateAnnouncementOpen && (
                  <div className="border-t border-slate-200 dark:border-slate-808 p-6 bg-white dark:bg-slate-955">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!announcementTitle.trim()) return;
                      addNotice(announcementTitle, announcementType, 'announcement', announcementDate, announcementUrl, undefined, announcementImageUrl);
                      setAnnouncementTitle('');
                      setAnnouncementUrl('');
                      setAnnouncementImageUrl('');
                      setIsCreateAnnouncementOpen(false);
                      showToast('Announcement published successfully!');
                    }} className="space-y-5 text-xs">
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Announcement Type / Tag</label>
                          <input
                            type="text"
                            required
                            value={announcementType}
                            onChange={(e) => setAnnouncementType(e.target.value)}
                            placeholder="e.g., PROMOTION, ALERT, NEWS, SOCIAL"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Publish Date</label>
                          <input
                            type="date"
                            required
                            value={announcementDate}
                            onChange={(e) => setAnnouncementDate(e.target.value)}
                            className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Details Link / URL (Optional)</label>
                          <input
                            type="url"
                            value={announcementUrl}
                            onChange={(e) => setAnnouncementUrl(e.target.value)}
                            placeholder="https://example.com/details"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Image URL / Banner (Optional)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={announcementImageUrl}
                            onChange={(e) => setAnnouncementImageUrl(e.target.value)}
                            placeholder="https://example.com/image.png or upload banner"
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500"
                          />
                          <input
                            type="file"
                            accept="image/*"
                            id="announcement-banner-upload"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingAnnouncement(true);
                              const url = await uploadFileToTigrisDirect(file);
                              if (url) {
                                setAnnouncementImageUrl(url);
                                showToast("Banner uploaded successfully to Tigris!");
                              }
                              setIsUploadingAnnouncement(false);
                            }}
                          />
                          <label
                            htmlFor={isUploadingAnnouncement ? undefined : "announcement-banner-upload"}
                            className={`bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition inline-flex items-center gap-1.5 shrink-0 ${
                              isUploadingAnnouncement ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"
                            }`}
                          >
                            <Upload className={`h-3.5 w-3.5 ${isUploadingAnnouncement ? "animate-bounce" : ""}`} />
                            {isUploadingAnnouncement ? "Uploading..." : "Upload Banner"}
                          </label>
                        </div>
                        <p className="text-[9px] text-slate-500 dark:text-slate-500 mt-1 font-semibold">
                          ≡ƒÆí Perfect size for tile view is 1200x600 (aspect ratio 2:1) for clean coverage.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Announcement Content</label>
                        <textarea
                          required
                          value={announcementTitle}
                          onChange={(e) => setAnnouncementTitle(e.target.value)}
                          placeholder="Type announcement description content..."
                          rows={4}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 resize-none"
                        />
                      </div>

                      <div className="flex justify-end pt-3">
                        <button
                          type="submit"
                          className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-md cursor-pointer"
                        >
                          Publish Announcement
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Active Announcements List Card ΓÇö Full Width */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-808 p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Megaphone className="h-4.5 w-4.5 text-blue-505" /> Active Announcements Banners
                  </h3>
                  
                  {/* Search bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={announcementSearch}
                      onChange={(e) => setAnnouncementSearch(e.target.value)}
                      placeholder="Search announcements..."
                      className="w-full bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-808 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Content</th>
                        <th className="py-3 px-4">Tag</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {noticesList.filter(n => n.category === 'announcement').filter(n => 
                        n.title.toLowerCase().includes(announcementSearch.toLowerCase()) ||
                        n.type.toLowerCase().includes(announcementSearch.toLowerCase())
                      ).length > 0 ? (
                        noticesList.filter(n => n.category === 'announcement').filter(n => 
                          n.title.toLowerCase().includes(announcementSearch.toLowerCase()) ||
                          n.type.toLowerCase().includes(announcementSearch.toLowerCase())
                        ).map((ann) => (
                          <tr key={ann.id} className="border-b border-slate-200 dark:border-slate-808 hover:bg-slate-55 dark:hover:bg-slate-900/30 transition text-slate-800 dark:text-slate-300">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 max-w-sm">
                              {ann.url ? (
                                <a href={ann.url} target="_blank" rel="noopener noreferrer" className="text-blue-650 hover:text-blue-750 dark:text-blue-400 dark:hover:text-blue-350 hover:underline flex items-center gap-1">
                                  {ann.title}
                                  <ChevronRight className="h-3 w-3 inline animate-pulse" />
                                </a>
                              ) : (
                                <span>{ann.title}</span>
                              )}
                              {ann.imageUrl && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <span>≡ƒû╝∩╕Å Image:</span>
                                  <a href={ann.imageUrl} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[200px] inline-block font-normal">
                                    {ann.imageUrl}
                                  </a>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-105 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">{ann.type}</span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-[11px] text-slate-500 dark:text-slate-400">{ann.date}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  deleteNotice(ann.id);
                                  showToast('Announcement deleted successfully.');
                                }}
                                className="text-red-600 hover:text-red-700 dark:text-red-405 dark:hover:text-red-300 font-bold bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400 font-semibold italic">
                            No matching announcements found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
                    {/* TAB: TESTIMONIALS MANAGER */}
          {activeTab === 'testimonials' && hasTabAccess('testimonials') && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Testimonial Creation Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                  <PlusCircle className="h-4.5 w-4.5 text-blue-600" /> Create New Topper Testimonial
                </h3>

                <form onSubmit={handleAddTestimonialSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Topper Student Name</label>
                      <input
                        type="text"
                        required
                        value={testiName}
                        onChange={(e) => setTestiName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Exam & Selection Title</label>
                      <input
                        type="text"
                        required
                        value={testiExam}
                        onChange={(e) => setTestiExam(e.target.value)}
                        placeholder="e.g. SSC CGL 2025 (Selected: Excise Inspector)"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Student Initials (Optional)</label>
                      <input
                        type="text"
                        value={testiInitials}
                        onChange={(e) => setTestiInitials(e.target.value)}
                        placeholder="e.g. RS (Auto-falls back to first letters)"
                        maxLength={2}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Background Gradient Scheme</label>
                      <select
                        value={testiGradient}
                        onChange={(e) => setTestiGradient(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="from-blue-600 to-cyan-500">Ocean Blue (Blue to Cyan)</option>
                        <option value="from-purple-600 to-pink-500">Neon Orchid (Purple to Pink)</option>
                        <option value="from-orange-600 to-amber-500">Sunset Fire (Orange to Amber)</option>
                        <option value="from-emerald-600 to-teal-500">Forest Vitality (Emerald to Teal)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Topper Photo (Optional)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="topper-photo-upload"
                        />
                        <label
                          htmlFor={isUploadingPhoto ? undefined : "topper-photo-upload"}
                          className={`bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition inline-flex items-center gap-2 ${
                            isUploadingPhoto ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"
                          }`}
                        >
                          <Upload className={`h-4 w-4 ${isUploadingPhoto ? "animate-bounce" : ""}`} /> 
                          {isUploadingPhoto ? "Uploading..." : "Choose Photo"}
                        </label>
                        {isUploadingPhoto ? (
                          <span className="text-[10px] text-blue-500 font-semibold animate-pulse">Uploading to Tigris...</span>
                        ) : testiPhotoUrl ? (
                          <div className="flex items-center gap-2">
                            <img src={testiPhotoUrl} alt="Topper preview" className="h-10 w-10 rounded-full object-cover border border-slate-205 dark:border-slate-800 shadow" />
                            <button
                              type="button"
                              onClick={() => setTestiPhotoUrl('')}
                              className="text-red-500 text-xs hover:underline font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">No photo selected (initials placeholder will be used)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Topper Quote / Message Text</label>
                    <textarea
                      required
                      value={testiQuote}
                      onChange={(e) => setTestiQuote(e.target.value)}
                      placeholder="e.g. Testbook Pass Pro mock sittings exactly models the live CBT screen. It was key to my success!"
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                    >
                      Publish Testimonial
                    </button>
                  </div>
                </form>
              </div>

              {/* Created Testimonials list table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800 mb-6">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Active Testimonials Listing</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">Manage topper cards currently displayed in rotation on the home screen.</p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={testiSearch}
                      onChange={(e) => setTestiSearch(e.target.value)}
                      placeholder="Search testimonials..."
                      className="w-full bg-slate-55 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Topper Profile</th>
                        <th className="py-3 px-4">Quote Message</th>
                        <th className="py-3 px-4">Selection Detail</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {noticesList.filter(n => n.category === 'testimonial').filter(n => 
                        n.title.toLowerCase().includes(testiSearch.toLowerCase()) ||
                        n.type.toLowerCase().includes(testiSearch.toLowerCase())
                      ).length > 0 ? (
                        noticesList.filter(n => n.category === 'testimonial').filter(n => 
                          n.title.toLowerCase().includes(testiSearch.toLowerCase()) ||
                          n.type.toLowerCase().includes(testiSearch.toLowerCase())
                        ).map((testi) => (
                          <tr key={testi.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition text-slate-800 dark:text-slate-350">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {testi.imageUrl ? (
                                  <img src={testi.imageUrl} alt={testi.title} className="h-10 w-10 rounded-full object-cover border border-slate-205 dark:border-slate-800 shadow" />
                                ) : (
                                  <div className={`h-10 w-10 rounded-full bg-gradient-to-r ${testi.url || 'from-blue-600 to-cyan-500'} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                                    {testi.lastDate || testi.title.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <h5 className="font-bold text-slate-900 dark:text-white text-xs">{testi.title}</h5>
                                  <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Initials: {testi.lastDate}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 max-w-xs font-semibold text-slate-650 dark:text-slate-300 leading-normal truncate" title={testi.type}>
                              "{testi.type}"
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{testi.date}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  deleteNotice(testi.id);
                                  showToast('Testimonial deleted successfully.');
                                }}
                                className="text-red-650 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/40 transition px-2 py-1 rounded cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-400 dark:text-slate-500 font-semibold italic">
                            No custom testimonials configured in database. (Mock testimonials are active on the home screen as fallback).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DATABASE MONITOR */}
          {activeTab === 'dbmonitor' && hasTabAccess('dbmonitor') && (
            <div className="animate-in fade-in duration-200">
              <DatabaseMonitor />
            </div>
          )}

          {/* TAB: USER FEEDBACKS */}
          {activeTab === 'feedback' && hasTabAccess('feedback') && (
            <div className="animate-in fade-in duration-200 space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">User Feedbacks & Ratings</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Monitor ratings and suggestions submitted by candidates upon test submission.</p>
                </div>
                <button
                  onClick={fetchFeedbacks}
                  disabled={loadingFeedbacks}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingFeedbacks ? 'animate-spin' : ''}`} />
                  Refresh List
                </button>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Feedback Submissions</p>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{feedbacksList.length}</h4>
                  </div>
                  <div className="h-10 w-10 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex items-center justify-center text-blue-500">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average Platform Rating</p>
                    <h4 className="text-2xl font-black text-amber-500 mt-1">
                      {feedbacksList.length > 0 
                        ? (feedbacksList.reduce((sum, f) => sum + f.platformRating, 0) / feedbacksList.length).toFixed(1)
                        : "0.0"} <span className="text-sm text-amber-400">★</span>
                    </h4>
                  </div>
                  <div className="h-10 w-10 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex items-center justify-center text-amber-500">
                    <Award className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average Exam Experience</p>
                    <h4 className="text-2xl font-black text-emerald-500 mt-1">
                      {feedbacksList.length > 0 
                        ? (feedbacksList.reduce((sum, f) => sum + f.examRating, 0) / feedbacksList.length).toFixed(1)
                        : "0.0"} <span className="text-sm text-emerald-400">★</span>
                    </h4>
                  </div>
                  <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Feedbacks Table Grid */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Candidate / Date</th>
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mock Test</th>
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Source</th>
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">App/Web Rating</th>
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Exam Rating</th>
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Written Feedback</th>
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loadingFeedbacks ? (
                        <tr>
                          <td colSpan={7} className="py-24 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-3"></div>
                            <p className="text-xs text-slate-400 font-bold">Loading feedbacks data...</p>
                          </td>
                        </tr>
                      ) : feedbacksList.length > 0 ? (
                        feedbacksList.map((f) => (
                          <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="py-4 px-4">
                              <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{f.userFullName || 'Anonymous'}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{f.userEmail}</p>
                              <p className="text-[9px] text-slate-400 font-medium mt-1 font-sans">
                                {new Date(f.createdAt).toLocaleString()}
                              </p>
                            </td>
                            <td className="py-4 px-4 max-w-[200px]">
                              <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{f.testTitle}</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">{f.testId}</p>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                f.source === 'app'
                                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}>
                                {f.source === 'app' ? '📱 App' : '🌐 Web'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex gap-0.5 text-amber-500 text-sm">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <span key={s} className={s <= f.platformRating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}>★</span>
                                ))}
                              </div>
                              <span className="text-[9px] font-bold text-slate-500 mt-1 block">Rating: {f.platformRating}/5</span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex gap-0.5 text-emerald-500 text-sm">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <span key={s} className={s <= f.examRating ? 'text-emerald-400' : 'text-slate-200 dark:text-slate-700'}>★</span>
                                ))}
                              </div>
                              <span className="text-[9px] font-bold text-slate-500 mt-1 block">Rating: {f.examRating}/5</span>
                            </td>
                            <td className="py-4 px-4">
                              {f.feedbackText ? (
                                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-750 p-2.5 rounded-lg max-w-sm">
                                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
                                    {f.feedbackText}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No comment provided</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => deleteFeedback(f.id)}
                                className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 font-black text-[9px] uppercase tracking-wider px-2 py-1 rounded-lg transition shadow-sm cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400 dark:text-slate-500 font-semibold italic">
                            No feedbacks or ratings submitted by users yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TEST ATTEMPT LOGS */}
          {activeTab === 'attempts' && hasTabAccess('attempts') && (
            <div className="animate-in fade-in duration-200 space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Test Attempt Logs</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Monitor ongoing, completed, and auto-submitted mock test sittings across all platforms.</p>
                </div>
                <button
                  onClick={fetchAttempts}
                  disabled={loadingAttempts}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingAttempts ? 'animate-spin' : ''}`} />
                  Refresh List
                </button>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Attempts</p>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{attemptsList.length}</h4>
                  </div>
                  <div className="h-10 w-10 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex items-center justify-center text-blue-500">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mobile App Attempts</p>
                    <h4 className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">
                      {attemptsList.filter(a => a.source === 'app').length}
                    </h4>
                  </div>
                  <div className="h-10 w-10 bg-violet-50 dark:bg-violet-950/40 rounded-lg flex items-center justify-center text-violet-500">
                    <Layers className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Desktop Web Attempts</p>
                    <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {attemptsList.filter(a => a.source === 'web').length}
                    </h4>
                  </div>
                  <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center justify-center text-emerald-500">
                    <Globe className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mobile Web Attempts</p>
                    <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                      {attemptsList.filter(a => a.source === 'mobile_web').length}
                    </h4>
                  </div>
                  <div className="h-10 w-10 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex items-center justify-center text-amber-500">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search Bar */}
                <div className="relative w-full md:w-96">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search candidate name, email, code or test..."
                    value={attemptsSearch}
                    onChange={(e) => setAttemptsSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  />
                </div>

                {/* Filters Group */}
                <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
                  {/* Platform Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Platform:</span>
                    <select
                      value={attemptsPlatformFilter}
                      onChange={(e: any) => setAttemptsPlatformFilter(e.target.value)}
                      className="border border-slate-200 dark:border-slate-800 rounded-lg text-xs py-1.5 px-3 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Platforms</option>
                      <option value="web">🌐 Website (Desktop)</option>
                      <option value="app">📱 Mobile App</option>
                      <option value="mobile_web">📱 Website (Mobile View)</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status:</span>
                    <select
                      value={attemptsStatusFilter}
                      onChange={(e: any) => setAttemptsStatusFilter(e.target.value)}
                      className="border border-slate-200 dark:border-slate-800 rounded-lg text-xs py-1.5 px-3 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ONGOING">Ongoing</option>
                      <option value="AUTO_SUBMITTED">Auto Submitted</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Attempt Logs Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-55 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Candidate details</th>
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mock Test Details</th>
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Platform</th>
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start / End Time</th>
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attempt Stats</th>
                        <th className="py-3.5 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loadingAttempts ? (
                        <tr>
                          <td colSpan={6} className="py-24 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-3"></div>
                            <p className="text-xs text-slate-400 font-bold">Loading test attempt logs...</p>
                          </td>
                        </tr>
                      ) : (() => {
                        const filteredAttempts = attemptsList.filter((a) => {
                          const userName = a.user?.fullName || '';
                          const userEmail = a.user?.email || '';
                          const userCode = a.user?.candidateCode || '';
                          const testTitle = a.mockTest?.title || '';

                          const userMatches = !attemptsSearch || 
                            userName.toLowerCase().includes(attemptsSearch.toLowerCase()) ||
                            userEmail.toLowerCase().includes(attemptsSearch.toLowerCase()) ||
                            userCode.toLowerCase().includes(attemptsSearch.toLowerCase()) ||
                            testTitle.toLowerCase().includes(attemptsSearch.toLowerCase());
                          
                          const platformMatches = attemptsPlatformFilter === 'all' || a.source === attemptsPlatformFilter;
                          const statusMatches = attemptsStatusFilter === 'all' || a.status === attemptsStatusFilter;
                          
                          return userMatches && platformMatches && statusMatches;
                        });

                        if (filteredAttempts.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-slate-500 font-semibold italic">
                                No test attempts found matching current search and filters.
                              </td>
                            </tr>
                          );
                        }

                        return filteredAttempts.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            {/* Candidate Details */}
                            <td className="py-4 px-4">
                              <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{a.user?.fullName || 'Unknown'}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{a.user?.email || 'N/A'}</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-850 px-1 py-0.5 rounded">
                                  {a.user?.candidateCode || 'No Code'}
                                </span>
                                {a.user?.mobile && (
                                  <span className="text-[9px] font-sans text-slate-500 dark:text-slate-400">
                                    📞 {a.user.mobile}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Mock Test */}
                            <td className="py-4 px-4 max-w-[220px]">
                              <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{a.mockTest?.title || 'Unknown Test'}</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">{a.mockTestId}</p>
                            </td>

                            {/* Platform Source */}
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                a.source === 'app'
                                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                                  : a.source === 'mobile_web'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}>
                                {a.source === 'app' ? '📱 Mobile App' : a.source === 'mobile_web' ? '📱 Web Mobile' : '🌐 Desktop Web'}
                              </span>
                            </td>

                            {/* Start / End Time */}
                            <td className="py-4 px-4">
                              <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium">
                                📅 {new Date(a.startedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                              {a.completedAt ? (
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                  ✅ Ended: {new Date(a.completedAt).toLocaleString('en-IN', { timeStyle: 'short' })}
                                </p>
                              ) : (
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold italic mt-0.5 animate-pulse text-amber-500">
                                  ⏳ Active session...
                                </p>
                              )}
                            </td>

                            {/* Stats */}
                            <td className="py-4 px-4">
                              {a.status === 'ONGOING' ? (
                                <div className="space-y-0.5">
                                  <p className="text-[10px] text-slate-500 font-bold">Remaining time:</p>
                                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">{formatExactTime(a.remainingSeconds)}</p>
                                  {a.violationsCount > 0 && (
                                    <span className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 font-black px-1 rounded">
                                      Violations: {a.violationsCount}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                    Score: <span className="text-blue-600 dark:text-blue-400">{a.finalScore ?? 0}</span> / {a.mockTest?.maxMarks || 200}
                                  </p>
                                  <p className="text-[9px] text-slate-500 dark:text-slate-450 font-semibold">
                                    Accuracy: {a.accuracyPercentage ?? 0}% | Time: {formatExactTime(computeExactTimeSpent(a))}
                                  </p>
                                  {a.violationsCount > 0 && (
                                    <span className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 font-black px-1 rounded">
                                      Violations: {a.violationsCount}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                a.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : a.status === 'AUTO_SUBMITTED'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUGGESTION BOX TAB CONTENT */}
          {activeTab === 'suggestions' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Top Bar / Header */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                    <Lightbulb className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      Suggestion Box / सुझाव पेटिका
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                      User suggestions, feature requests, and feedback submitted to MockTest Hub Team
                    </p>
                  </div>
                </div>

                <button
                  onClick={fetchSuggestions}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer self-start md:self-auto"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Suggestions</span>
                </button>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Suggestions</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{suggestionsList.length}</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-xl">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Pending (New)</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                      {suggestionsList.filter(s => s.status === 'PENDING').length}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-xl">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider">Reviewed</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                      {suggestionsList.filter(s => s.status === 'REVIEWED').length}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-xl">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">Resolved</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {suggestionsList.filter(s => s.status === 'RESOLVED').length}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl">
                    <Award className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Filter & Search Controls */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search Input */}
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={suggestionSearch}
                    onChange={(e) => setSuggestionSearch(e.target.value)}
                    placeholder="Search by name, email, keyword..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {(['ALL', 'PENDING', 'REVIEWED', 'RESOLVED'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setSuggestionStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        suggestionStatusFilter === status
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {status === 'ALL' ? 'All Status' : status}
                    </button>
                  ))}

                  <select
                    value={suggestionCategoryFilter}
                    onChange={(e) => setSuggestionCategoryFilter(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="General">General</option>
                    <option value="New Exam Request">New Exam Request</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="UI/UX Improvement">UI/UX Improvement</option>
                    <option value="Bug Report">Bug Report</option>
                  </select>
                </div>
              </div>

              {/* Suggestions List */}
              <div className="space-y-4">
                {(() => {
                  let filtered = suggestionsList.filter((s) => {
                    if (suggestionStatusFilter !== 'ALL' && s.status !== suggestionStatusFilter) return false;
                    if (suggestionCategoryFilter !== 'ALL' && s.category !== suggestionCategoryFilter) return false;
                    if (suggestionSearch.trim()) {
                      const q = suggestionSearch.toLowerCase().trim();
                      const nameMatch = (s.name || '').toLowerCase().includes(q);
                      const emailMatch = (s.email || '').toLowerCase().includes(q);
                      const msgMatch = (s.message || '').toLowerCase().includes(q);
                      const catMatch = (s.category || '').toLowerCase().includes(q);
                      if (!nameMatch && !emailMatch && !msgMatch && !catMatch) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 dark:text-slate-500">
                        <Lightbulb className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                        <p className="font-bold text-sm text-slate-600 dark:text-slate-400">No suggestions found</p>
                        <p className="text-xs mt-1">Try adjusting your filters or search query.</p>
                      </div>
                    );
                  }

                  return filtered.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      {/* Header / Info Row */}
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black flex items-center justify-center text-sm shadow-md">
                            {(item.name || item.email || 'U').slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {item.name || 'Anonymous User'}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {item.email || 'No email provided'} {item.userId && `• User ID: ${item.userId}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Platform Source Badge */}
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                            item.source === 'app'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50'
                              : item.source === 'mobile_web'
                              ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900/50'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50'
                          }`}>
                            {item.source === 'app' ? '📱 Mobile App' : item.source === 'mobile_web' ? '📱 Mobile Web' : '💻 Website'}
                          </span>

                          {/* Category Badge */}
                          <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            {item.category || 'General'}
                          </span>

                          {/* Status Badge */}
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                            item.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : item.status === 'REVIEWED'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse'
                          }`}>
                            {item.status}
                          </span>

                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>

                      {/* Suggestion Body */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">
                          {item.message}
                        </p>
                      </div>

                      {/* Admin Reply Note if present */}
                      {item.adminReply && (
                        <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 p-3 rounded-xl text-xs space-y-1">
                          <p className="font-extrabold text-[10px] text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                            Admin Note / Internal Action:
                          </p>
                          <p className="text-slate-700 dark:text-slate-300 font-medium">{item.adminReply}</p>
                        </div>
                      )}

                      {/* Admin Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          {item.status !== 'REVIEWED' && (
                            <button
                              onClick={() => handleUpdateSuggestionStatus(item.id, 'REVIEWED')}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-300 font-extrabold text-xs transition cursor-pointer border border-blue-200 dark:border-blue-900/50"
                            >
                              Mark Reviewed
                            </button>
                          )}

                          {item.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleUpdateSuggestionStatus(item.id, 'RESOLVED')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-300 font-extrabold text-xs transition cursor-pointer border border-emerald-200 dark:border-emerald-900/50"
                            >
                              Mark Resolved
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (suggestionReplyingId === item.id) {
                                setSuggestionReplyingId(null);
                              } else {
                                setSuggestionReplyingId(item.id);
                                setSuggestionReplyText(item.adminReply || '');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-extrabold text-xs transition cursor-pointer"
                          >
                            {suggestionReplyingId === item.id ? 'Close Note' : 'Add Note'}
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteSuggestion(item.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 font-extrabold text-xs transition cursor-pointer border border-red-200 dark:border-red-900/50 flex items-center gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>

                      {/* Note input box */}
                      {suggestionReplyingId === item.id && (
                        <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                          <textarea
                            rows={2}
                            value={suggestionReplyText}
                            onChange={(e) => setSuggestionReplyText(e.target.value)}
                            placeholder="Enter internal admin note or status update details..."
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => handleUpdateSuggestionStatus(item.id, item.status, suggestionReplyText)}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-extrabold text-xs transition cursor-pointer"
                          >
                            Save Note
                          </button>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

        </div>

      </main>

      {/* Custom Confirmation Modal */}
      {resetConfirmOpen && resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertCircle className="h-6 w-6" />
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-white">Reset Exam Attempt</h4>
            </div>
            
            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              Are you sure you want to delete and reset the attempt of <strong className="text-white">{resetTarget.sessionTitle}</strong> for candidate <strong className="text-white">{resetTarget.userName}</strong>? This action is permanent and cannot be undone.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setResetConfirmOpen(false);
                  setResetTarget(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmResetAction}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-red-900/20"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

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
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 text-left">
                You are about to modify the profile dossier for <span className="font-bold text-slate-900 dark:text-white">{editName}</span>. Please verify your administrator credentials to proceed.
              </p>

              <div className="text-left">
                <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Administrator Password</label>
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
                <div className="p-3 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-808/40 text-red-650 dark:text-red-400 rounded-lg text-xs font-bold flex items-center gap-2 text-left">
                  <ShieldAlert className="h-4 w-4 shrink-0 animate-bounce" />
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
                disabled={savingProfile}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingProfile ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Authorize & Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-green-800 text-green-400 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
