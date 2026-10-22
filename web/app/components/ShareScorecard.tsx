"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Loader2, MessageCircle, Share2, X } from 'lucide-react';
import { btnPrimary, btnSecondary } from './SiteUI';

// -----------------------------------------------------------------------------
// "Share scorecard" on the result analysis page. Draws a branded result image on a canvas
// (no server, works offline in the desktop app) and lets the student share it with the
// phone's share sheet, save it, copy it, or send the result text on WhatsApp.
// -----------------------------------------------------------------------------

export interface ScorecardSection { name: string; score: number; maxScore: number }

export interface ScorecardData {
  testTitle: string;
  examName?: string;
  attemptLabel?: string;
  date?: string;
  studentName: string;
  candidateCode?: string;
  score: number;
  maxScore: number;
  accuracy: number;
  correct: number;
  wrong: number;
  skipped: number;
  timeTakenSeconds: number;
  rank?: number | null;
  totalCandidates?: number | null;
  percentile?: number | null;
  sections: ScorecardSection[];
}

const SITE = 'mocktesthub.vercel.app';
const NAVY = '#1e4e79';
const NAVY_DARK = '#0f2f4f';
const INK = '#0f172a';
const MUTED = '#64748b';

const TEXT = {
  en: {
    button: 'Share scorecard', title: 'Share your scorecard', making: 'Making your scorecard…',
    share: 'Share', save: 'Save image', copy: 'Copy image', copied: 'Copied', whatsapp: 'WhatsApp',
    attach: 'Tip: on WhatsApp, attach the saved image to send the scorecard.',
    scorecard: 'SCORECARD', sub: 'Exam Preparation', score: 'SCORE', accuracy: 'Accuracy', time: 'Time taken',
    rank: 'Rank', percentile: 'Percentile', attempted: 'Attempted', correct: 'Correct', wrong: 'Wrong', skipped: 'Skipped',
    sections: 'Section-wise score', footer: 'Practice free mock tests on', failed: "Couldn't make the image. Please try again.",
    message: (s: string, m: string, t: string) => `I scored ${s}/${m} in "${t}" on Mock Test Hub! 🎯\nPractice free mock tests: https://${SITE}`,
  },
  hi: {
    button: 'स्कोरकार्ड शेयर करें', title: 'अपना स्कोरकार्ड शेयर करें', making: 'स्कोरकार्ड बन रहा है…',
    share: 'शेयर', save: 'इमेज सेव करें', copy: 'इमेज कॉपी करें', copied: 'कॉपी हो गई', whatsapp: 'WhatsApp',
    attach: 'सुझाव: WhatsApp पर सेव की गई इमेज अटैच करके स्कोरकार्ड भेजें।',
    scorecard: 'स्कोरकार्ड', sub: 'Exam Preparation', score: 'स्कोर', accuracy: 'सटीकता', time: 'लिया गया समय',
    rank: 'रैंक', percentile: 'प्रतिशतक', attempted: 'प्रयास किए', correct: 'सही', wrong: 'गलत', skipped: 'छोड़े',
    sections: 'विषयवार स्कोर', footer: 'फ्री मॉक टेस्ट की प्रैक्टिस करें', failed: 'इमेज नहीं बन सकी। फिर से कोशिश करें।',
    message: (s: string, m: string, t: string) => `मैंने Mock Test Hub पर "${t}" में ${s}/${m} स्कोर किया! 🎯\nफ्री मॉक टेस्ट: https://${SITE}`,
  },
};
type Lang = keyof typeof TEXT;

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
const duration = (sec: number) => {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(r).padStart(2, '0')}s`;
};
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || 'S';

// lucide "trophy" (24x24), drawn with Path2D
const TROPHY = [
  'M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16',
  'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22',
  'M18 2H6v7a6 6 0 0 0 12 0V2Z',
];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(next).width <= maxWidth || !line) { line = next; continue; }
    if (lines.length === maxLines - 1) { line = fit(ctx, [line, ...words.slice(i)].join(' '), maxWidth); lines.push(line); return lines; }
    lines.push(line);
    line = words[i];
  }
  if (line) lines.push(fit(ctx, line, maxWidth));
  return lines;
}

/** Draws the scorecard and returns it as a PNG. */
export async function drawScorecard(d: ScorecardData, lang: Lang): Promise<Blob> {
  const T = TEXT[lang];
  try { await (document as any).fonts?.ready; } catch {}
  const family = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  const F = (weight: number, size: number) => `${weight} ${size}px ${family}`;

  const W = 1080, PAD = 56, X0 = PAD + 56, CW = W - 2 * X0;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  let ctx = canvas.getContext('2d')!;

  // Layout first (the height depends on the title length and number of sections)
  ctx.font = F(700, 40);
  const titleLines = wrap(ctx, d.testTitle || 'Mock Test', CW, 2);
  const sections = d.sections.filter(s => s.name).slice(0, 6);
  const showSections = sections.length > 1;
  const yTitle = 300;
  const ySub = yTitle + (titleLines.length - 1) * 50 + 44;
  const yDivider = ySub + 34;
  const yStudent = yDivider + 70;
  const yRing = yStudent + 70 + 140;          // ring centre
  const yChips = yRing + 140 + 48;
  const ySections = yChips + 120 + 64;
  const cardBottom = showSections ? ySections + 30 + sections.length * 56 + 20 : yChips + 120 + 52;
  const H = cardBottom + 170;
  canvas.height = H;
  ctx = canvas.getContext('2d')!;
  ctx.textBaseline = 'alphabetic';

  // Background and header band
  ctx.fillStyle = '#eef2f7';
  ctx.fillRect(0, 0, W, H);
  const band = ctx.createLinearGradient(0, 0, W, 320);
  band.addColorStop(0, NAVY);
  band.addColorStop(1, NAVY_DARK);
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, 330);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.arc(W - 90, 40, 190, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W - 300, 290, 110, 0, Math.PI * 2); ctx.fill();

  // Logo + name
  roundRect(ctx, 72, 58, 88, 88, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();
  ctx.save();
  ctx.translate(72 + 44 - 27, 58 + 44 - 27);
  ctx.scale(54 / 24, 54 / 24);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  TROPHY.forEach(p => ctx.stroke(new Path2D(p)));
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = F(800, 46);
  ctx.fillText('MOCK TEST HUB', 184, 106);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = F(500, 24);
  ctx.fillText(T.sub, 186, 140);

  // "SCORECARD" pill
  ctx.font = F(700, 20);
  const pill = T.scorecard;
  const pw = ctx.measureText(pill).width + 44;
  roundRect(ctx, W - 72 - pw, 76, pw, 46, 23);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(pill, W - 72 - pw + 22, 106);

  // White card
  ctx.save();
  ctx.shadowColor = 'rgba(15,47,79,0.18)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  roundRect(ctx, PAD, 200, W - 2 * PAD, cardBottom - 200, 36);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  // Test title and details
  ctx.fillStyle = INK;
  ctx.font = F(700, 40);
  titleLines.forEach((l, i) => ctx.fillText(l, X0, yTitle + i * 50));
  ctx.fillStyle = MUTED;
  ctx.font = F(500, 24);
  ctx.fillText(fit(ctx, [d.examName, d.attemptLabel, d.date].filter(Boolean).join('  ·  '), CW), X0, ySub);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(X0, yDivider, CW, 2);

  // Student
  ctx.fillStyle = '#e8f0f8';
  ctx.beginPath(); ctx.arc(X0 + 36, yStudent, 36, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.font = F(700, 28);
  ctx.textAlign = 'center';
  ctx.fillText(initials(d.studentName), X0 + 36, yStudent + 10);
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = F(700, 32);
  ctx.fillText(fit(ctx, d.studentName, CW - 100), X0 + 96, yStudent + (d.candidateCode ? -4 : 11));
  if (d.candidateCode) {
    ctx.fillStyle = MUTED;
    ctx.font = F(500, 22);
    ctx.fillText(d.candidateCode, X0 + 96, yStudent + 28);
  }

  // Score ring
  const pct = d.maxScore > 0 ? Math.min(1, Math.max(0, d.score / d.maxScore)) : 0;
  const ringColor = pct >= 0.6 ? '#1e7e34' : pct >= 0.4 ? NAVY : '#c2410c';
  const cx = X0 + 150, R = 130;
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath(); ctx.arc(cx, yRing, R, 0, Math.PI * 2); ctx.stroke();
  if (pct > 0) {
    ctx.strokeStyle = ringColor;
    ctx.beginPath(); ctx.arc(cx, yRing, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct); ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  let scoreSize = 72;
  ctx.font = F(800, scoreSize);
  while (ctx.measureText(num(d.score)).width > R * 1.5 && scoreSize > 40) { scoreSize -= 4; ctx.font = F(800, scoreSize); }
  ctx.fillText(num(d.score), cx, yRing + 14);
  ctx.fillStyle = MUTED;
  ctx.font = F(600, 28);
  ctx.fillText(`/ ${num(d.maxScore)}`, cx, yRing + 54);
  ctx.font = F(700, 18);
  ctx.fillText(T.score, cx, yRing - 58);
  ctx.textAlign = 'left';

  // Key numbers next to the ring
  const stats: [string, string][] = [
    [T.accuracy, `${num(d.accuracy)}%`],
    [T.time, duration(d.timeTakenSeconds)],
    d.rank ? [T.rank, `#${d.rank.toLocaleString('en-IN')}${d.totalCandidates ? ` / ${d.totalCandidates.toLocaleString('en-IN')}` : ''}`]
      : [T.attempted, `${d.correct + d.wrong} / ${d.correct + d.wrong + d.skipped}`],
  ];
  if (d.percentile != null && d.rank) stats[1] = [T.percentile, `${num(d.percentile)}%`];
  const sx = X0 + 360, sw = CW - 360, rowH = 92;
  const sy0 = yRing - (rowH * stats.length) / 2;
  stats.forEach(([label, value], i) => {
    const y = sy0 + i * rowH;
    ctx.fillStyle = MUTED;
    ctx.font = F(500, 22);
    ctx.fillText(label, sx, y + 30);
    ctx.fillStyle = INK;
    ctx.font = F(700, 36);
    ctx.fillText(fit(ctx, value, sw), sx, y + 72);
    if (i < stats.length - 1) { ctx.fillStyle = '#eef2f7'; ctx.fillRect(sx, y + rowH - 2, sw, 2); }
  });

  // Correct / wrong / skipped
  const chips: [string, number, string, string][] = [
    [T.correct, d.correct, '#e8f5ec', '#1e7e34'],
    [T.wrong, d.wrong, '#fdecee', '#b02a37'],
    [T.skipped, d.skipped, '#f1f5f9', '#475569'],
  ];
  const gap = 24, chipW = (CW - gap * 2) / 3;
  chips.forEach(([label, value, bg, fg], i) => {
    const x = X0 + i * (chipW + gap);
    roundRect(ctx, x, yChips, chipW, 120, 22);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = fg;
    ctx.font = F(800, 46);
    ctx.fillText(String(value), x + chipW / 2, yChips + 62);
    ctx.font = F(600, 22);
    ctx.fillText(label, x + chipW / 2, yChips + 96);
    ctx.textAlign = 'left';
  });

  // Section-wise
  if (showSections) {
    ctx.fillStyle = INK;
    ctx.font = F(700, 26);
    ctx.fillText(T.sections, X0, ySections);
    const nameW = 330, barX = X0 + nameW + 20, barW = CW - nameW - 20 - 150;
    sections.forEach((s, i) => {
      const y = ySections + 30 + i * 56;
      ctx.fillStyle = '#334155';
      ctx.font = F(500, 23);
      ctx.fillText(fit(ctx, s.name, nameW), X0, y + 30);
      roundRect(ctx, barX, y + 16, barW, 16, 8);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
      const p = s.maxScore > 0 ? Math.min(1, Math.max(0, s.score / s.maxScore)) : 0;
      if (p > 0) { roundRect(ctx, barX, y + 16, Math.max(16, barW * p), 16, 8); ctx.fillStyle = NAVY; ctx.fill(); }
      ctx.textAlign = 'right';
      ctx.fillStyle = INK;
      ctx.font = F(700, 23);
      ctx.fillText(`${num(s.score)} / ${num(s.maxScore)}`, X0 + CW, y + 30);
      ctx.textAlign = 'left';
    });
  }

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = F(500, 24);
  ctx.fillText(T.footer, W / 2, cardBottom + 70);
  ctx.fillStyle = NAVY;
  ctx.font = F(800, 32);
  ctx.fillText(SITE, W / 2, cardBottom + 114);
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

export default function ShareScorecardButton({ data, lang, className }: { data: ScorecardData; lang: Lang; className?: string }) {
  const T = TEXT[lang] || TEXT.en;
  const [open, setOpen] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let made = '';
    setBlob(null); setUrl(''); setError(''); setCopied(false);
    drawScorecard(dataRef.current, lang).then(b => {
      if (cancelled) return;
      made = URL.createObjectURL(b);
      setBlob(b); setUrl(made);
    }).catch(() => { if (!cancelled) setError(T.failed); });
    return () => { cancelled = true; if (made) URL.revokeObjectURL(made); };
  }, [open, lang, T.failed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const fileName = `MockTestHub-Scorecard-${(data.testTitle || 'result').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'result'}.png`;
  const message = T.message(num(data.score), num(data.maxScore), data.testTitle);
  const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null;
  const canShareFile = !!file && typeof navigator !== 'undefined' && !!navigator.canShare && navigator.canShare({ files: [file] });
  const canCopy = typeof window !== 'undefined' && 'ClipboardItem' in window && !!navigator.clipboard?.write;

  const share = async () => {
    if (!file) return;
    try { await navigator.share({ files: [file], title: 'Mock Test Hub', text: message }); } catch { /* closed the share sheet */ }
  };
  const save = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const copy = async () => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { save(); }
  };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className || btnSecondary}>
        <Share2 className="h-4 w-4" />
        {T.button}
      </button>
      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 select-none" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label={T.title}>
          <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{T.title}</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950/40">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={T.title} className="w-full h-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-800" />
              ) : (
                <div className="h-72 flex flex-col items-center justify-center gap-3 text-sm text-slate-500">
                  {error ? <span className="text-[#b02a37]">{error}</span> : <><Loader2 className="h-6 w-6 animate-spin" />{T.making}</>}
                </div>
              )}
            </div>
            <div className="px-4 py-3.5 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                {canShareFile ? (
                  <button type="button" onClick={share} disabled={!blob} className={`${btnPrimary} justify-center col-span-2`}>
                    <Share2 className="h-4 w-4" />{T.share}
                  </button>
                ) : null}
                <button type="button" onClick={save} disabled={!blob} className={`${canShareFile ? btnSecondary : btnPrimary} justify-center`}>
                  <Download className="h-4 w-4" />{T.save}
                </button>
                {canCopy ? (
                  <button type="button" onClick={copy} disabled={!blob} className={`${btnSecondary} justify-center`}>
                    {copied ? <Check className="h-4 w-4 text-[#1e7e34]" /> : <Copy className="h-4 w-4" />}{copied ? T.copied : T.copy}
                  </button>
                ) : null}
                <button type="button" onClick={whatsapp} className={`${btnSecondary} justify-center ${canCopy ? 'col-span-2' : ''}`}>
                  <MessageCircle className="h-4 w-4 text-[#1e7e34]" />{T.whatsapp}
                </button>
              </div>
              {!canShareFile ? <p className="text-xs text-slate-500 dark:text-slate-400">{T.attach}</p> : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
