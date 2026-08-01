/**
 * ================================================================
 *  ADDA247 100-QUESTION PERFECT EXTRACTOR (CLEAN & COMPLETE)
 * ================================================================
 * HOW TO USE:
 *   1. Open Chrome and go to your completed mock test on Adda247:
 *      https://www.adda247.com/test-series-portal/1054004/110157/COMPLETED/NICL%20Assistants%20Prelims%202026%20Full%20Mock%20Test%20-01?fixedMockResult=true&isTestPass=true
 *   2. Press F12 → click "Console" tab
 *   3. Paste this ENTIRE script and press Enter
 *   4. JSON file auto-downloads with 100 clean questions!
 * ================================================================
 */

(async function ADDA247_CLEAN_EXTRACTOR() {

  const TOTAL_QUESTIONS = 100;
  const DELAY_MS = 1200;

  function getSectionName(n) {
    if (n <= 30) return 'English Language';
    if (n <= 65) return 'Numerical Ability';
    return 'Reasoning Ability';
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function cleanHtmlOrText(html) {
    if (!html) return '';
    let str = String(html);
    // Remove unwanted angular/react attributes
    str = str.replace(/_ngcontent-[a-zA-Z0-9-]+=""/g, '')
             .replace(/class="[^"]*"/g, '')
             .replace(/id="[^"]*"/g, '');
    // If it's pure HTML, convert to clean readable text if no tags needed, or preserve clean math/tags
    const temp = document.createElement('div');
    temp.innerHTML = str;

    // Remove buttons, timers, badges inside text if any
    temp.querySelectorAll('button, .timer, .marks, .re-attempt, .report-error, script, style').forEach(el => el.remove());

    return temp.innerText ? temp.innerText.trim() : str.trim();
  }

  function correctLetterToIndex(letter) {
    if (typeof letter === 'number') return letter >= 0 && letter <= 4 ? letter : (letter > 0 ? letter - 1 : 0);
    const s = String(letter || '').trim().toUpperCase();
    return { A: 0, B: 1, C: 2, D: 3, E: 4, '1': 0, '2': 1, '3': 2, '4': 3, '5': 4 }[s] ?? 0;
  }

  // ────────────────────────────────────────────────────────────
  //  METHOD 1: DIRECT AUTHENTICATED API FETCH (BEST & CLEANEST)
  // ────────────────────────────────────────────────────────────
  async function tryDirectApiFetch() {
    try {
      const pathname = window.location.pathname;
      const parts = pathname.split('/');
      // Format: /test-series-portal/{packageId}/{mockId}/COMPLETED/...
      let packageId = '1054004';
      let mockId = '110157';

      const portalIdx = parts.indexOf('test-series-portal');
      if (portalIdx !== -1 && parts.length > portalIdx + 2) {
        packageId = parts[portalIdx + 1];
        mockId = parts[portalIdx + 2];
      }

      const endpoints = [
        `/api/v1/test-series-portal/${packageId}/${mockId}`,
        `/api/v1/mock-test-solution/${mockId}`,
        `/api/v1/mock-test-questions/${mockId}`,
        `https://store.adda247.com/api/v1/mock-test-solutions/${mockId}`,
        `https://store.adda247.com/api/v1/test-series/${packageId}/mock/${mockId}`
      ];

      const authToken = localStorage.getItem('token') || localStorage.getItem('auth_token') || sessionStorage.getItem('token') || '';

      for (const ep of endpoints) {
        try {
          const headers = { 'Accept': 'application/json, text/plain, */*' };
          if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

          const resp = await fetch(ep, { headers });
          if (resp.ok) {
            const json = await resp.json();
            const parsed = parseRawApiResponse(json);
            if (parsed && parsed.length >= 90) {
              console.log('%c📡 Direct API fetch successful!', 'color:#10b981;font-weight:bold;font-size:14px');
              return parsed;
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
    return null;
  }

  function parseRawApiResponse(rawData) {
    const data = rawData.data || rawData.response || rawData.result || rawData;
    const questionsList = data.questions || data.testQuestions || data.questionList || [];
    if (!Array.isArray(questionsList) || questionsList.length === 0) return null;

    const results = [];
    questionsList.forEach((q, idx) => {
      const qNum = idx + 1;
      const passage = cleanHtmlOrText(q.passage || q.comprehension || q.direction || '');
      const qPrompt = cleanHtmlOrText(q.question || q.questionText || q.prompt || q.question_text || '');

      let opts = [];
      if (Array.isArray(q.options)) {
        opts = q.options.map(o => cleanHtmlOrText(typeof o === 'object' ? (o.text || o.option || o.value) : String(o)));
      } else if (q.options && typeof q.options === 'object') {
        opts = Object.values(q.options).map(o => cleanHtmlOrText(typeof o === 'object' ? (o.text || o.option || o.value) : String(o)));
      }
      while (opts.length < 5) opts.push('N/A');

      const ansVal = q.correctOption ?? q.answer ?? q.rightOption ?? q.correctIndex ?? 0;
      const solText = cleanHtmlOrText(q.solution || q.explanation || q.solutionText || '');
      const combined = passage ? `${passage}\n\n${qPrompt}` : qPrompt;

      results.push({
        id: `adda247_q${qNum}`,
        section: getSectionName(qNum),
        passage: passage,
        passageText: passage,
        textEn: combined,
        fullTextEn: combined,
        questionPrompt: qPrompt || `Question ${qNum}`,
        optionsEn: opts.slice(0, 5),
        correctIndex: correctLetterToIndex(ansVal),
        explanationEn: solText
      });
    });

    return results;
  }

  // ────────────────────────────────────────────────────────────
  //  METHOD 2: REACT / REDUX STORE EXTRACTION (IN-MEMORY DATA)
  // ────────────────────────────────────────────────────────────
  function tryReactReduxStateExtraction() {
    try {
      let store = window.store || window.__store__ || window.__REDUX_STORE__;

      if (!store) {
        const root = document.querySelector('#app') || document.querySelector('#test-portal') || document.body;
        for (const k in root) {
          if (k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$')) {
            let curr = root[k];
            let depth = 0;
            while (curr && depth < 100) {
              if (curr.memoizedProps && curr.memoizedProps.store && typeof curr.memoizedProps.store.getState === 'function') {
                store = curr.memoizedProps.store;
                break;
              }
              if (curr.stateNode && curr.stateNode.store && typeof curr.stateNode.store.getState === 'function') {
                store = curr.stateNode.store;
                break;
              }
              curr = curr.return;
              depth++;
            }
          }
        }
      }

      const state = store ? store.getState() : window.INITIAL_STATE;
      if (!state) return null;

      // Check state slices
      const psychData = state.psychTestSeriesData || state.test_portal || state.mockTest;
      if (psychData) {
        const rawQ = psychData.testData || psychData.questions || (psychData.averageAndUserTestData ? psychData.averageAndUserTestData.questionData : null);
        if (rawQ) {
          const parsed = parseRawApiResponse({ questions: rawQ });
          if (parsed && parsed.length >= 90) {
            console.log('%c⚡ Extracted raw questions from React/Redux Store!', 'color:#10b981;font-weight:bold;font-size:14px');
            return parsed;
          }
        }
      }
    } catch (e) {}
    return null;
  }

  // ────────────────────────────────────────────────────────────
  //  METHOD 3: STRICT TARGETED DOM SCRAPER (EXCLUDES ALL JUNK)
  // ────────────────────────────────────────────────────────────
  let lastPassage = '';

  function extractCleanQuestionFromDom(qNum) {
    // 1. Passage / Reading Comprehension
    let passage = '';
    const passageElem = document.querySelector('.passage-container, .comprehension-text, .direction-text, [class*="passage-content"], [class*="comprehension"]');
    if (passageElem) {
      passage = cleanHtmlOrText(passageElem.innerText);
      if (passage) lastPassage = passage;
    } else {
      passage = lastPassage;
    }

    // 2. Question Prompt (Target ONLY question text element, excluding marks/timer/buttons)
    let qPrompt = '';
    const promptElem = document.querySelector('.question-text, .ques-text, .question-prompt, [class*="questionText"], [class*="ques-body"]');
    if (promptElem) {
      // Clone element to sanitize UI children
      const clone = promptElem.cloneNode(true);
      clone.querySelectorAll('.marks, .timer, button, .re-attempt, .report-issue, [class*="header"]').forEach(el => el.remove());
      qPrompt = cleanHtmlOrText(clone.innerText);
    }

    // 3. Options List (Target ONLY option choice texts)
    const options = [];
    const optionElems = document.querySelectorAll('.option-item, .option-text, [class*="option-container"] label, [class*="optionText"]');

    optionElems.forEach(el => {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('input, radio, .option-letter, span.badge').forEach(e => e.remove());
      let optTxt = cleanHtmlOrText(clone.innerText);
      // Strip leading (A), A., A)
      optTxt = optTxt.replace(/^[A-E][).]\s*/i, '').trim();
      if (optTxt && !options.includes(optTxt)) {
        options.push(optTxt);
      }
    });

    while (options.length < 5) options.push('N/A');

    // 4. Correct Option Index
    let correctIdx = 0;
    const correctElem = document.querySelector('.option-item.correct, .correct-option, [class*="correct-ans"], [class*="isCorrect"]');
    if (correctElem) {
      const txt = cleanHtmlOrText(correctElem.innerText).replace(/^[A-E][).]\s*/i, '').trim();
      const foundIdx = options.findIndex(o => o === txt || txt.includes(o));
      if (foundIdx !== -1) correctIdx = foundIdx;
    }

    // 5. Solution Explanation (Target ONLY solution text)
    let solution = '';
    const solElem = document.querySelector('.solution-container, .explanation-box, [class*="solution-desc"], [class*="explanation-text"]');
    if (solElem) {
      const clone = solElem.cloneNode(true);
      clone.querySelectorAll('button, .video-sol, [class*="header"]').forEach(e => e.remove());
      solution = cleanHtmlOrText(clone.innerText);
    }

    const combined = passage ? `${passage}\n\n${qPrompt}` : qPrompt;

    return {
      id: `adda247_q${qNum}`,
      section: getSectionName(qNum),
      passage: passage,
      passageText: passage,
      textEn: combined,
      fullTextEn: combined,
      questionPrompt: qPrompt || `Question ${qNum}`,
      optionsEn: options.slice(0, 5),
      correctIndex: correctIdx,
      explanationEn: solution
    };
  }

  function clickNext() {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const nextBtn = btns.find(b => b.offsetParent !== null && /next|nxt|>/i.test(b.innerText || ''));
    if (nextBtn) { nextBtn.click(); return true; }
    return false;
  }

  function clickPalette(qNum) {
    const items = Array.from(document.querySelectorAll('.palette-item, .q-num, [class*="palette"] span, button'));
    const target = items.find(el => el.offsetParent !== null && el.innerText && el.innerText.trim() === String(qNum));
    if (target) { target.click(); return true; }
    return false;
  }

  function triggerDownload(results) {
    const jsonStr = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'adda247_nicl_mock_01_clean.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  // ────────────────────────────────────────────────────────────
  //  MAIN EXECUTION
  // ────────────────────────────────────────────────────────────
  console.log('%c🚀 Adda247 Clean Extractor v2 Starting...', 'color:#7c3aed;font-weight:bold;font-size:16px');

  // STEP 1: Direct API fetch
  const apiResults = await tryDirectApiFetch();
  if (apiResults && apiResults.length >= 90) {
    console.log(`%c✅ Direct API Extraction Complete! ${apiResults.length} questions extracted cleanly.`, 'color:#10b981;font-weight:bold;font-size:15px');
    triggerDownload(apiResults);
    return apiResults;
  }

  // STEP 2: React / Redux store state
  const reduxResults = tryReactReduxStateExtraction();
  if (reduxResults && reduxResults.length >= 90) {
    console.log(`%c✅ React/Redux Memory Extraction Complete! ${reduxResults.length} questions extracted cleanly.`, 'color:#10b981;font-weight:bold;font-size:15px');
    triggerDownload(reduxResults);
    return reduxResults;
  }

  // STEP 3: Targeted DOM Scraper
  console.log('%c🔍 Starting Strict Targeted DOM Scraper...', 'color:#2563eb;font-weight:bold');
  const results = [];

  clickPalette(1);
  await sleep(1000);

  for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
    clickPalette(i);
    await sleep(DELAY_MS);

    // Expand solution
    const viewSolBtn = Array.from(document.querySelectorAll('button, a')).find(el =>
      el.offsetParent !== null && /view solution|explanation/i.test(el.innerText || '')
    );
    if (viewSolBtn) { viewSolBtn.click(); await sleep(300); }

    const item = extractCleanQuestionFromDom(i);
    results.push(item);

    console.log(
      `%c✅ Q${String(i).padStart(3,'0')}/100 [%c${item.section}%c] Opt:${item.correctIndex} Prompt: ${item.questionPrompt.substring(0,30)}...`,
      'color:#10b981;font-weight:bold',
      'color:#2563eb;font-weight:bold',
      'color:#6b7280'
    );

    if (i < TOTAL_QUESTIONS) {
      if (!clickNext()) clickPalette(i + 1);
    }
  }

  console.log(`%c🎉 Extraction Complete! ${results.length} clean questions. Downloading...`, 'color:#10b981;font-weight:bold;font-size:15px');
  triggerDownload(results);
  return results;

})();
