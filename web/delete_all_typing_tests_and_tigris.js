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

const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('./node_modules/@aws-sdk/client-s3');
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

async function purgeTigrisPassages() {
  console.log(`\n☁️ Purging all typing passages from Tigris S3 bucket: "${bucketName}"...`);
  let isTruncated = true;
  let continuationToken;
  let totalDeletedFromS3 = 0;

  while (isTruncated) {
    const listRes = await s3.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'typing-passages/',
      ContinuationToken: continuationToken
    }));

    if (listRes.Contents && listRes.Contents.length > 0) {
      const objectsToDelete = listRes.Contents.map(obj => ({ Key: obj.Key }));
      console.log(`  Deleting batch of ${objectsToDelete.length} objects from Tigris S3...`);
      
      await s3.send(new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: { Objects: objectsToDelete }
      }));

      totalDeletedFromS3 += objectsToDelete.length;
      console.log(`  Deleted ${totalDeletedFromS3} objects so far...`);
    }

    isTruncated = Boolean(listRes.IsTruncated);
    continuationToken = listRes.NextContinuationToken;
  }

  console.log(`✅ Total Tigris S3 objects deleted: ${totalDeletedFromS3}`);
  return totalDeletedFromS3;
}

async function purgeDatabaseTests() {
  console.log(`\n💾 Deleting all typing tests from PostgreSQL database...`);
  const initialCount = await prisma.typingTest.count();
  console.log(`Current tests in Database: ${initialCount}`);

  const deleteRes = await prisma.typingTest.deleteMany({});
  console.log(`✅ Database delete result: ${deleteRes.count} tests removed.`);

  const remainingCount = await prisma.typingTest.count();
  console.log(`Remaining tests in Database: ${remainingCount}`);
}

async function main() {
  console.log("==================================================================");
  console.log("  PURGING ALL 5654 TYPING TESTS FROM DATABASE & TIGRIS S3 STORAGE");
  console.log("==================================================================");

  await purgeTigrisPassages();
  await purgeDatabaseTests();

  console.log("\n==================================================================");
  console.log("🎉 SUCCESS: ALL TYPING TESTS REMOVED FROM WEBSITE & TIGRIS!");
  console.log("==================================================================");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
