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

async function main() {
  const cats = await prisma.category.findMany();
  console.log("=== ALL CATEGORIES IN DB ===");
  cats.forEach(c => {
    console.log(`- ID: ${c.id} | Name: "${c.name}" | isPracticeSeries: ${c.isPracticeSeries}`);
  });

  const tests = await prisma.mockTest.findMany({
    select: {
      id: true,
      title: true,
      testSeriesId: true,
      questionsCount: true,
      customQuestions: true
    }
  });

  console.log("\n=== MOCK TESTS WITH CUSTOM QUESTIONS ===");
  const withQuestions = tests.filter(t => t.customQuestions !== null);
  withQuestions.forEach(t => {
    console.log(`- Test ID: ${t.id} | Title: "${t.title}" | QsCount: ${t.questionsCount} | HasQuestions: true`);
  });
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
