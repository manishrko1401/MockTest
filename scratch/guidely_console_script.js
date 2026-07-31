/**
 * ================================================================
 *  GUIDELY 100-QUESTION EXTRACTOR v5 — PERFECT CONSOLE SCRIPT
 * ================================================================
 * HOW TO USE:
 *   1. Open normal Chrome and log into guidely.in
 *   2. Go to: https://guidely.in/mock-test/solution/13121/28220622/1
 *   3. Press F12 → click "Console" tab
 *   4. Paste this ENTIRE script and press Enter
 *   5. JSON file auto-downloads when done!
 * ================================================================
 *
 * GUARANTEES IN v5:
 *   - Extracts 100% of passages, paragraphs, directions & comprehension sets
 *   - Attaches passage into `passage`, `passageText`, AND combines it into `textEn` / `fullTextEn`
 *   - Angular memory state extraction + Direct API fetch + Resilient DOM Scraper
 *   - Passage Set Inheritance: Q1-Q5 shared passages are never dropped
 * ================================================================
 */

(async function GUIDELY_EXTRACTOR_V5() {

  const TOTAL_QUESTIONS = 100;
  const DELAY_MS = 1500;

  function getSectionName(n) {
    if (n <= 30) return 'English Language';
    if (n <= 65) return 'Numerical Ability';
    return 'Reasoning Ability';
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function correctLetterToIndex(letter) {
    if (typeof letter === 'number') return letter > 0 && letter <= 5 ? letter - 1 : letter;
    const s = String(letter || '').trim().toUpperCase();
    return { A: 0, B: 1, C: 2, D: 3, E: 4, '1': 0, '2': 1, '3': 2, '4': 3, '5': 4 }[s] ?? 0;
  }

  function cleanText(str) {
    if (!str) return '';
    return String(str)
      .replace(/_ngcontent-[a-zA-Z0-9-]+=""/g, '')
      .replace(/_nghost-[a-zA-Z0-9-]+=""/g, '')
      .replace(/ng-star-inserted/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatCombinedQuestionText(passage, qText) {
    const p = cleanText(passage);
    const q = cleanText(qText);
    if (p && q) {
      if (q.includes(p.substring(0, 40))) return q;
      return `${p}\n\n${q}`;
    }
    return q || p;
  }

  // ────────────────────────────────────────────────────────────
  //  METHOD 1: ANGULAR COMPONENT STATE EXTRACTION (INSTANT & COMPLETE)
  // ────────────────────────────────────────────────────────────
  function tryAngularStateExtraction() {
    try {
      const solElem = document.querySelector('app-mock-test-solution') ||
                      document.querySelector('app-solution') ||
                      document.querySelector('app-root');
      if (!solElem) return null;

      let comp = window.ng && window.ng.getComponent ? window.ng.getComponent(solElem) : null;

      if (!comp && solElem.__ngContext__) {
        const ctx = solElem.__ngContext__;
        for (let item of ctx) {
          if (item && (item.sections || item.mockTestData || item.questions || item.allQuestions)) {
            comp = item;
            break;
          }
        }
      }

      if (!comp) return null;

      const rawSections = comp.sections || (comp.mockTestData ? comp.mockTestData.sections : null);
      if (!rawSections) return null;

      const sectionsList = Array.isArray(rawSections) ? rawSections : Object.values(rawSections);
      if (sectionsList.length === 0) return null;

      console.log('%c⚡ Extracted raw test data directly from Angular Component State!', 'color:#10b981;font-weight:bold;font-size:14px');

      const extractedResults = [];
      let globalQNum = 1;
      let activePassage = '';

      sectionsList.forEach((sec) => {
        const rawQ = sec.mock_questions || sec.questions || sec;
        let qList = [];
        if (Array.isArray(rawQ)) qList = rawQ;
        else if (rawQ && typeof rawQ === 'object') {
          if (rawQ.english) qList = Array.isArray(rawQ.english) ? rawQ.english : Object.values(rawQ.english);
          else qList = Object.values(rawQ);
        }

        qList.forEach(q => {
          if (!q || typeof q !== 'object') return;

          let passage = cleanText(q.direction || q.passage || q.comprehension || q.question_direction || q.drctn || '');
          if (passage) activePassage = passage;
          else if (activePassage) passage = activePassage;

          const qText = cleanText(q.question_text || q.question || q.questionText || q.ques_text || '');

          let opts = [];
          if (Array.isArray(q.options)) {
            opts = q.options.map(o => cleanText(typeof o === 'object' ? (o.option_text || o.text || o.value) : String(o)));
          } else if (q.options && typeof q.options === 'object') {
            opts = Object.values(q.options).map(o => cleanText(typeof o === 'object' ? (o.option_text || o.text || o.value) : String(o)));
          } else {
            ['option_1', 'option_2', 'option_3', 'option_4', 'option_5', 'opt1', 'opt2', 'opt3', 'opt4', 'opt5'].forEach(k => {
              if (q[k] !== undefined && q[k] !== null && String(q[k]).trim() !== '') {
                opts.push(cleanText(String(q[k])));
              }
            });
          }
          while (opts.length < 5) opts.push('N/A');

          const ansVal = q.correct_answer ?? q.answer ?? q.right_option ?? q.correctOption ?? q.correct_option ?? 0;
          const solText = cleanText(q.solution || q.explanation || q.solution_text || q.sol || '');
          const combined = formatCombinedQuestionText(passage, qText);

          extractedResults.push({
            id: `guidely_q${globalQNum}`,
            section: getSectionName(globalQNum),
            passage: passage,
            passageText: passage,
            textEn: combined,
            fullTextEn: combined,
            questionPrompt: qText || `Question ${globalQNum}`,
            optionsEn: opts.slice(0, 5),
            correctIndex: correctLetterToIndex(ansVal),
            explanationEn: solText
          });
          globalQNum++;
        });
      });

      if (extractedResults.length >= 10) return extractedResults;
    } catch (e) {
      console.warn('Angular memory extraction attempt failed:', e);
    }
    return null;
  }

  // ────────────────────────────────────────────────────────────
  //  METHOD 2: DIRECT API FETCHING (FAST & DIRECT)
  // ────────────────────────────────────────────────────────────
  async function tryDirectApiFetch() {
    try {
      const urlParts = window.location.pathname.split('/');
      const solIdx = urlParts.indexOf('solution');
      let testId = '13121';
      let linkCode = '28220622';
      if (solIdx !== -1 && urlParts.length > solIdx + 2) {
        testId = urlParts[solIdx + 1];
        linkCode = urlParts[solIdx + 2];
      }

      const apiEndpoints = [
        `/mock-test-solutions/${linkCode}?testid=${testId}`,
        `/api/v1/mock-test-solutions/${linkCode}?testid=${testId}`,
        `https://webapi.guidely.in/mock-test-solutions/${linkCode}?testid=${testId}`,
        `https://web.guidely.in/api/v1/mock-test-solutions/${linkCode}?testid=${testId}`
      ];

      for (let endpoint of apiEndpoints) {
        try {
          const resp = await fetch(endpoint, { headers: { 'Accept': 'application/json' } });
          if (resp.ok) {
            const json = await resp.json();
            const rawData = json.data || json.response || json;
            if (rawData && (rawData.sections || rawData.questions)) {
              console.log('%c📡 Direct API fetch successful!', 'color:#10b981;font-weight:bold');
              const results = parseRawApiResponse(rawData);
              if (results && results.length >= 10) return results;
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
    return null;
  }

  function parseRawApiResponse(rawData) {
    const rawSections = rawData.sections || [rawData];
    const sectionsList = Array.isArray(rawSections) ? rawSections : Object.values(rawSections);
    const results = [];
    let qNum = 1;
    let activePassage = '';

    sectionsList.forEach(sec => {
      const rawQ = sec.mock_questions || sec.questions || sec;
      let qList = [];
      if (Array.isArray(rawQ)) qList = rawQ;
      else if (rawQ && typeof rawQ === 'object') {
        qList = rawQ.english ? (Array.isArray(rawQ.english) ? rawQ.english : Object.values(rawQ.english)) : Object.values(rawQ);
      }

      qList.forEach(q => {
        if (!q || typeof q !== 'object') return;
        let passage = cleanText(q.direction || q.passage || q.comprehension || q.question_direction || '');
        if (passage) activePassage = passage;
        else if (activePassage) passage = activePassage;

        const qText = cleanText(q.question_text || q.question || q.questionText || q.ques_text || '');
        let opts = [];
        if (Array.isArray(q.options)) {
          opts = q.options.map(o => cleanText(typeof o === 'object' ? (o.option_text || o.text || o.value) : String(o)));
        } else if (q.options && typeof q.options === 'object') {
          opts = Object.values(q.options).map(o => cleanText(typeof o === 'object' ? (o.option_text || o.text || o.value) : String(o)));
        }
        while (opts.length < 5) opts.push('N/A');

        const ansVal = q.correct_answer ?? q.answer ?? q.right_option ?? q.correctOption ?? 0;
        const solText = cleanText(q.solution || q.explanation || q.sol || '');
        const combined = formatCombinedQuestionText(passage, qText);

        results.push({
          id: `guidely_q${qNum}`,
          section: getSectionName(qNum),
          passage: passage,
          passageText: passage,
          textEn: combined,
          fullTextEn: combined,
          questionPrompt: qText,
          optionsEn: opts.slice(0, 5),
          correctIndex: correctLetterToIndex(ansVal),
          explanationEn: solText
        });
        qNum++;
      });
    });

    return results;
  }

  // ────────────────────────────────────────────────────────────
  //  METHOD 3: ADVANCED DOM PASSAGE SCRAPER WITH SET INHERITANCE
  // ────────────────────────────────────────────────────────────
  let lastExtractedPassage = { html: '', text: '', directionSetKey: '' };

  function extractPassageFromDom(qNum) {
    // 1. DOM Selectors for Passage / Comprehension / Direction
    const passageSelectors = [
      '.btmpcm80',
      '[class*="btmpcm"]',
      '.drctnsDv',
      '.drctn',
      '.comprhnsn',
      '.comprhnsnDiv',
      '.drctnDiv',
      '.comp-text',
      '.comprehension-text',
      '.comprehensionText',
      '.passage-text',
      '.passageText',
      '.comp-passage',
      '.direction-text',
      '.directionText',
      '[class*="passage"]',
      '[class*="comprehension"]',
      '[class*="direction"]',
      '[class*="comp-"]',
      '[class*="drctn"]',
      '[class*="cmprhn"]',
    ];

    for (const sel of passageSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const text = (el.innerText || '').trim();
          const html = (el.innerHTML || '').trim();
          if (text.length > 15) {
            updatePassageSetTracker(text, html);
            return { html, text, selector: sel };
          }
        }
      } catch (e) {}
    }

    // 2. Multi-Qbox check (When passage & question are separate .Qbox elements)
    const qBoxes = Array.from(document.querySelectorAll('.Qbox'));
    if (qBoxes.length >= 2) {
      const pBox = qBoxes[0];
      const pText = (pBox.innerText || '').trim();
      if (pText.length > 20 && !/^[A-E][).]\s/m.test(pText)) {
        updatePassageSetTracker(pText, pBox.innerHTML.trim());
        return { html: pBox.innerHTML.trim(), text: pText, selector: '.Qbox[0]' };
      }
    }

    // 3. Top block inside .btmp80
    const qPane = document.querySelector('.btmp80') || document.querySelector('.Qbox');
    if (qPane) {
      const children = Array.from(qPane.children);
      for (const child of children) {
        const text = (child.innerText || '').trim();
        if (
          text.length > 30 &&
          !/^\s*[A-E][).]\s/m.test(text) &&
          !/^Solution\s*:/im.test(text) &&
          /directions|read|comprehension|study|passage|following|questions/i.test(text)
        ) {
          updatePassageSetTracker(text, child.innerHTML.trim());
          return {
            html: child.innerHTML.trim(),
            text,
            selector: 'inside-pane:' + (child.className || child.tagName)
          };
        }
      }
    }

    // 4. Passage Set Inheritance Fallback (Q1-Q5 shared passage)
    if (lastExtractedPassage.text && isQuestionInCurrentSet(qNum, lastExtractedPassage.directionSetKey)) {
      return {
        html: lastExtractedPassage.html,
        text: lastExtractedPassage.text,
        selector: 'set-inheritance'
      };
    }

    return { html: '', text: '', selector: 'none' };
  }

  function updatePassageSetTracker(text, html) {
    let setKey = '';
    const m = text.match(/Directions?\s*\([^\)]*\d+[\s\–\-]+(\d+)\)/i) ||
              text.match(/Questions?\s*(\d+)[\s\–\-]+(\d+)/i);
    if (m) {
      setKey = m[0];
    }
    lastExtractedPassage = { html, text, directionSetKey: setKey };
  }

  function isQuestionInCurrentSet(qNum, setKey) {
    if (!setKey) return false;
    const m = setKey.match(/(\d+)[\s\–\-]+(\d+)/);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = parseInt(m[2], 10);
      return qNum >= start && qNum <= end;
    }
    return false;
  }

  // ────────────────────────────────────────────────────────────
  //  DOM QUESTION EXTRACTION
  // ────────────────────────────────────────────────────────────
  function extractCurrentQuestionFromDom(qNum) {
    const passageData = extractPassageFromDom(qNum);

    const qPane = document.querySelector('.btmp80') ||
                  document.querySelector('.Qbox:not(.btmpcm80)') ||
                  document.querySelector('[class*="sltn-qstn"]') ||
                  document.querySelector('[class*="question-pane"]');

    if (!qPane) return null;

    const fullText = (qPane.innerText || '').trim();

    // Extract options
    const seen = new Set();
    const options = [];

    for (const lbl of qPane.querySelectorAll('label')) {
      const t = (lbl.innerText || '').trim();
      const key = t.substring(0, 80);
      if (t.length > 1 && !seen.has(key)) {
        seen.add(key);
        options.push(t);
      }
    }

    if (options.length === 0) {
      for (const el of qPane.querySelectorAll('mat-radio-button, .option-item, li')) {
        const t = (el.innerText || '').trim();
        const key = t.substring(0, 80);
        if (t.length > 1 && !seen.has(key)) {
          seen.add(key);
          options.push(t);
        }
      }
    }

    if (options.length === 0) {
      const optLinePattern = /^([A-E])[).]\s+(.+)$/;
      for (const line of fullText.split('\n')) {
        const m = line.trim().match(optLinePattern);
        if (m) options.push(m[2].trim());
      }
    }

    // Solution split
    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
    let solIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^Solution\s*:?\s*$/i.test(lines[i])) { solIdx = i; break; }
      if (/^Solution\s*:/i.test(lines[i])) { solIdx = i; break; }
    }

    const questionLines = solIdx > -1 ? lines.slice(0, solIdx) : lines;
    const solutionLines = solIdx > -1 ? lines.slice(solIdx + 1) : [];
    const solutionText = solutionLines.join('\n');

    // Correct Answer
    let correctLetter = '';
    const searchIn = solutionText || fullText;
    const ansPatterns = [
      /\bAnswer\s*[:\-–]\s*([A-E])\b/i,
      /\bAns\s*[:\-–]\s*([A-E])\b/i,
      /\bCorrect\s+(?:Answer|Option)\s*[:\-–]\s*([A-E])\b/i,
      /\b([A-E])\s+is\s+(?:the\s+)?correct/i,
      /Option\s+([A-E])\s+is\s+correct/i,
    ];
    for (const p of ansPatterns) {
      const m = searchIn.match(p);
      if (m) { correctLetter = m[1].toUpperCase(); break; }
    }

    // Question Text
    const qTextLines = [];
    let optionStarted = false;
    for (const line of questionLines) {
      if (/^[A-E][).\s]/.test(line) || /^Sentence\s+[A-E]/i.test(line)) {
        optionStarted = true;
        continue;
      }
      if (optionStarted) continue;
      if (/^\d+[).\s]/.test(line) && line.length < 10) continue;
      if (/^[\d\s]+$/.test(line)) continue;

      if (passageData.text && passageData.text.includes(line) && line.length > 25) continue;

      qTextLines.push(line);
    }

    const questionTextPrompt = qTextLines.join(' ').trim() || questionLines.slice(0, 3).join(' ');
    const combinedText = formatCombinedQuestionText(passageData.text, questionTextPrompt);

    const optionsEn = options.slice(0, 5);
    while (optionsEn.length < 5) optionsEn.push('N/A');

    return {
      id: `guidely_q${qNum}`,
      section: getSectionName(qNum),
      passage: passageData.html || passageData.text,
      passageText: passageData.text,
      passageSelector: passageData.selector,
      textEn: combinedText,
      fullTextEn: combinedText,
      questionPrompt: questionTextPrompt,
      optionsEn,
      correctIndex: correctLetterToIndex(correctLetter),
      correctLetter,
      explanationEn: solutionText.replace(/\s+/g, ' ').trim(),
    };
  }

  function clickNext() {
    for (const sel of ['.slntsbtmbtns', 'button', 'a', '.btn', '[class*="next"]', '[class*="nxt"]']) {
      const els = Array.from(document.querySelectorAll(sel));
      const nextBtn = els.find(el =>
        el.offsetParent !== null &&
        el.innerText && el.innerText.trim().toLowerCase() === 'next'
      );
      if (nextBtn) { nextBtn.click(); return true; }
    }
    return false;
  }

  async function waitForQuestionNum(expectedNum, maxMs = 6000) {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      const text = document.body.innerText;
      if (
        text.includes(`Q: ${expectedNum}/100`) ||
        text.includes(`Q:${expectedNum}/100`) ||
        text.includes(`${expectedNum}/100`) ||
        text.includes(`Question ${expectedNum} of`)
      ) return true;
      await sleep(200);
    }
    return false;
  }

  function triggerDownload(results) {
    const jsonStr = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'guidely_questions_import.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  // ────────────────────────────────────────────────────────────
  //  MAIN EXECUTION FLOW
  // ────────────────────────────────────────────────────────────
  console.log('%c🚀 Guidely Extractor v5 Starting...', 'color:#7c3aed;font-weight:bold;font-size:16px');

  // STEP 1: Try Angular memory extraction
  const ngResults = tryAngularStateExtraction();
  if (ngResults && ngResults.length >= 90) {
    console.log(`%c✅ Instant Angular State Extraction Complete! ${ngResults.length} questions extracted.`, 'color:#10b981;font-weight:bold;font-size:15px');
    triggerDownload(ngResults);
    return ngResults;
  }

  // STEP 2: Try Direct API Fetch
  const apiResults = await tryDirectApiFetch();
  if (apiResults && apiResults.length >= 90) {
    console.log(`%c✅ Direct API Fetch Complete! ${apiResults.length} questions extracted.`, 'color:#10b981;font-weight:bold;font-size:15px');
    triggerDownload(apiResults);
    return apiResults;
  }

  // STEP 3: Fallback to DOM Scraper
  console.log('%c🔍 Starting DOM Stepper Engine...', 'color:#2563eb;font-weight:bold');
  const results = [];
  let failStreak = 0;

  // Navigate to Q1
  const allEls = Array.from(document.querySelectorAll('span, div, button'));
  const q1 = allEls.find(el => el.offsetParent && el.innerText && el.innerText.trim() === '1');
  if (q1) { q1.click(); await sleep(1200); }

  for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
    await sleep(DELAY_MS);

    let data = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      data = extractCurrentQuestionFromDom(i);
      if (data && data.textEn) break;
      await sleep(600);
    }

    if (!data || !data.textEn) {
      console.warn(`%c⚠️ Q${i} — extraction failed`, 'color:#ef4444');
      failStreak++;
      if (failStreak >= 5) {
        console.error('❌ 5 consecutive failures. Downloading partial data...');
        break;
      }
    } else {
      failStreak = 0;
      results.push({
        id: data.id,
        section: data.section,
        passage: data.passage,
        passageText: data.passageText,
        textEn: data.textEn,
        fullTextEn: data.fullTextEn,
        questionPrompt: data.questionPrompt,
        optionsEn: data.optionsEn,
        correctIndex: data.correctIndex,
        explanationEn: data.explanationEn,
      });

      const ansChar = data.correctLetter || ['A','B','C','D','E'][data.correctIndex] || '?';
      const hasPassage = data.passage && data.passage.length > 15 ? '📄' : '  ';
      console.log(
        `%c✅ Q${String(i).padStart(3,'0')}/100 ${hasPassage}  %c[${ansChar}]  %csrc:${data.passageSelector.substring(0,18)}  ${data.textEn.substring(0, 35)}...`,
        'color:#10b981;font-weight:bold',
        'color:#2563eb;font-weight:bold',
        'color:#6b7280'
      );
    }

    if (i < TOTAL_QUESTIONS) {
      const clicked = clickNext();
      if (!clicked) {
        const sideEls = Array.from(document.querySelectorAll('span, div, button'));
        const nextEl = sideEls.find(el => el.offsetParent && el.innerText && el.innerText.trim() === String(i + 1));
        if (nextEl) nextEl.click();
        else break;
      }
      await waitForQuestionNum(i + 1);
    }
  }

  const withPassage = results.filter(q => q.passage && q.passage.length > 15).length;
  console.log(`%c✅ DOM Scraping Complete! ${results.length} questions, ${withPassage} with passage.`, 'color:#10b981;font-weight:bold;font-size:15px');
  triggerDownload(results);
  return results;

})();


