"use client";

import React from 'react';
import { applyNumericKey } from '../../lib/examScoring';

// -----------------------------------------------------------------------------
// Answer box + on-screen keypad for numerical-answer questions (JEE Section B), like the
// NTA exam screen: the answer is typed with the keys only (1-9, ".", 0, +/-, CE, DEL).
// The value is kept as text ("-12.5") and saved with Save & Next like an option.
// -----------------------------------------------------------------------------

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '+/-', 'CE', 'DEL'];

export default function NumericAnswerPad({ value, onChange, disabled, hi, compact }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; hi?: boolean; compact?: boolean;
}) {
  const press = (k: string) => { if (!disabled) onChange(applyNumericKey(value, k)); };
  const btn = compact ? 'h-11 text-base' : 'h-12 text-lg';
  return (
    <div className={compact ? 'max-w-[320px]' : 'max-w-[340px]'}>
      <div
        className="mb-4 min-h-[56px] rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 flex items-center text-lg font-semibold text-slate-900 dark:text-white tracking-wide select-none"
        aria-live="polite"
        aria-label={hi ? 'आपका उत्तर' : 'Your answer'}
      >
        {value ? value : <span className="font-normal text-slate-500 dark:text-slate-400 text-base">{hi ? 'अपना उत्तर दर्ज करें' : 'Enter your answer'}</span>}
      </div>
      <div className="grid grid-cols-3 gap-x-7 gap-y-2.5 w-fit">
        {KEYS.map(k => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            disabled={disabled}
            className={`${btn} w-[90px] rounded-md bg-[#20b8d6] hover:bg-[#1aa3be] active:bg-[#168ea6] text-white font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
            aria-label={k === 'DEL' ? 'Delete last digit' : k === 'CE' ? 'Clear answer' : k === '+/-' ? 'Change sign' : k}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
