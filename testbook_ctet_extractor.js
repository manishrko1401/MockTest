/**
 * =========================================================================================
 *  TESTBOOK CTET ALL-TESTS AUTOMATED JSON EXTRACTOR & IMPORTER CONVERTER
 * =========================================================================================
 * 
 * HOW TO USE IN BROWSER (CHROME / EDGE):
 * 1. Open your browser and go to your CTET Test Series on Testbook:
 *    https://testbook.com/ctet/test-series/my  (or any Testbook test series page)
 * 2. Make sure you are logged in to your Testbook account.
 * 3. Press F12 (or right-click -> Inspect) and click on the "Console" tab.
 * 4. Paste this ENTIRE script into the console and press Enter.
 * 5. The script will automatically scan all tests in the series, fetch their questions 
 *    and solutions, format them into website-import JSON format, and save each test 
 *    as a separate JSON file named EXACTLY after the test title (e.g. "CTET Paper 2 Full Test 1.json").
 * =========================================================================================
 */

(async function extractAllTestbookTests() {
  console.log("%c🚀 Testbook CTET All-Tests Extractor Started...", "color: #2563eb; font-size: 16px; font-weight: bold;");

  // Helper to decode HTML entities
  function decodeHtmlEntities(text) {
    if (!text) return "";
    let decoded = String(text);
    let prev;
    for (let i = 0; i < 3; i++) {
      prev = decoded;
      decoded = decoded
        .replace(/\\u0026/g, '&')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&deg;/g, '°')
        .replace(/&sup1;/g, '¹')
        .replace(/&sup2;/g, '²')
        .replace(/&sup3;/g, '³')
        .replace(/&times;/g, '×')
        .replace(/&divide;/g, '÷')
        .replace(/&plusmn;/g, '±')
        .replace(/&pi;/g, 'π')
        .replace(/&theta;/g, 'θ')
        .replace(/&alpha;/g, 'α')
        .replace(/&beta;/g, 'β')
        .replace(/&gamma;/g, 'γ')
        .replace(/&lambda;/g, 'λ')
        .replace(/&mu;/g, 'μ')
        .replace(/&radic;/g, '√')
        .replace(/&infin;/g, '∞')
        .replace(/&ne;/g, '≠')
        .replace(/&le;/g, '≤')
        .replace(/&ge;/g, '≥')
        .replace(/&there4;/g, '∴')
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&rdquo;/g, '"')
        .replace(/&ldquo;/g, '"')
        .replace(/&ndash;/g, '–')
        .replace(/&mdash;/g, '—')
        .replace(/&hellip;/g, '…');
      if (decoded === prev) break;
    }
    return decoded;
  }

  // Helper to clean HTML markup & normalize colors
  function cleanHtml(text) {
    if (!text) return "";
    let cleaned = decodeHtmlEntities(text);
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    cleaned = cleaned.replace(/\\\\+/g, '\\');
    cleaned = cleaned.replace(/color:\s*rgb\(33,\s*37,\s*41\);?/gi, '');
    cleaned = cleaned.replace(/color:\s*rgb\(68,\s*68,\s*68\);?/gi, '');
    return cleaned.trim();
  }

  // Helper to sanitize filename
  function sanitizeFilename(name) {
    if (!name) return "CTET_Test";
    return name
      .replace(/[\\/:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Helper to download JSON file in browser
  function downloadJson(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Extract auth token if available
  function getAuthToken() {
    return localStorage.getItem('token') || 
           localStorage.getItem('auth_token') || 
           localStorage.getItem('tb_auth_token') || 
           sessionStorage.getItem('token') || '';
  }

  // 1. Convert Raw Testbook Questions & Solutions into Website Import JSON format
  function convertRawTestbookDataToWebsiteFormat(questionsData, solutionsData) {
    const solutionsMap = {};
    if (solutionsData) {
      const solData = solutionsData.data || solutionsData.response || solutionsData;
      if (solData && typeof solData === 'object') {
        for (const qId in solData) {
          const entry = solData[qId];
          if (!entry) continue;
          let correctIndex = 0;
          if (entry.correctOption !== undefined) {
            const val = parseInt(entry.correctOption, 10);
            correctIndex = val > 0 ? val - 1 : 0;
          } else if (entry.correctOptionIndex !== undefined) {
            correctIndex = parseInt(entry.correctOptionIndex, 10);
          }

          let expEn = "";
          let expHi = "";
          if (entry.sol) {
            if (entry.sol.en) expEn = entry.sol.en.value || entry.sol.en.explanation || entry.sol.en.solution || "";
            if (entry.sol.hn) expHi = entry.sol.hn.value || entry.sol.hn.explanation || entry.sol.hn.solution || "";
            else if (entry.sol.hi) expHi = entry.sol.hi.value || entry.sol.hi.explanation || entry.sol.hi.solution || "";
          }

          solutionsMap[qId] = {
            correctIndex,
            explanationEn: cleanHtml(expEn),
            explanationHi: cleanHtml(expHi)
          };
        }
      }
    }

    function findSections(obj) {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.sections && Array.isArray(obj.sections)) return obj.sections;
      if (obj.questions && Array.isArray(obj.questions)) return [{ name: "General Studies", questions: obj.questions }];
      for (const key in obj) {
        const found = findSections(obj[key]);
        if (found) return found;
      }
      return null;
    }

    const root = questionsData.data || questionsData.response || questionsData;
    const sections = findSections(root);
    if (!sections) return null;

    const formattedQuestions = [];

    sections.forEach((sec, sIdx) => {
      const sectionName = sec.name || sec.title || `Section ${sIdx + 1}`;
      const questionsList = sec.questions || [];

      questionsList.forEach((q, qIdx) => {
        const rawTextEn = q.en ? (q.en.value || "") : "";
        const rawTextHi = q.hn ? (q.hn.value || "") : "";
        const cleanTextEn = cleanHtml(rawTextEn);
        const cleanTextHi = cleanHtml(rawTextHi);

        const rawCompEn = q.en ? (q.en.comp || q.en.comprehension || q.en.passage || "") : (q.comp || q.comprehension || q.passage || "");
        const rawCompHi = q.hn ? (q.hn.comp || q.hn.comprehension || q.hn.passage || "") : (q.compHi || q.comprehensionHi || q.passageHi || rawCompEn);
        const cleanCompEn = cleanHtml(rawCompEn);
        const cleanCompHi = cleanHtml(rawCompHi);

        let fullTextEn = cleanTextEn;
        let fullTextHi = cleanTextHi || cleanTextEn;

        if (cleanCompEn) {
          fullTextEn = `<div class="comprehension-box mb-5 p-5 md:p-6 bg-blue-50/70 dark:bg-slate-900/90 border-2 border-blue-200/80 dark:border-slate-700 rounded-2xl text-sm md:text-base font-medium leading-relaxed text-slate-900 dark:text-slate-100 shadow-sm" style="font-size: 15px; line-height: 1.75;"><div class="flex items-center gap-2 mb-3 pb-2 border-b border-blue-200/80 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400"><span>📖 Passage / Directions</span></div>${cleanCompEn}</div>${cleanTextEn}`;
        }
        if (cleanCompHi || cleanCompEn) {
          const compHiContent = cleanCompHi || cleanCompEn;
          fullTextHi = `<div class="comprehension-box mb-5 p-5 md:p-6 bg-blue-50/70 dark:bg-slate-900/90 border-2 border-blue-200/80 dark:border-slate-700 rounded-2xl text-sm md:text-base font-medium leading-relaxed text-slate-900 dark:text-slate-100 shadow-sm" style="font-size: 15px; line-height: 1.75;"><div class="flex items-center gap-2 mb-3 pb-2 border-b border-blue-200/80 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400"><span>📖 निर्देश / गद्यांश</span></div>${compHiContent}</div>${cleanTextHi || cleanTextEn}`;
        }

        let imageUrlEn = "";
        let imageUrlHi = "";
        const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;

        const imgMatchEn = rawTextEn.match(imgRegex);
        if (imgMatchEn) {
          imageUrlEn = imgMatchEn[1];
          if (imageUrlEn.startsWith('//')) imageUrlEn = 'https:' + imageUrlEn;
        }
        const imgMatchHi = rawTextHi.match(imgRegex);
        if (imgMatchHi) {
          imageUrlHi = imgMatchHi[1];
          if (imageUrlHi.startsWith('//')) imageUrlHi = 'https:' + imageUrlHi;
        }

        let optionsEnList = [];
        let optionsHiList = [];

        if (q.en && Array.isArray(q.en.options)) {
          optionsEnList = q.en.options.map(opt => cleanHtml(opt.value || ""));
        }
        if (q.hn && Array.isArray(q.hn.options)) {
          optionsHiList = q.hn.options.map(opt => cleanHtml(opt.value || ""));
        }

        while (optionsEnList.length < 2) {
          optionsEnList.push(`Option ${optionsEnList.length + 1}`);
        }
        while (optionsHiList.length < optionsEnList.length) {
          optionsHiList.push(optionsEnList[optionsHiList.length] || `Option ${optionsHiList.length + 1}`);
        }

        let correctIndex = 0;
        let explanationEn = "";
        let explanationHi = "";

        const qId = q._id;
        if (solutionsMap[qId]) {
          correctIndex = solutionsMap[qId].correctIndex;
          explanationEn = solutionsMap[qId].explanationEn;
          explanationHi = solutionsMap[qId].explanationHi;
        } else {
          if (q.answers && Array.isArray(q.answers) && q.answers.length > 0) {
            correctIndex = parseInt(q.answers[0], 10) - 1;
          } else if (q.correctOptionIndex !== undefined) {
            correctIndex = parseInt(q.correctOptionIndex, 10);
          } else if (q.correctOption !== undefined) {
            const val = parseInt(q.correctOption, 10);
            correctIndex = val > 0 ? val - 1 : 0;
          }

          let rawExpEn = q.solution || q.explanation || q.solDesc || q.solutionDesc || "";
          let rawExpHi = q.solutionHi || q.explanationHi || q.solDescHi || "";
          if (!rawExpEn && q.en) rawExpEn = q.en.solution || q.en.explanation || q.en.solDesc || "";
          if (!rawExpHi && q.hn) rawExpHi = q.hn.solution || q.hn.explanation || q.hn.solDesc || "";

          explanationEn = cleanHtml(rawExpEn);
          explanationHi = cleanHtml(rawExpHi);
        }

        if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= optionsEnList.length) {
          correctIndex = 0;
        }

        formattedQuestions.push({
          textEn: fullTextEn || `Question ${qIdx + 1}`,
          textHi: fullTextHi || fullTextEn || `Question ${qIdx + 1}`,
          optionsEn: optionsEnList,
          optionsHi: optionsHiList,
          correctIndex: correctIndex,
          explanationEn: explanationEn || "",
          explanationHi: explanationHi || explanationEn || "",
          comprehensionEn: cleanCompEn || undefined,
          comprehensionHi: cleanCompHi || undefined,
          imageUrlEn: imageUrlEn || undefined,
          imageUrlHi: imageUrlHi || undefined,
          section: sectionName
        });
      });
    });

    return formattedQuestions;
  }

  // 2. Discover tests from Testbook DOM page elements or Next.js state
  function discoverTestsFromPage() {
    const tests = [];
    const seenIds = new Set();

    // Check DOM links & cards
    const cardElements = document.querySelectorAll('[data-test-id], [data-test-name], a[href*="/test-paper/"], a[href*="/test-series/"], .test-card, .paper-card');
    cardElements.forEach(el => {
      const testId = el.getAttribute('data-test-id') || el.getAttribute('data-id') || (el.href ? el.href.split('/').pop() : null);
      let title = el.getAttribute('data-test-name') || el.innerText || el.textContent;
      if (title) {
        title = title.split('\n')[0].trim();
      }

      if (testId && testId.length >= 8 && !seenIds.has(testId)) {
        seenIds.add(testId);
        tests.push({ id: testId, title: title || `Test ${tests.length + 1}` });
      }
    });

    // Check window state (__NEXT_DATA__)
    if (window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.pageProps) {
      const pageProps = window.__NEXT_DATA__.props.pageProps;
      function extractFromProps(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
          obj.forEach(item => extractFromProps(item));
        } else {
          if (obj._id && (obj.title || obj.name) && (obj.totalQuestions || obj.questionsCount || obj.sections)) {
            const id = obj._id;
            const title = obj.title || obj.name;
            if (!seenIds.has(id)) {
              seenIds.add(id);
              tests.push({ id, title });
            }
          }
          for (const key in obj) {
            if (typeof obj[key] === 'object') extractFromProps(obj[key]);
          }
        }
      }
      extractFromProps(pageProps);
    }

    return tests;
  }

  // 3. Fetch Questions & Solutions via API for a specific Test ID
  async function fetchTestDetails(testId) {
    const token = getAuthToken();
    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let qData = null;
    let sData = null;

    const qEndpoints = [
      `https://api.testbook.com/api/v2/test-paper/${testId}`,
      `https://api.testbook.com/api/v1/test-paper/${testId}`,
      `/api/v2/test-paper/${testId}`,
      `/api/v1/test-paper/${testId}`
    ];

    const sEndpoints = [
      `https://api.testbook.com/api/v2/test-paper/${testId}/solutions`,
      `https://api.testbook.com/api/v1/test-paper/${testId}/solutions`,
      `/api/v2/test-paper/${testId}/solutions`,
      `/api/v1/test-paper/${testId}/solutions`
    ];

    for (const ep of qEndpoints) {
      try {
        const resp = await fetch(ep, { headers });
        if (resp.ok) {
          const json = await resp.json();
          if (json && (json.data || json.response || json.sections)) {
            qData = json;
            break;
          }
        }
      } catch (e) {}
    }

    for (const ep of sEndpoints) {
      try {
        const resp = await fetch(ep, { headers });
        if (resp.ok) {
          const json = await resp.json();
          if (json && (json.data || json.response || typeof json === 'object')) {
            sData = json;
            break;
          }
        }
      } catch (e) {}
    }

    return { qData, sData };
  }

  // Run Discovery & Extraction loop
  const discoveredTests = discoverTestsFromPage();
  console.log(`🔍 Discovered ${discoveredTests.length} tests on the current Testbook page.`);

  if (discoveredTests.length === 0) {
    console.warn("⚠️ No test cards automatically found in DOM! Attempting fallback scan...");
  }

  let extractedCount = 0;

  for (let i = 0; i < discoveredTests.length; i++) {
    const test = discoveredTests[i];
    const testTitle = sanitizeFilename(test.title);
    console.log(`[${i + 1}/${discoveredTests.length}] 📥 Extracting: "${testTitle}" (ID: ${test.id})...`);

    const { qData, sData } = await fetchTestDetails(test.id);

    if (qData) {
      const formattedQuestions = convertRawTestbookDataToWebsiteFormat(qData, sData);
      if (formattedQuestions && formattedQuestions.length > 0) {
        const filename = `${testTitle}.json`;
        downloadJson(formattedQuestions, filename);
        console.log(`%c  ✔ Saved "${filename}" (${formattedQuestions.length} questions)`, "color: #10b981; font-weight: bold;");
        extractedCount++;
      } else {
        console.warn(`  ⚠️ Could not format questions for "${testTitle}"`);
      }
    } else {
      console.warn(`  ❌ API response missing for "${testTitle}"`);
    }

    await sleep(800); // Friendly pause between downloads
  }

  console.log(`\n%c🎉 COMPLETED! Successfully extracted ${extractedCount} tests!`, "color: #10b981; font-size: 16px; font-weight: bold;");

})();
