require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const s3 = new S3Client({
  endpoint: process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev',
  region: 'auto',
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID,
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

async function main() {
  const notice = await prisma.notice.findUnique({ where: { id: 'job_39ced6b8e3' } });
  if (!notice) return;

  let key = notice.contentHtml.replace('tigris://', '');
  const resp = await s3.send(new GetObjectCommand({ Bucket: process.env.TIGRIS_BUCKET_NAME || 'mocktest-assets', Key: key }));
  const chunks = [];
  for await (const chunk of resp.Body) chunks.push(chunk);
  const rawHtml = Buffer.concat(chunks).toString('utf-8');

  fs.writeFileSync('sbi_clerk_raw.html', rawHtml);
  console.log('Saved sbi_clerk_raw.html, length:', rawHtml.length);
  await prisma.$disconnect();
}

main();
