// IMPORTANT: This config MUST run before mathjax@3 CDN script loads.
// layout.tsx loads this with strategy="beforeInteractive" to guarantee ordering.
window.MathJax = {
  tex: {
    inlineMath: [['\\(', '\\)'], ['$', '$']],
    displayMath: [['\\[', '\\]'], ['$$', '$$']],
    processEscapes: true,
    packages: {'[+]': ['ams', 'boldsymbol', 'color']},
    macros: {
      rupee: '{\\text{₹}}',
      Rs: '{\\text{₹}}',
      inr: '{\\text{₹}}',
      dollar: '{\\text{\\$}}',
      euro: '{\\text{€}}',
      pound: '{\\text{£}}',
      yen: '{\\text{¥}}',
      cent: '{\\text{¢}}',
      celsius: '{\\text{°C}}',
      fahrenheit: '{\\text{°F}}',
      degree: '{^{\\circ}}',
    }
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
    ignoreHtmlClass: 'no-math',
    processHtmlClass: 'math-tex'
  },
  loader: {
    load: ['[tex]/ams', '[tex]/boldsymbol', '[tex]/color']
  },
  startup: {
    // Do NOT auto-typeset on page load — React components handle typesetting
    typeset: false,
    // This callback fires after MathJax has fully initialized with this config.
    // MathJax.startup.promise resolves after this runs, so components can safely
    // call typesetPromise() once startup.promise resolves.
    ready() {
      MathJax.startup.defaultReady();
    }
  }
};
