'use client';

import Link from 'next/link';
import { Home, RefreshCw, AlertCircle } from 'lucide-react';

export default function NotFound() {
  const handleReload = () => {
    // Force a fresh reload from server bypass cache
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="max-w-md w-full text-center bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-6">
        <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Page Not Found</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            The page you are looking for might have been updated or moved. If an update was just released, refreshing will load the latest version.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={handleReload}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh to Latest Version
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs px-5 py-3 rounded-xl transition"
          >
            <Home className="h-4 w-4" />
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
