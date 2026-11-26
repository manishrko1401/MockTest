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

      // 🛡️ CRITICAL SAFETY: Never interrupt an ongoing exam or typing test session
      const currentPath = window.location.pathname;
      if (
        currentPath.includes('/typing-test') ||
        (currentPath.startsWith('/exam/') && !currentPath.includes('/analysis'))
      ) {
        console.warn('[DeploymentRecovery] Chunk error detected during active exam or typing test. Reload suppressed for user safety.');
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

    // Vercel Security Checkpoint: the firewall can answer a background request with its
    // "verifying your browser" page (403 HTML, x-vercel-mitigated) instead of data. A fetch
    // can't pass that check; a page load does it by itself. Seen on the friends room page,
    // which polls every few seconds (friends on the same Wi-Fi share one IP): the lobby never
    // moved on, Start failed and the exam showed "Test Uploaded Soon".
    const origFetch = window.fetch;
    const actionOf = (body: unknown) => {
      try { return typeof body === 'string' ? String(JSON.parse(body)?.action || '') : ''; } catch { return ''; }
    };
    const handleCheckpoint = (action: string) => {
      const path = window.location.pathname;
      // Mid-exam a reload is not safe; only before the questions have loaded
      const inExam = path.includes('/typing-test') || (path.startsWith('/exam/') && !path.includes('/analysis'));
      if (inExam && action !== 'get-custom-questions' && action !== 'test-access') return;
      const last = parseInt(sessionStorage.getItem('last_checkpoint_reload') || '0', 10);
      if (Date.now() - last < 30000) return;
      sessionStorage.setItem('last_checkpoint_reload', String(Date.now()));
      console.info('[DeploymentRecovery] Request was held by the security checkpoint. Reloading to verify the browser...');
      window.location.reload();
    };
    const patchedFetch: typeof window.fetch = async (input, init) => {
      const res = await origFetch(input, init);
      try {
        if (res.status === 403 && res.headers.get('x-vercel-mitigated')) {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
          if (new URL(url, window.location.href).origin === window.location.origin) handleCheckpoint(actionOf(init?.body));
        }
      } catch { /* never break the request itself */ }
      return res;
    };
    window.fetch = patchedFetch;

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      if (window.fetch === patchedFetch) window.fetch = origFetch;
    };
  }, []);

  return null;
}
