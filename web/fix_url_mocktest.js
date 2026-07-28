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

async function fix() {
  // The _practice_practice_default test has wrong URL, update it to point to the correct S3 file
  const correctUrl = 'https://fly.storage.tigris.dev/mocktest-assets/questions_english_improvement_of_sentences_practice_default.json';
  
  const testId = 'english_improvement_of_sentences_practice_practice_default';
  const current = await prisma.mockTest.findUnique({ 
    where: { id: testId }, 
    select: { id: true, customQuestions: true }
  });
  console.log('Current customQuestions:', JSON.stringify(current?.customQuestions));

  // Update to use the correct URL (the actual uploaded file)
  await prisma.mockTest.update({
    where: { id: testId },
    data: {
      customQuestions: { url: correctUrl }
    }
  });
  
  const updated = await prisma.mockTest.findUnique({ 
    where: { id: testId }, 
    select: { id: true, customQuestions: true }
  });
  console.log('Updated customQuestions:', JSON.stringify(updated?.customQuestions));
  console.log('\nDone! Both mock tests now point to the correct S3 file.');
}

fix().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
