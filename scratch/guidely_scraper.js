/**
 * ============================================================
 *  GUIDELY MOCK TEST SCRAPER  (Perfect 100-Question Extractor)
 * ============================================================
 * HOW TO USE:
 *   1. Open Chrome and log into guidely.in
 *   2. Navigate to the solution page:
 *      https://guidely.in/mock-test/solution/13121/28220622/1
 *   3. Open a new terminal in this folder and run:
 *         node scratch/guidely_scraper.js
 *   4. The script will automatically click through all 100
 *      questions and save the output to:
 *         scratch/guidely_questions_import.json
 * ============================================================
 *
 * REQUIREMENTS:
 *   npm install puppeteer
 *
 * The script connects to YOUR existing Chrome browser session
 * (no need to login again) using remote debugging.
 *
 * TO ENABLE REMOTE DEBUGGING in Chrome:
 *   Close all Chrome windows, then run:
 *   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
 *   Then log in and open the solution page.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────
const TOTAL_QUESTIONS = 100;
const OUTPUT_FILE = path.join(__dirname, 'guidely_questions_import.json');
const DELAY_BETWEEN_QUESTIONS_MS = 600;
// ─────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSectionName(questionNum) {
  if (questionNum >= 1 && questionNum <= 30) return 'English Language';
  if (questionNum >= 31 && questionNum <= 65) return 'Numerical Ability';
  return 'Reasoning Ability';
}

function mapCorrectLetter(letter) {
  const map = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  const idx = map[(letter || '').toUpperCase()];
  return idx !== undefined ? idx : 0;
}

function cleanHtml(html) {
  if (!html) return '';
  return html.replace(/\n\s*\n\s*\n/g, '\n\n').replace(/[ \t]{3,}/g, ' ').trim();
}

function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

async function extractCurrentQuestion(page, questionNum) {
  return await page.evaluate((qNum) => {
    function innerHtml(el) { return el ? el.innerHTML.trim() : ''; }
    function innerText(el) { return el ? el.innerText.trim().replace(/\s+/g, ' ') : ''; }

    // 1. Passage (left pane)
    const passageEl = document.querySelector('.btmpcm80');
    const passageHtml = innerHtml(passageEl);

    // 2. Right pane (question + options + solution)
    const qPaneEl = document.querySelector('.btmp80');
    if (!qPaneEl) return null;

    const fullText = qPaneEl.innerText;

    // 3. Extract all 5 options (label elements)
    const labelEls = Array.from(qPaneEl.querySelectorAll('label'));
    const rawOptions = labelEls.map(el => el.innerText.trim()).filter(t => t.length > 0);

    // De-duplicate while preserving order
    const seen = new Set();
    const options = [];
    for (const opt of rawOptions) {
      const key = opt.substring(0, 60);
      if (!seen.has(key)) { seen.add(key); options.push(opt); }
    }

    // 4. Find "Solution" divider in text
    const solutionSplit = fullText.split(/\nSolution\s*\n|Solution:/i);
    const questionPart = solutionSplit[0] || fullText;
    const solutionText = solutionSplit.length > 1 ? solutionSplit.slice(1).join('\n') : '';

    // 5. Extract correct answer letter
    let correctLetter = '';
    const answerPatterns = [
      /Answer\s*:\s*([A-E])/i,
      /Correct\s+(?:Answer|Option)\s*:\s*([A-E])/i,
      /(?:^|\n)\s*([A-E])\s+is\s+(?:the\s+)?(?:correct|right)/im,
    ];
    for (const pattern of answerPatterns) {
      const m = solutionText.match(pattern) || fullText.match(pattern);
      if (m) { correctLetter = m[1].toUpperCase(); break; }
    }

    // 6. Extract question text (lines before options begin)
    const lines = questionPart.split('\n').map(l => l.trim()).filter(Boolean);
    const questionLines = [];
    let optionStarted = false;
    for (const line of lines) {
      if (/^[A-E][).\s]/.test(line) || /^Sentence\s+[A-E]/i.test(line) || optionStarted) {
        optionStarted = true;
        continue;
      }
      questionLines.push(line);
    }
    const questionText = questionLines.join(' ').trim() || lines.slice(0, 2).join(' ');

    // 7. Direction text above question pane
    let directionText = '';
    const dirEl = document.querySelector('.drctnsDv, .direction-text, .drctn');
    if (dirEl) directionText = innerText(dirEl);

    return {
      qNum,
      passageHtml,
      directionText,
      questionText,
      options: options.slice(0, 5),
      correctLetter,
      solutionText,
    };
  }, questionNum);
}

async function main() {
  console.log('\n🚀  Guidely 100-Question Scraper Starting...\n');
  console.log('📡  Connecting to Chrome (remote debugging on port 9222)...');

  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
    console.log('✅  Connected to existing Chrome session!\n');
  } catch (err) {
    console.log('⚠️  Could not connect to existing Chrome. Launching a new browser...');
    browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
  }

  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('guidely.in/mock-test/solution'));

  if (!page) {
    console.log('⚠️  Solution tab not found. Opening it now...');
    page = pages[0] || await browser.newPage();
    await page.goto('https://guidely.in/mock-test/solution/13121/28220622/1', { waitUntil: 'networkidle2', timeout: 30000 });
  }

  await page.bringToFront();
  console.log('📄  Page URL:', page.url(), '\n');

  try {
    await page.waitForSelector('.btmp80', { timeout: 15000 });
    console.log('✅  Question pane found. Beginning extraction...\n');
  } catch (e) {
    console.error('❌  .btmp80 selector not found. Are you on the solution page?');
    process.exit(1);
  }

  // Navigate to Q1 first
  try {
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.quesNmbr, .qnum, .ques-num, .numBxPanl span'));
      const q1 = items.find(el => el.innerText.trim() === '1');
      if (q1) q1.click();
    });
    await sleep(800);
  } catch (_) {}

  const allQuestions = [];
  let consecutiveErrors = 0;

  for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
    process.stdout.write(`  📝  Q${String(i).padStart(3, '0')} / ${TOTAL_QUESTIONS}  [${getSectionName(i).substring(0, 10).padEnd(10)}]  `);

    await sleep(DELAY_BETWEEN_QUESTIONS_MS);

    let data = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        data = await extractCurrentQuestion(page, i);
        if (data) break;
      } catch (e) {
        await sleep(500 * attempt);
      }
    }

    if (!data) {
      console.log('⚠️  SKIPPED (extraction failed)');
      consecutiveErrors++;
      if (consecutiveErrors >= 5) { console.error('\n❌  Too many consecutive errors. Stopping.'); break; }
    } else {
      consecutiveErrors = 0;
      const correctIndex = data.correctLetter ? mapCorrectLetter(data.correctLetter) : 0;
      const optionsEn = [...data.options];
      while (optionsEn.length < 5) optionsEn.push('N/A');

      allQuestions.push({
        id: `guidely_q${i}`,
        section: getSectionName(i),
        passage: cleanHtml(data.passageHtml) || data.directionText || '',
        textEn: data.questionText,
        optionsEn: optionsEn.slice(0, 5),
        correctIndex,
        explanationEn: cleanText(data.solutionText),
      });

      console.log(`✅  [Ans:${data.correctLetter || '?'}]  opts:${data.options.length}  ${data.questionText.substring(0, 40)}...`);
    }

    // Click "Next" button
    if (i < TOTAL_QUESTIONS) {
      const clicked = await page.evaluate(() => {
        const selectors = ['.slntsbtmbtns', 'button', '.nextBtn', '.nxt-btn', '[class*="next"]'];
        for (const sel of selectors) {
          const btns = Array.from(document.querySelectorAll(sel));
          const nextBtn = btns.find(el => el.innerText && el.innerText.trim().toLowerCase() === 'next');
          if (nextBtn) { nextBtn.click(); return true; }
        }
        return false;
      });

      if (!clicked) {
        // Try side panel
        const sideClicked = await page.evaluate((nextQ) => {
          const items = Array.from(document.querySelectorAll('.quesNmbr, .qnum, [class*="qnum"], .numBxPanl span'));
          const targetBtn = items.find(el => el.innerText.trim() === String(nextQ));
          if (targetBtn) { targetBtn.click(); return true; }
          return false;
        }, i + 1);

        if (!sideClicked) {
          console.log(`\n❌  Cannot navigate past Q${i}. Stopping.`);
          break;
        }
      }

      // Wait for question to update
      try {
        await page.waitForFunction(
          (nextQNum) => {
            const text = document.body.innerText;
            return text.includes(`Q: ${nextQNum}/100`) || text.includes(`${nextQNum}/100`) || text.includes(`Question ${nextQNum}`);
          },
          { timeout: 5000 },
          i + 1
        );
      } catch (_) {
        await sleep(1000);
      }
    }
  }

  // Save output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allQuestions, null, 2), 'utf8');

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  ✅  DONE! Extracted ${allQuestions.length} questions.`);
  console.log(`  💾  Saved to: ${OUTPUT_FILE}`);
  console.log('═══════════════════════════════════════════════════════');
  const counts = {};
  allQuestions.forEach(q => { counts[q.section] = (counts[q.section] || 0) + 1; });
  Object.entries(counts).forEach(([sec, cnt]) => console.log(`  ${sec.padEnd(22)}: ${cnt} questions`));
  console.log(`  ${'TOTAL'.padEnd(22)}: ${allQuestions.length} questions\n`);

  try { await browser.disconnect(); } catch (_) {}
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err.message);
  process.exit(1);
});
