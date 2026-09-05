/**
 * MASTER PASSAGE SCRAPER
 * Fetches real passage text from typingmitra.in for all 4475 tests
 * Uses authenticated session cookie, uploads to Tigris S3, saves to PostgreSQL DB
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load env
function loadEnv() {
  const envFiles = [path.join(__dirname, '.env.local'), path.join(__dirname, '.env')];
  for (const f of envFiles) {
    if (fs.existsSync(f)) {
      const lines = fs.readFileSync(f, 'utf8').split('\n');
      for (const l of lines) {
        const trimmed = l.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            let val = trimmed.slice(idx + 1).trim();
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

// Config
const PHPSESSID = 'uh2chjlk6rdd8ea0lm533gklii';
const COOKIE = `PHPSESSID=${PHPSESSID}`;
const BASE_URL = 'https://typingmitra.in/';
const CONCURRENCY = 8; // parallel fetches

const bucketName = process.env.TYPING_TIGRIS_BUCKET_NAME || process.env.TIGRIS_BUCKET_NAME || 'typing-passages-assets';
const endpoint = process.env.TYPING_TIGRIS_ENDPOINT || process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev';
const accessKeyId = process.env.TYPING_TIGRIS_ACCESS_KEY_ID || process.env.TIGRIS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.TYPING_TIGRIS_SECRET_ACCESS_KEY || process.env.TIGRIS_SECRET_ACCESS_KEY || '';

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  maxAttempts: 3
});

const connectionString = (process.env.TYPING_DATABASE_URL || process.env.DATABASE_URL || '').trim();
const pool = new Pool({ connectionString, max: 20 });

// Category config map - rules per exam
const CAT_RULES = {
  'ssc-cgl-typing':                               { duration: 15, wpm: 27, error: 5.0 },
  'ssc-cgl-previous-year-typing':                 { duration: 15, wpm: 27, error: 5.0 },
  'ssc-chsl-typing':                              { duration: 10, wpm: 35, error: 5.0 },
  'rrb-ntpc-typing':                              { duration: 10, wpm: 30, error: 5.0 },
  'cbse-jsa-typing':                              { duration: 10, wpm: 35, error: 5.0 },
  'kvs-jsa-typing':                               { duration: 10, wpm: 35, error: 5.0 },
  'emrs-jsa-typing':                              { duration: 10, wpm: 35, error: 5.0 },
  'nvs-jsa-typing':                               { duration: 10, wpm: 35, error: 5.0 },
  'csir-jsa-typing':                              { duration: 10, wpm: 35, error: 5.0 },
  'dsssb-jsa-typing':                             { duration: 10, wpm: 35, error: 5.0 },
  'dsssb-computer-lab-it-assistant-typing':       { duration: 10, wpm: 35, error: 5.0 },
  'dsssb-stenographer-typing':                    { duration: 10, wpm: 80, error: 5.0 },
  'dda-jsa-typing':                               { duration: 10, wpm: 35, error: 5.0 },
  'dda-stenographer-typing':                      { duration: 10, wpm: 80, error: 5.0 },
  'bsf-hcm-typing':                               { duration: 10, wpm: 35, error: 5.0 },
  'ssb-hcm-typing':                               { duration: 10, wpm: 35, error: 5.0 },
  'delhi-police-hcm-typing':                      { duration: 10, wpm: 35, error: 5.0 },
  'delhi-police-awo-tpo-typing':                  { duration: 10, wpm: 35, error: 5.0 },
  'aiims-cre-ldc-udc-deo-typing':                 { duration: 15, wpm: 35, error: 5.0 },
  'cbse-superintendent-typing':                   { duration: 10, wpm: 35, error: 5.0 },
  'csir-exam-new-rules(formula)':                 { duration: 10, wpm: 35, error: 5.0 },
  'ccras-ldc-udc-typing':                         { duration: 10, wpm: 35, error: 5.0 },
  'upsssc-junior-assistant-typing':               { duration: 10, wpm: 25, error: 5.0 },
  'upsssc-ja-hindi-typing':                       { duration: 10, wpm: 25, error: 5.0 },
  'up-police-computer-operator-typing':           { duration: 10, wpm: 25, error: 5.0 },
  'mp-cpct-typing':                               { duration: 15, wpm: 30, error: 5.0 },
  'rssb-ldc-typing':                              { duration: 10, wpm: 25, error: 5.0 },
  'rajasthan-rvunl-junior-assistant-typing':      { duration: 10, wpm: 30, error: 5.0 },
  'allahabad-highcourt-ro-aro-typing':            { duration: 20, wpm: 30, error: 5.0 },
  'uttrakhand-high-court-typing':                 { duration: 10, wpm: 30, error: 5.0 },
  'jharkhand-high-court-typing':                  { duration: 10, wpm: 30, error: 5.0 },
  'delhi-high-court-dhc-jja-typing':              { duration: 10, wpm: 35, error: 5.0 },
  'supreme-court-junior-court-assistant-jca-typing': { duration: 10, wpm: 35, error: 3.0 },
  'bombay-high-court-clerk-typing':               { duration: 10, wpm: 30, error: 5.0 },
  'bombay-high-court-clerk-typing-400-words':     { duration: 10, wpm: 30, error: 5.0 },
  'punjab-haryana-high-court-typing':             { duration: 10, wpm: 35, error: 5.0 },
  'chandigarh-administration-clerk-typing':       { duration: 10, wpm: 30, error: 5.0 },
  'spmcil-typing':                                { duration: 10, wpm: 40, error: 5.0 },
  'quick-brown-fox':                              { duration: 5,  wpm: 35, error: 5.0 },
};

// Fetch URL with cookie, with retry
function fetchUrl(url, retries = 3) {
  return new Promise((resolve) => {
    const attempt = (n) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': COOKIE,
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 15000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', (err) => {
        if (n > 0) setTimeout(() => attempt(n - 1), 2000);
        else resolve({ error: err.message });
      });
      req.on('timeout', () => {
        req.destroy();
        if (n > 0) setTimeout(() => attempt(n - 1), 2000);
        else resolve({ error: 'timeout' });
      });
    };
    attempt(retries);
  });
}

// Extract passage text from test player HTML
// Typingmitra puts the passage text directly inside <div id="z6">
function extractPassage(html) {
  if (!html) return null;

  // Primary: z6 div — typingmitra's main passage container
  // Use indexOf since the passage is large and regex lazy matching cuts it short
  function extractDiv(id) {
    const startTag = `id="${id}"`;
    const pos = html.indexOf(startTag);
    if (pos === -1) return null;
    // Find the end of the opening tag
    const openEnd = html.indexOf('>', pos);
    if (openEnd === -1) return null;
    // Find the next textarea (which comes right after the div in typingmitra)
    // Or find </div> that closes z6
    const textareaPos = html.indexOf('<textarea', openEnd);
    const closeDivPos = html.indexOf('</div>', openEnd);
    const endPos = (textareaPos !== -1 && textareaPos < closeDivPos) ? textareaPos : closeDivPos;
    if (endPos === -1) return null;
    const inner = html.slice(openEnd + 1, endPos);
    const text = inner
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 80 ? text : null;
  }

  // Try primary IDs used by typingmitra
  for (const id of ['z6', 'display-paragraph', 'passage', 'original-text', 'para']) {
    const result = extractDiv(id);
    if (result) return result;
  }

  return null;
}

// Upload to Tigris S3
async function uploadToTigris(testId, text) {
  const key = `typing-passages/${testId}.txt`;
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: text.trim(),
    ContentType: 'text/plain; charset=utf-8',
    CacheControl: 'public, max-age=31536000, immutable'
  }));
  return `tigris-typing://${key}`;
}

// Insert test into DB - exact column names from schema
async function insertTestToDB(test) {
  const sql = `
    INSERT INTO typing_tests (
      id, title, "categoryId", "passageText", "demoPassageText",
      "mainDurationMinutes", "demoDurationMinutes", "breakDurationMinutes",
      "qualifyingWpm", "maxErrorPercentage", "backspaceRule",
      "enableBackspace", "allowRetype", "highlightAllowed",
      language, difficulty, "isActive", "orderIndex"
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
    ) ON CONFLICT (id) DO UPDATE SET
      title=EXCLUDED.title,
      "passageText"=EXCLUDED."passageText",
      "categoryId"=EXCLUDED."categoryId",
      "orderIndex"=EXCLUDED."orderIndex"
  `;
  await pool.query(sql, [
    test.id, test.title, test.categoryId, test.passageText, test.demoPassageText,
    test.mainDurationMinutes, test.demoDurationMinutes, test.breakDurationMinutes,
    test.qualifyingWpm, test.maxErrorPercentage, test.backspaceRule,
    test.enableBackspace, test.allowRetype, test.highlightAllowed,
    test.language, test.difficulty, test.isActive, test.orderIndex
  ]);
}

// Process tasks in parallel with concurrency limit
async function runWithConcurrency(tasks, limit) {
  const results = [];
  let i = 0;
  async function next() {
    if (i >= tasks.length) return;
    const idx = i++;
    try {
      results[idx] = await tasks[idx]();
    } catch (e) {
      results[idx] = { error: e.message };
    }
    await next();
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => next());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log('================================================================');
  console.log('  SCRAPING REAL PASSAGES FROM TYPINGMITRA.IN');
  console.log('  → Fetching test player pages with authenticated cookie');
  console.log('  → Uploading passage text to Tigris S3');
  console.log('  → Saving all tests to PostgreSQL database');
  console.log('================================================================\n');

  // Load manifest
  const possiblePaths = [
    'C:\\Users\\painl\\.gemini\\antigravity-ide\\brain\\7e4e1b45-7d2e-446a-b79f-90c2da33d904\\scratch\\typingmitra_all_exam_manifest.json',
    'C:/Users/painl/.gemini/antigravity-ide/brain/7e4e1b45-7d2e-446a-b79f-90c2da33d904/scratch/typingmitra_all_exam_manifest.json',
  ];
  
  let manifest = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      manifest = JSON.parse(fs.readFileSync(p, 'utf8'));
      console.log(`✅ Loaded manifest from: ${p}`);
      break;
    }
  }
  if (!manifest) {
    console.error('❌ Could not find manifest JSON!');
    process.exit(1);
  }

  // Build flat list of all tests
  const allTasks = [];
  let totalTests = 0;
  const catNames = Object.keys(manifest);
  console.log(`Categories found in manifest: ${catNames.length}\n`);

  for (const catId of catNames) {
    const tests = manifest[catId];
    if (!tests || !tests.length) continue;
    const rules = CAT_RULES[catId] || { duration: 10, wpm: 35, error: 5.0 };
    const isHindi = catId.includes('hindi');

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      // Use the proper title from rawTds[1] which has the full name like "SSC CHSL Passage (Easy) 1"
      const title = (t.rawTds && t.rawTds[1] && t.rawTds[1].length > 3)
        ? t.rawTds[1].trim()
        : (t.title && t.title.length > 3 ? t.title.trim() : `Passage ${i + 1}`);
      
      const testId = `tm-${catId}-${t.passageId}`;
      const testUrl = `${BASE_URL}${t.testUrl}`;
      const orderIndex = i + 1;

      totalTests++;
      const taskIndex = totalTests;
      
      allTasks.push(async () => {
        // Fetch live passage from typingmitra.in
        let passageText = null;
        try {
          const res = await fetchUrl(testUrl);
          if (res.status === 200 && res.body) {
            passageText = extractPassage(res.body);
          }
        } catch (e) {}

        if (!passageText) {
          // Mark as failed - we'll log it
          return { testId, title, catId, failed: true };
        }

        // Upload to Tigris S3
        const tigrisUri = await uploadToTigris(testId, passageText);

        // Build test object
        const test = {
          id: testId,
          title,
          categoryId: catId,
          passageText: tigrisUri,
          demoPassageText: isHindi
            ? 'यह एक डेमो टाइपिंग टेस्ट पैसेज है।'
            : 'This is a demo typing test passage for keyboard responsiveness check.',
          mainDurationMinutes: rules.duration,
          demoDurationMinutes: 1,
          breakDurationMinutes: 1,
          qualifyingWpm: rules.wpm,
          maxErrorPercentage: rules.error,
          backspaceRule: 'ALLOWED',
          enableBackspace: true,
          allowRetype: false,
          highlightAllowed: true,
          language: isHindi ? 'hi' : 'en',
          difficulty: i % 3 === 0 ? 'Easy' : i % 3 === 1 ? 'Medium' : 'Hard',
          isActive: true,
          orderIndex
        };

        // Save to DB
        await insertTestToDB(test);
        return { testId, title, catId, ok: true };
      });
    }
  }

  console.log(`📋 Total tests to process: ${totalTests}\n`);

  // Process all tasks with concurrency
  let done = 0, succeeded = 0, failed = 0;
  const failedTests = [];

  // Process in batches to track progress
  const BATCH = 100;
  for (let start = 0; start < allTasks.length; start += BATCH) {
    const batch = allTasks.slice(start, start + BATCH);
    const batchTasks = batch.map(fn => async () => {
      const r = await fn();
      done++;
      if (r && r.ok) succeeded++;
      else {
        failed++;
        if (r && r.testId) failedTests.push(r.testId);
      }
      return r;
    });
    await runWithConcurrency(batchTasks, CONCURRENCY);
    console.log(`  Progress: ${Math.min(start + BATCH, allTasks.length)} / ${allTasks.length} processed | ✅ ${succeeded} saved | ❌ ${failed} failed`);
  }

  // Log summary
  console.log(`\n================================================================`);
  console.log(`🎉 SCRAPING COMPLETE!`);
  console.log(`   Total Processed : ${done}`);
  console.log(`   ✅ Successfully Saved: ${succeeded}`);
  console.log(`   ❌ Failed (no passage found): ${failed}`);
  
  if (failedTests.length > 0) {
    const failLogPath = path.join(__dirname, 'failed_scrape_ids.txt');
    fs.writeFileSync(failLogPath, failedTests.join('\n'));
    console.log(`   Failed IDs saved to: ${failLogPath}`);
  }

  // Final DB count
  const result = await pool.query('SELECT COUNT(*) FROM typing_tests');
  console.log(`   Database test count: ${result.rows[0].count}`);
  console.log('================================================================\n');
}

main()
  .catch(console.error)
  .finally(async () => {
    await pool.end();
  });
