"use client";

import React from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { SiteHeader, SiteFooter, PageTitle, StatusBadge, linkCls, pageBg, container } from './SiteUI';

// Shared layout for policy pages (Terms & Conditions, Privacy Policy):
// site header, title band, "On this page" contents, one document card, contact note, footer.

export interface LegalSection {
  id: string;
  title: string;
  text: string;
  badge?: string;
  /** highlighted sections get a navy left rule (e.g. important notices) */
  highlight?: boolean;
}

export function LegalDocument({
  language, crumb, title, subtitle, lastUpdated, sections, contactTitle, contactText, contactEmail, related,
}: {
  language: 'en' | 'hi';
  crumb: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
  contactTitle: string;
  contactText: string;
  contactEmail: string;
  related: Array<{ href: string; label: string }>;
}) {
  const hi = language === 'hi';
  return (
    <div className={`min-h-screen flex flex-col ${pageBg} font-sans`}>
      <SiteHeader />
      <PageTitle
        crumbs={[{ label: hi ? 'होम' : 'Home', href: '/' }, { label: crumb }]}
        title={title}
        subtitle={subtitle}
      >
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{lastUpdated}</p>
      </PageTitle>

      <main className={`${container} w-full flex-1 py-6 pb-12`}>
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] items-start">
          {/* Contents */}
          <aside className="hidden lg:block lg:sticky lg:top-20">
            <nav className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white">
                {hi ? 'इस पृष्ठ पर' : 'On this page'}
              </div>
              <ol className="py-2">
                {sections.map(sec => (
                  <li key={sec.id}>
                    <a href={`#${sec.id}`} className="block px-4 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-[#1e4e79] dark:hover:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 leading-snug">
                      {sec.title}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#contact" className="block px-4 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-[#1e4e79] dark:hover:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    {contactTitle}
                  </a>
                </li>
              </ol>
            </nav>
          </aside>

          <div className="min-w-0 space-y-6">
            {/* Document */}
            <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800">
              {sections.map(sec => (
                <section
                  key={sec.id}
                  id={sec.id}
                  className={`scroll-mt-20 px-5 sm:px-8 py-6 ${sec.highlight ? 'shadow-[inset_3px_0_0_0_#1e4e79]' : ''}`}
                >
                  <h2 className="text-base sm:text-[17px] font-semibold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                    {sec.title}
                    {sec.badge && <StatusBadge tone={sec.highlight ? 'blue' : 'slate'}>{sec.badge}</StatusBadge>}
                  </h2>
                  <p className="mt-2.5 text-[15px] leading-7 text-slate-600 dark:text-slate-300">{sec.text}</p>
                </section>
              ))}
            </article>

            {/* Contact */}
            <section id="contact" className="scroll-mt-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-5 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="h-9 w-9 rounded-md bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{contactTitle}</h2>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{contactText}</p>
                </div>
              </div>
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-[#1e4e79] hover:bg-[#163c5e] text-white text-sm font-medium transition-colors shrink-0 self-start sm:self-auto"
              >
                <Mail className="h-4 w-4" /> {hi ? 'ईमेल करें' : 'Email us'}
              </a>
            </section>

            {/* Related pages */}
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {hi ? 'संबंधित पृष्ठ:' : 'Related:'}{' '}
              {related.map((r, i) => (
                <React.Fragment key={r.href}>
                  {i > 0 && <span className="mx-1.5 text-slate-300 dark:text-slate-600">|</span>}
                  <Link href={r.href} className={linkCls}>{r.label}</Link>
                </React.Fragment>
              ))}
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
