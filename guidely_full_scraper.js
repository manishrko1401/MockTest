/**
 * Guidely Perfect 100-Question Scraper
 * Fully defensive against Object vs Array structures across all Guidely response types.
 */
(async function scrapeGuidely100Questions() {
  console.log("%c🚀 Guidely 100-Question Perfect Scraper Started...", "color: #3476bb; font-size: 16px; font-weight: bold;");

  const urlParts = window.location.pathname.split('/');
  const solIdx = urlParts.indexOf('solution');
  let testId = '13121';
  let linkCode = '28220622';

  if (solIdx !== -1 && urlParts.length > solIdx + 2) {
    testId = urlParts[solIdx + 1];
    linkCode = urlParts[solIdx + 2];
  }

  let rawData = null;

  // 1. Direct API Fetch
  try {
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
          if (json && (json.sections || json.data || json.response)) {
            rawData = json.data || json.response || json;
            console.log("✅ API Fetch Successful!");
            break;
          }
        }
      } catch (e) {}
    }
  } catch (err) {}

  // 2. Angular Memory Fallback
  if (!rawData || (!rawData.sections && !rawData.mock_questions)) {
    try {
      const solElem = document.querySelector('app-mock-test-solution') || document.querySelector('app-root');
      let comp = window.ng && window.ng.getComponent ? window.ng.getComponent(solElem) : null;
      
      if (!comp && solElem && solElem.__ngContext__) {
        const ctx = solElem.__ngContext__;
        for (let item of ctx) {
          if (item && (item.sections || item.mockTestData)) {
            comp = item;
            break;
          }
        }
      }

      if (comp) {
        rawData = {
          sections: comp.sections || (comp.mockTestData ? comp.mockTestData.sections : null),
          selectedLang: comp.selectedLang || 'english'
        };
        console.log("✅ Extracted raw data from Angular Component State!");
      }
    } catch (e) {}
  }

  const allQuestions = [];

  function cleanText(str) {
    if (!str) return "";
    return String(str)
      .replace(/_ngcontent-serverapp-c\d+=""/g, '')
      .replace(/ng-star-inserted/g, '')
      .trim();
  }

  // Ensure sections is an Array
  let sectionsList = [];
  if (rawData && rawData.sections) {
    sectionsList = Array.isArray(rawData.sections) ? rawData.sections : Object.values(rawData.sections);
  }

  // 3. Process Sections and Questions
  if (sectionsList.length > 0) {
    const lang = (rawData && rawData.selectedLang) || 'english';

    sectionsList.forEach((sec, sIdx) => {
      const secName = sec.name || sec.section_name || `Section ${sIdx + 1}`;
      
      // Safely resolve questions container (Array or Object)
      let rawQ = null;
      if (sec.mock_questions) {
        rawQ = sec.mock_questions[lang] || sec.mock_questions['english'] || sec.mock_questions['hindi'] || sec.mock_questions;
      } else if (sec.questions) {
        rawQ = sec.questions;
      }

      let qList = [];
      if (Array.isArray(rawQ)) {
        qList = rawQ;
      } else if (rawQ && typeof rawQ === 'object') {
        qList = Object.values(rawQ);
      }

      console.log(`📌 Section "${secName}": Processing ${qList.length} question(s)...`);

      qList.forEach(q => {
        if (!q || typeof q !== 'object') return;

        const passage = cleanText(q.direction || q.passage || q.comprehension || q.question_direction || "");
        const qText = cleanText(q.question_text || q.question || q.questionText || q.ques_text || "");

        let fullText = "";
        if (passage && qText) {
          fullText = passage.startsWith('<p>') ? `${passage}\n<p>${qText}</p>` : `<p>${passage}</p>\n<p>${qText}</p>`;
        } else if (passage) {
          fullText = passage.startsWith('<p>') ? passage : `<p>${passage}</p>`;
        } else {
          fullText = qText.startsWith('<p>') ? qText : `<p>${qText}</p>`;
        }

        // Safely extract options
        let options = [];
        if (Array.isArray(q.options)) {
          options = q.options.map(o => cleanText(typeof o === 'object' ? (o.option_text || o.text || o.value) : String(o)));
        } else if (q.options && typeof q.options === 'object') {
          options = Object.values(q.options).map(o => cleanText(typeof o === 'object' ? (o.option_text || o.text || o.value) : String(o)));
        } else {
          ['option_1', 'option_2', 'option_3', 'option_4', 'option_5', 'opt1', 'opt2', 'opt3', 'opt4', 'opt5'].forEach(key => {
            if (q[key] !== undefined && q[key] !== null && String(q[key]).trim() !== "") {
              options.push(cleanText(String(q[key])));
            }
          });
        }

        // Safely calculate correct answer index
        let correctIdx = 0;
        let ansVal = q.correct_answer ?? q.answer ?? q.right_option ?? q.correctOption ?? q.correct_option;
        
        if (typeof ansVal === 'number') {
          correctIdx = (ansVal > 0 && ansVal <= options.length) ? ansVal - 1 : ansVal;
        } else if (ansVal !== undefined && ansVal !== null) {
          const s = String(ansVal).toUpperCase().trim();
          if (s === '1' || s === 'A' || s === 'OPTION 1' || s === 'OPTION A') correctIdx = 0;
          else if (s === '2' || s === 'B' || s === 'OPTION 2' || s === 'OPTION B') correctIdx = 1;
          else if (s === '3' || s === 'C' || s === 'OPTION 3' || s === 'OPTION C') correctIdx = 2;
          else if (s === '4' || s === 'D' || s === 'OPTION 4' || s === 'OPTION D') correctIdx = 3;
          else if (s === '5' || s === 'E' || s === 'OPTION 5' || s === 'OPTION E') correctIdx = 4;
          else {
            const idx = options.findIndex(o => o.toUpperCase().includes(s));
            if (idx !== -1) correctIdx = idx;
          }
        }

        const solution = cleanText(q.solution || q.explanation || q.solution_text || q.description || q.ans_desc || "");

        if (fullText) {
          allQuestions.push({
            textEn: fullText,
            textHi: fullText,
            optionsEn: options,
            optionsHi: options,
            correctIndex: Math.max(0, correctIdx),
            explanationEn: solution,
            explanationHi: solution,
            section: secName
          });
        }
      });
    });
  }

  // 4. Fallback DOM Crawler (if Memory/API empty)
  if (allQuestions.length === 0) {
    console.log("🌐 Running Automated DOM Crawler across all sections & questions...");
    
    const sectionTabs = Array.from(document.querySelectorAll('.sectnTopicTab a, .nav-tabs a'));
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (let sIdx = 0; sIdx < (sectionTabs.length || 1); sIdx++) {
      if (sectionTabs[sIdx]) {
        sectionTabs[sIdx].click();
        await sleep(350);
      }

      const secName = document.querySelector('.nav-item.nav-link.active span')?.innerText?.trim() || `Section ${sIdx + 1}`;
      const paletteBtns = Array.from(document.querySelectorAll('.sidediv .iconQues, .sidediv button, .sidediv .quesNumber1, .sidediv .quesNumber2, .sidediv a'));

      const countToScrape = paletteBtns.length || 35;
      for (let qIdx = 0; qIdx < countToScrape; qIdx++) {
        if (paletteBtns[qIdx]) {
          paletteBtns[qIdx].click();
          await sleep(150);
        }

        const passageBox = document.querySelector('.Qbox.mcktestQuestonsTxt.btmpcm80');
        const passageHtml = passageBox ? passageBox.innerHTML.trim() : '';

        const qBox = document.querySelector('.Qbox.mcktestQuestonsTxt.btmp80');
        const qTextElement = qBox ? (qBox.querySelector('span p') || qBox.querySelector('p')) : null;
        const questionTextHtml = qTextElement ? qTextElement.outerHTML.trim() : '';

        const fullText = passageHtml ? `${passageHtml}\n${questionTextHtml}` : questionTextHtml;

        const options = [];
        let correctIndex = 0;
        const radioItems = qBox ? qBox.querySelectorAll('.radio-item') : [];
        
        radioItems.forEach((item, idx) => {
          const label = item.querySelector('label');
          if (label) options.push(label.innerText.trim());
          if (item.classList.contains('correct-answer')) correctIndex = idx;
        });

        const solDesc = document.querySelector('.ansrDesc');
        const explanationHtml = solDesc ? solDesc.innerHTML.trim() : '';

        if (fullText) {
          allQuestions.push({
            textEn: fullText,
            textHi: fullText,
            optionsEn: options,
            optionsHi: options,
            correctIndex: correctIndex,
            explanationEn: explanationHtml,
            explanationHi: explanationHtml,
            section: secName
          });
        }
      }
    }
  }

  // Deduplicate questions by textEn
  const uniqueMap = new Map();
  allQuestions.forEach(q => {
    if (q.textEn && !uniqueMap.has(q.textEn)) {
      uniqueMap.set(q.textEn, q);
    }
  });
  const finalQuestions = Array.from(uniqueMap.values());

  console.log(`%c🎉 SCRAPING COMPLETE! Extracted ${finalQuestions.length} unique questions across all sections.`, "color: green; font-size: 16px; font-weight: bold;");

  // Download JSON
  const blob = new Blob([JSON.stringify(finalQuestions, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'questions_for_import.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
})();
