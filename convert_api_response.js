const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'questions_for_import.json');

// Helper to decode HTML entities (handles double/triple nesting)
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

// Helper to clean HTML
function cleanHtml(text) {
  if (!text) return "";
  let cleaned = decodeHtmlEntities(text);
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/\\\\+/g, '\\');
  cleaned = cleaned.replace(/color:\s*rgb\(33,\s*37,\s*41\);?/gi, '');
  cleaned = cleaned.replace(/color:\s*rgb\(68,\s*68,\s*68\);?/gi, '');
  return cleaned.trim();
}

function isQuestionObject(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const hasText = Boolean(
    obj.textEn || obj.questionText || obj.question || obj.title || 
    obj.question_text || obj.text || (obj.en && obj.en.value) || (obj.hn && obj.hn.value)
  );
  const hasOptionsOrSol = Boolean(
    obj.options || obj.optionsEn || obj.option1 || obj.opt1 || 
    (obj.en && obj.en.options) || obj.solution || obj.explanation || 
    obj.correct_option !== undefined || obj.correctOption !== undefined || obj.answers || obj.correctIndex !== undefined
  );
  return hasText && hasOptionsOrSol;
}

function extractAllQuestionsFromRoot(root) {
  const list = [];
  const visited = new Set();

  function traverse(curr) {
    if (!curr || typeof curr !== 'object' || visited.has(curr)) return;
    visited.add(curr);

    if (isQuestionObject(curr)) {
      list.push(curr);
      return;
    }

    if (Array.isArray(curr)) {
      for (const item of curr) {
        traverse(item);
      }
    } else {
      for (const key in curr) {
        if (typeof curr[key] === 'object' && curr[key] !== null) {
          traverse(curr[key]);
        }
      }
    }
  }

  traverse(root);
  return list;
}

function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const root = rawData.data || rawData.response || rawData;
    
    if (root && typeof root === 'object' && !Array.isArray(root)) {
      const keys = Object.keys(root);
      const isSolutionsMap = keys.length > 0 && keys.every(k => /^[0-9a-fA-F]{24}$/.test(k));
      if (isSolutionsMap) {
        return { type: 'solutions', data: root, filePath };
      }
    }

    // Try finding structured sections first
    if (root && typeof root === 'object' && Array.isArray(root.sections)) {
      return { type: 'sections', data: root.sections, filePath };
    }
    
    // Otherwise use deep recursive extraction
    const rawQuestions = extractAllQuestionsFromRoot(root);
    if (rawQuestions.length > 0) {
      return { type: 'questions', data: rawQuestions, filePath };
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

try {
  let questionsFile = null;
  let solutionsFile = null;

  const args = process.argv.slice(2);
  if (args.length > 0) {
    for (const arg of args) {
      const filePath = path.isAbsolute(arg) ? arg : path.join(__dirname, arg);
      const result = analyzeFile(filePath);
      if (result) {
        if (result.type !== 'solutions' && !questionsFile) {
          questionsFile = result;
        } else if (result.type === 'solutions' && !solutionsFile) {
          solutionsFile = result;
        }
      }
    }
  }

  if (!questionsFile || !solutionsFile) {
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.json') || f.endsWith('.jeson'));
    for (const file of files) {
      if (file === 'questions_for_import.json' || file === 'package.json' || file === 'eas.json' || file === 'tsconfig.json') continue;
      const filePath = path.join(__dirname, file);
      const result = analyzeFile(filePath);
      if (result) {
        if (result.type !== 'solutions' && !questionsFile) {
          questionsFile = result;
        } else if (result.type === 'solutions' && !solutionsFile) {
          solutionsFile = result;
        }
      }
    }
  }

  if (!questionsFile) {
    console.error("❌ Error: Could not locate any Questions JSON file in this directory.");
    process.exit(1);
  }
  
  console.log(`Found Questions file: ${path.basename(questionsFile.filePath)}`);
  if (solutionsFile) {
    console.log(`Found Solutions file: ${path.basename(solutionsFile.filePath)}`);
  }
  
  const solutionsMap = {};
  if (solutionsFile) {
    const solData = solutionsFile.data;
    for (const qId in solData) {
      const entry = solData[qId];
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
        if (entry.sol.en) {
          expEn = entry.sol.en.value || entry.sol.en.explanation || entry.sol.en.solution || "";
        }
        if (entry.sol.hn) {
          expHi = entry.sol.hn.value || entry.sol.hn.explanation || entry.sol.hn.solution || "";
        } else if (entry.sol.hi) {
          expHi = entry.sol.hi.value || entry.sol.hi.explanation || entry.sol.hi.solution || "";
        }
      }
      
      solutionsMap[qId] = {
        correctIndex,
        explanationEn: cleanHtml(expEn),
        explanationHi: cleanHtml(expHi)
      };
    }
  }
  
  let rawQuestionsList = [];
  if (questionsFile.type === 'sections') {
    questionsFile.data.forEach((sec, sIdx) => {
      const sName = sec.name || sec.title || `Section ${sIdx + 1}`;
      (sec.questions || []).forEach(q => {
        rawQuestionsList.push({ ...q, sectionName: sName });
      });
    });
  } else {
    rawQuestionsList = questionsFile.data;
  }

  console.log(`- Total Raw Questions Detected: ${rawQuestionsList.length}`);

  const formattedQuestions = [];
  const seenTexts = new Set();
  
  rawQuestionsList.forEach((q, qIdx) => {
    // Question Text
    const rawTextEn = q.textEn || (q.en ? q.en.value : null) || q.questionText || q.question || q.title || q.question_text || q.text || "";
    const rawTextHi = q.textHi || (q.hn ? q.hn.value : null) || q.questionText || q.question || q.title || q.question_text || q.text || rawTextEn;
    const cleanTextEn = cleanHtml(rawTextEn);
    const cleanTextHi = cleanHtml(rawTextHi);
    
    if (!cleanTextEn && !cleanTextHi) return;

    // Deduplication check
    const dedupKey = cleanTextEn.substring(0, 100);
    if (seenTexts.has(dedupKey)) return;
    seenTexts.add(dedupKey);

    // Image URL extraction
    let imageUrlEn = "";
    let imageUrlHi = "";
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    
    const imgMatchEn = String(rawTextEn).match(imgRegex);
    if (imgMatchEn) {
      imageUrlEn = imgMatchEn[1];
      if (imageUrlEn.startsWith('//')) imageUrlEn = 'https:' + imageUrlEn;
    }
    const imgMatchHi = String(rawTextHi).match(imgRegex);
    if (imgMatchHi) {
      imageUrlHi = imgMatchHi[1];
      if (imageUrlHi.startsWith('//')) imageUrlHi = 'https:' + imageUrlHi;
    }
    
    // Options
    let optionsEnList = [];
    let optionsHiList = [];
    
    if (q.optionsEn && Array.isArray(q.optionsEn)) {
      optionsEnList = q.optionsEn.map(opt => cleanHtml(String(opt)));
    } else if (q.options && Array.isArray(q.options)) {
      optionsEnList = q.options.map(opt => cleanHtml(typeof opt === 'object' ? (opt.option || opt.text || String(opt)) : String(opt)));
    } else if (q.en && Array.isArray(q.en.options)) {
      optionsEnList = q.en.options.map(opt => cleanHtml(opt.value || String(opt)));
    } else if (q.option1 || q.opt1) {
      optionsEnList = [q.option1 || q.opt1, q.option2 || q.opt2, q.option3 || q.opt3, q.option4 || q.opt4].filter(Boolean).map(opt => cleanHtml(String(opt)));
    }

    if (q.optionsHi && Array.isArray(q.optionsHi)) {
      optionsHiList = q.optionsHi.map(opt => cleanHtml(String(opt)));
    } else if (q.hn && Array.isArray(q.hn.options)) {
      optionsHiList = q.hn.options.map(opt => cleanHtml(opt.value || String(opt)));
    } else {
      optionsHiList = [...optionsEnList];
    }
    
    while (optionsEnList.length < 4) {
      optionsEnList.push(`Option ${optionsEnList.length + 1}`);
    }
    while (optionsHiList.length < 4) {
      optionsHiList.push(`Option ${optionsHiList.length + 1}`);
    }
    
    // Correct Index & Explanation
    let correctIndex = 0;
    let explanationEn = "";
    let explanationHi = "";
    
    const qId = q._id || q.id;
    if (qId && solutionsMap[qId]) {
      correctIndex = solutionsMap[qId].correctIndex;
      explanationEn = solutionsMap[qId].explanationEn;
      explanationHi = solutionsMap[qId].explanationHi;
    } else {
      if (typeof q.correctIndex === 'number') {
        correctIndex = q.correctIndex;
      } else if (typeof q.correctAnswer === 'number') {
        correctIndex = q.correctAnswer;
      } else if (typeof q.answer === 'number') {
        correctIndex = q.answer;
      } else if (q.answers && Array.isArray(q.answers) && q.answers.length > 0) {
        correctIndex = parseInt(q.answers[0], 10) - 1;
      } else if (q.correctOptionIndex !== undefined) {
        correctIndex = parseInt(q.correctOptionIndex, 10);
      } else if (q.correctOption !== undefined || q.correct_option !== undefined || q.correct_answer !== undefined) {
        const val = parseInt(q.correctOption || q.correct_option || q.correct_answer, 10);
        correctIndex = val > 0 ? val - 1 : 0;
      } else if (q.correctAnswer || q.answer) {
        const str = String(q.correctAnswer || q.answer).trim().toUpperCase();
        if (str === 'A' || str === '1' || str === 'OPT1' || str === 'OPTION 1' || str === 'OPTION A') correctIndex = 0;
        else if (str === 'B' || str === '2' || str === 'OPT2' || str === 'OPTION 2' || str === 'OPTION B') correctIndex = 1;
        else if (str === 'C' || str === '3' || str === 'OPT3' || str === 'OPTION 3' || str === 'OPTION C') correctIndex = 2;
        else if (str === 'D' || str === '4' || str === 'OPT4' || str === 'OPTION 4' || str === 'OPTION D') correctIndex = 3;
      }
      
      let rawExpEn = q.explanationEn || q.explanation || q.solution || q.answer_explanation || q.sol || q.solDesc || q.solutionDesc || "";
      let rawExpHi = q.explanationHi || q.explanation || q.solution || q.answer_explanation || q.sol || q.solDescHi || "";
      
      if (!rawExpEn && q.en) {
        rawExpEn = q.en.solution || q.en.explanation || q.en.solDesc || "";
      }
      if (!rawExpHi && q.hn) {
        rawExpHi = q.hn.solution || q.hn.explanation || q.hn.solDesc || "";
      }
      
      explanationEn = cleanHtml(rawExpEn);
      explanationHi = cleanHtml(rawExpHi || rawExpEn);
    }
    
    if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= optionsEnList.length) {
      correctIndex = 0;
    }
    
    formattedQuestions.push({
      textEn: cleanTextEn || `Question ${formattedQuestions.length + 1}`,
      textHi: cleanTextHi || cleanTextEn || `Question ${formattedQuestions.length + 1}`,
      optionsEn: optionsEnList.slice(0, 4),
      optionsHi: optionsHiList.slice(0, 4),
      correctIndex: correctIndex,
      explanationEn: explanationEn || "",
      explanationHi: explanationHi || explanationEn || "",
      imageUrlEn: imageUrlEn || undefined,
      imageUrlHi: imageUrlHi || undefined,
      section: q.sectionName || q.section || "General Studies"
    });
  });
  
  fs.writeFileSync(outputPath, JSON.stringify(formattedQuestions, null, 2), 'utf-8');
  console.log(`\n🎉 SUCCESSFULLY CONVERTED ALL ${formattedQuestions.length} QUESTIONS!`);
  console.log(`Saved formatted output to: ${outputPath}`);
  
} catch (err) {
  console.error("❌ Error running converter script:", err.message);
}
