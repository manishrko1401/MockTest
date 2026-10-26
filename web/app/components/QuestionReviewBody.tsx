"use client";

import React from 'react';
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import MathJaxText from '../lib/MathJaxText';
import { processQuestionHtml } from '../lib/mathUtils';
import { EXPLANATIONS } from '../lib/examUtils';

// -----------------------------------------------------------------------------
// A question as students see it on the result analysis page: the question, its image, the
// options (correct one green, the student's wrong choice red) and the explanation. Shared with
// the admin panel's "View question", so staff see exactly what the student saw.
// -----------------------------------------------------------------------------

export type ReviewQuestion = {
  id: string;
  content: Record<string, { questionText?: string; options?: any[]; imageUrl?: string; mathLatex?: string } | undefined>;
  correctOptionIndex: number;
  explanation?: Record<string, string>;
};

export function QuestionReviewBody({ question, lang, hi, fontSize = 14, selectedOptionIndex = null }: {
  question: ReviewQuestion;
  /** The question's language */
  lang: 'en' | 'hi';
  /** The page's language (labels) */
  hi: boolean;
  fontSize?: number;
  selectedOptionIndex?: number | null;
}) {
  const content = question.content[lang] || question.content['en'];
  const options = (question.content[lang]?.options || question.content['en']?.options || []) as any[];
  const imageUrl = question.content[lang]?.imageUrl || question.content['en']?.imageUrl;
  const explanation: Record<string, string> = (EXPLANATIONS as any)[question.id] || question.explanation || {
    en: "Detailed solution step-by-step is currently under verification by subject experts.",
    hi: "विषय विशेषज्ञों द्वारा विस्तृत समाधान वर्तमान में सत्यापन के अधीन है।",
  };

  return (
    <>
      {/* Question Box */}
      <div className="mb-6 space-y-4" style={{ fontSize: `${fontSize}px` }}>
        <MathJaxText
          component="div"
          className="font-semibold text-slate-900 dark:text-white leading-relaxed markup-content"
          content={processQuestionHtml(content?.questionText || question.content['en']?.questionText || "")}
        />

        {question.content[lang]?.mathLatex && (
          <div className="bg-slate-100 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800/80 font-mono text-xs text-blue-600 dark:text-blue-400">
            Latex: {question.content[lang]!.mathLatex}
          </div>
        )}

        {/* Optional Question Image */}
        {imageUrl && (
          <div className="flex justify-center bg-slate-50 dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-800 rounded-md">
            <img src={imageUrl} alt="Question Visual" className="max-h-72 object-contain" />
          </div>
        )}
      </div>

      {/* Options List */}
      <div className="space-y-3" style={{ fontSize: `${fontSize}px` }}>
        {options.map((opt, optIdx: number) => {
          const optLabel = typeof opt === 'string' ? opt : opt?.text;
          const isCorrectIndex = optIdx === question.correctOptionIndex;
          const isUserSelectedIndex = optIdx === selectedOptionIndex;

          let optionStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200';
          if (isCorrectIndex) {
            optionStyle = 'border-green-500 bg-green-50/40 dark:border-green-800 dark:bg-green-950/20 text-slate-900 dark:text-green-300';
          } else if (isUserSelectedIndex && !isCorrectIndex) {
            optionStyle = 'border-red-500 bg-red-50/40 dark:border-red-800 dark:bg-red-950/20 text-slate-900 dark:text-red-300';
          }

          return (
            <div key={optIdx} className={`border rounded-xl p-3.5 flex items-center justify-between transition ${optionStyle}`}>
              <span className="flex items-center gap-3 font-semibold">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  isCorrectIndex
                    ? 'bg-green-600 text-white'
                    : isUserSelectedIndex
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <MathJaxText content={processQuestionHtml(optLabel)} />
              </span>

              <div className="flex items-center gap-2">
                {isUserSelectedIndex && (
                  <span className="text-[9px] uppercase font-black bg-blue-900 border border-blue-800 text-blue-400 px-2 py-0.5 rounded shadow">
                    {hi ? 'आपका विकल्प' : 'Your Choice'}
                  </span>
                )}
                {isCorrectIndex && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {isUserSelectedIndex && !isCorrectIndex && <XCircle className="h-4 w-4 text-red-600" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation card */}
      <div className="mt-8 bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
        <h5 className="font-extrabold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 mb-3.5 flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-blue-500" /> {hi ? 'विस्तृत व्याख्या और अवधारणा' : 'Detailed Explanation & Concept'}
        </h5>
        <MathJaxText
          component="div"
          className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold markup-content"
          content={processQuestionHtml(explanation[lang] || explanation['en'] || "")}
        />
      </div>
    </>
  );
}
