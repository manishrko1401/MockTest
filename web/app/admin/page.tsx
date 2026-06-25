"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth, MockUser, MockTestRecord } from '../AuthContext';
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
import { Upload, Database, Users, TrendingUp, BarChart2, BookOpen, AlertCircle, CheckCircle2, Search, Trash2, Edit, Calendar, UserCheck, RefreshCw, X, Award, ChevronRight, FileText, Sun, Moon, Bell, PlusCircle } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'upload' | 'analytics' | 'users' | 'notices'>('analytics');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);

  // Notices states
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeType, setNoticeType] = useState('EXAM DATE');
  const [noticeCategory, setNoticeCategory] = useState<'notice' | 'result' | 'admit_card'>('notice');
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().split('T')[0]);
  const [noticeSearch, setNoticeSearch] = useState('');
  const [noticeUrl, setNoticeUrl] = useState('');
  const [noticeLastDate, setNoticeLastDate] = useState('');

  // User Management state from context
  const { usersList, saveUserProfileByAdmin, resetAttempt, theme, toggleTheme, noticesList, addNotice, deleteNotice } = useAuth();

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
  const [editReferralsCount, setEditReferralsCount] = useState<number>(0);
  const [editRole, setEditRole] = useState<'STUDENT' | 'ADMIN' | 'CONTENT_CREATOR'>('STUDENT');
  const [editTier, setEditTier] = useState<'None' | 'Testbook Pass' | 'Testbook Pass Pro'>('None');
  const [editExpiry, setEditExpiry] = useState('');
  const [editPurchasedAt, setEditPurchasedAt] = useState('');

  // Toast & Modal confirmation states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ userId: string; sessionId: string; userName: string; sessionTitle: string } | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

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
      expiry
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

  // CSV/JSON Parser Simulation
  const handleBulkUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadStatus(null);

    if (!jsonInput.trim()) {
      setUploadStatus({ type: 'error', message: 'Input cannot be empty.' });
      return;
    }

    try {
      const data = JSON.parse(jsonInput);
      const questionsArray = Array.isArray(data) ? data : [data];

      // Validate core fields mapping to database schema
      for (const item of questionsArray) {
        if (!item.textEn || !item.textHi || !item.optionsEn || !item.optionsHi || item.correctIndex === undefined) {
          throw new Error('All questions must map textEn, textHi, optionsEn, optionsHi, and correctIndex.');
        }
        if (!Array.isArray(item.optionsEn) || item.optionsEn.length !== 4) {
          throw new Error('optionsEn must be an array of exactly 4 strings.');
        }
      }

      setParsedQuestions(questionsArray);
      setUploadStatus({
        type: 'success',
        message: `Successfully validated ${questionsArray.length} questions for database insertion.`
      });
    } catch (err: any) {
      setUploadStatus({
        type: 'error',
        message: err.message || 'Malformed JSON content. Please structure questions schema matching database model.'
      });
      setParsedQuestions([]);
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
        explanationHi: "एम्पीयर विद्युत धारा की मूल इकाई है।"
      },
      {
        textEn: "Which planet is known as the Red Planet?",
        textHi: "किस ग्रह को लाल ग्रह के नाम से जाना जाता है?",
        optionsEn: ["Earth", "Mars", "Jupiter", "Saturn"],
        optionsHi: ["पृथ्वी", "मंगल", "बृहस्पति", "शनि"],
        correctIndex: 1,
        explanationEn: "Mars is called the Red Planet due to iron oxide on its surface.",
        explanationHi: "मंगल को उसकी सतह पर आयरन ऑक्साइड के कारण लाल ग्रह कहा जाता है।"
      }
    ];
    setJsonInput(JSON.stringify(template, null, 2));
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
        <div>
          {/* Brand logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm leading-tight text-slate-900 dark:text-white tracking-wider">TESTBOOK ADMIN</h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase font-sans">Management Suite</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-2 font-sans">
            <button
              onClick={() => setActiveTab('analytics')}
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
              onClick={() => setActiveTab('upload')}
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
              onClick={() => setActiveTab('users')}
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
              onClick={() => setActiveTab('notices')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                activeTab === 'notices'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bell className="h-4 w-4" />
              Live Notices & Updates
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
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 flex items-center justify-between transition-colors duration-200">
          <h2 className="text-base font-extrabold tracking-wide text-slate-900 dark:text-white">
            {activeTab === 'analytics' 
              ? 'Student Analytics & Speed Dashboard' 
              : activeTab === 'upload' 
              ? 'Bulk Question Ingestion Terminal' 
              : activeTab === 'users'
              ? 'User Management & Access Control'
              : 'Live Updates & Notices Manager'}
          </h2>
          <div className="flex items-center gap-4">
            {/* Back to Home Link */}
            <Link href="/" className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors mr-2">
              Back to Home
            </Link>

            {/* Theme switcher */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            <span className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800"></span>

            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">API Server Online</span>
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
            <div className="grid grid-cols-3 gap-8">
              
              {/* Form Upload Input */}
              <div className="col-span-2 bg-slate-950 border border-slate-800 p-6 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider">Paste Questions JSON Array</h3>
                  <button
                    type="button"
                    onClick={loadTemplate}
                    className="text-xs text-blue-400 font-bold hover:underline"
                  >
                    Load Sample Template
                  </button>
                </div>

                <form onSubmit={handleBulkUploadSubmit}>
                  <textarea
                    rows={12}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder="Enter valid JSON questions schema..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 mb-4"
                  />

                  {uploadStatus && (
                    <div className={`p-4 rounded-lg flex items-start gap-3 mb-4 border ${
                      uploadStatus.type === 'success'
                        ? 'bg-green-950/30 border-green-800 text-green-400'
                        : 'bg-red-950/30 border-red-800 text-red-400'
                    }`}>
                      <AlertCircle className="h-5 w-5 mt-0.5" />
                      <span className="text-xs leading-relaxed">{uploadStatus.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-xs hover:bg-blue-700 active:scale-95 transition"
                  >
                    <Database className="h-4 w-4" />
                    Verify and Ingest Questions
                  </button>
                </form>
              </div>

              {/* Parsing results tracker */}
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl">
                <h3 className="font-bold text-xs text-white uppercase tracking-wider mb-4">Validation Dashboard</h3>
                
                {parsedQuestions.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">Total Validated Questions: <strong className="text-white">{parsedQuestions.length}</strong></p>
                    
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {parsedQuestions.map((q, idx) => (
                        <div key={idx} className="border-b border-slate-800 pb-3 text-xs">
                          <p className="font-bold text-blue-400">Question {idx + 1}</p>
                          <p className="text-slate-300 truncate mt-1">{q.textEn}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              Options: {q.optionsEn.length}
                            </span>
                            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-green-400">
                              Correct Index: {q.correctIndex}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
                    <Upload className="h-10 w-10 mx-auto text-slate-700 mb-3" />
                    No validated questions compiled. Load the templates above and click Ingest.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: USER MANAGEMENT PORTAL */}
          {activeTab === 'users' && (
            <div className="flex flex-col gap-6 lg:flex-row">
              
              {/* Left Pane: Users List & Search */}
              <div className="flex-1 bg-slate-950 border border-slate-800 p-6 rounded-xl min-w-[350px] lg:max-w-[450px]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between mb-6">
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider">Registered Users</h3>
                  
                  {/* Filters and search info */}
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-400">
                      Total: {usersList.length}
                    </span>
                  </div>
                </div>

                {/* Search / Filter Controls */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search name/email..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="ALL">All Roles</option>
                        <option value="STUDENT">Student</option>
                        <option value="ADMIN">Admin</option>
                        <option value="CONTENT_CREATOR">Creator</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={tierFilter}
                        onChange={(e) => setTierFilter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="ALL">All Passes</option>
                        <option value="None">No Pass</option>
                        <option value="Testbook Pass">Pass</option>
                        <option value="Testbook Pass Pro">Pass Pro</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Users List Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-3 pr-2">User Details</th>
                        <th className="pb-3 px-2">Role</th>
                        <th className="pb-3 px-2">Access Pass</th>
                        <th className="pb-3 pl-2 text-right">Attempts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {usersList
                        .filter(u => {
                          const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                u.email.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
                          const matchesTier = tierFilter === 'ALL' || u.subscriptionTier === tierFilter;
                          return matchesSearch && matchesRole && matchesTier;
                        })
                        .map(user => {
                          const isSelected = selectedUserId === user.id;
                          return (
                            <tr
                              key={user.id}
                              onClick={() => handleSelectUser(user)}
                              className={`cursor-pointer hover:bg-slate-900/60 transition-colors ${
                                isSelected ? 'bg-slate-800/80 border-l-2 border-blue-500' : ''
                              }`}
                            >
                              <td className="py-3.5 pr-2">
                                <p className="font-bold text-white text-xs">{user.name}</p>
                                <p className="text-[10px] text-slate-500">{user.email}</p>
                              </td>
                              <td className="py-3.5 px-2">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  user.role === 'ADMIN' 
                                    ? 'bg-red-950/40 border border-red-800 text-red-400' 
                                    : user.role === 'CONTENT_CREATOR' 
                                    ? 'bg-purple-950/40 border border-purple-800 text-purple-400' 
                                    : 'bg-blue-950/40 border border-blue-800 text-blue-400'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-3.5 px-2">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  user.subscriptionTier === 'Testbook Pass Pro'
                                    ? 'bg-yellow-950/40 border border-yellow-700 text-yellow-400 font-extrabold'
                                    : user.subscriptionTier === 'Testbook Pass'
                                    ? 'bg-green-950/40 border border-green-700 text-green-400'
                                    : 'bg-slate-900 border border-slate-800 text-slate-500'
                                }`}>
                                  {user.subscriptionTier === 'None' ? 'No Pass' : user.subscriptionTier}
                                </span>
                              </td>
                              <td className="py-3.5 pl-2 text-right font-mono text-slate-300">
                                {user.testSessions.length}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Pane: Selected User Profile & Exam Sitting details */}
              <div className="flex-1 flex flex-col gap-6">
                
                {selectedUserId ? (
                  (() => {
                    const activeUser = usersList.find(u => u.id === selectedUserId);
                    if (!activeUser) return null;

                    return (
                      <div className="space-y-6">
                        
                        {/* Profile & Subscriptions Editor */}
                        <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl">
                          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                            <div>
                              <h3 className="font-bold text-xs text-white uppercase tracking-wider">Edit User Profile</h3>
                              <p className="text-[10px] text-slate-500 mt-1">Code: {activeUser.candidateCode} • Registered on {activeUser.registeredDate}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                              ID: {activeUser.id}
                            </span>
                          </div>

                          <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Full Name</label>
                                <input
                                  type="text"
                                  required
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Email Address</label>
                                <input
                                  type="email"
                                  required
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Mobile Number</label>
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
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Referral Code</label>
                                <input
                                  type="text"
                                  required
                                  value={editReferralCode}
                                  onChange={(e) => setEditReferralCode(e.target.value.toUpperCase())}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Referred By (Code)</label>
                                <input
                                  type="text"
                                  value={editReferredBy}
                                  onChange={(e) => setEditReferredBy(e.target.value.toUpperCase())}
                                  placeholder="None"
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Referrals Count</label>
                                <input
                                  type="number"
                                  required
                                  value={editReferralsCount}
                                  onChange={(e) => setEditReferralsCount(Number(e.target.value))}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">System Role</label>
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value as any)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="STUDENT">Student (Candidate)</option>
                                  <option value="CONTENT_CREATOR">Content Creator</option>
                                  <option value="ADMIN">System Administrator</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Subscription Pass Tier</label>
                                <select
                                  value={editTier}
                                  onChange={(e) => setEditTier(e.target.value as any)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="None">None (No Pass)</option>
                                  <option value="Testbook Pass">Testbook Pass (Basic)</option>
                                  <option value="Testbook Pass Pro">Testbook Pass Pro (Full Gating Access)</option>
                                </select>
                              </div>

                              {editTier !== 'None' && (
                                <>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Pass Purchased Date</label>
                                    <input
                                      type="date"
                                      required
                                      value={editPurchasedAt}
                                      onChange={(e) => setEditPurchasedAt(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Pass Expiry Date</label>
                                    <input
                                      type="date"
                                      required
                                      value={editExpiry}
                                      onChange={(e) => setEditExpiry(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    />
                                  </div>
                                </>
                              )}

                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-800/80 pt-4 mt-6">
                              <button
                                type="submit"
                                className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-5 rounded-lg text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-900/20"
                              >
                                <UserCheck className="h-4 w-4" />
                                Save Changes
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* Exam Sitting attempts logs */}
                        <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl">
                          <h3 className="font-bold text-xs text-white uppercase tracking-wider mb-4">Exam Sitting History</h3>
                          
                          {activeUser.testSessions.length > 0 ? (
                            <div className="space-y-4">
                              {activeUser.testSessions.map(session => (
                                <div key={session.id} className="border border-slate-800 bg-slate-900/40 rounded-lg p-4 text-xs">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
                                    <div>
                                      <p className="font-bold text-slate-100">{session.title}</p>
                                      <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1">
                                        <Calendar className="h-3 w-3" /> Attempted on {session.date}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        session.status === 'COMPLETED'
                                          ? 'bg-green-950/40 border border-green-800 text-green-400'
                                          : session.status === 'AUTO_SUBMITTED'
                                          ? 'bg-yellow-950/40 border border-yellow-800 text-yellow-400'
                                          : 'bg-blue-950/40 border border-blue-800 text-blue-400 animate-pulse'
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
                                        className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 bg-red-950/20 border border-red-900/40 hover:bg-red-950/40 transition px-2 py-1 rounded"
                                      >
                                        <RefreshCw className="h-3 w-3" /> Reset Attempt
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                                    <div>
                                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Score Obtained</p>
                                      <p className="text-sm font-bold text-blue-400 mt-0.5">{session.score} / {session.maxScore}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Accuracy Rank</p>
                                      <p className="text-sm font-bold text-green-400 mt-0.5">{session.accuracy}%</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Time Spent</p>
                                      <p className="text-sm font-bold text-yellow-400 mt-0.5">
                                        {Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Cheat Violations</p>
                                      <p className={`text-sm font-bold mt-0.5 ${session.violations > 0 ? 'text-red-400 font-extrabold' : 'text-slate-300'}`}>
                                        {session.violations} Tab Blur{session.violations === 1 ? '' : 's'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
                              <FileText className="h-8 w-8 mx-auto text-slate-700 mb-2" />
                              This user has not sat for any exam sessions yet.
                            </div>
                          )}

                        </div>

                      </div>
                    );
                  })()
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 border border-slate-800 border-dashed p-10 rounded-xl text-center text-slate-500 text-xs min-h-[300px]">
                    <Users className="h-12 w-12 text-slate-700 mb-3" />
                    <p className="font-bold text-slate-400 text-sm mb-1">No Candidate Selected</p>
                    <p className="max-w-xs text-slate-500 leading-relaxed">Select a user profile from the registered accounts table in the left pane to view, edit access rights, and manage sitting test history logs.</p>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* TAB 4: NOTICES & ANNOUNCEMENTS MANAGER */}
          {activeTab === 'notices' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Info alert */}
              <div className="bg-blue-500/10 border border-blue-500/25 p-4 rounded-xl flex items-start gap-3">
                <Bell className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Live Updates Manager</p>
                  <p className="text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                    Publish exam alerts, admit card download releases, and result sheets directly to the homepage updates grid. All additions will update client dashboards instantly via context state.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Form column (1/3) */}
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl h-fit">
                  <h3 className="font-extrabold text-xs text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                    <PlusCircle className="h-4.5 w-4.5 text-blue-500" /> Publish New Update
                  </h3>
                  
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!noticeTitle.trim()) return;
                    addNotice(noticeTitle, noticeType, noticeCategory, noticeDate, noticeUrl, noticeLastDate);
                    setNoticeTitle('');
                    setNoticeUrl('');
                    setNoticeLastDate('');
                    showToast('Notice published successfully!');
                  }} className="space-y-4 text-xs">
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Update Category</label>
                      <select
                        value={noticeCategory}
                        onChange={(e) => setNoticeCategory(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="notice">Live Notices & Announcements</option>
                        <option value="result">Live Result Section</option>
                        <option value="admit_card">Live Admit Card Section</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Label Tag (e.g. EXAM DATE, MERIT LIST)</label>
                      <input
                        type="text"
                        required
                        value={noticeType}
                        onChange={(e) => setNoticeType(e.target.value)}
                        placeholder="EXAM DATE, RESULT, ADMISSION, etc."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Publish Date</label>
                      <input
                        type="date"
                        required
                        value={noticeDate}
                        onChange={(e) => setNoticeDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                      />
                    </div>

                    {noticeCategory === 'notice' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Application Last Date (Optional)</label>
                        <input
                          type="date"
                          value={noticeLastDate}
                          onChange={(e) => setNoticeLastDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Attachment URL (Optional)</label>
                      <input
                        type="url"
                        value={noticeUrl}
                        onChange={(e) => setNoticeUrl(e.target.value)}
                        placeholder="https://example.com/advisory"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Update Heading Title</label>
                      <textarea
                        required
                        value={noticeTitle}
                        onChange={(e) => setNoticeTitle(e.target.value)}
                        placeholder="Type notice title..."
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2.5 rounded-lg text-xs hover:bg-blue-750 active:scale-95 transition-all shadow-md cursor-pointer"
                    >
                      Publish Alert
                    </button>
                  </form>
                </div>

                {/* Notices list column (2/3) */}
                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 p-6 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
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
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
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
                            <tr key={notice.id} className="border-b border-slate-800 hover:bg-slate-900/30 transition text-slate-300">
                              <td className="py-3 px-4 font-bold text-slate-100 max-w-xs">
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
                                    ? 'bg-blue-950/40 text-blue-400 border border-blue-900'
                                    : notice.category === 'result'
                                    ? 'bg-yellow-950/40 text-yellow-400 border border-yellow-900'
                                    : 'bg-green-950/40 text-green-400 border border-green-900'
                                }`}>
                                  {notice.category === 'notice' ? 'Announcement' : notice.category === 'result' ? 'Result' : 'Admit Card'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded text-[10px]">{notice.type}</span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-[11px] text-slate-400">{notice.date}</td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => {
                                    deleteNotice(notice.id);
                                    showToast('Notice deleted successfully.');
                                  }}
                                  className="text-red-400 hover:text-red-300 font-bold bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 transition px-2 py-1 rounded cursor-pointer"
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
