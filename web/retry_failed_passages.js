/**
 * RETRY SCRAPER - re-fetches only the 1,681 failed passage IDs
 * Uses concurrency=4 to be gentler on the server
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

function loadEnv() {
  const envFiles = [path.join(__dirname, '.env.local'), path.join(__dirname, '.env')];
  for (const f of envFiles) {
    if (fs.existsSync(f)) {
      const lines = fs.readFileSync(f, 'utf8').split('\n');
      for (const l of lines) {
        const t = l.trim();
        if (t && !t.startsWith('#')) {
          const idx = t.indexOf('=');
          if (idx !== -1) {
            const key = t.slice(0, idx).trim();
            let val = t.slice(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
            if (!process.env[key]) process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

const { S3Client, PutObjectCommand } = require('./node_modules/@aws-sdk/client-s3');
const { Pool } = require('./node_modules/pg');

const PHPSESSID = 'uh2chjlk6rdd8ea0lm533gklii';
const COOKIE = `PHPSESSID=${PHPSESSID}`;
const BASE_URL = 'https://typingmitra.in/';
const CONCURRENCY = 4; // gentler concurrency for retry

const bucketName = process.env.TYPING_TIGRIS_BUCKET_NAME || process.env.TIGRIS_BUCKET_NAME || 'typing-passages-assets';
const endpoint = process.env.TYPING_TIGRIS_ENDPOINT || process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev';
const accessKeyId = process.env.TYPING_TIGRIS_ACCESS_KEY_ID || process.env.TIGRIS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.TYPING_TIGRIS_SECRET_ACCESS_KEY || process.env.TIGRIS_SECRET_ACCESS_KEY || '';

const s3 = new S3Client({
  region: 'auto', endpoint,
  credentials: { accessKeyId, secretAccessKey },
  maxAttempts: 3
});

const pool = new Pool({
  connectionString: (process.env.TYPING_DATABASE_URL || process.env.DATABASE_URL || '').trim(),
  max: 10
});

const CAT_RULES = {
  'ssc-cgl-typing': { duration: 15, wpm: 27 }, 'ssc-cgl-previous-year-typing': { duration: 15, wpm: 27 },
  'ssc-chsl-typing': { duration: 10, wpm: 35 }, 'rrb-ntpc-typing': { duration: 10, wpm: 30 },
  'cbse-jsa-typing': { duration: 10, wpm: 35 }, 'kvs-jsa-typing': { duration: 10, wpm: 35 },
  'emrs-jsa-typing': { duration: 10, wpm: 35 }, 'nvs-jsa-typing': { duration: 10, wpm: 35 },
  'csir-jsa-typing': { duration: 10, wpm: 35 }, 'dsssb-jsa-typing': { duration: 10, wpm: 35 },
  'dsssb-computer-lab-it-assistant-typing': { duration: 10, wpm: 35 },
  'dsssb-stenographer-typing': { duration: 10, wpm: 80 }, 'dda-jsa-typing': { duration: 10, wpm: 35 },
  'dda-stenographer-typing': { duration: 10, wpm: 80 }, 'bsf-hcm-typing': { duration: 10, wpm: 35 },
  'ssb-hcm-typing': { duration: 10, wpm: 35 }, 'delhi-police-hcm-typing': { duration: 10, wpm: 35 },
  'delhi-police-awo-tpo-typing': { duration: 10, wpm: 35 },
  'aiims-cre-ldc-udc-deo-typing': { duration: 15, wpm: 35 },
  'cbse-superintendent-typing': { duration: 10, wpm: 35 },
  'csir-exam-new-rules(formula)': { duration: 10, wpm: 35 },
  'ccras-ldc-udc-typing': { duration: 10, wpm: 35 },
  'upsssc-junior-assistant-typing': { duration: 10, wpm: 25 },
  'upsssc-ja-hindi-typing': { duration: 10, wpm: 25 },
  'up-police-computer-operator-typing': { duration: 10, wpm: 25 },
  'mp-cpct-typing': { duration: 15, wpm: 30 }, 'rssb-ldc-typing': { duration: 10, wpm: 25 },
  'rajasthan-rvunl-junior-assistant-typing': { duration: 10, wpm: 30 },
  'allahabad-highcourt-ro-aro-typing': { duration: 20, wpm: 30 },
  'uttrakhand-high-court-typing': { duration: 10, wpm: 30 },
  'jharkhand-high-court-typing': { duration: 10, wpm: 30 },
  'delhi-high-court-dhc-jja-typing': { duration: 10, wpm: 35 },
  'supreme-court-junior-court-assistant-jca-typing': { duration: 10, wpm: 35 },
  'bombay-high-court-clerk-typing': { duration: 10, wpm: 30 },
  'bombay-high-court-clerk-typing-400-words': { duration: 10, wpm: 30 },
  'punjab-haryana-high-court-typing': { duration: 10, wpm: 35 },
  'chandigarh-administration-clerk-typing': { duration: 10, wpm: 30 },
  'spmcil-typing': { duration: 10, wpm: 40 }, 'quick-brown-fox': { duration: 5, wpm: 35 },
};

function fetchUrl(url, retries = 4) {
  return new Promise((resolve) => {
    const attempt = (n) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': COOKIE,
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 20000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', () => { if (n > 0) setTimeout(() => attempt(n - 1), 3000); else resolve({ error: 'network' }); });
      req.on('timeout', () => { req.destroy(); if (n > 0) setTimeout(() => attempt(n - 1), 3000); else resolve({ error: 'timeout' }); });
    };
    attempt(retries);
  });
}

function extractPassage(html) {
  if (!html) return null;
  function extractDiv(id) {
    const pos = html.indexOf(`id="${id}"`);
    if (pos === -1) return null;
    const openEnd = html.indexOf('>', pos);
    if (openEnd === -1) return null;
    const textareaPos = html.indexOf('<textarea', openEnd);
    const closeDivPos = html.indexOf('</div>', openEnd);
    const endPos = (textareaPos !== -1 && textareaPos < closeDivPos) ? textareaPos : closeDivPos;
    if (endPos === -1) return null;
    const inner = html.slice(openEnd + 1, endPos);
    const text = inner
      .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ').trim();
    return text.length > 80 ? text : null;
  }
  for (const id of ['z6', 'display-paragraph', 'passage', 'original-text', 'para']) {
    const r = extractDiv(id);
    if (r) return r;
  }
  return null;
}

async function uploadToTigris(testId, text) {
  const key = `typing-passages/${testId}.txt`;
  await s3.send(new PutObjectCommand({
    Bucket: bucketName, Key: key,
    Body: text.trim(), ContentType: 'text/plain; charset=utf-8'
  }));
  return `tigris-typing://${key}`;
}

async function insertTestToDB(test) {
  const sql = `
    INSERT INTO typing_tests (
      id, title, "categoryId", "passageText", "demoPassageText",
      "mainDurationMinutes", "demoDurationMinutes", "breakDurationMinutes",
      "qualifyingWpm", "maxErrorPercentage", "backspaceRule",
      "enableBackspace", "allowRetype", "highlightAllowed",
      language, difficulty, "isActive", "orderIndex"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    ON CONFLICT (id) DO UPDATE SET
      title=EXCLUDED.title, "passageText"=EXCLUDED."passageText",
      "categoryId"=EXCLUDED."categoryId", "orderIndex"=EXCLUDED."orderIndex"
  `;
  await pool.query(sql, [
    test.id, test.title, test.categoryId, test.passageText, test.demoPassageText,
    test.mainDurationMinutes, test.demoDurationMinutes, test.breakDurationMinutes,
    test.qualifyingWpm, test.maxErrorPercentage, 'ALLOWED',
    true, false, true, test.language, test.difficulty, true, test.orderIndex
  ]);
}

async function runWithConcurrency(tasks, limit) {
  let i = 0;
  async function next() {
    if (i >= tasks.length) return;
    const fn = tasks[i++];
    await fn().catch(() => {});
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => next()));
}

async function main() {
  console.log('================================================================');
  console.log('  RETRY SCRAPER - Fetching 1,681 failed passages');
  console.log('  → Concurrency: 4 workers');
  console.log('================================================================\n');

  // Load failed IDs list
  const failedIds = fs.readFileSync(
    path.join(__dirname, 'failed_scrape_ids.txt'), 'utf8'
  ).split('\n').map(l => l.trim()).filter(Boolean);
  
  console.log(`Found ${failedIds.length} failed IDs to retry\n`);

  // Load manifest for test details
  const manifest = JSON.parse(fs.readFileSync(
    'C:\\Users\\painl\\.gemini\\antigravity-ide\\brain\\7e4e1b45-7d2e-446a-b79f-90c2da33d904\\scratch\\typingmitra_all_exam_manifest.json',
    'utf8'
  ));

  // Build lookup map: testId -> test info
  const testLookup = new Map();
  for (const [catId, tests] of Object.entries(manifest)) {
    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const testId = `tm-${catId}-${t.passageId}`;
      testLookup.set(testId, { catId, test: t, orderIndex: i + 1 });
    }
  }

  let done = 0, succeeded = 0, failed = 0;
  const stillFailed = [];

  const tasks = failedIds.map(testId => async () => {
    const info = testLookup.get(testId);
    if (!info) { done++; failed++; stillFailed.push(testId); return; }
    
    const { catId, test, orderIndex } = info;
    const testUrl = `${BASE_URL}${test.testUrl}`;
    const rules = CAT_RULES[catId] || { duration: 10, wpm: 35 };
    const isHindi = catId.includes('hindi');
    const title = (test.rawTds && test.rawTds[1] && test.rawTds[1].length > 3)
      ? test.rawTds[1].trim()
      : `Passage ${orderIndex}`;

    let passageText = null;
    const res = await fetchUrl(testUrl);
    if (res.status === 200 && res.body) {
      passageText = extractPassage(res.body);
    }

    done++;
    if (!passageText) {
      failed++;
      stillFailed.push(testId);
      return;
    }

    const tigrisUri = await uploadToTigris(testId, passageText);
    await insertTestToDB({
      id: testId, title, categoryId: catId,
      passageText: tigrisUri,
      demoPassageText: isHindi ? 'यह एक डेमो टाइपिंग पैसेज है।' : 'This is a demo typing passage.',
      mainDurationMinutes: rules.duration, demoDurationMinutes: 1, breakDurationMinutes: 1,
      qualifyingWpm: rules.wpm, maxErrorPercentage: 5,
      language: isHindi ? 'hi' : 'en',
      difficulty: orderIndex % 3 === 0 ? 'Easy' : orderIndex % 3 === 1 ? 'Medium' : 'Hard',
      orderIndex
    });
    succeeded++;

    if (done % 100 === 0) {
      console.log(`  Retry progress: ${done}/${failedIds.length} | ✅ ${succeeded} saved | ❌ ${failed} still failing`);
    }
  });

  await runWithConcurrency(tasks, CONCURRENCY);

  // Write still-failed list
  if (stillFailed.length > 0) {
    fs.writeFileSync(path.join(__dirname, 'still_failed_ids.txt'), stillFailed.join('\n'));
  }

  const result = await pool.query('SELECT COUNT(*) FROM typing_tests');
  console.log(`\n================================================================`);
  console.log(`🎉 RETRY COMPLETE!`);
  console.log(`   Retried: ${done}`);
  console.log(`   ✅ Successfully Saved: ${succeeded}`);
  console.log(`   ❌ Still Failed: ${failed}`);
  console.log(`   📊 Total tests in DB: ${result.rows[0].count}`);
  console.log('================================================================\n');
}

main().catch(console.error).finally(() => pool.end());
