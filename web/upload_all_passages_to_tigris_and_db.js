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

// Exact slug mapping
const SLUG_TO_CATEGORY_ID = {
  'ssc-cgl-typing': 'ssc-cgl-typing',
  'ssc-chsl-typing': 'ssc-chsl-typing',
  'rrb-ntpc-typing': 'rrb-ntpc-typing',
  'dsssb-jsa-typing': 'dsssb-jsa-typing',
  'kvs-jsa-typing': 'kvs-jsa-typing',
  'emrs-jsa-typing': 'emrs-jsa-typing',
  'nvs-jsa-typing': 'nvs-jsa-typing',
  'csir-jsa-typing': 'csir-jsa-typing',
  'cbse-jsa-typing': 'cbse-jsa-typing',
  'bsf-hcm-typing': 'bsf-hcm-typing',
  'aiims-cre-ldc-udc-deo-typing': 'aiims-cre-ldc-udc-deo-typing',
  'upsssc-junior-assistant-typing': 'upsssc-junior-assistant-typing',
  'delhi-police-hcm-typing': 'delhi-police-hcm-typing',
  'dda-jsa-typing': 'dda-jsa-typing',
  'rssb-ldc-typing': 'rssb-ldc-typing',
  'mp-cpct-typing': 'mp-cpct-typing',
  'allahabad-highcourt-ro-aro-typing': 'allahabad-highcourt-ro-aro-typing',
  'delhi-high-court-dhc-jja-typing': 'delhi-high-court-dhc-jja-typing',
  'bombay-high-court-clerk-typing': 'bombay-high-court-clerk-typing',
  'bombay-high-court-clerk-typing-400-words': 'bombay-high-court-clerk-typing-400-words',
  'up-police-computer-operator-typing': 'up-police-computer-operator-typing',
  'dsssb-computer-lab-it-assistant-typing': 'dsssb-computer-lab-it-assistant-typing',
  'dsssb-stenographer-typing': 'dsssb-stenographer-typing',
  'dda-stenographer-typing': 'dda-stenographer-typing',
  'chandigarh-administration-clerk-typing': 'chandigarh-administration-clerk-typing',
  'punjab-haryana-high-court-typing': 'punjab-haryana-high-court-typing',
  'spmcil-typing': 'spmcil-typing',
  'supreme-court-junior-court-assistant-jca-typing': 'supreme-court-junior-court-assistant-jca-typing'
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

async function run() {
  console.log("==================================================================");
  console.log("  UPLOADING ALL 99 TYPINGMITRA PASSAGES TO TIGRIS S3 & DATABASE");
  console.log("==================================================================");

  const jsonPath = 'C:/Users/painl/.gemini/antigravity-ide/brain/7e4e1b45-7d2e-446a-b79f-90c2da33d904/scratch/typingmitra_all_scraped_passages.json';
  const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${rawData.length} passages from scraper file.`);

  // Verify existing categories
  const categoriesInDb = await prisma.typingCategory.findMany();
  const dbCatSet = new Set(categoriesInDb.map(c => c.id));
  console.log(`Found ${dbCatSet.size} categories in Database.`);

  let successCount = 0;

  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    
    // Map to category ID in DB
    let targetCatId = item.categoryId.replace(/^cat-/, '');
    if (!targetCatId.endsWith('-typing') && !dbCatSet.has(targetCatId)) {
      targetCatId = targetCatId + '-typing';
    }

    if (!dbCatSet.has(targetCatId)) {
      // Find category by name match
      const matchedCat = categoriesInDb.find(c => 
        c.name.toLowerCase().includes(item.categoryName.toLowerCase().split(' ')[0]) ||
        item.categoryName.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
      );
      if (matchedCat) {
        targetCatId = matchedCat.id;
      } else {
        targetCatId = 'ssc-cgl-typing';
      }
    }

    const testId = item.id;
    console.log(`\n[${i + 1}/${rawData.length}] Processing: "${item.title}" -> Category: "${targetCatId}"`);

    // 1. Upload passage text to Tigris S3
    let tigrisUri = '';
    try {
      tigrisUri = await uploadPassageToTigris(testId, item.passageText);
      console.log(`  ☁️ Uploaded to Tigris S3: ${tigrisUri}`);
    } catch (s3Err) {
      console.error(`  ⚠️ Tigris upload error for ${testId}:`, s3Err.message);
      tigrisUri = item.passageText;
    }

    // 2. Save test record to Database
    try {
      await prisma.typingTest.upsert({
        where: { id: testId },
        update: {
          title: item.title,
          categoryId: targetCatId,
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
          orderIndex: i + 1,
          isActive: true
        },
        create: {
          id: testId,
          title: item.title,
          categoryId: targetCatId,
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
          orderIndex: i + 1,
          isActive: true
        }
      });
      successCount++;
      console.log(`  💾 Saved in Database for Category: ${targetCatId}`);
    } catch (dbErr) {
      console.error(`  ❌ Database save error for ${testId}:`, dbErr.message);
    }
  }

  console.log(`\n==================================================================`);
  console.log(`🎉 SUCCESS: ${successCount} PASSAGES UPLOADED TO TIGRIS & DATABASE!`);
  console.log(`==================================================================`);
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
