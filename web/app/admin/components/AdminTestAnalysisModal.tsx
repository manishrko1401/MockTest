"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Award,
  AlertCircle,
  Layers,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  User,
  Search,
  Filter,
  RefreshCw,
  Languages,
  Check
} from 'lucide-react';
import MathJaxText from '../../lib/MathJaxText';
import { processQuestionHtml } from '../../lib/mathUtils';

interface AdminTestAnalysisModalProps {
  sessionId: string;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function AdminTestAnalysisModal({ sessionId, onClose, showToast }: AdminTestAnalysisModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Active question index in the filtered questions list
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'correct' | 'incorrect' | 'skipped'>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  // Load session analysis
  useEffect(() => {
    let isMounted = true;
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-session-analysis',
            data: { sessionId }
          })
        });
        const resData = await res.json();
        if (!isMounted) return;
        if (resData.success) {
          setData(resData);
        } else {
          setError(resData.error || 'Failed to load test session analysis');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Network error while fetching analysis');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAnalysis();
    return () => { isMounted = false; };
  }, [sessionId]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    if (!data?.questions) return [];
    return data.questions.filter((q: any) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (selectedSection !== 'all' && q.sectionName !== selectedSection) return false;
      return true;
    });
  }, [data, statusFilter, selectedSection]);

  // Reset active question index when filter changes
  useEffect(() => {
    setActiveQuestionIdx(0);
  }, [statusFilter, selectedSection]);

  // Active question
  const currentQuestion = filteredQuestions[activeQuestionIdx] || filteredQuestions[0] || null;

  const formatSeconds = (sec?: number) => {
    if (!sec || sec <= 0) return '0s';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-sm">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {data?.mockTest?.title || 'Mock Test Analysis'}
                </h3>
                {data?.mockTest?.examName && (
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/40">
                    📁 {data.mockTest.examName}
                  </span>
                )}
                {data?.session?.status && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    data.session.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : data.session.status === 'AUTO_SUBMITTED'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                  }`}>
                    {data.session.status}
                  </span>
                )}
              </div>

              {/* Candidate Details Subtitle */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-blue-500" />
                  {data?.user?.fullName || 'Candidate'}
                </span>
                <span>•</span>
                <span className="font-mono text-[11px] text-slate-500">
                  {data?.user?.email || 'N/A'}
                </span>
                {data?.user?.candidateCode && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">
                      ID: {data.user.candidateCode}
                    </span>
                  </>
                )}
                {data?.session?.startedAt && (
                  <>
                    <span>•</span>
                    <span className="text-[11px]">
                      📅 {new Date(data.session.startedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {data?.mockTest?.id && (
              <a
                href={`/exam/${data.mockTest.id}/analysis?sessionId=${sessionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                title="Open student perspective analysis page in a new window"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Student View</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-24 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-3"></div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Loading test analysis & questions responses...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-center text-red-600 dark:text-red-400">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          ) : !data ? (
            <div className="p-6 text-center text-slate-400">No session data available.</div>
          ) : (
            <>
              {/* SUMMARY KPI METRIC BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Score */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Final Score</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                      {data.summary.finalScore}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold">
                      / {data.summary.maxMarks}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    {data.summary.maxMarks > 0 ? `${Math.round((data.summary.finalScore / data.summary.maxMarks) * 100)}% marks` : ''}
                  </p>
                </div>

                {/* Accuracy */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Accuracy</p>
                  <h5 className={`text-xl font-black mt-1 ${
                    data.summary.accuracyPercentage >= 85
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : data.summary.accuracyPercentage >= 65
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {data.summary.accuracyPercentage}%
                  </h5>
                  <p className="text-[9px] text-slate-500 mt-0.5">Attempt accuracy</p>
                </div>

                {/* Correct Answers */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Correct
                  </p>
                  <h5 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {data.summary.correctCount}
                  </h5>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    +{Math.round(data.summary.correctCount * (data.session.positiveMarks || 2))} marks earned
                  </p>
                </div>

                {/* Incorrect Answers */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Incorrect
                  </p>
                  <h5 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {data.summary.incorrectCount}
                  </h5>
                  <p className="text-[9px] text-slate-500 mt-0.5">Negative deductions</p>
                </div>

                {/* Skipped */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Unattempted</p>
                  <h5 className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">
                    {data.summary.skippedCount}
                  </h5>
                  <p className="text-[9px] text-slate-500 mt-0.5">Skipped questions</p>
                </div>

                {/* Time Spent */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Time Spent</p>
                  <h5 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                    {formatSeconds(data.summary.timeSpentSeconds)}
                  </h5>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    Duration: {data.session.durationMinutes} mins
                  </p>
                </div>
              </div>

              {/* SECTION-WISE BREAKDOWN TABLE */}
              {data.sections && data.sections.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-blue-500" /> Section-wise Performance Breakdown
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {data.sections.length} Sections
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/40 dark:bg-slate-800/20 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                          <th className="py-2.5 px-3">Section</th>
                          <th className="py-2.5 px-3 text-center">Questions</th>
                          <th className="py-2.5 px-3 text-center">Attempted</th>
                          <th className="py-2.5 px-3 text-center text-emerald-600">Correct</th>
                          <th className="py-2.5 px-3 text-center text-rose-600">Incorrect</th>
                          <th className="py-2.5 px-3 text-center text-slate-400">Skipped</th>
                          <th className="py-2.5 px-3 text-center">Score</th>
                          <th className="py-2.5 px-3 text-center">Accuracy</th>
                          <th className="py-2.5 px-3 text-right">Time Taken</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                        {data.sections.map((sec: any, sIdx: number) => (
                          <tr
                            key={sIdx}
                            className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition cursor-pointer ${
                              selectedSection === sec.sectionName ? 'bg-blue-50/50 dark:bg-blue-950/20 font-bold' : ''
                            }`}
                            onClick={() => setSelectedSection(selectedSection === sec.sectionName ? 'all' : sec.sectionName)}
                            title="Click to filter questions by this section"
                          >
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {sec.sectionName}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">{sec.totalQuestions}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{sec.attempted}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-emerald-600 font-bold">
                              {sec.correct}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-rose-600 font-bold">
                              {sec.incorrect}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                              {sec.skipped}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-black text-blue-600 dark:text-blue-400">
                              {sec.score}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {sec.accuracy}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              {formatSeconds(sec.timeSpentSeconds)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* QUESTION PALETTE & REVIEW INTERFACE */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden space-y-4 p-4 sm:p-5">
                {/* Control bar */}
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  {/* Status filter tabs */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg text-xs font-bold">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1 rounded-md transition cursor-pointer ${
                        statusFilter === 'all'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      All ({data.summary.totalQuestions})
                    </button>
                    <button
                      onClick={() => setStatusFilter('correct')}
                      className={`px-3 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
                        statusFilter === 'correct'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Correct ({data.summary.correctCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('incorrect')}
                      className={`px-3 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
                        statusFilter === 'incorrect'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                      }`}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Incorrect ({data.summary.incorrectCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('skipped')}
                      className={`px-3 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
                        statusFilter === 'skipped'
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      Skipped ({data.summary.skippedCount})
                    </button>
                  </div>

                  {/* Section dropdown and Language switcher */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                    {data.sections && data.sections.length > 1 && (
                      <select
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[180px] truncate"
                      >
                        <option value="all">All Sections</option>
                        {data.sections.map((s: any, idx: number) => (
                          <option key={idx} value={s.sectionName}>{s.sectionName}</option>
                        ))}
                      </select>
                    )}

                    <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-950">
                      <button
                        onClick={() => setLanguage('en')}
                        className={`px-2 py-1 text-[11px] font-black rounded ${
                          language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setLanguage('hi')}
                        className={`px-2 py-1 text-[11px] font-black rounded ${
                          language === 'hi' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        HI
                      </button>
                    </div>
                  </div>
                </div>

                {/* QUESTION NUMBER PALETTE GRID */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Jump to Question ({filteredQuestions.length} shown)</span>
                    <span className="text-[10px] lowercase text-slate-400 font-normal">
                      Click any number to view attempt & explanation
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    {filteredQuestions.map((q: any, fIdx: number) => {
                      const isCurrent = fIdx === activeQuestionIdx;
                      return (
                        <button
                          key={q.id || fIdx}
                          onClick={() => setActiveQuestionIdx(fIdx)}
                          className={`h-7 min-w-[28px] px-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                            isCurrent
                              ? 'ring-2 ring-blue-500 scale-105 z-10 font-extrabold shadow-md '
                              : ''
                          } ${
                            q.status === 'correct'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : q.status === 'incorrect'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                          }`}
                          title={`Q${q.questionNumber} • ${q.status.toUpperCase()} (${q.marksAwarded > 0 ? `+${q.marksAwarded}` : q.marksAwarded} marks)`}
                        >
                          {q.questionNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ACTIVE QUESTION CARD */}
                {currentQuestion ? (
                  <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-5 bg-white dark:bg-slate-900/90 shadow-sm">
                    {/* Question Header */}
                    <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black text-xs">
                          Question #{currentQuestion.questionNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {currentQuestion.sectionName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                          currentQuestion.status === 'correct'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : currentQuestion.status === 'incorrect'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {currentQuestion.status === 'correct' ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Correct (+{currentQuestion.positiveMarks} marks)
                            </>
                          ) : currentQuestion.status === 'incorrect' ? (
                            <>
                              <XCircle className="h-3.5 w-3.5" />
                              Incorrect (-{currentQuestion.negativeMarks} marks)
                            </>
                          ) : (
                            <>
                              <HelpCircle className="h-3.5 w-3.5" />
                              Unattempted (0 marks)
                            </>
                          )}
                        </span>

                        {/* Time on question */}
                        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded font-mono text-[11px] font-bold">
                          <Clock className="h-3 w-3" />
                          {currentQuestion.timeSpentSeconds > 0 ? `${currentQuestion.timeSpentSeconds}s` : '0s'}
                        </span>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed select-text">
                      <MathJaxText
                        component="div"
                        content={processQuestionHtml(
                          language === 'hi' && currentQuestion.textHi
                            ? currentQuestion.textHi
                            : currentQuestion.textEn
                        )}
                      />
                    </div>

                    {/* Question Image if any */}
                    {currentQuestion.imageUrl && (
                      <div className="my-3">
                        <img
                          src={currentQuestion.imageUrl}
                          alt="Question Graphic"
                          className="max-h-64 rounded-lg border border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    )}

                    {/* Options List */}
                    <div className="space-y-2.5 pt-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Options & Candidate Response:
                      </p>
                      {(() => {
                        const options =
                          language === 'hi' && currentQuestion.optionsHi && currentQuestion.optionsHi.length > 0
                            ? currentQuestion.optionsHi
                            : currentQuestion.optionsEn;

                        return options.map((optText: string, optIdx: number) => {
                          const isCorrect = optIdx === currentQuestion.correctOptionIndex;
                          const isSelectedByCandidate = optIdx === currentQuestion.userSelectedOptionIndex;

                          let optionClass = 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300';
                          if (isCorrect) {
                            optionClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500';
                          } else if (isSelectedByCandidate && !isCorrect) {
                            optionClass = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold ring-1 ring-rose-500';
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`p-3 rounded-xl border transition flex items-start justify-between gap-3 text-xs leading-relaxed ${optionClass}`}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : isSelectedByCandidate
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <div className="pt-0.5">
                                  <MathJaxText content={processQuestionHtml(optText)} />
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                                {isSelectedByCandidate && (
                                  <span className={`px-2 py-0.5 rounded-full font-black flex items-center gap-1 ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-rose-600 text-white'
                                  }`}>
                                    👤 Candidate Selected
                                  </span>
                                )}
                                {isCorrect && (
                                  <span className="px-2 py-0.5 rounded-full font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Correct Answer
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Detailed Explanation / Solution Box */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                          <HelpCircle className="h-4 w-4" /> Explanation & Concept Solution:
                        </div>
                        <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 select-text">
                          <MathJaxText
                            component="div"
                            content={processQuestionHtml(
                              language === 'hi' && currentQuestion.explanationHi
                                ? currentQuestion.explanationHi
                                : currentQuestion.explanationEn || 'No step-by-step solution provided for this question.'
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Question Navigation Controls */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setActiveQuestionIdx(p => Math.max(0, p - 1))}
                        disabled={activeQuestionIdx === 0}
                        className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>

                      <span className="text-xs text-slate-400 font-bold">
                        {activeQuestionIdx + 1} of {filteredQuestions.length}
                      </span>

                      <button
                        onClick={() => setActiveQuestionIdx(p => Math.min(filteredQuestions.length - 1, p + 1))}
                        disabled={activeQuestionIdx === filteredQuestions.length - 1}
                        className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition cursor-pointer"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 font-medium">
                    No questions matching the selected filter ({statusFilter}).
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="text-[11px] text-slate-400 font-medium truncate">
            Session ID: <span className="font-mono text-slate-500">{sessionId}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
          >
            Close Analysis
          </button>
        </div>

      </div>
    </div>
  );
}
