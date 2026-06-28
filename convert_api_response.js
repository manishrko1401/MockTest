const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'questions_for_import.json');

// Helper to decode HTML entities (handles double/triple nesting)
function decodeHtmlEntities(text) {
  if (!text) return "";
  let decoded = text;
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

// Helper to clean HTML (decodes entities, preserves rich tags, removes comments)
function cleanHtml(text) {
  if (!text) return "";
  let cleaned = decodeHtmlEntities(text);
  
  // Remove comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  // Normalize multi-escaped backslashes in LaTeX math blocks (e.g. \\\\tan -> \\tan)
  cleaned = cleaned.replace(/\\\\+/g, '\\');
  
  // Clean default Testbook inline text colors to match dark/light modes
  cleaned = cleaned.replace(/color:\s*rgb\(33,\s*37,\s*41\);?/gi, '');
  cleaned = cleaned.replace(/color:\s*rgb\(68,\s*68,\s*68\);?/gi, '');
  
  // Normalize internal formatting spaces, but keep the raw HTML markup
  return cleaned.trim();
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
    if (sections) {
      return { type: 'questions', data: sections, filePath };
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

try {
  const files = fs.readdirSync(__dirname).filter(f => f.startsWith('response') && (f.endsWith('.json') || f.endsWith('.jeson')));
  
  let questionsFile = null;
  let solutionsFile = null;
  
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    const result = analyzeFile(filePath);
    if (result) {
      if (result.type === 'questions') {
        questionsFile = result;
      } else if (result.type === 'solutions') {
        solutionsFile = result;
      }
    }
  }
  
  if (!questionsFile) {
    console.error("❌ Error: Could not locate a Questions JSON file (containing the questions and options list).");
    console.log("Please make sure you have 'response.json' or 'response.jeson' in this folder containing the exam questions.");
    process.exit(1);
  }
  
  console.log(`Found Questions file: ${path.basename(questionsFile.filePath)}`);
  if (solutionsFile) {
    console.log(`Found Solutions file: ${path.basename(solutionsFile.filePath)}`);
  } else {
    console.log("⚠️ Warning: No Solutions file found. Correct options and explanations will default to empty values.");
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
  
  const sections = questionsFile.data;
  const formattedQuestions = [];
  
  sections.forEach((sec, sIdx) => {
    const sectionName = sec.name || sec.title || `Section ${sIdx + 1}`;
    const questionsList = sec.questions || [];
    console.log(`- Processing section "${sectionName}" (${questionsList.length} questions)...`);
    
    questionsList.forEach((q, qIdx) => {
      // 1. Question Text
      const rawTextEn = q.en ? (q.en.value || "") : "";
      const rawTextHi = q.hn ? (q.hn.value || "") : "";
      const cleanTextEn = cleanHtml(rawTextEn);
      const cleanTextHi = cleanHtml(rawTextHi);
      
      // Extract image URL from question HTML if present (starts with // or http/https)
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
      
      // 2. Options
      let optionsEnList = [];
      let optionsHiList = [];
      
      if (q.en && Array.isArray(q.en.options)) {
        optionsEnList = q.en.options.map(opt => cleanHtml(opt.value || ""));
      }
      if (q.hn && Array.isArray(q.hn.options)) {
        optionsHiList = q.hn.options.map(opt => cleanHtml(opt.value || ""));
      }
      
      while (optionsEnList.length < 4) {
        optionsEnList.push(`Option ${optionsEnList.length + 1}`);
      }
      while (optionsHiList.length < 4) {
        optionsHiList.push(`Option ${optionsHiList.length + 1}`);
      }
      
      // 3. Correct Answer & Explanation
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
        
        if (!rawExpEn && q.en) {
          rawExpEn = q.en.solution || q.en.explanation || q.en.solDesc || "";
        }
        if (!rawExpHi && q.hn) {
          rawExpHi = q.hn.solution || q.hn.explanation || q.hn.solDesc || "";
        }
        
        explanationEn = cleanHtml(rawExpEn);
        explanationHi = cleanHtml(rawExpHi);
      }
      
      if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= optionsEnList.length) {
        correctIndex = 0;
      }
      
      formattedQuestions.push({
        textEn: cleanTextEn || `Question ${qIdx + 1}`,
        textHi: cleanTextHi || cleanTextEn || `Question ${qIdx + 1}`,
        optionsEn: optionsEnList.slice(0, 4),
        optionsHi: optionsHiList.slice(0, 4),
        correctIndex: correctIndex,
        explanationEn: explanationEn || "",
        explanationHi: explanationHi || explanationEn || "",
        imageUrlEn: imageUrlEn || undefined,
        imageUrlHi: imageUrlHi || undefined,
        section: sectionName
      });
    });
  });
  
  fs.writeFileSync(outputPath, JSON.stringify(formattedQuestions, null, 2), 'utf-8');
  console.log(`\n✔ Successfully merged and converted ${formattedQuestions.length} questions with rich layout intact!`);
  console.log(`Saved output to: ${outputPath}`);
  
} catch (err) {
  console.error("❌ Error running converter script:", err.message);
}
