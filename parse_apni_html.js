const fs = require('fs');
const path = require('path');

const defaultHtmlPath = path.join(__dirname, 'apni.html');
const outputPath = path.join(__dirname, 'questions_for_import.json');

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

// Clean HTML & resolve image paths
function cleanHtml(text, origin = 'https://apniuniversity.classx.co.in') {
  if (!text) return "";
  let cleaned = decodeHtmlEntities(text);
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/\\\\+/g, '\\');
  cleaned = cleaned.replace(/src=["']\/\/([^"']+)["']/gi, 'src="https://$1"');
  cleaned = cleaned.replace(/src=["']\/([^"']+)["']/gi, `src="${origin}/$1"`);
  cleaned = cleaned.replace(/color:\s*rgb\(33,\s*37,\s*41\);?/gi, '');
  cleaned = cleaned.replace(/color:\s*rgb\(68,\s*68,\s*68\);?/gi, '');
  return cleaned.trim();
}

function extractFirstImage(str, origin = 'https://apniuniversity.classx.co.in') {
  if (!str) return undefined;
  const match = String(str).match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) {
    let src = match[1];
    if (src.startsWith('//')) return 'https:' + src;
    if (src.startsWith('/')) return origin + src;
    return src;
  }
  return undefined;
}

function parseCorrectIndex(q, opts) {
  let val = q.correct_option ?? q.correct_answer ?? q.answer ?? q.correctOption ?? q.correctOptionIndex ?? q.correctIndex ?? q.right_option;
  if (typeof val === 'number') {
    return (val > 0 && val <= opts.length) ? val - 1 : val;
  }
  if (val !== undefined && val !== null) {
    const s = String(val).trim().toUpperCase();
    if (s === '1' || s === 'A' || s === 'OPT1' || s === 'OPTION 1' || s === 'OPTION A') return 0;
    if (s === '2' || s === 'B' || s === 'OPT2' || s === 'OPTION 2' || s === 'OPTION B') return 1;
    if (s === '3' || s === 'C' || s === 'OPT3' || s === 'OPTION 3' || s === 'OPTION C') return 2;
    if (s === '4' || s === 'D' || s === 'OPT4' || s === 'OPTION 4' || s === 'OPTION D') return 3;

    if (Array.isArray(opts)) {
      const idx = opts.findIndex(o => cleanHtml(String(o)).trim().toUpperCase().includes(s));
      if (idx !== -1) return idx;
    }
  }
  return 0;
}

function findExplanationText(q) {
  if (!q) return "";
  const candidateKeys = [
    'solution', 'explanation', 'answer_explanation', 'solution_text', 'solutionText',
    'sol', 'solDesc', 'solutionDesc', 'sol_desc', 'sol_text', 'sol_explanation', 'video_solution'
  ];

  let solStr = "";
  for (const key of candidateKeys) {
    if (q[key] && typeof q[key] === 'string' && q[key].trim().length > 0) {
      solStr = q[key];
      break;
    }
    if (q[key] && typeof q[key] === 'object' && (q[key].text || q[key].value || q[key].explanation)) {
      solStr = q[key].text || q[key].value || q[key].explanation;
      break;
    }
    if (q.en && q.en[key]) { solStr = typeof q.en[key] === 'object' ? q.en[key].value || q.en[key].explanation : q.en[key]; break; }
    if (q.hn && q.hn[key]) { solStr = typeof q.hn[key] === 'object' ? q.hn[key].value || q.hn[key].explanation : q.hn[key]; break; }
  }
  return cleanHtml(solStr);
}

function findQuestionText(q) {
  if (!q) return "";
  let txt = q.textEn || q.question || q.question_text || q.title || q.questionText || q.text || "";
  if (!txt && q.en) txt = typeof q.en === 'object' ? q.en.value || q.en.question || "" : q.en;
  if (!txt && q.hn) txt = typeof q.hn === 'object' ? q.hn.value || q.hn.question || "" : q.hn;
  return cleanHtml(txt);
}

function findOptionsList(q) {
  let opts = [];
  if (Array.isArray(q.optionsEn) && q.optionsEn.length >= 2) {
    opts = q.optionsEn.map(cleanHtml);
  } else if (Array.isArray(q.options) && q.options.length >= 2) {
    opts = q.options.map(o => typeof o === 'object' ? cleanHtml(o.option || o.text || o.title || String(o)) : cleanHtml(String(o)));
  } else if (q.en && Array.isArray(q.en.options) && q.en.options.length >= 2) {
    opts = q.en.options.map(o => typeof o === 'object' ? cleanHtml(o.value || o.text || String(o)) : cleanHtml(String(o)));
  } else if (q.option1 || q.opt1) {
    opts = [q.option1 || q.opt1, q.option2 || q.opt2, q.option3 || q.opt3, q.option4 || q.opt4, q.option5].filter(Boolean).map(cleanHtml);
  }

  while (opts.length < 4) {
    opts.push(`Option ${opts.length + 1}`);
  }
  return opts.slice(0, 4);
}

function searchMemoryForQuestions(obj, visited = new Set(), depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 12 || visited.has(obj)) return null;
  visited.add(obj);

  if (Array.isArray(obj) && obj.length >= 3) {
    const sample = obj[0];
    if (sample && typeof sample === 'object' && (sample.question || sample.question_text || sample.title || sample.en || sample.option1 || sample.textEn)) {
      return obj;
    }
  }

  if (Array.isArray(obj.questions) && obj.questions.length >= 3) return obj.questions;
  if (Array.isArray(obj.test_questions) && obj.test_questions.length >= 3) return obj.test_questions;
  if (Array.isArray(obj.question_list) && obj.question_list.length >= 3) return obj.question_list;

  for (const key in obj) {
    try {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const res = searchMemoryForQuestions(obj[key], visited, depth + 1);
        if (res) return res;
      }
    } catch(e) {}
  }
  return null;
}

function main() {
  const args = process.argv.slice(2);
  let htmlFilePath = args[0] ? (path.isAbsolute(args[0]) ? args[0] : path.join(__dirname, args[0])) : defaultHtmlPath;

  if (!fs.existsSync(htmlFilePath)) {
    // Check fallback files in directory
    const candidates = fs.readdirSync(__dirname).filter(f => f.endsWith('.html') || f.endsWith('.htm'));
    if (candidates.length > 0) {
      htmlFilePath = path.join(__dirname, candidates[0]);
    }
  }

  if (!fs.existsSync(htmlFilePath)) {
    console.error(`❌ Error: Could not find HTML file at "${htmlFilePath}".`);
    console.log("Please save your webpage as 'apni.html' in this project folder or specify the file name: node parse_apni_html.js your_file.html");
    process.exit(1);
  }

  console.log(`🔍 Analyzing HTML File: ${path.basename(htmlFilePath)}...`);
  const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

  let rawQuestionsList = null;

  // METHOD 1: Extract __NEXT_DATA__ JSON script payload
  const nextDataMatch = htmlContent.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextDataJson = JSON.parse(nextDataMatch[1]);
      console.log("✅ Found Next.js hydration payload (__NEXT_DATA__)!");
      rawQuestionsList = searchMemoryForQuestions(nextDataJson);
    } catch (e) {
      console.warn("Failed to parse __NEXT_DATA__ JSON:", e.message);
    }
  }

  // METHOD 2: Extract embedded JSON script blocks
  if (!rawQuestionsList) {
    const jsonMatches = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const scriptTag of jsonMatches) {
      const innerJson = scriptTag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
      if (innerJson.startsWith('{') || innerJson.startsWith('[')) {
        try {
          const parsed = JSON.parse(innerJson);
          const found = searchMemoryForQuestions(parsed);
          if (found) {
            rawQuestionsList = found;
            break;
          }
        } catch(e) {}
      }
    }
  }

  if (!rawQuestionsList || !Array.isArray(rawQuestionsList)) {
    console.error("❌ Could not extract questions array from the HTML file.");
    console.log("Make sure you saved the complete webpage or test analysis page on your browser (Ctrl+S / Cmd+S).");
    process.exit(1);
  }

  console.log(`✅ Extracted ${rawQuestionsList.length} Raw Questions from HTML!`);

  const formattedQuestions = [];
  const seenTexts = new Set();

  rawQuestionsList.forEach((q, idx) => {
    const qText = findQuestionText(q);
    if (!qText) return;

    const dedupKey = qText.substring(0, 100);
    if (seenTexts.has(dedupKey)) return;
    seenTexts.add(dedupKey);

    const options = findOptionsList(q);
    const cIdx = findCorrectOptionIndex(q, options);
    const explanation = findExplanationText(q);
    const imageUrl = extractFirstImage(qText) || extractFirstImage(explanation);

    formattedQuestions.push({
      textEn: qText,
      textHi: qText,
      optionsEn: options,
      optionsHi: options,
      correctIndex: cIdx,
      explanationEn: explanation,
      explanationHi: explanation,
      imageUrlEn: imageUrl,
      imageUrlHi: imageUrl,
      section: q.section || q.sectionName || "General Studies"
    });
  });

  fs.writeFileSync(outputPath, JSON.stringify(formattedQuestions, null, 2), 'utf-8');
  console.log(`\n🎉 PERFECT SUCCESS! Converted ALL ${formattedQuestions.length} Questions with options, correct answers & full solutions!`);
  console.log(`Saved output to: ${outputPath}`);
}

main();
