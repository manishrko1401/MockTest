"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface MockTestItem {
  id: string;
  title: string;
  questionsCount: number;
  durationMinutes: number;
  maxMarks: number;
  isPremium: boolean;
  requiredTier: 'None' | 'Testbook Pass' | 'Testbook Pass Pro';
}

export interface TestSubCategory {
  id: string;
  name: string;
  tests: MockTestItem[];
}

export interface TestCategory {
  id: string;
  name: string;
  subCategories: TestSubCategory[];
}

export interface MockTestRecord {
  id: string;
  testId?: string;
  title: string;
  score: number;
  maxScore: number;
  accuracy: number;
  durationSeconds: number;
  status: 'COMPLETED' | 'AUTO_SUBMITTED' | 'ONGOING';
  violations: number;
  date: string;
  responses?: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number; }>;
  timeRemaining?: number;
  currentSectionIndex?: number;
  currentQuestionIndex?: number;
}

export interface Notice {
  id: string;
  title: string;
  date: string;
  publishDate: string; // YYYY-MM-DD
  type: string;
  category: 'notice' | 'result' | 'admit_card';
  url?: string;
  lastDate?: string; // e.g. "10 July 2026"
}

export interface MockUser {
  id: string;
  candidateCode: string;
  name: string;
  email: string;
  mobile: string;
  referralCode: string;
  referredBy: string | null;
  referralsCount: number;
  role: 'STUDENT' | 'ADMIN' | 'CONTENT_CREATOR';
  subscriptionTier: 'None' | 'Testbook Pass' | 'Testbook Pass Pro';
  subscriptionPurchasedAt: string | null;
  subscriptionExpiresAt: string | null;
  registeredDate: string;
  testSessions: MockTestRecord[];
  bookmarkedQuestions?: { testId: string; questionId: string; }[];
  password?: string;
  isBlocked?: boolean;
}

interface AuthContextType {
  currentUser: MockUser | null;
  usersList: MockUser[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, mobile: string, password?: string, referralCodeInput?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (name: string, email: string, mobile: string) => void;
  updatePassword: (oldPass: string, newPass: string) => boolean;
  addAttempt: (
    testId: string,
    title: string,
    score: number,
    maxScore: number,
    accuracy: number,
    durationSeconds: number,
    violations: number,
    responses?: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number; }>
  ) => void;
  toggleBookmark: (testId: string, questionId: string) => void;
  resetAttempt: (userId: string, sessionId: string) => void;
  saveUserProfileByAdmin: (
    userId: string,
    name: string,
    email: string,
    mobile: string,
    referralCode: string,
    referredBy: string | null,
    referralsCount: number,
    role: MockUser['role'],
    tier: MockUser['subscriptionTier'],
    purchasedAt: string | null,
    expiry: string | null,
    password?: string,
    isBlocked?: boolean
  ) => void;
  saveOngoingSession: (
    testId: string,
    title: string,
    timeRemaining: number,
    violations: number,
    responses: any,
    currentSectionIndex?: number,
    currentQuestionIndex?: number
  ) => void;
  clearOngoingSession: (testId: string) => void;
  noticesList: Notice[];
  addNotice: (title: string, type: string, category: 'notice' | 'result' | 'admit_card', date?: string, url?: string, lastDateInput?: string) => void;
  deleteNotice: (id: string) => void;
  language: 'en' | 'hi';
  setLanguage: (lang: 'en' | 'hi') => void;
  examCatalog: TestCategory[];
  addCategory: (name: string) => void;
  deleteCategory: (categoryId: string) => void;
  addSubCategory: (categoryId: string, name: string) => void;
  deleteSubCategory: (categoryId: string, subCategoryId: string) => void;
  addMockTest: (categoryId: string, subCategoryId: string, test: Omit<MockTestItem, 'id'>) => void;
  deleteMockTest: (categoryId: string, subCategoryId: string, testId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_EXAM_CATALOG: TestCategory[] = [
  {
    id: 'ssc',
    name: 'SSC Exams',
    subCategories: [
      {
        id: 'ssc_cgl',
        name: 'SSC CGL Exams',
        tests: [
          { id: 'ssc_cgl_tier1', title: 'SSC CGL 2026 - Combined Graduate Level (Tier-I) Exam', questionsCount: 100, durationMinutes: 60, maxMarks: 200, isPremium: false, requiredTier: 'None' }
        ]
      },
      {
        id: 'ssc_chsl',
        name: 'SSC CHSL Exams',
        tests: [
          { id: 'ssc_chsl_tier1', title: 'SSC CHSL 2026 - Combined Higher Secondary Level Test', questionsCount: 100, durationMinutes: 60, maxMarks: 200, isPremium: true, requiredTier: 'Testbook Pass' }
        ]
      },
      {
        id: 'ssc_mts',
        name: 'SSC MTS Exams',
        tests: [
          { id: 'ssc_mts_mock', title: 'SSC MTS Full-Length Practice Test Paper', questionsCount: 90, durationMinutes: 90, maxMarks: 270, isPremium: true, requiredTier: 'Testbook Pass' }
        ]
      }
    ]
  },
  {
    id: 'railways',
    name: 'Railways Exams',
    subCategories: [
      {
        id: 'rrb_ntpc',
        name: 'RRB NTPC Exams',
        tests: [
          { id: 'rrb_ntpc_stage1', title: 'RRB NTPC CBT-1 Stage 1 Practice Simulator', questionsCount: 100, durationMinutes: 90, maxMarks: 100, isPremium: false, requiredTier: 'None' }
        ]
      },
      {
        id: 'rrb_group_d',
        name: 'RRB Group D Exams',
        tests: [
          { id: 'rrb_group_d', title: 'RRB Group D Full Length Mock Test', questionsCount: 100, durationMinutes: 90, maxMarks: 100, isPremium: true, requiredTier: 'Testbook Pass' }
        ]
      }
    ]
  },
  {
    id: 'ugc_net',
    name: 'UGC NET Exams',
    subCategories: [
      {
        id: 'ugc_net_p1',
        name: 'UGC NET Paper 1',
        tests: [
          { id: 'ugc_net_paper1', title: 'UGC NET Paper-1 Teaching & Research Aptitude', questionsCount: 50, durationMinutes: 60, maxMarks: 100, isPremium: true, requiredTier: 'Testbook Pass Pro' }
        ]
      },
      {
        id: 'ugc_net_cs',
        name: 'UGC NET Computer Science',
        tests: [
          { id: 'ugc_net_cs', title: 'UGC NET Computer Science & Applications Paper-II', questionsCount: 100, durationMinutes: 120, maxMarks: 200, isPremium: true, requiredTier: 'Testbook Pass Pro' }
        ]
      }
    ]
  },
  {
    id: 'teaching',
    name: 'Teaching Exams',
    subCategories: [
      {
        id: 'ctet_p1',
        name: 'CTET Paper 1 Exams',
        tests: [
          { id: 'ctet_paper1', title: 'CTET 2026 Paper-I (Primary Class I-V) Mock Paper', questionsCount: 150, durationMinutes: 150, maxMarks: 150, isPremium: false, requiredTier: 'None' }
        ]
      },
      {
        id: 'ctet_p2',
        name: 'CTET Paper 2 Exams',
        tests: [
          { id: 'ctet_paper2', title: 'CTET 2026 Paper-II (Mathematics & Science)', questionsCount: 150, durationMinutes: 150, maxMarks: 150, isPremium: true, requiredTier: 'Testbook Pass' }
        ]
      }
    ]
  },
  {
    id: 'state_exams',
    name: 'All State Exams',
    subCategories: [
      {
        id: 'uppsc',
        name: 'UPPSC Exams',
        tests: [
          { id: 'up_psc_prelims', title: 'UPPSC Prelims General Studies (GS Paper 1)', questionsCount: 150, durationMinutes: 120, maxMarks: 200, isPremium: true, requiredTier: 'Testbook Pass Pro' }
        ]
      },
      {
        id: 'bssc',
        name: 'BSSC Exams',
        tests: [
          { id: 'bihar_ssc', title: 'BSSC Inter-Level Full Practice Mock Paper', questionsCount: 150, durationMinutes: 135, maxMarks: 600, isPremium: true, requiredTier: 'Testbook Pass' }
        ]
      }
    ]
  },
  {
    id: 'banking',
    name: 'Banking Exams',
    subCategories: [
      {
        id: 'sbi_po',
        name: 'SBI PO Exams',
        tests: [
          { id: 'sbi_po_prelims', title: 'SBI PO Preliminary Exam Full Length Mock Test', questionsCount: 100, durationMinutes: 60, maxMarks: 100, isPremium: true, requiredTier: 'Testbook Pass Pro' }
        ]
      },
      {
        id: 'ibps_clerk',
        name: 'IBPS Clerk Exams',
        tests: [
          { id: 'ibps_clerk', title: 'IBPS Clerk Preliminary Practice Mock Paper', questionsCount: 100, durationMinutes: 60, maxMarks: 100, isPremium: false, requiredTier: 'None' }
        ]
      }
    ]
  }
];

const INITIAL_USERS: MockUser[] = [
  {
    id: 'u_admin',
    candidateCode: 'ADMIN_001',
    name: 'Administrator',
    email: 'admin@mocktest.com',
    mobile: '9999999999',
    referralCode: 'TB-ADMIN-1111',
    referredBy: null,
    referralsCount: 0,
    role: 'ADMIN',
    subscriptionTier: 'None',
    subscriptionPurchasedAt: null,
    subscriptionExpiresAt: null,
    registeredDate: '2026-01-01',
    testSessions: [],
    password: 'password123',
    isBlocked: false
  },
  {
    id: 'u1',
    candidateCode: 'CGL_9029',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    mobile: '9988776655',
    referralCode: 'TB-RAHUL-1029',
    referredBy: null,
    referralsCount: 0,
    role: 'STUDENT',
    subscriptionTier: 'Testbook Pass Pro',
    subscriptionPurchasedAt: '2026-03-15',
    subscriptionExpiresAt: '2027-03-15',
    registeredDate: '2026-01-10',
    testSessions: [
      { id: 'ts1', testId: 'ssc_cgl_tier1', title: 'SSC CGL 2026 - Combined Graduate Level (Tier-I) Exam', score: 162.5, maxScore: 200, accuracy: 81.25, durationSeconds: 2520, status: 'COMPLETED', violations: 0, date: '2026-06-20' },
      { id: 'ts2', testId: 'sbi_po_prelims', title: 'SBI PO Full Length Mock Test Series', score: 48.0, maxScore: 100, accuracy: 55.0, durationSeconds: 3480, status: 'AUTO_SUBMITTED', violations: 3, date: '2026-06-22' }
    ],
    password: 'password123',
    isBlocked: false
  },
  {
    id: 'u2',
    candidateCode: 'CGL_4812',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    mobile: '9876543210',
    referralCode: 'TB-PRIYA-4812',
    referredBy: null,
    referralsCount: 0,
    role: 'STUDENT',
    subscriptionTier: 'Testbook Pass',
    subscriptionPurchasedAt: '2025-12-01',
    subscriptionExpiresAt: '2026-12-01',
    registeredDate: '2026-05-18',
    testSessions: [
      { id: 'ts3', testId: 'ssc_cgl_tier1', title: 'SSC CGL 2026 - Combined Graduate Level (Tier-I) Exam', score: 138.0, maxScore: 200, accuracy: 72.5, durationSeconds: 3000, status: 'COMPLETED', violations: 1, date: '2026-06-24' }
    ],
    password: 'password123',
    isBlocked: false
  },
  {
    id: 'u3',
    candidateCode: 'CGL_2291',
    name: 'Vikram Singh',
    email: 'vikram.singh@example.com',
    mobile: '9123456789',
    referralCode: 'TB-VIKRAM-2291',
    referredBy: null,
    referralsCount: 0,
    role: 'CONTENT_CREATOR',
    subscriptionTier: 'None',
    subscriptionPurchasedAt: null,
    subscriptionExpiresAt: null,
    registeredDate: '2025-12-15',
    testSessions: [],
    password: 'password123',
    isBlocked: false
  },
  {
    id: 'u4',
    candidateCode: 'CGL_3034',
    name: 'Amit Verma',
    email: 'amit.verma@example.com',
    mobile: '9555666777',
    referralCode: 'TB-AMIT-3034',
    referredBy: null,
    referralsCount: 0,
    role: 'STUDENT',
    subscriptionTier: 'None',
    subscriptionPurchasedAt: null,
    subscriptionExpiresAt: null,
    registeredDate: '2026-06-12',
    testSessions: [
      { id: 'ts4', testId: 'rrb_ntpc_stage1', title: 'RRB NTPC Free Sectional Tests', score: 28.0, maxScore: 40, accuracy: 80.0, durationSeconds: 900, status: 'COMPLETED', violations: 0, date: '2026-06-25' }
    ],
    password: 'password123',
    isBlocked: false
  }
];

const DEFAULT_NOTICES: Notice[] = [
  { id: 'n1', title: 'SSC CGL 2026 Tier 1 Exam Dates Announced', date: '25 June 2026', publishDate: '2026-06-25', type: 'EXAM DATE', category: 'notice', url: 'https://ssc.gov.in', lastDate: '10 July 2026' },
  { id: 'n2', title: 'RRB NTPC Application Window Extended to July 10', date: '24 June 2026', publishDate: '2026-06-24', type: 'ADMISSION', category: 'notice', url: 'https://indianrailways.gov.in', lastDate: '10 July 2026' },
  { id: 'n3', title: 'UPPSC Prelims 2026 Exam Postponed. New Schedule Soon', date: '20 June 2026', publishDate: '2026-06-20', type: 'NOTIFICATION', category: 'notice', url: 'https://uppsc.up.nic.in' },
  
  { id: 'r1', title: 'CTET 2026 Answer Key & Response Sheet Released', date: '22 June 2026', publishDate: '2026-06-22', type: 'RESULT', category: 'result', url: 'https://ctet.nic.in' },
  { id: 'r2', title: 'SSC CHSL 2025 Final Merit List & Cutoff PDF Out', date: '21 June 2026', publishDate: '2026-06-21', type: 'MERIT LIST', category: 'result', url: 'https://ssc.gov.in' },
  { id: 'r3', title: 'SBI PO 2026 Prelims Scorecard & Cutoff Decided', date: '18 June 2026', publishDate: '2026-06-18', type: 'SCORECARD', category: 'result', url: 'https://sbi.co.in' },

  { id: 'a1', title: 'UGC NET June 2026 Admit Card Download Link Active', date: '23 June 2026', publishDate: '2026-06-23', type: 'ADMIT CARD', category: 'admit_card', url: 'https://ugcnet.nta.ac.in' },
  { id: 'a2', title: 'RRB ALP 2026 Stage 1 City Intimation Released', date: '22 June 2026', publishDate: '2026-06-22', type: 'CITY INFO', category: 'admit_card', url: 'https://indianrailways.gov.in' },
  { id: 'a3', title: 'IBPS Clerk 2026 Prelims Call Letter Available', date: '19 June 2026', publishDate: '2026-06-19', type: 'CALL LETTER', category: 'admit_card', url: 'https://ibps.in' }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersList, setUsersList] = useState<MockUser[]>([]);
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [noticesList, setNoticesList] = useState<Notice[]>([]);
  const [language, setLanguageState] = useState<'en' | 'hi'>('en');
  const [examCatalog, setExamCatalog] = useState<TestCategory[]>([]);

  const fetchUsersList = async () => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bootstrap' })
      });
      const data = await res.json();
      if (data.success) {
        setUsersList(data.usersList || []);
        setNoticesList(data.noticesList || []);
        setExamCatalog(data.examCatalog || []);

        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return null;
        };
        const savedUserId = getCookie('tb_user_id');
        if (savedUserId) {
          const matchingUser = (data.usersList || []).find((u: any) => u.id === savedUserId);
          if (matchingUser) {
            if (matchingUser.isBlocked) {
              document.cookie = "tb_user_id=;path=/;max-age=0";
              setCurrentUser(null);
            } else {
              setCurrentUser(matchingUser);
            }
          }
        }
      }
    } catch (err) {
      console.error("Fetch data error:", err);
    }
  };

  // Load initial data from Supabase
  useEffect(() => {
    fetchUsersList();

    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };
    const savedTheme = getCookie('tb_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('light');
    }

    const savedLang = getCookie('tb_lang') as 'en' | 'hi';
    if (savedLang && ['en', 'hi'].includes(savedLang)) {
      setLanguageState(savedLang);
    } else {
      setLanguageState('en');
    }
  }, []);

  // Sync theme changes with DOM node class selectors
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.cookie = "tb_theme=" + nextTheme + ";path=/;max-age=31536000";
  };

  const addNotice = (title: string, type: string, category: 'notice' | 'result' | 'admit_card', dateInput?: string, url?: string, lastDateInput?: string) => {
    let dateStr = '';
    const publishDateRaw = dateInput || new Date().toISOString().split('T')[0];

    if (dateInput) {
      const d = new Date(dateInput);
      const day = d.getDate();
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthStr = months[d.getMonth()];
      const year = d.getFullYear();
      dateStr = `${day} ${monthStr} ${year}`;
    } else {
      const d = new Date();
      const day = d.getDate();
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthStr = months[d.getMonth()];
      const year = d.getFullYear();
      dateStr = `${day} ${monthStr} ${year}`;
    }

    let lastDateStr = '';
    if (lastDateInput && lastDateInput.trim() !== '') {
      const d = new Date(lastDateInput);
      const day = d.getDate();
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthStr = months[d.getMonth()];
      const year = d.getFullYear();
      lastDateStr = `${day} ${monthStr} ${year}`;
    }

    const newId = 'nt_' + Math.random().toString(36).substring(2, 9);
    const newNotice: Notice = {
      id: newId,
      title,
      type: type.toUpperCase(),
      category,
      date: dateStr,
      publishDate: publishDateRaw,
      url: url?.trim() || undefined,
      lastDate: lastDateStr || undefined
    };

    const updated = [newNotice, ...noticesList];
    setNoticesList(updated);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-notice',
        data: newNotice
      })
    }).catch(err => console.error("Add notice error:", err));
  };

  const deleteNotice = (id: string) => {
    const updated = noticesList.filter(n => n.id !== id);
    setNoticesList(updated);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete-notice',
        data: { id }
      })
    }).catch(err => console.error("Delete notice error:", err));
  };

  const addCategory = (name: string) => {
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substring(2, 6);
    const newCategory: TestCategory = {
      id: newId,
      name,
      subCategories: []
    };
    const updated = [...examCatalog, newCategory];
    setExamCatalog(updated);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-category',
        data: { id: newId, name }
      })
    }).catch(err => console.error("Add category error:", err));
  };

  const deleteCategory = (categoryId: string) => {
    const updated = examCatalog.filter(c => c.id !== categoryId);
    setExamCatalog(updated);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete-category',
        data: { categoryId }
      })
    }).catch(err => console.error("Delete category error:", err));
  };

  const addSubCategory = (categoryId: string, name: string) => {
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substring(2, 6);
    const newSub: TestSubCategory = {
      id: newId,
      name,
      tests: []
    };
    const updated = examCatalog.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          subCategories: [...c.subCategories, newSub]
        };
      }
      return c;
    });
    setExamCatalog(updated);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-subcategory',
        data: { id: newId, categoryId, name }
      })
    }).catch(err => console.error("Add subcategory error:", err));
  };

  const deleteSubCategory = (categoryId: string, subCategoryId: string) => {
    const updated = examCatalog.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          subCategories: c.subCategories.filter(s => s.id !== subCategoryId)
        };
      }
      return c;
    });
    setExamCatalog(updated);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete-subcategory',
        data: { subCategoryId }
      })
    }).catch(err => console.error("Delete subcategory error:", err));
  };

  const addMockTest = (categoryId: string, subCategoryId: string, test: Omit<MockTestItem, 'id'>) => {
    const newId = test.title.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substring(2, 6);
    const newTest: MockTestItem = {
      ...test,
      id: newId
    };
    const updated = examCatalog.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          subCategories: c.subCategories.map(s => {
            if (s.id === subCategoryId) {
              return {
                ...s,
                tests: [...s.tests, newTest]
              };
            }
            return s;
          })
        };
      }
      return c;
    });
    setExamCatalog(updated);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-mocktest',
        data: { categoryId, subCategoryId, id: newId, ...test }
      })
    }).catch(err => console.error("Add mocktest error:", err));
  };

  const deleteMockTest = (categoryId: string, subCategoryId: string, testId: string) => {
    const updated = examCatalog.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          subCategories: c.subCategories.map(s => {
            if (s.id === subCategoryId) {
              return {
                ...s,
                tests: s.tests.filter(t => t.id !== testId)
              };
            }
            return s;
          })
        };
      }
      return c;
    });
    setExamCatalog(updated);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete-mocktest',
        data: { testId }
      })
    }).catch(err => console.error("Delete mocktest error:", err));
  };

  const setLanguage = (lang: 'en' | 'hi') => {
    setLanguageState(lang);
    document.cookie = "tb_lang=" + lang + ";path=/;max-age=31536000";
  };

  const login = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          data: { email }
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        document.cookie = "tb_user_id=" + data.user.id + ";path=/;max-age=31536000";
        fetchUsersList();
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (e: any) {
      console.error("Login API error:", e);
      return { success: false, error: e.message || 'Connection error' };
    }
  };

  const signup = async (name: string, email: string, mobile: string, password?: string, referralCodeInput?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          data: { name, email, mobile, password, referralCodeInput }
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        setUsersList(prev => [data.user, ...prev]);
        document.cookie = "tb_user_id=" + data.user.id + ";path=/;max-age=31536000";
        return { success: true };
      }
      return { success: false, error: data.error || 'Signup failed' };
    } catch (e: any) {
      console.error("Signup API error:", e);
      return { success: false, error: e.message || 'Connection error' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    document.cookie = "tb_user_id=;path=/;max-age=0";
  };

  const updateProfile = (name: string, email: string, mobile: string) => {
    if (!currentUser) return;

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();

    const updatedUser = { ...currentUser, name: trimmedName, email: trimmedEmail, mobile: trimmedMobile };
    setCurrentUser(updatedUser);

    const updatedList = usersList.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsersList(updatedList);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-profile',
        data: { userId: currentUser.id, name: trimmedName, email: trimmedEmail, mobile: trimmedMobile }
      })
    }).catch(err => console.error("Update profile API error:", err));
  };

  const updatePassword = (oldPass: string, newPass: string): boolean => {
    if (!currentUser) return false;

    if (currentUser.password && oldPass !== currentUser.password) {
      return false;
    }

    const updatedUser = { ...currentUser, password: newPass };
    setCurrentUser(updatedUser);

    const updatedList = usersList.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsersList(updatedList);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-password',
        data: { userId: currentUser.id, newPass }
      })
    }).catch(err => console.error("Update password API error:", err));

    return true;
  };

  const addAttempt = (
    testId: string,
    title: string,
    score: number,
    maxScore: number,
    accuracy: number,
    durationSeconds: number,
    violations: number,
    responses?: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number; }>
  ) => {
    if (!currentUser) return;

    const newRecord: MockTestRecord = {
      id: 'ts_' + Math.random().toString(36).substring(2, 9),
      testId,
      title,
      score,
      maxScore,
      accuracy,
      durationSeconds,
      status: 'COMPLETED',
      violations,
      date: new Date().toISOString().split('T')[0],
      responses
    };

    const filteredSessions = currentUser.testSessions.filter(
      s => !(s.testId === testId && s.status === 'ONGOING')
    );
    const updatedSessions = [newRecord, ...filteredSessions];
    const updatedUser = { ...currentUser, testSessions: updatedSessions };
    setCurrentUser(updatedUser);

    const updatedList = usersList.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsersList(updatedList);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-attempt',
        data: {
          userId: currentUser.id,
          testId,
          title,
          score,
          maxScore,
          accuracy,
          durationSeconds,
          violations,
          responses
        }
      })
    }).catch(err => console.error("Add attempt API error:", err));
  };

  const saveOngoingSession = (
    testId: string,
    title: string,
    timeRemaining: number,
    violations: number,
    responses: any,
    currentSectionIndex?: number,
    currentQuestionIndex?: number
  ) => {
    if (!currentUser) return;

    const existingIndex = currentUser.testSessions.findIndex(
      s => s.testId === testId && s.status === 'ONGOING'
    );

    const record: MockTestRecord = {
      id: existingIndex >= 0 ? currentUser.testSessions[existingIndex].id : 'ts_' + Math.random().toString(36).substring(2, 9),
      testId,
      title,
      score: 0,
      maxScore: 0,
      accuracy: 0,
      durationSeconds: 0,
      status: 'ONGOING',
      violations,
      date: new Date().toISOString().split('T')[0],
      responses,
      timeRemaining,
      currentSectionIndex,
      currentQuestionIndex
    };

    let updatedSessions = [...currentUser.testSessions];
    if (existingIndex >= 0) {
      updatedSessions[existingIndex] = record;
    } else {
      updatedSessions = [record, ...updatedSessions];
    }

    const updatedUser = { ...currentUser, testSessions: updatedSessions };
    setCurrentUser(updatedUser);

    const updatedList = usersList.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsersList(updatedList);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save-ongoing-session',
        data: {
          userId: currentUser.id,
          testId,
          title,
          timeRemaining,
          violations,
          responses,
          currentSectionIndex,
          currentQuestionIndex
        }
      })
    }).catch(err => console.error("Save ongoing session error:", err));
  };

  const clearOngoingSession = (testId: string) => {
    if (!currentUser) return;
    const updatedSessions = currentUser.testSessions.filter(
      s => !(s.testId === testId && s.status === 'ONGOING')
    );
    const updatedUser = { ...currentUser, testSessions: updatedSessions };
    setCurrentUser(updatedUser);

    const updatedList = usersList.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsersList(updatedList);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clear-ongoing-session',
        data: { userId: currentUser.id, testId }
      })
    }).catch(err => console.error("Clear ongoing session error:", err));
  };

  const toggleBookmark = (testId: string, questionId: string) => {
    if (!currentUser) return;
    const currentBookmarks = currentUser.bookmarkedQuestions || [];
    const exists = currentBookmarks.some(b => b.testId === testId && b.questionId === questionId);

    let updatedBookmarks;
    if (exists) {
      updatedBookmarks = currentBookmarks.filter(b => !(b.testId === testId && b.questionId === questionId));
    } else {
      updatedBookmarks = [...currentBookmarks, { testId, questionId }];
    }

    const updatedUser = { ...currentUser, bookmarkedQuestions: updatedBookmarks };
    setCurrentUser(updatedUser);

    const updatedList = usersList.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsersList(updatedList);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle-bookmark',
        data: { userId: currentUser.id, bookmarks: updatedBookmarks }
      })
    }).catch(err => console.error("Toggle bookmark error:", err));
  };

  const resetAttempt = (userId: string, sessionId: string) => {
    const updatedList = usersList.map(u => {
      if (u.id === userId) {
        const cleanedSessions = u.testSessions.filter(s => s.id !== sessionId);
        const updatedU = { ...u, testSessions: cleanedSessions };

        if (currentUser && currentUser.id === userId) {
          setCurrentUser(updatedU);
        }
        return updatedU;
      }
      return u;
    });

    setUsersList(updatedList);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reset-attempt',
        data: { userId, sessionId }
      })
    }).catch(err => console.error("Reset attempt API error:", err));
  };

  const saveUserProfileByAdmin = (
    userId: string,
    name: string,
    email: string,
    mobile: string,
    referralCode: string,
    referredBy: string | null,
    referralsCount: number,
    role: MockUser['role'],
    tier: MockUser['subscriptionTier'],
    purchasedAt: string | null,
    expiry: string | null,
    password?: string,
    isBlocked?: boolean
  ) => {
    const updatedList = usersList.map(u => {
      if (u.id === userId) {
        const updatedU = {
          ...u,
          name,
          email,
          mobile,
          referralCode,
          referredBy,
          referralsCount,
          role,
          subscriptionTier: tier,
          subscriptionPurchasedAt: purchasedAt,
          subscriptionExpiresAt: expiry,
          password: password || u.password || 'password123',
          isBlocked: isBlocked ?? u.isBlocked ?? false
        };

        if (currentUser && currentUser.id === userId) {
          setCurrentUser(updatedU);
        }
        return updatedU;
      }
      return u;
    });

    setUsersList(updatedList);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save-profile-admin',
        data: {
          userId,
          name,
          email,
          mobile,
          referralCode,
          referredBy,
          referralsCount,
          role,
          tier,
          purchasedAt,
          expiry,
          password,
          isBlocked
        }
      })
    }).catch(err => console.error("Save profile admin error:", err));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        usersList,
        theme,
        toggleTheme,
        login,
        signup,
        logout,
        updateProfile,
        updatePassword,
        addAttempt,
        toggleBookmark,
        resetAttempt,
        saveOngoingSession,
        clearOngoingSession,
        noticesList,
        addNotice,
        deleteNotice,
        language,
        setLanguage,
        saveUserProfileByAdmin,
        examCatalog,
        addCategory,
        deleteCategory,
        addSubCategory,
        deleteSubCategory,
        addMockTest,
        deleteMockTest
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
