/**
 * MathJaxText.tsx — Shared, permanently-fixed MathJax rendering component.
 *
 * WHY THIS EXISTS:
 * The previous approach had two bugs that caused math symbols (sqrt, fractions,
 * powers, etc.) to show as raw LaTeX text:
 *
 *   1. Race condition: MathJax library loaded before its config was in window.MathJax,
 *      so it started with no delimiters configured. Fixed in layout.tsx by using
 *      strategy="beforeInteractive" for the config script.
 *
 *   2. Wrong readiness check: Components polled for `MathJax.typesetPromise` existing,
 *      but that function can exist even when MathJax hasn't finished applying its config.
 *      This component instead awaits `MathJax.startup.promise` which only resolves AFTER
 *      MathJax has fully initialized with its configuration (delimiters, packages, etc.).
 *
 * USAGE:
 *   import MathJaxText from '@/app/lib/MathJaxText';
 *   <MathJaxText content={processQuestionHtml(text)} />
 *   <MathJaxText component="div" className="markup-content" content={html} />
 */

'use client';

import React, { useEffect, useRef } from 'react';

type AllowedComponents = 'span' | 'div' | 'p' | 'h3';

interface MathJaxTextProps {
  /** HTML string to render. May contain LaTeX delimiters like \( ... \) or $...$. */
  content: string;
  className?: string;
  /** The HTML element to render as. Defaults to 'span'. */
  component?: AllowedComponents;
}

const MathJaxText = React.memo(
  ({ content, className, component: Component = 'span' }: MathJaxTextProps) => {
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
      let active = true;
      let pollTimeoutId: ReturnType<typeof setTimeout> | null = null;

      /**
       * Runs MathJax typesetting on the container element.
       *
       * Uses MathJax.startup.promise to ensure MathJax has fully initialized
       * with its config (delimiters, packages) before attempting to typeset.
       * Simply checking for `MathJax.typesetPromise` existing is NOT enough —
       * the library can be partially loaded with no config applied yet.
       */
      const runTypeset = async (mjax: any) => {
        if (!containerRef.current || !active) return;
        try {
          // Wait for full MathJax initialization (config applied, packages loaded)
          if (mjax.startup?.promise) {
            await mjax.startup.promise;
          }
          if (!containerRef.current || !active) return;
          // Clear any previous typesetting on this element before re-running
          mjax.typesetClear([containerRef.current]);
          await mjax.typesetPromise([containerRef.current]);
        } catch (err) {
          // Suppress abort errors from rapid content switching
          if (active) {
            console.warn('MathJax typeset error:', err);
          }
        }
      };

      /**
       * Polls until the MathJax CDN script has loaded into window, then delegates
       * to runTypeset() which handles the startup.promise sequencing internally.
       *
       * This handles the case where content changes before the CDN has loaded.
       */
      const waitAndTypeset = () => {
        if (!active) return;
        const mjax = (window as any).MathJax;
        if (mjax?.typesetPromise) {
          runTypeset(mjax);
        } else {
          // CDN not yet loaded — retry in 150ms
          pollTimeoutId = setTimeout(waitAndTypeset, 150);
        }
      };

      waitAndTypeset();

      return () => {
        // Cancel pending work on unmount or before next content update
        active = false;
        if (pollTimeoutId) clearTimeout(pollTimeoutId);
      };
    }, [content]);

    return (
      <Component
        ref={containerRef as any}
        className={className}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
);

MathJaxText.displayName = 'MathJaxText';

export default MathJaxText;
