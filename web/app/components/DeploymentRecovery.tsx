'use client';

import { useEffect } from 'react';

/**
 * Handles Next.js deployment chunk mismatches (Deployment Skew / ChunkLoadError)
 * Automatically recovers by reloading to fetch the newest build artifacts,
 * while strictly protecting active exam takers from any interruption.
 */
export default function DeploymentRecovery() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isChunkError = (err: any): boolean => {
      if (!err) return false;
      const message = String(err.message || err.reason || err || '');
      const name = String(err.name || '');
      return (
        name === 'ChunkLoadError' ||
        message.includes('Loading chunk') ||
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('CSS chunk') ||
        message.includes('error loading dynamically imported module') ||
        message.includes('Importing a module script failed')
      );
    };

    const handleChunkError = (error: any) => {
      if (!isChunkError(error)) return;

      // 🛡️ CRITICAL SAFETY: Never interrupt an ongoing exam session
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/exam/') && !currentPath.includes('/analysis')) {
        console.warn('[DeploymentRecovery] Chunk error detected during active exam. Reload suppressed for user safety.');
        return;
      }

      // Prevent infinite reload loops (limit to once per 20 seconds)
      const lastReload = parseInt(sessionStorage.getItem('last_chunk_reload') || '0', 10);
      const now = Date.now();
      if (now - lastReload > 20000) {
        sessionStorage.setItem('last_chunk_reload', String(now));
        console.info('[DeploymentRecovery] Stale deployment chunk detected. Reloading to fetch latest assets...');
        window.location.reload();
      }
    };

    const onError = (event: ErrorEvent) => {
      handleChunkError(event.error || event.message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleChunkError(event.reason);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
