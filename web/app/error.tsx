"use client";

import React, { useEffect } from 'react';

// Shown when a page crashes, instead of the blank "Application error" screen.
// Self-contained on purpose: it must work even if the crash came from shared components.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa] dark:bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center text-xl font-bold">!</div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Something went wrong on this page</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">इस पेज पर कुछ गड़बड़ हो गई। कृपया फिर से प्रयास करें।</p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Your test progress and account are safe. Try again, or go back to the home page.
        </p>
        {error?.digest && <p className="mt-2 text-xs text-slate-400">Error code: {error.digest}</p>}
        <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="h-10 px-4 rounded-md bg-[#1e4e79] hover:bg-[#173d61] text-white text-sm font-medium cursor-pointer"
          >
            Try again · फिर से प्रयास करें
          </button>
          {/* a full page load on purpose: it clears whatever state broke the page */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="h-10 px-4 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium inline-flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Home · होम
          </a>
        </div>
      </div>
    </div>
  );
}
