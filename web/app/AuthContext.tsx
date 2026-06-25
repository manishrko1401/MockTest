"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

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
}

interface AuthContextType {
  currentUser: MockUser | null;
  usersList: MockUser[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  login: (email: string) => boolean;
  signup: (name: string, email: string, mobile: string, referralCodeInput?: string) => boolean;
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
    expiry: string | null
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INITIAL_USERS: MockUser[] = [
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
    ]
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
    ]
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
    testSessions: []
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
    ]
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

  // Load initial data from localStorage with backfill checks
  useEffect(() => {
    let loadedUsers: MockUser[] = [];
    const savedUsers = localStorage.getItem('tb_users');
    
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers) as MockUser[];
        const needsBackfill = parsed.some(
          u => !u.referralCode || !u.mobile || u.subscriptionPurchasedAt === undefined || 
               u.testSessions.some(ts => !ts.testId)
        );
        if (needsBackfill) {
          loadedUsers = parsed.map(u => {
            const match = INITIAL_USERS.find(iu => iu.id === u.id);
            const codeName = u.name.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
            
            // Map existing testSession titles to their testIds if missing
            const updatedSessions = u.testSessions.map(ts => {
              if (ts.testId) return ts;
              let tId = 'ssc_cgl_tier1';
              if (ts.title.includes('SSC CGL')) tId = 'ssc_cgl_tier1';
              else if (ts.title.includes('SBI PO')) tId = 'sbi_po_prelims';
              else if (ts.title.includes('RRB NTPC')) tId = 'rrb_ntpc_stage1';
              return { ...ts, testId: tId };
            });

            return {
              ...u,
              mobile: u.mobile || match?.mobile || '9988776655',
              referralCode: u.referralCode || match?.referralCode || ('TB-' + codeName + '-' + Math.floor(1000 + Math.random() * 9000)),
              referredBy: u.referredBy !== undefined ? u.referredBy : (match?.referredBy || null),
              referralsCount: u.referralsCount !== undefined ? u.referralsCount : (match?.referralsCount || 0),
              subscriptionPurchasedAt: u.subscriptionPurchasedAt !== undefined ? u.subscriptionPurchasedAt : (match?.subscriptionPurchasedAt || null),
              testSessions: updatedSessions
            };
          });
          localStorage.setItem('tb_users', JSON.stringify(loadedUsers));
        } else {
          loadedUsers = parsed;
        }
      } catch (e) {
        loadedUsers = INITIAL_USERS;
        localStorage.setItem('tb_users', JSON.stringify(INITIAL_USERS));
      }
    } else {
      loadedUsers = INITIAL_USERS;
      localStorage.setItem('tb_users', JSON.stringify(INITIAL_USERS));
    }
    
    setUsersList(loadedUsers);

    const savedSession = localStorage.getItem('tb_session');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession) as MockUser;
        const matchingLoadedUser = loadedUsers.find(u => u.id === parsedSession.id);
        if (matchingLoadedUser) {
          setCurrentUser(matchingLoadedUser);
          localStorage.setItem('tb_session', JSON.stringify(matchingLoadedUser));
        } else {
          setCurrentUser(parsedSession);
        }
      } catch (e) {
        const defaultUser = loadedUsers.find(u => u.id === 'u1') || loadedUsers[0];
        setCurrentUser(defaultUser);
        localStorage.setItem('tb_session', JSON.stringify(defaultUser));
      }
    } else {
      const defaultUser = loadedUsers.find(u => u.id === 'u1') || loadedUsers[0];
      setCurrentUser(defaultUser);
      localStorage.setItem('tb_session', JSON.stringify(defaultUser));
    }

    // Load theme setting
    const savedTheme = localStorage.getItem('tb_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('light');
    }

    // Load language setting
    const savedLang = localStorage.getItem('tb_lang') as 'en' | 'hi';
    if (savedLang && ['en', 'hi'].includes(savedLang)) {
      setLanguageState(savedLang);
    } else {
      setLanguageState('en');
    }

    // Load notices setting
    const savedNotices = localStorage.getItem('tb_notices');
    let loadedNotices: Notice[] = [];
    if (savedNotices) {
      try {
        loadedNotices = JSON.parse(savedNotices) as Notice[];
      } catch (e) {
        loadedNotices = DEFAULT_NOTICES;
        localStorage.setItem('tb_notices', JSON.stringify(DEFAULT_NOTICES));
      }
    } else {
      loadedNotices = DEFAULT_NOTICES;
      localStorage.setItem('tb_notices', JSON.stringify(DEFAULT_NOTICES));
    }
    setNoticesList(loadedNotices);
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
    localStorage.setItem('tb_theme', nextTheme);
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

    const newNotice: Notice = {
      id: 'nt_' + Math.random().toString(36).substring(2, 9),
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
    localStorage.setItem('tb_notices', JSON.stringify(updated));
  };

  const deleteNotice = (id: string) => {
    const updated = noticesList.filter(n => n.id !== id);
    setNoticesList(updated);
    localStorage.setItem('tb_notices', JSON.stringify(updated));
  };

  const setLanguage = (lang: 'en' | 'hi') => {
    setLanguageState(lang);
    localStorage.setItem('tb_lang', lang);
  };

  const login = (email: string): boolean => {
    const user = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('tb_session', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const signup = (name: string, email: string, mobile: string, referralCodeInput?: string): boolean => {
    // Check duplication
    if (usersList.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return false;
    }

    const codeName = name.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
    const referralCode = 'TB-' + codeName + '-' + Math.floor(1000 + Math.random() * 9000);

    let updatedList = [...usersList];
    let referredByCode: string | null = null;

    if (referralCodeInput && referralCodeInput.trim() !== '') {
      const referrerIndex = updatedList.findIndex(
        u => u.referralCode.trim().toLowerCase() === referralCodeInput.trim().toLowerCase()
      );
      if (referrerIndex !== -1) {
        referredByCode = updatedList[referrerIndex].referralCode;
        updatedList[referrerIndex] = {
          ...updatedList[referrerIndex],
          referralsCount: updatedList[referrerIndex].referralsCount + 1
        };
      }
    }

    const newUser: MockUser = {
      id: 'u_' + Math.random().toString(36).substring(2, 9),
      candidateCode: 'CGL_' + Math.floor(1000 + Math.random() * 9000),
      name,
      email,
      mobile,
      referralCode,
      referredBy: referredByCode,
      referralsCount: 0,
      role: 'STUDENT',
      subscriptionTier: 'None',
      subscriptionPurchasedAt: null,
      subscriptionExpiresAt: null,
      registeredDate: new Date().toISOString().split('T')[0],
      testSessions: []
    };

    updatedList.push(newUser);
    setUsersList(updatedList);
    localStorage.setItem('tb_users', JSON.stringify(updatedList));

    // Log in newly created user
    setCurrentUser(newUser);
    localStorage.setItem('tb_session', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tb_session');
  };

  const updateProfile = (name: string, email: string, mobile: string) => {
    if (!currentUser) return;
    
    const updatedUser = { ...currentUser, name, email, mobile };
    setCurrentUser(updatedUser);
    localStorage.setItem('tb_session', JSON.stringify(updatedUser));

    const updatedList = usersList.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsersList(updatedList);
    localStorage.setItem('tb_users', JSON.stringify(updatedList));
  };

  const updatePassword = (oldPass: string, newPass: string): boolean => {
    // Simulated simple verification
    if (oldPass === 'password' || oldPass.length > 0) {
      return true;
    }
    return false;
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
    localStorage.setItem('tb_session', JSON.stringify(updatedUser));

    const updatedList = usersList.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsersList(updatedList);
    localStorage.setItem('tb_users', JSON.stringify(updatedList));
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
    localStorage.setItem('tb_session', JSON.stringify(updatedUser));

    const updatedList = usersList.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsersList(updatedList);
    localStorage.setItem('tb_users', JSON.stringify(updatedList));
  };

  const clearOngoingSession = (testId: string) => {
    if (!currentUser) return;
    const updatedSessions = currentUser.testSessions.filter(
      s => !(s.testId === testId && s.status === 'ONGOING')
    );
    const updatedUser = { ...currentUser, testSessions: updatedSessions };
    setCurrentUser(updatedUser);
    localStorage.setItem('tb_session', JSON.stringify(updatedUser));

    const updatedList = usersList.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsersList(updatedList);
    localStorage.setItem('tb_users', JSON.stringify(updatedList));
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
    localStorage.setItem('tb_session', JSON.stringify(updatedUser));
    
    const updatedList = usersList.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsersList(updatedList);
    localStorage.setItem('tb_users', JSON.stringify(updatedList));
  };

  const resetAttempt = (userId: string, sessionId: string) => {
    const updatedList = usersList.map(u => {
      if (u.id === userId) {
        const cleanedSessions = u.testSessions.filter(s => s.id !== sessionId);
        const updatedU = { ...u, testSessions: cleanedSessions };
        
        // If the reset attempt was on the current user, update current session too
        if (currentUser && currentUser.id === userId) {
          setCurrentUser(updatedU);
          localStorage.setItem('tb_session', JSON.stringify(updatedU));
        }
        return updatedU;
      }
      return u;
    });

    setUsersList(updatedList);
    localStorage.setItem('tb_users', JSON.stringify(updatedList));
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
    expiry: string | null
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
          subscriptionExpiresAt: expiry
        };
        
        if (currentUser && currentUser.id === userId) {
          setCurrentUser(updatedU);
          localStorage.setItem('tb_session', JSON.stringify(updatedU));
        }
        return updatedU;
      }
      return u;
    });

    setUsersList(updatedList);
    localStorage.setItem('tb_users', JSON.stringify(updatedList));
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
        saveUserProfileByAdmin
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
