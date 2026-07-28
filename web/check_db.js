const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) envVars[line.slice(0, idx).trim()] = line.slice(idx + 1).replace(/"/g, '').trim();
});

const pool = new Pool({ connectionString: envVars.DATABASE_URL });
const adapter = new (require('@prisma/adapter-pg').PrismaPg)(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const testIds = [
    'english_improvement_of_sentences_practice_practice_default',
    'english_improvement_of_sentences_practice_default',
    'english_improvement_of_sentences_practice_practice_practice_default'
  ];
  
  for (const tid of testIds) {
    const t = await prisma.mockTest.findUnique({
      where: { id: tid },
      select: { id: true, customQuestions: true, questionsCount: true }
    });
    if (t) {
      console.log(`FOUND: ${tid}`);
      console.log(`  customQuestions:`, JSON.stringify(t.customQuestions));
      console.log(`  questionsCount: ${t.questionsCount}`);
    } else {
      console.log(`NOT FOUND: ${tid}`);
    }
  }
  
  // Also check the S3 URL is accessible
  const url = 'https://fly.storage.tigris.dev/mocktest-assets/questions_english_improvement_of_sentences_practice_default.json';
  console.log('\nTesting S3 URL directly...');
  try {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`S3 HEAD response: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.log('S3 URL error:', err.message);
  }
}

check().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
