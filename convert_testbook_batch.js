/**
 * =========================================================================================
 *  TESTBOOK BATCH JSON CONVERTER & IMPORTER FOR MOCK TEST WEBSITE / APP
 * =========================================================================================
 * 
 * Takes raw Testbook response files or downloaded JSONs and formats them into the exact 
 * structure needed for website and mobile app import.
 * 
 * Usage:
 *   node convert_testbook_batch.js [optional_folder_path_or_file_paths]
 * =========================================================================================
 */

const fs = require('fs');
const path = require('path');

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

// Clean HTML markup & normalize default colors
function cleanHtml(text) {
  if (!text) return "";
  let cleaned = decodeHtmlEntities(text);
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/\\\\+/g, '\\');
  cleaned = cleaned.replace(/color:\s*rgb\(33,\s*37,\s*41\);?/gi, '');
  cleaned = cleaned.replace(/color:\s*rgb\(68,\s*68,\s*68\);?/gi, '');
  return cleaned.trim();
}

function processTestbookRawFiles(questionsFilePath, solutionsFilePath, outputFileName) {
  if (!fs.existsSync(questionsFilePath)) {
    console.error(`❌ File not found: ${questionsFilePath}`);
    return null;
  }

  const rawQ = JSON.parse(fs.readFileSync(questionsFilePath, 'utf-8'));
  const root = rawQ.data || rawQ.response || rawQ;

  let solutionsMap = {};
  if (solutionsFilePath && fs.existsSync(solutionsFilePath)) {
    const rawS = JSON.parse(fs.readFileSync(solutionsFilePath, 'utf-8'));
    const solData = rawS.data || rawS.response || rawS;
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

  const sections = findSections(root);
  if (!sections) {
    console.error(`❌ Could not locate questions/sections inside ${questionsFilePath}`);
    return null;
  }

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

  const finalOutputPath = path.join(__dirname, outputFileName.endsWith('.json') ? outputFileName : `${outputFileName}.json`);
  fs.writeFileSync(finalOutputPath, JSON.stringify(formattedQuestions, null, 2), 'utf-8');
  console.log(`✔ Successfully generated "${path.basename(finalOutputPath)}" with ${formattedQuestions.length} questions.`);
  return finalOutputPath;
}

// Execute batch processing if run via command line
if (require.main === module) {
  const qFile = path.join(__dirname, 'response_questions.json');
  const sFile = path.join(__dirname, 'response_solutions.json');
  
  if (fs.existsSync(qFile)) {
    console.log("Processing default response_questions.json & response_solutions.json...");
    processTestbookRawFiles(qFile, fs.existsSync(sFile) ? sFile : null, "CTET_Extracted_Test.json");
  } else {
    console.log("No response_questions.json found in current directory.");
    console.log("To convert raw response files, place response_questions.json and response_solutions.json here and run `node convert_testbook_batch.js`.");
  }
}

module.exports = { processTestbookRawFiles };
