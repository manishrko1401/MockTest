"use client";

import React, { useState } from 'react';
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
import { Upload, Database, Users, TrendingUp, BarChart2, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'upload' | 'analytics'>('analytics');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);

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
    <div className="flex h-screen bg-slate-900 font-sans text-slate-100 overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          {/* Brand logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm leading-tight text-white tracking-wider">MOCK TEST ADMIN</h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Management Suite</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BarChart2 className="h-4 w-4" />
              Student Performance
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-colors ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Upload className="h-4 w-4" />
              Bulk Question Importer
            </button>
          </nav>
        </div>

        {/* System telemetry */}
        <div className="border-t border-slate-800 pt-4 text-[10px] text-slate-500">
          <p>Database: Connected (PostgreSQL)</p>
          <p>Active sessions: 1,429</p>
          <p>System load: Normal</p>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP BAR */}
        <header className="h-16 border-b border-slate-800 bg-slate-950 px-8 flex items-center justify-between">
          <h2 className="text-base font-extrabold tracking-wide text-white">
            {activeTab === 'analytics' ? 'Student Analytics & Speed Dashboard' : 'Bulk Question Ingestion Terminal'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">API Server Online</span>
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

        </div>

      </main>

    </div>
  );
}
