"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// -----------------------------------------------------------------------------
// Shared guided-tour overlay (used by the welcome tour and the notices tour).
// Each step highlights the first visible element matching its selectors; when none is
// visible the step is shown as a centred card. No skip: the tour ends with the last button.
// -----------------------------------------------------------------------------

export type TourText = { en: string; hi: string };
export type TourStep = {
  targets: string[];
  title: TourText;
  body: TourText;
  /** custom label for this step's primary button (e.g. "Open this category") */
  nextLabel?: TourText;
  /** runs when the primary button is pressed, before moving to the next step */
  onNext?: () => void;
  /** hide Back on this step (e.g. after the page view changed) */
  noBack?: boolean;
};

// Multi-page tours: part 1 marks the tour as pending before navigating; part 2 reads it on the
// next page. Session storage is used because during client-side navigation the new page can
// render before the address bar updates. A ?tour=<name> link is also accepted.
const PENDING_KEY = 'mth_pending_tour';
export function setPendingTour(name: string) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ name, at: Date.now() })); } catch { /* ignore */ }
}
/** Side-effect free check (safe inside a useState initializer). */
export function peekPendingTour(name: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (v?.name === name && Date.now() - (v.at || 0) < 60_000) return true;
    }
  } catch { /* ignore */ }
  return new URLSearchParams(window.location.search).get('tour') === name;
}
/** Clears the pending marker and strips ?tour=<name> from the address. */
export function clearPendingTour(name: string) {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (raw && JSON.parse(raw)?.name === name) sessionStorage.removeItem(PENDING_KEY);
  } catch { /* ignore */ }
  const params = new URLSearchParams(window.location.search);
  if (params.get('tour') === name) {
    params.delete('tour');
    const qs = params.toString();
    window.history.replaceState(window.history.state, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
  }
}

type Rect = { top: number; left: number; width: number; height: number };

function findVisible(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(sel));
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') return el;
    }
  }
  return null;
}

export function GuidedTour({
  open, steps, language, onFinish, introLabel, startLabel, finishLabel, initialStep = 0, stepOffset = 0, totalSteps,
}: {
  open: boolean;
  steps: TourStep[];
  language: 'en' | 'hi';
  /** called when the last step's button is pressed */
  onFinish: () => void;
  /** small label above the first step's title (e.g. "Quick tour") */
  introLabel?: TourText;
  /** button text on the first step (e.g. "Start tour"); defaults to Next */
  startLabel?: TourText;
  /** button text on the last step (e.g. "Finish" or "Open this notice") */
  finishLabel?: TourText;
  initialStep?: number;
  /** numbering offset when a tour continues from another page */
  stepOffset?: number;
  /** total numbered steps across pages (defaults to this page's steps) */
  totalSteps?: number;
}) {
  const hi = language === 'hi';
  const [step, setStep] = useState(initialStep);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const primaryRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(220);

  useEffect(() => { if (open) setStep(initialStep); }, [open, initialStep]);

  const measure = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    const s = steps[step];
    const el = s && s.targets.length ? findVisible(s.targets) : null;
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step, steps]);

  useLayoutEffect(() => {
    if (!open) return;
    const s = steps[step];
    const el = s && s.targets.length ? findVisible(s.targets) : null;
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 70 || r.bottom > window.innerHeight - 40) el.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
    measure();
    primaryRef.current?.focus();
  }, [open, step, steps, measure]);

  useLayoutEffect(() => {
    if (open && cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [open, step, rect, language]);

  // Targets can appear a moment after navigation (data still loading): re-measure briefly
  useEffect(() => {
    if (!open) return;
    const timers = [150, 500, 1200].map(ms => setTimeout(measure, ms));
    return () => timers.forEach(clearTimeout);
  }, [open, step, measure]);

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const onChange = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => { window.removeEventListener('resize', onChange); window.removeEventListener('scroll', onChange, true); cancelAnimationFrame(raf); };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); }
      // Arrow keys only move freely; steps that open something need their button
      else if (e.key === 'ArrowRight') { e.preventDefault(); if (!steps[step]?.onNext && step < steps.length - 1) setStep(step + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (step > 0 && !steps[step]?.noBack) setStep(step - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, steps, step]);

  if (!open) return null;

  const s = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const PAD = 6;
  const cardW = Math.min(360, viewport.w - 32);
  const total = totalSteps ?? steps.length;
  const number = step + 1 + stepOffset;
  const showIntro = isFirst && !!introLabel;

  let cardStyle: React.CSSProperties;
  if (rect) {
    const spaceBelow = viewport.h - (rect.top + rect.height + PAD);
    const placeBelow = spaceBelow > cardH + 24 || rect.top < cardH + 24;
    const top = placeBelow ? rect.top + rect.height + PAD + 12 : rect.top - PAD - 12 - cardH;
    const left = Math.max(16, Math.min(rect.left + rect.width / 2 - cardW / 2, viewport.w - cardW - 16));
    cardStyle = { position: 'fixed', top: Math.max(16, Math.min(top, viewport.h - cardH - 16)), left, width: cardW };
  } else {
    cardStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: cardW };
  }

  const primaryText = isLast
    ? (finishLabel ? (hi ? finishLabel.hi : finishLabel.en) : (hi ? 'समाप्त' : 'Finish'))
    : s.nextLabel ? (hi ? s.nextLabel.hi : s.nextLabel.en)
    : isFirst && startLabel ? (hi ? startLabel.hi : startLabel.en) : (hi ? 'आगे' : 'Next');
  const goNext = () => {
    if (isLast) { onFinish(); return; }
    if (s.onNext) s.onNext();
    setStep(step + 1);
  };

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      {rect ? (
        <div
          className="fixed rounded-lg ring-2 ring-white/90 pointer-events-none transition-all duration-200"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)' }}
        />
      ) : (
        <div className="fixed inset-0 bg-slate-900/55" />
      )}

      <div ref={cardRef} style={cardStyle} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl">
        <div className="px-5 pt-4 pb-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {showIntro ? (hi ? introLabel!.hi : introLabel!.en) : `${hi ? 'चरण' : 'Step'} ${number} ${hi ? 'में से' : 'of'} ${total}`}
          </span>
          <h2 id="tour-title" className="mt-1.5 text-base font-semibold text-slate-900 dark:text-white">{hi ? s.title.hi : s.title.en}</h2>
          <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{hi ? s.body.hi : s.body.en}</p>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 rounded-b-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 min-w-0 overflow-hidden" aria-hidden="true">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === number - 1 ? 'w-4 bg-[#1e4e79] dark:bg-blue-400' : i < number - 1 ? 'w-1.5 bg-[#1e4e79]/40 dark:bg-blue-400/40' : 'w-1.5 bg-slate-300 dark:bg-slate-600'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isFirst && !s.noBack && (
              <button type="button" onClick={() => setStep(step - 1)} className="h-8 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 hover:bg-[#eef3f8] dark:hover:bg-slate-800 cursor-pointer transition-colors whitespace-nowrap">
                {hi ? 'पीछे' : 'Back'}
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              onClick={goNext}
              className="h-8 px-4 rounded-md bg-[#1e4e79] hover:bg-[#163c5e] text-white text-sm font-medium cursor-pointer transition-colors whitespace-nowrap"
            >
              {primaryText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
