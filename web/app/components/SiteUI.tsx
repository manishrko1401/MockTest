"use client";

/**
 * Shared site chrome + UI primitives.
 * One header and one set of building blocks used by every main page
 * (home, test series, typing tests, notices, document locker, profile)
 * so the whole site looks like a single product.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Trophy, Moon, Sun, Menu, X, ChevronDown, ChevronRight, LayoutDashboard, LogOut, User, Eye, EyeOff, Compass } from 'lucide-react';
import { requestTourStart } from './WelcomeTour';
import { useAuth } from '../AuthContext';
import { TRANSLATIONS } from '../translations';

// ───── Design tokens ─────
export const btnPrimary = 'inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-[#1e4e79] hover:bg-[#163c5e] text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';
export const btnSecondary = 'inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#eef3f8] hover:border-[#1e4e79]/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors cursor-pointer';
export const inputCls = 'w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1e4e79] focus:ring-2 focus:ring-[#1e4e79]/15 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-slate-900 transition';
export const linkCls = 'text-[#1e4e79] dark:text-blue-400 hover:underline';
export const pageBg = 'bg-[#f5f7fa] dark:bg-slate-950 text-slate-800 dark:text-slate-100';
export const container = 'max-w-7xl mx-auto px-4 sm:px-6';

// ───── Header ─────
const NAV = [
  { href: '/', en: 'Home', hi: 'होम' },
  { href: '/mock-tests', en: 'Test Series', hi: 'टेस्ट सीरीज़' },
  { href: '/typing-test', en: 'Typing Tests', hi: 'टाइपिंग टेस्ट' },
  { href: '/updates', en: 'Notices', hi: 'सूचनाएं' },
  { href: '/locker', en: 'Document Locker', hi: 'दस्तावेज़ लॉकर' },
];

const TOUR_ANCHORS: Record<string, string> = {
  '/mock-tests': 'nav-tests',
  '/typing-test': 'nav-typing',
  '/updates': 'nav-notices',
  '/locker': 'nav-locker',
};

export function SiteHeader({ fluid = false }: { fluid?: boolean } = {}) {
  const { currentUser, theme, toggleTheme, language, setLanguage, logout } = useAuth();
  const t = TRANSLATIONS[language];
  const hi = language === 'hi';
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const user = mounted ? currentUser : null;
  const isStaff = !!user && ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(user.role);
  const initials = (user?.name || '').split(' ').filter(Boolean).map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/') || (href === '/typing-test' && pathname.startsWith('/typing-test'));

  const startTour = () => {
    setMenuOpen(false);
    setMobileOpen(false);
    if (pathname === '/') requestTourStart();
    else router.push('/?tour=1');
  };

  const signOut = () => {
    setMenuOpen(false);
    setMobileOpen(false);
    router.push('/');
    setTimeout(() => logout(), 100);
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800" suppressHydrationWarning>
      <div className={`${fluid ? 'px-4 sm:px-6' : container} h-14 flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0 -ml-2 px-2 py-1 rounded-md transition-colors hover:bg-[#eef3f8] dark:hover:bg-slate-800" title={t.backToHome}>
            <div className="bg-[#E6F4FE] dark:bg-slate-800 rounded-md flex items-center justify-center h-8 w-8 border border-blue-200 dark:border-slate-700">
              <Trophy className="h-4 w-4 text-blue-700 dark:text-blue-400" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-sm text-slate-900 dark:text-white">{t.logoTitle}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">{t.logoSub}</p>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 text-sm">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                data-tour={TOUR_ANCHORS[item.href]}
                className={`px-3 py-1.5 rounded-md transition-colors duration-150 ${
                  isActive(item.href)
                    ? 'text-[#1e4e79] dark:text-blue-300 font-medium bg-[#e3ecf5] dark:bg-blue-400/15 hover:bg-[#d6e3f0] dark:hover:bg-blue-400/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {hi ? item.hi : item.en}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            suppressHydrationWarning
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="hidden sm:block h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer transition-colors hover:bg-[#eef3f8] hover:border-[#1e4e79]/40 dark:hover:bg-slate-800 dark:hover:border-slate-600"
            aria-label="Language"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>
          <button
            suppressHydrationWarning
            onClick={toggleTheme}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white hover:border-[#1e4e79]/40 dark:hover:border-slate-600 cursor-pointer"
            title={theme === 'light' ? t.themeDark : t.themeLight}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(v => !v)}
                data-tour="account"
                className={`flex items-center gap-2 h-8 pl-1 pr-2 rounded-md transition-colors cursor-pointer ${menuOpen ? 'bg-[#eef3f8] dark:bg-slate-800' : 'hover:bg-[#eef3f8] dark:hover:bg-slate-800'}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="h-7 w-7 rounded-full bg-[#1e4e79] text-white text-[11px] font-semibold flex items-center justify-center">{initials}</span>
                <span className="hidden md:block text-sm text-slate-700 dark:text-slate-200 max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
                <ChevronDown className="hidden md:block h-3.5 w-3.5 text-slate-400" />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg py-1 text-sm">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Link href="/profile" role="menuitem" className="flex items-center gap-2 mx-1 px-2 py-2 rounded-md text-slate-700 dark:text-slate-200 transition-colors hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white">
                    <User className="h-4 w-4 text-slate-400" />{hi ? 'मेरा खाता' : 'My account'}
                  </Link>
                  {isStaff && (
                    <Link href="/admin" role="menuitem" className="flex items-center gap-2 mx-1 px-2 py-2 rounded-md text-slate-700 dark:text-slate-200 transition-colors hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white">
                      <LayoutDashboard className="h-4 w-4 text-slate-400" />{t.navAdmin}
                    </Link>
                  )}
                  <button type="button" role="menuitem" onClick={startTour} className="w-[calc(100%-0.5rem)] flex items-center gap-2 mx-1 px-2 py-2 rounded-md text-left text-slate-700 dark:text-slate-200 transition-colors hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer">
                    <Compass className="h-4 w-4 text-slate-400" />{hi ? 'टूर देखें' : 'Take the tour'}
                  </button>
                  <button type="button" role="menuitem" onClick={signOut} className="w-[calc(100%-0.5rem)] flex items-center gap-2 mx-1 px-2 py-2 rounded-md text-left text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer">
                    <LogOut className="h-4 w-4" />{t.signOut}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className={`${btnPrimary} h-8 px-3 text-xs`}>{hi ? 'लॉग इन' : 'Login'}</Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(v => !v)}
            data-tour="mobile-menu"
            className={`lg:hidden h-8 w-8 flex items-center justify-center rounded-md border transition-colors cursor-pointer ${mobileOpen ? 'bg-[#eef3f8] border-[#1e4e79]/40 text-[#1e4e79] dark:bg-slate-800 dark:border-slate-600 dark:text-white' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white hover:border-[#1e4e79]/40'}`}
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <nav className={`${fluid ? 'px-4 sm:px-6' : container} py-2 flex flex-col text-sm`}>
            {NAV.map(item => (
              <Link key={item.href} href={item.href} className={`px-3 py-2.5 rounded-md transition-colors ${isActive(item.href) ? 'text-[#1e4e79] dark:text-blue-300 font-medium bg-[#e3ecf5] dark:bg-blue-400/15' : 'text-slate-700 dark:text-slate-300 hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white'}`}>
                {hi ? item.hi : item.en}
              </Link>
            ))}
            {user && (
              <button type="button" onClick={startTour} className="px-3 py-2.5 rounded-md text-left transition-colors text-slate-700 dark:text-slate-300 hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer">
                {hi ? 'टूर देखें' : 'Take the tour'}
              </button>
            )}
            {isStaff && <Link href="/admin" className="px-3 py-2.5 rounded-md transition-colors text-slate-700 dark:text-slate-300 hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white">{t.navAdmin}</Link>}
            <div className="flex items-center gap-2 px-3 pt-3 pb-1 mt-1 border-t border-slate-100 dark:border-slate-800">
              <select
                suppressHydrationWarning
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
                className="h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 outline-none transition-colors hover:bg-[#eef3f8] dark:hover:bg-slate-800"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
              </select>
              <button onClick={toggleTheme} className={`${btnSecondary} h-8 px-3 text-xs`}>
                {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                {theme === 'light' ? (hi ? 'डार्क' : 'Dark') : (hi ? 'लाइट' : 'Light')}
              </button>
              {user && (
                <button onClick={signOut} className="ml-auto h-8 px-3 rounded-md text-xs font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer">{t.signOut}</button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

// ───── Page title band (breadcrumb + title + optional actions) ─────
export function PageTitle({
  crumbs, title, subtitle, actions, children,
}: {
  crumbs?: Array<{ label: string; href?: string }>;
  title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className="bg-transparent">
      <div className={`${container} pt-6 pb-1`}>
        {crumbs && crumbs.length > 0 && (
          <nav className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 flex-wrap">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {c.href ? <Link href={c.href} className="hover:text-slate-800 dark:hover:text-slate-200">{c.label}</Link> : <span className="text-slate-700 dark:text-slate-300">{c.label}</span>}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-3xl">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

// ───── Section card ─────
export function SectionCard({
  title, description, action, footer, children, bodyClass = 'px-5 sm:px-6 py-5', className = '',
}: {
  title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode;
  footer?: React.ReactNode; children: React.ReactNode; bodyClass?: string; className?: string;
}) {
  return (
    <section className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg ${className}`}>
      {(title || action) && (
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h2>
            {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
          </div>
          {action && <div className="shrink-0 self-start sm:self-auto">{action}</div>}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
      {footer && (
        <div className="px-5 sm:px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 rounded-b-lg flex flex-wrap items-center justify-end gap-2">
          {footer}
        </div>
      )}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}

export function PasswordInput({
  value, onChange, show, onToggle, placeholder, autoComplete,
}: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder?: string; autoComplete?: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputCls} pr-10`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function StatusBadge({ tone, children }: { tone: 'green' | 'blue' | 'amber' | 'red' | 'slate'; children: React.ReactNode }) {
  const tones = {
    green: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/40 dark:text-green-400 dark:ring-green-500/30',
    blue: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-500/30',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/30',
    red: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-500/30',
    slate: 'bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600/40',
  } as const;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

// ───── Footer ─────
export function SiteFooter() {
  const { language } = useAuth();
  const hi = language === 'hi';
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-auto">
      <div className={`${container} py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400`}>
        <p>© 2026 MockTest Hub. {hi ? 'सर्वाधिकार सुरक्षित।' : 'All rights reserved.'}</p>
        <div className="flex items-center gap-5">
          <Link href="/contact" className="hover:text-slate-800 dark:hover:text-slate-200">{hi ? 'संपर्क करें' : 'Contact'}</Link>
          <Link href="/terms" className="hover:text-slate-800 dark:hover:text-slate-200">{hi ? 'नियम और शर्तें' : 'Terms'}</Link>
          <Link href="/privacy" className="hover:text-slate-800 dark:hover:text-slate-200">{hi ? 'गोपनीयता नीति' : 'Privacy'}</Link>
        </div>
      </div>
    </footer>
  );
}
