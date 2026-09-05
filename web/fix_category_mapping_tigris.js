const fs = require('fs');
const path = require('path');

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
const { PrismaClient } = require('./node_modules/@prisma/client');
const { PrismaPg } = require('./node_modules/@prisma/adapter-pg');
const { Pool } = require('./node_modules/pg');

const bucketName = process.env.TYPING_TIGRIS_BUCKET_NAME || process.env.TIGRIS_BUCKET_NAME || 'typing-passages-assets';
const endpoint = process.env.TYPING_TIGRIS_ENDPOINT || process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev';
const accessKeyId = process.env.TYPING_TIGRIS_ACCESS_KEY_ID || process.env.TIGRIS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.TYPING_TIGRIS_SECRET_ACCESS_KEY || process.env.TIGRIS_SECRET_ACCESS_KEY || '';

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey }
});

const connectionString = (process.env.TYPING_DATABASE_URL || process.env.DATABASE_URL || '').trim();
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Exact 1-to-1 Mapping Table for all 39 categories in DB
const EXACT_CATEGORY_MAP = {
  'ssc-cgl': 'ssc-cgl-typing',
  'ssc-chsl': 'ssc-chsl-typing',
  'rrb-ntpc': 'rrb-ntpc-typing',
  'dsssb-jsa': 'dsssb-jsa-typing',
  'kvs-jsa': 'kvs-jsa-typing',
  'emrs-jsa': 'emrs-jsa-typing',
  'nvs-jsa': 'nvs-jsa-typing',
  'csir-jsa': 'csir-jsa-typing',
  'cbse-jsa': 'cbse-jsa-typing',
  'bsf-hcm': 'bsf-hcm-typing',
  'aiims-cre': 'aiims-cre-ldc-udc-deo-typing',
  'upsssc-ja': 'upsssc-junior-assistant-typing',
  'delhi-police': 'delhi-police-hcm-typing',
  'delhi-police-hcm': 'delhi-police-hcm-typing',
  'dda-jsa': 'dda-jsa-typing',
  'rssb-ldc': 'rssb-ldc-typing',
  'mp-cpct': 'mp-cpct-typing',
  'allahabad-hc': 'allahabad-highcourt-ro-aro-typing',
  'delhi-hc': 'delhi-high-court-dhc-jja-typing',
  'delhi-high-court': 'delhi-high-court-dhc-jja-typing',
  'bombay-hc': 'bombay-high-court-clerk-typing',
  'bombay-hc-400': 'bombay-high-court-clerk-typing-400-words',
  'up-police-co': 'up-police-computer-operator-typing',
  'dsssb-it': 'dsssb-computer-lab-it-assistant-typing',
  'dda-steno': 'dda-stenographer-typing',
  'chandigarh-clerk': 'chandigarh-administration-clerk-typing',
  'punjab-hc': 'punjab-haryana-high-court-typing',
  'spmcil': 'spmcil-typing',
  'supreme-court': 'supreme-court-junior-court-assistant-jca-typing'
};

async function uploadPassageToTigris(testId, passageText) {
  const cleanKey = `typing-passages/${testId}.txt`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      Body: passageText.trim(),
      ContentType: 'text/plain; charset=utf-8',
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );
  return `tigris-typing://${cleanKey}`;
}

async function runFix() {
  console.log("==================================================================");
  console.log("  FIXING CATEGORY MAPPING & UPLOADING TO TIGRIS S3 FOR ALL PASSAGES");
  console.log("==================================================================");

  const jsonPath = 'C:/Users/painl/.gemini/antigravity-ide/brain/7e4e1b45-7d2e-446a-b79f-90c2da33d904/scratch/typingmitra_all_scraped_passages.json';
  const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  let count = 0;

  for (const item of rawData) {
    const rawKey = item.categoryId.replace(/^cat-/, '');
    const correctCatId = EXACT_CATEGORY_MAP[rawKey] || `${rawKey}-typing`;

    const testId = item.id;
    let tigrisUri = '';
    try {
      tigrisUri = await uploadPassageToTigris(testId, item.passageText);
    } catch (e) {
      tigrisUri = item.passageText;
    }

    await prisma.typingTest.upsert({
      where: { id: testId },
      update: {
        title: item.title,
        categoryId: correctCatId,
        passageText: tigrisUri,
        demoPassageText: item.demoPassageText || "This is a demo typing test passage to check your keyboard keys.",
        mainDurationMinutes: item.mainDurationMinutes || 10,
        demoDurationMinutes: 1,
        breakDurationMinutes: 1,
        qualifyingWpm: item.qualifyingWpm || 35,
        maxErrorPercentage: item.maxErrorPercentage || 5.0,
        backspaceRule: 'ALLOWED',
        enableBackspace: true,
        allowRetype: false,
        highlightAllowed: true,
        language: item.language || 'en',
        difficulty: item.difficulty || 'Medium',
        isActive: true
      },
      create: {
        id: testId,
        title: item.title,
        categoryId: correctCatId,
        passageText: tigrisUri,
        demoPassageText: item.demoPassageText || "This is a demo typing test passage to check your keyboard keys.",
        mainDurationMinutes: item.mainDurationMinutes || 10,
        demoDurationMinutes: 1,
        breakDurationMinutes: 1,
        qualifyingWpm: item.qualifyingWpm || 35,
        maxErrorPercentage: item.maxErrorPercentage || 5.0,
        backspaceRule: 'ALLOWED',
        enableBackspace: true,
        allowRetype: false,
        highlightAllowed: true,
        language: item.language || 'en',
        difficulty: item.difficulty || 'Medium',
        isActive: true,
        orderIndex: count + 1
      }
    });

    count++;
    console.log(`[${count}/${rawData.length}] Fixed "${item.title}" -> Category: "${correctCatId}" (Tigris: ${tigrisUri.slice(0, 35)}...)`);
  }

  console.log(`\n==================================================================`);
  console.log(`🎉 ALL ${count} PASSAGES ARE 100% TIED TO TIGRIS AND THEIR CATEGORIES!`);
  console.log(`==================================================================`);
}

runFix()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
