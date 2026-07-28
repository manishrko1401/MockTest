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
  const practiceCats = await prisma.category.findMany({
    where: {
      OR: [
        { isPracticeSeries: true },
        { id: { contains: 'practice' } },
        { name: { contains: 'Practice', mode: 'insensitive' } }
      ]
    }
  });

  console.log("=== PRACTICE CATEGORIES IN DB ===");
  console.log(`Count: ${practiceCats.length}`);
  
  for (const cat of practiceCats) {
    console.log(`\nCategory: "${cat.name}" (ID: ${cat.id}, isPracticeSeries: ${cat.isPracticeSeries})`);
    const exams = await prisma.exam.findMany({ where: { categoryId: cat.id } });
    console.log(`- Exams (subCategories) count: ${exams.length}`);
    
    for (const exam of exams) {
      const series = await prisma.testSeries.findMany({ where: { examId: exam.id } });
      console.log(`  - Exam: "${exam.name}" -> Series (sections) count: ${series.length}`);
      for (const s of series) {
        const tests = await prisma.mockTest.findMany({ where: { testSeriesId: s.id } });
        console.log(`    - Section: "${s.title}" -> Tests count: ${tests.length}`);
      }
    }
  }
}

main().catch(console.error).finally(() => pool.end());
