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
      .replace(/&times;/g, '×')
      .replace(/&divide;/g, '÷')
      .replace(/&plusmn;/g, '±')
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—')
      .replace(/&hellip;/g, '…');
    if (decoded === prev) break;
  }
  return decoded;
}

// Clean HTML attributes and formatting
function cleanHtml(text, origin = 'https://guidely.in') {
  if (!text) return "";
  let cleaned = decodeHtmlEntities(text);
  
  cleaned = cleaned.replace(/_ngcontent-[a-zA-Z0-9-]+=""/g, '');
  cleaned = cleaned.replace(/_nghost-[a-zA-Z0-9-]+=""/g, '');
  cleaned = cleaned.replace(/\s*ng-star-inserted/g, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/\s+class=""/g, '');
  
  cleaned = cleaned.replace(/src=["'](?:\.\/)?Guidely_files\/([^"']+)["']/gi, (m, filename) => {
    return `src="${origin}/Guidely_files/${filename}"`;
  });
  cleaned = cleaned.replace(/src=["']\/\/([^"']+)["']/gi, 'src="https://$1"');
  cleaned = cleaned.replace(/src=["']\/([^"']+)["']/gi, `src="${origin}/$1"`);

  return cleaned.trim();
}

/**
 * Format combined passage + question text
 */
function combinePassageAndQuestion(passage, qText) {
  const p = cleanHtml(passage);
  const q = cleanHtml(qText);
  if (p && q) {
    if (q.includes(p.substring(0, 40))) return q;
    return `${p}\n\n${q}`;
  }
  return q || p;
}

/**
 * Parse a JSON question file exported by guidely_console_script.js
 */
function parseGuidelyJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data.map((q, idx) => {
        const passage = q.passage || q.passageText || q.direction || q.comprehension || '';
        const qText = q.textEn || q.fullTextEn || q.questionPrompt || q.question_text || '';
        const fullText = combinePassageAndQuestion(passage, qText);

        return {
          id: q.id || `q_${idx + 1}`,
          section: q.section || 'General',
          passage: passage,
          textEn: fullText,
          textHi: fullText,
          optionsEn: q.optionsEn || q.options || [],
          optionsHi: q.optionsEn || q.options || [],
          correctIndex: q.correctIndex ?? 0,
          explanationEn: q.explanationEn || q.solution || '',
          explanationHi: q.explanationEn || q.solution || '',
        };
      });
    }
  } catch (e) {
    console.error(`Failed to parse JSON file ${filePath}:`, e.message);
  }
  return null;
}

/**
 * Parse a single Guidely HTML file content
 */
function parseGuidelyHtmlFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf8');

  // 1. Extract Test Title
  const titleMatch = content.match(/<h2[^>]*>\s*(?:SOLUTIONS:\s*)?([^<]+)<\/h2>/i);
  const testTitle = titleMatch ? titleMatch[1].trim() : 'Guidely Mock Test';

  // 2. Extract Active / Available Section Name
  let sectionName = 'English Language';
  const activeSecMatch = content.match(/class="[^"]*nav-link[^"]*active[^"]*"[^>]*>[\s\S]*?<span[^>]*>\s*([^<]+)\s*<\/span>/i);
  if (activeSecMatch) sectionName = activeSecMatch[1].trim();

  // 3. Robust Passage Extraction (matches any div with btmpcm80 / drctnsDv / comprhnsn)
  let passageHtml = '';
  const passageMatch = content.match(/class="[^"]*(?:btmpcm80|drctnsDv|comprhnsn|direction)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (passageMatch) {
    passageHtml = cleanHtml(passageMatch[1]);
  }

  // 4. Question Text Box (btmp80 or Qbox)
  let questionBoxHtml = content;
  const questionBoxMatch = content.match(/class="[^"]*(?:btmp80|sltn-qstn)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (questionBoxMatch) {
    questionBoxHtml = questionBoxMatch[1];
  }

  // Question Text Prompt
  let questionTextHtml = '';
  const qTextMatch = questionBoxHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (qTextMatch) {
    questionTextHtml = cleanHtml(qTextMatch[1]);
  } else {
    questionTextHtml = cleanHtml(questionBoxHtml);
  }

  const fullTextEn = combinePassageAndQuestion(passageHtml, questionTextHtml);

  // 5. Extract Options & Correct Answer Index
  const options = [];
  let correctIndex = 0;
  const radioItemRegex = /<div[^>]*class="([^"]*radio-item[^"]*)"[^>]*>([\s\S]*?)<\/div>/gi;
  let radioMatch;
  let optIndex = 0;

  while ((radioMatch = radioItemRegex.exec(questionBoxHtml)) !== null) {
    const classAttr = radioMatch[1];
    const innerHtml = radioMatch[2];
    const isCorrect = classAttr.includes('correct-answer');

    const labelMatch = innerHtml.match(/<label[^>]*>([\s\S]*?)<\/label>/i);
    if (labelMatch) {
      let optText = cleanHtml(labelMatch[1]).replace(/^<p>([\s\S]*?)<\/p>$/i, '$1').trim();
      options.push(optText);
      if (isCorrect) correctIndex = optIndex;
      optIndex++;
    }
  }

  // 6. Explanation
  let explanationHtml = '';
  const solMatch = content.match(/class="[^"]*(?:ansrDesc|answrCntnr|solution)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (solMatch) {
    explanationHtml = cleanHtml(solMatch[1]);
  }

  return {
    testTitle,
    question: {
      textEn: fullTextEn,
      textHi: fullTextEn,
      passage: passageHtml,
      optionsEn: options,
      optionsHi: options,
      correctIndex: correctIndex,
      explanationEn: explanationHtml,
      explanationHi: explanationHtml,
      section: sectionName
    }
  };
}

/**
 * Main execution function
 */
function main() {
  const targetPath = process.argv[2] || path.join(__dirname, 'guidely_questions_import.json');
  const outputPath = path.join(__dirname, 'questions_for_import.json');

  let questions = [];
  let testTitle = 'Guidely Solution Import';

  if (fs.existsSync(targetPath)) {
    if (targetPath.endsWith('.json')) {
      console.log(`📄 Processing JSON file: ${targetPath}`);
      const jsonQ = parseGuidelyJsonFile(targetPath);
      if (jsonQ) questions = jsonQ;
    } else if (fs.statSync(targetPath).isDirectory()) {
      console.log(`📂 Processing folder of HTML files: ${targetPath}`);
      const files = fs.readdirSync(targetPath).filter(f => f.endsWith('.html') || f.endsWith('.htm'));
      files.forEach(file => {
        const res = parseGuidelyHtmlFile(path.join(targetPath, file));
        if (res && res.question && res.question.textEn) {
          questions.push(res.question);
          if (res.testTitle) testTitle = res.testTitle;
        }
      });
    } else {
      console.log(`📄 Processing single HTML file: ${targetPath}`);
      const res = parseGuidelyHtmlFile(targetPath);
      if (res && res.question && res.question.textEn) {
        questions.push(res.question);
        if (res.testTitle) testTitle = res.testTitle;
      }
    }
  } else {
    console.warn(`⚠️ Target path "${targetPath}" does not exist.`);
    console.log('Searching for any exported guidely JSON or HTML files in current folder...');

    const localJson = path.join(__dirname, 'guidely_questions_import.json');
    if (fs.existsSync(localJson)) {
      console.log(`Found: ${localJson}`);
      const jsonQ = parseGuidelyJsonFile(localJson);
      if (jsonQ) questions = jsonQ;
    }
  }

  // Deduplicate questions by textEn
  const uniqueMap = new Map();
  questions.forEach(q => {
    if (q.textEn && !uniqueMap.has(q.textEn)) {
      uniqueMap.set(q.textEn, q);
    }
  });
  const finalQuestions = Array.from(uniqueMap.values());

  const withPassage = finalQuestions.filter(q => q.passage && q.passage.length > 15).length;
  console.log(`✅ Successfully processed ${finalQuestions.length} unique question(s). ${withPassage} with passage.`);

  fs.writeFileSync(outputPath, JSON.stringify(finalQuestions, null, 2), 'utf8');
  console.log(`💾 Saved clean import file to: ${outputPath}`);
}

main();
