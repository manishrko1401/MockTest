"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import {
  Award,
  TrendingUp,
  Coins,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface SubCategory {
  id: string;
  name: string;
  nameHi?: string;
}

export interface ExamCategoryItem {
  id: string;
  name: string;
  nameHi?: string;
  desc?: string;
  count?: string;
  logoUrl?: string | null;
  subCategories?: SubCategory[];
}

// ---- Guaranteed default catalog so the marquee ALWAYS shows ----
const DEFAULT_CATEGORIES: ExamCategoryItem[] = [
  {
    id: 'ssc', name: 'SSC Exams', nameHi: 'एसएससी परीक्षाएं',
    desc: 'SSC CGL, CHSL, MTS, CPO, GD Constable', count: '45+ Tests',
    subCategories: [{ id: 'cgl', name: 'CGL Tier 1 & 2' }, { id: 'chsl', name: 'CHSL 10+2' }, { id: 'mts', name: 'MTS & Havaldar' }, { id: 'gd', name: 'GD Constable' }]
  },
  {
    id: 'railways', name: 'Railways (RRB)', nameHi: 'रेलवे भर्ती',
    desc: 'RRB NTPC, Group D, ALP & Technicians, RPF SI', count: '30+ Tests',
    subCategories: [{ id: 'ntpc', name: 'NTPC CBT 1 & 2' }, { id: 'gd', name: 'Group D' }, { id: 'alp', name: 'ALP & Tech' }, { id: 'rpf', name: 'RPF SI & Constable' }]
  },
  {
    id: 'banking', name: 'Banking & Insurance', nameHi: 'बैंकिंग एवं बीमा',
    desc: 'SBI PO/Clerk, IBPS PO/Clerk, RRB, RBI Assistant', count: '40+ Tests',
    subCategories: [{ id: 'sbi_po', name: 'SBI PO' }, { id: 'ibps_po', name: 'IBPS PO' }, { id: 'ibps_cl', name: 'IBPS Clerk' }, { id: 'sbi_cl', name: 'SBI Clerk' }]
  },
  {
    id: 'teaching', name: 'Teaching Exams', nameHi: 'शिक्षक पात्रता परीक्षाएं',
    desc: 'CTET Paper 1 & 2, UPTET, KVS, Super TET', count: '25+ Tests',
    subCategories: [{ id: 'ctet1', name: 'CTET Paper 1' }, { id: 'ctet2', name: 'CTET Paper 2' }, { id: 'kvs', name: 'KVS PRT/TGT' }, { id: 'dsssb', name: 'DSSSB PRT' }]
  },
  {
    id: 'ugc_net', name: 'UGC NET & SET', nameHi: 'यूजीसी नेट एवं सेट',
    desc: 'Paper 1 General, Computer Science, Commerce & Arts', count: '20+ Tests',
    subCategories: [{ id: 'p1', name: 'Paper 1 General' }, { id: 'cs', name: 'Computer Science' }, { id: 'comm', name: 'Commerce' }, { id: 'eng', name: 'English' }]
  },
  {
    id: 'upsc', name: 'UPSC Civil Services', nameHi: 'यूपीएससी सिविल सेवा',
    desc: 'IAS, IPS, IFS Prelims GS Paper 1 & CSAT Paper 2', count: '50+ Tests',
    subCategories: [{ id: 'gs', name: 'GS Prelims' }, { id: 'csat', name: 'CSAT Paper 2' }, { id: 'capf', name: 'CAPF AC' }]
  },
  {
    id: 'defence', name: 'Defence & Police', nameHi: 'रक्षा एवं पुलिस भर्ती',
    desc: 'NDA, CDS, AFCAT, UP Police Constable, Delhi Police', count: '35+ Tests',
    subCategories: [{ id: 'nda', name: 'NDA / NA' }, { id: 'cds', name: 'CDS Exam' }, { id: 'afcat', name: 'AFCAT' }, { id: 'up_police', name: 'UP Police' }]
  },
  {
    id: 'state_exams', name: 'State PSC & Govt', nameHi: 'राज्य स्तरीय परीक्षाएं',
    desc: 'BSSC, UPPSC, BPSC, MPSC, RAS, WBPSC, MP Police', count: '45+ Tests',
    subCategories: [{ id: 'bssc', name: 'Bihar SSC' }, { id: 'uppsc', name: 'UPPSC RO/ARO' }, { id: 'bpsc', name: 'BPSC Prelims' }, { id: 'ras', name: 'RAS Prelims' }]
  },
  {
    id: 'engineering', name: 'Engineering (AE/JE)', nameHi: 'इंजीनियरिंग भर्ती',
    desc: 'SSC JE, RRB JE, State AE/JE Civil, Mech, Electrical', count: '30+ Tests',
    subCategories: [{ id: 'ssc_je_c', name: 'SSC JE Civil' }, { id: 'ssc_je_e', name: 'SSC JE Electrical' }, { id: 'ssc_je_m', name: 'SSC JE Mech' }]
  }
];

const STYLE_MAP: Record<string, { badgeBg: string; iconBg: string; hoverBorder: string; glow: string; btnText: string; gradient: string; Icon: any }> = {
  ssc:       { badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',   iconBg: 'bg-white border border-slate-200/80 shadow-xs text-amber-600',   hoverBorder: 'hover:border-amber-500/50',   glow: 'hover:shadow-[0_12px_28px_-6px_rgba(245,158,11,0.25)]',   btnText: 'group-hover:text-amber-600',   gradient: 'from-amber-500/5',   Icon: Award        },
  railways:  { badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',       iconBg: 'bg-white border border-slate-200/80 shadow-xs text-blue-600',       hoverBorder: 'hover:border-blue-500/50',    glow: 'hover:shadow-[0_12px_28px_-6px_rgba(59,130,246,0.25)]',   btnText: 'group-hover:text-blue-600',    gradient: 'from-blue-500/5',    Icon: TrendingUp   },
  banking:   { badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', iconBg: 'bg-white border border-slate-200/80 shadow-xs text-emerald-600', hoverBorder: 'hover:border-emerald-500/50', glow: 'hover:shadow-[0_12px_28px_-6px_rgba(16,185,129,0.25)]', btnText: 'group-hover:text-emerald-600', gradient: 'from-emerald-500/5', Icon: Coins        },
  teaching:  { badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', iconBg: 'bg-white border border-slate-200/80 shadow-xs text-orange-600', hoverBorder: 'hover:border-orange-500/50', glow: 'hover:shadow-[0_12px_28px_-6px_rgba(249,115,22,0.25)]', btnText: 'group-hover:text-orange-600', gradient: 'from-orange-500/5', Icon: BookOpen     },
  ugc_net:   { badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',       iconBg: 'bg-white border border-slate-200/80 shadow-xs text-cyan-600',       hoverBorder: 'hover:border-cyan-500/50',    glow: 'hover:shadow-[0_12px_28px_-6px_rgba(6,182,212,0.25)]',    btnText: 'group-hover:text-cyan-600',    gradient: 'from-cyan-500/5',    Icon: GraduationCap },
  upsc:      { badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',       iconBg: 'bg-white border border-slate-200/80 shadow-xs text-rose-600',       hoverBorder: 'hover:border-rose-500/50',    glow: 'hover:shadow-[0_12px_28px_-6px_rgba(244,63,94,0.25)]',    btnText: 'group-hover:text-rose-600',    gradient: 'from-rose-500/5',    Icon: ShieldCheck  },
  defence:   { badgeBg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',           iconBg: 'bg-white border border-slate-200/80 shadow-xs text-red-600',           hoverBorder: 'hover:border-red-500/50',     glow: 'hover:shadow-[0_12px_28px_-6px_rgba(239,68,68,0.25)]',    btnText: 'group-hover:text-red-600',     gradient: 'from-red-500/5',     Icon: ShieldCheck  },
  state_exams:{ badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', iconBg: 'bg-white border border-slate-200/80 shadow-xs text-indigo-600', hoverBorder: 'hover:border-indigo-500/50', glow: 'hover:shadow-[0_12px_28px_-6px_rgba(99,102,241,0.25)]', btnText: 'group-hover:text-indigo-600', gradient: 'from-indigo-500/5', Icon: GraduationCap },
  engineering:{ badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', iconBg: 'bg-white border border-slate-200/80 shadow-xs text-purple-600', hoverBorder: 'hover:border-purple-500/50', glow: 'hover:shadow-[0_12px_28px_-6px_rgba(168,85,247,0.25)]', btnText: 'group-hover:text-purple-600', gradient: 'from-purple-500/5', Icon: GraduationCap },
};

const DEFAULT_STYLE = { badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', iconBg: 'bg-white border border-slate-200/80 shadow-xs text-purple-600', hoverBorder: 'hover:border-purple-500/50', glow: 'hover:shadow-[0_12px_28px_-6px_rgba(168,85,247,0.25)]', btnText: 'group-hover:text-purple-600', gradient: 'from-purple-500/5', Icon: GraduationCap };

function getStyle(id: string) {
  const lower = id.toLowerCase();
  for (const [key, val] of Object.entries(STYLE_MAP)) {
    if (lower.includes(key)) return val;
  }
  return DEFAULT_STYLE;
}

interface Props {
  categories?: ExamCategoryItem[];
  language?: 'en' | 'hi';
  title?: string;
  desc?: string;
  exploreText?: string;
}

export default function PopularExamsMarquee({ categories, language = 'en', title, desc, exploreText = 'Explore Tests' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHindi = language === 'hi';

  // Always use default catalog if nothing supplied by admin
  const source = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;
  // Duplicate for seamless infinite loop
  const items = [...source, ...source];

  const manualScroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' });
  };

  return (
    <section className="w-full py-8 md:py-12 relative z-10 border-t border-slate-200 dark:border-slate-800/80">
      {/* ── Header ── */}
      <div className="w-full px-4 sm:px-6 md:px-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {title || (isHindi ? 'लोकप्रिय मॉक टेस्ट सीरीज' : 'Popular Exam Mock Series')}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => manualScroll('left')} aria-label="Scroll left"
              className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-400 transition-all cursor-pointer active:scale-95">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => manualScroll('right')} aria-label="Scroll right"
              className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-400 transition-all cursor-pointer active:scale-95">
              <ChevronRight className="h-4 w-4" />
            </button>
            <Link href="/mock-tests"
              className="hidden sm:inline-flex items-center gap-1 ml-1 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline">
              {isHindi ? 'सभी देखें' : 'View All'} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Marquee wrapper ── */}
      <div className="relative w-full overflow-hidden">
        {/* Edge fades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 sm:w-12 md:w-16 bg-gradient-to-r from-slate-200/90 dark:from-slate-900 to-transparent z-20" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 sm:w-12 md:w-16 bg-gradient-to-l from-slate-200/90 dark:from-slate-900 to-transparent z-20" />

        {/* Animated track – uses global .exam-marquee-track class from globals.css */}
        <div className="py-3 px-0 w-full">
          <div className="exam-marquee-track gap-4 sm:gap-5">
            {items.map((cat, idx) => {
              const s = getStyle(cat.id);
              const Icon = s.Icon;
              const name = isHindi && cat.nameHi ? cat.nameHi : cat.name;

              return (
                <Link
                  key={`${cat.id}-${idx}`}
                  href={`/mock-tests?cat=${cat.id}`}
                  className={`
                    group shrink-0 w-[250px] sm:w-[275px] md:w-[300px]
                    flex flex-col justify-between
                    p-4 sm:p-5 rounded-2xl
                    bg-white dark:bg-slate-900
                    border border-slate-200/90 dark:border-slate-800/90
                    ${s.hoverBorder} ${s.glow}
                    shadow-sm hover:shadow-xl
                    transition-all duration-300 transform-gpu
                    hover:-translate-y-1.5 hover:scale-[1.02]
                    relative overflow-hidden
                    bg-gradient-to-br ${s.gradient} via-transparent to-transparent
                  `}
                >
                  {/* Top: icon + count */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {cat.logoUrl ? (
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <img src={cat.logoUrl} alt={name} className="w-full h-full object-contain" loading="lazy" />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black tracking-wider border ${s.badgeBg} shrink-0`}>
                        {cat.count || '40+ Tests'}
                      </span>
                    </div>

                    <h3 className={`font-black text-sm sm:text-[15px] text-slate-900 dark:text-white leading-tight line-clamp-1 mb-1 transition-colors ${s.btnText}`}>
                      {name}
                    </h3>
                    <p className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-normal line-clamp-2 mb-3">
                      {cat.desc || 'Full CBT Mock Tests, Sectionals & Previous Year Papers'}
                    </p>

                    {/* Sub-category tags */}
                    {cat.subCategories && cat.subCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cat.subCategories.slice(0, 3).map((sub, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9.5px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[110px]">
                            {isHindi && sub.nameHi ? sub.nameHi : sub.name}
                          </span>
                        ))}
                        {cat.subCategories.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-400">
                            +{cat.subCategories.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom CTA */}
                  <div className={`flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 ${s.btnText} transition-colors`}>
                    <span>{exploreText}</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
