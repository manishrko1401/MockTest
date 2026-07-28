const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) envVars[line.slice(0, idx).trim()] = line.slice(idx + 1).replace(/"/g, '').trim();
});

const s3Client = new S3Client({
  region: 'auto',
  endpoint: envVars.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev',
  credentials: {
    accessKeyId: envVars.TIGRIS_ACCESS_KEY_ID || '',
    secretAccessKey: envVars.TIGRIS_SECRET_ACCESS_KEY || ''
  }
});

const bucketName = envVars.TIGRIS_BUCKET_NAME || 'mocktest-assets';
const key = 'questions_english_improvement_of_sentences_practice_default.json';

console.log(`Endpoint: ${envVars.TIGRIS_ENDPOINT}`);
console.log(`Bucket: ${bucketName}`);
console.log(`Key: ${key}`);
console.log('AccessKeyId (first 8 chars):', (envVars.TIGRIS_ACCESS_KEY_ID || '').substring(0, 8) + '...');

async function test() {
  try {
    console.log('\nSending GetObject command...');
    const response = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
    const body = await response.Body.transformToString();
    const parsed = JSON.parse(body);
    console.log(`\nSUCCESS! Got ${Array.isArray(parsed) ? parsed.length : 'non-array'} questions`);
    if (Array.isArray(parsed) && parsed.length > 0) {
      console.log('First question keys:', Object.keys(parsed[0]).join(', '));
    }
  } catch (err) {
    console.error('\nFAILED:', err.message);
    if (err.$metadata) console.error('HTTP Status:', err.$metadata.httpStatusCode);
  }
}

test();
