const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs'), path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const dbUrlLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('DATABASE_URL=')[1].replace(/"/g,'').trim();

const pool = new Pool({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const cats = await prisma.category.findMany({ where: { isPracticeSeries: true }, take: 1 });
  for (const cat of cats) {
    console.log('Category:', cat.name, '| isPracticeSeries:', cat.isPracticeSeries);
    const exams = await prisma.exam.findMany({ where: { categoryId: cat.id } });
    console.log('Exams count:', exams.length);
    for (const exam of exams) {
      const seriesList = await prisma.testSeries.findMany({ where: { examId: exam.id } });
      const subSubCategories = [];
      for (const ts of seriesList) {
        const tests = await prisma.mockTest.findMany({ where: { testSeriesId: ts.id } });
        subSubCategories.push({
          id: ts.id,
          name: ts.title,
          tests: tests.map(t => ({ id: t.id, title: t.title }))
        });
      }
      const sub = {
        id: exam.id,
        name: exam.name,
        subSubCategories: subSubCategories,
        tests: subSubCategories.flatMap(s => s.tests)
      };
      console.log('Sub (series) object:', JSON.stringify(sub, null, 2));
    }
  }
}

main().catch(console.error).finally(() => pool.end());
