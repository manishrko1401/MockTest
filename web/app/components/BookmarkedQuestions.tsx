"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Check, ChevronDown, ChevronUp, Trash2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { generateExamSession, EXPLANATIONS } from '../lib/examUtils';
import { processQuestionHtml } from '../lib/mathUtils';
import MathJaxText from '../lib/MathJaxText';

// -----------------------------------------------------------------------------
// Bookmarked questions list (Test Series page, desktop and mobile).
// Questions are built with generateExamSession, the same way the analysis page
// builds them, so a bookmark's questionId always matches the question it was
// saved from. Bookmarks whose test or question no longer exists stay visible
// with a Remove button instead of silently disappearing.
// -----------------------------------------------------------------------------

export type TestQuestions = {
  status: 'ready' | 'missing' | 'error';
  title: string;
  questions: any[];
  sectionNames: Record<string, string>;
};

/** Bookmarks stored on this PC by the Windows app (offline Bookmarks page). */
export type OfflineBookmarks = {
  bookmarks: { testId: string; questionId: string }[];
  tests: Record<string, TestQuestions>;
  /** Analysis link for tests downloaded to this PC (null: no link offline) */
  analysisHref: (testId: string) => string | null;
};

const keyOf = (testId: string, questionId: string) => `${testId}\u0000${questionId}`;

// Filler text generateExamSession uses when a question has no explanation
const PLACEHOLDER_EXPLANATIONS = new Set([
  'Detailed explanation under review.',
  'विस्तृत विवरण समीक्षा के अधीन है।',
  'Detailed explanation provided.',
  'विस्तृत व्याख्या प्रदान की गई है।',
]);
const realText = (s: unknown) => (typeof s === 'string' && s.trim() && !PLACEHOLDER_EXPLANATIONS.has(s.trim()) ? s : '');

export default function BookmarkedQuestions({ offline }: { offline?: OfflineBookmarks } = {}) {
  const { currentUser, toggleBookmark, language, examCatalog } = useAuth();
  const isHi = language === 'hi';
  const lang = isHi ? 'hi' : 'en';

  const sourceList = offline ? offline.bookmarks : currentUser?.bookmarkedQuestions;
  const bookmarks = useMemo(() => [...(sourceList || [])].reverse(), [sourceList]); // newest first
  const [byTest, setByTest] = useState<Record<string, TestQuestions>>(() => offline?.tests || {});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [testFilter, setTestFilter] = useState<string>('all');
  const [reloadTick, setReloadTick] = useState(0);

  // Title of each test from the catalog (falls back to the title returned by the API)
  const catalogTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of examCatalog || []) {
      for (const sub of cat.subCategories || []) {
        for (const t of sub.tests || []) map[t.id] = t.title;
        for (const ss of (sub as any).subSubCategories || []) {
          for (const t of ss.tests || []) map[t.id] = t.title;
        }
      }
    }
    return map;
  }, [examCatalog]);

  // Load the questions of every bookmarked test not loaded yet
  const testIds = useMemo(() => [...new Set(bookmarks.map(b => b.testId))], [bookmarks]);
  useEffect(() => {
    const missing = testIds.filter(id => !byTest[id]);
    if (offline || missing.length === 0) return;
    let cancelled = false;

    missing.forEach(async (testId) => {
      let entry: TestQuestions = { status: 'missing', title: '', questions: [], sectionNames: {} };
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-custom-questions', data: { testId } }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
          const session = generateExamSession(testId, examCatalog, {
            questions: data.questions,
            positiveMarks: data.positiveMarks,
            negativeMarks: data.negativeMarks,
            durationMinutes: data.durationMinutes,
            questionsCount: data.questionsCount,
            maxMarks: data.maxMarks,
            hasSectionalTiming: data.hasSectionalTiming,
            sectionalTimings: data.sectionalTimings,
            sections: data.sections,
          });
          entry = {
            status: 'ready',
            title: data.title || session.testTitle,
            questions: session.questions,
            sectionNames: Object.fromEntries(session.sections.map(s => [s.id, s.name])),
          };
        } else if (data.success) {
          entry = { ...entry, title: data.title || '' };
        } else {
          entry = { ...entry, status: 'error' };
        }
      } catch {
        entry = { ...entry, status: 'error' };
      }
      if (!cancelled) setByTest(prev => ({ ...prev, [testId]: entry }));
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testIds.join('|'), examCatalog, reloadTick]);

  const retry = () => {
    setByTest(prev => Object.fromEntries(Object.entries(prev).filter(([, v]) => v.status !== 'error')));
    setReloadTick(n => n + 1);
  };

  // Keep the filter valid when the last bookmark of the filtered test is removed
  useEffect(() => {
    if (testFilter !== 'all' && !testIds.includes(testFilter)) setTestFilter('all');
  }, [testFilter, testIds]);

  const tests = offline ? offline.tests : byTest;
  const titleOf = (testId: string) => catalogTitles[testId] || tests[testId]?.title
    || (offline ? (isHi ? 'टेस्ट' : 'Test') : (isHi ? 'हटाया गया टेस्ट' : 'Removed test'));

  if ((!currentUser && !offline) || bookmarks.length === 0) {
    return (
      <div className="text-center py-12 sm:py-16 px-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
        <Bookmark className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold">
          {!currentUser && !offline
            ? (isHi ? 'बुकमार्क देखने के लिए लॉग इन करें' : 'Log in to see your bookmarks')
            : (isHi ? 'अभी तक कोई बुकमार्क नहीं' : 'No bookmarks saved yet')}
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
          {isHi
            ? 'टेस्ट देने के बाद Analysis में किसी प्रश्न पर "बुकमार्क करें" दबाएं, वह यहां दिखेगा।'
            : 'After a test, open Analysis and press "Bookmark" on any question to save it here.'}
        </p>
      </div>
    );
  }

  const visible = testFilter === 'all' ? bookmarks : bookmarks.filter(b => b.testId === testFilter);

  return (
    <div className="space-y-3">
      {testIds.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="bm-test-filter" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {isHi ? 'टेस्ट' : 'Test'}
          </label>
          <select
            id="bm-test-filter"
            value={testFilter}
            onChange={(e) => setTestFilter(e.target.value)}
            className="max-w-full sm:max-w-md h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
          >
            <option value="all">{isHi ? `सभी टेस्ट (${bookmarks.length})` : `All tests (${bookmarks.length})`}</option>
            {testIds.map(id => (
              <option key={id} value={id}>
                {titleOf(id)} ({bookmarks.filter(b => b.testId === id).length})
              </option>
            ))}
          </select>
        </div>
      )}

      {visible.map((bm) => {
        const k = keyOf(bm.testId, bm.questionId);
        const test = tests[bm.testId];
        const removeBtn = (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleBookmark(bm.testId, bm.questionId); }}
            className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer shrink-0"
            title={isHi ? 'बुकमार्क हटाएं' : 'Remove bookmark'}
            aria-label={isHi ? 'बुकमार्क हटाएं' : 'Remove bookmark'}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        );
        const testLabel = (
          <span className="inline-block max-w-full truncate bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-blue-300 px-2 py-0.5 rounded text-[11px] font-semibold">
            {titleOf(bm.testId)}
          </span>
        );

        // Offline: bookmarked without internet in a test that isn't downloaded
        const notSavedYet = (
          <div key={k} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">{testLabel}</div>
              {removeBtn}
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              {isHi ? 'यह प्रश्न इंटरनेट आने पर ऑफ़लाइन के लिए सेव होगा।' : 'This question will be saved for offline use when you are back online.'}
            </p>
          </div>
        );

        if (!test && offline) return notSavedYet;
        if (!test) {
          return (
            <div key={k} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">{testLabel}</div>
                {removeBtn}
              </div>
              <div className="mt-3 space-y-2 animate-pulse">
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800 w-11/12" />
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800 w-2/3" />
              </div>
            </div>
          );
        }

        if (test.status === 'error') {
          return (
            <div key={k} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">{testLabel}</div>
                {removeBtn}
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                {isHi ? 'प्रश्न लोड नहीं हो सका।' : 'Could not load this question.'}{' '}
                <button type="button" onClick={retry} className="font-semibold text-[#1e4e79] dark:text-blue-300 hover:underline cursor-pointer">
                  {isHi ? 'फिर से कोशिश करें' : 'Try again'}
                </button>
              </p>
            </div>
          );
        }

        const qIndex = test.questions.findIndex(q => q.id === bm.questionId);
        const q = qIndex >= 0 ? test.questions[qIndex] : null;

        if (!q && offline) return notSavedYet;
        if (!q) {
          return (
            <div key={k} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">{testLabel}</div>
                {removeBtn}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {isHi
                  ? 'यह प्रश्न अब उपलब्ध नहीं है (टेस्ट हटाया या बदला गया)। आप यह बुकमार्क हटा सकते हैं।'
                  : 'This question is no longer available (the test was removed or changed). You can remove this bookmark.'}
              </p>
            </div>
          );
        }

        const content = q.content?.[lang]?.questionText ? q.content[lang] : q.content?.en || {};
        const options: any[] = (q.content?.[lang]?.options?.length ? q.content[lang].options : q.content?.en?.options) || [];
        const explanationObj = EXPLANATIONS[q.id] || q.explanation || {};
        const explanation: string = realText(explanationObj[lang]) || realText(explanationObj.en);
        const isOpen = !!expanded[k];
        const sectionName = test.sectionNames[q.sectionId];

        return (
          <div key={k} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onClick={() => setExpanded(prev => ({ ...prev, [k]: !prev[k] }))}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(prev => ({ ...prev, [k]: !prev[k] })); } }}
              className="p-4 cursor-pointer select-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {testLabel}
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {isHi ? 'प्रश्न' : 'Q'} {q.qNo ?? qIndex + 1}{sectionName ? ` · ${sectionName}` : ''}
                    </span>
                  </div>
                  <MathJaxText
                    component="div"
                    className={`text-sm text-slate-800 dark:text-slate-200 leading-relaxed markup-content ${isOpen ? '' : 'line-clamp-2'}`}
                    content={processQuestionHtml(content.questionText || '')}
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {removeBtn}
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </div>
              </div>
            </div>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-200 dark:border-slate-800 pt-3">
                {content.comprehension && (
                  <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded p-3 text-xs text-slate-700 dark:text-slate-300 max-h-64 overflow-y-auto">
                    <MathJaxText component="div" className="markup-content leading-relaxed" content={processQuestionHtml(content.comprehension)} />
                  </div>
                )}

                {(content.imageUrl || q.content?.en?.imageUrl) && (
                  <div className="flex justify-center bg-slate-50 dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800 rounded-md">
                    <img src={content.imageUrl || q.content.en.imageUrl} alt="" className="max-h-72 object-contain" />
                  </div>
                )}

                {options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {options.map((opt, oIdx) => {
                      const text = typeof opt === 'string' ? opt : (opt?.text ?? '');
                      const img = typeof opt === 'object' ? opt?.imageUrl : undefined;
                      const isCorrect = oIdx === q.correctOptionIndex;
                      return (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-md border text-xs flex items-start gap-2 ${
                            isCorrect
                              ? 'bg-green-50 border-green-400 text-green-900 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-semibold shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                          <div className="min-w-0 flex-1">
                            <MathJaxText component="div" className="markup-content" content={processQuestionHtml(text)} />
                            {img && <img src={img} alt="" className="mt-1 max-h-32 object-contain" />}
                          </div>
                          {isCorrect && <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" aria-label={isHi ? 'सही उत्तर' : 'Correct answer'} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {explanation && (
                  <div className="bg-[#f5f7fa] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-md p-3">
                    <p className="text-[11px] font-semibold text-[#1e4e79] dark:text-blue-300 mb-1">{isHi ? 'व्याख्या' : 'Explanation'}</p>
                    <MathJaxText component="div" className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed markup-content" content={processQuestionHtml(explanation)} />
                  </div>
                )}

                {(() => {
                  const href = offline ? offline.analysisHref(bm.testId) : `/exam/${bm.testId}/analysis`;
                  return href ? (
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#1e4e79] dark:text-blue-300 hover:underline"
                    >
                      {isHi ? 'टेस्ट विश्लेषण खोलें' : 'Open test analysis'} <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
