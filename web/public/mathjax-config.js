window.MathJax = {
  tex: {
    inlineMath: [['\\(', '\\)'], ['$', '$']],
    displayMath: [['\\[', '\\]'], ['$$', '$$']],
    processEscapes: true,
    packages: {'[+]': ['ams', 'boldsymbol', 'color']},
    macros: {
      rupee: '{\\text{₹}}',
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
    typeset: false
  }
};
