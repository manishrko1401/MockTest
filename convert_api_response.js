const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'questions_for_import.json');

// Helper to decode HTML entities
function decodeHtmlEntities(text) {
  if (!text) return "";
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
      .replace(/&nbsp;/g, ' ');
    if (decoded === prev) break;
  }
  return decoded;
}

function cleanHtml(text) {
  if (!text) return "";
  let cleaned = decodeHtmlEntities(text);
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/src=["']\/\//gi, 'src="https://');
  cleaned = cleaned.replace(/\\\\+/g, '\\');
  return cleaned.trim();
}

function processNkPsychoOrTestbookFile(filePath) {
  console.log(`Processing file: ${path.basename(filePath)}...`);
  let fileContent = fs.readFileSync(filePath, 'utf-8');

  // Strip header line if present (e.g. === TEST RESULT DATA (...) ===)
  if (fileContent.startsWith('=== TEST RESULT DATA')) {
    const firstBrace = fileContent.indexOf('{');
    if (firstBrace !== -1) {
      fileContent = fileContent.substring(firstBrace);
    }
  }

  const rawData = JSON.parse(fileContent);
  const root = rawData.data || rawData.response || rawData;

  const formattedQuestions = [];

  // TYPE A: NK Psycho Classes format (categories -> questionset -> questions)
  if (root.categories && Array.isArray(root.categories)) {
    console.log("Detected NK Psycho Classes API schema!");

    root.categories.forEach((cat) => {
      const sectionName = cat.category_name || "General Section";
      const sets = cat.questionset || [];

      sets.forEach((qSet) => {
        const questionsList = qSet.questions || [];
        console.log(`- Section "${sectionName}": processing ${questionsList.length} questions...`);

        questionsList.forEach((q, qIdx) => {
          // Question Text & Images
          let rawTxtEn = q.question_text_english || "";
          let rawTxtHi = q.question_text || rawTxtEn;

          let qImg = q.question_image || "";
          if (qImg && qImg.startsWith('//')) qImg = 'https:' + qImg;

          let textEn = cleanHtml(rawTxtEn);
          let textHi = cleanHtml(rawTxtHi);

          if (qImg) {
            const imgHtml = `<p><img src="${qImg}" alt="Question Image" style="max-width: 100%; height: auto;" /></p>`;
            textEn = textEn ? `${textEn}<br/>${imgHtml}` : imgHtml;
            textHi = textHi ? `${textHi}<br/>${imgHtml}` : imgHtml;
          }

          if (!textEn) textEn = `Question ${formattedQuestions.length + 1}`;
          if (!textHi) textHi = textEn;

          // Memory image / Set image handling if present
          if (qSet.setimage) {
            let setImgUrl = qSet.setimage;
            if (setImgUrl.startsWith('//')) setImgUrl = 'https:' + setImgUrl;
            const setImgHtml = `<p><img src="${setImgUrl}" alt="Reference Image" style="max-width: 100%; height: auto;" /></p>`;
            textEn = setImgHtml + textEn;
            textHi = setImgHtml + textHi;
          }

          // Options
          const rawOpts = q.question_option || [];
          let optionsEn = [];
          let optionsHi = [];
          let correctIndex = 0;

          rawOpts.forEach((opt, oIdx) => {
            let optImg = opt.image || "";
            if (optImg && optImg.startsWith('//')) optImg = 'https:' + optImg;

            let optEnStr = "";
            let optHiStr = "";

            if (optImg) {
              const optImgHtml = `<img src="${optImg}" alt="Option ${opt.english || oIdx + 1}" style="max-width: 100%; height: auto;" />`;
              optEnStr = optImgHtml;
              optHiStr = optImgHtml;
            } else {
              optEnStr = opt.english || String.fromCharCode(65 + oIdx);
              optHiStr = opt.hindi || opt.english || String.fromCharCode(65 + oIdx);
            }

            optionsEn.push(cleanHtml(optEnStr));
            optionsHi.push(cleanHtml(optHiStr));

            if (opt.correct === true) {
              correctIndex = oIdx;
            }
          });

          // Fallback correct index check against correct_answer ("A", "B", "C", "D", "E")
          if (q.correct_answer && typeof q.correct_answer === 'string') {
            const upperAns = q.correct_answer.trim().toUpperCase();
            if (['A', 'B', 'C', 'D', 'E'].includes(upperAns)) {
              correctIndex = upperAns.charCodeAt(0) - 65;
            }
          }

          while (optionsEn.length < 2) optionsEn.push(`Option ${optionsEn.length + 1}`);
          while (optionsHi.length < 2) optionsHi.push(`Option ${optionsHi.length + 1}`);

          // Solution / Explanation
          const expEn = cleanHtml(q.english_solution || q.question_solution || "");
          const expHi = cleanHtml(q.question_solution || q.english_solution || "");

          formattedQuestions.push({
            textEn,
            textHi,
            optionsEn,
            optionsHi,
            correctIndex: Math.max(0, Math.min(correctIndex, optionsEn.length - 1)),
            explanationEn: expEn,
            explanationHi: expHi,
            section: sectionName
          });
        });
      });
    });
  } 
  // TYPE B: Testbook / Standard schema
  else {
    console.log("Detected Testbook / Standard API schema!");

    let solutionsMap = {};
    const solData = root.solutions || root.sols || (root.data && root.data.solutions) || null;
    if (solData && typeof solData === 'object') {
      for (const qId in solData) {
        const entry = solData[qId];
        let correctIndex = 0;
        if (entry.correctOption !== undefined) {
          const val = parseInt(entry.correctOption, 10);
          correctIndex = val > 0 ? val - 1 : 0;
        } else if (entry.correctOptionIndex !== undefined) {
          correctIndex = parseInt(entry.correctOptionIndex, 10);
        }
        let expEn = entry.sol?.en?.value || entry.sol?.en?.explanation || entry.sol?.en?.solution || "";
        let expHi = entry.sol?.hn?.value || entry.sol?.hn?.explanation || entry.sol?.hn?.solution || entry.sol?.hi?.value || "";
        solutionsMap[qId] = { correctIndex, explanationEn: cleanHtml(expEn), explanationHi: cleanHtml(expHi) };
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

    const sections = findSections(root) || [];
    sections.forEach((sec, sIdx) => {
      const sectionName = sec.name || sec.title || `Section ${sIdx + 1}`;
      const questionsList = sec.questions || [];
      console.log(`- Section "${sectionName}": processing ${questionsList.length} questions...`);

      questionsList.forEach((q, qIdx) => {
        const rawTextEn = q.en ? (q.en.value || "") : (typeof q.question === 'string' ? q.question : "");
        const rawTextHi = q.hn ? (q.hn.value || "") : rawTextEn;
        let cleanTextEn = cleanHtml(rawTextEn);
        let cleanTextHi = cleanHtml(rawTextHi);

        let optionsEnList = [];
        let optionsHiList = [];
        if (q.en && Array.isArray(q.en.options)) {
          optionsEnList = q.en.options.map(opt => cleanHtml(opt.value || opt.text || ""));
        } else if (Array.isArray(q.options)) {
          optionsEnList = q.options.map(opt => cleanHtml(typeof opt === 'object' ? (opt.value || opt.text || opt.option) : String(opt)));
        }
        if (q.hn && Array.isArray(q.hn.options)) {
          optionsHiList = q.hn.options.map(opt => cleanHtml(opt.value || opt.text || ""));
        } else {
          optionsHiList = [...optionsEnList];
        }

        while (optionsEnList.length < 2) optionsEnList.push(`Option ${optionsEnList.length + 1}`);
        while (optionsHiList.length < 2) optionsHiList.push(`Option ${optionsHiList.length + 1}`);

        let correctIndex = 0;
        let explanationEn = "";
        let explanationHi = "";
        const qId = q._id || q.id;
        if (qId && solutionsMap[qId]) {
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
          } else if (q.correctAnswer !== undefined) {
            if (typeof q.correctAnswer === 'number') correctIndex = q.correctAnswer;
            else if (typeof q.correctAnswer === 'string' && ['A','B','C','D','E'].includes(q.correctAnswer.toUpperCase())) {
              correctIndex = q.correctAnswer.toUpperCase().charCodeAt(0) - 65;
            }
          }
          explanationEn = cleanHtml(q.solution || q.explanation || q.solDesc || q.en?.solution || "");
          explanationHi = cleanHtml(q.solutionHi || q.explanationHi || q.hn?.solution || explanationEn);
        }

        formattedQuestions.push({
          textEn: cleanTextEn || `Question ${qIdx + 1}`,
          textHi: cleanTextHi || cleanTextEn || `Question ${qIdx + 1}`,
          optionsEn: optionsEnList,
          optionsHi: optionsHiList,
          correctIndex: Math.max(0, Math.min(correctIndex, optionsEnList.length - 1)),
          explanationEn: explanationEn,
          explanationHi: explanationHi,
          section: sectionName
        });
      });
    });
  }

  fs.writeFileSync(outputPath, JSON.stringify(formattedQuestions, null, 2), 'utf-8');
  console.log(`\n✔ Successfully converted ${formattedQuestions.length} questions into BulkQuestionImporter JSON format!`);
  console.log(`Saved output to: ${outputPath}`);
}

try {
  const args = process.argv.slice(2);
  let fileToProcess = null;

  if (args.length > 0) {
    fileToProcess = path.isAbsolute(args[0]) ? args[0] : path.join(__dirname, args[0]);
  } else {
    // Prefer test_result_6942fb70a3a9d62bd47a8e6f.txt or response files
    const candidates = ['test_result_6942fb70a3a9d62bd47a8e6f.txt', 'response_questions.json', 'response.json'];
    for (const c of candidates) {
      const p = path.join(__dirname, c);
      if (fs.existsSync(p)) {
        fileToProcess = p;
        break;
      }
    }
  }

  if (!fileToProcess || !fs.existsSync(fileToProcess)) {
    console.error("❌ Error: Please provide a valid result JSON file.");
    process.exit(1);
  }

  processNkPsychoOrTestbookFile(fileToProcess);
} catch (err) {
  console.error("❌ Error running converter script:", err.message);
}
