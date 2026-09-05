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

const { S3Client, GetObjectCommand } = require('./node_modules/@aws-sdk/client-s3');
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

async function verify() {
  console.log("==================================================================");
  console.log("  VERIFYING TIGRIS DATA STORAGE & DATABASE CATEGORY COUNTS");
  console.log("==================================================================");

  // 1. Check Tigris Object Fetch
  const testS3Key = 'typing-passages/tm-cat-ssc-cgl-101.txt';
  try {
    const s3Res = await s3.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: testS3Key
    }));
    const s3Text = await s3Res.Body.transformToString();
    console.log(`✅ Tigris S3 Verification Passed!`);
    console.log(`   Fetched key: "${testS3Key}" (${s3Text.length} characters)`);
    console.log(`   Snippet: "${s3Text.slice(0, 80)}..."\n`);
  } catch (err) {
    console.error(`❌ Tigris S3 verification error:`, err.message);
  }

  // 2. Check Database counts per category
  const categories = await prisma.typingCategory.findMany({
    orderBy: { orderIndex: 'asc' }
  });

  let totalTests = 0;
  for (const cat of categories) {
    const count = await prisma.typingTest.count({
      where: { categoryId: cat.id }
    });
    totalTests += count;
    console.log(`📁 Category: [${cat.id.padEnd(45)}] -> ${count} Tests`);
  }

  console.log(`\n==================================================================`);
  console.log(`🎯 TOTAL TESTS IN DATABASE ACROSS ALL CATEGORIES: ${totalTests}`);
  console.log(`==================================================================`);
}

verify()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
