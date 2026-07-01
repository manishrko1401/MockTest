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
import { Upload, Database, Users, TrendingUp, BarChart2, BookOpen, AlertCircle, CheckCircle2, Search, Trash2, Edit, Calendar, UserCheck, RefreshCw, X, Award, ChevronRight, FileText, Sun, Moon, Bell, PlusCircle, FolderPlus, Layers, Globe, ArrowLeft, Menu, Coins, Megaphone, MessageSquare, MessageCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { useIsMobile } from '../useIsMobile';
import { BulkQuestionImporter } from './components/BulkQuestionImporter';
import { MockTestManager } from './components/MockTestManager';

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
// CORE ADMIN COMPONENT
// ============================================================================
export default function AdminAnalytics() {
  const { isMobile, isMounted } = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'analytics' | 'users' | 'notices' | 'testimonials' | 'categories' | 'subcategories' | 'subsubcategories' | 'mocks' | 'reports' | 'announcements' | 'support'>('analytics');

  const selectTab = (tab: 'upload' | 'analytics' | 'users' | 'notices' | 'testimonials' | 'categories' | 'subcategories' | 'subsubcategories' | 'mocks' | 'reports' | 'announcements' | 'support') => {
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');

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
  const [testiSearch, setTestiSearch] = useState('');

  // User Management state from context
  const { 
    currentUser,
    login,
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
    deleteReportedQuestion
  } = useAuth();
  const t = TRANSLATIONS[language];

  // Admin Authentication State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);

    // Hardcoded password verification for the admin panel
    if (adminEmail.trim().toLowerCase() === 'admin@mocktest.com' && adminPassword === 'test@admin123') {
      const res = await login('admin@mocktest.com', 'password123');
      if (res.success) {
        showToast('Admin access authorized successfully!');
      } else {
        setAdminLoginError(res.error || 'Database synchronization error. Admin user account could not be activated.');
      }
    } else {
      setAdminLoginError('Invalid Admin ID or Password.');
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
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

  // Category management form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubCategoryParent, setNewSubCategoryParent] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [newSubSubCategoryParentCategory, setNewSubSubCategoryParentCategory] = useState('');
  const [newSubSubCategoryParentSubCategory, setNewSubSubCategoryParentSubCategory] = useState('');
  const [newSubSubCategoryName, setNewSubSubCategoryName] = useState('');

  // Category/subcategory/mock edit states
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
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
  const [editReferralsCount, setEditReferralsCount] = useState<number>(0);
  const [editRole, setEditRole] = useState<'STUDENT' | 'ADMIN' | 'CONTENT_CREATOR'>('STUDENT');
  const [editTier, setEditTier] = useState<'None' | 'Testbook Pass' | 'Testbook Pass Pro'>('None');
  const [editExpiry, setEditExpiry] = useState('');
  const [editPurchasedAt, setEditPurchasedAt] = useState('');

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

  const handleSelectUser = (user: MockUser) => {
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
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    
    const expiry = editTier === 'None' ? null : (editExpiry || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]);
    const purchasedAt = editTier === 'None' ? null : (editPurchasedAt || new Date().toISOString().split('T')[0]);
    saveUserProfileByAdmin(
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
      Number(editCoins)
    );
    
    showToast('User profile updated successfully!');
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
      const questionsArray = (Array.isArray(parsedData) ? parsedData : [parsedData]).map((q: any) => ({
        ...q,
        id: q.id || 'q_' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 6),
        section: q.section || 'General Studies'
      }));

      // Validate core fields mapping to database schema
      for (const item of questionsArray) {
        if (!item.textEn || !item.textHi || !item.optionsEn || !item.optionsHi || item.correctIndex === undefined) {
          throw new Error('All questions must map textEn, textHi, optionsEn, optionsHi, and correctIndex.');
        }
        if (!Array.isArray(item.optionsEn) || item.optionsEn.length < 4) {
          throw new Error('optionsEn must be an array of at least 4 strings.');
        }
      }

      setParsedQuestions(questionsArray);
      setFormQuestionsList(questionsArray);
      setJsonInput(JSON.stringify(questionsArray, null, 2));
      setPreviewQuestionIndex(0);
      setUploadStatus({
        type: 'success',
        message: `Questions successfully verified and loaded in the Live Preview! Review on the right, then click 'Confirm & Ingest Question Paper' below to save.`
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
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showToast('Error saving questions.');
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
        optionsHi: ["एम्पीयर", "वोल्ट", "ओम", "वाट"],
        correctIndex: 0,
        explanationEn: "Ampere is the base unit of electric current.",
        explanationHi: "एम्पीयर विद्युत धारा की मूल इकाई है।",
        section: "General Studies"
      },
      {
        textEn: "Which planet is known as the Red Planet?",
        textHi: "किस ग्रह को लाल ग्रह के नाम से जाना जाता है?",
        optionsEn: ["Earth", "Mars", "Jupiter", "Saturn"],
        optionsHi: ["पृथ्वी", "मंगल", "बृहस्पति", "शनि"],
        correctIndex: 1,
        explanationEn: "Mars is called the Red Planet due to iron oxide on its surface.",
        explanationHi: "मंगल को उसकी सतह पर आयरन ऑक्साइड के कारण लाल ग्रह कहा जाता है।",
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

    if (!opt1En.trim() || !opt1Hi.trim() ||
        !opt2En.trim() || !opt2Hi.trim() ||
        !opt3En.trim() || !opt3Hi.trim() ||
        !opt4En.trim() || !opt4Hi.trim()) {
      showToast("First 4 options are required in both English and Hindi");
      return;
    }

    const optionsEn = [opt1En.trim(), opt2En.trim(), opt3En.trim(), opt4En.trim()];
    const optionsHi = [opt1Hi.trim(), opt2Hi.trim(), opt3Hi.trim(), opt4Hi.trim()];

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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setTestiPhotoUrl(reader.result as string);
      showToast("Topper photo uploaded successfully!");
    };
    reader.readAsDataURL(file);
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

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 font-sans text-slate-100 relative overflow-hidden px-4">
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
                placeholder="••••••••"
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
        <div>
          {/* Brand logo */}
          <div className="flex items-center gap-3 mb-8">
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
            <button
              onClick={() => selectTab('announcements')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Megaphone className="h-4 w-4" />
              {language === 'hi' ? 'आधिकारिक घोषणाएँ' : 'Manage Announcements'}
            </button>
            <button
              onClick={() => selectTab('testimonials')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                activeTab === 'testimonials'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Award className="h-4 w-4" />
              {language === 'hi' ? 'प्रशंसापत्र प्रबंधक' : 'Topper Testimonials'}
            </button>
            <button
              onClick={() => selectTab('categories')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FolderPlus className="h-4 w-4" />
              {language === 'hi' ? 'परीक्षा श्रेणियां' : 'Exam Categories'}
            </button>
            <button
              onClick={() => selectTab('subcategories')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                activeTab === 'subcategories'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="h-4 w-4" />
              {language === 'hi' ? 'उप-श्रेणियां' : 'Sub Categories'}
            </button>
            <button
              onClick={() => selectTab('subsubcategories')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                activeTab === 'subsubcategories'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4" />
              {language === 'hi' ? 'उप-उप-श्रेणियां' : 'Sub Sub Categories'}
            </button>
            <button
              onClick={() => selectTab('mocks')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                activeTab === 'mocks'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              {language === 'hi' ? 'मॉक टेस्ट प्रबंधित करें' : 'Manage Mock Tests'}
            </button>
            <button
              onClick={() => selectTab('reports')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              {language === 'hi' ? 'रिपोर्ट किए गए प्रश्न' : 'Reported Questions'}
            </button>
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
                <span>{language === 'hi' ? 'सपोर्ट टीम' : 'Support Team'}</span>
              </div>
              {totalUnseenCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                  {totalUnseenCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* System telemetry */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-[10px] text-slate-500">
          <p>Database: Connected (PostgreSQL)</p>
          <p>Active sessions: 1,429</p>
          <p>System load: Normal</p>
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
                ? (language === 'hi' ? 'छात्र विश्लेषण और स्पीड डैशबोर्ड' : 'Student Analytics & Speed Dashboard')
                : activeTab === 'upload' 
                ? (language === 'hi' ? 'थोक प्रश्न प्रविष्टि टर्मिनल' : 'Bulk Question Ingestion Terminal')
                : activeTab === 'users'
                ? (language === 'hi' ? 'उपयोगकर्ता प्रबंधन और पहुँच नियंत्रण' : 'User Management & Access Control')
                : activeTab === 'notices'
                ? (language === 'hi' ? 'लाइव अपडेट और नोटिस प्रबंधक' : 'Live Updates & Notices Manager')
                : activeTab === 'testimonials'
                ? (language === 'hi' ? 'प्रशंसापत्र प्रबंधक' : 'Toppers Testimonials Manager')
                : activeTab === 'categories'
                ? (language === 'hi' ? 'परीक्षा श्रेणियां प्रबंधित करें' : 'Manage Exam Categories')
                : activeTab === 'subcategories'
                ? (language === 'hi' ? 'परीक्षा उप-श्रेणियां प्रबंधित करें' : 'Manage Exam Subcategories')
                : activeTab === 'subsubcategories'
                ? (language === 'hi' ? 'परीक्षा उप-उप-श्रेणियां प्रबंधित करें' : 'Manage Exam Sub-Subcategories')
                : activeTab === 'mocks'
                ? (language === 'hi' ? 'मॉक टेस्ट प्रबंधित करें' : 'Manage Mock Tests')
                : activeTab === 'announcements'
                ? (language === 'hi' ? 'आधिकारिक घोषणा प्रकाशक' : 'Official Announcements Publisher')
                : activeTab === 'support'
                ? (language === 'hi' ? 'सपोर्ट टीम टिकटिंग केंद्र' : 'Support Team Helpdesk')
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
              <option value="hi" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">हिन्दी</option>
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
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{language === 'hi' ? 'एपीआई सर्वर ऑनलाइन' : 'API Server Online'}</span>
            </div>
          </div>
        </header>

        {/* CONTAINER CONTENT */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* TAB 1: STUDENT PERFORMANCE METRICS */}
          {activeTab === 'analytics' && (
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
          {activeTab === 'upload' && (
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

          {/* TAB 3: USER MANAGEMENT PORTAL */}\n          {activeTab === 'users' && (
            <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">User Management Portal</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage user credentials, passes, roles, referral data, and view attempt histories</p>
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                  {usersList.length} user{usersList.length !== 1 ? 's' : ''} registered
                </span>
              </div>

              {/* Collapsible Edit Profile Form */}
              <div className="bg-slate-950 border border-slate-805 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(!isEditUserOpen)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-900/50 transition-colors"
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
                              <p className="text-[11px] text-blue-400 font-bold">Roll Code: {activeUser?.candidateCode || 'None'}</p>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <p className="font-extrabold text-sm text-slate-900 dark:text-white">Profile Editor (No User Selected)</p>
                          <p className="text-[11px] text-slate-400">Select a user from the table below to edit details</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`transition-transform duration-200 ${isEditUserOpen ? 'rotate-180' : ''}`}>
                    <ArrowDown className="h-4 w-4 text-slate-505" />
                  </div>
                </button>

                {isEditUserOpen && (
                  <div className="border-t border-slate-800 p-6 bg-slate-950">
                    {selectedUserId ? (
                      (() => {
                        const activeUser = usersList.find(u => u.id === selectedUserId);
                        if (!activeUser) return null;

                        return (
                          <form onSubmit={handleSaveProfile} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                                <input
                                  type="text"
                                  required
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-505"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                                <input
                                  type="email"
                                  required
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Mobile Number</label>
                                <input
                                  type="text"
                                  required
                                  maxLength={10}
                                  value={editMobile}
                                  onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, ''))}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Referral Code</label>
                                <input
                                  type="text"
                                  required
                                  value={editReferralCode}
                                  onChange={(e) => setEditReferralCode(e.target.value.toUpperCase())}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Referred By (Code)</label>
                                <input
                                  type="text"
                                  value={editReferredBy}
                                  onChange={(e) => setEditReferredBy(e.target.value.toUpperCase())}
                                  placeholder="None"
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Referrals Count</label>
                                <input
                                  type="number"
                                  required
                                  value={editReferralsCount}
                                  onChange={(e) => setEditReferralsCount(Number(e.target.value))}
                                  className="w-full bg-slate-900 border border-slate-805 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-550"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">System Role</label>
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value as any)}
                                  className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="STUDENT">Student (Candidate)</option>
                                  <option value="CONTENT_CREATOR">Content Creator</option>
                                  <option value="ADMIN">System Administrator</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Subscription Pass Tier</label>
                                <select
                                  value={editTier}
                                  onChange={(e) => setEditTier(e.target.value as any)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none focus:border-blue-550 cursor-pointer"
                                >
                                  <option value="None">None (No Pass)</option>
                                  <option value="Testbook Pass">Mock Test Pass (Basic)</option>
                                  <option value="Testbook Pass Pro">Mock Test Pass Pro (Full Gating Access)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Account Password</label>
                                <input
                                  type="text"
                                  required
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  placeholder="User password"
                                  className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-550"
                                />
                              </div>

                              {editTier !== 'None' && (
                                <>
                                  <div>
                                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Pass Purchased Date</label>
                                    <input
                                      type="date"
                                      required
                                      value={editPurchasedAt}
                                      onChange={(e) => setEditPurchasedAt(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Pass Expiry Date</label>
                                    <input
                                      type="date"
                                      required
                                      value={editExpiry}
                                      onChange={(e) => setEditExpiry(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-550 cursor-pointer"
                                    />
                                  </div>
                                </>
                              )}

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Account Status</label>
                                <select
                                  value={editIsBlocked ? 'true' : 'false'}
                                  onChange={(e) => setEditIsBlocked(e.target.value === 'true')}
                                  className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="false">Active (Unblocked)</option>
                                  <option value="true">Suspended (Blocked)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Coins Balance</label>
                                <div className="relative flex items-center">
                                  <span className="absolute left-3 text-amber-400">
                                    <Coins className="h-3.5 w-3.5 text-amber-400" />
                                  </span>
                                  <input
                                    type="number"
                                    required
                                    value={editCoins}
                                    onChange={(e) => setEditCoins(Number(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-808 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                              <button
                                type="button"
                                onClick={() => setSelectedUserId(null)}
                                className="bg-slate-900 hover:bg-slate-800 border border-slate-808 text-slate-400 font-bold py-2 px-5 rounded-lg text-xs transition cursor-pointer"
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
                      <p className="text-xs text-slate-505 font-medium text-center py-6">No user selected. Click the "Edit Profile" button on any user in the table below to load details here.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Users List & Search Card — Full Width */}
              <div className="bg-slate-950 border border-slate-808 p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Registered Users Directory</h3>
                  
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-550">
                        <Search className="h-3.5 w-3.5" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search name, email, roll code..."
                        className="w-full bg-slate-900 border border-slate-808 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-303 focus:outline-none focus:border-blue-505 cursor-pointer w-full sm:w-auto"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="STUDENT">Student</option>
                      <option value="CONTENT_CREATOR">Creator</option>
                      <option value="ADMIN">Admin</option>
                    </select>

                    <select
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-303 focus:outline-none focus:border-blue-550 cursor-pointer w-full sm:w-auto"
                    >
                      <option value="ALL">All Passes</option>
                      <option value="None">No Pass</option>
                      <option value="Testbook Pass">Pass</option>
                      <option value="Testbook Pass Pro">Pass Pro</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                        <th className="pb-3 px-4">User Details</th>
                        <th className="pb-3 px-4">System Role</th>
                        <th className="pb-3 px-4">Access Pass</th>
                        <th className="pb-3 px-4 text-center">Attempts</th>
                        <th className="pb-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {[...usersList]
                        .filter(u => {
                          const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                (u.candidateCode && u.candidateCode.toLowerCase().includes(searchTerm.toLowerCase()));
                          const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
                          const matchesTier = tierFilter === 'ALL' || u.subscriptionTier === tierFilter;
                          return matchesSearch && matchesRole && matchesTier;
                        })
                        .map(user => {
                          const isSelected = selectedUserId === user.id;
                          return (
                            <tr
                              key={user.id}
                              className={`hover:bg-slate-900/40 transition-colors ${
                                isSelected ? 'bg-slate-900/60 border-l-2 border-blue-500' : ''
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-white text-xs">{user.name}</p>
                                  {user.isBlocked && (
                                    <span className="bg-red-955/45 border border-red-808 text-red-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      Blocked
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-505">{user.email}</p>
                                {user.candidateCode && (
                                  <p className="text-[10px] text-blue-400 font-extrabold mt-0.5">
                                    Roll Code: <span className="font-mono bg-slate-900 px-1 py-0.5 rounded text-[9px] border border-slate-808 text-white">{user.candidateCode}</span>
                                  </p>
                                )}
                                <p className="text-[9px] text-slate-505 mt-0.5">Joined: {user.registeredDate}</p>
                                <div className="flex items-center gap-1 text-amber-400 text-[10px] font-black mt-1">
                                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                                  <span>{user.coins || 0} Coins</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  user.role === 'ADMIN' 
                                    ? 'bg-red-955/40 border border-red-805 text-red-405' 
                                    : user.role === 'CONTENT_CREATOR' 
                                    ? 'bg-purple-955/40 border border-purple-800 text-purple-400' 
                                    : 'bg-blue-955/40 border border-blue-800 text-blue-400'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  user.subscriptionTier === 'Testbook Pass Pro'
                                    ? 'bg-yellow-955/40 border border-yellow-700 text-yellow-405 font-extrabold'
                                    : user.subscriptionTier === 'Testbook Pass'
                                    ? 'bg-green-955/40 border border-green-700 text-green-400'
                                    : 'bg-slate-900 border border-slate-800 text-slate-550'
                                }`}>
                                  {user.subscriptionTier === 'None' ? 'No Pass' : user.subscriptionTier.replace('Testbook', 'Mock Test')}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                                {user.testSessions.length}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSelectUser(user);
                                    setIsEditUserOpen(true); // Auto-expand form
                                  }}
                                  className="text-blue-400 hover:text-blue-300 font-bold bg-blue-955/20 border border-blue-900/30 hover:bg-blue-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                >
                                  Edit Profile
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Exam Sitting attempts logs — Full Width */}
              {selectedUserId && (
                (() => {
                  const activeUser = usersList.find(u => u.id === selectedUserId);
                  if (!activeUser) return null;

                  return (
                    <div className="bg-slate-955 border border-slate-808 p-6 rounded-2xl shadow-sm animate-in fade-in duration-200">
                      <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
                        <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Exam Sitting History: {activeUser.name}</h3>
                        <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-808 font-bold">
                          {activeUser.testSessions.length} sessions logged
                        </span>
                      </div>
                      
                      {activeUser.testSessions.length > 0 ? (
                        <div className="space-y-4">
                          {activeUser.testSessions.map(session => (
                            <div key={session.id} className="border border-slate-850 bg-slate-900/20 rounded-xl p-4 text-xs">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3 mb-3">
                                <div>
                                  <p className="font-extrabold text-slate-105 text-sm">{session.title}</p>
                                  <p className="text-[10px] text-slate-505 flex items-center gap-1.5 mt-1 font-semibold">
                                    <Calendar className="h-3 w-3" /> Attempted on {session.date}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    session.status === 'COMPLETED'
                                      ? 'bg-green-955/40 border border-green-800 text-green-400'
                                      : session.status === 'AUTO_SUBMITTED'
                                      ? 'bg-yellow-955/40 border border-yellow-805 text-yellow-405'
                                      : 'bg-blue-955/40 border border-blue-800 text-blue-400'
                                  }`}>
                                    {session.status}
                                  </span>
                                  
                                  <button
                                    onClick={() => {
                                      setResetTarget({
                                        userId: activeUser.id,
                                        sessionId: session.id,
                                        userName: activeUser.name,
                                        sessionTitle: session.title
                                      });
                                      setResetConfirmOpen(true);
                                    }}
                                    className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 bg-red-955/20 border border-red-900/40 hover:bg-red-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" /> Reset Attempt
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                                <div>
                                  <p className="text-slate-550 text-[10px] uppercase font-extrabold tracking-wider">Score Obtained</p>
                                  <p className="text-sm font-black text-blue-400 mt-0.5">{session.score.toFixed(1)} / {session.maxScore}</p>
                                </div>
                                <div>
                                  <p className="text-slate-550 text-[10px] uppercase font-extrabold tracking-wider">Accuracy Percentage</p>
                                  <p className="text-sm font-black text-green-400 mt-0.5">{session.accuracy.toFixed(1)}%</p>
                                </div>
                                <div>
                                  <p className="text-slate-550 text-[10px] uppercase font-extrabold tracking-wider">Time Spent</p>
                                  <p className="text-sm font-black text-yellow-400 mt-0.5">
                                    {Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-555 text-[10px] uppercase font-extrabold tracking-wider">Cheat Violations</p>
                                  <p className={`text-sm font-black mt-0.5 ${session.violations > 0 ? 'text-red-450' : 'text-slate-300'}`}>
                                    {session.violations} Focus Alert{session.violations === 1 ? '' : 's'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 border border-dashed border-slate-808 rounded-xl text-slate-500 text-xs">
                          <FileText className="h-8 w-8 mx-auto text-slate-705 mb-2" />
                          This user has not sat for any exam sittings yet.
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}\n                    {/* TAB 4: NOTICES & ANNOUNCEMENTS MANAGER */}\n          {activeTab === 'notices' && (
            <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Live Notices & Updates Manager</h2>
                  <p className="text-xs text-slate-505 dark:text-slate-400 mt-0.5">Publish and manage live notices, results, and admit cards visible on client home screens</p>
                </div>
                <span className="text-xs font-bold text-slate-505 dark:text-slate-400 bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 px-3 py-1.5 rounded-lg">
                  {noticesList.length} total alert{noticesList.length !== 1 ? 's' : ''} active
                </span>
              </div>

              {/* Info alert */}
              <div className="bg-blue-500/10 border border-blue-500/25 p-4 rounded-2xl flex items-start gap-3">
                <Bell className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Live Updates Engine</p>
                  <p className="text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                    Publish exam alerts, admit card download releases, and result sheets directly to the homepage updates grid. All additions will update client dashboards instantly via context state.
                  </p>
                </div>
              </div>

              {/* Collapsible Publish Card */}
              <div className="bg-slate-950 border border-slate-808 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsCreateNoticeOpen(!isCreateNoticeOpen)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <PlusCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white">Publish New Update / Alert</p>
                      <p className="text-[11px] text-slate-400">Click to expand the alert publication form</p>
                    </div>
                  </div>
                  <div className={`transition-transform duration-205 ${isCreateNoticeOpen ? 'rotate-180' : ''}`}>
                    <ArrowDown className="h-4 w-4 text-slate-500" />
                  </div>
                </button>

                {isCreateNoticeOpen && (
                  <div className="border-t border-slate-808 p-6 bg-slate-950">
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
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Update Category</label>
                          <select
                            value={noticeCategory}
                            onChange={(e) => setNoticeCategory(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="notice">Live Notices & Announcements</option>
                            <option value="result">Live Result Section</option>
                            <option value="admit_card">Live Admit Card Section</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Label Tag (e.g. EXAM DATE, MERIT LIST)</label>
                          <input
                            type="text"
                            required
                            value={noticeType}
                            onChange={(e) => setNoticeType(e.target.value)}
                            placeholder="EXAM DATE, RESULT, ADMISSION, etc."
                            className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none focus:border-blue-505"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Publish Date</label>
                          <input
                            type="date"
                            required
                            value={noticeDate}
                            onChange={(e) => setNoticeDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {noticeCategory === 'notice' && (
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Application Last Date (Optional)</label>
                            <input
                              type="date"
                              value={noticeLastDate}
                              onChange={(e) => setNoticeLastDate(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Attachment URL (Optional)</label>
                          <input
                            type="url"
                            value={noticeUrl}
                            onChange={(e) => setNoticeUrl(e.target.value)}
                            placeholder="https://example.com/advisory"
                            className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none focus:border-blue-505"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Update Heading Title</label>
                        <textarea
                          required
                          value={noticeTitle}
                          onChange={(e) => setNoticeTitle(e.target.value)}
                          placeholder="Type notice title description..."
                          rows={3}
                          className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none focus:border-blue-505 resize-none"
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

              {/* Active Board List — Full Width */}
              <div className="bg-slate-955 border border-slate-808 p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <Bell className="h-4.5 w-4.5 text-blue-505" /> Active Updates Board
                  </h3>
                  
                  {/* Search bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-505" />
                    <input
                      type="text"
                      value={noticeSearch}
                      onChange={(e) => setNoticeSearch(e.target.value)}
                      placeholder="Search updates..."
                      className="w-full bg-slate-900 border border-slate-808 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-808 text-slate-404 font-extrabold uppercase tracking-wider text-[10px]">
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
                          <tr key={notice.id} className="border-b border-slate-808 hover:bg-slate-900/30 transition text-slate-300">
                            <td className="py-3 px-4 font-bold text-slate-100 max-w-md">
                              {notice.url ? (
                                <a href={notice.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-350 hover:underline flex items-center gap-1 mb-1">
                                  {notice.title}
                                  <ChevronRight className="h-3 w-3 inline animate-pulse" />
                                </a>
                              ) : (
                                <span className="block mb-1">{notice.title}</span>
                              )}
                              {notice.lastDate && (
                                <span className="block text-[10px] text-red-500 font-extrabold mt-1 uppercase tracking-wider">
                                  Last Date: {notice.lastDate}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 capitalize">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                notice.category === 'notice'
                                  ? 'bg-blue-955/40 text-blue-400 border border-blue-900'
                                  : notice.category === 'result'
                                  ? 'bg-yellow-955/40 text-yellow-405 border border-yellow-900'
                                  : 'bg-green-955/40 text-green-400 border border-green-900'
                              }`}>
                                {notice.category === 'notice' ? 'Announcement' : notice.category === 'result' ? 'Result' : 'Admit Card'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded text-[10px]">{notice.type}</span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-[11px] text-slate-405">{notice.date}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  deleteNotice(notice.id);
                                  showToast('Notice deleted successfully.');
                                }}
                                className="text-red-400 hover:text-red-300 font-bold bg-red-955/20 border border-red-900/30 hover:bg-red-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
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
          )}\n                    {/* TAB 5: CATEGORIES MANAGEMENT */}\n          {activeTab === 'categories' && (
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
                    <ArrowDown className="h-4 w-4 text-slate-505" />
                  </div>
                </button>

                {isCreateCategoryOpen && (
                  <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-950">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newCategoryName.trim()) return;
                        addCategory(newCategoryName.trim());
                        setNewCategoryName('');
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
                      <div className="flex justify-end">
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
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Sub Categories</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examCatalog.map(cat => (
                        <tr key={cat.id} className="border-b border-slate-50 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-400">{cat.id}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-200">
                            {editingCategoryId === cat.id ? (
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold w-full max-w-xs"
                              />
                            ) : (
                              <span>{cat.name}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-500">{cat.subCategories.length} Sub-cat(s)</td>
                          <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                            {editingCategoryId === cat.id ? (
                              <>
                                <button
                                  onClick={() => {
                                    if (editingCategoryName.trim()) {
                                      editCategory(cat.id, editingCategoryName.trim());
                                      setEditingCategoryId(null);
                                      showToast('Category renamed successfully.');
                                    }
                                  }}
                                  className="text-green-555 dark:text-green-400 font-bold bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
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
          )}\n                    {/* TAB 6: SUB-CATEGORIES MANAGEMENT */}\n          {activeTab === 'subcategories' && (
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

              {/* Subcategories Table Card — Full Width */}
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
          )}\n                    {/* TAB 6.5: SUB-SUB-CATEGORIES MANAGEMENT */}\n          {activeTab === 'subsubcategories' && (
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

              {/* Sub-subcategories Table Card — Full Width */}
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
          )}\n                    {/* TAB 7: MOCK TESTS MANAGEMENT */}
          {activeTab === 'mocks' && (
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
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 max-w-md relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder={language === 'hi' ? 'प्रश्न आईडी, परीक्षा या संदेश से खोजें...' : 'Search by Question ID, Test, or message...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-xs text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors font-semibold"
                  />
                </div>
                
                <div className="flex gap-4 shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                    <span>{language === 'hi' ? 'कुल रिपोर्ट:' : 'Total Reports:'} <strong className="text-slate-850 dark:text-white font-extrabold">{reportedQuestionsList.length}</strong></span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-6">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-6">
                  {language === 'hi' ? 'रिपोर्ट किए गए प्रश्न' : 'Reported Question Logs'}
                </h3>

                <div className="overflow-x-auto max-h-[600px] overflow-y-auto pr-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-white dark:bg-slate-950 z-10 border-b border-slate-200 dark:border-slate-800">
                      <tr className="text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider font-bold">
                        <th className="py-3 px-4">{language === 'hi' ? 'प्रश्न आईडी' : 'Question ID'}</th>
                        <th className="py-3 px-4">{language === 'hi' ? 'मॉक टेस्ट' : 'Mock Test'}</th>
                        <th className="py-3 px-4">{language === 'hi' ? 'प्रश्न पाठ' : 'Question Text'}</th>
                        <th className="py-3 px-4">{language === 'hi' ? 'विवरण / संदेश' : 'Report Message'}</th>
                        <th className="py-3 px-4">{language === 'hi' ? 'रिपोर्टर (रोल कोड)' : 'Reporter (Roll Code)'}</th>
                        <th className="py-3 px-4">{language === 'hi' ? 'दिनांक और समय' : 'Report Date & Time'}</th>
                        <th className="py-3 px-4 text-right">{language === 'hi' ? 'कार्रवाई' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportedQuestionsList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500 font-bold">
                            {language === 'hi' ? 'कोई रिपोर्ट किए गए प्रश्न नहीं मिले।' : 'No reported questions found.'}
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
          {activeTab === 'support' && (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-[calc(100vh-12rem)] flex animate-in fade-in duration-200">
              
              {/* User List sidebar (1/3 width) */}
              <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="h-4.5 w-4.5 text-blue-500" /> Conversations
                  </h3>
                  {supportUsersLoading && (
                    <RefreshCw className="h-3.5 w-3.5 text-slate-400 animate-spin" />
                  )}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
                  {supportUsers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold italic">
                      No customer chat tickets found.
                    </div>
                  ) : (
                    supportUsers.map((user) => {
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
                    })
                  )}
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

          {/* TAB 9: ANNOUNCEMENTS MANAGER */}\n          {activeTab === 'announcements' && (
            <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Official Announcements Publisher</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Publish special alerts and visual news banner cards that slide horizontally on the mobile app home screen</p>
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                  {noticesList.filter(n => n.category === 'announcement').length} announcement{noticesList.filter(n => n.category === 'announcement').length !== 1 ? 's' : ''} active
                </span>
              </div>

              {/* Info alert */}
              <div className="bg-blue-500/10 border border-blue-500/25 p-4 rounded-2xl flex items-start gap-3">
                <Megaphone className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Mobile Banner Engine</p>
                  <p className="text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                    Create and publish official announcements that will appear as a swipable horizontal carousel on the mobile app home screen. Announcements are saved as a special category of notices.
                  </p>
                </div>
              </div>

              {/* Collapsible Publish Card */}
              <div className="bg-slate-950 border border-slate-808 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsCreateAnnouncementOpen(!isCreateAnnouncementOpen)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <Megaphone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white">Publish Announcement</p>
                      <p className="text-[11px] text-slate-400">Click to expand the announcement editor</p>
                    </div>
                  </div>
                  <div className={`transition-transform duration-200 ${isCreateAnnouncementOpen ? 'rotate-180' : ''}`}>
                    <ArrowDown className="h-4 w-4 text-slate-500" />
                  </div>
                </button>

                {isCreateAnnouncementOpen && (
                  <div className="border-t border-slate-808 p-6 bg-slate-950">
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
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Announcement Type / Tag</label>
                          <input
                            type="text"
                            required
                            value={announcementType}
                            onChange={(e) => setAnnouncementType(e.target.value)}
                            placeholder="e.g., PROMOTION, ALERT, NEWS, SOCIAL"
                            className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Publish Date</label>
                          <input
                            type="date"
                            required
                            value={announcementDate}
                            onChange={(e) => setAnnouncementDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none focus:border-blue-550 cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Details Link / URL (Optional)</label>
                          <input
                            type="url"
                            value={announcementUrl}
                            onChange={(e) => setAnnouncementUrl(e.target.value)}
                            placeholder="https://example.com/details"
                            className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none focus:border-blue-505"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Image URL (Optional)</label>
                        <input
                          type="url"
                          value={announcementImageUrl}
                          onChange={(e) => setAnnouncementImageUrl(e.target.value)}
                          placeholder="https://example.com/image.png"
                          className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none focus:border-blue-505"
                        />
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                          💡 Perfect size for tile view is 1200x600 (aspect ratio 2:1) for clean coverage.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Announcement Content</label>
                        <textarea
                          required
                          value={announcementTitle}
                          onChange={(e) => setAnnouncementTitle(e.target.value)}
                          placeholder="Type announcement description content..."
                          rows={4}
                          className="w-full bg-slate-900 border border-slate-808 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none focus:border-blue-505 resize-none"
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

              {/* Active Announcements List Card — Full Width */}
              <div className="bg-slate-950 border border-slate-808 p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <Megaphone className="h-4.5 w-4.5 text-blue-505" /> Active Announcements Banners
                  </h3>
                  
                  {/* Search bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-505" />
                    <input
                      type="text"
                      value={announcementSearch}
                      onChange={(e) => setAnnouncementSearch(e.target.value)}
                      placeholder="Search announcements..."
                      className="w-full bg-slate-900 border border-slate-808 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-808 text-slate-440 font-extrabold uppercase tracking-wider text-[10px]">
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
                          <tr key={ann.id} className="border-b border-slate-808 hover:bg-slate-900/30 transition text-slate-350">
                            <td className="py-3 px-4 font-bold text-slate-100 max-w-sm">
                              {ann.url ? (
                                <a href={ann.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                                  {ann.title}
                                  <ChevronRight className="h-3 w-3 inline animate-pulse" />
                                </a>
                              ) : (
                                <span>{ann.title}</span>
                              )}
                              {ann.imageUrl && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                                  <span>🖼️ Image:</span>
                                  <a href={ann.imageUrl} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[200px] inline-block font-normal">
                                    {ann.imageUrl}
                                  </a>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded text-[10px]">{ann.type}</span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-[11px] text-slate-400">{ann.date}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  deleteNotice(ann.id);
                                  showToast('Announcement deleted successfully.');
                                }}
                                className="text-red-400 hover:text-red-300 font-bold bg-red-955/20 border border-red-900/30 hover:bg-red-955/40 transition px-2.5 py-1.5 rounded cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500 font-semibold italic">
                            No matching announcements found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}\n                    {/* TAB: TESTIMONIALS MANAGER */}
          {activeTab === 'testimonials' && (
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
                          htmlFor="topper-photo-upload"
                          className="cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition inline-flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" /> Choose Photo
                        </label>
                        {testiPhotoUrl ? (
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
