const fs = require('fs');
const path = require('path');

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

const { S3Client, GetObjectCommand } = require('./node_modules/@aws-sdk/client-s3');
const { Pool } = require('./node_modules/pg');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.TYPING_TIGRIS_ENDPOINT || process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev',
  credentials: {
    accessKeyId: process.env.TYPING_TIGRIS_ACCESS_KEY_ID || process.env.TIGRIS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.TYPING_TIGRIS_SECRET_ACCESS_KEY || process.env.TIGRIS_SECRET_ACCESS_KEY || ''
  }
});

const pool = new Pool({ connectionString: (process.env.TYPING_DATABASE_URL || process.env.DATABASE_URL || '').trim() });

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  console.log('==================================================');
  console.log('  FINAL VERIFICATION');
  console.log('==================================================\n');

  // 1. Total count per category
  const catCounts = await pool.query(`
    SELECT c.name, c.id, COUNT(t.id) as test_count
    FROM typing_categories c
    LEFT JOIN typing_tests t ON t."categoryId" = c.id
    GROUP BY c.id, c.name
    ORDER BY c."orderIndex"
  `);
  console.log('📊 Tests per category:');
  let total = 0;
  for (const r of catCounts.rows) {
    console.log(`  ${String(r.test_count).padStart(4)} | ${r.name}`);
    total += parseInt(r.test_count);
  }
  console.log(`  ──────────────────────────────`);
  console.log(`  ${String(total).padStart(4)} | TOTAL\n`);

  // 2. Verify passage text is a real tigris URI (not empty)
  const sample = await pool.query(`
    SELECT id, title, "categoryId", "passageText", "mainDurationMinutes", "qualifyingWpm"
    FROM typing_tests
    ORDER BY RANDOM()
    LIMIT 5
  `);
  console.log('🔍 Random sample passages:');
  for (const r of sample.rows) {
    const isUri = r.passageText && r.passageText.startsWith('tigris-typing://');
    console.log(`  [${isUri ? '✅' : '❌'}] ${r.title} (${r.categoryId})`);
    console.log(`       passageText: ${r.passageText ? r.passageText.slice(0, 60) + '...' : 'EMPTY'}`);
    console.log(`       duration: ${r.mainDurationMinutes}min | WPM: ${r.qualifyingWpm}`);
  }

  // 3. Fetch one actual passage from S3 to confirm it's real
  console.log('\n📦 Fetching one actual passage from Tigris S3:');
  const one = await pool.query(`SELECT id, title, "passageText" FROM typing_tests WHERE "passageText" LIKE 'tigris-typing://%' LIMIT 1`);
  if (one.rows.length > 0) {
    const key = one.rows[0].passageText.replace('tigris-typing://', '');
    const bucket = process.env.TYPING_TIGRIS_BUCKET_NAME || process.env.TIGRIS_BUCKET_NAME || 'typing-passages-assets';
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const text = await streamToString(obj.Body);
      console.log(`  Test: "${one.rows[0].title}"`);
      console.log(`  Key: ${key}`);
      console.log(`  Length: ${text.length} characters`);
      console.log(`  Preview: "${text.slice(0, 200)}..."`);
      console.log('\n  ✅ Tigris S3 passage retrieval: WORKING');
    } catch (e) {
      console.log(`  ❌ S3 error: ${e.message}`);
    }
  }

  // 4. Check for any tests with empty/missing passageText
  const empty = await pool.query(`SELECT COUNT(*) FROM typing_tests WHERE "passageText" IS NULL OR "passageText" = ''`);
  console.log(`\n⚠️  Tests with empty passageText: ${empty.rows[0].count}`);

  console.log('\n==================================================');
  console.log('  VERIFICATION COMPLETE');
  console.log('==================================================');
}

main().catch(console.error).finally(() => pool.end());
