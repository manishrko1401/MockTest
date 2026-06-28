window.MathJax = {
  tex: {
    inlineMath: [['\\(', '\\)'], ['$', '$']],
    displayMath: [['\\[', '\\]'], ['$$', '$$']],
    processEscapes: true
  },
  startup: {
    typeset: true,
    ready: function () {
      MathJax.startup.defaultReady();

      // Auto-typeset newly added DOM content (for React SPA navigation)
      var timeout;
      var observer = new MutationObserver(function (mutations) {
        var hasNewMath = false;
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var node = added[j];
            if (node.nodeType === 1) {
              // Skip MathJax's own output elements
              var tag = node.tagName.toLowerCase();
              if (tag.startsWith('mjx-') || (node.classList && node.classList.contains('MathJax'))) {
                continue;
              }
              var text = node.textContent || '';
              if (text.indexOf('\\(') !== -1 || text.indexOf('\\[') !== -1 || text.indexOf('$') !== -1 || text.indexOf('\\frac') !== -1) {
                hasNewMath = true;
                break;
              }
            }
          }
          if (hasNewMath) break;
        }

        if (hasNewMath) {
          clearTimeout(timeout);
          timeout = setTimeout(function () {
            MathJax.typesetPromise().catch(function (err) {
              console.warn('MathJax auto-typeset error:', err);
            });
          }, 150);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
};
