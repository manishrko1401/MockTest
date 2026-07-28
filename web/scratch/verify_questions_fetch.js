const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine ? dbUrlLine.split('DATABASE_URL=')[1].replace(/"/g, '').trim() : null;

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verifyQuestionsFetch() {
  const catId = 'english_active_passive_voice_practice';
  const candidateIds = [
    `${catId}_default`,
    `${catId}_practice_default`,
    `${catId}_practice_practice_default`
  ];

  for (const cid of candidateIds) {
    const mockTest = await prisma.mockTest.findUnique({
      where: { id: cid },
      select: { id: true, customQuestions: true, questionsCount: true }
    });
    if (mockTest) {
      console.log(`Found test [${mockTest.id}], questionsCount: ${mockTest.questionsCount}, hasCustomQuestions: ${!!mockTest.customQuestions}`);
    }
  }
}

verifyQuestionsFetch()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
