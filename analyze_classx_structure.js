const fs = require('fs');
const path = require('path');

function analyzeJsonStructure(filePath, label) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  let data;
  try { data = JSON.parse(raw); } catch(e) { console.log(`${label}: PARSE ERROR:`, e.message); return; }

  function getShape(obj, depth = 0) {
    if (depth > 3) return typeof obj;
    if (Array.isArray(obj)) {
      return `Array[${obj.length}] of ${obj.length > 0 ? getShape(obj[0], depth + 1) : 'empty'}`;
    }
    if (obj && typeof obj === 'object') {
      const keys = Object.keys(obj);
      const shape = {};
      keys.slice(0, 20).forEach(k => {
        const v = obj[k];
        if (Array.isArray(v)) {
          shape[k] = `Array[${v.length}]` + (v.length > 0 && typeof v[0] === 'object' ? ` of {${Object.keys(v[0]).slice(0, 5).join(',')}}` : '');
        } else if (v && typeof v === 'object') {
          shape[k] = `{${Object.keys(v).slice(0, 5).join(',')}}`;
        } else {
          shape[k] = `${typeof v}: ${JSON.stringify(v).substring(0, 50)}`;
        }
      });
      return shape;
    }
    return `${typeof obj}: ${JSON.stringify(obj).substring(0, 50)}`;
  }

  console.log(`\n===== ${label} =====`);
  console.log("Top-level shape:", JSON.stringify(getShape(data), null, 2));

  // Find array of questions
  function findQuestionArray(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 5) return null;
    if (Array.isArray(obj) && obj.length > 3) {
      const s = obj[0];
      if (s && typeof s === 'object' && (s.question || s.question_text || s.title || s.options || s.option1)) {
        return obj;
      }
    }
    for (const k in obj) {
      const res = findQuestionArray(obj[k], depth + 1);
      if (res) return res;
    }
    return null;
  }

  const questions = findQuestionArray(data);
  if (questions) {
    console.log(`\nFound ${questions.length} questions!`);
    console.log("FIRST QUESTION KEYS:", Object.keys(questions[0]));
    console.log("FIRST QUESTION SAMPLE:", JSON.stringify(questions[0]).substring(0, 1000));
    
    // Check key patterns
    const q = questions[0];
    console.log("\nKey Analysis:");
    console.log("- correct_option:", q.correct_option, typeof q.correct_option);
    console.log("- correctOption:", q.correctOption, typeof q.correctOption);
    console.log("- answer:", q.answer, typeof q.answer);
    console.log("- correct_answer:", q.correct_answer, typeof q.correct_answer);
    console.log("- solution:", q.solution ? String(q.solution).substring(0, 100) : "MISSING");
    console.log("- explanation:", q.explanation ? String(q.explanation).substring(0, 100) : "MISSING");
    console.log("- options type:", Array.isArray(q.options) ? `Array[${q.options.length}] sample:${JSON.stringify(q.options[0]).substring(0,80)}` : typeof q.options);
    
    // Show more samples
    console.log("\nSECOND QUESTION CORRECT:", questions[1]?.correct_option, questions[1]?.answer, questions[1]?.correctOption);
  } else {
    console.log("No question array found at top level. Checking sub-keys...");
    function printAll(obj, prefix = '', depth = 0) {
      if (depth > 4 || !obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach(k => {
        const v = obj[k];
        if (Array.isArray(v)) {
          console.log(`${prefix}${k}: Array[${v.length}]`);
        } else if (v && typeof v === 'object') {
          console.log(`${prefix}${k}: {${Object.keys(v).slice(0,5).join(',')}}`);
          printAll(v, prefix + '  ', depth + 1);
        } else {
          console.log(`${prefix}${k}: ${JSON.stringify(v).substring(0, 60)}`);
        }
      });
    }
    printAll(data);
  }
}

analyzeJsonStructure(path.join(__dirname, 'response_questions.json'), 'QUESTIONS JSON');
analyzeJsonStructure(path.join(__dirname, 'response_solutions.json'), 'SOLUTIONS JSON');
