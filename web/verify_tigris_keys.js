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
const bucketName = process.env.TYPING_TIGRIS_BUCKET_NAME || process.env.TIGRIS_BUCKET_NAME || 'typing-passages-assets';
const endpoint = process.env.TYPING_TIGRIS_ENDPOINT || process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev';
const accessKeyId = process.env.TYPING_TIGRIS_ACCESS_KEY_ID || process.env.TIGRIS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.TYPING_TIGRIS_SECRET_ACCESS_KEY || process.env.TIGRIS_SECRET_ACCESS_KEY || '';

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey }
});

async function testFetch() {
  const testKeys = [
    'typing-passages/tm-ssc-cgl-typing-101.txt',
    'typing-passages/tm-rrb-ntpc-typing-100.txt',
    'typing-passages/tm-delhi-police-hcm-typing-1001.txt'
  ];

  for (const k of testKeys) {
    try {
      const res = await s3.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: k
      }));
      const text = await res.Body.transformToString();
      console.log(`✅ Tigris S3 Key [${k}] (${text.length} chars): "${text.slice(0, 80)}..."`);
    } catch (e) {
      console.log(`❌ S3 Key: ${k} -> Error: ${e.message}`);
    }
  }
}

testFetch();
