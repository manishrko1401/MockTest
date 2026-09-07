import Script from "next/script";

/**
 * PERF: MathJax (config + ~250KB CDN library) used to load in the root layout,
 * meaning every single page paid for it — including the homepage, typing tests,
 * notices, auth — none of which render any math. Only pages that actually show
 * question content with LaTeX (exam-taking, analysis, practice-series, the admin
 * test-analysis modal) need this. MathJaxText.tsx already polls for
 * window.MathJax rather than assuming it's preloaded, so mounting this only on
 * the pages that need it is a drop-in change with no race condition.
 */
export default function MathJaxLoader() {
  return (
    <>
      {/* MathJax config MUST load before the MathJax library. */}
      <Script src="/mathjax-config.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" strategy="afterInteractive" />
    </>
  );
}
