const fs = require('fs');
const path = require('path');

// Accept any test file from CLI arguments or default to 'raj set.json'
const args = process.argv.slice(2);
const targetFileName = args.length > 0 ? args[0] : 'raj set.json';
const inputFile = path.isAbsolute(targetFileName) ? targetFileName : path.join(__dirname, targetFileName);

if (!fs.existsSync(inputFile)) {
  console.error(`\n❌ Error: Input file not found: "${inputFile}"`);
  console.log(`Please make sure the file exists in: ${__dirname}\n`);
  process.exit(1);
}

const inputBaseName = path.basename(inputFile, path.extname(inputFile));
const outputPath = path.join(__dirname, 'questions_for_import.json');
const backupOutputPath = path.join(__dirname, `${inputBaseName}_converted.json`);

console.log(`\n========================================`);
console.log(`🚀 Universal Test Converter`);
console.log(`📂 Processing: "${path.basename(inputFile)}"`);
console.log(`========================================\n`);

let rawData;
try {
  rawData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
} catch (e) {
  console.error(`❌ Error parsing JSON from file "${inputFile}": ${e.message}`);
  process.exit(1);
}

// Helper: Extract question array from various JSON container formats
function extractQuestionsList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.questions)) return data.questions;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.response)) return data.response;
    if (Array.isArray(data.items)) return data.items;
    
    // Check if sections array exists
    if (Array.isArray(data.sections)) {
      const all = [];
      data.sections.forEach(sec => {
        const secName = sec.name || sec.title || "General Studies";
        const qList = sec.questions || [];
        qList.forEach(q => all.push({ ...q, section: sec.section || secName }));
      });
      return all;
    }

    // Search object values recursively for the first array of questions
    for (const key in data) {
      if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'object') {
        return data[key];
      }
    }
  }
  return [];
}

const rawQuestions = extractQuestionsList(rawData);
if (!rawQuestions || rawQuestions.length === 0) {
  console.error(`❌ Could not find a list of questions in "${inputFile}".`);
  process.exit(1);
}

console.log(`📖 Found ${rawQuestions.length} questions to convert...`);

// Helper to decode HTML entities
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return "";
  let decoded = text;
  for (let i = 0; i < 3; i++) {
    const prev = decoded;
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
      .replace(/&plusmn;/g, '±')
      .replace(/&times;/g, '×')
      .replace(/&divide;/g, '÷')
      .replace(/&ne;/g, '≠')
      .replace(/&le;/g, '≤')
      .replace(/&ge;/g, '≥')
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

// Clean HTML tags and style bloat
function cleanHtml(text) {
  if (!text || typeof text !== 'string') return "";
  let cleaned = decodeHtmlEntities(text);
  
  // Remove style blocks, font face, comments, anchors
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
  
  // Remove font-family, fixed font-sizes, margins, fixed colors
  cleaned = cleaned.replace(/font-family:\s*[^;'"]+;?/gi, '');
  cleaned = cleaned.replace(/font-size:\s*[^;'"]+;?/gi, '');
  cleaned = cleaned.replace(/margin-top:\s*0pt;?/gi, '');
  cleaned = cleaned.replace(/margin-bottom:\s*0pt;?/gi, '');
  cleaned = cleaned.replace(/widows:\s*0;?/gi, '');
  cleaned = cleaned.replace(/orphans:\s*0;?/gi, '');
  cleaned = cleaned.replace(/overflow-wrap:\s*break-word;?/gi, '');
  cleaned = cleaned.replace(/color:\s*rgb\([^)]+\);?/gi, '');
  cleaned = cleaned.replace(/style="\s*"/gi, '');
  cleaned = cleaned.replace(/style='\s*'/gi, '');
  
  // Unwrap meaningless spans
  for (let i = 0; i < 3; i++) {
    cleaned = cleaned.replace(/<span\s*>([\s\S]*?)<\/span>/gi, '$1');
    cleaned = cleaned.replace(/<span>([\s\S]*?)<\/span>/gi, '$1');
  }
  
  // Ensure img tags have https:
  cleaned = cleaned.replace(/<img\b([^>]*)\bsrc=["']\/\//gi, '<img$1src="https://');
  
  // Clean multi-spaces
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  return cleaned.trim();
}

function stripTags(html) {
  if (!html || typeof html !== 'string') return "";
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasHindi(text) {
  return /[\u0900-\u097F]/.test(text || '');
}

// Clean question number prefixes like "1. ", "Q1. ", "42. .", "17.", etc.
function removeQuestionNumberPrefix(text) {
  if (!text || typeof text !== 'string') return "";
  let res = text.trim();
  res = res.replace(/^(?:Q\s*\.?\s*)?[0-9]{1,3}\s*[\.\:\-\)]+\s*\.?\s*/i, '');
  return res.trim();
}

// Convert any questions list into standard website import questions format
function convertQuestions(rawList) {
  return rawList.map((q, idx) => {
    const qNum = idx + 1;
    
    // 1. QUESTION TEXT & COMPREHENSION
    let rawTextEn = q.textEn || (q.en ? (q.en.value || q.en.text || q.en.question) : "") || q.question || q.text || "";
    let rawTextHi = q.textHi || (q.hn ? (q.hn.value || q.hn.text || q.hn.question) : (q.hi ? (q.hi.value || q.hi.text || q.hi.question) : "")) || "";

    const cleanRawEn = cleanHtml(rawTextEn);
    const cleanRawHi = cleanHtml(rawTextHi);

    let finalEn = "";
    let finalHi = "";

    // Check if English and Hindi are already cleanly separated and distinct
    const isDistinctHi = cleanRawHi && cleanRawHi !== cleanRawEn && hasHindi(cleanRawHi);
    const isCleanEnOnly = cleanRawEn && !hasHindi(cleanRawEn);

    if (isDistinctHi && isCleanEnOnly) {
      finalEn = cleanRawEn;
      finalHi = cleanRawHi;
    } else {
      // Combined text: parse paragraphs and separate dynamically based on language & structure
      const targetCombinedHtml = cleanRawEn || cleanRawHi;
      const pMatches = targetCombinedHtml.match(/<p[\s\S]*?<\/p>/gi) || [];

      let enP = [];
      let hiP = [];
      let compEnP = [];
      let compHiP = [];
      let isCompActive = false;

      pMatches.forEach(p => {
        const plain = stripTags(p);
        if (!plain && !/<img/i.test(p)) return;

        // Detect comprehension start
        if (/^(?:Comprehension|Passage|Directions|Directions\s*\(|Read the following passage|Note:)/i.test(plain)) {
          isCompActive = true;
        }

        // Detect question start after comprehension (e.g. "Q1.", "46.", "Question")
        if (isCompActive && /^(?:Q\s*[\.\:\-]?[0-9]+|[0-9]{1,3}\s*[\.\:\-])/i.test(plain)) {
          isCompActive = false;
        }

        // Check if single paragraph has English and Hindi separated by '/'
        if (plain.includes('/') && hasHindi(plain)) {
          const parts = plain.split('/');
          if (parts.length === 2 && !hasHindi(parts[0]) && hasHindi(parts[1])) {
            const cleanEnPart = removeQuestionNumberPrefix(parts[0]);
            const cleanHiPart = removeQuestionNumberPrefix(parts[1]);
            if (isCompActive) {
              compEnP.push(`<p>${cleanEnPart}</p>`);
              compHiP.push(`<p>${cleanHiPart}</p>`);
            } else {
              enP.push(`<p>${cleanEnPart}</p>`);
              hiP.push(`<p>${cleanHiPart}</p>`);
            }
            return;
          }
        }

        if (hasHindi(plain)) {
          if (isCompActive) {
            compHiP.push(`<p>${plain}</p>`);
          } else {
            hiP.push(`<p>${removeQuestionNumberPrefix(plain)}</p>`);
          }
        } else {
          if (/<img/i.test(p)) {
            if (isCompActive) {
              compEnP.push(p);
              compHiP.push(p);
            } else {
              enP.push(p);
              hiP.push(p);
            }
          } else {
            if (isCompActive) {
              compEnP.push(`<p>${plain}</p>`);
            } else {
              enP.push(`<p>${removeQuestionNumberPrefix(plain)}</p>`);
            }
          }
        }
      });

      // If comprehension paragraphs were dynamically detected, format them into comprehension box
      let dynamicCompEn = "";
      let dynamicCompHi = "";
      if (compEnP.length > 0) {
        dynamicCompEn = `<div class="comprehension-box mb-4 p-4 bg-blue-50/70 dark:bg-slate-900/90 border border-blue-200 dark:border-slate-700 rounded-xl text-sm leading-relaxed text-slate-800 dark:text-slate-200">\n<div class="font-bold text-blue-700 dark:text-blue-400 mb-2 uppercase text-xs tracking-wider">📖 Passage / Directions:</div>\n${compEnP.join('\n')}\n</div>`;
      }
      if (compHiP.length > 0) {
        dynamicCompHi = `<div class="comprehension-box mb-4 p-4 bg-blue-50/70 dark:bg-slate-900/90 border border-blue-200 dark:border-slate-700 rounded-xl text-sm leading-relaxed text-slate-800 dark:text-slate-200">\n<div class="font-bold text-blue-700 dark:text-blue-400 mb-2 uppercase text-xs tracking-wider">📖 निर्देश / गद्यांश:</div>\n${compHiP.join('\n')}\n</div>`;
      }

      let mainEn = enP.join('\n').trim();
      let mainHi = hiP.join('\n').trim();

      if (!mainEn && !mainHi) {
        mainEn = cleanRawEn || `Question ${qNum}`;
        mainHi = cleanRawHi || mainEn;
      } else if (!mainEn) {
        mainEn = mainHi;
      } else if (!mainHi) {
        mainHi = mainEn;
      }

      finalEn = dynamicCompEn ? `${dynamicCompEn}\n${mainEn}` : mainEn;
      finalHi = dynamicCompHi ? `${dynamicCompHi}\n${mainHi}` : (mainHi || finalEn);
    }

    // 2. OPTIONS EXTRACTION
    let rawOptionsEn = q.optionsEn || (q.en && Array.isArray(q.en.options) ? q.en.options : []) || q.options || [];
    let rawOptionsHi = q.optionsHi || (q.hn && Array.isArray(q.hn.options) ? q.hn.options : (q.hi && Array.isArray(q.hi.options) ? q.hi.options : [])) || [];

    const optionsEn = [];
    const optionsHi = [];

    // Normalize option objects { value: "..." } to strings
    const optListEn = rawOptionsEn.map(opt => typeof opt === 'object' && opt !== null ? (opt.value || opt.text || opt.en || JSON.stringify(opt)) : String(opt || ""));
    const optListHi = rawOptionsHi.map(opt => typeof opt === 'object' && opt !== null ? (opt.value || opt.text || opt.hi || opt.hn || JSON.stringify(opt)) : String(opt || ""));

    optListEn.forEach((optRaw, oIdx) => {
      let optClean = cleanHtml(optRaw);
      let optPlain = stripTags(optClean);
      
      // Remove option prefixes like "1. ", "A. ", "(a) ", etc.
      optPlain = optPlain.replace(/^[0-9A-Da-d][\.\)]\s*/, '').trim();
      
      // Check if option contains English / Hindi separated by '/'
      if (optPlain.includes('/') && hasHindi(optPlain)) {
        const parts = optPlain.split('/');
        if (parts.length >= 2) {
          const enPart = parts[0].trim().replace(/^[0-9A-Da-d][\.\)]\s*/, '').trim();
          const hiPart = parts.slice(1).join('/').trim().replace(/^[0-9A-Da-d][\.\)]\s*/, '').trim();
          optionsEn.push(enPart || `Option ${oIdx + 1}`);
          optionsHi.push(hiPart || enPart || `विकल्प ${oIdx + 1}`);
          return;
        }
      }

      const hiOptRaw = optListHi[oIdx];
      let hiOptClean = hiOptRaw ? cleanHtml(hiOptRaw) : "";
      let hiOptPlain = stripTags(hiOptClean).replace(/^[0-9A-Da-d][\.\)]\s*/, '').trim();

      optionsEn.push(optPlain || `Option ${oIdx + 1}`);
      optionsHi.push(hiOptPlain || optPlain || `विकल्प ${oIdx + 1}`);
    });

    while (optionsEn.length < 4) {
      optionsEn.push(`Option ${optionsEn.length + 1}`);
    }
    while (optionsHi.length < optionsEn.length) {
      optionsHi.push(optionsEn[optionsHi.length]);
    }

    // 3. EXPLANATION EXTRACTION
    let rawExpEn = q.explanationEn || q.explanation || q.solution || q.solDesc || (q.en ? (q.en.solution || q.en.explanation || q.en.solDesc) : "") || "";
    let rawExpHi = q.explanationHi || q.solutionHi || q.explanationHi || q.solDescHi || (q.hn ? (q.hn.solution || q.hn.explanation || q.hn.solDesc) : (q.hi ? (q.hi.solution || q.hi.explanation) : "")) || "";

    const cleanExpEn = cleanHtml(rawExpEn);
    const cleanExpHi = cleanHtml(rawExpHi);

    let expFinalEn = "";
    let expFinalHi = "";

    if (cleanExpHi && cleanExpHi !== cleanExpEn && hasHindi(cleanExpHi) && !hasHindi(cleanExpEn)) {
      expFinalEn = cleanExpEn;
      expFinalHi = cleanExpHi;
    } else {
      const expTargetHtml = cleanExpEn || cleanExpHi;
      const expParagraphs = expTargetHtml.match(/<p[\s\S]*?<\/p>/gi) || [];
      const expImgMatches = expTargetHtml.match(/<img[^>]+>/gi) || [];
      const expImgHtml = expImgMatches.length > 0 ? expImgMatches.map(img => `<div class="my-2">${img}</div>`).join('') : "";

      const expEnP = [];
      const expHiP = [];

      expParagraphs.forEach(p => {
        const plain = stripTags(p);
        if (!plain) return;
        if (/^(?:Explanation:|Solution|Full Solution|उत्तर व्याख्या|स्पष्टीकरण:?)/i.test(plain)) {
          return;
        }
        if (hasHindi(plain)) {
          expHiP.push(`<p>${plain}</p>`);
        } else {
          expEnP.push(`<p>${plain}</p>`);
        }
      });

      expFinalEn = expEnP.length > 0 ? `${expEnP.join('\n')}${expImgHtml}` : (expImgHtml || "Explanation will be updated soon.");
      expFinalHi = expHiP.length > 0 ? `${expHiP.join('\n')}${expImgHtml}` : (expFinalEn || "व्याख्या जल्द ही अपडेट की जाएगी।");
    }

    // 4. CORRECT ANSWER INDEX
    let correctIndex = 0;
    if (typeof q.correctIndex === 'number') {
      correctIndex = q.correctIndex;
    } else if (typeof q.correctOptionIndex === 'number') {
      correctIndex = q.correctOptionIndex;
    } else if (q.correctOption !== undefined) {
      const parsed = parseInt(q.correctOption, 10);
      correctIndex = !isNaN(parsed) && parsed > 0 ? parsed - 1 : 0;
    } else if (Array.isArray(q.answers) && q.answers.length > 0) {
      const parsed = parseInt(q.answers[0], 10);
      correctIndex = !isNaN(parsed) && parsed > 0 ? parsed - 1 : 0;
    } else if (q.answer !== undefined) {
      const parsed = parseInt(q.answer, 10);
      correctIndex = !isNaN(parsed) && parsed >= 0 ? (parsed > 3 ? parsed - 1 : parsed) : 0;
    }

    if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= optionsEn.length) {
      correctIndex = 0;
    }

    // 5. SECTION & SCORING
    const sectionName = q.section || q.sectionName || q.subject || "General Studies";
    const positiveMarks = typeof q.positiveMarks === 'number' ? q.positiveMarks : 2.0;
    const negativeMarks = typeof q.negativeMarks === 'number' ? q.negativeMarks : 0.0;

    return {
      textEn: finalEn,
      textHi: finalHi,
      optionsEn: optionsEn,
      optionsHi: optionsHi,
      correctIndex: correctIndex,
      explanationEn: expFinalEn,
      explanationHi: expFinalHi,
      section: sectionName,
      positiveMarks: positiveMarks,
      negativeMarks: negativeMarks
    };
  });
}

const convertedQuestions = convertQuestions(rawQuestions);

// Save output files
fs.writeFileSync(outputPath, JSON.stringify(convertedQuestions, null, 2), 'utf-8');
fs.writeFileSync(backupOutputPath, JSON.stringify(convertedQuestions, null, 2), 'utf-8');

console.log(`\n🎉 Success! Converted all ${convertedQuestions.length} questions dynamically.`);
console.log(`📁 Primary Output: "${outputPath}" (ready to upload)`);
console.log(`📁 Test Backup:    "${backupOutputPath}"\n`);
